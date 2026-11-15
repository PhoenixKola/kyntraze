"""Builds the B08 Fracture Warden runtime assets from the ImageGen sheets in art/bosses/source (see PROVENANCE.md there).
  python scripts/build-warden-art.py
warden-a.png / warden-b.png: 2 rows x 4 cells on magenta -> one 16-frame strip (frame order in B08-DESIGN.md) + manifest.
warden-fx.png: 8 items (burst, crater, ring, boss-burst, warning glyph, emblem, two fill textures). The cone sprites take their ART from the two fill
textures and their SHAPE from an exact 120-degree sector mask (apex at the left-centre pixel, radius == PNG width) so the hit test and the drawing agree."""
import importlib.util, json, math, os
import numpy as np
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("bea", os.path.join(R, "scripts", "build-enemy-art.py")); bea = importlib.util.module_from_spec(spec); spec.loader.exec_module(bea)
S = os.path.join(R, "art", "bosses", "source"); OUT = os.path.join(R, "public", "art", "bosses"); FX = os.path.join(OUT, "fx")
os.makedirs(FX, exist_ok=True)
H_STORED = 380          # tallest walk frame, stored at 2x (shown at 0.5 => ~190 px tall)
FPS = 5
NAMED = {"rupture_windup": 4, "rupture_release": 5, "sweep_windup": 6, "sweep_strike": 7, "charge_windup": 8, "charge_strike": 9, "recover": 10, "hurt": 11, "roar": 12, "death": [13, 14, 15]}


def body(al):
    lab, n = bea.ndi.label(bea.ndi.binary_dilation(al, iterations=6))
    sizes = bea.ndi.sum(al, lab, range(1, n + 1)); m = lab == (int(np.argmax(sizes)) + 1)
    ys, xs = np.nonzero(m & al); return xs.mean(), ys.max() + 1


def build_sheet():
    frames = bea.cells(os.path.join(S, "warden-a.png"), 4, 2) + bea.cells(os.path.join(S, "warden-b.png"), 4, 2)
    walk_h = max(f.getbbox()[3] - f.getbbox()[1] for f in frames[:4]); k = H_STORED / walk_h
    info = []
    for f in frames:
        al = np.asarray(f)[..., 3] > 0; cx, bot = body(al)
        sf = f.resize((max(1, round(f.size[0] * k)), max(1, round(f.size[1] * k))), Image.LANCZOS)
        arr = np.asarray(sf).copy(); a = arr[..., 3].astype(int); arr[..., 3] = np.where(a < 90, 0, np.minimum(255, a * 5 // 4)).astype(np.uint8)
        im = Image.fromarray(arr, "RGBA"); bb = im.getbbox(); info.append((im, cx * k, bot * k, bb[1], bb[3]))
    up = int(max(i[2] - i[3] for i in info)) + 4; down = int(max(0, max(i[4] - i[2] for i in info))) + 4
    half = int(max(max(i[1], i[0].size[0] - i[1]) for i in info)) + 4
    FW, FH = half * 2, up + down
    strip = Image.new("RGBA", (FW * 16, FH), (0, 0, 0, 0))
    for idx, (im, cx, bot, top, bottom) in enumerate(info): strip.alpha_composite(im, (idx * FW + int(round(half - cx)), int(round(up - bot))))
    arr = np.asarray(strip).copy(); solid = arr[..., 3] > 0; ring = bea.ndi.binary_dilation(solid, iterations=1) & ~solid
    arr[ring] = (255, 150, 178, 150); strip = Image.fromarray(arr, "RGBA"); strip.save(os.path.join(OUT, "warden.png"))
    man = {"schema": "kyntraze.boss-anim/1", "boss": "warden", "frame_width": FW, "frame_height": FH, "origin_px": [half, up], "frames": 16, "fps": FPS,
           "clips": {"move": [0, 1, 2, 3]}, "named": NAMED, "facing": "east (mirrored for west)", "source": ["art/bosses/source/warden-a.png", "art/bosses/source/warden-b.png"]}
    json.dump(man, open(os.path.join(OUT, "warden.json"), "w"), indent=1); print("warden frame", FW, FH, "origin", half, up, "scale", round(k, 3), "strip", strip.size)


def save_fx(n, im, size=None):
    c = im.crop(im.getbbox())
    if size: k = size / max(c.size); c = c.resize((max(2, round(c.size[0] * k)), max(2, round(c.size[1] * k))), Image.LANCZOS)
    arr = np.asarray(c).copy(); arr[..., 3] = np.where(arr[..., 3] < 90, 0, arr[..., 3]); Image.fromarray(arr, "RGBA").save(os.path.join(FX, n + ".png")); print("fx", n, c.size)


def tile(cell_rgb_img, cols, rows, idx):
    """crop an edge-to-edge fill tile out of its cell: the largest axis-aligned block that is not key magenta."""
    im = Image.open(cell_rgb_img).convert("RGB"); W, H = im.size; c, r = idx % cols, idx // cols
    sub = np.asarray(im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows))).astype(int)
    d = np.sqrt((sub[..., 0] - 255) ** 2 + sub[..., 1] ** 2 + (sub[..., 2] - 255) ** 2) > 70
    ys, xs = np.nonzero(d); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max(); m = 6   # trim the antialiased border
    return Image.fromarray(sub[y0 + m:y1 - m, x0 + m:x1 - m].astype(np.uint8), "RGB")


def sector_mask(rad, ss=4):
    """120-degree sector pointing east, apex at (0, H/2), radius = rad px; returns float mask (H, rad) and the edge-distance band, supersampled."""
    H = int(math.ceil(2 * rad * math.sin(math.radians(60)))); W = rad
    ys, xs = np.mgrid[0:H * ss, 0:W * ss]; x = (xs + 0.5) / ss; y = (ys + 0.5) / ss - H / 2
    r = np.hypot(x, y); ang = np.degrees(np.arctan2(y, x))
    inside = (r <= rad) & (np.abs(ang) <= 60)
    edge = inside & ((r > rad - 7) | (np.abs(ang) > 60 - np.degrees(7 / np.maximum(r, 7))))
    def ds(a): return a.reshape(H, ss, W, ss).mean(axis=(1, 3))
    return ds(inside.astype(float)), ds(edge.astype(float)), H


def build_cone(name, tex, alpha, edge_rgb, rad=340):
    m, e, H = sector_mask(rad)
    t = np.asarray(tex.resize((rad, H), Image.LANCZOS)).astype(float)
    rgb = t * (1 - e[..., None]) + np.array(edge_rgb) * e[..., None]
    a = m * (alpha * (1 - e) + 1.0 * e) * 255
    Image.fromarray(np.dstack([rgb.astype(np.uint8), a.astype(np.uint8)]), "RGBA").save(os.path.join(FX, name + ".png")); print("fx", name, (rad, H))


def build_fx():
    src = os.path.join(S, "warden-fx.png"); cells = bea.cells(src, 4, 2)
    for i, (n, size) in {0: ("rupture-burst", 260), 1: ("rupture-crater", 256), 2: ("shock-ring", 256), 3: ("boss-burst", 400), 4: ("warning-glyph", 128), 5: ("emblem-warden", 128)}.items(): save_fx(n, cells[i], size)
    build_cone("cone-warn", tile(src, 4, 2, 6), 0.5, (255, 196, 212))
    build_cone("cone-strike", tile(src, 4, 2, 7), 0.92, (255, 255, 255))


if __name__ == "__main__":
    build_sheet(); build_fx()

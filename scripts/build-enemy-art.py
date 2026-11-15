"""Builds the B07 enemy runtime assets from the ImageGen sheets in art/enemies/source (see PROVENANCE.md there).
  python scripts/build-enemy-art.py
Each enemy sheet is 2 rows x 4 cells on magenta: walk 1-4 / windup, release, hurt, death. The key is removed by flood-filling from the cell border
(so pink glows inside the art survive), frames are anchored on one ground line + body centroid, and written as an 8-frame strip with a manifest."""
import json, os
import numpy as np
from PIL import Image
from PIL import ImageFilter
from collections import deque


class ndi:   # the few scipy.ndimage calls this script needs, in numpy/PIL (no extra dependency)
    @staticmethod
    def label(mask):
        h, w = mask.shape; lab = np.zeros((h, w), np.int32); n = 0
        for y0, x0 in zip(*np.nonzero(mask)):
            if lab[y0, x0]: continue
            n += 1; lab[y0, x0] = n; q = deque([(y0, x0)])
            while q:
                y, x = q.popleft()
                for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; q.append((yy, xx))
        return lab, n

    @staticmethod
    def sum(mask, lab, idx): return np.array([mask[lab == i].sum() for i in idx])

    @staticmethod
    def binary_dilation(mask, iterations=1):
        im = Image.fromarray((mask * 255).astype(np.uint8)); im = im.filter(ImageFilter.MaxFilter(2 * iterations + 1)); return np.asarray(im) > 0

    @staticmethod
    def binary_opening(mask, iterations=1):
        im = Image.fromarray((mask * 255).astype(np.uint8)); im = im.filter(ImageFilter.MinFilter(2 * iterations + 1)).filter(ImageFilter.MaxFilter(2 * iterations + 1)); return np.asarray(im) > 0

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(R, "art", "enemies", "source")
OUT = os.path.join(R, "public", "art", "enemies")
os.makedirs(os.path.join(OUT, "fx"), exist_ok=True)

# stored height (2x authored, displayed at 0.5 like Kai) for the tallest walk frame; ground-anchored unless hovering
SPEC = {
    "pursuer": dict(h=136, ground=True, fps=9),
    "flanker": dict(h=124, ground=True, fps=12),
    "bruiser": dict(h=206, ground=True, fps=6),
    "ranged": dict(h=170, ground=False, fps=7),
}
CLIPS = {"idle": [0], "move": [0, 1, 2, 3], "windup": [4], "strike": [5], "hurt": [6], "death": [7]}


def key_alpha(rgb):
    a = rgb.astype(float)
    d = np.sqrt((a[..., 0] - 255) ** 2 + a[..., 1] ** 2 + (a[..., 2] - 255) ** 2)
    bgish = d < 110
    lab, n = ndi.label(bgish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    alpha = (~bg & (d > 62)).astype(float)   # enclosed pockets of pure key colour (between legs, arms) go too; glows are never this close to #ff00ff
    # soften the 1px fringe: pixels touching the background that are still magenta-tinted become transparent
    near = ndi.binary_dilation(bg, iterations=2) & ~bg
    tint = (a[..., 0] > 170) & (a[..., 2] > 150) & (a[..., 1] < 120) & (np.abs(a[..., 0] - a[..., 2]) < 70)
    alpha[near & tint] = 0
    alpha = ndi.binary_opening(alpha > 0.5, iterations=1).astype(float)
    return alpha


def cells(path, cols, rows):
    im = Image.open(path).convert("RGB"); W, H = im.size; a = np.asarray(im)
    out = []
    for r in range(rows):
        for c in range(cols):
            x0, x1, y0, y1 = c * W // cols, (c + 1) * W // cols, r * H // rows, (r + 1) * H // rows
            sub = a[y0:y1, x0:x1]; al = key_alpha(sub)
            # keep only the largest-ish blobs: drop specks smaller than 6 px
            lab, n = ndi.label(al > 0)
            if n:
                sizes = ndi.sum(al > 0, lab, range(1, n + 1)); keep = [i + 1 for i, s in enumerate(sizes) if s >= 6]
                al = np.isin(lab, keep).astype(float)
            rgba = np.dstack([sub, (al * 255).astype(np.uint8)])
            out.append(Image.fromarray(rgba, "RGBA"))
    return out


def build_enemy(name, spec):
    frames = cells(os.path.join(S, f"{name}.png"), 4, 2)

    def body(al):
        # main blob (gaps up to 6 px bridged): its centroid x and its lowest row are the anchor; debris and cracks below the feet do not move the body
        lab, n = ndi.label(ndi.binary_dilation(al, iterations=6))
        sizes = ndi.sum(al, lab, range(1, n + 1)); m = lab == (int(np.argmax(sizes)) + 1)
        ys, xs = np.nonzero(m & al); return xs.mean(), ys.max() + 1
    walk_h = max(f.getbbox()[3] - f.getbbox()[1] for f in frames[:4]); k = spec["h"] / walk_h
    info = []
    for f in frames:
        al = np.asarray(f)[..., 3] > 0; cx, bot = body(al)
        sf = f.resize((max(1, round(f.size[0] * k)), max(1, round(f.size[1] * k))), Image.LANCZOS)
        arr = np.asarray(sf).copy(); a = arr[..., 3].astype(int); arr[..., 3] = np.where(a < 90, 0, np.minimum(255, a * 5 // 4)).astype(np.uint8)
        im = Image.fromarray(arr, "RGBA"); bb = im.getbbox(); info.append((im, cx * k, bot * k, bb[1], bb[3]))
    up = int(max(i[2] - i[3] for i in info)) + 4                      # tallest extent above the feet line
    down = int(max(0, max(i[4] - i[2] for i in info))) + 4            # debris below the feet
    half = int(max(max(i[1], i[0].size[0] - i[1]) for i in info)) + 4
    FW, FH = half * 2, up + down
    strip = Image.new("RGBA", (FW * 8, FH), (0, 0, 0, 0))
    for idx, (im, cx, bot, top, bottom) in enumerate(info):
        strip.alpha_composite(im, (idx * FW + int(round(half - cx)), int(round(up - bot))))
    # baked 1-2 px pale-rose rim light: separates the dark gunmetal shells from the dark navy floor without a per-enemy shader
    arr = np.asarray(strip).copy(); solid = arr[..., 3] > 0; ring = ndi.binary_dilation(solid, iterations=1) & ~solid
    arr[ring] = (255, 150, 178, 150); strip = Image.fromarray(arr, "RGBA")
    strip.save(os.path.join(OUT, f"{name}.png"))
    manifest = {"schema": "kyntraze.enemy-anim/1", "enemy": name, "frame_width": FW, "frame_height": FH, "origin_px": [half, up], "frames": 8, "fps": spec["fps"],
                "clips": CLIPS, "facing": "east (mirrored for west)", "events": {"telegraph_frame": 4, "release_frame": 5, "hurt_frame": 6, "death_frame": 7},
                "source": f"art/enemies/source/{name}.png"}
    json.dump(manifest, open(os.path.join(OUT, f"{name}.json"), "w"), indent=1)
    print(name, "frame", FW, FH, "origin", half, up, "scale", round(k, 3))


def save_fx(n, f, size=None, k=None):
    c = f.crop(f.getbbox())
    if size: k = size / max(c.size)
    c = c.resize((max(2, round(c.size[0] * k)), max(2, round(c.size[1] * k))), Image.LANCZOS)
    arr = np.asarray(c).copy(); arr[..., 3] = np.where(arr[..., 3] < 90, 0, arr[..., 3]); Image.fromarray(arr, "RGBA").save(os.path.join(OUT, "fx", n + ".png")); print("fx", n, c.size)


def build_fx():
    # sheet 1: 4x2 markers (the flat ellipse ring / shockwave of this sheet are superseded by the true-circle sheet below and are not shipped)
    names = {0: ("aimline", 0.5), 2: ("chevron", 0.4), 3: ("bolt", 0.35), 4: ("bolt-hit", 0.4), 6: ("death-burst", 0.45), 7: ("hit-spark", 0.35)}
    frames = cells(os.path.join(S, "telegraph.png"), 4, 2)
    for i, (n, k) in names.items(): save_fx(n, frames[i], k=k)
    circles = cells(os.path.join(S, "circles.png"), 2, 1)
    save_fx("circle-warn", circles[0], size=256); save_fx("circle-slam", circles[1], size=300)


if __name__ == "__main__":
    for n, s in SPEC.items(): build_enemy(n, s)
    build_fx()

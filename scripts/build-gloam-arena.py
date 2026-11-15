"""Builds the Gloam Circuit runtime art from the ImageGen sheets in art/arenas/gloam/source (see PROVENANCE.md there).
  python scripts/build-gloam-arena.py
props.png (6 solid props) / decor.png (9 floor decals) / glyph.png / rim.png (rim strip + corner) / fx.png (4 hazard strips) / amb.png (motes + fog) / card.png.
Everything is keyed from flat #ff00ff by the B07 border flood-fill, scaled with LANCZOS to its footprint, and written with a manifest (props.json) whose
footprints are the collision rects the sim uses (src/content/arenas.ts must match). Authored at 2x (scale 0.5) like Kai and the enemies, except the rim,
corner and fx which are authored at the same 1x texel density as the 128 px floor tiles."""
import importlib.util, json, os
import numpy as np
from PIL import Image, ImageFilter

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("bea", os.path.join(R, "scripts", "build-enemy-art.py")); bea = importlib.util.module_from_spec(spec); spec.loader.exec_module(bea)
S = os.path.join(R, "art", "arenas", "gloam", "source"); OUT = os.path.join(R, "public", "art", "arenas", "gloam")
for d in ("props", "fx"): os.makedirs(os.path.join(OUT, d), exist_ok=True)

# footprint (world px, w x h) of every solid prop: the collision rect. Keep in sync with src/content/arenas.ts (tests assert it).
SOLID = [("generator", 125, 55), ("freight-pod", 90, 180), ("console-bank", 155, 64), ("reactor-block", 165, 70), ("vent-stack", 145, 48), ("crate-stack", 120, 80)]
# decor: name, target display width (world px), colour tweak (saturation mult, value mult)
DECOR = [("cable-a", 200, None), ("cable-b", 180, None), ("grate", 96, None), ("scorch-a", 130, (0.3, 0.5)), ("scorch-b", 130, (0.3, 0.5)),
         ("crack-a", 170, None), ("crack-b", 150, (0.35, 0.85)), ("stripes", 192, (0.5, 0.55)), ("puddle", 120, None)]


def tweak(img, sat, val):
    hsv = np.asarray(img.convert("RGB").convert("HSV")).astype(float); hsv[..., 1] *= sat; hsv[..., 2] *= val
    rgb = Image.fromarray(np.clip(hsv, 0, 255).astype(np.uint8), "HSV").convert("RGB"); out = np.dstack([np.asarray(rgb), np.asarray(img)[..., 3]]); return Image.fromarray(out, "RGBA")


def finish(im, width):
    """crop to the sprite, scale to `width` px, snap alpha (no soft magenta halo)."""
    c = im.crop(im.getbbox()); k = width / c.size[0]
    c = c.resize((max(2, round(c.size[0] * k)), max(2, round(c.size[1] * k))), Image.LANCZOS)
    a = np.asarray(c).copy(); al = a[..., 3].astype(int); a[..., 3] = np.where(al < 100, 0, np.minimum(255, al * 5 // 4)).astype(np.uint8)
    return defringe(Image.fromarray(a, "RGBA"))


def defringe(im, depth=4):
    """pixels on the sprite's outer rim that still carry the magenta key tint become the dark outline colour (no pink halo on the dark floor)."""
    a = np.asarray(im).copy(); solid = a[..., 3] > 0; edge = solid & bea.ndi.binary_dilation(~solid, iterations=depth)
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    key = solid & (r > 190) & (b > 140) & (g < 90); a[key, 3] = 0   # stray key-colour specks
    tint = edge & (r > g + 14) & (b > g + 14); a[tint, :3] = (14, 21, 32); return Image.fromarray(a, "RGBA")


def keymask(rgb, tol=70):
    d = np.sqrt((rgb[..., 0].astype(float) - 255) ** 2 + rgb[..., 1].astype(float) ** 2 + (rgb[..., 2].astype(float) - 255) ** 2); return d > tol


def components(path, n):
    """the n biggest connected sprites on a magenta sheet, ordered row-major (a tall sprite may cross the nominal cell grid, so cells would clip it)."""
    im = Image.open(path).convert("RGB"); rgb = np.asarray(im); al = bea.key_alpha(rgb) > 0
    lab, cnt = bea.ndi.label(bea.ndi.binary_dilation(al, iterations=3)); sizes = bea.ndi.sum(al, lab, range(1, cnt + 1))
    keep = [int(i) + 1 for i in np.argsort(sizes)[::-1][:n]]; items = []
    for k in keep:
        m = (lab == k) & al; ys, xs = np.nonzero(m); items.append((ys.mean(), xs.mean(), m))
    H = rgb.shape[0]; items.sort(key=lambda t: (0 if t[0] < H * 0.5 else 1, t[1]))
    return [Image.fromarray(np.dstack([rgb, (m * 255).astype(np.uint8)]), "RGBA") for _, _, m in items]


def build_props():
    manifest = {}
    frames = components(os.path.join(S, "props.png"), 6)
    for (name, fw, fh), f in zip(SOLID, frames):
        im = finish(f, fw * 2)
        # origin = bottom-centre of the base, which is the bottom-centre of the footprint rect
        manifest[name] = {"file": f"props/{name}.png", "scale": 0.5, "origin": [im.size[0] // 2, im.size[1]], "footprint": {"w": fw, "h": fh}, "solid": True, "size": list(im.size)}
        im.save(os.path.join(OUT, "props", name + ".png")); print("prop", name, im.size, "display", im.size[0] // 2, im.size[1] // 2, "footprint", fw, fh)
    frames = bea.cells(os.path.join(S, "decor.png"), 3, 3)
    for (name, w, tw), f in zip(DECOR, frames):
        if tw: f = tweak(f, *tw)
        im = finish(f, w * 2)
        manifest[name] = {"file": f"props/{name}.png", "scale": 0.5, "origin": [im.size[0] // 2, im.size[1] // 2], "solid": False, "size": list(im.size)}
        im.save(os.path.join(OUT, "props", name + ".png")); print("decor", name, im.size)
    g = bea.cells(os.path.join(S, "glyph.png"), 1, 1)[0]; g = tweak(g, 0.8, 0.95); g = g.crop(g.getbbox())
    a = np.asarray(g).copy(); al = a[..., 3].astype(int); a[..., 3] = np.where(al < 100, 0, 255).astype(np.uint8); g = Image.fromarray(a, "RGBA")
    manifest["core-glyph"] = {"file": "props/core-glyph.png", "scale": 0.5, "origin": [g.size[0] // 2, g.size[1] // 2], "solid": False, "size": list(g.size)}
    g = defringe(g, 4); g.save(os.path.join(OUT, "props", "core-glyph.png")); print("glyph", g.size, "display", g.size[0] // 2)
    json.dump({"schema": "kyntraze.arena-props/1", "arena": "gloam", "props": manifest}, open(os.path.join(OUT, "props.json"), "w"), indent=1)


def build_rim():
    src = Image.open(os.path.join(S, "rim.png")).convert("RGB"); a = np.asarray(src); m = keymask(a)
    top = m.copy(); top[500:] = False; ys, xs = np.nonzero(top); strip = src.crop((xs.min() + 3, ys.min() + 3, xs.max() - 2, ys.max() - 2)); sx0 = xs.min() + 3; sy0 = ys.min() + 3
    # one repeat = the third panel (plain on both seams); the wall is trimmed vertically (top band + upper plate + lower plate + teal edge) to the 96 px rim height
    px0, px1 = 722 - sx0, 1082 - sx0
    unit = strip.crop((px0, 0, px1, strip.size[1])); H = unit.size[1]
    a1, a2 = int(H * 0.27), int(H * 0.88)
    unit = Image.fromarray(np.vstack([np.asarray(unit)[:a1], np.asarray(unit)[a2:]]))
    k = 256 / unit.size[0]; unit = unit.resize((256, max(2, round(unit.size[1] * k))), Image.LANCZOS)
    # hide the 1 px seam asymmetry: blend the two outer columns
    u = np.asarray(unit).astype(float); u[:, 0] = u[:, -1] = (u[:, 0] + u[:, -1]) / 2; unit = Image.fromarray(u.astype(np.uint8))
    unit.save(os.path.join(OUT, "rim.png")); print("rim", unit.size)
    cm = m.copy(); cm[:500] = False; ys, xs = np.nonzero(cm); corner = src.crop((xs.min() + 3, ys.min() + 3, xs.max() - 2, ys.max() - 2))
    corner = corner.resize((round(corner.size[0] * k), round(corner.size[1] * k)), Image.LANCZOS).crop((0, 0, 128, 128)); corner.save(os.path.join(OUT, "corner.png")); print("corner", corner.size)


def seamless(arr):
    """blend a texture with itself rolled by half so left/right and top/bottom edges meet."""
    h, w = arr.shape[:2]; a = arr.astype(float); r = np.roll(np.roll(a, h // 2, 0), w // 2, 1)
    wy = np.sin(np.linspace(0, np.pi, h)) ** 2; wx = np.sin(np.linspace(0, np.pi, w)) ** 2; wt = (wy[:, None] * wx[None, :])[..., None]
    return (a * wt + r * (1 - wt)).astype(arr.dtype)


def tile_x(strip, period, fade=40):
    """make a strip tileable along x: take `period` columns and cross-fade the last `fade` columns with the columns that follow them."""
    a = np.asarray(strip).astype(float); body = a[:, :period].copy(); tail = a[:, period:period + fade]
    if tail.shape[1] == fade:
        t = np.linspace(0, 1, fade)[None, :, None]; body[:, :fade] = body[:, :fade] * t + tail * (1 - t)
    return Image.fromarray(body.astype(np.uint8))


def build_fx():
    src = Image.open(os.path.join(S, "fx.png")).convert("RGB"); W, H = src.size; a = np.asarray(src)
    names = [("surge-warn", 0, 0, 560), ("surge-warn-b", 1, 0, 560), ("surge-active", 0, 1, 560), ("surge-active-b", 1, 1, 560)]
    for name, cx, cy, period in names:
        sub = src.crop((cx * W // 2, cy * H // 2, (cx + 1) * W // 2, (cy + 1) * H // 2)); m = keymask(np.asarray(sub), 90)
        ys, xs = np.nonzero(m); box = (xs.min() + 4, ys.min() + 5, xs.max() - 3, ys.max() - 4); strip = sub.crop(box)
        per = min(period, strip.size[1] and strip.size[0] - 50); t = tile_x(strip, per)
        k = 84 / t.size[1]; t = t.resize((round(t.size[0] * k), 84), Image.LANCZOS); t.save(os.path.join(OUT, "fx", name + ".png")); print("fx", name, t.size)


def build_amb():
    src = Image.open(os.path.join(S, "amb.png")).convert("RGB"); W, H = src.size; a = np.asarray(src)
    # fog: the big square block (below y 280); luminance becomes alpha, colour a pale teal, then made seamless
    m = keymask(a, 90); m[:280] = False; ys, xs = np.nonzero(m); fog = src.crop((xs.min() + 10, ys.min() + 10, xs.max() - 9, ys.max() - 9)).resize((512, 512), Image.LANCZOS)
    f = np.asarray(fog).astype(float); lum = f.mean(axis=2); lo, hi = np.percentile(lum, 20), np.percentile(lum, 98)
    al = np.clip((lum - lo) / (hi - lo), 0, 1) ** 1.3 * 150
    rgba = np.dstack([np.full(lum.shape, 150), np.full(lum.shape, 200), np.full(lum.shape, 210), al]).astype(np.uint8); rgba = seamless(rgba)
    Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, "fx", "fog.png")); print("fog 512")
    # mote: the largest soft spark, alpha from distance to the key colour
    row = a[100:170]; mm = keymask(row, 60); ys, xs = np.nonzero(mm)
    cx = int(np.median(xs[(xs > 600) & (xs < 700)])) if ((xs > 600) & (xs < 700)).any() else 650
    crop = src.crop((cx - 20, 134 - 20, cx + 20, 134 + 20)); c = np.asarray(crop).astype(float)
    d = np.sqrt((c[..., 0] - 255) ** 2 + c[..., 1] ** 2 + (c[..., 2] - 255) ** 2); al = np.clip((d - 40) / 200, 0, 1)
    rgb = np.dstack([np.full(d.shape, 190), np.full(d.shape, 240), np.full(d.shape, 245)]); mote = Image.fromarray(np.dstack([rgb, al * 255]).astype(np.uint8), "RGBA").resize((16, 16), Image.LANCZOS)
    mote.save(os.path.join(OUT, "fx", "mote.png")); print("mote 16")


def build_card():
    Image.open(os.path.join(S, "card.png")).convert("RGB").resize((480, 270), Image.LANCZOS).save(os.path.join(OUT, "card.png")); print("card 480x270")


if __name__ == "__main__":
    build_props(); build_rim(); build_fx(); build_amb(); build_card()

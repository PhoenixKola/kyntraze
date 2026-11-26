"""Ren Ashen Eclipse ('f2') parts: ImageGen head sheets -> head_f1 / hair_f1 (the rig's part names; native scale, Eclipse palette) + the ash costume recolor of every body part, into the f2 build tree.
python prepare_f2.py south north east west   ->  art/characters/ren/f2/<dir>/parts  (+ form_geometry.json for south, like Kai's prepare_parts.py)"""
import importlib.util, json, os, shutil, sys
import numpy as np
from PIL import Image

REN = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); REPO = os.path.dirname(os.path.dirname(os.path.dirname(REN)))
KX = os.path.join(REPO, "art", "characters", "kai", "base", "production-south-candidate", "tools", "extract.py")
spec = importlib.util.spec_from_file_location("kx", KX); kx = importlib.util.module_from_spec(spec); spec.loader.exec_module(kx)
_fp = kx.fit_period
kx.fit_period = lambda prof, lo=11.0, hi=13.6, step=0.02: _fp(prof, lo, hi, step)


def asc_palette(n=56):
    px = []
    for d in ("south", "north", "east", "west"):
        p = os.path.join(REN, "f2", "source", f"{d}-heads.png")
        if os.path.exists(p): a = np.array(Image.open(p).convert("RGB")); px.append(a[~kx.background(a)])
    px = np.concatenate(px); q = Image.fromarray(px.reshape(1, -1, 3), "RGB").quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    return np.array(q.getpalette()[:n * 3], np.int32).reshape(n, 3)


ASH = np.array([[26, 22, 24], [44, 38, 40], [70, 62, 62], [104, 94, 88]], np.float32)       # charred cloth, dark -> light
BONE = np.array([[92, 80, 70], [150, 134, 114], [206, 190, 164], [238, 226, 200]], np.float32)  # ash wraps / bone-ash trim
EMBER = np.array([255, 150, 50], np.float32)


def _ramp(r, v, lo=0.12, hi=0.95):
    t = np.clip((v - lo) / (hi - lo), 0, 1) * (len(r) - 1); i = np.floor(t).astype(int).clip(0, len(r) - 2); f = (t - i)[..., None]; return r[i] * (1 - f) + r[i + 1] * f


def ash_costume(path, name):
    """Ashen Eclipse costume: crimson trim / sash / stripes -> bone-ash, dark cloth -> warm charcoal, gauntlets -> broken ash wraps, hems and sash tails torn into ragged notches, the scar becomes glowing fissures.
    Same pixel grid and pivots as the Ascendant parts, so the rig and fit data stay valid. Deterministic (a hash of the pixel position, no RNG)."""
    import colorsys
    im = np.array(Image.open(path).convert("RGBA")).astype(np.float32); H, W = im.shape[:2]; rgb = im[..., :3] / 255; out = im.copy(); alpha = im[..., 3] > 0
    ys, xs = np.nonzero(alpha)
    if not len(ys): return
    top, bot = ys.min(), ys.max()
    for y in range(H):
        for x in range(W):
            if not alpha[y, x]: continue
            h, s, v = colorsys.rgb_to_hsv(*rgb[y, x]); red = (h > 0.93 or h < 0.04) and s > 0.45 and v > 0.2; skin = 0.02 < h < 0.12 and 0.2 < s < 0.7 and v > 0.5
            if red: out[y, x, :3] = np.round(_ramp(BONE, np.array(v) * 1.15))
            elif v < 0.2: pass
            elif not skin: out[y, x, :3] = np.round(_ramp(ASH, np.array(v)))
            else:
                n = (x * 73856093 ^ y * 19349663) % 97
                if n < 3 and name.startswith(("upper_arm", "torso", "forearm")): out[y, x, :3] = EMBER   # sparse glowing fissure pixels in the skin
    if name.startswith(("sash_tails", "lining", "hips")):   # ragged, burned edge: notches along the lower edge
        for x in range(W):
            col = np.nonzero(alpha[:, x])[0]
            if not len(col): continue
            n = (x * 2654435761) % 11
            if n < 4: cut = int(1 + (n + 1) * 1.5); out[max(col.max() - cut, 0): col.max() + 1, x, 3] = 0
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").save(path)


def prepare(d, pal):
    dst = os.path.join(REN, "f2", d, "parts"); os.makedirs(dst, exist_ok=True)
    for f in os.listdir(os.path.join(REN, d, "parts")):
        if f.endswith((".png", ".json")): shutil.copyfile(os.path.join(REN, d, "parts", f), os.path.join(dst, f))
    for f in os.listdir(dst):
        if f.endswith(".png") and not f.startswith(("head", "hair")): ash_costume(os.path.join(dst, f), f)
    rgb = np.array(Image.open(os.path.join(REN, "f2", "source", f"{d}-heads.png")).convert("RGB")); boxes = kx.components(~kx.background(rgb)); assert len(boxes) == 2, (d, len(boxes))
    area = lambda b: (b[2] - b[0]) * (b[3] - b[1]); head_b, hair_b = sorted(boxes, key=area, reverse=True)
    for name, b in (("head_f1", head_b), ("hair_f1", hair_b)):
        pad = 8; x0, y0, x1, y1 = max(0, b[0] - pad), max(0, b[1] - pad), min(rgb.shape[1], b[2] + pad), min(rgb.shape[0], b[3] + pad)
        crop = rgb[y0:y1, x0:x1].copy(); gx, gy = kx.detect_grid(crop, pal); nat = kx.trim(kx.to_native_grid(crop, pal, gx, gy))
        if name == "head_f1" and nat.shape[0] > 62:   # taller than the rig's head room: coarser cell
            k = nat.shape[0] / 60.0; nat = kx.trim(kx.to_native(crop, (gx[0] * k, gy[0] * k), pal))
        Image.fromarray(nat).save(os.path.join(dst, name + ".png")); print(d, name, nat.shape[1], "x", nat.shape[0])
    if d == "south":   # geometry the SOUTH rig needs (Blender's Python has no Pillow); same rule as Kai's prepare_parts.py
        def mask(f):
            a = np.array(Image.open(os.path.join(dst, f)).convert("RGBA"))[..., 3] > 0; ys, xs = np.nonzero(a); return a, int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
        a, t, B, x0, x1 = mask("head_f1.png"); bot = float(np.nonzero(a[B - 4:B])[1].mean() + 0.5)
        a2, t2, B2, x02, x12 = mask("hair_f1.png"); ex = x12 - 6.0; col = a2[:, int(ex)]
        json.dump({"head_pivot": [bot, B - 7.0], "attach": [x0 + 0.45 * (x1 - x0), t + 0.58 * (B - t)], "hair_pivot": [ex, float(np.nonzero(col)[0].mean() + 0.5) if col.any() else (t2 + B2) / 2]}, open(os.path.join(dst, "form_geometry.json"), "w"))


if __name__ == "__main__":
    pal = asc_palette(); json.dump(pal.tolist(), open(os.path.join(REN, "f2", "palette.json"), "w"))
    for d in sys.argv[1:]: prepare(d, pal)

"""Ren Ascendant ('f1') parts: ImageGen head sheets -> head_f1 / hair_f1 (native scale, Ascendant palette, no painted pixels) and the f1 build tree.
python prepare_f1.py south north east west   ->  art/characters/ren/f1/<dir>/parts  (+ form_geometry.json for south, like Kai's prepare_parts.py)"""
import importlib.util, json, os, shutil, sys
import numpy as np
from PIL import Image

VEX = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); REPO = os.path.dirname(os.path.dirname(os.path.dirname(VEX)))
KX = os.path.join(REPO, "art", "characters", "kai", "base", "production-south-candidate", "tools", "extract.py")
spec = importlib.util.spec_from_file_location("kx", KX); kx = importlib.util.module_from_spec(spec); spec.loader.exec_module(kx)
_fp = kx.fit_period
kx.fit_period = lambda prof, lo=11.0, hi=13.6, step=0.02: _fp(prof, lo, hi, step)


def asc_palette(n=56):
    px = []
    for f in ("ren-px-base.png", "ren-px-asc.png"):
        a = np.array(Image.open(os.path.join(VEX, "concept", f)).convert("RGB")); px.append(a[~kx.background(a)])
    px = np.concatenate(px); q = Image.fromarray(px.reshape(1, -1, 3), "RGB").quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    return np.array(q.getpalette()[:n * 3], np.int32).reshape(n, 3)


def prepare(d, pal):
    dst = os.path.join(VEX, "f1", d, "parts"); os.makedirs(dst, exist_ok=True)
    for f in os.listdir(os.path.join(VEX, d, "parts")):
        if f.endswith((".png", ".json")): shutil.copyfile(os.path.join(VEX, d, "parts", f), os.path.join(dst, f))
    rgb = np.array(Image.open(os.path.join(VEX, "f1", "source", f"{d}-heads.png")).convert("RGB")); boxes = kx.components(~kx.background(rgb)); assert len(boxes) == 2, (d, len(boxes))
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
    pal = asc_palette(); json.dump(pal.tolist(), open(os.path.join(VEX, "f1", "palette.json"), "w"))
    for d in sys.argv[1:]: prepare(d, pal)

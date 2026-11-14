"""Assemble <dir>/parts for the Form I rig: all base parts (byte copies) + the recoloured Form I head and rear hair.
  python prepare_parts.py <direction> [look]     look = key in palette.json (default: the provisional candidate)
Recolour = hair ramp (by lightness) and eye glint only; skin, outlines, jacket and boots are untouched."""
import json, os, shutil, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); KAI = os.path.dirname(FORM); BASE = os.path.join(KAI, "base")
BASE_PARTS = {"south": os.path.join(BASE, "production-south-candidate", "parts")}
for d in ("north", "east", "west"): BASE_PARTS[d] = os.path.join(BASE, "production-other-directions-candidate", d, "parts")
PAL = json.load(open(os.path.join(FORM, "palette.json")))

def recolor(a, look):
    ramp = np.array(look["hair"], np.uint8); eye = np.array(look["eye"], np.uint8); out = a.copy(); rgb = a[..., :3].astype(int)
    lum = 0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]; op = a[..., 3] > 0
    skin = (rgb[..., 0] - rgb[..., 2] > 35) & (rgb[..., 0] > rgb[..., 1])
    glint = (lum > 150) & ~skin
    # eyes, brows and mouth sit inside skin: dark non-skin pixels with many skin pixels around them are face detail and keep their approved colours
    k = np.pad(skin.astype(int), 2); near = sum(k[dy:dy + skin.shape[0], dx:dx + skin.shape[1]] for dy in range(5) for dx in range(5))
    face = op & ~skin & ~glint & (lum < 96) & (near >= 8)
    hair = op & ~skin & ~glint & (lum > 26) & ~face
    stop = np.digitize(lum, [46, 71, 96])
    out[hair, :3] = ramp[stop[hair]]; out[op & glint, :3] = eye
    out[face & (lum >= 46), :3] = ramp[0]      # brows/lashes lighter than the outline take the hair's darkest tone so they match the new hair colour (no slate-blue strokes on the face)
    return out

if __name__ == "__main__":
    d = sys.argv[1]; key = sys.argv[2] if len(sys.argv) > 2 else PAL["candidate"]; look = PAL["looks"][key]
    dst = os.path.join(FORM, d, "parts"); os.makedirs(dst, exist_ok=True)
    for f in os.listdir(BASE_PARTS[d]):
        if f.endswith(".png"): shutil.copyfile(os.path.join(BASE_PARTS[d], f), os.path.join(dst, f))
    for n in ("head_f1", "hair_f1"):
        a = np.array(Image.open(os.path.join(FORM, "parts-neutral", d, n + ".png")).convert("RGBA")); Image.fromarray(recolor(a, look)).save(os.path.join(dst, n + ".png"))
    # geometry the SOUTH rig needs (it cannot import Pillow inside Blender): head pivot (neck stub, 7 px above the bottom like the base head), skull attach point of the hair bone, hair root pivot
    def mask(f):
        a = np.array(Image.open(os.path.join(dst, f)).convert("RGBA"))[..., 3] > 0; ys, xs = np.nonzero(a); return a, int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
    a, t, B, x0, x1 = mask("head_f1.png"); bot = float(np.nonzero(a[B - 4:B])[1].mean() + 0.5)
    a2, t2, B2, x02, x12 = mask("hair_f1.png"); side_left = d in ("west", "north"); ex = x02 + 6.0 if side_left else x12 - 6.0; col = a2[:, int(ex)]
    json.dump({"head_pivot": [bot, B - 7.0], "attach": [x0 + 0.45 * (x1 - x0), t + 0.58 * (B - t)], "hair_pivot": [ex, float(np.nonzero(col)[0].mean() + 0.5) if col.any() else (t2 + B2) / 2]}, open(os.path.join(dst, "form_geometry.json"), "w"))
    print(d, key, "parts ->", dst)

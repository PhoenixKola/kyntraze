"""Ren SOUTH parts: ImageGen sheets -> native-scale palette-mapped part PNGs (no painted pixels). Reuses Kai's extractor functions (read-only import).
python extract_south.py   -> art/characters/ren/south/parts-raw/*.png + palette.json"""
import importlib.util, json, os
import numpy as np
from PIL import Image
VEX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KX = os.path.join(os.path.dirname(os.path.dirname(VEX)), "characters", "kai", "base", "production-south-candidate", "tools", "extract.py")
spec = importlib.util.spec_from_file_location("kx", KX); kx = importlib.util.module_from_spec(spec); spec.loader.exec_module(kx)

def ren_palette(n=40):
    a = np.array(Image.open(os.path.join(VEX, "concept", "ren-px-base.png")).convert("RGB")); bg = kx.background(a)
    px = a[~bg]; q = Image.fromarray(px.reshape(1, -1, 3), "RGB").quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    return np.array(q.getpalette()[:n * 3], np.int32).reshape(n, 3)

# the generator drew these pieces ~25 % larger than the Kai rig expects: sample them on a coarser cell (palette-mode per cell, no painted pixels)
SCALE = {"torso": (16.5, 18.0), "forearm_n": (14.6, 14.6), "forearm_f": (14.6, 14.6), "upper_arm_n": (14.2, 14.2), "upper_arm_f": (14.2, 14.2), "head": (12.6, 12.6)}
SHEETS = {"s1": ["head", "fist_guard", "fist_waist", "fist_front", "fist_front_angle"], "s2": ["torso"],
          "s3": ["hips", "sash_band", "sash_tails", "thigh_n", "thigh_f"], "s5": ["shin_n", "shin_f", "boot_n", "boot_f"],
          "s6": ["upper_arm_n", "upper_arm_f", "forearm_n", "forearm_f"]}
_fp = kx.fit_period
kx.fit_period = lambda prof, lo=11.0, hi=13.6, step=0.02: _fp(prof, lo, hi, step)   # the sheets use ~12 px art pixels; a narrower search avoids picking a harmonic
if __name__ == "__main__":
    pal = ren_palette(); out = os.path.join(VEX, "south", "parts-raw"); os.makedirs(out, exist_ok=True)
    json.dump(pal.tolist(), open(os.path.join(VEX, "palette.json"), "w"))
    for sh, names in SHEETS.items():
        rgb = np.array(Image.open(os.path.join(VEX, "south", "source", f"vex-{sh}.png")).convert("RGB")); boxes = kx.components(~kx.background(rgb))
        assert len(boxes) == len(names), (sh, len(boxes))
        for name, b in zip(names, boxes):
            pad = 8; x0, y0, x1, y1 = max(0, b[0] - pad), max(0, b[1] - pad), min(rgb.shape[1], b[2] + pad), min(rgb.shape[0], b[3] + pad)
            crop = rgb[y0:y1, x0:x1].copy(); gx, gy = kx.detect_grid(crop, pal)
            nat = kx.trim(kx.to_native(crop, SCALE[name], pal)) if name in SCALE else kx.trim(kx.to_native_grid(crop, pal, gx, gy))
            Image.fromarray(nat).save(os.path.join(out, name + ".png")); print(name, nat.shape[1], "x", nat.shape[0], "grid", round(gx[0], 2), round(gy[0], 2))

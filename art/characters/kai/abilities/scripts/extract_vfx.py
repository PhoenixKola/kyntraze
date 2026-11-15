"""Cut the B07-pre ImageGen VFX sheets (source/vfx-a.png, vfx-b.png) into native-resolution sprites with a cyan ('_b') and a solar ('_s') colour ramp.
Same method as extract_fx.py (palette-map to the 5 neutral tones, per-cell mode at native scale, no painting). Pieces are located by hand-set row/column bands of the known layouts.
  python extract_vfx.py   -> abilities/fx/vfx/<name>_{b,s}.png (+ neutral <name>.png) and fx/vfx/vfx.json"""
import importlib.util, json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); AB = os.path.dirname(HERE); KAI = os.path.dirname(AB)
spec = importlib.util.spec_from_file_location("south_extract", os.path.join(KAI, "base", "production-south-candidate", "tools", "extract.py")); ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)
PAL = np.array([[255, 255, 255], [223, 230, 242], [186, 197, 220], [140, 154, 184], [58, 69, 96]], np.int32)
RAMP = {"b": np.array([[255, 255, 255], [190, 245, 255], [95, 215, 245], [35, 150, 215], [14, 70, 140]], np.uint8),
        "s": np.array([[255, 250, 225], [255, 228, 150], [255, 180, 60], [230, 115, 20], [130, 55, 12]], np.uint8)}
# (sheet, name, y0, y1, x0, x1, scale)  - bands read off the sheets (source px)
S2, S15, S3 = 2.9, 1.5, 2.0
PIECES = [
 ("vfx-a", "bolt", 0, 275, 0, 620, S2), ("vfx-a", "hit", 0, 275, 620, 1180, S2), ("vfx-a", "spark", 0, 275, 1180, 1672, S2),
 ("vfx-a", "dash_lines", 275, 590, 0, 620, S2), ("vfx-a", "dash_slash", 275, 590, 620, 1130, S2), ("vfx-a", "dust", 275, 590, 1130, 1672, S2), ("vfx-a", "DEBRIS", 590, 941, 1150, 1672, S2),
 ("vfx-b", "boom", 0, 350, 0, 530, S15), ("vfx-b", "plume", 0, 350, 1170, 1672, S3),
 ("vfx-b", "embers", 350, 625, 0, 540, S2), ("vfx-b", "scorch", 350, 625, 540, 1100, S15), ("vfx-b", "MOTES", 625, 941, 570, 1150, S2), ("vfx-b", "swirl", 625, 941, 1150, 1672, S3),
 ("vfx-c", "circ_zone", 0, 470, 0, 836, 1.45), ("vfx-c", "circ_rune", 0, 470, 836, 1672, 1.45), ("vfx-c", "circ_wave", 470, 941, 0, 836, 1.45), ("vfx-c", "circ_crack", 470, 941, 836, 1672, 1.45),
]
def native(rgb, scale):
    return ex.trim(ex.to_native(rgb, scale, PAL))
def recolor(nat, key, name):
    """nat is RGBA palette-mapped to PAL colours; map each PAL colour to the ramp (or to a soft black decal for the scorch)."""
    out = nat.copy(); a = nat[..., 3] > 0
    idx = ((nat[..., None, :3].astype(int) - PAL[None, None]) ** 2).sum(-1).argmin(-1)
    if name == "scorch":
        out[..., :3] = (6, 10, 20); out[..., 3] = np.where(a, np.array([60, 90, 120, 190, 235])[idx], 0)
    else: out[..., :3] = RAMP[key][idx]
    return out
def comps(rgb, min_px=60):
    m = ~ex.background(rgb); boxes = ex.components(m, min_px)
    return sorted([tuple(int(v) for v in b[:4]) for b in boxes], key=lambda b: b[0])
if __name__ == "__main__":
    sheets = {n: np.array(Image.open(os.path.join(AB, "source", n + ".png")).convert("RGB")) for n in ("vfx-a", "vfx-b", "vfx-c")}
    out = os.path.join(AB, "fx", "vfx"); os.makedirs(out, exist_ok=True); rec = {}
    def save(name, nat):
        Image.fromarray(nat).save(os.path.join(out, name + ".png"))
        for k in "bs": Image.fromarray(recolor(nat, k, name)).save(os.path.join(out, f"{name}_{k}.png"))
        rec[name] = [int(nat.shape[1]), int(nat.shape[0])]
    for sheet, name, y0, y1, x0, x1, sc in PIECES:
        crop = sheets[sheet][y0:y1, x0:x1].copy()
        if name == "DEBRIS":
            bx = [b for b in comps(crop) if (b[2] - b[0]) * (b[3] - b[1]) > 400]; assert len(bx) == 4, bx
            for i, b in enumerate(bx): save(f"debris{i}", native(crop[max(0, b[1] - 6):b[3] + 6, max(0, b[0] - 6):b[2] + 6].copy(), sc))
        elif name == "MOTES":
            bx = [b for b in comps(crop) if (b[2] - b[0]) * (b[3] - b[1]) > 900]; bx.sort(key=lambda b: -(b[2] - b[0]) * (b[3] - b[1])); assert len(bx) >= 5, bx
            for i, j in enumerate((0, 2, 4)): b = bx[j]; save(f"mote{i}", native(crop[max(0, b[1] - 6):b[3] + 6, max(0, b[0] - 6):b[2] + 6].copy(), sc))
        else: save(name, native(crop, sc))
    import shutil; pub = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(KAI))), "public", "art", "fx", "kai-abilities", "vfx"); os.makedirs(pub, exist_ok=True)
    for n in rec:
        for k in "bs": shutil.copy(os.path.join(out, f"{n}_{k}.png"), os.path.join(pub, f"{n}_{k}.png"))
    json.dump(rec, open(os.path.join(out, "vfx.json"), "w"), indent=1); print(rec)

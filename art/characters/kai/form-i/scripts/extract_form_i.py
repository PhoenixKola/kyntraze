"""Cut the Form I head sheets into native-scale parts (same method as base/production-other-directions-candidate/scripts/extract_dir.py: every source pixel
mapped to the approved reference palette, one cell of `scale` source px per native px; no pixels painted).
  python extract_form_i.py <direction> [scale]      scale = source px per native px (the sheet's 10x10 art-pixel block, measured ~14)"""
import importlib.util, json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); KAI = os.path.dirname(FORM)
spec = importlib.util.spec_from_file_location("south_extract", os.path.join(KAI, "base", "production-south-candidate", "tools", "extract.py"))
ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)
def no_gold(pal): return np.array([c for c in pal if not (c[0] > 200 and 130 < c[1] < 200 and c[2] < 110)], np.int32)
if __name__ == "__main__":
    d = sys.argv[1]; scale = float(sys.argv[2]) if len(sys.argv) > 2 else 14.0
    rgb = np.array(Image.open(os.path.join(FORM, "source", f"{d}-heads.png")).convert("RGB")); pal = no_gold(ex.ref_palette())
    boxes = sorted(ex.components(~ex.background(rgb)), key=lambda b: -b[4]); assert len(boxes) == 2, [b[:4] for b in boxes]
    out = os.path.join(FORM, "parts-neutral", d); os.makedirs(out, exist_ok=True); rec = {}
    for name, b in (("head_f1", boxes[0]), ("hair_f1", boxes[1])):
        pad = 8; x0, y0, x1, y1 = max(0, b[0] - pad), max(0, b[1] - pad), min(rgb.shape[1], b[2] + pad), min(rgb.shape[0], b[3] + pad)
        nat = ex.trim(ex.to_native(rgb[y0:y1, x0:x1].copy(), scale, pal)); Image.fromarray(nat).save(os.path.join(out, name + ".png"))
        rec[name] = dict(sheet=f"source/{d}-heads.png", box=[int(v) for v in b[:4]], scale=scale, native=[int(nat.shape[1]), int(nat.shape[0])])
    json.dump(rec, open(os.path.join(out, "extract.json"), "w"), indent=1); print(d, {k: v["native"] for k, v in rec.items()})

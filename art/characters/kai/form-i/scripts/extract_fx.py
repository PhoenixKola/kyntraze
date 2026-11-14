"""Cut the ImageGen FX sheet into small neutral sprites (tinted at runtime). Same extraction method as the character parts, with the 4-tone neutral FX palette.
  python extract_fx.py    -> form-i/fx/<name>.png and a copy-ready list"""
import importlib.util, json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); KAI = os.path.dirname(FORM)
spec = importlib.util.spec_from_file_location("south_extract", os.path.join(KAI, "base", "production-south-candidate", "tools", "extract.py")); ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)
NAMES = ["wisp_a", "wisp_b", "wisp_c", "spark", "ring", "arc_h", "arc_v", "glow"]
PAL = np.array([[255, 255, 255], [223, 230, 242], [186, 197, 220], [140, 154, 184], [58, 69, 96]], np.int32)   # 5 neutral tones; the v2 sheet uses 5x5-px art blocks (~5.8 src px)
SCALE = 5.8
def merge(boxes, grow=50):
    """The v2 flames shed detached ember specks: fold every small component into the large piece whose grown box contains it."""
    big = [list(map(int, b[:4])) for b in boxes if (b[2] - b[0]) * (b[3] - b[1]) > 4000]
    for b in boxes:
        if (b[2] - b[0]) * (b[3] - b[1]) > 4000: continue
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        for g in big:
            if g[0] - grow <= cx <= g[2] + grow and g[1] - grow <= cy <= g[3] + grow: g[0], g[1], g[2], g[3] = min(g[0], b[0]), min(g[1], b[1]), max(g[2], b[2]), max(g[3], b[3]); break
    return [tuple(g) + (0,) for g in big]

if __name__ == "__main__":
    rgb = np.array(Image.open(os.path.join(FORM, "source", "fx-sheet.png")).convert("RGB")); boxes = merge(ex.components(~ex.background(rgb))); boxes = sorted(boxes, key=lambda b: (round(b[1] / 300), b[0])); assert len(boxes) == len(NAMES), [b[:4] for b in boxes]
    out = os.path.join(FORM, "fx"); os.makedirs(out, exist_ok=True); rec = {}
    for n, b in zip(NAMES, boxes):
        pad = 8; nat = ex.trim(ex.to_native(rgb[max(0, b[1] - pad):b[3] + pad, max(0, b[0] - pad):b[2] + pad].copy(), SCALE, PAL)); Image.fromarray(nat).save(os.path.join(out, n + ".png")); rec[n] = [int(nat.shape[1]), int(nat.shape[0])]
    json.dump(rec, open(os.path.join(out, "fx.json"), "w"), indent=1); print(rec)

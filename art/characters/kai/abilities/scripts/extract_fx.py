"""Cut the B05 ImageGen FX sheet into neutral sprites (tinted at runtime). Same extraction method as the Form I FX.
  python extract_fx.py    -> abilities/fx/<name>.png. The beam segment is made seamless by mirroring its middle slice (pure pixel op, no painting)."""
import importlib.util, json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); AB = os.path.dirname(HERE); KAI = os.path.dirname(AB)
spec = importlib.util.spec_from_file_location("south_extract", os.path.join(KAI, "base", "production-south-candidate", "tools", "extract.py")); ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)
NAMES = ["beam_seg", "muzzle", "impact", "orb", "streak", "sphere", "trail", "ring", "flash", "dome"]   # row-major order on the sheet
PAL = np.array([[255, 255, 255], [223, 230, 242], [186, 197, 220], [140, 154, 184], [58, 69, 96]], np.int32)
SCALE = 5.8
def merge(boxes, min_area=5000, grow=60):
    big = [list(map(int, b[:4])) for b in boxes if (b[2] - b[0]) * (b[3] - b[1]) > min_area]
    for b in boxes:
        if (b[2] - b[0]) * (b[3] - b[1]) > min_area: continue
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        for g in big:
            if g[0] - grow <= cx <= g[2] + grow and g[1] - grow <= cy <= g[3] + grow: g[0], g[1], g[2], g[3] = min(g[0], b[0]), min(g[1], b[1]), max(g[2], b[2]), max(g[3], b[3]); break
    return [tuple(g) + (0,) for g in big]
def row_major(boxes):
    rows = [[], [], []]
    for b in boxes: cy = (b[1] + b[3]) / 2; rows[0 if cy < 280 else 1 if cy < 540 else 2].append(b)
    return [b for r in rows for b in sorted(r, key=lambda b: b[0])]
if __name__ == "__main__":
    rgb = np.array(Image.open(os.path.join(AB, "source", "fx-sheet.png")).convert("RGB")); boxes = row_major(merge(ex.components(~ex.background(rgb)))); assert len(boxes) == len(NAMES), [b[:4] for b in boxes]
    out = os.path.join(AB, "fx"); os.makedirs(out, exist_ok=True); rec = {}
    for n, b in zip(NAMES, boxes):
        pad = 8; nat = ex.trim(ex.to_native(rgb[max(0, b[1] - pad):b[3] + pad, max(0, b[0] - pad):b[2] + pad].copy(), SCALE, PAL))
        if n == "beam_seg":   # seamless horizontal repeat: [slice | mirrored slice]
            w = nat.shape[1]; sl = nat[:, w // 4: w // 4 + w // 2]; nat = np.concatenate([sl, sl[:, ::-1]], axis=1)
        Image.fromarray(nat).save(os.path.join(out, n + ".png")); rec[n] = [int(nat.shape[1]), int(nat.shape[0])]
    json.dump(rec, open(os.path.join(out, "fx.json"), "w"), indent=1); print(rec)

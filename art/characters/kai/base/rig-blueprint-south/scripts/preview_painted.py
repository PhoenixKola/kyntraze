"""Assemble painted parts on the SOUTH rig with the same FK as Blender (verified equal) and write preview sheets.
  python scripts/preview_painted.py <folder with <part_id>.png> <out folder>
Missing parts fall back to the template so gaps stay visible (and are listed)."""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rig_core as rc
KIT = os.path.dirname(HERE)
spec = json.load(open(os.path.join(KIT, "rig-spec.json")))
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
imgs, missing = {}, []
for p in spec["parts"]:
    f = os.path.join(src, p["id"] + ".png")
    if not os.path.exists(f): missing.append(p["id"]); f = os.path.join(KIT, p["file"])
    imgs[p["id"]] = (np.array(Image.open(f).convert("RGBA")), *p["rest_origin_char_px"])
frames = rc.QA_POSES
tiles = []
for fr in frames:
    a = rc.render(dict(angles=fr["angles"], root=tuple(fr["root"]), hands=fr["hands"]), imgs)
    Image.fromarray(a, "RGBA").save(os.path.join(out, fr["name"] + ".png"))
    bg = Image.new("RGBA", (128, 186), (40, 40, 48, 255)); bg.alpha_composite(Image.fromarray(a, "RGBA").crop((16, 4, 144, 190))); tiles.append(bg)
for Z, name in ((1, "sheet-1x.png"), (3, "sheet-3x.png")):
    sh = Image.new("RGBA", (8 * 128 * Z, 2 * 186 * Z), (24, 24, 28, 255))
    for i, t in enumerate(tiles): sh.alpha_composite(t.resize((128 * Z, 186 * Z), Image.NEAREST), ((i % 8) * 128 * Z, (i // 8) * 186 * Z))
    sh.save(os.path.join(out, name))
print("missing (template used):", ", ".join(missing) or "none")

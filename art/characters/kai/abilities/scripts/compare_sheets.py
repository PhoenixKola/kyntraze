"""Four-direction key-frame comparison from the REAL exported sheets (public/art): python compare_sheets.py <base|f1> <Beam|Sphere> <out.png> [zoom]"""
import json, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..")); form, clip, out = sys.argv[1], sys.argv[2], sys.argv[3]; Z = int(sys.argv[4]) if len(sys.argv) > 4 else 2
FR = {"Beam": [0, 4, 8, 10, 12, 16, 19, 22, 25], "Sphere": [0, 4, 8, 12, 15, 16, 17, 19, 23]}[clip]
rows = []
for d in ("south", "north", "east", "west"):
    base = os.path.join(ROOT, "public", "art", "kai-f1" if form == "f1" else "kai", d); m = json.load(open(os.path.join(base, "manifest.json")))["animations"][clip]
    sh = Image.open(os.path.join(base, m["sheet"])).convert("RGBA"); fw, fh = m["frame_width"], m["frame_height"]
    rows.append([sh.crop((i * fw, 0, (i + 1) * fw, fh)) for i in FR])
cw = max(f.width for r in rows for f in r) * Z; ch = max(f.height for r in rows for f in r) * Z
im = Image.new("RGBA", (cw * len(FR), ch * 4), (40, 40, 50, 255)); dr = ImageDraw.Draw(im)
for y, r in enumerate(rows):
    for x, f in enumerate(r):
        im.alpha_composite(f.resize((f.width * Z, f.height * Z), Image.NEAREST), (x * cw + (cw - f.width * Z) // 2, y * ch + ch - f.height * Z)); dr.text((x * cw + 3, y * ch + 2), f"{clip} {FR[x]}", fill=(255, 230, 120))
im.save(out); print(im.size)

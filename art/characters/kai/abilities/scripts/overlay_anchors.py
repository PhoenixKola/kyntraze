"""Hand -> muzzle proof drawn on the REAL exported sheets: python overlay_anchors.py <base|f1> <Beam|Sphere> <out.png> [zoom]
Rows = south/north/east/west; columns = key frames. Red/green dots = near/far fist anchors, yellow cross = midpoint (muzzle / orb point). Anchors are placed with the manifest origin only,
exactly like the game, so a dot that is not on a fist would be a visible failure."""
import json, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..")); form, clip, out = sys.argv[1], sys.argv[2], sys.argv[3]; Z = int(sys.argv[4]) if len(sys.argv) > 4 else 3
FR = {"Beam": [4, 9, 10, 14, 22], "Sphere": [3, 9, 15, 16, 19]}[clip]
anch = json.load(open(os.path.join(ROOT, "public", "art", "kai-anchors.json")))["forms"][form]; rows = []
for d in ("south", "north", "east", "west"):
    base = os.path.join(ROOT, "public", "art", "kai-f1" if form == "f1" else "kai", d); m = json.load(open(os.path.join(base, "manifest.json")))["animations"][clip]
    sh = Image.open(os.path.join(base, m["sheet"])).convert("RGBA"); fw, fh = m["frame_width"], m["frame_height"]; ox, oy = m["origin_px"]; r = []
    for i in FR:
        f = Image.new("RGBA", (fw, fh), (40, 40, 50, 255)); f.alpha_composite(sh.crop((i * fw, 0, (i + 1) * fw, fh))); f = f.resize((fw * Z, fh * Z), Image.NEAREST); dr = ImageDraw.Draw(f); a = anch[d][clip][i]
        for k, col in (("n", (255, 60, 60)), ("f", (60, 255, 90))): x, y = (ox + a[k][0]) * Z, (oy + a[k][1]) * Z; dr.ellipse((x - 3, y - 3, x + 3, y + 3), outline=col, width=2)
        x, y = (ox + a["m"][0]) * Z, (oy + a["m"][1]) * Z; dr.line((x - 9, y, x + 9, y), fill=(255, 230, 0), width=2); dr.line((x, y - 9, x, y + 9), fill=(255, 230, 0), width=2)
        dr.text((3, 2), f"{d} {clip} {i}", fill=(255, 230, 120)); dr.line((ox * Z - 4, oy * Z, ox * Z + 4, oy * Z), fill=(0, 200, 255)); r.append(f)
    rows.append(r)
cw = max(f.width for r in rows for f in r); ch = max(f.height for r in rows for f in r); im = Image.new("RGBA", (cw * len(FR), ch * 4), (40, 40, 50, 255))
for y, r in enumerate(rows):
    for x, f in enumerate(r): im.paste(f, (x * cw, y * ch))
im.save(out); print(im.size)

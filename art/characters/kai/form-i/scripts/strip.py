"""Quick review strip from exported sheets: python strip.py <dir> <out.png> Clip:frames ... (3x, magnified)"""
import json, os, sys
from PIL import Image
FORM = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); d = sys.argv[1]; z = 3
sheets = os.path.join(FORM, d, "sheets") if d != "south" else os.path.join(FORM, "south", "sheets")
m = json.load(open(os.path.join(sheets, "manifest.json"))); tiles = []
for spec in sys.argv[3:]:
    c, fr = spec.split(":")
    a = m["animations"][c]; W = a.get("frame_width", m["frame_width"]); H = a.get("frame_height", m["frame_height"]); im = Image.open(os.path.join(FORM, d, a["sheet"])).convert("RGBA")
    for i in [int(x) for x in fr.split(",")]:
        t = Image.new("RGBA", (190, 190), (52, 58, 72, 255)); t.alpha_composite(im.crop((i * W, 0, i * W + W, H)), (max(0, (190 - W) // 2), 190 - H - 2)); tiles.append(t.resize((190 * z // 2, 190 * z // 2), Image.NEAREST))
o = Image.new("RGBA", (285 * min(len(tiles), 7), 285 * ((len(tiles) + 6) // 7)))
for k, t in enumerate(tiles): o.paste(t, ((k % 7) * 285, (k // 7) * 285))
o.save(sys.argv[2]); print(o.size)

"""All frames of given clips in one strip: python clip_strip.py <dir> <out.png> Beam Sphere [public]"""
import json, os, sys
from PIL import Image
VEX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d, out, clips = sys.argv[1], sys.argv[2], [c for c in sys.argv[3:] if c != "public"]
root = os.path.join(os.path.dirname(os.path.dirname(VEX)), "public", "art", "ren") if "public" in sys.argv else REN
m = json.load(open(os.path.join(root, d, "sheets", "manifest.json") if "public" not in sys.argv else os.path.join(root, d, "manifest.json")))
rows = []
for c in clips:
    a = m["animations"][c]; sh = Image.open(os.path.join(root, d, a["sheet"])).convert("RGBA"); fw = a.get("frame_width", m["frame_width"]); fh = a.get("frame_height", m["frame_height"]); n = a["frames"]
    per = 13; idx = list(range(n))
    for r0 in range(0, n, per):
        row = Image.new("RGBA", (fw * per, fh), (70, 78, 88, 255))
        for k, i in enumerate(idx[r0:r0 + per]): row.alpha_composite(sh.crop((i * fw, 0, (i + 1) * fw, fh)), (k * fw, 0))
        rows.append(row)
W = max(r.width for r in rows); H = sum(r.height for r in rows); o = Image.new("RGBA", (W, H), (30, 34, 40, 255)); y = 0
for r in rows: o.alpha_composite(r, (0, y)); y += r.height
o.convert("RGB").resize((int(W * 1.2), int(H * 1.2)), Image.NEAREST).save(out)

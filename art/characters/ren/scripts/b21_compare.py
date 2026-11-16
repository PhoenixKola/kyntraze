"""B21: old vs new Ren frames. python b21_compare.py <oldRenDir> <newRenDir> <direction> <out.png> [scale] [form-dir-suffix]
Rows = Idle (every 2nd), Run, Hurt; for each clip an OLD row then a NEW row, on dark navy, nearest-neighbour."""
import json, os, sys
from PIL import Image, ImageDraw
old, new, d, out = sys.argv[1:5]; sc = int(sys.argv[5]) if len(sys.argv) > 5 else 3
def frames(root, clip):
    base = os.path.join(root, d); sh = os.path.join(base, "sheets"); mp = os.path.join(base, "manifest.json") if os.path.exists(os.path.join(base, "manifest.json")) else os.path.join(sh, "manifest.json")
    m = json.load(open(mp)); a = m["animations"][clip]; fw = a.get("frame_width", m["frame_width"]); fh = a.get("frame_height", m["frame_height"])
    sheet = Image.open(os.path.join(sh, f"ren_{d}_{clip.lower()}.png")).convert("RGBA"); n = a["frames"]
    return [sheet.crop((i * fw, 0, (i + 1) * fw, fh)) for i in range(n)]
rows = []
for clip, step in (("Idle", 2), ("Run", 1), ("Hurt", 1)):
    for lab, root in (("old", old), ("new", new)):
        fs = frames(root, clip)[::step]; rows.append((f"{clip} {lab}", fs))
fw, fh = rows[0][1][0].size; W = max(len(f) for _, f in rows) * fw * sc // 2 + 20
cols = 8; cw = fw * sc // 2 * 1; ch = fh * sc // 2 * 1
S = Image.new("RGBA", (cols * cw + 10, len(rows) * ch + 10), (14, 22, 40, 255)); dr = ImageDraw.Draw(S)
for r, (lab, fs) in enumerate(rows):
    for c, f in enumerate(fs[:cols]):
        im = f.resize((fw * sc // 2, fh * sc // 2), Image.NEAREST); S.alpha_composite(im, (5 + c * cw, 5 + r * ch))
    dr.text((8, 8 + r * ch), lab, fill=(255, 230, 120, 255))
os.makedirs(os.path.dirname(out), exist_ok=True); S.save(out); print(out, S.size)

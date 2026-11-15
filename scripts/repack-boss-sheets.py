"""Repacks the 16-frame boss strips (build-warden-art.py / build-elite-art.py output) into a 4x4 grid so no texture exceeds 4096 px, and records `columns` in the manifest. Idempotent: run after any rebuild of warden/seraph.
  python scripts/repack-boss-sheets.py"""
import json, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for k in ("warden", "seraph"):
    p = os.path.join(R, "public", "art", "bosses", k); m = json.load(open(p + ".json")); im = Image.open(p + ".png").convert("RGBA"); fw, fh, n = m["frame_width"], m["frame_height"], m["frames"]
    if im.size[1] == fh and im.size[0] > 4096:
        g = Image.new("RGBA", (fw * 4, fh * 4))
        for i in range(n): g.paste(im.crop((i * fw, 0, (i + 1) * fw, fh)), ((i % 4) * fw, (i // 4) * fh))
        g.save(p + ".png", optimize=True)
    m["columns"] = 4; json.dump(m, open(p + ".json", "w"), indent=1); print(k, Image.open(p + ".png").size)

"""Review sheets for the Gloam Circuit art at real display scale (props 0.5, rim/fx 1.0) on the real floor, beside Kai and the B08 Warden.
  python scripts/b09-gloam-review.py   -> art/arenas/gloam/review/*.png"""
import json, os
import numpy as np
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.join(R, "public", "art"); G = os.path.join(P, "arenas", "gloam"); O = os.path.join(R, "art", "arenas", "gloam", "review"); os.makedirs(O, exist_ok=True)
floor = [Image.open(os.path.join(P, "arena", f"floor-{i}.png")).convert("RGBA") for i in range(8)]
def bg(w, h):
    b = Image.new("RGBA", (w, h)); W = [0, 1, 6, 7, 7, 3, 2, 6]
    for y in range(0, h, 128):
        for x in range(0, w, 128): b.paste(floor[W[(x // 128 * 3 + y // 128 * 5) % len(W)]], (x, y))
    b.alpha_composite(Image.new("RGBA", (w, h), (4, 9, 18, 117))); return b
def spr(path, scale, origin):
    im = Image.open(path).convert("RGBA"); return im.resize((max(1, round(im.size[0] * scale)), max(1, round(im.size[1] * scale))), Image.NEAREST), (origin[0] * scale, origin[1] * scale)
def put(c, im, org, x, y): c.alpha_composite(im, (round(x - org[0]), round(y - org[1])))
man = json.load(open(os.path.join(G, "props.json")))["props"]
kai = Image.open(os.path.join(P, "kai", "east", "sheets", "kai_east_idle.png")).convert("RGBA").crop((0, 0, 124, 165)); kai = kai.resize((62, 82), Image.NEAREST)
wd = Image.open(os.path.join(P, "bosses", "warden.png")).convert("RGBA").crop((0, 0, 436, 439)); wd = wd.resize((218, 220), Image.NEAREST)

# 1: solid props with their footprint rect, Kai and the Warden for scale
c = bg(1180, 330); d = ImageDraw.Draw(c); x = 20
for name in ["generator", "freight-pod", "console-bank", "reactor-block", "vent-stack", "crate-stack"]:
    m = man[name]; im, org = spr(os.path.join(G, m["file"]), 0.5, m["origin"]); fw, fh = m["footprint"]["w"], m["footprint"]["h"]
    bx = x + fw / 2; by = 300
    d.rectangle((bx - fw / 2, by - fh, bx + fw / 2, by), outline=(0, 255, 120, 255)); put(c, im, org, bx, by); d.text((x, 6), name, fill=(235, 235, 235, 255)); x += fw + 30
put(c, kai, (31, 80), 1060, 300); put(c, wd, (109, 175), 1130, 300)
c.convert("RGB").save(os.path.join(O, "gloam-01-props-footprints.png"))
# 2: tiling checks: rim x4, corner, surge strips x3, fog 2x2 over floor
rim = Image.open(os.path.join(G, "rim.png")).convert("RGBA"); cor = Image.open(os.path.join(G, "corner.png")).convert("RGBA")
c = bg(1100, 620);
for i in range(4): c.alpha_composite(rim, (130 + i * 256, 10))
c.alpha_composite(cor, (0, 10)); y = 130
for n in ["surge-warn", "surge-warn-b", "surge-active", "surge-active-b"]:
    t = Image.open(os.path.join(G, "fx", n + ".png")).convert("RGBA")
    for i in range(3): c.alpha_composite(t, (20 + i * t.size[0], y))
    y += 90
fog = Image.open(os.path.join(G, "fx", "fog.png")).convert("RGBA"); fl = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
for i in range(2):
    for j in range(2): fl.alpha_composite(fog, (i * 512, j * 512))
fl = fl.resize((420, 420), Image.NEAREST); c.alpha_composite(fl, (680, 130))
mote = Image.open(os.path.join(G, "fx", "mote.png")).convert("RGBA")
for i in range(10): c.alpha_composite(mote, (700 + i * 38, 560))
c.convert("RGB").save(os.path.join(O, "gloam-02-tiling-fx.png"))
# 3: decor and glyph on the floor
c = bg(1180, 500); x = 20
for n in ["cable-a", "cable-b", "grate", "scorch-a", "scorch-b", "crack-a", "crack-b", "stripes", "puddle"]:
    m = man[n]; im, org = spr(os.path.join(G, m["file"]), 0.5, m["origin"]); put(c, im, org, x + im.size[0] / 2, 80); x += im.size[0] + 18
gl, org = spr(os.path.join(G, "props", "core-glyph.png"), 0.5, man["core-glyph"]["origin"]); put(c, gl, org, 260, 330); put(c, kai, (31, 80), 260, 340)
c.convert("RGB").save(os.path.join(O, "gloam-03-decor-glyph.png")); print("review sheets written")

"""Builds the compact B07 review sheets from the shipped assets: identities next to Kai at gameplay scale (1x, 3x) on the arena floor and on a light diagnostic background, plus animation contact sheets.
  python scripts/b07-review-sheets.py"""
import os
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.join(R, "public", "art"); O = os.path.join(R, "art", "enemies", "review"); os.makedirs(O, exist_ok=True)
KINDS = ["pursuer", "flanker", "bruiser", "ranged"]
floor = Image.open(os.path.join(P, "arena", "floor-0.png")).convert("RGBA")
def tile(w, h):
    bg = Image.new("RGBA", (w, h))
    for y in range(0, h, 128):
        for x in range(0, w, 128): bg.paste(floor, (x, y))
    dark = Image.new("RGBA", (w, h), (4, 9, 18, 117)); bg.alpha_composite(dark); return bg
def frame(kind, i):
    import json
    m = json.load(open(os.path.join(P, "enemies", kind + ".json"))); sh = Image.open(os.path.join(P, "enemies", kind + ".png")).convert("RGBA"); fw = m["frame_width"]
    return sh.crop((i * fw, 0, (i + 1) * fw, m["frame_height"])), m["origin_px"]
def kai():
    sh = Image.open(os.path.join(P, "kai", "east", "sheets", "kai_east_idle.png")).convert("RGBA"); f = sh.crop((0, 0, 124, 165)); return f, (50, 161)
def place(canvas, img, origin, x, y, s):
    im = img.resize((round(img.size[0] * s), round(img.size[1] * s)), Image.NEAREST); canvas.alpha_composite(im, (round(x - origin[0] * s), round(y - origin[1] * s)))

for name, scale, bgkind in (("01-identities-1x-arena", 0.5, "arena"), ("02-identities-3x-arena", 1.5, "arena"), ("03-identities-3x-light-diagnostic", 1.5, "light")):
    w, h = int(1500 * scale / 0.5 * 0.45) + 100, int(260 * scale / 0.5 * 0.5) + 60
    c = tile(w, h) if bgkind == "arena" else Image.new("RGBA", (w, h), (214, 218, 226, 255))
    step = w // 5; items = [("kai", *kai())] + [(k, *frame(k, 0)) for k in KINDS]
    for i, (n, img, org) in enumerate(items): place(c, img, org, step * (i + 0.5), h - 40, scale * (1 if n != "kai" else 1))
    ImageDraw.Draw(c).text((8, 6), f"Kai Base + the four enemies, display scale x{scale * 2:.0f} of shipped 0.5", fill=(235, 235, 235, 255)); c.convert("RGB").save(os.path.join(O, name + ".png"))

sheet = []
for k in KINDS:
    m_img = Image.open(os.path.join(P, "enemies", k + ".png")).convert("RGBA"); sheet.append(m_img)
W = max(i.size[0] for i in sheet); H = sum(i.size[1] for i in sheet); c = tile(W, H); y = 0
for i in sheet: c.alpha_composite(i, (0, y)); y += i.size[1]
c.convert("RGB").save(os.path.join(O, "04-animation-contact-sheet.png")); print("sheets written to", O)

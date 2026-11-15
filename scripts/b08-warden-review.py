"""Warden review sheets: identity next to Kai Base and the B07 bruiser at 1x/3x display scale (arena floor + light diagnostic), contact sheet of all 16 frames, fx sheet.
  python scripts/b08-warden-review.py"""
import json, os
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.join(R, "public", "art"); O = os.path.join(R, "art", "bosses", "review"); os.makedirs(O, exist_ok=True)
floor = Image.open(os.path.join(P, "arena", "floor-0.png")).convert("RGBA")
def bg(w, h, light):
    if light: return Image.new("RGBA", (w, h), (214, 218, 226, 255))
    c = Image.new("RGBA", (w, h))
    for y in range(0, h, 128):
        for x in range(0, w, 128): c.paste(floor, (x, y))
    c.alpha_composite(Image.new("RGBA", (w, h), (4, 9, 18, 117))); return c
def frame(path, i):
    m = json.load(open(path + ".json")); sh = Image.open(path + ".png").convert("RGBA"); fw = m["frame_width"]
    return sh.crop((i * fw, 0, (i + 1) * fw, m["frame_height"])), m["origin_px"]
def place(c, img, org, x, y, s):
    im = img.resize((round(img.size[0] * s), round(img.size[1] * s)), Image.NEAREST); c.alpha_composite(im, (round(x - org[0] * s), round(y - org[1] * s)))
kai = (Image.open(os.path.join(P, "kai", "east", "sheets", "kai_east_idle.png")).convert("RGBA").crop((0, 0, 124, 165)), (50, 161))
bru = frame(os.path.join(P, "enemies", "bruiser"), 0); W = os.path.join(P, "bosses", "warden")
for name, s, light in (("warden-01-scale-1x-arena", 0.5, False), ("warden-02-scale-3x-arena", 1.5, False), ("warden-03-scale-3x-light", 1.5, True)):
    w, h = int(1500 * s / 0.5 * 0.5) + 120, int(420 * s / 0.5 * 0.6) + 60; c = bg(w, h, light); step = w // 4
    for i, (img, org) in enumerate([kai, bru, frame(W, 0), frame(W, 10)]): place(c, img, org, step * (i + 0.5), h - 40, s)
    ImageDraw.Draw(c).text((8, 6), f"Kai Base | Breaker Sentinel | Warden walk | Warden exposed  (display x{s*2:.0f} of shipped 0.5)", fill=(235, 235, 235, 255)); c.convert("RGB").save(os.path.join(O, name + ".png"))
m = json.load(open(W + ".json")); sh = Image.open(W + ".png").convert("RGBA"); fw, fh = m["frame_width"], m["frame_height"]
c = bg(fw * 4, fh * 4, False)
for i in range(16): c.alpha_composite(sh.crop((i * fw, 0, (i + 1) * fw, fh)), ((i % 4) * fw, (i // 4) * fh))
c.convert("RGB").save(os.path.join(O, "warden-04-contact-sheet.png"))
names = ["cone-warn", "cone-strike", "rupture-burst", "rupture-crater", "shock-ring", "boss-burst", "warning-glyph", "emblem-warden"]
c = bg(1700, 640, False); x = 10
for n in names[:2]:
    im = Image.open(os.path.join(P, "bosses", "fx", n + ".png")).convert("RGBA"); c.alpha_composite(im, (x, 20)); x += im.size[0] + 20
x2 = 10
for n in names[2:]:
    im = Image.open(os.path.join(P, "bosses", "fx", n + ".png")).convert("RGBA"); c.alpha_composite(im, (x2, 400 if x2 < 10 else 420 if False else 640 - im.size[1] - 4 if False else 0)) if False else None; x2 += 0
row_y, x2 = 20, 760
for n in names[2:]:
    im = Image.open(os.path.join(P, "bosses", "fx", n + ".png")).convert("RGBA")
    if x2 + im.size[0] > 1690: x2 = 760; row_y += 300
    c.alpha_composite(im, (x2, row_y)); x2 += im.size[0] + 12
c.convert("RGB").save(os.path.join(O, "warden-05-fx.png")); print("ok")

"""Slices art/b22/damage/source/dmg_<boss>.png (ImageGen: level-2 | level-3 damage decals side by side on magenta) into public/art/b22/dmg_<boss>_l2.png / _l3.png, each fitted onto a canvas the size of the boss sprite (public/art/b22/<boss>.png) and scaled / centred on that sprite's opaque body box, so the renderer can draw it with the sprite's own transform."""
import os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, "art", "b22", "damage", "source"); PUB = os.path.join(ROOT, "public", "art", "b22")
BOSSES = ["castellan", "regent", "oathkeeper", "mirror_tyrant", "chronophage", "hollow_choir", "sovereign"]
def key(img):
    a = np.array(img.convert("RGBA")).astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    k = (r > 160) & (b > 160) & (g < 120) & (np.abs(r - b) < 80); a[..., 3] = np.where(k, 0, 255)
    near = np.zeros_like(k)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): near |= np.roll(np.roll(k, dy, 0), dx, 1)
    pink = near & ~k & (r > g + 40) & (b > g + 40); a[..., 3][pink] = 110; a[..., 0][pink] = np.minimum(a[..., 0][pink], g[pink] + 20); a[..., 2][pink] = np.minimum(a[..., 2][pink], g[pink] + 20)
    return Image.fromarray(a.astype(np.uint8), "RGBA")
for k in BOSSES:
    p = os.path.join(SRC, f"dmg_{k}.png")
    if not os.path.exists(p): print("missing", k); continue
    sheet = key(Image.open(p)); W, H = sheet.size; spr = Image.open(os.path.join(PUB, f"{k}.png")).convert("RGBA"); sb = spr.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    for lvl, half in (("l2", sheet.crop((0, 0, W // 2, H))), ("l3", sheet.crop((W // 2, 0, W, H)))):
        bb = half.getbbox()
        if not bb: print("empty", k, lvl); continue
        d = half.crop(bb); sw, sh = sb[2] - sb[0], sb[3] - sb[1]; sc = min(sw / d.width, sh / d.height) * 1.0
        d = d.resize((max(1, round(d.width * sc)), max(1, round(d.height * sc))), Image.LANCZOS); out = Image.new("RGBA", spr.size, (0, 0, 0, 0))
        out.alpha_composite(d, (sb[0] + (sw - d.width) // 2, sb[1] + (sh - d.height) // 2)); out.save(os.path.join(PUB, f"dmg_{k}_{lvl}.png")); print(k, lvl, d.size)

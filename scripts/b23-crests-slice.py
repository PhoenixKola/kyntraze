"""Slices art/crests/source/crests.png (ImageGen, 4x2 sheet on magenta) into public/ui/crests/crest_<form>.png (256 px) + crest_<form>_s.png (96 px). Order = row-major: flarebound, cometheart, stillfire, crimson_ascendant, azure_sovereign, riftbound, voidheart_exile."""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, "art", "crests", "source", "crests.png"); OUT = os.path.join(ROOT, "public", "ui", "crests")
FORMS = ["flarebound", "cometheart", "stillfire", "crimson_ascendant", "azure_sovereign", "riftbound", "voidheart_exile"]
os.makedirs(OUT, exist_ok=True)
a = np.array(Image.open(SRC).convert("RGBA")).astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]
key = (r > 170) & (b > 170) & (g < 110) & (np.abs(r - b) < 70)
alpha = np.where(key, 0, 255).astype(np.uint8)
# soften the 1 px fringe: pixels next to the key that are still pinkish lose their magenta tint
near = np.zeros_like(key)
for dy in (-1, 0, 1):
    for dx in (-1, 0, 1): near |= np.roll(np.roll(key, dy, 0), dx, 1)
pink = near & ~key & (r > g + 40) & (b > g + 40)
alpha[pink] = 120; r2, g2, b2 = r.copy(), g.copy(), b.copy(); r2[pink] = np.minimum(r2[pink], g2[pink] + 20); b2[pink] = np.minimum(b2[pink], g2[pink] + 20)
img = np.dstack([r2, g2, b2, alpha]).astype(np.uint8); H, W = img.shape[:2]; cw, ch = W // 4, H // 2
for i, f in enumerate(FORMS):
    cell = img[(i // 4) * ch:(i // 4 + 1) * ch, (i % 4) * cw:(i % 4 + 1) * cw]; im = Image.fromarray(cell, "RGBA"); bb = im.getbbox(); im = im.crop(bb)
    s = max(im.size); sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    sq.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, f"crest_{f}.png")); sq.resize((96, 96), Image.LANCZOS).save(os.path.join(OUT, f"crest_{f}_s.png")); print(f, bb)

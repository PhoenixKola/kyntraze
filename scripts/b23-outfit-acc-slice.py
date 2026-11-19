"""Slices the two ImageGen accessory sheets (art/outfits/source/outfits_a|b.png: 3 columns = front / side / back, 4 rows = accessories, on magenta) into public/art/outfits/acc/<outfitId>_<view>.png. The three views of one accessory share one canvas size (union of their boxes, each centred) so the runtime can use one width for all views."""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, "art", "outfits", "source"); OUT = os.path.join(ROOT, "public", "art", "outfits", "acc"); os.makedirs(OUT, exist_ok=True)
SHEETS = {"outfits_a": ["kai_circuit_vanguard", "kai_celestial_wanderer", "ren_ironheart_bruiser", "ren_ember_ronin"], "outfits_b": ["sora_azure_artificer", "sora_skybound_oracle", "vex_oathkeepers_ruin", "vex_eclipse_nomad"]}
VIEWS = ["front", "side", "back"]; TARGET_W = 144
def key(img):
    a = np.array(img.convert("RGBA")).astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]; k = (r > 160) & (b > 160) & (g < 120) & (np.abs(r - b) < 80); a[..., 3] = np.where(k, 0, 255)
    near = np.zeros_like(k)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): near |= np.roll(np.roll(k, dy, 0), dx, 1)
    pink = near & ~k & (r > g + 40) & (b > g + 40); a[..., 3][pink] = 0
    return Image.fromarray(a.astype(np.uint8), "RGBA")
for sheet, ids in SHEETS.items():
    im = key(Image.open(os.path.join(SRC, sheet + ".png"))); W, H = im.size; cw, ch = W // 3, H // 4
    for row, oid in enumerate(ids):
        cells = [im.crop((c * cw, row * ch, (c + 1) * cw, (row + 1) * ch)) for c in range(3)]; boxes = [c.getbbox() for c in cells]
        mw, mh = max(b[2] - b[0] for b in boxes), max(b[3] - b[1] for b in boxes); s = TARGET_W / mw
        for v, c, b in zip(VIEWS, cells, boxes):
            piece = c.crop(b); canvas = Image.new("RGBA", (mw, mh), (0, 0, 0, 0)); canvas.alpha_composite(piece, ((mw - piece.width) // 2, (mh - piece.height) // 2))
            canvas.resize((TARGET_W, max(1, round(mh * s))), Image.LANCZOS).save(os.path.join(OUT, f"{oid}_{v}.png"))
        print(oid, (mw, mh))

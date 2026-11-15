"""B11: victory key art (webp backdrop) and crest (keyed png) from art/progression/source/victory.
  python scripts/build-victory-assets.py"""
import numpy as np, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = os.path.join(R, "art", "progression", "source", "victory"); P = os.path.join(R, "public", "ui")
Image.open(os.path.join(S, "key.png")).convert("RGB").resize((1600, 900), Image.LANCZOS).save(os.path.join(P, "victory-key.webp"), quality=84)
a = np.asarray(Image.open(os.path.join(S, "crest.png")).convert("RGB")).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
mag = np.clip((90 - np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)) / 50.0, 0, 1); al = 1 - mag
rgb = np.clip((a - mag[..., None] * np.array([255.0, 0.0, 255.0])) / np.maximum(al, 1e-3)[..., None], 0, 255); al = np.where(al < 0.1, 0, al)
ys, xs = np.nonzero(al > 0.5); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
out = np.zeros((y1 - y0, x1 - x0, 4)); out[..., :3] = rgb[y0:y1, x0:x1]; out[..., 3] = al[y0:y1, x0:x1] * 255
im = Image.fromarray(out.astype(np.uint8), "RGBA"); im = im.resize((320, round(320 * im.height / im.width)), Image.LANCZOS); im.save(os.path.join(P, "victory-crest.png"))
print("victory assets", im.size)

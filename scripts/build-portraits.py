"""Pre-B12: Kai HUD portraits (Base + Form I + Form II) from the ImageGen busts in art/ui/portraits -> public/ui/kai-portrait-{base,f1}.png (128x128, keyed).
  python scripts/build-portraits.py"""
import numpy as np, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = os.path.join(R, "art", "ui", "portraits"); P = os.path.join(R, "public", "ui")
for name, out in (("base", "base"), ("f1", "f1"), ("f2", "f2")):
    a = np.asarray(Image.open(os.path.join(S, name + ".png")).convert("RGB")).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.clip((90 - np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)) / 50.0, 0, 1); al = 1 - mag
    rgb = np.clip((a - mag[..., None] * np.array([255.0, 0.0, 255.0])) / np.maximum(al, 1e-3)[..., None], 0, 255); al = np.where(al < 0.1, 0, al)
    ys, xs = np.nonzero(al > 0.5); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    o = np.zeros((y1 - y0, x1 - x0, 4)); o[..., :3] = rgb[y0:y1, x0:x1]; o[..., 3] = al[y0:y1, x0:x1] * 255
    im = Image.fromarray(o.astype(np.uint8), "RGBA"); side = max(im.size); sq = Image.new("RGBA", (side, side), (0, 0, 0, 0)); sq.paste(im, ((side - im.width) // 2, side - im.height))   # bottom-anchored: shoulders sit on the tile edge
    sq.resize((128, 128), Image.LANCZOS).save(os.path.join(P, f"kai-portrait-{out}.png")); print(out, sq.size)
# hero / arena select backdrop (ImageGen, art/ui/select-bg/bg.png)
Image.open(os.path.join(R, "art", "ui", "select-bg", "bg.png")).convert("RGB").resize((1600, 900), Image.LANCZOS).save(os.path.join(P, "select-bg.webp"), quality=82); print("select-bg")

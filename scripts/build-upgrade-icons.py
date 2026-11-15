"""B10.1: slices the full-colour ImageGen icon sheets in art/progression/source/icons into public/ui/upgrades/<id>.png (96x96, transparent).
  python scripts/build-upgrade-icons.py"""
import numpy as np, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = os.path.join(R, "art", "progression", "source", "icons"); P = os.path.join(R, "public", "ui", "upgrades")
os.makedirs(P, exist_ok=True)
SHEETS = {
    "core": ["impact", "tempo", "reach", "echo", "pulse"], "beam": ["widelance", "hardlight", "afterburn", "lancecool", "conductor"],
    "sphere": ["bloombulk", "novacool", "afterglow", "twinbloom"], "survival": ["endurance", "plating", "mending", "secondwind"],
    "move": ["stride", "dashcool", "magnet", "richveins"], "drive": ["surgecell", "flareheart", "embercore"],
}
SIZE, INNER = 96, 90

def key(im):
    a = np.asarray(im.convert("RGB")).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.clip((90 - np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)) / 50.0, 0, 1); al = 1 - mag   # distance to pure magenta: violet art must survive the key
    rgb = np.clip((a - mag[..., None] * np.array([255.0, 0.0, 255.0])) / np.maximum(al, 1e-3)[..., None], 0, 255)
    return rgb, np.where(al < 0.1, 0, al)

for sheet, ids in SHEETS.items():
    im = Image.open(os.path.join(S, sheet + ".png")); rgb, al = key(im)
    cols = (al > 0.5).any(axis=0); runs = []
    for gap in range(70, 3, -2):   # widest gap that still yields the expected icon count: sparks never bridge two icons
        runs, start = [], None
        for x in range(len(cols) + gap):
            v = x < len(cols) and cols[x]
            if v and start is None: start = x
            if start is not None and not v and not cols[x:x + gap].any(): runs.append((start, x)); start = None
        runs = [r for r in runs if r[1] - r[0] > 40]
        if len(runs) == len(ids): break
    assert len(runs) == len(ids), (sheet, runs)
    for (x0, x1), name in zip(runs, ids):
        a = al[:, x0:x1]; ys = np.nonzero((a > 0.5).any(axis=1))[0]; y0, y1 = ys.min(), ys.max() + 1
        out = np.zeros((y1 - y0, x1 - x0, 4)); out[..., :3] = rgb[y0:y1, x0:x1]; out[..., 3] = a[y0:y1] * 255
        ic = Image.fromarray(out.astype(np.uint8), "RGBA"); sc = INNER / max(ic.size); ic = ic.resize((max(1, round(ic.width * sc)), max(1, round(ic.height * sc))), Image.LANCZOS)
        sq = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)); sq.paste(ic, ((SIZE - ic.width) // 2, (SIZE - ic.height) // 2), ic); sq.save(os.path.join(P, name + ".png"))
print("icons", sum(len(v) for v in SHEETS.values()))

"""Slices the B10 ImageGen sheets in art/progression/source into runtime assets (see PROVENANCE.md there).
  python scripts/build-progression-assets.py"""
import numpy as np, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = os.path.join(R, "art", "progression", "source"); P = os.path.join(R, "public")
for d in ("ui/upgrades", "ui/map", "ui/cards", "art/fx/xp"): os.makedirs(os.path.join(P, d), exist_ok=True)

def key(im):
    """magenta key -> (rgb float, alpha float): alpha falls as the pixel approaches #ff00ff; colour is un-premultiplied so edges carry no pink fringe."""
    a = np.asarray(im.convert("RGB")).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.clip((np.minimum(r, b) - g) / 215.0, 0, 1); al = 1 - mag
    rgb = a.copy(); safe = np.maximum(al, 1e-3)[..., None]
    rgb = np.clip((a - mag[..., None] * np.array([255.0, 0.0, 255.0])) / safe, 0, 255)
    al = np.where(al < 0.12, 0, al)
    return rgb, al

def cell_bbox(al, thr=0.5):
    ys, xs = np.nonzero(al > thr); return xs.min(), xs.max() + 1, ys.min(), ys.max() + 1

def square(img, side):
    w, h = img.size; s = max(w, h) + 8; sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(img, ((s - w) // 2, (s - h) // 2)); return sq.resize((side, side), Image.BOX)

# --- 25 upgrade glyphs: 5x5, neutral grey ramp (white / blue-grey shading) + alpha, tinted per category in CSS
ids = ["impact", "tempo", "reach", "echo", "pulse", "widelance", "hardlight", "afterburn", "lancecool", "conductor", "bloombulk", "afterglow", "novacool", "twinbloom",
       "endurance", "mending", "plating", "secondwind", "stride", "dashcool", "magnet", "richveins", "surgecell", "flareheart", "embercore"]
im = Image.open(os.path.join(S, "upgrades.png")); W, H = im.size; rgb, al = key(im)
for i, name in enumerate(ids):
    r, c = divmod(i, 5); x0, x1, y0, y1 = c * W // 5, (c + 1) * W // 5, r * H // 5, (r + 1) * H // 5
    a = al[y0:y1, x0:x1]; bx0, bx1, by0, by1 = cell_bbox(a)
    grey = rgb[y0:y1, x0:x1][..., 1][by0:by1, bx0:bx1]   # the g channel carries the white / blue-grey shading
    out = np.zeros(grey.shape + (4,)); out[..., :3] = grey[..., None]; out[..., 3] = a[by0:by1, bx0:bx1] * 255
    square(Image.fromarray(out.astype(np.uint8), "RGBA"), 64).save(os.path.join(P, "ui/upgrades", name + ".png"))
print("upgrade icons", len(ids))

# --- minimap / HUD markers: 3x2
names = ["player", "elite", "boss", "hazard", "threat", "star"]
im = Image.open(os.path.join(S, "markers.png")); W, H = im.size; rgb, al = key(im)
for i, name in enumerate(names):
    r, c = divmod(i, 3); x0, x1, y0, y1 = c * W // 3, (c + 1) * W // 3, r * H // 2, (r + 1) * H // 2
    a = al[y0:y1, x0:x1]; bx0, bx1, by0, by1 = cell_bbox(a)
    grey = rgb[y0:y1, x0:x1][..., 1][by0:by1, bx0:bx1]
    out = np.zeros(grey.shape + (4,)); out[..., :3] = grey[..., None]; out[..., 3] = a[by0:by1, bx0:bx1] * 255
    square(Image.fromarray(out.astype(np.uint8), "RGBA"), 64).save(os.path.join(P, "ui/map", name + ".png"))
print("markers", names)

# --- XP gems: 4 across, full colour; shipped at 2x of their in-world size (Phaser scales by 0.5)
heights = [36, 52, 72, 104]
im = Image.open(os.path.join(S, "xp.png")); W, H = im.size; rgb, al = key(im)
cols = (al > 0.3).any(axis=0); runs, start = [], None
for x, v in enumerate(list(cols) + [False] * 40):
    if v and start is None: start = x
    if start is not None and not cols[x:x + 40].any() and not v: runs.append((start, x)); start = None
assert len(runs) == 4, runs
for i in range(4):
    x0, x1 = runs[i]; a = al[:, x0:x1]; bx0, bx1, by0, by1 = cell_bbox(a, 0.3)
    out = np.zeros((by1 - by0, bx1 - bx0, 4)); out[..., :3] = rgb[:, x0:x1][by0:by1, bx0:bx1]; out[..., 3] = a[by0:by1, bx0:bx1] * 255
    g = Image.fromarray(out.astype(np.uint8), "RGBA"); h = heights[i]; g = g.resize((max(1, round(g.width * h / g.height)), h), Image.LANCZOS)
    s = h + 8; sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(g, ((s - g.width) // 2, (s - g.height) // 2)); sq.save(os.path.join(P, "art/fx/xp", f"gem{i}.png"))
print("gems done")

# --- card header art: 2 columns x 4 rows of 3:1 panels
names = ["core", "beam", "sphere", "survival", "mobility", "pickup", "drive", "epic"]
im = Image.open(os.path.join(S, "cards.png")); W, H = im.size; rgb, al = key(im)
for i, name in enumerate(names):
    r, c = divmod(i, 2); x0, x1, y0, y1 = c * W // 2, (c + 1) * W // 2, r * H // 4, (r + 1) * H // 4
    a = al[y0:y1, x0:x1]; bx0, bx1, by0, by1 = cell_bbox(a, 0.9)
    crop = Image.fromarray(rgb[y0:y1, x0:x1].astype(np.uint8)).crop((bx0 + 4, by0 + 4, bx1 - 4, by1 - 4)); crop = crop.resize((480, round(480 * crop.height / crop.width)), Image.LANCZOS)
    crop.save(os.path.join(P, "ui/cards", name + ".webp"), quality=84)
print("cards", names)

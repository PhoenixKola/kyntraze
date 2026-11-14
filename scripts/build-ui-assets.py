"""Builds the B06 UI/arena runtime assets from the ImageGen sources in art/ui/source (see PROVENANCE.md there) and the approved Kai sheets.
  python scripts/build-ui-assets.py"""
import numpy as np, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = os.path.join(R, "art", "ui", "source"); P = os.path.join(R, "public")
for d in ("art/arena", "ui/icons"): os.makedirs(os.path.join(P, d), exist_ok=True)

# --- floor tiles: 4x2 grid separated by magenta; crop exactly inside the dark tile border detection (non-magenta bbox per cell)
im = Image.open(os.path.join(S, "floor.png")).convert("RGB"); a = np.asarray(im).astype(int)
mag = (a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 0.7 * np.minimum(a[..., 0], a[..., 2]))
W, H = im.size; names = []
def run(mask):
    best, cur = (0, 0), None
    for i, v in enumerate(list(mask) + [False]):
        if v and cur is None: cur = i
        if not v and cur is not None:
            if i - cur > best[1] - best[0]: best = (cur, i)
            cur = None
    return np.arange(best[0], best[1])
for r in range(2):
    for c in range(4):
        x0, x1, y0, y1 = c * W // 4, (c + 1) * W // 4, r * H // 2, (r + 1) * H // 2
        sub = ~mag[y0:y1, x0:x1]; ys, xs = run(sub.mean(1) > 0.5), run(sub.mean(0) > 0.5)
        t = im.crop((x0 + xs.min() + 6, y0 + ys.min() + 6, x0 + xs.max() - 5, y0 + ys.max() - 5))   # trim the dark frame pixel so tiles abut as plates
        t = t.resize((128, 128), Image.BOX); t.save(os.path.join(P, "art/arena", f"floor-{r*4+c}.png")); names.append(t.size)
print("floor tiles", names)

# --- icons: 3x2 grid, magenta keyed to alpha (g channel carries coverage for the white / light-grey glyph colours)
im = Image.open(os.path.join(S, "icons.png")).convert("RGB"); a = np.asarray(im).astype(float)
alpha = np.clip((a[..., 1] - 20) / 140.0, 0, 1)
ids = ["dash", "impact", "lance", "nova", "form", "heart"]
for i, name in enumerate(ids):
    r, c = divmod(i, 3); x0, x1, y0, y1 = c * W // 3, (c + 1) * W // 3, r * H // 2, (r + 1) * H // 2
    al = alpha[y0:y1, x0:x1]; ys, xs = np.nonzero(al > 0.5); bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    cell = np.zeros((by1 - by0, bx1 - bx0, 4)); cell[..., :3] = 255; cell[..., 3] = al[by0:by1, bx0:bx1] * 255
    side = max(cell.shape[:2]) + 8; sq = np.zeros((side, side, 4)); oy, ox = (side - cell.shape[0]) // 2, (side - cell.shape[1]) // 2; sq[oy:oy + cell.shape[0], ox:ox + cell.shape[1]] = cell
    Image.fromarray(sq.astype(np.uint8), "RGBA").resize((64, 64), Image.BOX).save(os.path.join(P, "ui/icons", name + ".png"))
print("icons", ids)

# --- title backdrop
Image.open(os.path.join(S, "title.png")).convert("RGB").resize((1600, 900), Image.LANCZOS).save(os.path.join(P, "ui/title-bg.webp"), quality=86)

# --- Kai portrait (approved Idle frame 0, head and shoulders) for the HUD, and the full idle strips copied for the title screen
for form, folder in (("base", "kai"), ("f1", "kai-f1")):
    sh = Image.open(os.path.join(P, "art", folder, "south/sheets/kai_south_idle.png")).convert("RGBA"); fw = 152
    fr = sh.crop((0, 0, fw, sh.size[1])); bb = fr.getbbox(); head = fr.crop((bb[0] - 4, bb[1] - 2, bb[2] + 4, bb[1] + int((bb[3] - bb[1]) * 0.36)))
    side = max(head.size); sq = Image.new("RGBA", (side, side), (0, 0, 0, 0)); sq.paste(head, ((side - head.size[0]) // 2, 0)); sq.save(os.path.join(P, "ui", f"kai-portrait-{form}.png"))
    sh.save(os.path.join(P, "ui", f"kai-idle-{form}.png"))
print("done")

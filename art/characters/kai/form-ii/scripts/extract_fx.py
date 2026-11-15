"""Cut the B12 ImageGen FX / icon sheets into neutral sprites: python extract_fx.py   (writes form-ii/fx/*.png, form-ii/ui/*.png and copies the runtime set to public/)
Method: key out the flat magenta, find the isolated pieces, box-downsample each piece by `scale` source px per art px (the sheets use ~5 px blocks) and keep the result neutral + alpha,
so the game can tint it gold. No painted pixels; icons are thresholded to pure white."""
import json, os, shutil
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); SRC = os.path.join(FORM, "source"); REPO = os.path.abspath(os.path.join(FORM, "..", "..", "..", ".."))
def magenta(rgb):
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    return (r > 170) & (b > 150) & (g < 110) & (abs(r - b) < 90)
def components(mask, grow=60):
    """Isolated pieces: the mask is shrunk 8x, dilated by grow/8 cells so specks join their piece, then flood-labelled (numpy + a plain BFS, no scipy)."""
    from collections import deque
    S = 8; h, w = mask.shape[0] // S, mask.shape[1] // S; m = mask[:h * S, :w * S].reshape(h, S, w, S).any((1, 3)); r = max(1, grow // S); d = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy * dy + dx * dx <= r * r: d |= np.roll(np.roll(m, dy, 0), dx, 1)
    lab = np.zeros((h, w), int); n = 0; boxes = []
    for y in range(h):
        for x in range(w):
            if d[y, x] and not lab[y, x]:
                n += 1; q = deque([(y, x)]); lab[y, x] = n
                while q:
                    cy, cx = q.popleft()
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and d[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
    for i in range(1, n + 1):
        ys, xs = np.nonzero((lab == i) & m)
        if len(ys) > 3: boxes.append([int(xs.min()) * S - 4, int(ys.min()) * S - 4, int(xs.max() + 1) * S + 4, int(ys.max() + 1) * S + 4])
    return [[max(0, b[0]), max(0, b[1]), b[2], b[3]] for b in boxes]
def order(boxes, rows):
    boxes = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2); out = []; per = -(-len(boxes) // rows)
    for r in range(rows): out += sorted(boxes[r * per:(r + 1) * per], key=lambda b: b[0])
    return out
def cut(img, box, scale, white=False):
    x0, y0, x1, y1 = box; rgb = img[y0:y1, x0:x1]; fg = ~magenta(rgb)
    a = Image.fromarray((fg * 255).astype(np.uint8)); col = Image.fromarray(np.where(fg[..., None], rgb, 0).astype(np.uint8))
    w, h = max(1, round((x1 - x0) / scale)), max(1, round((y1 - y0) / scale)); a = np.array(a.resize((w, h), Image.BOX)); col = np.array(col.resize((w, h), Image.BOX)).astype(float)
    cov = np.array(Image.fromarray((fg * 255).astype(np.uint8)).resize((w, h), Image.BOX)).astype(float) / 255
    col = col / np.maximum(cov[..., None], 1e-3); alpha = (cov > 0.5)
    lum = (0.3 * col[..., 0] + 0.59 * col[..., 1] + 0.11 * col[..., 2])
    if white: rgba = np.dstack([np.full((h, w), 255)] * 3 + [alpha * 255])
    else:
        g = np.clip(lum, 0, 255); rgba = np.dstack([g, g, g, alpha * 255])   # neutral: tint colours come from the game
    im = Image.fromarray(rgba.astype(np.uint8), "RGBA"); bb = im.getbbox(); return im.crop(bb) if bb else im
SHEETS = {
 "lightning": (3, 5.8, ["bolt_h0", "bolt_h1", "bolt_h2", "bolt_h3", "bolt_v0", "bolt_v1", "bolt_v2", "bolt_v3", "star", "ring_arc", "aura_a", "aura_b"], False),
 "ground": (2, 5.8, ["crack0", "crack1", "crack2", "crack3", "debris0", "debris1", "debris2", "debris3", "debris4", "debris5"], False),
 "comet": (2, 5.8, ["core", "flash", "head", "beam", "halo"], False),
 "dragon": (2, 5.8, ["dragon_a", "dragon_b"], False),
 "icons": (1, 11.0, ["ico_dragon", "ico_comet", "ico_form2"], True),
}
if __name__ == "__main__":
    out = os.path.join(FORM, "fx"); ui = os.path.join(FORM, "ui"); os.makedirs(out, exist_ok=True); os.makedirs(ui, exist_ok=True); rec = {}
    for sheet, (rows, scale, names, white) in SHEETS.items():
        p = os.path.join(SRC, f"fx-{sheet}.png")
        if not os.path.exists(p): print("missing", sheet); continue
        img = np.array(Image.open(p).convert("RGB")); boxes = order(components(~magenta(img), {'icons': 64, 'ground': 30}.get(sheet, 20)), rows)
        if sheet == "dragon": boxes = sorted(boxes, key=lambda b: b[1])
        if len(boxes) != len(names): print("WARN", sheet, "found", len(boxes), "expected", len(names), boxes)
        for n, b in zip(names, boxes):
            im = cut(img, b, scale, white)
            if white:   # HUD icon: 64x64 pure-white silhouette, pixel-snapped
                s = 56 / max(im.size); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST); c = Image.new("RGBA", (64, 64), (0, 0, 0, 0)); c.alpha_composite(im, ((64 - im.width) // 2, (64 - im.height) // 2)); im = c
                im.save(os.path.join(ui, n + ".png"))
            else: im.save(os.path.join(out, n + ".png"))
            rec[n] = list(im.size)
    json.dump(rec, open(os.path.join(out, "fx.json"), "w"), indent=1); print(rec)

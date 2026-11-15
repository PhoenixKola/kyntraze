"""B17: cut the ImageGen magenta-key sheets into transparent sprites.  python art/bosses/source/b17/extract_b17.py
Each sheet is a 3x2 grid; the cell is keyed (magenta -> alpha with despill), cropped to its content with a 2 px margin and downscaled so the long side <= MAXPX."""
import os, numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
OUT = os.path.join(ROOT, 'public', 'art', 'bosses', 'fx', 'b17'); os.makedirs(OUT, exist_ok=True); MAXPX = 150
SHEETS = {'warden-debris': ['slab_l', 'slab_m', 'splinters', 'core_chunk', 'crack_star', 'core_flash'], 'seraph-crystal': ['halo', 'halo_arc', 'shard_long', 'shard_cluster', 'glint', 'motes']}
def key(im):
    a = np.asarray(im.convert('RGB')).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.clip(((np.minimum(r, b) - g) - 110) / 60, 0, 1)            # how magenta
    alpha = 1 - mag; alpha = ndimage.binary_opening(alpha > 0.5, iterations=1) * np.clip(alpha, 0, 1)
    out = np.dstack([a, alpha * 255]); fringe = (alpha > 0) & (alpha < 1)
    out[fringe, 1] = np.maximum(out[fringe, 1], (out[fringe, 0] + out[fringe, 2]) / 2 * 0.8)   # despill magenta edge
    return Image.fromarray(out.astype('uint8'), 'RGBA')
for sheet, names in SHEETS.items():
    p = os.path.join(HERE, sheet + '.png')
    if not os.path.exists(p): print('missing', p); continue
    im = Image.open(p).convert('RGB'); W, H = im.size
    for i, n in enumerate(names):
        c, r = i % 3, i // 3; cell = im.crop((c * W // 3, r * H // 2, (c + 1) * W // 3, (r + 1) * H // 2)); k = key(cell)
        bb = k.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        if not bb: print('empty', sheet, n); continue
        k = k.crop((max(0, bb[0] - 2), max(0, bb[1] - 2), min(k.width, bb[2] + 2), min(k.height, bb[3] + 2)))
        s = MAXPX / max(k.size)
        if s < 1: k = k.resize((max(1, round(k.width * s)), max(1, round(k.height * s))), Image.LANCZOS)
        k.save(os.path.join(OUT, n + '.png')); print(sheet, n, k.size)

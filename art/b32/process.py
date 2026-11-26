"""Cut the B32 black-background ImageGen sheets into alpha sprites (public/art/b32/<name>.webp). Reproducible: python art/b32/process.py"""
import os, numpy as np
from PIL import Image, ImageFilter
from collections import deque
SRC = 'art/b32'; OUT = 'public/art/b32'; os.makedirs(OUT, exist_ok=True)
def key(im, th=22):
    a = np.asarray(im.convert('RGB')).astype(np.int16); h, w, _ = a.shape; dark = a.max(axis=2) <= th
    out = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not out[y, x]: out[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not out[y, x]: out[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not out[ny, nx] and dark[ny, nx]: out[ny, nx] = True; q.append((ny, nx))
    al = Image.fromarray(np.where(out, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    r = im.convert('RGBA'); r.putalpha(al); return r
SHEETS = {
 'kai_lightning': ['kl_arc', 'kl_fork', 'kl_snap', 'kl_coil', 'kl_web', 'kl_strike'],
 'kai_impact': ['ki_star', 'ki_crack', 'ki_crescent', 'ki_ring', 'ki_claw', 'ki_comet'],
 'kai_silver': ['ks_cut', 'ks_shards', 'ks_sigil', 'ks_fall', 'ks_wisp', 'ks_reticle'],
 'sora_crystal': ['sc_s', 'sc_m', 'sc_l', 'sc_feather', 'sc_bar', 'sc_star'],
 'ren_force': ['rf_claws', 'rf_fist', 'rf_front', 'rf_crater', 'rf_cross', 'rf_cinders'],
 'vex_void': ['vv_tear', 'vv_seal', 'vv_crescent', 'vv_blade', 'vv_ripple', 'vv_flash'],
}
CLEAN = ('sc_s', 'sc_m', 'sc_l', 'sc_feather', 'sc_bar', 'sc_star')   # single solid objects: drop stray bits bled in from the neighbouring cell
W_OF = {'kl_arc': 512, 'kl_fork': 512, 'kl_web': 448, 'ki_comet': 448, 'ks_cut': 512, 'ks_wisp': 448, 'sc_star': 512, 'vv_blade': 448}
for sheet, names in SHEETS.items():
    p = f'{SRC}/{sheet}.png'
    if not os.path.exists(p): continue
    im = Image.open(p); W, H = im.size
    for i, n in enumerate(names):
        c, r = i % 3, i // 3; cell = im.crop((c * W // 3, r * H // 2, (c + 1) * W // 3, (r + 1) * H // 2)); s = key(cell)
        if n in CLEAN:
            from scipy import ndimage
            a = np.asarray(s)[:, :, 3] > 40; lab, k = ndimage.label(a); sizes = ndimage.sum(a, lab, range(1, k + 1)); keep = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= 0.25 * max(sizes)]); arr = np.asarray(s).copy(); arr[:, :, 3] = np.where(keep, arr[:, :, 3], 0); s = Image.fromarray(arr)
        s = s.crop(s.getbbox())
        w = W_OF.get(n, 384); k = w / s.width; s = s.resize((w, max(1, round(s.height * k))), Image.LANCZOS); s.save(f'{OUT}/{n}.webp', 'WEBP', quality=90, method=6, exact=True)
        print(n, s.size)

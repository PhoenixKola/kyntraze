"""B34: cuts the Eventide Seraph ImageGen sheets into runtime assets. python art/b34/process.py
 icons.png -> public/ui/icons/sora2_*.png (96 px) | portrait.png -> public/ui/heroes/sora-portrait-f2.webp (128) | ash_fox.png / ash_fx.png -> public/art/b34/*.webp"""
import os, numpy as np
from PIL import Image, ImageFilter
from collections import deque
SRC = 'art/b34'; OUT = 'public/art/b34'; os.makedirs(OUT, exist_ok=True)
def flood(im, bgtest, blur=0.8):
    a = np.asarray(im.convert('RGB')).astype(np.int16); h, w, _ = a.shape; dark = bgtest(a); out = np.zeros((h, w), bool); q = deque()
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
    al = Image.fromarray(np.where(out, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur)); r = im.convert('RGBA'); r.putalpha(al); return r
black = lambda a: a.max(axis=2) <= 24
magenta = lambda a: (a[..., 0] > 200) & (a[..., 2] > 200) & (a[..., 1] < 90)
CLEAN = {'sf_trace', 'sf_diagram', 'sf_node', 'sf_star', 'sf_nova'}
def clean(s):
    from scipy import ndimage
    a = np.array(s); lab, n = ndimage.label(a[..., 3] > 24); sz = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1)); keep = [i + 1 for i, v in enumerate(sz) if v >= 0.04 * max(sz)]
    a[..., 3] = np.where(np.isin(lab, keep), a[..., 3], 0); return Image.fromarray(a)
def main_cluster(s):
    from scipy import ndimage
    a = np.array(s); m = a[..., 3] > 24; g = max(6, int(0.012 * a.shape[1])); big = ndimage.binary_dilation(m, iterations=g); lab, n = ndimage.label(big)
    if n < 2: return s
    sz = ndimage.sum(m, lab, range(1, n + 1)); k = int(np.argmax(sz)) + 1; a[..., 3] = np.where(lab == k, a[..., 3], 0); return Image.fromarray(a)
def grid(name, cols, rows, names, width, dest=None, size=None):
    p = f'{SRC}/{name}.png'
    if not os.path.exists(p): return
    im = Image.open(p); W, H = im.size
    for i, n in enumerate(names):
        c, r = i % cols, i // cols; s = flood(im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows)), black); s = clean(s) if n in CLEAN else s; s = s if size else main_cluster(s); s = s.crop(s.getbbox())
        if size: s = s.resize((size, size), Image.LANCZOS); s.save(f'{dest}/{n}.png')
        else: k = width / s.width; s = s.resize((width, max(1, round(s.height * k))), Image.LANCZOS); s.save(f'{OUT}/{n}.webp', 'WEBP', quality=90, method=6, exact=True)
        print(n, s.size)
grid('icons', 4, 2, ['sora2_auto', 'sora2_q', 'sora2_e', 'sora2_r', 'sora2_v', 'sora2_od', 'sora2_form', 'sora2_trace'], 0, 'public/ui/icons', 96)
grid('phoenix', 3, 2, ['ph_head', 'ph_chest', 'ph_wingup', 'ph_wingback', 'ph_tail', 'ph_front'], 512)
grid('fx', 3, 3, ['sf_feather', 'sf_lance', 'sf_node', 'sf_spear', 'sf_diagram', 'sf_trace', 'sf_burst', 'sf_star', 'sf_nova'], 384)
grid('mantle', 2, 2, ['sm_left', 'sm_right', 'sm_halo', 'sm_feather'], 256)
if os.path.exists(f'{SRC}/portrait.png'):
    s = flood(Image.open(f'{SRC}/portrait.png'), magenta, 1.0); _a = np.array(s); _m = magenta(np.asarray(Image.open(f'{SRC}/portrait.png').convert('RGB')).astype(np.int16)); _a[..., 3] = np.where(_m, 0, _a[..., 3]); s = Image.fromarray(_a); s = s.crop(s.getbbox()); m = max(s.size); sq = Image.new('RGBA', (m, m), (0, 0, 0, 0)); sq.paste(s, ((m - s.width) // 2, (m - s.height) // 2))
    sq.resize((128, 128), Image.LANCZOS).save('public/ui/heroes/sora-portrait-f2.webp', 'WEBP', quality=92, method=6, exact=True); print('portrait')

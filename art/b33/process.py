"""B33: cuts the Ashen Eclipse ImageGen sheets into runtime assets. python art/b33/process.py
 icons.png -> public/ui/icons/ren2_*.png (96 px) | portrait.png -> public/ui/heroes/ren-portrait-f2.webp (128) | ash_fox.png / ash_fx.png -> public/art/b33/*.webp"""
import os, numpy as np
from PIL import Image, ImageFilter
from collections import deque
SRC = 'art/b33'; OUT = 'public/art/b33'; os.makedirs(OUT, exist_ok=True)
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
def grid(name, cols, rows, names, width, dest=None, size=None):
    p = f'{SRC}/{name}.png'
    if not os.path.exists(p): return
    im = Image.open(p); W, H = im.size
    for i, n in enumerate(names):
        c, r = i % cols, i // cols; s = flood(im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows)), black); s = s.crop(s.getbbox())
        if size: s = s.resize((size, size), Image.LANCZOS); s.save(f'{dest}/{n}.png')
        else: k = width / s.width; s = s.resize((width, max(1, round(s.height * k))), Image.LANCZOS); s.save(f'{OUT}/{n}.webp', 'WEBP', quality=90, method=6, exact=True)
        print(n, s.size)
grid('icons', 4, 2, ['ren2_auto', 'ren2_q', 'ren2_e', 'ren2_r', 'ren2_v', 'ren2_od', 'ren2_form', 'ren2_brand'], 0, 'public/ui/icons', 96)
grid('ash_fox', 3, 2, ['ef_head', 'ef_body', 'ef_tails', 'ef_stream', 'ef_paw', 'ef_jaw'], 512)
grid('ash_fx', 3, 3, ['af_claws', 'af_erupt', 'af_crater', 'af_tail', 'af_brand', 'af_front', 'af_cinders', 'af_core', 'af_bite'], 384)
if os.path.exists(f'{SRC}/portrait.png'):
    s = flood(Image.open(f'{SRC}/portrait.png'), magenta, 1.0); s = s.crop(s.getbbox()); m = max(s.size); sq = Image.new('RGBA', (m, m), (0, 0, 0, 0)); sq.paste(s, ((m - s.width) // 2, (m - s.height) // 2))
    sq.resize((128, 128), Image.LANCZOS).save('public/ui/heroes/ren-portrait-f2.webp', 'WEBP', quality=92, method=6, exact=True); print('portrait')

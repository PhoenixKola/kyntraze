"""Cuts the Celestial Familiar ImageGen sheets into runtime assets. python art/fam/process.py
dragon / fox / phoenix / guardian.png (4x3 poses) -> public/art/fam/<name>.webp spritesheets (frames 0-3 idle, 4-7 move, 8 windup, 9 strike, 10 recover, 11 hit) + manifest.json
fx.png (3x4) -> public/art/fam/fx_<name>_<shot|burst|sigil>.webp"""
import os, json, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from collections import deque
SRC = 'art/fam'; OUT = 'art/fam/native'; PUB = 'public/art/fam'; os.makedirs(OUT, exist_ok=True); os.makedirs(PUB, exist_ok=True)
FRAME_W = 256
THR = {'fox': 5, 'guardian': 5}   # near-black bodies: only the true (<= 1) background may be keyed out
def flood(im, thr=26, blur=0.8, enclosed=0):
    a = np.asarray(im.convert('RGB')).astype(np.int16); h, w, _ = a.shape; dark = a.max(axis=2) <= thr; out = np.zeros((h, w), bool); q = deque()
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
    if enclosed:   # big pure-black pockets between tails / limbs are background too; the small chest disc is kept
        lab, n = ndimage.label((a.max(axis=2) <= 3) & ~out)
        for i in range(1, n + 1):
            m = lab == i
            if m.sum() > enclosed: out |= m
    al = Image.fromarray(np.where(out, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur)); r = im.convert('RGBA'); r.putalpha(al); return r
def tidy(s, keep_streaks=True):
    """drop dust and anything touching the cell border (a neighbour's sliver); keep the main body and any large streak"""
    a = np.array(s); m = a[..., 3] > 24; lab, n = ndimage.label(m)
    if n == 0: return s
    sz = ndimage.sum(m, lab, range(1, n + 1)); big = sz.max(); keep = []
    h, w = m.shape
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i); border = ys.min() <= 2 or xs.min() <= 2 or ys.max() >= h - 3 or xs.max() >= w - 3
        if sz[i - 1] == big or (keep_streaks and sz[i - 1] >= 0.004 * big and not border): keep.append(i)
    a[..., 3] = np.where(np.isin(lab, keep), a[..., 3], 0); return Image.fromarray(a)
manifest = {}
for name in ['dragon', 'fox', 'phoenix', 'guardian']:
    p = f'{SRC}/{name}.png'
    if not os.path.exists(p): continue
    im = Image.open(p); W, H = im.size; cw, ch = W // 4, H // 3; k = FRAME_W / cw; fw, fh = FRAME_W, round(ch * k)
    cells = []
    for i in range(12):
        c, r = i % 4, i // 4; s = tidy(flood(im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)), thr=THR.get(name, 26), enclosed=900)); cells.append(s.resize((fw, fh), Image.LANCZOS))
    cents = []
    for s in cells:
        al = np.asarray(s)[..., 3].astype(float); ys, xs = np.mgrid[0:fh, 0:fw]; t = al.sum() or 1; cents.append(((al * xs).sum() / t, (al * ys).sum() / t))
    cx = float(np.median([c[0] for c in cents])); cy = float(np.median([c[1] for c in cents]))
    sheet = Image.new('RGBA', (fw * 4, fh * 3), (0, 0, 0, 0))
    for i, s in enumerate(cells):
        dx, dy = round(cx - cents[i][0]), round(cy - cents[i][1]); f = Image.new('RGBA', (fw, fh), (0, 0, 0, 0)); f.paste(s, (dx, dy), s)
        sheet.paste(f, ((i % 4) * fw, (i // 4) * fh))
    sheet.save(f'{OUT}/{name}.webp', 'WEBP', quality=88, method=6, exact=True)
    manifest[name] = {'fw': fw, 'fh': fh, 'cols': 4, 'rows': 3, 'px': round(cx), 'py': round(cy)}
    print(name, fw, fh, round(cx), round(cy))
json.dump(manifest, open(f'{PUB}/manifest.json', 'w'))
fxp = f'{SRC}/fx.png'
if os.path.exists(fxp):
    im = Image.open(fxp); W, H = im.size
    for r, hero in enumerate(['dragon', 'fox', 'phoenix', 'guardian']):
        for c, kind in enumerate(['shot', 'burst', 'sigil']):
            s = tidy(flood(im.crop((c * W // 3, r * H // 4, (c + 1) * W // 3, (r + 1) * H // 4))), keep_streaks=False); s = s.crop(s.getbbox()); k = 320 / s.width
            s = s.resize((320, max(1, round(s.height * k))), Image.LANCZOS); s.save(f'{OUT}/fx_{hero}_{kind}.webp', 'WEBP', quality=90, method=6, exact=True); print(hero, kind, s.size)

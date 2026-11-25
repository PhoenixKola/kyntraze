"""Key the black-background ImageGen sheets to alpha and publish small webp runtime assets to public/ui/hud/."""
import os, numpy as np
from PIL import Image
from collections import deque
SRC = 'art/fx-b30-1/hud'; OUT = 'public/ui/hud'; os.makedirs(OUT, exist_ok=True)

def luma_key(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255.0
    m = a.max(axis=2)
    al = np.clip((m - 0.04) / 0.30, 0, 1)
    rgb = np.where(al[..., None] > 0, a / np.maximum(al[..., None], 1e-3), 0).clip(0, 1)
    return Image.fromarray(np.dstack([(rgb * 255).astype(np.uint8), (al * 255).astype(np.uint8)]), 'RGBA')

def hole_key(im, thresh=26):
    a = np.asarray(im.convert('RGB')).astype(np.int16); h, w, _ = a.shape
    dark = a.max(axis=2) <= thresh
    seen = np.zeros((h, w), bool); q = deque([(h // 2, w // 2)])
    if not dark[h // 2, w // 2]: return im.convert('RGBA')
    seen[h // 2, w // 2] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and dark[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
    # outer background (connected to the border) also becomes transparent
    outer = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not outer[y, x]: outer[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not outer[y, x]: outer[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not outer[ny, nx] and dark[ny, nx]: outer[ny, nx] = True; q.append((ny, nx))
    al = np.where(seen | outer, 0, 255).astype(np.uint8)
    # soften the cut edge by one pixel
    from PIL import ImageFilter
    alim = Image.fromarray(al).filter(ImageFilter.GaussianBlur(0.8))
    rgba = im.convert('RGBA'); rgba.putalpha(alim); return rgba

def crop_pub(im, name, width):
    bb = im.getbbox(); im = im.crop(bb) if bb else im
    r = width / im.width; im = im.resize((width, max(1, round(im.height * r))), Image.LANCZOS)
    p = f'{OUT}/{name}.webp'; im.save(p, 'WEBP', quality=88, method=6); return p, os.path.getsize(p), im.size

rows = []
for n in ['flare', 'comet', 'still', 'fox', 'phoenix', 'guard1', 'guard2']:
    f = f'{SRC}/beast_{n}.png'
    if os.path.exists(f): rows.append(('beast_' + n, *crop_pub(luma_key(Image.open(f)), 'beast_' + n, 720)))
for k, w in (('frame', 192), ('ring', 192)):
    for h in ['kai', 'ren', 'sora', 'vex']:
        f = f'{SRC}/{k}_{h}.png'
        if os.path.exists(f): rows.append((f'{k}_{h}', *crop_pub(hole_key(Image.open(f)), f'{k}_{h}', w)))
f = f'{SRC}/pause_crest.png'
if os.path.exists(f): rows.append(('pause_crest', *crop_pub(hole_key(Image.open(f)), 'pause_crest', 256)))
tot = 0
for r in rows: print(r[0], r[3], r[2], 'bytes'); tot += r[2]
print('total', tot)

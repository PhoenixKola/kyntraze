"""B35: black-keyed beasts -> public/ui/hud/beast_ashfox.webp / beast_eventide.webp (720 wide, same as the other mantle beasts). python art/b35/process.py"""
import numpy as np
from PIL import Image, ImageFilter
from collections import deque
def key(path, out):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(np.int16); h, w, _ = a.shape; dark = a.max(axis=2) <= 22; seen = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and dark[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
    al = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9)); r = im.convert('RGBA'); r.putalpha(al); r = r.crop(r.getbbox())
    k = 720 / r.width; r = r.resize((720, max(1, round(r.height * k))), Image.LANCZOS); r.save(out, 'WEBP', quality=90, method=6, exact=True); print(out, r.size)
key('art/b35/beast_ashfox.png', 'public/ui/hud/beast_ashfox.webp'); key('art/b35/beast_eventide.png', 'public/ui/hud/beast_eventide.webp')
from PIL import Image as I
a = I.open('public/ui/hud/beast_ashfox.webp').convert('RGBA'); b = I.open('public/ui/hud/beast_eventide.webp').convert('RGBA'); s = I.new('RGBA', (720, a.height + b.height + 8), (30, 26, 40, 255)); s.alpha_composite(a, (0, 0)); s.alpha_composite(b, (0, a.height + 8)); s.convert('RGB').save('test-results/b35-newbeasts.png')

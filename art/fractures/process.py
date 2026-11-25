"""Cut the black-background ImageGen sheets into alpha sprites; pack world sprites into one Phaser atlas and publish the HUD icons separately."""
import os, json, numpy as np
from PIL import Image, ImageFilter
from collections import deque
SRC = 'art/fractures'; OUT = 'public/art/fractures'; os.makedirs(OUT + '/ui', exist_ok=True)
def key(im, th=26):
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
    al = Image.fromarray(np.where(out, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))
    r = im.convert('RGBA'); r.putalpha(al); return r
def grid(name, cols, rows, names, width, ui=False):
    im = Image.open(f'{SRC}/{name}.png'); W, H = im.size; res = {}
    for i, n in enumerate(names):
        c, r = i % cols, i // cols; cell = im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows))
        s = key(cell); bb = s.getbbox(); s = s.crop(bb); k = width / s.width; s = s.resize((width, max(1, round(s.height * k))), Image.LANCZOS)
        if ui: s.save(f'{OUT}/ui/{n}.webp', 'WEBP', quality=88, method=6)
        else: res[n] = s
    return res
A = ['gloam', 'ashen', 'aetherfall', 'paradox']; H4 = ['kai', 'ren', 'sora', 'vex']
spr = {}
for pre, sheet, w in (('portal', 'portals', 384), ('shrine', 'shrines', 320), ('cache', 'caches', 256), ('relay', 'relays', 200), ('beacon', 'beacons', 150)):
    for n, s in grid(sheet, 2, 2, [f'{pre}_{a}' for a in A], w).items(): spr[n] = s
spr.update(grid('cache_states', 3, 1, ['cache_state_0', 'cache_state_1', 'cache_state_2'], 256))
spr.update(grid('echoes', 2, 2, [f'echo_{h}' for h in H4], 440))
grid('emblems', 3, 2, [f'emblem_{k}' for k in ['rift', 'shrine', 'cache', 'elite', 'relay', 'echo']], 96, ui=True)
grid('marks', 3, 2, [f'mark_{k}' for k in ['swift', 'volatile', 'warded', 'relic', 'boon', 'trophy']], 96, ui=True)
b = key(Image.open(f'{SRC}/banner.png')); b = b.crop(b.getbbox()); b = b.resize((640, round(b.height * 640 / b.width)), Image.LANCZOS); b.save(f'{OUT}/ui/banner.webp', 'WEBP', quality=88, method=6)
# shelf-pack the world sprites into one 2048 atlas
order = sorted(spr.items(), key=lambda kv: -kv[1].height); AW = 2048; x = y = row = 0; place = {}
for n, s in order:
    if x + s.width + 2 > AW: x = 0; y += row + 2; row = 0
    place[n] = (x, y); x += s.width + 2; row = max(row, s.height)
AH = 1; 
while AH < y + row + 2: AH *= 2
atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0)); frames = {}
for n, s in spr.items():
    px, py = place[n]; atlas.paste(s, (px, py)); frames[n] = {'frame': {'x': px, 'y': py, 'w': s.width, 'h': s.height}, 'rotated': False, 'trimmed': False, 'spriteSourceSize': {'x': 0, 'y': 0, 'w': s.width, 'h': s.height}, 'sourceSize': {'w': s.width, 'h': s.height}}
atlas.save(f'{OUT}/lf.webp', 'WEBP', quality=86, method=6)
json.dump({'frames': frames, 'meta': {'image': 'lf.webp', 'size': {'w': AW, 'h': AH}, 'scale': '1'}}, open(f'{OUT}/lf.json', 'w'))
for f in sorted(os.listdir(OUT)) + ['ui/' + f for f in sorted(os.listdir(OUT + '/ui'))]:
    p = f'{OUT}/{f}'
    if os.path.isfile(p): print(f, os.path.getsize(p))
print(AW, AH, len(spr))

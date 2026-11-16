"""B21: cut the ImageGen magenta-background sheets in art/fx-b21/dmg/ into transparent PNGs under public/art/fx/b21/dmg/ + manifest.json.
Magenta is keyed by colour distance with despill; elements are grouped by grid cell. Warden crack overlays are fitted onto the Warden's 436x439 frame body box (x80-390,y55-355)."""
import os, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
SRC, OUT = 'art/fx-b21/dmg', 'public/art/fx/b21/dmg'; os.makedirs(OUT, exist_ok=True)
def key(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    d = np.sqrt((a[..., 0] - 255) ** 2 + a[..., 1] ** 2 + (a[..., 2] - 255) ** 2)
    al = np.clip((d - 90) / 70, 0, 1)
    spill = (np.clip(1 - d / 160, 0, 1) * (al < 1))[..., None]   # pull magenta only out of semi-transparent edge pixels
    a = np.clip(a - spill * np.array([60, -10, 60]), 0, 255)
    return np.dstack([a, al * 255]).astype(np.uint8)
def cells(rgba, gc, gr):
    H, W = rgba.shape[:2]; lab, n = ndi.label(ndi.binary_dilation(rgba[..., 3] > 40, iterations=6)); out = {}
    for i, s in enumerate(ndi.find_objects(lab)):
        if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) < 400: continue
        b = (s[1].start, s[0].start, s[1].stop, s[0].stop); k = (min(gr - 1, int((b[1] + b[3]) / 2 / (H / gr))), min(gc - 1, int((b[0] + b[2]) / 2 / (W / gc))))
        u = out.get(k, b); out[k] = (min(u[0], b[0]), min(u[1], b[1]), max(u[2], b[2]), max(u[3], b[3]))
    return [out[k] for k in sorted(out)]
man = {}
def save(name, im, maxdim=None):
    if maxdim and max(im.size) > maxdim: s = maxdim / max(im.size); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    im.save(f'{OUT}/{name}.png'); man[name] = {'width': im.width, 'height': im.height}; print(name, im.size)
def crop(rgba, b, pad=4):
    x0, y0, x1, y1 = b; return Image.fromarray(rgba[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad], 'RGBA')
def sheet(file, gc, gr, names, maxdim):
    r = key(f'{SRC}/{file}.png'); bs = cells(r, gc, gr); assert len(bs) == len(names), (file, len(bs), len(names))
    for n, b in zip(names, bs): save(n, crop(r, b), 512 if n.endswith('lane') else maxdim)
r = key(f'{SRC}/warden-cracks.png'); bs = cells(r, 3, 1); assert len(bs) == 3
for n, b in zip(['crack_l1', 'crack_l2', 'crack_l3'], bs):
    c = crop(r, b, 0).resize((310, 300), Image.LANCZOS); f = Image.new('RGBA', (436, 439), (0, 0, 0, 0)); f.paste(c, (80, 55)); save(n, f)
sheet('warden-slabs', 2, 2, ['slab_a', 'slab_b', 'slab_c', 'slab_d'], 160)
sheet('seraph-shards', 5, 1, ['halo_shard_a', 'halo_shard_b', 'crystal_shard_a', 'crystal_shard_b', 'core_crack'], 180)
sheet('aegis-cantor', 3, 1, ['shield_crack', 'shield_down', 'buff_glyph'], 200)
sheet('gloam-decals', 4, 3, ['g_scratch_a', 'g_crack_a', 'g_crack_b', 'g_scratch_b', 'g_seam_a', 'g_seam_b', 'g_conduit_a', 'g_conduit_b', 'g_crack_c', 'g_crack_d', 'g_beam_lane'], 256)
sheet('ashen-decals', 4, 3, ['a_crack_a', 'a_crack_b', 'a_crack_c', 'a_crack_d', 'a_ash_a', 'a_ash_b', 'a_crack_e', 'a_rubble', 'a_verdigris_a', 'a_verdigris_b', 'a_verdigris_c', 'a_beam_lane'], 256)
json.dump(man, open(f'{OUT}/manifest.json', 'w'), indent=1)

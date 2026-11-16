"""B20: Sora's shins read short and baggy and the East/West torsos busy. Slims every shin part ~20% (nearest-neighbour, re-centred on the SAME canvas so rig pivots stay valid) and removes isolated noise pixels from the East/West torsos. Originals are saved as *.b19.png."""
import glob, os, shutil, numpy as np
from PIL import Image
from scipy import ndimage as ndi
S = 'art/characters/sora'; SC = float(os.environ.get('SC', 0.8))
def backup(p):
    bk = p.replace('.png', '.b19.png')
    if not os.path.exists(bk): shutil.copy(p, bk)
    return bk
for p in sorted(glob.glob(f'{S}/**/parts/shin_*.png', recursive=True)):
    if p.endswith('.b19.png'): continue
    im = Image.open(backup(p)).convert('RGBA'); w, h = im.size; nw = max(8, round(w * SC))
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); out.paste(im.resize((nw, h), Image.NEAREST), ((w - nw) // 2, 0)); a = np.array(out); m = a[..., 3] > 0
    m2 = ndi.binary_closing(ndi.binary_opening(m, structure=np.ones((2, 2))), structure=np.ones((2, 2))); a[~m2] = 0; add = m2 & ~m
    if add.any():
        nn = ndi.distance_transform_edt(~m, return_indices=True)[1]
        for c in range(4): a[add, c] = a[nn[0][add], nn[1][add], c]
    Image.fromarray(a, 'RGBA').save(p); print('shin', p)
for p in sorted(glob.glob(f'{S}/dirs*/*/parts/torso.png')):
    q = p.replace(chr(92), '/')
    if p.endswith('.b19.png') or ('/east/' not in q and '/west/' not in q): continue
    a = np.array(Image.open(backup(p)).convert('RGBA')); rgb = a[..., :3].astype(int); op = a[..., 3] > 0; fixed = 0
    for y in range(1, a.shape[0] - 1):
        for x in range(1, a.shape[1] - 1):
            if not op[y, x]: continue
            nb = [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
            if all(op[q] for q in nb) and all(np.abs(rgb[q] - rgb[y, x]).sum() > 40 for q in nb):   # a lone pixel unlike all four neighbours = noise
                cols = [tuple(rgb[q]) for q in nb]; best = max(set(cols), key=cols.count); a[y, x, :3] = best; fixed += 1
    Image.fromarray(a, 'RGBA').save(p); print('torso', p, 'noise px fixed', fixed)

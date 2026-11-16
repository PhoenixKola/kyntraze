"""B20: Ren's bare upper arms read as lumpy blobs. Slims every upper_arm part (nearest-neighbour, re-centred on the SAME canvas so rig pivots stay valid) and rounds one-pixel outline bumps. Originals saved as *.b19.png."""
import glob, os, shutil, numpy as np
from PIL import Image
from scipy import ndimage as ndi
R = 'art/characters/ren'; SC = float(os.environ.get('SC', 0.8))
for p in sorted(glob.glob(f'{R}/**/parts/upper_arm_*.png', recursive=True)):
    if p.endswith('.b19.png'): continue
    bk = p.replace('.png', '.b19.png')
    if not os.path.exists(bk): shutil.copy(p, bk)
    im = Image.open(bk).convert('RGBA'); w, h = im.size; nw = max(8, round(w * SC))
    sl = im.resize((nw, h), Image.NEAREST); out = Image.new('RGBA', (w, h), (0, 0, 0, 0)); out.paste(sl, ((w - nw) // 2, 0))
    a = np.array(out); m = a[..., 3] > 0
    m2 = ndi.binary_closing(ndi.binary_opening(m, structure=np.ones((2, 2))), structure=np.ones((2, 2)))   # drop 1px bumps, fill 1px notches
    a[~m2] = 0; add = m2 & ~m
    if add.any():
        for c in range(4):
            nn = ndi.distance_transform_edt(~m, return_indices=True)[1]; a[add, c] = a[nn[0][add], nn[1][add], c]
    Image.fromarray(a, 'RGBA').save(p); print('slimmed', p)

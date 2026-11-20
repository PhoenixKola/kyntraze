"""Cuts the Kai transformation-presence ImageGen sheets (art/fx-b24/<form>/<kind>.png, 4 sprites on black) into public/art/fx/kai-p/<form>_<kind><i>.png (cropped, black kept: they are drawn additively)."""
import os, sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(ROOT, 'public', 'art', 'fx', 'kai-p'); os.makedirs(out, exist_ok=True)
for form in ('flare', 'comet', 'still'):
    for kind in ('ring', 'wrap', 'lick'):
        p = os.path.join(ROOT, 'art', 'fx-b24', form, kind + '.png')
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGB'); a = np.asarray(im).astype(np.float32); luma = a.max(axis=2)
        mask = ndi.binary_dilation(luma > 40, iterations=(3 if kind == 'ring' else max(6, im.width // 120)))
        lab, n = ndi.label(mask); sizes = ndi.sum(mask, lab, range(1, n + 1)); keep = sorted(np.argsort(sizes)[::-1][:4] + 1, key=lambda l: ndi.center_of_mass(mask, lab, l)[1])
        for i, l in enumerate(keep):
            ys, xs = np.where((lab == l) & (luma > 25)); 
            if len(xs) == 0: continue
            pad = 4; box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad))
            crop = im.crop(box); crop.save(os.path.join(out, f'{form}_{kind}{i}.png'))
        print(form, kind, 'cut', len(keep))

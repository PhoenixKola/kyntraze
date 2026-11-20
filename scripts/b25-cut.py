"""Cuts the Primal Overdrive / signature ImageGen sheets (art/fx-b25/<form>/<kind>.png, 4 sprites on black) into public/art/fx/kai-o/<form>_<kind><i>.png; the UI icon sheet becomes alpha-from-luma PNGs in public/ui/icons/ (sig1..3, overdrive)."""
import os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(ROOT, 'public', 'art', 'fx', 'kai-o'); os.makedirs(out, exist_ok=True)
def parts(p, dil):
    im = Image.open(p).convert('RGB'); a = np.asarray(im).astype(np.float32); luma = a.max(axis=2)
    mask = ndi.binary_dilation(luma > 40, iterations=dil); lab, n = ndi.label(mask)
    if n == 0: return im, []
    sizes = ndi.sum(mask, lab, range(1, n + 1)); keep = sorted(np.argsort(sizes)[::-1][:4] + 1, key=lambda l: ndi.center_of_mass(mask, lab, l)[1]); boxes = []
    for l in keep:
        ys, xs = np.where((lab == l) & (luma > 25))
        if len(xs): boxes.append((max(0, xs.min() - 4), max(0, ys.min() - 4), min(im.width, xs.max() + 4), min(im.height, ys.max() + 4)))
    return im, boxes
for form in ('flare', 'comet', 'still'):
    for kind in ('dragon', 'claw', 'orb', 'burst', 'head', 'sigil', 'jet', 'shift'):
        p = os.path.join(ROOT, 'art', 'fx-b25', form, kind + '.png')
        if not os.path.exists(p): continue
        im, boxes = parts(p, 3 if kind in ('sigil', 'orb', 'burst') else 8)
        for i, b in enumerate(boxes): im.crop(b).save(os.path.join(out, f'{form}_{kind}{i}.png'))
        print(form, kind, len(boxes))
p = os.path.join(ROOT, 'art', 'fx-b25', 'ui', 'icons.png')
if os.path.exists(p):
    im, boxes = parts(p, 10); os.makedirs(os.path.join(ROOT, 'public', 'ui', 'icons'), exist_ok=True)
    for i, b in enumerate(boxes):
        c = im.crop(b); w = max(c.size); sq = Image.new('RGB', (w, w)); sq.paste(c, ((w - c.width) // 2, (w - c.height) // 2)); sq = sq.resize((96, 96), Image.NEAREST)
        a = np.asarray(sq).astype(np.float32); alpha = np.clip(a.max(axis=2) * 1.6, 0, 255).astype(np.uint8)
        rgba = np.dstack([np.asarray(sq), alpha]); Image.fromarray(rgba, 'RGBA').save(os.path.join(ROOT, 'public', 'ui', 'icons', ['sig_1', 'sig_2', 'sig_3', 'overdrive'][i] + '.png'))
    print('icons', len(boxes))

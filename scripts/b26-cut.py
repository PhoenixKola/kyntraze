"""B26: cuts the Crimson Nine-Tailed Fox / Ren FX ImageGen sheets (art/fx-b26/<name>.png, N sprites on pure black) into public/art/fx/ren-fox/<name><i>.png (RGB on black, drawn with ADD blend; icons get alpha-from-luma + rounded tile alpha) and writes manifest.json.
Method (same as b25-cut): connected components of (luma > 40) after dilation, the N largest kept and ordered left->right (top->bottom for icons), each sprite keeps only its OWN component's pixels (no neighbour bleed), trimmed to bbox + 3 px. A cell whose bbox touches the sheet edge is reported as CROPPED. Alternatives: pass the preferred source via CHOICE below."""
import os, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'fx-b26'); OUT = os.path.join(ROOT, 'public', 'art', 'fx', 'ren-fox'); os.makedirs(OUT, exist_ok=True)
# runtime name -> (source sheet file stem, sprite count, dilation, anchor hint)
CHOICE = {
 'head_side': ('head_side_v2', 4, 8, 'neck root = left edge centre; faces right; mouth-closed, snarl, roar, breath'),
 'head_front': ('head_front', 4, 8, 'bottom centre = chest; paws at the bottom corners'),
 'head_back': ('head_back', 4, 8, 'bottom centre = nape; ears top'),
 'body': ('body', 4, 8, 'wrap segments: shoulder, torso, haunch, crouch; behind the fighter'),
 'paw_b': ('paw_b', 4, 8, 'slam down: top = forearm origin, bottom centre = paw contact'),
 'tails_rest': ('tails_rest', 4, 8, 'FULL beast side loop (fox + nine tails), root right'),
 'tails_stream': ('tails_stream', 4, 8, 'FULL beast side streaming loop, root right'),
 'tails_flare': ('tails_flare', 4, 8, 'front beast with nine tails fanned (gather, snap, open, fan); bottom centre = root'),
 'activation': ('activation', 4, 6, 'materialise: embers, form, roar burst, settle; centre = fighter chest'),
 'dissolve': ('dissolve', 4, 6, 'expiry: solid to embers; faces right'),
 'ground_ring': ('ground_ring', 4, 4, 'ground ellipse 3:1, centre = feet'),
 'cyclone_arc': ('cyclone_arc', 4, 6, 'arc sizes small, medium, full circle, outward burst; rotate to spin'),
 'cyclone_crack': ('cyclone_crack', 4, 4, 'floor crack star, centre = cast point'),
 'rampage_dust': ('rampage_dust', 4, 6, 'ground aligned: bottom edge = ground line'),
 'rampage_trail': ('rampage_trail', 4, 4, 'points right; tail left; longest first'),
 'fist_l': ('giant_fist_l', 4, 8, 'raised, descend, impact, withdraw; bottom centre = knuckle contact'),
 'fist_r': ('giant_fist_r_v2', 4, 8, 'same, right hand'),
 'cat_debris': ('cat_debris', 4, 4, 'ground aligned burst'),
 'cat_shock': ('cat_shock', 4, 4, 'ground ellipse 3:1, centre = impact'),
 'nova_orb': ('nova_orb', 4, 5, 'tier stages 1-3 + overcharged; centre = closed fist'),
 'nova_spiral': ('nova_spiral', 4, 5, 'expanding spiral; centre'),
 'nova_core': ('nova_core', 4, 6, 'ignite, erupt, spread, dissipate; bottom = ground'),
 'nova_ring': ('nova_ring', 4, 3, 'circle, centre'),
 'fist_trail': ('fist_trail', 4, 5, 'points right; head at right edge'),
 'flight_ring': ('flight_ring', 4, 5, 'paw-print ground ellipse at liftoff; centre = feet'),
 'flight_fan': ('flight_fan', 4, 5, 'nine streaks, root right edge centre'),
 'wisps': ('wisps', 4, 4, 'rising lick; bottom centre = anchor'),
 'wisp_arc': ('wisp_arc', 4, 3, 'ribbon arc; centre = limb'),
}
CHOICE.update({k: v for k, v in {
 'tails_only': ('tails_only', 4, 8, 'ONLY nine tails, root right; use as tail layer'),
 'tails_only_stream': ('tails_only_stream', 4, 8, 'ONLY nine tails streaming left; root right'),
 'paw_only': ('paw_only', 4, 8, 'forearm + paw striking right; forearm enters from the left'),
}.items() if os.path.exists(os.path.join(SRC, v[0] + '.png'))})

def cut(stem, n, dil, order='x'):
    im = Image.open(os.path.join(SRC, stem + '.png')).convert('RGB'); a = np.asarray(im); luma = a.max(axis=2)
    for d in (dil, 4, 2):
        lab, k = ndi.label(ndi.binary_dilation(luma > 40, iterations=d))
        sizes = ndi.sum(lab > 0, lab, range(1, k + 1)); big = [i + 1 for i in np.argsort(sizes)[::-1] if sizes[i] > 1500][:n]
        if len(big) == n: break
    comps = sorted(big, key=lambda l: ndi.center_of_mass(lab == l)[1] if order == 'x' else ndi.center_of_mass(lab == l)[0])
    out = []
    for l in comps:
        m = ndi.binary_dilation(lab == l, iterations=1) if False else (lab == l)
        ys, xs = np.where(m); x0, y0, x1, y1 = max(0, xs.min() - 3), max(0, ys.min() - 3), min(im.width, xs.max() + 4), min(im.height, ys.max() + 4)
        crop = a.copy(); crop[~m] = 0
        out.append((Image.fromarray(crop[y0:y1, x0:x1]), (x0 <= 1 or y0 <= 1 or x1 >= im.width - 1 or y1 >= im.height - 1)))
    return out, len(big)

manifest = {}
for name, (stem, n, dil, anchor) in CHOICE.items():
    if not os.path.exists(os.path.join(SRC, stem + '.png')): print('missing', stem); continue
    parts, found = cut(stem, n, dil)
    if found != n: print('WARN', name, 'found', found, 'of', n)
    sizes = []
    for i, (img, cropped) in enumerate(parts):
        img.quantize(160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(os.path.join(OUT, f'{name}{i}.png'), optimize=True); sizes.append(list(img.size))
        if cropped: print('CROPPED', name, i)
    manifest[name] = {'frames': len(parts), 'sizes': sizes, 'blend': 'add', 'anchor': anchor, 'source': stem + '.png'}
# skill icons: one sheet of six tiles, rows of three; alpha from the tile shape (luma-keyed), 96px
icons = ['fury', 'cyclone', 'rampage', 'catastrophe', 'nova_fist', 'overdrive']
im = Image.open(os.path.join(SRC, 'icons.png')).convert('RGB'); a = np.asarray(im).astype(np.float32); luma = a.max(axis=2)
lab, k = ndi.label(ndi.binary_dilation(luma > 18, iterations=3)); sizes = ndi.sum(lab > 0, lab, range(1, k + 1)); big = [i + 1 for i in np.argsort(sizes)[::-1][:6]]
cen = {l: ndi.center_of_mass(lab == l) for l in big}; rows = sorted(big, key=lambda l: cen[l][0]); order = sorted(rows[:3], key=lambda l: cen[l][1]) + sorted(rows[3:], key=lambda l: cen[l][1])
iconout = os.path.join(ROOT, 'public', 'ui', 'icons'); os.makedirs(iconout, exist_ok=True)
for nm, l in zip(icons, order):
    ys, xs = np.where(lab == l); c = Image.fromarray(np.asarray(im)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]).resize((96, 96), Image.NEAREST)
    arr = np.asarray(c).astype(np.float32); alpha = np.clip(arr.max(axis=2) * 6, 0, 255).astype(np.uint8)
    Image.fromarray(np.dstack([arr.astype(np.uint8), alpha]), 'RGBA').save(os.path.join(iconout, f'ren_cf_{nm}.png'))
manifest['_icons'] = {'dir': 'public/ui/icons', 'files': [f'ren_cf_{n}.png' for n in icons], 'size': [96, 96]}
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print('done', len(manifest))

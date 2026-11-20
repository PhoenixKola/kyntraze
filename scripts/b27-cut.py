"""B27: cuts the Astral Phoenix / Sora FX ImageGen sheets (art/fx-b27/<name>.png, N sprites on pure black) into public/art/fx/sora-phoenix/<name><i>.png (RGB on black, drawn with ADD blend; icons get alpha-from-luma + rounded tile alpha) and writes manifest.json.
Method (same as b25-cut): connected components of (luma > 40) after dilation, the N largest kept and ordered left->right (top->bottom for icons), each sprite keeps only its OWN component's pixels (no neighbour bleed), trimmed to bbox + 3 px. A cell whose bbox touches the sheet edge is reported as CROPPED. Alternatives: pass the preferred source via CHOICE below."""
import os, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'fx-b27'); OUT = os.path.join(ROOT, 'public', 'art', 'fx', 'sora-phoenix'); os.makedirs(OUT, exist_ok=True)
# runtime name -> (source sheet stem, sprite count, dilation, anchor hint); an '@' alternative can be swapped in by editing the stem
CHOICE = {
 'head_side': ('head_side', 4, 6, ''),
 'head_front': ('head_front', 4, 6, ''),
 'head_back': ('head_back', 4, 6, ''),
 'body': ('body', 4, 6, ''),
 'wing_side': ('wing_side', 4, 6, ''),
 'tail': ('tail', 4, 6, ''),
 'feather_blade': ('feather_blade', 4, 6, ''),
 'activation': ('activation', 4, 6, ''),
 'dissolve': ('dissolve', 4, 6, ''),
 'ground_ring': ('ground_ring', 4, 6, ''),
 'prison_form': ('prison_form', 4, 6, ''),
 'prison_shatter': ('prison_shatter', 4, 6, ''),
 'spear': ('spear', 4, 6, ''),
 'spear_impact': ('spear_impact', 4, 6, ''),
 'mark_sigil': ('mark_sigil', 4, 6, ''),
 'collapse_vortex': ('collapse_vortex', 4, 6, ''),
 'collapse_burst': ('collapse_burst', 4, 6, ''),
 'astral_orb': ('astral_orb', 4, 6, ''),
 'orb_trail': ('orb_trail', 4, 6, ''),
 'astral_burst': ('astral_burst', 4, 6, ''),
 'astral_ring': ('astral_ring', 4, 6, ''),
 'flight_wings': ('flight_wings', 4, 6, ''),
 'flight_ring': ('flight_ring', 4, 6, ''),
 'wisps': ('wisps', 4, 6, ''),
 'wisp_arc': ('wisp_arc', 4, 6, ''),
}

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


# sets whose frames break into many small fragments (shards, embers) are cut by equal quarter-width cells instead of components
GRID = {'prison_shatter', 'collapse_burst', 'astral_burst', 'dissolve'}
def cut_grid(stem, n):
    """split by empty-column gaps (merging runs closer than 40 px), keeping every fragment of a frame"""
    im = Image.open(os.path.join(SRC, stem + '.png')).convert('RGB'); a = np.asarray(im); luma = a.max(axis=2); occ = (luma > 16).sum(axis=0) > 0
    runs = []; s0 = None
    for x, o in enumerate(list(occ) + [False]):
        if o and s0 is None: s0 = x
        if not o and s0 is not None: runs.append([s0, x]); s0 = None
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < 40: merged[-1][1] = r[1]
        else: merged.append(r)
    merged = sorted(sorted(merged, key=lambda r: r[1] - r[0], reverse=True)[:n], key=lambda r: r[0])
    out = []
    for x0, x1 in merged:
        l = luma[:, x0:x1]; ys, xs = np.where(l > 16); y0, y1 = max(0, ys.min() - 3), min(im.height, ys.max() + 4); xa, xb = max(0, x0 - 3), min(im.width, x1 + 3)
        out.append((Image.fromarray(a[y0:y1, xa:xb].copy()), (xa <= 1 or y0 <= 1 or xb >= im.width - 1 or y1 >= im.height - 1)))
    return out, len(merged)

# every set is padded to ONE canvas so a constant runtime scale keeps the growth between frames and the anchor stays put
ALIGN = {'prison_form': 'bottom', 'spear': 'bottom', 'spear_impact': 'bottom', 'wing_side': 'right', 'orb_trail': 'right', 'wisps': 'bottom', 'flight_wings': 'top', 'head_side': 'left', 'tail': 'right', 'head_front': 'bottom', 'head_back': 'bottom'}
def pad_common(parts, align):
    W = max(i.width for i, _ in parts); H = max(i.height for i, _ in parts); out = []
    for img, cropped in parts:
        c = Image.new('RGB', (W, H), (0, 0, 0))
        x = (W - img.width) // 2 if align in ('center', 'bottom', 'top') else (W - img.width if align == 'right' else 0)
        y = (H - img.height) // 2 if align in ('center', 'left', 'right') else (H - img.height if align == 'bottom' else 0)
        c.paste(img, (x, y)); out.append((c, cropped))
    return out

manifest = {}
for name, (stem, n, dil, anchor) in CHOICE.items():
    if not os.path.exists(os.path.join(SRC, stem + '.png')): print('missing', stem); continue
    parts, found = cut_grid(stem, n) if name in GRID else cut(stem, n, dil)
    parts = pad_common(parts, ALIGN.get(name, 'center'))
    if found != n: print('WARN', name, 'found', found, 'of', n)
    sizes = []
    for i, (img, cropped) in enumerate(parts):
        img.quantize(160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(os.path.join(OUT, f'{name}{i}.png'), optimize=True); sizes.append(list(img.size))
        if cropped: print('CROPPED', name, i)
    manifest[name] = {'frames': len(parts), 'sizes': sizes, 'blend': 'add', 'anchor': anchor, 'source': stem + '.png'}
# skill icons: one sheet of six tiles, rows of three; alpha from the tile shape (luma-keyed), 96px
icons = ['prison', 'spear', 'collapse', 'devastation', 'overdrive', 'blades']
im = Image.open(os.path.join(SRC, 'icons.png')).convert('RGB'); a = np.asarray(im).astype(np.float32); luma = a.max(axis=2)
lab, k = ndi.label(ndi.binary_dilation(luma > 18, iterations=3)); sizes = ndi.sum(lab > 0, lab, range(1, k + 1)); big = [i + 1 for i in np.argsort(sizes)[::-1][:6]]
cen = {l: ndi.center_of_mass(lab == l) for l in big}; rows = sorted(big, key=lambda l: cen[l][0]); order = sorted(rows[:3], key=lambda l: cen[l][1]) + sorted(rows[3:], key=lambda l: cen[l][1])
iconout = os.path.join(ROOT, 'public', 'ui', 'icons'); os.makedirs(iconout, exist_ok=True)
for nm, l in zip(icons, order):
    ys, xs = np.where(lab == l); c = Image.fromarray(np.asarray(im)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]).resize((96, 96), Image.NEAREST)
    arr = np.asarray(c).astype(np.float32); alpha = np.clip(arr.max(axis=2) * 6, 0, 255).astype(np.uint8)
    Image.fromarray(np.dstack([arr.astype(np.uint8), alpha]), 'RGBA').save(os.path.join(iconout, f'sora_cf_{nm}.png'))
manifest['_icons'] = {'dir': 'public/ui/icons', 'files': [f'sora_cf_{n}.png' for n in icons], 'size': [96, 96]}
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print('done', len(manifest))

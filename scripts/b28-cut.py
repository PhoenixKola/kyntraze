"""B28: cuts the Abyssal Guardian / Vex FX ImageGen sheets (art/fx-b28/<name>.png, N sprites on pure black) into public/art/fx/vex-guardian/<name><i>.png (RGB on black, drawn with ADD blend; icons get alpha-from-luma + rounded tile alpha) and writes manifest.json.
Method (same as b25-cut): connected components of (luma > 40) after dilation, the N largest kept and ordered left->right (top->bottom for icons), each sprite keeps only its OWN component's pixels (no neighbour bleed), trimmed to bbox + 3 px. A cell whose bbox touches the sheet edge is reported as CROPPED. Alternatives: pass the preferred source via CHOICE below."""
import os, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'fx-b28'); OUT = os.path.join(ROOT, 'public', 'art', 'fx', 'vex-guardian'); os.makedirs(OUT, exist_ok=True)
# runtime name -> (source sheet stem, sprite count, dilation, anchor hint)
CHOICE = {
 'g1_head': ('g1_head', 4, 6, ''),
 'g2_head': ('g2_head', 4, 6, ''),
 'g1_front': ('g1_front', 4, 6, ''),
 'g2_front': ('g2_front', 4, 6, ''),
 'g1_back': ('g1_back', 4, 6, ''),
 'g2_back': ('g2_back', 4, 6, ''),
 'g1_torso': ('g1_torso', 4, 6, ''),
 'g2_torso': ('g2_torso', 4, 6, ''),
 'g1_arm': ('g1_arm', 4, 6, ''),
 'g2_arm': ('g2_arm', 4, 6, ''),
 'g1_plates': ('g1_plates', 4, 6, ''),
 'g2_plates': ('g2_plates', 4, 6, ''),
 'g1_activation': ('g1_activation', 4, 6, ''),
 'g2_activation': ('g2_activation', 4, 6, ''),
 'g1_dissolve': ('g1_dissolve', 4, 6, ''),
 'g2_dissolve': ('g2_dissolve', 4, 6, ''),
 'r_slash': ('r_slash', 4, 6, ''),
 'r_mirror': ('r_mirror', 4, 6, ''),
 'r_echo': ('r_echo', 4, 6, ''),
 'r_portal': ('r_portal', 4, 6, ''),
 'r_crack': ('r_crack', 4, 6, ''),
 'r_seal': ('r_seal', 4, 6, ''),
 'r_pillar': ('r_pillar', 4, 6, ''),
 'r_fang': ('r_fang', 4, 6, ''),
 'r_fangcut': ('r_fangcut', 4, 6, ''),
 'r_impact': ('r_impact', 4, 6, ''),
 'v_cut': ('v_cut', 4, 6, ''),
 'v_clone': ('v_clone', 4, 6, ''),
 'v_seam': ('v_seam', 4, 6, ''),
 'v_shard': ('v_shard', 4, 6, ''),
 'v_ring': ('v_ring', 4, 6, ''),
 'v_blade': ('v_blade', 4, 6, ''),
 'v_core': ('v_core', 4, 6, ''),
 'v_implode': ('v_implode', 4, 6, ''),
 'v_erupt': ('v_erupt', 4, 6, ''),
 'v_reveal_crack': ('v_reveal_crack', 4, 6, ''),
 'v_reveal_halo': ('v_reveal_halo', 4, 6, ''),
 'v_reveal_flash': ('v_reveal_flash', 4, 6, ''),
 'v_reveal_hair': ('v_reveal_hair', 4, 6, ''),
 'r_ground': ('r_ground', 4, 6, ''),
 'v_ground': ('v_ground', 4, 6, ''),
 'r_wisp': ('r_wisp', 4, 6, ''),
 'v_wisp': ('v_wisp', 4, 6, ''),
 'v_frag': ('v_frag', 4, 6, ''),
 'r_fly': ('r_fly', 4, 6, ''),
 'v_fly': ('v_fly', 4, 6, ''),
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
GRID = {'g1_dissolve', 'g2_dissolve', 'v_shard', 'v_frag', 'v_erupt', 'r_impact', 'v_implode', 'v_reveal_flash', 'r_crack', 'v_reveal_crack', 'v_reveal_halo'}
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
ALIGN = {'g1_head': 'left', 'g2_head': 'left', 'g1_torso': 'bottom', 'g2_torso': 'bottom', 'g1_front': 'bottom', 'g2_front': 'bottom', 'g1_back': 'bottom', 'g2_back': 'bottom', 'g1_arm': 'left', 'g2_arm': 'left', 'v_seam': 'left', 'r_fang': 'left', 'r_fangcut': 'left', 'r_pillar': 'bottom', 'v_blade': 'bottom', 'v_wisp': 'bottom', 'r_wisp': 'bottom', 'r_fly': 'right', 'v_fly': 'right', 'v_reveal_hair': 'bottom'}
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
# skill icons: two sheets of six tiles (one per form), rows of three; alpha from the tile shape (luma-keyed), 96px
ICONS = {'icons_r': ['mirror', 'execution', 'oath', 'fang', '1_guard', 'auto1'], 'icons_v': ['legion', 'sever', 'domain', 'horizon', '2_guard', 'judgment']}
iconout = os.path.join(ROOT, 'public', 'ui', 'icons'); os.makedirs(iconout, exist_ok=True); files = []
for stem, icons in ICONS.items():
    if not os.path.exists(os.path.join(SRC, stem + '.png')): print('missing', stem); continue
    im = Image.open(os.path.join(SRC, stem + '.png')).convert('RGB'); a = np.asarray(im).astype(np.float32); luma = a.max(axis=2)
    lab, k = ndi.label(ndi.binary_dilation(luma > 18, iterations=3)); sizes = ndi.sum(lab > 0, lab, range(1, k + 1)); big = [i + 1 for i in np.argsort(sizes)[::-1][:6]]
    cen = {l: ndi.center_of_mass(lab == l) for l in big}; rows = sorted(big, key=lambda l: cen[l][0]); order = sorted(rows[:3], key=lambda l: cen[l][1]) + sorted(rows[3:], key=lambda l: cen[l][1])
    for nm, l in zip(icons, order):
        ys, xs = np.where(lab == l); c = Image.fromarray(np.asarray(im)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]).resize((96, 96), Image.NEAREST)
        arr = np.asarray(c).astype(np.float32); alpha = np.clip(arr.max(axis=2) * 6, 0, 255).astype(np.uint8)
        Image.fromarray(np.dstack([arr.astype(np.uint8), alpha]), 'RGBA').save(os.path.join(iconout, f'vex_cf_{nm}.png')); files.append(f'vex_cf_{nm}.png')
manifest['_icons'] = {'dir': 'public/ui/icons', 'files': files, 'size': [96, 96]}
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print('done', len(manifest))

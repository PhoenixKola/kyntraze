"""B20: find (and with --fix, fill) tiny enclosed transparent holes in hero sprite sheets. A hole = transparent region not connected to the frame border, area <= MAXA px.
Usage: python scripts/b20-pinholes.py [--fix] <hero-dir-prefix ...>   e.g. ren ren-f1 sora sora-f1 kai"""
import sys, os, json, glob, numpy as np
from PIL import Image
from scipy import ndimage as ndi
fix = '--fix' in sys.argv; heroes = [a for a in sys.argv[1:] if not a.startswith('--')]; MAXA = int(os.environ.get('MAXA', 40)); MINA = int(os.environ.get('MINA', 2))
tot = {}
for h in heroes:
    for mf in sorted(glob.glob(f'public/art/{h}/*/manifest.json')):
        d = os.path.dirname(mf); m = json.load(open(mf)); fw, fh = m['frame_width'], m['frame_height']
        for clip, v in m['animations'].items():
            path = os.path.join(d, v['sheet']); im = Image.open(path).convert('RGBA'); a = np.array(im); changed = False; fw = im.width // v['frames']
            for f in range(v['frames']):
                fr = a[:, f * fw:(f + 1) * fw]; solid = fr[..., 3] > 8
                lab, n = ndi.label(~solid)
                border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
                for i in range(1, n + 1):
                    if i in border: continue
                    reg = lab == i; area = int(reg.sum())
                    if area > MAXA or area < MINA: continue
                    ring0 = ndi.binary_dilation(reg, iterations=1) & ~reg
                    if ring0.sum() == 0 or (fr[..., 3][ring0] > 200).mean() < 0.9: continue   # only pockets fully walled in by opaque pixels
                    key = (h, os.path.basename(os.path.dirname(d)) if False else os.path.basename(d), clip); tot.setdefault(key, []).append((f, area))
                    if fix:
                        ring = ndi.binary_dilation(reg, iterations=2) & solid
                        if ring.any():
                            col = fr[ring][:, :3].astype(float).mean(axis=0); fr[reg, :3] = col.astype(np.uint8); fr[reg, 3] = 255; changed = True
            if fix and changed: Image.fromarray(a, 'RGBA').save(path)
for k, v in tot.items(): print(k, len(v), 'holes', v[:6])
print('TOTAL holes:', sum(len(v) for v in tot.values()), 'in', len(tot), 'clips')

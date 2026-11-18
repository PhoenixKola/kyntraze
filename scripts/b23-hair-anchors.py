"""B23 hair rig data: finds the head (face centre + face radius) in EVERY frame of every hero sheet so the runtime can deform only the hair tips (roots stay pinned inside the face radius).
Reads public/art/<root>/<dir>/manifest.json + sheets, writes public/art/hair-anchors.json:  { "<textureKey>": { "fw": n, "fh": n, "a": [cx, cy, r, ...per frame] } }  (r = 0 -> no reliable head, the runtime leaves that frame untouched).
Texture keys follow the runtime naming (kai-south-Idle, kaif1-..., renf1-..., vexf2-...). Usage: python scripts/b23-hair-anchors.py [--debug OUTDIR]"""
import json, os, sys
import numpy as np
from PIL import Image

ART = os.path.join(os.path.dirname(__file__), '..', 'public', 'art')
APPEARANCES = [('kai', 'kai'), ('kai-f1', 'kaif1'), ('kai-f2', 'kaif2'), ('kai-f3', 'kaif3'), ('ren', 'ren'), ('ren-f1', 'renf1'), ('sora', 'sora'), ('sora-f1', 'soraf1'), ('vex', 'vex'), ('vex-f1', 'vexf1'), ('vex-f2', 'vexf2')]
DIRS = ['south', 'north', 'east', 'west']
SKIP = {'Death', 'Transform'}   # hair is left pinned in these clips (collapse / cinematic: no reliable head)

def skin_mask(a):
    r, g, b, al = [a[..., k].astype(float) / 255 for k in range(4)]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = d / (mx + 1e-6)
    return (al > 0.5) & (h > 12) & (h < 42) & (s > 0.26) & (s < 0.78) & (mx > 0.38) & (mx < 0.97)

def detect(a, dirn):
    al = a[..., 3] > 128
    rows = np.where(al.any(1))[0]
    if len(rows) < 30: return None
    top, bot = rows[0], rows[-1]; fig = bot - top
    band = np.zeros_like(al); band[top:top + int(fig * 0.40)] = True
    if dirn == 'north':   # the back of the head: no face. Use the silhouette of the top band.
        ys = np.arange(a.shape[0])[:, None]; m = al & band
        yy, xx = np.nonzero(m & (ys < top + fig * 0.32))
        if len(yy) < 80: return None
        cx = float(np.median(xx)); cy = float(top + fig * 0.17); return cx, cy, fig * 0.115
    sk = skin_mask(a) & band
    yy, xx = np.nonzero(sk)
    if len(yy) < 30: return None
    cx, cy = float(np.median(xx)), float(np.median(yy))
    # drop fists / forearms: keep the skin blob closest to the head centre of mass, then re-centre
    d = np.hypot(xx - cx, yy - cy); keep = d <= max(14.0, np.percentile(d, 80)); yy, xx = yy[keep], xx[keep]
    cx, cy = float(np.median(xx)), float(np.median(yy)); r = float(np.percentile(np.hypot(xx - cx, yy - cy), 90))
    return cx, cy, max(fig * 0.07, min(r, fig * 0.16))

def smooth(vals):
    out = list(vals)
    for i, v in enumerate(vals):
        if v is None: continue
        nb = [vals[j] for j in range(max(0, i - 2), min(len(vals), i + 3)) if vals[j] is not None]
        if len(nb) < 2: continue
        mcx, mcy = np.median([n[0] for n in nb]), np.median([n[1] for n in nb])
        if abs(v[0] - mcx) > 14 or abs(v[1] - mcy) > 14: out[i] = (float(mcx), float(mcy), float(np.median([n[2] for n in nb])))
    return out

def main():
    table, dbg = {}, (sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None)
    for root, prefix in APPEARANCES:
        for d in DIRS:
            mp = os.path.join(ART, root, d, 'manifest.json')
            if not os.path.exists(mp): continue
            m = json.load(open(mp, encoding='utf8'))
            for clip, info in m['animations'].items():
                if clip in SKIP: continue
                fw = info.get('frame_width') or m['frame_width']; fh = info.get('frame_height') or m['frame_height']; n = info['frames']
                sheet = Image.open(os.path.join(ART, root, d, info['sheet'])).convert('RGBA'); arr = np.array(sheet)
                found = [detect(arr[:fh, i * fw:(i + 1) * fw], d) for i in range(n)]
                found = smooth(found)
                flat = []
                for f in found: flat += [0, 0, 0] if f is None else [round(f[0], 1), round(f[1], 1), round(f[2], 1)]
                table[f'{prefix}-{d}-{clip}'] = {'fw': fw, 'fh': fh, 'a': flat}
                if dbg and clip in ('Idle', 'Run', 'BasicPunch'):
                    os.makedirs(dbg, exist_ok=True)
                    tiles = []
                    for i in range(0, n, max(1, n // 4)):
                        t = arr[:fh, i * fw:(i + 1) * fw].copy(); f = found[i]
                        if f:
                            cx, cy, r = int(f[0]), int(f[1]), int(f[2])
                            for a_ in np.linspace(0, 6.283, 90):
                                x, y = int(cx + r * np.cos(a_)), int(cy + r * np.sin(a_))
                                if 0 <= x < fw and 0 <= y < fh: t[y, x] = [255, 0, 255, 255]
                            t[max(0, cy - 1):cy + 2, max(0, cx - 1):cx + 2] = [0, 255, 0, 255]
                        tiles.append(Image.fromarray(t).crop((0, 0, fw, int(fh * 0.55))))
                    W = sum(t.width for t in tiles); sh = Image.new('RGBA', (W, tiles[0].height), (60, 70, 90, 255)); x = 0
                    for t in tiles: sh.alpha_composite(t, (x, 0)); x += t.width
                    sh = sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST); sh.save(os.path.join(dbg, f'{prefix}-{d}-{clip}.png'))
    with open(os.path.join(ART, 'hair-anchors.json'), 'w') as f: json.dump(table, f, separators=(',', ':'))
    ok = sum(1 for v in table.values() for i in range(0, len(v['a']), 3) if v['a'][i + 2] > 0); tot = sum(len(v['a']) // 3 for v in table.values())
    print(f'{len(table)} clips, {ok}/{tot} frames with a head ({100 * ok / tot:.1f}%) -> public/art/hair-anchors.json ({os.path.getsize(os.path.join(ART, "hair-anchors.json")) // 1024} KB)')
main()

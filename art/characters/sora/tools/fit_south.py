"""Fit Sora's ImageGen parts into Kai's SOUTH part canvases (same canvas size, same alpha bbox -> every Kai pivot stays valid), palette-quantised.
usage: python fit_south.py base|f1   -> writes south/parts/*.png"""
import sys, os, glob, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__)); from seg import blobs
HERE = os.path.dirname(os.path.abspath(__file__)); SORA = os.path.dirname(HERE)
KAI = os.path.join(os.path.dirname(os.path.dirname(SORA)), 'characters', 'kai', 'base', 'production-south-candidate', 'parts')
form = sys.argv[1] if len(sys.argv) > 1 else 'base'
OUT = os.path.join(SORA, 'south', 'parts' if form == 'base' else 'parts-f1'); os.makedirs(OUT, exist_ok=True)
sheet = os.path.join(SORA, 'concept', f'parts-{"base" if form=="base" else "sov"}-south.png')
B = blobs(sheet)
def kai(name): return Image.open(os.path.join(KAI, name)).convert('RGBA')
def bbox(im):
    a = np.array(im)[:, :, 3] > 0; ys, xs = np.nonzero(a); return xs.min(), ys.min(), xs.max()+1, ys.max()+1
# palette from the pixel-art direction sheet
def palette(n=28):
    ims = [Image.open(os.path.join(SORA, 'concept', f)).convert('RGB') for f in (['base-pix.png'] if form == 'base' else ['base-pix.png', 'sov-pix.png'])]
    px = np.concatenate([np.array(i).reshape(-1, 3) for i in ims]); keep = ~((abs(px[:,0]-255) < 75) & (px[:,1] < 110) & (abs(px[:,2]-255) < 75)); px = px[keep]
    q = (px // 8) * 8; u, c = np.unique(q, axis=0, return_counts=True); u = u[np.argsort(-c)][:4000].astype(float); c = np.sort(c)[::-1][:4000].astype(float)
    rng = np.random.default_rng(1); cen = u[rng.choice(len(u), n, replace=False, p=c/c.sum())]
    for _ in range(25):
        d = ((u[:, None] - cen[None]) ** 2).sum(2); l = d.argmin(1)
        for k in range(n):
            m = l == k
            if m.any(): cen[k] = (u[m] * c[m, None]).sum(0) / c[m].sum()
    return cen.astype(int)
PAL = palette()
def quant(im):
    a = np.array(im); rgb = a[..., :3].astype(int); d = ((rgb[:, :, None] - PAL[None, None]) ** 2).sum(3); a[..., :3] = PAL[d.argmin(2)]; a[..., 3] = np.where(a[..., 3] > 110, 255, 0); return Image.fromarray(a.astype('uint8'), 'RGBA')
def drop_skin_nubs(im, rows=None):
    a = np.array(im); r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    skin = (r > 190) & (g > 120) & (g < 200) & (b > 70) & (b < 160) & (r - b > 60)
    if rows is not None: skin[:rows[0]] = skin[:rows[0]] & True; m = np.zeros_like(skin); m[rows[0]:rows[1]] = True; skin &= m
    a[skin, 3] = 0; return Image.fromarray(a, 'RGBA')
def autocrop_nubs(im, top=True, bottom=True, frac=0.32):
    a = np.array(im); r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    skin = (r > 190) & (g > 120) & (g < 200) & (b > 70) & (b < 160) & (r - b > 60) & (a[..., 3] > 0); rows = skin.any(1); H = len(rows); y0, y1 = 0, H
    if top:
        idx = np.nonzero(rows[:int(H*frac)])[0]
        if len(idx): y0 = idx.max() + 4
    if bottom:
        idx = np.nonzero(rows[int(H*(1-frac)):])[0]
        if len(idx): y1 = int(H*(1-frac)) + idx.min() - 3
    return im.crop((0, y0, im.size[0], y1))
def fit(src, kname, crop=None):
    k = kai(kname); x0, y0, x1, y1 = bbox(k); w, h = x1-x0, y1-y0
    s = src if crop is None else src.crop(crop)
    bb = s.getbbox(); s = s.crop(bb)
    big = s.resize((w*4, h*4), Image.BOX); small = big.resize((w, h), Image.BOX)
    out = Image.new('RGBA', k.size, (0, 0, 0, 0)); out.alpha_composite(small, (x0, y0)); out = quant(out); out.save(os.path.join(OUT, kname)); return out
im = lambda i: B[i]['img']
head, torso, hips = im(0), im(2), im(3)
uarm, farm, hand, fist = im(4), im(5), im(6), im(7)
thigh, shin, boot, tails = im(8), im(9), im(12), im(10)
uarm = autocrop_nubs(uarm); thigh = autocrop_nubs(thigh); shin = autocrop_nubs(shin); boot = autocrop_nubs(boot, bottom=False)
fh = farm.size[1]; forearm = autocrop_nubs(farm.crop((0, 0, farm.size[0], int(fh*0.38))), bottom=False)
hand = autocrop_nubs(hand, bottom=False); fist = autocrop_nubs(fist, bottom=False)
glove = drop_skin_nubs(farm.crop((0, int(fh*0.46), farm.size[0], fh)))
tw, th = torso.size; torso_c = torso.crop((0, 0, tw, int(th*0.76)))
fit(head, 'head.png'); fit(torso_c, 'torso.png'); fit(hips, 'hips.png')
for s in 'fn': fit(uarm, f'upper_arm_{s}.png'); fit(forearm, f'forearm_{s}.png'); fit(thigh, f'thigh_{s}.png'); fit(shin, f'shin_{s}.png'); fit(boot, f'boot_{s}.png')
fit(hand, 'fist_guard.png'); fit(hand, 'fist_front.png'); fit(hand, 'fist_front_angle.png'); fit(fist, 'fist_waist.png')
hw, hh = hips.size; fit(hips.crop((0, 0, hw, int(hh*0.22))), 'sash_band.png')
tw2, th2 = tails.size; fit(tails.crop((int(tw2*0.5), 0, tw2, th2)), 'sash_tails.png')
# neck + linings: Kai's pieces recoloured to Sora's skin / dark navy
skin = np.array(head)[np.array(head)[..., 3] > 0]; sk = np.array([[222, 160, 110]]) ; 
for n in ('neck.png', 'lining_c.png', 'lining_f.png', 'lining_n.png', 'lining_w.png'):
    k = np.array(kai(n)); op = k[..., 3] > 0
    if n == 'neck.png': tone = PAL[((PAL - np.array([226, 168, 120])) ** 2).sum(1).argmin()]; k[op, :3] = tone
    else:
        dark = PAL[PAL.sum(1).argsort()[1]]; k[op, :3] = dark
    Image.fromarray(k).save(os.path.join(OUT, n))
print('palette', len(PAL), 'wrote', len(os.listdir(OUT)))

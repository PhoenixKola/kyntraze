"""Sora Eventide Seraph ('f2') parts: ImageGen head / rear-hair sheets -> head_f1 / hair_f1 (the rig's part names, Seraph palette) + the celestial costume recolor of every body part, into south-f2/parts and dirs-f2/<d>/parts.
  python prepare_f2.py [south north east west]
Deterministic: pixel positions hash, no RNG, no painted pixels. Body parts keep their grid and pivots, so the rig and fit data stay valid."""
import colorsys, json, os, shutil, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SORA = os.path.dirname(HERE); sys.path.insert(0, HERE)
from seg import blobs
SRC = os.path.join(SORA, 'f2', 'source'); KF = os.path.join(SORA, '..', 'kai', 'form-i')
tree = lambda d: os.path.join(SORA, 'south-f2' if d == 'south' else os.path.join('dirs-f2', d), 'parts')
f1tree = lambda d: os.path.join(SORA, 'south-f1' if d == 'south' else os.path.join('dirs-f1', d), 'parts')
DUSK = np.array([[24, 16, 40], [48, 30, 76], [82, 54, 120], [124, 88, 160]], np.float32)           # dusk-violet cloth, dark -> light
PEARL = np.array([[120, 100, 130], [196, 170, 190], [244, 226, 226], [255, 248, 236]], np.float32)   # pearl / champagne trim
ROSE = np.array([255, 190, 170], np.float32); PRISM = [np.array(c, np.float32) for c in ((150, 235, 235), (255, 170, 215), (255, 235, 160))]
ramp = lambda r, v, lo=0.1, hi=0.95: (lambda t: (lambda i, f: r[i] * (1 - f) + r[i + 1] * f)(np.floor(t).astype(int).clip(0, len(r) - 2), (t - np.floor(t))[..., None]))(np.clip((v - lo) / (hi - lo), 0, 1) * (len(r) - 1))


def seraph_costume(path, name):
    """navy coat -> dusk violet, white trim -> pearl with sparse prism pixels, blue glow lines -> rose-gold light, hems and sash tails cut into pointed feather teeth"""
    im = np.array(Image.open(path).convert('RGBA')).astype(np.float32); H, W = im.shape[:2]; rgb = im[..., :3] / 255; out = im.copy(); alpha = im[..., 3] > 0
    if not alpha.any(): return
    for y in range(H):
        for x in range(W):
            if not alpha[y, x]: continue
            h, s, v = colorsys.rgb_to_hsv(*rgb[y, x]); blue = 0.5 < h < 0.7 and s > 0.35 and v > 0.55; navy = 0.58 < h < 0.78 and s > 0.2 and v <= 0.55; white = s < 0.22 and v > 0.7; skin = 0.02 < h < 0.12 and 0.2 < s < 0.7 and v > 0.5
            n = (x * 73856093 ^ y * 19349663) % 61
            if blue: out[y, x, :3] = np.round(ROSE * (0.7 + 0.3 * v))
            elif white: out[y, x, :3] = np.round(PRISM[(n // 20) % 3] if n < 3 else ramp(PEARL, np.array(v), 0.5, 1.0))
            elif navy or (v < 0.45 and not skin): out[y, x, :3] = np.round(ramp(DUSK, np.array(v), 0.05, 0.5))
    if name.startswith(('sash_tails', 'lining', 'hips')):   # feather teeth: alternating pointed notches on the lower edge, tips left pearl
        for x in range(W):
            col = np.nonzero(alpha[:, x])[0]
            if not len(col): continue
            n = (x * 2654435761) % 7
            if n in (0, 1, 3): out[max(col.max() - int(2 + n), 0): col.max() + 1, x, 3] = 0
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA').save(path)


def palette(n=44):
    px = np.concatenate([np.array(Image.open(os.path.join(SRC, f'{d}-heads.png')).convert('RGB')).reshape(-1, 3) for d in ('south', 'north', 'east', 'west')] + [np.array(Image.open(os.path.join(SORA, 'concept', 'base-pix.png')).convert('RGB')).reshape(-1, 3)])
    px = px[~((abs(px[:, 0] - 255) < 75) & (px[:, 1] < 110) & (abs(px[:, 2] - 255) < 75))]
    q = (px // 8) * 8; u, c = np.unique(q, axis=0, return_counts=True); o = np.argsort(-c)[:6000]; u = u[o].astype(float); c = c[o].astype(float)
    cen = u[np.random.default_rng(3).choice(len(u), n, replace=False, p=c / c.sum())]
    for _ in range(25):
        l = ((u[:, None] - cen[None]) ** 2).sum(2).argmin(1)
        for k in range(n):
            m = l == k
            if m.any(): cen[k] = (u[m] * c[m, None]).sum(0) / c[m].sum()
    return cen.astype(int)


def quant(im, PAL):
    a = np.array(im); a[..., :3] = PAL[((a[..., :3].astype(int)[:, :, None] - PAL[None, None]) ** 2).sum(3).argmin(2)]; a[..., 3] = np.where(a[..., 3] > 110, 255, 0); return Image.fromarray(a.astype('uint8'), 'RGBA')


def bbox(path):
    a = np.array(Image.open(path).convert('RGBA'))[..., 3] > 0; ys, xs = np.nonzero(a); return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def fit_piece(src, k, pal, hmul, wmax):
    """uniform scale to the Kai piece's height x hmul (width capped at wmax x Kai's width), pixel-grid quantised at the rig's native scale, on a canvas padded by the growth"""
    x0, y0, x1, y1 = k; kw, kh = x1 - x0, y1 - y0; src = src.crop(src.getbbox()); s = min(kh * hmul / src.height, kw * wmax / src.width); w, h = max(1, round(src.width * s)), max(1, round(src.height * s))
    small = src.resize((w * 4, h * 4), Image.BOX).resize((w, h), Image.BOX); pad = 2; out = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0)); out.alpha_composite(small, (pad, pad)); return quant(out, pal)


def prepare(d, pal):
    dst = tree(d); os.makedirs(dst, exist_ok=True)
    for f in os.listdir(f1tree(d)):
        if f.endswith(('.png', '.json')): shutil.copyfile(os.path.join(f1tree(d), f), os.path.join(dst, f))
    for f in os.listdir(dst):
        if f.endswith('.png') and not f.startswith(('head', 'hair')): seraph_costume(os.path.join(dst, f), f)
    B = sorted(sorted(blobs(os.path.join(SRC, f'{d}-heads.png'), minpx=600), key=lambda b: -b['w'] * b['h'])[:2], key=lambda b: b['x']); assert len(B) == 2, (d, len(B))
    for b, name, hm, wm in zip(B, ('head_f1', 'hair_f1'), (1.1, 1.35), (1.18, 1.55)):
        out = fit_piece(b['img'], bbox(os.path.join(KF, d, 'parts', name + '.png')), pal, hm, wm); out.save(os.path.join(dst, name + '.png')); print(d, name, out.size)
    def mask(f):
        a = np.array(Image.open(os.path.join(dst, f)).convert('RGBA'))[..., 3] > 0; ys, xs = np.nonzero(a); return a, int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
    a, t, B_, x0, x1 = mask('head_f1.png'); bot = float(np.nonzero(a[B_ - 4:B_])[1].mean() + 0.5)
    a2, t2, B2, x02, x12 = mask('hair_f1.png'); left = d in ('west', 'north'); ex = x02 + 6.0 if left else x12 - 6.0; col = a2[:, int(ex)]
    json.dump({'head_pivot': [bot, B_ - 7.0], 'attach': [x0 + 0.45 * (x1 - x0), t + 0.58 * (B_ - t)], 'hair_pivot': [ex, float(np.nonzero(col)[0].mean() + 0.5) if col.any() else (t2 + B2) / 2]}, open(os.path.join(dst, 'form_geometry.json'), 'w'))


if __name__ == '__main__':
    pal = palette()
    for d in (sys.argv[1:] or ['south', 'north', 'east', 'west']): prepare(d, pal)

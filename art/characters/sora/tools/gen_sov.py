"""Azure Sovereign head + rear hair per direction, at Kai Form I's size/pixel scale, then the f1 parts tree.
  python gen_sov.py <south|north|east|west> ref|gen|fit|all
ref: [Kai f1 head, Kai f1 rear hair, Sora base head] 4x on magenta -> concept/sov-heads-ref-<d>.png
gen: ImageGen -> concept/sov-heads-<d>.png (2 pieces)
fit: fit into Kai f1 canvases, palette-quantise (palette from sov-pix.png + base-pix.png), assemble <tree>/<d>/parts = Sora base parts + head_f1 + hair_f1 + form_geometry.json
tree: south -> sora/south-f1/parts ; others -> sora/dirs-f1/<d>/parts"""
import sys, os, json, shutil, subprocess
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SORA = os.path.dirname(HERE); sys.path.insert(0, HERE)
from seg import blobs
REPO = os.path.dirname(os.path.dirname(os.path.dirname(SORA)))
d = sys.argv[1]; step = sys.argv[2] if len(sys.argv) > 2 else 'all'
KF = os.path.join(SORA, '..', 'kai', 'form-i', d, 'parts')
BASE_PARTS = os.path.join(SORA, 'south', 'parts') if d == 'south' else os.path.join(SORA, 'dirs', d, 'parts')
OUT = os.path.join(SORA, 'south-f1', 'parts') if d == 'south' else os.path.join(SORA, 'dirs-f1', d, 'parts')
REF = os.path.join(SORA, 'concept', 'sov-heads-ref-%s.png' % d); GEN = os.path.join(SORA, 'concept', 'sov-heads-%s' % d)
S = 5


def make_ref():
    sheet = Image.new('RGB', (1672, 941), (255, 0, 255))
    for i, p in enumerate((os.path.join(KF, 'head_f1.png'), os.path.join(KF, 'hair_f1.png'), os.path.join(BASE_PARTS, 'head.png'))):
        im = Image.open(p).convert('RGBA'); im = im.crop(im.getbbox()); im = im.resize((im.width * S, im.height * S), Image.NEAREST)
        sheet.paste(im, (40 + i * 540 + (500 - im.width) // 2, 200 + (500 - im.height) // 2), im)
    sheet.save(REF)


VIEW = {'south': 'south (front three-quarter)', 'north': 'north (TRUE REAR: back of the head, no face)', 'east': 'east (right-facing profile)', 'west': 'west (left-facing profile)'}[d]


def prompt():
    return ("Pixel-art parts sheet for a 2D cutout game rig, %s view. Attached images: (1) a reference sheet, left to right: (A) the existing hero Kai's spiky-haired HEAD piece, (B) his separate REAR HAIR piece that sits behind the head, (C) the NEW character Sora's normal head in this view; all magnified 5x with nearest-neighbour on magenta (each art pixel a clear 5x5 block); (2) Sora's pixel-art direction sheets (normal form and awakened Azure Sovereign form).\n"
            "Draw exactly TWO pieces for Sora's AWAKENED form Azure Sovereign, in this order left to right: (1) HEAD: the same head as piece C (same face shape, ear, jaw, skin tone, neck stub, outline weight, pixel-block size) but with brilliant electric-blue sharply spiked upward-swept hair (about 7 large clean tapering spikes, bright cyan-white highlight clusters on the leading edges, deep-blue shading, thin dark outline) and intense glowing blue-white eyes with a bright iris glint (calm and focused, not angry); size and proportions as piece A (within 10%%). Original design, not any existing franchise's hairstyle. Every spike thick at the root and fully connected to the scalp mass (no floating islands, no thin strands, finest tips 2-3 art pixels wide). (2) REAR HAIR: the separate hair piece behind the head: a swept cluster of 5 long blue spikes growing from a dark-blue hair mass, size and proportions as piece B (within 10%%). View: %s - same orientation as the reference pieces. Big chunky pixel blocks like the reference, NO finer detail, no anti-aliasing, no gradients. Flat solid magenta #ff00ff background, the two pieces far apart, nothing overlapping or cropped, no labels, no text." % (VIEW, VIEW))


def gen():
    open(GEN + '-prompt.txt', 'w').write(prompt())
    env = dict(os.environ); env.setdefault('CODEX_BIN', r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe')
    r = subprocess.run([sys.executable, os.path.join(REPO, 'scripts', 'gen-image.py'), os.path.join(SORA, 'concept'), 'sov-heads-%s' % d, '--img', REF, '--img', os.path.join(SORA, 'concept', 'sov-pix.png')], env=env, capture_output=True, text=True)
    print(r.stdout[-160:], r.stderr[-160:])


def palette(n=40):
    px = np.concatenate([np.array(Image.open(os.path.join(SORA, 'concept', f)).convert('RGB')).reshape(-1, 3) for f in ('base-pix.png', 'sov-pix.png')])
    px = px[~((abs(px[:, 0] - 255) < 75) & (px[:, 1] < 110) & (abs(px[:, 2] - 255) < 75))]
    q = (px // 8) * 8; u, c = np.unique(q, axis=0, return_counts=True); o = np.argsort(-c)[:5000]; u = u[o].astype(float); c = c[o].astype(float)
    rng = np.random.default_rng(2); cen = u[rng.choice(len(u), n, replace=False, p=c / c.sum())]
    for _ in range(25):
        l = ((u[:, None] - cen[None]) ** 2).sum(2).argmin(1)
        for k in range(n):
            m = l == k
            if m.any():
                cen[k] = (u[m] * c[m, None]).sum(0) / c[m].sum()
    return cen.astype(int)


def quant(im, PAL):
    a = np.array(im); a[..., :3] = PAL[((a[..., :3].astype(int)[:, :, None] - PAL[None, None]) ** 2).sum(3).argmin(2)]; a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
    return Image.fromarray(a.astype('uint8'), 'RGBA')


def fit():
    B = sorted(blobs(GEN + '.png', minpx=600), key=lambda b: b['x'])
    print('blobs', len(B)); assert len(B) >= 2, 'need 2 pieces'
    B = sorted(sorted(B, key=lambda b: -b['w'] * b['h'])[:2], key=lambda b: b['x'])
    PAL = palette(); os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(BASE_PARTS):
        if f.endswith('.png'):
            shutil.copyfile(os.path.join(BASE_PARTS, f), os.path.join(OUT, f))
    for b, n in zip(B, ('head_f1.png', 'hair_f1.png')):
        k = Image.open(os.path.join(KF, n)).convert('RGBA'); ys, xs = np.nonzero(np.array(k)[..., 3] > 0)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        src = b['img']; src = src.crop(src.getbbox()); w, h = x1 - x0, y1 - y0
        small = src.resize((w * 4, h * 4), Image.BOX).resize((w, h), Image.BOX); out = Image.new('RGBA', k.size, (0, 0, 0, 0)); out.alpha_composite(small, (x0, y0)); quant(out, PAL).save(os.path.join(OUT, n))

    def mask(f):
        a = np.array(Image.open(os.path.join(OUT, f)).convert('RGBA'))[..., 3] > 0; ys, xs = np.nonzero(a); return a, int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
    a, t, B_, x0, x1 = mask('head_f1.png'); bot = float(np.nonzero(a[B_ - 4:B_])[1].mean() + 0.5)
    a2, t2, B2, x02, x12 = mask('hair_f1.png'); left = d in ('west', 'north'); ex = x02 + 6.0 if left else x12 - 6.0; col = a2[:, int(ex)]
    json.dump({'head_pivot': [bot, B_ - 7.0], 'attach': [x0 + 0.45 * (x1 - x0), t + 0.58 * (B_ - t)], 'hair_pivot': [ex, float(np.nonzero(col)[0].mean() + 0.5) if col.any() else (t2 + B2) / 2]}, open(os.path.join(OUT, 'form_geometry.json'), 'w'))
    sheet = Image.new('RGBA', (900, 380), (255, 0, 255, 255)); x = 8
    for n in ('head.png', 'head_f1.png', 'hair_f1.png'):
        i = Image.open(os.path.join(OUT, n)).convert('RGBA'); i = i.resize((i.width * 5, i.height * 5), Image.NEAREST); sheet.alpha_composite(i, (x, 8)); x += i.width + 12
    sheet.convert('RGB').save(os.path.join(SORA, 'review', 'sov-heads-%s.png' % d)); print('wrote', OUT)


if step in ('ref', 'all'): make_ref()
if step in ('gen', 'all'): gen()
if step in ('fit', 'all'): fit()

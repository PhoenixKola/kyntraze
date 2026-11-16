"""Sora parts for one direction, authored AT KAI'S SCALE: python gen_parts.py <south|east|north|west> [ref|gen|fit|all]
ref: compose Kai's parts of that direction (4x nearest, magenta grid, fixed order) -> concept/kai-parts-ref-<d>.png
gen: ImageGen redraw of every piece as Sora (same layout/size/pixel blocks) -> concept/sora-parts-<d>.png
fit: slice, assign each blob to its Kai part by layout position, fit into Kai's canvas/bbox, palette-quantise -> south/parts or dirs/<d>/parts"""
import sys, os, subprocess
import numpy as np
from PIL import Image
from scipy.optimize import linear_sum_assignment
HERE = os.path.dirname(os.path.abspath(__file__)); SORA = os.path.dirname(HERE); sys.path.insert(0, HERE)
from seg import blobs
REPO = os.path.dirname(os.path.dirname(os.path.dirname(SORA)))
d = sys.argv[1]; step = sys.argv[2] if len(sys.argv) > 2 else 'all'
KB = os.path.join(SORA, '..', 'kai', 'base')
KAI = os.path.join(KB, 'production-south-candidate', 'parts') if d == 'south' else os.path.join(KB, 'production-other-directions-candidate', d, 'parts')
OUT = os.path.join(SORA, 'south', 'parts') if d == 'south' else os.path.join(SORA, 'dirs', d, 'parts')
SKIP = ('lining_', 'neck')
ORDER = ['head', 'torso', 'hips', 'upper_arm_f', 'upper_arm_n', 'forearm_f', 'forearm_n', 'fist_guard', 'fist_front', 'fist_front_angle', 'fist_side', 'fist_waist', 'thigh_f', 'thigh_n', 'shin_f', 'shin_n', 'boot_f', 'boot_n', 'sash_band', 'sash_tails']
names = sorted((f for f in os.listdir(KAI) if f.endswith('.png') and not f.startswith(SKIP)), key=lambda f: ORDER.index(f[:-4]) if f[:-4] in ORDER else 99)
COLS, CW, CH, S = 6, 275, 235, 4
REF = os.path.join(SORA, 'concept', 'kai-parts-ref-%s.png' % d); GEN = os.path.join(SORA, 'concept', 'sora-parts-%s' % d)


def cell(i):
    return (i % COLS) * CW + 12, (i // COLS) * CH + 12


def make_ref():
    sheet = Image.new('RGB', (1672, 941), (255, 0, 255))
    for i, n in enumerate(names):
        im = Image.open(os.path.join(KAI, n)).convert('RGBA'); im = im.crop(im.getbbox()); im = im.resize((im.width * S, im.height * S), Image.NEAREST)
        x, y = cell(i); sheet.paste(im, (x + (CW - 24 - im.width) // 2, y + (CH - 24 - im.height) // 2), im)
    sheet.save(REF)


VIEW = {'south': 'south (front three-quarter)',
        'north': 'north (TRUE REAR view: back of head and hair, back of the jacket, back of the hands and gloves, rear of the boots)',
        'east': 'east (right-facing profile)', 'west': 'west (left-facing profile)'}[d]


def prompt():
    lst = ', '.join('%d. %s' % (i + 1, n[:-4].replace('_', ' ')) for i, n in enumerate(names))
    return (
        "Pixel-art parts sheet for a 2D cutout (paper-doll) game rig. Attached images: (1) the existing hero Kai's rig parts for the %s view, magnified 4x with nearest-neighbour on magenta in a fixed grid (6 columns, row by row, %d pieces: %s); (2) the approved pixel-art direction sheet of the NEW character Sora (the same body size as Kai but slimmer).\n"
        "Redraw EVERY piece of sheet (1) as Sora's equivalent, in the SAME grid cell and order, at the SAME size, SAME proportions (each piece within 10%% of the reference piece's width and height), SAME pixel-block size (chunky 4x4 blocks, NO finer detail, no anti-aliasing, no gradients), thin dark outline, 3-4 tone cel shading, light from upper left, ends hidden exactly like the reference (limb pieces end with plain fabric or cuff edges - NO skin-coloured joint caps or round nubs). "
        "Sora: navy-black swept hair with a long side fringe; cropped navy jacket with white trim, white undershirt and a high white-lined collar with thin glowing blue accent lines; white gloves with a small blue crystal on the back of the hand; slim-baggy navy trousers with ONE straight white stripe down the outer side and a white cuff above the boots; sleek short navy-and-white boots with white toe caps; a belt band and a navy coat tail instead of Kai's sash. HANDS: open relaxed casting hands (fingers slightly spread) instead of Kai's bandaged fists. "
        "Each piece keeps the orientation and facing of the reference piece in that cell (%s). Flat solid magenta #ff00ff background, nothing overlapping, nothing cropped, no labels, no text, exactly %d pieces." % (VIEW, len(names), lst, VIEW, len(names)))


def gen():
    open(GEN + '-prompt.txt', 'w').write(prompt())
    env = dict(os.environ); env.setdefault('CODEX_BIN', r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe')
    r = subprocess.run([sys.executable, os.path.join(REPO, 'scripts', 'gen-image.py'), os.path.join(SORA, 'concept'), 'sora-parts-%s' % d, '--img', REF, '--img', os.path.join(SORA, 'concept', 'base-pix.png')], env=env, capture_output=True, text=True)
    print(r.stdout[-160:], r.stderr[-160:])


def palette(n=28):
    px = np.array(Image.open(os.path.join(SORA, 'concept', 'base-pix.png')).convert('RGB')).reshape(-1, 3)
    px = px[~((abs(px[:, 0] - 255) < 75) & (px[:, 1] < 110) & (abs(px[:, 2] - 255) < 75))]
    q = (px // 8) * 8; u, c = np.unique(q, axis=0, return_counts=True); o = np.argsort(-c)[:4000]; u = u[o].astype(float); c = c[o].astype(float)
    rng = np.random.default_rng(1); cen = u[rng.choice(len(u), n, replace=False, p=c / c.sum())]
    for _ in range(25):
        l = ((u[:, None] - cen[None]) ** 2).sum(2).argmin(1)
        for k in range(n):
            m = l == k
            if m.any():
                cen[k] = (u[m] * c[m, None]).sum(0) / c[m].sum()
    return cen.astype(int)


def quant(im, PAL):
    a = np.array(im)
    a[..., :3] = PAL[((a[..., :3].astype(int)[:, :, None] - PAL[None, None]) ** 2).sum(3).argmin(2)]
    a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
    return Image.fromarray(a.astype('uint8'), 'RGBA')


def fit():
    B = blobs(GEN + '.png', minpx=300); print('blobs', len(B), 'expected', len(names))
    W, H = Image.open(GEN + '.png').size
    cost = np.array([[np.hypot((b['x'] + b['w'] / 2) / W * 1672 - (cell(j)[0] + CW / 2 - 12), (b['y'] + b['h'] / 2) / H * 941 - (cell(j)[1] + CH / 2 - 12)) for j in range(len(names))] for b in B])
    ri, ci = linear_sum_assignment(cost); PAL = palette(); os.makedirs(OUT, exist_ok=True)
    for r_, c_ in zip(ri, ci):
        n = names[c_]; k = Image.open(os.path.join(KAI, n)).convert('RGBA'); ys, xs = np.nonzero(np.array(k)[..., 3] > 0)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        src = B[r_]['img']; src = src.crop(src.getbbox()); w, h = x1 - x0, y1 - y0
        small = src.resize((w * 4, h * 4), Image.BOX).resize((w, h), Image.BOX)
        out = Image.new('RGBA', k.size, (0, 0, 0, 0)); out.alpha_composite(small, (x0, y0)); quant(out, PAL).save(os.path.join(OUT, n))
    sk = PAL[((PAL - np.array([226, 168, 120])) ** 2).sum(1).argmin()]; dark = PAL[PAL.sum(1).argsort()[1]]
    for n in os.listdir(KAI):
        if n.endswith('.png') and n.startswith(SKIP):
            k = np.array(Image.open(os.path.join(KAI, n)).convert('RGBA')); op = k[..., 3] > 0; k[op, :3] = sk if n.startswith('neck') else dark; Image.fromarray(k).save(os.path.join(OUT, n))
    print('fitted', len(ri), 'to', OUT)
    fs = sorted(f for f in os.listdir(OUT) if f.endswith('.png')); sheet = Image.new('RGBA', (1500, 400), (255, 0, 255, 255)); x = y = 8; rh = 0
    for f in fs:
        i = Image.open(os.path.join(OUT, f)).convert('RGBA'); i = i.resize((i.width * 3, i.height * 3), Image.NEAREST)
        if x + i.width > 1490:
            x = 8; y += rh + 8; rh = 0
        sheet.alpha_composite(i, (x, y)); x += i.width + 8; rh = max(rh, i.height)
    sheet.convert('RGB').save(os.path.join(SORA, 'review', 'parts-%s-fitted.png' % d))


if step in ('ref', 'all'): make_ref()
if step in ('gen', 'all'): gen()
if step in ('fit', 'all'): fit()

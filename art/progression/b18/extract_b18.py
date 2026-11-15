"""B18: cut the ImageGen magenta-key icon sheets into transparent 128 px icons.  python art/progression/b18/extract_b18.py
Output: public/ui/meta/<name>.png (unlock / contract / crest / arena / feat medals + the Fracture Mark coin)."""
import os, numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
OUT = os.path.join(ROOT, 'public', 'ui', 'meta'); os.makedirs(OUT, exist_ok=True); MAXPX = 128
SHEETS = {
    'unlocks': (4, 2, ['boon_bulwark', 'boon_swift', 'boon_magnet', 'boon_spark', 'boon_scholar', 'tool_reroll', 'tool_banish', 'mark']),
    'crests': (3, 3, ['crest_ember', 'crest_warden', 'crest_silver', 'ct_overrun', 'ct_glass', 'ct_pressure', 'ct_nosw', 'arena_gloam', 'arena_ashen']),
    'feats1': (4, 2, ['ft_first_run', 'ft_warden', 'ft_win', 'ft_gloam', 'ft_ashen', 'ft_veteran', 'ft_flare', 'ft_comet']),
    'feats2': (3, 2, ['ft_apex', 'ft_specialist', 'ft_survivor', 'ft_level', 'ft_contract', 'ft_hunter']),
}
def key(im):
    a = np.asarray(im.convert('RGB')).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.clip(((np.minimum(r, b) - g) - 110) / 60, 0, 1); alpha = 1 - mag
    alpha = ndimage.binary_opening(alpha > 0.5, iterations=1) * np.clip(alpha, 0, 1)
    out = np.dstack([a, alpha * 255]); fringe = (alpha > 0) & (alpha < 1); out[fringe, 1] = np.maximum(out[fringe, 1], (out[fringe, 0] + out[fringe, 2]) / 2 * 0.8)
    return Image.fromarray(out.astype('uint8'), 'RGBA')
for sheet, (cols, rows, names) in SHEETS.items():
    p = os.path.join(HERE, sheet + '.png')
    if not os.path.exists(p): print('missing', p); continue
    im = Image.open(p).convert('RGB'); W, H = im.size
    for i, n in enumerate(names):
        c, r = i % cols, i // cols; k = key(im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows)))
        bb = k.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        if not bb: print('empty', n); continue
        k = k.crop(bb); s = MAXPX / max(k.size)
        k = k.resize((max(1, round(k.width * s)), max(1, round(k.height * s))), Image.LANCZOS)
        sq = Image.new('RGBA', (MAXPX, MAXPX), (0, 0, 0, 0)); sq.alpha_composite(k, ((MAXPX - k.width) // 2, (MAXPX - k.height) // 2)); sq.save(os.path.join(OUT, n + '.png')); print(sheet, n)

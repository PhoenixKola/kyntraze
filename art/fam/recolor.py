"""Per-form recolors of the Celestial Familiar art: python art/fam/process.py (natives -> art/fam/native) then python art/fam/recolor.py (-> public/art/fam/<id>_f<form>.webp and fx_<id>_f<form>_<kind>.webp).
A beast and its effects follow the colour of the form its hero is in. The native sheets are the form marked NATIVE; the others are hue-remapped (hue set to the target with a little of the original spread so gold highlights and shadows survive), desaturated for silver / gray."""
import os, shutil, numpy as np
from PIL import Image
NAT = 'art/fam/native'; OUT = 'public/art/fam'; os.makedirs(OUT, exist_ok=True)
# id -> native hue centre (deg), native form, {form: (target hue deg | None for gray, sat mul, val mul)}
SPEC = {
 'dragon': (35, 1, {0: (208, 1.0, 1.0), 2: (52, 0.95, 1.08), 3: (None, 0.14, 0.9)}),
 'fox': (22, 2, {0: (14, 1.9, 1.35), 1: (356, 2.2, 1.2)}),
 'phoenix': (300, 2, {0: (200, 1.5, 1.0), 1: (222, 1.7, 0.95)}),
 'guardian': (275, 1, {0: (245, 0.75, 1.1), 2: (None, 0.07, 1.15)}),
}
def recolor(im, centre, hue, sk, vk):
    a = np.array(im.convert('RGBA')); alpha = a[..., 3].copy(); hsv = np.array(Image.fromarray(a[..., :3]).convert('HSV')).astype(np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    if hue is None:
        s = s * sk; v = np.clip(v * vk, 0, 1)
    else:
        d = ((h - centre + 180) % 360) - 180; colourful = s > 0.07
        h = np.where(colourful, (hue + d * 0.35) % 360, h); s = np.clip(s * sk, 0, 1); v = np.clip(v * vk, 0, 1)
    out = np.stack([h * 255 / 360, s * 255, v * 255], -1).astype(np.uint8); rgb = np.array(Image.fromarray(out, 'HSV').convert('RGB')).astype(np.float32)
    if hue is None: rgb[..., 2] = np.clip(rgb[..., 2] * 1.07, 0, 255); rgb[..., 0] *= 0.96
    r = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha]); return Image.fromarray(r, 'RGBA')
for fid, (centre, nat, forms) in SPEC.items():
    srcs = {'': f'{NAT}/{fid}.webp', **{f'fx_{fid}_{k}': f'{NAT}/fx_{fid}_{k}.webp' for k in ('shot', 'burst', 'sigil')}}
    for tag, p in srcs.items():
        if not os.path.exists(p): continue
        im = Image.open(p)
        dest = lambda f: f'{OUT}/{fid}_f{f}.webp' if tag == '' else f'{OUT}/fx_{fid}_f{f}_{tag.split("_")[-1]}.webp'
        shutil.copyfile(p, dest(nat))
        for f, (hue, sk, vk) in forms.items(): recolor(im, centre, hue, sk, vk).save(dest(f), 'WEBP', quality=88, method=6, exact=True)
    print(fid, 'done')

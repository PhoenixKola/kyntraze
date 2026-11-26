"""B36: soft-fades the sides of beast/phoenix sprites whose art was cropped hard by the ImageGen cell (opaque pixels on the image border read as a vertical cut once the sprite is mirrored or moved). python art/b36/fade_edges.py"""
import numpy as np
from PIL import Image
J = {'public/art/b33/ef_tails.webp': {'L': .3}, 'public/art/b33/ef_stream.webp': {'L': .3}, 'public/art/b33/ef_body.webp': {'L': .12, 'R': .12}, 'public/art/b33/ef_jaw.webp': {'L': .1}, 'public/art/b33/ef_paw.webp': {'L': .1, 'R': .1}, 'public/art/b33/ef_head.webp': {'R': .06},
     'public/art/b34/ph_front.webp': {'T': .1}, 'public/art/b34/ph_head.webp': {'L': .05}, 'public/art/b34/ph_tail.webp': {'L': .06}, 'public/art/b34/ph_wingback.webp': {'L': .06}, 'public/art/b34/ph_wingup.webp': {'L': .04}}
for f, e in J.items():
    im = Image.open(f).convert('RGBA'); a = np.array(im).astype(np.float32); h, w = a.shape[:2]; m = np.ones((h, w), np.float32)
    ramp = lambda n: np.linspace(0, 1, max(2, n)) ** 1.5
    for k, fr in e.items():
        if k == 'L': r = ramp(int(w * fr)); m[:, :len(r)] *= r[None, :]
        if k == 'R': r = ramp(int(w * fr)); m[:, w - len(r):] *= r[None, ::-1]
        if k == 'T': r = ramp(int(h * fr)); m[:len(r), :] *= r[:, None]
    a[..., 3] *= m; Image.fromarray(a.astype(np.uint8)).save(f, 'WEBP', quality=90, method=6, exact=True); print(f)

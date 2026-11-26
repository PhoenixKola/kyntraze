"""B36: Eventide Phoenix rig = the Azure Sovereign Phoenix's articulated frames (same layers, animation and directional heads) gradient-mapped to the Seraph palette: dusk violet -> rose -> pearl. python art/b36/recolor_phoenix.py"""
import numpy as np, os
from PIL import Image
SRC = 'public/art/fx/sora-phoenix'; OUT = 'public/art/b36/ev'; os.makedirs(OUT, exist_ok=True)
STOPS = [(0.0, (0, 0, 0)), (0.12, (30, 14, 56)), (0.3, (92, 56, 146)), (0.5, (172, 112, 196)), (0.72, (240, 190, 214)), (1.0, (255, 246, 232))]
xs = [s[0] for s in STOPS]; lut = np.stack([np.interp(np.linspace(0, 1, 256), xs, [s[1][c] for s in STOPS]) for c in range(3)], axis=1).astype(np.uint8)
for st in ['head_side', 'head_front', 'head_back', 'body', 'wing_side', 'tail']:
    for i in range(4):
        im = Image.open(f'{SRC}/{st}{i}.png').convert('RGBA'); a = np.array(im); lum = (0.30 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]); lum = np.clip(lum * 1.08, 0, 255).astype(np.uint8)
        rgb = lut[lum]; out = np.dstack([rgb, a[..., 3]]); Image.fromarray(out).save(f'{OUT}/ev_{st}{i}.png'); print(st, i, end='; ')

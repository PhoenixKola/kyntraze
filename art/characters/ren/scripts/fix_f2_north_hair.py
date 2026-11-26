"""Ashen Eclipse north rear hair: the generated rear-hair piece sat as a wide lobe to the right of the head in the true-rear view. Use the Ascendant north rear-hair silhouette (the shape the rig was authored for) recoloured to the Eclipse mane palette.  python fix_f2_north_hair.py"""
import os, numpy as np
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = np.array(Image.open(os.path.join(R, 'f1', 'north', 'parts', 'hair_f1.png')).convert('RGBA')); head = np.array(Image.open(os.path.join(R, 'f2', 'north', 'parts', 'head_f1.png')).convert('RGBA'))
px = head[head[..., 3] > 0][:, :3].astype(float); lum = px @ [0.3, 0.59, 0.11]; dark = px[(lum > 25) & (lum < 120)]
q = np.unique((dark // 8 * 8).astype(int), axis=0); ramp = q[np.argsort(q @ [0.3, 0.59, 0.11])]; ramp = ramp[np.linspace(0, len(ramp) - 1, 6).astype(int)]
a = src[..., 3] > 0; sl = src[..., :3].astype(float) @ [0.3, 0.59, 0.11]; lo, hi = sl[a].min(), sl[a].max(); t = np.clip((sl - lo) / max(1, hi - lo), 0, 1) * (len(ramp) - 1)
out = src.copy(); out[..., :3] = ramp[np.round(t).astype(int)]; Image.fromarray(out.astype(np.uint8), 'RGBA').save(os.path.join(R, 'f2', 'north', 'parts', 'hair_f1.png')); print('ramp', ramp.tolist())

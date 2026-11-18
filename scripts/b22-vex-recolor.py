"""Builds Vex's animated sprite sheets by palette-remapping Ren's rig sheets (same pixel art, same frames): crimson/red -> violet / indigo, golds -> silver-lilac, skin and dark neutrals untouched. Output: public/art/vex, public/art/vex-f1, public/art/fx/vex. Usage: python scripts/b22-vex-recolor.py"""
import os, shutil, colorsys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(ROOT, "public", "art")

def remap(rgba):
    a = np.array(rgba, dtype=np.float32) / 255.0; r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx = a[..., :3].max(-1); mn = a[..., :3].min(-1); d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60.0
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0); v = mx
    red = ((h >= 335) | (h <= 12)) & (s > 0.52) & (v > 0.12)     # crimson trim / sash / gauntlets / glow
    gold = (h > 28) & (h < 70) & (s > 0.45) & (v > 0.3)           # warm accents -> cold silver-lilac
    nh = h.copy(); ns = s.copy(); nv = v.copy()
    nh = np.where(red, 268.0 + (np.where(h > 180, h - 360, h)) * 0.6, nh); ns = np.where(red, np.minimum(1, s * 0.85), ns); nv = np.where(red, v * 0.92, nv)
    nh = np.where(gold, 255.0, nh); ns = np.where(gold, s * 0.25, ns); nv = np.where(gold, np.minimum(1, v * 1.05), nv)
    hh = (nh % 360) / 60.0; i = np.floor(hh).astype(int) % 6; f = hh - np.floor(hh)
    p = nv * (1 - ns); q = nv * (1 - f * ns); t = nv * (1 - (1 - f) * ns)
    out = np.zeros_like(a[..., :3])
    for k, (rr, gg, bb) in enumerate([(nv, t, p), (q, nv, p), (p, nv, t), (p, q, nv), (t, p, nv), (nv, p, q)]):
        m = i == k; out[..., 0] = np.where(m, rr, out[..., 0]); out[..., 1] = np.where(m, gg, out[..., 1]); out[..., 2] = np.where(m, bb, out[..., 2])
    changed = red | gold
    res = np.where(changed[..., None], out, a[..., :3]); return Image.fromarray((np.dstack([res, al]) * 255 + 0.5).astype(np.uint8), "RGBA")

def walk(src, dst):
    n = 0
    for root, _, files in os.walk(src):
        rel = os.path.relpath(root, src); out = os.path.join(dst, rel); os.makedirs(out, exist_ok=True)
        for f in files:
            sp, dp = os.path.join(root, f), os.path.join(out, f)
            if f.lower().endswith(".png"): remap(Image.open(sp).convert("RGBA")).save(dp); n += 1
            else: shutil.copyfile(sp, dp)
    return n

if __name__ == "__main__":
    for s, d in [("ren", "vex"), ("ren-f1", "vex-f1"), ("fx/ren", "fx/vex")]:
        print(s, "->", d, walk(os.path.join(A, s), os.path.join(A, d)), "png")
    shutil.copyfile(os.path.join(A, "ren-anchors.json"), os.path.join(A, "vex-anchors.json"))

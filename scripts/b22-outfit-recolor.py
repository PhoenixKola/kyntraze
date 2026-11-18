"""Builds the in-run sprite sets for the 8 B22 outfits by palette-remapping the hero sheets (same frames, same pixel art): signature accent colour -> outfit secondary, dark cloth -> colourised toward outfit primary, skin / bandages / outlines untouched. Output: public/art/outfits/<outfitId>/<set>/ (set = kai, kai-f1, kai-f2, kai-f3, ren, ren-f1, sora, sora-f1, vex, vex-f1), manifests copied, PNGs palette-quantised. Usage: python scripts/b22-outfit-recolor.py [outfitId ...]"""
import os, sys, shutil
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(ROOT, "public", "art")
def hx(c): return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32) / 255.0
def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = a.max(-1); mn = a.min(-1); d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60.0
    return h, np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0), mx
def hsv2rgb(h, s, v):
    hh = (h % 360) / 60.0; i = np.floor(hh).astype(int) % 6; f = hh - np.floor(hh); p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,), dtype=np.float32)
    for k, (rr, gg, bb) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k; out[..., 0] = np.where(m, rr, out[..., 0]); out[..., 1] = np.where(m, gg, out[..., 1]); out[..., 2] = np.where(m, bb, out[..., 2])
    return out
OUTFITS = {   # id: (hero, primary, secondary)   [palette from src/b22/cosmetics.ts]
  "kai_circuit_vanguard": ("kai", "#5a6b7a", "#9fe8ff"), "kai_celestial_wanderer": ("kai", "#e8dcc0", "#c9a24a"),
  "ren_ironheart_bruiser": ("ren", "#7a2b2b", "#c0c0c8"), "ren_ember_ronin": ("ren", "#2b2224", "#ff7a3d"),
  "sora_azure_artificer": ("sora", "#2d4a7a", "#8fe0ff"), "sora_skybound_oracle": ("sora", "#d6e4ff", "#7a8cd6"),
  "vex_oathkeepers_ruin": ("vex", "#3a2d5a", "#d8d0ff"), "vex_eclipse_nomad": ("vex", "#2a2a3a", "#7a5cc8")}
SETS = {"kai": ["kai", "kai-f1", "kai-f2", "kai-f3"], "ren": ["ren", "ren-f1"], "sora": ["sora", "sora-f1"], "vex": ["vex", "vex-f1"]}
def remap(img, hero, prim, sec):
    a = np.array(img, dtype=np.float32) / 255.0; al = a[..., 3]; h, s, v = rgb2hsv(a[..., :3])
    if hero == "kai": acc = (h > 28) & (h < 60) & (s > 0.62) & (v > 0.35)
    elif hero == "ren": acc = ((h >= 335) | (h <= 12)) & (s > 0.52) & (v > 0.12)
    elif hero == "sora": acc = (h > 185) & (h < 255) & (s > 0.4) & (v > 0.3)
    else: acc = (h > 262) & (h < 292) & (s > 0.45) & (v > 0.38)   # Vex: violet scarf / rift glow
    sh, ss, sv = rgb2hsv(sec[None, None, :]); sh, ss = float(sh[0, 0]), float(ss[0, 0])
    acc_rgb = hsv2rgb(np.full(h.shape, sh, np.float32), np.clip(np.maximum(s * 0.8, ss * 0.85), 0, 1), np.clip(v * 1.0 + (1 - v) * 0.15 * (sv[0, 0] > 0.8), 0, 1))
    below = ~((h > 150) & (h < 235) & (v < 0.5)) if hero == "kai" else np.ones(h.shape, bool)
    if hero == "vex": s = np.where((h > 225) & (h < 262) & (v < 0.72), np.minimum(s, 0.2), s)   # indigo coat cloth counts as recolourable cloth   # Kai's teal-black hair stays untouched
    body = (~acc) & (s < 0.28) & (v > 0.08) & (v < 0.86) & below
    k = np.clip(v / 0.42, 0.3, 1.7)[..., None]; col = np.clip(prim[None, None, :] * k, 0, 1)
    out = a[..., :3].copy(); out = np.where(body[..., None], out * 0.2 + col * 0.8, out); out = np.where(acc[..., None], acc_rgb, out)
    return Image.fromarray((np.dstack([out, al]) * 255 + 0.5).astype(np.uint8), "RGBA")
def save_q(im, path):
    a = np.array(im); alpha = a[..., 3] > 8; q = Image.fromarray(a[..., :3]).quantize(colors=96, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    out = np.dstack([np.array(q), np.where(alpha, 255, 0).astype(np.uint8)]); Image.fromarray(out, "RGBA").quantize(colors=128, method=Image.FASTOCTREE, dither=Image.NONE).save(path, optimize=True)
def run(oid):
    hero, p, sc = OUTFITS[oid]; prim, sec = hx(p), hx(sc); n = 0
    for st in SETS[hero]:
        src = os.path.join(A, st); dst = os.path.join(A, "outfits", oid, st)
        for root, _, files in os.walk(src):
            out = os.path.join(dst, os.path.relpath(root, src)); os.makedirs(out, exist_ok=True)
            for f in files:
                sp, dp = os.path.join(root, f), os.path.join(out, f)
                if f.lower().endswith(".png"): save_q(remap(Image.open(sp).convert("RGBA"), hero, prim, sec), dp); n += 1
                else: shutil.copyfile(sp, dp)
    print(oid, n, "png")
if __name__ == "__main__":
    for oid in (sys.argv[1:] or list(OUTFITS)): run(oid)

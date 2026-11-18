"""Vex costume: redresses Ren's rig parts into Vex's design (same pixel grid, same pivots, so fit.json and the Blender rig stay valid).
 - bare muscular arms -> torn indigo coat sleeves with a silver cuff; gauntlets -> cream hand wraps; fists -> bandaged fists
 - sleeveless red-lined vest -> indigo vanguard coat with silver trim and a violet scarf at the collar
 - crimson trousers stripe / boots -> silver-lilac; sash -> violet; sash tails -> torn indigo coat tails
 - brown hair -> dark indigo-black, scar removed
Usage: python vex_costume.py   (rewrites every parts folder under art/characters/vex in place; idempotent: sources are kept as <name>.ren.png the first time)"""
import os, shutil, sys
import numpy as np
from PIL import Image

VEX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDIGO = np.array([[24, 18, 40], [38, 30, 70], [60, 50, 110], [84, 72, 142]], np.float32)           # dark -> light cloth ramp
SILVER = np.array([[96, 94, 120], [150, 148, 176], [196, 194, 220], [232, 230, 246]], np.float32)
CREAM = np.array([[132, 112, 88], [190, 170, 140], [232, 218, 196], [250, 244, 232]], np.float32)  # bandage ramp
SCARF = np.array([[64, 34, 120], [104, 66, 190], [150, 112, 232], [196, 170, 255]], np.float32)
HAIR = np.array([[14, 12, 26], [30, 26, 54], [52, 44, 88], [84, 72, 130]], np.float32)

def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = a.max(-1); mn = a.min(-1); d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60.0
    return h, np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0), mx

def ramp(ramps, v, lo=0.12, hi=0.95):
    t = np.clip((v - lo) / (hi - lo), 0, 1) * (len(ramps) - 1); i = np.floor(t).astype(int).clip(0, len(ramps) - 2); f = (t - i)[..., None]
    return ramps[i] * (1 - f) + ramps[i + 1] * f

def classes(rgb):
    h, s, v = hsv(rgb / 255.0)
    outline = v < 0.20
    red = ((h >= 335) | (h <= 12)) & (s > 0.5) & (v > 0.2)
    skin = (h > 8) & (h < 42) & (s > 0.22) & (s < 0.7) & (v > 0.55)
    dark = (~outline) & (~red) & (~skin)
    return h, s, v, outline, red, skin, dark

def paint(out, mask, ramps, v, lo=0.12, hi=0.95):
    out[mask] = np.round(ramp(ramps, v, lo, hi)[mask])

def edit(name, im):
    a = np.array(im.convert("RGBA")).astype(np.float32); rgb = a[..., :3].copy(); alpha = a[..., 3] > 0; out = rgb.copy()
    H, W = alpha.shape; rows = np.arange(H)[:, None] * np.ones((1, W)); ys, xs = np.nonzero(alpha)
    if len(ys) == 0: return im
    top, bot = ys.min(), ys.max() + 1; rel = (rows - top) / max(1, bot - top)
    h, s, v, outline, red, skin, dark = classes(rgb); base = name.split(".")[0]
    live = alpha & ~outline
    if base.startswith("upper_arm"):
        paint(out, live, INDIGO, np.clip(v * 0.8, 0, 1), 0.12, 0.85)
        cuff = live & (rel > 0.80); paint(out, cuff, SILVER, np.clip(v, 0, 1), 0.3, 1.0)
        out[live & (rel > 0.60) & (rel <= 0.64)] = SILVER[0]                              # torn-edge seam
    elif base.startswith("forearm"):
        top_cuff = live & (rel < 0.28); wrap = live & (rel >= 0.28)
        paint(out, top_cuff & (red | skin), SILVER, v, 0.2, 1.0); paint(out, top_cuff & dark, INDIGO, v, 0.1, 0.8)
        stripe = ((rows.astype(int) + (xs.min() if len(xs) else 0)) % 4 == 0)
        paint(out, wrap, CREAM, np.clip(v * 1.15 + 0.25, 0, 1), 0.2, 1.0); out[wrap & stripe] = CREAM[0]
    elif base.startswith("fist"):
        wrap = live & (skin | dark | red); paint(out, wrap & ~(red & (rel > 0.55)), CREAM, np.clip(v * 1.05 + 0.15, 0, 1), 0.25, 1.0)
        out[live & ((rows.astype(int) % 5) == 2) & (skin | dark)] = CREAM[0]                  # wrap lines
        paint(out, live & red, SILVER, v, 0.2, 1.0)
    elif base == "torso":
        collar = live & (rel < 0.34) & red; paint(out, collar, SCARF, np.clip(v + 0.2, 0, 1), 0.3, 1.0)       # violet scarf
        paint(out, live & red & ~collar, SILVER, np.clip(v + 0.1, 0, 1), 0.3, 1.0)
        paint(out, live & dark, INDIGO, np.clip(v * 1.1, 0, 1), 0.08, 0.8)
    elif base in ("hips", "thigh_n", "thigh_f", "shin_n", "shin_f"):
        paint(out, live & red, SILVER, np.clip(v + 0.1, 0, 1), 0.3, 1.0); paint(out, live & dark, INDIGO, np.clip(v * 1.05, 0, 1), 0.08, 0.8)
    elif base.startswith("boot"):
        paint(out, live & red, SILVER, np.clip(v + 0.1, 0, 1), 0.3, 1.0); paint(out, live & dark & ~skin, INDIGO, np.clip(v * 1.1, 0, 1), 0.08, 0.8)
    elif base == "sash_band":
        paint(out, live & red, SCARF, np.clip(v + 0.1, 0, 1), 0.3, 1.0)
    elif base == "sash_tails":
        paint(out, live, INDIGO, np.clip(v * 1.15, 0, 1), 0.2, 0.85)
        edge = live & (rel > 0.80); out[edge] = SILVER[1]
        for k in range(W):                                                                   # torn hem: notch the bottom edge
            col = np.nonzero(alpha[:, k])[0]
            if len(col) and (k * 7 + 3) % 5 in (0, 1): alpha[max(col) - (1 + (k % 3)):max(col) + 1, k] = False
    elif base == "head":
        faceskin = live & skin & (v > 0.66); scar = live & red & (rel > 0.45) & (v > 0.45)
        out[scar] = np.array([214, 164, 128], np.float32)
        hair = live & ~faceskin & ~scar; paint(out, hair, HAIR, np.clip(v * 1.0 + 0.02, 0, 1), 0.2, 0.7)
    elif base.startswith("head_f1") or base.startswith("hair_f1"):
        glow = live & red; paint(out, glow, SCARF, np.clip(v + 0.25, 0, 1), 0.3, 1.0)
        hair = live & ~skin & ~red & (v < 0.62); paint(out, hair, HAIR, np.clip(v + 0.04, 0, 1), 0.2, 0.55)
    elif base.startswith("lining"):
        paint(out, live, INDIGO, np.clip(v, 0, 1), 0.1, 0.9)
    res = np.dstack([out, np.where(alpha, 255, 0)]); return Image.fromarray(np.clip(res, 0, 255).astype(np.uint8), "RGBA")

def run():
    n = 0
    folders = [os.path.join(VEX, d, "parts") for d in ("south", "north", "east", "west")] + [os.path.join(VEX, "f1", d, "parts") for d in ("south", "north", "east", "west")] + [os.path.join(VEX, "south", "parts-raw")]
    for fo in folders:
        if not os.path.isdir(fo): continue
        for f in sorted(os.listdir(fo)):
            if not f.endswith(".png") or f.endswith(".ren.png") or ".b19" in f: continue
            p = os.path.join(fo, f); keep = p[:-4] + ".ren.png"
            if not os.path.exists(keep): shutil.copyfile(p, keep)
            edit(f, Image.open(keep)).save(p); n += 1
    print("edited", n, "parts")

if __name__ == "__main__":
    run()

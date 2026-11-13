"""Reconstruct native-scale pixel parts from an ImageGen sheet (magenta background).
Each source pixel is mapped to the nearest colour of the approved reference palette (or to transparent if it is
background), then every native cell of `scale` source px takes its most frequent value. No new pixels are painted.

  python extract.py list  <sheet.png>                       -> component boxes (source px)
  python extract.py cut   <sheet.png> <outdir> name1@scale name2@scale ...   (component order; '-' skips one)
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); V5 = os.path.dirname(HERE); BASE = os.path.dirname(V5)
REF = os.path.join(BASE, "references", "kai-160-native-approved-reference.png")

def ref_palette(n=36):
    a = np.array(Image.open(REF).convert("RGBA")); op = a[a[..., 3] > 0][:, :3]
    q = Image.fromarray(op.reshape(1, -1, 3), "RGB").quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    return np.array(q.getpalette()[:n * 3], np.int32).reshape(n, 3)

def background(rgb):
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    # magenta and its anti-aliased fringe: red and blue both well above green
    return (r - g > 70) & (b - g > 70) & (np.abs(r - b) < 90)

def components(mask, min_px=400):
    lab = np.zeros(mask.shape, np.int32); boxes = []
    small = mask[::2, ::2]; seen = np.zeros(small.shape, bool)
    for y, x in zip(*np.nonzero(small)):
        if seen[y, x]: continue
        q = deque([(y, x)]); seen[y, x] = True; ys = []; xs = []
        while q:
            yy, xx = q.popleft(); ys.append(yy); xs.append(xx)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    Y, X = yy + dy, xx + dx
                    if 0 <= Y < small.shape[0] and 0 <= X < small.shape[1] and small[Y, X] and not seen[Y, X]:
                        seen[Y, X] = True; q.append((Y, X))
        if len(ys) * 4 >= min_px: boxes.append((min(xs) * 2, min(ys) * 2, max(xs) * 2 + 2, max(ys) * 2 + 2, len(ys) * 4))
    boxes.sort(key=lambda b: (round(b[1] / 300), b[0]))
    return boxes

def to_native(rgb, scale, pal, phase=(0.0, 0.0)):
    sx, sy = (scale, scale) if not isinstance(scale, tuple) else scale
    """Palette-map then per-cell mode. Index len(pal) = transparent."""
    bg = background(rgb)
    d = ((rgb[..., None, :].astype(np.int32) - pal[None, None]) ** 2 * np.array([3, 4, 2])).sum(-1)
    idx = d.argmin(-1); idx[bg] = len(pal)
    H, W = rgb.shape[:2]
    nh, nw = int((H - phase[1]) // sy), int((W - phase[0]) // sx)
    out = np.full((nh, nw), len(pal), np.int32)
    for j in range(nh):
        y0, y1 = int(round(phase[1] + j * sy)), int(round(phase[1] + (j + 1) * sy))
        for i in range(nw):
            x0, x1 = int(round(phase[0] + i * sx)), int(round(phase[0] + (i + 1) * sx))
            cell = idx[y0:y1, x0:x1].ravel()
            # trim one source px at cell borders to avoid sampling the neighbour's anti-aliasing
            if y1 - y0 > 3 and x1 - x0 > 3: cell = idx[y0 + 1:y1 - 1, x0 + 1:x1 - 1].ravel()
            out[j, i] = np.bincount(cell, minlength=len(pal) + 1).argmax()
    rgba = np.zeros((nh, nw, 4), np.uint8)
    m = out < len(pal); rgba[m, :3] = pal[out[m]]; rgba[m, 3] = 255
    return rgba

def fit_period(profile, lo=7.5, hi=13.5, step=0.02):
    """Fundamental period and phase of a comb-like edge profile (AI pixel grid)."""
    n = len(profile); i = np.arange(n); best = (0.0, lo, 0.0)
    prof = profile - profile.mean()
    for sp in np.arange(lo, hi, step):
        z = (prof * np.exp(-2j * np.pi * i / sp)).sum(); m = abs(z)
        if m > best[0]: best = (m, sp, float(np.angle(z)))
    _, sp, ang = best
    return sp, (-ang / (2 * np.pi)) * sp % sp     # edges at phase + k*sp

def detect_grid(rgb, pal):
    d = ((rgb[..., None, :].astype(np.int32) - pal[None, None]) ** 2 * np.array([3, 4, 2])).sum(-1)
    idx = d.argmin(-1); idx[background(rgb)] = len(pal)
    px = (idx[:, 1:] != idx[:, :-1]).sum(0).astype(float); py = (idx[1:, :] != idx[:-1, :]).sum(1).astype(float)
    return fit_period(px), fit_period(py)

def to_native_grid(rgb, pal, gx, gy):
    """Cells follow the detected grid: x edges at gx[1] + k*gx[0] (+1 offset because the profile indexes the gap after column i)."""
    bg = background(rgb)
    d = ((rgb[..., None, :].astype(np.int32) - pal[None, None]) ** 2 * np.array([3, 4, 2])).sum(-1)
    idx = d.argmin(-1); idx[bg] = len(pal)
    H, W = rgb.shape[:2]
    xe = np.arange(gx[1] + 1 - gx[0] * 2, W + gx[0], gx[0]); ye = np.arange(gy[1] + 1 - gy[0] * 2, H + gy[0], gy[0])
    xe = xe[(xe >= -0.5)]; ye = ye[(ye >= -0.5)]
    nh, nw = len(ye) - 1, len(xe) - 1
    out = np.full((nh, nw), len(pal), np.int32)
    for j in range(nh):
        y0, y1 = int(round(ye[j])), int(round(ye[j + 1]))
        for i in range(nw):
            x0, x1 = int(round(xe[i])), int(round(xe[i + 1]))
            if y1 <= y0 or x1 <= x0 or x0 >= W or y0 >= H: continue
            cell = idx[max(0, y0):min(H, y1), max(0, x0):min(W, x1)]
            if cell.shape[0] > 3 and cell.shape[1] > 3: cell = cell[1:-1, 1:-1]
            out[j, i] = np.bincount(cell.ravel(), minlength=len(pal) + 1).argmax()
    rgba = np.zeros((nh, nw, 4), np.uint8)
    m = out < len(pal); rgba[m, :3] = pal[out[m]]; rgba[m, 3] = 255
    return rgba

def trim(a, margin=1):
    ys, xs = np.nonzero(a[..., 3])
    if len(ys) == 0: return a
    a = a[max(0, ys.min() - margin):ys.max() + 1 + margin, max(0, xs.min() - margin):xs.max() + 1 + margin]
    return np.pad(a, ((margin, margin), (margin, margin), (0, 0))) if margin else a

if __name__ == "__main__":
    mode, sheet = sys.argv[1], sys.argv[2]
    rgb = np.array(Image.open(sheet).convert("RGB"))
    boxes = components(~background(rgb))
    if mode == "list":
        for k, b in enumerate(boxes): print(k, "box", b[:4], "size", b[2] - b[0], "x", b[3] - b[1])
        sys.exit(0)
    outdir = sys.argv[3]; names = sys.argv[4:]; os.makedirs(outdir, exist_ok=True)
    pal = ref_palette(); rec = {}
    for name, b in zip(names, boxes):
        if name == "-": continue
        name, scale = name.split("@")
        if scale != "auto": scale = tuple(float(v) for v in scale.split(",")) if "," in scale else float(scale)
        pad = 8; x0, y0, x1, y1 = max(0, b[0] - pad), max(0, b[1] - pad), min(rgb.shape[1], b[2] + pad), min(rgb.shape[0], b[3] + pad)
        crop = rgb[y0:y1, x0:x1].copy()
        # keep only this component (mask out other pieces that intrude into the box)
        if scale == "auto":
            gx, gy = detect_grid(crop, pal); nat = trim(to_native_grid(crop, pal, gx, gy)); scale = [round(gx[0], 3), round(gy[0], 3)]
        else:
            nat = trim(to_native(crop, scale, pal))
        Image.fromarray(nat).save(os.path.join(outdir, name + ".png"))
        rec[name] = {"sheet": os.path.basename(sheet), "source_box_px": [int(x0), int(y0), int(x1), int(y1)], "scale_src_px_per_native_px": scale if not isinstance(scale, tuple) else list(scale), "native_size": [int(nat.shape[1]), int(nat.shape[0])]}
    json.dump(rec, open(os.path.join(outdir, "extract-" + os.path.splitext(os.path.basename(sheet))[0] + ".json"), "w"), indent=1)
    print(json.dumps(rec, indent=1))

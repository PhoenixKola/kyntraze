"""Ren NORTH/EAST/WEST parts: ImageGen sheets -> native-scale, Ren-palette part PNGs (no painted pixels), sized to Kai's parts.
python extract_dirs.py north east west"""
import importlib.util, json, os, sys
import numpy as np
from PIL import Image

REN = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); REPO = os.path.dirname(os.path.dirname(os.path.dirname(REN)))
KAIO = os.path.join(REPO, "art", "characters", "kai", "base", "production-other-directions-candidate")
KX = os.path.join(REPO, "art", "characters", "kai", "base", "production-south-candidate", "tools", "extract.py")
spec = importlib.util.spec_from_file_location("kx", KX); kx = importlib.util.module_from_spec(spec); spec.loader.exec_module(kx)
_fp = kx.fit_period
kx.fit_period = lambda prof, lo=11.0, hi=13.6, step=0.02: _fp(prof, lo, hi, step)
pal = np.array(json.load(open(os.path.join(REN, "palette.json"))), int)


def rows(boxes):
    """group boxes into rows by centre y, rows top->bottom, left->right inside a row"""
    hs = sorted(b[3] - b[1] for b in boxes); thr = 0.5 * hs[len(hs) // 2]
    bs = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2); out = []; cur = [bs[0]]
    for b in bs[1:]:
        if abs((b[1] + b[3]) / 2 - np.mean([(c[1] + c[3]) / 2 for c in cur])) > thr: out.append(cur); cur = [b]
        else: cur.append(b)
    out.append(cur)
    return [b for r in out for b in sorted(r, key=lambda b: b[0])]


def names_for(sheet, boxes):
    if sheet == "s1":   # head = biggest; the other two: wider than tall = side fist, taller = guard fist
        area = lambda b: (b[2] - b[0]) * (b[3] - b[1]); bs = sorted(boxes, key=area, reverse=True); head, rest = bs[0], bs[1:]
        rest = sorted(rest, key=lambda b: (b[2] - b[0]) / (b[3] - b[1]), reverse=True)
        return {"head": head, "fist_side": rest[0], "fist_guard": rest[1]}
    order = {"s2": ["torso", "upper_arm_n", "upper_arm_f", "forearm_n", "forearm_f"], "s3": ["hips", "sash_band", "sash_tails", "thigh_n", "thigh_f"],
             "s4": ["shin_n", "shin_f", "boot_n", "boot_f"]}[sheet]
    if sheet == "s2":
        bs = sorted(boxes, key=lambda b: b[0]); return dict(zip(order, bs))
    return dict(zip(order, rows(boxes)))


def extract(d):
    out = os.path.join(REN, d, "parts"); os.makedirs(out, exist_ok=True); report = {}
    for sh in ("s1", "s2", "s3", "s4"):
        rgb = np.array(Image.open(os.path.join(REN, d, "source", f"ren-{sh}.png")).convert("RGB")); boxes = kx.components(~kx.background(rgb))
        exp = {"s1": 3, "s2": 5, "s3": 5, "s4": 4}[sh]; assert len(boxes) == exp, (d, sh, len(boxes))
        for name, b in names_for(sh, boxes).items():
            pad = 8; x0, y0, x1, y1 = max(0, b[0] - pad), max(0, b[1] - pad), min(rgb.shape[1], b[2] + pad), min(rgb.shape[0], b[3] + pad)
            crop = rgb[y0:y1, x0:x1].copy(); gx, gy = kx.detect_grid(crop, pal)
            nat = kx.trim(kx.to_native_grid(crop, pal, gx, gy)); kp = os.path.join(KAIO, d, "parts", name + ".png")
            if os.path.exists(kp):
                kw, kh = Image.open(kp).size; ratio = max(nat.shape[1] / (kw * 1.08), nat.shape[0] / (kh * 1.08))
                if ratio > 1.05:   # generator drew it larger than the rig expects: sample on a coarser cell (palette-mode per cell)
                    ratio = min(ratio, 1.4); nat = kx.trim(kx.to_native(crop, (gx[0] * ratio, gy[0] * ratio), pal))
            Image.fromarray(nat).save(os.path.join(out, name + ".png")); report[name] = [nat.shape[1], nat.shape[0]]
    if d in ("east", "west"):   # profile neck: Kai's piece re-mapped to Ren's palette
        a = np.array(Image.open(os.path.join(KAIO, d, "parts", "neck.png")).convert("RGBA")); m = a[..., 3] > 0; px = a[m][:, :3].astype(int)
        a[m, :3] = pal[(((px[:, None, :] - pal[None]) ** 2 * np.array([3, 4, 2])).sum(-1)).argmin(-1)]; Image.fromarray(a).save(os.path.join(out, "neck.png"))
    kai = {f: Image.open(os.path.join(KAIO, d, "parts", f)).size for f in os.listdir(os.path.join(KAIO, d, "parts")) if f.endswith(".png")}
    print(d, {k: (tuple(v), kai.get(k + ".png")) for k, v in report.items()})


if __name__ == "__main__":
    for d in sys.argv[1:]: extract(d)

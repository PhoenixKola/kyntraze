"""Build <dir>/rig/config.json from the painted parts: python make_config.py east
Pivots/child anchors come from fixed rules on each part's alpha mask; the rest skeleton hangs straight down with bone lengths equal to the
art lengths (so every limb is at scale 1.0 when posed at its design length)."""
import json, math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import specs

ROOT_DIR = os.environ.get("KAI_ROOT") or os.path.dirname(HERE)
ROOT_SIDE = "right"   # set per direction in build() for the Form I hair piece

def mask(path):
    a = np.array(Image.open(path).convert("RGBA"))[..., 3] > 0; ys, xs = np.nonzero(a)
    return a, int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1

def cx_rows(a, y0, y1):
    ys, xs = np.nonzero(a[max(0, y0):y1]); return float(xs.mean() + 0.5) if len(xs) else a.shape[1] / 2

def anchors(kind, a, t, B, x0, x1, point=None):
    H = B - t; cx = (x0 + x1) / 2
    top = cx_rows(a, t, t + 4); bot = cx_rows(a, B - 4, B)
    if kind == "sleeve":  return dict(pivot=(top, t + 0.20 * H), child=(bot, t + 0.90 * H))
    if kind == "forearm": return dict(pivot=(top, t + 0.28 * H), child=(bot, t + 0.78 * H))
    if kind == "thigh":   return dict(pivot=(top, t + 0.20 * H), child=(bot, t + 0.82 * H))
    if kind == "shin":    return dict(pivot=(top, t + 0.26 * H), child=(bot, t + 1.15 * H))
    if kind == "boot":    yy = B - specs.SOLE_DY; return dict(pivot=(cx_rows(a, int(yy) - 2, int(yy) + 3), yy), angle=0.0)
    if kind == "hips":    return dict(pivot=(cx, t + 9.0), angle=0.0)
    if kind == "band":    return dict(pivot=(cx, t + H / 2), angle=0.0)
    if kind == "tails":   return dict(pivot=(top, t + 3.0), angle=0.0)
    if kind == "torso":   return dict(pivot=(cx, B - 6.0), angle=0.0)
    if kind == "head":    return dict(pivot=(bot, B - 5.0), angle=0.0)
    if kind == "hair":    # Form I rear hair: the pivot is the root of the spike mass (the plain end that hides behind the skull)
        ys, xs = np.nonzero(a); side = ROOT_SIDE; ex = x0 + 6.0 if side == "left" else x1 - 6.0; col = a[:, int(ex)]; cy = float(np.nonzero(col)[0].mean() + 0.5) if col.any() else (t + B) / 2
        return dict(pivot=(ex, cy), angle=0.0)
    if kind == "fist_guard": return dict(pivot=(bot, B - 5.0), angle=0.0)
    if kind == "fist_side":
        ys, xs = np.nonzero(a); cy = float(ys.mean() + 0.5)
        return dict(pivot=((x0 + 3.0) if point > 0 else (x1 - 3.0), cy), angle=0.0)
    raise ValueError(kind)

def build(d):
    global ROOT_SIDE; ROOT_SIDE = {"east": "right", "south": "right", "west": "left", "north": "left"}[d]
    S = specs.SPEC[d]; pdir = os.path.join(ROOT_DIR, d, "parts"); rx, ry = S["root"]; plist = specs.parts_for(d)
    info = {}; parts = []
    for p in plist:
        a, t, B, x0, x1 = mask(os.path.join(pdir, p["img"]))
        q = dict(id=p["id"], img=p["img"], bone=p["bone"]); q.update(anchors(p["kind"], a, t, B, x0, x1, p.get("point")))
        if "slot" in p: q["slot"] = p["slot"]
        if "point" in p: q["point"] = p["point"]
        parts.append(q); info[p["id"]] = (q, B - t)
    L = lambda pid: float(np.linalg.norm(np.array(info[pid][0]["child"]) - np.array(info[pid][0]["pivot"])))
    cx = rx
    Lt = {s: L(f"thigh_{s}") for s in "nf"}; Ls = {s: L(f"shin_{s}") for s in "nf"}
    Lu = {s: L(f"upper_arm_{s}") for s in "nf"}; Lf = {s: L(f"forearm_{s}") for s in "nf"}
    H0 = max(Lt[s] + Ls[s] for s in "nf"); hip_y = ry - specs.SOLE_DY - H0
    waist_y = hip_y - 14.0; torso_H = info["torso"][1]; neck_y = waist_y - (torso_H - 14.0); sh_y = neck_y + 7.0
    bones = {"root": [None, [cx, ry], [cx, ry - 10]], "pelvis": ["root", [cx, hip_y - 8], [cx, waist_y]], "spine": ["pelvis", [cx, waist_y], [cx, neck_y]],
             "head": ["spine", [cx, neck_y], [cx, neck_y - 20]], "sash": ["pelvis", [cx + S["knot_dx"], waist_y + 3], [cx + S["knot_dx"], waist_y + 18]]}
    if any(p["id"] == "hair_f1" for p in parts):      # Form I hair bone: a child of the head whose joint is on the skull behind the face (rear hair swings about it)
        qh = info["head_f1"][0]; a_, t_, B_, x0_, x1_ = mask(os.path.join(pdir, "head_f1.png")); ax, ay = x0_ + 0.45 * (x1_ - x0_), t_ + 0.58 * (B_ - t_)
        hj = [cx + ax - qh["pivot"][0], neck_y + ay - qh["pivot"][1]]; bones["hair"] = ["head", hj, [hj[0], hj[1] - 12]]
    for s in "nf":
        shx = cx + S["sh_dx"][s]; hx = cx + S["hip_dx"][s]
        bones[f"upper_arm_{s}"] = ["spine", [shx, sh_y], [shx, sh_y + Lu[s]]]
        bones[f"forearm_{s}"] = [f"upper_arm_{s}", [shx, sh_y + Lu[s]], [shx, sh_y + Lu[s] + Lf[s]]]
        bones[f"hand_{s}"] = [f"forearm_{s}", [shx, sh_y + Lu[s] + Lf[s]], [shx, sh_y + Lu[s] + Lf[s] + 8]]
        bones[f"thigh_{s}"] = ["pelvis", [hx, hip_y], [hx, hip_y + Lt[s]]]
        bones[f"shin_{s}"] = [f"thigh_{s}", [hx, hip_y + Lt[s]], [hx, hip_y + Lt[s] + Ls[s]]]
        bones[f"boot_{s}"] = [f"shin_{s}", [hx, hip_y + Lt[s] + Ls[s]], [hx, hip_y + Lt[s] + Ls[s] + 10]]
    cfg = dict(direction=d, canvas=list(specs.CANVAS), root=[rx, ry], bones=bones,
               no_inherit_scale=[f"{b}_{s}" for b in ("forearm", "hand", "shin", "boot") for s in "nf"],
               parts=parts, default_slots=specs.default_slots(d), sole_dy=specs.SOLE_DY,
               lengths=dict(thigh=Lt, shin=Ls, upper=Lu, fore=Lf, torso_H=torso_H), spec={k: v for k, v in S.items() if k != "point"})
    os.makedirs(os.path.join(ROOT_DIR, d, "rig"), exist_ok=True)
    json.dump(cfg, open(os.path.join(ROOT_DIR, d, "rig", "config.json"), "w"), indent=1)
    return cfg

if __name__ == "__main__":
    c = build(sys.argv[1]); print(sys.argv[1], "parts", len(c["parts"]), "lengths", {k: v for k, v in c["lengths"].items()})

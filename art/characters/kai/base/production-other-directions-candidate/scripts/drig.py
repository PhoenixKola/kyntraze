"""Data-driven Kai rig for NORTH / EAST / WEST (same FK, part placement and RotSprite renderer as the SOUTH candidate).
The direction is chosen with the KAI_DIR environment variable (east|west|north); everything else comes from <dir>/rig/config.json
which make_config.py builds from the painted parts. Coordinates: native px, y down; angles in degrees, + = counter-clockwise on screen."""
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT_DIR = os.path.dirname(HERE)
DIRECTION = os.environ.get("KAI_DIR", "east")
DIR_PATH = os.path.join(ROOT_DIR, DIRECTION)
PARTS_DIR = os.path.join(DIR_PATH, "parts")
CFG = json.load(open(os.path.join(DIR_PATH, "rig", "config.json")))

CANVAS = tuple(CFG["canvas"]); ROOT = tuple(CFG["root"])
BONES = {b: (v[0], tuple(v[1]), tuple(v[2])) for b, v in CFG["bones"].items()}       # name -> (parent, head, tail); parents precede children
NO_INHERIT_SCALE = tuple(CFG["no_inherit_scale"])
PARTS = CFG["parts"]
for _p in PARTS:
    _p["pivot"] = tuple(_p["pivot"])
    if "child" in _p: _p["child"] = tuple(_p["child"])
DEFAULT_SLOTS = CFG["default_slots"]
EPS = 0.004

def rot(deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a); return np.array([[c, s], [-s, c]])

def part_rest(p):
    """2x2 A and offset t: part image px -> rest canvas px."""
    piv = np.array(p["pivot"], float); par, head, tail = BONES[p["bone"]]; head = np.array(head, float)
    if "child" in p:
        v_img = np.array(p["child"], float) - piv; v_rest = np.array(tail, float) - head
        a_img = math.degrees(math.atan2(v_img[0], v_img[1])); a_rest = math.degrees(math.atan2(v_rest[0], v_rest[1]))
        s = np.linalg.norm(v_rest) / np.linalg.norm(v_img)
        d = v_img / np.linalg.norm(v_img); S = np.eye(2) + (s - 1) * np.outer(d, d)
        A = rot(a_rest - a_img) @ S
    else:
        A = rot(p.get("angle", 0.0))
    return A, head - A @ piv

def bone_axis(b):
    par, h, t = BONES[b]; d = np.array(t, float) - np.array(h, float); return d / np.linalg.norm(d)

def fk(ch):
    out = {}
    for b, (par, head, tail) in BONES.items():
        c = ch.get(b, {}); R = rot(c.get("rot", 0.0)); l = np.array(c.get("loc", (0, 0)), float)
        d = bone_axis(b); S = np.eye(2) + (c.get("sy", 1.0) - 1) * np.outer(d, d); h = np.array(head, float)
        if par is None:
            A = R @ S; out[b] = (A, h + l - A @ h, R); continue
        Ap, tp, Rp = out[par]
        hp = Ap @ (h + l) + tp
        lin = (Rp if b in NO_INHERIT_SCALE else Ap) @ R @ S
        out[b] = (lin, hp - lin @ h, Rp @ R)
    return out

def world_angle(W, b): R = W[b][2]; return math.degrees(math.atan2(R[0, 1], R[0, 0]))
def apply(W, b, p): A, t, _ = W[b]; return A @ np.asarray(p, float) + t

def scale2x(a):
    k = np.ascontiguousarray(a).view(np.uint32).reshape(a.shape[:2]); P = np.pad(k, 1, mode="edge")
    E, B, D, F, H = P[1:-1, 1:-1], P[:-2, 1:-1], P[1:-1, :-2], P[1:-1, 2:], P[2:, 1:-1]
    out = np.empty((k.shape[0] * 2, k.shape[1] * 2), np.uint32)
    out[0::2, 0::2] = np.where((B == D) & (B != F) & (D != H), D, E); out[0::2, 1::2] = np.where((B == F) & (B != D) & (F != H), F, E)
    out[1::2, 0::2] = np.where((D == H) & (B != D) & (H != F), D, E); out[1::2, 1::2] = np.where((H == F) & (D != H) & (B != F), F, E)
    return out.view(np.uint8).reshape(out.shape + (4,))

def prefilter8(a):
    for _ in range(3): a = np.ascontiguousarray(scale2x(a))
    return a

def load_images(prefilter=False, folder=None):
    from PIL import Image
    out = {}
    for p in PARTS:
        a = np.array(Image.open(os.path.join(folder or PARTS_DIR, p["img"])).convert("RGBA"))
        out[p["id"]] = (prefilter8(a), 8) if prefilter else (a, 1)
    return out

def visible(slots=None):
    slots = dict(slots or {}); hide = set(slots.pop("_hide", []))
    s = dict(DEFAULT_SLOTS); s.update(slots)
    return [p for p in PARTS if p["id"] not in hide and ("slot" not in p or s[p["slot"].split(":")[0]] == p["slot"].split(":")[1])]

def render(ch, images, scale=1, slots=None, order=None):
    Wc, Hc = CANVAS[0] * scale, CANVAS[1] * scale
    out = np.zeros((Hc, Wc, 4), np.uint8); W = fk(ch)
    plist = visible(slots)
    if order: plist = sorted(plist, key=lambda p: order.get(p["id"], PARTS.index(p)))
    for p in plist:
        img, ts = images[p["id"]]
        Ap, tp = part_rest(p); Ab, tb, _ = W[p["bone"]]
        A = Ab @ Ap; t = Ab @ tp + tb
        h, w = img.shape[0] / ts, img.shape[1] / ts
        cor = (A @ np.array([[0, 0], [w, 0], [0, h], [w, h]], float).T).T + t
        x0 = max(0, int(math.floor(cor[:, 0].min() * scale)) - 1); x1 = min(Wc, int(math.ceil(cor[:, 0].max() * scale)) + 1)
        y0 = max(0, int(math.floor(cor[:, 1].min() * scale)) - 1); y1 = min(Hc, int(math.ceil(cor[:, 1].max() * scale)) + 1)
        if x1 <= x0 or y1 <= y0: continue
        X, Y = np.meshgrid((np.arange(x0, x1) + 0.5) / scale + EPS, (np.arange(y0, y1) + 0.5) / scale + EPS)
        Ai = np.linalg.inv(A); u = Ai[0, 0] * (X - t[0]) + Ai[0, 1] * (Y - t[1]); v = Ai[1, 0] * (X - t[0]) + Ai[1, 1] * (Y - t[1])
        ui = np.floor(u * ts).astype(np.int32); vi = np.floor(v * ts).astype(np.int32)
        ok = (ui >= 0) & (ui < img.shape[1]) & (vi >= 0) & (vi < img.shape[0])
        src = img[vi[ok], ui[ok]]; m = src[:, 3] > 0; idx = np.nonzero(ok)
        out[y0:y1, x0:x1][idx[0][m], idx[1][m]] = src[m]
    return out

def rotsprite_combine(nearest, big, k=8, keep_frac=0.25):
    H, W = nearest.shape[:2]
    v = np.ascontiguousarray(big).view(np.uint32).reshape(big.shape[:2])
    blocks = v.reshape(H, k, W, k).transpose(0, 2, 1, 3).reshape(H * W, k * k)
    nv = np.ascontiguousarray(nearest).view(np.uint32).reshape(H * W).copy()
    keep = (blocks == nv[:, None]).sum(1) >= keep_frac * k * k
    s = np.sort(blocks, axis=1); change = np.ones_like(s, bool); change[:, 1:] = s[:, 1:] != s[:, :-1]
    for i in np.flatnonzero(~keep):
        idx = np.flatnonzero(change[i]); cnt = np.diff(np.append(idx, k * k)); nv[i] = s[i][idx[np.argmax(cnt)]]
    return nv.view(np.uint8).reshape(H, W, 4)

def render_final(ch, imgs1, imgs8, slots=None, order=None):
    return rotsprite_combine(render(ch, imgs1, 1, slots, order), render(ch, imgs8, 8, slots, order))

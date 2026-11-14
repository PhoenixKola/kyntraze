"""Kai SOUTH rig: neutral = the approved 3/4 fighting stance. Single source of truth for joints, bones and part placement.
Coordinates: native px, y down. JOINTS are measured on references/kai-160-native-approved-reference.png (87x160) and shifted
by REF_OFFSET into the technical canvas. Rest pose = approved stance, so every animation channel is 0 at neutral.
Angles: degrees, + = counter-clockwise on screen."""
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.dirname(os.path.dirname(HERE))
V5 = os.environ.get("KAI_ROOT_SOUTH") or os.path.dirname(HERE)      # KAI_ROOT_SOUTH: the Form I SOUTH tree (art/characters/kai/form-i/south)
RIG_DIR = os.path.join(V5, "rig") if os.environ.get("KAI_ROOT_SOUTH") else HERE
FORM = os.environ.get("KAI_FORM", "")
PARTS_DIR = os.path.join(V5, "parts")
CANVAS = (160, 176)
REF_OFFSET = (20, 12)                     # reference px (0,0) -> canvas px
ROOT_REF = (38.0, 152.0)                  # ground point midway between the two soles (near sole y159, far sole y146)

J_REF = {  # joint positions measured on the approved reference
    "waist": (45, 73), "neck": (46, 41), "hip_n": (34, 91), "hip_f": (58, 91),
    "knee_n": (17, 118), "knee_f": (70, 113), "ankle_n": (11, 141), "ankle_f": (66, 128),
    "sh_n": (25, 50), "sh_f": (65, 49), "elbow_n": (14, 64), "elbow_f": (71, 63), "wrist_n": (25, 76), "wrist_f": (71, 52),
    "pelvis": (45, 82), "sash": (53, 80),
}
def C(name):
    x, y = J_REF[name]; return (x + REF_OFFSET[0], y + REF_OFFSET[1])
ROOT = (ROOT_REF[0] + REF_OFFSET[0], ROOT_REF[1] + REF_OFFSET[1])

# bone: (parent, head joint, tail joint)
BONES = {
    "root": (None, ROOT, (ROOT[0], ROOT[1] - 10)),
    "pelvis": ("root", C("pelvis"), C("waist")),
    "spine": ("pelvis", C("waist"), C("neck")),
    "head": ("spine", C("neck"), (C("neck")[0], C("neck")[1] - 20)),
    "sash": ("pelvis", C("sash"), (C("sash")[0], C("sash")[1] + 15)),
    "upper_arm_n": ("spine", C("sh_n"), C("elbow_n")), "forearm_n": ("upper_arm_n", C("elbow_n"), C("wrist_n")),
    "hand_n": ("forearm_n", C("wrist_n"), (C("wrist_n")[0] + 8, C("wrist_n")[1])),
    "upper_arm_f": ("spine", C("sh_f"), C("elbow_f")), "forearm_f": ("upper_arm_f", C("elbow_f"), C("wrist_f")),
    "hand_f": ("forearm_f", C("wrist_f"), (C("wrist_f")[0], C("wrist_f")[1] - 8)),
    "thigh_n": ("pelvis", C("hip_n"), C("knee_n")), "shin_n": ("thigh_n", C("knee_n"), C("ankle_n")),
    "boot_n": ("shin_n", C("ankle_n"), (C("ankle_n")[0], C("ankle_n")[1] + 10)),
    "thigh_f": ("pelvis", C("hip_f"), C("knee_f")), "shin_f": ("thigh_f", C("knee_f"), C("ankle_f")),
    "boot_f": ("shin_f", C("ankle_f"), (C("ankle_f")[0], C("ankle_f")[1] + 10)),
}
LIMBS = ("upper_arm_n", "forearm_n", "upper_arm_f", "forearm_f", "thigh_n", "shin_n", "thigh_f", "shin_f")
NO_INHERIT_SCALE = ("forearm_n", "forearm_f", "hand_n", "hand_f", "shin_n", "shin_f", "boot_n", "boot_f")

# parts: image, bone, image pivot px, and either 'child' (limb: image anchor that lands on the bone tail) or 'angle'
# (rigid piece rotated by angle deg around its pivot). draw order = list order (back -> front).
PARTS = [
    dict(id="lining_c", img="lining_c.png", bone="pelvis", pivot=(4.0, 4.0), angle=0.0),
    dict(id="hips", img="hips.png", bone="pelvis", pivot=(26.0, 9.0), angle=0.0),
    dict(id="boot_f", img="boot_f.png", bone="boot_f", pivot=(8.5, 9.0), angle=0.0),
    dict(id="shin_f", img="shin_f.png", bone="shin_f", pivot=(12.5, 8.0), child=(11.5, 32.0)),
    dict(id="thigh_f", img="thigh_f.png", bone="thigh_f", pivot=(11.0, 9.0), child=(12.0, 34.0)),
    dict(id="boot_n", img="boot_n.png", bone="boot_n", pivot=(14.0, 9.0), angle=0.0),
    dict(id="shin_n", img="shin_n.png", bone="shin_n", pivot=(14.5, 8.0), child=(12.0, 32.0)),
    dict(id="thigh_n", img="thigh_n.png", bone="thigh_n", pivot=(22.0, 9.0), child=(14.0, 40.0)),
    dict(id="lining_w", img="lining_w.png", bone="pelvis", pivot=(10.0, 4.0), angle=0.0),
    dict(id="sash_band", img="sash_band.png", bone="pelvis", pivot=(20.0, 7.0), angle=0.0),
    dict(id="sash_tails", img="sash_tails.png", bone="sash", pivot=(9.0, 3.0), angle=0.0),
    dict(id="torso", img="torso.png", bone="spine", pivot=(21.5, 40.0), angle=0.0),
    dict(id="lining_f", img="lining_f.png", bone="hand_f", pivot=(6.0, 11.0), angle=0.0),
    dict(id="lining_n", img="lining_n.png", bone="forearm_n", pivot=(6.0, 5.0), angle=0.0),
    dict(id="head", img="head.png", bone="head", pivot=(24.0, 41.0), angle=0.0),
    dict(id="upper_arm_f", img="upper_arm_f.png", bone="upper_arm_f", pivot=(10.0, 8.0), child=(10.0, 22.0)),
    dict(id="forearm_f", img="forearm_f.png", bone="forearm_f", pivot=(9.5, 8.0), child=(9.5, 20.0)),
    dict(id="fist_guard", img="fist_guard.png", bone="hand_f", pivot=(14.5, 23.0), angle=0.0, slot="hand_f:guard"),
    dict(id="fist_front_f", img="fist_front.png", bone="hand_f", pivot=(13.0, 25.0), angle=0.0, slot="hand_f:front"),
    dict(id="fist_angle_f", img="fist_front_angle.png", bone="hand_f", pivot=(8.5, 25.0), angle=0.0, slot="hand_f:angle"),
    dict(id="fist_side_f", img="fist_waist.png", bone="hand_f", pivot=(3.0, 10.0), angle=0.0, slot="hand_f:side"),
    dict(id="upper_arm_n", img="upper_arm_n.png", bone="upper_arm_n", pivot=(11.0, 6.0), child=(10.5, 21.0)),
    dict(id="forearm_n", img="forearm_n.png", bone="forearm_n", pivot=(10.5, 9.0), child=(11.0, 26.0)),
    dict(id="fist_waist", img="fist_waist.png", bone="hand_n", pivot=(3.0, 10.0), angle=0.0, slot="hand_n:side"),
    dict(id="fist_front_n", img="fist_front.png", bone="hand_n", pivot=(13.0, 25.0), angle=0.0, slot="hand_n:front"),
    dict(id="fist_angle_n", img="fist_front_angle.png", bone="hand_n", pivot=(8.5, 25.0), angle=0.0, slot="hand_n:angle"),
]
DEFAULT_SLOTS = {"hand_f": "guard", "hand_n": "side"}

if FORM == "f1":   # Form I: spikier head + a separate rear hair piece on its own bone; the base head stays in the rig behind the "form" slot (transformation clip)
    _g = json.load(open(os.path.join(PARTS_DIR, "form_geometry.json")))      # written by form-i/scripts/prepare_parts.py (Blender's Python has no Pillow)
    HEAD_F1_PIVOT = tuple(_g["head_pivot"]); _nk = C("neck")
    _hj = (_nk[0] + _g["attach"][0] - HEAD_F1_PIVOT[0], _nk[1] + _g["attach"][1] - HEAD_F1_PIVOT[1]); BONES["hair"] = ("head", _hj, (_hj[0], _hj[1] - 12))
    _ex, _cy = _g["hair_pivot"]
    _i = [p["id"] for p in PARTS].index("head"); PARTS[_i]["slot"] = "form:base"
    PARTS[_i:_i] = [dict(id="hair_f1", img="hair_f1.png", bone="hair", pivot=(_ex, _cy), angle=0.0, slot="form:f1"), dict(id="head_f1", img="head_f1.png", bone="head", pivot=HEAD_F1_PIVOT, angle=0.0, slot="form:f1")]
    DEFAULT_SLOTS["form"] = "f1"

def rot(deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a); return np.array([[c, s], [-s, c]])

LINING_TARGET = {"lining_n": (47.0, 77.0), "lining_f": (81.0, 50.0), "lining_c": (65.0, 104.0), "lining_w": (47.0, 85.0)}    # rest canvas px (the notch between sleeve, cuff cap and wrap / cheek and fist)
for _p in PARTS:
    if _p["id"] in LINING_TARGET:
        _h = BONES[_p["bone"]][1]; _t = LINING_TARGET[_p["id"]]; _c = _p["pivot"]
        _p["pivot"] = (_c[0] + _h[0] - _t[0], _c[1] + _h[1] - _t[1])

def part_rest(p):
    """2x3 affine: part image px -> rest canvas px."""
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
    """ch: {bone: {rot, loc(x,y), sy}} -> {bone: (A, t, Rw)} mapping rest canvas px -> posed canvas px."""
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

# ---------------------------------------------------------------- images + RotSprite render
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

def load_images(prefilter=False, folder=PARTS_DIR):
    from PIL import Image
    out = {}
    for p in PARTS:
        a = np.array(Image.open(os.path.join(folder, p["img"])).convert("RGBA"))
        out[p["id"]] = (prefilter8(a), 8) if prefilter else (a, 1)
    return out

def visible(slots=None):
    slots = dict(slots or {}); hide = set(slots.pop("_hide", []))
    s = dict(DEFAULT_SLOTS); s.update(slots)
    return [p for p in PARTS if p["id"] not in hide and ("slot" not in p or s[p["slot"].split(":")[0]] == p["slot"].split(":")[1])]

EPS = 0.004
def render(ch, images, scale=1, slots=None, order=None):
    Wc, Hc = CANVAS[0] * scale, CANVAS[1] * scale
    out = np.zeros((Hc, Wc, 4), np.uint8); W = fk(ch)
    plist = visible(slots)
    if order: plist = sorted(plist, key=lambda p: order.get(p["id"], PARTS.index(p)))
    for p in plist:
        img, ts = images[p["id"]]
        Ap, tp = part_rest(p); Ab, tb, _ = W[p["bone"]]
        A = Ab @ Ap; t = Ab @ tp + tb                      # image px -> posed canvas px
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

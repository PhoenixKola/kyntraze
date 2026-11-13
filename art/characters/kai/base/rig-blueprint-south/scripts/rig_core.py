"""Single source of truth for the Kai SOUTH technical rig (mechanical guide, not final art).

Character space: native source pixels, origin = root on the ground line midway between the feet,
x right (screen right), y DOWN (image convention). Rest pose = neutral pose = all bone angles 0.
Angles: degrees, positive = counter-clockwise as seen on screen.
"near" = Kai's right side = screen-left (x < 0); "far" = Kai's left side = screen-right (x > 0).
"""
import math
import numpy as np

CANVAS_W, CANVAS_H = 160, 192
ROOT_CANVAS = (80, 184)          # canvas pixel corner where character (0,0) sits
GROUND_Y = 0
VISIBLE_TOP_Y = -160             # top row of hair = -160 -> 160 visible rows in neutral
PX_TO_BU = 0.01                  # Blender units per source pixel

# ---------------------------------------------------------------- shapes
def circle(cx, cy, r): return ("ellipse", cx, cy, r, r)
def ellipse(cx, cy, rx, ry): return ("ellipse", cx, cy, rx, ry)
def rect(x0, y0, x1, y1): return ("rect", x0, y0, x1, y1)
def poly(*pts): return ("poly", pts)
def capsule(x0, y0, x1, y1, r0, r1): return ("capsule", x0, y0, x1, y1, r0, r1)

def mirror_shape(s):
    k = s[0]
    if k == "ellipse": return ("ellipse", -s[1], s[2], s[3], s[4])
    if k == "rect": return ("rect", -s[3], s[2], -s[1], s[4])
    if k == "poly": return ("poly", tuple((-x, y) for x, y in s[1]))
    if k == "capsule": return ("capsule", -s[1], s[2], -s[3], s[4], s[5], s[6])
    raise ValueError(k)

def shape_bbox(s):
    k = s[0]
    if k == "ellipse": return s[1] - s[3], s[2] - s[4], s[1] + s[3], s[2] + s[4]
    if k == "rect": return s[1:5]
    if k == "poly":
        xs = [p[0] for p in s[1]]; ys = [p[1] for p in s[1]]
        return min(xs), min(ys), max(xs), max(ys)
    if k == "capsule":
        r = max(s[5], s[6])
        return min(s[1], s[3]) - r, min(s[2], s[4]) - r, max(s[1], s[3]) + r, max(s[2], s[4]) + r

def shape_mask(s, X, Y):
    k = s[0]
    if k == "ellipse":
        return ((X - s[1]) / s[3]) ** 2 + ((Y - s[2]) / s[4]) ** 2 <= 1.0 + 1e-9
    if k == "rect":
        return (X >= s[1]) & (X <= s[3]) & (Y >= s[2]) & (Y <= s[4])
    if k == "poly":
        pts = s[1]; inside = np.zeros(X.shape, bool); n = len(pts)
        for i in range(n):
            x0, y0 = pts[i]; x1, y1 = pts[(i + 1) % n]
            cond = (y0 > Y) != (y1 > Y)
            xi = (x1 - x0) * (Y - y0) / ((y1 - y0) if y1 != y0 else 1e-9) + x0
            inside ^= cond & (X < xi)
        return inside
    if k == "capsule":
        x0, y0, x1, y1, r0, r1 = s[1:]
        dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy
        t = np.clip(((X - x0) * dx + (Y - y0) * dy) / L2, 0, 1)
        d = np.hypot(X - (x0 + t * dx), Y - (y0 + t * dy))
        return d <= r0 + (r1 - r0) * t + 1e-9
    raise ValueError(k)

# ---------------------------------------------------------------- parts
# Each part: bone it rides on, shapes (rest character space), mannequin base colour.
NEAR_X = -1
def side_x(side, x): return x * (1 if side == "f" else -1)

PARTS = {}
def add_part(pid, bone, shapes, color, role, slot=None, default_visible=True):
    PARTS[pid] = dict(id=pid, bone=bone, shapes=shapes, color=color, role=role,
                      slot=slot, default_visible=default_visible)

add_part("hair_back", "hair_back", [ellipse(0, -140, 17, 15.5), poly((-17, -142), (-18, -124), (-11, -128), (0, -126), (11, -128), (18, -124), (17, -142))],
         (120, 80, 160), "Hair mass behind the head (swap slot)", slot="hair")
add_part("pelvis", "pelvis", [rect(-17, -88, 17, -78), circle(-10, -70, 10.5), circle(10, -70, 10.5), rect(-12, -80, 12, -62)],
         (40, 150, 150), "Sash band + trouser seat; hides both hip balls and the torso waist cap")
add_part("torso", "spine", [poly((-6, -121), (6, -121), (16, -115), (16.5, -108), (15, -96), (14, -88), (15, -76), (-15, -76), (-14, -88), (-15, -96), (-16.5, -108), (-16, -115))],
         (60, 90, 190), "Jacket body + undershirt, NO sleeves, NO collar, NO shoulder pads")
add_part("neck", "neck", [rect(-4, -125, 4, -110)], (200, 140, 100), "Neck stub only")
add_part("collar", "collar", [poly((-12, -113), (-6.5, -128.5), (-3.5, -127), (-4.5, -116), (-6, -110)),
                              poly((12, -113), (6.5, -128.5), (3.5, -127), (4.5, -116), (6, -110))],
         (230, 230, 120), "High open collar flaps (the ONLY collar)")
add_part("head", "head", [ellipse(0, -136, 11.5, 15.5), poly((-10, -128), (10, -128), (6, -120.5), (3, -118.5), (-3, -118.5), (-6, -120.5)),
                          ellipse(-11.5, -133, 2.5, 4), ellipse(11.5, -133, 2.5, 4)],
         (230, 170, 130), "Face, ears, jaw; no hair mass, no collar")
add_part("hair_front", "hair_front", [ellipse(0, -148, 15, 9),
                                      poly((-4, -150), (4, -150), (0.5, -160.2)), poly((-14, -148), (-5, -151), (-11, -158.6)),
                                      poly((5, -151), (14, -148), (12, -157.6)), poly((-15, -143), (-12, -151), (-23.5, -151.5)),
                                      poly((12, -151), (15, -143), (23.5, -152.5)),
                                      poly((-12.5, -147), (12.5, -147), (10, -137), (5, -141.5), (0, -136.5), (-5, -141.5), (-10, -137))],
         (170, 110, 220), "Front spikes + bangs (swap slot)", slot="hair")
add_part("sash_tail_b", "sash_tail_b", [capsule(7.5, -82, 10, -66, 2.5, 2.5)], (240, 200, 40), "Short sash tail")
add_part("sash_tail_a", "sash_tail_a", [capsule(4.5, -82, 3, -63, 2.5, 2.5)], (250, 180, 20), "Long sash tail")
add_part("sash_knot", "sash_knot", [ellipse(6, -83, 6, 4.5)], (255, 220, 90), "Sash knot (covers tail tops)")

for side, dark in (("n", 1.0), ("f", 0.78)):
    def c(rgb): return tuple(int(v * dark) for v in rgb)
    sx = lambda x: side_x(side, x)
    S = lambda shapes: shapes if side == "f" else [mirror_shape(s) for s in shapes]
    add_part(f"shin_{side}", f"shin_{side}", S([capsule(10, -36, 10, -12, 8, 7)]), c((230, 120, 50)), "Lower trouser leg, bottom tucked into boot")
    add_part(f"boot_{side}", f"boot_{side}", S([rect(2.5, -25, 17.5, -8), rect(1, -11, 19, -2), rect(2, -2, 18, 0)]), c((150, 70, 40)), "Solid boot: shaft + foot + sole")
    add_part(f"thigh_{side}", f"thigh_{side}", S([capsule(10, -70, 10, -36, 9.5, 8.5), ellipse(10.5, -52, 11.5, 13.5), rect(0, -70, 19.5, -54)]), c((250, 160, 80)), "Baggy upper trouser leg")
    add_part(f"upper_arm_{side}", f"upper_arm_{side}", S([capsule(19, -110, 19, -89, 7, 6.5)]), c((60, 180, 80)), "Jacket sleeve shoulder->elbow")
    add_part(f"shoulder_trim_{side}", f"shoulder_trim_{side}", S([circle(19, -110, 8)]), c((250, 250, 250)), "Shoulder pad / epaulet (covers shoulder socket)")
    add_part(f"forearm_{side}", f"forearm_{side}", S([capsule(19, -89, 19, -72, 7, 4.5)]), c((110, 220, 120)), "Sleeve end + cuff trim + skin + wraps")
    add_part(f"hand_{side}_fist", f"hand_{side}", S([circle(19, -72, 5), ellipse(19, -66.5, 6, 6)]), c((240, 110, 170)), "Closed wrapped fist", slot="hand")
    add_part(f"hand_{side}_open", f"hand_{side}", S([circle(19, -72, 5), rect(14.5, -72, 23.5, -59), ellipse(14, -66, 2, 4)]), c((200, 90, 230)), "Open hand (fingers down, thumb toward body)",
             slot="hand", default_visible=False)

# ---------------------------------------------------------------- bones
# name: (parent, pivot, tail_direction_or_child)
BONES = {
    "root": (None, (0, 0), (0, -10)),
    "pelvis": ("root", (0, -72), (0, -82)),
    "spine": ("pelvis", (0, -82), (0, -116)),
    "neck": ("spine", (0, -116), (0, -120)),
    "head": ("neck", (0, -120), (0, -140)),
    "hair_back": ("head", (0, -140), (0, -150)),
    "hair_front": ("head", (0, -146), (0, -156)),
    "collar": ("spine", (0, -116), (0, -126)),
    "sash_knot": ("pelvis", (6, -83), (6, -78)),
    "sash_tail_a": ("sash_knot", (4.5, -82), (3, -64)),
    "sash_tail_b": ("sash_knot", (7.5, -82), (10, -66)),
}
for side in ("n", "f"):
    sx = lambda x: side_x(side, x)
    BONES.update({
        f"shoulder_trim_{side}": ("spine", (sx(19), -110), (sx(25), -110)),
        f"upper_arm_{side}": ("spine", (sx(19), -110), (sx(19), -89)),
        f"forearm_{side}": (f"upper_arm_{side}", (sx(19), -89), (sx(19), -72)),
        f"hand_{side}": (f"forearm_{side}", (sx(19), -72), (sx(19), -62)),
        f"thigh_{side}": ("pelvis", (sx(10), -70), (sx(10), -36)),
        f"shin_{side}": (f"thigh_{side}", (sx(10), -36), (sx(10), -12)),
        f"boot_{side}": (f"shin_{side}", (sx(10), -12), (sx(10), -2)),
    })

FOOT_CONTACTS = {f"boot_{s}": [(side_x(s, 2), 0), (side_x(s, 18), 0)] for s in ("n", "f")}  # inner, outer sole corners (rest)

DRAW_ORDER = ["hair_back",
              "shin_f", "boot_f", "thigh_f", "shin_n", "boot_n", "thigh_n",
              "torso", "pelvis", "sash_tail_b", "sash_tail_a", "sash_knot",
              "neck", "collar", "head", "hair_front",
              "upper_arm_f", "shoulder_trim_f", "forearm_f", "hand_f_fist", "hand_f_open",
              "upper_arm_n", "shoulder_trim_n", "forearm_n", "hand_n_fist", "hand_n_open"]
assert sorted(DRAW_ORDER) == sorted(PARTS), set(DRAW_ORDER) ^ set(PARTS)

# Structural covers: which parts are designed to hide part X at its joint/attachment (used for the hidden-zone mask).
JOINT_COVERS = {
    "torso": ["pelvis", "neck", "collar", "shoulder_trim_n", "shoulder_trim_f"],
    "thigh_n": ["pelvis"], "thigh_f": ["pelvis"],
    "shin_n": ["thigh_n", "boot_n"], "shin_f": ["thigh_f", "boot_f"],
    "neck": ["collar", "head"],
    "collar": ["head"],
    "head": ["hair_front"],
    "hair_back": ["head", "hair_front"],
    "pelvis": ["sash_knot"],
    "sash_tail_a": ["sash_knot"], "sash_tail_b": ["sash_knot"],
    "upper_arm_n": ["shoulder_trim_n", "forearm_n"], "upper_arm_f": ["shoulder_trim_f", "forearm_f"],
    "forearm_n": ["hand_n_fist", "hand_n_open"], "forearm_f": ["hand_f_fist", "hand_f_open"],
}

# Joint contract: top part must contain a disk of cover_r around the pivot; under part's cap disk = cap_r.
JOINTS = []
def add_joint(name, bone, top, under, cap_r, cover_r, limits, seam):
    JOINTS.append(dict(name=name, child_bone=bone, top_part=top, under_part=under, cap_radius_px=cap_r,
                       cover_radius_px=cover_r, qa_limits_deg=limits, seam=seam))
add_joint("waist", "spine", "pelvis", "torso", None, None, [-15, 15], "under sash band")
add_joint("neck_base", "neck", "collar", "neck", None, None, [-10, 10], "inside collar")
add_joint("head_tilt", "head", "head", "neck", None, None, [-20, 20], "under jaw; neck skin may show")
for s in ("n", "f"):
    add_joint(f"hip_{s}", f"thigh_{s}", "pelvis", f"thigh_{s}", 9.5, 10.5, [-90, 90], "trouser seat/hip bulge")
    add_joint(f"knee_{s}", f"shin_{s}", f"thigh_{s}", f"shin_{s}", 8.0, 8.5, [-120, 120], "trouser fold at knee")
    add_joint(f"ankle_{s}", f"boot_{s}", f"boot_{s}", f"shin_{s}", 7.0, 7.5, [-45, 45], "boot shaft top")
    add_joint(f"shoulder_{s}", f"upper_arm_{s}", f"shoulder_trim_{s}", f"upper_arm_{s}", 7.0, 8.0, [-180, 180], "under shoulder pad")
    add_joint(f"elbow_{s}", f"forearm_{s}", f"forearm_{s}", f"upper_arm_{s}", 6.5, 7.0, [-150, 150], "sleeve fold at elbow")
    add_joint(f"wrist_{s}", f"hand_{s}", f"hand_{s}_fist", f"forearm_{s}", 4.5, 5.0, [-60, 60], "wrap edge at wrist")
add_joint("sash_tail_a", "sash_tail_a", "sash_knot", "sash_tail_a", 2.5, 3.0, [-30, 30], "inside knot")
add_joint("sash_tail_b", "sash_tail_b", "sash_knot", "sash_tail_b", 2.5, 3.0, [-30, 30], "inside knot")

# ---------------------------------------------------------------- rasterise parts
def raster_part(pid, margin=1):
    """Return (mask bool HxW, origin_x, origin_y) - origin = character-space corner of image pixel (0,0)."""
    shapes = PARTS[pid]["shapes"]
    bbs = [shape_bbox(s) for s in shapes]
    x0 = math.floor(min(b[0] for b in bbs)) - margin; y0 = math.floor(min(b[1] for b in bbs)) - margin
    x1 = math.ceil(max(b[2] for b in bbs)) + margin; y1 = math.ceil(max(b[3] for b in bbs)) + margin
    xs = np.arange(x0, x1) + 0.5; ys = np.arange(y0, y1) + 0.5
    X, Y = np.meshgrid(xs, ys)
    m = np.zeros(X.shape, bool)
    for s in shapes: m |= shape_mask(s, X, Y)
    # trim to content + margin
    yy, xx = np.nonzero(m)
    ty0, ty1, tx0, tx1 = yy.min() - margin, yy.max() + 1 + margin, xx.min() - margin, xx.max() + 1 + margin
    return m[ty0:ty1, tx0:tx1], x0 + tx0, y0 + ty0

# ---------------------------------------------------------------- FK
def rot_m(deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    # CCW on screen with y-down coordinates
    return np.array([[c, s], [-s, c]])

def bone_chain(b):
    out = []
    while b: out.append(b); b = BONES[b][0]
    return out[::-1]

def fk(pose):
    """pose: dict(angles={bone:deg}, root=(dx,dy)). Returns {bone: (A 2x2, t 2)} mapping rest char point p -> posed A@p+t."""
    ang = pose.get("angles", {}); rdx, rdy = pose.get("root", (0, 0))
    W = {}
    for b in BONES:
        A = np.eye(2); t = np.array([rdx, rdy], float)
        for bb in bone_chain(b):
            if bb == "root": continue
            piv = np.array(BONES[bb][1], float); R = rot_m(ang.get(bb, 0.0))
            # p -> piv + R(p - piv), composed after parent transform
            t = A @ (piv - R @ piv) + t; A = A @ R
        W[b] = (A, t)
    return W

def apply(W, b, p): A, t = W[b]; return A @ np.asarray(p, float) + t

def ground_solve(pose, planted=("boot_n", "boot_f")):
    """Shift root vertically so the lowest sole contact of the planted boots is on y=0."""
    p = dict(pose); p["root"] = (pose.get("root", (0, 0))[0], 0.0)
    W = fk(p)
    low = max(apply(W, b, c)[1] for b in planted for c in FOOT_CONTACTS[b])
    p["root"] = (p["root"][0], -low + pose.get("root", (0, 0))[1])
    return p

def visible_parts(pose):
    hands = pose.get("hands", {})
    vis = []
    for pid in DRAW_ORDER:
        P = PARTS[pid]
        if P["slot"] == "hand":
            side = pid.split("_")[1]; want = hands.get(side, "fist")
            if not pid.endswith(want): continue
        vis.append(pid)
    return vis

def render(pose, images, canvas=(CANVAS_W, CANVAS_H), root_canvas=ROOT_CANVAS, ids=False):
    """images: {pid: (rgba uint8 HxWx4, ox, oy)}. Nearest sampling at pixel centres (same rule as Blender 'Closest')."""
    Wc, Hc = canvas
    out = np.zeros((Hc, Wc, 4), np.uint8); idmap = np.full((Hc, Wc), -1, np.int16)
    W = fk(pose)
    cx = np.arange(Wc) + 0.5 - root_canvas[0]; cy = np.arange(Hc) + 0.5 - root_canvas[1]
    CX, CY = np.meshgrid(cx, cy)
    for idx, pid in enumerate(DRAW_ORDER):
        if pid not in visible_parts(pose): continue
        img, ox, oy = images[pid]
        A, t = W[PARTS[pid]["bone"]]
        Ai = np.linalg.inv(A)
        px = Ai[0, 0] * (CX - t[0]) + Ai[0, 1] * (CY - t[1])
        py = Ai[1, 0] * (CX - t[0]) + Ai[1, 1] * (CY - t[1])
        u = np.floor(px - ox + 1e-7).astype(int); v = np.floor(py - oy + 1e-7).astype(int)
        h, w = img.shape[:2]
        ok = (u >= 0) & (u < w) & (v >= 0) & (v < h)
        src = np.zeros((Hc, Wc, 4), np.uint8)
        src[ok] = img[v[ok], u[ok]]
        sel = src[..., 3] > 0
        out[sel] = src[sel]; idmap[sel] = idx
    return (out, idmap) if ids else out

# ---------------------------------------------------------------- QA poses
def mirror_angles(d):
    """Write angles once for the near side using 'abduction' sign (+ = away from body). Returns signed angles."""
    out = {}
    for k, v in d.items():
        if k.endswith("_N"): out[k[:-2] + "_n"] = -v
        elif k.endswith("_F"): out[k[:-2] + "_f"] = v
        elif k.endswith("_B"): out[k[:-2] + "_n"] = -v; out[k[:-2] + "_f"] = v
        else: out[k] = v
    return out

def P(name, group, angles, hands=None, planted=("boot_n", "boot_f"), note=""):
    pose = ground_solve({"angles": mirror_angles(angles)}, planted)
    pose.update(name=name, group=group, hands=hands or {}, planted=list(planted), note=note)
    return pose

# '+' with _N/_F/_B suffix = outward (abduction) for arms/legs, i.e. away from the body centre line.
QA_POSES = [
    P("neutral", "neutral", {}),
    P("arms_T", "arms", {"upper_arm_B": 90}, note="both shoulders 90 deg out"),
    P("arms_raised", "arms", {"upper_arm_B": 165, "forearm_B": 10}, hands={"n": "open", "f": "open"}, note="shoulders 165, open hands"),
    P("arms_guard", "arms", {"upper_arm_B": 25, "forearm_B": -145, "hand_B": -20}, note="elbows 145 flex, wrists -20"),
    P("punch_out_near", "arms", {"upper_arm_N": 95, "forearm_N": 0, "hand_N": 0, "upper_arm_F": 20, "forearm_F": -135}, note="near arm straight punch to the side, far guard"),
    P("cross_body_near", "arms", {"upper_arm_N": -70, "forearm_N": -60, "upper_arm_F": -60, "forearm_F": -70},
      note="both arms across the chest (near over far)"),
    P("wrist_extremes", "arms", {"upper_arm_N": 40, "hand_N": 60, "upper_arm_F": 40, "hand_F": -60}, note="wrists +/-60"),
    P("elbow_max", "arms", {"upper_arm_B": 10, "forearm_B": 150}, note="elbows 150 outward flex"),
    P("wide_stance", "legs", {"thigh_B": 25, "boot_B": -25}, note="hips 25 out, soles kept flat"),
    P("crouch_knees_out", "legs", {"thigh_B": 40, "shin_B": -65, "boot_B": 25, "spine": 0}, note="hips 40, knees 65 flex, ankles flat"),
    P("step_near_lift", "legs", {"thigh_N": 12, "shin_N": -50, "boot_N": 38, "thigh_F": 4, "boot_F": -4}, planted=("boot_f",),
      note="near foot lifted (in-plane only)"),
    P("side_kick_near", "legs", {"thigh_N": 85, "shin_N": -25, "boot_N": -30, "upper_arm_B": 30, "forearm_B": -120}, planted=("boot_f",),
      note="near hip 85, knee 25"),
    P("ankle_extremes", "legs", {"boot_N": 40, "boot_F": -40, "thigh_B": 8}, planted=("boot_n",), note="ankles +/-40 (QA only, feet not flat)"),
    P("legs_crossed", "overlap", {"thigh_N": -22, "shin_N": 8, "boot_N": 14, "thigh_F": 6, "boot_F": -6, "spine": 4}, planted=("boot_n",), note="near leg crosses in front of far leg; far foot sits higher = further from camera"),
    P("overlap_torso_twist", "overlap", {"spine": 15, "neck": -6, "head": -12, "upper_arm_N": -45, "forearm_N": -100, "upper_arm_F": 70, "forearm_F": -40,
                                        "sash_tail_a": 25, "sash_tail_b": 30}, note="waist 15, head -18, sash swung"),
    P("overlap_waist_neg", "overlap", {"spine": -15, "head": 20, "sash_tail_a": -30, "sash_tail_b": -30, "upper_arm_F": -30, "forearm_F": -110},
      note="waist -15, head +20, far arm across"),
]

def cycle(name, n, fn, group="debug"):
    return [dict(fn(i, n), name=f"{name}_{i:02d}", group=group) for i in range(n)]

def _idle(i, n):
    s = math.sin(2 * math.pi * i / n)
    p = P("", "", {"spine": 1.5 * s, "head": -1.5 * s, "upper_arm_B": 6 + 3 * s, "forearm_B": -8 - 4 * s, "sash_tail_a": 4 * s, "sash_tail_b": 5 * s})
    return p

def _step(i, n):
    ph = 2 * math.pi * i / n; s = math.sin(ph)
    ln = max(0.0, s); lf = max(0.0, -s)
    a = {"thigh_N": 4 + 8 * ln, "shin_N": -40 * ln, "boot_N": 30 * ln, "thigh_F": 4 + 8 * lf, "shin_F": -40 * lf, "boot_F": 30 * lf,
         "upper_arm_N": 10 + 12 * s, "forearm_N": -20, "upper_arm_F": 10 - 12 * s, "forearm_F": -20, "spine": 2 * s, "head": -2 * s,
         "sash_tail_a": 10 * s, "sash_tail_b": 12 * s}
    planted = ("boot_f",) if ln > 0.05 else (("boot_n",) if lf > 0.05 else ("boot_n", "boot_f"))
    return P("", "", a, planted=planted)

def _jab(i, n):
    k = [0, 0.35, 1.0, 1.0, 0.5, 0.0][i]
    a = {"upper_arm_N": 25 + 75 * k, "forearm_N": -145 * (1 - k), "hand_N": -20 * (1 - k), "upper_arm_F": 25, "forearm_F": -145, "hand_F": -20,
         "spine": -6 * k, "head": 4 * k, "thigh_B": 14, "boot_B": -14}
    return P("", "", a)

DEBUG_CLIPS = {"idle": cycle("idle", 8, _idle), "step": cycle("step", 8, _step), "jab": cycle("jab", 6, _jab)}

"""Idle / Run / BasicPunch for Kai NORTH / EAST / WEST: the SOUTH solver generalised (world-space limb directions + lengths, screen-space leg IK).
Angles: 0 = pointing down the screen, + = toward screen-right. EAST is authored; WEST mirrors it (left-right flipped POSES, never the art);
NORTH has its own back-view tables. Set KAI_DIR before importing (see drig.py)."""
import copy, json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import drig as r

CFG = r.CFG; D = r.DIRECTION; S = CFG["spec"]; SOLE_DY = CFG["sole_dy"]; RX, RY = r.ROOT
SX = S["facing"]; LEAD, REAR = S["lead"], S["rear"]
REST = {b: (np.array(h, float), np.array(t, float)) for b, (p, h, t) in r.BONES.items()}
def rest_ang(b): v = REST[b][1] - REST[b][0]; return math.degrees(math.atan2(v[0], v[1]))
def rest_len(b): return float(np.linalg.norm(REST[b][1] - REST[b][0]))
ART_LEN = {p["bone"]: float(np.linalg.norm(np.array(p["child"]) - np.array(p["pivot"]))) for p in r.PARTS if "child" in p}
POINT = {p["id"]: p["point"] for p in r.PARTS if "point" in p}
LU = {s: rest_len(f"upper_arm_{s}") for s in "nf"}; LF = {s: rest_len(f"forearm_{s}") for s in "nf"}

def set_dir(ch, W, b, ang, length, cap=1.02):
    length = min(length, ART_LEN.get(b, length) * cap)
    ch[b]["rot"] = ang - rest_ang(b) - r.world_angle(W, r.BONES[b][0]); ch[b]["sy"] = length / rest_len(b)

def knee(hip, ankle, L1, L2, want_dir):
    d = ankle - hip; D_ = float(np.linalg.norm(d)); D_ = min(max(D_, abs(L1 - L2) + 1e-3), L1 + L2 - 1e-3)
    a = (L1 * L1 - L2 * L2 + D_ * D_) / (2 * D_); h = math.sqrt(max(0.0, L1 * L1 - a * a))
    u = d / np.linalg.norm(d); n = np.array([u[1], -u[0]]); c = [hip + u * a + sgn * n * h for sgn in (1, -1)]
    if want_dir == "up": return min(c, key=lambda k: k[1])     # lying poses: the knee that points up the screen
    return max(c, key=lambda k: want_dir * k[0])        # the knee that bends toward the wanted screen side

# Stance targets read from the direction anchor (anchor native px -> canvas: X = RX + SX*(ax-40), Y = ay+5). EAST measurements; WEST is the same pose mirrored.
PAD = float(__import__('os').environ.get('KAI_PAD_TOP', '0'))   # Form II headroom
def canv(ax, ay): return (RX + SX * (ax - 40.0), ay + 5.0 + PAD)
if D in ("east", "west"):
    TGT = {"hips": canv(40, 86), "waist": canv(40, 65), "neck": canv(46, 42)}; BASE_LEAN = -SX * 10.0
else:
    def canvN(ax, ay): return (RX + (ax - 42.0), ay + 8.0 + PAD)          # NORTH anchor native px -> canvas
    TGT = {"hips": canvN(42, 86), "waist": canvN(42, 66), "neck": canvN(44, 40)}; BASE_LEAN = 0.0
PEL_OFF = (0, 0); CHEST_OFF = (0, 0); HEAD_OFF = (0, 0)

def hand_slot(pose, s):
    a = pose.get(f"arm_{s}", {}); return a.get("slot") or CFG["default_slots"][f"hand_{s}"]

def solve(pose):
    ch = {b: {} for b in r.BONES}
    if "root" in pose or "root_rot" in pose: ch["root"] = {"loc": tuple(pose.get("root", (0, 0))), "rot": pose.get("root_rot", 0.0)}
    px_, py_ = pose.get("pelvis", (0, 0)); cx_, cy_ = pose.get("chest", (0, 0)); hx, hy = pose.get("head", (0, 0))
    ch["pelvis"] = {"loc": (px_ + PEL_OFF[0], py_ + PEL_OFF[1]), "rot": pose.get("pelvis_rot", 0.0)}
    ch["spine"] = {"loc": (cx_ + CHEST_OFF[0], cy_ + CHEST_OFF[1]), "rot": pose.get("spine_rot", 0.0) + BASE_LEAN}
    ch["head"] = {"loc": (hx + HEAD_OFF[0], hy + HEAD_OFF[1]), "rot": pose.get("head_rot", 0.0)}
    ch["sash"] = {"rot": pose.get("sash", 0.0)}
    if "hair" in r.BONES: ch["hair"] = {"rot": pose.get("hair", 0.0)}
    W = r.fk(ch)
    if "hip_target" in pose:       # pivot the whole body (root) so the pelvis joint lands on this canvas point
        p0 = r.apply(W, "pelvis", REST["pelvis"][0]); ch["root"] = dict(ch.get("root", {}), loc=tuple(np.array(pose["hip_target"], float) - p0)); W = r.fk(ch)
    for s in "nf":
        a = pose.get(f"arm_{s}")
        if not a: continue
        set_dir(ch, W, f"upper_arm_{s}", *a["u"], cap=a.get("cap", 1.02)); W = r.fk(ch)
        set_dir(ch, W, f"forearm_{s}", *a["f"], cap=a.get("cap", 1.02)); W = r.fk(ch)
        hw = a["f"][0] - POINT[f"fist_{hand_slot(pose, s)}_{s}"] + a.get("hand", 0.0)      # the fist art continues along the forearm
        ch[f"hand_{s}"]["rot"] = hw - r.world_angle(W, f"forearm_{s}"); W = r.fk(ch)
    errs = {}
    for s in "nf":
        g = pose.get(f"leg_{s}")
        if not g: continue
        hip = r.apply(W, "pelvis", REST[f"thigh_{s}"][0]); ankle = np.array(g["sole"], float) - np.array([0.0, SOLE_DY])
        L1 = rest_len(f"thigh_{s}") * g.get("fs_t", 1.0); L2 = rest_len(f"shin_{s}") * g.get("fs_s", 1.0)
        if g.get("straight"):
            Dd = float(np.linalg.norm(ankle - hip)); k = (Dd + g.get("slack", 1.5)) / (L1 + L2); L1, L2 = L1 * k, L2 * k
        L1 = min(L1, ART_LEN[f"thigh_{s}"] * 1.02); L2 = min(L2, ART_LEN[f"shin_{s}"] * 1.02)
        kn = knee(hip, ankle, L1, L2, g.get("dir", S["knee_dir"][s]))
        vt = kn - hip; set_dir(ch, W, f"thigh_{s}", math.degrees(math.atan2(vt[0], vt[1])), float(np.linalg.norm(vt)), cap=1.3); W = r.fk(ch)
        vs = ankle - kn; set_dir(ch, W, f"shin_{s}", math.degrees(math.atan2(vs[0], vs[1])), float(np.linalg.norm(vs)), cap=1.3); W = r.fk(ch)
        ch[f"boot_{s}"]["rot"] = g.get("foot", 0.0) - r.world_angle(W, f"shin_{s}"); W = r.fk(ch)
        got = r.apply(W, f"boot_{s}", REST[f"boot_{s}"][0]) + np.array([0.0, SOLE_DY])
        if g.get("planted", True): errs[s] = float(np.linalg.norm(got - np.array(g["sole"], float)))
    order = None
    if pose.get("far_leg_front"):
        ids = [p["id"] for p in r.PARTS]; order = {i: k for k, i in enumerate(ids)}
        for a_, b_ in (("shin_f", "shin_n"), ("boot_f", "boot_n"), ("thigh_f", "thigh_n")): order[a_], order[b_] = order[b_], order[a_]
    return ch, order, errs

def arm(u_ang, u_len, f_ang, f_len, hand=0.0, slot=None, cap=None):
    d = {"u": (u_ang, u_len), "f": (f_ang, f_len), "hand": hand}
    if slot: d["slot"] = slot
    if cap: d["cap"] = cap
    return d

def lerp(a, b, t): return a + (b - a) * t
HIP_H = 69.0
H0 = max(rest_len(f"thigh_{s}") + rest_len(f"shin_{s}") for s in "nf")
PEL_DY = round(H0 + SOLE_DY - HIP_H)
def _calibrate():
    global PEL_OFF, CHEST_OFF, HEAD_OFF
    if TGT is None: return
    mid = (REST["thigh_n"][0] + REST["thigh_f"][0]) / 2; PEL_OFF = tuple(int(round(v)) for v in np.array(TGT["hips"]) - mid)
    ch = {b: {} for b in r.BONES}; ch["pelvis"] = {"loc": PEL_OFF}; ch["spine"] = {"rot": BASE_LEAN}
    W = r.fk(ch); CHEST_OFF = tuple(int(round(v)) for v in np.array(TGT["waist"]) - r.apply(W, "spine", REST["spine"][0]))
    ch["spine"]["loc"] = CHEST_OFF; W = r.fk(ch); HEAD_OFF = tuple(int(round(v)) for v in np.array(TGT["neck"]) - r.apply(W, "head", REST["head"][0]))
_calibrate()

# ------------------------------------------------------------------ stance (the approved crouched fighting stance seen from this direction)
if D in ("east", "west"):
    SOLES = {REAR: canv(14, 157), LEAD: canv(60, 133)}      # rear foot low and back, lead foot forward and higher (further from the camera)
else:
    SOLES = {"n": canvN(13, 153), "f": canvN(72, 156)}
def stance_arms():
    """(lead guard, rear waist) arm dicts for this direction."""
    if D in ("east", "west"):
        lead = arm(SX * (28.3 if D == "east" else 38.0), 15.0, SX * (132.0 if D == "east" else 112.0), 13.5, SX * (56.0 if D == "east" else 62.0), "guard", 1.3); rear = arm(-SX * 46.8, 22.0, SX * 40.2, 17.0, SX * 40.0, "side", 1.3)
    else:
        # rear view: the guard hand is in front of the chest, so the near arm is foreshortened (forearm folded in behind the jacket) and the far arm is a relaxed hand-on-hip; back-of-hand fists only
        lead = arm(-26.0, LU["n"] * 0.92, 168.0, LF["n"] * 0.4, 0.0, "side", 1.3); rear = arm(40.0, LU["f"] * 0.98, -48.0, LF["f"] * 0.86, 0.0, "side", 1.3)
    return lead, rear
LEAD_GUARD, REAR_WAIST = stance_arms()

def stance():
    p = {"pelvis": (0, 0), "chest": (0, 0), "head": (0, 0), "sash": 0.0, "leg_n": {"sole": SOLES["n"]}, "leg_f": {"sole": SOLES["f"]}}
    p[f"arm_{LEAD}"] = copy.deepcopy(LEAD_GUARD); p[f"arm_{REAR}"] = copy.deepcopy(REAR_WAIST); return p

import os as _os
_MOT = _os.environ.get("KAI_MOTION", "base")   # B21: per-form motion character (base | flare | comet | still); the form build scripts set it
_ST = {"base": dict(A=0.85, bounce=0.0, tension=0.0, arm=1.0, sash=1.0, breath=1.0, run=1.0),
       "flare": dict(A=0.95, bounce=0.8, tension=0.0, arm=1.3, sash=1.4, breath=1.0, run=1.1),
       "comet": dict(A=0.6, bounce=0.0, tension=1.0, arm=0.6, sash=1.2, breath=0.7, run=1.3),
       "still": dict(A=0.5, bounce=0.0, tension=0.0, arm=1.2, sash=1.8, breath=1.5, run=1.0)}[_MOT]
def idle():
    """B21: weight shift over the 16-frame loop (loaded hip sinks), slow chest breath, lagging head/fists, swaying sash; feet stay planted."""
    fr = []
    for i in range(16):
        t = 2 * math.pi * i / 16; sh = math.sin(t - 0.4); br = math.sin(t - 1.2); lag = lambda d: math.sin(t - d); p = stance()
        p["pelvis"] = (round(1.5 * _ST["A"] * sh), round(0.9 * _ST["A"] * abs(sh) + (0.6 if br < -0.5 else 0) + _ST["bounce"] * (1 + math.sin(2 * t + 0.5)) / 2 + _ST["tension"]))
        p["chest"] = (round(-1.0 * _ST["A"] * sh + _ST["tension"] * SX * (D != "north")), (-2 if br > 0.92 and _ST["breath"] > 1.2 else -1) if br > 0.4 / _ST["breath"] else (1 if br < -0.8 else 0))
        p["spine_rot"] = 1.6 * lag(0.9) * SX; p["head"] = (round(0.7 * lag(1.2)), -1 if br > 0.55 else 0); p["head_rot"] = 1.4 * lag(1.5) * SX
        for s in "nf":
            a = p[f"arm_{s}"]; ph = 0.8 if s == LEAD else 1.1
            a["u"] = (a["u"][0] + _ST["arm"] * (2.4 * math.sin(t - ph) + 0.6 * br), a["u"][1]); a["f"] = (a["f"][0] + _ST["arm"] * 3.6 * math.sin(t - ph - 0.5), a["f"][1])
        p["sash"] = 6.0 * _ST["sash"] * lag(2.0 + (0.6 if _MOT == "still" else 0)) * SX; fr.append(p)
    return {"name": "Idle", "fps": 10, "loop": True, "frames": fr, "events": {}}

# ------------------------------------------------------------------ Run
# profile legs: (dx forward, dy lift(-)/plant, thigh factor, shin factor, planted); dx is multiplied by the facing sign
PROFILE_LEG = [(21, 0, 1.0, 1.0, True), (13, 0, 0.97, 0.97, True), (3, 0, 1.0, 1.0, True), (-11, 0, 1.0, 1.0, True),
               (-21, -10, 0.95, 0.85, False), (-3, -24, 0.9, 0.95, False), (14, -14, 0.9, 1.0, False), (21, -4, 0.97, 1.0, False)]
# back-view legs (from the SOUTH table with the depth sense reversed: the foot reaching forward is further away = higher on screen)
BACK_LEG = [(1, -7, 0.96, 0.96, True), (1, -3, 0.95, 0.97, True), (1, 0, 1.0, 1.0, True), (1, 3, 1.03, 1.03, True),
            (0, 2, 0.95, 0.85, False), (-2, -12, 0.74, 0.86, False), (-2, -15, 0.72, 0.95, False), (0, -11, 0.88, 1.0, False)]
HIP_DY = [1, 3, 1, -2, 1, 3, 1, -2] if _MOT in ("base", "flare") else [2, 4, 2, -1, 2, 4, 2, -1]   # B21: Cometheart ~1 px lower (coiled)

def run():
    fr = []
    for i in range(8):
        p = stance(); ph = 2 * math.pi * i / 8; c = math.cos(ph)
        for s, off in (("n", 0), ("f", 4)):
            dx, dy, ft, fs, planted = (PROFILE_LEG if D != "north" else BACK_LEG)[(i + off) % 8]
            if D == "north": o = -1 if s == "n" else 1; bx, by = RX + o * 11, RY - 2; sole = (bx + o * dx, by + dy)
            else: bx = RX + (-3 if s == "n" else 3) * SX; by = RY + (2 if s == "n" else -2); sole = (bx + SX * dx, by + dy)
            p[f"leg_{s}"] = {"sole": sole, "fs_t": ft, "fs_s": fs, "planted": planted, "straight": True, "slack": 2.0 if planted else 3.0}
        p["pelvis"] = (round(1.0 * c * SX), (7 if D != "north" else 0) + HIP_DY[i]); p["chest"] = (round(-1.0 * c * SX), HIP_DY[i] // 2 + 1)
        if D == "north": p["pelvis"] = (round(2.0 * math.sin(ph + 1.57)), HIP_DY[i]); p["chest"] = (round(-1.0 * math.sin(ph + 1.57)), HIP_DY[i] // 2 + 1)   # weight shift over the planted foot
        p["spine_rot"] = -SX * 1.0 + 2.8 * _ST["run"] * c; p["head"] = (0, 2); p["head_rot"] = -1.3 * _ST["run"] * c; p["sash"] = 12.0 * math.sin(ph - 1.4) * SX
        for s in "nf":
            fw = (1 - c) / 2 if s == "n" else (1 + c) / 2          # forwardness 0..1 of this arm
            if D == "north":
                # carried arm swing seen from behind: the arm swinging BACK (toward the camera) hangs long beside the hip with the back of the fist showing;
                # the arm swinging FORWARD (away from the camera) is foreshortened and folds in and up behind the jacket (hand never faces the camera)
                o = -1 if s == "n" else 1
                p[f"arm_{s}"] = arm(o * lerp(16, 9, fw), lerp(LU[s] * 1.0, LU[s] * 0.74, fw), o * (lerp(8, 34, fw / 0.6) if fw < 0.6 else lerp(34, -128, ((fw - 0.6) / 0.4) ** 0.8)), lerp(LF[s] * 1.0, LF[s] * 0.5, max(0.0, (fw - 0.45) / 0.55)), 0.0, "side")   # passes OUTSIDE the hip, folds in only at the far end
            else:
                p[f"arm_{s}"] = arm(SX * lerp(-45, 42, fw), LU[s], SX * lerp(20, 135 if D == "east" else 104, fw), LF[s], 0.0, "side")   # WEST: the swinging near fist stays below the jaw
        fr.append(p)
    return {"name": "Run", "fps": 14, "loop": True, "frames": fr, "events": {"foot_contact_near": 0, "foot_contact_far": 4}}

# ------------------------------------------------------------------ BasicPunch (impact on 0-based frame 5, held through 6)
def punch():
    sx = SX; L = LEAD; R = REAR; Lu, Lf = LU[L], LF[L]
    lead_g = copy.deepcopy(LEAD_GUARD); rear = lambda d=0: arm(REAR_WAIST["u"][0] - sx * d if D != "north" else REAR_WAIST["u"][0] + d, LU[R], REAR_WAIST["f"][0], LF[R], 0.0, "side")
    TUCK = arm(sx * 20, Lu * 0.8, -sx * 158, Lf * 0.7, 0.0, "guard"); LOAD = arm(sx * 28, Lu * 0.75, -sx * 164, Lf * 0.65, 0.0, "guard")
    ext = lambda a, b, cap=None: arm(sx * a, Lu, sx * b, Lf, 0.0, "side", cap)
    lead_leg = f"leg_{L}"; fwd = lambda dx: {"sole": (SOLES[L][0] + sx * dx, SOLES[L][1])}
    k = [
        {},
        {"pelvis": (-2 * sx, 2), "chest": (-3 * sx, 1), "head": (-1 * sx, 1), "spine_rot": sx * 4, f"arm_{L}": TUCK, f"arm_{R}": rear(6), "sash": 4 * sx},
        {"pelvis": (-4 * sx, 4), "chest": (-6 * sx, 3), "head": (-2 * sx, 2), "spine_rot": sx * 9, f"arm_{L}": LOAD, f"arm_{R}": rear(12), "sash": 8 * sx},
        {"pelvis": (-5 * sx, 5), "chest": (-7 * sx, 4), "head": (-3 * sx, 3), "spine_rot": sx * 11, f"arm_{L}": LOAD, f"arm_{R}": rear(14), "sash": 10 * sx},
        {"pelvis": (3 * sx, 3), "chest": (3 * sx, 2), "head": (1 * sx, 2), "spine_rot": -sx * 5, lead_leg: fwd(4), f"arm_{L}": ext(62, 82), f"arm_{R}": rear(8), "sash": -8 * sx},
        {"pelvis": (5 * sx, 3), "chest": (6 * sx, 2), "head": (3 * sx, 2), "spine_rot": -sx * 9, lead_leg: fwd(4), f"arm_{L}": ext(80, 90, 1.22), f"arm_{R}": rear(2), "sash": -18 * sx},
        {"pelvis": (6 * sx, 4), "chest": (7 * sx, 3), "head": (4 * sx, 3), "spine_rot": -sx * 10, lead_leg: fwd(4), f"arm_{L}": ext(82, 91, 1.22), f"arm_{R}": rear(0), "sash": -22 * sx},
        {"pelvis": (4 * sx, 3), "chest": (5 * sx, 2), "head": (2 * sx, 2), "spine_rot": -sx * 6, lead_leg: fwd(4), f"arm_{L}": ext(58, 108), f"arm_{R}": rear(2), "sash": -14 * sx},
        {"pelvis": (2 * sx, 3), "chest": (2 * sx, 2), "head": (1 * sx, 1), "spine_rot": -sx * 2, lead_leg: fwd(4), f"arm_{L}": arm(sx * 34, Lu * 0.85, -sx * 130, Lf * 0.7, 0.0, "guard"), f"arm_{R}": rear(4), "sash": -6 * sx},
        {"pelvis": (1 * sx, 2), "chest": (1 * sx, 1), "spine_rot": 0, lead_leg: fwd(2), f"arm_{L}": lead_g, f"arm_{R}": rear(2), "sash": 4 * sx},
        {"pelvis": (0, 1), "chest": (0, 1), f"arm_{L}": lead_g, f"arm_{R}": rear(0), "sash": 5 * sx},
        {"pelvis": (0, 1), f"arm_{L}": lead_g, f"arm_{R}": rear(0), "sash": 2 * sx},
        {"pelvis": (0, 0), f"arm_{R}": rear(0), "sash": -1 * sx},
        {},
    ]
    fr = []
    for kk in k:
        p = stance()
        for key, v in kk.items(): p[key] = v
        fr.append(p)
    return {"name": "BasicPunch", "fps": 16, "loop": False, "frames": fr, "events": {"anticipation_start": 1, "impact": 5, "recover_start": 8, "interruptible_from": 11}}

# ------------------------------------------------------------------ B12-pre: moving attack as two LAYERS of the same rig (no pixel crop)
# RunLower = legs + hips of the Run cycle; RunPunchUpper = everything else, one 8-frame leg-phase block per strike step (frame = step * 8 + leg phase), so the torso bob and
# pelvis sway always match the legs. The runtime draws the lower layer first and the upper layer over it, joined under the jacket hem.
PUNCH_STEPS = (1, 3, 4, 5, 7, 9)        # BasicPunch keyframes reused: tuck, load, launch, IMPACT, recover, guard
def run_lower():
    c = run(); fr = []
    for p in c["frames"]: q = copy.deepcopy(p); q["layer"] = 1; fr.append(q)
    return {"name": "RunLower", "fps": 14, "loop": True, "frames": fr, "events": {}}
def run_punch_upper():
    base = run()["frames"]; pk = punch()["frames"]; fr = []
    for kk in PUNCH_STEPS:
        src = pk[kk]
        for i in range(8):
            p = copy.deepcopy(base[i]); p["layer"] = 2
            if f"arm_{LEAD}" in src: p[f"arm_{LEAD}"] = copy.deepcopy(src[f"arm_{LEAD}"])
            p["spine_rot"] = p.get("spine_rot", 0.0) + 0.7 * src.get("spine_rot", 0.0)
            cx, cy = src.get("chest", (0, 0)); p["chest"] = (p["chest"][0] + round(0.5 * cx), p["chest"][1]); p["head"] = (p["head"][0] + round(0.5 * src.get("head", (0, 0))[0]), p["head"][1])
            p["sash"] = 0.5 * p["sash"] + 0.8 * src.get("sash", 0.0)
            fr.append(p)
    return {"name": "RunPunchUpper", "fps": 16, "loop": False, "frames": fr, "events": {"impact": 3 * 8}}
CLIPS = [idle, run, punch, run_lower, run_punch_upper]
import danim_b03g  # noqa: E402  (B03G clips; appended to CLIPS below)
CLIPS += danim_b03g.CLIPS
import danim_form  # noqa: E402  (Form I: hair follow-through + Transform clip; no-ops for the base build)
CLIPS += danim_form.CLIPS
import danim_b05  # noqa: E402  (B05: Beam + Sphere signature abilities, base and Form I)
CLIPS += danim_b05.CLIPS

if r.F3:        # Form III (Stillfire Apex): levitation layer over the Form II poses (form-iii/scripts/hover3.py); every clip name and event the runtime knows stays
    sys.path.insert(0, os.environ["KAI_F3_SCRIPTS"]); import hover3
    _idle_raw = idle(); _run_raw = run()["frames"]; _punch_raw = punch(); _ctx = hover3.Ctx(D, SX if D in ("east", "west") else 0, _idle_raw["frames"])
    def _wrap(fn):
        def w():
            c = fn(); nm = c["name"]
            if nm == "Transform": return hover3.transform3(c, _ctx)
            if nm == "Sphere": return hover3.sphere3(_ctx, _punch_raw)
            c = hover3.hoverize(nm, c, _ctx, _run_raw)
            return hover3.beam_events(c) if nm == "Beam" else c
        return w
    CLIPS = [_wrap(f) for f in CLIPS] + [lambda: hover3.idle_special(_ctx, _idle_raw)]

def slots_of(p):
    s = {f"hand_{s}": hand_slot(p, s) for s in "nf"}; s["layer"] = p.get("layer", 0)
    if r.FORM == "f1": s["form"] = p.get("form_slot", "f1")
    return s

LINING_HIDE = ()
def solve_clip(c):
    out = []
    frames = danim_form.with_hair(c) if "hair" in r.BONES else c["frames"]
    for p in frames:
        ch, order, errs = solve(p); out.append((ch, order, errs, slots_of(p)))
    return out

def export(path):
    data = {"clips": []}
    for fn in CLIPS:
        c = fn(); frames = []
        for ch, order, errs, slots in solve_clip(c):
            frames.append({"bones": {b: {"rot": round(v.get("rot", 0.0), 5), "loc": list(v.get("loc", (0, 0))), "sy": round(v.get("sy", 1.0), 5)} for b, v in ch.items()},
                           "far_leg_front": 1 if order else 0, "slots": slots, "planted_err": errs})
        data["clips"].append({"name": c["name"], "fps": c["fps"], "loop": c["loop"], "events": c["events"], "frames": frames})
    json.dump(data, open(path, "w"), indent=1); return data

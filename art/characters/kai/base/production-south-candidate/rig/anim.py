"""Kai SOUTH clips (Idle / Run / BasicPunch) authored as world-space limb directions + lengths on top of the approved
rest stance. Angles: 0 = pointing down the screen, + = toward screen-right. Lengths in native px. Feet: sole targets in
canvas px, solved with screen-space 2-bone IK so planted soles never slide."""
import copy, json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rig as r

SOLE_DY = 18.0
REST = {b: (np.array(h, float), np.array(t, float)) for b, (p, h, t) in r.BONES.items()}
def rest_ang(b): v = REST[b][1] - REST[b][0]; return math.degrees(math.atan2(v[0], v[1]))
def rest_len(b): return float(np.linalg.norm(REST[b][1] - REST[b][0]))
ART_LEN = {}
for p in r.PARTS:
    if "child" in p: ART_LEN[p["bone"]] = float(np.linalg.norm(np.array(p["child"]) - np.array(p["pivot"])))

def set_dir(ch, W, b, ang, length):
    """Point bone b along world angle `ang` with on-screen length `length` (never longer than its art)."""
    length = min(length, ART_LEN.get(b, length) * 1.02)
    par = r.BONES[b][0]
    ch[b]["rot"] = ang - rest_ang(b) - r.world_angle(W, par)
    ch[b]["sy"] = length / rest_len(b)

def ik2(hip, ankle, L1, L2, bend):
    """Screen-space 2-bone IK. bend = +1 knee to the right of hip->ankle, -1 to the left. Returns knee point."""
    d = ankle - hip; D = float(np.linalg.norm(d)); D = min(max(D, abs(L1 - L2) + 1e-3), L1 + L2 - 1e-3)
    a = (L1 * L1 - L2 * L2 + D * D) / (2 * D); h = math.sqrt(max(0.0, L1 * L1 - a * a))
    u = d / np.linalg.norm(d); n = np.array([u[1], -u[0]])          # n points right of travel when moving down
    return hip + u * a + bend * n * h

def solve(pose):
    ch = {b: {} for b in r.BONES}
    ch["pelvis"] = {"loc": tuple(pose.get("pelvis", (0, 0))), "rot": pose.get("pelvis_rot", 0.0)}
    ch["spine"] = {"loc": tuple(pose.get("chest", (0, 0))), "rot": pose.get("spine_rot", 0.0)}
    ch["head"] = {"loc": tuple(pose.get("head", (0, 0))), "rot": pose.get("head_rot", 0.0)}
    ch["sash"] = {"rot": pose.get("sash", 0.0)}
    W = r.fk(ch)
    # arms (world direction + length per segment), hands: slot + world angle
    for s in ("n", "f"):
        a = pose.get(f"arm_{s}")
        if not a: continue
        set_dir(ch, W, f"upper_arm_{s}", *a["u"]); W = r.fk(ch)
        set_dir(ch, W, f"forearm_{s}", *a["f"]); W = r.fk(ch)
        # the fist follows the forearm: it turns by the forearm's change from the approved rest direction (the rest pose already holds
        # the reference wrist bend) plus a small wrist offset. Front-on / angled punch fists stay upright (absolute).
        if a.get("slot") in ("front", "angle"): hw = a.get("hand", 0.0)
        else: hw = a["f"][0] - ARM_REST[s]["f"][0] + a.get("hand", 0.0)
        ch[f"hand_{s}"]["rot"] = hw - r.world_angle(W, f"forearm_{s}")
        W = r.fk(ch)
    # legs
    errs = {}
    for s in ("n", "f"):
        g = pose.get(f"leg_{s}")
        if not g: continue
        hip = r.apply(W, "pelvis", REST[f"thigh_{s}"][0])
        ankle = np.array(g["sole"], float) - np.array([0.0, SOLE_DY])
        L1 = rest_len(f"thigh_{s}") * g.get("fs_t", 1.0); L2 = rest_len(f"shin_{s}") * g.get("fs_s", 1.0)
        if g.get("straight"):
            D = float(np.linalg.norm(ankle - hip)); k = (D + g.get("slack", 1.5)) / (L1 + L2); L1, L2 = L1 * k, L2 * k
        L1 = min(L1, ART_LEN[f"thigh_{s}"]); L2 = min(L2, ART_LEN[f"shin_{s}"])
        knee = ik2(hip, ankle, L1, L2, g.get("bend", -1 if s == "n" else 1))
        vt = knee - hip; set_dir(ch, W, f"thigh_{s}", math.degrees(math.atan2(vt[0], vt[1])), float(np.linalg.norm(vt))); W = r.fk(ch)
        vs = ankle - knee; set_dir(ch, W, f"shin_{s}", math.degrees(math.atan2(vs[0], vs[1])), float(np.linalg.norm(vs))); W = r.fk(ch)
        ch[f"boot_{s}"]["rot"] = g.get("foot", 0.0) - r.world_angle(W, f"shin_{s}"); W = r.fk(ch)
        got = r.apply(W, f"boot_{s}", REST[f"boot_{s}"][0]) + np.array([0.0, SOLE_DY])
        if g.get("planted", True): errs[s] = float(np.linalg.norm(got - np.array(g["sole"], float)))   # swing feet are free; only planted soles must hit their target
    order = None
    if pose.get("far_leg_front"):
        order = {p["id"]: i for i, p in enumerate(r.PARTS)}
        for a_, b_ in (("shin_f", "shin_n"), ("boot_f", "boot_n"), ("thigh_f", "thigh_n")): order[a_], order[b_] = order[b_], order[a_]
    return ch, order, errs

# ------------------------------------------------------------------ neutral values (rest)
N_SOLE = {"n": tuple(REST["boot_n"][0] + [0, SOLE_DY]), "f": tuple(REST["boot_f"][0] + [0, SOLE_DY])}
ARM_REST = {s: {"u": (rest_ang(f"upper_arm_{s}"), rest_len(f"upper_arm_{s}")), "f": (rest_ang(f"forearm_{s}"), rest_len(f"forearm_{s}"))} for s in ("n", "f")}

def stance():
    return {"pelvis": (0, 0), "chest": (0, 0), "head": (0, 0), "sash": 0.0,
            "arm_n": dict(ARM_REST["n"], hand=0.0), "arm_f": dict(ARM_REST["f"], hand=0.0),
            "leg_n": {"sole": N_SOLE["n"]}, "leg_f": {"sole": N_SOLE["f"]}}

def lerp(a, b, t): return a + (b - a) * t
def arm(u_ang, u_len, f_ang, f_len, hand=None, slot=None):
    d = {"u": (u_ang, u_len), "f": (f_ang, f_len)}
    if hand is not None: d["hand"] = hand
    if slot: d["slot"] = slot
    return d

# ------------------------------------------------------------------ Idle: 16 frames @ 10 fps
def idle():
    fr = []
    for i in range(16):
        t = 2 * math.pi * i / 16; br = math.sin(t); w = math.sin(t - 1.2)
        p = stance()
        p["chest"] = (0, -1 if br > 0.35 else 0)
        p["pelvis"] = (1 if w > 0.6 else (-1 if w < -0.6 else 0), 1 if br < -0.45 else 0)
        p["head"] = (0, -1 if math.sin(t - 0.5) > 0.4 else 0)
        un, fn = ARM_REST["n"]["u"], ARM_REST["n"]["f"]; uf, ff = ARM_REST["f"]["u"], ARM_REST["f"]["f"]
        p["arm_n"] = arm(un[0] + 1.5 + 1.5 * math.sin(t - 0.8), un[1], fn[0] + 2.0 + 2.0 * math.sin(t - 1.3), fn[1], hand=0.0)   # sway only inward: never opens the arm/jacket slit
        p["arm_f"] = arm(uf[0] + 2.0 * math.sin(t - 1.0), uf[1], ff[0] + 4.0 * math.sin(t - 1.6), ff[1], hand=0.0)
        p["sash"] = 4.0 * math.sin(t - 1.8)
        fr.append(p)
    return {"name": "Idle", "fps": 10, "loop": True, "frames": fr, "events": {}}

# ------------------------------------------------------------------ Run: 8 frames @ 14 fps (in place, toward camera)
# Feet under the hips, legs nearly straight in stance; knee bend toward the camera shows as foreshortening, not sideways splay.
RUN_BASE = {"n": (57.0, 171.0), "f": (75.0, 165.0)}
LEG = [  # (dx, dy, thigh len factor, shin len factor, planted)
    (0.0, 5.0, 1.00, 1.00, True),      # 0 contact: foot reaches forward (lower on screen)
    (0.0, 2.0, 0.92, 0.96, True),      # 1 down: compression
    (0.0, -1.0, 1.00, 1.00, True),     # 2 stance pass
    (1.0, -4.0, 1.04, 1.04, True),     # 3 push-off
    (1.0, -15.0, 0.90, 0.70, False),   # 4 kick-back: heel rises behind, shin foreshortened
    (0.0, -22.0, 0.55, 0.95, False),   # 5 swing pass: knee driven up toward the camera
    (-1.0, -12.0, 0.62, 1.00, False),  # 6 reach
    (0.0, 1.0, 0.88, 1.00, False),     # 7 pre-contact
]
HIP_DY = [1, 3, 1, -2, 1, 3, 1, -2]
def run():
    fr = []
    for i in range(8):
        p = stance(); ph = 2 * math.pi * i / 8
        for s, off in (("n", 0), ("f", 4)):
            dx, dy, ft, fs, planted = LEG[(i + off) % 8]; bx, by = RUN_BASE[s]; o = -1 if s == "n" else 1
            p[f"leg_{s}"] = {"sole": (bx + o * dx, by + dy), "fs_t": ft, "fs_s": fs, "planted": planted,
                             "bend": -1 if s == "n" else 1, "straight": True, "slack": 2.0 if planted else 3.0}
        p["far_leg_front"] = p["leg_f"]["sole"][1] > p["leg_n"]["sole"][1]
        c = math.cos(ph)                                   # +1 at i=0: near leg forward -> far arm forward, near arm back
        p["pelvis"] = (round(1.0 * c), HIP_DY[i] - 2)
        p["chest"] = (round(-1.0 * c), HIP_DY[i] // 2 + 1)
        p["spine_rot"] = 3.0 * c
        p["head"] = (0, 2)
        fn_, ff_ = (1 - c) / 2, (1 + c) / 2                 # forwardness 0..1 of near / far arm
        # back: upper arm drops down and out, forearm trails to the hip; forward: forearm pumps up to the chin, fist upright
        p["arm_n"] = arm(lerp(-28, -6, fn_), lerp(12, 15, fn_), lerp(-40, 166, fn_), lerp(13, 9, fn_), hand=lerp(0, 0, fn_), slot=None)
        p["arm_f"] = arm(lerp(32, 8, ff_), lerp(11, 14, ff_), lerp(48, -168, ff_), lerp(12, 8, ff_), hand=lerp(0, 0, ff_), slot=None)
        p["sash"] = 14.0 * math.sin(ph - 1.4)
        fr.append(p)
    return {"name": "Run", "fps": 14, "loop": True, "frames": fr, "events": {"foot_contact_near": 0, "foot_contact_far": 4}}

# ------------------------------------------------------------------ BasicPunch: 14 frames @ 16 fps, rear (near) hand cross toward camera
def punch():
    S = stance(); un, fn = ARM_REST["n"]["u"], ARM_REST["n"]["f"]; uf, ff = ARM_REST["f"]["u"], ARM_REST["f"]["f"]
    GUARD_F = arm(uf[0] - 4, uf[1], ff[0] + 6, ff[1], hand=0.0)
    TIGHT_F = arm(uf[0] - 10, uf[1] - 1, ff[0] + 12, ff[1], hand=0.0)
    PULL_F = arm(14, 12, -120, 9, hand=0.0)                                           # lead fist pulled back to the chin/ribs
    step = (N_SOLE["n"][0] + 3, N_SOLE["n"][1] + 2)
    k = [
        {},                                                                                   # 0 stance
        {"pelvis": (-1, 1), "chest": (-1, 1), "arm_f": TIGHT_F,
         "arm_n": arm(un[0] - 14, un[1], fn[0] + 6, fn[1], hand=0.0)},                       # 1 load
        {"pelvis": (-3, 3), "chest": (-4, 2), "head": (-2, 1), "spine_rot": 7, "arm_f": TIGHT_F,
         "arm_n": arm(-60, 14, 0, 14, hand=-12.0), "sash": 6},                                    # 2 coil: elbow back, fist chambered at the hip
        {"pelvis": (-3, 4), "chest": (-5, 3), "head": (-2, 2), "spine_rot": 8, "arm_f": TIGHT_F,
         "arm_n": arm(-68, 14, -6, 14, hand=-16.0), "sash": 8},                                   # 3 coil hold (anticipation)
        {"pelvis": (2, 2), "chest": (3, 1), "spine_rot": -3, "leg_n": {"sole": step}, "arm_f": GUARD_F,
         "arm_n": arm(0, 15, 40, 12, hand=0.0, slot="angle"), "sash": -4},                       # 4 launch (hips lead, angled fist)
        {"pelvis": (5, 3), "chest": (8, 2), "head": (3, 2), "spine_rot": -10, "leg_n": {"sole": step}, "arm_f": PULL_F,
         "arm_n": arm(20, 15, 52, 11, hand=0.0, slot="front"), "sash": -12},                    # 5 IMPACT: knuckle-forward fist at chest height
        {"pelvis": (5, 4), "chest": (9, 3), "head": (3, 2), "spine_rot": -11, "leg_n": {"sole": step}, "arm_f": PULL_F,
         "arm_n": arm(22, 16, 56, 11, hand=0.0, slot="front"), "sash": -16},                    # 6 overshoot
        {"pelvis": (3, 3), "chest": (4, 2), "head": (1, 1), "spine_rot": -5, "leg_n": {"sole": step}, "arm_f": GUARD_F,
         "arm_n": arm(8, 15, 70, 13, hand=-10.0, slot="angle"), "sash": -10},                   # 7 recoil
        {"pelvis": (1, 2), "chest": (2, 1), "spine_rot": -2, "leg_n": {"sole": step}, "arm_f": GUARD_F,
         "arm_n": arm(0, 15, 60, 15, hand=0.0), "sash": -3},                                    # 8 retract
        {"pelvis": (0, 1), "chest": (1, 1), "arm_f": GUARD_F,
         "arm_n": arm(un[0] + 20, un[1], fn[0] + 8, fn[1], hand=0.0), "sash": 4},                # 9 step back, re-guard
        {"pelvis": (0, 1), "arm_f": GUARD_F, "arm_n": arm(un[0] + 8, un[1], fn[0] + 3, fn[1], hand=0.0), "sash": 2},   # 10
        {"pelvis": (0, 0), "arm_n": arm(un[0] + 3, un[1], fn[0] + 1, fn[1], hand=0.0), "sash": -1},  # 11
        {},                                                                                   # 12
        {},                                                                                   # 13 stance
    ]
    fr = []
    for kk in k:
        p = copy.deepcopy(S)
        for key, v in kk.items():
            if isinstance(v, dict) and key.startswith("leg"): p[key] = dict(p[key], **v)
            else: p[key] = v
        fr.append(p)
    return {"name": "BasicPunch", "fps": 16, "loop": False, "frames": fr,
            "events": {"anticipation_start": 2, "impact": 5, "recover_start": 9, "interruptible_from": 11}}

CLIPS = [idle, run, punch]

def slots_of(p):
    s = {}
    for side in ("n", "f"):
        a = p.get(f"arm_{side}", {})
        if a.get("slot"): s[f"hand_{side}"] = a["slot"]
    return s

LINING_GATE = (("lining_f", "f", 6.0), ("lining_n", "n", 16.0))   # arm linings only exist while the hand is near its approved guard position

def solve_clip(c):
    out = []
    for p in c["frames"]:
        ch, order, errs = solve(p); W = r.fk(ch); slots = slots_of(p); hide = []
        for lid, side, rad in LINING_GATE:
            if np.linalg.norm(r.apply(W, f"hand_{side}", REST[f"hand_{side}"][0]) - REST[f"hand_{side}"][0]) > rad: hide.append(lid)
        slots["_hide"] = hide; out.append((ch, order, errs, slots))
    return out

def export(path):
    data = {"clips": []}
    for fn in CLIPS:
        c = fn(); frames = []
        for ch, order, errs, slots in solve_clip(c):
            frames.append({"bones": {b: {"rot": round(v.get("rot", 0.0), 5), "loc": list(v.get("loc", (0, 0))), "sy": round(v.get("sy", 1.0), 5)} for b, v in ch.items()},
                           "far_leg_front": 1 if order else 0, "slots": slots, "planted_err": errs})
        data["clips"].append({"name": c["name"], "fps": c["fps"], "loop": c["loop"], "events": c["events"], "frames": frames})
    json.dump(data, open(path, "w"), indent=1)
    return data

"""B03G: Dash / Hurt / Death for Kai SOUTH. Same solver, parts and stance as anim.py (imported at its end); no new art, poses only.
Idle / Run / BasicPunch are not touched. Poses are a few authored keys per clip, tweened with smoothstep."""
import copy, math
import anim as a

arm, stance, N_SOLE, ARM_REST = a.arm, a.stance, a.N_SOLE, a.ARM_REST

def _lerp_v(x, y, t):
    if isinstance(x, (bool, str)) or x is None: return x if t < 0.5 else y
    if isinstance(x, (int, float)): return x + (y - x) * t
    if isinstance(x, (tuple, list)): return tuple(_lerp_v(p, q, t) for p, q in zip(x, y))
    if isinstance(x, dict):
        out = {k: (_lerp_v(x[k], y[k], t) if k in y else x[k]) for k in x}
        out.update({k: y[k] for k in y if k not in x}); return out
    return x

def tween(keys, n):
    out = []
    for f in range(n):
        for (f0, p0), (f1, p1) in zip(keys, keys[1:]):
            if f0 <= f <= f1:
                t = 0.0 if f1 == f0 else (f - f0) / (f1 - f0)
                if 0 < t < 1: t = t * t * (3 - 2 * t)
                q = {}
                for k in set(p0) | set(p1):
                    if k in p0 and k in p1: q[k] = _lerp_v(p0[k], p1[k], t)
                    elif k in p0 and t < 0.5: q[k] = copy.deepcopy(p0[k])
                    elif k in p1 and t >= 0.5: q[k] = copy.deepcopy(p1[k])
                out.append(q); break
    return out

def P(**kw):
    p = stance()
    for k, v in kw.items(): p[k] = v
    return p
def lg(s, dx=0.0, dy=0.0, **k): return dict({"sole": (N_SOLE[s][0] + dx, N_SOLE[s][1] + dy), "bend": -1 if s == "n" else 1}, **k)
def air(s, dx, dy, **k): return lg(s, dx, dy, planted=False, straight=True, slack=3.0, **k)
def depth(p):
    if "leg_n" in p and "leg_f" in p: p["far_leg_front"] = p["leg_f"]["sole"][1] > p["leg_n"]["sole"][1]
    return p

# run-style base feet (front view: both feet under the hips)
BN, BF = (57.0, 171.0), (75.0, 165.0)
def foot(s, dx, dy, **k): b = BN if s == "n" else BF; return dict({"sole": (b[0] + dx, b[1] + dy), "bend": -1 if s == "n" else 1}, **k)
def fair(s, dx, dy, **k): return foot(s, dx, dy, planted=False, straight=True, slack=3.0, **k)
sw_n = lambda u, f: arm(-u, 13, -f, 13, hand=0.0)
sw_f = lambda u, f: arm(u, 12, f, 12, hand=0.0)

def dash():
    k0 = P(pelvis=(0, 6), chest=(0, 5), head=(0, 3), sash=-10, leg_n=foot("n", 2, 0), leg_f=foot("f", -2, 0), arm_n=sw_n(22, 30), arm_f=sw_f(26, 36))
    k1 = P(pelvis=(0, 10), chest=(1, 8), head=(0, 6), sash=16, spine_rot=-3, leg_n=fair("n", -8, -14), leg_f=foot("f", 6, 5), arm_n=sw_n(44, 66), arm_f=sw_f(48, 70))
    k2 = P(pelvis=(0, 12), chest=(2, 10), head=(0, 9), sash=30, spine_rot=-5, leg_n=foot("n", 8, 7), leg_f=fair("f", 6, -26, fs_t=0.6), arm_n=sw_n(58, 88), arm_f=sw_f(62, 92))
    k3 = P(pelvis=(0, 10), chest=(1, 8), head=(0, 7), sash=-8, spine_rot=-3, leg_n=fair("n", -8, -24, fs_t=0.6), leg_f=foot("f", 6, 7), arm_n=sw_n(52, 80), arm_f=sw_f(56, 84))
    k4 = P(pelvis=(0, 5), chest=(0, 3), head=(0, 3), sash=10, leg_n=foot("n", 3, 2), leg_f=foot("f", -1, 1))
    k5 = P(pelvis=(0, 2), chest=(0, 1), sash=4)
    keys = [(0, k0), (1, k0), (2, k1), (4, k2), (6, k3), (7, k4), (9, k5)]
    fr = [depth(p) for p in tween(keys, 10)]
    return {"name": "Dash", "fps": 22, "loop": False, "frames": fr, "events": {"anticipation_start": 0, "burst_start": 2, "travel_end": 6, "recover_start": 7}}

def hurt_keys():
    un, fn = ARM_REST["n"]["u"], ARM_REST["n"]["f"]; uf, ff = ARM_REST["f"]["u"], ARM_REST["f"]["f"]
    hit = P(pelvis=(2, 3), chest=(5, 2), head=(8, -2), head_rot=-12, spine_rot=-9, sash=18, arm_n=arm(-56, 13, -92, 13, hand=0.0), arm_f=arm(50, 12, 120, 11, hand=0.0))
    stag = P(pelvis=(5, 5), chest=(9, 3), head=(12, -1), head_rot=-18, spine_rot=-14, sash=-20, leg_n=lg("n", -3, 0), leg_f=lg("f", 5, 0, planted=False), arm_n=arm(-70, 13, -110, 13, hand=0.0), arm_f=arm(38, 12, 150, 11, hand=0.0))
    rec = P(pelvis=(2, 3), chest=(3, 2), head=(4, 0), head_rot=-6, spine_rot=-5, sash=8)
    return hit, stag, rec

def hurt():
    hit, stag, rec = hurt_keys()
    keys = [(0, hit), (2, stag), (4, stag), (6, rec), (7, P())]
    return {"name": "Hurt", "fps": 20, "loop": False, "frames": [depth(p) for p in tween(keys, 8)], "events": {"impact": 0, "interruptible_from": 5}}

FALL = 1
def lie(rot, rx, ry, arms, **kw):
    p = P(root=(rx, ry), root_rot=FALL * rot, **kw)
    for k in ("leg_n", "leg_f"): p.pop(k, None)
    p.update(arms); return p

def death():
    hit, stag, _ = hurt_keys()
    buckle = copy.deepcopy(stag); buckle["pelvis"] = (buckle["pelvis"][0], 16); buckle["chest"] = (buckle["chest"][0], 13)
    for s in "nf": buckle[f"leg_{s}"] = dict(buckle.get(f"leg_{s}", lg(s)), fs_t=0.78, fs_s=0.9, planted=False)
    L, R = "f", "n"
    up = lambda: {"arm_f": arm(FALL * 150, 12, FALL * 172, 11, hand=0.0), "arm_n": arm(-FALL * 120, 13, -FALL * 150, 13, hand=0.0)}
    mid = lambda: {"arm_f": arm(FALL * 120, 12, FALL * 130, 11, hand=0.0), "arm_n": arm(-FALL * 100, 13, -FALL * 110, 13, hand=0.0)}
    ground = lambda e=0: {"arm_f": arm(FALL * (112 + e), 12, FALL * (100 + e), 11, hand=0.0), "arm_n": arm(FALL * (80 + e), 13, FALL * (92 + e), 13, hand=0.0)}
    X, Y = FALL * 96, -16
    keys = [
        (0, hit), (1, stag), (3, buckle),
        (6, lie(30, X * 0.7, -6, up(), spine_rot=FALL * 8, head_rot=FALL * 14, sash=FALL * 30)),
        (9, lie(64, X * 1.03, Y * 1.25, mid(), spine_rot=FALL * 4, head_rot=FALL * 10, sash=FALL * 40)),
        (10, lie(90, X, Y - 3, mid(), head_rot=FALL * 6, sash=FALL * 22)),
        (11, lie(90, X, Y + 1, ground(4), head_rot=FALL * 14, sash=FALL * 8)),
        (13, lie(90, X, Y, ground(0), head_rot=FALL * 20, sash=0.0)),
        (15, lie(90, X, Y, ground(0), head_rot=FALL * 20, sash=0.0)),
    ]
    return {"name": "Death", "fps": 14, "loop": False, "frames": [depth(p) for p in tween(keys, 16)], "events": {"hit": 0, "ground_contact": 10, "settled": 13}}

CLIPS = [dash, hurt, death]

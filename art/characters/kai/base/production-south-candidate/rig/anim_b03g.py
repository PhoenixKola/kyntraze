"""B03G / B03G.1: Dash / Hurt / Death for Kai SOUTH. Same solver, parts and stance as anim.py (imported at its end); no new art, poses only.
Idle / Run / BasicPunch are not touched. Poses are a few authored keys per clip, tweened with smoothstep.
Death pivots the whole body about the pelvis joint (`hip_target` + `root_rot`) so the feet stay planted while the body collapses."""
import copy, math
import numpy as np
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
UL = {s: ARM_REST[s]["u"][1] for s in "nf"}; FL = {s: ARM_REST[s]["f"][1] for s in "nf"}
def A(s, u, f, slot=None, k=1.0): return arm(u, UL[s] * k, f, FL[s] * k, hand=0.0, slot=slot)
BN, BF = (57.0, 171.0), (75.0, 165.0)
def foot(s, dx, dy, **k): b = BN if s == "n" else BF; return dict({"sole": (b[0] + dx, b[1] + dy), "bend": -1 if s == "n" else 1}, **k)
def fair(s, dx, dy, **k): return foot(s, dx, dy, planted=False, straight=True, slack=3.0, **k)
sw = lambda un, fn, uf, ff: {"arm_n": A("n", -un, -fn), "arm_f": A("f", uf, ff)}

# ------------------------------------------------------------------ Dash: coil, push-off, launch, peak speed, scissor, touchdown, skid, recover
def dash():
    k = [
        P(pelvis=(0, 9), chest=(0, 7), head=(0, 5), sash=-6, leg_n=foot("n", 3, 0), leg_f=foot("f", -3, 0), **sw(18, 24, 22, 30)),
        P(pelvis=(0, 6), chest=(1, 5), head=(0, 3), sash=-22, spine_rot=-3, leg_n=fair("n", -6, -8), leg_f=foot("f", 6, 4), **sw(30, 44, 44, 60)),
        P(pelvis=(0, 2), chest=(2, 1), head=(0, 0), sash=-36, spine_rot=-6, leg_n=fair("n", -12, -22, fs_t=0.7), leg_f=fair("f", 10, -6), **sw(38, 54, 66, 90)),
        P(pelvis=(0, 0), chest=(2, -1), head=(0, -1), sash=-46, spine_rot=-8, leg_n=fair("n", -16, -28, fs_t=0.65), leg_f=fair("f", 14, -16), **sw(44, 62, 84, 112)),
        P(pelvis=(0, 4), chest=(1, 3), head=(0, 2), sash=-30, spine_rot=-5, leg_n=fair("n", 10, -26, fs_t=0.6), leg_f=fair("f", -12, -18, fs_t=0.7), **sw(36, 52, 58, 86)),
        P(pelvis=(0, 11), chest=(0, 9), head=(0, 6), sash=-8, spine_rot=-2, leg_n=foot("n", 6, -1), leg_f=fair("f", -8, -10), **sw(28, 40, 38, 54)),
        P(pelvis=(0, 14), chest=(0, 12), head=(0, 8), sash=14, leg_n=foot("n", 10, 0), leg_f=foot("f", -6, 3), **sw(26, 34, 30, 38)),
        P(pelvis=(0, 10), chest=(0, 8), head=(0, 5), sash=16, leg_n=foot("n", 7, 0), leg_f=foot("f", -3, 2), **sw(22, 28, 26, 30)),
        P(pelvis=(0, 5), chest=(0, 3), head=(0, 3), sash=6, leg_n=foot("n", 3, 1), leg_f=foot("f", -1, 1)),
        P(pelvis=(0, 2), chest=(0, 1), sash=2),
    ]
    return {"name": "Dash", "fps": 22, "loop": False, "frames": [depth(p) for p in k], "events": {"anticipation_start": 0, "burst_start": 2, "travel_end": 6, "recover_start": 7}}

# ------------------------------------------------------------------ Hurt: hit hop with arched body and flung arms, back-step stagger, hunch clutching the ribs, recover
def hurt_keys():
    hit = P(pelvis=(3, -3), chest=(6, -3), head=(9, -5), head_rot=-16, spine_rot=-11, sash=24, leg_n=air("n", 0, -5), leg_f=air("f", 0, -5), arm_n=A("n", -52, -94), arm_f=A("f", 68, 140))
    peak = P(pelvis=(5, 0), chest=(9, -1), head=(13, -3), head_rot=-22, spine_rot=-16, sash=40, leg_n=lg("n", -4, 0), leg_f=air("f", 6, -5), arm_n=A("n", -62, -104), arm_f=A("f", 80, 150))
    stag = P(pelvis=(6, 5), chest=(10, 4), head=(12, 2), head_rot=-16, spine_rot=-12, sash=-22, leg_n=lg("n", -5, 0), leg_f=lg("f", 6, 0), arm_n=A("n", -50, -90), arm_f=A("f", 56, 126))
    hunch = P(pelvis=(2, 9), chest=(4, 9), head=(5, 7), head_rot=8, spine_rot=4, sash=10, leg_n=lg("n", 0, 0), leg_f=lg("f", 2, 0), arm_n=A("n", -34, -70), arm_f=A("f", 22, 100))
    return hit, peak, stag, hunch

def hurt():
    hit, peak, stag, hunch = hurt_keys()
    keys = [(0, hit), (1, peak), (2, stag), (3, stag), (4, hunch), (5, hunch), (6, P(pelvis=(1, 5), chest=(1, 3), head_rot=2, spine_rot=3)), (7, P())]
    return {"name": "Hurt", "fps": 20, "loop": False, "frames": [depth(p) for p in tween(keys, 8)], "events": {"impact": 0, "interruptible_from": 5}}

# ------------------------------------------------------------------ Death
GROUND = 164.0; FALL = 1; HX = 84.0
_W0 = a.r.fk(a.solve(stance())[0]); P0 = a.r.apply(_W0, "pelvis", a.REST["pelvis"][0]); P0x, P0y = float(P0[0]), float(P0[1])
def soleabs(x, y, **k): return dict({"sole": (x, y), "bend": 1}, **k)
def down(rot, hx, hy, legs, arms, **kw):
    p = P(root_rot=FALL * rot, hip_target=(hx, hy), **kw); p.update(legs); p.update(arms); return p

def death():
    hit, peak, stag, hunch = hurt_keys()
    stand = {f"leg_{s}": lg(s) for s in "nf"}
    up = {"arm_f": A("f", 200, 190), "arm_n": A("n", 192, 184)}
    out = {"arm_f": A("f", 160, 180), "arm_n": A("n", 196, 188)}
    rest_arms = lambda e=0: {"arm_f": A("f", 106 + e, 160 + e), "arm_n": A("n", 88 + e, 100 + e)}
    flung = {"arm_f": A("f", 232, 210), "arm_n": A("n", 150, 172)}
    fin = lambda ex=0: {"leg_n": soleabs(HX + 40 + ex, GROUND, planted=False), "leg_f": soleabs(HX + 60 + ex, GROUND - 2, planted=False, straight=True, slack=6.0)}
    lifting = {"leg_n": soleabs(HX + 24, GROUND - 24, planted=False), "leg_f": soleabs(HX + 44, GROUND - 40, planted=False)}
    kneel = P(root_rot=0.0, hip_target=(P0x, P0y + 32), spine_rot=8, head_rot=12, head=(-3, -2), sash=30, **stand, **out)
    stag2 = P(root_rot=0.0, hip_target=(P0x - 4, P0y + 10), spine_rot=8, head_rot=10, head=(-3, -2), sash=-20, **stand, **out)
    keys = [
        (0, hit), (1, peak), (2, stag2), (4, kneel),
        (6, down(34, P0x + 6, P0y + 42, stand, up, spine_rot=8, head_rot=16, sash=40)),
        (8, down(66, HX - 4, GROUND - 40, lifting, up, head_rot=14, sash=48)),
        (10, down(90, HX, GROUND - 22, fin(-8), flung, head_rot=4, sash=30)),
        (11, down(84, HX, GROUND - 33, fin(-14), flung, head_rot=-8, sash=14)),
        (12, down(90, HX, GROUND - 21, fin(-4), rest_arms(10), head_rot=10, sash=6)),
        (14, down(90, HX, GROUND - 21, fin(), rest_arms(), head_rot=12, sash=0.0)),
        (17, down(90, HX, GROUND - 21, fin(), rest_arms(), head_rot=12, sash=0.0)),
    ]
    return {"name": "Death", "fps": 14, "loop": False, "frames": [depth(p) for p in tween(keys, 18)], "events": {"hit": 0, "ground_contact": 10, "settled": 14}}

CLIPS = [dash, hurt, death]

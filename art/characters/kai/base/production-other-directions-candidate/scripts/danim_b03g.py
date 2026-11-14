"""B03G / B03G.1: Dash / Hurt / Death for Kai NORTH / EAST / WEST. Same solver, same parts, same stance as danim.py (imported at its end).
Poses are authored as a few keys per clip and tweened (smoothstep); everything is a pose on the existing rig, no new art.
Death pivots the whole body about the pelvis joint (`hip_target` + `root_rot`) so the legs stay planted while the body collapses."""
import copy, math
import numpy as np
import danim as a

SX, D, LEAD, REAR, SOLES, LU, LF = a.SX, a.D, a.LEAD, a.REAR, a.SOLES, a.LU, a.LF
arm, stance = a.arm, a.stance

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
def lg(s, dx=0.0, dy=0.0, **k): return dict({"sole": (SOLES[s][0] + dx, SOLES[s][1] + dy)}, **k)
def air(s, dx, dy, **k): return lg(s, dx, dy, planted=False, straight=True, slack=3.0, **k)

L, R = LEAD, REAR
Lu, Lf, Ru, Rf = LU[L], LF[L], LU[R], LF[R]
NORTH = D == "north"
sx = SX if not NORTH else 1
O = {"n": -1, "f": 1}
GROUND = 164.0

# ------------------------------------------------------------------ Dash: coil, push-off, launch, peak speed, scissor, reach, skid, recover
def dash():
    if NORTH:
        sw = lambda sd, u, f: arm(O[sd] * u, LU[sd], O[sd] * f, LF[sd], 0.0, "side")
        k = [
            P(pelvis=(0, 9), chest=(0, 7), head=(0, 5), sash=-6, leg_n=lg("n", 4, 0), leg_f=lg("f", -4, 0), arm_n=sw("n", 18, 10), arm_f=sw("f", 18, 10)),
            P(pelvis=(0, 6), chest=(0, 5), head=(0, 3), sash=-20, leg_n=lg("n", -4, -6), leg_f=lg("f", 6, 3), arm_n=sw("n", 38, 20), arm_f=sw("f", 38, 20)),
            P(pelvis=(0, 2), chest=(0, 1), head=(0, 0), sash=-34, leg_n=air("n", -12, -22, fs_t=0.7), leg_f=air("f", 12, -6), arm_n=sw("n", 62, 30), arm_f=sw("f", 62, 30)),
            P(pelvis=(0, 0), chest=(0, -1), head=(0, -1), sash=-44, leg_n=air("n", -16, -28, fs_t=0.65), leg_f=air("f", 16, -14), arm_n=sw("n", 78, 36), arm_f=sw("f", 78, 36)),
            P(pelvis=(0, 4), chest=(0, 3), head=(0, 2), sash=-28, leg_n=air("n", 12, -24, fs_t=0.6), leg_f=air("f", -12, -18, fs_t=0.7), arm_n=sw("n", 58, 40), arm_f=sw("f", 58, 40)),
            P(pelvis=(0, 10), chest=(0, 8), head=(0, 6), sash=-8, leg_n=lg("n", 8, 4), leg_f=air("f", -10, -10), arm_n=sw("n", 40, 22), arm_f=sw("f", 40, 22)),
            P(pelvis=(0, 13), chest=(0, 11), head=(0, 8), sash=14, leg_n=lg("n", 12, 6), leg_f=lg("f", -6, 4), arm_n=sw("n", 30, 16), arm_f=sw("f", 30, 16)),
            P(pelvis=(0, 10), chest=(0, 8), head=(0, 5), sash=16, leg_n=lg("n", 8, 3), leg_f=lg("f", -3, 2), arm_n=sw("n", 24, 14), arm_f=sw("f", 24, 14)),
            P(pelvis=(0, 5), chest=(0, 3), head=(0, 3), sash=6, leg_n=lg("n", 3, 1), leg_f=lg("f", -1, 1)),
            P(pelvis=(0, 2), chest=(0, 1), sash=2),
        ]
        return {"name": "Dash", "fps": 22, "loop": False, "frames": k, "events": {"anticipation_start": 0, "burst_start": 2, "travel_end": 6, "recover_start": 7}}
    lean = lambda v: -sx * v
    def bk(u1, f1, u2, f2): return {f"arm_{L}": arm(-sx * u1, Lu, -sx * f1, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * u2, Ru, -sx * f2, Rf, 0.0, "side")}
    k = [
        P(pelvis=(-4 * sx, 9), chest=(-6 * sx, 7), head=(-2 * sx, 5), spine_rot=sx * 8, sash=8 * sx, **{f"leg_{L}": lg(L, -3 * sx, 0), f"leg_{R}": lg(R, -3 * sx, 0), f"arm_{L}": arm(sx * 24, Lu * 0.85, -sx * 150, Lf * 0.8, 0.0, "guard"), f"arm_{R}": arm(-sx * 20, Ru, -sx * 5, Rf * 0.8, 0.0, "side")}),
        P(pelvis=(3 * sx, 10), chest=(6 * sx, 9), head=(4 * sx, 6), spine_rot=lean(14), sash=-18 * sx, **{f"leg_{L}": lg(L, 4 * sx, 0), f"leg_{R}": air(R, -12 * sx, -6)}, **bk(44, 76, 56, 84)),
        P(pelvis=(11 * sx, 8), chest=(15 * sx, 8), head=(11 * sx, 5), spine_rot=lean(26), sash=-34 * sx, **{f"leg_{L}": air(L, 22 * sx, -4), f"leg_{R}": air(R, -26 * sx, -16, fs_t=0.95, fs_s=0.85)}, **bk(70, 98, 82, 106)),
        P(pelvis=(16 * sx, 6), chest=(21 * sx, 6), head=(16 * sx, 3), spine_rot=lean(34), sash=-44 * sx, **{f"leg_{L}": air(L, 32 * sx, -12), f"leg_{R}": air(R, -36 * sx, -22, fs_t=0.95, fs_s=0.8)}, **bk(80, 108, 92, 112)),
        P(pelvis=(14 * sx, 8), chest=(18 * sx, 7), head=(14 * sx, 4), spine_rot=lean(29), sash=-30 * sx, **{f"leg_{L}": air(L, -12 * sx, -14, fs_t=0.95), f"leg_{R}": air(R, 18 * sx, -28, fs_t=0.55, fs_s=0.9)}, **{f"arm_{L}": arm(-sx * 20, Lu, sx * 18, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * 84, Ru, -sx * 112, Rf, 0.0, "side")}),
        P(pelvis=(11 * sx, 10), chest=(13 * sx, 9), head=(11 * sx, 6), spine_rot=lean(21), sash=-14 * sx, **{f"leg_{L}": air(L, -22 * sx, -8), f"leg_{R}": lg(R, 26 * sx, -2)}, **{f"arm_{L}": arm(-sx * 30, Lu, -sx * 40, Lf, 0.0, "side"), f"arm_{R}": arm(sx * 20, Ru, sx * 70, Rf, 0.0, "side")}),
        P(pelvis=(8 * sx, 12), chest=(9 * sx, 10), head=(8 * sx, 7), spine_rot=lean(12), sash=12 * sx, **{f"leg_{L}": lg(L, -2 * sx, 0), f"leg_{R}": lg(R, 24 * sx, 0)}, **{f"arm_{L}": arm(sx * 14, Lu * 0.9, -sx * 120, Lf * 0.85, 0.0, "guard"), f"arm_{R}": arm(-sx * 30, Ru, sx * 30, Rf, 0.0, "side")}),
        P(pelvis=(5 * sx, 11), chest=(5 * sx, 9), head=(4 * sx, 6), spine_rot=lean(7), sash=18 * sx, **{f"leg_{L}": lg(L, 6 * sx, 0), f"leg_{R}": lg(R, 8 * sx, 0)}, **{f"arm_{L}": arm(sx * 22, Lu * 0.9, -sx * 140, Lf * 0.8, 0.0, "guard"), f"arm_{R}": arm(-sx * 40, Ru, sx * 20, Rf, 0.0, "side")}),
        P(pelvis=(2 * sx, 6), chest=(2 * sx, 4), spine_rot=lean(3), sash=6 * sx, **{f"leg_{L}": lg(L, 6 * sx, 0)}),
        P(pelvis=(1 * sx, 3), chest=(1 * sx, 2), sash=2 * sx, **{f"leg_{L}": lg(L, 4 * sx, 0)}),
    ]
    return {"name": "Dash", "fps": 22, "loop": False, "frames": k, "events": {"anticipation_start": 0, "burst_start": 2, "travel_end": 6, "recover_start": 7}}

# ------------------------------------------------------------------ Hurt: hit hop with arched back and flung arms, back-step stagger, hunch clutching the ribs, recover
def hurt_keys():
    if NORTH:
        fl = lambda sd, u, f: arm(O[sd] * u, LU[sd], O[sd] * f, LF[sd], 0.0, "side")
        hit = P(pelvis=(2, 0), chest=(5, -1), head=(8, -2), head_rot=12, spine_rot=-8, sash=22, leg_n=air("n", 0, -5), leg_f=air("f", 0, -5), arm_n=fl("n", 74, 70), arm_f=fl("f", 66, 60))
        peak = P(pelvis=(5, 0), chest=(9, -1), head=(12, -3), head_rot=18, spine_rot=-13, sash=36, leg_n=lg("n", -4, 0), leg_f=air("f", 6, -5), arm_n=fl("n", 88, 92), arm_f=fl("f", 74, 66))
        stag = P(pelvis=(6, 5), chest=(9, 4), head=(11, 2), head_rot=14, spine_rot=-10, sash=-20, leg_n=lg("n", -4, 0), leg_f=lg("f", 6, 0), arm_n=fl("n", 66, 54), arm_f=fl("f", 50, 36))
        hunch = P(pelvis=(2, 8), chest=(3, 8), head=(3, 6), head_rot=-6, spine_rot=3, sash=8, arm_n=arm(-30, LU["n"], 40, LF["n"], 0.0, "side"), arm_f=arm(30, LU["f"], -40, LF["f"], 0.0, "side"))
        return hit, peak, stag, hunch
    hit = P(pelvis=(-3 * sx, 0), chest=(-5 * sx, -1), head=(-5 * sx, -2), head_rot=sx * 14, spine_rot=sx * 16, sash=30 * sx,
            **{f"leg_{L}": air(L, -2 * sx, -3), f"leg_{R}": air(R, -2 * sx, -3), f"arm_{L}": arm(-sx * 18, Lu, -sx * 112, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * 52, Ru, -sx * 88, Rf, 0.0, "side")})
    peak = P(pelvis=(-4 * sx, 1), chest=(-8 * sx, 0), head=(-7 * sx, -2), head_rot=sx * 20, spine_rot=sx * 20, sash=44 * sx,
             **{f"leg_{L}": air(L, 2 * sx, -4), f"leg_{R}": lg(R, -8 * sx, 0), f"arm_{L}": arm(-sx * 20, Lu, -sx * 104, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * 40, Ru, -sx * 76, Rf, 0.0, "side")})
    stag = P(pelvis=(-5 * sx, 5), chest=(-7 * sx, 4), head=(-6 * sx, 2), head_rot=sx * 14, spine_rot=sx * 16, sash=-24 * sx,
             **{f"leg_{L}": lg(L, 0, 0), f"leg_{R}": lg(R, -12 * sx, 0), f"arm_{L}": arm(-sx * 12, Lu, -sx * 72, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * 26, Ru, -sx * 62, Rf, 0.0, "side")})
    hunch = P(pelvis=(-4 * sx, 9), chest=(2 * sx, 9), head=(3 * sx, 7), head_rot=-sx * 8, spine_rot=-sx * 12, sash=10 * sx,
              **{f"leg_{L}": lg(L, 0, 0), f"leg_{R}": lg(R, -10 * sx, 0), f"arm_{L}": arm(-sx * 20, Lu, -sx * 30, Lf, 0.0, "side"), f"arm_{R}": arm(sx * 10, Ru, sx * 100, Rf * 0.9, 0.0, "side")})
    return hit, peak, stag, hunch

def hurt():
    hit, peak, stag, hunch = hurt_keys()
    keys = [(0, hit), (1, peak), (2, stag), (3, stag), (4, hunch), (5, hunch), (6, P(pelvis=(-1 * sx, 5), chest=(0, 3), head_rot=-sx * 2, spine_rot=-sx * 4)), (7, P())]
    return {"name": "Hurt", "fps": 20, "loop": False, "frames": tween(keys, 8), "events": {"impact": 0, "interruptible_from": 5}}

# ------------------------------------------------------------------ Death: hit, stagger, knees give way, tip back about the seat with the feet planted, slam, bounce, limbs settle, hold
FALL = 1 if D != "west" else -1                  # + = head swings to the screen left
_W0 = a.r.fk(a.solve(stance())[0]); P0 = a.r.apply(_W0, "pelvis", a.REST["pelvis"][0]); P0x, P0y = float(P0[0]), float(P0[1])
HG = 10 if NORTH else 0                          # the back view is wider across the hips: lift the grounded body so it rests on the ground line
HX = 88.0                                        # grounded hip x (keeps the head, feet and hands inside the canvas)
def soleabs(x, y, **k): return dict({"sole": (x, y)}, **k)
def down(rot, hx, hy, legs, arms, **kw):
    p = P(root_rot=FALL * rot, hip_target=(hx, hy), **kw); p.update(legs); p.update(arms); return p

def death():
    hit, peak, stag, hunch = hurt_keys()
    stand = {f"leg_{s}": lg(s) for s in "nf"}
    up = {f"arm_{L}": arm(FALL * 200, Lu, FALL * 190, Lf, 0.0, "side"), f"arm_{R}": arm(FALL * 240, Ru, FALL * 210, Rf, 0.0, "side")}
    out = {f"arm_{L}": arm(FALL * 160, Lu, FALL * 180, Lf, 0.0, "side"), f"arm_{R}": arm(FALL * 250, Ru, FALL * 220, Rf, 0.0, "side")}
    rest_arms = lambda e=0: {f"arm_{L}": arm(FALL * (106 + e), Lu, FALL * (160 + e), Lf, 0.0, "side"), f"arm_{R}": arm(FALL * (88 + e), Ru, FALL * (100 + e), Rf, 0.0, "side")}
    flung = {f"arm_{L}": arm(FALL * 232, Lu, FALL * 210, Lf, 0.0, "side"), f"arm_{R}": arm(FALL * 150, Ru, FALL * 172, Rf, 0.0, "side")}
    fin = lambda ex=0: {f"leg_{R}": soleabs(HX + FALL * (40 + ex), GROUND, dir="up", planted=False), f"leg_{L}": soleabs(HX + FALL * (60 + ex), GROUND - 2, dir="up", planted=False, straight=True, slack=6.0)}
    lifting = {f"leg_{R}": soleabs(HX + FALL * 24, GROUND - 24, dir="up", planted=False), f"leg_{L}": soleabs(HX + FALL * 44, GROUND - 40, dir="up", planted=False)}
    tipping = {f"leg_{s}": soleabs(SOLES[s][0] + FALL * 6, SOLES[s][1] - 12, dir="up", planted=False) for s in "nf"}
    kneel = P(root_rot=0.0, hip_target=(P0x + FALL * 0, P0y + 32), spine_rot=FALL * 20, head_rot=FALL * 18, head=(-FALL * 8, -3), sash=FALL * 30, **stand, **out)
    stag2 = P(root_rot=0.0, hip_target=(P0x - FALL * 4, P0y + 10), spine_rot=FALL * 20, head_rot=FALL * 14, head=(-FALL * 8, -3), sash=-FALL * 20, **stand, **out)
    keys = [
        (0, hit), (1, peak), (2, stag2), (4, kneel),
        (6, down(30, P0x + FALL * 6, P0y + 36, tipping, up, spine_rot=FALL * 8, head_rot=FALL * 16, sash=FALL * 40)),
        (8, down(66, HX - FALL * 4, GROUND - 40, lifting, up, head_rot=FALL * 14, sash=FALL * 48)),
        (10, down(90, HX, GROUND - 17 - HG, fin(-8), flung, head_rot=FALL * 4, sash=FALL * 30)),
        (11, down(84, HX, GROUND - 28 - HG, fin(-14), flung, head_rot=-FALL * 8, sash=FALL * 14)),
        (12, down(90, HX, GROUND - 16 - HG, fin(-4), rest_arms(10), head_rot=FALL * 10, sash=FALL * 6)),
        (14, down(90, HX, GROUND - 16 - HG, fin(), rest_arms(), head_rot=FALL * 12, sash=0.0)),
        (17, down(90, HX, GROUND - 16 - HG, fin(), rest_arms(), head_rot=FALL * 12, sash=0.0)),
    ]
    return {"name": "Death", "fps": 14, "loop": False, "frames": tween(keys, 18), "events": {"hit": 0, "ground_contact": 10, "settled": 14}}

CLIPS = [dash, hurt, death]

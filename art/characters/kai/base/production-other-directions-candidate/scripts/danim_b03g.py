"""B03G: Dash / Hurt / Death for Kai NORTH / EAST / WEST. Same solver, same parts, same stance as danim.py (imported at its end).
Poses are authored as a few keys per clip and tweened (smoothstep); everything is a pose on the existing rig, no new art."""
import copy, math
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
sx = SX if not NORTH else 1                     # screen sign of "back" for the fall / recoil
O = {"n": -1, "f": 1}

def dash():
    if NORTH:
        sw = lambda sd, u, f: arm(O[sd] * u, LU[sd], O[sd] * f, LF[sd], 0.0, "side")
        k0 = P(pelvis=(0, 7), chest=(0, 5), head=(0, 3), sash=-10, leg_n=lg("n", 3, 0), leg_f=lg("f", -3, 0), arm_n=sw("n", 26, 16), arm_f=sw("f", 26, 16))
        k1 = P(pelvis=(0, 10), chest=(0, 7), head=(0, 6), sash=16, leg_n=air("n", -10, -16), leg_f=lg("f", 8, 5), arm_n=sw("n", 42, 22), arm_f=sw("f", 42, 22))
        k2 = P(pelvis=(0, 11), chest=(0, 9), head=(0, 8), sash=28, leg_n=lg("n", 8, 6), leg_f=air("f", 8, -26, fs_t=0.6), arm_n=sw("n", 56, 28), arm_f=sw("f", 56, 28))
        k3 = P(pelvis=(0, 9), chest=(0, 7), head=(0, 6), sash=-8, leg_n=air("n", -10, -24, fs_t=0.6), leg_f=lg("f", 8, 6), arm_n=sw("n", 50, 26), arm_f=sw("f", 50, 26))
        k4 = P(pelvis=(0, 5), chest=(0, 3), head=(0, 3), sash=10, leg_n=lg("n", 3, 2), leg_f=lg("f", -1, 1))
    else:
        lean = lambda v: -sx * v
        def bk(u1, f1, u2, f2, sl=None): return {f"arm_{L}": arm(-sx * u1, Lu, -sx * f1, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * u2, Ru, -sx * f2, Rf, 0.0, "side")}
        k0 = P(pelvis=(-3 * sx, 8), chest=(-5 * sx, 6), head=(-2 * sx, 4), spine_rot=sx * 6, sash=-8 * sx, **{f"arm_{L}": arm(sx * 20, Lu * 0.85, -sx * 150, Lf * 0.8, 0.0, "guard"), f"arm_{R}": arm(-sx * 30, Ru, -sx * 10, Rf * 0.8, 0.0, "side")})
        k1 = P(pelvis=(7 * sx, 10), chest=(10 * sx, 8), head=(7 * sx, 5), spine_rot=lean(22), sash=-24 * sx, **{f"leg_{L}": lg(L, 8 * sx, 0), f"leg_{R}": air(R, -16 * sx, -10)}, **bk(62, 92, 74, 100))
        k2 = P(pelvis=(10 * sx, 9), chest=(14 * sx, 7), head=(10 * sx, 4), spine_rot=lean(30), sash=-34 * sx, **{f"leg_{L}": air(L, 18 * sx, -6), f"leg_{R}": air(R, -26 * sx, -22, fs_t=0.9, fs_s=0.8)}, **bk(70, 98, 82, 104))
        k3 = P(pelvis=(9 * sx, 8), chest=(12 * sx, 6), head=(9 * sx, 3), spine_rot=lean(26), sash=-20 * sx, **{f"leg_{L}": air(L, 24 * sx, -2), f"leg_{R}": air(R, -20 * sx, -18, fs_t=0.9, fs_s=0.8)}, **bk(62, 94, 70, 98))
        k4 = P(pelvis=(5 * sx, 10), chest=(6 * sx, 8), head=(4 * sx, 5), spine_rot=lean(12), sash=10 * sx, **{f"leg_{L}": lg(L, 16 * sx, 0), f"leg_{R}": lg(R, -4 * sx, 0), f"arm_{L}": arm(sx * 22, Lu * 0.9, -sx * 140, Lf * 0.8, 0.0, "guard"), f"arm_{R}": arm(-sx * 40, Ru, sx * 20, Rf, 0.0, "side")})
    k5 = P(pelvis=(1 * sx, 3), chest=(1 * sx, 2), sash=4 * sx, **({} if NORTH else {f"leg_{L}": lg(L, 6 * sx, 0)}))
    keys = [(0, k0), (1, k0), (2, k1), (4, k2), (6, k3), (7, k4), (9, k5)]
    return {"name": "Dash", "fps": 22, "loop": False, "frames": tween(keys, 10),
            "events": {"anticipation_start": 0, "burst_start": 2, "travel_end": 6, "recover_start": 7}}

def hurt_keys():
    if NORTH:
        fl = lambda sd, u, f: arm(O[sd] * u, LU[sd], O[sd] * f, LF[sd], 0.0, "side")
        hit = P(pelvis=(2, 3), chest=(4, 2), head=(6, -1), head_rot=8, spine_rot=-7, sash=14, arm_n=fl("n", 54, 40), arm_f=fl("f", 40, 30))
        stag = P(pelvis=(5, 5), chest=(8, 3), head=(9, 0), head_rot=12, spine_rot=-11, sash=-18, leg_n=lg("n", -3, 0), leg_f=lg("f", 5, 0), arm_n=fl("n", 62, 50), arm_f=fl("f", 34, 20))
        rec = P(pelvis=(2, 3), chest=(3, 2), head=(3, 0), head_rot=4, spine_rot=-4, sash=6)
        return hit, stag, rec
    hit = P(pelvis=(-3 * sx, 2), chest=(-6 * sx, 1), head=(-6 * sx, -2), head_rot=sx * 10, spine_rot=sx * 14, sash=22 * sx,
            **{f"arm_{L}": arm(sx * 6, Lu, -sx * 120, Lf, 0.0, "guard"), f"arm_{R}": arm(-sx * 70, Ru, -sx * 98, Rf, 0.0, "side")})
    stag = P(pelvis=(-7 * sx, 4), chest=(-11 * sx, 3), head=(-10 * sx, -1), head_rot=sx * 16, spine_rot=sx * 20, sash=34 * sx,
             **{f"leg_{L}": lg(L, 2 * sx, -2, planted=False), f"leg_{R}": lg(R, 4 * sx, 0), f"arm_{L}": arm(-sx * 22, Lu, -sx * 100, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * 90, Ru, -sx * 120, Rf, 0.0, "side")})
    rec = P(pelvis=(-3 * sx, 4), chest=(-5 * sx, 3), head=(-4 * sx, 0), head_rot=sx * 6, spine_rot=sx * 8, sash=10 * sx)
    return hit, stag, rec

def hurt():
    hit, stag, rec = hurt_keys()
    keys = [(0, hit), (2, stag), (4, stag), (6, rec), (7, P())]
    return {"name": "Hurt", "fps": 20, "loop": False, "frames": tween(keys, 8), "events": {"impact": 0, "interruptible_from": 5}}

FALL = 1 if D != "west" else -1                  # root_rot sign: + = counter-clockwise = head swings to the screen left
def lie(rot, rx, ry, arms, **kw):
    p = P(root=(rx, ry), root_rot=FALL * rot, **kw)
    for k in ("leg_n", "leg_f"): p.pop(k, None)
    p.update(arms); return p

def death():
    hit, stag, _ = hurt_keys()
    buckle = copy.deepcopy(stag)
    buckle["pelvis"] = (buckle["pelvis"][0], 15); buckle["chest"] = (buckle["chest"][0], 12)
    for s in "nf":
        buckle[f"leg_{s}"] = dict(buckle.get(f"leg_{s}", {"sole": SOLES[s]}), fs_t=0.78, fs_s=0.9, planted=False)
    # arms are world-space directions: flung up/out while tipping, then lying along the ground
    up = lambda: {f"arm_{L}": arm(FALL * 150, Lu, FALL * 172, Lf, 0.0, "side"), f"arm_{R}": arm(-FALL * 120, Ru, -FALL * 150, Rf, 0.0, "side")}
    mid = lambda: {f"arm_{L}": arm(FALL * 120, Lu, FALL * 130, Lf, 0.0, "side"), f"arm_{R}": arm(-FALL * 100, Ru, -FALL * 110, Rf, 0.0, "side")}
    ground = lambda e=0: {f"arm_{L}": arm(FALL * (112 + e), Lu, FALL * (100 + e), Lf, 0.0, "side"), f"arm_{R}": arm(FALL * (80 + e), Ru, FALL * (92 + e), Rf, 0.0, "side")}
    X, Y = FALL * (79 if NORTH else 100), -16
    keys = [
        (0, hit), (1, stag), (3, buckle),
        (6, lie(30, X * 0.7, -6, up(), spine_rot=FALL * 8, head_rot=FALL * 14, sash=FALL * 30)),
        (9, lie(64, X * 1.03, Y * 1.25, mid(), spine_rot=FALL * 4, head_rot=FALL * 10, sash=FALL * 40)),
        (10, lie(90, X, Y - 3, mid(), head_rot=FALL * 6, sash=FALL * 22)),
        (11, lie(90, X, Y + 1, ground(4), head_rot=FALL * 14, sash=FALL * 8)),
        (13, lie(90, X, Y, ground(0), head_rot=FALL * 20, sash=0.0)),
        (15, lie(90, X, Y, ground(0), head_rot=FALL * 20, sash=0.0)),
    ]
    return {"name": "Death", "fps": 14, "loop": False, "frames": tween(keys, 16), "events": {"hit": 0, "ground_contact": 10, "settled": 13}}

CLIPS = [dash, hurt, death]

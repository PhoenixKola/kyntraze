"""B22 Kai-kit clips for NORTH / EAST / WEST (all forms): Lunge, Uppercut, Slam (see anim_kk.py for the south versions and the frame / event contract).
EAST is authored; WEST is the same targets mirrored through SX (never mirrored art); NORTH has its own back-view targets."""
import os
import danim as a
import danim_b03g as g
import drig as r

exec(open(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "abilities", "scripts", "reach_helper.py"))).read())
reach = make_reach(a, r)
SX, D, L, R = a.SX, a.D, a.LEAD, a.REAR
NORTH = D == "north"
sx = SX if not NORTH else 1
P, lg = g.P, g.lg

def hands(body, mid, gap, slot, pref="down", rear_slot=None, back=None):
    if NORTH: t = {"n": (mid[0] - gap / 2, mid[1]), "f": (mid[0] + gap / 2, mid[1])}; sl = {"n": slot, "f": slot}
    else:
        mx = sx * mid[0]; t = {L: (mx + sx * (3 + gap / 2), mid[1]), R: (mx - sx * (3 + gap / 2), mid[1])}; sl = {L: slot, R: rear_slot or slot}
    body.update(reach(body, t, sl, pref, back if back is not None else -sx)); return body

def legs(dl, dr):
    return dict(leg_n=lg("n", dl, 0), leg_f=lg("f", dr, 0)) if NORTH else {f"leg_{L}": lg(L, dl * sx, 0), f"leg_{R}": lg(R, dr * sx, 0)}

def K_(pel, che, hea=(0, 0), sash=0.0, spine=0.0, lean=0, lg_=(0, 0)):
    """body pose in direction-neutral numbers: lean = forward shift of the whole upper body (east/west only; north has no forward axis)."""
    f = 0 if NORTH else lean * sx
    return P(pelvis=(pel[0] + f, pel[1]), chest=(che[0] + f * 1.2, che[1]), head=(hea[0] + f * 0.6, hea[1]), sash=sash * (1 if NORTH else sx), spine_rot=(0 if NORTH else -sx * spine), **legs(*lg_))

def F(x, y, gap, release=False):
    """fist target: EAST x is forward; NORTH is centred and sits ~10 px higher than the south/east height."""
    if NORTH: return (0, y - 10 - (6 if release else 0)), gap * 1.5
    return (x, y), gap

def S(rel):   # slot / pref per phase
    return ("side", "down") if rel and not NORTH else ("guard", "out") if NORTH else ("guard", "down")

def pose(pel, che, fist, rel=False, **kw):
    mid, gap = F(*fist, release=rel); slot, pref = S(rel)
    return hands(K_(pel, che, **kw), mid, gap, slot, pref, "side" if not NORTH else None)

def lunge():
    K = [P(),
         pose((0, 8), (0, 5), (24, -52, 10), hea=(0, 2), sash=-6, spine=0),
         pose((0, 3), (0, 2), (50, -92, 6), True, sash=-26, spine=9, lean=5, lg_=(2, -2)),
         pose((0, 3), (0, 3), (50, -90, 6), True, sash=-32, spine=9, lean=5, lg_=(2, -2)),
         pose((0, 5), (0, 3), (36, -80, 14), True, sash=-10, lean=2),
         P()]
    keys = [(0, K[0]), (2, K[1]), (3, K[2]), (8, K[3]), (11, K[4]), (13, K[5])]
    return {"name": "Lunge", "fps": 24, "loop": False, "frames": g.tween(keys, 14), "events": {"coil": 2, "release": 3, "recover_start": 8, "interruptible_from": 10}}

def uppercut():
    K = [P(),
         pose((0, 9), (0, 6), (20, -50, 8), hea=(0, 2), sash=-8, spine=-4),
         pose((0, 5), (0, 3), (30, -96, 8), sash=14, lg_=(1, -1), lean=2),
         pose((0, 1), (0, -2), (38, -136, 6), True, hea=(0, -3), sash=-28, spine=7, lean=3, lg_=(1, -1)),
         pose((0, 2), (0, -1), (38, -138, 6), True, hea=(0, -2), sash=-34, spine=7, lean=3, lg_=(1, -1)),
         pose((0, 5), (0, 3), (36, -96, 12), True, sash=-10, lean=1),
         P()]
    keys = [(0, K[0]), (3, K[1]), (5, K[2]), (6, K[3]), (9, K[4]), (13, K[5]), (17, K[6])]
    return {"name": "Uppercut", "fps": 24, "loop": False, "frames": g.tween(keys, 18), "events": {"coil": 3, "release": 6, "recover_start": 10, "interruptible_from": 13}}

def slam():
    K = [P(),
         pose((0, 5), (0, 3), (26, -104, 10), sash=-6),
         pose((0, 3), (0, 0), (22, -142, 12), hea=(0, -1), sash=10),
         pose((0, 2), (0, -1), (22, -150, 12), hea=(0, -2), sash=-14, spine=-3),
         pose((0, 11), (0, 8), (46, -42, 6), True, hea=(0, 4), sash=-30, spine=9, lean=5, lg_=(2, -2)),
         pose((0, 12), (0, 9), (46, -40, 6), True, hea=(0, 5), sash=-36, spine=9, lean=5, lg_=(2, -2)),
         pose((0, 7), (0, 4), (34, -60, 14), True, sash=-10, lean=2),
         P(pelvis=(0, 2), chest=(0, 1), sash=4 * sx), P()]
    keys = [(0, K[0]), (3, K[1]), (7, K[2]), (10, K[3]), (11, K[4]), (14, K[5]), (20, K[6]), (23, K[7]), (25, K[8])]
    frames = g.tween(keys, 26)
    for i, p in enumerate(frames):
        if 7 <= i <= 10: s = (1, -1)[i % 2]; p["sash"] = p.get("sash", 0.0) + 6 * s * sx; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1])
    return {"name": "Slam", "fps": 20, "loop": False, "frames": frames, "events": {"gather_start": 0, "hold": 7, "release": 11, "recover_start": 14, "interruptible_from": 20}}

CLIPS = [lunge, uppercut, slam]

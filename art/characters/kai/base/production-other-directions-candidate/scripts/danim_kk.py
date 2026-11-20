"""B22 Kai-kit clips for NORTH / EAST / WEST (all forms): Lunge, Uppercut, Slam (see anim_kk.py for the south versions and the frame / event contract).
EAST is authored; WEST is the same targets mirrored through SX (never mirrored art); NORTH has its own back-view targets."""
import math
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


# ------------------------------------------------------------------ B25.1: Kick / Glide / Dive (Combat Identity pass). EAST authored, WEST = same targets through SX, NORTH has its own back-view numbers.
air = g.air
def H(body, lead, rear, sl="guard", sr="guard", pref="down"):
    """fist targets per hand: lead / rear = (forward x, y) for east/west; for NORTH (x offset from the spine, y) with lead = right (f) hand, rear = left (n) hand."""
    if NORTH: t = {"f": (lead[0], lead[1] - 10), "n": (rear[0], rear[1] - 10)}; s_ = {"f": sl, "n": sr}
    else: t = {L: (sx * lead[0], lead[1]), R: (sx * rear[0], rear[1])}; s_ = {L: sl, R: sr}
    body.update(reach(body, t, s_, pref, -sx)); return body
def pl(**k):   # planted lead / rear legs for east-west, planted n / f for north
    return dict(leg_n=lg("n", k.get("a", 0), 0), leg_f=lg("f", k.get("b", 0), 0)) if NORTH else {f"leg_{L}": lg(L, k.get("a", 0) * sx, 0), f"leg_{R}": lg(R, k.get("b", 0) * sx, 0)}

def kick():
    """Lead-leg front kick: chamber, RELEASE (leg out straight at hip height, torso counter-leans, arms balance), retract, plant. 16 frames @ 24 fps. NORTH: the screen-right leg kicks away from the camera."""
    def body(pel, che, hea, sash, spine, lean, kleg):
        b = K_(pel, che, hea, sash=sash, spine=spine, lean=lean)
        if NORTH: b.update(leg_n=lg("n", -2, 0), leg_f=kleg)
        else: b.update({f"leg_{R}": lg(R, -5 * sx, 0), f"leg_{L}": kleg})
        return b
    ch = air("f" if NORTH else L, 10 if NORTH else 16 * sx, -34 if NORTH else -30, fs_t=0.55, fs_s=0.9)
    rel = air("f" if NORTH else L, 14 if NORTH else 54 * sx, -46 if NORTH else -46)
    rel2 = air("f" if NORTH else L, 15 if NORTH else 56 * sx, -48 if NORTH else -48)
    K = [P(),
         H(body((0, 6), (0, 3), (0, 1), -8, -3, -2, ch), (24, -72, ), (4, -76), "guard", "guard"),
         H(body((0, 8), (0, 5), (0, 2), -24, -7, -5, rel), (6, -78), (-30, -68), "guard", "side", "out"),
         H(body((0, 8), (0, 5), (0, 2), -28, -7, -5, rel2), (4, -80), (-32, -68), "guard", "side", "out"),
         H(body((0, 6), (0, 3), (0, 1), -10, -3, -2, ch), (24, -72), (4, -76), "guard", "guard"),
         H(P(pelvis=(0, 5), chest=(0, 3), sash=-4, **pl(a=2, b=-3)), (26, -70), (6, -74), "guard", "guard"),
         P()]
    keys = [(0, K[0]), (2, K[1]), (4, K[2]), (6, K[3]), (9, K[4]), (12, K[5]), (15, K[6])]
    return {"name": "Kick", "fps": 24, "loop": False, "frames": g.tween(keys, 16), "events": {"coil": 2, "release": 4, "recover_start": 8, "interruptible_from": 11}}

def glide():
    """Skybreaker cruise: body pitched forward (east / west), legs trailing, one fist tucked, one reaching ahead. 4-frame loop @ 10 fps."""
    fr = []
    for i in range(4):
        t = 2 * math.pi * i / 4; s0, c0 = math.sin(t), math.cos(t)
        if NORTH:
            b = P(pelvis=(0, round(1.4 * s0)), chest=(0, 3 + round(s0)), head=(0, 3), sash=18 * c0, spine_rot=2 * s0, leg_n=air("n", -6 + round(2 * c0), -24, fs_t=0.8), leg_f=air("f", 7 - round(2 * c0), -29, fs_t=0.8))
        else:
            b = K_((0, 5 + round(s0)), (0, 5), (0, 2), sash=-40 + 8 * c0, spine=32 + 2 * s0, lean=15,
                   lg_=(0, 0)); b.update({f"leg_{L}": air(L, -14 * sx + round(3 * c0) * sx, -12 + round(2 * s0)), f"leg_{R}": air(R, -32 * sx - round(3 * c0) * sx, -20 - round(2 * s0))})
        fr.append(H(b, (60, -98 + round(2 * s0)), (-2, -64), "side", "guard", "out") if not NORTH else H(b, (18, -116 + round(2 * s0)), (-18, -72), "side", "guard", "out"))
    return {"name": "Glide", "fps": 10, "loop": True, "frames": fr, "events": {}}

def dive():
    """Skybreaker descent strike and landing: aim (fists forward-down), fall, RELEASE = fists and boots meet the ground in a deep crouch, hold, rise. 20 frames @ 22 fps."""
    def trail(dx1, dy1, dx2, dy2):
        return dict(leg_n=air("n", dx1, dy1), leg_f=air("f", dx2, dy2)) if NORTH else {f"leg_{L}": air(L, dx1 * sx, dy1), f"leg_{R}": air(R, dx2 * sx, dy2)}
    aim = K_((0, 3), (0, 7), (0, 5), sash=-26, spine=16, lean=6); aim.update(trail(-16, -14, -34, -22))
    fall = K_((0, 3), (0, 8), (0, 6), sash=-34, spine=20, lean=8); fall.update(trail(-18, -16, -38, -26))
    K = [P(),
         H(aim, (40, -40), (30, -52), "side", "side", "out"),
         H(fall, (44, -30), (36, -40), "side", "side", "out"),
         pose((0, 14), (0, 11), (46, -36, 8), True, hea=(0, 6), sash=-30, spine=9, lean=5, lg_=(2, -2)),
         pose((0, 15), (0, 12), (46, -34, 8), True, hea=(0, 7), sash=-36, spine=9, lean=5, lg_=(2, -2)),
         pose((0, 8), (0, 5), (34, -60, 14), True, sash=-10, lean=2),
         P()]
    keys = [(0, K[0]), (2, K[1]), (5, K[2]), (7, K[3]), (10, K[4]), (14, K[5]), (19, K[6])]
    return {"name": "Dive", "fps": 22, "loop": False, "frames": g.tween(keys, 20), "events": {"gather_start": 0, "hold": 2, "release": 7, "recover_start": 10, "interruptible_from": 15}}

CLIPS = [lunge, uppercut, slam, kick, glide, dive]

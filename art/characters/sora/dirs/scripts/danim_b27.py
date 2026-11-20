"""B27 SORA NORTH / EAST / WEST: Azure Sovereign flight clips Takeoff / Glide / Dive (names, frame counts, fps and release frames match south/rig/anim_b27.py).
EAST is authored; WEST is the same targets through SX (never mirrored art); NORTH is a true rear view: fists live beside the spine and strikes rise up the screen (away from the camera)."""
import math
import os
import danim as a
import danim_b03g as g
import drig as r

exec(open(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "kai", "abilities", "scripts", "reach_helper.py"))).read())
reach = make_reach(a, r)
SX, D, L, R = a.SX, a.D, a.LEAD, a.REAR
NORTH = D == "north"
sx = SX if not NORTH else 1
P, lg, air = g.P, g.lg, g.air

def legs(dl, dr):
    return dict(leg_n=lg("n", dl, 0), leg_f=lg("f", dr, 0)) if NORTH else {f"leg_{L}": lg(L, dl * sx, 0), f"leg_{R}": lg(R, dr * sx, 0)}
def K_(pel, che, hea=(0, 0), sash=0.0, spine=0.0, lean=0, lg_=(0, 0)):
    f = 0 if NORTH else lean * sx
    return P(pelvis=(pel[0] + f, pel[1]), chest=(che[0] + f * 1.2, che[1]), head=(hea[0] + f * 0.6, hea[1]), sash=sash * (1 if NORTH else sx), spine_rot=(0 if NORTH else -sx * spine), **legs(*lg_))
def kleg(which, dx, dy, **k):
    """a free (airborne) leg: `which` is 'lead' / 'rear'. NORTH: lead = screen-right (f), rear = screen-left (n)."""
    if NORTH: return {"leg_f" if which == "lead" else "leg_n": air("f" if which == "lead" else "n", dx * 0.4, dy, **k)}
    return {f"leg_{L if which == 'lead' else R}": air(L if which == "lead" else R, dx * sx, dy, **k)}
def N2(p, side):   # east fist target -> NORTH target (x beside the spine, strikes rise up the screen)
    x, y = p; return ((15 if side == "f" else -15) + (0 if x < 24 else 3), y - 8 - 0.28 * max(0.0, x - 14))
def H(body, lead, rear, sl="guard", sr="guard", pref="down"):
    if NORTH: t = {"f": N2(lead, "f"), "n": N2(rear, "n")}; s_ = {"f": sl, "n": sr}
    else: t = {L: (sx * lead[0], lead[1]), R: (sx * rear[0], rear[1])}; s_ = {L: sl, R: sr}
    body.update(reach(body, t, s_, pref, -sx)); return body
def T(keys, n): return g.tween(keys, n)
def pl(a_=0, b_=0): return legs(a_, b_)
PM = lambda **k: P(**k)

def takeoff():
    crouch = H(K_((0, 12), (0, 8), (0, 4), sash=-8, lg_=(3, -3)), (20, -52), (-8, -50), "guard", "guard", "outdown")
    def fly(lift, sh, c, **leg): b = K_((0, lift), (0, lift * 0.3), (0, lift * 0.1), sash=sh, spine=c, lean=3); b.update(leg); return b
    launch = H(fly(-14, -24, 4, **kleg("lead", 6, -18), **kleg("rear", -10, -22)), (56, -96), (-6, -70), "side", "guard", "out")
    airp = H(fly(-24, -32, 6, **kleg("lead", 6, -22), **kleg("rear", -14, -30)), (62, -100), (-10, -72), "side", "guard", "out")
    return {"name": "Takeoff", "fps": 20, "loop": False, "frames": T([(0, P()), (2, crouch), (4, launch), (7, airp), (9, airp)], 10), "events": {"coil": 2, "release": 4, "recover_start": 7, "interruptible_from": 9}}

def glide():
    fr = []
    for i in range(4):
        t = 2 * math.pi * i / 4; s0, c0 = math.sin(t), math.cos(t)
        if NORTH:
            b = P(pelvis=(0, round(1.4 * s0)), chest=(0, 3 + round(s0)), head=(0, 3), sash=18 * c0, spine_rot=2 * s0, leg_n=air("n", -6 + round(2 * c0), -24, fs_t=0.8), leg_f=air("f", 7 - round(2 * c0), -29, fs_t=0.8))
            fr.append(H(b, (60, -98 + round(2 * s0)), (-2, -64), "side", "guard", "out"))
        else:
            b = K_((0, 5 + round(s0)), (0, 5), (0, 2), sash=-40 + 8 * c0, spine=32 + 2 * s0, lean=15); b.update({f"leg_{L}": air(L, -14 * sx + round(3 * c0) * sx, -12 + round(2 * s0)), f"leg_{R}": air(R, -32 * sx - round(3 * c0) * sx, -20 - round(2 * s0))})
            fr.append(H(b, (60, -98 + round(2 * s0)), (-2, -64), "side", "guard", "out"))
    return {"name": "Glide", "fps": 10, "loop": True, "frames": fr, "events": {}}

def dive():
    def trail(dx1, dy1, dx2, dy2): return dict(leg_n=air("n", dx1, dy1), leg_f=air("f", dx2, dy2)) if NORTH else {f"leg_{L}": air(L, dx1 * sx, dy1), f"leg_{R}": air(R, dx2 * sx, dy2)}
    aim = K_((0, 3), (0, 7), (0, 5), sash=-26, spine=16, lean=6); aim.update(trail(-16, -14, -34, -22))
    fall = K_((0, 3), (0, 8), (0, 6), sash=-34, spine=20, lean=8); fall.update(trail(-18, -16, -38, -26))
    land = lambda pel, che, hea, sash: H(K_(pel, che, hea, sash=sash, spine=9, lean=5, lg_=(2, -2)), (46, -36), (8, -34), "side", "side", "out")
    K = [P(), H(aim, (40, -40), (30, -52), "side", "side", "out"), H(fall, (44, -30), (36, -40), "side", "side", "out"),
         land((0, 14), (0, 11), (0, 6), -30), land((0, 15), (0, 12), (0, 7), -36),
         H(K_((0, 8), (0, 5), sash=-10, lean=2, lg_=(2, -2)), (34, -60), (14, -58), "side", "side", "out"), P()]
    return {"name": "Dive", "fps": 22, "loop": False, "frames": T([(0, K[0]), (2, K[1]), (5, K[2]), (7, K[3]), (10, K[4]), (14, K[5]), (19, K[6])], 20), "events": {"gather_start": 0, "hold": 2, "release": 7, "recover_start": 10, "interruptible_from": 15}}

CLIPS = [takeoff, glide, dive]

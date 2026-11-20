"""B26 REN NORTH / EAST / WEST: Crimson Ascendant combat clips (names, frame counts, fps and release frames match rig/anim_b26.py; see that file for the list).
EAST is authored; WEST is the same targets through SX (never mirrored art); NORTH is a true rear view: fists live beside the spine and strikes rise up the screen (away from the camera)."""
import math
import os
import danim as a
import danim_b03g as g
import drig as r

exec(open(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "kai", "abilities", "scripts", "reach_helper.py"))).read())
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

def jab():
    K = [P(),
         H(K_((0, 5), (0, 3), (0, 1), sash=6, spine=-4, lean=-1, lg_=(1, -1)), (6, -70), (-12, -66), "guard", "guard"),
         H(K_((0, 3), (0, 2), (0, 1), sash=-26, spine=6, lean=3, lg_=(3, -2)), (62, -88), (-8, -66), "side", "guard", "out"),
         H(K_((0, 3), (0, 2), (0, 1), sash=-30, spine=7, lean=4, lg_=(3, -2)), (66, -90), (-8, -66), "side", "guard", "out"),
         H(K_((0, 4), (0, 2), sash=-8, lean=1, lg_=(1, -1)), (30, -76), (-6, -70), "guard", "guard"), P()]
    return {"name": "Jab", "fps": 24, "loop": False, "frames": T([(0, K[0]), (1, K[1]), (3, K[2]), (5, K[3]), (8, K[4]), (11, K[5])], 12), "events": {"coil": 1, "release": 3, "recover_start": 6, "interruptible_from": 8}}

def kick():
    pr = kleg("rear", 14, -32, fs_t=0.6, fs_s=0.9); rr = kleg("rear", 52, -46); rr2 = kleg("rear", 54, -48)   # the rear (near-camera) leg whips through
    def body(pel, che, hea, sash, spine, lean, kl): b = K_(pel, che, hea, sash=sash, spine=spine, lean=lean); b.update(kl); return b
    K = [P(),
         H(body((0, 6), (0, 3), (0, 1), -6, -3, -1, pr), (30, -76), (4, -72), "guard", "guard"),
         H(body((0, 8), (0, 5), (0, 2), -22, -7, 1, rr), (40, -84), (-30, -70), "side", "side", "out"),
         H(body((0, 8), (0, 5), (0, 2), -26, -7, 1, rr2), (42, -86), (-32, -70), "side", "side", "out"),
         H(body((0, 6), (0, 3), (0, 1), -8, -3, -1, pr), (30, -76), (4, -72), "guard", "guard"),
         H(K_((0, 5), (0, 3), sash=-4, lg_=(2, -1)), (32, -76), (4, -72), "guard", "guard"), P()]
    return {"name": "Kick", "fps": 24, "loop": False, "frames": T([(0, K[0]), (2, K[1]), (4, K[2]), (6, K[3]), (9, K[4]), (12, K[5]), (15, K[6])], 16), "events": {"coil": 2, "release": 4, "recover_start": 8, "interruptible_from": 11}}

def hook():
    K = [P(),
         H(K_((0, 8), (0, 5), (0, 2), sash=-8, spine=5, lean=-2, lg_=(3, -3)), (30, -76), (-34, -52), "guard", "side", "outdown"),
         H(K_((0, 10), (0, 7), (0, 3), sash=-14, spine=8, lean=-3, lg_=(3, -3)), (28, -76), (-40, -48), "guard", "side", "outdown"),
         H(K_((0, 7), (0, 4), (0, 2), sash=22, spine=-5, lean=2, lg_=(-3, 3)), (34, -78), (14, -56), "guard", "side", "out"),
         H(K_((0, 6), (0, 4), (0, 2), sash=26, spine=-7, lean=3, lg_=(-3, 3)), (34, -78), (40, -52), "guard", "side", "out"),
         H(K_((0, 6), (0, 4), (0, 2), sash=28, spine=-7, lean=3, lg_=(-3, 3)), (34, -78), (44, -52), "guard", "side", "out"),
         H(K_((0, 5), (0, 3), sash=6, lg_=(1, -1)), (30, -74), (-6, -68), "guard", "guard"), P()]
    return {"name": "Hook", "fps": 24, "loop": False, "frames": T([(0, K[0]), (1, K[1]), (3, K[2]), (4, K[4]), (6, K[5]), (10, K[6]), (13, K[7])], 14), "events": {"coil": 2, "release": 4, "recover_start": 7, "interruptible_from": 10}}

def uppercut():
    K = [P(),
         H(K_((0, 10), (0, 6), (0, 3), sash=-8, spine=-4, lean=-2, lg_=(2, -2)), (28, -70), (-6, -40), "guard", "guard", "outdown"),
         H(K_((0, 6), (0, 3), (0, 0), sash=12, spine=3, lean=1, lg_=(3, -2)), (30, -76), (4, -96), "guard", "side", "out"),
         H(K_((0, 0), (0, -3), (0, -4), sash=-26, spine=5, lean=2, lg_=(3, -2)), (30, -80), (8, -140), "guard", "side", "out"),
         H(K_((0, 1), (0, -2), (0, -3), sash=-32, spine=5, lean=2, lg_=(3, -2)), (30, -80), (8, -142), "guard", "side", "out"),
         H(K_((0, 5), (0, 3), sash=-10, lg_=(1, -1)), (30, -74), (6, -92), "guard", "guard"), P()]
    return {"name": "Uppercut", "fps": 24, "loop": False, "frames": T([(0, K[0]), (3, K[1]), (5, K[2]), (6, K[3]), (9, K[4]), (13, K[5]), (17, K[6])], 18), "events": {"coil": 3, "release": 6, "recover_start": 10, "interruptible_from": 13}}

def cyclone():
    wind = H(K_((0, 10), (0, 6), (0, 3), sash=-12, lg_=(-4, 4)), (20, -62), (-20, -62), "guard", "guard", "outdown")
    sa = H(K_((0, 9), (0, 5), (0, 3), sash=26, spine=-9, lean=1, lg_=(-5, 5)), (54, -92), (-46, -86), "side", "side", "out")
    sb = H(K_((0, 9), (0, 5), (0, 3), sash=-26, spine=9, lean=-1, lg_=(-5, 5)), (40, -88), (-56, -92), "side", "side", "out")
    rel = H(K_((0, 6), (0, 1), (0, -1), sash=-4, lg_=(-8, 8)), (60, -98), (-58, -98), "side", "side", "out")
    fr = T([(0, P()), (3, wind), (4, wind)], 5) + [dict(sa if i % 2 == 0 else sb) for i in range(12)]
    fr += T([(0, rel), (2, rel), (5, H(K_((0, 5), (0, 3), sash=-6, lg_=(-4, 4)), (24, -66), (-22, -66), "guard", "guard")), (8, P())], 9)
    return {"name": "Cyclone", "fps": 22, "loop": False, "frames": fr, "events": {"coil": 2, "spin_start": 5, "release": 17, "recover_start": 19, "interruptible_from": 22}}

def rampage():
    grab = H(K_((0, 6), (0, 4), (0, 3), sash=-12, spine=-3, lean=3, lg_=(4, -4)), (52, -72), (22, -68), "side", "side", "out")
    drive = H(K_((0, 9), (0, 8), (0, 6), sash=-26, spine=-7, lean=8, lg_=(5, -5)), (30, -52), (8, -54), "guard", "guard", "out")
    slam = H(K_((0, 12), (0, 9), (0, 5), sash=-30, spine=-3, lean=4, lg_=(4, -4)), (34, -38), (22, -38), "side", "side", "out")
    slam2 = H(K_((0, 13), (0, 10), (0, 6), sash=-36, lean=4, lg_=(4, -4)), (34, -36), (22, -36), "side", "side", "out")
    rec = H(K_((0, 7), (0, 4), sash=-10, lg_=(2, -2)), (30, -60), (8, -60), "guard", "guard", "out")
    K = [(0, P()), (2, H(K_((0, 5), (0, 3), sash=-8, lg_=(3, -3)), (24, -66), (4, -66), "guard", "guard", "out")), (4, grab), (6, drive), (10, drive), (12, H(K_((0, 7), (0, 5), lean=2, lg_=(4, -4)), (34, -84), (18, -82), "side", "side", "out")), (13, slam), (15, slam2), (18, rec), (21, P())]
    return {"name": "Rampage", "fps": 22, "loop": False, "frames": T(K, 22), "events": {"coil": 2, "grab": 4, "drive": 6, "release": 13, "recover_start": 15, "interruptible_from": 18}}

def pound():
    upf = H(K_((0, 5), (0, 2), (0, 0), sash=8, spine=3, lg_=(2, -2)), (30, -150), (-12, -66), "guard", "guard", "out")
    dnf = H(K_((0, 12), (0, 8), (0, 4), sash=-28, spine=-4, lean=3, lg_=(3, -3)), (38, -38), (-12, -66), "side", "guard", "out")
    upn = H(K_((0, 5), (0, 2), (0, 0), sash=-8, spine=-3, lg_=(2, -2)), (30, -66), (-12, -150), "guard", "guard", "out")
    dnn = H(K_((0, 12), (0, 8), (0, 4), sash=28, spine=4, lean=3, lg_=(3, -3)), (30, -66), (14, -38), "guard", "side", "out")
    upb = H(K_((0, 3), (0, 0), (0, -1), sash=-6, lg_=(2, -2)), (26, -150), (-8, -150), "guard", "guard", "out")
    dnb = H(K_((0, 14), (0, 10), (0, 5), sash=-34, spine=-3, lean=4, lg_=(3, -3)), (36, -36), (16, -36), "side", "side", "out")
    rec = H(K_((0, 7), (0, 4), sash=-8, lg_=(2, -2)), (30, -60), (4, -60), "guard", "guard", "out")
    K = [(0, P()), (3, upf), (5, upf), (6, dnf), (8, dnf), (10, upn), (12, upn), (13, dnn), (15, dnn), (17, upb), (18, dnb), (20, dnb), (23, rec), (25, P())]
    return {"name": "Pound", "fps": 22, "loop": False, "frames": T(K, 26), "events": {"coil": 2, "release": 6, "strike_b": 13, "final": 18, "recover_start": 20, "interruptible_from": 23}}

def nova_charge():
    pre = H(K_((0, 6), (0, 4), (0, 2), sash=6, spine=-3, lean=-2, lg_=(-4, 4)), (24, -70), (-12, -62), "guard", "guard", "outdown")
    hold = lambda d: H(K_((0, 9 + d), (0, 6 + d), (0, 3 + d), sash=10 + 2 * d, spine=-5, lean=-3, lg_=(-4, 4)), (30, -74 + d), (-14, -60), "guard", "side", "outdown")
    fr = T([(0, P()), (2, pre), (4, hold(0))], 5) + [dict(hold((0, 1, 0, -1, 0, 1, 0)[i])) for i in range(7)]
    return {"name": "NovaCharge", "fps": 14, "loop": False, "frames": fr, "events": {"coil": 1, "hold": 5, "hold_end": 11, "recover_start": 11, "interruptible_from": 11}}

def lunge():
    K = [P(),
         H(K_((0, 8), (0, 5), (0, 2), sash=8, spine=-5, lean=-3, lg_=(-4, 4)), (14, -62), (-14, -58), "guard", "guard", "outdown"),
         H(K_((0, 3), (0, 2), (0, 0), sash=-30, spine=6, lean=5, lg_=(5, -6)), (70, -86), (-14, -64), "side", "guard", "out"),
         H(K_((0, 3), (0, 3), (0, 1), sash=-34, spine=7, lean=6, lg_=(5, -6)), (72, -88), (-14, -64), "side", "guard", "out"),
         H(K_((0, 5), (0, 3), sash=-10, lg_=(1, -1)), (30, -76), (-6, -68), "guard", "guard"), P()]
    return {"name": "Lunge", "fps": 24, "loop": False, "frames": T([(0, K[0]), (2, K[1]), (3, K[2]), (8, K[3]), (11, K[4]), (13, K[5])], 14), "events": {"coil": 2, "release": 3, "recover_start": 8, "interruptible_from": 10}}

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

CLIPS = [jab, kick, hook, uppercut, cyclone, rampage, pound, nova_charge, lunge, takeoff, glide, dive]

"""B22 Kai-kit clips for SOUTH (all forms): Lunge (Surge Step / Meteor Drive launch), Uppercut (Rising Flare), Slam (Sunfall Crucible / Instinct Reversal).
Same solver, parts, stance and fist-target helper as anim_b05.py. Frame counts / fps / release frames are mirrored by src/assets/kaiAnimation.ts.
  Lunge    14 frames @ 24 fps, RELEASE = frame 3 (the drive), recover 8-13.
  Uppercut 18 frames @ 24 fps, RELEASE = frame 6 (fist tops out), recover 10-17.
  Slam     26 frames @ 20 fps, gather 0-9, RELEASE = frame 11 (the fists hit the ground), recover 14-25."""
import os
import anim as a
import anim_b03g as g
import rig as r

P, foot = g.P, g.foot
exec(open(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "abilities", "scripts", "reach_helper.py"))).read())
reach = make_reach(a, r)
CX = 9.0
def hands(body, mid, gap, slot, pref="outdown"):
    t = {"n": (mid[0] - gap / 2, mid[1]), "f": (mid[0] + gap / 2, mid[1])}
    body.update(reach(body, t, {"n": slot, "f": slot}, pref)); return body

def lunge():
    wide = dict(leg_n=foot("n", 2, 0), leg_f=foot("f", -2, 0)); low = dict(leg_n=foot("n", 0, 0), leg_f=foot("f", 0, 0))
    K = [P(),
         hands(P(pelvis=(0, 8), chest=(0, 5), head=(0, 2), sash=-6, spine_rot=3, **low), (CX, -50), 30, "angle", "outdown"),                  # coil: fists drawn back, hips sunk
         hands(P(pelvis=(0, 3), chest=(0, 2), head=(0, 0), sash=-26, spine_rot=-3, **wide), (CX, -80), 14, "front", "out"),                  # RELEASE: the drive, fists lead
         hands(P(pelvis=(0, 3), chest=(0, 3), head=(0, 1), sash=-32, **wide), (CX, -78), 14, "front", "out"),
         hands(P(pelvis=(0, 5), chest=(0, 3), sash=-10, **low), (CX, -66), 26, "front", "out"),
         P()]
    keys = [(0, K[0]), (2, K[1]), (3, K[2]), (8, K[3]), (11, K[4]), (13, K[5])]
    frames = [g.depth(q) for q in g.tween(keys, 14)]
    return {"name": "Lunge", "fps": 24, "loop": False, "frames": frames, "events": {"coil": 2, "release": 3, "recover_start": 8, "interruptible_from": 10}}

def uppercut():
    low = dict(leg_n=foot("n", 0, 0), leg_f=foot("f", 0, 0)); wide = dict(leg_n=foot("n", 1, 0), leg_f=foot("f", -1, 0))
    K = [P(),
         hands(P(pelvis=(0, 9), chest=(0, 6), head=(0, 2), sash=-8, spine_rot=4, **low), (CX, -44), 22, "angle", "outdown"),                  # deep sink, fists by the hips
         hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=14, spine_rot=-2, **wide), (CX, -92), 16, "angle", "out"),                    # the rise
         hands(P(pelvis=(0, 1), chest=(0, -2), head=(0, -3), sash=-28, **wide), (CX, -134), 12, "front", "out"),                              # RELEASE: fists top out above the head line
         hands(P(pelvis=(0, 2), chest=(0, -1), head=(0, -2), sash=-34, **wide), (CX, -136), 12, "front", "out"),
         hands(P(pelvis=(0, 5), chest=(0, 3), sash=-10, **low), (CX, -92), 26, "front", "out"),
         P()]
    keys = [(0, K[0]), (3, K[1]), (5, K[2]), (6, K[3]), (9, K[4]), (13, K[5]), (17, K[6])]
    frames = [g.depth(q) for q in g.tween(keys, 18)]
    return {"name": "Uppercut", "fps": 24, "loop": False, "frames": frames, "events": {"coil": 3, "release": 6, "recover_start": 10, "interruptible_from": 13}}

def slam():
    low = dict(leg_n=foot("n", 0, 0), leg_f=foot("f", 0, 0)); wide = dict(leg_n=foot("n", 2, 0), leg_f=foot("f", -2, 0))
    K = [P(),
         hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=-6, **low), (CX, -100), 30, "angle", "out"),                                  # fists climb
         hands(P(pelvis=(0, 3), chest=(0, 0), head=(0, -1), sash=10, **low), (CX, -138), 38, "angle", "out"),                                 # overhead
         hands(P(pelvis=(0, 2), chest=(0, -1), head=(0, -2), sash=-14, spine_rot=-3, **low), (CX, -146), 30, "angle", "out"),                 # hold, trembling
         hands(P(pelvis=(0, 11), chest=(0, 8), head=(0, 4), sash=-30, spine_rot=3, **wide), (CX, -40), 14, "front", "out"),                   # RELEASE: both fists hammer the ground
         hands(P(pelvis=(0, 12), chest=(0, 9), head=(0, 5), sash=-36, **wide), (CX, -38), 14, "front", "out"),
         hands(P(pelvis=(0, 7), chest=(0, 4), sash=-10, **low), (CX, -58), 30, "angle", "out"),
         P(pelvis=(0, 2), chest=(0, 1), sash=4), P()]
    keys = [(0, K[0]), (3, K[1]), (7, K[2]), (10, K[3]), (11, K[4]), (14, K[5]), (20, K[6]), (23, K[7]), (25, K[8])]
    frames = [g.depth(q) for q in g.tween(keys, 26)]
    for i, p in enumerate(frames):
        if 7 <= i <= 10: s = (1, -1)[i % 2]; p["sash"] = p.get("sash", 0.0) + 6 * s; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1])
    return {"name": "Slam", "fps": 20, "loop": False, "frames": frames, "events": {"gather_start": 0, "hold": 7, "release": 11, "recover_start": 14, "interruptible_from": 20}}

CLIPS = [lunge, uppercut, slam]

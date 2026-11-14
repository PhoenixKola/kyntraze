"""B05 / B05.1 signature-ability clips for Kai SOUTH (base AND Form I builds): Beam (Fracture Lance) and Sphere (Nova Bloom).
Same solver, parts and stance as anim.py. Hands are placed by declared FIST TARGETS (abilities/scripts/reach_helper.py): the same targets define the
exported hand anchors, so the effects start at the visible fists by construction.
  Beam   26 frames @ 20 fps: charge frames 0-9, RELEASE = frame 10, fire hold 10-19, recover 20-25 (sim: 0.5 / 0.5 / 0.3 s).
  Sphere 24 frames @ 20 fps: gather frames 0-15, RELEASE = frame 16 (the throw), recover 17-23 (sim: 0.8 / 0.4 s).
The game time-warps playback so the release frame lands on the sim's release tick; fps is nominal."""
import os
import anim as a
import anim_b03g as g
import rig as r

P, foot = g.P, g.foot
exec(open(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "abilities", "scripts", "reach_helper.py"))).read())
reach = make_reach(a, r)

CX = 9.0   # body centre line, sprite px right of the ground origin
def hands(body, mid, gap, slot, pref="outdown"):
    """body = P(...) pose; mid/gap place the two fists (n = screen-left, f = screen-right)."""
    t = {"n": (mid[0] - gap / 2, mid[1]), "f": (mid[0] + gap / 2, mid[1])}
    body.update(reach(body, t, {"n": slot, "f": slot}, pref)); return body

def beam():
    wide = dict(leg_n=foot("n", 1, 0), leg_f=foot("f", -1, 0))
    K = [
        P(),
        hands(P(pelvis=(0, 4), chest=(0, 2), head=(0, 0), sash=-4, leg_n=foot("n", 0, 0), leg_f=foot("f", 0, 0)), (CX + 1, -78), 24, "angle"),
        hands(P(pelvis=(0, 6), chest=(0, 4), head=(0, 0), sash=8, spine_rot=-2, **wide), (CX, -68), 15, "angle"),
        hands(P(pelvis=(0, 7), chest=(0, 4), head=(0, 0), sash=-10, spine_rot=3, **wide), (CX, -63), 13, "angle"),
        hands(P(pelvis=(0, 7), chest=(0, 4), head=(0, 0), sash=12, spine_rot=-3, **wide), (CX, -65), 13, "angle"),                      # charge hold: palms cupped around the core
        hands(P(pelvis=(0, 3), chest=(0, 0), head=(0, 0), sash=-22, **wide), (CX, -86), 14, "front", "out"),                              # RELEASE: both fists thrust at the camera, together
        hands(P(pelvis=(0, 4), chest=(0, 1), head=(0, 0), sash=-30, **wide), (CX, -84), 14, "front", "out"),                              # fire hold
        hands(P(pelvis=(0, 6), chest=(0, 3), head=(0, 0), sash=-12, **wide), (CX, -72), 30, "front", "out"),
        P(pelvis=(0, 3), chest=(0, 1), sash=6, leg_n=foot("n", 2, 0), leg_f=foot("f", -2, 0)),
        P(),
    ]
    keys = [(0, K[0]), (2, K[1]), (5, K[2]), (7, K[3]), (9, K[4]), (10, K[5]), (12, K[6]), (19, K[6]), (22, K[7]), (24, K[8]), (25, K[9])]
    frames = [g.depth(q) for q in g.tween(keys, 26)]
    for i, p in enumerate(frames):
        if 3 <= i <= 9:   # charge: the crouch trembles, energy is held
            s = (1, -1)[i % 2]; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1]); p["chest"] = (p["chest"][0] - s, p["chest"][1]); p["sash"] = p.get("sash", 0.0) + 5 * s
        if 10 <= i <= 19:  # fire: recoil buzz
            s = (1, -1)[i % 2]; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1]); p["sash"] = p.get("sash", 0.0) + 8 * s
    return {"name": "Beam", "fps": 20, "loop": False, "frames": frames,
            "events": {"charge_start": 0, "charge_hold": 7, "release": 10, "fire_end": 20, "recover_start": 20, "interruptible_from": 22}}

def sphere():
    low = dict(leg_n=foot("n", 0, 0), leg_f=foot("f", 0, 0))
    K = [
        P(),
        hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=-6, **low), (CX, -62), 15, "angle"),                                         # sink, orb forms in the palms
        hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=8, **low), (CX, -98), 34, "angle", "out"),                                 # hands carry it up
        hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=-14, leg_n=foot("n", 2, 0), leg_f=foot("f", -2, 0)), (CX, -122), 42, "angle", "out"),
        hands(P(pelvis=(0, 4), chest=(0, 2), head=(0, 0), sash=18, leg_n=foot("n", 1, 0), leg_f=foot("f", -1, 0)), (CX, -130), 46, "angle", "out"),   # hold overhead: the orb sits between the fists
        hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=-24, spine_rot=3, **low), (CX, -84), 14, "front", "out"),                   # THROW: fists drive down toward the target together
        hands(P(pelvis=(0, 7), chest=(0, 4), head=(0, 0), sash=-28, **low), (CX, -78), 20, "front", "out"),
        hands(P(pelvis=(0, 5), chest=(0, 3), sash=-8, **low), (CX, -70), 34, "front", "out"),
        P(pelvis=(0, 2), chest=(0, 1), sash=4),
        P(),
    ]
    keys = [(0, K[0]), (3, K[1]), (7, K[2]), (11, K[3]), (15, K[4]), (16, K[5]), (18, K[6]), (20, K[7]), (22, K[8]), (23, K[9])]
    frames = [g.depth(q) for q in g.tween(keys, 24)]
    for i, p in enumerate(frames):
        if 12 <= i <= 15: s = (1, -1)[i % 2]; p["sash"] = p.get("sash", 0.0) + 7 * s; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1])
    return {"name": "Sphere", "fps": 20, "loop": False, "frames": frames,
            "events": {"gather_start": 0, "raise": 7, "hold": 12, "release": 16, "recover_start": 18, "interruptible_from": 21}}

CLIPS = [beam, sphere]

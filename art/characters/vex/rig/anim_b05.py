"""REN SOUTH: Beam = Meteor Rush strike, Sphere = Bloodstar Impact (leap + slam). Same declarative key-pose method as Kai (body offsets + fist targets).
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
exec(open(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "kai", "abilities", "scripts", "reach_helper.py"))).read())
reach = make_reach(a, r)

CX = 9.0   # body centre line, sprite px right of the ground origin
def hands(body, mid, gap, slot, pref="outdown"):
    """body = P(...) pose; mid/gap place the two fists (n = screen-left, f = screen-right)."""
    t = {"n": (mid[0] - gap / 2, mid[1]), "f": (mid[0] + gap / 2, mid[1])}
    body.update(reach(body, t, {"n": slot, "f": slot}, pref)); return body

def hands2(body, tn, tf, sn, sf, pref="outdown"):
    """individual fist targets (sprite px rel. to ground origin) and slots for the n (screen-left) / f (screen-right) fists"""
    body.update(reach(body, {"n": tn, "f": tf}, {"n": sn, "f": sf}, pref)); return body

def beam():
    """Meteor Rush: coil into a deep crouch (0-9), RELEASE frame 10 = explosive forward strike (fist toward the camera, other fist cocked), a second strike with the other fist (15-19) for the chained rush, recover 20-25."""
    wide = dict(leg_n=foot("n", 2, 0), leg_f=foot("f", -2, 0))
    lunge = dict(leg_n=foot("n", 4, 0), leg_f=foot("f", -4, 0))
    K = [P(),
         hands2(P(pelvis=(0, 5), chest=(0, 2), sash=-4, **wide), (CX - 14, -50), (CX + 14, -54), "side", "side"),
         hands2(P(pelvis=(0, 9), chest=(0, 5), spine_rot=-3, sash=8, **wide), (CX - 16, -44), (CX + 16, -48), "side", "side"),
         hands2(P(pelvis=(0, 9), chest=(0, 5), spine_rot=3, sash=-10, **wide), (CX - 16, -44), (CX + 16, -48), "side", "side"),
         hands2(P(pelvis=(0, 4), chest=(0, 0), spine_rot=5, sash=-24, **lunge), (CX - 3, -68), (CX + 19, -88), "front", "guard", "out"),        # RELEASE: left fist drives at the camera
         hands2(P(pelvis=(0, 4), chest=(0, 0), spine_rot=-5, sash=24, **lunge), (CX - 19, -88), (CX + 3, -68), "side", "front", "out"),         # second strike, other fist
         hands2(P(pelvis=(0, 6), chest=(0, 3), sash=-8, **wide), (CX - 12, -64), (CX + 12, -64), "side", "guard"),
         P(pelvis=(0, 3), chest=(0, 1), sash=6), P()]
    keys = [(0, K[0]), (2, K[1]), (5, K[2]), (9, K[3]), (10, K[4]), (14, K[4]), (15, K[5]), (19, K[5]), (22, K[6]), (24, K[7]), (25, K[8])]
    frames = [g.depth(q) for q in g.tween(keys, 26)]
    for i, p in enumerate(frames):
        if 3 <= i <= 9:   # the coil trembles
            s = (1, -1)[i % 2]; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1]); p["chest"] = (p["chest"][0] - s, p["chest"][1]); p["sash"] = p.get("sash", 0.0) + 5 * s
        if 10 <= i <= 19:  # rush: hard recoil buzz
            s = (1, -1)[i % 2]; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1]); p["sash"] = p.get("sash", 0.0) + 8 * s
    return {"name": "Beam", "fps": 20, "loop": False, "frames": frames,
            "events": {"charge_start": 0, "charge_hold": 7, "release": 10, "fire_end": 20, "recover_start": 20, "interruptible_from": 22}}

def sphere():
    """Bloodstar Impact: crouch (0-6), leap (7-15: launch, tucked apex with both fists overhead, descent), RELEASE frame 16 = slam landing (fist driven to the ground, other arm back), recover 17-23."""
    low = dict(leg_n=foot("n", -3, 0), leg_f=foot("f", 3, 0))
    tuck = dict(leg_n=foot("n", 4, -36, planted=False, straight=True, slack=3.0), leg_f=foot("f", -4, -38, planted=False, straight=True, slack=3.0))
    land = dict(leg_n=foot("n", -9, 0), leg_f=foot("f", 9, 0))
    K = [P(),
         hands2(P(pelvis=(0, 9), chest=(0, 5), sash=-6, **low), (CX - 15, -44), (CX + 15, -48), "side", "side"),
         hands2(P(pelvis=(0, 17), chest=(0, 10), sash=10, **low), (CX - 17, -36), (CX + 17, -42), "side", "side"),
         hands2(P(pelvis=(0, -16), chest=(0, -4), sash=-14, leg_n=foot("n", 0, -16, planted=False, straight=True, slack=3.0), leg_f=foot("f", 0, -16, planted=False, straight=True, slack=3.0)), (CX - 8, -110), (CX + 8, -112), "angle", "angle", "out"),          # launch
         hands2(P(pelvis=(0, -32), chest=(0, -9), sash=20, **tuck), (CX - 6, -158), (CX + 6, -160), "angle", "angle", "out"),                                                         # apex: tucked, fists together overhead
         hands2(P(pelvis=(0, -12), chest=(0, -3), sash=-10, leg_n=foot("n", -2, -12, planted=False, straight=True, slack=3.0), leg_f=foot("f", 2, -12, planted=False, straight=True, slack=3.0)), (CX - 6, -138), (CX + 6, -140), "front", "front", "out"),         # descent
         hands2(P(pelvis=(0, 31), chest=(0, 18), spine_rot=7, sash=-30, **land), (CX - 2, -30), (CX + 26, -80), "front", "guard", "out"),                                              # RELEASE: slam, fist into the ground
         hands2(P(pelvis=(0, 28), chest=(0, 15), spine_rot=5, sash=-18, **land), (CX - 2, -32), (CX + 24, -78), "front", "guard", "out"),
         hands2(P(pelvis=(0, 6), chest=(0, 3), sash=-6, **low), (CX - 10, -50), (CX + 10, -52), "side", "guard"),
         P(pelvis=(0, 2), chest=(0, 1), sash=4), P()]
    keys = [(0, K[0]), (3, K[1]), (6, K[2]), (8, K[3]), (12, K[4]), (15, K[5]), (16, K[6]), (18, K[7]), (21, K[8]), (22, K[9]), (23, K[10])]
    frames = [g.depth(q) for q in g.tween(keys, 24)]
    return {"name": "Sphere", "fps": 20, "loop": False, "frames": frames,
            "events": {"gather_start": 0, "raise": 7, "hold": 12, "release": 16, "recover_start": 18, "interruptible_from": 21}}

CLIPS = [beam, sphere]

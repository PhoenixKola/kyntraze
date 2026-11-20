"""B22 Kai-kit clips for SOUTH (all forms): Lunge (Surge Step / Meteor Drive launch), Uppercut (Rising Flare), Slam (Sunfall Crucible / Instinct Reversal).
Same solver, parts, stance and fist-target helper as anim_b05.py. Frame counts / fps / release frames are mirrored by src/assets/kaiAnimation.ts.
  Lunge    14 frames @ 24 fps, RELEASE = frame 3 (the drive), recover 8-13.
  Uppercut 18 frames @ 24 fps, RELEASE = frame 6 (fist tops out), recover 10-17.
  Slam     26 frames @ 20 fps, gather 0-9, RELEASE = frame 11 (the fists hit the ground), recover 14-25."""
import math
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


# ------------------------------------------------------------------ B25.1: Kick / Glide / Dive (the Combat Identity pass)
fair = g.fair
def hands2(body, tn, tf, slot_n, slot_f, pref="outdown"):
    """Different fist target + slot per hand (hands() above puts both fists around one midpoint)."""
    body.update(reach(body, {"n": tn, "f": tf}, {"n": slot_n, "f": slot_f}, pref)); return body

def kick():
    """Roundhouse-style front kick seen from the camera: chamber (knee up and out), RELEASE = the screen-right leg thrown out wide at hip height with the torso leaning away, retract, plant. 16 frames @ 24 fps."""
    pl = foot("n", -4, 0)
    ch = fair("f", 16, -30, fs_t=0.62, fs_s=0.9); rel = fair("f", 40, -46, fs_t=1.0, fs_s=1.0); rel2 = fair("f", 42, -48, fs_t=1.0, fs_s=1.0)
    K = [P(),
         hands2(P(pelvis=(0, 5), chest=(0, 3), head=(0, 1), sash=-8, spine_rot=-2, leg_n=pl, leg_f=ch), (CX - 14, -70), (CX + 12, -78), "angle", "angle"),
         hands2(P(pelvis=(0, 8), chest=(0, 5), head=(0, 2), sash=-26, spine_rot=-8, leg_n=pl, leg_f=rel), (CX - 42, -86), (CX - 2, -66), "side", "angle", "out"),
         hands2(P(pelvis=(0, 8), chest=(0, 5), head=(0, 2), sash=-30, spine_rot=-8, leg_n=pl, leg_f=rel2), (CX - 44, -88), (CX - 2, -66), "side", "angle", "out"),
         hands2(P(pelvis=(0, 5), chest=(0, 3), head=(0, 1), sash=-10, spine_rot=-2, leg_n=pl, leg_f=ch), (CX - 14, -70), (CX + 12, -78), "angle", "angle"),
         hands2(P(pelvis=(0, 5), chest=(0, 3), sash=-4, leg_n=pl, leg_f=foot("f", 0, 1)), (CX - 16, -72), (CX + 20, -76), "angle", "angle"),
         P()]
    keys = [(0, K[0]), (2, K[1]), (4, K[2]), (6, K[3]), (9, K[4]), (12, K[5]), (15, K[6])]
    frames = [g.depth(q) for q in g.tween(keys, 16)]
    return {"name": "Kick", "fps": 24, "loop": False, "frames": frames, "events": {"coil": 2, "release": 4, "recover_start": 8, "interruptible_from": 11}}

def glide():
    """Skybreaker cruise: weightless, legs trailing together and raised, one fist tucked at the chest, one reaching forward-up. 4-frame loop @ 10 fps with a slow sway."""
    fr = []
    for i in range(4):
        t = 2 * math.pi * i / 4; sw = math.sin(t), math.cos(t)
        body = P(pelvis=(round(sw[1]), round(1.6 * sw[0])), chest=(0, 3 + round(sw[0])), head=(round(sw[1]), 3), sash=22 * sw[1], spine_rot=3.0 * sw[0],
                 leg_n=fair("n", 7, -17 + round(2 * sw[1]), fs_t=0.8, fs_s=0.9), leg_f=fair("f", -7, -21 - round(2 * sw[1]), fs_t=0.8, fs_s=0.9))
        fr.append(g.depth(hands2(body, (CX - 20, -76 + round(sw[0])), (CX + 26, -112 + round(2 * sw[1])), "angle", "front")))
    return {"name": "Glide", "fps": 10, "loop": True, "frames": fr, "events": {}}

def dive():
    """Skybreaker descent strike and landing: aim (fists forward-down, legs trailing), fall, RELEASE = both fists and boots meet the ground in a deep crouch, hold, rise. 20 frames @ 22 fps."""
    wide = dict(leg_n=foot("n", 3, 0), leg_f=foot("f", -3, 0))
    K = [P(),
         hands2(P(pelvis=(0, 2), chest=(0, 5), head=(0, 5), sash=-20, leg_n=fair("n", 6, -20), leg_f=fair("f", -6, -24)), (CX - 16, -78), (CX + 6, -58), "angle", "front"),
         hands2(P(pelvis=(0, 3), chest=(0, 7), head=(0, 6), sash=-32, leg_n=fair("n", 8, -26), leg_f=fair("f", -8, -30)), (CX - 6, -46), (CX + 8, -46), "front", "front", "out"),
         hands(P(pelvis=(0, 14), chest=(0, 11), head=(0, 7), sash=-30, spine_rot=3, **wide), (CX, -34), 14, "front", "out"),      # RELEASE: contact + compression
         hands(P(pelvis=(0, 15), chest=(0, 12), head=(0, 8), sash=-36, **wide), (CX, -32), 14, "front", "out"),
         hands(P(pelvis=(0, 8), chest=(0, 5), head=(0, 3), sash=-10, **wide), (CX, -60), 26, "angle", "out"),
         P()]
    keys = [(0, K[0]), (2, K[1]), (5, K[2]), (7, K[3]), (10, K[4]), (14, K[5]), (19, K[6])]
    frames = [g.depth(q) for q in g.tween(keys, 20)]
    return {"name": "Dive", "fps": 22, "loop": False, "frames": frames, "events": {"gather_start": 0, "hold": 2, "release": 7, "recover_start": 10, "interruptible_from": 15}}

CLIPS = [lunge, uppercut, slam, kick, glide, dive]

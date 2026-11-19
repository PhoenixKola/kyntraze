"""B23 Vex-specific SOUTH clips (poses only, same solver and parts as the other clips): Guard and Riposte.
The counter-blade is a rig part on the NEAR hand bone (hand_n, screen-left in this view) and points along the near forearm, so the blade is posed by the near arm: forearm up = blade up, forearm out to the left = a slash; angles to the right cross behind the torso and hide the arm.
Ren's clips never carry the blade; these are Vex's own acting: a low, still, blade-ready counter stance and one decisive outward counter-cut."""
import copy, math
import anim as a
import anim_b03g as g

P, foot, tween, depth = g.P, g.foot, g.tween, g.depth

def A(side, u, f, slot="angle", k=1.0):
    """Blade arm: the fist follows the forearm (slot 'angle', hand = forearm angle), so fist, cuff and blade stay one straight, closed piece; a stretched arm (k > 1) keeps the sleeve joined (the default slot leaves a dark open cuff)."""
    return a.arm(u, g.UL[side] * k, f, g.FL[side] * k, hand=f, slot=slot, cap=1.25)

def guard_key(sink, blade_u, blade_f, sash, head_rot=0.0, wide=3, chest=0, spine=-2, far=None):
    return P(pelvis=(0, sink), chest=(chest, max(0, sink - 1)), head=(0, max(0, sink - 2)), head_rot=head_rot, spine_rot=spine, sash=sash,
             leg_n=foot("n", -wide, 0), leg_f=foot("f", wide, 0), arm_n=A("n", blade_u, blade_f), **({"arm_f": far} if far else {}))

# ------------------------------------------------------------------ Guard: 12 frames @ 10 fps, loop. Low planted stance, blade up and out on the near side, the far fist stays raised at the face; slow breath, the blade tip trembles, sash drifts.
def guard():
    fr = []
    for i in range(12):
        t = 2 * math.pi * i / 12; br = math.sin(t - 0.8); tr = math.sin(2 * t + 0.6)
        fr.append(depth(guard_key(sink=4 + (1 if br < -0.4 else 0), blade_u=-30 + 1.6 * br, blade_f=-150 + 3.2 * tr, sash=5.0 * math.sin(t - 1.8), head_rot=1.2 * math.sin(t - 1.3))))
    return {"name": "Guard", "fps": 10, "loop": True, "frames": fr, "events": {}}

# ------------------------------------------------------------------ Riposte: 12 frames @ 20 fps. Read the strike (blade drawn high and back), coil, one decisive cut down and out to a level slash, hold, return to Guard.
def riposte():
    G = guard_key(4, -30, -150, 0)
    K = [
        G,
        guard_key(6, -14, -172, 6, head_rot=-3, wide=4, chest=1),                                   # 1 read: blade raised back over the shoulder
        guard_key(9, -6, -178, 12, head_rot=-5, wide=5, chest=2, spine=1),                          # 2 coil: deepest, blade high behind
        P(pelvis=(-2, 7), chest=(-3, 5), head=(-1, 4), spine_rot=-8, head_rot=3, sash=-12, leg_n=foot("n", -5, 1), leg_f=foot("f", 5, 0), arm_n=A("n", -50, -112, k=1.12)),                    # 3 launch: the cut begins
        P(pelvis=(-5, 6), chest=(-7, 4), head=(-3, 3), spine_rot=-14, head_rot=5, sash=-22, leg_n=foot("n", -8, 2), leg_f=foot("f", 4, 0), arm_n=A("n", -62, -78, k=1.22)),          # 4 IMPACT: slash out and down, arm fully out
        P(pelvis=(-6, 6), chest=(-8, 4), head=(-4, 3), spine_rot=-16, head_rot=6, sash=-28, leg_n=foot("n", -9, 2), leg_f=foot("f", 4, 0), arm_n=A("n", -64, -74, k=1.22)),          # 5 hold
        P(pelvis=(-4, 6), chest=(-5, 4), head=(-2, 3), spine_rot=-9, sash=-16, leg_n=foot("n", -6, 1), leg_f=foot("f", 4, 0), arm_n=A("n", -54, -50, k=1.15)),                              # 6 follow-through: blade sweeps low
        guard_key(6, -40, -118, 8, wide=4),                                                          # 7 blade swings back up
        guard_key(5, -33, -142, 4, wide=3),                                                          # 8
        G,                                                                                            # 9
    ]
    keys = [(0, K[0]), (1, K[1]), (2, K[2]), (3, K[3]), (4, K[4]), (5, K[5]), (6, K[6]), (8, K[7]), (10, K[8]), (11, K[9])]
    frames = [depth(q) for q in tween(keys, 12)]
    return {"name": "Riposte", "fps": 20, "loop": False, "frames": frames, "events": {"anticipation_start": 1, "impact": 4, "recover_start": 6, "interruptible_from": 9}}

# ------------------------------------------------------------------ Victory: 16 frames @ 10 fps. From the guard the blade sweeps down and out, then rises overhead in a quiet salute; frames 8-15 are the held salute (loop them). Chest lifts, head up, far fist stays at the face.
def victory():
    G = guard_key(4, -30, -150, 0)
    K = [
        G,
        guard_key(6, -44, -118, 6, wide=4),                                                         # 1 sink, blade sweeps down and out
        guard_key(7, -58, -86, 10, wide=4, chest=-1),                                               # 2 lowest, blade level out
        P(pelvis=(0, 2), chest=(0, 0), head=(0, -1), head_rot=2, sash=8, leg_n=foot("n", -3, 0), leg_f=foot("f", 3, 0), arm_n=A("n", -34, -132)),   # 3 rising
        P(pelvis=(0, -1), chest=(0, -2), head=(0, -3), head_rot=3, sash=-4, leg_n=foot("n", -3, 0), leg_f=foot("f", 3, 0), arm_n=A("n", -16, -170)),  # 4 blade overhead
        P(pelvis=(0, -2), chest=(0, -3), head=(0, -4), head_rot=3, sash=-8, leg_n=foot("n", -3, 0), leg_f=foot("f", 3, 0), arm_n=A("n", -10, -176)),  # 5 held salute (deepest lift)
    ]
    keys = [(0, K[0]), (2, K[1]), (4, K[2]), (6, K[3]), (7, K[4]), (8, K[5]), (15, K[5])]
    frames = []
    for i, q in enumerate(tween(keys, 16)):
        if i >= 8:
            t = 2 * math.pi * (i - 8) / 8; q = dict(q); q["sash"] = -8 + 5 * math.sin(t); q["arm_n"] = A("n", -10 + 1.2 * math.sin(t - 0.6), -176 + 2.0 * math.sin(2 * t)); q["chest"] = (0, -3 + (1 if math.sin(t - 1.0) < -0.5 else 0))
        frames.append(depth(q))
    return {"name": "Victory", "fps": 10, "loop": False, "frames": frames, "events": {"hold": 8}}

# ------------------------------------------------------------------ Transform (Riftbound / Voidheart reveal, 16 frames @ 20 fps, form_commit at 7): Vex's own beats. Settle into the blade guard, draw the blade back, the fracture presses up the arm (the held crouch trembles), then the cut: blade thrown up and out, chest wide, the new look commits behind the flash, and Vex stands blade-ready.
def transform():
    G = guard_key(4, -30, -150, 0)
    K = [
        P(),
        guard_key(7, -30, -150, 4),                                                                 # 1 settle into the guard
        guard_key(11, -14, -172, 10, head_rot=-4, wide=5, chest=2),                                 # 2 blade drawn back, deep sink
        guard_key(14, -8, -178, 16, head_rot=-6, wide=6, chest=2, spine=2),                         # 3 fracture pressure: deepest
        P(pelvis=(0, 8), chest=(0, 6), head=(0, 3), head_rot=3, sash=18, leg_n=foot("n", -6, 0), leg_f=foot("f", 6, 0), arm_n=A("n", -40, -120)),     # 4 release begins: blade sweeps out
        P(pelvis=(0, -3), chest=(0, -4), head=(0, -5), head_rot=5, sash=32, leg_n=foot("n", -7, 0), leg_f=foot("f", 7, 0), arm_n=A("n", -66, -84, k=1.15), arm_f=A("f", 60, 92, slot="angle")),   # 5 the cut: blade out, far arm flares
        P(pelvis=(0, -2), chest=(0, -4), head=(0, -4), head_rot=4, sash=36, leg_n=foot("n", -7, 0), leg_f=foot("f", 7, 0), arm_n=A("n", -22, -166), arm_f=A("f", 52, 112, slot="angle")),   # 6 blade thrown up
        P(pelvis=(0, 1), chest=(0, -1), head=(0, -2), head_rot=3, sash=22, leg_n=foot("n", -5, 0), leg_f=foot("f", 5, 0), arm_n=A("n", -28, -156)),   # 7 settle
        G,
    ]
    keys = [(0, K[0]), (1, K[1]), (2, K[2]), (4, K[3]), (5, K[3]), (6, K[4]), (7, K[5]), (8, K[6]), (10, K[6]), (12, K[7]), (15, K[8])]
    frames = [depth(q) for q in tween(keys, 16)]
    for i, p in enumerate(frames):
        p["form_slot"] = "base" if i < 7 else "f1"
        if 2 <= i <= 5:                                                                              # pressure: the held crouch trembles, the sash flutters
            dx = (1, -1, 1, -1)[i - 2]; p["pelvis"] = (p["pelvis"][0] + dx, p["pelvis"][1]); p["chest"] = (p["chest"][0] - dx, p["chest"][1]); p["sash"] = p.get("sash", 0.0) + 7 * dx
        if i == 7: p["pelvis"] = (p["pelvis"][0], -5); p["chest"] = (p["chest"][0], -5)               # the commit: the body springs up
    return {"name": "Transform", "fps": 20, "loop": False, "frames": frames, "events": {"anticipation_start": 0, "gather_start": 2, "release_start": 6, "form_commit": 7, "reveal_hold": 8, "interruptible_from": 10}}

import rig as _r
CLIPS = [guard, riposte, victory] + ([transform] if _r.FORM == "f1" else [])

"""B05 / B05.1 signature-ability clips for Kai NORTH / EAST / WEST (base AND Form I): Beam (Fracture Lance) and Sphere (Nova Bloom).
EAST is authored; WEST is the same targets mirrored through SX (never mirrored art); NORTH has its own back-view targets.
Hands are placed by declared FIST TARGETS (abilities/scripts/reach_helper.py), which also define the exported hand anchors.
Timing mirrors the sim: Beam 26 frames @ 20 fps, RELEASE frame 10; Sphere 24 frames @ 20 fps, RELEASE frame 16 (the game time-warps playback)."""
import os
import danim as a
import danim_b03g as g
import drig as r

exec(open(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "kai", "abilities", "scripts", "reach_helper.py"))).read())
reach = make_reach(a, r)
SX, D, L, R = a.SX, a.D, a.LEAD, a.REAR
NORTH = D == "north"
sx = SX if not NORTH else 1
P, lg = g.P, g.lg

def hands(body, mid, gap, slot, pref="down", rear_slot=None, back=None):
    """body = P(...) pose. NORTH: n = screen-left fist, f = screen-right, `mid` is x-centred. EAST/WEST: `mid` is given for EAST (x mirrored by SX): lead fist ahead, rear fist behind it."""
    if NORTH: t = {"n": (mid[0] - gap / 2, mid[1]), "f": (mid[0] + gap / 2, mid[1])}; sl = {"n": slot, "f": slot}
    else:
        mx = sx * mid[0]; t = {L: (mx + sx * (3 + gap / 2), mid[1]), R: (mx - sx * (3 + gap / 2), mid[1])}; sl = {L: slot, R: rear_slot or slot}
    body.update(reach(body, t, sl, pref, back if back is not None else -sx)); return body

def beam():
    if NORTH:
        wide = dict(leg_n=lg("n", 1, 0), leg_f=lg("f", -1, 0))
        K = [P(),
             hands(P(pelvis=(0, 4), chest=(0, 2), head=(0, 0), sash=-4, leg_n=lg("n", 0, 0), leg_f=lg("f", 0, 0)), (0, -88), 22, "guard", "outdown"),
             hands(P(pelvis=(0, 6), chest=(0, 4), head=(0, 0), sash=6, leg_n=lg("n", 1, 0), leg_f=lg("f", -1, 0)), (0, -96), 26, "guard", "out"),
             hands(P(pelvis=(0, 7), chest=(0, 4), head=(0, 0), sash=-8, **wide), (0, -100), 28, "guard", "out"),
             hands(P(pelvis=(0, 3), chest=(0, 1), head=(0, 0), sash=-20, **wide), (0, -116), 40, "side", "out"),      # RELEASE: arms flare out and drive forward (up the screen) in a wide V that frames the head
             hands(P(pelvis=(0, 4), chest=(0, 2), head=(0, 0), sash=-26, **wide), (0, -118), 42, "side", "out"),
             hands(P(pelvis=(0, 5), chest=(0, 3), sash=-8, leg_n=lg("n", 0, 0), leg_f=lg("f", 0, 0)), (0, -112), 36, "side", "out"),
             P(pelvis=(0, 3), chest=(0, 1), sash=4), P()]
    else:
        lunge = {f"leg_{L}": lg(L, 2 * sx, 0), f"leg_{R}": lg(R, -2 * sx, 0)}
        K = [P(),
             hands(P(pelvis=(0, 4), chest=(0, 2), head=(0, 0), spine_rot=0, sash=-4 * sx), (26, -80), 8, "guard", "down", "side"),
             hands(P(pelvis=(0, 7), chest=(0, 4), head=(0, 0), spine_rot=0, sash=6 * sx), (28, -72), 8, "guard", "down", "side"),
             hands(P(pelvis=(0, 8), chest=(0, 5), head=(0, 0), spine_rot=0, sash=-8 * sx), (29, -69), 8, "guard", "down", "side"),
             hands(P(pelvis=(5 * sx, 3), chest=(6 * sx, 2), head=(3 * sx, 2), spine_rot=-sx * 9, sash=-22 * sx, **lunge), (50, -106), 6, "side", "down"),     # RELEASE: both fists drive forward together
             hands(P(pelvis=(5 * sx, 3), chest=(6 * sx, 2), head=(3 * sx, 2), spine_rot=-sx * 9, sash=-28 * sx, **lunge), (51, -104), 6, "side", "down"),
             hands(P(pelvis=(2 * sx, 5), chest=(2 * sx, 3), sash=-8 * sx), (42, -92), 14, "side", "down"),
             P(pelvis=(1 * sx, 3), chest=(1 * sx, 1), sash=4 * sx), P()]
    keys = [(0, K[0]), (2, K[1]), (5, K[2]), (7, K[3]), (9, K[3]), (10, K[4]), (12, K[5]), (19, K[5]), (22, K[6]), (24, K[7]), (25, K[8])]
    frames = g.tween(keys, 26)
    for i, p in enumerate(frames):
        if 3 <= i <= 9:
            s = (1, -1)[i % 2]; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1]); p["chest"] = (p["chest"][0] - s, p["chest"][1]); p["sash"] = p.get("sash", 0.0) + 5 * s * sx
        if 10 <= i <= 19:
            s = (1, -1)[i % 2]; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1]); p["sash"] = p.get("sash", 0.0) + 8 * s * sx
    return {"name": "Beam", "fps": 20, "loop": False, "frames": frames,
            "events": {"charge_start": 0, "charge_hold": 7, "hold_start": 6, "hold_end": 9, "release": 10, "fire_end": 20, "recover_start": 20, "interruptible_from": 22}}

def sphere():
    if NORTH:
        low = dict(leg_n=lg("n", 0, 0), leg_f=lg("f", 0, 0))
        K = [P(),
             hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=-6, **low), (0, -92), 16, "guard", "outdown"),
             hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=8, **low), (0, -112), 34, "side", "out"),
             hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=-14, leg_n=lg("n", 2, 0), leg_f=lg("f", -2, 0)), (0, -124), 44, "side", "out"),
             hands(P(pelvis=(0, 4), chest=(0, 2), head=(0, 0), sash=18, leg_n=lg("n", 1, 0), leg_f=lg("f", -1, 0)), (0, -130), 48, "side", "out"),   # overhead hold: the orb sits between the fists
             hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=-24, **low), (0, -108), 60, "guard", "out"),                                    # THROW: fists together, away from the camera
             hands(P(pelvis=(0, 7), chest=(0, 4), head=(0, 0), sash=-28, **low), (0, -121), 74, "guard", "out"),
             hands(P(pelvis=(0, 5), chest=(0, 3), sash=-8, **low), (0, -108), 54, "guard", "out"),
             P(pelvis=(0, 2), chest=(0, 1), sash=4), P()]
    else:
        low = {f"leg_{L}": lg(L, 3 * sx, 0), f"leg_{R}": lg(R, -4 * sx, 0)}
        K = [P(),
             hands(P(pelvis=(-1 * sx, 8), chest=(-2 * sx, 5), head=(0, 0), sash=-6 * sx, **low), (28, -64), 8, "guard", "down", "side"),
             hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=8 * sx, **low), (28, -98), 10, "guard", "back", "guard"),
             hands(P(pelvis=(0, 5), chest=(0, 3), head=(0, 0), sash=-14 * sx), (8, -146), 14, "guard", "back", "guard"),
             hands(P(pelvis=(0, 2), chest=(-1 * sx, 0), head=(0, 0), sash=18 * sx, spine_rot=-sx * 3), (6, -150), 16, "guard", "back", "guard"),         # overhead hold, fists together above the head
             hands(P(pelvis=(5 * sx, 3), chest=(6 * sx, 2), head=(3 * sx, 2), spine_rot=-sx * 9, sash=-24 * sx, **low), (47, -95), 6, "side", "down"),    # THROW: fists drive forward together
             hands(P(pelvis=(5 * sx, 4), chest=(6 * sx, 2), head=(3 * sx, 2), spine_rot=-sx * 9, sash=-28 * sx, **low), (46, -93), 8, "side", "down"),
             hands(P(pelvis=(2 * sx, 5), chest=(2 * sx, 3), sash=-8 * sx), (40, -90), 14, "side", "down"),
             P(pelvis=(1 * sx, 2), chest=(1 * sx, 1), sash=4 * sx), P()]
    keys = [(0, K[0]), (3, K[1]), (7, K[2]), (11, K[3]), (15, K[4]), (16, K[5]), (18, K[6]), (20, K[7]), (22, K[8]), (23, K[9])]
    frames = g.tween(keys, 24)
    for i, p in enumerate(frames):
        if 12 <= i <= 15: s = (1, -1)[i % 2]; p["sash"] = p.get("sash", 0.0) + 7 * s * sx; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1])
    return {"name": "Sphere", "fps": 20, "loop": False, "frames": frames,
            "events": {"gather_start": 0, "raise": 7, "hold": 12, "release": 16, "recover_start": 18, "interruptible_from": 21}}

CLIPS = [beam, sphere]

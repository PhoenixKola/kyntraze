"""REN NORTH / EAST / WEST: Beam = Meteor Rush strike, Sphere = Bloodstar Impact (leap + slam).
EAST is authored; WEST is the same targets mirrored through SX (never mirrored art); NORTH has its own back-view targets.
Hands are placed by declared FIST TARGETS (abilities/scripts/reach_helper.py), which also define the exported hand anchors.
Timing mirrors the sim: Beam 26 frames @ 20 fps, RELEASE frame 10; Sphere 24 frames @ 20 fps, RELEASE frame 16 (the game time-warps playback)."""
import os
import danim as a
import danim_b03g as g
import drig as r

exec(open(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "kai", "abilities", "scripts", "reach_helper.py"))).read())
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

def hands2(body, lead, rear, sl_lead, sl_rear, pref="down", back=None):
    """EAST-authored fist targets (x forward, mirrored by SX for WEST). NORTH: `lead` = screen-left fist target, `rear` = screen-right (x not mirrored)."""
    if NORTH: t = {"n": lead, "f": rear}; sl = {"n": sl_lead, "f": sl_rear}
    else: t = {L: (sx * lead[0], lead[1]), R: (sx * rear[0], rear[1])}; sl = {L: sl_lead, R: sl_rear}
    body.update(reach(body, t, sl, pref, back if back is not None else -sx)); return body

def beam():
    """Meteor Rush: coil (0-9), RELEASE 10 = explosive forward strike with the lead fist fully extended, second strike with the rear fist (15-19), recover 20-25."""
    if NORTH:
        wide = dict(leg_n=lg("n", 2, 0), leg_f=lg("f", -2, 0))
        K = [P(),
             hands2(P(pelvis=(0, 5), chest=(0, 2), sash=-4, **wide), (-16, -60), (16, -62), "side", "side", "outdown"),
             hands2(P(pelvis=(0, 9), chest=(0, 5), sash=8, **wide), (-18, -54), (18, -56), "side", "side", "outdown"),
             hands2(P(pelvis=(0, 9), chest=(0, 5), sash=-10, **wide), (-18, -54), (18, -56), "side", "side", "outdown"),
             hands2(P(pelvis=(0, 4), chest=(0, 1), sash=-22, **wide), (-14, -72), (18, -122), "side", "guard", "out"),     # RELEASE: right fist driven away from the camera (up the screen), left fist cocked
             hands2(P(pelvis=(0, 4), chest=(0, 1), sash=22, **wide), (-18, -122), (14, -72), "guard", "side", "out"),
             hands2(P(pelvis=(0, 6), chest=(0, 3), sash=-8, **wide), (-14, -90), (14, -90), "guard", "guard", "out"),
             P(pelvis=(0, 3), chest=(0, 1), sash=4), P()]
    else:
        lunge = {f"leg_{L}": lg(L, 3 * sx, 0), f"leg_{R}": lg(R, -3 * sx, 0)}
        K = [P(),
             hands2(P(pelvis=(0, 5), chest=(0, 2), head=(0, 0), sash=-4 * sx), (22, -66), (8, -58), "guard", "side", "down"),
             hands2(P(pelvis=(0, 9), chest=(0, 5), head=(0, 0), sash=6 * sx), (22, -56), (4, -52), "guard", "side", "down"),
             hands2(P(pelvis=(0, 10), chest=(0, 6), head=(0, 0), sash=-8 * sx), (22, -54), (4, -50), "guard", "side", "down"),
             hands2(P(pelvis=(6 * sx, 3), chest=(8 * sx, 1), head=(4 * sx, 1), spine_rot=-sx * 10, sash=-24 * sx, **lunge), (60, -88), (4, -80), "side", "guard", "down"),   # RELEASE: lead fist fully extended along the facing, rear fist cocked at the chest
             hands2(P(pelvis=(6 * sx, 3), chest=(8 * sx, 1), head=(4 * sx, 1), spine_rot=sx * 6, sash=24 * sx, **lunge), (6, -82), (56, -88), "guard", "side", "down"),         # second strike, rear fist
             hands2(P(pelvis=(2 * sx, 6), chest=(2 * sx, 3), sash=-8 * sx), (34, -76), (14, -72), "guard", "guard", "down"),
             P(pelvis=(1 * sx, 3), chest=(1 * sx, 1), sash=4 * sx), P()]
    keys = [(0, K[0]), (2, K[1]), (5, K[2]), (9, K[3]), (10, K[4]), (14, K[4]), (15, K[5]), (19, K[5]), (22, K[6]), (24, K[7]), (25, K[8])]
    frames = g.tween(keys, 26)
    for i, p in enumerate(frames):
        if 3 <= i <= 9:
            s = (1, -1)[i % 2]; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1]); p["chest"] = (p["chest"][0] - s, p["chest"][1]); p["sash"] = p.get("sash", 0.0) + 5 * s * sx
        if 10 <= i <= 19:
            s = (1, -1)[i % 2]; p["pelvis"] = (p["pelvis"][0] + s, p["pelvis"][1]); p["sash"] = p.get("sash", 0.0) + 8 * s * sx
    return {"name": "Beam", "fps": 20, "loop": False, "frames": frames,
            "events": {"charge_start": 0, "charge_hold": 7, "release": 10, "fire_end": 20, "recover_start": 20, "interruptible_from": 22}}

def sphere():
    """Bloodstar Impact: crouch (0-6), leap (7-15: launch, tucked apex with both fists overhead, descent), RELEASE 16 = slam landing (fist driven to the ground, other arm back), recover 17-23."""
    if NORTH:
        low = dict(leg_n=lg("n", -2, 0), leg_f=lg("f", 2, 0)); land = dict(leg_n=lg("n", -8, 0), leg_f=lg("f", 8, 0))
        tuck = dict(leg_n=g.air("n", 4, -36), leg_f=g.air("f", -4, -38))
        K = [P(),
             hands2(P(pelvis=(0, 9), chest=(0, 5), sash=-6, **low), (-16, -48), (16, -52), "side", "side", "outdown"),
             hands2(P(pelvis=(0, 17), chest=(0, 10), sash=10, **low), (-18, -40), (18, -46), "side", "side", "outdown"),
             hands2(P(pelvis=(0, -16), chest=(0, -4), sash=-14, leg_n=g.air("n", 0, -16), leg_f=g.air("f", 0, -16)), (-9, -112), (9, -114), "guard", "guard", "out"),
             hands2(P(pelvis=(0, -32), chest=(0, -9), sash=20, **tuck), (-7, -160), (7, -162), "guard", "guard", "out"),
             hands2(P(pelvis=(0, -12), chest=(0, -3), sash=-10, leg_n=g.air("n", -2, -12), leg_f=g.air("f", 2, -12)), (-7, -140), (7, -142), "guard", "guard", "out"),
             hands2(P(pelvis=(0, 31), chest=(0, 18), sash=-30, **land), (-8, -40), (22, -84), "guard", "side", "out"),                                                               # RELEASE: slam
             hands2(P(pelvis=(0, 28), chest=(0, 15), sash=-18, **land), (-8, -42), (22, -82), "guard", "side", "out"),
             hands2(P(pelvis=(0, 6), chest=(0, 3), sash=-6, **low), (-12, -60), (12, -62), "guard", "guard", "out"),
             P(pelvis=(0, 2), chest=(0, 1), sash=4), P()]
    else:
        low = {f"leg_{L}": lg(L, 3 * sx, 0), f"leg_{R}": lg(R, -4 * sx, 0)}; land = {f"leg_{L}": lg(L, 9 * sx, 0), f"leg_{R}": lg(R, -9 * sx, 0)}
        tuck = {f"leg_{L}": g.air(L, 5 * sx, -36), f"leg_{R}": g.air(R, -5 * sx, -38)}
        K = [P(),
             hands2(P(pelvis=(-2 * sx, 11), chest=(-3 * sx, 7), head=(0, 0), sash=-6 * sx, **low), (24, -52), (6, -50), "guard", "side", "down"),
             hands2(P(pelvis=(-3 * sx, 18), chest=(-4 * sx, 11), head=(0, 0), sash=10 * sx, **low), (20, -42), (2, -44), "guard", "side", "down"),
             hands2(P(pelvis=(0, -16), chest=(0, -4), head=(0, 0), sash=-14 * sx, **{f"leg_{L}": g.air(L, 3 * sx, -16), f"leg_{R}": g.air(R, -3 * sx, -16)}), (16, -118), (4, -120), "guard", "guard", "back"),
             hands2(P(pelvis=(0, -32), chest=(-1 * sx, -9), head=(0, 0), sash=20 * sx, spine_rot=-sx * 3, **tuck), (8, -164), (-2, -164), "guard", "guard", "back"),                   # apex: tucked, fists together overhead
             hands2(P(pelvis=(2 * sx, -12), chest=(3 * sx, -3), head=(0, 0), sash=-10 * sx, spine_rot=-sx * 6, **{f"leg_{L}": g.air(L, 3 * sx, -12), f"leg_{R}": g.air(R, -3 * sx, -12)}), (26, -128), (14, -130), "side", "side", "down"),
             hands2(P(pelvis=(9 * sx, 31), chest=(13 * sx, 18), head=(6 * sx, 5), spine_rot=-sx * 17, sash=-30 * sx, **land), (44, -28), (-10, -86), "side", "guard", "down"),       # RELEASE: slam, lead fist into the ground ahead, rear arm back
             hands2(P(pelvis=(8 * sx, 28), chest=(11 * sx, 15), head=(5 * sx, 4), spine_rot=-sx * 14, sash=-18 * sx, **land), (44, -30), (-10, -84), "side", "guard", "down"),
             hands2(P(pelvis=(2 * sx, 6), chest=(2 * sx, 3), sash=-6 * sx, **low), (30, -62), (10, -60), "guard", "guard", "down"),
             P(pelvis=(1 * sx, 2), chest=(1 * sx, 1), sash=4 * sx), P()]
    keys = [(0, K[0]), (3, K[1]), (6, K[2]), (8, K[3]), (12, K[4]), (15, K[5]), (16, K[6]), (18, K[7]), (21, K[8]), (22, K[9]), (23, K[10])]
    frames = g.tween(keys, 24)
    return {"name": "Sphere", "fps": 20, "loop": False, "frames": frames,
            "events": {"gather_start": 0, "raise": 7, "hold": 12, "release": 16, "recover_start": 18, "interruptible_from": 21}}

CLIPS = [beam, sphere]

"""B23 Vex-specific NORTH / EAST / WEST clips: Guard and Riposte (poses only, same solver and parts as every other clip).
The counter-blade rides the NEAR hand bone (`n`) and points along the near forearm. In EAST/WEST the near arm is the REAR arm, so the blade is drawn back behind the body and cuts FORWARD through the lead side; in NORTH (back view) the arm swings out to the screen-left exactly like SOUTH.
Angles: 0 = down the screen, + = toward screen-right; EAST/WEST multiply by the facing sign SX (WEST is the mirrored pose, never mirrored art)."""
import math
import danim as a
import danim_b03g as g

P, tween = g.P, g.tween
D, SX = a.D, a.SX
NORTH = D == "north"
S = 1 if NORTH else SX

def B(u, f, k=1.1):
    """Blade arm key in this direction's own angles. NORTH uses screen angles as authored for SOUTH; EAST/WEST are given for EAST and flipped by SX."""
    return a.arm(S * u, a.LU["n"] * k, S * f, a.LF["n"] * k, a.POINT["fist_side_n"], "side", 1.3)   # slot "side" rotated by its own art angle: fist AND blade follow the forearm

# (upper, forearm) angle tables per direction: guard, read (drawn back), coil, cut, impact, hold, follow-through
if NORTH:
    T = {"guard": (-30, -150), "read": (-14, -172), "coil": (-6, -178), "cut": (-50, -112), "impact": (-62, -78), "hold": (-64, -74), "follow": (-54, -50), "ret1": (-40, -118), "ret2": (-33, -142), "sweep": (-44, -118), "low": (-58, -86), "rise": (-34, -132), "salute": (-12, -174), "thrown": (-22, -166), "flare": (-66, -84)}
else:   # EAST (SX flips for WEST): the blade is drawn back behind the body, then cuts forward to a level thrust-slash
    T = {"guard": (46, 118), "read": (-34, -118), "coil": (-48, -104), "cut": (10, 40), "impact": (62, 92), "hold": (64, 94), "follow": (56, 70), "ret1": (52, 100), "ret2": (48, 112), "sweep": (30, 60), "low": (20, 30), "rise": (40, 110), "salute": (40, 150), "thrown": (46, 140), "flare": (64, 94)}

def key(sink, ang, sash=0.0, spine=0.0, head_rot=0.0, k=1.1, chest=0):
    p = P(pelvis=(0, sink), chest=(chest, max(0, sink - 1)), head=(0, max(0, sink - 2)), head_rot=head_rot, spine_rot=spine, sash=sash)
    p["arm_n"] = B(*ang, k=k); return p

def guard():
    fr = []
    for i in range(12):
        t = 2 * math.pi * i / 12; br = math.sin(t - 0.8); tr = math.sin(2 * t + 0.6); u, f = T["guard"]
        fr.append(key(3 + (1 if br < -0.4 else 0), (u + 1.6 * br, f + 3.0 * tr), sash=5.0 * math.sin(t - 1.8), head_rot=1.2 * math.sin(t - 1.3)))
    return {"name": "Guard", "fps": 10, "loop": True, "frames": fr, "events": {}}

def riposte():
    G = key(3, T["guard"])
    K = [
        G,
        key(5, T["read"], sash=6, head_rot=-3, chest=1),
        key(8, T["coil"], sash=12, head_rot=-5, chest=2, spine=2 * S),
        key(6, T["cut"], sash=-12, head_rot=3, spine=-6 * S, k=1.15, chest=-1),
        key(5, T["impact"], sash=-22, head_rot=5, spine=-12 * S, k=1.22, chest=-3),
        key(5, T["hold"], sash=-28, head_rot=6, spine=-14 * S, k=1.22, chest=-4),
        key(5, T["follow"], sash=-16, spine=-8 * S, k=1.15, chest=-2),
        key(5, T["ret1"], sash=8),
        key(4, T["ret2"], sash=4),
        G,
    ]
    keys = [(0, K[0]), (1, K[1]), (2, K[2]), (3, K[3]), (4, K[4]), (5, K[5]), (6, K[6]), (8, K[7]), (10, K[8]), (11, K[9])]
    return {"name": "Riposte", "fps": 20, "loop": False, "frames": tween(keys, 12), "events": {"anticipation_start": 1, "impact": 4, "recover_start": 6, "interruptible_from": 9}}

def victory():
    G = key(3, T["guard"])
    K = [G, key(5, T["sweep"], sash=6), key(6, T["low"], sash=10, chest=-1), key(2, T["rise"], sash=8, head_rot=2), key(0, T["salute"], sash=-4, head_rot=3, chest=-2), key(-1, T["salute"], sash=-8, head_rot=3, chest=-3)]
    keys = [(0, K[0]), (2, K[1]), (4, K[2]), (6, K[3]), (7, K[4]), (8, K[5]), (15, K[5])]
    frames = []
    for i, q in enumerate(tween(keys, 16)):
        if i >= 8:
            t = 2 * math.pi * (i - 8) / 8; u, f = T["salute"]; q = dict(q); q["sash"] = -8 + 5 * math.sin(t); q["arm_n"] = B(u + 1.2 * math.sin(t - 0.6), f + 2.0 * math.sin(2 * t)); q["chest"] = (q["chest"][0], q["chest"][1] + (1 if math.sin(t - 1.0) < -0.5 else 0))
        frames.append(q)
    return {"name": "Victory", "fps": 10, "loop": False, "frames": frames, "events": {"hold": 8}}

def transform():
    G = key(3, T["guard"])
    K = [
        P(), key(6, T["guard"], sash=4), key(10, T["read"], sash=10, head_rot=-4, chest=2), key(13, T["coil"], sash=16, head_rot=-6, chest=2, spine=2 * S),
        key(7, T["sweep"], sash=18, head_rot=3, k=1.12), key(-3, T["flare"], sash=32, head_rot=5, k=1.2, chest=-3), key(-2, T["thrown"], sash=36, head_rot=4, chest=-3), key(1, T["rise"], sash=22), G,
    ]
    keys = [(0, K[0]), (1, K[1]), (2, K[2]), (4, K[3]), (5, K[3]), (6, K[4]), (7, K[5]), (8, K[6]), (10, K[6]), (12, K[7]), (15, K[8])]
    frames = tween(keys, 16)
    for i, p in enumerate(frames):
        p["form_slot"] = "base" if i < 7 else "f1"
        if 2 <= i <= 5:
            dx = (1, -1, 1, -1)[i - 2]; p["pelvis"] = (p["pelvis"][0] + dx, p["pelvis"][1]); p["chest"] = (p["chest"][0] - dx, p["chest"][1]); p["sash"] = p.get("sash", 0.0) + 7 * dx
        if i == 7: p["pelvis"] = (p["pelvis"][0], -5); p["chest"] = (p["chest"][0], -5)
    return {"name": "Transform", "fps": 20, "loop": False, "frames": frames, "events": {"anticipation_start": 0, "gather_start": 2, "release_start": 6, "form_commit": 7, "reveal_hold": 8, "interruptible_from": 10}}

import drig as _r
CLIPS = [guard, riposte, victory] + ([transform] if _r.FORM == "f1" else [])

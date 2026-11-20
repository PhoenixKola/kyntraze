"""B27 SORA SOUTH: Azure Sovereign flight clips Takeoff / Glide / Dive (same solver, parts and helpers as anim_b05.py; body-pitch approach shared with the B26 Ren flight, arms retuned for Sora: open hands steering instead of a sprinter's fists).
  Takeoff 10 f @20, RELEASE 4   Glide 4 f @10 loop   Dive 20 f @22, RELEASE 7 (ground contact)"""
import math
import os
import anim as a
import anim_b03g as g
import anim_b05 as b5
import rig as r

P, foot, fair, hands, CX = g.P, g.foot, g.fair, b5.hands, b5.CX

def hands2(body, tn, tf, sn, sf, pref="outdown"):
    """individual fist targets (sprite px rel. to ground origin) and slots for the n (screen-left) / f (screen-right) hands"""
    body.update(b5.reach(body, {"n": tn, "f": tf}, {"n": sn, "f": sf}, pref)); return body

def T(keys, n): return [g.depth(q) for q in g.tween(keys, n)]
LOW = lambda: dict(leg_n=foot("n", 0, 0), leg_f=foot("f", 0, 0))
WIDE = lambda w=2: dict(leg_n=foot("n", w, 0), leg_f=foot("f", -w, 0))

HIP = a.REST["pelvis"][0]
def fly(lift, rot, **kw):
    """airborne body: the whole torso pitches forward by `rot` degrees about the pelvis, which hangs `lift` px above its grounded place (tweened as plain numbers, converted by finish())"""
    return P(_lift=float(lift), _rot=float(rot), **kw)
def A0(p):
    p["_lift"] = p.get("_lift", 0.0); p["_rot"] = p.get("_rot", 0.0); return p
def finish(frames):
    for p in frames:
        lift, rot = p.pop("_lift", 0.0), p.pop("_rot", 0.0)
        if abs(lift) > 0.05 or abs(rot) > 0.05: p["root_rot"] = -rot; p["hip_target"] = (float(HIP[0]), float(HIP[1] + p.get("pelvis", (0, 0))[1] - lift))
    return frames

def takeoff():
    crouch = hands2(P(pelvis=(0, 12), chest=(0, 8), head=(0, 4), sash=-8, **WIDE(3)), (CX - 18, -48), (CX + 18, -50), "angle", "angle", "outdown")
    launch = hands2(fly(26, 10, sash=-24, leg_n=fair("n", -4, -36, fs_t=0.8), leg_f=fair("f", -14, -42, fs_t=0.8)), (CX - 26, -100), (CX + 46, -118), "angle", "side", "out")
    airp = hands2(fly(36, 18, sash=-34, leg_n=fair("n", -16, -50, fs_t=0.75), leg_f=fair("f", -28, -56, fs_t=0.75)), (CX - 34, -104), (CX + 56, -128), "angle", "side", "out")
    return {"name": "Takeoff", "fps": 20, "loop": False, "frames": finish(T([(0, A0(P())), (2, A0(crouch)), (4, launch), (7, airp), (9, airp)], 10)), "events": {"coil": 2, "release": 4, "recover_start": 7, "interruptible_from": 9}}

def glide():
    fr = []
    for i in range(4):
        t = 2 * math.pi * i / 4; sw = math.sin(t), math.cos(t)
        body = fly(36 + round(1.6 * sw[0]), 20, sash=22 * sw[1], leg_n=fair("n", -18 + round(sw[1] * 2), -52, fs_t=0.8, fs_s=0.9), leg_f=fair("f", -34 - round(sw[1] * 2), -60 - round(2 * sw[1]), fs_t=0.8, fs_s=0.9))
        fr.append(g.depth(hands2(body, (CX - 36, -102 + round(sw[0])), (CX + 58, -122 + round(2 * sw[1])), "angle", "side")))
    return {"name": "Glide", "fps": 10, "loop": True, "frames": finish(fr), "events": {}}

def dive():
    wide = dict(leg_n=foot("n", 3, 0), leg_f=foot("f", -3, 0))
    aim = hands2(fly(34, 24, sash=-26, leg_n=fair("n", -10, -44), leg_f=fair("f", -24, -52)), (CX - 14, -80), (CX + 36, -66), "angle", "side", "out")
    fall = hands2(fly(26, 30, sash=-34, leg_n=fair("n", -8, -40), leg_f=fair("f", -22, -48)), (CX - 6, -60), (CX + 30, -48), "side", "side", "out")
    K = [A0(P()), aim, fall,
         A0(hands(P(pelvis=(0, 14), chest=(0, 11), head=(0, 7), sash=-30, spine_rot=3, **wide), (CX, -34), 14, "front", "out")),
         A0(hands(P(pelvis=(0, 15), chest=(0, 12), head=(0, 8), sash=-36, **wide), (CX, -32), 14, "front", "out")),
         A0(hands(P(pelvis=(0, 8), chest=(0, 5), head=(0, 3), sash=-10, **wide), (CX, -60), 26, "angle", "out")),
         A0(P())]
    return {"name": "Dive", "fps": 22, "loop": False, "frames": finish(T([(0, K[0]), (2, K[1]), (5, K[2]), (7, K[3]), (10, K[4]), (14, K[5]), (19, K[6])], 20)), "events": {"gather_start": 0, "hold": 2, "release": 7, "recover_start": 10, "interruptible_from": 15}}

CLIPS = [takeoff, glide, dive]
NEW = ("Takeoff", "Glide", "Dive")

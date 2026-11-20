"""B26 REN SOUTH: Crimson Ascendant combat clips (same solver, parts, stance and fist-target helper as anim_b05.py). Contract mirrored by src/assets/renAnimation.ts / heroAnimation.ts.
  Jab        12 f @24, RELEASE 3   Crimson Fury beat 1 (lead jab)          Kick       16 f @24, RELEASE 4  beat 2 (crossing kick)
  Hook       14 f @24, RELEASE 4   beat 3 (body hook)                      Uppercut   18 f @24, RELEASE 6  beat 4 (rising uppercut)
  Cyclone    26 f @22, spin 5-16, RELEASE 17 (open stance)                 Rampage    22 f @22, grab 4, drive 6, RELEASE 13 (slam)
  Pound      26 f @22, RELEASE 6 / strike_b 13 / final 18 (alternating fists)   NovaCharge 12 f @14, closed-fist brace, hold 5-11   Lunge 14 f @24, RELEASE 3 (the driving punch)
  Takeoff    10 f @20, RELEASE 4   Glide 4 f @10 loop                      Dive       20 f @22, RELEASE 7 (ground contact)"""
import math
import os
import anim as a
import anim_b03g as g
import anim_b05 as b5
import rig as r

P, foot, fair, hands, hands2, CX = g.P, g.foot, g.fair, b5.hands, b5.hands2, b5.CX

def T(keys, n): return [g.depth(q) for q in g.tween(keys, n)]
LOW = lambda: dict(leg_n=foot("n", 0, 0), leg_f=foot("f", 0, 0))
WIDE = lambda w=2: dict(leg_n=foot("n", w, 0), leg_f=foot("f", -w, 0))

def jab():
    S = WIDE(1); st = dict(leg_n=foot("n", 4, 1), leg_f=foot("f", -2, 0))
    K = [P(),
         hands2(P(pelvis=(-1, 5), chest=(-2, 3), head=(-1, 1), sash=6, spine_rot=5, **S), (CX - 16, -66), (CX + 4, -78), "angle", "angle", "outdown"),                    # coil: lead fist cocked at the shoulder
         hands2(P(pelvis=(3, 3), chest=(3, 2), head=(2, 1), sash=-24, spine_rot=-6, **st), (CX - 18, -64), (CX + 42, -90), "angle", "side", "out"),                          # RELEASE: lead fist snaps out
         hands2(P(pelvis=(3, 3), chest=(3, 2), head=(2, 1), sash=-28, spine_rot=-7, **st), (CX - 18, -64), (CX + 44, -92), "angle", "side", "out"),
         hands2(P(pelvis=(1, 4), chest=(1, 2), sash=-8, **S), (CX - 14, -68), (CX + 10, -76), "angle", "angle"),
         P()]
    return {"name": "Jab", "fps": 24, "loop": False, "frames": T([(0, K[0]), (1, K[1]), (3, K[2]), (5, K[3]), (8, K[4]), (11, K[5])], 12), "events": {"coil": 1, "release": 3, "recover_start": 6, "interruptible_from": 8}}

def kick():
    pl = foot("f", 4, 0)
    ch = fair("n", 8, -32, fs_t=0.6, fs_s=0.9); rel = fair("n", 46, -52, fs_t=1.0, fs_s=1.0); rel2 = fair("n", 48, -54, fs_t=1.0, fs_s=1.0)
    K = [P(),
         hands2(P(pelvis=(2, 6), chest=(1, 3), head=(0, 1), sash=-6, spine_rot=3, leg_f=pl, leg_n=ch), (CX - 20, -74), (CX + 14, -80), "angle", "angle"),
         hands2(P(pelvis=(4, 8), chest=(3, 5), head=(1, 2), sash=-26, spine_rot=8, leg_f=pl, leg_n=rel), (CX - 36, -80), (CX + 26, -92), "side", "angle", "out"),                # RELEASE: near leg whips across the body
         hands2(P(pelvis=(4, 8), chest=(3, 5), head=(1, 2), sash=-30, spine_rot=8, leg_f=pl, leg_n=rel2), (CX - 38, -82), (CX + 26, -92), "side", "angle", "out"),
         hands2(P(pelvis=(2, 6), chest=(1, 3), head=(0, 1), sash=-8, spine_rot=3, leg_f=pl, leg_n=ch), (CX - 20, -74), (CX + 14, -80), "angle", "angle"),
         hands2(P(pelvis=(0, 5), chest=(0, 3), sash=-4, leg_f=pl, leg_n=foot("n", 0, 1)), (CX - 16, -72), (CX + 18, -76), "angle", "angle"),
         P()]
    return {"name": "Kick", "fps": 24, "loop": False, "frames": T([(0, K[0]), (2, K[1]), (4, K[2]), (6, K[3]), (9, K[4]), (12, K[5]), (15, K[6])], 16), "events": {"coil": 2, "release": 4, "recover_start": 8, "interruptible_from": 11}}

def hook():
    S = WIDE(2); st = dict(leg_n=foot("n", -3, 1), leg_f=foot("f", 3, 0))
    K = [P(),
         hands2(P(pelvis=(2, 8), chest=(2, 5), head=(1, 2), sash=-8, spine_rot=-5, **S), (CX - 40, -52), (CX + 14, -78), "side", "angle", "outdown"),                           # sink, rear fist cocked low and wide
         hands2(P(pelvis=(2, 10), chest=(2, 7), head=(1, 3), sash=-14, spine_rot=-8, **S), (CX - 46, -46), (CX + 12, -80), "side", "angle", "outdown"),
         hands2(P(pelvis=(-2, 7), chest=(-3, 4), head=(-1, 2), sash=22, spine_rot=7, **st), (CX + 18, -64), (CX + 18, -96), "side", "angle", "out"),                           # drive
         hands2(P(pelvis=(-3, 6), chest=(-4, 4), head=(-2, 2), sash=26, spine_rot=9, **st), (CX + 36, -68), (CX + 18, -98), "side", "angle", "out"),                          # RELEASE: hook swings wide across the body
         hands2(P(pelvis=(-3, 6), chest=(-4, 4), head=(-2, 2), sash=28, spine_rot=9, **st), (CX + 38, -68), (CX + 18, -98), "side", "angle", "out"),
         hands2(P(pelvis=(0, 5), chest=(0, 3), sash=6, **S), (CX - 14, -66), (CX + 12, -78), "angle", "angle"),
         P()]
    return {"name": "Hook", "fps": 24, "loop": False, "frames": T([(0, K[0]), (1, K[1]), (3, K[2]), (4, K[4]), (6, K[5]), (10, K[6]), (13, K[7])], 14), "events": {"coil": 2, "release": 4, "recover_start": 7, "interruptible_from": 10}}

def uppercut():
    low = LOW(); st = dict(leg_n=foot("n", 3, 1), leg_f=foot("f", -2, 0))
    K = [P(),
         hands2(P(pelvis=(0, 10), chest=(0, 6), head=(0, 3), sash=-8, spine_rot=4, **low), (CX - 14, -70), (CX + 12, -40), "angle", "angle", "outdown"),                        # deep sink, uppercut fist by the hip
         hands2(P(pelvis=(1, 6), chest=(1, 3), head=(0, 0), sash=12, spine_rot=-3, **st), (CX - 14, -76), (CX + 10, -96), "angle", "angle", "out"),                             # the rise
         hands2(P(pelvis=(1, 0), chest=(1, -3), head=(0, -4), sash=-26, spine_rot=-5, **st), (CX - 16, -80), (CX + 30, -138), "angle", "side", "out"),                          # RELEASE: fist tops out beside the head line
         hands2(P(pelvis=(1, 1), chest=(1, -2), head=(0, -3), sash=-32, spine_rot=-5, **st), (CX - 16, -80), (CX + 32, -140), "angle", "side", "out"),
         hands2(P(pelvis=(0, 5), chest=(0, 3), sash=-10, **low), (CX - 14, -72), (CX + 12, -92), "angle", "angle"),
         P()]
    return {"name": "Uppercut", "fps": 24, "loop": False, "frames": T([(0, K[0]), (3, K[1]), (5, K[2]), (6, K[3]), (9, K[4]), (13, K[5]), (17, K[6])], 18), "events": {"coil": 3, "release": 6, "recover_start": 10, "interruptible_from": 13}}

def cyclone():
    low = dict(leg_n=foot("n", -5, 0), leg_f=foot("f", 5, 0)); open_ = dict(leg_n=foot("n", -8, 0), leg_f=foot("f", 8, 0))
    wind = hands2(P(pelvis=(0, 10), chest=(0, 6), head=(0, 3), sash=-12, **low), (CX - 18, -62), (CX + 20, -62), "angle", "angle", "outdown")
    spin_a = hands2(P(pelvis=(2, 9), chest=(-3, 5), head=(0, 3), sash=26, spine_rot=10, **low), (CX - 56, -86), (CX + 40, -92), "side", "side", "out")
    spin_b = hands2(P(pelvis=(-2, 9), chest=(3, 5), head=(0, 3), sash=-26, spine_rot=-10, **low), (CX - 40, -92), (CX + 56, -86), "side", "side", "out")
    rel = hands2(P(pelvis=(0, 6), chest=(0, 1), head=(0, -1), sash=-4, **open_), (CX - 58, -98), (CX + 58, -98), "side", "side", "out")
    K = [P(), wind]
    fr = T([(0, P()), (3, wind), (4, wind)], 5)
    for i in range(12): fr.append(g.depth(dict(spin_a if i % 2 == 0 else spin_b)))      # 5-16: the spin, arms wide, torso whipping side to side (true turn: see EntityRenderer facing cycle)
    fr += T([(0, rel), (2, rel), (5, hands2(P(pelvis=(0, 5), chest=(0, 3), sash=-6, **low), (CX - 20, -66), (CX + 20, -66), "angle", "angle")), (8, P())], 9)   # 17-25
    return {"name": "Cyclone", "fps": 22, "loop": False, "frames": fr, "events": {"coil": 2, "spin_start": 5, "release": 17, "recover_start": 19, "interruptible_from": 22}}

def rampage():
    wide = WIDE(3); st = dict(leg_n=foot("n", 5, 1), leg_f=foot("f", -5, 0))
    grab = hands2(P(pelvis=(0, 6), chest=(0, 4), head=(0, 3), sash=-12, spine_rot=3, **wide), (CX - 40, -86), (CX + 44, -86), "side", "side", "out")
    drive = hands2(P(pelvis=(0, 10), chest=(0, 9), head=(0, 7), sash=-30, spine_rot=12, **st), (CX - 6, -46), (CX + 10, -48), "front", "front", "out")
    slam = hands(P(pelvis=(0, 18), chest=(0, 14), head=(0, 8), sash=-30, spine_rot=3, **wide), (CX, -34), 14, "front", "out")
    slam2 = hands(P(pelvis=(0, 19), chest=(0, 15), head=(0, 9), sash=-36, **wide), (CX, -32), 14, "front", "out")
    rec = hands(P(pelvis=(0, 7), chest=(0, 4), sash=-10, **LOW()), (CX, -58), 28, "angle", "out")
    K = [(0, P()), (2, hands2(P(pelvis=(0, 5), chest=(0, 3), sash=-8, **wide), (CX - 14, -66), (CX + 8, -70), "angle", "angle", "out")), (4, grab), (6, drive), (10, drive), (12, hands(P(pelvis=(0, 7), chest=(0, 5), **wide), (CX, -80), 18, "angle", "out")), (13, slam), (15, slam2), (18, rec), (21, P())]
    return {"name": "Rampage", "fps": 22, "loop": False, "frames": T(K, 22), "events": {"coil": 2, "grab": 4, "drive": 6, "release": 13, "recover_start": 15, "interruptible_from": 18}}

def pound():
    low = LOW(); w = WIDE(2)
    up_f = hands2(P(pelvis=(0, 5), chest=(0, 2), head=(0, 0), sash=8, spine_rot=-3, **low), (CX - 14, -66), (CX + 10, -146), "angle", "angle", "out")
    dn_f = hands2(P(pelvis=(0, 17), chest=(0, 12), head=(0, 7), sash=-28, spine_rot=4, **w), (CX - 14, -66), (CX + 8, -38), "angle", "front", "out")
    up_n = hands2(P(pelvis=(0, 5), chest=(0, 2), head=(0, 0), sash=-8, spine_rot=3, **low), (CX - 12, -146), (CX + 14, -66), "angle", "angle", "out")
    dn_n = hands2(P(pelvis=(0, 17), chest=(0, 12), head=(0, 7), sash=28, spine_rot=-4, **w), (CX - 8, -38), (CX + 14, -66), "front", "angle", "out")
    up_b = hands(P(pelvis=(0, 3), chest=(0, 0), head=(0, -1), sash=-6, **low), (CX, -148), 26, "angle", "out")
    dn_b = hands(P(pelvis=(0, 20), chest=(0, 15), head=(0, 8), sash=-34, spine_rot=3, **w), (CX, -36), 14, "front", "out")
    rec = hands(P(pelvis=(0, 7), chest=(0, 4), sash=-8, **low), (CX, -58), 30, "angle", "out")
    K = [(0, P()), (3, up_f), (5, up_f), (6, dn_f), (8, dn_f), (10, up_n), (12, up_n), (13, dn_n), (15, dn_n), (17, up_b), (18, dn_b), (20, dn_b), (23, rec), (25, P())]
    return {"name": "Pound", "fps": 22, "loop": False, "frames": T(K, 26), "events": {"coil": 2, "release": 6, "strike_b": 13, "final": 18, "recover_start": 20, "interruptible_from": 23}}

def nova_charge():
    low = dict(leg_n=foot("n", -4, 0), leg_f=foot("f", 4, 1))
    pre = hands2(P(pelvis=(-1, 7), chest=(-2, 5), head=(-1, 2), sash=6, spine_rot=4, **low), (CX - 16, -64), (CX + 30, -86), "angle", "side", "out")
    hold = lambda d: hands2(P(pelvis=(-2, 11 + d), chest=(-3, 8 + d), head=(-2, 4 + d), sash=12 + 2 * d, spine_rot=8, **low), (CX - 16, -62), (CX + 36, -88 + d), "angle", "side", "out")
    fr = T([(0, P()), (2, pre), (4, hold(0))], 5)
    for i in range(7): fr.append(g.depth(hold((0, 1, 0, -1, 0, 1, 0)[i])))
    return {"name": "NovaCharge", "fps": 14, "loop": False, "frames": fr, "events": {"coil": 1, "hold": 5, "hold_end": 11, "recover_start": 11, "interruptible_from": 11}}

def lunge():
    low = LOW(); step = dict(leg_n=foot("n", 5, 1), leg_f=foot("f", -6, 0))
    K = [P(),
         hands2(P(pelvis=(-2, 8), chest=(-3, 5), head=(-1, 2), sash=8, spine_rot=5, **dict(leg_n=foot("n", -4, 0), leg_f=foot("f", 4, 1))), (CX - 14, -58), (CX + 8, -64), "angle", "angle", "outdown"),      # coil: fist drawn back to the hip
         hands2(P(pelvis=(3, 3), chest=(3, 2), head=(2, 0), sash=-30, spine_rot=-6, **step), (CX - 20, -64), (CX + 58, -86), "angle", "side", "out"),                                                          # RELEASE: the driving punch
         hands2(P(pelvis=(3, 3), chest=(4, 3), head=(2, 1), sash=-34, spine_rot=-7, **step), (CX - 20, -64), (CX + 60, -88), "angle", "side", "out"),
         hands2(P(pelvis=(1, 5), chest=(1, 3), sash=-10, **low), (CX - 14, -68), (CX + 10, -78), "angle", "angle"),
         P()]
    return {"name": "Lunge", "fps": 24, "loop": False, "frames": T([(0, K[0]), (2, K[1]), (3, K[2]), (8, K[3]), (11, K[4]), (13, K[5])], 14), "events": {"coil": 2, "release": 3, "recover_start": 8, "interruptible_from": 10}}

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
    launch = hands2(fly(26, 10, sash=-24, leg_n=fair("n", -4, -36, fs_t=0.8), leg_f=fair("f", -14, -42, fs_t=0.8)), (CX - 12, -88), (CX + 44, -128), "angle", "side", "out")
    airp = hands2(fly(36, 18, sash=-34, leg_n=fair("n", -16, -50, fs_t=0.75), leg_f=fair("f", -28, -56, fs_t=0.75)), (CX - 18, -86), (CX + 54, -138), "angle", "side", "out")
    return {"name": "Takeoff", "fps": 20, "loop": False, "frames": finish(T([(0, A0(P())), (2, A0(crouch)), (4, launch), (7, airp), (9, airp)], 10)), "events": {"coil": 2, "release": 4, "recover_start": 7, "interruptible_from": 9}}

def glide():
    fr = []
    for i in range(4):
        t = 2 * math.pi * i / 4; sw = math.sin(t), math.cos(t)
        body = fly(36 + round(1.6 * sw[0]), 20, sash=22 * sw[1], leg_n=fair("n", -18 + round(sw[1] * 2), -52, fs_t=0.8, fs_s=0.9), leg_f=fair("f", -34 - round(sw[1] * 2), -60 - round(2 * sw[1]), fs_t=0.8, fs_s=0.9))
        fr.append(g.depth(hands2(body, (CX - 20, -92 + round(sw[0])), (CX + 56, -128 + round(2 * sw[1])), "angle", "side")))
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

CLIPS = [jab, kick, hook, uppercut, cyclone, rampage, pound, nova_charge, lunge, takeoff, glide, dive]
NEW = ("Jab", "Kick", "Hook", "Uppercut", "Cyclone", "Rampage", "Pound", "NovaCharge", "Lunge", "Takeoff", "Glide", "Dive")

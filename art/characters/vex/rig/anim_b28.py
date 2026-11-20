"""B28 VEX SOUTH: authored combat poses for Riftbound (VEX_STYLE=f1) and Voidheart Exile (VEX_STYLE=f2). Pose data lives in ../b28_poses.py (shared with the NORTH/EAST/WEST solver); this file turns it into rig poses with the same solver, parts and fist-target helper as anim_b05.py."""
import os
import sys
import anim as a
import anim_b03g as g
import anim_b05 as b5
sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")))
import b28_poses as S

P, foot, fair, CX = g.P, g.foot, g.fair, b5.CX
HIP = a.REST["pelvis"][0]
STYLE = os.environ.get("VEX_STYLE", "f1")

def build(sp):
    if sp is None: p = P(); p["_lift"] = 0.0; p["_rot"] = 0.0; return p
    if sp["fl"]: legs = dict(leg_n=fair("n", *sp["fl"]["rear"]), leg_f=fair("f", *sp["fl"]["lead"]))
    else: legs = dict(leg_n=foot("n", sp["lg"][0], 0), leg_f=foot("f", sp["lg"][1], 0))
    p = P(pelvis=sp["pel"], chest=sp["che"], head=sp["hea"], sash=sp["sash"], spine_rot=sp["spine"], head_rot=sp["hrot"], **legs)
    p["_lift"] = float(sp["lift"]); p["_rot"] = float(sp["rot"])
    if sp["s"]:
        t = sp["s"]; tn, tf, sn, sf = t[:4]; pref = t[4] if len(t) > 4 else "outdown"
        b5.hands2(p, (CX + tn[0], tn[1]), (CX + tf[0], tf[1]), sn, sf, pref)
    return p

def finish(frames):
    for p in frames:
        lift, rot = p.pop("_lift", 0.0), p.pop("_rot", 0.0)
        if abs(lift) > 0.05 or abs(rot) > 0.05: p["root_rot"] = -rot; p["hip_target"] = (float(HIP[0]), float(HIP[1] + p.get("pelvis", (0, 0))[1] - lift))
    return frames

def make(c):
    def fn():
        if c["frames"] is not None: fr = [g.depth(build(sp)) for sp in c["frames"]]
        else: fr = [g.depth(q) for q in g.tween([(k, build(sp)) for k, sp in c["keys"]], c["n"])]
        return {"name": c["name"], "fps": c["fps"], "loop": c["loop"], "frames": finish(fr), "events": dict(c["events"])}
    return fn

CLIPS = [make(c) for c in S.SETS[STYLE]()]

"""B28 VEX NORTH / EAST / WEST: the same authored poses as rig/anim_b28.py (data in ../b28_poses.py, selected by VEX_STYLE). EAST is authored through the `e` targets; WEST is the same targets through SX (never mirrored art); NORTH is a true rear view: fists live beside the spine and strikes rise up the screen."""
import math
import os
import sys
import danim as a
import danim_b03g as g
import drig as r
sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")))
import b28_poses as S

exec(open(os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "kai", "abilities", "scripts", "reach_helper.py"))).read())
reach = make_reach(a, r)
SX, D, L, R = a.SX, a.D, a.LEAD, a.REAR
NORTH = D == "north"
sx = SX if not NORTH else 1
P, lg, air = g.P, g.lg, g.air
STYLE = os.environ.get("VEX_STYLE", "f1")

def legs(dl, dr):
    return dict(leg_n=lg("n", dl, 0), leg_f=lg("f", dr, 0)) if NORTH else {f"leg_{L}": lg(L, dl * sx, 0), f"leg_{R}": lg(R, dr * sx, 0)}
def kleg(which, dx, dy):
    if NORTH: return {"leg_f" if which == "lead" else "leg_n": air("f" if which == "lead" else "n", dx * 0.4, dy, fs_t=0.8)}
    return {f"leg_{L if which == 'lead' else R}": air(L if which == "lead" else R, dx * sx, dy, fs_t=0.8)}
def N2(p, side):
    x, y = p; return ((15 if side == "f" else -15) + (0 if x < 24 else 3), y - 8 - 0.28 * max(0.0, x - 14))
SLOT = {"angle": "guard", "guard": "guard", "front": "side", "side": "side"}   # the direction rigs only carry the guard and side fists
def H(body, lead, rear, sl="guard", sr="guard", pref="down"):
    sl, sr = SLOT[sl], SLOT[sr]
    if NORTH: t = {"f": N2(lead, "f"), "n": N2(rear, "n")}; s_ = {"f": sl, "n": sr}
    else: t = {L: (sx * lead[0], lead[1]), R: (sx * rear[0], rear[1])}; s_ = {L: sl, R: sr}
    body.update(reach(body, t, s_, pref, -sx)); return body

def build(sp):
    if sp is None: return P()
    lift, rot = sp["lift"], sp["rot"]; f = 0 if NORTH else (sp["lean"] + 0.7 * rot) * sx
    pel, che, hea = sp["pel"], sp["che"], sp["hea"]
    p = P(pelvis=(pel[0] + f, pel[1] - 0.45 * lift), chest=(che[0] + f * 1.2, che[1] - 0.15 * lift), head=(hea[0] + f * 0.6, hea[1] - 0.05 * lift), sash=sp["sash"] * (1 if NORTH else sx),
          spine_rot=(0 if NORTH else sx * (sp["spine"] + 1.4 * rot)), head_rot=sp["hrot"] * (1 if NORTH else sx), **legs(*sp["lg"]))
    if sp["fl"]:
        for which in ("rear", "lead"): p.update(kleg(which, *sp["fl"][which]))
    if sp["e"]:
        t = sp["e"]; lead, rear, sl, sr = t[:4]; pref = t[4] if len(t) > 4 else "down"
        H(p, lead, rear, sl, sr, pref)
    return p

def make(c):
    def fn():
        if c["frames"] is not None: fr = [build(sp) for sp in c["frames"]]
        else: fr = g.tween([(k, build(sp)) for k, sp in c["keys"]], c["n"])
        return {"name": c["name"], "fps": c["fps"], "loop": c["loop"], "frames": fr, "events": dict(c["events"])}
    return fn

CLIPS = [make(c) for c in S.SETS[STYLE]()]

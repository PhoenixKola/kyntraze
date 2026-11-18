"""B04 Form I additions for SOUTH (active only when KAI_FORM=f1; the base build never sees them):
  * with_hair(clip): secondary motion for the separate rear-hair bone, derived from the body motion of the existing base poses;
  * transform(): the Form I transformation clip (anticipation, energy gathering, form_commit with the hair/face swap, reveal, recovery)."""
import copy, math
import anim as a
import anim_b03g as g
import rig as r

FORM = r.FORM == "f1"
P, A, lg, foot = g.P, g.A, g.lg, g.foot

def with_hair(clip):
    fr = [copy.deepcopy(p) for p in clip["frames"]]; n = len(fr); out = []; prev = 0.0
    def body(p): return (p.get("pelvis", (0, 0))[0] + p.get("chest", (0, 0))[0] + p.get("head", (0, 0))[0], p.get("spine_rot", 0.0) + p.get("head_rot", 0.0), p.get("pelvis", (0, 0))[1])
    for i, p in enumerate(fr):
        b0 = body(fr[i - 1] if i else p); b1 = body(p)
        target = 2.2 * (b1[0] - b0[0]) + 0.9 * (b1[1] - b0[1]) + 1.0 * (b1[2] - b0[2]) + 3.0 * math.sin(2 * math.pi * i / max(n, 1) * (1 if clip["loop"] else 0.5))
        prev = 0.55 * prev + 0.45 * max(-16.0, min(16.0, target)); p["hair"] = round(prev, 3); out.append(p)
    return out

def transform():
    guard = lambda: {}   # the approved stance arms (raised far fist, near fist at the waist) stay: they read as gathering without a stray extended arm
    def arm_g(): return a.arm(-28, g.UL["n"] * 0.9, -150, g.FL["n"] * 0.8, hand=0.0, slot=None)
    K = [
        P(),
        P(pelvis=(0, 9), chest=(1, 7), head=(0, 5), spine_rot=3, sash=-6, leg_n=foot("n", 4, 0), leg_f=foot("f", -4, 0), **guard()),
        P(pelvis=(0, 14), chest=(1, 12), head=(0, 9), head_rot=-6, spine_rot=6, sash=6, leg_n=foot("n", 6, 0), leg_f=foot("f", -6, 0), **guard()),
        P(pelvis=(0, 16), chest=(1, 14), head=(0, 11), head_rot=-8, spine_rot=8, sash=-12, leg_n=foot("n", 7, 0), leg_f=foot("f", -7, 0), **guard()),
        P(pelvis=(0, 8), chest=(0, 6), head=(0, 3), head_rot=3, sash=16, leg_n=foot("n", 7, 0), leg_f=foot("f", -7, 0), arm_n=A("n", -40, -78), arm_f=A("f", 40, 78)),
        P(pelvis=(0, -2), chest=(0, -3), head=(0, -5), head_rot=6, sash=34, leg_n=foot("n", 8, 0), leg_f=foot("f", -8, 0), arm_n=A("n", -66, -74), arm_f=A("f", 62, 74)),
        P(pelvis=(0, 0), chest=(0, -2), head=(0, -3), head_rot=5, sash=38, leg_n=foot("n", 8, 0), leg_f=foot("f", -8, 0), arm_n=A("n", -58, -90), arm_f=A("f", 56, 96)),
        P(pelvis=(0, 1), chest=(0, -1), head=(0, -2), head_rot=3, sash=26, leg_n=foot("n", 8, 0), leg_f=foot("f", -8, 0), arm_n=A("n", -50, -110), arm_f=A("f", 50, 110)),
        P(pelvis=(0, 3), chest=(0, 1), sash=14, leg_n=foot("n", 5, 0), leg_f=foot("f", -4, 0)),
        P(pelvis=(0, 3), chest=(0, 2), sash=8),
        P(pelvis=(0, 1), chest=(0, 1), sash=2),
    ]
    keys = [(0, K[0]), (1, K[1]), (2, K[2]), (4, K[3]), (5, K[3]), (6, K[4]), (7, K[5]), (8, K[6]), (9, K[7]), (10, K[7]), (12, K[8]), (14, K[9]), (15, K[10])]
    frames = [g.depth(q) for q in g.tween(keys, 16)]
    for i, p in enumerate(frames):
        p["form_slot"] = "base" if i < 7 else "f1"
        if 2 <= i <= 5:                                   # gathering: the held crouch trembles, the sash flutters
            dx = (1, -1, 1, -1)[i - 2]; p["pelvis"] = (p["pelvis"][0] + dx, p["pelvis"][1]); p["chest"] = (p["chest"][0] - dx, p["chest"][1]); p["sash"] = p.get("sash", 0.0) + 7 * dx
        if i == 7: p["pelvis"] = (p["pelvis"][0], -5); p["chest"] = (p["chest"][0], -5); p["head"] = (p["head"][0], p["head"][1] - 1)    # the release: Kai springs up at the commit
        if i == 8: p["pelvis"] = (p["pelvis"][0], -3)
    return {"name": "Transform", "fps": 20, "loop": False, "frames": frames,
            "events": {"anticipation_start": 0, "gather_start": 2, "release_start": 6, "form_commit": 7, "reveal_hold": 8, "interruptible_from": 10}}

CLIPS = [transform] if FORM else []

"""B04 Form I additions for NORTH / EAST / WEST (active only when KAI_FORM=f1; the base build never sees them):
  * with_hair(clip): secondary motion for the separate rear-hair bone, derived from the body motion of the existing base poses (no re-animation);
  * transform(): the Form I transformation clip (anticipation, energy gathering, form_commit with the hair/face swap, reveal, recovery)."""
import copy, math
import danim as a
import danim_b03g as g
import drig as r

FORM = r.FORM == "f1"
SX, D, L, R = a.SX, a.D, a.LEAD, a.REAR
NORTH = D == "north"
sx = SX if not NORTH else 1
Lu, Lf, Ru, Rf = a.LU[L], a.LF[L], a.LU[R], a.LF[R]
arm, P, lg = a.arm, g.P, g.lg

def with_hair(clip):
    """Frames with a smoothed `hair` rotation: the hair lags the head/torso motion and adds a small idle sway. Returns new pose dicts."""
    fr = [copy.deepcopy(p) for p in clip["frames"]]; n = len(fr); out = []; prev = 0.0
    def body(p): return (p.get("pelvis", (0, 0))[0] + p.get("chest", (0, 0))[0] + p.get("head", (0, 0))[0], p.get("spine_rot", 0.0) + p.get("head_rot", 0.0), p.get("pelvis", (0, 0))[1])
    for i, p in enumerate(fr):
        b0 = body(fr[i - 1] if i else p); b1 = body(p)
        dxf = (b1[0] - b0[0]) * (sx if not NORTH else 1); drot = (b1[1] - b0[1]); dy = b1[2] - b0[2]
        target = 2.2 * dxf * (1 if NORTH else 1) + 0.9 * drot * (sx if not NORTH else 1) + 1.0 * dy + 3.0 * math.sin(2 * math.pi * i / max(n, 1) * (1 if clip["loop"] else 0.5))
        prev = 0.55 * prev + 0.45 * max(-16.0, min(16.0, target)); p["hair"] = round(prev, 3); out.append(p)
    return out

# ------------------------------------------------------------------ Transform: 13 frames @ 20 fps, form_commit at frame 5 (hair and face swap behind the flash)
def transform():
    if NORTH:
        o = {"n": -1, "f": 1}; sw = lambda sd, u, f, slot="side": arm(o[sd] * u, a.LU[sd], o[sd] * f, a.LF[sd], 0.0, slot)
        K = [
            P(),
            P(pelvis=(0, 8), chest=(0, 6), head=(0, 4), sash=-6, leg_n=lg("n", 5, 0), leg_f=lg("f", -5, 0), arm_n=sw("n", 26, 150, "guard"), arm_f=sw("f", 26, 150, "guard")),
            P(pelvis=(0, 13), chest=(0, 11), head=(0, 8), head_rot=0, sash=4, leg_n=lg("n", 7, 0), leg_f=lg("f", -7, 0), arm_n=sw("n", 30, 160, "guard"), arm_f=sw("f", 30, 160, "guard")),
            P(pelvis=(0, 15), chest=(0, 13), head=(0, 10), sash=-10, leg_n=lg("n", 8, 0), leg_f=lg("f", -8, 0), arm_n=sw("n", 34, 165, "guard"), arm_f=sw("f", 34, 165, "guard")),
            P(pelvis=(0, 8), chest=(0, 6), head=(0, 4), sash=14, leg_n=lg("n", 8, 0), leg_f=lg("f", -8, 0), arm_n=sw("n", 44, 90), arm_f=sw("f", 44, 90)),
            P(pelvis=(0, -2), chest=(0, -3), head=(0, -4), sash=30, leg_n=lg("n", 9, 0), leg_f=lg("f", -9, 0), arm_n=sw("n", 52, 70), arm_f=sw("f", 52, 70)),
            P(pelvis=(0, 0), chest=(0, -2), head=(0, -3), sash=34, leg_n=lg("n", 9, 0), leg_f=lg("f", -9, 0), arm_n=sw("n", 58, 82), arm_f=sw("f", 58, 82)),
            P(pelvis=(0, 1), chest=(0, -1), head=(0, -2), sash=26, leg_n=lg("n", 9, 0), leg_f=lg("f", -9, 0), arm_n=sw("n", 54, 76), arm_f=sw("f", 54, 76)),
            P(pelvis=(0, 3), chest=(0, 1), head=(0, 0), sash=18, leg_n=lg("n", 6, 0), leg_f=lg("f", -6, 0), arm_n=sw("n", 42, 90), arm_f=sw("f", 42, 90)),
            P(pelvis=(0, 3), chest=(0, 2), sash=8, leg_n=lg("n", 3, 0), leg_f=lg("f", -3, 0)),
            P(pelvis=(0, 2), chest=(0, 1), sash=4),
        ]
        keys = [(0, K[0]), (1, K[1]), (2, K[2]), (4, K[3]), (5, K[3]), (6, K[4]), (7, K[5]), (8, K[6]), (9, K[7]), (10, K[7]), (12, K[8]), (14, K[9]), (15, K[10])]
    else:
        lean = lambda v: -sx * v
        guard = lambda: {f"arm_{L}": arm(sx * 20, Lu * 0.82, -sx * 158, Lf * 0.72, 0.0, "guard"), f"arm_{R}": arm(-sx * 24, Ru * 0.9, sx * 20, Rf * 0.8, 0.0, "guard")}
        K = [
            P(),
            P(pelvis=(-2 * sx, 10), chest=(-3 * sx, 8), head=(-1 * sx, 5), spine_rot=sx * 8, sash=-6 * sx, **{f"leg_{L}": lg(L, 3 * sx, 0), f"leg_{R}": lg(R, -4 * sx, 0)}, **guard()),
            P(pelvis=(-3 * sx, 15), chest=(-5 * sx, 13), head=(-2 * sx, 9), head_rot=-sx * 7, spine_rot=sx * 15, sash=6 * sx, **{f"leg_{L}": lg(L, 6 * sx, 0), f"leg_{R}": lg(R, -6 * sx, 0)}, **guard()),
            P(pelvis=(-4 * sx, 17), chest=(-6 * sx, 15), head=(-3 * sx, 11), head_rot=-sx * 9, spine_rot=sx * 18, sash=-12 * sx, **{f"leg_{L}": lg(L, 7 * sx, 0), f"leg_{R}": lg(R, -7 * sx, 0)}, **guard()),
            P(pelvis=(-1 * sx, 8), chest=(1 * sx, 6), head=(1 * sx, 3), head_rot=sx * 4, spine_rot=lean(4), sash=16 * sx, **{f"leg_{L}": lg(L, 7 * sx, 0), f"leg_{R}": lg(R, -7 * sx, 0)}, **{f"arm_{L}": arm(-sx * 20, Lu, -sx * 70, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * 30, Ru, -sx * 60, Rf, 0.0, "side")}),
            P(pelvis=(1 * sx, -2), chest=(3 * sx, -3), head=(2 * sx, -5), head_rot=sx * 8, spine_rot=sx * 6, sash=34 * sx, **{f"leg_{L}": lg(L, 9 * sx, 0), f"leg_{R}": lg(R, -9 * sx, 0)}, **{f"arm_{L}": arm(sx * 40, Lu, sx * 70, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * 66, Ru, -sx * 74, Rf, 0.0, "side")}),
            P(pelvis=(1 * sx, 0), chest=(3 * sx, -2), head=(2 * sx, -3), head_rot=sx * 6, spine_rot=sx * 4, sash=38 * sx, **{f"leg_{L}": lg(L, 9 * sx, 0), f"leg_{R}": lg(R, -9 * sx, 0)}, **{f"arm_{L}": arm(sx * 52, Lu, sx * 96, Lf, 0.0, "side"), f"arm_{R}": arm(-sx * 58, Ru, -sx * 70, Rf, 0.0, "side")}),
            P(pelvis=(1 * sx, 1), chest=(2 * sx, -1), head=(2 * sx, -2), head_rot=sx * 4, spine_rot=sx * 2, sash=26 * sx, **{f"leg_{L}": lg(L, 8 * sx, 0), f"leg_{R}": lg(R, -8 * sx, 0)}, **{f"arm_{L}": arm(sx * 60, Lu, sx * 110, Lf, 0.0, "guard"), f"arm_{R}": arm(-sx * 50, Ru, -sx * 64, Rf, 0.0, "side")}),
            P(pelvis=(1 * sx, 3), chest=(1 * sx, 1), spine_rot=lean(2), sash=14 * sx, **{f"leg_{L}": lg(L, 6 * sx, 0), f"leg_{R}": lg(R, -4 * sx, 0)}),
            P(pelvis=(1 * sx, 3), chest=(1 * sx, 2), sash=8 * sx, **{f"leg_{L}": lg(L, 4 * sx, 0)}),
            P(pelvis=(0, 1), chest=(0, 1), sash=2 * sx),
        ]
        keys = [(0, K[0]), (1, K[1]), (2, K[2]), (4, K[3]), (5, K[3]), (6, K[4]), (7, K[5]), (8, K[6]), (9, K[7]), (10, K[7]), (12, K[8]), (14, K[9]), (15, K[10])]
    frames = g.tween(keys, 16)
    for i, p in enumerate(frames):
        p["form_slot"] = "base" if i < 7 else "f1"
        if 2 <= i <= 5:                                   # gathering: the held crouch trembles, the sash flutters
            dx = (1, -1, 1, -1)[i - 2]; p["pelvis"] = (p["pelvis"][0] + dx, p["pelvis"][1]); p["chest"] = (p["chest"][0] - dx, p["chest"][1]); p["sash"] = p.get("sash", 0.0) + 7 * dx
        if i == 7: p["pelvis"] = (p["pelvis"][0], -5); p["chest"] = (p["chest"][0], -5); p["head"] = (p["head"][0], p["head"][1] - 1)    # the release: Kai springs up at the commit
        if i == 8: p["pelvis"] = (p["pelvis"][0], -3)
    return {"name": "Transform", "fps": 20, "loop": False, "frames": frames,
            "events": {"anticipation_start": 0, "gather_start": 2, "release_start": 6, "form_commit": 7, "reveal_hold": 8, "interruptible_from": 10}}

CLIPS = [transform] if FORM else []

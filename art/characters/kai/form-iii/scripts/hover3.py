"""Form III (Stillfire Apex) levitation layer, shared by the SOUTH solver (anim.py) and the NORTH/EAST/WEST solver (danim.py). Active only with KAI_F3=1.
Idea: the Form II clip set is re-posed, never re-rendered by hand:
  * hover lift  = the whole figure (root + every sole target + hip target) moves up by HOVER native px, the origin (ground) stays where it was, so the sprite floats above its ground point;
  * glide legs  = in Run / RunLower / RunPunchUpper / Dash the planted-foot footwork is replaced by relaxed, trailing, never-planted legs (small weight/angle changes only);
  * relaxed arms = Run/Idle arms hang calmer and lower than the fighting guard (upright, controlled, not clenched/hunched);
  * Death settles from the hover onto the floor, Transform rises from the ground into the hover, IdleSpecial / Beam / Sphere get their Form III event tables.
Nothing here touches the art; every clip stays a pose list for the existing rig solver (planted_err is only checked for planted soles)."""
import copy, math

HOVER = 7                                  # native px between the boots and the ground point in Idle / Run (+ a 1 px bob)
RELAX_U, RELAX_F = 0.5, 0.9              # how far (0..1) arm angles are pulled toward 'hanging' for the relaxed Form III carry

def _lift(p, L):
    rx, ry = p.get("root", (0, 0)); p["root"] = (rx, ry - L)
    for k in ("leg_n", "leg_f"):
        if k in p and "sole" in p[k]: x, y = p[k]["sole"]; p[k] = dict(p[k], sole=(x, y - L))
    if "hip_target" in p: hx, hy = p["hip_target"]; p["hip_target"] = (hx, hy - L)
    p["lift"] = L
    return p

def _relax_arm(a, ku=RELAX_U, kf=RELAX_F):
    if not a: return a
    b = copy.deepcopy(a); b["u"] = (a["u"][0] * (1 - ku), a["u"][1]); b["f"] = (a["f"][0] * (1 - kf), a["f"][1]); return b

class Ctx:
    """Everything a direction contributes: name, facing sign, the stance poses (soles / arms) taken from its own Idle."""
    def __init__(self, direction, sx, idle_frames, arm_keys=("arm_n", "arm_f")):
        self.d = direction; self.sx = sx; self.idle = idle_frames; self.s0 = idle_frames[0]
        self.soles = {k: tuple(self.s0[f"leg_{k}"]["sole"]) for k in "nf"}
        cx = (self.soles["n"][0] + self.soles["f"][0]) / 2; yb = max(self.soles["n"][1], self.soles["f"][1]) - 1.0
        self.cx, self.yb = cx, yb + {"east": 2.0, "west": 3.0, "south": -6.0, "north": 0.0}[direction]   # measured: puts the lowest boot pixel ~7 px above the ground point

    def hover_legs(self, p, i=0, n=16, trail=0.0, sway=1.0):
        """Relaxed legs close under the hips: profile = feet nearly together, trailing opposite to movement; front/back = feet narrow, toes slightly down."""
        sx = self.sx; ph = 2 * math.pi * i / max(1, n); S = self.soles
        for k in "nf":
            if self.d in ("east", "west"):
                off = {"n": -4.0, "f": 3.0}[k] * sx; tr = -sx * trail * (1.0 if k == "n" else 1.5)
                x = self.cx + off + tr + sway * 1.2 * math.sin(ph + (0 if k == "n" else 1.7)); y = self.yb + (1.0 if k == "n" else -1.0) - trail * 0.12 + sway * 1.0 * math.sin(ph + 0.6 + (0 if k == "n" else 2.4))
            else:
                o = -1 if S[k][0] < self.cx else 1
                x = self.cx + o * 8.0 + sway * 1.0 * math.sin(ph + (0 if k == "n" else 2.0)); y = self.yb + (2.0 if k == "n" else -1.0) - trail * 0.35 + sway * 1.0 * math.sin(ph + 1.0 + (0 if k == "n" else 2.2))
            p[f"leg_{k}"] = {"sole": (x, y), "planted": False, "straight": False, "slack": 3.0, "fs_t": 1.0, "fs_s": 1.0}
        return p

    def upright(self, p, dp=-3, dc=-2):
        px, py = p.get("pelvis", (0, 0)); cx, cy = p.get("chest", (0, 0)); p["pelvis"] = (px, py + dp); p["chest"] = (cx, cy + dc); return p

def bob(i, n, amp=1.2): return int(round(amp * math.sin(2 * math.pi * i / n)))

def hoverize(name, c, ctx, base_run=None):
    """Return the Form III version of clip `c` (a clip dict as the Form II builders return it)."""
    c = copy.deepcopy(c); fr = c["frames"]; n = len(fr); sx = ctx.sx
    if name == "Idle":
        for i, p in enumerate(fr):
            ctx.hover_legs(p, i, n, trail=0.0, sway=0.7); ctx.upright(p, -1, -1)
            for k in ("arm_n", "arm_f"): p[k] = _relax_arm(p[k])
            p["spine_rot"] = p.get("spine_rot", 0.0) * 0.5
            _lift(p, HOVER + bob(i, n))
        c["fps"] = 8
    elif name in ("Run", "RunLower", "RunPunchUpper"):
        for i, p in enumerate(fr):
            ph = i % 8; trail = 6.0 + 1.5 * math.sin(2 * math.pi * ph / 8); ref = base_run[ph] if base_run is not None else {}
            dch = (p["chest"][0] - ref["chest"][0], p["chest"][1] - ref["chest"][1]) if ref else (0, 0); dhd = (p["head"][0] - ref["head"][0], p["head"][1] - ref["head"][1]) if ref else (0, 0)
            ctx.hover_legs(p, ph, 8, trail=trail, sway=0.8); p["pelvis"] = (0, 0); p["chest"] = (dch[0], dch[1]); ctx.upright(p, -1, -1); p["head"] = (dhd[0], dhd[1])
            p["spine_rot"] = (p.get("spine_rot", 0.0) - ref.get("spine_rot", 0.0)) * 0.7 + (ctx.sx * 3.0 if ctx.d in ("east", "west") else 0.0)
            for k in ("arm_n", "arm_f"):                     # moving-punch upper layer keeps its punching arm; every other arm swings gently instead of pumping
                if name == "RunPunchUpper" and ref and p[k] != ref.get(k): continue
                a = ctx.idle[(ph * 2) % len(ctx.idle)][k]; p[k] = _relax_arm(a, 0.5, 0.85)
            _lift(p, HOVER + bob(ph, 8, 1.0))
        if name == "Run": c["fps"] = 12
    elif name == "BasicPunch":
        for i, p in enumerate(fr):
            old = {k: copy.deepcopy(p[k]) for k in ("leg_n", "leg_f")}; ctx.hover_legs(p, i, n, sway=0.4); ctx.upright(p, -1, -1)
            if "lift_override" in p: pass
            _lift(p, HOVER + 0)
    elif name == "Dash":
        for i, p in enumerate(fr):
            ctx.hover_legs(p, i, n, trail=12.0, sway=0.0); ctx.upright(p, -1, -1); _lift(p, HOVER + 2)
    elif name == "Hurt":
        for i, p in enumerate(fr):
            old = {k: copy.deepcopy(p[k]) for k in ("leg_n", "leg_f")}; ctx.hover_legs(p, i, n, trail=-4.0 * (1 if 1 <= i <= 4 else 0), sway=0.6)
            tuck = 6 if i <= 3 else (3 if i <= 5 else 0)      # knees draw up with the hit (also keeps the far leg inside its reach: no >40 % shin stretch)
            for k in ("leg_n", "leg_f"): x, y = p[k]["sole"]; p[k] = dict(p[k], sole=(x, y - tuck))
            ctx.upright(p, -1, -1); _lift(p, HOVER + (3 if 1 <= i <= 3 else 1))
    elif name == "Death":
        for i, p in enumerate(fr): _lift(p, max(0.0, HOVER * (1.0 - i / 9.0)))
    elif name in ("Kick", "Glide", "Dive"):     # B25.1: these poses own their legs (kick / trailing glide / crouch landing): only the hover lift is added so the figure sits at the same height as Idle.
        for i, p in enumerate(fr):
            _lift(p, HOVER + (bob(i, n, 1.0) if name == "Glide" else 0))
    elif name in ("Beam", "Sphere", "Lunge", "Uppercut", "Slam"):
        for i, p in enumerate(fr):
            old = {k: copy.deepcopy(p[k]) for k in ("leg_n", "leg_f")}; ctx.hover_legs(p, i, n, sway=0.0); ctx.upright(p, 0, 0); _lift(p, HOVER + 0)
    return c

def idle_special(ctx, idle_clip):
    """Rare special idle: slow head turn, one relaxed hand drifting up and back, a tiny settle. 28 frames @ 14 fps, plays once."""
    base = copy.deepcopy(idle_clip["frames"][0]); ctx.hover_legs(base, 0, 16, sway=0.0); ctx.upright(base, -4, -3)
    for k in ("arm_n", "arm_f"): base[k] = _relax_arm(base[k])
    fr = []; n = 28; key = "arm_n" if ctx.d == "west" else "arm_f"
    for i in range(n):
        p = copy.deepcopy(base); t = i / (n - 1); e = math.sin(math.pi * t) ** 2
        p["head_rot"] = ctx.sx * -9.0 * e if ctx.d in ("east", "west") else (7.0 * e if ctx.d == "south" else 4.0 * e)
        a = p[key]; b = copy.deepcopy(a); b["u"] = (a["u"][0] + 14.0 * e, a["u"][1]); b["f"] = (a["f"][0] - 28.0 * e, a["f"][1]); p[key] = b
        p["sash"] = p.get("sash", 0.0) + 5.0 * math.sin(2 * math.pi * t)
        p["chest"] = (p["chest"][0], p["chest"][1] - (1 if 0.35 < t < 0.65 else 0))
        _lift(p, HOVER + (1 if 0.4 < t < 0.6 else 0)); fr.append(p)
    return {"name": "IdleSpecial", "fps": 14, "loop": False, "frames": fr, "events": {"turn_peak": 13, "pulse": 14, "settle": 22}}

def beam_events(c):
    ev = c["events"]; rel = ev["release"]; ev["hold_start"] = max(1, rel - 4); ev["hold_end"] = rel - 1       # seamless charge hold = the trembling frames just before the release
    return c

def transform3(c, ctx):
    """Form II -> Form III. The Form I transformation builder supplies the crouch / gather / spring timing; here it is re-tagged with the jacket tear stages
    (form slots base -> t1 -> t2 -> f1), the body is lifted off the floor from the commit on, legs relax, and two hover settle frames are appended (18 frames @ 20 fps)."""
    c = copy.deepcopy(c); fr = c["frames"]; out = []
    lifts = {6: 1, 7: 3, 8: 5, 9: 6}
    for i, p in enumerate(fr):
        p["form_slot"] = "base" if i <= 3 else ("t1" if i <= 5 else ("t2" if i == 6 else "f1"))
        if i >= 7: ctx.hover_legs(p, i, 16, sway=0.4)
        if i >= 12:
            ctx.upright(p, -1, -1)
            for k in ("arm_n", "arm_f"): p[k] = _relax_arm(ctx.idle[0][k])
        L = lifts.get(i, HOVER if i >= 10 else 0)
        if L: _lift(p, L)
        out.append(p)
    for j in (0, 2):
        q = copy.deepcopy(hoverize("Idle", {"frames": [ctx.idle[j * 2]], "fps": 10, "loop": True, "events": {}, "name": "Idle"}, ctx)["frames"][0]); q["form_slot"] = "f1"; out.append(q)
    c["frames"] = out; c["fps"] = 20
    c["events"] = {"anticipation_start": 0, "gather_start": 2, "tear_start": 4, "release_start": 6, "form_commit": 7, "reveal_hold": 8, "rise_end": 11, "interruptible_from": 12}
    return c

def sphere3(ctx, punch_clip):
    """Instinct Reversal strikes: three fast, alternating lead-hand precision strikes built from the BasicPunch key poses (coil -> impact -> snap back), 22 frames @ 24 fps.
    Events: strike_a / strike_b / strike_c = the impact frames, end = back in hover guard."""
    pk = punch_clip["frames"]; sx = ctx.sx; lead = "arm_" + ("f" if ctx.d in ("south", "east") else "n")
    if ctx.d == "north": lead = "arm_n"
    def strike(src, du, df):
        p = copy.deepcopy(src); a = p.get(lead)
        if a: b = copy.deepcopy(a); b["u"] = (a["u"][0] + du, a["u"][1]); b["f"] = (a["f"][0] + df, a["f"][1]); p[lead] = b
        return p
    seq = [pk[0], pk[1], pk[2], pk[4], pk[5],                       # 0 stance, 1-2 coil, 3 launch, 4 STRIKE A
           pk[7], strike(pk[3], 0, 0), strike(pk[4], 8, -6),        # 5 recoil, 6 re-coil, 7 launch
           strike(pk[5], 10, -8), strike(pk[6], 10, -8),            # 8 STRIKE B (angled), 9 hold
           pk[7], strike(pk[3], 0, 0), strike(pk[4], -6, 4),        # 10 recoil, 11 coil, 12 launch
           strike(pk[5], -8, 5), strike(pk[6], -8, 5),              # 13 STRIKE C (low line), 14 hold
           pk[7], pk[8], pk[9], pk[10], pk[11], pk[12], pk[13]]     # 15-21 snap back and settle
    fr = []
    for i, src in enumerate(seq):
        p = copy.deepcopy(src); ctx.hover_legs(p, i, 22, sway=0.0); ctx.upright(p, -1, -1); _lift(p, HOVER); fr.append(p)
    return {"name": "Sphere", "fps": 24, "loop": False, "frames": fr, "events": {"gather_start": 0, "strike_a": 4, "strike_b": 8, "strike_c": 13, "end": 17, "release": 4, "recover_start": 15, "interruptible_from": 17}}

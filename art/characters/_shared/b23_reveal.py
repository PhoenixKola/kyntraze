"""B23 reveal choreography + Victory clips, shared by the Kai / Ren / Sora rigs (south `anim_form.py` and the other facings' `danim_form.py`).
Pure pose maths on the dict poses the rigs already use (pelvis / chest / head / head_rot / spine_rot / sash): it never touches art, arms or leg targets, so every limb stays on the rig's own authored vocabulary and legs stay planted.
`reshape(clip, style)`: the form's own acting over the shared authored reveal (crouch depth, how hard the pressure trembles, how high the release springs, sash and hair drift, how the head carries after the commit).
`victory(clip, style)`: a 16-frame clip built from the same authored reveal poses (gather -> release -> reveal hold) that settles into a breathing held stance (frames `hold`.. loop). Events contract: {"hold": 8}."""
import copy, math

STYLES = {
    # Kai Flarebound: springy, confident - deep ready crouch, a big bright spring at the ignition, hair/sash lift
    "flare": dict(sink=1.15, tremor=1.0, spring=1.5, lift=0, sash=1.5, tilt=2.0, stomp=0, breath=0.9),
    # Kai Cometheart: weight and strain - deepest crouch, violent tremor, a hard short slam of a release
    "comet": dict(sink=1.35, tremor=2.4, spring=1.9, lift=0, sash=1.25, tilt=-1.0, stomp=2, breath=0.7),
    # Kai Stillfire Apex: near-silent - shallow, no tremor, tiny release, slow drifting cloth, head carried high (the hover layer adds the rise)
    "still": dict(sink=0.55, tremor=0.0, spring=0.3, lift=0, sash=0.6, tilt=-3.0, stomp=0, breath=0.35),
    # Ren Crimson Ascendant: heavy and planted - wide deep crouch, shoulders drive, a stomp into the reveal
    "ren": dict(sink=1.25, tremor=1.5, spring=1.0, lift=0, sash=0.8, tilt=1.0, stomp=3, breath=0.8),
    # Sora Azure Sovereign: measured channelling - smooth, barely trembling, floats up a little, graceful cloth
    "sora": dict(sink=0.8, tremor=0.3, spring=0.7, lift=3, sash=1.1, tilt=-2.0, stomp=0, breath=0.5),
}

def _p(p, k, d=(0, 0)): return p.get(k, d)

def reshape(clip, style):
    s = STYLES[style]; fr = [copy.deepcopy(p) for p in clip["frames"]]
    for i, p in enumerate(fr):
        crouch = 1 <= i <= 6
        for k in ("pelvis", "chest", "head"):
            if k in p and crouch:
                x, y = p[k]
                if y > 0: p[k] = (x, round(y * s["sink"]))
        if 2 <= i <= 5:                                               # extra pressure tremor beyond the authored one
            dx = (1, -1, 1, -1)[i - 2] * (s["tremor"] - 1.0)
            if "pelvis" in p: p["pelvis"] = (p["pelvis"][0] + round(dx), p["pelvis"][1])
            if "chest" in p: p["chest"] = (p["chest"][0] - round(dx), p["chest"][1])
            p["sash"] = p.get("sash", 0.0) + 7.0 * dx
        if i == 6 and s["stomp"]: p["pelvis"] = (p["pelvis"][0], p["pelvis"][1] + s["stomp"])         # the wind-down before the release lands heavier
        if i in (7, 8):                                               # release spring
            e = (5 if i == 7 else 3) * (s["spring"] - 1.0)
            for k in ("pelvis", "chest", "head"):
                if k in p: p[k] = (p[k][0], round(p[k][1] - e))
        if i >= 4: p["sash"] = p.get("sash", 0.0) * s["sash"]
        if i >= 7:
            p["head_rot"] = p.get("head_rot", 0.0) + s["tilt"]
            if s["lift"]:
                u = min(1.0, (i - 6) / 4.0)
                for k in ("pelvis", "chest", "head"):
                    if k in p: p[k] = (p[k][0], round(p[k][1] - s["lift"] * u))
    out = dict(clip); out["frames"] = fr; return out

def victory(clip, style):
    """16 frames @ 10 fps from the shaped reveal: stance -> gather -> release -> reveal hold; frames 8-15 breathe in the held pose. All frames use the transformed look."""
    s = STYLES[style]; src = reshape(clip, style)["frames"]; n = len(src)
    pick = [0, min(n - 1, 3), min(n - 1, 6), min(n - 1, 7), min(n - 1, 9), min(n - 1, 11)]
    keys = [(0, src[pick[0]]), (3, src[pick[1]]), (5, src[pick[2]]), (6, src[pick[3]]), (8, src[pick[4]]), (15, src[pick[5]])]
    fr = []
    for f in range(16):
        for (f0, p0), (f1, p1) in zip(keys, keys[1:]):
            if f0 <= f <= f1:
                t = 0.0 if f1 == f0 else (f - f0) / (f1 - f0); t = t * t * (3 - 2 * t) if 0 < t < 1 else t
                q = {}
                for k in set(p0) | set(p1):
                    a, b = p0.get(k, p1.get(k)), p1.get(k, p0.get(k))
                    q[k] = _lerp(a, b, t)
                fr.append(q); break
    form_slot = next((p.get("form_slot") for p in reversed(src) if p.get("form_slot")), None)
    for i, q in enumerate(fr):
        if form_slot: q["form_slot"] = form_slot
        if i >= 8:                                                    # breathing hold: chest lifts, sash and head drift (amplitude per form)
            t = 2 * math.pi * (i - 8) / 8; b = s["breath"]
            q["chest"] = (q["chest"][0], q["chest"][1] + (1 if math.sin(t - 1.0) < -0.4 and b > 0.4 else 0))
            q["sash"] = q.get("sash", 0.0) + 6.0 * b * math.sin(t - 0.8); q["head_rot"] = q.get("head_rot", 0.0) + 1.6 * b * math.sin(t - 1.3)
    return {"name": "Victory", "fps": 10, "loop": False, "frames": fr, "events": {"hold": 8}}

def _lerp(a, b, t):
    if isinstance(a, (bool, str)) or a is None: return a if t < 0.5 else b
    if isinstance(a, (int, float)): return a + (b - a) * t
    if isinstance(a, (tuple, list)): return tuple(_lerp(x, y, t) for x, y in zip(a, b))
    if isinstance(a, dict): return {k: (_lerp(a[k], b[k], t) if k in b else a[k]) for k in a} | {k: b[k] for k in b if k not in a}
    return a

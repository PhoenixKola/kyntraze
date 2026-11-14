"""Per-direction constants: draw order, hand slots, skeleton offsets, stance. Everything numeric about the PARTS comes from their masks
(make_config.py); this file only holds what is a design decision."""

import os

SOLE_DY = 18.0          # ankle pivot sits this far above the sole (same as the SOUTH candidate)
CANVAS = (176, 176)

SPEC = {
 "east": dict(root=(70, 164), facing=+1, lead="f", rear="n", sh_dx={"n": -10.0, "f": 6.0}, hip_dx={"n": -10.0, "f": 10.0}, knot_dx=8.0,
              knee_dir={"n": +1, "f": +1}, point={"side": 90.0, "guard": 180.0}, torso_flip=False),
 "west": dict(root=(106, 164), facing=-1, lead="n", rear="f", sh_dx={"n": -6.0, "f": 10.0}, hip_dx={"n": -10.0, "f": 10.0}, knot_dx=-8.0,
              knee_dir={"n": -1, "f": -1}, point={"side": -90.0, "guard": 180.0}, torso_flip=False),
 "north": dict(root=(88, 164), facing=-1, lead="n", rear="f", sh_dx={"n": -15.0, "f": 13.0}, hip_dx={"n": -12.0, "f": 12.0}, knot_dx=0.0,
               knee_dir={"n": -1, "f": +1}, point={"side": -90.0, "guard": 180.0}, torso_flip=False),
}

FORM = os.environ.get("KAI_FORM", "")

def parts_for(d):
    ps = _parts_for(d)
    if FORM == "f1":      # Form I: spikier head + a separate rear hair piece (own bone), the base head stays in the rig behind the "form" slot for the transformation clip
        i = next(k for k, p in enumerate(ps) if p["id"] == "head")
        ps[i]["slot"] = "form:base"
        ps[i:i] = [dict(id="hair_f1", img="hair_f1.png", bone="hair", kind="hair", slot="form:f1"), dict(id="head_f1", img="head_f1.png", bone="head", kind="head", slot="form:f1")]
    return ps

def _parts_for(d):
    """Part list in draw order (back -> front): id, img, bone, kind and optional slot/point."""
    P = lambda id, img, bone, kind, **k: dict(id=id, img=img, bone=bone, kind=kind, **k)
    def hands(side):
        return [P(f"fist_guard_{side}", "fist_guard.png", f"hand_{side}", "fist_guard", slot=f"hand_{side}:guard", point=SPEC[d]["point"]["guard"]),
                P(f"fist_side_{side}", "fist_side.png", f"hand_{side}", "fist_side", slot=f"hand_{side}:side", point=SPEC[d]["point"]["side"])]
    def arm(side):
        return [P(f"upper_arm_{side}", f"upper_arm_{side}.png", f"upper_arm_{side}", "sleeve"),
                P(f"forearm_{side}", f"forearm_{side}.png", f"forearm_{side}", "forearm")] + hands(side)
    leg = lambda s: [P(f"boot_{s}", f"boot_{s}.png", f"boot_{s}", "boot"), P(f"shin_{s}", f"shin_{s}.png", f"shin_{s}", "shin"), P(f"thigh_{s}", f"thigh_{s}.png", f"thigh_{s}", "thigh")]
    core = [P("sash_band", "sash_band.png", "pelvis", "band"), P("sash_tails", "sash_tails.png", "sash", "tails"),
            P("torso", "torso.png", "spine", "torso"), P("head", "head.png", "head", "head")]
    if d in ("east", "west"):
        # profile: far leg and far arm sit behind the body, near arm in front of everything; the head is drawn under the torso so the collar covers the neck
        prof_core = [core[0], core[1], core[3], core[2]]
        return leg("f") + arm("f") + [P("hips", "hips.png", "pelvis", "hips")] + leg("n") + prof_core + arm("n")
    # back view: sash is tied at the FRONT, so only the waistband shows (no knot, no tails); head under the torso so the collar fold covers the neck
    return leg("f") + leg("n") + [P("hips", "hips.png", "pelvis", "hips")] + [core[0], core[3], core[2]] + arm("f") + arm("n")

# hands: which fist state each side starts in (the clip builders override per frame)
def default_slots(d):
    lead, rear = SPEC[d]["lead"], SPEC[d]["rear"]
    s = {f"hand_{lead}": "guard", f"hand_{rear}": "side"}
    if FORM == "f1": s["form"] = "f1"
    return s

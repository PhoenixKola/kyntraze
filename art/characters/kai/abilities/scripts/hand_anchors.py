"""Per-frame fist anchors for the Beam / Sphere clips, measured on the REAL rig (same FK, parts and slots as the Blender export; numpy parity is checked by the pipeline).
  python hand_anchors.py <south|north|east|west> <base|f1>      -> prints JSON {clip: [{n:[x,y], f:[x,y]} per frame]}
Anchor = centroid of the visible fist art, in exported sprite px RELATIVE to the manifest ground origin (x right, y down), so
world = hero position + anchor * hero scale, whatever the clip's tight crop is."""
import json, os, sys
import numpy as np
d, form = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__)); KAI = os.path.abspath(os.path.join(HERE, "..", ".."))
BASE = os.path.join(KAI, "base"); FORM = os.path.join(KAI, "form-i")
if form == "f1": os.environ["KAI_FORM"] = "f1"
if d == "south":
    if form == "f1": os.environ["KAI_ROOT_SOUTH"] = os.path.join(FORM, "south")
    sys.path.insert(0, os.path.join(BASE, "production-south-candidate", "rig")); import anim as a, rig as r
else:
    os.environ["KAI_DIR"] = d
    if form == "f1": os.environ["KAI_ROOT"] = FORM
    sys.path.insert(0, os.path.join(BASE, "production-other-directions-candidate", "scripts")); import danim as a, drig as r
imgs = r.load_images()
def fist_points(ch, slots, side):
    W = r.fk(ch); out = None
    for p in r.visible(slots):
        if p["bone"] != f"hand_{side}" or not p["id"].startswith("fist"): continue
        img, _ = imgs[p["id"]]; Ap, tp = r.part_rest(p); Ab, tb, _r = W[p["bone"]]; A = Ab @ Ap; t = Ab @ tp + tb
        ys, xs = np.nonzero(img[..., 3] > 0); pts = (A @ np.stack([xs + 0.5, ys + 0.5])).T + t
        out = pts.mean(0) - np.array(r.ROOT)
    return out
def run(name):
    clip = next(f() for f in a.CLIPS if f()["name"] == name); res = []
    for ch, order, errs, slots in a.solve_clip(clip):
        fr = {}
        for s in ("n", "f"):
            c = fist_points(ch, slots, s); fr[s] = [round(float(c[0]), 2), round(float(c[1]), 2)] if c is not None else None
        res.append(fr)
    return res
if __name__ == "__main__": print(json.dumps({"Beam": run("Beam"), "Sphere": run("Sphere")}))

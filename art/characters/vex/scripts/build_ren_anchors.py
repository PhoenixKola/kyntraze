"""Build public/art/ren-anchors.json (schema of public/art/kai-anchors.json): python build_ren_anchors.py [base] [f1]"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); VEX = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(VEX, "..", "..", ".."))
OUT = os.path.join(REPO, "public", "art", "ren-anchors.json")
forms = [f for f in sys.argv[1:]] or ["base"]
out = json.load(open(OUT)) if os.path.exists(OUT) else {"schema": "kyntraze.hand-anchors/1", "unit": "sprite px relative to the manifest ground origin (x right, y down)", "fist": "centroid of the visible fist art", "forms": {}}
for form in forms:
    out["forms"][form] = {}
    for d in ("south", "north", "east", "west"):
        r = subprocess.run([sys.executable, os.path.join(HERE, "hand_anchors_ren.py"), d, form], capture_output=True, text=True)
        if r.returncode: print(r.stderr[-1500:]); sys.exit(1)
        j = json.loads(r.stdout)
        for clip in j:
            for fr in j[clip]: fr["m"] = [round((fr["n"][0] + fr["f"][0]) / 2, 2), round((fr["n"][1] + fr["f"][1]) / 2, 2)]
        out["forms"][form][d] = j
json.dump(out, open(OUT, "w"), separators=(",", ":")); print("wrote", OUT, list(out["forms"]))

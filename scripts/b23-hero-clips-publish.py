"""B23: publishes the reshaped Transform and the new Victory clip of Kai (Flarebound / Cometheart / Stillfire), Ren (Crimson Ascendant) and Sora (Azure Sovereign) from the rig output to public/art/<set>/<dir>: copies only those two sheets and merges only their manifest entries, so every other clip stays byte-identical.
(Vex is published whole by scripts/b22-vex-publish.py.) Usage: python scripts/b23-hero-clips-publish.py [--check]"""
import json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); C = os.path.join(ROOT, "art", "characters"); PUB = os.path.join(ROOT, "public", "art")
NEW = ("Transform", "Victory")
def kai(form, d): return os.path.join(C, "kai", {"f1": "form-i", "f2": "form-ii", "f3": "form-iii"}[form], d, "sheets")
SETS = [(f"kai-{f}", lambda d, f=f: kai(f, d)) for f in ("f1", "f2", "f3")] + [
    ("ren-f1", lambda d: os.path.join(C, "ren", "f1", d, "sheets")),
    ("sora-f1", lambda d: os.path.join(C, "sora", "south-f1" if d == "south" else os.path.join("dirs-f1", d), "sheets"))]
ok = True
for dst, src in SETS:
    for d in ("south", "north", "east", "west"):
        s = src(d); mp = os.path.join(s, "manifest.json")
        if not os.path.exists(mp): print("MISSING", dst, d, mp); ok = False; continue
        new = json.load(open(mp)); pm = os.path.join(PUB, dst, d, "manifest.json"); old = json.load(open(pm))
        for c in NEW:
            if c not in new["animations"]: print("MISSING CLIP", c, dst, d); ok = False; continue
            a = dict(new["animations"][c])
            if "--check" not in sys.argv:
                old["animations"][c] = a; shutil.copyfile(os.path.join(s, os.path.basename(a["sheet"])), os.path.join(PUB, dst, d, a["sheet"]))
        if "--check" not in sys.argv: json.dump(old, open(pm, "w", encoding="utf8"), indent=1); print(dst, d, "ok")
sys.exit(0 if ok else 1)

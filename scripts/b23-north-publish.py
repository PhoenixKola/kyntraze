"""B23: publishes the rebuilt NORTH sets (true rear-view strike: the arm goes away from the camera) for every hero / form to public/art/<set>/north: manifest.json + every sheet the manifest lists (the shared base frame can change when the punch no longer swings wide, so the whole north dir is replaced, as in the original per-set copy steps). Usage: python scripts/b23-north-publish.py [--check]"""
import json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); C = os.path.join(ROOT, "art", "characters"); PUB = os.path.join(ROOT, "public", "art")
SETS = {"kai": os.path.join(C, "kai", "base", "production-other-directions-candidate", "north", "sheets"), "kai-f1": os.path.join(C, "kai", "form-i", "north", "sheets"), "kai-f2": os.path.join(C, "kai", "form-ii", "north", "sheets"), "kai-f3": os.path.join(C, "kai", "form-iii", "north", "sheets"),
        "ren": os.path.join(C, "ren", "north", "sheets"), "ren-f1": os.path.join(C, "ren", "f1", "north", "sheets"), "sora": os.path.join(C, "sora", "dirs", "north", "sheets"), "sora-f1": os.path.join(C, "sora", "dirs-f1", "north", "sheets"),
        "vex": os.path.join(C, "vex", "north", "sheets"), "vex-f1": os.path.join(C, "vex", "f1", "north", "sheets"), "vex-f2": os.path.join(C, "vex", "f2", "north", "sheets")}
ok = True
for dst, s in SETS.items():
    mp = os.path.join(s, "manifest.json")
    if not os.path.exists(mp): print("MISSING", dst, mp); ok = False; continue
    m = json.load(open(mp)); names = [os.path.basename(a["sheet"]) for a in m["animations"].values()]
    miss = [n for n in names if not os.path.exists(os.path.join(s, n))]
    if miss: print("MISSING SHEETS", dst, miss); ok = False; continue
    if "--check" in sys.argv: continue
    t = os.path.join(PUB, dst, "north"); os.makedirs(os.path.join(t, "sheets"), exist_ok=True); shutil.copyfile(mp, os.path.join(t, "manifest.json"))
    for n in names: shutil.copyfile(os.path.join(s, n), os.path.join(t, "sheets", n))
    print(dst, "north", len(names), "sheets")
sys.exit(0 if ok else 1)

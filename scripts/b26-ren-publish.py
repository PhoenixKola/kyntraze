"""B26: publishes the new Ren Crimson Ascendant clips from the rebuilt Form I rig output (art/characters/ren/scripts/build_f1.sh) to public/art/ren-f1/<dir>: copies only the new sheets and merges only their manifest entries, so every existing clip stays byte-identical.
Usage: python scripts/b26-ren-publish.py"""
import json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); REN = os.path.join(ROOT, "art", "characters", "ren", "f1"); PUB = os.path.join(ROOT, "public", "art", "ren-f1")
NEW = ("Jab", "Kick", "Hook", "Uppercut", "Cyclone", "Rampage", "Pound", "NovaCharge", "Lunge", "Takeoff", "Glide", "Dive")
for d in ("south", "north", "east", "west"):
    s = os.path.join(REN, d); new = json.load(open(os.path.join(s, "sheets", "manifest.json"))); pm = os.path.join(PUB, d, "manifest.json"); old = json.load(open(pm))
    for c in NEW:
        if c not in new["animations"]: sys.exit(f"missing {c} in {s}")
        a = dict(new["animations"][c]); old["animations"][c] = a; shutil.copyfile(os.path.join(s, a["sheet"]), os.path.join(PUB, d, a["sheet"]))
    json.dump(old, open(pm, "w", encoding="utf8"), indent=1); print("ren-f1", d, "ok")

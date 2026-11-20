"""B27: publishes the new Sora Azure Sovereign flight clips (Takeoff / Glide / Dive) from the rebuilt Form I rig output (art/characters/sora/tools/build_f1.py) to public/art/sora-f1/<dir>: copies only the new sheets and merges only their manifest entries, so every existing published sheet stays byte-identical (a rebuild shows 1-4 px of build noise on the others).
Usage: python scripts/b27-sora-publish.py"""
import json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SORA = os.path.join(ROOT, "art", "characters", "sora"); PUB = os.path.join(ROOT, "public", "art", "sora-f1")
NEW = ("Takeoff", "Glide", "Dive")
SRC = {"south": os.path.join(SORA, "south-f1", "sheets"), "north": os.path.join(SORA, "dirs-f1", "north", "sheets"), "east": os.path.join(SORA, "dirs-f1", "east", "sheets"), "west": os.path.join(SORA, "dirs-f1", "west", "sheets")}
for d, s in SRC.items():
    new = json.load(open(os.path.join(s, "manifest.json"))); pm = os.path.join(PUB, d, "manifest.json"); old = json.load(open(pm))
    for c in NEW:
        if c not in new["animations"]: sys.exit(f"missing {c} in {s}")
        a = dict(new["animations"][c]); old["animations"][c] = a; shutil.copyfile(os.path.join(s, os.path.basename(a["sheet"])), os.path.join(PUB, d, a["sheet"]))
    json.dump(old, open(pm, "w", encoding="utf8"), indent=1); print("sora-f1", d, "ok")

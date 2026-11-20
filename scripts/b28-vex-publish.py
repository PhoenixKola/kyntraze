"""B28: publishes the new Vex combat clips from the rebuilt Form I / Form II rig output (art/characters/vex/scripts/build_f1.sh, build_f2.sh) to public/art/vex-f1/<dir> and public/art/vex-f2/<dir>: copies only the new sheets and merges only their manifest entries, so every existing clip stays byte-identical.
Usage: python scripts/b28-vex-publish.py"""
import json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); VEX = os.path.join(ROOT, "art", "characters", "vex")
sys.path.insert(0, VEX); import b28_poses
for form, pub in (("f1", "vex-f1"), ("f2", "vex-f2")):
    NEW = b28_poses.NEW[form]; PUB = os.path.join(ROOT, "public", "art", pub)
    for d in ("south", "north", "east", "west"):
        s = os.path.join(VEX, form, d); new = json.load(open(os.path.join(s, "sheets", "manifest.json"))); pm = os.path.join(PUB, d, "manifest.json"); old = json.load(open(pm))
        for c in NEW:
            if c not in new["animations"]: sys.exit(f"missing {c} in {s}")
            a = dict(new["animations"][c]); old["animations"][c] = a; shutil.copyfile(os.path.join(s, "sheets", os.path.basename(a["sheet"])), os.path.join(PUB, d, a["sheet"]))
        json.dump(old, open(pm, "w", encoding="utf8"), indent=1); print(pub, d, "ok")

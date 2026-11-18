"""Adds the three B22 Kai clips (Lunge, Uppercut, Slam) from the rebuilt rig output to public/art/<kai|kai-f1|kai-f2|kai-f3>/<dir>: copies only the new sheets and merges only their manifest entries, so every existing clip stays byte-identical."""
import json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); K = os.path.join(ROOT, "art", "characters", "kai"); PUB = os.path.join(ROOT, "public", "art")
NEW = ("Lunge", "Uppercut", "Slam")
def src(form, d):
    if form == "base": return os.path.join(K, "base", "production-south-candidate") if d == "south" else os.path.join(K, "base", "production-other-directions-candidate", d)
    return os.path.join(K, {"f1": "form-i", "f2": "form-ii", "f3": "form-iii"}[form], d)
for form, dst in (("base", "kai"), ("f1", "kai-f1"), ("f2", "kai-f2"), ("f3", "kai-f3")):
    for d in ("south", "north", "east", "west"):
        s = src(form, d); new = json.load(open(os.path.join(s, "sheets", "manifest.json"))); pm = os.path.join(PUB, dst, d, "manifest.json"); old = json.load(open(pm))
        for c in NEW:
            if c not in new["animations"]: sys.exit(f"missing {c} in {s}")
            a = dict(new["animations"][c]); old["animations"][c] = a; shutil.copyfile(os.path.join(s, a["sheet"]), os.path.join(PUB, dst, d, a["sheet"]))
        json.dump(old, open(pm, "w", encoding="utf8"), indent=1); print(dst, d, "ok")

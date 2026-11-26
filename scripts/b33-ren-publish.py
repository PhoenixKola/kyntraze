"""B33: publishes Ren's Ashen Eclipse sprite sheets (built by art/characters/ren/scripts/build_f2.sh) to public/art/ren-f2/<dir>/ (manifest.json + every clip sheet). Usage: python scripts/b33-ren-publish.py"""
import json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, "art", "characters", "ren", "f2"); PUB = os.path.join(ROOT, "public", "art", "ren-f2")
for d in ("south", "north", "east", "west"):
    s = os.path.join(SRC, d, "sheets"); m = os.path.join(s, "manifest.json")
    if not os.path.exists(m): sys.exit(f"missing {m}: run build_f2.sh {d} first")
    man = json.load(open(m)); out = os.path.join(PUB, d); os.makedirs(os.path.join(out, "sheets"), exist_ok=True)
    for name, a in man["animations"].items():
        f = os.path.basename(a["sheet"]); shutil.copyfile(os.path.join(s, f), os.path.join(out, "sheets", f))
    json.dump(man, open(os.path.join(out, "manifest.json"), "w", encoding="utf8"), indent=1); print("ren-f2", d, len(man["animations"]), "clips")

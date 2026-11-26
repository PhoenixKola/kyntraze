"""B34: publishes Sora's Eventide Seraph sprite sheets (built by art/characters/sora/tools/build_f2.py) to public/art/sora-f2/<dir>/ (manifest.json + every clip sheet). Usage: python scripts/b34-sora-publish.py"""
import json, os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SORA = os.path.join(ROOT, "art", "characters", "sora"); PUB = os.path.join(ROOT, "public", "art", "sora-f2")
SRC = {"south": os.path.join(SORA, "south-f2", "sheets"), "north": os.path.join(SORA, "dirs-f2", "north", "sheets"), "east": os.path.join(SORA, "dirs-f2", "east", "sheets"), "west": os.path.join(SORA, "dirs-f2", "west", "sheets")}
for d, s in SRC.items():
    m = os.path.join(s, "manifest.json")
    if not os.path.exists(m): sys.exit(f"missing {m}: run build_f2.py {d} first")
    man = json.load(open(m)); out = os.path.join(PUB, d); os.makedirs(os.path.join(out, "sheets"), exist_ok=True)
    for name, a in man["animations"].items():
        f = os.path.basename(a["sheet"]); shutil.copyfile(os.path.join(s, f), os.path.join(out, "sheets", f))
    json.dump(man, open(os.path.join(out, "manifest.json"), "w", encoding="utf8"), indent=1); print("sora-f2", d, len(man["animations"]), "clips")

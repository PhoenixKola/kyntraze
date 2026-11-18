"""Publishes Vex's bespoke rig sheets (art/characters/vex/<dir>/sheets, f1/<dir>/sheets) to public/art/vex and public/art/vex-f1, replacing the earlier palette-remapped Ren stand-in. Only manifest.json and vex_* sheets are copied."""
import os, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, "art", "characters", "vex"); PUB = os.path.join(ROOT, "public", "art")
for form, srcbase, dst in (("base", SRC, "vex"), ("f1", os.path.join(SRC, "f1"), "vex-f1")):
    for d in ("south", "north", "east", "west"):
        s = os.path.join(srcbase, d, "sheets"); t = os.path.join(PUB, dst, d)
        if os.path.exists(t): shutil.rmtree(t)
        os.makedirs(os.path.join(t, "sheets"))
        shutil.copyfile(os.path.join(s, "manifest.json"), os.path.join(t, "manifest.json"))
        for f in os.listdir(s):
            if f.startswith("vex_") and f.endswith(".png"): shutil.copyfile(os.path.join(s, f), os.path.join(t, "sheets", f))
        print(form, d, len(os.listdir(os.path.join(t, "sheets"))), "sheets")

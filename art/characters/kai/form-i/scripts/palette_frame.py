"""Render the Form I Idle frame 0 of one direction in one palette look (numpy renderer, same FK/part code as the export): python palette_frame.py <dir> <look> <out.png>"""
import os, shutil, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); BASE = os.path.join(os.path.dirname(FORM), "base")
d, look, out = sys.argv[1:4]
if os.environ.get("_PF_CHILD") != "1":     # prepare recoloured parts in a temp folder, then re-run in a clean process with the right rig environment
    sys.path.insert(0, HERE); import json, numpy as np
    from PIL import Image
    import prepare_parts as pp
    tmp = tempfile.mkdtemp(); src = os.path.join(FORM, d, "parts")
    for f in os.listdir(src): shutil.copyfile(os.path.join(src, f), os.path.join(tmp, f))
    for n in ("head_f1", "hair_f1"): Image.fromarray(pp.recolor(np.array(Image.open(os.path.join(FORM, "parts-neutral", d, n + ".png")).convert("RGBA")), pp.PAL["looks"][look])).save(os.path.join(tmp, n + ".png"))
    env = dict(os.environ, _PF_CHILD="1", _PF_PARTS=tmp, KAI_FORM="f1", KAI_ROOT=FORM, KAI_DIR=d, KAI_ROOT_SOUTH=os.path.join(FORM, "south"))
    sys.exit(subprocess.run([sys.executable, __file__, d, look, out], env=env).returncode)
import numpy as np
from PIL import Image
if d == "south":
    sys.path.insert(0, os.path.join(BASE, "production-south-candidate", "rig")); import anim as a, rig as r
else:
    sys.path.insert(0, os.path.join(BASE, "production-other-directions-candidate", "scripts")); import danim as a, drig as r
clip = next(f() for f in a.CLIPS if f()["name"] == "Idle"); ch, order, errs, slots = a.solve_clip(clip)[0]
img = r.render(ch, r.load_images(folder=os.environ["_PF_PARTS"]), 1, slots, order); Image.fromarray(img).save(out)

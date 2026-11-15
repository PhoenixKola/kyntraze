"""Fast numpy-renderer preview (no Blender) of Form III clips: python preview_f3.py <dir> <out.png> Clip[:i,j,k] [Clip ...]   (the renderer is proven pixel-equal to Blender by post.py)"""
import os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); KAI = os.path.dirname(FORM); BASE = os.path.join(KAI, "base")
d, out = sys.argv[1], sys.argv[2]; specs = sys.argv[3:]
env = dict(os.environ, KAI_FORM="f1", KAI_F3="1", KAI_F3_SCRIPTS=HERE, KAI_PAD_TOP="24", KAI_HEAD_BEHIND="1" if False else "")
if d == "south":
    env.update(KAI_ROOT_SOUTH=os.path.join(FORM, "south"), KAI_PAD_LEFT="16"); sys.path.insert(0, os.path.join(BASE, "production-south-candidate", "rig"))
else:
    env.update(KAI_ROOT=FORM, KAI_DIR=d); sc = os.path.join(BASE, "production-other-directions-candidate", "scripts")
    subprocess.run([sys.executable, os.path.join(sc, "make_config.py"), d], env=env, check=True, capture_output=True); sys.path.insert(0, sc)
os.environ.update(env)
import numpy as np
from PIL import Image
if d == "south": import rig as r, anim as a
else: import drig as r, danim as a
i1 = r.load_images(); i8 = r.load_images(True)
clips = {}
for f in a.CLIPS:
    c = f(); clips[c["name"]] = c
tiles = []
for s in specs:
    nm, _, idx = s.partition(":"); c = clips[nm]; n = len(c["frames"]); ids = [int(v) for v in idx.split(",")] if idx else list(range(n))
    solved = a.solve_clip(c)
    for i in ids:
        ch, order, errs, slots = solved[i]; f = r.render_final(ch, i1, i8, slots, order); tiles.append((nm, i, f)); ys = np.nonzero(f[..., 3] > 0)[0]; print(nm, i, "boot clearance above ground:", int(r.ROOT[1]) - int(ys.max()) - 1)
W, H = r.CANVAS; z = int(os.environ.get("PV_Z", "2")); cols = min(10, len(tiles)); rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGBA", (cols * W * z, rows * H * z), (60, 90, 78, 255))
for k, (nm, i, f) in enumerate(tiles):
    im = Image.fromarray(f).resize((W * z, H * z), Image.NEAREST); sheet.alpha_composite(im, ((k % cols) * W * z, (k // cols) * H * z))
    gy = int(r.ROOT[1]) * z; x0 = (k % cols) * W * z; y0 = (k // cols) * H * z
    for x in range(0, W * z, 4): sheet.putpixel((x0 + x, min(y0 + gy, sheet.height - 1)), (255, 60, 60, 255))
sheet.save(out); print("tiles", len(tiles), "canvas", (W, H), "ground y", r.ROOT[1])

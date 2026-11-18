"""Quick numpy preview of B03G clips (no Blender): python qprev.py <dir> <Clip> <out.png> [zoom]"""
import os, sys
os.environ["KAI_DIR"] = sys.argv[1]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import danim as a, drig as r
clip = next(f() for f in a.CLIPS if f()["name"] == sys.argv[2]); z = int(sys.argv[4]) if len(sys.argv) > 4 else 1
i1 = r.load_images(); frames = []
for ch, order, errs, slots in a.solve_clip(clip):
    f = r.render(ch, i1, 1, slots, order); im = Image.new("RGBA", r.CANVAS, (60, 60, 72, 255)); im.alpha_composite(Image.fromarray(f)); frames.append(im)
cols = min(8, len(frames)); rows = (len(frames) + cols - 1) // cols; W, H = r.CANVAS
out = Image.new("RGBA", (cols * W, rows * H))
for i, f in enumerate(frames): out.paste(f, ((i % cols) * W, (i // cols) * H))
if z > 1: out = out.resize((out.width * z, out.height * z), Image.NEAREST)
out.save(sys.argv[3]); print(out.size)

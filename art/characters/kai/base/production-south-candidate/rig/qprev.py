"""Quick numpy preview of B03G SOUTH clips: python qprev.py <Clip> <out.png>"""
import sys
import numpy as np
from PIL import Image
import anim as a, rig as r
clip = next(f() for f in a.CLIPS if f()["name"] == sys.argv[1]); i1 = r.load_images(); fr = []
for ch, order, errs, slots in a.solve_clip(clip):
    f = r.render(ch, i1, 1, slots, order); im = Image.new("RGBA", r.CANVAS, (60, 60, 72, 255)); im.alpha_composite(Image.fromarray(f)); fr.append(im)
W, H = r.CANVAS; cols = 8; rows = (len(fr) + 7) // 8; out = Image.new("RGBA", (cols * W, rows * H))
for i, f in enumerate(fr): out.paste(f, ((i % cols) * W, (i // cols) * H))
out.save(sys.argv[2])

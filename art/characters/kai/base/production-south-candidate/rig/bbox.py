import sys
import numpy as np, anim as a, rig as r
i1 = r.load_images()
for fn in a.CLIPS:
    c = fn()
    if c["name"] not in sys.argv[1:]: continue
    for i, (ch, order, errs, slots) in enumerate(a.solve_clip(c)):
        al = r.render(ch, i1, 1, slots, order)[..., 3] > 0; ys, xs = np.nonzero(al)
        print(c["name"], i, "x", xs.min(), xs.max(), "y", ys.min(), ys.max(), "!" if xs.min() <= 1 or xs.max() >= r.CANVAS[0] - 2 or ys.min() <= 1 or ys.max() >= r.CANVAS[1] - 2 else "")

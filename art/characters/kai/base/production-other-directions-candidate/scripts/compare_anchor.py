"""python compare_anchor.py <dir> <out.png> [pose]   anchor (native-scale) | our stance render | overlay, with a 10 px grid for reading joint positions"""
import importlib.util, os, sys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); ROOT = os.path.dirname(HERE); KAI = os.path.abspath(os.path.join(HERE, "..", ".."))
os.environ["KAI_DIR"] = sys.argv[1]
import danim as a, drig as r
spec = importlib.util.spec_from_file_location("sx", os.path.join(KAI, "production-south-candidate", "tools", "extract.py")); ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)
rgb = np.array(Image.open(os.path.join(ROOT, sys.argv[1], "source", "anchor.png")).convert("RGB")); b = ex.components(~ex.background(rgb))[0]
scale = (b[3] - b[1]) / 160.0; pal = ex.ref_palette()
nat = ex.trim(ex.to_native(rgb[b[1]:b[3], b[0]:b[2]].copy(), scale, pal), 0)
i1 = r.load_images(); i8 = r.load_images(True); ch, order, errs = a.solve(a.stance()); mine = r.render_final(ch, i1, i8, a.slots_of(a.stance()), order)
ys, xs = np.nonzero(mine[..., 3]); mine_c = Image.fromarray(mine[ys.min():ys.max() + 1, xs.min():xs.max() + 1]); ax, ay = int(xs.min()), int(ys.min())
Z = 4; W_ = max(nat.shape[1], mine_c.width) + 8; H_ = max(nat.shape[0], mine_c.height) + 4
def panel(img):
    im = Image.new("RGBA", (W_, H_), (48, 48, 58, 255)); im.alpha_composite(img, (4, H_ - img.height - 2)); return im
pa = panel(Image.fromarray(nat)); pm = panel(mine_c)
ov = pa.copy(); ov.alpha_composite(Image.blend(Image.new("RGBA", pm.size, (48, 48, 58, 255)), pm, 0.6))
out = Image.new("RGBA", (W_ * 3 * Z + 20, H_ * Z), (20, 20, 24, 255))
for n, p in enumerate((pa, pm, ov)):
    big = p.resize((W_ * Z, H_ * Z), Image.NEAREST); d = ImageDraw.Draw(big)
    for g in range(0, H_, 10): d.line([0, g * Z, W_ * Z, g * Z], fill=(255, 0, 0, 90) if g % 50 == 0 else (255, 120, 120, 50)); d.text((2, g * Z + 1), str(g), fill=(255, 255, 0))
    for g in range(0, W_, 10): d.line([g * Z, 0, g * Z, H_ * Z], fill=(0, 200, 255, 60)); d.text((g * Z + 1, 2), str(g), fill=(0, 255, 255))
    out.alpha_composite(big, (n * (W_ * Z + 10), 0))
out.save(sys.argv[2]); print("anchor native", nat.shape[1], "x", nat.shape[0], "| ours", mine_c.width, "x", mine_c.height, "| ours offset in canvas", ax, ay)

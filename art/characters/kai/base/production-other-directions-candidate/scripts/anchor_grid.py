"""python anchor_grid.py <dir> <out_prefix>  -> two zoomed halves of the anchor at native scale with a 5 px labelled grid (for reading joint coordinates)."""
import importlib.util, os, sys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); KAI = os.path.abspath(os.path.join(HERE, "..", ".."))
spec = importlib.util.spec_from_file_location("sx", os.path.join(KAI, "production-south-candidate", "tools", "extract.py")); ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)
d = sys.argv[1]; rgb = np.array(Image.open(os.path.join(ROOT, d, "source", "anchor.png")).convert("RGB")); b = ex.components(~ex.background(rgb))[0]
nat = ex.trim(ex.to_native(rgb[b[1]:b[3], b[0]:b[2]].copy(), (b[3] - b[1]) / 160.0, ex.ref_palette()), 0)
Image.fromarray(nat).save(sys.argv[2] + "-native.png")
Z = 9
for n, (y0, y1) in enumerate(((0, 85), (75, 160))):
    crop = Image.new("RGBA", (nat.shape[1], y1 - y0), (48, 48, 58, 255)); crop.alpha_composite(Image.fromarray(nat[y0:y1]))
    big = crop.resize((crop.width * Z, crop.height * Z), Image.NEAREST); dr = ImageDraw.Draw(big)
    for g in range(0, crop.width, 5):
        dr.line([g * Z, 0, g * Z, big.height], fill=(0, 200, 255, 110 if g % 10 == 0 else 50));
        if g % 10 == 0: dr.text((g * Z + 2, 2), str(g), fill=(0, 255, 255))
    for g in range(0, crop.height, 5):
        if (g + y0) % 5 == 0:
            dr.line([0, g * Z, big.width, g * Z], fill=(255, 120, 120, 110 if (g + y0) % 10 == 0 else 50))
            if (g + y0) % 10 == 0: dr.text((2, g * Z + 2), str(g + y0), fill=(255, 255, 0))
    big.save(f"{sys.argv[2]}-{n}.png")
print(nat.shape)

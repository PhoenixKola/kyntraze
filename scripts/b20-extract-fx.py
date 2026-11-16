"""B20: cut an ImageGen VFX sheet (pure black background) into additive PNG sprites.
Usage: python scripts/b20-extract-fx.py <sheet.png> <outdir> <prefix> <rows> name1,name2,...
rows = comma list of how many items sit in each visual row (reading order). Alpha = brightest channel, so black is transparent and ADD/NORMAL blending both work."""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
sheet, out, prefix, rows, names = sys.argv[1], sys.argv[2], sys.argv[3], [int(x) for x in sys.argv[4].split(',')], sys.argv[5].split(',')
im = Image.open(sheet).convert('RGB'); a = np.asarray(im).astype(np.float32); lum = a.max(axis=2)
mask = ndi.binary_dilation(lum > 24, iterations=int(os.environ.get("DIL","5")))
lab, n = ndi.label(mask); objs = ndi.find_objects(lab)
boxes = [(s[1].start, s[0].start, s[1].stop, s[0].stop) for s in objs]
if os.environ.get("GRID"):   # "cols,rows": every blob goes to the grid cell holding its centre; the cell's sprite is the union box
    gc, gr = [int(x) for x in os.environ["GRID"].split(",")]; H, W = lum.shape; cells = {}
    for b in boxes:
        k = (min(gr - 1, int((b[1] + b[3]) / 2 / (H / gr))), min(gc - 1, int((b[0] + b[2]) / 2 / (W / gc)))); u = cells.get(k, b)
        cells[k] = (min(u[0], b[0]), min(u[1], b[1]), max(u[2], b[2]), max(u[3], b[3]))
    ordered = [cells[k] for k in sorted(cells)]
else:
    boxes = [b for b in boxes if (b[2] - b[0]) * (b[3] - b[1]) > 900]; boxes.sort(key=lambda b: (b[1] + b[3]) / 2); ordered, i = [], 0
    for cnt in rows:
        row = sorted(boxes[i:i + cnt], key=lambda b: b[0]); ordered += row; i += cnt
assert len(ordered) == len(names), f"found {len(ordered)} items, expected {len(names)}"
os.makedirs(out, exist_ok=True)
for nm, (x0, y0, x1, y1) in zip(names, ordered):
    c = a[y0:y1, x0:x1]; al = np.clip(c.max(axis=2) * 1.25, 0, 255)
    rgba = np.dstack([c, al]).astype(np.uint8); Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'{prefix}{nm}.png'))
    print(nm, x1 - x0, y1 - y0)

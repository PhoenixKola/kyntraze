"""Cut the B14 ImageGen sheets (art/fx-b14/source/*.png, magenta background) into runtime sprites in public/art/fx/b14/ (+ manifest.json).
Pieces are found by dilated connected components, ordered row-major, un-mixed from the magenta key and box-resized to the target widths used in the prompts."""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); OUT = os.path.join(ROOT, "public", "art", "fx", "b14"); os.makedirs(OUT, exist_ok=True)
SHEETS = {
  "ground": [("sigil_f2", 150), ("ring_f1", 110), ("ring_f3", 110)],
  "strikes_a": [("arc_a", 56), ("arc_b", 44), ("pop", 40), ("lash_a", 90), ("lash_b", 76), ("ember_burst", 52), ("comet_streak", 110), ("shock_ring", 100), ("comet_flash", 60)],
  "strikes_b": [("jab", 120), ("refract", 90), ("glint", 36), ("slash", 140), ("shards", 70), ("target", 64), ("xslash", 110), ("bloom", 120), ("shatter", 110)],
}
NOSAT = {'target', 'shards'}
M = np.array([255, 0, 255], float)
manifest = {}
for sheet, pieces in SHEETS.items():
    im = Image.open(os.path.join(HERE, "source", sheet + ".png")).convert("RGB"); a = np.asarray(im).astype(float)
    mag = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    alpha = 1 - np.clip((mag - 70) / (200 - 70), 0, 1)
    solid = alpha > 0.5
    H, Wd = solid.shape; cols = 3; rws = 3 if len(pieces) == 9 else 1
    centers = [((c + .5) * Wd / cols, (r + .5) * H / rws) for r in range(rws) for c in range(cols)]
    lab, n = ndi.label(ndi.binary_dilation(solid, iterations=3)); objs = ndi.find_objects(lab); groups = [[] for _ in centers]
    info = [(i, o, solid[o][lab[o] == i + 1].sum()) for i, o in enumerate(objs)]; info = [x for x in info if x[2] >= 30]
    big = [x for x in info if x[2] >= 1200]; small = [x for x in info if x[2] < 1200]
    def ctr(o): return ((o[1].start + o[1].stop) / 2, (o[0].start + o[0].stop) / 2)
    def gap(o1, o2): dx = max(o1[1].start - o2[1].stop, o2[1].start - o1[1].stop, 0); dy = max(o1[0].start - o2[0].stop, o2[0].start - o1[0].stop, 0); return dx * dx + dy * dy
    owners = []
    for _, o, _ in big:
        cx, cy = ctr(o); k = min(range(len(centers)), key=lambda k: (centers[k][0] - cx) ** 2 + (centers[k][1] - cy) ** 2); groups[k].append(o); owners.append((k, o))
    for _, o, _ in small:
        k, _o = min(owners, key=lambda ko: gap(ko[1], o))
        if pieces[k][0] in NOSAT: k = min((q for q in range(len(groups)) if pieces[q][0] not in NOSAT and groups[q]), key=lambda q: min(gap(g, o) for g in groups[q]))
        groups[k].append(o)
    boxes = [(slice(min(o[0].start for o in g), max(o[0].stop for o in g)), slice(min(o[1].start for o in g), max(o[1].stop for o in g))) for g in groups]
    for k, (nm, _) in enumerate(pieces):
        if nm == 'target': boxes[k] = (slice(300, 540), slice(1270, 1520))
    order = list(range(len(boxes)))
    for (name, tw), bi in zip(pieces, order):
        b = boxes[bi]; sl = (b[0], b[1])
        c = a[sl]; al = alpha[sl]
        f = np.where(al[..., None] > 0.02, (c - (1 - al[..., None]) * M) / np.maximum(al[..., None], 0.02), 0).clip(0, 255)
        rgba = np.dstack([f, al * 255]).astype(np.uint8); img = Image.fromarray(rgba, "RGBA")
        ys, xs = np.where(rgba[..., 3] > 12); img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        sc = tw / img.width; img = img.resize((max(2, round(img.width * sc)), max(2, round(img.height * sc))), Image.BOX)
        img.save(os.path.join(OUT, name + ".png"), optimize=True); manifest[name] = {"w": img.width, "h": img.height}
        print(sheet, name, img.size)
json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)

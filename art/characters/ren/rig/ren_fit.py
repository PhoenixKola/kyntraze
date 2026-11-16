"""Ren SOUTH: assemble parts/ (Ren pieces + palette-mapped Kai linings/neck) and write parts/fit.json = pivots/child anchors re-derived for Ren's part sizes
from Kai's measured ones (same rule on every part: keep the distance to the nearest image edge when the anchor sits near an edge, else keep the offset from the centre).
python ren_fit.py   (plain Python, Pillow+numpy; Blender's Python reads the resulting fit.json)"""
import importlib.util, json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); REN = os.path.dirname(HERE); ROOT = os.path.dirname(os.path.dirname(REN))
KAI = os.path.join(ROOT, "characters", "kai", "base", "production-south-candidate")
os.environ.pop("KAI_ROOT_SOUTH", None); os.environ.pop("KAI_FORM", None)
spec = importlib.util.spec_from_file_location("kai_rig", os.path.join(KAI, "rig", "rig.py")); kr = importlib.util.module_from_spec(spec); spec.loader.exec_module(kr)
OUT = os.path.join(REN, "south", "parts"); RAW = os.path.join(REN, "south", "parts-raw"); os.makedirs(OUT, exist_ok=True)
pal = np.array(json.load(open(os.path.join(REN, "palette.json"))), int)

def remap(a):
    a = a.copy(); m = a[..., 3] > 0; px = a[m][:, :3].astype(int)
    d = ((px[:, None, :] - pal[None]) ** 2 * np.array([3, 4, 2])).sum(-1); a[m, :3] = pal[d.argmin(-1)]; return a
for n in ("lining_c", "lining_f", "lining_n", "lining_w", "neck"):
    Image.fromarray(remap(np.array(Image.open(os.path.join(KAI, "parts", n + ".png")).convert("RGBA")))).save(os.path.join(OUT, n + ".png"))
for f in os.listdir(RAW):
    if f.endswith(".png"): Image.open(os.path.join(RAW, f)).save(os.path.join(OUT, f))

def fit_axis(v, k, r):
    """anchor coordinate v in a Kai image of size k -> the same anchor in a Ren image of size r"""
    near = min(v, k - v)
    if near < 0.3 * k: return v if v <= k - v else r - (k - v)
    return v - k / 2 + r / 2
fit = {}
for p in kr.PARTS:
    f = os.path.join(OUT, p["img"]); kk = Image.open(os.path.join(KAI, "parts", p["img"])).size; rr = Image.open(f).size
    if kk == rr: continue
    e = {"pivot": [fit_axis(p["pivot"][0], kk[0], rr[0]), fit_axis(p["pivot"][1], kk[1], rr[1])]}
    if "child" in p: e["child"] = [fit_axis(p["child"][0], kk[0], rr[0]), fit_axis(p["child"][1], kk[1], rr[1])]
    fit[p["id"]] = e
json.dump(fit, open(os.path.join(OUT, "fit.json"), "w"), indent=1); print(len(fit), "parts refit"); print(json.dumps({k: v for k, v in fit.items() if k in ("torso", "head", "forearm_n", "boot_n")}))

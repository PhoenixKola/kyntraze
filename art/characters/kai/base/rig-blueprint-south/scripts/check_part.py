"""Check painted Kai SOUTH parts against rig-spec.json + templates.
  python scripts/check_part.py <part.png | folder>     (file names must be <part_id>.png)
  python scripts/check_part.py --self-test
Exit 0 = every checked part PASS."""
import json, os, sys
import numpy as np
from PIL import Image

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = json.load(open(os.path.join(KIT, "rig-spec.json")))
PARTS = {p["id"]: p for p in spec["parts"]}
MAX_COLORS = spec["art_constraints"]["max_unique_colors_per_part"]

def dilate(m):
    p = np.pad(m, 1); return m | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
def erode(m):
    p = np.pad(m, 1); return m & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]

def check(path, pid=None):
    pid = pid or os.path.splitext(os.path.basename(path))[0]
    r = {"part": pid, "file": path, "errors": [], "warnings": []}
    if pid not in PARTS: r["errors"].append(f"unknown part id '{pid}' (file must be named <part_id>.png)"); return r
    P = PARTS[pid]
    tpl = np.array(Image.open(os.path.join(KIT, P["file"])).convert("RGBA"))
    im = Image.open(path)
    if im.mode != "RGBA": r["warnings"].append(f"mode {im.mode}, expected RGBA")
    a = np.array(im.convert("RGBA"))
    if a.shape[:2] != tpl.shape[:2]:
        r["errors"].append(f"size {a.shape[1]}x{a.shape[0]} != spec {P['size_px'][0]}x{P['size_px'][1]}"); return r
    al = a[..., 3]
    semi = int(((al > 0) & (al < 255)).sum())
    if semi: r["errors"].append(f"{semi} semi-transparent pixels (alpha must be 0 or 255)")
    op = al > 0; t_op = tpl[..., 3] > 0
    hexs = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in P["template_colors"].values()}
    hidden = np.zeros(t_op.shape, bool)
    for zone in ("hidden_a", "hidden_b"):
        h = P["template_colors"][zone]; c = np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])
        hidden |= t_op & (tpl[..., :3] == c).all(-1)
    miss_hidden = int((hidden & ~op).sum())
    if miss_hidden: r["errors"].append(f"{miss_hidden} hidden-at-joint pixels left transparent (must be painted 100%)")
    core = erode(t_op)
    miss_core = int((core & ~op).sum())
    if miss_core: r["errors"].append(f"{miss_core} interior template pixels transparent (silhouette may only move 1px at the edge)")
    outside = int((op & ~dilate(t_op)).sum())
    if outside: r["errors"].append(f"{outside} opaque pixels more than 1px outside the template silhouette")
    edge_dev = int((op ^ t_op).sum())
    iou = float((op & t_op).sum() / max(1, (op | t_op).sum()))
    r["iou_vs_template"] = round(iou, 4); r["edge_pixels_changed"] = edge_dev
    if iou < 0.93: r["errors"].append(f"IoU {iou:.3f} < 0.93")
    # pivot / anchor pixels must be opaque where the template is opaque (torso shoulder anchors sit in empty sockets by design)
    for nm, (x, y) in [("pivot", P["pivot_px"])] + list(P["anchors_px"].items()):
        xi, yi = int(x), int(y)
        if not t_op[max(0, yi - 1):yi + 1, max(0, xi - 1):xi + 1].all(): continue
        win = op[max(0, yi - 1):yi + 1, max(0, xi - 1):xi + 1]
        if not win.all(): r["errors"].append(f"{nm} at {x},{y} not surrounded by opaque pixels")
    uc = len({tuple(c) for c in a[op][:, :3]})
    r["unique_colors"] = uc
    if uc > MAX_COLORS: r["errors"].append(f"{uc} unique colours > {MAX_COLORS}")
    still_tpl = float(np.isin(a[op][:, :3].view([("", a.dtype)] * 3).ravel(),
                              np.array(list(hexs), dtype=a.dtype).view([("", a.dtype)] * 3).ravel()).mean()) if op.any() else 1.0
    if still_tpl > 0.2: r["errors"].append(f"{still_tpl:.0%} of pixels are still template guide colours (not painted)")
    r["pass"] = not r["errors"]
    return r

def self_test():
    import tempfile
    tmp = tempfile.mkdtemp(); ok = True
    pid = "forearm_n"; tpl = np.array(Image.open(os.path.join(KIT, PARTS[pid]["file"])).convert("RGBA"))
    # 1 raw template must FAIL (unpainted)
    Image.fromarray(tpl).save(os.path.join(tmp, f"{pid}.png")); r1 = check(os.path.join(tmp, f"{pid}.png"))
    # 2 recoloured template (simulated paint) must PASS
    p2 = tpl.copy(); m = p2[..., 3] > 0; p2[m, :3] = (p2[m, :3] // 2 + 17) ^ 5
    Image.fromarray(p2).save(os.path.join(tmp, f"{pid}.png")); r2 = check(os.path.join(tmp, f"{pid}.png"))
    # 3 painted but hidden cap erased must FAIL
    p3 = p2.copy(); p3[:6] = 0
    Image.fromarray(p3).save(os.path.join(tmp, f"{pid}.png")); r3 = check(os.path.join(tmp, f"{pid}.png"))
    ok = (not r1["pass"]) and r2["pass"] and (not r3["pass"])
    print(json.dumps({"raw_template_fails": not r1["pass"], "painted_passes": r2["pass"], "erased_cap_fails": not r3["pass"],
                      "details": [r1["errors"], r2["errors"], r3["errors"]]}, indent=1))
    return ok

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    if sys.argv[1] == "--self-test": sys.exit(0 if self_test() else 1)
    tgt = sys.argv[1]
    files = [os.path.join(tgt, f) for f in sorted(os.listdir(tgt)) if f.endswith(".png")] if os.path.isdir(tgt) else [tgt]
    res = [check(f) for f in files]
    missing = sorted(set(PARTS) - {r["part"] for r in res}) if os.path.isdir(tgt) else []
    for r in res: print(("PASS " if r["pass"] else "FAIL ") + r["part"], "; ".join(r["errors"]) or f"IoU {r.get('iou_vs_template')} colours {r.get('unique_colors')}")
    if missing: print("MISSING parts:", ", ".join(missing))
    sys.exit(0 if all(r["pass"] for r in res) and not missing else 1)

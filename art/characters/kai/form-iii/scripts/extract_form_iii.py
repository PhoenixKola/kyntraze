"""Cut the Form III ImageGen sheets into native-scale parts (same method as form-ii/scripts/extract_form_ii.py: every source pixel mapped to the approved
reference palette, one cell of `scale` source px per native px; no pixels painted).
  python extract_form_iii.py heads <direction> [scale]    -> parts-neutral/<d>/head_f1.png + hair_f1.png (teal-black, recoloured by prepare_parts.py)
  python extract_form_iii.py torn  <direction> [scale]    -> parts-neutral/<d>/torso_f3.png + upper_arm_n_f3.png + upper_arm_f_f3.png, each aligned INTO the canvas of the
                                                              intact base part (same size, best mask overlap) so the rig anchors of the intact part are valid for the torn one."""
import importlib.util, json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); KAI = os.path.dirname(FORM)
spec = importlib.util.spec_from_file_location("south_extract", os.path.join(KAI, "base", "production-south-candidate", "tools", "extract.py"))
ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)
BASE = os.path.join(KAI, "base")
BASE_PARTS = {"south": os.path.join(BASE, "production-south-candidate", "parts")}
for _d in ("north", "east", "west"): BASE_PARTS[_d] = os.path.join(BASE, "production-other-directions-candidate", _d, "parts")

def no_gold(pal): return np.array([c for c in pal if not (c[0] > 200 and 130 < c[1] < 200 and c[2] < 110)], np.int32)

def block_size(rgb):
    """Most common horizontal run length (source px) of a constant colour inside the artwork = the art pixel block."""
    bg = ex.background(rgb); counts = {}
    for y in range(0, rgb.shape[0], 3):
        row = rgb[y].astype(int); m = ~bg[y]; x = 0
        while x < len(row):
            if not m[x]: x += 1; continue
            x2 = x
            while x2 + 1 < len(row) and m[x2 + 1] and np.abs(row[x2 + 1] - row[x]).sum() < 24: x2 += 1
            n = x2 - x + 1
            if 6 <= n <= 40: counts[n] = counts.get(n, 0) + 1
            x = x2 + 1
    # block size = the run length that divides the most frequent runs
    best = max(range(8, 20), key=lambda b: sum(c for n, c in counts.items() if abs(n / b - round(n / b)) < 0.12 * (1 / max(1, round(n / b))) + 0.03 and round(n / b) >= 1) / (1 + 0.002 * b))
    return best

def align_into(part_native, ref):
    """Place the RGBA array `part_native` in a canvas the size of `ref` (RGBA) at the integer offset that maximises alpha overlap."""
    H, W = ref.shape[:2]; h, w = part_native.shape[:2]; ra = ref[..., 3] > 0; pa = part_native[..., 3] > 0; best = (-1, 0, 0)
    for oy in range(-14, H - h + 15):
        for ox in range(-14, W - w + 15):
            y0, x0 = max(0, oy), max(0, ox); y1, x1 = min(H, oy + h), min(W, ox + w)
            if y1 <= y0 or x1 <= x0: continue
            a = ra[y0:y1, x0:x1]; b = pa[y0 - oy:y1 - oy, x0 - ox:x1 - ox]; inter = int((a & b).sum()); union = int(ra.sum() + pa.sum() - inter)
            s = inter / max(1, union)
            if s > best[0]: best = (s, ox, oy)
    s, ox, oy = best; mx, my = min(0, ox), min(0, oy); Wn, Hn = max(W, ox + w) - mx, max(H, oy + h) - my
    out = np.zeros((Hn, Wn, 4), np.uint8); out[oy - my:oy - my + h, ox - mx:ox - mx + w] = part_native
    return out, (s, ox, oy, -mx, -my)   # pad = how far the intact part's origin moved inside the new canvas (rig pivots shift by it)

if __name__ == "__main__":
    kind, d = sys.argv[1], sys.argv[2]; scale = float(sys.argv[3]) if len(sys.argv) > 3 else None
    rgb = np.array(Image.open(os.path.join(FORM, "source", f"{d}-{kind}.png")).convert("RGB")); sc = scale or float(block_size(rgb)); print("block", sc)
    out = os.path.join(FORM, "parts-neutral", d); os.makedirs(out, exist_ok=True); rec = {}
    if kind == "heads":
        pal = no_gold(ex.ref_palette()); boxes = sorted(ex.components(~ex.background(rgb)), key=lambda b: -b[4]); assert len(boxes) == 2, [b[:4] for b in boxes]
        items = (("head_f1", boxes[0]), ("hair_f1", boxes[1]))
    else:
        pal = np.array(ex.ref_palette(), np.int32); boxes = sorted(ex.components(~ex.background(rgb)), key=lambda b: b[0]); assert len(boxes) == 3, [b[:4] for b in boxes]
        items = (("torso_f3", boxes[0]), ("sleeve_a", boxes[1]), ("sleeve_b", boxes[2]))
    nat = {}
    for name, b in items:
        pad = 8; x0, y0, x1, y1 = max(0, b[0] - pad), max(0, b[1] - pad), min(rgb.shape[1], b[2] + pad), min(rgb.shape[0], b[3] + pad)
        nat[name] = ex.trim(ex.to_native(rgb[y0:y1, x0:x1].copy(), sc, pal)); rec[name] = dict(sheet=f"source/{d}-{kind}.png", box=[int(v) for v in b[:4]], scale=sc, native=[int(nat[name].shape[1]), int(nat[name].shape[0])])
    if kind == "heads":
        for n, a in nat.items(): Image.fromarray(a).save(os.path.join(out, n + ".png"))
    else:
        bp = BASE_PARTS[d]; ref = {n: np.array(Image.open(os.path.join(bp, n + ".png")).convert("RGBA")) for n in ("torso", "upper_arm_n", "upper_arm_f")}
        al, ra = nat["torso_f3"], None
        t_al, t_info = align_into(nat["torso_f3"], ref["torso"]); Image.fromarray(t_al).save(os.path.join(out, "torso_f3.png")); rec["torso_f3"]["align"] = [float(t_info[0])] + [int(v) for v in t_info[1:]]
        # assign the two sleeves to near/far by best overlap with the intact parts
        res = {}
        for sn in ("sleeve_a", "sleeve_b"):
            for tn in ("upper_arm_n", "upper_arm_f"): res[(sn, tn)] = align_into(nat[sn], ref[tn])
        def gold(a): m = (a[..., 3] > 0) & (a[..., 0] > 180) & (a[..., 1] > 100) & (a[..., 1] < 190) & (a[..., 2] < 90); return int(m.sum()) > 12   # the shoulder epaulette sits on exactly one sleeve per view
        gm = lambda sn, tn: 1.0 if gold(nat[sn]) == gold(ref[tn]) else 0.0
        straight = res[("sleeve_a", "upper_arm_n")][1][0] + res[("sleeve_b", "upper_arm_f")][1][0] + gm("sleeve_a", "upper_arm_n") + gm("sleeve_b", "upper_arm_f")
        swapped = res[("sleeve_a", "upper_arm_f")][1][0] + res[("sleeve_b", "upper_arm_n")][1][0] + gm("sleeve_a", "upper_arm_f") + gm("sleeve_b", "upper_arm_n")
        pairs = (("sleeve_a", "upper_arm_n"), ("sleeve_b", "upper_arm_f")) if straight >= swapped else (("sleeve_a", "upper_arm_f"), ("sleeve_b", "upper_arm_n"))
        for sn, tn in pairs:
            a, inf = res[(sn, tn)]; Image.fromarray(a).save(os.path.join(out, tn + "_f3.png")); rec[sn]["assigned"] = tn; rec[sn]["align"] = [float(inf[0])] + [int(v) for v in inf[1:]]
    json.dump(rec, open(os.path.join(out, f"extract-{kind}.json"), "w"), indent=1); print(d, kind, {k: (v["native"], v.get("assigned"), v.get("align")) for k, v in rec.items()})

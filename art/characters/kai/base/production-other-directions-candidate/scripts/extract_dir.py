"""Cut a direction's ImageGen sheets into native-scale parts. python extract_dir.py east [sheet ...]
Each piece is palette-mapped to the approved reference palette (SOUTH tools/extract.py functions, imported read-only) and sampled with one cell
per `scale` source px, where scale = box size / target native size (same method and sizes as the SOUTH candidate)."""
import importlib.util, json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); KAI = os.path.abspath(os.path.join(HERE, "..", ".."))
spec = importlib.util.spec_from_file_location("south_extract", os.path.join(KAI, "production-south-candidate", "tools", "extract.py"))
ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)

# sheet -> ordered (part name, ('h'|'w', native target)). Order = component order (row bands of 300 px, then left to right).
SHEETS = {
 "s1-heads-fists": [("head", ("h", 48)), ("fist_side", ("w", 27)), ("fist_guard", ("h", 28))],
 "s2-torso-arms": [("torso", ("h", 46)), ("upper_arm_n", ("h", 30)), ("upper_arm_f", ("h", 29)), ("forearm_n", ("h", 34)), ("forearm_f", ("h", 31))],
 "s3-hips-thighs": [("hips", ("h", 25)), ("sash_band", ("h", 16)), ("sash_tails", ("h", 31)), ("thigh_n", ("h", 45)), ("thigh_f", ("h", 42))],
  "s5-sash": [("sash_band", ("w", 32)), ("sash_tails", ("h", 22))],
 "s4-shins-boots": [("shin_n", ("h", 30)), ("shin_f", ("h", 30)), ("boot_n", ("h", 28)), ("boot_f", ("h", 28))],
}

# profile (EAST/WEST) targets in native px, measured on the anchors: forearms and fists are NOT foreshortened here, so they are much shorter than SOUTH's
PROFILE = {"head": ("h", 44), "torso": ("h", 38), "upper_arm_n": ("h", 30), "upper_arm_f": ("h", 28), "forearm_n": ("h", 26), "forearm_f": ("h", 24),
           "fist_side": ("w", 20), "fist_guard": ("h", 22), "hips": ("wh", (36, 24)), "sash_band": ("w", 28), "thigh_n": ("h", 54), "thigh_f": ("h", 44),
           "shin_n": ("h", 26), "shin_f": ("h", 24), "boot_n": ("h", 30), "boot_f": ("h", 28), "sash_tails": ("h", 26)}

# parts that legitimately contain the sash/epaulette gold; every other part must map warm tan to SKIN, never to gold
BACK = {"head": ("h", 44), "torso": ("h", 38), "upper_arm_n": ("h", 28), "upper_arm_f": ("h", 28), "forearm_n": ("h", 26), "forearm_f": ("h", 24),
        "fist_side": ("w", 20), "fist_guard": ("h", 22), "hips": ("wh", (44, 24)), "sash_band": ("w", 32), "sash_tails": ("h", 22), "thigh_n": ("h", 50), "thigh_f": ("h", 48),
        "shin_n": ("h", 28), "shin_f": ("h", 28), "boot_n": ("h", 28), "boot_f": ("h", 28)}
WEST_LEGS = {"thigh_n": ("h", 46), "thigh_f": ("h", 54), "shin_n": ("h", 24), "shin_f": ("h", 26)}
GOLD_PARTS = {"sash_band", "sash_tails", "upper_arm_n", "upper_arm_f"}
def no_gold(pal): return np.array([c for c in pal if not (c[0] > 200 and 130 < c[1] < 200 and c[2] < 110)], np.int32)

def order_key(b): return (round(b[1] / 300), b[0])

def run(d, sheets):
    pal = ex.ref_palette(); pdir = os.path.join(ROOT, d, "parts"); os.makedirs(pdir, exist_ok=True)
    ej = os.path.join(pdir, "extract.json"); rec = json.load(open(ej)) if os.path.exists(ej) else {}
    for sh in sheets:
        path = os.path.join(ROOT, d, "source", sh + ".png"); rgb = np.array(Image.open(path).convert("RGB"))
        boxes = sorted(ex.components(~ex.background(rgb)), key=order_key); names = SHEETS[sh]
        if sh == "s1-heads-fists" and len(boxes) == 3:          # layout varies per direction: head = largest piece, then the upper and lower fist
            big = max(boxes, key=lambda b: b[4]); rest = sorted([b for b in boxes if b is not big], key=lambda b: b[1]); boxes = [big] + rest
        if len(boxes) != len(names): print("!!", d, sh, "components", len(boxes), "expected", len(names), [b[:4] for b in boxes]); continue
        for (name, (axis, tgt)), b in zip(names, boxes):
            w, h = b[2] - b[0], b[3] - b[1]
            if d in ("east", "west") and name in PROFILE: axis, tgt = PROFILE[name]
            if d == "west" and name in WEST_LEGS: axis, tgt = WEST_LEGS[name]
            if d == "north" and name in BACK: axis, tgt = BACK[name]
            scale = ((w / float(tgt[0]), h / float(tgt[1])) if axis == "wh" else (h if axis == "h" else w) / float(tgt))
            pad = 8; x0, y0, x1, y1 = max(0, b[0] - pad), max(0, b[1] - pad), min(rgb.shape[1], b[2] + pad), min(rgb.shape[0], b[3] + pad)
            nat = ex.trim(ex.to_native(rgb[y0:y1, x0:x1].copy(), scale, pal if name in GOLD_PARTS else no_gold(pal)))
            Image.fromarray(nat).save(os.path.join(pdir, name + ".png"))
            rec[name] = dict(sheet=sh, box=[int(v) for v in b[:4]], scale=[round(v, 3) for v in scale] if isinstance(scale, tuple) else round(scale, 3), native=[int(nat.shape[1]), int(nat.shape[0])])
    json.dump(rec, open(os.path.join(ROOT, d, "parts", "extract.json"), "w"), indent=1)
    return rec

if __name__ == "__main__":
    d = sys.argv[1]; r = run(d, sys.argv[2:] or [k for k in SHEETS if k != "s5-sash"]); print(d, {k: v["native"] for k, v in r.items()})

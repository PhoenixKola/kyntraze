"""Assemble <dir>/parts for the Form III rig:
  * every base part (byte copies), except torso / upper_arm_n / upper_arm_f which are the intact base art padded into the (larger) canvas of the torn variants,
  * head.png = the Form II head (gold, tall) -> it is the 'before' head of the Transform; head_f1.png + hair_f1.png = Form III silver head and rear hair,
  * torso_t1 / torso_t2 = authored intermediate tear stages (intact + torn composited along a ragged tear front: no painted pixels), torso_f3 = final torn jacket, upper_arm_{n,f}_f3 = torn sleeves,
  * f3_variants.json = the canvas pads (rig pivots of the base parts shift by them), form_geometry.json = head pivot / hair bone geometry (as for Form I/II).
  python prepare_parts.py <direction>"""
import json, os, shutil, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); KAI = os.path.dirname(FORM); BASE = os.path.join(KAI, "base")
BASE_PARTS = {"south": os.path.join(BASE, "production-south-candidate", "parts")}
for d in ("north", "east", "west"): BASE_PARTS[d] = os.path.join(BASE, "production-other-directions-candidate", d, "parts")
PAL = json.load(open(os.path.join(FORM, "palette.json")))

def recolor(a, look):
    ramp = np.array(look["hair"], np.uint8); eye = np.array(look["eye"], np.uint8); out = a.copy(); rgb = a[..., :3].astype(int)
    lum = 0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]; op = a[..., 3] > 0
    skin = (rgb[..., 0] - rgb[..., 2] > 35) & (rgb[..., 0] > rgb[..., 1])
    glint = (lum > 150) & ~skin
    k = np.pad(skin.astype(int), 2); near = sum(k[dy:dy + skin.shape[0], dx:dx + skin.shape[1]] for dy in range(5) for dx in range(5))
    face = op & ~skin & ~glint & (lum < 96) & (near >= 8)
    hair = op & ~skin & ~glint & (lum > 26) & ~face
    stop = np.digitize(lum, [46, 71, 96])
    out[hair, :3] = ramp[stop[hair]]; out[op & glint, :3] = eye
    out[face & (lum >= 46), :3] = ramp[0]
    return out

def pad_into(a, shape, off):
    out = np.zeros((shape[0], shape[1], 4), np.uint8); h, w = a.shape[:2]; out[off[1]:off[1] + h, off[0]:off[0] + w] = a; return out

def tear_stage(intact, torn, thr, seed):
    """Composite: torn pixels where a ragged diagonal front (from the upper shoulder down to the hem) has passed, intact elsewhere."""
    H, W = intact.shape[:2]; rng = np.random.RandomState(seed); blocks = rng.rand((H + 1) // 2 + 1, (W + 1) // 2 + 1)
    yy, xx = np.mgrid[0:H, 0:W]; field = 0.55 * (yy / max(1, H - 1)) + 0.45 * (xx / max(1, W - 1)) + 0.22 * (blocks[yy // 2, xx // 2] - 0.5)
    use = field < thr; out = intact.copy(); out[use] = torn[use]; return out

if __name__ == "__main__":
    d = sys.argv[1]; look = PAL["looks"][PAL["candidate"]]
    dst = os.path.join(FORM, d, "parts"); os.makedirs(dst, exist_ok=True)
    for f in os.listdir(BASE_PARTS[d]):
        if f.endswith(".png"): shutil.copyfile(os.path.join(BASE_PARTS[d], f), os.path.join(dst, f))
    shutil.copyfile(os.path.join(KAI, "form-ii", d, "parts", "head_f1.png"), os.path.join(dst, "head.png"))
    shutil.copyfile(os.path.join(KAI, "form-ii", d, "parts", "hair_f1.png"), os.path.join(dst, "hair_f2.png"))     # the Form II rear hair: still visible until the Transform commit
    for n in ("head_f1", "hair_f1"):
        a = np.array(Image.open(os.path.join(FORM, "parts-neutral", d, n + ".png")).convert("RGBA")); Image.fromarray(recolor(a, look)).save(os.path.join(dst, n + ".png"))
    ex = json.load(open(os.path.join(FORM, "parts-neutral", d, "extract-torn.json"))); pads = {}
    for base_id, rec_id, torn_name in (("torso", "torso_f3", "torso_f3"), ("upper_arm_n", None, "upper_arm_n_f3"), ("upper_arm_f", None, "upper_arm_f_f3")):
        torn = np.array(Image.open(os.path.join(FORM, "parts-neutral", d, torn_name + ".png")).convert("RGBA"))
        rec = ex["torso_f3"] if base_id == "torso" else next(v for k, v in ex.items() if v.get("assigned") == base_id)
        px, py = rec["align"][3], rec["align"][4]; pads[base_id] = [px, py]
        intact = np.array(Image.open(os.path.join(BASE_PARTS[d], base_id + ".png")).convert("RGBA")); pi = pad_into(intact, torn.shape, (px, py))
        Image.fromarray(pi).save(os.path.join(dst, base_id + ".png")); Image.fromarray(torn).save(os.path.join(dst, torn_name + ".png"))
        if base_id == "torso":
            Image.fromarray(tear_stage(pi, torn, 0.34, 3)).save(os.path.join(dst, "torso_t1.png")); Image.fromarray(tear_stage(pi, torn, 0.70, 5)).save(os.path.join(dst, "torso_t2.png"))
    json.dump({"pads": pads}, open(os.path.join(dst, "f3_variants.json"), "w"))
    def mask(f):
        a = np.array(Image.open(os.path.join(dst, f)).convert("RGBA"))[..., 3] > 0; ys, xs = np.nonzero(a); return a, int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
    a, t, B, x0, x1 = mask("head_f1.png"); bot = float(np.nonzero(a[B - 4:B])[1].mean() + 0.5)
    a2, t2, B2, x02, x12 = mask("hair_f1.png"); side_left = d in ("west", "north"); ex_ = x02 + 6.0 if side_left else x12 - 6.0; col = a2[:, int(ex_)]
    a3, t3, B3, x03, x13 = mask("hair_f2.png"); ex3 = x03 + 6.0 if side_left else x13 - 6.0; col3 = a3[:, int(ex3)]
    json.dump({"head_pivot": [bot, B - 7.0], "attach": [x0 + 0.45 * (x1 - x0), t + 0.58 * (B - t)], "hair_pivot": [ex_, float(np.nonzero(col)[0].mean() + 0.5) if col.any() else (t2 + B2) / 2], "hair2_pivot": [ex3, float(np.nonzero(col3)[0].mean() + 0.5) if col3.any() else (t3 + B3) / 2]}, open(os.path.join(dst, "form_geometry.json"), "w"))
    print(d, "parts ->", dst, "pads", pads)

"""Green-key the B22 source art, crop and slice it into runtime PNGs under public/art/b22/. Usage: python scripts/b22-art-process.py"""
import os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, "art", "b22", "source"); DST = os.path.join(ROOT, "public", "art", "b22")
os.makedirs(DST, exist_ok=True)

def key(im):
    a = np.array(im.convert("RGB")).astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (g > 150) & (g - r > 70) & (g - b > 70)
    alpha = np.where(green, 0, 255).astype(np.uint8)
    alpha = ndi.binary_opening(alpha > 0, iterations=1).astype(np.uint8) * 255
    out = np.dstack([a.astype(np.uint8), alpha]); rgba = out.copy()
    # de-spill: pull residual green fringe toward the neighbouring channels
    edge = (alpha > 0) & ndi.binary_dilation(alpha == 0, iterations=2)
    gg = rgba[..., 1].astype(np.int16); lim = np.maximum(rgba[..., 0], rgba[..., 2]).astype(np.int16) + 12
    rgba[..., 1] = np.where(edge & (gg > lim), lim, gg).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")

def crop(im, pad=4):
    bb = im.getchannel("A").getbbox(); return im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), bb[2] + pad, bb[3] + pad)) if bb else im

def fit(im, h):
    w = max(1, round(im.width * h / im.height)); return im.resize((w, h), Image.LANCZOS)

def single(name, out, h):
    im = crop(key(Image.open(os.path.join(SRC, name + ".png")))); fit(im, h).save(os.path.join(DST, out + ".png")); return out

def slice_sheet_black(name, prefix, n):
    """2x2 black-background VFX sheet -> four additive plates (luminance becomes alpha), split on the grid."""
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGB"); W, H = im.size; names = []
    for j in range(4):
        c = im.crop(((j % 2) * W // 2, (j // 2) * H // 2, (j % 2 + 1) * W // 2, (j // 2 + 1) * H // 2)); a = np.array(c).astype(np.int16); alpha = np.clip((a.max(-1) - 14) * 5, 0, 255).astype(np.uint8)
        r = Image.fromarray(np.dstack([np.array(c), alpha]), "RGBA"); bb = r.getchannel("A").getbbox()
        if bb: r = r.crop(bb)
        s = max(r.size); sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(r, ((s - r.width) // 2, (s - r.height) // 2)); sq.resize((256, 256), Image.LANCZOS).save(os.path.join(DST, f"{prefix}{j}.png")); names.append(f"{prefix}{j}")
    return names

def slice_sheet(name, prefix, n, h, rows=None):
    im = key(Image.open(os.path.join(SRC, name + ".png"))); al = np.array(im.getchannel("A")) > 0
    al = ndi.binary_dilation(al, iterations=14); lab, k = ndi.label(al)
    boxes = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        if sl is None: continue
        area = (lab[sl] == i + 1).sum()
        if area > 2500: boxes.append((sl[0].start, sl[0].stop, sl[1].start, sl[1].stop, area))
    boxes = sorted(boxes, key=lambda b: -b[4])[:n]
    if rows:   # sort by row bands then x
        boxes.sort(key=lambda b: ((b[0] + b[1]) // 2 // (im.height // rows), b[2]))
    else: boxes.sort(key=lambda b: b[2])
    names = []
    for j, (y0, y1, x0, x1, _) in enumerate(boxes):
        c = crop(im.crop((x0, y0, x1, y1)), 2); nm = f"{prefix}{j}"; fit(c, h).save(os.path.join(DST, nm + ".png")); names.append(nm)
    return names


BOSSK = {"castellan", "regent", "oathkeeper", "mirror_tyrant", "chronophage", "hollow_choir", "sovereign"}
CYC = {"sky_lancer": 120, "halo_scribe": 120, "citadel_bulwark": 170, "rift_mimic": 110, "phase_harrier": 110, "singularity_husk": 140, "castellan": 280, "regent": 220, "oathkeeper": 210, "mirror_tyrant": 240, "chronophage": 250, "hollow_choir": 220, "sovereign": 420, "choir_0": 110, "choir_1": 110, "choir_2": 110, "sovpart_0": 130, "sovpart_1": 130, "sovpart_2": 130}
def cycles():
    """Animation sheets c_<kind>.png (8 cells: move x4, windup, strike, hurt, death) -> public/art/b22/<kind>_f0..7.png, all frames scaled by ONE factor and bottom-centre aligned on a shared canvas so they do not jitter."""
    out = {}
    for k, h in CYC.items():
        f = os.path.join(SRC, ("pc_" if "_" in k and k.split("_")[0] in ("choir", "sovpart") else "bc_" if k in BOSSK else "c_") + k + ".png")
        if not os.path.exists(f): continue
        im = key(Image.open(f)); al = np.array(im.getchannel("A")) > 0; al = ndi.binary_dilation(al, iterations=10); lab, n = ndi.label(al)
        boxes = []
        for i, sl in enumerate(ndi.find_objects(lab)):
            if sl is not None and (lab[sl] == i + 1).sum() > 2500: boxes.append((sl[0].start, sl[0].stop, sl[1].start, sl[1].stop, (lab[sl] == i + 1).sum()))
        boxes = sorted(boxes, key=lambda b: -b[4])[:8]
        if len(boxes) < 8 or k in BOSSK or k.startswith(("choir_", "sovpart_")): frames = [crop(c, 2) for c in grid_crops(im, 4, 2)]   # cells merged: fall back to the fixed 4x2 grid
        else:
            boxes.sort(key=lambda b: ((b[0] + b[1]) // 2 // (im.height // 2), b[2]))
            frames = [crop(im.crop((x0, y0, x1, y1)), 2) for (y0, y1, x0, x1, _) in boxes]
        sc = h / max(fr.height for fr in frames[:4]); cw = max(round(fr.width * sc) for fr in frames) + 4; ch = max(round(fr.height * sc) for fr in frames) + 4
        names = []
        for i, fr in enumerate(frames):
            r = fr.resize((max(1, round(fr.width * sc)), max(1, round(fr.height * sc))), Image.LANCZOS); cv = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); cv.paste(r, ((cw - r.width) // 2, ch - r.height - 2), r)
            nm = f"{k}_f{i}"; cv.save(os.path.join(DST, nm + ".png")); names.append(nm)
        out[k] = names
    return out

ICONS = {"ic_br_kai": ["seismic_impact", "pressure_wave", "prism_conductor", "burning_wake", "starfall_bloom", "twin_nova"], "ic_br_ren": ["relentless_chain", "crimson_guardbreak", "bloodline_relay", "meteor_collision", "red_comet_rain", "crimson_crater"],
         "ic_br_sora": ["needle_spiral", "stormline_array", "piercing_meridian", "celestial_prism", "starfield_array", "celestial_collapse"], "ic_br_vex": ["reversal_guard", "mirror_counter", "shadow_riposte", "eclipse_shift", "marked_detonation", "severance_judgment"],
         "ic_lg_a": ["solar_rupture", "dragon_overture", "nova_constellation", "crimson_relay", "meteor_crucible", "bloodstar_rupture"], "ic_lg_b": ["blue_needle_storm", "prismatic_meridian", "zero_convergence", "shard_requiem", "oathbreaker_chain", "null_waltz"]}
def grid_crops(im, cols, rows):
    W, H = im.size; out = []
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows)); bb = cell.getchannel("A").getbbox()
            out.append(cell.crop(bb) if bb else cell)
    return out

def named_icons():
    """3x2 green-key icon sheets -> public/art/b22/ic_<id>.png (one bespoke icon per branch / legendary, in the prompt's reading order)."""
    done = {}
    for sheet, ids in ICONS.items():
        f = os.path.join(SRC, sheet + ".png")
        if not os.path.exists(f): continue
        crops = grid_crops(key(Image.open(f)), 3, 2)
        for c, i in zip(crops, ids): fit(crop(c, 2), 112).save(os.path.join(DST, "ic_" + i + ".png")); done[i] = "ic_" + i
    return done

if __name__ == "__main__":
    man = {}
    ex = lambda n: os.path.exists(os.path.join(SRC, n + ".png"))
    H = {"sky_lancer": 120, "halo_scribe": 120, "citadel_bulwark": 170, "rift_mimic": 110, "phase_harrier": 110, "singularity_husk": 140}
    for k, h in H.items():
        if ex("e_" + k): single("e_" + k, k, h)
    B = {"castellan": 280, "regent": 220, "oathkeeper": 210, "mirror_tyrant": 240, "chronophage": 250, "hollow_choir": 220, "sovereign": 420}
    for k, h in B.items():
        if ex("b_" + k): single("b_" + k, k, h)
    if ex("p_choir_voices"): man["choir"] = slice_sheet("p_choir_voices", "choir_", 3, 110)
    if ex("p_sovereign_parts"): man["sovparts"] = slice_sheet("p_sovereign_parts", "sovpart_", 3, 130)
    for k in ["base", "riftbound", "voidheart"]:
        if ex("vexpx2_" + k): single("vexpx2_" + k, "vex_" + k, 420)
    if ex("a_props"): man["props"] = slice_sheet("a_props", "prop_", 4, 160, rows=2)
    for n, p, c, rows in [("i_relics", "relic_", 8, 2), ("i_ultimates", "ult_", 4, 2), ("i_legendaries", "leg_", 12, 3), ("i_branches_a", "brA_", 12, 3), ("i_branches_b", "brB_", 12, 3)]:
        if ex(n): man[p] = slice_sheet(n, p, c, 160 if p.startswith("outfit") else 96, rows=rows)
    for f in sorted(os.listdir(SRC)):
        if f.startswith("o_") and f.endswith(".png"): single(f[:-4], "outfit_" + f[2:-4], 260)
    for n, o in [("a_aetherfall_floor", "floor_aetherfall"), ("a_paradox_floor", "floor_paradox")]:
        if ex(n):
            im = Image.open(os.path.join(SRC, n + ".png")).convert("RGB"); s = min(im.size); im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2)).resize((256, 256), Image.LANCZOS); im.save(os.path.join(DST, o + ".png"))
    man["cycles"] = cycles(); man["icons"] = named_icons()
    if ex("fx_vexblade"): single("fx_vexblade", "vexblade", 40)
    if ex("fx_ult"):
        for j, nm in enumerate(slice_sheet_black("fx_ult", "fx_ult", 4)): pass
    json.dump(man, open(os.path.join(DST, "manifest.json"), "w"), indent=1); print(sorted(os.listdir(DST)))

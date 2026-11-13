"""Analyse Blender renders (qa/blender-renders) of the SOUTH proof rig and write QA sheets + qa/qa-report.json.
Decodes every rendered pixel back to (part, zone) via the unique template colours, then reports:
holes (enclosed transparent pixels), 1px cracks near joints, disconnected islands, exposed hidden-zone pixels,
foot/ground contact, Blender-vs-FK agreement. Also renders per-joint sweeps with the FK renderer."""
import glob, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rig_core as rc
KIT = os.path.dirname(HERE); QA = os.path.join(KIT, "qa")
spec = json.load(open(os.path.join(KIT, "rig-spec.json")))
frames = json.load(open(os.path.join(HERE, "poses.json")))
BR = os.path.join(QA, "blender-renders"); FKD = os.path.join(QA, "spec-fk")

def font(sz):
    for f in ("arial.ttf", "DejaVuSans.ttf"):
        try: return ImageFont.truetype(f, sz)
        except OSError: pass
    return ImageFont.load_default()

color_map = {}
for p in spec["parts"]:
    for zone, hx in p["template_colors"].items():
        color_map[tuple(int(hx[i:i + 2], 16) for i in (1, 3, 5))] = (p["id"], "hidden" if zone.startswith("hidden") else zone)
templates = {p["id"]: (np.array(Image.open(os.path.join(KIT, p["file"])).convert("RGBA")), *p["rest_origin_char_px"]) for p in spec["parts"]}

def load(path): return np.array(Image.open(path).convert("RGBA"))

def holes(alpha):
    """Transparent pixels not 4-connected to the canvas border."""
    from collections import deque
    H, W = alpha.shape; seen = np.zeros_like(alpha, bool); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not alpha[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not alpha[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            Y, X = y + dy, x + dx
            if 0 <= Y < H and 0 <= X < W and not alpha[Y, X] and not seen[Y, X]: seen[Y, X] = True; q.append((Y, X))
    return ~alpha & ~seen

def cracks(alpha):
    a = np.pad(alpha, 1)
    t = ~alpha
    return t & ((a[1:-1, :-2] & a[1:-1, 2:]) | (a[:-2, 1:-1] & a[2:, 1:-1]))

def islands(alpha):
    from collections import deque
    H, W = alpha.shape; lab = np.zeros(alpha.shape, int); n = 0
    for y, x in zip(*np.nonzero(alpha)):
        if lab[y, x]: continue
        n += 1; q = deque([(y, x)]); lab[y, x] = n
        while q:
            yy, xx = q.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    Y, X = yy + dy, xx + dx
                    if 0 <= Y < H and 0 <= X < W and alpha[Y, X] and not lab[Y, X]: lab[Y, X] = n; q.append((Y, X))
    return n, lab

def posed_pivots(fr):
    W = rc.fk(dict(angles=fr["angles"], root=tuple(fr["root"])))
    return {b: rc.apply(W, b, rc.BONES[b][1]) for b in rc.BONES}

joint_bones = {j["child_bone"]: j for j in rc.JOINTS}

def part_at(img, y, x):
    if not (0 <= y < img.shape[0] and 0 <= x < img.shape[1]) or img[y, x, 3] == 0: return None
    k = color_map.get(tuple(int(v) for v in img[y, x, :3])); return k[0] if k else "?"

def joint_sets(j):
    s = {j["top_part"], j["under_part"]}
    if j["top_part"].startswith("hand_"): s |= {j["top_part"].replace("fist", "open")}
    return s

def components(mask):
    from collections import deque
    lab = np.zeros(mask.shape, int); comps = []
    for y, x in zip(*np.nonzero(mask)):
        if lab[y, x]: continue
        q = deque([(y, x)]); lab[y, x] = len(comps) + 1; pts = []
        while q:
            yy, xx = q.popleft(); pts.append((yy, xx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                Y, X = yy + dy, xx + dx
                if 0 <= Y < mask.shape[0] and 0 <= X < mask.shape[1] and mask[Y, X] and not lab[Y, X]: lab[Y, X] = lab[y, x]; q.append((Y, X))
        comps.append(pts)
    return comps

def analyse(img, fr):
    """Joint hole = an enclosed transparent region whose entire border belongs to one joint's two parts and lies within
    cover radius + 3 px of its posed pivot. Joint crack = 1px open slit whose two opposite neighbours both belong to that joint's parts."""
    alpha = img[..., 3] > 0
    H_all = holes(alpha); C = cracks(alpha)
    piv = posed_pivots(fr)
    Cj = np.zeros_like(alpha); Hj = np.zeros_like(alpha); joint_defects = {}
    jl = []
    for b, j in joint_bones.items():
        px, py = piv[b][0] + rc.ROOT_CANVAS[0], piv[b][1] + rc.ROOT_CANVAS[1]
        jl.append((j, joint_sets(j), (j["cover_radius_px"] or 9) + 3, px, py))
    for comp in components(H_all):
        border = set()
        for y, x in comp:
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = part_at(img, y + dy, x + dx)
                if n: border.add(n)
        cy_ = np.mean([c[0] for c in comp]) + 0.5; cx_ = np.mean([c[1] for c in comp]) + 0.5
        for j, S, r, px, py in jl:
            if border <= S and math.hypot(cx_ - px, cy_ - py) <= r:
                for y, x in comp: Hj[y, x] = True
                joint_defects[j["name"]] = joint_defects.get(j["name"], 0) + len(comp); break
    for y, x in zip(*np.nonzero(C)):
        pairs = [(part_at(img, y, x - 1), part_at(img, y, x + 1)), (part_at(img, y - 1, x), part_at(img, y + 1, x))]
        for j, S, r, px, py in jl:
            if math.hypot(x + 0.5 - px, y + 0.5 - py) > r: continue
            if any(a and b and a != b and a in S and b in S for a, b in pairs):
                Cj[y, x] = True; joint_defects[j["name"]] = joint_defects.get(j["name"], 0) + 1; break
    self_notch = np.zeros_like(alpha)
    for y, x in zip(*np.nonzero(C & ~Cj)):
        pairs = [(part_at(img, y, x - 1), part_at(img, y, x + 1)), (part_at(img, y - 1, x), part_at(img, y + 1, x))]
        if any(a and a == b for a, b in pairs): self_notch[y, x] = True
    H_ = H_all
    n_isl, _ = islands(alpha)
    exposed = {}; unknown = 0
    for y, x in zip(*np.nonzero(alpha)):
        k = color_map.get(tuple(int(v) for v in img[y, x, :3]))
        if k is None: unknown += 1; continue
        if k[1] == "hidden": exposed[k[0]] = exposed.get(k[0], 0) + 1
    # pivots must sit on opaque pixels (no disconnection at the joint)
    off = []
    for b, j in joint_bones.items():
        px, py = int(math.floor(piv[b][0] + rc.ROOT_CANVAS[0])), int(math.floor(piv[b][1] + rc.ROOT_CANVAS[1]))
        win = alpha[max(0, py - 1):py + 1, max(0, px - 1):px + 1]
        if not win.any(): off.append(b)
    # feet
    feet = {}
    for bt, pts in rc.FOOT_CONTACTS.items():
        Wm = rc.fk(dict(angles=fr["angles"], root=tuple(fr["root"])))
        feet[bt] = round(max(rc.apply(Wm, bt, c)[1] for c in pts), 3)
    return dict(holes=int(Hj.sum()), joint_cracks=int(Cj.sum()), joint_defects=joint_defects, negative_space_holes_px=int((H_all & ~Hj).sum()),
                rotation_alias_notches_px=int(self_notch.sum()), silhouette_notches_px=int((C & ~Cj & ~self_notch).sum()), islands=n_isl, unknown_colors=unknown,
                exposed_hidden_px=exposed, pivots_off_body=off, lowest_contact_y=feet), (Hj, H_all & ~Hj), Cj

report = {"frames": {}, "summary": {}}
results = {}
for fr in frames:
    b = load(os.path.join(BR, fr["name"] + ".png")); f = load(os.path.join(FKD, fr["name"] + ".png"))
    res, H_, Cj = analyse(b, fr)
    ab, af = b[..., 3] > 0, f[..., 3] > 0
    res["blender_vs_fk_mismatch_px"] = int((ab ^ af).sum())
    res["semi_transparent_px"] = int(((b[..., 3] > 0) & (b[..., 3] < 255)).sum())
    res["group"] = fr["group"]
    planted = next((p["planted"] for p in rc.QA_POSES if p["name"] == fr["name"]), None)
    if planted:
        res["planted"] = planted
        res["planted_on_ground"] = abs(max(res["lowest_contact_y"][p] for p in planted)) < 1e-6
    res["foot_height_px"] = {k: round(-v, 2) for k, v in res["lowest_contact_y"].items()}
    report["frames"][fr["name"]] = res; results[fr["name"]] = (b, H_, Cj)

neu = report["frames"]["neutral"]
report["summary"] = {
    "neutral_exposed_hidden_px": sum(neu["exposed_hidden_px"].values()),
    "neutral_holes": neu["holes"], "neutral_islands": neu["islands"],
    "frames_with_holes": [k for k, v in report["frames"].items() if v["holes"]],
    "frames_with_joint_cracks": {k: v["joint_cracks"] for k, v in report["frames"].items() if v["joint_cracks"]},
    "frames_with_multiple_islands": {k: v["islands"] for k, v in report["frames"].items() if v["islands"] != 1},
    "frames_with_pivots_off_body": {k: v["pivots_off_body"] for k, v in report["frames"].items() if v["pivots_off_body"]},
    "frames_planted_off_ground": [k for k, v in report["frames"].items() if v.get("planted_on_ground") is False],
    "unknown_color_px_total": sum(v["unknown_colors"] for v in report["frames"].values()),
    "semi_transparent_px_total": sum(v["semi_transparent_px"] for v in report["frames"].values()),
    "blender_vs_fk_max_mismatch_px": max(v["blender_vs_fk_mismatch_px"] for v in report["frames"].values()),
}

# ---------------------------------------------------------------- sheets
BG = (40, 40, 48, 255)
def on_bg(a, bg=BG):
    im = Image.new("RGBA", (a.shape[1], a.shape[0]), bg); im.alpha_composite(Image.fromarray(a, "RGBA")); return im

def sheet(names, Z, path, title, mark=True, crop=None):
    cw, ch = rc.CANVAS_W * Z, rc.CANVAS_H * Z
    if crop: cw, ch = (crop[2] - crop[0]) * Z, (crop[3] - crop[1]) * Z
    cols = min(len(names), 8); rows = math.ceil(len(names) / cols)
    out = Image.new("RGBA", (cols * (cw + 8) + 8, rows * (ch + 40) + 40), (24, 24, 28, 255)); d = ImageDraw.Draw(out)
    d.text((8, 8), title, fill=(255, 255, 255), font=font(14 if Z > 1 else 11))
    for i, n in enumerate(names):
        b, H_, Cj = results[n]; im = on_bg(b)
        if mark:
            ov = np.zeros(b.shape, np.uint8); ov[H_[1]] = (60, 120, 255, 255); ov[H_[0]] = (255, 0, 0, 255); ov[Cj] = (255, 0, 255, 255)
            im.alpha_composite(Image.fromarray(ov, "RGBA"))
        dd = ImageDraw.Draw(im); gy = rc.ROOT_CANVAS[1]
        dd.line([0, gy, im.width, gy], fill=(255, 220, 0, 160))
        if crop: im = im.crop(crop)
        im = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
        x = 8 + (i % cols) * (cw + 8); y = 32 + (i // cols) * (ch + 40)
        out.alpha_composite(im, (x, y))
        r = report["frames"][n]; eh = sum(r["exposed_hidden_px"].values())
        txt = f"{n}"
        stat = f"holes {r['holes']} cracks {r['joint_cracks']} isl {r['islands']} hid {eh}"
        bad = r["holes"] or r["joint_cracks"] or r["islands"] != 1 or r["pivots_off_body"]
        d.text((x, y + ch + 2), txt, fill=(255, 255, 255), font=font(12 if Z > 1 else 9))
        d.text((x, y + ch + 17), stat, fill=(255, 90, 90) if bad else (150, 230, 150), font=font(11 if Z > 1 else 8))
    out.save(path)

qa_names = [p["name"] for p in rc.QA_POSES]
crop = (16, 4, 144, 190)
sheet(qa_names, 1, os.path.join(QA, "poses-1x-native.png"), "SOUTH QA poses, 1:1 native source px (Blender render, mechanical guide colours)", mark=False, crop=crop)
sheet(qa_names, 3, os.path.join(QA, "poses-3x-diagnostic.png"),
      "SOUTH QA poses - Blender renders at 3x. red = hole at a joint, magenta = 1px crack at a joint (both bordered only by that joint's parts), blue = enclosed negative space between unrelated parts, checker = hidden-zone art revealed by rotation (must be painted), yellow = ground y=0",
      crop=crop)

# game scale 0.5x (80 px visible)
cols = len(qa_names); gs = []
out = Image.new("RGBA", (cols * 66 + 8, 2 * 100 + 50), (24, 24, 28, 255)); d = ImageDraw.Draw(out)
d.text((4, 4), "Game scale 0.5x (~80px visible). Row 1 nearest, row 2 box-filtered (approx. a linear-filtered downscale).", fill=(255, 255, 255), font=font(11))
for i, n in enumerate(qa_names):
    b = results[n][0]; im = on_bg(b).crop((16, 0, 144, 192))
    out.alpha_composite(im.resize((64, 96), Image.NEAREST), (8 + i * 66, 24))
    out.alpha_composite(im.resize((64, 96), Image.BOX), (8 + i * 66, 24 + 110))
out.save(os.path.join(QA, "game-scale-0.5x.png"))

# debug clips: strips + GIFs (4x and 1x)
for clip in ("idle", "step", "jab"):
    names = [fr["name"] for fr in frames if fr["group"] == "debug_" + clip]
    sheet(names, 3, os.path.join(QA, f"debug-{clip}-strip-3x.png"), f"DEBUG ONLY (not shipping animation): {clip} - {len(names)} frames, Blender renders", crop=crop)
    ims = [on_bg(results[n][0]).crop(crop) for n in names]
    big = [im.resize((im.width * 3, im.height * 3), Image.NEAREST) for im in ims]
    big[0].save(os.path.join(QA, f"debug-{clip}-3x.gif"), save_all=True, append_images=big[1:], duration=125 if clip != "jab" else 90, loop=0, disposal=2)
    small = [im.crop((0, 0, im.width, im.height)).resize((im.width // 2, im.height // 2), Image.NEAREST) for im in ims]
    small[0].save(os.path.join(QA, f"debug-{clip}-game-0.5x.gif"), save_all=True, append_images=small[1:], duration=125 if clip != "jab" else 90, loop=0, disposal=2)

# ---------------------------------------------------------------- joint sweeps (FK renderer, proven equal to Blender above)
sweep = {}
side_joints = [j for j in rc.JOINTS]
Zs = 5; R = 20
rows = [j for j in side_joints if not j["name"].endswith("_f")]
angles_n = 9
cw = (2 * R) * Zs
out = Image.new("RGBA", (190 + angles_n * (cw + 6), len(rows) * (cw + 26) + 40), (24, 24, 28, 255)); d = ImageDraw.Draw(out)
d.text((8, 8), "Joint sweeps (one joint rotated at a time, whole figure drawn, 5x crop around the pivot). red hole / magenta crack = defect. "
       "Far-side joints run too (see qa-report.json).", fill=(255, 255, 255), font=font(13))
for j in side_joints:
    lo, hi = j["qa_limits_deg"]; res = []
    angs = [lo + (hi - lo) * k / (angles_n - 1) for k in range(angles_n)]
    for a in angs:
        pose = dict(angles={j["child_bone"]: a}, root=(0, 0))
        img = rc.render(pose, templates)
        fr = dict(angles=pose["angles"], root=[0, 0])
        r_, H_, Cj = analyse(img, fr)
        res.append(dict(angle=round(a, 1), holes=r_["holes"], joint_cracks=r_["joint_cracks"], islands=r_["islands"],
                        exposed_hidden_px=sum(r_["exposed_hidden_px"].values()), pivots_off_body=r_["pivots_off_body"]))
        if j in rows:
            ri = rows.index(j)
            piv = rc.BONES[j["child_bone"]][1]; cx, cy = int(piv[0] + rc.ROOT_CANVAS[0]), int(piv[1] + rc.ROOT_CANVAS[1])
            im = on_bg(img); ov = np.zeros(img.shape, np.uint8); ov[H_[1]] = (60, 120, 255, 255); ov[H_[0]] = (255, 0, 0, 255); ov[Cj] = (255, 0, 255, 255)
            im.alpha_composite(Image.fromarray(ov, "RGBA"))
            im = im.crop((cx - R, cy - R, cx + R, cy + R)).resize((cw, cw), Image.NEAREST)
            dd = ImageDraw.Draw(im); dd.line([R * Zs - 4, R * Zs, R * Zs + 4, R * Zs], fill=(255, 40, 40)); dd.line([R * Zs, R * Zs - 4, R * Zs, R * Zs + 4], fill=(255, 40, 40))
            x = 190 + angs.index(a) * (cw + 6); y = 34 + ri * (cw + 26)
            out.alpha_composite(im, (x, y))
            bad = res[-1]["holes"] or res[-1]["joint_cracks"] or res[-1]["islands"] != 1
            d.text((x, y + cw + 2), f"{a:+.0f}deg h{res[-1]['holes']} c{res[-1]['joint_cracks']}", fill=(255, 90, 90) if bad else (150, 230, 150), font=font(11))
            if a == angs[0]: d.text((8, y + cw // 2), f"{j['name']}\n{j['top_part']} over\n{j['under_part']}", fill=(255, 255, 255), font=font(12))
    sweep[j["name"]] = dict(limits=j["qa_limits_deg"], results=res,
                            pass_=all(r["holes"] == 0 and r["joint_cracks"] == 0 and r["islands"] == 1 and not r["pivots_off_body"] for r in res))
out.save(os.path.join(QA, "joint-sweeps-5x.png"))
report["joint_sweeps"] = sweep
report["summary"]["joint_sweeps_failed"] = [k for k, v in sweep.items() if not v["pass_"]]

with open(os.path.join(QA, "qa-report.json"), "w") as fh: json.dump(report, fh, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
print(json.dumps(report["summary"], indent=1))

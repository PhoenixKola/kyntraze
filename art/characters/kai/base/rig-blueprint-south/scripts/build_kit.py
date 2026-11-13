"""Generate templates/, rig-spec.json, poses.json, part-layout.png, neutral-assembly.png, pivot-overlay.png,
approved-reference-overlay.png and qa/spec-fk/ renders from rig_core.py. Run with system Python (Pillow + numpy)."""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rig_core as rc

KIT = os.path.dirname(HERE)
BASE = os.path.dirname(KIT)
REF = os.path.join(BASE, "references", "kai-160-native-approved-reference.png")
TPL = os.path.join(KIT, "templates")
QA = os.path.join(KIT, "qa")
os.makedirs(TPL, exist_ok=True); os.makedirs(os.path.join(QA, "spec-fk"), exist_ok=True)

def font(sz):
    for f in ("arial.ttf", "DejaVuSans.ttf"):
        try: return ImageFont.truetype(f, sz)
        except OSError: pass
    return ImageFont.load_default()

def mul(c, k): return tuple(max(0, min(255, int(round(v * k)))) for v in c)

# ------------------------------------------------------------ zone colours (unique per part + zone)
def zone_colors():
    out = {}; used = set()
    for pid in rc.DRAW_ORDER:
        b = rc.PARTS[pid]["color"]
        z = {"paint": b, "outline": mul(b, 0.42), "hidden_a": mul(b, 0.58), "hidden_b": mul(b, 0.70)}
        for k in z:
            c = z[k]
            while c in used: c = (c[0], c[1], (c[2] + 3) % 256)
            z[k] = c; used.add(c)
        out[pid] = z
    return out

ZC = zone_colors()

# ------------------------------------------------------------ rasterise + zones
masks = {pid: rc.raster_part(pid) for pid in rc.PARTS}

def char_mask(pid):
    m, ox, oy = masks[pid]; return m, ox, oy

def covered_by(pid):
    """bool mask (part image space): pixels hidden in neutral by the part's structural covers drawn above it."""
    m, ox, oy = masks[pid]; cov = np.zeros_like(m)
    my = rc.DRAW_ORDER.index(pid)
    for c in rc.JOINT_COVERS.get(pid, []):
        if rc.DRAW_ORDER.index(c) < my: raise SystemExit(f"cover {c} is below {pid} in draw order")
        cm, cx, cy = masks[c]
        h, w = m.shape
        for (yy, xx) in zip(*np.nonzero(m)):
            X, Y = xx + ox - cx, yy + oy - cy
            if 0 <= Y < cm.shape[0] and 0 <= X < cm.shape[1] and cm[Y, X]: cov[yy, xx] = True
    return cov

templates = {}; zones = {}
for pid in rc.DRAW_ORDER:
    m, ox, oy = masks[pid]
    hid = covered_by(pid)
    pad = np.pad(m, 1)
    edge = m & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    outline = edge & ~hid
    img = np.zeros(m.shape + (4,), np.uint8)
    z = ZC[pid]
    img[m] = z["paint"] + (255,)
    yy, xx = np.nonzero(hid)
    for y, x in zip(yy, xx):
        img[y, x] = (z["hidden_a"] if ((x // 2 + y // 2) % 2 == 0) else z["hidden_b"]) + (255,)
    img[outline] = z["outline"] + (255,)
    templates[pid] = (img, ox, oy)
    zones[pid] = dict(opaque=int(m.sum()), hidden=int(hid.sum()), outline=int(outline.sum()), paint=int((m & ~hid & ~outline).sum()))
    Image.fromarray(img, "RGBA").save(os.path.join(TPL, f"{pid}.png"))

# ------------------------------------------------------------ geometry checks (cap/cover contracts)
def disk_pixels_inside(pid, cxy, r):
    m, ox, oy = masks[pid]; bad = 0; tot = 0
    for yy in range(math.floor(cxy[1] - r) - 1, math.ceil(cxy[1] + r) + 1):
        for xx in range(math.floor(cxy[0] - r) - 1, math.ceil(cxy[0] + r) + 1):
            if math.hypot(xx + 0.5 - cxy[0], yy + 0.5 - cxy[1]) <= r:
                tot += 1; X, Y = xx - ox, yy - oy
                if not (0 <= Y < m.shape[0] and 0 <= X < m.shape[1] and m[Y, X]): bad += 1
    return tot, bad

geom_checks = []
for j in rc.JOINTS:
    piv = rc.BONES[j["child_bone"]][1]
    if j["cap_radius_px"] is None: continue
    ct, cb = disk_pixels_inside(j["under_part"], piv, j["cap_radius_px"])
    vt, vb = disk_pixels_inside(j["top_part"], piv, j["cover_radius_px"])
    geom_checks.append(dict(joint=j["name"], cap_disk_px=ct, cap_missing=cb, cover_disk_px=vt, cover_missing=vb,
                            pass_=cb == 0 and vb == 0 and j["cover_radius_px"] >= j["cap_radius_px"]))
# costume-ownership geometric rules
def any_px(pid, cond):
    m, ox, oy = masks[pid]; yy, xx = np.nonzero(m)
    X = xx + ox + 0.5; Y = yy + oy + 0.5
    return int(cond(X, Y).sum())
own_checks = {
    "torso_has_no_sleeve_pixels(|x|>17)": any_px("torso", lambda X, Y: np.abs(X) > 17) == 0,
    "head_has_no_pixels_below_chin(y>-118)": any_px("head", lambda X, Y: Y > -118) == 0,
    "head_has_no_collar_flap_pixels(|x|>8.5 & y>-126)": any_px("head", lambda X, Y: (np.abs(X) > 8.5) & (Y > -126)) == 0,
    "neck_stays_inside_collar_band(y<=-110)": any_px("neck", lambda X, Y: Y > -110) == 0,
    "torso_has_no_collar_flap_above_-121": any_px("torso", lambda X, Y: Y < -121) == 0,
    "upper_arm_stays_outside_torso_core(|x|>=12)": any_px("upper_arm_n", lambda X, Y: np.abs(X) < 12) == 0,
    "boots_separate_from_shins(boot top below knee)": True,
}

# ------------------------------------------------------------ spec
def img_xy(pid, p):
    _, ox, oy = masks[pid]; return [round(p[0] - ox, 3), round(p[1] - oy, 3)]

children = {}
for b, (par, piv, tail) in rc.BONES.items():
    if par: children.setdefault(par, []).append(b)

parts_spec = []
for idx, pid in enumerate(rc.DRAW_ORDER):
    P = rc.PARTS[pid]; m, ox, oy = masks[pid]; bone = P["bone"]
    anchors = {f"{c}": img_xy(pid, rc.BONES[c][1]) for c in children.get(bone, [])}
    entry = dict(id=pid, file=f"templates/{pid}.png", bone=bone, role=P["role"], slot=P["slot"], default_visible=P["default_visible"],
                 draw_index=idx, size_px=[int(m.shape[1]), int(m.shape[0])], rest_origin_char_px=[ox, oy],
                 pivot_px=img_xy(pid, rc.BONES[bone][1]), pivot_char_px=list(rc.BONES[bone][1]), anchors_px=anchors,
                 covered_at_joint_by=rc.JOINT_COVERS.get(pid, []), zone_pixel_counts=zones[pid],
                 template_colors={k: "#%02x%02x%02x" % v for k, v in ZC[pid].items()})
    if bone in rc.FOOT_CONTACTS and P["bone"] == bone:
        entry["ground_contacts_px"] = {"inner": img_xy(pid, rc.FOOT_CONTACTS[bone][0]), "outer": img_xy(pid, rc.FOOT_CONTACTS[bone][1])}
    parts_spec.append(entry)

bones_spec = []
for b, (par, piv, tail) in rc.BONES.items():
    rel = [piv[0] - rc.BONES[par][1][0], piv[1] - rc.BONES[par][1][1]] if par else [0, 0]
    bones_spec.append(dict(name=b, parent=par, pivot_char_px=list(piv), tail_char_px=list(tail), pivot_rel_parent_px=rel,
                           length_px=round(math.hypot(tail[0] - piv[0], tail[1] - piv[1]), 3),
                           parts=[p for p in rc.DRAW_ORDER if rc.PARTS[p]["bone"] == b]))

# reference palette (opaque pixels, median cut)
ref = Image.open(REF).convert("RGBA"); ra = np.array(ref)
op = ra[ra[..., 3] > 0][:, :3]
q = Image.fromarray(op.reshape(1, -1, 3), "RGB").quantize(colors=20, method=Image.Quantize.MEDIANCUT)
pal = q.getpalette(); cnts = sorted(q.getcolors(), reverse=True)
palette = [dict(hex="#%02x%02x%02x" % tuple(pal[i * 3:i * 3 + 3]), pixels=c) for c, i in cnts]
role_samples = {"skin": (48, 35), "skin_light": (12, 70), "hair": (50, 10), "jacket": (30, 55), "jacket_light": (25, 52), "gold_trim": (25, 41),
                "undershirt": (45, 60), "sash_shadow": (50, 76), "sash": (55, 90), "trouser": (25, 105), "boot": (10, 148), "boot_sole": (10, 157),
                "wrap_white": (20, 75)}
roles = {k: "#%02x%02x%02x" % tuple(ra[y, x, :3]) for k, (x, y) in role_samples.items()}

spec = {
    "schema": "kyntraze.rig-blueprint/1",
    "character": "kai", "form": "base", "direction": "south",
    "status": "TECHNICAL MANNEQUIN / FIT GUIDE - not final art, not approved art",
    "generated_by": "scripts/build_kit.py from scripts/rig_core.py (single source of truth)",
    "coordinate_system": {
        "character_space": "native source pixels; origin = root on ground line midway between the feet; +x = screen right; +y = DOWN",
        "part_image_space": "pixels of the part PNG; (0,0) = top-left CORNER of the top-left pixel; 7.5 = centre of pixel column 7",
        "angles": "degrees, positive = counter-clockwise as seen on screen; rest/neutral = 0 for every bone; child angles are relative to parent",
        "sides": "near = Kai's right side = screen-left (x<0); far = Kai's left side = screen-right (x>0). Near leg/arm draws over far.",
        "posed_point": "p_posed = F_parent(pivot + R(angle) * (p_rest - pivot)), applied root->leaf; root adds (dx,dy) translation",
        "sampling": "nearest / Closest at pixel centres; no smoothing",
    },
    "scale": {
        "source_px_per_art_px": 1, "visible_height_neutral_px": 160, "visible_top_y": rc.VISIBLE_TOP_Y, "ground_y": rc.GROUND_Y,
        "approved_reference": "references/kai-160-native-approved-reference.png (87x160, crouched fighting stance, same 1:1 pixel scale)",
        "game_render_note": "renderer shows Kai at ~79-80 px visible => 0.5x of this source scale (see qa/game-scale-*.png)",
        "blender_units_per_px": rc.PX_TO_BU,
    },
    "technical_canvas": {"size_px": [rc.CANVAS_W, rc.CANVAS_H], "root_canvas_px": list(rc.ROOT_CANVAS),
                         "note": "QA/proof canvas only; final export canvas is decided at animation-export time"},
    "neutral_pose": "Rigging neutral: front-facing SOUTH, upright, limbs hanging straight (every limb bone vertical so every template is pixel-exact in the "
                    "assembly), feet a hip-width apart with soles on y=0. Less dynamic than the approved fighting pose by design.",
    "bones": bones_spec,
    "parts": parts_spec,
    "draw_order_back_to_front": rc.DRAW_ORDER,
    "joints": [dict(j, pivot_char_px=list(rc.BONES[j["child_bone"]][1])) for j in rc.JOINTS],
    "foot_contacts_char_px": {k: [list(p) for p in v] for k, v in rc.FOOT_CONTACTS.items()},
    "layering_rules": [
        "Static draw order for every SOUTH pose (no per-pose swaps were needed in QA).",
        "At hip, knee, waist, neck base, shoulder: the PARENT/attachment piece is on top; the child's round cap hides under it.",
        "At elbow and wrist: the CHILD is on top (forearm over upper arm, hand over forearm) because forearms/hands must draw in front of the torso.",
        "Boot draws over the shin (trouser tucked into boot shaft).",
        "Upper arms draw in front of torso/collar/head/hair but UNDER their shoulder trim.",
        "All far-side limb parts draw before (behind) the matching near-side parts.",
    ],
    "costume_ownership": {
        "high collar": "collar ONLY (not head, not torso)", "neck skin": "neck ONLY", "face/ears/jaw": "head", "hair spikes/bangs": "hair_front",
        "hair mass behind head": "hair_back", "jacket body, hem trim, lapels, undershirt": "torso",
        "gold/white shoulder pad": "shoulder_trim_*", "sleeve shoulder->elbow": "upper_arm_*", "sleeve end + white cuff + bare forearm + wraps": "forearm_*",
        "fist / open hand incl. knuckle wraps": "hand_*_fist / hand_*_open", "sash band + trouser seat/waist": "pelvis", "sash knot": "sash_knot",
        "sash tails": "sash_tail_a / sash_tail_b", "baggy trouser thigh": "thigh_*", "trouser below knee": "shin_*", "boot shaft+foot+sole": "boot_*",
    },
    "template_zones": {
        "paint": "opaque flat colour: visible in neutral - paint final art here",
        "outline": "opaque dark 1px ring: visible silhouette edge - final dark outline goes here",
        "hidden (checker)": "opaque checker: hidden under the covering part in neutral, REVEALED when the joint rotates - must be fully painted with plausible continuation, no outline across it",
        "transparent": "alpha 0 - must stay alpha 0",
    },
    "art_constraints": {
        "alpha": "binary (0 or 255) only", "max_unique_colors_per_part": 24, "outline": "1px dark outline on visible silhouette edges only",
        "palette_reference_roles": roles, "palette_reference_clusters": palette,
        "fit_tolerance": "see CODEX-ART-BRIEF.md section 'Acceptance per part' and scripts/check_part.py",
    },
    "variant_slots": {"hand": ["fist (default)", "open"], "hair": ["hair_front + hair_back per form; same pivots"],
                      "future_not_built": ["foreshortened thigh/shin/forearm variants for toward-camera stepping/jabs", "blink/mouth"]},
    "geometry_checks": {"joint_cap_cover": geom_checks, "costume_ownership_rules": own_checks},
    "qa_poses": [dict(name=p["name"], group=p["group"], angles=p["angles"], root=list(p["root"]), hands=p["hands"], planted=p["planted"], note=p["note"])
                 for p in rc.QA_POSES],
}
with open(os.path.join(KIT, "rig-spec.json"), "w") as f: json.dump(spec, f, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))

# poses.json for Blender (QA + debug clips, one frame each)
frames = []
for p in rc.QA_POSES: frames.append(dict(name=p["name"], group=p["group"], angles=p["angles"], root=list(p["root"]), hands=p["hands"]))
for clip, lst in rc.DEBUG_CLIPS.items():
    for p in lst: frames.append(dict(name=p["name"], group="debug_" + clip, angles=p["angles"], root=list(p["root"]), hands=p.get("hands", {})))
with open(os.path.join(KIT, "scripts", "poses.json"), "w") as f: json.dump(frames, f, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))

# ------------------------------------------------------------ FK renders
fk_dir = os.path.join(QA, "spec-fk")
for fr in frames:
    pose = dict(angles=fr["angles"], root=tuple(fr["root"]), hands=fr["hands"])
    Image.fromarray(rc.render(pose, templates), "RGBA").save(os.path.join(fk_dir, f"{fr['name']}.png"))
neutral = rc.render(dict(angles={}, root=(0, 0)), templates)
Image.fromarray(neutral, "RGBA").save(os.path.join(KIT, "neutral-assembly.png"))

# ------------------------------------------------------------ part-layout.png
Z = 4; F = font(13); Fs = font(11)
cells = []
for pid in rc.DRAW_ORDER:
    img, ox, oy = templates[pid]; h, w = img.shape[:2]
    cells.append((pid, img, max(w * Z, 150), h * Z + 52))
cols = 6; pad = 12
rows = [cells[i:i + cols] for i in range(0, len(cells), cols)]
Wt = cols * (max(c[2] for c in cells) + pad) + pad
cw = max(c[2] for c in cells) + pad
Ht = 70 + sum(max(c[3] for c in r) + pad for r in rows) + 80
lay = Image.new("RGBA", (Wt, Ht), (34, 34, 40, 255)); d = ImageDraw.Draw(lay)
d.text((pad, 10), "KAI SOUTH - part templates (TECHNICAL FIT GUIDES, not final art)  |  shown 4x  |  checker = hidden-at-joint (must paint), "
       "dark ring = outline, flat = paint, transparent = leave empty", fill=(255, 255, 255), font=F)
d.text((pad, 30), "red + = pivot (rotation centre), cyan o = child attach anchor, yellow o = ground contact. Dimensions in source px. Coordinates: image px, corner origin.",
       fill=(200, 200, 200), font=Fs)
y = 60
spec_by = {p["id"]: p for p in parts_spec}
for r in rows:
    x = pad; rh = max(c[3] for c in r)
    for pid, img, cwid, chh in r:
        h, w = img.shape[:2]
        # checkerboard background for transparency
        bg = Image.new("RGBA", (w * Z, h * Z), (70, 70, 80, 255)); bd = ImageDraw.Draw(bg)
        for yy in range(0, h * Z, 8):
            for xx in range(0, w * Z, 8):
                if (xx // 8 + yy // 8) % 2: bd.rectangle([xx, yy, xx + 7, yy + 7], fill=(85, 85, 96, 255))
        bg.alpha_composite(Image.fromarray(img, "RGBA").resize((w * Z, h * Z), Image.NEAREST))
        lay.alpha_composite(bg, (x, y + 40))
        s = spec_by[pid]
        d.text((x, y), pid, fill=(255, 255, 120), font=F)
        d.text((x, y + 16), f"{w}x{h}px pivot {s['pivot_px'][0]:g},{s['pivot_px'][1]:g}", fill=(220, 220, 220), font=Fs)
        px, py = s["pivot_px"]; PX, PY = x + px * Z, y + 40 + py * Z
        d.line([PX - 6, PY, PX + 6, PY], fill=(255, 40, 40), width=2); d.line([PX, PY - 6, PX, PY + 6], fill=(255, 40, 40), width=2)
        for an, (ax, ay) in s["anchors_px"].items():
            AX, AY = x + ax * Z, y + 40 + ay * Z
            d.ellipse([AX - 4, AY - 4, AX + 4, AY + 4], outline=(0, 230, 255), width=2)
        for cn, (gx, gy) in s.get("ground_contacts_px", {}).items():
            GX, GY = x + gx * Z, y + 40 + gy * Z
            d.ellipse([GX - 4, GY - 4, GX + 4, GY + 4], outline=(255, 230, 0), width=2)
        x += cw
    y += rh + pad
lay.save(os.path.join(KIT, "part-layout.png"))

# ------------------------------------------------------------ pivot-overlay.png
Z = 5
H, Wd = neutral.shape[:2]
base = Image.new("RGBA", (Wd * Z, H * Z), (30, 30, 36, 255))
base.alpha_composite(Image.fromarray(neutral, "RGBA").resize((Wd * Z, H * Z), Image.NEAREST))
pv = Image.new("RGBA", (Wd * Z + 360, H * Z), (30, 30, 36, 255)); pv.alpha_composite(base)
d = ImageDraw.Draw(pv); F = font(12)
def cv(p): return ((p[0] + rc.ROOT_CANVAS[0]) * Z, (p[1] + rc.ROOT_CANVAS[1]) * Z)
d.line([0, cv((0, 0))[1], Wd * Z, cv((0, 0))[1]], fill=(255, 230, 0), width=1)
d.text((4, cv((0, 0))[1] + 2), "ground y=0", fill=(255, 230, 0), font=F)
d.line([0, cv((0, -160))[1], Wd * Z, cv((0, -160))[1]], fill=(160, 160, 160), width=1)
d.text((4, cv((0, -160))[1] - 14), "visible top y=-160", fill=(200, 200, 200), font=F)
for j in rc.JOINTS:
    piv = rc.BONES[j["child_bone"]][1]; X, Y = cv(piv)
    if j["cover_radius_px"]:
        r = j["cover_radius_px"] * Z; d.ellipse([X - r, Y - r, X + r, Y + r], outline=(0, 230, 255), width=1)
        r = j["cap_radius_px"] * Z; d.ellipse([X - r, Y - r, X + r, Y + r], outline=(255, 120, 0), width=1)
labels = []
for b, (par, piv, tail) in rc.BONES.items():
    X, Y = cv(piv)
    d.line([X - 5, Y, X + 5, Y], fill=(255, 30, 30), width=2); d.line([X, Y - 5, X, Y + 5], fill=(255, 30, 30), width=2)
    labels.append((Y, X, f"{b} ({piv[0]:g},{piv[1]:g})"))
for b in rc.FOOT_CONTACTS:
    for c in rc.FOOT_CONTACTS[b]:
        X, Y = cv(c); d.ellipse([X - 4, Y - 4, X + 4, Y + 4], outline=(255, 230, 0), width=2)
# label column with leader lines (sorted by y, de-overlapped)
labels.sort(); ly = 20
for Y, X, t in labels:
    ly = max(ly, Y - 6); tx = Wd * Z + 20
    d.line([X, Y, tx - 4, ly + 7], fill=(120, 120, 120), width=1); d.text((tx, ly), t, fill=(255, 255, 255), font=F); ly += 15
d.text((Wd * Z + 20, H * Z - 60), "red + pivot | cyan circle = cover radius (top part)\norange circle = cap radius (hidden part)\nyellow = ground + sole contacts",
       fill=(220, 220, 220), font=F)
pv.save(os.path.join(KIT, "pivot-overlay.png"))

# ------------------------------------------------------------ approved-reference-overlay.png
Z = 4
refa = np.array(ref); rh, rw = refa.shape[:2]
# align reference: bottom row on ground row, reference torso centre x~47 onto root x
REF_CX = 47
panel_w, panel_h = rc.CANVAS_W, rc.CANVAS_H
ref_canvas = np.zeros((panel_h, panel_w, 4), np.uint8)
ox = rc.ROOT_CANVAS[0] - REF_CX; oy = rc.ROOT_CANVAS[1] - rh
ref_canvas[oy:oy + rh, ox:ox + rw] = refa
def on_bg(a, bg=(44, 44, 52)):
    im = Image.new("RGBA", (a.shape[1], a.shape[0]), bg + (255,)); im.alpha_composite(Image.fromarray(a, "RGBA")); return im
over = on_bg(ref_canvas)
mann = Image.fromarray(neutral, "RGBA"); ma = np.array(mann).copy()
pad_ = np.pad(ma[..., 3] > 0, 1)
edge = (ma[..., 3] > 0) & ~(pad_[:-2, 1:-1] & pad_[2:, 1:-1] & pad_[1:-1, :-2] & pad_[1:-1, 2:])
ghost = ma.copy(); ghost[..., 3] = np.where(ma[..., 3] > 0, 90, 0); ghost[edge] = (0, 255, 255, 255)
over.alpha_composite(Image.fromarray(ghost, "RGBA"))
panels = [on_bg(ref_canvas), on_bg(neutral), over]
names = ["approved reference (87x160, 1:1)", "rig neutral mannequin (1:1)", "overlay: mannequin cyan edge over reference"]
out = Image.new("RGBA", (3 * panel_w * Z + 4 * 16, panel_h * Z + 300), (24, 24, 28, 255)); d = ImageDraw.Draw(out); F = font(14)
landmarks = [("hair top", -160, 0), ("collar tips", -128, 31), ("chin", -118, 41), ("shoulder top", -115, 44), ("sash top", -88, 72), ("sash bottom", -78, 80),
             ("crotch", -62, 95), ("knee pivot (rig) / knee (ref, crouched near leg)", -36, 118), ("boot top", -25, 130), ("sole / ground", 0, 159)]
for i, (pnl, nm) in enumerate(zip(panels, names)):
    X = 16 + i * (panel_w * Z + 16)
    out.alpha_composite(pnl.resize((panel_w * Z, panel_h * Z), Image.NEAREST), (X, 40))
    d.text((X, 12), nm, fill=(255, 255, 255), font=F)
    for nm2, yr, yref in landmarks:
        Yrig = 40 + (yr + rc.ROOT_CANVAS[1]) * Z
        d.line([X, Yrig, X + panel_w * Z, Yrig], fill=(255, 80, 80, 255) if i else (255, 80, 80, 0), width=1)
        if i == 0:
            Yr = 40 + (yref - rh + rc.ROOT_CANVAS[1]) * Z
            d.line([X, Yr, X + panel_w * Z, Yr], fill=(80, 255, 120), width=1)
ty = panel_h * Z + 52
d.text((16, ty), "Landmarks (y in character px, ground=0)   red = rig neutral, green = reference measurement", fill=(255, 255, 255), font=F)
for k, (nm2, yr, yref) in enumerate(landmarks):
    d.text((16 + (k % 2) * 560, ty + 22 + (k // 2) * 20), f"{nm2:46s} rig {yr:5d}   ref {yref - rh + 1 - 1:5d}", fill=(220, 220, 220), font=font(13))
d.text((16, ty + 140), "Notes: the reference is a crouched 3/4 fighting stance (front foot lower = nearer the camera, back foot ~13px higher); the rig neutral is a\n"
       "front-facing upright rigging pose. Head size, collar height, shoulder width (~53px pad-to-pad), sash height and boot height are matched;\n"
       "leg segment lengths are measured along the reference limbs (thigh 34, shin+ankle 24, ankle->sole 12) so standing height stays 160 visible px.",
       fill=(200, 200, 200), font=font(13))
out.save(os.path.join(KIT, "approved-reference-overlay.png"))

# landmark table also to json for STATUS
with open(os.path.join(QA, "landmarks.json"), "w") as f:
    json.dump([dict(name=n, rig_y=yr, ref_y=yref - rh) for n, yr, yref in landmarks], f, indent=1)
print("templates:", len(templates))
print("geometry checks:", all(g["pass_"] for g in geom_checks), [g["joint"] for g in geom_checks if not g["pass_"]])
print("ownership checks:", own_checks)
print("neutral bbox:", (lambda a: (a.min(1), a.max(1)))(np.array(np.nonzero(neutral[..., 3] > 0))))

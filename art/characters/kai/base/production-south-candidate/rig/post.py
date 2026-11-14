"""python post.py prep <work> | hashes <work> | final <work>"""
import glob, hashlib, json, math, os, shutil, subprocess, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rig as r, anim as a
V5 = r.V5; BASE = r.BASE; mode, work = sys.argv[1], sys.argv[2]
PROTECTED = sorted(glob.glob(os.path.join(BASE, "references", "*.png")) + glob.glob(os.path.join(BASE, "animation-recovery-south-v5", "parts", "*.png")) + glob.glob(os.path.join(BASE, "animation-recovery-south-v5", "rig", "*.blend")) + [os.path.join(BASE, "rig-blueprint-south", "kai-south-rig-pilot.blend")] +
                   glob.glob(os.path.join(BASE, "animation-pilot-south-v4", "*.blend")) + [os.path.join(BASE, "rig-blueprint-south", "kai-south-rig-pilot.blend")] +
                   glob.glob(os.path.join(V5, "source", "*.png")))
def hashes(): return {os.path.relpath(f, BASE).replace("\\", "/"): hashlib.sha256(open(f, "rb").read()).hexdigest() for f in PROTECTED}
def font(n):
    try: return ImageFont.truetype("arial.ttf", n)
    except OSError: return ImageFont.load_default()

if mode == "prep":
    os.makedirs(os.path.join(work, "tex8"), exist_ok=True)
    for p in {p["img"] for p in r.PARTS}:
        Image.fromarray(r.prefilter8(np.array(Image.open(os.path.join(r.PARTS_DIR, p)).convert("RGBA")))).save(os.path.join(work, "tex8", p))
    sys.exit(0)
if mode == "hashes":
    f = os.path.join(work, "protected-before.json")
    if not os.path.exists(f): json.dump(hashes(), open(f, "w"), indent=1)
    sys.exit(0)

def holes(al):
    H, W = al.shape; seen = np.zeros_like(al); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not al[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not al[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            Y, X = y + dy, x + dx
            if 0 <= Y < H and 0 <= X < W and not al[Y, X] and not seen[Y, X]: seen[Y, X] = True; q.append((Y, X))
    return ~al & ~seen

data = json.load(open(os.path.join(r.RIG_DIR, "anim-data.json"))); vf = json.load(open(os.path.join(work, "verify.json")))
i1 = r.load_images(); qa = {"blender_checks": vf["checks"], "clips": {}}; finals = {}; maxe = 0.0; maxd = 0
solved = {f()["name"]: a.solve_clip(f()) for f in a.CLIPS}
for k in data["clips"]:
    nm = k["name"]; frs = []; info = {"frames": len(k["frames"]), "enclosed_holes_px": [], "blender_vs_numpy_px": []}
    for i, (ch, order, errs, slots) in enumerate(solved[nm]):
        key = f"{nm}_{i:02d}"
        nat = np.array(Image.open(os.path.join(work, "native", key + ".png")).convert("RGBA")); big = np.array(Image.open(os.path.join(work, "big", key + ".png")).convert("RGBA"))
        assert set(np.unique(nat[..., 3])) <= {0, 255} and set(np.unique(big[..., 3])) <= {0, 255}, key
        fin = r.rotsprite_combine(nat, big); frs.append(fin)
        d = int((r.render(ch, i1, 1, slots, order) != nat).any(-1).sum()); info["blender_vs_numpy_px"].append(d); maxd = max(maxd, d)
        Wm = r.fk(ch)
        for b, hp in vf["heads"][key].items(): maxe = max(maxe, float(np.hypot(*(r.apply(Wm, b, r.BONES[b][1]) - np.array(hp)))))
        info["enclosed_holes_px"].append(int(holes(fin[..., 3] > 0).sum()))
    info["max_sole_target_error_px"] = round(max((max(f["planted_err"].values()) for f in k["frames"] if f["planted_err"]), default=0.0), 3)
    if k["loop"]:
        dd = [int((frs[i] != frs[(i + 1) % len(frs)]).any(-1).sum()) for i in range(len(frs))]
        info["frame_to_frame_changed_px"] = dd; info["loop_seam_ok"] = dd[-1] <= max(dd[:-1]) * 1.15
    finals[nm] = frs; qa["clips"][nm] = info
qa["fk_parity_max_px"] = round(maxe, 5); qa["blender_vs_numpy_max_px"] = maxd

BASE_CLIPS = ("Idle", "Run", "BasicPunch")   # their frame (crop + origin) is fixed since B03D; B03G clips carry their own
allf = [f for nm_, v in finals.items() if nm_ in BASE_CLIPS for f in v]
ys, xs = np.nonzero(np.any(np.stack([f[..., 3] > 0 for f in allf]), 0))
x0, x1, y0, y1 = max(0, xs.min() - 2), min(r.CANVAS[0], xs.max() + 3), max(0, ys.min() - 2), min(r.CANVAS[1], ys.max() + 3)
if (x1 - x0) % 2: x0 -= 1
FW, FH = x1 - x0, y1 - y0; ox, oy = r.ROOT[0] - x0, r.ROOT[1] - y0
os.makedirs(os.path.join(V5, "sheets"), exist_ok=True); rev = os.path.join(V5, "review"); os.makedirs(rev, exist_ok=True)
man = {"schema": "kyntraze.anim-manifest/0.1-pilot", "character": "kai", "form": ("form-i" if r.FORM == "f1" else "base"), "direction": "south", "status": "PRODUCTION CANDIDATE - owner approval required",
       "source_blend": "rig/kai-south.blend", "frame_width": int(FW), "frame_height": int(FH), "origin_px": [float(ox), float(oy)],
       "origin_normalized": [round(ox / FW, 6), round(oy / FH, 6)],
       "origin_meaning": "ground point midway between the two soles of the approved stance (near sole is 13 px lower = closer to camera)",
       "scale_note": "1 px = 1 native art px (approved 160 px Kai scale); game currently shows Kai ~79 px tall (setScale ~0.49)",
       "root_motion": {"baked": False, "contract": "frames are in place; Phaser owns movement, collision, hitboxes and damage; events are frame indices only"},
       "animations": {}}
def clip_crop(nm):
    """(x0, x1, y0, y1, FW, FH, ox, oy) for a clip: the shared base frame, or its own tight frame for B03G clips."""
    if nm in BASE_CLIPS: return x0, x1, y0, y1, FW, FH, ox, oy
    yy, xx = np.nonzero(np.any(np.stack([f[..., 3] > 0 for f in finals[nm]]), 0))
    cx0, cx1, cy0, cy1 = max(0, xx.min() - 2), min(r.CANVAS[0], xx.max() + 3), max(0, yy.min() - 2), min(r.CANVAS[1], yy.max() + 3)
    if (cx1 - cx0) % 2: cx0 = max(0, cx0 - 1)
    return cx0, cx1, cy0, cy1, cx1 - cx0, cy1 - cy0, r.ROOT[0] - cx0, r.ROOT[1] - cy0
for nm, frs in finals.items():
    k = next(c for c in data["clips"] if c["name"] == nm)
    cx0, cx1, cy0, cy1, cw_, ch_, cox, coy = clip_crop(nm)
    sheet = Image.new("RGBA", (cw_ * len(frs), ch_))
    for i, f in enumerate(frs): sheet.paste(Image.fromarray(f[cy0:cy1, cx0:cx1]), (i * cw_, 0))
    fn = f"sheets/kai_south_{nm.lower()}.png"; sheet.save(os.path.join(V5, fn))
    e = {"sheet": fn, "frames": len(frs), "fps": k["fps"], "loop": k["loop"], "duration_s": round(len(frs) / k["fps"], 4), "blender_action": nm, "events": k["events"]}
    if nm not in BASE_CLIPS:
        e.update({"frame_width": int(cw_), "frame_height": int(ch_), "origin_px": [float(cox), float(coy)], "terminal": "hold_last_frame" if nm == "Death" else "once", "root_motion_note": "in place; Death may offset the body from the sim position (knock-back fall), the origin stays the pre-fall ground point"})
        qa["clips"][nm]["frame"] = [int(cw_), int(ch_), float(cox), float(coy)]; qa["clips"][nm]["crop_touches_canvas_edge"] = bool(cx0 <= 0 or cx1 >= r.CANVAS[0] or cy0 <= 0 or cy1 >= r.CANVAS[1])
    if nm == "Run": e["speed_note"] = "in-place cycle, 3.5 steps/s at 14 fps; scale fps with speed (14*speed/250, clamp 10..18). Front-view stance feet cannot lock to the world at 250 px/s."
    if nm == "BasicPunch": e["hit_contract"] = "apply damage/hitstop in Phaser on 'impact' (0-based frame 5)"
    man["animations"][nm] = e
json.dump(man, open(os.path.join(V5, "sheets", "manifest.json"), "w"), indent=1)

BG = (40, 40, 50)
def tile(f, z=1):
    im = Image.new("RGBA", (FW, FH), BG + (255,)); im.alpha_composite(Image.fromarray(f[y0:y1, x0:x1])); return im.resize((FW * z, FH * z), Image.NEAREST)
# ---- comparison: approved | previous attempt | candidate, at 1x (intended size) and a separate 4x inspection
ref = Image.open(os.path.join(BASE, "references", "kai-160-native-approved-reference.png")).convert("RGBA")
v4s = os.path.join(BASE, "animation-recovery-south-v5", "sheets", "kai_south_v5_idle.png")
v4 = Image.open(v4s).convert("RGBA").crop((0, 0, 106, 166)) if os.path.exists(v4s) else None
cols = [("approved reference", ref), ("previous attempt v5 (rejected)", v4), ("Idle frame 0", Image.fromarray(finals["Idle"][0][y0:y1, x0:x1])),
        ("Run 5", Image.fromarray(finals["Run"][5][y0:y1, x0:x1])), ("Punch impact", Image.fromarray(finals["BasicPunch"][5][y0:y1, x0:x1]))]
cols = [c for c in cols if c[1] is not None]
Hm = max(im.height for _, im in cols); Wsum = sum(im.width + 12 for _, im in cols) + 12
for z, name in ((1, "comparison-1x-actual-size.png"), (4, "comparison-4x-inspection.png")):
    out = Image.new("RGBA", (Wsum * z, (Hm + 18) * z if z > 1 else Hm + 18), BG + (255,)); d = ImageDraw.Draw(out); x = 12 * z
    for lab, im in cols:
        out.alpha_composite(im.resize((im.width * z, im.height * z), Image.NEAREST), (x, (18 + Hm - im.height) * z if z > 1 else 18 + Hm - im.height))
        d.text((x, 2), lab, fill=(230, 230, 230), font=font(9 * z if z > 1 else 9)); x += (im.width + 12) * z
    out.save(os.path.join(rev, name))
# ---- stress poses (numpy renderer, proven equal to Blender above)
i8 = r.load_images(True)
def pose(arms=None, legs=None, **kw):
    p = a.stance(); p.update(kw)
    if arms: p.update(arms)
    if legs:
        for s, v in legs.items(): p[f"leg_{s}"] = dict(p[f"leg_{s}"], **v)
    return p
stress = [("neutral", pose()), ("deep crouch", pose(pelvis=(0, 8), chest=(0, 2))),
          ("arms overhead", pose(arms={"arm_n": a.arm(-160, 17, -175, 15, hand=180), "arm_f": a.arm(160, 15, 175, 11, hand=180)})),
          ("cross-body both", pose(arms={"arm_n": a.arm(80, 18, 110, 15, hand=-30), "arm_f": a.arm(-80, 15, -110, 11, hand=-90)})),
          ("high knee near", pose(legs={"n": {"sole": (40, 140), "fs_t": 0.55}}, pelvis=(0, -2))),
          ("wide split", pose(legs={"n": {"sole": (18, 172)}, "f": {"sole": (104, 160)}}, pelvis=(0, 6)))]
out = Image.new("RGBA", (len(stress) * (r.CANVAS[0] * 3 + 8), r.CANVAS[1] * 3 + 24), (24, 24, 30, 255)); d = ImageDraw.Draw(out); stats = {}
for j, (lab, p) in enumerate(stress):
    ch, order, errs = a.solve(p); f = r.render_final(ch, i1, i8, a.slots_of(p), order); hh = holes(f[..., 3] > 0)
    im = Image.new("RGBA", r.CANVAS, BG + (255,)); im.alpha_composite(Image.fromarray(f)); ov = np.zeros_like(f); ov[hh] = (255, 0, 0, 255)
    im.alpha_composite(Image.fromarray(ov)); out.alpha_composite(im.resize((r.CANVAS[0] * 3, r.CANVAS[1] * 3), Image.NEAREST), (j * (r.CANVAS[0] * 3 + 8), 22))
    stats[lab] = int(hh.sum()); d.text((j * (r.CANVAS[0] * 3 + 8) + 4, 4), f"{lab}  enclosed gaps(red): {stats[lab]}", fill=(255, 230, 120), font=font(13))
out.save(os.path.join(rev, "stress-poses-3x.png")); qa["stress_enclosed_px"] = stats
# ---- contact sheet
keys = {"Idle": [0, 4, 8, 12], "Run": list(range(8)), "BasicPunch": [0, 2, 3, 4, 5, 6, 7, 9, 13]}
rows = []
for nm, idx in keys.items():
    ev = {v: k for k, v in man["animations"][nm]["events"].items()}
    row = Image.new("RGBA", (len(idx) * (FW * 3 + 6) + 6, FH * 3 + 24), (24, 24, 30, 255)); d = ImageDraw.Draw(row)
    for j, i in enumerate(idx):
        row.alpha_composite(tile(finals[nm][i], 3), (6 + j * (FW * 3 + 6), 22)); d.text((6 + j * (FW * 3 + 6), 3), f"{nm} {i}" + (f" [{ev[i]}]" if i in ev else ""), fill=(255, 230, 120), font=font(12))
    rows.append(row)
cs = Image.new("RGBA", (max(rw.width for rw in rows), sum(rw.height for rw in rows)), (24, 24, 30, 255)); y = 0
for rw in rows: cs.alpha_composite(rw, (0, y)); y += rw.height
cs.save(os.path.join(rev, "contact-sheet-3x.png"))
# ---- game-scale preview: every frame at the renderer's real scale (~0.5x, nearest) next to the approved reference at the same scale
GS = 0.5
def gs(img): return img.resize((max(1, int(img.width * GS)), max(1, int(img.height * GS))), Image.NEAREST)
rowsg = [("Idle", finals["Idle"]), ("Run", finals["Run"]), ("BasicPunch", finals["BasicPunch"])]
cw, ch_ = int(FW * GS) + 2, int(FH * GS) + 2
gsheet = Image.new("RGBA", (max(len(f) for _, f in rowsg) * cw + int(ref.width * GS) + 60, 3 * (ch_ + 16) + 8), (44, 52, 40, 255)); d = ImageDraw.Draw(gsheet)
for ri, (nm, frs) in enumerate(rowsg):
    d.text((4, ri * (ch_ + 16) + 2), f"{nm} at game scale (0.5x nearest, {len(frs)} frames)", fill=(230, 230, 230), font=font(9))
    for i, f in enumerate(frs):
        t = Image.new("RGBA", (FW, FH), (0, 0, 0, 0)); t.alpha_composite(Image.fromarray(f[y0:y1, x0:x1])); gsheet.alpha_composite(gs(t), (i * cw, ri * (ch_ + 16) + 14))
gsheet.alpha_composite(gs(ref), (len(finals["Run"]) * 0 + max(len(f) for _, f in rowsg) * cw + 30, 14)); d.text((max(len(f) for _, f in rowsg) * cw + 30, 2), "approved ref", fill=(230, 230, 230), font=font(9))
gsheet.save(os.path.join(rev, "game-scale-preview.png"))

# ---- MP4s at exact fps: left 4x, right ~0.5x game scale shown 4x... and a 1x strip
_FW0, _FH0 = FW, FH
ff = shutil.which("ffmpeg")
for nm, frs in finals.items():
    k = man["animations"][nm]; tmp = os.path.join(work, "mp4_" + nm); cx0, cx1, cy0, cy1, FW, FH, _ox, _oy = clip_crop(nm); shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    seq = (frs * 4) if k["loop"] else (frs + [frs[-1]] * 6) * 2
    for n, f in enumerate(seq):
        src = Image.new("RGB", (FW, FH), BG); src.paste(Image.fromarray(f[cy0:cy1, cx0:cx1]), (0, 0), Image.fromarray(f[cy0:cy1, cx0:cx1]))
        canv = Image.new("RGB", (FW * 4 + FW * 2 + FW + 48, FH * 4), BG)
        canv.paste(src.resize((FW * 4, FH * 4), Image.NEAREST), (0, 0))
        canv.paste(src.resize((FW // 2, FH // 2), Image.BOX).resize((FW * 2, FH * 2), Image.NEAREST), (FW * 4 + 16, FH * 2))
        canv.paste(src, (FW * 6 + 32, FH * 3)); d = ImageDraw.Draw(canv)
        d.text((FW * 4 + 16, 10), f"{nm}  {k['fps']} fps\nleft: 4x inspection\nmiddle: game ~0.5x (shown 4x)\nright: 1x native", fill=(220, 220, 220), font=font(15))
        src.save(os.path.join(tmp, f"{n:04d}.png")) if False else canv.save(os.path.join(tmp, f"{n:04d}.png"))
    subprocess.run([ff, "-y", "-loglevel", "error", "-framerate", str(k["fps"]), "-i", os.path.join(tmp, "%04d.png"), "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", "-crf", "16", os.path.join(rev, f"{nm}-normal-speed.mp4")], check=True)
FW, FH = _FW0, _FH0
before = json.load(open(os.path.join(work, "protected-before.json"))); now = hashes()
qa["protected_files_unchanged"] = all(now.get(k_) == v for k_, v in before.items())
qa["frame"] = [int(FW), int(FH), float(ox), float(oy)]
json.dump(qa, open(os.path.join(work, "qa.json"), "w"), indent=1)
print(json.dumps({k_: v for k_, v in qa.items() if k_ != "clips"}, indent=1))
for nm, v in qa["clips"].items(): print(nm, "holes", v["enclosed_holes_px"], "sole err", v["max_sole_target_error_px"], "seam", v.get("loop_seam_ok"), "bl-np", max(v["blender_vs_numpy_px"]))

"""Per-direction post step.  set KAI_DIR=east&& python scripts/post.py prep <work>   |   python scripts/post.py final <work>
final: sheets/*.png + manifest.json, QA numbers, review images and normal-speed MP4s (ffmpeg)."""
import json, os, shutil, subprocess, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import danim as a, drig as r
D = r.DIRECTION; DP = r.DIR_PATH; KAI = os.path.abspath(os.path.join(HERE, "..", ".."))
mode, work0 = sys.argv[1], sys.argv[2]; work = os.path.join(work0, D); os.makedirs(work, exist_ok=True)

def font(n):
    try: return ImageFont.truetype("arial.ttf", n)
    except OSError: return ImageFont.load_default()

if mode == "prep":
    os.makedirs(os.path.join(work, "tex8"), exist_ok=True)
    for img in {p["img"] for p in r.PARTS}:
        Image.fromarray(r.prefilter8(np.array(Image.open(os.path.join(r.PARTS_DIR, img)).convert("RGBA")))).save(os.path.join(work, "tex8", img))
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

def gap_stats(al):
    """enclosed background regions: (total px, thin px = components whose narrow side is <= 3 px, largest thin component)."""
    h = holes(al); seen = np.zeros_like(h); tot = 0; thin = 0; big_thin = 0
    for y, x in zip(*np.nonzero(h)):
        if seen[y, x]: continue
        qd = deque([(y, x)]); seen[y, x] = True; pts = []
        while qd:
            yy, xx = qd.popleft(); pts.append((yy, xx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                Y, X = yy + dy, xx + dx
                if 0 <= Y < h.shape[0] and 0 <= X < h.shape[1] and h[Y, X] and not seen[Y, X]: seen[Y, X] = True; qd.append((Y, X))
        ys = [p[0] for p in pts]; xs = [p[1] for p in pts]; tot += len(pts)
        if min(max(ys) - min(ys) + 1, max(xs) - min(xs) + 1) <= 3: thin += len(pts); big_thin = max(big_thin, len(pts))
    return tot, thin, big_thin

data = json.load(open(os.path.join(DP, "rig", "anim-data.json"))); vf = json.load(open(os.path.join(work, "verify.json")))
i1 = r.load_images(); qa = {"direction": D, "blender_checks": vf["checks"], "clips": {}}; finals = {}; maxe = 0.0; maxd = 0
solved = {f()["name"]: a.solve_clip(f()) for f in a.CLIPS}
for k in data["clips"]:
    nm = k["name"]; frs = []; info = {"frames": len(k["frames"]), "enclosed_px": [], "thin_gap_px": [], "blender_vs_numpy_px": []}
    for i, (ch, order, errs, slots) in enumerate(solved[nm]):
        key = f"{nm}_{i:02d}"
        nat = np.array(Image.open(os.path.join(work, "native", key + ".png")).convert("RGBA")); big = np.array(Image.open(os.path.join(work, "big", key + ".png")).convert("RGBA"))
        assert set(np.unique(nat[..., 3])) <= {0, 255} and set(np.unique(big[..., 3])) <= {0, 255}, key
        fin = r.rotsprite_combine(nat, big); frs.append(fin)
        dd = int((r.render(ch, i1, 1, slots, order) != nat).any(-1).sum()); info["blender_vs_numpy_px"].append(dd); maxd = max(maxd, dd)
        Wm = r.fk(ch)
        for b, hp in vf["heads"][key].items(): maxe = max(maxe, float(np.hypot(*(r.apply(Wm, b, r.BONES[b][1]) - np.array(hp)))))
        t, th, bt = gap_stats(fin[..., 3] > 0); info["enclosed_px"].append(t); info["thin_gap_px"].append(th)
    info["max_planted_sole_error_px"] = round(max((max(f["planted_err"].values()) for f in k["frames"] if f["planted_err"]), default=0.0), 3)
    if k["loop"]:
        dfs = [int((frs[i] != frs[(i + 1) % len(frs)]).any(-1).sum()) for i in range(len(frs))]
        info["loop_seam_changed_px"] = dfs[-1]; info["loop_seam_ok"] = dfs[-1] <= max(dfs[:-1]) * 1.15
    finals[nm] = frs; qa["clips"][nm] = info
qa["fk_parity_max_px"] = round(maxe, 5); qa["blender_vs_numpy_max_px"] = maxd

BASE_CLIPS = ("Idle", "Run", "BasicPunch")   # frame (crop + origin) fixed since B03E; B03G clips carry their own
allf = [f for nm_, v in finals.items() if nm_ in BASE_CLIPS for f in v]
ys, xs = np.nonzero(np.any(np.stack([f[..., 3] > 0 for f in allf]), 0))
x0, x1, y0, y1 = max(0, xs.min() - 2), min(r.CANVAS[0], xs.max() + 3), max(0, ys.min() - 2), min(r.CANVAS[1], ys.max() + 3)
if (x1 - x0) % 2: x0 = max(0, x0 - 1)
FW, FH = x1 - x0, y1 - y0; ox, oy = r.ROOT[0] - x0, r.ROOT[1] - y0
qa["crop_touches_canvas_edge"] = bool(xs.min() <= 0 or xs.max() >= r.CANVAS[0] - 1 or ys.min() <= 0 or ys.max() >= r.CANVAS[1] - 1)
sh = os.path.join(DP, "sheets"); rev = os.path.join(DP, "review"); os.makedirs(sh, exist_ok=True); os.makedirs(rev, exist_ok=True)
man = {"schema": "kyntraze.anim-manifest/0.1-pilot", "character": "kai", "form": ("form-i" if r.FORM == "f1" else "base"), "direction": D, "status": "PRODUCTION CANDIDATE - owner approval required",
       "source_blend": f"rig/kai-{D}.blend", "frame_width": int(FW), "frame_height": int(FH), "origin_px": [float(ox), float(oy)],
       "origin_normalized": [round(ox / FW, 6), round(oy / FH, 6)],
       "origin_meaning": "ground point midway between the stance feet (same convention as SOUTH)",
       "scale_note": "1 px = 1 native art px (approved ~160 px Kai); the game renders Kai at about 0.5x",
       "root_motion": {"baked": False, "contract": "frames are in place; Phaser owns movement, collision, hitboxes and damage; events are frame indices only"},
       "animations": {}}
def clip_crop(nm):
    if nm in BASE_CLIPS: return x0, x1, y0, y1, FW, FH, ox, oy
    yy, xx = np.nonzero(np.any(np.stack([f[..., 3] > 0 for f in finals[nm]]), 0))
    cx0, cx1, cy0, cy1 = max(0, xx.min() - 2), min(r.CANVAS[0], xx.max() + 3), max(0, yy.min() - 2), min(r.CANVAS[1], yy.max() + 3)
    if (cx1 - cx0) % 2: cx0 = max(0, cx0 - 1)
    return cx0, cx1, cy0, cy1, cx1 - cx0, cy1 - cy0, r.ROOT[0] - cx0, r.ROOT[1] - cy0
for nm, frs in finals.items():
    k = next(c for c in data["clips"] if c["name"] == nm); cx0, cx1, cy0, cy1, cw_, ch_, cox, coy = clip_crop(nm); sheet = Image.new("RGBA", (cw_ * len(frs), ch_))
    for i, f in enumerate(frs): sheet.paste(Image.fromarray(f[cy0:cy1, cx0:cx1]), (i * cw_, 0))
    fn = f"sheets/kai_{D}_{nm.lower()}.png"; sheet.save(os.path.join(DP, fn))
    e = {"sheet": fn, "frames": len(frs), "fps": k["fps"], "loop": k["loop"], "duration_s": round(len(frs) / k["fps"], 4), "blender_action": nm, "events": k["events"]}
    if nm not in BASE_CLIPS:
        e.update({"frame_width": int(cw_), "frame_height": int(ch_), "origin_px": [float(cox), float(coy)], "terminal": "hold_last_frame" if nm == "Death" else "once", "root_motion_note": "in place; Death may offset the body from the sim position (knock-back fall), the origin stays the pre-fall ground point"})
        qa["clips"][nm]["frame"] = [int(cw_), int(ch_), float(cox), float(coy)]; qa["clips"][nm]["crop_touches_canvas_edge"] = bool(cx0 <= 0 or cx1 >= r.CANVAS[0] or cy0 <= 0 or cy1 >= r.CANVAS[1])
    if nm == "BasicPunch": e["hit_contract"] = "apply damage and hitstop in Phaser on event 'impact' (0-based frame 5); the animation never applies damage itself"
    man["animations"][nm] = e
json.dump(man, open(os.path.join(DP, "sheets", "manifest.json"), "w"), indent=1)

BG = (40, 40, 50)
def tile(f, z=1):
    im = Image.new("RGBA", (FW, FH), BG + (255,)); im.alpha_composite(Image.fromarray(f[y0:y1, x0:x1])); return im.resize((FW * z, FH * z), Image.NEAREST)
def crop_rgba(f): return Image.fromarray(f[y0:y1, x0:x1])
ref = Image.open(os.path.join(KAI, "references", "kai-160-native-approved-reference.png")).convert("RGBA")
sm = json.load(open(os.path.join(KAI, "production-south-candidate", "sheets", "manifest.json")))
sW, sH = sm["frame_width"], sm["frame_height"]
south0 = Image.open(os.path.join(KAI, "production-south-candidate", sm["animations"]["Idle"]["sheet"])).convert("RGBA").crop((0, 0, sW, sH))
cols = [("approved reference", ref), ("SOUTH idle", south0), (f"{D.upper()} idle", crop_rgba(finals["Idle"][0])), (f"{D.upper()} run 3", crop_rgba(finals["Run"][3])), (f"{D.upper()} punch impact", crop_rgba(finals["BasicPunch"][5]))]
Hm = max(im.height for _, im in cols); Wsum = sum(im.width + 12 for _, im in cols) + 12
for z, name in ((1, "comparison-1x-actual-size.png"), (4, "comparison-4x-inspection.png")):
    out = Image.new("RGBA", (Wsum * z, (Hm + 18) * z), BG + (255,)); d = ImageDraw.Draw(out); x = 12 * z
    for lab, im in cols:
        out.alpha_composite(im.resize((im.width * z, im.height * z), Image.NEAREST), (x, (18 + Hm - im.height) * z)); d.text((x, 2), lab, fill=(230, 230, 230), font=font(9 * z if z > 1 else 9)); x += (im.width + 12) * z
    out.save(os.path.join(rev, name))
# contact sheet
keys = {"Idle": [0, 4, 8, 12], "Run": list(range(8)), "BasicPunch": [0, 2, 3, 4, 5, 6, 7, 9, 13]}; rows = []
for nm, idx in keys.items():
    ev = {v: k for k, v in man["animations"][nm]["events"].items()}
    row = Image.new("RGBA", (len(idx) * (FW * 3 + 6) + 6, FH * 3 + 24), (24, 24, 30, 255)); d = ImageDraw.Draw(row)
    for j, i in enumerate(idx):
        row.alpha_composite(tile(finals[nm][i], 3), (6 + j * (FW * 3 + 6), 22)); d.text((6 + j * (FW * 3 + 6), 3), f"{D} {nm} {i}" + (f" [{ev[i]}]" if i in ev else ""), fill=(255, 230, 120), font=font(12))
    rows.append(row)
cs = Image.new("RGBA", (max(rw.width for rw in rows), sum(rw.height for rw in rows)), (24, 24, 30, 255)); yy = 0
for rw in rows: cs.alpha_composite(rw, (0, yy)); yy += rw.height
cs.save(os.path.join(rev, "contact-sheet-3x.png"))
# game scale + playfield
GS = 0.5
def gs(img): return img.resize((max(1, int(img.width * GS)), max(1, int(img.height * GS))), Image.NEAREST)
arena = Image.open(os.path.join(KAI, "references", "kai-160-arena-reference.png")).convert("RGBA").crop((0, 192, 384, 336))
field = Image.new("RGBA", (480, 288))
for ty in range(0, 288, 144):
    for tx in range(0, 480, 384): field.paste(arena, (tx, ty))
field = field.crop((0, 0, 480, 270)); gw, gh = int(FW * GS), int(FH * GS)
rowsg = [("Idle", finals["Idle"]), ("Run", finals["Run"]), ("BasicPunch", finals["BasicPunch"])]
cw = gw + 2; gsheet = Image.new("RGBA", (max(len(f) for _, f in rowsg) * cw + 8, 3 * (gh + 16) + 8), (44, 52, 40, 255)); d = ImageDraw.Draw(gsheet)
for ri, (nm, frs) in enumerate(rowsg):
    d.text((4, ri * (gh + 16) + 2), f"{D.upper()} {nm} at game scale (0.5x nearest)", fill=(230, 230, 230), font=font(9))
    for i, f in enumerate(frs): gsheet.alpha_composite(gs(crop_rgba(f)), (i * cw, ri * (gh + 16) + 14))
gsheet.save(os.path.join(rev, "game-scale-preview.png"))
pf = field.copy()
for n, (nm, idx) in enumerate((("Idle", 0), ("Run", 1), ("Run", 4), ("BasicPunch", 4), ("BasicPunch", 5), ("BasicPunch", 7))):
    s = gs(crop_rgba(finals[nm][idx])); pf.alpha_composite(s, (24 + n * 76, 120 - s.height // 2 + (n % 2) * 40))
pf = pf.resize((pf.width * 2, pf.height * 2), Image.NEAREST); ImageDraw.Draw(pf).text((6, 4), f"{D.upper()} in a KYNTRAZE-style playfield, effective game scale (0.5x), shown 2x", fill=(220, 220, 220), font=font(14))
pf.save(os.path.join(rev, "playfield-preview.png"))
# stress poses
def P(**kw):
    p = a.stance()
    for k_, v in kw.items(): p[k_] = v
    return p
L_, R_ = a.LEAD, a.REAR; sx = a.SX
def sole(s, dx, dy): return {"sole": (a.SOLES[s][0] + dx, a.SOLES[s][1] + dy)}
stress = [("stance", P()), ("deep crouch", P(pelvis=(0, a.PEL_DY + 8), chest=(0, 2))), ("wide split", P(leg_n=sole("n", -8 * 1, 0), leg_f=sole("f", 8, 0), pelvis=(0, a.PEL_DY + 4))),
          ("high knee", P(leg_f={"sole": (a.SOLES["f"][0], a.SOLES["f"][1] - 26), "planted": False})),
          ("arms raised", P(**{f"arm_{L_}": a.arm(sx * 150, a.LU[L_], sx * 175, a.LF[L_], 0.0, "guard"), f"arm_{R_}": a.arm(-sx * 150, a.LU[R_], -sx * 175, a.LF[R_], 0.0, "side")})),
          ("cross-body", P(**{f"arm_{L_}": a.arm(-sx * 40, a.LU[L_], -sx * 100, a.LF[L_], 0.0, "side"), f"arm_{R_}": a.arm(sx * 40, a.LU[R_], sx * 100, a.LF[R_], 0.0, "side")})),
          ("full extension", solved["BasicPunch"][5] and a.punch()["frames"][5])]
out = Image.new("RGBA", (len(stress) * (FW * 3 + 8), FH * 3 + 24), (24, 24, 30, 255)); dd_ = ImageDraw.Draw(out); st = {}
from drig import render_final
i8 = r.load_images(True)
for j, (lab, p) in enumerate(stress):
    ch, order, errs = a.solve(p); f = render_final(ch, i1, i8, a.slots_of(p), order); t_, th_, _ = gap_stats(f[..., 3] > 0); st[lab] = {"enclosed_px": t_, "thin_px": th_}
    out.alpha_composite(tile(f, 3), (j * (FW * 3 + 8), 22)); dd_.text((j * (FW * 3 + 8) + 4, 4), f"{lab} (thin gap px {th_})", fill=(255, 230, 120), font=font(12))
out.save(os.path.join(rev, "stress-poses-3x.png")); qa["stress"] = st
# MP4s at exact fps: left 4x, middle 0.5x shown 4x, right 1x
ff = shutil.which("ffmpeg")
_FW0, _FH0 = FW, FH
for nm, frs in finals.items():
    k = man["animations"][nm]; tmp = os.path.join(work, "mp4_" + nm); cx0, cx1, cy0, cy1, FW, FH, _ox, _oy = clip_crop(nm); shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    seq = (frs * 4) if k["loop"] else (frs + [frs[-1]] * 6) * 2
    for n, f in enumerate(seq):
        src = Image.new("RGB", (FW, FH), BG); sm_ = Image.fromarray(f[cy0:cy1, cx0:cx1]); src.paste(sm_, (0, 0), sm_)
        canv = Image.new("RGB", (FW * 4 + FW * 2 + FW + 48, FH * 4), BG); canv.paste(src.resize((FW * 4, FH * 4), Image.NEAREST), (0, 0))
        canv.paste(src.resize((FW // 2, FH // 2), Image.BOX).resize((FW * 2, FH * 2), Image.NEAREST), (FW * 4 + 16, FH * 2)); canv.paste(src, (FW * 6 + 32, FH * 3))
        ImageDraw.Draw(canv).text((FW * 4 + 16, 10), f"{D.upper()} {nm}  {k['fps']} fps\nleft: 4x\nmiddle: game ~0.5x (shown 4x)\nright: 1x", fill=(220, 220, 220), font=font(15))
        canv.save(os.path.join(tmp, f"{n:04d}.png"))
    subprocess.run([ff, "-y", "-loglevel", "error", "-framerate", str(k["fps"]), "-i", os.path.join(tmp, "%04d.png"), "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", "-crf", "17", os.path.join(rev, f"{nm}-normal-speed.mp4")], check=True)
FW, FH = _FW0, _FH0
qa["frame"] = [int(FW), int(FH), float(ox), float(oy)]
json.dump(qa, open(os.path.join(work, "qa.json"), "w"), indent=1)
print(json.dumps({k_: v for k_, v in qa.items() if k_ not in ("clips", "stress")}))
for nm, v in qa["clips"].items(): print(D, nm, "thin gap px", v["thin_gap_px"], "| enclosed", v["enclosed_px"], "| sole err", v["max_planted_sole_error_px"], "| seam", v.get("loop_seam_ok"), "| bl-np", max(v["blender_vs_numpy_px"]))
print(D, "stress", st)

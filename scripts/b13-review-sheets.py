"""B13 owner review sheets from the REAL exported game sprites (public/art/kai, kai-f1, kai-f2, kai-f3) and the hand-anchor table:
  python scripts/b13-review-sheets.py     -> art/characters/kai/review/b13/*.png
01 silhouettes Base / Form I / Form II / Form III per facing at 1x game size (0.5 scale) and 3x diagnostic (Idle, ground line marked: Form III hovers)
02 Form III four facings (Idle, Dragon-free poses: punch impact, Silver Rift hold + release, Instinct strike, Transform reveal) at 3x + face/hair crops at 6x
03 Form III motion contact sheets per facing: Idle, IdleSpecial, Run, Dash, Hurt, Death, Transform (every frame, 2x)
04 hand-origin overlays: Silver Rift hold + release midpoint, Instinct Reversal strike fists (anchors from kai-anchors.json)"""
import json, os
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PUB = os.path.join(R, "public", "art"); OUT = os.path.join(R, "art", "characters", "kai", "review", "b13"); os.makedirs(OUT, exist_ok=True)
ROOTS = {"base": "kai", "f1": "kai-f1", "f2": "kai-f2", "f3": "kai-f3"}; DIRS = ["south", "north", "east", "west"]; BG = (34, 38, 52, 255)
A = json.load(open(os.path.join(PUB, "kai-anchors.json")))
_man = {}
def man(form, d):
    k = (form, d)
    if k not in _man: _man[k] = json.load(open(os.path.join(PUB, ROOTS[form], d, "manifest.json")))
    return _man[k]
def frame(form, d, clip, i):
    m = man(form, d); a = m["animations"][clip]; fw, fh = a.get("frame_width", m["frame_width"]), a.get("frame_height", m["frame_height"]); ox, oy = a.get("origin_px", m["origin_px"])
    im = Image.open(os.path.join(PUB, ROOTS[form], d, a["sheet"])).convert("RGBA"); cols = im.width // fw; r, c = divmod(i, cols)
    return im.crop((c * fw, r * fh, c * fw + fw, r * fh + fh)), ox, oy
def place(canvas, form, d, clip, i, x, y, z=1):
    im, ox, oy = frame(form, d, clip, i); im = im.resize((im.width * z, im.height * z), Image.NEAREST); canvas.alpha_composite(im, (int(x - ox * z), int(y - oy * z)))
    return lambda px, py: (x + px * z, y + py * z)
def label(dr, xy, t, c=(255, 226, 140)): dr.text(xy, t, fill=c)
def ground(dr, x0, x1, y): dr.line((x0, y, x1, y), fill=(255, 90, 90, 255), width=1)
EV = lambda d, clip: man("f3", d)["animations"][clip]["events"]

# 01 silhouettes ---------------------------------------------------------------------------------------------------------------------------------
for z, name in ((1, "01-silhouette-base-f1-f2-f3-1x-gamesize"), (3, "01-silhouette-base-f1-f2-f3-3x-diagnostic")):
    s = 0.5 * z; cw = int(190 * s) + 20; W = 4 * 4 * cw + 20; H = int(240 * s) + 30 + int(240 * s) + 20
    cv = Image.new("RGBA", (W, H), BG); dr = ImageDraw.Draw(cv); x = 10
    for d in DIRS:
        for form in ("base", "f1", "f2", "f3"):
            for row, sil in ((0, None), (1, (255, 205, 70))):
                im, ox, oy = frame(form, d, "Idle", 0)
                big = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.NEAREST if s >= 1 else Image.BOX)
                if sil: a = big.split()[3].point(lambda v: 255 if v > 90 else 0); big = Image.merge("RGBA", (Image.new("L", big.size, 255), Image.new("L", big.size, 210), Image.new("L", big.size, 70), a))
                gy = int(25 + row * (int(240 * s) + 10) + int(200 * s)); cv.alpha_composite(big, (int(x + cw / 2 - ox * s), int(gy - oy * s)))
                ground(dr, x + 4, x + cw - 4, gy)
            label(dr, (x + 4, 4), f"{d[:1].upper()} {form.upper()}"); x += cw
    cv.save(os.path.join(OUT, name + ".png"))
# 02 Form III four directions + face crops -----------------------------------------------------------------------------------------------------
z = 3; STEPS = (("Idle", 0, "Idle (hover)"), ("BasicPunch", 5, "Punch impact"), ("Beam", EV("south", "Beam")["hold_end"], "Rift hold"), ("Beam", EV("south", "Beam")["release"], "Rift release"), ("Sphere", EV("south", "Sphere")["strike_a"], "Instinct strike"), ("Transform", EV("south", "Transform")["form_commit"], "Reveal"))
cv = Image.new("RGBA", (len(STEPS) * 4 * 92 * z + 20, 190 * z + 40), BG); dr = ImageDraw.Draw(cv); x = 10
for d in DIRS:
    for clip, i, nm in STEPS:
        i = {"Beam": i}.get(clip, i)
        if clip == "Beam": i = EV(d, "Beam")["hold_end"] if nm == "Rift hold" else EV(d, "Beam")["release"]
        if clip == "Sphere": i = EV(d, "Sphere")["strike_a"]
        if clip == "Transform": i = EV(d, "Transform")["form_commit"]
        gy = 30 + 170 * z; place(cv, "f3", d, clip, i, x + 46 * z, gy, z); ground(dr, x, x + 92 * z - 6, gy); label(dr, (x, 6), f"{d} {nm}"); x += 92 * z
cv.save(os.path.join(OUT, "02-form3-four-directions-3x.png"))
z = 6; cv = Image.new("RGBA", (4 * 80 * z // 2 + 20, 80 * z // 2 * 2 + 40), BG); dr = ImageDraw.Draw(cv); x = 10
for d in DIRS:
    for form, yy in (("f2", 22), ("f3", 22 + 40 * z)):
        im, ox, oy = frame(form, d, "Idle", 0); w, h = im.size; crop = im.crop((int(ox - 40), 0, int(ox + 30), 62)).resize((70 * z // 2, 62 * z // 2), Image.NEAREST); cv.alpha_composite(crop, (x, yy))
        label(dr, (x, yy - 14), f"{d} {form.upper()} head")
    x += 80 * z // 2
cv.save(os.path.join(OUT, "02b-form2-vs-form3-head-6x.png"))
# 03 motion contact sheets per facing ------------------------------------------------------------------------------------------------------------
z = 2
for d in DIRS:
    rows = [("Idle", None), ("IdleSpecial", None), ("Run", None), ("Dash", None), ("Hurt", None), ("Death", None), ("Transform", None)]
    n = max(man("f3", d)["animations"][c]["frames"] for c, _ in rows); cw_, ch_ = 110 * z, 190 * z
    cv = Image.new("RGBA", (n * cw_ + 80, len(rows) * ch_ + 10), BG); dr = ImageDraw.Draw(cv)
    for ri, (clip, _) in enumerate(rows):
        a = man("f3", d)["animations"][clip]; label(dr, (2, ri * ch_ + 4), clip)
        for i in range(a["frames"]): gy = ri * ch_ + ch_ - 12; place(cv, "f3", d, clip, i, 76 + i * cw_ + cw_ // 2, gy, z); ground(dr, 76 + i * cw_, 76 + (i + 1) * cw_ - 4, gy)
    cv.save(os.path.join(OUT, f"03-motion-{d}-2x.png"))
# 04 hand-origin overlays --------------------------------------------------------------------------------------------------------------------------
z = 3; cv = Image.new("RGBA", (4 * 4 * 100 * z + 20, 200 * z + 50), BG); dr = ImageDraw.Draw(cv); x = 10
for d in DIRS:
    for clip, i, what in (("Beam", EV(d, "Beam")["hold_end"], "Rift charge hold (midpoint = red)"), ("Beam", EV(d, "Beam")["release"], "Rift release (muzzle = red)"), ("Sphere", EV(d, "Sphere")["strike_a"], "Instinct strike A"), ("Sphere", EV(d, "Sphere")["strike_b"], "Instinct strike B")):
        t = place(cv, "f3", d, clip, i, x + 50 * z, 40 + 185 * z, z); fr = A["forms"]["f3"][d][clip][i]
        pts = [fr["n"], fr["f"]] + ([fr["m"]] if clip == "Beam" else [])
        for k, p in enumerate(pts):
            cx, cy = t(*p); col = (255, 80, 80) if clip == "Beam" and k == 2 else (80, 255, 200); r = 6 if clip == "Beam" and k == 2 else 4
            dr.ellipse((cx - r, cy - r, cx + r, cy + r), outline=col, width=2)
        label(dr, (x, 6), f"{d}: {what}"); label(dr, (x, 20), f"frame {i}", (180, 200, 220)); x += 100 * z
cv.save(os.path.join(OUT, "04-hand-origin-overlays-3x.png"))
print("ok", sorted(os.listdir(OUT)))

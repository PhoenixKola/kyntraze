"""B12 owner review sheets from the REAL exported game sprites (public/art/kai, kai-f1, kai-f2) and the hand-anchor table:
  python scripts/b12-review-sheets.py     -> art/characters/kai/review/b12/*.png
01 silhouette comparison Base / Form I / Form II at 1x game size (0.5 scale) and 3x diagnostic, 02 Form II four directions (Idle, punch impact, Beam release, Transform commit),
03 transformation clip strips, 04 hand-origin overlays (Dragonfang fist at the punch impact frame, Cometbreaker midpoint at the beam release) with the sim's anchor numbers."""
import json, os
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PUB = os.path.join(R, "public", "art"); OUT = os.path.join(R, "art", "characters", "kai", "review", "b12"); os.makedirs(OUT, exist_ok=True)
ROOTS = {"base": "kai", "f1": "kai-f1", "f2": "kai-f2"}; DIRS = ["south", "north", "east", "west"]; BG = (34, 38, 52, 255)
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
def place(canvas, form, d, clip, i, x, y, z=1, sil=None):
    """Put the frame so its ground origin lands on (x, y); returns the sprite-px -> canvas transform."""
    im, ox, oy = frame(form, d, clip, i)
    if sil: a = im.split()[3]; im = Image.merge("RGBA", (Image.new("L", im.size, sil[0]), Image.new("L", im.size, sil[1]), Image.new("L", im.size, sil[2]), a))
    im = im.resize((im.width * z, im.height * z), Image.NEAREST); canvas.alpha_composite(im, (int(x - ox * z), int(y - oy * z))); return lambda px, py: (x + px * z, y + py * z)
def label(dr, xy, t, c=(255, 226, 140)): dr.text(xy, t, fill=c)
# 01 silhouettes ---------------------------------------------------------------------------------------------------------------------------------
for z, name in ((1, "01-silhouette-base-f1-f2-1x-gamesize"), (3, "01-silhouette-base-f1-f2-3x-diagnostic")):
    s = 0.5 * z; cw = int(190 * s) + 20; W = 4 * 3 * cw + 20; H = int(240 * s) + 30 + int(240 * s) + 20
    cv = Image.new("RGBA", (W, H), BG); dr = ImageDraw.Draw(cv); x = 10
    for d in DIRS:
        for form in ("base", "f1", "f2"):
            for row, sil in ((0, None), (1, (255, 205, 70))):
                im, ox, oy = frame(form, d, "Idle", 0); k = int(round(s * 2)) / 2 if False else s
                big = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.NEAREST if s >= 1 else Image.BOX)
                if sil: a = big.split()[3].point(lambda v: 255 if v > 90 else 0); big = Image.merge("RGBA", (Image.new("L", big.size, 255), Image.new("L", big.size, 210), Image.new("L", big.size, 70), a))
                cv.alpha_composite(big, (int(x + cw / 2 - ox * s), int(25 + row * (int(240 * s) + 10) + int(200 * s) - oy * s)))
            label(dr, (x + 4, 4), f"{d[:1].upper()} {form.upper()}"); x += cw
    cv.save(os.path.join(OUT, name + ".png"))
# 02 Form II four directions ---------------------------------------------------------------------------------------------------------------------
z = 3; cw, ch = 150 * z // 1, 190 * z; cv = Image.new("RGBA", (4 * 4 * 130 * z // 2 + 20, 4 * 0 + 190 * z + 40), BG); dr = ImageDraw.Draw(cv); x = 10
cv = Image.new("RGBA", (16 * 100 * z // 2 + 20, 190 * z // 2 * 1 + 40), BG)
cv = Image.new("RGBA", (16 * 75 * z // 1 + 20, 190 * z + 40), BG); dr = ImageDraw.Draw(cv); x = 10
for d in DIRS:
    for clip, i, nm in (("Idle", 0, "Idle"), ("BasicPunch", 5, "Dragonfang strike"), ("Beam", 12, "Cometbreaker fire"), ("Transform", 8, "Reveal")):
        place(cv, "f2", d, clip, i, x + 38 * z, 30 + 170 * z, z); label(dr, (x, 6), f"{d} {nm}"); x += 75 * z
cv.save(os.path.join(OUT, "02-form2-four-directions-3x.png"))
# 03 transform strips (south + east) -------------------------------------------------------------------------------------------------------------
z = 2
for d in ("south", "east"):
    m = man("f2", d)["animations"]["Transform"]; n = m["frames"]; cv = Image.new("RGBA", (n * 70 * z + 20, 190 * z + 30), BG); dr = ImageDraw.Draw(cv)
    for i in range(n): place(cv, "f2", d, "Transform", i, 12 + i * 70 * z + 32 * z, 20 + 172 * z, z); label(dr, (12 + i * 70 * z, 4), f"{i}" + (" COMMIT" if i == m["events"].get("form_commit") else ""))
    cv.save(os.path.join(OUT, f"03-transform-clip-{d}-2x.png"))
# 04 hand-origin overlays --------------------------------------------------------------------------------------------------------------------------
z = 3; cv = Image.new("RGBA", (4 * 2 * 100 * z + 20, 200 * z + 50), BG); dr = ImageDraw.Draw(cv); x = 10
for d in DIRS:
    for clip, i, what in (("BasicPunch", 5, "Dragonfang origin (leading fist)"), ("Beam", 12, "Cometbreaker origin (fist midpoint)")):
        t = place(cv, "f2", d, clip, i, x + 50 * z, 40 + 185 * z, z); fr = A["forms"]["f2"][d][clip][i]
        pts = [fr["n"], fr["f"]] if clip == "BasicPunch" else [fr["n"], fr["f"], fr["m"]]
        for k, p in enumerate(pts):
            cx, cy = t(*p); col = (255, 80, 80) if clip == "Beam" and k == 2 else (80, 255, 200); r = 6 if clip == "Beam" and k == 2 else 4
            dr.ellipse((cx - r, cy - r, cx + r, cy + r), outline=col, width=2)
        label(dr, (x, 6), f"{d}: {what}"); label(dr, (x, 20), f"frame {i}", (180, 200, 220)); x += 100 * z
cv.save(os.path.join(OUT, "04-hand-origin-overlays-3x.png"))
print("ok", sorted(os.listdir(OUT)))

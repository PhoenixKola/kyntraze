"""Review sheets for the Seraph + elites: gameplay scale (1x = shipped 0.5 display) and 3x, on the arena floor and a light diagnostic background, beside Kai Base and the B07 enemies, plus the 16-frame contact sheet.
  python scripts/b08-elite-review-sheets.py"""
import json, os
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.join(R, "public", "art"); O = os.path.join(R, "art", "bosses", "review"); os.makedirs(O, exist_ok=True)
floor = Image.open(os.path.join(P, "arena", "floor-0.png")).convert("RGBA")


def tile(w, h):
    bg = Image.new("RGBA", (w, h))
    for y in range(0, h, 128):
        for x in range(0, w, 128): bg.paste(floor, (x, y))
    bg.alpha_composite(Image.new("RGBA", (w, h), (4, 9, 18, 117))); return bg


def frame(folder, name, i):
    m = json.load(open(os.path.join(P, folder, name + ".json"))); sh = Image.open(os.path.join(P, folder, name + ".png")).convert("RGBA"); fw = m["frame_width"]
    return sh.crop((i * fw, 0, (i + 1) * fw, m["frame_height"])), m["origin_px"]


def kai():
    sh = Image.open(os.path.join(P, "kai", "east", "sheets", "kai_east_idle.png")).convert("RGBA"); return sh.crop((0, 0, 124, 165)), (50, 161)


def place(c, img, org, x, y, s):
    im = img.resize((round(img.size[0] * s), round(img.size[1] * s)), Image.NEAREST); c.alpha_composite(im, (round(x - org[0] * s), round(y - org[1] * s)))


def lineup(name, items, scale, bg):
    n = len(items); step = int(260 * scale / 0.5 * 0.55); w = step * n + 40; h = int(300 * scale / 0.5 * 0.62) + 60
    c = tile(w, h) if bg == "arena" else Image.new("RGBA", (w, h), (214, 218, 226, 255))
    for i, (folder, nm, idx) in enumerate(items):
        img, org = kai() if nm == "kai" else frame(folder, nm, idx); place(c, img, org, step * (i + 0.5) + 20, h - 30, scale)
    ImageDraw.Draw(c).text((8, 6), f"{name}: display scale x{scale * 2:.0f} of shipped 0.5", fill=(235, 235, 235, 255)); return c.convert("RGB")


SER = [("enemies", "kai", 0), ("bosses", "seraph", 0), ("enemies", "ranged", 0), ("enemies", "bruiser", 0)]
ELI = [("enemies", "kai", 0), ("enemies", "aegis", 0), ("enemies", "cantor", 0), ("enemies", "pursuer", 0), ("enemies", "ranged", 0), ("enemies", "bruiser", 0)]
for tag, items in (("seraph", SER), ("elites", ELI)):
    lineup(f"{tag} 1x", items, 0.5, "arena").save(os.path.join(O, f"{tag}-1x-arena.png"))
    lineup(f"{tag} 3x", items, 1.5, "arena").save(os.path.join(O, f"{tag}-3x-arena.png"))
    lineup(f"{tag} 3x light", items, 1.5, "light").save(os.path.join(O, f"{tag}-3x-light-diagnostic.png"))
# contact sheets: 16 seraph frames (2 rows) and the two elite strips
for nm, folder, rows in (("seraph", "bosses", 2), ("aegis", "enemies", 1), ("cantor", "enemies", 1)):
    sh = Image.open(os.path.join(P, folder, nm + ".png")).convert("RGBA"); m = json.load(open(os.path.join(P, folder, nm + ".json"))); fw, fh, n = m["frame_width"], m["frame_height"], m["frames"]; per = n // rows
    c = tile(fw * per, fh * rows)
    for i in range(n): c.alpha_composite(sh.crop((i * fw, 0, (i + 1) * fw, fh)), ((i % per) * fw, (i // per) * fh))
    d = ImageDraw.Draw(c)
    for i in range(n): d.text(((i % per) * fw + 4, (i // per) * fh + 3), str(i), fill=(255, 255, 255, 255)); d.line([((i % per) * fw + m["origin_px"][0] - 6, (i // per) * fh + m["origin_px"][1]), ((i % per) * fw + m["origin_px"][0] + 6, (i // per) * fh + m["origin_px"][1])], fill=(0, 255, 120, 255))
    c.convert("RGB").save(os.path.join(O, f"{'seraph' if nm == 'seraph' else 'elites'}-contact-{nm}.png"))
print("written", O)

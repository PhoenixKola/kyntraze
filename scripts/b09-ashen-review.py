"""Review sheets for the Ashen Reliquary art: a 6x6 seam test of the floor and a composed 960x540 mock (+640x360) with props at their footprints next to Kai and a Warden frame."""
import json, os, random
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(R, "public", "art", "arenas", "ashen"); O = os.path.join(R, "art", "arenas", "ashen", "review"); os.makedirs(O, exist_ok=True)
T = [Image.open(os.path.join(A, f"floor-{i}.png")).convert("RGB") for i in range(8)]
W = {0: 3, 1: 3, 2: 3, 3: 1, 4: 1, 7: 1}
def floor(w, h, seed=3, lanes=True):
    rnd = random.Random(seed); im = Image.new("RGB", (w, h)); pool = [i for i, n in W.items() for _ in range(n)]
    for ty in range(0, h // 128 + 1):
        for tx in range(0, w // 128 + 1):
            i = rnd.choice(pool); t = T[i]
            if lanes and ty == 3 and 1 <= tx <= 6: t = T[5]
            if lanes and tx == 4 and 1 <= ty <= 5: t = T[5].rotate(90)
            if lanes and tx == 4 and ty == 3: t = T[6]
            if rnd.random() > .5 and i not in (5, 6): t = t.transpose(Image.FLIP_LEFT_RIGHT)
            im.paste(t, (tx * 128, ty * 128))
    return im
floor(768, 768, 5, False).save(os.path.join(O, "floor-seam-test.png"))
big = floor(960, 540, 7)
P = json.load(open(os.path.join(A, "props.json")))["props"]
def place(im, name, x, y, frame=0):   # x,y = footprint top-left
    p = P[name]; s = Image.open(os.path.join(A, p["file"])).convert("RGBA")
    if p.get("frames"): fw = p["frame_width"]; s = s.crop((frame * fw, 0, (frame + 1) * fw, s.size[1]))
    k = p["scale"]; s = s.resize((round(s.size[0] * k), round(s.size[1] * k)), Image.LANCZOS)
    fx, fy = x + p["footprint"]["w"] / 2 if "footprint" in p else x, y + p["footprint"]["h"] if "footprint" in p else y
    im.alpha_composite(s, (round(fx - p["origin"][0] * k), round(fy - p["origin"][1] * k)))
def mock(w, h):
    im = floor(960, 540, 7).convert("RGBA"); d = Image.new("RGBA", im.size, (4, 3, 2, 70)); im.alpha_composite(d)
    sig = Image.open(os.path.join(A, "props", "reliquary-sigil.png")); im.alpha_composite(sig, (480 - sig.size[0] // 2, 300 - sig.size[1] // 2))
    for n, (x, y) in {"rubble-a": (120, 360), "bones": (660, 400), "crack-a": (230, 120), "ash-a": (700, 190), "crack-b": (560, 90), "ash-b": (130, 440)}.items(): place(im, n, x, y)
    for n, (x, y, f) in {"pylon": (110, 160, 1), "fallen-column": (640, 70, 0), "sarcophagus": (700, 330, 0), "monolith": (400, 70, 0), "broken-statue": (160, 360, 0), "brazier": (520, 430, 0), "pylon ": (800, 190, 0)}.items(): place(im, n.strip(), x, y, f)
    kai = Image.open(os.path.join(R, "public", "art", "kai", "east", "sheets", "kai_east_idle.png")).convert("RGBA").crop((0, 0, 124, 165)); kai = kai.resize((62, 82), Image.NEAREST); im.alpha_composite(kai, (478 - 31, 316 - 80))
    wd = Image.open(os.path.join(R, "public", "art", "bosses", "warden.png")).convert("RGBA"); m = json.load(open(os.path.join(R, "public", "art", "bosses", "warden.json"))); fw, fh = m["frame_width"], m["frame_height"]
    wd = wd.crop((0, 0, fw, fh)); wd = wd.resize((fw // 2, fh // 2), Image.LANCZOS); im.alpha_composite(wd, (330 - m["origin_px"][0] // 2, 470 - m["origin_px"][1] // 2))
    return im.convert("RGB")
m = mock(960, 540); m.save(os.path.join(O, "mock-960x540.png")); m.resize((640, 360), Image.LANCZOS).save(os.path.join(O, "mock-640x360.png"))
sheet = Image.new("RGB", (1400, 560), (18, 16, 14)); x = 10
for n in ["pylon", "fallen-column", "broken-statue", "sarcophagus", "monolith", "brazier"]:
    p = P[n]; s = Image.open(os.path.join(A, p["file"])).convert("RGBA"); bg = Image.new("RGBA", s.size, (60, 56, 50, 255)); bg.alpha_composite(s); sheet.paste(bg.convert("RGB"), (x, 10)); x += s.size[0] + 10
sheet.save(os.path.join(O, "props-sheet.png"))

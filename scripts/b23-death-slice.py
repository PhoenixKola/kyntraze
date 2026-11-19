"""Slices the ImageGen death strips (art/enemies/death/source/death_<kind>.png: six equal cells on magenta) onto each enemy's own canvas:
  classic six  -> public/art/enemies/death/<kind>.png   one 6-frame sheet, frame size = the enemy sheet's (so origin / scale / flip stay identical)
  realm mobs   -> public/art/b22/<kind>_d0..d5.png        six images, canvas = the sprite's own
Each strip is scaled so its first-frame body matches the live sprite's body height and anchored on the first frame's baseline / centre, so the ghost starts exactly where the living enemy stood."""
import json, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, "art", "enemies", "death", "source"); PUB = os.path.join(ROOT, "public", "art")
CLASSIC = ["pursuer", "flanker", "bruiser", "ranged", "aegis", "cantor"]; REALM = ["sky_lancer", "halo_scribe", "citadel_bulwark", "rift_mimic", "phase_harrier", "singularity_husk"]
def key(img):
    a = np.array(img.convert("RGBA")).astype(np.int16); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    k = (r > 215) & (b > 215) & (g < 70) & (np.abs(r - b) < 40)      # strict: the enemies' own pink glow must survive
    a[..., 3] = np.where(k, 0, 255); near = np.zeros_like(k)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): near |= np.roll(np.roll(k, dy, 0), dx, 1)
    soft = near & ~k & (np.abs(r - b) < 45) & (g < 110) & (r > 190); a[..., 3][soft] = 0
    return Image.fromarray(a.astype(np.uint8), "RGBA")
def box(im): return im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
def frames(kind, size, ob):
    strip = key(Image.open(os.path.join(SRC, f"death_{kind}.png"))); W, H = strip.size; cw = W // 6; cells = [strip.crop((i * cw, 0, (i + 1) * cw, H)) for i in range(6)]
    b0 = box(cells[0]); s = (ob[3] - ob[1]) / (b0[3] - b0[1]); cx0, base0 = (b0[0] + b0[2]) / 2, b0[3]; ocx, obase = (ob[0] + ob[2]) / 2, ob[3]; out = []
    for c in cells:
        sc = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS); canvas = Image.new("RGBA", size, (0, 0, 0, 0))
        canvas.alpha_composite(sc, (round(ocx - cx0 * s), round(obase - base0 * s))) if True else None; out.append(canvas)
    return out
for k in CLASSIC:
    if not os.path.exists(os.path.join(SRC, f"death_{k}.png")): print("missing", k); continue
    m = json.load(open(os.path.join(PUB, "enemies", f"{k}.json"))); fw, fh = m["frame_width"], m["frame_height"]; f0 = Image.open(os.path.join(PUB, "enemies", f"{k}.png")).convert("RGBA").crop((0, 0, fw, fh)); fr = frames(k, (fw, fh), box(f0))
    sheet = Image.new("RGBA", (fw * 6, fh), (0, 0, 0, 0)); [sheet.alpha_composite(f, (i * fw, 0)) for i, f in enumerate(fr)]; os.makedirs(os.path.join(PUB, "enemies", "death"), exist_ok=True); sheet.save(os.path.join(PUB, "enemies", "death", f"{k}.png")); print(k, (fw, fh))
for k in REALM:
    if not os.path.exists(os.path.join(SRC, f"death_{k}.png")): print("missing", k); continue
    spr = Image.open(os.path.join(PUB, "b22", f"{k}.png")).convert("RGBA"); fr = frames(k, spr.size, box(spr))
    for i, f in enumerate(fr): f.save(os.path.join(PUB, "b22", f"{k}_d{i}.png"))
    print(k, spr.size)

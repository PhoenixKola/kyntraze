"""B08 builds from art/bosses/source (see PROVENANCE.md there): the two elites (B07 8-frame layout), the Null Seraph (16-frame strip) and its/elite FX.
  python scripts/build-elite-art.py
Reuses the B07 extractor (scripts/build-enemy-art.py): flood-fill key from the cell border, ground-line + body-centroid anchoring, LANCZOS to 2x authored size, baked pale-rose rim."""
import importlib.util, json, os
import numpy as np
from PIL import Image, ImageFilter

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("b07", os.path.join(R, "scripts", "build-enemy-art.py")); b07 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b07)
ndi, cells = b07.ndi, b07.cells
SRC = os.path.join(R, "art", "bosses", "source")
ELITE_OUT = os.path.join(R, "public", "art", "enemies")
BOSS_OUT = os.path.join(R, "public", "art", "bosses")
os.makedirs(os.path.join(BOSS_OUT, "fx"), exist_ok=True)

# stored heights (2x authored, displayed at 0.5): aegis ~82 px, cantor ~72 px on screen
ELITES = {"aegis": dict(h=164, fps=6), "cantor": dict(h=144, fps=7)}


def build_elites():
    b07.S, b07.OUT = SRC, ELITE_OUT
    for name, sp in ELITES.items(): b07.build_enemy(name, sp)
    for name in ELITES:   # the shared builder points the manifest at the B07 folder; correct it
        p = os.path.join(ELITE_OUT, name + ".json"); m = json.load(open(p)); m["source"] = f"art/bosses/source/{name}.png"; json.dump(m, open(p, "w"), indent=1)


SERAPH_H = 280      # stored px (140 on screen) for the tallest hover frame, halo + wings included
HOVER = 40          # stored px between the lowest point of the body and the ground/shadow point
NAMED = {"volley_windup": 4, "volley_release": 5, "blink_out": 6, "blink_in": 7, "ring_windup": 8, "ring_release": 9, "recover": 10, "hurt": 11, "phase": 12, "death": [13, 14, 15]}


def body_anchor(al):
    lab, n = ndi.label(ndi.binary_dilation(al, iterations=6))
    sizes = ndi.sum(al, lab, range(1, n + 1)); m = lab == (int(np.argmax(sizes)) + 1)
    ys, xs = np.nonzero(m & al); return xs.mean(), ys.max() + 1


def build_seraph():
    frames = cells(os.path.join(SRC, "seraph1.png"), 4, 2) + cells(os.path.join(SRC, "seraph2.png"), 4, 2)
    walk_h = max(f.getbbox()[3] - f.getbbox()[1] for f in frames[:4]); k = SERAPH_H / walk_h
    info = []
    for f in frames:
        al = np.asarray(f)[..., 3] > 0; cx, bot = body_anchor(al)
        sf = f.resize((max(1, round(f.size[0] * k)), max(1, round(f.size[1] * k))), Image.LANCZOS)
        arr = np.asarray(sf).copy(); a = arr[..., 3].astype(int); arr[..., 3] = np.where(a < 90, 0, np.minimum(255, a * 5 // 4)).astype(np.uint8)
        im = Image.fromarray(arr, "RGBA"); bb = im.getbbox(); info.append((im, cx * k, bot * k, bb[1], bb[3]))
    up = int(max(i[2] - i[3] for i in info)) + 4
    down = HOVER + int(max(0, max(i[4] - i[2] for i in info))) + 4
    half = int(max(max(i[1], i[0].size[0] - i[1]) for i in info)) + 4
    FW, FH = half * 2, up + down
    strip = Image.new("RGBA", (FW * 16, FH), (0, 0, 0, 0))
    for idx, (im, cx, bot, top, bottom) in enumerate(info):
        strip.alpha_composite(im, (idx * FW + int(round(half - cx)), int(round(up - bot))))
    arr = np.asarray(strip).copy(); solid = arr[..., 3] > 0
    inner = np.asarray(Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) > 0   # defringe: the keyed outline picked up magenta; edge pixels (2 px band) with a magenta tint become the dark violet outline colour
    edge = solid & ~inner; rr, gg, bb_ = arr[..., 0].astype(int), arr[..., 1].astype(int), arr[..., 2].astype(int)
    tint = edge & (rr > 120) & (bb_ > 120) & (gg < rr - 50) & (gg < bb_ - 50); arr[tint, :3] = (44, 26, 76)
    ring = ndi.binary_dilation(solid, iterations=1) & ~solid
    arr[ring] = (225, 205, 255, 150); strip = Image.fromarray(arr, "RGBA")   # pale violet-white rim for the violet boss (the pink rim would read as a Warden-family tint)
    strip.save(os.path.join(BOSS_OUT, "seraph.png"))
    m = {"schema": "kyntraze.boss-anim/1", "enemy": "seraph", "frame_width": FW, "frame_height": FH, "origin_px": [half, up + HOVER], "hover_px": HOVER, "frames": 16, "fps": 8,
         "clips": {"idle": [0], "move": [0, 1, 2, 3]}, "named": NAMED, "facing": "east (mirrored for west)", "source": "art/bosses/source/seraph1.png + seraph2.png"}
    json.dump(m, open(os.path.join(BOSS_OUT, "seraph.json"), "w"), indent=1)
    print("seraph frame", FW, FH, "origin", half, up + HOVER, "scale", round(k, 3))


def save_fx(name, f, size=None, k=None, alpha_floor=90):
    c = f.crop(f.getbbox())
    if size: k = size / max(c.size)
    c = c.resize((max(2, round(c.size[0] * k)), max(2, round(c.size[1] * k))), Image.LANCZOS)
    arr = np.asarray(c).copy(); arr[..., 3] = np.where(arr[..., 3] < alpha_floor, 0, arr[..., 3]); Image.fromarray(arr, "RGBA").save(os.path.join(BOSS_OUT, "fx", name + ".png")); print("fx", name, c.size)


def sigil_translucent(f):
    # the sigil's magenta-violet fill is part of the art but must not be an opaque disc: keep it at ~22% alpha, the line work stays opaque
    arr = np.asarray(f).copy().astype(int); r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    fill = (arr[..., 3] > 0) & (g < 90) & (r > 140) & (b > 150)
    arr[..., 3] = np.where(fill, 60, arr[..., 3]); return Image.fromarray(arr.astype(np.uint8), "RGBA")


def build_fx():
    f1 = cells(os.path.join(SRC, "fx1.png"), 2, 2); f2 = cells(os.path.join(SRC, "fx2.png"), 2, 2)
    save_fx("prism-bolt", f1[0], size=96); save_fx("prism-hit", f1[1], size=96); save_fx("orb-bolt", f1[2], size=64); save_fx("shield-block", f1[3], size=64)
    save_fx("blink-sigil", sigil_translucent(f2[0]), size=256, alpha_floor=40); save_fx("blink-flash", f2[1], size=192)
    aura = f2[2]; save_fx("aura-ring", aura, size=256, alpha_floor=40); save_fx("emblem-seraph", f2[3], size=128)


if __name__ == "__main__":
    build_elites(); build_seraph(); build_fx()

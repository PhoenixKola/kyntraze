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


def strip_projectiles(frames):
    """B08.1 A1: the release poses (5 volley, 9 ring) had the projectiles drawn into the character art while the game also spawns the real bolts, so each one showed twice.
    The baked bolts/orbs/streaks are detached from the body, so they are removed by connected components (identity-safe: no pixel of the character is touched). The attached white flash at the hands/torso stays."""
    for idx in (5, 9):
        arr = np.asarray(frames[idx]).copy(); lab, n = ndi.label(arr[..., 3] > 0); yy = np.arange(arr.shape[0])[:, None]
        for i in range(1, n + 1):
            m = lab == i; area = int(m.sum()); ys, xs = np.nonzero(m); white = float((arr[..., :3][m].min(1) > 200).mean())
            if idx == 5: kill = area < 5000 and xs.min() >= 290                      # the five prism bolts launched to the right of the hands
            else: kill = (area < 600 and white > 0.7) or area < 60                    # the eight orbs and their white streaks around the ring burst
            if idx == 9 and xs.min() == 74 and ys.max() > 320: arr[m & (yy >= 279), 3] = 0   # lower-left orb + streak, merged with a small wing shard above it: cut below the shard only
            if kill: arr[m, 3] = 0
        frames[idx] = Image.fromarray(arr, "RGBA")
    return frames


def despill(arr, band=3):
    """B08.1 A2: edge pixels (outer `band` px) that carry the #ff00ff key's magenta are re-coloured from their non-magenta neighbours (fallback: the dark violet outline colour). Interior violet/magenta seams are untouched."""
    a = arr[..., 3] > 0
    inner = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * band + 1))) > 0
    edge = a & ~inner; f = arr[..., :3].astype(float) / 255; mx = f.max(-1); mn = f.min(-1); d = mx - mn + 1e-9
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    mag = edge & (h >= 290) & (h <= 350) & (d / (mx + 1e-9) > 0.35) & (mx > 0.25)
    good = (a & ~mag).astype(float); acc = np.zeros((*a.shape, 3)); wsum = np.zeros(a.shape); P = 4
    gp = np.pad(good, P); cp = np.pad(arr[..., :3].astype(float) * good[..., None], ((P, P), (P, P), (0, 0)))
    for dy in range(-P, P + 1):
        for dx in range(-P, P + 1):
            wsum += gp[P + dy:P + dy + a.shape[0], P + dx:P + dx + a.shape[1]]; acc += cp[P + dy:P + dy + a.shape[0], P + dx:P + dx + a.shape[1]]
    fill = np.where(wsum[..., None] > 0, acc / np.maximum(wsum[..., None], 1), np.array([44, 26, 76.0]))
    out = arr.copy(); out[mag, :3] = fill[mag].astype(np.uint8); return out, int(mag.sum())


def build_seraph():
    frames = strip_projectiles(cells(os.path.join(SRC, "seraph1.png"), 4, 2) + cells(os.path.join(SRC, "seraph2.png"), 4, 2))
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
    arr = np.asarray(strip).copy(); n_fixed = 0
    for i in range(16):   # per frame so the 3 px band never reaches a neighbouring cell
        sl = arr[:, i * FW:(i + 1) * FW]; fixed, c = despill(sl); arr[:, i * FW:(i + 1) * FW] = fixed; n_fixed += c
    solid = arr[..., 3] > 0; print("despilled edge pixels:", n_fixed)
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

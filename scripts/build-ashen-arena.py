"""Builds the runtime art of The Ashen Reliquary from the ImageGen sheets in art/arenas/ashen/source (see PROVENANCE.md there).
  python scripts/ashen-prompts.py   (writes the prompts; generation itself: scripts/gen-image.py art/arenas/ashen/source <name> --img refs...)
  python scripts/build-ashen-arena.py
Floor tiles are made seam-free by script (offset blend / mirror) because a generator cannot guarantee tiling; everything else is a straight cut + scale of the ImageGen art."""
import importlib.util, json, math, os
import numpy as np
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("bea", os.path.join(R, "scripts", "build-enemy-art.py")); bea = importlib.util.module_from_spec(spec); spec.loader.exec_module(bea)
S = os.path.join(R, "art", "arenas", "ashen", "source"); OUT = os.path.join(R, "public", "art", "arenas", "ashen")
for d in ("props", "fx"): os.makedirs(os.path.join(OUT, d), exist_ok=True)
ndi = bea.ndi


def sheet_cell(path, cols, rows, idx):
    im = Image.open(path).convert("RGB"); W, H = im.size; c, r = idx % cols, idx // cols
    return im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows))


def tile_fill(cell):
    """edge-to-edge fill tile: the bounding box of everything that is not key magenta, trimmed to a square and 6 px in from the anti-aliased border."""
    sub = np.asarray(cell).astype(int); d = np.sqrt((sub[..., 0] - 255) ** 2 + sub[..., 1] ** 2 + (sub[..., 2] - 255) ** 2) > 90
    ys, xs = np.nonzero(d); y0, y1, x0, x1 = ys.min() + 6, ys.max() - 6, xs.min() + 6, xs.max() - 6; n = min(y1 - y0, x1 - x0)
    return Image.fromarray(sub[y0:y0 + n, x0:x0 + n].astype(np.uint8), "RGB")


def ramp(n, soft):  # 0 at both ends, 1 across the middle
    x = np.linspace(0, 1, n); return np.clip(np.minimum(x, 1 - x) / soft, 0, 1) ** 1.0


def plain_seamless(t):
    """offset blend: the edges become the (continuous) centre of the rolled copy, the centre keeps the original."""
    H, W = t.shape[:2]; w = (ramp(H, 0.42)[:, None] * ramp(W, 0.42)[None, :])[..., None]
    return (t * w + np.roll(t, (H // 2, W // 2), (0, 1)) * (1 - w))


def greenness(t): return t[..., 1] - (t[..., 0] + t[..., 2]) / 2


def lane_row_col(t):
    g = np.clip(greenness(t), 0, None); return int(np.argmax(g.sum(1))), int(np.argmax(g.sum(0)))


def build_floor():
    src = os.path.join(S, "floor.png"); tiles = [np.asarray(tile_fill(sheet_cell(src, 4, 2, i)).resize((128, 128), Image.LANCZOS)).astype(float) for i in range(8)]
    out = []
    for i, t in enumerate(tiles):
        if i == 5:   # horizontal inlay lane: centre it, blend in x, mirror in y
            yc, _ = lane_row_col(t); t = np.roll(t, 64 - yc, 0); H, W = t.shape[:2]
            wx = ramp(W, 0.42)[None, :, None]; t = t * wx + np.roll(t, W // 2, 1) * (1 - wx)
            top = t[:H // 2]; t = np.concatenate([top, top[::-1]], 0)
        elif i == 6:  # junction: centre both lines, mirror in both axes
            yc, xc = lane_row_col(t); t = np.roll(np.roll(t, 64 - yc, 0), 64 - xc, 1); q = t[:64, :64]
            t = np.concatenate([np.concatenate([q, q[:, ::-1]], 1), np.concatenate([q[::-1], q[::-1, ::-1]], 1)], 0)
        elif i == 4:  # rubble: mirror in both axes so a chip on a tile edge always meets its twin on the neighbour
            t = plain_seamless(t); q = t[:64, :64]; t = np.concatenate([np.concatenate([q, q[:, ::-1]], 1), np.concatenate([q[::-1], q[::-1, ::-1]], 1)], 0)
        else: t = plain_seamless(t)
        stone = greenness(t) < 8; mu = t[stone].mean(0); t = t * (np.array([50.0, 45.0, 41.0]) / mu)   # every tile on the same stone tone (adjacent tiles must not step)
        out.append(Image.fromarray(np.clip(t, 0, 255).astype(np.uint8), "RGB"))
    for i, im in enumerate(out): im.save(os.path.join(OUT, f"floor-{i}.png"))
    return out


def body(al):
    lab, n = ndi.label(ndi.binary_dilation(al, iterations=6)); sizes = ndi.sum(al, lab, range(1, n + 1)); m = lab == (int(np.argmax(sizes)) + 1)
    ys, xs = np.nonzero(m & al); return (xs.min() + xs.max()) / 2, ys.max() + 1


def despill(arr):
    a = arr.astype(int); spill = np.maximum(0, np.minimum(a[..., 0], a[..., 2]) - a[..., 1]); m = a[..., 3] > 0
    for ch in (0, 2): a[..., ch] = np.where(m, a[..., ch] - (spill * 0.85).astype(int), a[..., ch])
    return np.clip(a, 0, 255).astype(np.uint8)


def rim_edge(im):
    arr = despill(np.asarray(im)); a = arr[..., 3].astype(int); arr[..., 3] = np.where(a < 90, 0, np.minimum(255, a * 5 // 4)).astype(np.uint8); return Image.fromarray(arr, "RGBA")


def build_props():
    cells = bea.cells(os.path.join(S, "props.png"), 4, 2)
    FP = {"pylon": (60, 44), "fallen-column": (170, 56), "broken-statue": (80, 70), "sarcophagus": (130, 60), "monolith": (70, 110), "brazier": (50, 50)}
    DISP_W = {"pylon": 58, "fallen-column": 184, "broken-statue": 92, "sarcophagus": 142, "monolith": 78, "brazier": 56}
    man = {}

    def solid(name, idxs):
        fr = [cells[i] for i in idxs]; boxes = [f.getbbox() for f in fr]
        k = DISP_W[name] * 2 / (boxes[0][2] - boxes[0][0]); fr = [f.crop(f.getbbox()) for f in fr]
        info = []
        for f in fr:
            al = np.asarray(f)[..., 3] > 0; cx, bot = body(al); sf = f.resize((max(1, round(f.size[0] * k)), max(1, round(f.size[1] * k))), Image.LANCZOS)
            info.append((rim_edge(sf), cx * k, bot * k))
        up = int(max(i[2] - min(0, 0) for i in info)) + 4; half = int(max(max(i[1], i[0].size[0] - i[1]) for i in info)) + 4
        tops = [i[0].getbbox()[1] for i in info]; up = int(max(i[2] - t for i, t in zip(info, tops))) + 4
        down = int(max(i[0].getbbox()[3] - i[2] for i in info)) + 4; down = max(down, 4)
        FW, FH = half * 2, up + down; strip = Image.new("RGBA", (FW * len(info), FH), (0, 0, 0, 0))
        for n, (im, cx, bot) in enumerate(info): strip.alpha_composite(im, (n * FW + int(round(half - cx)), int(round(up - bot))))
        strip.save(os.path.join(OUT, "props", name + ".png"))
        man[name] = {"file": f"props/{name}.png", "scale": 0.5, "origin": [half, up], "footprint": {"w": FP[name][0], "h": FP[name][1]}, "solid": True, "size": [FW, FH]}
        if len(info) > 1: man[name]["frames"] = len(info); man[name]["frame_width"] = FW
        print(name, "frame", FW, FH, "display", FW // 2, FH // 2)
    solid("pylon", [0, 1, 2]); solid("fallen-column", [3]); solid("broken-statue", [4]); solid("sarcophagus", [5]); solid("monolith", [6]); solid("brazier", [7])
    # decor: stored at display size (scale 1) because it is baked into the floor canvas
    dc = bea.cells(os.path.join(S, "decor.png"), 4, 2)
    DEC = [("rubble-a", 104, 1.0), ("rubble-b", 124, 1.0), ("ash-a", 150, 0.55), ("ash-b", 172, 0.55), ("crack-a", 160, 0.9), ("crack-b", 132, 0.9), ("bones", 112, 0.9), ("reliquary-sigil", 520, 0.85)]
    for i, (name, size, alpha) in enumerate(DEC):
        c = dc[i]
        if name == 'reliquary-sigil':   # the mosaic overflows its sheet cell: cut it from the whole sheet
            sh = np.asarray(Image.open(os.path.join(S, 'decor.png')).convert('RGB')); reg = sh[300:, 1150:]; al = bea.key_alpha(reg); c = Image.fromarray(np.dstack([reg, (al * 255).astype(np.uint8)]), 'RGBA')
        c = c.crop(c.getbbox()); k = size / max(c.size); c = c.resize((max(2, round(c.size[0] * k)), max(2, round(c.size[1] * k))), Image.LANCZOS)
        arr = despill(np.asarray(c)); a = arr[..., 3].astype(int); a = np.where(a < 96, 0, np.minimum(255, a * 5 // 4)); arr[..., 3] = (a * alpha).astype(np.uint8)
        if name == 'reliquary-sigil': arr[..., :3] = (arr[..., :3] * 0.62).astype(np.uint8)   # one value tier below the characters
        c = Image.fromarray(arr, "RGBA")
        c.save(os.path.join(OUT, "props", name + ".png")); man[name] = {"file": f"props/{name}.png", "scale": 1, "origin": [c.size[0] // 2, c.size[1] // 2], "solid": False, "size": list(c.size)}
    json.dump({"arena": "ashen", "props": man}, open(os.path.join(OUT, "props.json"), "w"), indent=1)


def build_fx():
    src = os.path.join(S, "fx.png"); cs = bea.cells(src, 2, 2)
    ring = cs[0]; ring = ring.crop(ring.getbbox()); n = max(ring.size); sq = Image.new("RGBA", (n, n), (0, 0, 0, 0)); sq.paste(ring, ((n - ring.size[0]) // 2, (n - ring.size[1]) // 2))
    sq = sq.resize((256, 256), Image.LANCZOS); arr = np.asarray(sq).copy(); a = arr[..., 3].astype(int); arr[..., 3] = np.where(a < 90, 0, np.minimum(255, a * 5 // 4)).astype(np.uint8); Image.fromarray(arr, "RGBA").save(os.path.join(OUT, "fx", "pulse-ring.png"))

    def soft(i, size, tint=None):   # continuous alpha from the distance to the key colour (glows and motes)
        sub = np.asarray(sheet_cell(src, 2, 2, i)).astype(float); d = np.sqrt((sub[..., 0] - 255) ** 2 + sub[..., 1] ** 2 + (sub[..., 2] - 255) ** 2)
        al = np.clip((d - 22) / 150, 0, 1); ys, xs = np.nonzero(al > 0.02); cy, cx = int(np.mean(ys)), int(np.mean(xs)); h = size // 2
        al = al[cy - h:cy + h, cx - h:cx + h]; rgb = sub[cy - h:cy + h, cx - h:cx + h]
        t = np.array(tint, float) if tint else None
        col = np.clip(rgb - (1 - al[..., None]) * np.array([255, 0, 255]), 0, 255) / np.maximum(al[..., None], 0.05); col = np.clip(col, 0, 255)
        if t is not None: col = t[None, None, :] * (1 - al[..., None]) + 255 * al[..., None]   # crimson falloff to a white-hot core
        return Image.fromarray(np.dstack([col, al * 255]).astype(np.uint8), "RGBA")
    soft(1, 360, (255, 58, 110)).resize((128, 128), Image.LANCZOS).save(os.path.join(OUT, "fx", "pylon-glow.png"))
    for i, nm in ((2, "mote"), (3, "spark")):
        m = soft(i, 80); m.resize((16, 16), Image.LANCZOS).save(os.path.join(OUT, "fx", nm + ".png"))
    f = np.asarray(Image.open(os.path.join(S, "fog.png")).convert("RGB").resize((512, 512), Image.LANCZOS)).astype(float); lum = f.mean(2)
    H, W = lum.shape; w = (ramp(H, 0.42)[:, None] * ramp(W, 0.42)[None, :]); lum = lum * w + np.roll(lum, (H // 2, W // 2), (0, 1)) * (1 - w)
    lo, hi = np.percentile(lum, 4), np.percentile(lum, 99.5); al = np.clip((lum - lo) / (hi - lo), 0, 1) ** 1.2 * 0.9
    Image.fromarray(np.dstack([np.full((H, W), 92), np.full((H, W), 84), np.full((H, W), 72), al * 255]).astype(np.uint8), "RGBA").save(os.path.join(OUT, "fx", "fog.png"))


def build_rim():
    rim = Image.open(os.path.join(S, "rim.png")).convert("RGB"); h = 108; k = h / rim.size[1]
    top = rim.resize((round(rim.size[0] * k), h), Image.LANCZOS); top.save(os.path.join(OUT, "rim.png"))
    top.crop((0, 0, top.size[0], 26)).transpose(Image.FLIP_TOP_BOTTOM).save(os.path.join(OUT, "rim-bottom.png"))
    cn = Image.open(os.path.join(S, "corner.png")).convert("RGB"); s = 109 / 425
    cn.crop((0, 0, 262, 425)).resize((round(262 * s), 109), Image.LANCZOS).save(os.path.join(OUT, "corner.png"))
    side = cn.crop((0, 440, 262, 1254)); side.resize((round(262 * s), round(814 * s)), Image.LANCZOS).save(os.path.join(OUT, "rim-side.png"))
    json.dump({"rim": {"file": "rim.png", "tile": "x", "h": h}, "rim-bottom": {"file": "rim-bottom.png", "tile": "x", "note": "cap strip, drawn at the bottom edge, already flipped"}, "corner": {"file": "corner.png", "note": "top-left, mirror for the other corners"},
               "rim-side": {"file": "rim-side.png", "tile": "y", "note": "left side wall strip, mirror for the right side"}}, open(os.path.join(OUT, "rim.json"), "w"), indent=1)


def build_card():
    c = Image.open(os.path.join(S, "card.png")).convert("RGB"); c.resize((480, 270), Image.LANCZOS).save(os.path.join(OUT, "card.png")); c.resize((160, 90), Image.LANCZOS).save(os.path.join(OUT, "card-thumb.png"))


if __name__ == "__main__":
    build_floor(); build_props(); build_fx(); build_rim(); build_card(); print("ashen arena art built ->", OUT)

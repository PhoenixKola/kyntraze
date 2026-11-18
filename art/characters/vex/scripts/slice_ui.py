"""Slice Ren's approved ImageGen sheets into game files (icons, portraits, crests, card, VFX). Run: python slice_ui.py"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

VEX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(VEX))), "public")
os.makedirs(os.path.join(PUB, "ui", "heroes"), exist_ok=True)
os.makedirs(os.path.join(PUB, "art", "fx", "ren"), exist_ok=True)


def is_key(rgb):
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    return (r - g > 70) & (b - g > 70) & (np.abs(r - b) < 90)


def boxes(mask, min_area, merge=0):
    if merge:
        mask = ndi.binary_dilation(mask, iterations=merge)
    lab, n = ndi.label(mask)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if (lab[sl] == i).sum() >= min_area:
            out.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    out.sort(key=lambda b: (round((b[1] + b[3]) / 2 / 400), b[0]))
    return out


def keyed(img, bx):
    c = np.array(img.convert("RGB").crop(bx))
    a = np.where(is_key(c), 0, 255).astype(np.uint8)
    a = ndi.binary_opening(a > 0, iterations=1).astype(np.uint8) * 255
    return Image.fromarray(np.dstack([c, a]), "RGBA")


def glyph_mask(med):
    """White silhouette of the central glyph of a medallion (bright / red pixels inside the dark plate), 64x64."""
    a = np.array(med.convert("RGBA")).astype(int)
    h, w = a.shape[:2]
    inner = a[int(h * 0.17):int(h * 0.83), int(w * 0.17):int(w * 0.83)]
    lum = inner[..., :3].max(-1).astype(float)
    red = (inner[..., 0] - np.maximum(inner[..., 1], inner[..., 2])).astype(float)
    g = np.clip(np.maximum((lum - 55) / 110, red / 120), 0, 1)
    g = np.where(g > 0.12, np.maximum(g, 0.45), 0)
    g = ndi.grey_closing(g, size=(2, 2))
    m = g > 0
    ys, xs = np.nonzero(m)
    m = g[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    s = 56 / max(m.shape)
    big = Image.fromarray((m * 255).astype(np.uint8)).resize((max(1, round(m.shape[1] * s)), max(1, round(m.shape[0] * s))), Image.LANCZOS)
    out = Image.new("L", (64, 64), 0)
    out.paste(big, ((64 - big.width) // 2, (64 - big.height) // 2))
    rgba = Image.new("RGBA", (64, 64), (255, 255, 255, 0))
    rgba.putalpha(out)
    return rgba


def main():
    # icons + crests
    sheet = Image.open(os.path.join(VEX, "icons", "ren-icons.png")).convert("RGB")
    arr = np.array(sheet)
    bx = boxes(~is_key(arr), 20000, merge=3)
    assert len(bx) == 6, bx
    meds = [keyed(sheet, b) for b in bx]
    # HUD glyphs: pure white silhouettes (icons/ren-glyphs.png), 64x64 like public/ui/icons/*.png
    gl = np.array(Image.open(os.path.join(VEX, "icons", "ren-glyphs.png")).convert("L")).astype(float)
    gb = boxes(ndi.binary_dilation(gl > 100, iterations=25), 3000)
    assert len(gb) == 5, gb
    for name, b in zip(["auto", "q", "e", "r", "f"], gb):
        c = gl[b[1]:b[3], b[0]:b[2]] > 100
        ys, xs = np.nonzero(c); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        k = 58 / max(c.shape); im = Image.fromarray((c * 255).astype(np.uint8)).resize((max(1, round(c.shape[1] * k)), max(1, round(c.shape[0] * k))), Image.BOX)
        al = Image.new("L", (64, 64), 0); al.paste(im, ((64 - im.width) // 2, (64 - im.height) // 2))
        al = al.point(lambda v: 255 if v > 110 else 0)
        out = Image.new("RGBA", (64, 64), (255, 255, 255, 0)); out.putalpha(al); out.save(os.path.join(PUB, "ui", "icons", f"vex_{name}.png"))
    for name, m in (("base", meds[5]), ("form", meds[4])):
        m.resize((100, 97), Image.LANCZOS).save(os.path.join(PUB, "ui", "heroes", f"ren-crest-{name}.webp"), lossless=True)
    # portraits: pixel busts -> 128 px (nearest, same native look as kai-portrait-*.png)
    for name, src in (("base", "ren-px-bust-base"), ("f1", "ren-px-bust-asc")):
        im = Image.open(os.path.join(VEX, "portrait", src + ".png")).convert("RGB")
        a = np.array(im)
        k = is_key(a)
        rgba = np.dstack([a, np.where(k, 0, 255).astype(np.uint8)])
        Image.fromarray(rgba, "RGBA").resize((128, 128), Image.NEAREST).save(os.path.join(PUB, "ui", "heroes", f"ren-portrait-{name}.webp"), lossless=True)
    # card
    card = os.path.join(VEX, "card", "ren-card.png")
    if os.path.exists(card):
        Image.open(card).convert("RGB").resize((760, 1013), Image.LANCZOS).save(os.path.join(PUB, "ui", "heroes", "ren-card.webp"), quality=90)
    # VFX (additive, black bg): alpha = max channel, colour un-premultiplied
    fx = Image.open(os.path.join(VEX, "fx", "ren-fx.png")).convert("RGB")
    f = np.array(fx).astype(float)
    lum = f.max(-1)
    names = ["aura_wisp_a", "aura_wisp_b", "embers", "afterimage_streak", "speed_streak", "ground_ring", "ground_crack", "impact_burst", "fist_orb", "supernova_ring", "dust_puff", "light_pillar"]
    cw, ch = fx.width / 4, fx.height / 3
    fb = []
    for j in range(3):
        for i in range(4):
            x0, y0 = int(i * cw), int(j * ch)
            sub = lum[y0:int((j + 1) * ch), x0:int((i + 1) * cw)] > 28
            ys, xs = np.nonzero(sub)
            fb.append((x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1))
    for name, b in zip(names, fb):
        pad = 6
        x0, y0, x1, y1 = max(0, b[0] - pad), max(0, b[1] - pad), min(fx.width, b[2] + pad), min(fx.height, b[3] + pad)
        c = f[y0:y1, x0:x1]
        al = np.clip((c.max(-1) - 12) / 90, 0, 1)
        rgb = np.clip(c / np.maximum(c.max(-1, keepdims=True), 1) * 255, 0, 255)
        out = np.dstack([rgb, al * 255]).astype(np.uint8)
        im = Image.fromarray(out, "RGBA")
        s = 256 / max(im.size)
        if s < 1:
            im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        im.save(os.path.join(PUB, "art", "fx", "ren", name + ".png"))
    print("sliced ok")


if __name__ == "__main__":
    main()

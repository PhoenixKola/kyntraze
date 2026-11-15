"""B14 UI kit builder: keys the ImageGen sheets in art/ui/kit/sheets, slices them into nine-slice-safe pieces,
writes optimised webp/png to public/ui/kit and kit.json, and renders contact sheets at use scale.
Run from repo root: python art/ui/kit/build_kit.py"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(__file__))
from keylib import key, components, crop

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SH = os.path.join(ROOT, "art", "ui", "kit", "sheets")
OUT = os.path.join(ROOT, "public", "ui", "kit")
REV = os.path.join(ROOT, "art", "ui", "review", "b14")
os.makedirs(OUT, exist_ok=True); os.makedirs(REV, exist_ok=True)
MAN = {"assets": {}}
BYTES = {}


def keyed(name, k):
    return key(Image.open(os.path.join(SH, name + ".png")), k)


def rs(im, s):
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    return im.convert("RGBa").resize((w, h), Image.LANCZOS).convert("RGBA")


def save(name, im, desc, fmt="webp", **extra):
    p = os.path.join(OUT, name + "." + fmt)
    if fmt == "webp":
        im.save(p, "WEBP", quality=90, method=6, alpha_quality=95)
    else:
        im.save(p, "PNG", optimize=True)
    BYTES[name] = os.path.getsize(p)
    MAN["assets"][name] = dict(file=f"{name}.{fmt}", size=[im.width, im.height], use=desc, bytes=BYTES[name], **extra)


def hollow_box(im, pt):
    """Bounding box (x0,y0,x1,y1) of the transparent region containing point pt (the channel / socket)."""
    m = np.asarray(im)[..., 3] < 40
    lab, _ = ndi.label(m)
    v = lab[pt[1], pt[0]]
    if v == 0:
        return None
    ys, xs = np.where(lab == v)
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def nine(im, c, e, ax, ay):
    """Frame -> compact nine-slice source: four c x c corners + clean e-px edge samples taken at fractions ax (top/bottom) and ay (left/right)."""
    w, h = im.size
    o = Image.new("RGBA", (2 * c + e, 2 * c + e), (0, 0, 0, 0))
    o.alpha_composite(im.crop((0, 0, c, c)), (0, 0)); o.alpha_composite(im.crop((w - c, 0, w, c)), (c + e, 0))
    o.alpha_composite(im.crop((0, h - c, c, h)), (0, c + e)); o.alpha_composite(im.crop((w - c, h - c, w, h)), (c + e, c + e))
    xa, ya = int(w * ax), int(h * ay)
    o.alpha_composite(im.crop((xa, 0, xa + e, c)), (c, 0)); o.alpha_composite(im.crop((xa, h - c, xa + e, h)), (c, c + e))
    o.alpha_composite(im.crop((0, ya, c, ya + e)), (0, c)); o.alpha_composite(im.crop((w - c, ya, w, ya + e)), (c + e, c))
    return o


def three(im, L, R, sx0, sx1, s):
    """Horizontal 3-slice: left cap, clean middle strip (sx0..sx1 in source px), right cap, all scaled by s."""
    w, h = im.size
    cap_l, cap_r, mid = im.crop((0, 0, L, h)), im.crop((w - R, 0, w, h)), im.crop((sx0, 0, sx1, h))
    cap_l, cap_r, mid = rs(cap_l, s), rs(cap_r, s), rs(mid, s)
    o = Image.new("RGBA", (cap_l.width + mid.width + cap_r.width, cap_l.height), (0, 0, 0, 0))
    o.alpha_composite(cap_l, (0, 0)); o.alpha_composite(mid, (cap_l.width, 0)); o.alpha_composite(cap_r, (cap_l.width + mid.width, 0))
    return o, cap_l.width, cap_r.width


# ---------------------------------------------------------------- panels
p = keyed("panels", "magenta"); pb = components(p)
big, med = crop(p, pb[0]), crop(p, pb[1])
n = nine(rs(big, 0.5), 66, 28, 0.22, 0.66); save("panel-frame", n, "GamePanel / modal frame (border-image, stretch; hollow centre shows the dark-metal tile)", slice=[66, 66, 66, 66], edge=28)
n = nine(rs(med, 0.6), 40, 24, 0.22, 0.4); save("hud-frame", n, "Thin HUD plate frame for clock / health block (border-image, stretch)", slice=[40, 40, 40, 40], edge=24)

# ---------------------------------------------------------------- buttons
b = keyed("buttons", "magenta"); bb = components(b)
for nm, box in zip(["primary", "secondary", "disabled", "danger"], bb):
    im = crop(b, box); o, l, r = three(im, 190, 190, 330, 560, 0.35)
    save("btn-" + nm, o, f"GameButton {nm} face: border-image slice 0 {r} 0 {l} (horizontal only), height fixed {o.height}px; hover/pressed via filter brightness", slice=[0, r, 0, l], height=o.height)

# ---------------------------------------------------------------- bars
b = keyed("bars", "magenta"); bb = components(b)
for nm, box, L, R, sx, s in [("bar-hp", bb[0], 330, 330, (800, 1300), 0.22), ("bar-xp", bb[1], 210, 210, (800, 1300), 0.3), ("bar-drive", bb[2], 240, 240, (800, 1300), 0.28)]:
    im = crop(b, box); o, l, r = three(im, L, R, sx[0], sx[1], s)
    ch = hollow_box(o, (o.width // 2, o.height // 2))
    save(nm, o, f"GameBar shell ({nm}); caps via border-image slice 0 {r} 0 {l}; put fill element inside channel rect", slice=[0, r, 0, l], channel=ch, height=o.height)

b = keyed("boss", "green"); bb = components(b)
for nm, box, L, R, s in [("boss-warden", bb[0], 520, 420, 0.29), ("boss-seraph", bb[1], 520, 470, 0.29)]:
    im = crop(b, box); o, l, r = three(im, L, R, 900, 1200, s)
    ch = hollow_box(o, (o.width // 2, o.height // 2)); so = hollow_box(o, (int(l * 0.4), o.height // 2))
    save(nm, o, f"Boss bar plate ({nm}); emblem sits in socket; fill in channel; slice 0 {r} 0 {l}", slice=[0, r, 0, l], channel=ch, socket=so, height=o.height)

# ---------------------------------------------------------------- slots, crests
b = keyed("slots", "magenta"); bb = components(b)
save("slot-frame", rs(crop(b, bb[0]), 0.25), "Ability slot frame (fixed size ~ 2x of 46u). Inner hollow rect in manifest", channel=None)
MAN["assets"]["slot-frame"]["inner"] = hollow_box(Image.open(os.path.join(OUT, "slot-frame.webp")).convert("RGBA"), (60, 60))
for nm, box in zip(["crest-base", "crest-f1", "crest-f2", "crest-f3"], bb[4:8]):
    save(nm, rs(crop(b, box), 0.28), "Form crest medallion (HUD portrait corner, hero select, form readiness)")

# ---------------------------------------------------------------- minimap + small pieces
b = keyed("minimap", "magenta"); bb = components(b)
save("map-corner", rs(b.crop((40, 96, 262, 300)), 0.6), "Minimap corner bracket (top-left; mirror with scaleX/scaleY for the other three)")
strip = crop(b, bb[1]); o, l, r = three(strip, 110, 110, 260, 460, 0.35)
save("map-strip", o, f"Status strip plate / generic nameplate; slice 0 {r} 0 {l}", slice=[0, r, 0, l], height=o.height)
save("tab", rs(crop(b, bb[2]), 0.45), "Tab / label plate with one cut corner")
save("divider", rs(crop(b, bb[3]), 0.45), "Divider rail with centre diamond (width-scalable by 3-slice via CSS background-size: 100% 100% for short runs)")
save("chev-l", rs(crop(b, bb[4]), 0.5), "Focus chevron, left"); save("chev-r", rs(crop(b, bb[5]), 0.5), "Focus chevron, right")

# ---------------------------------------------------------------- cards
b = keyed("cards", "green"); bb = sorted(components(b), key=lambda q: q[0])
for nm, box in zip(["card-common", "card-rare", "card-epic"], bb):
    im = rs(crop(b, box), 0.5); n = nine(im, 62, 24, 0.5 - 0.04, 0.5 - 0.03)
    save(nm, n, f"Upgrade card frame ({nm.split('-')[1]}); border-image slice 62 stretch; hollow centre", slice=[62, 62, 62, 62], edge=24)

# ---------------------------------------------------------------- logo
b = keyed("logo", "magenta"); bb = components(b, min_area=20000)
save("logo-mark", rs(crop(b, bb[0]), 0.14), "KYNTRAZE shard sigil (full colour), sits beside live wordmark text")
mono = crop(b, bb[1]); a = mono.getchannel("A"); m = Image.new("RGBA", mono.size, (255, 255, 255, 0)); m.putalpha(a)
save("logo-mono", rs(m, 0.5), "Mono white shard silhouette (use as CSS mask-image, tint with currentColor)", fmt="png")

# ---------------------------------------------------------------- textures (made seamless by wrap cross-fade)
t = Image.open(os.path.join(SH, "tex.png")).convert("RGB")


def seamless(im, size):
    a = np.asarray(im.resize((size, size), Image.LANCZOS)).astype(np.float32)
    ramp = 0.5 - 0.5 * np.cos(np.linspace(0, 2 * np.pi, size, endpoint=False))  # 0 at edges, 1 in the middle
    w = np.outer(ramp, ramp)[..., None]
    sh = np.roll(np.roll(a, size // 2, 0), size // 2, 1)
    return a * w + sh * (1 - w)


dark = seamless(t.crop((60, 60, 820, 810)), 256)
steel = seamless(t.crop((960, 60, 1760, 810)), 256)
steel = 58 + (steel - steel.mean((0, 1))) * 0.45 + np.array([-4, 2, 8])  # darker, low-contrast cool steel
Image.fromarray(np.clip(dark, 0, 255).astype(np.uint8)).save(os.path.join(OUT, "tex-panel.webp"), "WEBP", quality=82)
Image.fromarray(np.clip(steel, 0, 255).astype(np.uint8)).save(os.path.join(OUT, "tex-plate.webp"), "WEBP", quality=82)
for nm, d in [("tex-panel", "Seamless dark gunmetal tile 256px (panel / modal background, image-rendering: auto)"), ("tex-plate", "Seamless raised steel plate tile 256px (inset wells, stat tiles)")]:
    pth = os.path.join(OUT, nm + ".webp"); BYTES[nm] = os.path.getsize(pth); MAN["assets"][nm] = dict(file=nm + ".webp", size=[256, 256], use=d, bytes=BYTES[nm])

MAN["totalBytes"] = sum(BYTES.values())
json.dump(MAN, open(os.path.join(OUT, "kit.json"), "w"), indent=1)
print("kit bytes", MAN["totalBytes"], {k: v for k, v in BYTES.items() if v > 100000})


# ---------------------------------------------------------------- contact sheets (nine-slice rendered at use scale)
def render_nine(img, sl, size, k):
    """CSS border-image emulation: source slice sl (t,r,b,l px), destination border widths = slice * k."""
    t_, r_, b_, l_ = sl
    W, H = size; w, h = img.size
    dt, dr, db, dl = [round(v * k) for v in sl]
    o = Image.new("RGBA", size, (0, 0, 0, 0))
    xs = [(0, dl, 0, l_), (dl, W - dr, l_, w - r_), (W - dr, W, w - r_, w)]; ys = [(0, dt, 0, t_), (dt, H - db, t_, h - b_), (H - db, H, h - b_, h)]
    for ya, yb, sa, sb in ys:
        for xa, xb, ta, tb in xs:
            if xb <= xa or yb <= ya or sb <= sa or tb <= ta:
                continue
            o.alpha_composite(img.crop((ta, sa, tb, sb)).resize((xb - xa, yb - ya), Image.LANCZOS), (xa, ya))
    return o


def load(n):
    return Image.open(os.path.join(OUT, MAN["assets"][n]["file"])).convert("RGBA")


def contact(scale, name):
    W, H = (960, 540) if scale == 1 else (640, 360)
    f = 0.5 * scale  # kit art is authored at ~2x of 960x540 use scale
    cv = Image.new('RGBA', (W, H), (34, 44, 52, 255))
    tile = load("tex-panel").convert("RGBA")
    d = ImageDraw.Draw(cv)

    def put(n, x, y, size=None, sl=None):
        im = load(n)
        if size is not None:
            sl = sl or MAN["assets"][n]["slice"]; sz = (round(size[0]), round(size[1])); k = (sz[1] / im.height) if (sl[0] == 0 and sl[2] == 0) else f; im = render_nine(im, sl, sz, k)
        else:
            im = im.resize((max(1, round(im.width * f)), max(1, round(im.height * f))), Image.LANCZOS)
        cv.alpha_composite(im, (round(x), round(y))); return im

    def panel(x, y, w, h, n="panel-frame"):
        tl = Image.new("RGBA", (round(w), round(h)))
        for yy in range(0, round(h), 256):
            for xx in range(0, round(w), 256):
                tl.paste(tile, (xx, yy))
        cv.alpha_composite(tl, (round(x), round(y))); put(n, x, y, (w, h))
    s = scale
    panel(14 * s, 14 * s, 262 * s, 74 * s, "hud-frame")
    put("crest-base", 20 * s, 20 * s)
    put("bar-hp", 92 * s, 28 * s, (176 * s, 24 * s)); put("bar-xp", 92 * s, 56 * s, (176 * s, 14 * s))
    put("boss-warden", 300 * s, 14 * s, (360 * s, 46 * s)); put("boss-seraph", 300 * s, 64 * s, (360 * s, 46 * s))
    put("map-strip", 760 * s, 150 * s, (170 * s, 26 * s)); put("map-corner", 760 * s, 100 * s)
    for i in range(5):
        put("slot-frame", (300 + i * 52) * s, 470 * s)
    put("crest-f3", 570 * s, 468 * s); put("crest-f2", 620 * s, 468 * s)
    panel(30 * s, 130 * s, 260 * s, 190 * s)
    put("btn-primary", 50 * s, 170 * s, (150 * s, 38 * s)); put("btn-secondary", 50 * s, 216 * s, (150 * s, 38 * s)); put("btn-disabled", 50 * s, 262 * s, (110 * s, 28 * s)); put("btn-danger", 168 * s, 262 * s, (100 * s, 28 * s))
    for i, n in enumerate(["card-common", "card-rare", "card-epic"]):
        put(n, (320 + i * 120) * s, 130 * s, (110 * s, 170 * s))
    put("logo-mark", 880 * s, 14 * s)
    put("tab", 320 * s, 330 * s); put("divider", 320 * s, 380 * s); put("chev-l", 450 * s, 330 * s); put("chev-r", 490 * s, 330 * s)
    cv.convert("RGB").save(os.path.join(REV, name))


contact(1, "kit-contact-960.png"); contact(2 / 3, "kit-contact-640.png")
print("contact sheets written")

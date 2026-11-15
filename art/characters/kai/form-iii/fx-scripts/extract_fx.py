"""Cut the B13 ImageGen FX / icon sheets into runtime sprites: python extract_fx.py
Writes form-iii/fx/*.png, form-iii/ui/*.png and copies the runtime set to public/art/fx/kai-form3/ (+ manifest.json) and public/ui/icons/{rift,reversal,form3,evasion}.png.
Method: key out the flat magenta with colour UNMIXING (soft alpha, no pink fringes), find the isolated pieces, box-resize each to its target size. The sprites keep the generated cool silver / ice-blue colours
(tint white at runtime to keep them as drawn). Only rift_beam_seg is refined with numpy (rows -> soft alpha profile, loop cross-fade) so it tiles seamlessly in x; the art in it is the generated beam."""
import json, os, shutil
from collections import deque
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); SRC = os.path.join(FORM, "source"); REPO = os.path.abspath(os.path.join(FORM, "..", "..", "..", ".."))
MAG = np.array([255.0, 0.0, 255.0])

def unmix(rgb):
    a = rgb.astype(float); mag = np.clip((95 - np.sqrt(((a - MAG) ** 2).sum(-1))) / 55.0, 0, 1); al = 1 - mag
    col = np.clip((a - mag[..., None] * MAG) / np.maximum(al, 1e-3)[..., None], 0, 255)
    r, g, b = col[..., 0], col[..., 1], col[..., 2]; col[..., 0] = np.minimum(r, g + 6)   # despill: ice/silver/slate pixels never have r > g
    return col, np.where(al < 0.08, 0, al)
def components(alpha, grow):
    S = 8; h, w = alpha.shape[0] // S, alpha.shape[1] // S; m = (alpha[:h * S, :w * S] > 0.3).reshape(h, S, w, S).any((1, 3)); r = max(1, grow // S); d = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy * dy + dx * dx <= r * r: d |= np.roll(np.roll(m, dy, 0), dx, 1)
    lab = np.zeros((h, w), int); n = 0; boxes = []
    for y in range(h):
        for x in range(w):
            if d[y, x] and not lab[y, x]:
                n += 1; q = deque([(y, x)]); lab[y, x] = n
                while q:
                    cy, cx = q.popleft()
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and d[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
    for i in range(1, n + 1):
        ys, xs = np.nonzero((lab == i) & m)
        if len(ys) > 2: boxes.append([max(0, int(xs.min()) * S - 4), max(0, int(ys.min()) * S - 4), int(xs.max() + 1) * S + 4, int(ys.max() + 1) * S + 4])
    return boxes
def order(boxes, rows):
    boxes = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2); out = []; i = 0
    for n in rows: out += sorted(boxes[i:i + n], key=lambda b: b[0]); i += n
    return out
def cut(col, al, box, size, hard=False, fix=None):
    """Crop the piece, resize so its longest side (or the (w,h) pair) matches `size`; colour is resized premultiplied."""
    x0, y0, x1, y1 = box; c = col[y0:y1, x0:x1]; a = al[y0:y1, x0:x1]
    ys, xs = np.nonzero(a > 0.12); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; h, w = a.shape
    if isinstance(size, tuple): tw, th = size
    else: s = size / max(w, h); tw, th = max(1, round(w * s)), max(1, round(h * s))
    pm = Image.fromarray((c * a[..., None]).astype(np.uint8)).resize((tw, th), Image.BOX); aa = Image.fromarray((a * 255).astype(np.uint8)).resize((tw, th), Image.BOX)
    A = np.array(aa).astype(float) / 255; C = np.array(pm).astype(float) / np.maximum(A, 1e-3)[..., None]
    if hard: A = (A > 0.5).astype(float)
    if fix == "ice":   # translucent edges were drawn over magenta and keep a violet cast: pull partial-alpha pixels to the sheet's ice-blue
        w_ = np.clip((0.95 - A) / 0.6, 0, 1)[..., None] * 0.85; C = C * (1 - w_) + np.array([196.0, 224.0, 255.0]) * w_
    elif fix == "ice_all":   # soft translucent pieces: the whole colour was tinted by the magenta backdrop, pull every non-white pixel to ice-blue
        keep = np.clip((C.min(-1) - 175) / 55.0, 0, 1)[..., None]; w_ = 0.9 * (1 - keep); C = C * (1 - w_) + np.array([190.0, 222.0, 255.0]) * w_
    elif fix == "shadow": C = np.broadcast_to(np.array([14.0, 18.0, 32.0]), C.shape).copy(); A = np.clip(A * 1.15, 0, 1) * 0.9
    if fix in ("ice", "ice_all"):   # royal-blue outline pixels -> the deep slate the palette calls for
        dark = ((C.max(-1) < 160) & (C[..., 2] - C[..., 0] > 45))[..., None]; C = np.where(dark, C * 0.35 + np.array([44.0, 60.0, 96.0]) * 0.65, C)
    out = np.dstack([np.clip(C, 0, 255), A * 255]).astype(np.uint8); out[A < 0.02] = 0
    return Image.fromarray(out, "RGBA")
def beam_seg(col, al, box, W=128, H=56):
    """Seamless horizontal beam: per-row soft alpha/colour profile from the generated segment, then the streak lines are kept from the art, loop cross-fade 20 px."""
    x0, y0, x1, y1 = box; c = col[y0:y1, x0:x1]; a = al[y0:y1, x0:x1]; ys, xs = np.nonzero(a > 0.12); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape; ix0, ix1 = int(w * 0.05), int(w * 0.95); c = c[:, ix0:ix1]; a = a[:, ix0:ix1]; w = a.shape[1]
    prof_a = a.mean(1); prof_c = (c * a[..., None]).sum(1) / np.maximum(a.sum(1), 1e-3)[:, None]   # row profile: dithered falloff -> smooth soft alpha
    tgt = np.zeros((H, w)); rows = np.linspace(0, h - 1, H); pa = np.interp(rows, np.arange(h), prof_a)
    pc = np.stack([np.interp(rows, np.arange(h), prof_c[:, k]) for k in range(3)], 1)
    pa = np.convolve(np.pad(pa, 2, mode="edge"), np.ones(5) / 5, "valid")
    cols = np.repeat(pc[:, None, :], w, 1); alpha = np.repeat(pa[:, None], w, 1)
    detail = np.array(Image.fromarray(np.dstack([c, a * 255]).astype(np.uint8), "RGBA").resize((w, H), Image.BOX)).astype(float)   # the generated art, rows kept (streak lines)
    lum_d = detail[..., :3].mean(-1); lum_p = cols.mean(-1); k = np.clip((lum_d - lum_p) / 40.0, 0, 1)[..., None]; cols = cols * (1 - k) + detail[..., :3] * k   # only brighter streak lines come through
    # tile: resample to W and cross-fade the wrap
    cols = np.array(Image.fromarray(cols.astype(np.uint8)).resize((W + 20, H), Image.BOX)).astype(float); alpha = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).resize((W + 20, H), Image.BOX)).astype(float)
    t = np.linspace(0, 1, 20)[None, :, None]; head, tail = cols[:, :20], cols[:, W:W + 20]; cols = cols[:, 20:W + 0].copy() if False else cols
    body = cols[:, :W].copy(); body[:, :20] = tail * (1 - t) + head * t
    ab = alpha[:, :W].copy(); ab[:, :20] = alpha[:, W:W + 20] * (1 - t[..., 0]) + alpha[:, :20] * t[..., 0]
    ww = np.clip(np.minimum(np.arange(H), H - 1 - np.arange(H)) / (H * 0.22), 0, 1); ww = (ww * ww * (3 - 2 * ww))[:, None]; ab = ab * ww   # smooth fade to zero at the top/bottom rows
    lowa = np.clip((1 - ab / 255.0) * 0.8, 0, 1)[..., None]; body = body * (1 - lowa) + np.array([190.0, 222.0, 255.0]) * lowa   # soft edge reads ice-blue, never a dark band
    return Image.fromarray(np.dstack([np.clip(body, 0, 255), ab]).astype(np.uint8), "RGBA")

# sheet -> (rows layout, grow, [(name, size or (w,h), hard)])
SHEETS = {
 "air": ([3, 3, 3], 24, [("aura_halo", 96, False), ("aura_wisp_a", 72, False), ("aura_wisp_b", 66, False), ("aura_wisp_c", 60, False), ("mote_a", 14, False), ("mote_b", 10, False), ("dust_a", 40, False), ("ring_ripple", 96, False), ("distort_ring", 128, False)]),
 "rocks": ([3, 3, 3], 24, [("rock_a", 26, False), ("rock_b", 20, False), ("rock_c", 30, False), ("pebble_a", 9, False), ("pebble_b", 11, False), ("pebble_c", 9, False), ("finisher_mote_a", 24, False), ("finisher_mote_b", 24, False), ("finisher_mote_c", 24, False)]),
 "rift": ([3, 2, 2], 8, [("rift_core", 64, False), ("rift_flash", 96, False), ("rift_reticle_ring", 72, False), ("rift_beam_seg", None, False), ("rift_reticle_tick", 18, False), ("blink_streak", 110, False), ("afterimage_streak", 120, False)]),
 "strike": ([3, 3], 24, [("strike_flash_a", 56, False), ("strike_flash_b", 60, False), ("strike_slash", 110, False), ("finisher_pulse", 128, False), ("shadow_soft", 70, False), ("evasion_ghost_mask", 64, False)]),
}
ICONS = ["rift", "reversal", "form3", "evasion"]
if __name__ == "__main__":
    out = os.path.join(FORM, "fx"); ui = os.path.join(FORM, "ui"); os.makedirs(out, exist_ok=True); os.makedirs(ui, exist_ok=True); rec = {}
    for sheet, (rows, grow, items) in SHEETS.items():
        p = os.path.join(SRC, f"fx-{sheet}.png")
        if not os.path.exists(p): print("missing", sheet); continue
        col, al = unmix(np.array(Image.open(p).convert("RGB"))); boxes = order(components(al, grow), rows)
        if len(boxes) != len(items): print("WARN", sheet, "found", len(boxes), "expected", len(items), boxes); continue
        for (n, size, hard), b in zip(items, boxes):
            fix = "shadow" if n == "shadow_soft" else ("ice_all" if n in ("aura_halo", "distort_ring") else "ice" if sheet in ("air", "rift", "strike") and n not in ("evasion_ghost_mask", "rift_core") else None)
            im = beam_seg(col, al, b) if n == "rift_beam_seg" else cut(col, al, b, size, hard, fix); im.save(os.path.join(out, n + ".png")); rec[n] = {"file": n + ".png", "w": im.width, "h": im.height}
    p = os.path.join(SRC, "fx-icons.png")   # HUD icons: pure white silhouettes, 56 px pixel-snapped on a 64 px tile (same as B12)
    if os.path.exists(p):
        col, al = unmix(np.array(Image.open(p).convert("RGB"))); boxes = order(components(al, 40), [4])
        if len(boxes) != len(ICONS): print("WARN icons", len(boxes))
        else:
            for n, b in zip(ICONS, boxes):
                x0, y0, x1, y1 = b; a = (al[y0:y1, x0:x1] > 0.5); ys, xs = np.nonzero(a); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
                im = Image.fromarray((np.dstack([np.full(a.shape, 255)] * 3 + [a * 255])).astype(np.uint8), "RGBA"); s = 56 / max(im.size)
                tw, th = max(1, round(im.width * s)), max(1, round(im.height * s)); small = np.array(im.resize((tw, th), Image.BOX)).astype(float); A = (small[..., 3] > 110) * 255.0
                im = Image.fromarray(np.dstack([np.full((th, tw), 255.0)] * 3 + [A]).astype(np.uint8), "RGBA"); c = Image.new("RGBA", (64, 64), (0, 0, 0, 0)); c.alpha_composite(im, ((64 - tw) // 2, (64 - th) // 2)); c.save(os.path.join(ui, "ico_" + n + ".png"))
    pub = os.path.join(REPO, "public", "art", "fx", "kai-form3"); os.makedirs(pub, exist_ok=True)
    for n, r in rec.items(): shutil.copyfile(os.path.join(out, r["file"]), os.path.join(pub, r["file"]))
    json.dump(rec, open(os.path.join(pub, "manifest.json"), "w"), indent=1); json.dump(rec, open(os.path.join(out, "fx.json"), "w"), indent=1)
    for n in ICONS:
        f = os.path.join(ui, "ico_" + n + ".png")
        if os.path.exists(f): shutil.copyfile(f, os.path.join(REPO, "public", "ui", "icons", n + ".png"))
    print(json.dumps({k: [v["w"], v["h"]] for k, v in rec.items()}))

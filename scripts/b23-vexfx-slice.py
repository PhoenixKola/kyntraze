"""Replaces Vex's recoloured Ren effect sprites with his own ImageGen set: art/characters/vex/fx/source/vexfx.png (5x2 additive sprites on black) -> public/art/fx/vex/<slot>.png, each fitted (contain, centred) onto the slot's existing canvas size so every scale / anchor in heroFxView keeps working. Alpha comes from the glow brightness (additive art on black); rs_afterimage keeps its horizontal recolour."""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, "art", "characters", "vex", "fx", "source", "vexfx.png"); OUT = os.path.join(ROOT, "public", "art", "fx", "vex")
SLOTS = ["rs_slash1", "rs_slash2", "rs_finisher", "rs_dashlines", "rs_dashslash", "rs_impact", "rs_ring", "rs_fissure", None, "rs_fist"]   # row-major; cell 9 (afterimage) is kept as is
img = Image.open(SRC).convert("RGB"); W, H = img.size; cw, ch = W // 5, H // 2
for i, slot in enumerate(SLOTS):
    if not slot: continue
    cell = np.array(img.crop(((i % 5) * cw, (i // 5) * ch, (i % 5 + 1) * cw, (i // 5 + 1) * ch))).astype(np.float32) / 255.0
    lum = cell.max(axis=2); a = np.clip((lum - 0.04) * 1.25, 0, 1); rgb = np.where(a[..., None] > 0.01, cell / np.maximum(a[..., None], 0.04), 0).clip(0, 1)
    rgba = Image.fromarray(np.dstack([rgb * 255, a * 255]).astype(np.uint8), "RGBA"); bb = rgba.getchannel("A").point(lambda v: 255 if v > 14 else 0).getbbox(); rgba = rgba.crop(bb)
    tw, th = Image.open(os.path.join(OUT, slot + ".png")).size; s = min(tw / rgba.width, th / rgba.height); rgba = rgba.resize((max(1, round(rgba.width * s)), max(1, round(rgba.height * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0)); canvas.alpha_composite(rgba, ((tw - rgba.width) // 2, (th - rgba.height) // 2)); canvas.save(os.path.join(OUT, slot + ".png")); print(slot, (tw, th))

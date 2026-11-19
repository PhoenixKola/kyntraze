"""B23: replaces the earlier effect sprites of Kai (kai-abilities), Ren (rs_*, ra_*) and Sora (sm_*, sl_*) with new ImageGen sheets (additive art on black, art/characters/<hero>/fx/source/*.png). Each cell becomes an RGBA sprite (alpha from glow brightness) fitted onto the slot's existing canvas size so every scale/anchor in heroFxView keeps working; beams stretch to their canvas, everything else is contain-fitted and centred. Usage: python scripts/b23-herofx-slice.py"""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); C = os.path.join(ROOT, "art", "characters"); PUB = os.path.join(ROOT, "public", "art", "fx")
STRETCH = {"beam_seg", "sl_beam", "sl_beam2", "streak", "sm_dashlines", "rs_dashlines"}
SHEETS = [
    ("kai/fx/source/kaifx.png", 5, 2, "kai-abilities", ["beam_seg", "dome", "flash", "impact", "muzzle", "orb", "ring", "sphere", "streak", "trail"]),
    ("ren/fx/source/renfx.png", 5, 2, "ren", ["rs_slash1", "rs_slash2", "rs_finisher", "rs_dashlines", "rs_dashslash", "rs_impact", "rs_ring", "rs_fissure", "rs_afterimage", "rs_fist"]),
    ("ren/fx/source/renasc.png", 4, 2, "ren", ["ra_back1", "ra_back2", "ra_embers", "ra_embersring", "ra_ground", "ra_nova", "ra_pillar", "ra_veil"]),
    ("sora/fx/source/sorafx.png", 4, 3, "sora", ["sm_afterimage", "sm_arcs", "sm_back1", "sm_back2", "sm_dashlines", "sm_dashslash", "sm_ground", "sm_hit", "sm_motes", "sm_needle", "sm_ring", "sm_volley"]),
    ("sora/fx/source/soralance.png", 4, 2, "sora", ["sl_beam", "sl_beam2", "sl_cap", "sl_muzzle", "sl_orb1", "sl_orb2", "sl_orb3", "sl_vortex"]),
]
for src, cols, rows, outdir, slots in SHEETS:
    img = Image.open(os.path.join(C, src)).convert("RGB"); W, H = img.size; cw, ch = W // cols, H // rows
    for i, slot in enumerate(slots):
        cell = np.array(img.crop(((i % cols) * cw, (i // cols) * ch, (i % cols + 1) * cw, (i // cols + 1) * ch))).astype(np.float32) / 255.0
        lum = cell.max(axis=2); a = np.clip((lum - 0.05) * 1.3, 0, 1); rgb = np.where(a[..., None] > 0.01, cell / np.maximum(a[..., None], 0.05), 0).clip(0, 1)
        rgba = Image.fromarray(np.dstack([rgb * 255, a * 255]).astype(np.uint8), "RGBA"); bb = rgba.getchannel("A").point(lambda v: 255 if v > 14 else 0).getbbox(); rgba = rgba.crop(bb)
        p = os.path.join(PUB, outdir, slot + ".png"); tw, th = Image.open(p).size
        if slot in STRETCH: out = rgba.resize((tw, th), Image.LANCZOS)
        else:
            s = min(tw / rgba.width, th / rgba.height); r = rgba.resize((max(1, round(rgba.width * s)), max(1, round(rgba.height * s))), Image.LANCZOS)
            out = Image.new("RGBA", (tw, th), (0, 0, 0, 0)); out.alpha_composite(r, ((tw - r.width) // 2, (th - r.height) // 2))
        out.save(p); print(outdir, slot, (tw, th))

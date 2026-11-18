"""Vex's counter-blade as a rig part: art/b22/source/fx_vexblade.png (ImageGen, green key) -> parts/blade.png in every parts folder (hangs from the near hand bone, grip at (5.5, 7); the blade extends along the bone)."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
VEX = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); REPO = os.path.dirname(os.path.dirname(os.path.dirname(VEX)))
a = np.array(Image.open(os.path.join(REPO, "art", "b22", "source", "fx_vexblade.png")).convert("RGB")).astype(np.int16)
green = (a[..., 1] > 150) & (a[..., 1] - a[..., 0] > 70) & (a[..., 1] - a[..., 2] > 70)
im = Image.fromarray(np.dstack([a.astype(np.uint8), np.where(green, 0, 255).astype(np.uint8)]), "RGBA"); im = im.crop(im.getchannel("A").getbbox())
im = im.rotate(-90, expand=True)                                  # source points right -> hang downward along the hand bone
W, H = 11, 44; im = im.resize((W, H), Image.LANCZOS)
q = np.array(im); q[..., 3] = np.where(q[..., 3] > 110, 255, 0); out = Image.fromarray(q, "RGBA")
canvas = Image.new("RGBA", (W + 6, H + 14), (0, 0, 0, 0)); canvas.paste(out, (3, 7), out); canvas.save(os.path.join(VEX, "blade_part.png"))
folders = [os.path.join(VEX, d, "parts") for d in ("south", "north", "east", "west")] + [os.path.join(VEX, "f1", d, "parts") for d in ("south", "north", "east", "west")]
for f in folders:
    if os.path.isdir(f): canvas.save(os.path.join(f, "blade.png"))
print("blade", canvas.size, "pivot", (3 + W / 2, 7 + 0))

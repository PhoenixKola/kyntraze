"""Controlled manual pixel corrections applied AFTER extract.py (idempotent, logged in parts/CORRECTIONS.md).
Every pixel colour comes from the approved reference palette."""
import os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); PARTS = os.path.join(os.path.dirname(HERE), "parts")
SK_BASE, SK_SHADE, SK_DARK = (0xda, 0x9d, 0x70), (0xb8, 0x79, 0x50), (0x7b, 0x56, 0x48)

def mouth(a):
    # the generated mouth survived native sampling only as a 3 px line at y=39 (x 30-32): too faint at game scale.
    # Strengthen to a restrained closed mouth: 4 px dark line, soft shaded ends, small shade below the lip.
    y = 39
    for x in range(29, 33): a[y, x, :3] = SK_DARK
    a[y, 28, :3] = SK_SHADE; a[y, 33, :3] = SK_SHADE
    for x in (30, 31): a[y + 1, x, :3] = SK_SHADE
    for x in range(28, 34): a[y, x, 3] = 255
    return a

def lining(w, h, color=(0x28, 0x23, 0x2b)):
    """Dark jacket-lining shadow (flat ellipse) used as a backing piece behind the arms; sits only where parts meet."""
    a = np.zeros((h, w, 4), np.uint8); yy, xx = np.mgrid[0:h, 0:w]
    m = ((xx + 0.5 - w / 2) / (w / 2)) ** 2 + ((yy + 0.5 - h / 2) / (h / 2)) ** 2 <= 1.0
    a[m, :3] = color; a[m, 3] = 255
    return a

if __name__ == "__main__":
    for name, (w, h) in (("lining_n", (12, 10)), ("lining_f", (12, 22)), ("lining_c", (8, 8)), ("lining_w", (20, 8))):
        Image.fromarray(lining(w, h)).save(os.path.join(PARTS, name + ".png")); print("wrote", name)
    p = os.path.join(PARTS, "head.png"); a = np.array(Image.open(p).convert("RGBA"))
    ok = all(a[39, x, 3] == 255 for x in range(28, 34)) and tuple(a[39, 24, :3]) == SK_BASE
    if not ok: sys.exit("head.png does not match the expected layout; re-run extract.py first")
    Image.fromarray(mouth(a)).save(p); print("mouth correction applied to head.png")

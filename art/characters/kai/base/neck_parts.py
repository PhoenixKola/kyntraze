"""B07-pre: base-form neck piece for SOUTH / EAST / WEST (the head is drawn in front of the torso, so the jaw needs a neck that runs down into the collar).
Skin colours are the approved head-part palette. Output: <parts>/neck.png. Not used by Form I (its head is drawn behind the collar, approved)."""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
LIGHT, MID, DARK, OUT = (218, 157, 112), (184, 121, 80), (123, 86, 72), (24, 20, 23)
TARGETS = {"south": os.path.join(HERE, "production-south-candidate", "parts"), "east": os.path.join(HERE, "production-other-directions-candidate", "east", "parts"),
           "west": os.path.join(HERE, "production-other-directions-candidate", "west", "parts")}
H = 12
def make(d, w):
    a = np.zeros((H, w, 4), np.uint8)
    for y in range(H):
        for x in range(w):
            if d == "east": c = MID if x < 2 else (LIGHT if x < w - 1 else MID)          # back of neck in shade, front lit
            elif d == "west": c = MID if x >= w - 2 else (LIGHT if x > 0 else MID)
            else: c = LIGHT if 2 <= x < w - 2 else MID                                      # front view: lit centre, shaded sides
            if y >= H - 5: c = MID if c == LIGHT else DARK                                  # sinks into the collar: shadow
            if y >= H - 2: c = DARK
            a[y, x] = (*c, 255)
    for y, k in ((H - 3, 0), (H - 2, 1), (H - 1, 2)):     # rounded bottom: the neck narrows as it sinks into the collar
        a[y, :k] = 0; a[y, w - k:] = 0
    a[H - 1, a[H - 1, :, 3] > 0] = (*DARK, 255)
    return Image.fromarray(a, "RGBA")
if __name__ == "__main__":
    for d, w in (("south", 10), ("east", 9), ("west", 9)):
        make(d, w).save(os.path.join(TARGETS[d], "neck.png")); print(d, "neck.png", w, H)

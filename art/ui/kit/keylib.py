"""Chroma-key + component extraction helpers for the B14 UI kit sheets."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

KEYS = {"magenta": (255, 0, 255), "green": (0, 255, 0)}


def key(img, name):
    """Return RGBA with the flat key colour removed (soft edge) and colour spill suppressed."""
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    k = np.array(KEYS[name], np.float32)
    d = np.sqrt(((a - k) ** 2).sum(-1))
    alpha = np.clip((d - 110) / 70, 0, 1)
    out = a.copy()
    if name == "magenta":  # pull R/B down toward G where fringe remains
        lim = out[..., 1] + 14
        spill = np.clip(np.minimum(out[..., 0], out[..., 2]) - lim, 0, None)
        out[..., 0] -= spill; out[..., 2] -= spill
    else:
        lim = np.maximum(out[..., 0], out[..., 2]) + 12
        out[..., 1] = np.minimum(out[..., 1], lim)
    rgba = np.dstack([np.clip(out, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def components(rgba, min_area=4000, dilate=6):
    """Bounding boxes (x0,y0,x1,y1) of separate opaque pieces, sorted top-to-bottom then left-to-right."""
    m = np.asarray(rgba)[..., 3] > 40
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=dilate))
    boxes = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if (lab[sl] == i).sum() < min_area:
            continue
        boxes.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    boxes.sort(key=lambda b: (round(b[1] / 120), b[0]))
    return boxes


def crop(rgba, box, pad=0):
    x0, y0, x1, y1 = box
    c = rgba.crop((max(0, x0 - pad), max(0, y0 - pad), min(rgba.width, x1 + pad), min(rgba.height, y1 + pad)))
    bb = c.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    return c.crop(bb) if bb else c

"""Segment a magenta-background parts sheet into blobs: python seg.py sheet.png -> prints bboxes (reading order) and writes debug png."""
import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
def blobs(path, grow=3, minpx=400):
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    key = (abs(a[:,:,0]-255) < 75) & (a[:,:,1] < 110) & (abs(a[:,:,2]-255) < 75)
    fg = ~key; fg = ndimage.binary_opening(fg, iterations=1)
    lab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=grow)); out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        m = (lab[sl] == i) & fg[sl]
        if m.sum() < minpx: continue
        ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
        crop = np.dstack([a[sl][y0:y1, x0:x1].astype('uint8'), (m[y0:y1, x0:x1]*255).astype('uint8')])
        out.append(dict(x=sl[1].start+x0, y=sl[0].start+y0, w=x1-x0, h=y1-y0, img=Image.fromarray(crop, 'RGBA')))
    out.sort(key=lambda b: (b['y']//230, b['x'])); return out
if __name__ == '__main__':
    p = sys.argv[1]; bs = blobs(p); im = Image.open(p).convert('RGB'); d = ImageDraw.Draw(im)
    for i, b in enumerate(bs): d.rectangle([b['x'], b['y'], b['x']+b['w'], b['y']+b['h']], outline=(0, 255, 0), width=3); d.text((b['x']+4, b['y']+4), str(i), fill=(255, 255, 0)); print(i, b['x'], b['y'], b['w'], b['h'])
    im.save(sys.argv[2] if len(sys.argv) > 2 else 'seg-debug.png')

"""B21.8: converts the accepted ImageGen icon master (art/branding/b21/master-1024.png) into web + Windows icon files, and builds the concept comparison sheet.
Usage: python scripts/b21-build-icons.py sheet | build   (Pillow only; ImageGen output is converted, never redrawn)"""
import os, sys
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = os.path.join(ROOT, "art", "branding", "b21")
def key(im, thr=236):
    """flat white (or near-white) background to alpha, flood-filled from the corners so interior highlights survive"""
    im = im.convert("RGBA"); w, h = im.size; px = im.load(); seen = bytearray(w * h); st = [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]
    while st:
        x, y = st.pop()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y*w+x]: continue
        r, g, b, a = px[x, y]
        if min(r, g, b) < thr: continue
        seen[y*w+x] = 1; px[x, y] = (r, g, b, 0); st += [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]
    return im
def fit(im, size):
    bb = im.getbbox() or (0,0)+im.size; im = im.crop(bb); s = max(im.size); sq = Image.new("RGBA", (s, s), (0,0,0,0)); sq.paste(im, ((s-im.width)//2, (s-im.height)//2)); return sq.resize((size, size), Image.LANCZOS)
def sheet():
    names = ["a-shard", "b-crackedK", "c-core"]; sizes = [16, 32, 48, 64, 256]; W = sum(sizes) + 20*(len(sizes)+1); rows = []
    out = Image.new("RGBA", (W, 2*3*300), (0,0,0,255)); d = ImageDraw.Draw(out); y = 0
    for n in names:
        src = fit(key(Image.open(next(q for q in (os.path.join(B, d, n + ".png") for d in ("concepts", "rejected")) if os.path.exists(q)))), 1024)
        for bg in [(10,17,30,255), (240,240,240,255)]:
            d.rectangle([0, y, W, y+299], fill=bg); x = 20
            for s in sizes:
                out.alpha_composite(src.resize((s, s), Image.LANCZOS), (x, y + (300-s)//2)); x += s + 20
            d.text((6, y+4), n, fill=(255,255,255,255) if bg[0] < 100 else (0,0,0,255)); y += 300
    out.convert("RGB").save(os.path.join(B, "comparison-sheet.png"))
def build():
    m = fit(key(Image.open(os.path.join(B, "master-1024.png"))), 1024); m.save(os.path.join(B, "master-1024-alpha.png"))
    pub = os.path.join(ROOT, "public", "icons"); bld = os.path.join(ROOT, "build", "icons"); os.makedirs(pub, exist_ok=True); os.makedirs(bld, exist_ok=True)
    for s in (16, 32, 48, 64, 180, 192, 512): m.resize((s, s), Image.LANCZOS).save(os.path.join(pub, f"icon-{s}.png"))
    m.resize((32, 32), Image.LANCZOS).save(os.path.join(pub, "favicon.png"))
    m.save(os.path.join(pub, "favicon.ico"), sizes=[(16,16),(32,32),(48,48)])
    m.save(os.path.join(bld, "icon.ico"), sizes=[(s,s) for s in (16,24,32,48,64,128,256)])
    m.save(os.path.join(bld, "icon-1024.png")); m.resize((512, 512), Image.LANCZOS).save(os.path.join(bld, "icon.png"))
if __name__ == "__main__": {"sheet": sheet, "build": build}[sys.argv[1]]()

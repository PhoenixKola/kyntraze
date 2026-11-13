"""Quick look: python preview.py <dir> <Idle|Run|BasicPunch|neutral> <frames|all> <out.png> [zoom]  (numpy renderer, same FK as Blender)"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
os.environ["KAI_DIR"] = sys.argv[1]
import danim as a, drig as r
from PIL import Image, ImageDraw
i1 = r.load_images(); i8 = r.load_images(True)
name = sys.argv[2]
if name == "neutral": frames = [(a.solve(a.stance()) + ({k: a.hand_slot(a.stance(), k[-1]) for k in ("hand_n", "hand_f")},))]; label = "neutral"
else:
    clip = {f()["name"]: f for f in a.CLIPS}[name](); sol = a.solve_clip(clip)
    idx = range(len(sol)) if sys.argv[3] == "all" else [int(x) for x in sys.argv[3].split(",")]; frames = [sol[i] for i in idx]; label = name
Z = int(sys.argv[5]) if len(sys.argv) > 5 else 3; tiles = []
for n, (ch, order, errs, slots) in enumerate(frames):
    im = Image.new("RGBA", r.CANVAS, (48, 48, 58, 255)); im.alpha_composite(Image.fromarray(r.render_final(ch, i1, i8, slots, order)))
    im = im.crop((0, 8, r.CANVAS[0], r.CANVAS[1])).resize((r.CANVAS[0] * Z, (r.CANVAS[1] - 8) * Z), Image.NEAREST)
    ImageDraw.Draw(im).text((4, 4), f"{label} {sys.argv[3].split(',')[n] if sys.argv[3] != 'all' else n}", fill=(255, 255, 0)); tiles.append(im)
out = Image.new("RGBA", (tiles[0].width * len(tiles), tiles[0].height))
for k, t in enumerate(tiles): out.paste(t, (k * t.width, 0))
out.save(sys.argv[4])

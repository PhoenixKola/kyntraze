"""B08.1 review images for the Seraph art fix. Needs art/bosses/review/b09-seraph-fix/_before.png (= `git show 2ff0e13:public/art/bosses/seraph.png`)."""
from PIL import Image
import hashlib, json
D = 'art/bosses/review/b09-seraph-fix/'; fw, fh = 418, 385; B = D + '_before.png'; A = 'public/art/bosses/seraph.png'
fr = lambda p, i: Image.open(p).convert('RGBA').crop(((i % 4) * fw, (i // 4) * fh, (i % 4) * fw + fw, (i // 4) * fh + fh))
floor = Image.open('public/art/arena/floor-0.png').convert('RGBA').resize((128, 128))
def dark(w, h):
    bg = Image.new('RGBA', (w, h))
    for y in range(0, h, 128):
        for x in range(0, w, 128): bg.paste(floor, (x, y))
    bg.alpha_composite(Image.new('RGBA', (w, h), (4, 9, 18, 117))); return bg
def board(p, frames, scale, kind):
    cw, ch = int(fw * .5 * scale), int(fh * .5 * scale); bg = dark(cw * len(frames), ch) if kind == 'dark' else Image.new('RGBA', (cw * len(frames), ch), (214, 218, 226, 255))
    for k, i in enumerate(frames): bg.alpha_composite(fr(p, i).resize((cw, ch), Image.NEAREST), (k * cw, 0))
    return bg.convert('RGB')
def stack(rows):
    s = Image.new('RGB', (rows[0].size[0], sum(r.size[1] for r in rows))); y = 0
    for r in rows: s.paste(r, (0, y)); y += r.size[1]
    return s
stack([board(p, list(range(a, a + 8)), 1, k) for p in (B, A) for k in ('dark', 'light') for a in (0, 8)]).save(D + '1x-before-then-after-dark-and-light.png')
stack([board(B, [4, 5], 2, 'dark'), board(A, [4, 5], 2, 'dark'), board(B, [8, 9], 2, 'dark'), board(A, [8, 9], 2, 'dark')]).save(D + '2x-frames-4-5-8-9-before-after-dark.png')
for tag, p in (('before', B), ('after', A)):
    c = fr(p, 1).crop((120, 60, 300, 200)); o = Image.new('RGB', (c.size[0] * 12, c.size[1] * 6))
    for k, col in enumerate([(14, 22, 36), (214, 218, 226)]):
        bg = Image.new('RGBA', c.size, col + (255,)); bg.alpha_composite(c); o.paste(bg.resize((c.size[0] * 6, c.size[1] * 6), Image.NEAREST).convert('RGB'), (k * c.size[0] * 6, 0))
    o.save(D + f'6x-edge-frame1-{tag}.png')
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
json.dump({'before_seraph_png_sha256': sha(B), 'after_seraph_png_sha256': sha(A), 'before': 'git 2ff0e13 public/art/bosses/seraph.png', 'magenta_edge_px_before_after': [12664, 'see report'], 'method': 'scripts/build-elite-art.py strip_projectiles + despill'}, open(D + 'evidence.json', 'w'), indent=1)

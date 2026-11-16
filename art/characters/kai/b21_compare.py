"""Old vs new Kai clip frames, nearest-neighbour: python b21_compare.py <oldSheetsDir> <newSheetsDir> <direction> <out.png> [zoom] [form=kai]
Dirs hold manifest.json + kai_<dir>_<clip>.png (kai-f1 etc. use the same layout with a different prefix handled by globbing)."""
import sys, json, os, glob
from PIL import Image
old, new, d, out = sys.argv[1:5]; Z = int(sys.argv[5]) if len(sys.argv) > 5 else 3
def load(dr, clip):
    m = json.load(open(os.path.join(dr, 'manifest.json'))); a = m['animations'][clip]; fw = a.get('frame_width') or m['frame_width']; fh = a.get('frame_height') or m['frame_height']
    f = [p for p in glob.glob(os.path.join(dr, '**', '*.png'), recursive=True) if p.lower().endswith('_' + clip.lower() + '.png')][0]; im = Image.open(f).convert('RGBA')
    return [im.crop((i * fw, 0, (i + 1) * fw, fh)) for i in range(a['frames'])], (fw, fh)
rows = []
for clip, idx in (('Idle', [0, 2, 4, 6, 8, 10, 12, 14]), ('Hurt', [0, 1, 2, 3, 4, 5, 6, 7]), ('Run', [0, 1, 2, 3, 4, 5, 6, 7])):
    for tag, dr in (('old', old), ('new', new)):
        fr, (fw, fh) = load(dr, clip); rows.append((f'{clip} {tag}', [fr[i] for i in idx if i < len(fr)], fw, fh))
W = max(len(r[1]) * (r[2] + 4) for r in rows) * Z; H = sum(r[3] + 4 for r in rows) * Z
S = Image.new('RGBA', (W, H), (22, 30, 48, 255)); y = 0
for name, frs, fw, fh in rows:
    for i, f in enumerate(frs): S.alpha_composite(f.resize((fw * Z, fh * Z), Image.NEAREST), (i * (fw + 4) * Z, y))
    y += (fh + 4) * Z
S.convert('RGB').save(out)

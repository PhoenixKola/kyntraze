"""Sora hand anchors (schema of public/art/kai-anchors.json), measured on the real Sora rigs (same FK/parts/slots as the Blender export).
  python build_anchors.py [forms...]   forms default 'base'  (f1 = Sovereign, when its rig exists)  ->  public/art/sora-anchors.json
Anchor = centroid of the visible hand art in exported sprite px relative to the manifest ground origin (x right, y down); m = midpoint of both hands.
One process per (direction, form): `python build_anchors.py --one <dir> <form>` prints JSON (rig modules cannot be re-imported in one process)."""
import json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); SORA = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(SORA, '..', '..', '..'))


def one(d, form):
    if form == 'f1':
        os.environ['KAI_FORM'] = 'f1'; os.environ['KAI_PAD_TOP'] = '24'; os.environ['KAI_PAD_LEFT'] = '16' if d == 'south' else '0'
    if d == 'south':
        sys.path.insert(0, os.path.join(SORA, 'south', 'rig'))
        if form == 'f1':
            os.environ['KAI_ROOT_SOUTH'] = os.path.join(SORA, 'south-f1')
        import anim as a, rig as r
    else:
        os.environ['KAI_DIR'] = d
        if form == 'f1':
            os.environ['KAI_ROOT'] = os.path.join(SORA, 'dirs-f1')
        sys.path.insert(0, os.path.join(SORA, 'dirs', 'scripts')); import danim as a, drig as r
    imgs = r.load_images()

    def pts(ch, slots, side):
        W = r.fk(ch); out = None
        for p in r.visible(slots):
            if p['bone'] != 'hand_%s' % side or not p['id'].startswith('fist'):
                continue
            img, _ = imgs[p['id']]; Ap, tp = r.part_rest(p); Ab, tb, _r = W[p['bone']]; A = Ab @ Ap; t = Ab @ tp + tb
            ys, xs = np.nonzero(img[..., 3] > 0); out = ((A @ np.stack([xs + 0.5, ys + 0.5])).T + t).mean(0) - np.array(r.ROOT)
        return out

    def run(name):
        clip = next(f() for f in a.CLIPS if f()['name'] == name); res = []
        for ch, order, errs, slots in a.solve_clip(clip):
            fr = {}
            for s in ('n', 'f'):
                c = pts(ch, slots, s); fr[s] = [round(float(c[0]), 2), round(float(c[1]), 2)] if c is not None else None
            fr['m'] = [round((fr['n'][0] + fr['f'][0]) / 2, 2), round((fr['n'][1] + fr['f'][1]) / 2, 2)]
            res.append(fr)
        return res
    print(json.dumps({'Beam': run('Beam'), 'Sphere': run('Sphere'), 'BasicPunch': run('BasicPunch')}))


if __name__ == '__main__':
    if sys.argv[1] == '--one':
        one(sys.argv[2], sys.argv[3]); sys.exit(0)
    forms = sys.argv[1:] or ['base']
    out_p = os.path.join(REPO, 'public', 'art', 'sora-anchors.json')
    out = json.load(open(out_p)) if os.path.exists(out_p) else {'schema': 'kyntraze.hand-anchors/1', 'unit': 'sprite px relative to the manifest ground origin (x right, y down)', 'fist': 'centroid of the visible hand art', 'forms': {}}
    for form in forms:
        out['forms'][form] = {}
        for d in ('south', 'north', 'east', 'west'):
            r = subprocess.run([sys.executable, os.path.abspath(__file__), '--one', d, form], capture_output=True, text=True)
            if r.returncode:
                print(r.stderr[-1500:]); sys.exit(1)
            out['forms'][form][d] = json.loads(r.stdout.strip().splitlines()[-1])
    json.dump(out, open(out_p, 'w'), separators=(',', ':')); print('wrote', out_p, list(out['forms']))

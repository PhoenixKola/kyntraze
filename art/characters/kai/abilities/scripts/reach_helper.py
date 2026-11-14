"""Shared two-bone 'hands to target' helper for the B05 clips. NOT imported by the pipelines directly: its source is
exec'd by anim_b05.py (SOUTH) and danim_b05.py (NORTH/EAST/WEST) so both use identical maths. Provides `make_reach(a, r)`.
A key pose is authored as: body offsets (pelvis/chest/head/...) + where the two FIST CENTRES must be (midpoint + gap, in sprite px
relative to the ground origin). The helper solves both arms so the fist art lands there, using the same solver convention as the rest of the pipeline
(angle 0 = down the screen, + = toward screen right)."""
import math
import numpy as np

FIST_OFFSET = 8.0   # wrist -> visible fist centroid (measured on the fist art)

def make_reach(a, r):
    imgs = r.load_images()
    def centroid(ch, slots, side):
        W = r.fk(ch); out = None
        for p in r.visible(slots):
            if p['bone'] != f'hand_{side}' or not p['id'].startswith('fist'): continue
            img, _ = imgs[p['id']]; Ap, tp = r.part_rest(p); Ab, tb, _r = W[p['bone']]; A = Ab @ Ap; t = Ab @ tp + tb
            ys, xs = np.nonzero(img[..., 3] > 0); out = ((A @ np.stack([xs + 0.5, ys + 0.5])).T + t).mean(0)
        return out
    def ang(v): return math.degrees(math.atan2(v[0], v[1]))
    def elbow_for(sh, wr, L1, L2, pref, side):
        d = wr - sh; D = float(np.linalg.norm(d)); D = min(max(D, abs(L1 - L2) + 1e-3), L1 + L2 - 1e-3)
        k = (L1 * L1 - L2 * L2 + D * D) / (2 * D); h = math.sqrt(max(0.0, L1 * L1 - k * k)); u = d / np.linalg.norm(d); n = np.array([u[1], -u[0]])
        c = [sh + u * k + s * n * h for s in (1, -1)]
        sign = -1.0 if side == "n" else 1.0
        def score(e):
            if pref == "down": return e[1]
            if pref == "out": return sign * e[0] * 1.0 - 0.2 * e[1]
            if pref == "outdown": return sign * e[0] + 0.5 * e[1]
            if pref == "back": return pref_back[0] * e[0]
            return 0.0
        return max(c, key=score)
    pref_back = [-1.0]
    def reach(pose, targets, slots, pref="outdown", back=-1.0):
        """targets: {side: (x, y)} fist centres in sprite px relative to the ground origin; slots: {side: slot}. Returns {arm_n, arm_f}."""
        pref_back[0] = back
        p0 = {k: v for k, v in pose.items() if k not in ("arm_n", "arm_f")}
        ch, _o, _e = a.solve(p0); W = r.fk(ch); out = {}
        for s, tgt in targets.items():
            sh = r.apply(W, f"upper_arm_{s}", a.REST[f"upper_arm_{s}"][0])
            L1 = min(a.rest_len(f"upper_arm_{s}"), a.ART_LEN[f"upper_arm_{s}"]); L2 = min(a.rest_len(f"forearm_{s}"), a.ART_LEN[f"forearm_{s}"])
            T = np.array(r.ROOT, float) + np.array(tgt, float)
            wr = T.copy()
            for _ in range(4):
                v = T - sh; dn = float(np.linalg.norm(v)) or 1.0; wr = T - v / dn * FIST_OFFSET
                dd = wr - sh; D = float(np.linalg.norm(dd))
                if D > L1 + L2 - 0.5: wr = sh + dd / D * (L1 + L2 - 0.5)
            arm = None
            for _it in range(5):
                el = elbow_for(sh, wr, L1, L2, pref, s)
                arm = a.arm(ang(el - sh), float(np.linalg.norm(el - sh)), ang(wr - el), float(np.linalg.norm(wr - el)), hand=0.0, slot=slots.get(s))
                trial = dict(p0); trial[f"arm_{s}"] = arm; trial_slots = a.slots_of(trial) if hasattr(a, "slots_of") else {}
                c2, _o2, _e2 = a.solve(trial); got = centroid(c2, {**trial_slots, **({f"hand_{s}": slots.get(s)} if slots.get(s) else {})}, s)
                if got is None: break
                err = T - got
                if float(np.linalg.norm(err)) < 0.6: break
                wr = wr + err; dd = wr - sh; D = float(np.linalg.norm(dd))
                if D > L1 + L2 - 0.5: wr = sh + dd / D * (L1 + L2 - 0.5)
            out[f"arm_{s}"] = arm
        return out
    return reach

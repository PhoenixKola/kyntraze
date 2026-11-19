import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { HeroAnimator, type HeroAnimInput, type HeroActView } from '../assets/heroAnimation';
import { KAI_DIRS, parseKaiManifest, type KaiManifests } from '../assets/kaiAnimation';

const pub = (p: string) => new URL(`../../public/art/${p}`, import.meta.url);
const manifest = (set: string, dir: string) => JSON.parse(readFileSync(pub(`${set}/${dir}/manifest.json`), 'utf8'));
const pngWidth = (u: URL) => readFileSync(u).readUInt32BE(16);
const load = (set: string, form: 'base' | 'f1'): KaiManifests => Object.fromEntries(KAI_DIRS.map(d => [d, parseKaiManifest(manifest(set, d), d, form)])) as KaiManifests;

describe('B23 shipped clips: reveal + Victory for the seven forms, Vex bespoke set', () => {
  const REVEAL_SETS = ['kai-f1', 'kai-f2', 'kai-f3', 'ren-f1', 'sora-f1', 'vex-f1', 'vex-f2'];
  it('every transformation has a Transform with its commit event and a Victory with a hold frame, in all four facings, and the sheets match their manifests', () => {
    for (const set of REVEAL_SETS) for (const d of KAI_DIRS) {
      const m = manifest(set, d), t = m.animations.Transform, v = m.animations.Victory;
      expect(t?.events?.form_commit, `${set}/${d} Transform commit`).toBeTypeOf('number'); expect(v, `${set}/${d} Victory`).toBeDefined(); expect(v.events.hold, `${set}/${d} hold`).toBeGreaterThan(3); expect(v.events.hold).toBeLessThan(v.frames - 2);
      for (const a of [t, v]) { const f = pub(`${set}/${d}/${a.sheet}`); expect(existsSync(f), `${set}/${d}/${a.sheet}`).toBe(true); expect(pngWidth(f), `${set}/${d} ${a.sheet} width`).toBe((a.frame_width ?? m.frame_width) * a.frames); }
    }
  });
  it('Vex has his own Guard and Riposte in every form and facing (loop vs one-shot, impact event inside the clip)', () => {
    for (const set of ['vex', 'vex-f1', 'vex-f2']) for (const d of KAI_DIRS) {
      const m = manifest(set, d), g = m.animations.Guard, r = m.animations.Riposte;
      expect(g?.loop, `${set}/${d} Guard`).toBe(true); expect(r?.loop).toBe(false); expect(r.events.impact).toBeGreaterThan(0); expect(r.events.impact).toBeLessThan(r.frames - 1);
      for (const a of [g, r]) { const f = pub(`${set}/${d}/${a.sheet}`); expect(existsSync(f)).toBe(true); expect(pngWidth(f)).toBe((a.frame_width ?? m.frame_width) * a.frames); }
    }
  });
  it('Ren and Sora do not borrow Vex\'s clips', () => { for (const set of ['ren', 'ren-f1', 'sora', 'sora-f1']) expect(manifest(set, 'south').animations.Guard).toBeUndefined(); });
});

const idleIn = (act: HeroActView | null): HeroAnimInput => ({ dt: 1 / 60, alive: true, moving: false, inputX: 0, inputY: 0, runSpeed: 250, dashing: false, dashX: 0, dashY: 0, dashRemaining: 0, hurt: false, form: 0, cinema: null, act, strike: { t: -9, x: 0, y: 1 } });
const act = (a: HeroActView['act'], t: number, dur: number, extra: Partial<HeroActView> = {}): HeroActView => ({ id: 1, act: a, t, dur, face: 'south', released: false, moving: false, beats: 0, hop: 0, hops: 0, hopT: 0, charge: 0, ...extra });
describe('B23 Vex runtime uses his own clips', () => {
  it('Parry Halo plays Guard, a successful counter plays Riposte from its strike frame, Rift Reversal cuts with Riposte after the blink', () => {
    const an = new HeroAnimator('vex', load('vex', 'base'), load('vex-f1', 'f1'));
    expect(an.update(idleIn(act('parry_halo', 0.3, 1.75))).clip).toBe('Guard');
    const rip = an.update(idleIn(act('parry_halo', 0.4, 1.75, { riposte: 0.05 }))); expect(rip.clip).toBe('Riposte'); expect(rip.frame).toBeGreaterThanOrEqual(3);
    expect(an.update(idleIn(act('parry_halo', 1.2, 1.75, { riposte: 3 }))).clip).toBe('Guard');
    expect(new HeroAnimator('vex', load('vex', 'base')).update(idleIn(act('rift_reversal', 0.05, 0.45))).clip).toBe('Dash');
    const cut = new HeroAnimator('vex', load('vex', 'base')).update(idleIn(act('rift_reversal', 0.3, 0.45))); expect(cut.clip).toBe('Riposte');
  });
  it('Ren keeps the old mapping (no Guard clip in his set): Parry-less acts never pick Vex clips', () => {
    const an = new HeroAnimator('ren', load('ren', 'base')); expect(an.update(idleIn(act('crimson_break', 0.1, 1))).clip).not.toMatch(/Guard|Riposte/);
  });
});

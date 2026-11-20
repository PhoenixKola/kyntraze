import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { HeroAnimator } from '../assets/heroAnimation';
import { VEX_F1_CLIPS, VEX_F2_CLIPS, KAI_DIRS, parseKaiManifest, type KaiManifests } from '../assets/kaiAnimation';

const load = (form: 'vex' | 'vex-f1' | 'vex-f2'): KaiManifests => Object.fromEntries(KAI_DIRS.map(d => [d, parseKaiManifest(JSON.parse(readFileSync(`public/art/${form}/${d}/manifest.json`, 'utf8')), d, form === 'vex' ? 'base' : 'f1')])) as unknown as KaiManifests;

describe('B28 Vex authored poses', () => {
  it('both forms ship every authored clip in all four facings, with the sheet on disk and a release event', () => {
    for (const [form, clips] of [['vex-f1', VEX_F1_CLIPS], ['vex-f2', VEX_F2_CLIPS]] as const) {
      const m = load(form);
      for (const d of KAI_DIRS) for (const c of clips) {
        const a = (m[d].animations as unknown as Record<string, { sheet: string; frames: number; events: Record<string, number> }>)[c];
        expect(a, `${form} ${d} ${c}`).toBeTruthy(); expect(existsSync(`public/art/${form}/${d}/${a.sheet}`)).toBe(true); expect(a.frames).toBeGreaterThanOrEqual(4);
        if (c !== 'Glide' && c !== 'Hover') expect(a.events).toBeTruthy();
      }
    }
  });
  const act = (name: string, t: number, released = false) => ({ id: 1, act: name as never, t, dur: 1, face: 'south' as const, released, moving: false, beats: 0, hop: 0, hops: 0, hopT: 0, charge: t });
  const inp = (form: number, over: object = {}) => ({ dt: 1 / 60, alive: true, moving: false, inputX: 0, inputY: 0, runSpeed: 250, dashing: false, dashX: 0, dashY: 0, dashRemaining: 0, hurt: false, form, cinema: null, act: null, strike: { t: -9, x: 0, y: 1 }, ...over });
  it('the animator selects the authored clips for the real act kinds, flight and the Voidheart hover / blink', () => {
    const mk = () => new HeroAnimator('vex', load('vex'), load('vex-f1'), load('vex-f2'));
    const want: Array<[number, string, string]> = [[1, 'mirror_guard', 'CastQ'], [2, 'phantom_legion', 'CastQ'], [1, 'rift_execution', 'CastE'], [2, 'dim_severance', 'CastE'], [1, 'oath_ruin', 'CastR'], [2, 'domain_exile', 'CastR'], [1, 'abyssal_fang', 'VCharge'], [2, 'event_horizon', 'VCharge']];
    for (const [form, a, clip] of want) { const an = mk(); an.update(inp(form)); const p = an.update(inp(form, { act: act(a, 0.1) })); expect(p.clip, a).toBe(clip); expect(p.frame).toBeLessThan(40); }
    const an = mk(); an.update(inp(2)); expect(an.update(inp(2, { act: act('event_horizon', 1, true) })).clip).toBe('VRelease');
    const f = mk(); f.update(inp(1)); expect(f.update(inp(1, { flyT: 0.1 })).clip).toBe('Takeoff'); expect(f.update(inp(1, { flyT: 1 })).clip).toBe('Glide');
    const v = mk(); v.update(inp(2)); expect(v.update(inp(2)).clip).toBe('Hover'); expect(v.update(inp(2, { dashing: true, dashRemaining: 0.1, dashX: 1 })).clip).toBe('Blink');
    const r = mk(); r.update(inp(1)); expect(r.update(inp(1)).clip).toBe('Idle');
  });
});

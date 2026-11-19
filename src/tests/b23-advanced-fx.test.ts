import { describe, expect, it } from 'vitest';
import { SIGNATURES, drawSignature, signatureOf, type Pen } from '../game/render/advancedFx';
import { SFX, signatureSfx } from '../game/audio/b22Sfx';
import { BRANCHES } from '../b22/branches';
import { LEGENDARIES } from '../b22/legendary';
import { RELIC_IDS } from '../b22/relics';
import { PAIRS } from '../b22/pairs';

const pen = () => { const calls: string[] = []; const p = new Proxy({}, { get: (_t, k: string) => (...a: unknown[]) => { calls.push(`${k}`); void a; return p; } }); return { p: p as unknown as Pen, calls }; };

describe('B23 every advanced entry has its own signature and sound', () => {
  it('24 branches, 12 legendaries, 8 relics, 6 pair attacks and 4 ultimates are covered', () => {
    expect(BRANCHES.length).toBe(24); for (const b of BRANCHES) expect(signatureOf(b.id), b.id).not.toBeNull();
    expect(LEGENDARIES.length).toBe(12); for (const l of LEGENDARIES) expect(signatureOf(l.id), l.id).not.toBeNull();
    expect(RELIC_IDS.length).toBe(8); for (const r of RELIC_IDS) expect(signatureOf(r), r).not.toBeNull();
    expect(PAIRS.length).toBe(6); for (const p of PAIRS) expect(signatureOf(`pair_${({ kai_ren: 'dragonfall', kai_sora: 'convergence', ren_sora: 'singularity', kai_vex: 'oath', ren_vex: 'ruinbreaker', sora_vex: 'eclipse' } as Record<string, string>)[p.id]}`), p.id).not.toBeNull();
    for (const h of ['kai', 'ren', 'sora', 'vex']) expect(signatureOf(`ult_${h}`)).not.toBeNull();
  });
  it('the two branches of one skill differ in shape, not just colour', () => {
    for (const b of BRANCHES.filter(x => x.side === 'A')) { const o = BRANCHES.find(x => x.hero === b.hero && x.slot === b.slot && x.side === 'B')!; expect(SIGNATURES[b.id].shape, `${b.id} vs ${o.id}`).not.toBe(SIGNATURES[o.id].shape); }
  });
  it('every entry has a distinct sound recipe', () => {
    const seen = new Set<string>(); for (const id of Object.keys(SIGNATURES)) { const k = signatureSfx(id)!; expect(SFX[k], id).toBeDefined(); const r = SFX[k]; seen.add(`${r.f0.toFixed(1)}|${r.f1.toFixed(1)}|${r.wave}`); }
    expect(seen.size).toBe(Object.keys(SIGNATURES).length);
  });
  it('every shape draws at every progress value without throwing, and reduced effects still draw', () => {
    for (const [id, sg] of Object.entries(SIGNATURES)) for (const u of [0, 0.3, 0.7, 0.99]) { const { p, calls } = pen(); expect(() => drawSignature(p, sg, 100, 100, 120, u, { ang: 1, x2: 200, y2: 150, seed: 3, reduced: u > 0.5 }), id).not.toThrow(); expect(calls.length, id).toBeGreaterThan(0); }
  });
});

import { Simulation } from '../sim/Simulation';
import { schedule, updateFx, zoneFx } from '../sim/BranchSystem';
describe('B23 the sim emits each entry\'s own id at the real effect position', () => {
  it('scheduled effects and zones announce their source id with position and size', () => {
    const s = new Simulation(5, 'gloam').state;
    schedule(s, { at: s.time, kind: 'nova', x: 321, y: 123, r: 90, dmg: 1, push: 0, stagger: 0, cap: 4, src: 'twin_nova' }); updateFx(s, 0.016);
    const a = s.b22.ev.find(e => e.kind === 'twin_nova'); expect(a).toBeDefined(); expect(a!.x).toBe(321); expect(a!.y).toBe(123); expect(a!.n).toBe(90);
    zoneFx(s, { kind: 'line', x: 10, y: 20, x2: 310, y2: 20, r: 30, dur: 2, tick: 0.3, dmg: 1, push: 0, src: 'burning_wake' });
    const z = s.b22.ev.find(e => e.kind === 'burning_wake'); expect(z).toBeDefined(); expect(z!.x2).toBe(310);
  });
});

import { activateForm } from '../sim/FormSystem';
describe('B23 each transformation announces its own reveal at the commit', () => {
  it('Flarebound commits with reveal_flare; all seven reveals have distinct signatures and sounds, Stillfire is the quietest', () => {
    const s = new Simulation(5, 'gloam', true, true).state; s.player.drive = 100; s.heroFormUnlocked = true; expect(activateForm(s, 1)).toBe(true);
    expect(s.player.form).toBe(1); expect(s.b22.ev.some(e => e.kind === 'reveal_flare')).toBe(true);
    const ids = ['flare', 'comet', 'still', 'ren', 'sora', 'vex1', 'vex2'].map(k => `reveal_${k}`); for (const id of ids) expect(signatureOf(id), id).not.toBeNull();
    expect(new Set(ids.map(id => SIGNATURES[id].shape + SIGNATURES[id].color)).size).toBe(7);
    const gains = ids.map(id => SFX[signatureSfx(id)!].gain); expect(SFX[signatureSfx('reveal_still')!].gain).toBe(Math.min(...gains));
  });
});

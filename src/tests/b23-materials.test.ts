import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { MATERIAL, markSpawns, planMarks, type MarkPlan } from '../game/render/arenaMarkPlan';
import { ARENA_IDS } from '../content/arenas';
import { NO_CONFIG } from '../sim/RunConfig';

const plan: MarkPlan = { kind: 'crack', x: 0, y: 0, radius: 80, rot: 1, hero: 'hostile', life: 8, strong: true };
describe('B23 arena materials: every arena has its own, nothing falls back to another floor', () => {
  it('four distinct materials, all arenas covered', () => {
    expect(Object.keys(MATERIAL).sort()).toEqual([...ARENA_IDS].sort());
    expect(new Set(Object.values(MATERIAL).map(m => m.crack)).size).toBe(ARENA_IDS.length);
  });
  it('the realm floors use their own crack tint, not Gloam or Ashen', () => {
    for (const a of ['aetherfall', 'paradox'] as const) { const s = markSpawns(plan, a, false); expect(s[0].tint).toBe(MATERIAL[a].crack); expect(s[0].tint).not.toBe(MATERIAL.gloam.crack); expect(s[0].tint).not.toBe(MATERIAL.ashen.crack); }
  });
  it('Vex leaves marks, and Voidheart marks are silver-graphite rather than violet', () => {
    const sim = new Simulation(3, 'gloam', false, false, { ...NO_CONFIG, hero: 'vex' }), s = sim.state;
    s.abilityEvents.push({ id: 1, kind: 'seal_detonate', x: 10, y: 20 } as never); expect(planMarks(s, 0, 0).plans[0].hero).toBe('vex');
    s.player.form = 2; s.abilityEvents.length = 0; s.abilityEvents.push({ id: 2, kind: 'seal_detonate', x: 10, y: 20 } as never);
    const p = planMarks(s, 0, 0).plans[0]; expect(p.glow).toBeDefined(); const r = (p.glow! >> 16) & 255, b = p.glow! & 255; expect(Math.abs(r - b)).toBeLessThan(40);
    const spawns = markSpawns(p, 'paradox', false); expect(spawns.some(q => q.tint === p.glow)).toBe(true);
  });
  it('the new Kai kit leaves scars sized from real kit constants', () => {
    const sim = new Simulation(3, 'gloam', true, true), s = sim.state; s.abilityEvents.push({ id: 5, kind: 'crucible_final', x: 0, y: 0 } as never, { id: 6, kind: 'scatter_blast', x: 0, y: 0 } as never, { id: 7, kind: 'meteor_beat', x: 0, y: 0, n: 100 } as never);
    const pl = planMarks(s, 0, 0).plans; expect(pl.length).toBe(3); expect(pl[0].radius).toBeCloseTo(138 * 1.12);
  });
});

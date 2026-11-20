import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { NO_CONFIG } from '../sim/RunConfig';
import type { Enemy, InputState } from '../sim/GameState';
import { SORA_AUTO, SORA_E, SORA_FLY, SORA_OD, SORA_Q, SORA_R, SORA_V } from '../content/soraCombat';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const foe = (id: number, x: number, y: number, hp = 1e6, kind: Enemy['kind'] = 'pursuer'): Enemy => ({ id, x, y, kind, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
function setup(foes: Array<[number, number, number?]> = [], form: 0 | 1 = 1) {
  const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'sora', heroForm: true }), s = sim.state;
  s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.hp = s.player.maxHp = 1e6; s.player.form = form; s.player.drive = 100; s.player.attackClock = 1e9; s.player.aimX = 1; s.player.aimY = 0;
  s.enemies = foes.map(([x, y, hp], i) => foe(100 + i, x, y, hp ?? 1e6)); return { sim, s };
}
const run = (sim: Simulation, sec: number, i: InputState = idle()) => { for (let k = 0; k < Math.round(sec / DT); k++) sim.step(DT, i); };
const kinds = (s: ReturnType<typeof setup>['s']) => s.abilityEvents.map(e => e.kind);

describe('Astral Blades (transformed auto)', () => {
  it('runs the four named beats in order with 1, 1, 2 and 3 real blade projectiles', () => {
    const { sim, s } = setup([[1300, 800]]); const counts: number[] = [];
    for (let i = 0; i < 4; i++) { s.player.attackClock = 0; const before = s.hx.bolts.length; sim.step(DT, idle()); counts.push(s.hx.bolts.filter(b => b.kind === 'blade').length - before); s.hx.bolts = []; }
    expect(counts).toEqual([1, 1, 2, 3]); const beats = s.abilityEvents.filter(e => e.kind === 'sora_auto'); expect(beats.map(e => (e.n ?? 0) & 3)).toEqual([0, 1, 2, 3]);
  });
  it('blades really hit what they cross and nothing happens when nobody is in range', () => {
    const { sim, s } = setup([[1260, 800]]); s.player.attackClock = 0; run(sim, 0.4); expect(s.enemies[0].hp).toBeLessThan(1e6);
    const b = setup([[1100 + SORA_AUTO.range + 200, 800]]); b.s.player.attackClock = 0; run(b.sim, 0.4); expect(kinds(b.s)).not.toContain('sora_auto'); expect(b.s.enemies[0].hp).toBe(1e6);
  });
  it('base Sora keeps Azure Needle and Azure Volley', () => {
    const { sim, s } = setup([[1250, 800]], 0); s.player.attackClock = 0; run(sim, 0.1); expect(kinds(s)).toContain('needle_fire'); expect(kinds(s)).not.toContain('sora_auto');
    sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('azure_volley');
  });
});

describe('Azure Prison / Heaven\'s Spear / Celestial Collapse', () => {
  it('Prison slows ordinary enemies, never holds a boss, then shatters once for damage', () => {
    const { sim, s } = setup([[1260, 800], [1280, 820]]); s.enemies[1].kind = 'warden' as Enemy['kind'];
    sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('azure_prison'); expect(s.player.qCooldown).toBeCloseTo(SORA_Q.cooldown, 0);
    run(sim, SORA_Q.form + 0.3); expect(s.enemies[0].stagger).toBeGreaterThan(0); expect(s.enemies[1].stagger).toBe(0);
    run(sim, SORA_Q.hold + 0.3); expect(kinds(s)).toContain('sora_q_shatter'); expect(s.enemies[0].hp).toBeLessThan(1e6); expect((s.hx.sf ?? []).length).toBe(0);
  });
  it('Spears land on the marked spots: a foe that walks away takes nothing, an empty cast is harmless', () => {
    const { sim, s } = setup([[1300, 800]]); sim.step(DT, idle({ beam: true })); expect(s.hx.act?.act).toBe('heavens_spear');
    expect(s.abilityEvents.filter(e => e.kind === 'sora_e_mark').length).toBe(SORA_E.spears); s.enemies[0].x = 1100; s.enemies[0].y = 1000;
    run(sim, 1.2); expect(kinds(s)).toContain('sora_e_land'); expect(kinds(s)).toContain('sora_e_end'); expect(s.enemies[0].hp).toBe(1e6);
    const b = setup([[1300, 800]]); b.sim.step(DT, idle({ beam: true })); run(b.sim, 1.2); expect(b.s.enemies[0].hp).toBeLessThan(1e6);
  });
  it('Collapse pulls ordinary enemies in, bursts once, and never moves a boss', () => {
    const { sim, s } = setup([[1340, 800], [1380, 800]]); s.enemies[1].kind = 'warden' as Enemy['kind']; const bx = s.enemies[1].x;
    sim.step(DT, idle({ sphere: true })); expect(s.hx.act?.act).toBe('azure_collapse'); const f = s.hx.sf![0]; f.x = 1300; f.y = 800; s.enemies[0].x = 1400; s.enemies[0].y = 800; s.enemies[1].x = 1420; s.enemies[1].y = 840; const bx2 = s.enemies[1].x, x0 = s.enemies[0].x, px = f.x;
    run(sim, 0.6); expect(Math.abs(s.enemies[0].x - px)).toBeLessThan(Math.abs(x0 - px));
    run(sim, SORA_R.pull); expect(kinds(s)).toContain('sora_r_burst'); expect(s.enemies[1].x).toBe(bx2); void bx; expect(s.enemies[0].hp).toBeLessThan(1e6); expect(s.player.sphereCooldown).toBeGreaterThan(SORA_R.cooldown - 3);
  });
});

describe('Astral Devastation (V)', () => {
  it('charges through the tiers, a real release spends 45 s even on a miss, and a miss only fizzles', () => {
    const { sim, s } = setup(); run(sim, 0.05, idle({ sig: true, sigHeld: true })); expect(s.hx.act?.act).toBe('astral_devastation');
    run(sim, SORA_V.stages[1] + 0.1, idle({ sigHeld: true })); expect(s.hx.act?.charge).toBeGreaterThan(SORA_V.stages[1]);
    sim.step(DT, idle({ sigHeld: false })); expect(s.player.sigCd).toBeGreaterThan(SORA_V.cooldown - 1); expect(kinds(s)).toContain('sora_v_release');
    run(sim, 1.6); expect(kinds(s)).toContain('sora_v_fizzle'); expect(kinds(s)).not.toContain('sora_v_hit'); expect(s.hx.act).toBeNull(); expect((s.hx.sf ?? []).length).toBe(0);
  });
  it('flies to the first enemy, damages it once and detonates; a cancelled charge is free', () => {
    const { sim, s } = setup([[1360, 800]]); run(sim, 0.05, idle({ sig: true, sigHeld: true })); run(sim, 1.0, idle({ sigHeld: true })); sim.step(DT, idle({ sigHeld: false }));
    run(sim, 1.2); expect(kinds(s)).toContain('sora_v_hit'); expect(kinds(s)).toContain('sora_v_pulse'); expect(s.enemies[0].hp).toBeLessThan(1e6);
    const b = setup(); run(b.sim, 0.2, idle({ sig: true, sigHeld: true })); b.sim.step(DT, idle({ sigHeld: true, sigAbort: true })); expect(b.s.hx.act).toBeNull(); expect(b.s.player.sigCd).toBe(0);
  });
  it('is unavailable in base form', () => { const { sim, s } = setup([], 0); run(sim, 0.1, idle({ sig: true, sigHeld: true })); expect(s.hx.act).toBeNull(); });
});

describe('Overdrive and Skybreaker', () => {
  it('the meter fills only from real hits, is rate limited, and Overdrive lasts its duration', () => {
    const { sim, s } = setup([[1260, 800]]); s.player.attackClock = 0; run(sim, 2); expect(s.player.odMeter).toBeGreaterThan(0); expect(s.player.odMeter).toBeLessThan(100);
    s.player.odMeter = 100; sim.step(DT, idle({ od: true })); expect(s.player.odT).toBeGreaterThan(SORA_OD.duration - 0.2); expect(s.player.odMeter).toBe(0); expect(kinds(s)).toContain('sora_od_start');
    run(sim, SORA_OD.duration + 0.3); expect(s.player.odT).toBe(0); expect(kinds(s)).toContain('sora_od_end');
  });
  it('holding dash lifts off and releasing lands with one bounded impact', () => {
    const { sim, s } = setup([[1100, 880]]); s.player.dashCooldown = 99; run(sim, 0.9, idle({ x: 1, flyHeld: true })); expect(s.player.flyT).toBeGreaterThan(0); expect(s.player.air).toBeGreaterThan(0.5);
    run(sim, 0.1, idle({ x: 1, flyHeld: false })); expect(s.player.flyT).toBe(0); expect(s.abilityEvents.filter(e => e.kind === 'sora_fly_land').length).toBe(1); expect(SORA_FLY.speed).toBeGreaterThan(1.4);
  });
});

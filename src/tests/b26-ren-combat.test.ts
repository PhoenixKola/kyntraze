import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { NO_CONFIG } from '../sim/RunConfig';
import type { Enemy, InputState } from '../sim/GameState';
import { REN_AUTO, REN_FLY, REN_OD, REN_Q, REN_R, REN_V } from '../content/renCombat';
import { renCombatSfx } from '../game/audio/b22Sfx';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const foe = (id: number, x: number, y: number, hp = 1e6, kind: Enemy['kind'] = 'pursuer'): Enemy => ({ id, x, y, kind, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
function setup(foes: Array<[number, number, number?]> = []) {
  const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'ren', heroForm: true }), s = sim.state;
  s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.hp = s.player.maxHp = 1e6; s.player.form = 1; s.player.drive = 100; s.player.attackClock = 1e9; s.player.aimX = 1; s.player.aimY = 0;
  s.enemies = foes.map(([x, y, hp], i) => foe(100 + i, x, y, hp ?? 1e6)); return { sim, s };
}
const run = (sim: Simulation, sec: number, i: InputState = idle()) => { for (let k = 0; k < Math.round(sec / DT); k++) sim.step(DT, i); };
const kinds = (s: ReturnType<typeof setup>['s']) => s.abilityEvents.map(e => e.kind);

describe('Crimson Fury (transformed auto)', () => {
  it('runs the four named beats in order, hits only inside arm\'s reach, and emits one event per beat', () => {
    const { sim, s } = setup([[1170, 800], [1100 + REN_AUTO.reach + 120, 800]]);
    for (let i = 0; i < 4; i++) { s.player.attackClock = 0; run(sim, 0.02); }
    const beats = s.abilityEvents.filter(e => e.kind === 'ren_auto'); expect(beats.length).toBe(4);
    expect(beats.map(e => (e.n ?? 0) & 3)).toEqual([0, 1, 2, 3]); expect(((beats[3].n ?? 0) & 32) !== 0).toBe(true);
    expect(s.enemies[0].hp).toBeLessThan(1e6); expect(s.enemies[1].hp).toBe(1e6);
  });
  it('does nothing and wastes no swing when no enemy is within reach', () => {
    const { sim, s } = setup([[1100 + REN_AUTO.reach + 200, 800]]); s.player.attackClock = 0; run(sim, 0.3);
    expect(kinds(s).includes('ren_auto')).toBe(false); expect(s.enemies[0].hp).toBe(1e6);
  });
});

describe('Infernal Cyclone / Scarlet Rampage / Crimson Catastrophe', () => {
  it('Cyclone pulls ordinary enemies in, blasts them out, never moves a boss, and spends its cooldown', () => {
    const { sim, s } = setup([[1230, 800], [1100, 930]]); s.enemies[1].kind = 'warden' as Enemy['kind']; const bx = s.enemies[1].x, by = s.enemies[1].y;
    sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('infernal_cyclone'); expect(s.player.qCooldown).toBeCloseTo(REN_Q.cooldown, 0);
    const d0 = Math.hypot(s.enemies[0].x - s.player.x, s.enemies[0].y - s.player.y); run(sim, REN_Q.windup + REN_Q.spin * 0.7);
    expect(Math.hypot(s.enemies[0].x - s.player.x, s.enemies[0].y - s.player.y)).toBeLessThan(d0);
    run(sim, 1); expect(kinds(s)).toContain('ren_q_release'); expect(s.enemies[0].hp).toBeLessThan(1e6); expect(s.enemies[1].x).toBe(bx); expect(s.enemies[1].y).toBe(by); expect(s.hx.act).toBeNull();
  });
  it('Rampage grabs an ordinary enemy and slams it at the end; a boss gets a shoulder strike and is never moved; nothing in front = no grab', () => {
    const a = setup([[1220, 800]]); a.sim.step(DT, idle({ beam: true })); expect(a.s.hx.act?.act).toBe('scarlet_rampage'); expect(a.s.hx.act?.charge).toBe(0); run(a.sim, 1.2);
    expect(kinds(a.s)).toContain('ren_e_grab'); expect(kinds(a.s)).toContain('ren_e_slam'); expect(a.s.enemies[0].x).toBeGreaterThan(1220); expect(a.s.enemies[0].hp).toBeLessThan(1e6);
    const b = setup([[1220, 800]]); b.s.enemies[0].kind = 'warden' as Enemy['kind']; b.sim.step(DT, idle({ beam: true })); expect(b.s.hx.act?.charge).toBe(1); run(b.sim, 1);
    expect(kinds(b.s)).not.toContain('ren_e_grab'); expect(kinds(b.s)).toContain('ren_e_hit'); expect(b.s.enemies[0].x).toBe(1220);
    const c = setup([[1500, 800]]); c.sim.step(DT, idle({ beam: true })); expect(c.s.hx.act?.charge).toBe(2); run(c.sim, 1); expect(kinds(c.s)).not.toContain('ren_e_grab');
  });
  it('Catastrophe lands three alternating fists then a converging final strike on committed ground', () => {
    const { sim, s } = setup([[1300, 800]]); sim.step(DT, idle({ sphere: true })); expect(s.hx.act?.act).toBe('crimson_catastrophe'); run(sim, REN_R.windup + 2 * REN_R.gap + REN_R.finalGap + 0.5);
    const hits = s.abilityEvents.filter(e => e.kind === 'ren_r_hit'); expect(hits.length).toBe(REN_R.hits + 1); expect(hits.map(e => ((e.n ?? 0) >> 4) & 1).slice(0, 3)).toEqual([0, 1, 0]); expect(((hits[3].n ?? 0) & 32) !== 0).toBe(true);
    expect(s.enemies[0].hp).toBeLessThan(1e6); expect(s.hx.act).toBeNull();
  });
});

describe('Crimson Nova Fist (V)', () => {
  const hold = (sim: Simulation, sec: number) => run(sim, sec, idle({ sigHeld: true }));
  it('charges while held, releases once, hits for tiered damage and spends the 45 s cooldown only on release', () => {
    const { sim, s } = setup([[1150, 800]]); sim.step(DT, idle({ sig: true, sigHeld: true })); expect(s.hx.act?.act).toBe('nova_fist'); expect(s.player.sigCd).toBe(0);
    hold(sim, 1); expect(s.hx.act?.released).toBe(false); expect(s.hx.act!.tier).toBeGreaterThanOrEqual(2);
    sim.step(DT, idle({ sigHeld: false })); expect(s.hx.act?.released).toBe(true); expect(s.player.sigCd).toBeCloseTo(REN_V.cooldown, 0);
    run(sim, 1.5); expect(s.enemies[0].hp).toBeLessThan(1e6); expect(kinds(s)).toContain('ren_v_hit'); expect(s.hx.act).toBeNull();
  });
  it('a miss pays the cooldown but never explodes; an abort cancels for free; base form cannot start it', () => {
    const a = setup(); a.sim.step(DT, idle({ sig: true, sigHeld: true })); run(a.sim, 0.2, idle({ sigHeld: true })); run(a.sim, 1.2);
    expect(kinds(a.s)).toContain('ren_v_miss'); expect(kinds(a.s)).not.toContain('ren_v_pulse'); expect(a.s.player.sigCd).toBeLessThanOrEqual(8);
    const b = setup([[1150, 800]]); b.sim.step(DT, idle({ sig: true, sigHeld: true })); b.sim.step(DT, idle({ sigHeld: true, sigAbort: true })); expect(b.s.hx.act).toBeNull(); expect(b.s.player.sigCd).toBe(0);
    const c = setup([[1150, 800]]); c.s.player.form = 0; c.sim.step(DT, idle({ sig: true, sigHeld: true })); expect(c.s.hx.act).toBeNull();
  });
  it('a form change cancels an unreleased charge; a released one keeps its committed tier', () => {
    const a = setup([[1150, 800]]); a.sim.step(DT, idle({ sig: true, sigHeld: true })); a.s.player.form = 0; a.sim.step(DT, idle({ sigHeld: true })); expect(a.s.hx.act).toBeNull(); expect(a.s.player.sigCd).toBe(0);
    const b = setup([[1150, 800]]); b.sim.step(DT, idle({ sig: true, sigHeld: true })); hold(b.sim, 1); b.sim.step(DT, idle()); const t = b.s.hx.act!.tier; b.s.player.form = 0; run(b.sim, 1); expect(b.s.hx.act === null || b.s.hx.act.tier === t).toBe(true);
  });
});

describe('Primal Overdrive and flight', () => {
  it('meter fills only from real transformed hits (rate-limited), G consumes it once and +25% damage lasts 10 s', () => {
    const { sim, s } = setup([[1160, 800]]); expect(s.player.odMeter).toBe(0); s.player.attackClock = 0; run(sim, 3, idle()); const m = s.player.odMeter; expect(m).toBeGreaterThan(0); expect(m).toBeLessThan(100);
    sim.step(DT, idle({ od: true })); expect(s.player.odT).toBe(0);
    sim.step(DT, idle()); s.player.odMeter = 100; sim.step(DT, idle({ od: true })); expect(s.player.odT).toBeGreaterThan(REN_OD.duration - 0.2); expect(s.player.odMeter).toBe(0); expect(kinds(s)).toContain('ren_od_start');
    s.player.odMeter = 0; s.player.attackClock = 0; run(sim, 1); expect(s.player.odMeter).toBe(0);   // nothing fills it during Overdrive
    run(sim, REN_OD.duration + 0.5); expect(s.player.odT).toBe(0); expect(s.player.form).toBe(1);
  });
  it('the meter cannot be run away by a burst of simultaneous hits in one window', () => {
    const { sim, s } = setup(Array.from({ length: 30 }, (_, i) => [1110 + i, 800] as [number, number])); s.player.attackClock = 1e9; sim.step(DT, idle({ q: true })); run(sim, 1.2);
    expect(s.player.odMeter).toBeLessThan(40);
  });
  it('holding dash lifts off, costs extra Drive, and landing after eligible flight slams once', () => {
    const { sim, s } = setup([[1100, 860]]); s.player.dashCooldown = 99; const d0 = s.player.drive;
    run(sim, 1.2, idle({ x: 1, flyHeld: true })); expect(s.player.flyT).toBeGreaterThan(0); expect(s.player.air).toBeGreaterThan(0.5); expect(d0 - s.player.drive).toBeGreaterThan(REN_FLY.drain * 0.5);
    run(sim, 0.1, idle({ x: 1, flyHeld: false })); expect(s.player.flyT).toBe(0); expect(kinds(s).filter(k => k === 'ren_fly_land').length).toBe(1);
  });
  it('ending the form ends Overdrive and flight', () => {
    const { sim, s } = setup(); s.player.odT = 8; s.player.flyT = 1; s.player.form = 0; sim.step(DT, idle()); expect(s.player.odT).toBe(0); expect(s.player.flyT).toBe(0);
  });
});

describe('compatibility', () => {
  it('Kai is untouched: his signature still works and Ren events never appear for him', () => {
    const sim = new Simulation(5, 'gloam', true, true), s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.hp = s.player.maxHp = 1e6; s.player.form = 1; s.player.drive = 100; s.player.attackClock = 1e9; s.enemies = [foe(1, 1150, 800)]; s.player.x = 1100; s.player.y = 800;
    sim.step(DT, idle({ sig: true, sigHeld: true })); expect(s.cast?.kind).toBe('signature'); expect(s.abilityEvents.some(e => e.kind.startsWith('ren_'))).toBe(false);
  });
  it('base Ren keeps Crimson Break, Meteor Rush and Bloodstar Impact', () => {
    const { sim, s } = setup([[1170, 800]]); s.player.form = 0; sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('crimson_break'); run(sim, 1);
    sim.step(DT, idle({ beam: true })); expect(s.hx.act?.act).toBe('meteor_rush'); run(sim, 1.5); sim.step(DT, idle({ sphere: true })); expect(s.hx.act?.act).toBe('bloodstar');
  });
  it('First Rush counts transformed Scarlet Rampage contacts', () => {
    const { sim, s } = setup([[1220, 800]]); sim.step(DT, idle({ beam: true })); run(sim, 1.2); expect(s.b22.m['rush.strike.form'] ?? 0).toBeGreaterThanOrEqual(2);
  });
  it('every Ren event has a recipe', () => { for (const k of ['ren_auto', 'ren_q_start', 'ren_q_release', 'ren_e_grab', 'ren_e_slam', 'ren_r_hit', 'ren_v_charge', 'ren_v_hit', 'ren_v_pulse', 'ren_od_start', 'ren_fly_land']) expect(renCombatSfx(k, 0)).not.toBeNull(); });
});

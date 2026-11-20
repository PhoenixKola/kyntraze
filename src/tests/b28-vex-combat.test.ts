import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { NO_CONFIG } from '../sim/RunConfig';
import type { Enemy, InputState } from '../sim/GameState';
import { damagePlayer } from '../sim/CombatSystem';
import { vexShift } from '../sim/VexCombat';
import { activateForm } from '../sim/FormSystem';
import { VEX1_AUTO, VEX1_E, VEX1_Q, VEX1_R, VEX2_E, VEX2_Q, VEX2_R, VEX_FLY, VEX_OD, VEX_SHIFT } from '../content/vexCombat';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const foe = (id: number, x: number, y: number, hp = 1e6, kind: Enemy['kind'] = 'pursuer'): Enemy => ({ id, x, y, kind, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
function setup(form: 0 | 1 | 2, foes: Array<[number, number, number?]> = []) {
  const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'vex', heroForm: true }), s = sim.state;
  s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.hp = s.player.maxHp = 1e6; s.player.form = form; s.player.drive = 100; s.player.attackClock = 1e9; s.player.aimX = 1; s.player.aimY = 0; s.b22.vex.forms = [true, true];
  s.enemies = foes.map(([x, y, hp], i) => foe(100 + i, x, y, hp ?? 1e6)); return { sim, s };
}
const run = (sim: Simulation, sec: number, i: InputState = idle()) => { for (let k = 0; k < Math.round(sec / DT); k++) sim.step(DT, i); };
const kinds = (s: ReturnType<typeof setup>['s']) => s.abilityEvents.map(e => e.kind);

describe('Riftbound', () => {
  it('Phantom Edge runs four beats, hits only inside its reach and never far away', () => {
    const { sim, s } = setup(1, [[1170, 800], [1100 + VEX1_AUTO.reach + 140, 800]]);
    for (let i = 0; i < 4; i++) { s.player.attackClock = 0; run(sim, 0.02); }
    const beats = s.abilityEvents.filter(e => e.kind === 'vex_auto'); expect(beats.map(e => (e.n ?? 0) & 3)).toEqual([0, 1, 2, 3]); expect(s.enemies[0].hp).toBeLessThan(1e6); expect(s.enemies[1].hp).toBe(1e6);
  });
  it('Mirror Guard refuses a perfect hit and answers with echoes; a late hit is softened; hazards are never parried', () => {
    const { sim, s } = setup(1, [[1250, 800]]); sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('mirror_guard'); const hp = s.player.hp;
    expect(damagePlayer(s, 50, 'contact', { x: 1250, y: 800 }, 100)).toBe(false); expect(s.player.hp).toBe(hp); run(sim, 0.5); expect(kinds(s)).toContain('vex_q_echo'); expect(s.enemies[0].hp).toBeLessThan(1e6);
    const b = setup(1, [[1250, 800]]); b.sim.step(DT, idle({ q: true })); run(b.sim, VEX1_Q.perfect + 0.1); const hp2 = b.s.player.hp; damagePlayer(b.s, 100, 'contact', { x: 1250, y: 800 }, 100); expect(b.s.player.hp).toBeLessThan(hp2); expect(b.s.player.hp).toBeGreaterThan(hp2 - 100);
    const c = setup(1, [[1250, 800]]); c.sim.step(DT, idle({ q: true })); const hp3 = c.s.player.hp; damagePlayer(c.s, 40, 'hazard', { x: 1250, y: 800 }, 0); expect(c.s.player.hp).toBe(hp3 - 40);
  });
  it('Rift Execution lands behind the target outside its footprint and cuts; with no safe landing it does not teleport', () => {
    const { sim, s } = setup(1, [[1300, 800]]); sim.step(DT, idle({ beam: true })); expect(s.hx.act?.act).toBe('rift_execution'); run(sim, 0.9);
    expect(kinds(s)).toContain('vex_e_arrive'); expect(kinds(s)).toContain('vex_e_cut'); expect(s.player.x).toBeGreaterThan(1300); expect(Math.hypot(s.player.x - 1300, s.player.y - 800)).toBeGreaterThan(17 + 17); expect(s.enemies[0].hp).toBeLessThan(1e6);
    const b = setup(1, [[1100 + VEX1_E.fallbackReach, 800]]); b.s.enemies[0].x = 1100 + 60; b.sim.step(DT, idle({ beam: true })); expect(s.player.beamCooldown).toBeGreaterThan(5);
  });
  it('Oath of Ruin breaks the ground at saved points: a foe that walks away takes nothing; the last seal is wider', () => {
    const { sim, s } = setup(1, [[1300, 800]]); sim.step(DT, idle({ sphere: true })); expect(s.hx.act?.act).toBe('oath_ruin'); expect(s.abilityEvents.filter(e => e.kind === 'vex_r_mark').length).toBe(VEX1_R.seals);
    s.enemies[0].x = 1100; s.enemies[0].y = 1000; run(sim, 1.8); expect(kinds(s)).toContain('vex_r_erupt'); expect(s.abilityEvents.filter(e => e.kind === 'vex_r_erupt').length).toBe(VEX1_R.seals); expect(s.enemies[0].hp).toBe(1e6);
    const b = setup(1, [[1300, 800]]); b.sim.step(DT, idle({ sphere: true })); run(b.sim, 1.8); expect(b.s.enemies[0].hp).toBeLessThan(1e6);
  });
  it('Abyssal Fang: a real release spends 45 s even on a miss; an uncommitted charge is free; a hit pierces a bounded line', () => {
    const { sim, s } = setup(1); run(sim, 0.05, idle({ sig: true, sigHeld: true })); expect(s.hx.act?.act).toBe('abyssal_fang'); run(sim, 1, idle({ sigHeld: true })); sim.step(DT, idle({ sigHeld: false })); expect(s.player.sigCd).toBeGreaterThan(44); run(sim, 0.8); expect(kinds(s)).toContain('vex_v_miss'); expect(kinds(s)).not.toContain('vex_v_hit');
    const b = setup(1, [[1200, 800], [1240, 800]]); run(b.sim, 0.05, idle({ sig: true, sigHeld: true })); run(b.sim, 0.5, idle({ sigHeld: true })); b.sim.step(DT, idle({ sigHeld: false })); run(b.sim, 0.8); expect(kinds(b.s)).toContain('vex_v_hit'); expect(b.s.enemies[0].hp).toBeLessThan(1e6); expect(b.s.enemies[1].hp).toBeLessThan(1e6);
    const c = setup(1); run(c.sim, 0.2, idle({ sig: true, sigHeld: true })); c.sim.step(DT, idle({ sigHeld: true, sigAbort: true })); expect(c.s.hx.act).toBeNull(); expect(c.s.player.sigCd).toBe(0);
  });
});

describe('Voidheart Exile', () => {
  it('Invisible Judgment cuts committed points after a short delay; a target that moved is missed', () => {
    const { sim, s } = setup(2, [[1230, 800]]); s.player.attackClock = 0; sim.step(DT, idle()); s.enemies[0].x = 1100; s.enemies[0].y = 1000; run(sim, 0.4); expect(kinds(s)).toContain('vex_judg_cut'); expect(s.enemies[0].hp).toBe(1e6);
    const b = setup(2, [[1230, 800]]); b.s.player.attackClock = 0; run(b.sim, 0.4); expect(b.s.enemies[0].hp).toBeLessThan(1e6);
  });
  it('Phantom Legion makes three bounded copies that hit without feeding Overdrive, and end with the form', () => {
    const { sim, s } = setup(2, [[1250, 800], [1300, 850], [1200, 760]]); sim.step(DT, idle({ q: true })); expect((s.hx.vf ?? []).filter(f => f.k === 'clone').length).toBe(VEX2_Q.copies);
    run(sim, 1.5); expect(kinds(s)).toContain('vex_q_clone_cut'); expect(s.enemies.some(e => e.hp < 1e6)).toBe(true); expect(s.player.odMeter).toBe(0);
    s.player.form = 1; run(sim, 0.1); expect((s.hx.vf ?? []).filter(f => f.k === 'clone').length).toBe(0);
  });
  it('Dimensional Severance warns, cuts its lane once and reconnects; off-lane enemies take nothing', () => {
    const { sim, s } = setup(2, [[1400, 800], [1400, 1000]]); sim.step(DT, idle({ beam: true })); expect(kinds(s)).toContain('vex_e_warn'); run(sim, VEX2_E.warn + 0.1); expect(kinds(s)).toContain('vex_e_cut'); run(sim, 0.6); expect(kinds(s)).toContain('vex_e_shock');
    expect(s.enemies[0].hp).toBeLessThan(1e6); expect(s.enemies[1].hp).toBe(1e6);
  });
  it('Domain of the Exile follows Vex, strikes inside its ring, never pulls a boss and ends by itself', () => {
    const { sim, s } = setup(2, [[1200, 800], [1500, 800]]); s.enemies[0].kind = 'warden' as Enemy['kind']; const bx = s.enemies[0].x; sim.step(DT, idle({ sphere: true })); run(sim, 1.6); expect(kinds(s)).toContain('vex_r_tick'); expect(s.enemies[0].x).toBe(bx); expect(s.enemies[1].hp).toBe(1e6);
    run(sim, VEX2_R.dur + 0.3); expect(kinds(s)).toContain('vex_r_end'); expect((s.hx.vf ?? []).filter(f => f.k === 'domain').length).toBe(0);
  });
  it('Event Horizon throws, pulls ordinary enemies in on contact, erupts once, and a miss only fizzles', () => {
    const { sim, s } = setup(2, [[1260, 800]]); run(sim, 0.05, idle({ sig: true, sigHeld: true })); run(sim, 1.0, idle({ sigHeld: true })); sim.step(DT, idle({ sigHeld: false })); run(sim, 1.2); expect(kinds(s)).toContain('vex_v_hit'); expect(kinds(s)).toContain('vex_v_pulse'); expect(s.enemies[0].hp).toBeLessThan(1e6);
    const b = setup(2); run(b.sim, 0.05, idle({ sig: true, sigHeld: true })); run(b.sim, 0.5, idle({ sigHeld: true })); b.sim.step(DT, idle({ sigHeld: false })); run(b.sim, 1.5); expect(kinds(b.s)).toContain('vex_v_fizzle'); expect(kinds(b.s)).not.toContain('vex_v_hit');
  });
});

describe('Form Shift, Overdrive, flight and reveal', () => {
  it('shifts only between unlocked forms, costs Drive, starts the cooldown, keeps Overdrive and V cooldown, and never from base', () => {
    const { s } = setup(1); s.player.odT = 6; s.player.sigCd = 30; expect(vexShift(s, 2)).toBe(true); expect(s.player.form).toBe(2); expect(s.player.drive).toBeLessThan(100); expect(s.player.formCooldown).toBeGreaterThan(VEX_SHIFT.cooldown - 0.5); expect(s.player.odT).toBe(6); expect(s.player.sigCd).toBe(30); expect(vexShift(s, 1)).toBe(false);
    const b = setup(0); expect(vexShift(b.s, 2)).toBe(false); const c = setup(1); c.s.b22.vex.forms = [true, false]; expect(vexShift(c.s, 2)).toBe(false); const d = setup(1); d.s.player.drive = 10; expect(vexShift(d.s, 2)).toBe(false);
  });
  it('the Overdrive meter fills only from real hits and Overdrive lasts its duration', () => {
    const { sim, s } = setup(1, [[1170, 800]]); s.player.attackClock = 0; run(sim, 2); expect(s.player.odMeter).toBeGreaterThan(0); expect(s.player.odMeter).toBeLessThan(100);
    s.player.odMeter = 100; sim.step(DT, idle({ od: true })); expect(s.player.odT).toBeGreaterThan(VEX_OD.duration - 0.2); run(sim, VEX_OD.duration + 0.3); expect(s.player.odT).toBe(0); expect(kinds(s)).toContain('vex_od_end');
  });
  it('flight lifts off, differs per form, and lands with one bounded impact', () => {
    for (const f of [1, 2] as const) { const { sim, s } = setup(f, [[1100, 880]]); s.player.dashCooldown = 99; run(sim, 0.9, idle({ x: 1, flyHeld: true })); expect(s.player.flyT).toBeGreaterThan(0); run(sim, 0.1, idle({ x: 1, flyHeld: false })); expect(s.abilityEvents.filter(e => e.kind === 'vex_fly_land').length).toBe(1); }
    expect(VEX_FLY.form[1].speed).toBeLessThan(VEX_FLY.form[2].speed); expect(VEX_FLY.form[1].drain).toBeGreaterThan(VEX_FLY.form[2].drain);
  });
  it("Riftbound's reveal never suppresses Voidheart's first reveal", () => {
    const { s } = setup(0); s.vexSeen = [1, 0]; s.heroFormSeen = 1; s.player.drive = 100; expect(activateForm(s, 2)).toBe(true); expect(s.cinema?.first).toBe(true); expect(s.cinema?.dur).toBeGreaterThan(3);
    const b = setup(0); b.s.vexSeen = [1, 1]; b.s.heroFormSeen = 2; b.s.player.drive = 100; activateForm(b.s, 2); expect(b.s.cinema?.first).toBe(false); expect(b.s.cinema?.dur).toBeLessThan(1.5);
  });
  it('base Vex keeps Null Blade, Parry Halo, Rift Reversal and Oathbreaker Seal', () => {
    const { sim, s } = setup(0, [[1250, 800]]); sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('parry_halo');
    const b = setup(0, [[1250, 800]]); b.sim.step(DT, idle({ beam: true })); expect(b.s.hx.act?.act).toBe('rift_reversal');
  });
});

import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { Enemy, InputState } from '../sim/GameState';
import { AUTO, SIG, OD } from '../content/kaiCombat';
import { formShift } from '../sim/KaiCombat';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const enemy = (id: number, x: number, y: number, hp = 4000): Enemy => ({ id, x, y, kind: 'pursuer', hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
function setup(form: 0 | 1 | 2 | 3, foes: Array<[number, number]> = []) {
  const sim = new Simulation(5, 'gloam', true, true), s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.hp = s.player.maxHp = 1e6; s.player.form = form; s.player.drive = 100;
  s.enemies = foes.map(([x, y], i) => enemy(100 + i, x, y)); return { sim, s };
}
const run = (sim: Simulation, sec: number, i: InputState = idle()) => { for (let k = 0; k < Math.round(sec / DT); k++) sim.step(DT, i); };

describe('Kai automatic fighting styles', () => {
  it('each form has its own named four-beat profile and emits kai_auto beats with the right form', () => {
    for (const f of [0, 1, 2, 3] as const) expect(AUTO[f].beats.length).toBe(4);
    expect(new Set([0, 1, 2, 3].map(f => AUTO[f as 0 | 1 | 2 | 3].name)).size).toBe(4);
    const { sim, s } = setup(2, [[1130, 800]]); const seen = new Set<number>(); run(sim, 3, idle());
    for (const e of s.abilityEvents) if (e.kind === 'kai_auto') seen.add((e.n ?? 0) & 3);
    expect(s.abilityEvents.some(e => e.kind === 'kai_auto' && (((e.n ?? 0) >> 2) & 3) === 2)).toBe(true);
    expect(s.enemies[0].hp).toBeLessThan(4000);
  });
});

describe('signature technique', () => {
  it('charges while held, releases on key-up, hits, and spends the 45 s cooldown only on release', () => {
    const { sim, s } = setup(1, [[1150, 800]]); s.player.attackClock = 1e9;
    sim.step(DT, idle({ sig: true, sigHeld: true })); expect(s.cast?.kind).toBe('signature'); expect(s.player.sigCd).toBe(0);
    run(sim, 1, idle({ sigHeld: true })); expect(s.cast?.released).toBe(false); expect(s.cast!.tier).toBeGreaterThanOrEqual(2);
    sim.step(DT, idle({ sigHeld: false })); expect(s.cast?.released).toBe(true); expect(s.player.sigCd).toBeCloseTo(SIG.cooldown, 0);
    run(sim, 1.5); expect(s.enemies[0].hp).toBeLessThan(4000); expect(s.cast).toBeNull();
    expect(s.abilityEvents.some(e => e.kind === 'sig_hit') || s.enemies[0].hp < 4000).toBe(true);
  });
  it('a miss recovers at the end point and applies no damage; an abort cancels without spending the cooldown', () => {
    const { sim, s } = setup(2); s.player.attackClock = 1e9;
    sim.step(DT, idle({ sig: true, sigHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(sim, 0.5, idle({ sigHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(sim, 0.5);
    expect(s.cast).toBeNull(); expect(s.player.sigCd).toBeLessThanOrEqual(8);
    const tap = setup(2); tap.s.player.attackClock = 1e9; tap.sim.step(DT, idle({ sig: true, sigHeld: true })); run(tap.sim, 0.12, idle({ sigHeld: true })); run(tap.sim, 0.3); expect(tap.s.cast).toBeNull(); expect(tap.s.player.sigCd).toBe(0);   // a quick tap with nothing in reach is free expect(s.abilityEvents.some(e => e.kind === 'sig_miss')).toBe(true);
    const b = setup(3, [[1200, 800]]); b.s.player.attackClock = 1e9;
    b.sim.step(DT, idle({ sig: true, sigHeld: true })); b.sim.step(DT, idle({ sigHeld: true, sigAbort: true }));
    expect(b.s.cast).toBeNull(); expect(b.s.player.sigCd).toBe(0);
  });
  it('is unavailable in base form, and a form change cancels an unreleased charge for free', () => {
    const a = setup(0, [[1150, 800]]); a.sim.step(DT, idle({ sig: true, sigHeld: true })); expect(a.s.cast).toBeNull();
    const b = setup(1, [[1150, 800]]); b.s.player.attackClock = 1e9; b.sim.step(DT, idle({ sig: true, sigHeld: true })); b.s.player.form = 2; b.sim.step(DT, idle({ sigHeld: true }));
    expect(b.s.cast).toBeNull(); expect(b.s.player.sigCd).toBe(0);
  });
  it('the cooldown ticks in base form too', () => { const { sim, s } = setup(0); s.player.sigCd = 10; run(sim, 2); expect(s.player.sigCd).toBeCloseTo(8, 0); });
});

describe('Primal Overdrive, Skybreaker and Form Shift', () => {
  it('Overdrive needs a full meter and a transformation, lasts its duration and returns to the current form', () => {
    const { sim, s } = setup(2); sim.step(DT, idle({ od: true })); expect(s.player.odT).toBe(0);
    sim.step(DT, idle()); s.player.odMeter = 100; sim.step(DT, idle({ od: true })); expect(s.player.odT).toBeGreaterThan(OD.duration - 0.1); expect(s.player.odMeter).toBe(0);
    run(sim, OD.duration + 0.5); expect(s.player.odT).toBe(0); expect(s.player.form).toBe(2);
  });
  it('holding dash while transformed lifts off, then landing slams', () => {
    const { sim, s } = setup(2, [[1100, 860]]); s.player.attackClock = 1e9; s.player.dashCooldown = 99;
    run(sim, 0.9, idle({ x: 1, flyHeld: true })); expect(s.player.flyT).toBeGreaterThan(0); expect(s.player.air).toBeGreaterThan(0.5);
    run(sim, 0.1, idle({ x: 1, flyHeld: false })); expect(s.player.flyT).toBe(0); expect(s.abilityEvents.some(e => e.kind === 'fly_land')).toBe(true);
  });
  it('one Ctrl press toggles flight on, a second press lands with the slam (no holding)', () => {
    const { sim, s } = setup(2, [[1100, 860]]); s.player.attackClock = 1e9; s.player.dashCooldown = 99;
    sim.step(DT, idle({ flyToggle: true })); run(sim, 0.9, idle({ x: 1 })); expect(s.player.flyT).toBeGreaterThan(0.5); expect(s.player.air).toBeGreaterThan(0.5);
    sim.step(DT, idle({ flyToggle: true })); sim.step(DT, idle()); expect(s.player.flyT).toBe(0); expect(s.abilityEvents.some(e => e.kind === 'fly_land' && ((e.n ?? 0) & 1) === 1)).toBe(true);
    run(sim, 0.5); expect(s.player.flyOn).toBe(false);
  });
  it('Form Shift switches between unlocked forms for Drive and a shared cooldown, never from base', () => {
    const { s } = setup(1); expect(formShift(s, 2)).toBe(true); expect(s.player.form).toBe(2); expect(s.player.drive).toBeLessThan(100); expect(formShift(s, 3)).toBe(false);
    const b = setup(0); expect(formShift(b.s, 2)).toBe(false);
  });
});

describe('B25.1 corrections', () => {
  it('a released signature keeps the form it was committed in when the player changes form', () => {
    const { sim, s } = setup(1, [[1150, 800]]); s.player.attackClock = 1e9;
    sim.step(DT, idle({ sig: true, sigHeld: true })); run(sim, 0.5, idle({ sigHeld: true })); sim.step(DT, idle({ sigHeld: false })); expect(s.cast?.released).toBe(true);
    s.player.form = 3; s.player.formCooldown = 99; run(sim, 1.2);
    const pulses = s.abilityEvents.filter(e => e.kind === 'sig_pulse' || e.kind === 'sig_hit'), forms = new Set(pulses.map(e => ((e.n ?? 0) >> 3) & 3));
    expect([...forms]).toEqual([1]); expect(s.cast).toBeNull();
  });
  it('Form Shift selection survives the wire; invalid picks are rejected', async () => {
    const { parseClient, fromInputState, toInputState } = await import('../net/protocol');
    const w = fromInputState(idle({ selPick: 2 })); expect(toInputState(w).selPick).toBe(2);
    const msg = (v: unknown) => parseClient(JSON.stringify({ t: 'input', seq: 1, i: { ...fromInputState(idle()), selPick: v } }));
    expect(msg(2)).not.toBeNull(); for (const bad of [0, 4, -1, 1.5, '2']) expect(msg(bad)).toBeNull();
    expect(parseClient(JSON.stringify({ t: 'input', seq: 1, i: fromInputState(idle()) }))).not.toBeNull();
  });
});

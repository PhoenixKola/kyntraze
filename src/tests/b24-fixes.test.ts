import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { InputState } from '../sim/GameState';
import { dashMax } from '../sim/MovementSystem';
import { BEAM } from '../content/abilities';
import { migrateSave, withEverythingUnlocked } from '../sim/SaveSystem';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const run = (sim: Simulation, sec: number, input: InputState = idle()) => { for (let i = 0; i < Math.round(sec / DT); i++) sim.step(DT, input); };
const quiet = (sim: Simulation) => { const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.hp = s.player.maxHp = 1e6; s.player.attackClock = 1e9; return s; };

describe('dash charges', () => {
  it('Kai holds 1 / 1 / 2 / 3 dashes by form and recharges them one at a time', () => {
    const sim = new Simulation(3, 'gloam', true, true), s = quiet(sim);
    for (const [f, n] of [[0, 1], [1, 1], [2, 2], [3, 3]] as const) { s.player.form = f; expect(dashMax(s)).toBe(n); }
    s.player.form = 3; s.player.drive = 100; s.player.dashUsed = 0; s.player.dashCooldown = 0;
    for (let i = 0; i < 3; i++) { sim.step(DT, idle({ x: 1, dash: true })); run(sim, 0.3, idle({ x: 1 })); s.player.invulnerable = 0; s.player.drive = 100; }
    expect(s.player.dashUsed).toBe(3);
    sim.step(DT, idle({ x: 1, dash: true })); const used = s.player.dashUsed; expect(used).toBe(3);   // out of charges
    run(sim, 3.3); expect(s.player.dashUsed).toBe(2);
    run(sim, 3.3); expect(s.player.dashUsed).toBe(1);
  });
  it('a plain form has one dash', () => { const sim = new Simulation(3, 'gloam', true, true), s = quiet(sim); expect(dashMax(s)).toBe(1); });
});

describe('Fracture Lance hold', () => {
  it('a tap fires after the normal charge; a held E keeps it charged and steerable until released', () => {
    const tap = new Simulation(5, 'gloam', false, false), a = quiet(tap);
    tap.step(DT, idle({ beam: true, beamHeld: true })); run(tap, BEAM.charge + 0.1, idle());
    expect(a.cast?.released).toBe(true);
    const sim = new Simulation(5, 'gloam', false, false), s = quiet(sim);
    sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' }));
    run(sim, BEAM.charge + 0.6, idle({ beamHeld: true, aimX: 0, aimY: -1, aimSrc: 'pointer' }));
    expect(s.cast?.released).toBe(false); expect(s.cast!.dirY).toBeCloseTo(-1, 3); expect(s.cast!.charge).toBeGreaterThan(0.5);
    run(sim, 0.1, idle({ beamHeld: false }));
    expect(s.cast?.released).toBe(true); expect(s.cast!.dirY).toBeCloseTo(-1, 3);
  });
});

describe('unlock everything', () => {
  it('opens every hero form, Vex forms and Kai forms without touching progress', () => {
    const u = withEverythingUnlocked(migrateSave(null));
    expect(u.unlocks).toMatchObject({ cometheart: true, stillfire: true, ren: true, sora: true });
    expect(u.b22!.vexForms).toEqual([true, true]); expect(u.b22!.owned.length).toBeGreaterThan(8); expect(u.meta!.owned.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { BEAM, SPHERE } from '../content/abilities';
import { castDuration } from '../sim/AbilitySystem';
import type { Enemy, InputState } from '../sim/GameState';
import { damagePlayer } from '../sim/CombatSystem';
const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
function enemy(id: number, x: number, y: number, hp = 25): Enemy { return { id, x, y, kind: 'pursuer', hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 0 }; }
function setup(enemies: Array<[number, number, number?]> = []) {
  const sim = new Simulation(7); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9;
  s.enemies = enemies.map(([x, y, hp], i) => { const e = enemy(100 + i, x, y, hp ?? 25); e.speed = 0; return e; });
  return { sim, s };
}
const run = (sim: Simulation, sec: number, input: InputState = idle()) => { for (let i = 0; i < Math.round(sec / DT); i++) sim.step(DT, input); };
const press = (sim: Simulation, k: 'beam' | 'sphere') => { sim.step(DT, idle({ [k]: true })); };

describe('Fracture Lance (beam)', () => {
  it('hits enemies inside the lane once per pulse, nothing outside, and ignores enemies behind', () => {
    const { sim, s } = setup([[1300, 800, 200], [1300, 880, 200], [900, 800, 200]]); s.player.aimX = 1; s.player.aimY = 0;
    press(sim, 'beam'); expect(s.cast?.kind).toBe('beam'); run(sim, BEAM.charge + BEAM.fire + 0.1);
    expect(s.enemies[0].hp).toBe(200 - BEAM.damage * 5); expect(s.enemies[1].hp).toBe(200); expect(s.enemies[2].hp).toBe(200);
  });
  it('does not damage during the charge and respects the cooldown', () => {
    const { sim, s } = setup([[1300, 800, 200]]); s.player.aimX = 1; s.player.aimY = 0;
    press(sim, 'beam'); run(sim, BEAM.charge - 0.05); expect(s.enemies[0].hp).toBe(200);
    run(sim, castDuration('beam')); expect(s.cast).toBeNull(); const hp = s.enemies[0].hp; press(sim, 'beam'); expect(s.cast).toBeNull(); expect(s.enemies[0].hp).toBe(hp);
    expect(s.player.beamCooldown).toBeGreaterThan(0);
  });
  it('stops at the arena wall and holds a held key to one activation', () => {
    const { sim, s } = setup(); s.player.x = 2000; s.player.aimX = 1; s.player.aimY = 0;
    for (let i = 0; i < 120; i++) sim.step(DT, idle({ beam: true })); expect(s.player.beamCooldown).toBeGreaterThan(BEAM.cooldown - 2.1);
    expect(s.cast?.len ?? 0).toBeLessThan(200);
  });
  it('Form I is wider and harder, snapshotted at cast time', () => {
    const { sim, s } = setup([[1300, 800 + BEAM.halfWidth + 25, 400]]); s.player.aimX = 1; s.player.aimY = 0; s.player.form = 1; s.player.drive = 100;
    press(sim, 'beam'); s.player.form = 0; run(sim, castDuration('beam')); expect(s.enemies[0].hp).toBe(400 - BEAM.damage * BEAM.formDamage * 5);
  });
  it('dash cancels the cast; a hit cancels only the wind-up', () => {
    let { sim, s } = setup(); press(sim, 'beam'); run(sim, 0.1); sim.step(DT, idle({ dash: true, x: 1 })); expect(s.cast).toBeNull();
    ({ sim, s } = setup()); press(sim, 'beam'); run(sim, 0.1); damagePlayer(s, 5); expect(s.cast).toBeNull();
    ({ sim, s } = setup()); press(sim, 'beam'); run(sim, BEAM.charge + 0.05); damagePlayer(s, 5); expect(s.cast).not.toBeNull();
  });
  it('freezes while paused', () => {
    const { sim, s } = setup(); press(sim, 'beam'); run(sim, 0.2); const t = s.cast!.t; sim.togglePause(); run(sim, 1); expect(s.cast!.t).toBe(t); sim.togglePause(); run(sim, 0.1); expect(s.cast!.t).toBeGreaterThan(t);
  });
});

describe('Nova Bloom (sphere)', () => {
  it('launches at the densest cluster and detonates once at that point with falloff and knockback', () => {
    const { sim, s } = setup([[1300, 800, 500], [1310, 820, 500], [1290, 790, 500], [1000, 800, 500]]); s.player.aimX = 1; s.player.aimY = 0;
    press(sim, 'sphere'); run(sim, SPHERE.gather + 0.02); expect(s.sphere).not.toBeNull(); const tx = s.sphere!.x1;
    expect(Math.abs(tx - 1300)).toBeLessThan(30);
    run(sim, SPHERE.flight + 0.1); expect(s.sphere).toBeNull(); expect(s.blasts.length).toBe(1);
    for (const e of s.enemies.slice(0, 3)) expect(e.hp).toBeLessThan(500 - SPHERE.damage * SPHERE.edgeFalloff - 1);
    expect(s.enemies[3].hp).toBe(500);
    expect(Math.hypot(s.enemies[0].x - 1300, s.enemies[0].y - 800)).toBeGreaterThan(0);
  });
  it('detonates exactly once even if the target dies in flight, and leaves a default target with no enemies', () => {
    const { sim, s } = setup([[1300, 800, 40]]); s.player.aimX = 1; s.player.aimY = 0;
    press(sim, 'sphere'); run(sim, SPHERE.gather + 0.1); s.enemies[0].hp = 0;
    run(sim, SPHERE.flight); expect(s.blasts.length).toBe(1);
    expect(s.abilityEvents.filter(e => e.kind === 'sphere_burst').length).toBe(1);
  });
  it('Form I enlarges the blast radius', () => {
    const f1 = setup([[1300 + SPHERE.radius + 10, 800, 500]]); f1.s.player.aimX = 1; f1.s.player.aimY = 0; f1.s.player.form = 1; f1.s.player.drive = 100;
    f1.s.enemies[0].x = 1300 + SPHERE.radius + 30; f1.s.enemies[0].y = 800;
    const base = setup([[1300 + SPHERE.radius + 30, 800, 500]]); base.s.player.aimX = 1; base.s.player.aimY = 0;
    for (const t of [f1, base]) { t.s.sphere = { id: 1, x0: 1100, y0: 700, x1: 1300, y1: 800, t: 0, form: t === f1 ? 1 : 0 }; run(t.sim, SPHERE.flight + 0.05); }
    expect(f1.s.enemies[0].hp).toBeLessThan(500); expect(base.s.enemies[0].hp).toBe(500);
  });
  it('is deterministic for the same seed and input', () => {
    const go = () => { const { sim, s } = setup([[1300, 800, 500], [1250, 830, 500]]); s.player.aimX = 1; s.player.aimY = 0; press(sim, 'sphere'); run(sim, 2); return JSON.stringify(s.enemies); };
    expect(go()).toBe(go());
  });
  it('cannot start while casting another ability and restarts cleanly after a new run', () => {
    const { sim, s } = setup(); press(sim, 'beam'); press(sim, 'sphere'); expect(s.cast?.kind).toBe('beam'); expect(s.player.sphereCooldown).toBe(0);
    const fresh = new Simulation(7).state; expect(fresh.cast).toBeNull(); expect(fresh.sphere).toBeNull(); expect(fresh.blasts.length).toBe(0);
  });
});

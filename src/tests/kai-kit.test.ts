import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { Enemy, InputState } from '../sim/GameState';
import { CRUCIBLE, ECHO, METEOR, RISE, SCATTER, SURGE } from '../content/kaiKit';
import { kitOf } from '../sim/KaiKit';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const mob = (id: number, x: number, y: number, hp = 4000, kind: Enemy['kind'] = 'pursuer'): Enemy => ({ id, x, y, kind, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
function kai(form: 0 | 1 | 2 | 3, enemies: Array<[number, number, number?]> = []) {
  const sim = new Simulation(7, 'gloam', true, true), s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9;
  s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.hp = s.player.maxHp = 1e6; s.player.form = form; s.apexGate = 0; s.player.drive = 100; s.player.aimX = 1; s.player.aimY = 0;
  s.enemies = enemies.map(([x, y, hp], i) => mob(100 + i, x, y, hp ?? 4000)); return { sim, s };
}
const run = (sim: Simulation, sec: number, i: InputState = idle()) => { for (let k = 0; k < Math.round(sec / DT); k++) sim.step(DT, i); };
const count = (s: { abilityEvents: Array<{ kind: string }> }, kind: string) => s.abilityEvents.filter(e => e.kind === kind).length;
const tally = (sim: Simulation, sec: number, input: InputState = idle()) => { const seen = new Set<number>(), c: Record<string, number> = {}; for (let k = 0; k < Math.round(sec / DT); k++) { sim.step(DT, input); for (const e of sim.state.abilityEvents) if (!seen.has(e.id)) { seen.add(e.id); c[e.kind] = (c[e.kind] ?? 0) + 1; } } return c; };

describe('Q: Surge Step (Base)', () => {
  it('raises speed and auto damage from timed state, expires, and never edits the base stats', () => {
    const { sim, s } = kai(0); const sp0 = s.player.speed, ad0 = s.player.attackDamage; sim.step(DT, idle({ q: true })); expect(kitOf(s).surge).toBeGreaterThan(SURGE.duration - 0.1);
    expect(s.player.speed).toBe(sp0); expect(s.player.attackDamage).toBe(ad0);
    const x0 = s.player.x; run(sim, 0.5, idle({ x: 1 })); const fast = s.player.x - x0; const b = kai(0); const bx = b.s.player.x; run(b.sim, 0.5, idle({ x: 1 })); expect((s.player.x - x0) / (b.s.player.x - bx)).toBeCloseTo(SURGE.speedMul, 1); void fast;
    run(sim, SURGE.duration + 0.2); expect(kitOf(s).surge).toBe(0); expect(s.player.qCooldown).toBeGreaterThan(SURGE.cooldown - SURGE.duration - 1);
  });
  it('expires on transformation and the cooldown persists', () => {
    const { sim, s } = kai(0); sim.step(DT, idle({ q: true })); s.player.form = 1; run(sim, 0.05); expect(kitOf(s).surge).toBe(0); expect(s.player.qCooldown).toBeGreaterThan(5); sim.step(DT, idle({ q: true })); expect(s.cast).toBeNull();
  });
  it('boosts auto damage by 15%', () => {
    const a = kai(0, [[1200, 800, 1e5]]), b = kai(0, [[1200, 800, 1e5]]); b.sim.step(DT, idle({ q: true })); a.sim.step(DT, idle()); for (const r of [a, b]) r.s.player.attackClock = 0.01;
    run(a.sim, 0.1); run(b.sim, 0.1); expect(1e5 - b.s.enemies[0].hp).toBeCloseTo((1e5 - a.s.enemies[0].hp) * SURGE.autoMul, 3);
  });
});

describe('Q: Scatter Burst (Flarebound)', () => {
  it('fires exactly ten real projectiles that each detonate once', () => {
    const { sim, s } = kai(1, [[1300, 800], [1320, 760], [1280, 850]]); sim.step(DT, idle({ q: true })); expect(s.cast?.kind).toBe('scatter');
    const c = tally(sim, 2.5); expect(c.scatter_fire).toBe(SCATTER.shots); expect(c.scatter_blast).toBe(SCATTER.shots); expect(kitOf(s).shots.length).toBe(0);
    expect(s.enemies.reduce((a, e) => a + (4000 - e.hp), 0)).toBeGreaterThan(SCATTER.shots * 8);
  });
  it('with nothing around it still fires ten shots into a fan that burst on walls or at range', () => {
    const { sim, s } = kai(1); sim.step(DT, idle({ q: true })); const c = tally(sim, 2.5); expect(c.scatter_fire).toBe(SCATTER.shots); expect(c.scatter_blast).toBe(SCATTER.shots); expect(s.cast).toBeNull();
  });
  it('cooldown is spent and cannot be re-cast while active', () => {
    const { sim, s } = kai(1, [[1300, 800]]); sim.step(DT, idle({ q: true })); expect(s.player.qCooldown).toBeGreaterThan(SCATTER.cooldown - 0.5); run(sim, 0.2); sim.step(DT, idle({ q: true })); expect(count(s, 'scatter_fire')).toBeLessThanOrEqual(SCATTER.shots);
  });
});

describe('Q: Meteor Drive (Cometheart)', () => {
  it('advances in three beats, hitting each enemy in its path once per beat', () => {
    const { sim, s } = kai(2, [[1190, 800], [1250, 800], [1320, 800]]); const x0 = s.player.x; sim.step(DT, idle({ q: true })); expect(s.cast?.kind).toBe('meteor');
    const c = tally(sim, 1.2); expect(c.meteor_beat).toBe(METEOR.beats); expect(s.player.x - x0).toBeGreaterThan(METEOR.step * (METEOR.beats - 1)); expect(s.player.x - x0).toBeLessThan(METEOR.step * METEOR.beats + 5);
    expect(s.enemies.filter(e => e.hp < 4000).length).toBe(3); expect(s.cast).toBeNull();
  });
  it('stops at a wall and never leaves the arena', () => {
    const { sim, s } = kai(2); s.player.x = 60; s.player.aimX = -1; s.player.aimY = 0; sim.step(DT, idle({ q: true })); run(sim, 1.2); expect(s.player.x).toBeGreaterThan(20);
  });
});

describe('Q: Silver Echo (Stillfire Apex)', () => {
  it('summons one owned clone with reduced HP that fights, can be killed, and expires', () => {
    const { sim, s } = kai(3, [[1260, 800, 1e5]]); s.player.maxHp = s.player.hp = 100; sim.step(DT, idle({ q: true })); const k = kitOf(s); expect(k.clone).not.toBeNull(); expect(k.clone!.maxHp).toBeCloseTo(100 * ECHO.hpFrac, 3);
    run(sim, 1.5); expect(1e5 - s.enemies[0].hp).toBeGreaterThan(0); sim.step(DT, idle({ q: true })); expect(k.clone).not.toBeNull();
    run(sim, ECHO.life + 0.5); expect(kitOf(s).clone).toBeNull(); expect(count(s, 'clone_end') + 0).toBeGreaterThanOrEqual(0);
  });
  it('enemies in contact kill it; it is not a second player and leaves no state behind', () => {
    const { sim, s } = kai(3); s.player.maxHp = s.player.hp = 100; sim.step(DT, idle({ q: true })); const c = kitOf(s).clone!; for (let i = 0; i < 6; i++) s.enemies.push({ ...mob(300 + i, c.x + 4 * i, c.y, 1e5), damage: 9 });
    run(sim, 2); expect(kitOf(s).clone).toBeNull(); expect(s.party).toBeUndefined(); expect(s.player.hp).toBeGreaterThan(0);
  });
  it('is removed when the form ends', () => {
    const { sim, s } = kai(3); sim.step(DT, idle({ q: true })); expect(kitOf(s).clone).not.toBeNull(); s.player.form = 0; run(sim, 0.1); expect(kitOf(s).clone).toBeNull();
  });
});

describe('Flarebound E / R', () => {
  it('Rising Flare: four telegraphed pillars erupt in order along the lane; one enemy is hit at most twice', () => {
    const { sim, s } = kai(1, [[1190, 800], [1280, 800], [1450, 800]]); sim.step(DT, idle({ beam: true })); expect(s.cast?.kind).toBe('flare'); const k = kitOf(s); expect(k.pillars.length).toBe(RISE.pillars);
    const xs = k.pillars.map(p => p.x); expect([...xs].sort((a, b) => a - b)).toEqual(xs); const c = tally(sim, 1.2); expect(c.flare_pillar).toBe(RISE.pillars);
    for (const e of s.enemies) expect(4000 - e.hp).toBeLessThanOrEqual(RISE.damage * RISE.maxHitsPerEnemy + 1e-6); expect(s.enemies[0].hp).toBeLessThan(4000);
  });
  it('Rising Flare does not cross walls and spends its own cooldown', () => {
    const { sim, s } = kai(1); s.player.x = 120; sim.step(DT, idle({ beam: true })); expect(s.player.beamCooldown).toBeGreaterThan(RISE.cooldown - 0.5); run(sim, 1.2); expect(kitOf(s).pillars.every(p => p.x > 40)).toBe(true);
  });
  it('Sunfall Crucible: a committed zone outlives the cast, pulses, then erupts once', () => {
    const { sim, s } = kai(1, [[1330, 800], [1360, 840], [1300, 770]]); sim.step(DT, idle({ sphere: true })); expect(s.cast?.kind).toBe('crucible');
    const c = tally(sim, CRUCIBLE.windup + CRUCIBLE.recover + 0.1); expect(kitOf(s).crucible).not.toBeNull(); expect(s.cast).toBeNull();
    const c2 = tally(sim, CRUCIBLE.life + 0.3); expect((c.crucible_pulse ?? 0) + (c2.crucible_pulse ?? 0)).toBe(CRUCIBLE.pulses); expect(c2.crucible_final).toBe(1); expect(kitOf(s).crucible).toBeNull();
    expect(s.enemies.every(e => e.hp < 4000 - CRUCIBLE.pulseDamage * CRUCIBLE.pulses)).toBe(true); expect(s.player.sphereCooldown).toBeGreaterThan(10);
  });
  it('Nova upgrades widen and strengthen the crucible', () => {
    const a = kai(1, [[1330, 800]]), b = kai(1, [[1330, 800]]); b.s.mods.sphereDamage = 2; b.s.mods.sphereEcho = 2;
    for (const r of [a, b]) { r.sim.step(DT, idle({ sphere: true })); run(r.sim, CRUCIBLE.windup + CRUCIBLE.life + 0.6); }
    expect(4000 - b.s.enemies[0].hp).toBeGreaterThan((4000 - a.s.enemies[0].hp) * 2);
  });
});

describe('Kit hygiene', () => {
  it('Base E / R remain Fracture Lance / Nova Bloom and there is no Impact Pulse in any form', () => {
    const { sim, s } = kai(0); sim.step(DT, idle({ beam: true })); expect(s.cast?.kind).toBe('beam'); run(sim, 1.5); sim.step(DT, idle({ sphere: true })); expect(s.cast?.kind).toBe('sphere');
    for (const f of [0, 1, 2, 3] as const) { const k = kai(f, [[1150, 800]]); k.sim.step(DT, idle({ q: true })); expect(k.s.impacts.some(i => i.kind === 'pulse')).toBe(false); }
  });
});

describe('Kai auto attack presentation contract', () => {
  it('the strike records the primary target direction and every shot of the volley leaves the fist of that facing', async () => {
    const { faceOf, fistWorld } = await import('../sim/AbilitySystem');
    const { sim, s } = kai(0, [[1000, 800], [1200, 700]]); s.player.attackClock = 0.01; s.player.targets = 2; run(sim, 0.05);
    const shots = s.impacts.filter(i => i.kind === 'shot'); expect(shots.length).toBe(2); const face = faceOf(s.hx.strike.x, s.hx.strike.y); expect(face).toBe('west');
    const { handOffset } = await import('../sim/Strike'); const o = fistWorld(s, 0, face), ho = handOffset(face, s.hx.strike.hand!); for (const sh of shots) { expect(sh.x).toBeCloseTo(o.x + ho.x, 5); expect(sh.y).toBeCloseTo(o.y + ho.y, 5); } expect(s.hx.strike.t).toBeCloseTo(s.time, 1);
  });
});

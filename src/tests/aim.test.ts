import { describe, it, expect } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { InputState } from '../sim/GameState';
import { SPHERE } from '../content/abilities';
import { faceOf } from '../sim/AbilitySystem';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const norm = (x: number, y: number) => { const m = Math.hypot(x, y); return { x: x / m, y: y / m }; };
function setup(form: 0 | 1 | 2 = 0) {
  const sim = new Simulation(7, 'gloam', true); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.form = form; s.player.drive = 50; return { sim, s };
}
const ptr = (dx: number, dy: number, d = 220): Partial<InputState> => { const n = norm(dx, dy); return { aimX: n.x, aimY: n.y, aimSrc: 'pointer', aimDist: d }; };
const stick = (dx: number, dy: number): Partial<InputState> => { const n = norm(dx, dy); return { aimX: n.x, aimY: n.y, aimSrc: 'stick' }; };

describe('Lance / Dragonfang / Nova / Cannon follow the pointer and the right stick', () => {
  it('Fracture Lance fires exactly along the pointer, at any angle, and the body takes the nearest facing', () => {
    const { sim, s } = setup(); sim.step(DT, idle(ptr(1, -1))); sim.step(DT, idle({ ...ptr(1, -1), beam: true }));
    const n = norm(1, -1); expect(s.cast?.kind).toBe('beam'); expect(s.cast!.dirX).toBeCloseTo(n.x, 5); expect(s.cast!.dirY).toBeCloseTo(n.y, 5); expect(s.cast!.face).toBe(faceOf(n.x, n.y));
  });
  it('the right stick aims the same way, and a stale aim falls back to the movement facing', () => {
    const { sim, s } = setup(); sim.step(DT, idle(stick(-1, 0.3))); sim.step(DT, idle({ ...stick(-1, 0.3), beam: true }));
    const n = norm(-1, 0.3); expect(s.cast!.dirX).toBeCloseTo(n.x, 5); expect(s.cast!.face).toBe('west');
    const b = setup(); b.sim.step(DT, idle({ ...ptr(0, -1) }));   // aim once, then walk east for longer than the hold time without aiming
    for (let i = 0; i < 60 * 3.3; i++) b.sim.step(DT, idle({ x: 1 })); b.sim.step(DT, idle({ x: 1, beam: true }));
    expect(b.s.cast!.dirX).toBeGreaterThan(0.9);
  });
  it('keyboard only (no aim ever given): nothing changes, the lance still goes the way Kai faces', () => {
    const { sim, s } = setup(); sim.step(DT, idle({ x: -1 })); sim.step(DT, idle({ x: -1, beam: true })); expect(s.cast!.dirX).toBeLessThan(-0.9); expect(s.cast!.face).toBe('west');
  });
  it('Form II: Dragonfang Rush and the Cometbreaker Cannon follow the pointer', () => {
    const a = setup(2); a.sim.step(DT, idle(ptr(0, 1))); a.sim.step(DT, idle({ ...ptr(0.5, 1), beam: true }));
    const n = norm(0.5, 1); expect(a.s.cast?.kind).toBe('dragon'); expect(a.s.cast!.dirX).toBeCloseTo(n.x, 5); expect(a.s.cast!.dirY).toBeCloseTo(n.y, 5);
    const b = setup(2); b.sim.step(DT, idle(ptr(-1, -0.2))); b.sim.step(DT, idle({ ...ptr(-1, -0.2), sphere: true }));
    const m = norm(-1, -0.2); expect(b.s.cast?.kind).toBe('comet'); expect(b.s.cast!.dirX).toBeCloseTo(m.x, 5); expect(b.s.cast!.dirY).toBeCloseTo(m.y, 5);
  });
  it('Nova Bloom lands where the pointer is, snaps onto an enemy cluster there, and uses the default range on a stick', () => {
    const { sim, s } = setup(); sim.step(DT, idle(ptr(1, 0, 260))); sim.step(DT, idle({ ...ptr(1, 0, 260), sphere: true }));
    expect(s.cast?.kind).toBe('sphere'); expect(s.cast!.tx).toBeCloseTo(1100 + 260, 0); expect(s.cast!.ty).toBeCloseTo(800, 0);
    const c = setup(); c.sim.step(DT, idle(stick(0, 1))); c.sim.step(DT, idle({ ...stick(0, 1), sphere: true })); expect(c.s.cast!.ty).toBeCloseTo(800 + SPHERE.defaultRange, 0);
    const d = setup(); d.s.enemies.push({ ...d.s.enemies[0], id: 900, x: 1100 + 240, y: 800 + 40, hp: 99, maxHp: 99, radius: 17, speed: 0, damage: 0, kind: 'pursuer', touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 } as never);
    d.sim.step(DT, idle(ptr(1, 0, 260))); d.sim.step(DT, idle({ ...ptr(1, 0, 260), sphere: true })); expect(d.s.cast!.tx).toBeCloseTo(1340, 0); expect(d.s.cast!.ty).toBeCloseTo(840, 0);
  });
});

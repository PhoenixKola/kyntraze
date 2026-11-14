import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KAI_DIRS, KAI_GROUND_DY, KAI_SCALE, handAnchorWorld, type AnchorTable, type KaiForm } from '../assets/kaiAnimation';
import { BEAM_MUZZLE, SPHERE_RELEASE } from '../content/handAnchors';
import { BEAM, SPHERE } from '../content/abilities';
import { Simulation } from '../sim/Simulation';
import { beamOrigin, clampToFace, faceOf, sphereOrigin } from '../sim/AbilitySystem';
import type { Enemy, InputState } from '../sim/GameState';

const table = JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'art', 'kai-anchors.json'), 'utf8')) as AnchorTable;
const forms: KaiForm[] = ['base', 'f1'];
const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const enemy = (id: number, x: number, y: number, hp = 400): Enemy => ({ id, x, y, kind: 'pursuer', hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 0 });
function setup(aimX: number, aimY: number, enemies: Array<[number, number]> = []) {
  const sim = new Simulation(5); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.attackClock = 1e9; s.player.aimX = aimX; s.player.aimY = aimY;
  s.enemies = enemies.map(([x, y], i) => enemy(10 + i, x, y)); return { sim, s };
}
const run = (sim: Simulation, sec: number) => { for (let i = 0; i < Math.round(sec / DT); i++) sim.step(DT, idle()); };

describe('hand anchors (8 form x facing combinations)', () => {
  for (const form of forms) for (const d of KAI_DIRS) it(`${form} ${d}: every Beam/Sphere frame has two fist anchors; the fists meet at release and part for the overhead hold`, () => {
    const t = table.forms[form][d];
    expect(t.Beam).toHaveLength(26); expect(t.Sphere).toHaveLength(24);
    for (const clip of ['Beam', 'Sphere'] as const) for (const fr of t[clip]) { expect(fr.n.every(Number.isFinite)).toBe(true); expect(fr.f.every(Number.isFinite)).toBe(true); expect(fr.m[0]).toBeCloseTo((fr.n[0] + fr.f[0]) / 2, 1); }
    const sep = (fr: { n: number[]; f: number[] }) => Math.hypot(fr.n[0] - fr.f[0], fr.n[1] - fr.f[1]);
    for (const i of [10, 14, 19]) expect(sep(t.Beam[i])).toBeLessThan(30);        // hands thrust forward together
    expect(sep(t.Sphere[16])).toBeLessThan(30);                                    // the throw leaves from joined hands
    expect(sep(t.Sphere[15])).toBeGreaterThan(14);                                 // overhead hold: the orb sits between the fists
    expect(t.Sphere[15].m[1]).toBeLessThan(t.Sphere[3].m[1] - 28);                 // the orb is carried well above the cupped start
  });
  it('the sim muzzle/release table equals the exported anchors (fire-hold mean / throw frame) within 1 sprite px', () => {
    for (const form of forms) for (const d of KAI_DIRS) {
      const t = table.forms[form][d]; const mean = [0, 1].map(k => t.Beam.slice(10, 20).reduce((a, f) => a + f.m[k], 0) / 10);
      expect(BEAM_MUZZLE[form][d].x).toBeCloseTo(mean[0], 0); expect(BEAM_MUZZLE[form][d].y).toBeCloseTo(mean[1], 0);
      expect(SPHERE_RELEASE[form][d].x).toBeCloseTo(t.Sphere[16].m[0], 0); expect(SPHERE_RELEASE[form][d].y).toBeCloseTo(t.Sphere[16].m[1], 0);
    }
  });
  it('anchor -> world transform: ground origin placed at the hero, anchor scaled by the sprite scale', () => {
    const a = handAnchorWorld(table, 'base', 'east', 'Beam', 12, 1000, 824, KAI_SCALE)!; const fr = table.forms.base.east.Beam[12];
    expect(a.m.x).toBeCloseTo(1000 + fr.m[0] * KAI_SCALE); expect(a.m.y).toBeCloseTo(824 + fr.m[1] * KAI_SCALE);
    expect(handAnchorWorld(table, 'base', 'east', 'Idle', 0, 0, 0, 1)).toBeNull();
    const big = handAnchorWorld(table, 'f1', 'west', 'Sphere', 3, 0, 0, 1)!; expect(big.n.x).toBeCloseTo(table.forms.f1.west.Sphere[3].n[0]);
  });
});

describe('muzzle world position and facing/aim reconciliation', () => {
  it('the beam lane starts at the visible hand midpoint for all four facings, both forms', () => {
    for (const form of [0, 1] as const) for (const [ax, ay, face] of [[1, 0, 'east'], [-1, 0, 'west'], [0, 1, 'south'], [0, -1, 'north']] as const) {
      const { sim, s } = setup(ax, ay); s.player.form = form; sim.step(DT, idle({ beam: true }));
      const o = beamOrigin(s, s.cast!); const m = BEAM_MUZZLE[form ? 'f1' : 'base'][face];
      expect(s.cast!.face).toBe(face); expect(o.x).toBeCloseTo(s.player.x + m.x * KAI_SCALE); expect(o.y).toBeCloseTo(s.player.y + KAI_GROUND_DY + m.y * KAI_SCALE);
      expect(Math.abs(o.y - (s.player.y + KAI_GROUND_DY))).toBeLessThan(75);   // above the feet, i.e. never at the boots/hips
      expect(o.y).toBeLessThan(s.player.y + KAI_GROUND_DY - 30);
    }
  });
  it('faceOf and clampToFace: the beam never deviates more than the bounded offset from the sprite facing', () => {
    expect(faceOf(1, 0.9)).toBe('east'); expect(faceOf(0.3, 1)).toBe('south'); expect(faceOf(-1, -0.2)).toBe('west'); expect(faceOf(0, -1)).toBe('north');
    for (let deg = 0; deg < 360; deg += 7) { const r = deg * Math.PI / 180, dx = Math.cos(r), dy = Math.sin(r), f = faceOf(dx, dy); const c = clampToFace(dx, dy, f, BEAM.maxAimOffset); const ax = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }[f]; const ang = Math.acos(Math.max(-1, Math.min(1, c.x * ax[0] + c.y * ax[1]))); expect(ang).toBeLessThanOrEqual(BEAM.maxAimOffset + 1e-6); expect(Math.hypot(c.x, c.y)).toBeCloseTo(1); }
  });
  it('near-diagonal assisted aim: facing is cardinal, the lane is bounded off that axis and still hits the assisted target when inside the bound', () => {
    const { sim, s } = setup(0.8, 0.6, [[1100 + 260, 800 + 150]]);   // target ~30 deg below east
    sim.step(DT, idle({ beam: true })); const c = s.cast!; expect(c.face).toBe('east');
    const ang = Math.atan2(c.dirY, c.dirX); expect(Math.abs(ang)).toBeLessThanOrEqual(BEAM.maxAimOffset + 1e-6);
    run(sim, 1.2); expect(s.enemies[0].hp).toBeLessThan(400);
  });
  it('a target past the bound is NOT hit: the sprite never fires somewhere it is not facing', () => {
    const { sim, s } = setup(0.7, 0.7, [[1100 + 60, 800 + 330]]); sim.step(DT, idle({ beam: true })); run(sim, 1.5);
    expect(s.cast).toBeNull(); expect(s.enemies[0].hp).toBe(400);
  });
});

describe('Nova Bloom trajectory', () => {
  it('leaves from the release anchor, lands on the locked target, detonates once at that point', () => {
    const { sim, s } = setup(1, 0, [[1100 + 300, 800 + 20], [1100 + 310, 800 + 40]]); sim.step(DT, idle({ sphere: true }));
    const cast = s.cast!; const tx = cast.tx, ty = cast.ty; expect(cast.face).toBe('east');
    run(sim, SPHERE.gather + 0.02); const sh = s.sphere!; const o = sphereOrigin(s, cast);
    expect(sh.x0).toBeCloseTo(o.x, 0); expect(sh.y0).toBeCloseTo(o.y, 0); expect(sh.x1).toBe(tx); expect(sh.y1).toBe(ty);
    run(sim, SPHERE.flight + 0.05); expect(s.sphere).toBeNull(); expect(s.blasts).toHaveLength(1); expect(s.blasts[0].x).toBe(tx); expect(s.abilityEvents.filter(e => e.kind === 'sphere_burst')).toHaveLength(1);
    expect(sh.y0).toBeLessThan(s.player.y + KAI_GROUND_DY - 30);   // starts at hand height, not at the feet
  });
  it('release timing: the beam fires exactly at the charge time, the sphere leaves exactly at the gather time', () => {
    const { sim, s } = setup(1, 0); sim.step(DT, idle({ beam: true })); let rel = 0; for (let i = 1; i < 120; i++) { sim.step(DT, idle()); if (s.cast?.released && !rel) rel = s.cast.t; }
    expect(rel).toBeGreaterThanOrEqual(BEAM.charge - 1e-6); expect(rel).toBeLessThan(BEAM.charge + 2 * DT);
    const b = setup(1, 0); b.sim.step(DT, idle({ sphere: true })); let t2 = 0; for (let i = 1; i < 120; i++) { b.sim.step(DT, idle()); if (b.s.sphere && !t2) t2 = b.s.sphere.t === 0 ? i * DT : t2; }
    expect(Math.abs(t2 - SPHERE.gather)).toBeLessThan(3 * DT);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Simulation } from '../sim/Simulation';
import type { Enemy, Face, InputState } from '../sim/GameState';
import type { HeroId } from '../content/heroes';
import { faceOf } from '../sim/AbilitySystem';
import { rightVector, strikeHand } from '../sim/Strike';
import { KAI_DIRS, KaiAnimator, parseKaiManifest, facingFromVector, type AnimFrameInput, type KaiManifests } from '../assets/kaiAnimation';

const DT = 1 / 60, FACES: Face[] = ['east', 'west', 'north', 'south'];
const V: Record<Face, [number, number]> = { east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] };
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const mob = (id: number, x: number, y: number): Enemy => ({ id, x, y, kind: 'pursuer', hp: 1e6, maxHp: 1e6, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });

describe('anatomical hand semantics (screen y down)', () => {
  it('facing NORTH the right hand projects to screen right; facing SOUTH it projects to screen left', () => {
    expect(rightVector('north').x).toBe(1); expect(rightVector('south').x).toBe(-1); expect(rightVector('east').y).toBe(1); expect(rightVector('west').y).toBe(-1);
  });
  it('a target on the runner side is struck by that hand for every facing', () => {
    for (const f of FACES) { const r = rightVector(f); expect(strikeHand(f, r.x * 50, r.y * 50, 0)).toBe('right'); expect(strikeHand(f, -r.x * 50, -r.y * 50, 0)).toBe('left'); }
  });
  it('dead ahead alternates the hands by combo step', () => { expect(strikeHand('east', 50, 0, 0)).not.toBe(strikeHand('east', 50, 0, 1)); });
});

describe('16-case matrix: run direction x enemy direction, every hero', () => {
  for (const hero of ['kai', 'ren', 'sora', 'vex'] as HeroId[]) for (const move of FACES) for (const enemy of FACES) it(`${hero}: running ${move}, enemy ${enemy}`, () => {
    const sim = new Simulation(5, 'gloam', true, true), s = sim.state; s.hero = hero; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.hp = s.player.maxHp = 1e6; s.player.attackClock = 0.02;
    const [ex, ey] = V[enemy], [mx, my] = V[move]; s.enemies = [mob(1, s.player.x + ex * 120, s.player.y + ey * 120)];
    const x0 = s.player.x, y0 = s.player.y; let strike = false;
    for (let i = 0; i < 30; i++) { sim.step(DT, idle({ x: mx, y: my })); if (s.hx.strike.t > 0 && !strike) { strike = true; expect(faceOf(s.hx.strike.x, s.hx.strike.y)).toBe(enemy); const st = s.hx.strike; expect(st.hand).toBe(strikeHand(enemy, st.x, st.y, st.step)); } }
    expect(strike, 'an automatic strike happened').toBe(true);
    const moved = (s.player.x - x0) * mx + (s.player.y - y0) * my; expect(moved, 'movement is never reversed or frozen by the attack').toBeGreaterThan(20);
  });
});

describe('Kai animator: run x enemy matrix', () => {
  const m = Object.fromEntries(KAI_DIRS.map(d => [d, parseKaiManifest(JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'art', 'kai', d, 'manifest.json'), 'utf8')), d)])) as KaiManifests;
  const base: AnimFrameInput = { dt: DT, alive: true, moving: true, inputX: 0, inputY: 0, runSpeed: 250, dashing: false, dashX: 0, dashY: 0, attackClock: 1, hasTarget: true, targetDx: 0, targetDy: 0, shot: null };
  for (const move of FACES) for (const enemy of FACES) it(`running ${move}, shot ${enemy}: body faces the target for opposed strikes, keeps the run facing for same-direction strikes`, () => {
    const a = new KaiAnimator(m), [mx, my] = V[move], [ex, ey] = V[enemy]; let hit = false, facing = ''; let clip = '';
    for (let i = 0; i < 24; i++) { const p = a.update({ ...base, inputX: mx, inputY: my, targetDx: ex * 100, targetDy: ey * 100, shot: i === 4 ? { dx: ex * 100, dy: ey * 100 } : null }, 0.55); if (i === 6) { facing = p.facing; clip = p.clip; hit = true; } }
    expect(hit).toBe(true);
    if (enemy === move) { expect(facing).toBe(move); expect(clip).toBe('RunPunchUpper'); } else { expect(facing).toBe(facingFromVector('south', ex, ey)); expect(clip).toBe('BasicPunch'); }
  });
});

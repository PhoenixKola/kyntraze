import { describe, expect, it } from 'vitest';
import { quiet } from './b22util';
import { damageEnemy } from '../sim/CombatSystem';
import type { Enemy } from '../sim/GameState';

const mob = (id: number, x: number, y: number, hp = 100, kind: Enemy['kind'] = 'pursuer'): Enemy => ({ id, x, y, kind, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
describe('B30 combat readout feed', () => {
  it("every hit carries the rounded damage dealt and the enemy it landed on (the floating numbers' only source)", () => {
    const { s } = quiet({ hero: 'kai', hp: 1e6, seed: 3 }); const e = mob(900, 1200, 800); s.enemies = [e]; s.impacts = [];
    damageEnemy(s, e, 12.6); const im = s.impacts.find(i => i.kind === 'hit')!;
    expect(im.dmg).toBe(13); expect(im.eid).toBe(900); expect(e.hp).toBeCloseTo(87.4, 1);
  });
  it('a killing blow is flagged so the number can be bigger, and shows the real (capped) damage', () => {
    const { s } = quiet({ hero: 'kai', hp: 1e6, seed: 3 }); const e = mob(901, 1200, 800, 5); s.enemies = [e]; s.impacts = [];
    damageEnemy(s, e, 50); const im = s.impacts.find(i => i.kind === 'hit')!; expect(im.kill).toBe(true); expect(im.dmg).toBe(50); expect(im.eid).toBe(901);
  });
});

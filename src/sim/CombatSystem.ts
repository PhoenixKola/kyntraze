import type { Enemy, GameState } from './GameState';
import { distanceSquared } from '../core/Math';
import { ENEMIES } from '../content/enemies';
import { addPickup } from './EntityRegistry';
import { RULES } from '../core/Rules';
export function damagePlayer(state: GameState, damage: number): boolean {
  const p = state.player;
  if (p.invulnerable > 0 || state.phase !== 'running') return false;
  p.hp = Math.max(0, p.hp - Math.max(0, damage)); p.invulnerable = RULES.contactInvulnerability;
  state.impacts.push({ id: state.nextId++, kind: 'hit', x: p.x, y: p.y, ttl: 0.4, life: 0.4 });
  if (p.hp <= 0) state.phase = 'dead'; return true;
}
export function damageEnemy(state: GameState, enemy: Enemy, damage: number): boolean {
  if (enemy.hp <= 0) return false;
  enemy.hp = Math.max(0, enemy.hp - Math.max(0, damage));
  state.impacts.push({ id: state.nextId++, kind: 'hit', x: enemy.x, y: enemy.y, ttl: 0.16, life: 0.16 });
  if (enemy.hp > 0) return false;
  state.kills++; if (state.player.form === 0) state.player.drive = Math.min(100, state.player.drive + 8);
  if (state.pickups.length < RULES.maxPickups) addPickup(state, { x: enemy.x, y: enemy.y, xp: ENEMIES[enemy.kind].xp, age: 0 });
  return true;
}
export function updateContactDamage(state: GameState) {
  const p = state.player;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.touchCooldown > 0) continue;
    if (distanceSquared(p.x, p.y, enemy.x, enemy.y) < (p.radius + enemy.radius - 4) ** 2) {
      const hit = damagePlayer(state, enemy.damage);
      if (hit) enemy.touchCooldown = 0.85;
      if (state.phase === 'dead') return;
    }
  }
}

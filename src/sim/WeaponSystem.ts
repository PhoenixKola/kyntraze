import type { GameState } from './GameState';
import { damageEnemy } from './CombatSystem';
import { distanceSquared } from '../core/Math';
export function updateAutoWeapon(state: GameState, dt: number) {
  const p = state.player;
  p.attackClock -= dt;
  if (p.attackClock > 0) return;
  p.attackClock += Math.max(0.16, p.attackPeriod * (p.form ? 0.75 : 1));
  const candidates = state.enemies.filter(e => e.hp > 0 && distanceSquared(e.x, e.y, p.x, p.y) <= p.attackRange ** 2)
    .sort((a, b) => distanceSquared(a.x, a.y, p.x, p.y) - distanceSquared(b.x, b.y, p.x, p.y));
  const amount = Math.min(candidates.length, p.targets + (p.form ? 1 : 0));
  for (let i = 0; i < amount; i++) {
    const target = candidates[i];
    state.impacts.push({ id: state.nextId++, kind: 'shot', x: p.x, y: p.y - 15,
      targetX: target.x, targetY: target.y, ttl: 0.2, life: 0.2 });
    damageEnemy(state, target, p.attackDamage * (p.form ? 1.4 : 1));
    if (p.form === 0) p.drive = Math.min(100, p.drive + 1.7);
  }
}
export function activateQ(state: GameState) {
  const p = state.player;
  if (p.qCooldown > 0) return false;
  p.qCooldown = 8.5;
  const radius = p.qRadius * (p.form ? 1.25 : 1);
  state.impacts.push({ id: state.nextId++, kind: 'pulse', x: p.x, y: p.y, ttl: 0.35, life: 0.35 });
  for (const enemy of state.enemies) {
    if (enemy.hp > 0 && distanceSquared(p.x, p.y, enemy.x, enemy.y) <= (radius + enemy.radius) ** 2) damageEnemy(state, enemy, p.qDamage * (p.form ? 1.25 : 1));
  }
  return true;
}

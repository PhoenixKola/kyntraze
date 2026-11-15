import type { GameState, Enemy, EnemyEventKind, Pickup } from './GameState';
type EnemySeed = Omit<Enemy, 'id' | 'mode' | 'modeT' | 'attackCd' | 'aimX' | 'aimY' | 'stagger' | 'spawnedAt'> & Partial<Pick<Enemy, 'mode' | 'modeT' | 'attackCd' | 'aimX' | 'aimY' | 'stagger' | 'spawnedAt'>>;
export function addEnemy(state: GameState, enemy: EnemySeed): Enemy { const value: Enemy = { mode: 'move', modeT: 0, attackCd: 1.2, aimX: 1, aimY: 0, stagger: 0, spawnedAt: state.time, ...enemy, id: state.nextId++ }; state.enemies.push(value); return value; }
export function addPickup(state: GameState, pickup: Omit<Pickup, 'id'>): Pickup { const value = { ...pickup, id: state.nextId++ }; state.pickups.push(value); return value; }
export function pruneDeadEntities(state: GameState) { state.enemies = state.enemies.filter(enemy => enemy.hp > 0); state.pickups = state.pickups.filter(p => p.age < 45); }
export function pushEnemyEvent(state: GameState, kind: EnemyEventKind, e: Pick<Enemy, 'id' | 'kind' | 'x' | 'y'>, dirX = 0, dirY = 0) {
  state.enemyEvents.push({ id: state.nextId++, kind, enemy: e.kind, enemyId: e.id, x: e.x, y: e.y, dirX, dirY });
  if (state.enemyEvents.length > 64) state.enemyEvents.splice(0, state.enemyEvents.length - 64);
}

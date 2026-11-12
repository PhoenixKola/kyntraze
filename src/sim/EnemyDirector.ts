import { ENEMIES, type EnemyKind } from '../content/enemies';
import { RULES } from '../core/Rules';
import type { GameState } from './GameState';
import type { SeededRng } from '../core/SeededRng';
import { addEnemy } from './EntityRegistry';
import { blocked } from './CollisionSystem';
export function updateDirector(state: GameState, rng: SeededRng, dt: number) {
  if (state.enemies.length >= RULES.maxEnemies) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  const stage = Math.floor(state.time / 45);
  const interval = Math.max(0.3, 1.55 - Math.min(stage * 0.14, 0.8));
  state.spawnTimer = interval * rng.between(0.73, 1.2);
  const count = 1 + Math.min(3, Math.floor(state.time / 90));
  for (let i = 0; i < count && state.enemies.length < RULES.maxEnemies; i++) spawnEnemy(state, rng);
}
export function spawnEnemy(state: GameState, rng: SeededRng) {
  const p = state.player;
  const kind: EnemyKind = state.time > state.nextFlanker && rng.next() < 0.32 ? 'flanker' : 'pursuer';
  const def = ENEMIES[kind];
  // Place outside the 960x540 camera view where possible, without clipping the world.
  for (let attempt = 0; attempt < 25; attempt++) {
    const theta = rng.between(0, Math.PI * 2), range = rng.between(570, 700);
    const x = p.x + Math.cos(theta) * range, y = p.y + Math.sin(theta) * range;
    if (blocked(x, y, def.radius) || x < 60 || y < 60 || x > RULES.worldWidth - 60 || y > RULES.worldHeight - 60) continue;
    addEnemy(state, { kind, x, y, hp: def.hp + Math.floor(state.time / 60) * 5,
      maxHp: def.hp + Math.floor(state.time / 60) * 5, radius: def.radius,
      speed: def.moveSpeed + Math.min(32, state.time / 18), damage: def.damage, touchCooldown: 0 });
    return;
  }
  // No unsafe fallback spawn next to player.
}

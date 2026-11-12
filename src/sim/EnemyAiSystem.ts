import type { GameState } from './GameState';
import { normalize } from '../core/Math';
import { slideMove } from './CollisionSystem';
export function moveEnemies(state: GameState, dt: number) {
  const p = state.player;
  for (const enemy of state.enemies) {
    const v = normalize(p.x - enemy.x, p.y - enemy.y);
    // Flankers weave around the line of pursuit with a seeded stable ID phase.
    const wave = enemy.kind === 'flanker' ? Math.sin(state.time * 2.7 + enemy.id) * 0.45 : 0;
    slideMove(enemy, (v.x - v.y * wave) * enemy.speed, (v.y + v.x * wave) * enemy.speed, dt);
    enemy.touchCooldown = Math.max(0, enemy.touchCooldown - dt);
  }
}

import type { GameState, InputState } from './GameState';
import { normalize } from '../core/Math';
import { slideMove } from './CollisionSystem';
export function movePlayer(state: GameState, input: InputState, dt: number) {
  const p = state.player;
  const direction = normalize(input.x, input.y);
  if (input.dash && p.dashCooldown <= 0 && (direction.x !== 0 || direction.y !== 0)) {
    p.dashDx = direction.x; p.dashDy = direction.y; p.dashRemaining = 0.22; p.dashCooldown = 3.2; p.invulnerable = Math.max(p.invulnerable, 0.25);
    state.impacts.push({ id: state.nextId++, kind: 'dash', x: p.x, y: p.y, ttl: 0.22, life: 0.22 });
  }
  const dashing = p.dashRemaining > 0;
  slideMove(p, (dashing ? p.dashDx * 800 : direction.x * p.speed) * (p.form ? 1.16 : 1), (dashing ? p.dashDy * 800 : direction.y * p.speed) * (p.form ? 1.16 : 1), dt);
  p.dashRemaining = Math.max(0, p.dashRemaining - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
}

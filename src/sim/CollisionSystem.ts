import { clamp } from '../core/Math';
import { RULES } from '../core/Rules';
import { OBSTACLES } from '../content/arena';
export function blocked(x: number, y: number, radius: number): boolean {
  if (x < radius + 22 || y < radius + 22 || x > RULES.worldWidth - radius - 22 || y > RULES.worldHeight - radius - 22) return true;
  return OBSTACLES.some(o => { const closestX = clamp(x, o.x, o.x + o.w), closestY = clamp(y, o.y, o.y + o.h); return (x - closestX) ** 2 + (y - closestY) ** 2 < radius ** 2; });
}
export function slideMove(entity: {x: number; y: number; radius: number}, vx: number, vy: number, dt: number) {
  const x = entity.x + vx * dt, y = entity.y + vy * dt;
  if (!blocked(x, entity.y, entity.radius)) entity.x = x;
  if (!blocked(entity.x, y, entity.radius)) entity.y = y;
}

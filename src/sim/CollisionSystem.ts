import { clamp } from '../core/Math';
import { RULES } from '../core/Rules';
import { ARENAS, DEFAULT_ARENA, obstaclesOf, type ArenaId, type Obstacle } from '../content/arenas';
let active: readonly Obstacle[] = obstaclesOf(ARENAS[DEFAULT_ARENA].solids);
/** A run's collision is the active arena's solid prop footprints (set by the Simulation constructor). */
let inset = ARENAS[DEFAULT_ARENA].inset;
export function setActiveArena(id: ArenaId) { active = obstaclesOf(ARENAS[id].solids); inset = ARENAS[id].inset; }
export function blocked(x: number, y: number, radius: number): boolean {
  if (x < radius + inset || y < radius + inset || x > RULES.worldWidth - radius - inset || y > RULES.worldHeight - radius - inset) return true;
  return active.some(o => { const closestX = clamp(x, o.x, o.x + o.w), closestY = clamp(y, o.y, o.y + o.h); return (x - closestX) ** 2 + (y - closestY) ** 2 < radius ** 2; });
}
export function slideMove(entity: {x: number; y: number; radius: number}, vx: number, vy: number, dt: number) {
  const x = entity.x + vx * dt, y = entity.y + vy * dt;
  if (!blocked(x, entity.y, entity.radius)) entity.x = x;
  if (!blocked(entity.x, y, entity.radius)) entity.y = y;
}

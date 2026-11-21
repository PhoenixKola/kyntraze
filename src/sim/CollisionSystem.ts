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
/** Flight: the fighter glides over terrain props and only the arena edge stops it. */
export function flyMove(entity: {x: number; y: number; radius: number}, vx: number, vy: number, dt: number) {
  const r = entity.radius + inset;
  entity.x = clamp(entity.x + vx * dt, r, RULES.worldWidth - r); entity.y = clamp(entity.y + vy * dt, r, RULES.worldHeight - r);
}
/** After a flight ends over a prop: step to the nearest open ground instead of being stuck inside it. */
export function ejectFromSolids(entity: {x: number; y: number; radius: number}) {
  if (!blocked(entity.x, entity.y, entity.radius)) return;
  for (let d = 8; d <= 400; d += 8) for (let a = 0; a < 16; a++) { const x = entity.x + Math.cos((a / 16) * 6.2832) * d, y = entity.y + Math.sin((a / 16) * 6.2832) * d; if (!blocked(x, y, entity.radius)) { entity.x = x; entity.y = y; return; } }
}

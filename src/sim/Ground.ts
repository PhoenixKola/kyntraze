import type { GameState, Hazard } from './GameState';
import { FOOT_RADIUS, PLAYER_FOOT_DY } from '../content/enemies';
/** Kai's ground point (feet): the point every hostile area is judged against. */
export const playerFeet = (state: GameState) => ({ x: state.player.x, y: state.player.y + PLAYER_FOOT_DY });
/** True when Kai's feet disc overlaps a circle of radius r centred on a ground point: the one overlap rule for slams, ruptures and rushes. */
export function feetInCircle(state: GameState, cx: number, cy: number, r: number): boolean { const f = playerFeet(state); return Math.hypot(f.x - cx, f.y - cy) <= r + FOOT_RADIUS; }
export function feetInCone(state: GameState, h: Pick<Hazard, 'x' | 'y' | 'r' | 'ang' | 'arc'>): boolean {
  const f = playerFeet(state), dx = f.x - h.x, dy = f.y - h.y, d = Math.hypot(dx, dy);
  if (d > h.r + FOOT_RADIUS) return false; if (d <= FOOT_RADIUS) return true;
  let da = Math.atan2(dy, dx) - h.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
  return Math.abs(da) <= h.arc / 2 + Math.asin(Math.min(1, FOOT_RADIUS / d));
}
/** Axis-aligned rect on the ground plane (centre x,y, size w,h): hit when the feet disc touches it. */
export function feetInRect(state: GameState, h: { x: number; y: number; w: number; h: number }): boolean {
  const f = playerFeet(state), dx = Math.max(Math.abs(f.x - h.x) - h.w / 2, 0), dy = Math.max(Math.abs(f.y - h.y) - h.h / 2, 0);
  return Math.hypot(dx, dy) <= FOOT_RADIUS;
}

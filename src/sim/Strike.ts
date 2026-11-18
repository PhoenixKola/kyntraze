/** B22 auto-attack presentation contract shared by every hero: which anatomical hand strikes, and where. Projection rule (screen y points down): a runner's right-hand vector is the facing rotated 90 degrees clockwise, so facing NORTH the right hand projects to screen RIGHT and facing SOUTH it projects to screen LEFT. */
import type { Face } from './GameState';
export type Hand = 'left' | 'right';
const AXIS: Record<Face, [number, number]> = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] };
/** Screen-space unit vector of the right hand for a facing. */
export const rightVector = (face: Face): { x: number; y: number } => { const [fx, fy] = AXIS[face]; return { x: -fy, y: fx }; };
/** The hand on the side of the target; when the target is dead ahead the hands alternate by `step`. */
export function strikeHand(face: Face, dx: number, dy: number, step: number): Hand {
  const r = rightVector(face), n = Math.hypot(dx, dy) || 1, side = (dx * r.x + dy * r.y) / n;
  return Math.abs(side) < 0.2 ? (step % 2 === 0 ? 'right' : 'left') : side > 0 ? 'right' : 'left';
}
/** Screen position of the striking fist: the exported contact anchor shifted a few pixels toward the striking hand's side. */
export const handOffset = (face: Face, hand: Hand, px = 6) => { const r = rightVector(face), k = hand === 'right' ? px : -px; return { x: r.x * k, y: r.y * k }; };

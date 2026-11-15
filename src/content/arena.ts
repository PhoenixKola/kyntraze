export type { Obstacle } from './arenas';
import { ARENAS, obstaclesOf } from './arenas';
/** The Gloam Circuit's obstacles (default arena). Collision for a run uses the active arena via CollisionSystem. */
export const OBSTACLES = obstaclesOf(ARENAS.gloam.solids);

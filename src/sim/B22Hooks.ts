/** Single seam between the classic combat code and everything B22 layers on top (relics, marks, branches, mastery counters). CombatSystem calls only these two functions per hit. */
import type { Enemy, GameState } from './GameState';
export interface HitOpts { area?: boolean; proj?: boolean }
export function b22PreDamage(_s: GameState, _e: Enemy, dmg: number, _o?: HitOpts): number { return dmg; }
export function b22PostDamage(_s: GameState, _e: Enemy, _dmg: number, _o?: HitOpts): void { /* filled by RelicSystem / BranchSystem */ }

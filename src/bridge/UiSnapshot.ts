import type { RunPhase } from '../sim/GameState';
import type { UpgradeId } from '../content/upgrades';
export interface UiSnapshot {
  phase: RunPhase; seed: number; hp: number; maxHp: number; xp: number; nextXp: number; level: number;
  seconds: number; kills: number; enemies: number; dashCooldown: number; qCooldown: number; beamCooldown: number; sphereCooldown: number;
  drive: number; form: 0 | 1; formCooldown: number; offers: UpgradeId[]; score: number;
  /** True once Kai's Death animation has finished and held (render-driven); the Results overlay waits for it. */
  deathShown: boolean;
  /** Active boss for the HUD bar, or null. `intro` is seconds left of the arrival warning; `flash` ticks up when it is hurt (for the bar's damage feedback). */
  boss: BossHud | null;
}
export interface BossHud { id: 'warden' | 'seraph'; name: string; hp: number; maxHp: number; phase: 1 | 2; phases: 2; mode: string; intro: number; invuln: boolean; exposed: boolean }
export const blankSnapshot: UiSnapshot = { phase: 'running', seed: 0, hp: 100, maxHp: 100, xp: 0, nextXp: 7,
  level: 1, seconds: 0, kills: 0, enemies: 0, dashCooldown: 0, qCooldown: 0, beamCooldown: 0, sphereCooldown: 0, drive: 0,
  form: 0, formCooldown: 0, offers: [], score: 0, deathShown: false, boss: null };

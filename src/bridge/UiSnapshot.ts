import type { RunPhase } from '../sim/GameState';
import type { UpgradeId } from '../content/upgrades';
export interface UiSnapshot {
  phase: RunPhase; seed: number; hp: number; maxHp: number; xp: number; nextXp: number; level: number;
  seconds: number; kills: number; enemies: number; dashCooldown: number; qCooldown: number;
  drive: number; form: 0 | 1; formCooldown: number; offers: UpgradeId[]; score: number;
}
export const blankSnapshot: UiSnapshot = { phase: 'running', seed: 0, hp: 100, maxHp: 100, xp: 0, nextXp: 7,
  level: 1, seconds: 0, kills: 0, enemies: 0, dashCooldown: 0, qCooldown: 0, drive: 0,
  form: 0, formCooldown: 0, offers: [], score: 0 };

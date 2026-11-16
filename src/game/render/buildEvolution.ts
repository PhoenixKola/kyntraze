/** B21.2: the truthful build-evolution mapper. Pure function of the authoritative state (earned upgrade stacks and Mods); it only decides which presentation layers appear, never any combat number. */
import type { GameState } from '../../sim/GameState';

export type Tier = 0 | 1 | 2 | 3;
export interface Evolution {
  /** auto attack / Q / E (beam, lance, rush) / R (sphere, volley, horizon, bloodstar) look tiers, 0 = baseline */
  auto: Tier; q: Tier; e: Tier; r: Tier;
  /** real mechanics the visuals must mirror */
  beamWidth: number; afterburn: number; echo: 0 | 1 | 2; radius: number; extraTargets: number; reachBonus: number;
  /** 0..1 summed "how far along is the build", only for ambient aura strength (never for hit shapes) */
  build: number;
}

const stacks = (s: Pick<GameState, 'upgradeStacks'>, ...ids: string[]) => ids.reduce((n, id) => n + (s.upgradeStacks[id] ?? 0), 0);
const tierOf = (score: number, cuts: readonly [number, number, number]): Tier => (score >= cuts[2] ? 3 : score >= cuts[1] ? 2 : score >= cuts[0] ? 1 : 0);

export function evolution(s: Pick<GameState, 'upgradeStacks' | 'mods' | 'player'>, baseTargets = 1): Evolution {
  const u = s.upgradeStacks, m = s.mods;
  const auto = tierOf(stacks(s, 'impact', 'tempo', 'reach') + 2 * (u.echo ?? 0), [1, 4, 8]);
  const q = Math.min(3, u.pulse ?? 0) as Tier;
  const e = tierOf(stacks(s, 'widelance', 'hardlight', 'lancecool') + 2 * (u.afterburn ?? 0) + 3 * (u.conductor ?? 0), [1, 4, 8]);
  const r = tierOf(stacks(s, 'bloombulk', 'novacool') + 3 * (u.afterglow ?? 0) + 3 * (u.twinbloom ?? 0), [1, 4, 8]);
  const build = Math.min(1, (auto + q + e + r) / 8);
  return { auto, q, e, r, beamWidth: m.beamWidth, afterburn: m.beamLinger, echo: m.sphereEcho, radius: m.sphereRadius, extraTargets: Math.max(0, s.player.targets - baseTargets), reachBonus: Math.max(0, s.player.attackRange - 0), build };
}

/** Extra visual strength of a tier: 1, 1.12, 1.25, 1.4. Used for brightness/spark counts only; geometry always comes from the real mod. */
export const tierGain = (t: Tier) => 1 + 0.4 * (t / 3) ** 0.8;
/** How many extra pierce/impact sparks a tier earns per real contact. */
export const tierSparks = (t: Tier, reduced: boolean) => (reduced ? Math.min(1, t) : t * 2);

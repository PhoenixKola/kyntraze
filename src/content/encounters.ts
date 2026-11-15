import type { BossKind, MobKind } from './enemies';
/**
 * B11 run plan, the single tuning surface for the 15-18 minute run. Mob/elite intro times and caps live next to each enemy in enemies.ts.
 * Warden is the mid-run test (8:00, ends with a reward pick + heal); the Null Seraph at 15:00 is the finale and defeating it wins the run. A warning lands 30 s before it,
 * and the last half minute is deliberately thin so the arrival has room.
 */
export const BOSS_SCHEDULE: { id: BossKind; at: number }[] = [{ id: 'warden', at: 480 }, { id: 'seraph', at: 900 }];
export const FINALE_WARN_AT = 870;
/** Seconds of the pre-finale "quiet" and the rest after a boss falls: the budget is cut so the player can breathe. */
export const FINALE_QUIET = { from: FINALE_WARN_AT, scale: 0.4 };
export const BOSS_RECOVERY = { seconds: 25, scale: 0.35 };
/** Ordinary enemies are capped while a boss is alive (breathing room, readable arena). Elites do not spawn during a boss. */
export const BOSS_MOB_CAP = 40;
/** While a boss lives the live-threat budget is halved and clamped to this: adds, not a second fight. */
export const BOSS_THREAT_CAP = 22;
/** Threat points per living enemy; the director keeps the live total under the time-banded budget instead of spawning on a fixed clock. */
export const THREAT_COST: Record<MobKind, number> = { pursuer: 1, flanker: 1.5, ranged: 2, bruiser: 5, cantor: 6, aegis: 7 };
/** Budget (threat points) over run time in seconds, linearly interpolated. */
export const THREAT_CURVE: readonly (readonly [number, number])[] = [[0, 3], [45, 7], [120, 14], [240, 24], [360, 32], [480, 42], [600, 46], [720, 54], [870, 66], [900, 66]];
/** Rhythm: a brief dip every BREATHER.every seconds (after the opening) so waves have crests and troughs instead of a constant press. */
export const BREATHER = { start: 120, every: 80, length: 14, scale: 0.55 };
export function threatBudget(t: number): number {
  const c = THREAT_CURVE; if (t <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) if (t <= c[i][0]) { const [t0, v0] = c[i - 1], [t1, v1] = c[i]; return v0 + (v1 - v0) * ((t - t0) / (t1 - t0)); }
  return c[c.length - 1][1];
}
/** Final multiplier on the budget: breathers, the pre-finale quiet, and recovery after a boss. */
export function budgetScale(t: number, lastBossDefeatAt: number): number {
  let s = 1;
  if (t >= BREATHER.start && (t - BREATHER.start) % BREATHER.every < BREATHER.length) s = Math.min(s, BREATHER.scale);
  if (t >= FINALE_QUIET.from) s = Math.min(s, FINALE_QUIET.scale);
  if (lastBossDefeatAt >= 0 && t - lastBossDefeatAt < BOSS_RECOVERY.seconds) s = Math.min(s, BOSS_RECOVERY.scale);
  return s;
}
export interface PhaseRow { from: number; intro: string; pressure: string; levers: string }
export const PHASE_TABLE: PhaseRow[] = [
  { from: 0, intro: 'Shardwalker lunge; Rift Stalker (7 s)', pressure: 'learn move, dash, telegraphs; first level-up ~25 s', levers: 'threat curve 3-14' },
  { from: 70, intro: 'Shard Channeler bolts', pressure: 'sidestep a line', levers: 'ranged cap, cooldown' },
  { from: 150, intro: 'Breaker Sentinel slam', pressure: 'read ring edges; build identity forming', levers: 'bruiser cap, windup' },
  { from: 260, intro: 'Rift Cantor (rally + fan)', pressure: 'target priority', levers: 'cantor cap, aura radius' },
  { from: 330, intro: 'Aegis Shardbearer (shield, ram)', pressure: 'flank / area abilities', levers: 'aegis cap, shield arc' },
  { from: 480, intro: 'Boss A: Fracture Warden (mid-run test)', pressure: 'space denial, punish windows; reward pick + heal on defeat', levers: 'boss HP, windup scale, rupture count' },
  { from: 540, intro: 'Second Aegis / Cantor slots; arena hazard cadence tightens', pressure: 'escalating mixes, 40-55 threat', levers: 'caps, THREAT_CURVE' },
  { from: 870, intro: 'Finale warning, then a quiet half minute', pressure: 'reset and prepare', levers: 'FINALE_QUIET' },
  { from: 900, intro: 'Boss B: Null Seraph (finale; defeating it wins the run)', pressure: 'projectile weaving, repositioning, adds under BOSS_THREAT_CAP', levers: 'boss HP, volley width, ring gaps' },
];

import type { BossKind } from './enemies';
/** Difficulty phase table: the single tuning surface for B10/B11. Mob/elite intro times and caps live next to each enemy in enemies.ts; this lists the boss clock and the mob cap while a boss lives. Provisional until the full run exists. */
export const BOSS_SCHEDULE: { id: BossKind; at: number }[] = [{ id: 'warden', at: 480 }, { id: 'seraph', at: 690 }];
/** Ordinary enemies are capped while a boss is alive (breathing room, readable arena). Elites do not spawn during a boss. */
export const BOSS_MOB_CAP = 40;
export interface PhaseRow { from: number; intro: string; pressure: string; levers: string }
export const PHASE_TABLE: PhaseRow[] = [
  { from: 0, intro: 'Shardwalker lunge; Rift Stalker (7 s)', pressure: 'learn move, dash, telegraphs', levers: 'weight, spawn interval' },
  { from: 70, intro: 'Shard Channeler bolts', pressure: 'sidestep a line', levers: 'ranged cap, cooldown' },
  { from: 150, intro: 'Breaker Sentinel slam', pressure: 'read ring edges', levers: 'bruiser cap, windup' },
  { from: 260, intro: 'Rift Cantor (rally + fan)', pressure: 'target priority', levers: 'cantor cap, aura radius' },
  { from: 330, intro: 'Aegis Shardbearer (shield, ram)', pressure: 'flank / area abilities', levers: 'aegis cap, shield arc' },
  { from: 480, intro: 'Boss A: Fracture Warden', pressure: 'space denial, punish windows', levers: 'boss HP, windup scale, rupture count' },
  { from: 690, intro: 'Boss B: Null Seraph', pressure: 'projectile weaving, repositioning', levers: 'volley width, ring gaps' },
];

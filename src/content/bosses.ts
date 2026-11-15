import type { BossKind } from './enemies';
export interface BossDef {
  id: BossKind; name: string; title: string; hp: number; radius: number; speed: number; contact: number; contactRange: number;
  intro: number; phaseAt: number; phaseT: number; cooldown: [number, number]; windupScale: [number, number]; exposedBonus: number; rewardOrbs: number; rewardXp: number; deathT: number;
}
export const BOSSES: Record<BossKind, BossDef> = {
  warden: { id: 'warden', name: 'The Fracture Warden', title: 'Obsidian guardian of the Gloam Circuit', hp: 1600, radius: 44, speed: 42, contact: 14, contactRange: 0, intro: 2.4, phaseAt: 0.5, phaseT: 1.8, cooldown: [1.2, 0.8], windupScale: [1, 0.9], exposedBonus: 0.35, rewardOrbs: 12, rewardXp: 8, deathT: 1.8 },
  seraph: { id: 'seraph', name: 'The Null Seraph', title: 'Anomaly that fell between the Fractures', hp: 1100, radius: 28, speed: 95, contact: 10, contactRange: 0, intro: 2.0, phaseAt: 0.5, phaseT: 1.8, cooldown: [1.1, 0.75], windupScale: [1, 0.92], exposedBonus: 0.25, rewardOrbs: 10, rewardXp: 8, deathT: 1.6 },
};
/** Warden attack numbers (seconds, px, degrees). Phase 2 entries are the second value where an array is given. */
export const WARDEN = {
  rupture: { windup: 0.7, strike: 0.3, recover: 0.9, count: [5, 8], spacing: 70, start: 90, radius: 54, delay: 0.9, step: 0.16, damage: 22, lane: 0.38 },
  sweep: { windup: 1.0, strike: 0.22, recover: 1.4, radius: 170, arcDeg: 120, damage: 30, back: 0.6, maxDist: 230 },
  rush: { windup: 0.9, strike: 0.55, speed: 520, laneWidth: 88, damage: 26, recover: 1.5, second: 0.55, trackFraction: 0.55, minDist: 120 },
  pattern: [['sweep', 'rupture', 'rush', 'rupture', 'sweep'], ['rupture', 'sweep', 'rush', 'sweep', 'rupture', 'rush']] as const,
};
export const SERAPH = {
  volley: { windup: 0.85, strike: 0.15, recover: 0.7, count: [5, 7], spread: 0.227, speed: 250, radius: 8, damage: 12, trackFraction: 0.55, second: 0.45 },
  blink: { windup: 0.55, vanish: 0.25, volleyWindup: 0.45, recover: 0.6, distance: 260, count: 3, residueRadius: 60, residueDelay: 0.9, residueDamage: 16 },
  ring: { windup: 1.0, strike: 0.15, recover: 0.9, count: 14, gapHalf: 0.445, speed: 150, radius: 8, damage: 14, ttl: 3.6, second: 0.7 },
  spiral: { windup: 1.0, duration: 2.4, interval: 0.12, arms: 3, rotRate: 1.1, speed: 170, radius: 8, damage: 11, recover: 1.0, ttl: 2.4 },
  band: { near: 240, far: 380 },
  pattern: [['volley', 'ring', 'volley', 'blink'], ['spiral', 'volley', 'blink', 'ring', 'spiral', 'blink']] as const,
  maxShots: 160,
};

import type { BossKind } from './enemies';
export interface BossDef {
  id: BossKind; name: string; title: string; hp: number; radius: number; speed: number; contact: number; contactRange: number;
  intro: number; phaseAt: number; phaseT: number; cooldown: [number, number]; windupScale: [number, number]; exposedBonus: number; rewardOrbs: number; rewardXp: number; deathT: number;
  /** B22: damage multiplier while the boss is NOT exposed (armour); 1 = classic bosses, unchanged */ armor?: number; /** B22: extra phase thresholds (fraction of hp) after phaseAt, e.g. the Sovereign's third phase */ phaseAt2?: number; /** B22: arena the boss belongs to / is staged in (undefined = any) */ home?: string; /** B22: music/arena colour accent for HUD + procedural body */ accent?: string; /** B22: marks a boss that is built from several authoritative parts */ parts?: number;
}
export const BOSSES: Record<BossKind, BossDef> = {
  warden: { id: 'warden', name: 'The Fracture Warden', title: 'Obsidian guardian of the Gloam Circuit', hp: 1600, radius: 44, speed: 42, contact: 14, contactRange: 0, intro: 2.4, phaseAt: 0.5, phaseT: 1.8, cooldown: [1.2, 0.8], windupScale: [1, 0.9], exposedBonus: 0.35, rewardOrbs: 12, rewardXp: 8, deathT: 1.8 },
  seraph: { id: 'seraph', name: 'The Null Seraph', title: 'Anomaly that fell between the Fractures', hp: 2800, radius: 28, speed: 95, contact: 10, contactRange: 0, intro: 2.0, phaseAt: 0.5, phaseT: 1.8, cooldown: [1.1, 0.75], windupScale: [1, 0.92], exposedBonus: 0.25, rewardOrbs: 14, rewardXp: 10, deathT: 1.6 },
  // ---- B22: seven new bosses. None of them is reachable in the Classic schedule; the run plan (b22/modes.ts) decides when they appear.
  castellan: { id: 'castellan', name: 'The Crownless Castellan', title: 'Ruined celestial guardian of Aetherfall Citadel', hp: 3400, radius: 54, speed: 38, contact: 14, contactRange: 0, intro: 2.8, phaseAt: 0.55, phaseT: 2.2, cooldown: [1.3, 0.9], windupScale: [1, 0.9], exposedBonus: 0.6, armor: 0.55, rewardOrbs: 14, rewardXp: 10, deathT: 2.4, home: 'aetherfall', accent: '#f0d28a' },
  regent: { id: 'regent', name: 'The Paradox Regent', title: 'Monarch of the folded dimension', hp: 3300, radius: 30, speed: 80, contact: 10, contactRange: 0, intro: 2.4, phaseAt: 0.5, phaseT: 2.0, cooldown: [1.2, 0.8], windupScale: [1, 0.88], exposedBonus: 0.5, armor: 0.6, rewardOrbs: 14, rewardXp: 10, deathT: 2.2, home: 'paradox', accent: '#7fe0e8' },
  oathkeeper: { id: 'oathkeeper', name: 'The Oathkeeper', title: 'Rival guardian of the broken order', hp: 2700, radius: 24, speed: 120, contact: 12, contactRange: 0, intro: 2.2, phaseAt: 0.5, phaseT: 1.8, cooldown: [1.0, 0.7], windupScale: [1, 0.9], exposedBonus: 0.7, armor: 0.7, rewardOrbs: 12, rewardXp: 10, deathT: 2.0, accent: '#a070ff' },
  mirror_tyrant: { id: 'mirror_tyrant', name: 'The Mirror Tyrant', title: 'Reflective-crystal commander of the Void', hp: 3600, radius: 34, speed: 62, contact: 12, contactRange: 0, intro: 2.4, phaseAt: 0.5, phaseT: 2.0, cooldown: [1.2, 0.85], windupScale: [1, 0.9], exposedBonus: 0.6, armor: 0.5, rewardOrbs: 14, rewardXp: 12, deathT: 2.2, accent: '#b8e8ff' },
  chronophage: { id: 'chronophage', name: 'The Chronophage', title: 'Predator of the time fracture', hp: 3500, radius: 36, speed: 70, contact: 12, contactRange: 0, intro: 2.4, phaseAt: 0.5, phaseT: 2.0, cooldown: [1.2, 0.85], windupScale: [1, 0.9], exposedBonus: 0.6, armor: 0.55, rewardOrbs: 14, rewardXp: 12, deathT: 2.6, accent: '#ffcf6a' },
  hollow_choir: { id: 'hollow_choir', name: 'The Hollow Choir', title: 'Three voices around one silent core', hp: 2600, radius: 26, speed: 0, contact: 0, contactRange: 0, intro: 2.4, phaseAt: 0.5, phaseT: 2.0, cooldown: [1.4, 1.0], windupScale: [1, 0.9], exposedBonus: 0.5, armor: 0.3, rewardOrbs: 14, rewardXp: 12, deathT: 2.4, accent: '#d6c2ff', parts: 4 },
  sovereign: { id: 'sovereign', name: 'Sovereign of the Void', title: 'The last sovereign of the shattered horizon', hp: 5200, radius: 70, speed: 0, contact: 0, contactRange: 0, intro: 4.0, phaseAt: 0.62, phaseAt2: 0.3, phaseT: 2.6, cooldown: [1.5, 1.1], windupScale: [1, 0.92], exposedBonus: 0.4, armor: 0.2, rewardOrbs: 24, rewardXp: 16, deathT: 4.0, accent: '#e9c8ff', parts: 8 },
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

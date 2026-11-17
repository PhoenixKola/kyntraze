/** B22 Fracture Alliance: the six unordered hero pairings, their combination attacks and Resonance. Pure data; the combo logic lives in sim/CoopSystem.ts and consumes real events from BOTH players. */
import type { HeroId } from '../content/heroes';

export type PairId = 'kai_ren' | 'kai_sora' | 'ren_sora' | 'kai_vex' | 'ren_vex' | 'sora_vex';
export interface PairDef { id: PairId; heroes: [HeroId, HeroId]; name: string; setup: string; payoff: string; colors: [string, string]; sfx: string }
export const PAIRS: readonly PairDef[] = [
  { id: 'kai_ren', heroes: ['kai', 'ren'], name: 'Crimson Dragonfall', setup: 'Kai lands a heavy E / Q hit that marks a foe.', payoff: "Ren's next heavy contact on the marked foe erupts in a crimson impact.", colors: ['#eeb56c', '#ff4a3d'], sfx: 'pair_dragonfall' },
  { id: 'kai_sora', heroes: ['kai', 'sora'], name: 'Fracture Convergence', setup: 'Both players fire an E within 1.2 s of each other.', payoff: 'A shared lance runs between your two aim lines at their crossing.', colors: ['#eeb56c', '#59b8ff'], sfx: 'pair_convergence' },
  { id: 'ren_sora', heroes: ['ren', 'sora'], name: 'Scarlet Singularity', setup: "Ren's heavy contact creates a target zone.", payoff: "Sora's orbitals converge on it, pulling non-boss foes inward.", colors: ['#ff4a3d', '#59b8ff'], sfx: 'pair_singularity' },
  { id: 'kai_vex', heroes: ['kai', 'vex'], name: 'Oath of Fracture', setup: "Vex's successful parry exposes a foe.", payoff: "Kai's next hit on it is a precise burst.", colors: ['#eeb56c', '#a070ff'], sfx: 'pair_oath' },
  { id: 'ren_vex', heroes: ['ren', 'vex'], name: 'Ruinbreaker', setup: "Vex's defensive reversal sets up the foe.", payoff: 'A heavy red follow-up from Ren, only when Ren actually strikes.', colors: ['#ff4a3d', '#a070ff'], sfx: 'pair_ruinbreaker' },
  { id: 'sora_vex', heroes: ['sora', 'vex'], name: 'Eclipse Horizon', setup: "Vex's Seal marks enemies.", payoff: "Sora's blue energy anchors to every marked foe with a bounded link.", colors: ['#59b8ff', '#a070ff'], sfx: 'pair_eclipse' },
];
export const PAIR_BY_ID = Object.fromEntries(PAIRS.map(p => [p.id, p])) as Record<PairId, PairDef>;
export const pairOf = (a: HeroId, b: HeroId): PairDef | null => (a === b ? null : PAIRS.find(p => p.heroes.includes(a) && p.heroes.includes(b)) ?? null);
export const PAIR_RULES = { range: 560, window: 3.0, cooldown: 14, resonanceCost: 40, damage: 90, maxTargets: 4 } as const;
export const RESONANCE = { window: 1.0, duration: 6, drive: 100, damageMul: 1.2, cooldown: 40, gain: 0.8 } as const;
export const REVIVE = { time: 5, hold: 2.2, hpFraction: 0.5, maxPerPlayer: 2, grace: 1.5, bleedOut: 14 } as const;
export const COOP_BALANCE = { threat: 1.55, bossHp: 1.6, shotCap: 1.3, enemyCap: 1.25 } as const;

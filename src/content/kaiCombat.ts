/** Kai combat identity: the charged signature technique (one per transformation), Primal Overdrive, and the four automatic fighting styles. All numbers live here; the sim reads them, the renderer follows. */
export type SigForm = 1 | 2 | 3;
export const SIG = {
  cooldown: 45, minHold: 0.08, stages: [0.35, 0.9, 1.6] as readonly number[], maxHold: 2.3,
  range: 300, aimCos: Math.cos(0.75), moveScaleCharge: 0.55, moveScaleRelease: 0, contactR: 46,
  lunge: { 1: 0.2, 2: 0.18, 3: 0.12 } as Record<SigForm, number>,
  recover: 0.3,
  /** per charge tier 0..3: damage multiplier on qDamage-scale */
  tierMul: [0.55, 0.85, 1.15, 1.6] as readonly number[],
  flare: { name: 'Solar Vortex', hit: 2.6, splashR: 110, splashGrow: 30, splash: 0.5, bigAt: 0.35, bigR: 190, big: 1.4, push: 150 },
  comet: { name: 'Thunderstar Breaker', hit: 3.2, pulseEvery: 0.12, pulseR: 85, pulse: 0.55, clapAt: 0.5, clapR: 175, clap: 1.8, push: 120 },
  still: { name: 'Singularity Palm', hit: 2.8, pullR: 200, pullGrow: 30, pullSpeed: 280, releaseAt: 0.45, releaseR: 150, releaseGrow: 30, release: 2.2, push: 180 },
} as const;
export const SIG_NAME: Record<SigForm, string> = { 1: SIG.flare.name, 2: SIG.comet.name, 3: SIG.still.name };
/** Skybreaker: transformed Kai holds the dash input to lift off, flies, and lands with a slam when the hold ends. Per form: speed multiplier, rise rate, extra Drive drain per second. */
export const FLY = {
  holdToLift: 0.28, maxT: 5, minDrive: 12, cooldown: 3.5, slamMinT: 0.5, lift: 64,
  form: { 1: { speed: 1.3, rise: 5, drain: 5 }, 2: { speed: 1.5, rise: 7, drain: 7 }, 3: { speed: 1.6, rise: 9, drain: 4 } } as Record<1 | 2 | 3, { speed: number; rise: number; drain: number }>,
  slam: { r: 120, dmg: 1.7, push: 160 },
} as const;
/** Form Shift: instant switching between unlocked transformations while transformed. */
export const SHIFT = { minDrive: 20, cost: 18, cooldown: 2.5 } as const;
export const OD = {
  duration: 10, perHit: 1.4, perKill: 3, dmgMul: 1.25, speedMul: 1.08, periodMul: 0.88,
} as const;
/** Automatic fighting styles: per form a repeating beat list. `kind` selects the strike (rendered), `mul` scales the normal auto damage, `sweep` hits every enemy within that radius of Kai (finishers), `chain` adds one limited follow-up to a nearby target. */
export interface Beat { kind: 'punch' | 'kick' | 'uppercut' | 'spin' | 'palm' | 'fang' | 'dragonfist' | 'phantom' | 'finisher'; mul: number; sweep?: number; chain?: number; hand?: 'left' | 'right' }
export const MELEE = 70;
export const AUTO: Record<0 | 1 | 2 | 3, { name: string; period: number; beats: readonly Beat[] }> = {
  0: { name: 'Comet Fists', period: 1, beats: [{ kind: 'punch', mul: 0.85, hand: 'left' }, { kind: 'punch', mul: 0.85, hand: 'right' }, { kind: 'kick', mul: 1.0 }, { kind: 'spin', mul: 1.4, sweep: 78 }] },
  1: { name: 'Solar Barrage', period: 0.72, beats: [{ kind: 'punch', mul: 0.8, hand: 'right' }, { kind: 'palm', mul: 0.8, hand: 'left' }, { kind: 'punch', mul: 0.85, hand: 'right' }, { kind: 'uppercut', mul: 1.5, sweep: 82 }] },
  2: { name: 'Thunder Fangs', period: 0.62, beats: [{ kind: 'fang', mul: 0.7, hand: 'right' }, { kind: 'fang', mul: 0.7, hand: 'left' }, { kind: 'fang', mul: 0.75, hand: 'right' }, { kind: 'dragonfist', mul: 1.6, chain: 0.5, sweep: 60 }] },
  3: { name: 'Phantom Strikes', period: 0.7, beats: [{ kind: 'palm', mul: 0.85, hand: 'right' }, { kind: 'phantom', mul: 0.85, hand: 'left' }, { kind: 'palm', mul: 0.9, hand: 'right' }, { kind: 'finisher', mul: 1.5, sweep: 70 }] },
};

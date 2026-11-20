/** B26 Ren: Crimson Ascendant combat identity. Every number the form-only kit uses lives here; the sim (src/sim/RenCombat.ts) reads them, renderers follow the events. Prototype values, tuned only against play. */
export const REN_AUTO = {
  name: 'Crimson Fury', period: 0.84, reach: 96, finisherSweep: 92, finisherPush: 120, sweepCap: 6,
  /** four beats: lead jab, crossing kick, body hook, rising uppercut (finisher) */
  beats: [{ kind: 'jab', mul: 0.8, hand: 'right' }, { kind: 'kick', mul: 0.95, hand: 'left' }, { kind: 'hook', mul: 1.05, hand: 'right' }, { kind: 'uppercut', mul: 1.7, hand: 'left', sweep: true }] as readonly { kind: 'jab' | 'kick' | 'hook' | 'uppercut'; mul: number; hand: 'left' | 'right'; sweep?: boolean }[],
} as const;
export const REN_Q = { name: 'Infernal Cyclone', cooldown: 8, windup: 0.18, spin: 0.65, recover: 0.25, ticks: 4, pullR: 145, pullSpeed: 230, tickR: 112, tickMul: 0.45, releaseR: 175, releaseMul: 2.2, push: 150, stagger: 0.7, moveWindup: 0.1, moveSpin: 0.3, tickCap: 8, releaseCap: 14 } as const;
export const REN_E = { name: 'Scarlet Rampage', cooldown: 10, range: 300, coneCos: Math.cos(0.62), approach: 0.18, drive: 0.4, recover: 0.28, driveDist: 210, grabMul: 0.6, slamR: 140, slamMul: 2.6, missRush: 180, missR: 100, missMul: 1.3, shoulderMul: 1.6, shoulderR: 120, slamCap: 12, push0: 60 } as const;
export const REN_R = { name: 'Crimson Catastrophe', cooldown: 20, range: 380, defaultRange: 260, windup: 0.4, gap: 0.22, hits: 3, fistOffset: 56, fistR: 95, finalGap: 0.28, finalR: 175, fistMul: 28, finalMul: 82, recover: 0.36, push: 130, stagger: 0.5, cap: 14 } as const;
export const REN_V = {
  name: 'Crimson Nova Fist', cooldown: 45, minHold: 0.08, stages: [0.35, 0.9, 1.6] as readonly number[], maxHold: 2.3, range: 300, aimCos: Math.cos(0.75), moveCharge: 0.55, contactR: 46, lunge: 0.2, recover: 0.34,
  tierMul: [0.55, 0.85, 1.15, 1.6] as readonly number[], hit: 3.0, burstR: 120, burstGrow: 25, burstMul: 0.9, spiral: [0.12, 0.26] as readonly number[], spiralR: 135, spiralMul: 0.5, eruptR: 175, eruptMul: 1.5, ringAt: 0.5, ringR: 230, ringMul: 0.5, push: 160, cap: 14,
} as const;
/** Primal Overdrive (the Crimson Nine-Tailed Fox): same reference numbers as Kai's, plus a hit-rate window so volleys / area bursts cannot run the meter away. */
export const REN_OD = { duration: 10, perHit: 1.4, perKill: 3, dmgMul: 1.25, speedMul: 1.08, periodMul: 0.88, window: 0.25, windowHits: 4, bit: 1 << 14 } as const;
/** Skybreaker: hold dash 0.28 s to lift off; heavy, forward-leaning, costs extra Drive on top of the transformed drain. */
export const REN_FLY = { holdToLift: 0.28, maxT: 5, minDrive: 12, cooldown: 3.5, slamMinT: 0.5, speed: 1.35, rise: 6, drain: 6, slamR: 125, slamMul: 1.7, slamPush: 160 } as const;
/** Display for the HUD (single source for names, key labels and one-line text). */
export const REN_FORM_INFO = {
  auto: { name: REN_AUTO.name, text: 'Four-beat close-range brawl: jab, kick, hook, rising uppercut. Nothing hits beyond arm\'s reach.' },
  q: { name: REN_Q.name, text: 'Plant and spin: pulls ordinary enemies in, then a crimson blast throws them out. Bosses are never pulled.' },
  e: { name: REN_E.name, text: 'Seize the nearest enemy in front and drive it into the ground. Bosses and shielded foes take a shoulder strike instead.' },
  r: { name: REN_R.name, text: 'Two spectral fists hammer a marked patch of ground in turn, then converge for a heavy final strike.' },
  v: { name: REN_V.name, text: 'Hold V: compress a red sphere in the fist. Release to lunge. Longer charge, bigger eruption. Misses do nothing.' },
  od: { name: 'Crimson Nine-Tailed Fox', text: 'Fight while transformed to fill the meter, press G to wrap Ren in the fox for 10 s: +25% damage, +8% speed, faster strikes.' },
} as const;

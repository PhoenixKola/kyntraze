/** B28 Vex: Riftbound (form 1) and Voidheart Exile (form 2) combat identities. Every number the form-only kits use lives here; the sim (src/sim/VexCombat.ts) reads them, renderers follow the events. Prototype values, tuned only against play. */
/** Riftbound auto, Phantom Edge: four visible blade beats with real arc geometry */
export const VEX1_AUTO = {
  name: 'Phantom Edge', period: 0.82, reach: 135, sweepCap: 4, finisherPush: 90,
  beats: [{ kind: 'near', arc: 75, mul: 0.85 }, { kind: 'far', arc: 75, mul: 0.85 }, { kind: 'cross', arc: 100, mul: 1.5 }, { kind: 'curve', arc: 160, mul: 1.9 }] as readonly { kind: 'near' | 'far' | 'cross' | 'curve'; arc: number; mul: number }[],
} as const;
/** Voidheart auto, Invisible Judgment: precise cuts at committed points that resolve after a short delay */
export const VEX2_AUTO = {
  name: 'Invisible Judgment', period: 0.9, range: 185, delay: 0.14, cutR: 52, cap: 4,
  beats: [{ kind: 'single', n: 1, mul: 1.05 }, { kind: 'angle', n: 1, mul: 1.1 }, { kind: 'double', n: 2, mul: 1.8 }, { kind: 'multi', n: 4, mul: 2.4 }] as readonly { kind: 'single' | 'angle' | 'double' | 'multi'; n: number; mul: number }[],
} as const;
export const VEX1_Q = { name: 'Mirror Guard', cooldown: 7, perfect: 0.5, total: 0.9, recover: 0.2, arcDeg: 200, reduce: 0.7, gap: 0.3, moveScale: 0.5, echoes: 2, echoAt: [0.12, 0.3] as readonly number[], echoReach: 230, echoR: 64, echoMul: 1.1, stun: 0.9, refund: 0.5, drive: 12 } as const;
export const VEX2_Q = { name: 'Phantom Legion', cooldown: 10, cast: 0.35, copies: 3, life: 6, atkEvery: 0.55, mul: 0.3, range: 270, leash: 170, speed: 130, spawnR: 72, strikeR: 62, counterWindow: 0.9, counterMul: 2.2 } as const;
export const VEX1_E = { name: 'Rift Execution', cooldown: 10, range: 300, coneCos: Math.cos(0.95), windup: 0.12, arrive: 0.16, cut: 0.24, recover: 0.26, iframes: 0.32, mul: 2.7, cutR: 82, cap: 4, behind: 12, fallbackReach: 95 } as const;
export const VEX2_E = { name: 'Dimensional Severance', cooldown: 11, length: 560, width: 30, warn: 0.45, windup: 0.3, recover: 0.2, mul: 3.0, shockGap: 0.3, shockMul: 1.4, extraMul: 0.4, cap: 12, step: 140 } as const;
export const VEX1_R = { name: 'Oath of Ruin', cooldown: 20, range: 380, seals: 5, sealsSevere: 3, windup: 0.35, recover: 0.12, warn: 0.5, gap: 0.24, r: 95, finalR: 145, mul: 5.5, finalMul: 9, cap: 10, repeats: 2, markCap: 3, markFuse: 2.5, spacing: 72, moveScale: 0.5 } as const;
export const VEX2_R = { name: 'Domain of the Exile', cooldown: 25, cast: 0.4, dur: 5, radius: 220, every: 0.45, targets: 3, mul: 0.95, budget: 28, stagger: 0.15, moveScale: 0.7 } as const;
export const VEX1_V = { name: 'Abyssal Fang', cooldown: 45, minHold: 0.08, stages: [0.35, 0.9, 1.6] as readonly number[], maxHold: 2.3, moveCharge: 0.5, reach: 190, reachTier: 30, lunge: 0.18, width: 42, pierce: 4, hit: 3.2, pierceMul: 1.8, tierMul: [0.55, 0.85, 1.15, 1.6] as readonly number[], pulses: 2, pulseAt: 0.25, pulseMul: 0.6, recover: 0.34, aimCos: Math.cos(0.8), seek: 300 } as const;
export const VEX2_V = { name: 'Event Horizon', cooldown: 45, minHold: 0.08, stages: [0.35, 0.9, 1.6] as readonly number[], maxHold: 2.3, moveCharge: 0.5, speed: 420, speedTier: 40, range: 340, rangeTier: 40, radius: 18, tierMul: [0.6, 0.9, 1.2, 1.7] as readonly number[], hit: 1.6, pull: 0.45, pullR: 170, pullTier: 20, pullSpeed: 210, eruptR: 150, eruptTier: 25, eruptMul: 2.6, shockAt: 0.3, shockR: 210, shockMul: 0.8, push: 140, cap: 14, recover: 0.3 } as const;
/** Primal Overdrive (the Abyssal Guardian): the same reference numbers as Kai's, plus a hit-rate window so volleys, copies and area bursts cannot run the meter away. */
export const VEX_OD = { duration: 10, perHit: 1.4, perKill: 3, dmgMul: 1.25, speedMul: 1.08, periodMul: 0.88, window: 0.25, windowHits: 4, bit: 1 << 14 } as const;
/** Skybreaker per form: Riftbound is forceful and heavy, Voidheart elegant and cheap */
export const VEX_FLY = { holdToLift: 0.28, maxT: 5, minDrive: 12, cooldown: 3.5, slamMinT: 0.5, rise: 6, form: { 1: { speed: 1.4, drain: 6, slamR: 120, slamMul: 1.5, slamPush: 150 }, 2: { speed: 1.5, drain: 4.5, slamR: 100, slamMul: 1.2, slamPush: 90 } } as const } as const;
/** Vex Form Shift: Riftbound <-> Voidheart, same infrastructure as Kai's */
export const VEX_SHIFT = { cost: 18, minDrive: 20, cooldown: 2.5 } as const;
/** First Voidheart reveal: its own ~3.4 s choreography (the shared first reveal is 2.7 s) */
export const VEX_REVEAL = { first: { dur: 3.4, breakAt: 1.9, commitAt: 2.15 } } as const;
export const VEX_FORM_INFO = {
  1: {
    name: 'Riftbound',
    auto: { name: VEX1_AUTO.name, text: 'Four visible blade cuts, near side then far side, a paired cross and a curved finisher, all inside 135 px.' },
    q: { name: VEX1_Q.name, text: 'A short guard. A hit in the first half second is refused and answered by two spectral echoes; a late hit is only softened. Hazards cannot be parried.' },
    e: { name: VEX1_E.name, text: 'Step through a portal and appear behind the nearest enemy ahead, then cut. With no safe landing it is a short grounded slash.' },
    r: { name: VEX1_R.name, text: 'Violet seals break the ground one after another across a lane or under enemies; the last is the widest. Bosses are never moved.' },
    v: { name: VEX1_V.name, text: 'Hold V: forge a violet blade. Release for a short lunge and a narrow piercing cut. A miss only fades.' },
    od: { name: 'Abyssal Guardian: Riftbound', text: 'Fight while transformed to fill the meter, press G to wrap Vex in the fractured guardian for 10 s: +25% damage, +8% speed, faster cuts.' },
  },
  2: {
    name: 'Voidheart Exile',
    auto: { name: VEX2_AUTO.name, text: 'Small hand gestures place precise cuts on enemies a moment later: single, angled, double, then a multi-cut. A target that moves away is missed.' },
    q: { name: VEX2_Q.name, text: 'Three spectral copies of Vex fight beside him for 6 s at a fraction of his damage. They cannot be hit and never collect or charge anything.' },
    e: { name: VEX2_E.name, text: 'Slice a long line of space along your aim. After a short warning it cuts, then reconnects with a second shock. Bosses take damage, not armour bypass.' },
    r: { name: VEX2_R.name, text: 'A ring of exile follows Vex for 5 s and strikes enemies inside it every half second. Bosses are never pulled or stunned.' },
    v: { name: VEX2_V.name, text: 'Hold V: compress a dark core between both hands. Release to throw it; on contact it pulls ordinary enemies in, then erupts. A miss fizzles.' },
    od: { name: 'Abyssal Guardian: Voidheart', text: 'Fight while transformed to fill the meter, press G to wrap Vex in the towering guardian for 10 s: +25% damage, +8% speed, faster cuts.' },
  },
} as const;

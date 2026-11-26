/** B33 Ren: Ashen Eclipse (form 2). Every number the form-II kit uses lives here; the sim (src/sim/RenEclipse.ts) reads them, renderers follow the ash_* events. Prototype values reasoned from the Crimson Ascendant curves, not tuned by human play. */
export const ASH = {
  /** Unlock: the Null Seraph defeated once with Ren after Crimson Ascendant was earned. Persisted; usable from the NEXT run, never in the run that earns it. */
  unlockBoss: 'seraph' as const,
  charge: 100, cooldown: 24, drain: 4.1, speedMul: 1.14, autoMul: 1.38,
  cinemaFirst: { dur: 3.5, breakAt: 2.25, commitAt: 1.95 },
  cinemaRepeat: { dur: 1.1, breakAt: 0.52, commitAt: 0.62 },
  knockRadius: 220, knockPush: 120, stagger: 0.9,
} as const;
/** Form Shift between Crimson Ascendant and Ashen Eclipse: the same price as Vex's (18 Drive, 20 minimum, 2.5 s). */
export const ASH_SHIFT = { cost: 18, minDrive: 20, cooldown: 2.5 } as const;
/** Ash Brand: form-II melee contacts mark genuine targets (cap 3 each, 6 s, 20 targets at once); a finisher consumes the marks on the foes it strikes for one bounded eruption. Eruptions never mark or consume, so nothing chains. */
export const BRAND = { cap: 3, life: 6, maxTargets: 20, stackMul: 0.8, splashR: 84, splashMul: 0.35, splashCap: 5 } as const;
export const ASH_AUTO = {
  name: 'Cinderfang Chain', period: 0.9, reach: 90, finisherSweep: 100, finisherPush: 150, sweepCap: 6,
  /** body hook, low kick, cross-claw, crushing uppercut (finisher: consumes the marks of every foe it strikes) */
  beats: [{ kind: 'hook', mul: 0.95, cos: Math.cos(1.45) }, { kind: 'lowkick', mul: 1.0, cos: Math.cos(1.3) }, { kind: 'crossclaw', mul: 1.15, cos: Math.cos(1.75) }, { kind: 'crush', mul: 1.9, cos: Math.cos(1.45) }] as readonly { kind: 'hook' | 'lowkick' | 'crossclaw' | 'crush'; mul: number; cos: number }[],
} as const;
export const ASH_Q = { name: 'Eclipse Maul', cooldown: 7, range: 300, coneCos: Math.cos(0.8), windup: 0.12, gap: 0.17, strikes: 3, step: 62, reach: 80, finalR: 112, recover: 0.26, mul: [0.9, 1.0, 1.7] as readonly number[], finalMul: 1.6, push: 130, stagger: 0.6, missStep: 90, iframes: 0.1, moveWindup: 0.2, cap: 10 } as const;
export const ASH_E = { name: 'Ninefold Rupture', cooldown: 11, range: 340, defaultRange: 240, coil: 0.5, pounce: 0.26, recover: 0.34, R: 150, mul: 3.2, push: 170, stagger: 0.8, tails: 9, cap: 14, iframes: 0.2 } as const;
export const ASH_R = { name: 'Ashen Cataclysm', cooldown: 24, range: 400, defaultRange: 280, windup: 0.8, maxLen: 430, halfWidth: 78, strikeGap: 0.34, ruptureR: 205, strikeMul: 58, ruptureMul: 76, push: 150, stagger: 0.7, recover: 0.42, cap: 16 } as const;
export const ASH_V = {
  name: 'Eclipse Fang', cooldown: 45, minHold: 0.08, stages: [0.35, 0.9, 1.6] as readonly number[], maxHold: 2.3, range: 300, rangeTier: 40, aimCos: Math.cos(0.75), moveCharge: 0.55, contactR: 48, lunge: 0.22, recover: 0.34, missRush: 120, pierceCap: 6,
  tierMul: [0.55, 0.85, 1.15, 1.7] as readonly number[], hit: 2.6, pulseR: 118, pulseGrow: 22, pulseMul: 0.9, follow: 0.16, followR: 150, followMul: 0.6, jawAt: [0.1, 0.26] as readonly number[], jawR: 170, jawMul: 0.8, eruptR: 190, push: 150, cap: 14,
} as const;
/** Ashen Skybreaker: a faster lift and a harder landing rupture than the Crimson one, same finite Drive and no invulnerable flight. */
export const ASH_FLY = { speed: 1.45, rise: 8, drain: 6.5, slamR: 150, slamMul: 2.0, slamPush: 180 } as const;
export const ASH_FORM_INFO = {
  auto: { name: ASH_AUTO.name, text: 'Heavy four-beat brawl: body hook, low kick, cross-claw, crushing uppercut. Contacts leave Ash Brands; the uppercut detonates them. Nothing hits beyond arm\'s reach.' },
  q: { name: ASH_Q.name, text: 'A fast aimed rush of up to three strikes ending in a compact maul that detonates marks. With nothing ahead it is only a short lunge.' },
  e: { name: ASH_E.name, text: 'Nine tail shadows coil on the aimed ground, then Ren pounces and the ground ruptures. Marked foes inside erupt; bosses take damage but are never moved.' },
  r: { name: ASH_R.name, text: 'Crush an eclipse core, loose a huge spectral fox along a line, then a closing rupture. Each foe is struck once by each stage.' },
  v: { name: ASH_V.name, text: 'Hold V: pack ash and embers into a claw gauntlet. Release to lunge through foes; the top tier ends in a fox-jaw maul. A miss does nothing.' },
  od: { name: 'Eclipse Nine-Tailed Fox', text: 'Fight while transformed to fill the meter, press G to wrap Ren in the eclipse fox for 10 s: +25% damage, +8% speed, faster strikes.' },
} as const;
/** Ash Brand bit on event payloads: the Overdrive bit is 1 << 14 (REN_OD.bit); hits live at bit 8 and up, as in every other Ren move. */

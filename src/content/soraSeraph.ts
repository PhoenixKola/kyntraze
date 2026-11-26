/** B34 Sora: Eventide Seraph (form 2). Every number the form-II kit uses lives here; the sim (src/sim/SoraSeraph.ts) reads them, renderers follow the sera_* events. Prototype values reasoned from the Azure Sovereign curves, not tuned by human play. */
export const SERA = {
  /** Unlock: the Null Seraph defeated once with Sora after Azure Sovereign was earned. Persisted; usable from the NEXT run, never in the run that earns it. */
  unlockBoss: 'seraph' as const,
  charge: 100, cooldown: 24, drain: 3.8, speedMul: 1.1, autoMul: 1.32,
  cinemaFirst: { dur: 3.6, breakAt: 2.3, commitAt: 2.0 },
  cinemaRepeat: { dur: 1.1, breakAt: 0.52, commitAt: 0.62 },
  knockRadius: 210, knockPush: 100, stagger: 0.8,
} as const;
/** Form Shift between Azure Sovereign and Eventide Seraph: the same price as Vex's (18 Drive, 20 minimum, 2.5 s). */
export const SERA_SHIFT = { cost: 18, minDrive: 20, cooldown: 2.5 } as const;
/** Star Trace: direct Prism Feather hits leave at most one trace per foe (8 foes at once, 5 s, refreshed by a new hit). A constellation technique consumes the traces it reaches once, for one bounded precision hit. Decorative effects never add traces and consuming never adds more. */
export const TRACE = { cap: 8, life: 5, bonusMul: 0.9, consumeCap: 8 } as const;
export const SERA_AUTO = {
  name: 'Prism Feathers', period: 0.85, range: 380, speed: 800, radius: 8, ttl: 0.62, shoulder: 22, extraCap: 2,
  /** orbit-and-release: left feather, right feather, a crossing pair, then the focused lance (piercing, larger) */
  beats: [{ kind: 'left', n: 1, mul: 0.9, pierce: 0 }, { kind: 'right', n: 1, mul: 0.9, pierce: 0 }, { kind: 'cross', n: 2, mul: 1.4, pierce: 0 }, { kind: 'lance', n: 1, mul: 2.3, pierce: 2 }] as readonly { kind: 'left' | 'right' | 'cross' | 'lance'; n: number; mul: number; pierce: number }[],
  crossAngle: 0.16, lanceRadius: 13, lanceSpeed: 940,
} as const;
export const SERA_Q = { name: 'Constellation Pierce', cooldown: 6, range: 380, lanes: 5, spread: 0.2, halfWidth: 22, windup: 0.14, lead: 0.1, gap: 0.06, recover: 0.16, mul: 1.5, followMul: 1.2, stagger: 0.2, cap: 10, assist: 0.7, moveWindup: 0.45, minLane: 40 } as const;
export const SERA_E = { name: "Seraph's Descent", cooldown: 10, range: 360, nodes: 4, nodesMax: 6, first: 120, spacing: 76, lead: 0.55, gap: 0.15, radius: 58, mul: 2.0, windup: 0.3, recover: 0.12, cap: 8, convR: 70, convMul: 0.9, convCap: 8, push: 8, moveWindup: 0.35 } as const;
export const SERA_R = { name: 'Eventide Judgment', cooldown: 24, range: 400, defaultRange: 260, windup: 0.5, recover: 0.1, stars: 7, ringR: 140, igniteFrom: 0.35, igniteGap: 0.11, holdR: 150, capture: 16, sweepAt: 1.55, sweepR: 170, sweepMul: 5.5, sweepStagger: 0.3, novaAt: 2.0, novaR: 215, novaMul: 7.5, push: 130, stagger: 0.6, endAt: 2.5, cap: 16, moveScale: 0.5 } as const;
export const SERA_V = {
  name: 'Astral Rebirth', cooldown: 45, minHold: 0.08, stages: [0.35, 0.9, 1.6] as readonly number[], maxHold: 2.3, moveCharge: 0.5, recover: 0.3,
  speed: 560, speedTier: 50, range: 520, rangeTier: 60, radius: 16, radiusTier: 4, tierMul: [0.6, 0.9, 1.25, 1.8] as readonly number[], hit: 2.4, burstR: 115, burstGrow: 22, burstMul: 1.2, ringR: 190, ringMul: 0.9, phoenixAt: 0.3, phoenixR: 165, phoenixMul: 1.0, afterAt: 0.62, afterR: 215, afterMul: 0.7, push: 150, cap: 14, traceR: 120,
} as const;
/** Celestial Glide: a faster, lighter lift than Azure Sovereign's, a wider landing flare, the same finite Drive and no invulnerable flight. */
export const SERA_FLY = { holdToLift: 0.28, maxT: 5, minDrive: 12, cooldown: 3.5, slamMinT: 0.5, speed: 1.5, rise: 7.5, drain: 5.8, slamR: 135, slamMul: 1.6, slamPush: 130 } as const;
export const SERA_FORM_INFO = {
  auto: { name: SERA_AUTO.name, text: 'Four beats of pearl feathers from his shoulders: left, right, a crossing pair, then a piercing lance. Direct hits leave a Star Trace.' },
  q: { name: SERA_Q.name, text: 'Five star-lances fan out along the aim (snapping to the nearest foe in front) and stop at walls. A lance that strikes a traced foe consumes the trace for a precision follow-up.' },
  e: { name: SERA_E.name, text: 'Four celestial nodes mark the aimed lane, then feather-lances fall on them in sequence. A final convergence consumes traces for a burst.' },
  r: { name: SERA_R.name, text: 'Seven stars ignite into a constellation, a Phoenix sweeps down, then a prismatic nova closes it. Ordinary foes are slowed; bosses are never moved.' },
  v: { name: SERA_V.name, text: 'Hold V: gather a winged star between both hands. Release along the aim; the top tier unfolds a Phoenix burst with an aftershock.' },
  od: { name: 'Eventide Phoenix', text: 'Fight while transformed to fill the meter, press G to wrap Sora in the Eventide Phoenix for 10 s: +25% damage, +8% speed, faster feathers.' },
} as const;

/** B27 Sora: Azure Sovereign combat identity. Every number the form-only kit uses lives here; the sim (src/sim/SoraCombat.ts) reads them, renderers follow the events. Prototype values, tuned only against play. */
export const SORA_AUTO = {
  name: 'Astral Blades', period: 0.8, range: 360, speed: 760, radius: 9, ttl: 0.62, shoulder: 20, extraCap: 2, pierceForm: 1,
  /** four beats: left blade, right blade, crossing pair (damage split), fan of three small blades */
  beats: [{ kind: 'left', n: 1, mul: 0.95 }, { kind: 'right', n: 1, mul: 0.95 }, { kind: 'cross', n: 2, mul: 1.5 }, { kind: 'fan', n: 3, mul: 1.65 }] as readonly { kind: 'left' | 'right' | 'cross' | 'fan'; n: number; mul: number }[],
  fanSpread: 0.3,
} as const;
export const SORA_Q = { name: 'Azure Prison', cooldown: 8, range: 320, defaultRange: 210, radius: 128, windup: 0.3, recover: 0.1, form: 0.35, hold: 1.0, ticks: 2, tickMul: 0.35, shatterMul: 3.4, slow: 0.14, edge: 0.9, cap: 12, moveWindup: 0.45, bossFair: 0.6 } as const;
export const SORA_E = { name: "Heaven's Spear", cooldown: 10, range: 380, laneRange: 560, coneCos: Math.cos(0.7), spears: 3, spearsMax: 6, lead: 0.42, gap: 0.14, radius: 64, mul: 2.3, windup: 0.3, recover: 0.12, spacing: 78, repeatMul: 0.4, cap: 10, moveWindup: 0.35, laneWidthMul: 0.8 } as const;
export const SORA_R = { name: 'Celestial Collapse', cooldown: 22, range: 380, defaultRange: 250, windup: 0.35, recover: 0.1, pull: 1.25, pullR: 185, pullSpeed: 150, burstR: 200, tickEvery: 0.25, tickMul: 0.18, burstMul: 6.5, push: 140, stagger: 0.5, cap: 16, echoGap: 0.45, echoMul: 0.55, focusR: 0.78, focusMul: 1.7, moveScale: 0.5 } as const;
export const SORA_V = {
  name: 'Astral Devastation', cooldown: 45, minHold: 0.08, stages: [0.35, 0.9, 1.6] as readonly number[], maxHold: 2.3, moveCharge: 0.5, recover: 0.3,
  speed: 540, speedTier: 50, range: 520, rangeTier: 60, radius: 16, radiusTier: 4, tierMul: [0.6, 0.9, 1.2, 1.7] as readonly number[], hit: 2.4, burstR: 110, burstGrow: 22, burstMul: 1.2, ringR: 190, ringMul: 0.9, afterAt: 0.38, afterR: 150, afterMul: 0.8, fizzleR: 46, push: 150, cap: 14,
} as const;
export const SORA_OD = { duration: 10, perHit: 3, perKill: 6, dmgMul: 1.25, speedMul: 1.08, periodMul: 0.88, window: 0.25, windowHits: 6, bit: 1 << 14 } as const;
/** Skybreaker: lighter and faster than Kai's or Ren's, with a compact shard ring on landing. */
export const SORA_FLY = { holdToLift: 0.28, maxT: 5, minDrive: 12, cooldown: 3.5, slamMinT: 0.5, speed: 1.45, rise: 7, drain: 5.5, slamR: 105, slamMul: 1.2, slamPush: 120 } as const;
/** Display for the HUD (single source for names, key labels and one-line text). */
export const SORA_FORM_INFO = {
  auto: { name: SORA_AUTO.name, text: 'Four floating blades from his shoulders fly at the nearest foe: left, right, a crossing pair, then a fan of three.' },
  q: { name: SORA_Q.name, text: 'Raise a crystal prison on an aimed point: ordinary enemies inside are slowed and held, bosses keep moving and take fair damage. It shatters after a second.' },
  e: { name: SORA_E.name, text: 'Mark ground and call three giant spears down in sequence. Each lands on its marked spot, so lead moving targets.' },
  r: { name: SORA_R.name, text: 'A blue singularity draws ordinary enemies in for a moment, then bursts. Bosses are never pulled.' },
  v: { name: SORA_V.name, text: 'Hold V: gather a sphere between both hands. Release to launch it; it detonates on the first enemy it meets. Longer charge, bigger blast.' },
  od: { name: 'Astral Phoenix', text: 'Fight while transformed to fill the meter, press G to wrap Sora in the phoenix for 10 s: +25% damage, +8% speed, faster blades.' },
} as const;

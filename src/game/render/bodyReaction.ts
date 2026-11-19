/** B21.4: how an enemy BODY answers a real hit. Pure and deterministic: kind decides weight/delay, the real damage fraction decides strength. Presentation only; the sprite is offset, never the simulated position. */
export type ReactKind = 'pursuer' | 'flanker' | 'bruiser' | 'ranged' | 'aegis' | 'cantor';
export interface Reaction { push: number; tilt: number; squash: number; delay: number; dur: number; }

const WEIGHT: Record<ReactKind, { push: number; tilt: number; squash: number; delay: number; dur: number; light: number }> = {
  pursuer: { push: 9, tilt: 0.16, squash: 0.1, delay: 0, dur: 0.2, light: 0.7 },        // head/chest recoil, stumbles on big hits
  flanker: { push: 12, tilt: 0.3, squash: 0.06, delay: 0, dur: 0.16, light: 0.8 },       // thrown sideways, loses balance
  bruiser: { push: 3.5, tilt: 0.05, squash: 0.04, delay: 0.06, dur: 0.3, light: 0.15 },  // heavy delayed recoil, a light tap barely moves it
  ranged: { push: 7, tilt: 0.1, squash: 0.12, delay: 0, dur: 0.24, light: 0.6 },         // destabilised hover
  aegis: { push: 3, tilt: 0.04, squash: 0.03, delay: 0.04, dur: 0.28, light: 0.1 },
  cantor: { push: 6, tilt: 0.1, squash: 0.1, delay: 0, dur: 0.22, light: 0.6 },
};

/** dmgFrac = damage / maxHp of that hit (0..1). heavy = the sim's own heavy flag or a big fraction. blocked = a shield absorbed it (no wound reaction, only a shield jolt). */
export function reactionFor(kind: ReactKind, dmgFrac: number, o: { heavy?: boolean; blocked?: boolean; broke?: boolean } = {}): Reaction {
  const w = WEIGHT[kind];
  if (o.blocked) return { push: w.push * 0.25, tilt: 0, squash: 0.02, delay: 0, dur: 0.12 };
  const strength = Math.min(2, Math.max(0.2, dmgFrac * 10)) * (o.heavy ? 1.5 : 1) * (o.broke ? 1.8 : 1);
  const s = strength < 0.5 ? w.light * strength * 2 : strength;
  return { push: w.push * s, tilt: w.tilt * s, squash: w.squash * Math.min(1.5, s), delay: w.delay, dur: w.dur * (o.broke ? 1.6 : 1) };
}

/** Eased pose of a reaction `t` seconds after the hit: [offset 0..1 along the away vector, tilt scale, squash scale]. Spike, then settle. */
export function reactionPose(r: Reaction, t: number): { off: number; tilt: number; sq: number } {
  const u = (t - r.delay) / r.dur;
  if (u <= 0 || u >= 1) return { off: 0, tilt: 0, sq: 0 };
  const hit = u < 0.25 ? u / 0.25 : 1 - (u - 0.25) / 0.75, e = hit * hit * (3 - 2 * hit);
  return { off: r.push * e, tilt: r.tilt * e, sq: r.squash * e };
}

/** Damage level of a boss body from its real HP fraction and phase: 0 intact, 1 hairline cracks, 2 broken plates, 3 phase-2 broken silhouette. */
export function bossDamageLevel(hpFrac: number, phase: 1 | 2): 0 | 1 | 2 | 3 {
  if (phase === 2) return hpFrac < 0.4 ? 3 : 2;
  return hpFrac < 0.4 ? 2 : hpFrac < 0.75 ? 1 : 0;
}

/** B23: how an enemy body ACTS through its own attack (presentation only, the sim timings are untouched): anticipation crouch while the tell runs, a forward stretch on the strike, a slump that recovers. `prog` = tell progress 0..1, `rec` = recover time left 1..0. Archetype decides how much: bruisers load slowly and slam short, flankers coil and dart, casters lift. */
export interface AttackPose { sx: number; sy: number; fwd: number }
const ACT: Record<string, { crouch: number; stretch: number; fwd: number; slump: number }> = {
  pursuer: { crouch: 0.07, stretch: 0.1, fwd: 5, slump: 0.05 }, flanker: { crouch: 0.12, stretch: 0.16, fwd: 11, slump: 0.07 }, bruiser: { crouch: 0.1, stretch: 0.07, fwd: 3, slump: 0.1 },
  ranged: { crouch: 0.03, stretch: 0.08, fwd: 2, slump: 0.04 }, aegis: { crouch: 0.05, stretch: 0.05, fwd: 4, slump: 0.05 }, cantor: { crouch: 0.03, stretch: 0.07, fwd: 1, slump: 0.04 },
};
export function attackPose(kind: string, mode: string, prog: number, rec: number): AttackPose {
  const a = ACT[kind] ?? ACT.pursuer;
  if (mode === 'windup') { const e = prog * prog * (3 - 2 * Math.min(1, prog)); return { sx: 1 + a.crouch * 0.6 * e, sy: 1 - a.crouch * e, fwd: -a.fwd * 0.25 * e }; }
  if (mode === 'strike') return { sx: 1 + a.stretch, sy: 1 - a.stretch * 0.7, fwd: a.fwd };
  if (mode === 'recover') { const e = Math.max(0, Math.min(1, rec)); return { sx: 1 + a.slump * 0.4 * e, sy: 1 - a.slump * e, fwd: a.fwd * 0.3 * e }; }
  return { sx: 1, sy: 1, fwd: 0 };
}

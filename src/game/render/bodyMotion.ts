/** B21.1: runtime body motion for the eight hero states. Critically-damped springs turn the real velocity, dash, cast and hurt state into a small lean / squash / hover offset applied around the feet (the sprite origin), so starts, stops, turns, landings and hits carry weight in every facing without touching the authored sheets. Presentation only. */
export type MotionStyle = 'kai' | 'flare' | 'comet' | 'still' | 'ren' | 'ren_asc' | 'sora' | 'sora_sov' | 'vex' | 'vex_rift' | 'vex_void';
export interface Signature { lean: number; leanSpring: number; squash: number; bob: number; bobHz: number; hover: number; breathe: number; stopKick: number }

/** Each state's character: Kai grounded, Flarebound springy, Cometheart explosive forward lean, Stillfire a floating glide; Ren planted and heavy, Ascendant a coiled spring; Sora light, Sovereign a smooth glide. */
export const SIGNATURE: Record<MotionStyle, Signature> = {
  kai:      { lean: 0.035, leanSpring: 16, squash: 1.0,  bob: 0.8, bobHz: 8.5, hover: 0,   breathe: 0.012, stopKick: 0.5 },
  flare:    { lean: 0.055, leanSpring: 20, squash: 1.2,  bob: 1.2, bobHz: 10,  hover: 0,   breathe: 0.014, stopKick: 0.7 },
  comet:    { lean: 0.085, leanSpring: 26, squash: 1.5,  bob: 0.6, bobHz: 11,  hover: 0,   breathe: 0.01,  stopKick: 1.1 },
  still:    { lean: 0.02,  leanSpring: 7,  squash: 0.35, bob: 0,   bobHz: 0,   hover: 0,   breathe: 0.006, stopKick: 0.15 },
  ren:      { lean: 0.04,  leanSpring: 12, squash: 1.1,  bob: 1.4, bobHz: 7,   hover: 0,   breathe: 0.016, stopKick: 0.8 },
  ren_asc:  { lean: 0.075, leanSpring: 22, squash: 1.5,  bob: 1.0, bobHz: 9,   hover: 0,   breathe: 0.012, stopKick: 1.2 },
  sora:     { lean: 0.045, leanSpring: 18, squash: 0.8,  bob: 0.7, bobHz: 9.5, hover: 0,   breathe: 0.01,  stopKick: 0.4 },
  vex:      { lean: 0.03,  leanSpring: 14, squash: 0.7,  bob: 0.6, bobHz: 8,   hover: 0,   breathe: 0.01,  stopKick: 0.6 },
  vex_rift: { lean: 0.05,  leanSpring: 20, squash: 0.9,  bob: 0.5, bobHz: 9,   hover: 0,   breathe: 0.009, stopKick: 0.9 },
  vex_void: { lean: 0.022, leanSpring: 9,  squash: 0.45, bob: 0.2, bobHz: 6,   hover: 0,   breathe: 0.008, stopKick: 0.3 },
  sora_sov: { lean: 0.03,  leanSpring: 8,  squash: 0.4,  bob: 0,   bobHz: 0,   hover: 0,   breathe: 0.007, stopKick: 0.2 },
};
export const styleFor = (hero: 'kai' | 'ren' | 'sora' | 'vex', form: number): MotionStyle =>
  hero === 'vex' ? (form === 2 ? 'vex_void' : form === 1 ? 'vex_rift' : 'vex') : hero === 'kai' ? (form === 1 ? 'flare' : form === 2 ? 'comet' : form === 3 ? 'still' : 'kai') : hero === 'ren' ? (form ? 'ren_asc' : 'ren') : (form ? 'sora_sov' : 'sora');

export interface MotionIn { dt: number; style: MotionStyle; vx: number; vy: number; maxSpeed: number; dashing: boolean; dashDx: number; dashDy: number; casting: boolean; released: boolean; hurt: boolean; hurtDir: number; alive: boolean; frozen: boolean; reduced: boolean }
export interface MotionOut { rot: number; sx: number; sy: number; dy: number }

/** Spring toward `target`: x'' = k(target - x) - 2*sqrt(k)*x' (critically damped, stable for dt <= 0.1). */
function spring(x: number, v: number, target: number, k: number, dt: number): [number, number] {
  const n = Math.max(1, Math.ceil(dt / 0.016)), h = dt / n; for (let i = 0; i < n; i++) { v += (k * (target - x) - 2 * Math.sqrt(k) * v) * h; x += v * h; } return [x, v];
}

export class BodyMotion {
  private lean = 0; private leanV = 0; private sq = 0; private sqV = 0; private t = 0; private prevSpeed = 0; private wasDash = false; private wasRel = false; private hurtLean = 0; private hurtV = 0;
  update(i: MotionIn): MotionOut {
    if (i.frozen || !i.alive) { this.lean = this.leanV = this.sq = this.sqV = this.hurtLean = this.hurtV = 0; return { rot: 0, sx: 1, sy: 1, dy: 0 }; }
    const sig = SIGNATURE[i.style], dt = Math.min(0.1, Math.max(0, i.dt)), speed = Math.hypot(i.vx, i.vy), norm = Math.min(1, speed / Math.max(1, i.maxSpeed)), reduce = i.reduced ? 0.5 : 1;
    this.t += dt;
    // lean follows horizontal velocity (forward lean into the run); starts/stops kick the squash spring, so weight shows at the feet
    const targetLean = (i.vx / Math.max(1, i.maxSpeed)) * sig.lean * reduce * (i.casting && !i.released ? 0.3 : 1);
    [this.lean, this.leanV] = spring(this.lean, this.leanV, targetLean, sig.leanSpring, dt);
    const dSpeed = norm - this.prevSpeed; this.prevSpeed = norm;
    if (dt > 0) { if (dSpeed > 0.05) this.sqV += 0.9 * dSpeed * sig.squash * reduce * 8; else if (dSpeed < -0.05) this.sqV -= 0.6 * -dSpeed * sig.stopKick * reduce * 8; }
    if (i.dashing && !this.wasDash) this.sqV -= 2.2 * reduce; if (!i.dashing && this.wasDash) this.sqV += 2.6 * sig.squash * reduce;   // launch stretch, landing squash
    if (i.released && !this.wasRel) this.sqV += 1.6 * reduce;   // cast recoil
    this.wasDash = i.dashing; this.wasRel = i.released;
    [this.sq, this.sqV] = spring(this.sq, this.sqV, 0, 90, dt);
    if (i.hurt) this.hurtV += i.hurtDir * 0.9 * reduce; [this.hurtLean, this.hurtV] = spring(this.hurtLean, this.hurtV, 0, 60, dt);
    const sq = Math.max(-0.12, Math.min(0.12, this.sq * 0.05)), breathe = (1 - norm) * sig.breathe * Math.sin(this.t * 2.4);
    const bob = sig.bob && norm > 0.1 ? Math.abs(Math.sin(this.t * sig.bobHz)) * sig.bob * norm * reduce : 0;
    const hover = sig.hover ? -sig.hover - Math.sin(this.t * 2.1) * sig.hover * 0.4 * reduce : 0;
    const dashStretch = i.dashing ? 0.1 * reduce : 0;
    return { rot: this.lean + this.hurtLean * 0.25, sx: 1 - sq * 0.8 + dashStretch, sy: 1 + sq + breathe - dashStretch * 0.8, dy: -bob + hover };
  }
}

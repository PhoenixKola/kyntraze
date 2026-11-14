/** Kai base-form directional animation: manifest contract + pure animation state (no Phaser, unit-testable). */
export type Facing = 'south' | 'north' | 'east' | 'west';
export type KaiClip = 'Idle' | 'Run' | 'BasicPunch' | 'Dash' | 'Hurt' | 'Death';
export const KAI_DIRS: readonly Facing[] = ['south', 'north', 'east', 'west'];
export const KAI_CLIPS: readonly KaiClip[] = ['Idle', 'Run', 'BasicPunch', 'Dash', 'Hurt', 'Death'];
/** Sim dash length (MovementSystem): the Dash clip's travel frames are mapped onto it so the animation follows the real dash. */
export const SIM_DASH_SECONDS = 0.22;
export const KAI_REGISTRY_KEY = 'kai-manifests';

/** Art is ~160 px tall; 0.5 is an exact 2:1 nearest-neighbour reduction (~80 px hero on the 960x540 canvas, same size as the previous placeholder). */
export const KAI_SCALE = 0.5;
/** Manifest origin is the ground point between the soles; the sim position is the collision centre, which sits this many world px above the feet. */
export const KAI_GROUND_DY = 24;

export interface KaiClipInfo {
  sheet: string; frames: number; fps: number; loop: boolean; events: Record<string, number>;
  /** Clips added in B03G carry their own tight frame; Idle/Run/BasicPunch use the manifest-level frame. */
  frame_width?: number; frame_height?: number; origin_px?: [number, number]; terminal?: 'once' | 'hold_last_frame';
}
export interface KaiManifest {
  direction: Facing; frame_width: number; frame_height: number; origin_px: [number, number];
  root_motion: { baked: boolean }; animations: Record<KaiClip, KaiClipInfo>;
}
export type KaiManifests = Record<Facing, KaiManifest>;

/** Frame size and ground origin of one clip (per-clip override, else the direction's shared frame). */
export function clipFrame(m: KaiManifest, clip: KaiClip) {
  const a = m.animations[clip];
  return { w: a.frame_width ?? m.frame_width, h: a.frame_height ?? m.frame_height, ox: (a.origin_px ?? m.origin_px)[0], oy: (a.origin_px ?? m.origin_px)[1] };
}

export const kaiManifestUrl = (dir: Facing) => `/art/kai/${dir}/manifest.json`;
export const kaiSheetUrl = (dir: Facing, clip: KaiClipInfo) => `/art/kai/${dir}/${clip.sheet}`;
export const kaiTextureKey = (dir: Facing, clip: KaiClip) => `kai-${dir}-${clip}`;

const num = (v: unknown, what: string) => { if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw new Error(`Kai manifest: bad ${what}`); return v; };

export function parseKaiManifest(raw: unknown, dir: Facing): KaiManifest {
  const m = raw as Partial<KaiManifest> | null;
  if (!m || typeof m !== 'object') throw new Error(`Kai manifest ${dir}: not an object`);
  if (m.direction !== dir) throw new Error(`Kai manifest ${dir}: direction is ${String(m.direction)}`);
  num(m.frame_width, `${dir} frame_width`); num(m.frame_height, `${dir} frame_height`);
  if (!Array.isArray(m.origin_px) || m.origin_px.length !== 2) throw new Error(`Kai manifest ${dir}: origin_px`);
  num(m.origin_px[0], `${dir} origin x`); num(m.origin_px[1], `${dir} origin y`);
  if (!m.root_motion || m.root_motion.baked !== false) throw new Error(`Kai manifest ${dir}: root_motion.baked must be false`);
  for (const clip of KAI_CLIPS) {
    const a = m.animations?.[clip];
    if (!a || typeof a.sheet !== 'string') throw new Error(`Kai manifest ${dir}: missing ${clip}`);
    num(a.frames, `${dir} ${clip} frames`); num(a.fps, `${dir} ${clip} fps`);
    if (typeof a.loop !== 'boolean') throw new Error(`Kai manifest ${dir}: ${clip} loop`);
    if (a.frame_width !== undefined) { num(a.frame_width, `${dir} ${clip} frame_width`); num(a.frame_height, `${dir} ${clip} frame_height`); if (!Array.isArray(a.origin_px) || a.origin_px.length !== 2) throw new Error(`Kai manifest ${dir}: ${clip} origin_px`); }
    if (clip === 'Death' && (a.loop || a.terminal !== 'hold_last_frame')) throw new Error(`Kai manifest ${dir}: Death must hold its last frame`);
  }
  const punch = m.animations!.BasicPunch;
  if (typeof punch.events?.impact !== 'number' || punch.events.impact < 0 || punch.events.impact >= punch.frames) throw new Error(`Kai manifest ${dir}: BasicPunch impact event`);
  return m as KaiManifest;
}

/** Keyboard facing. A diagonal keeps the current facing if it is one of the two pressed directions, otherwise prefers horizontal: deterministic, no flicker. */
export function facingFromInput(prev: Facing, x: number, y: number): Facing {
  if (!x && !y) return prev;
  const h: Facing | null = x > 0 ? 'east' : x < 0 ? 'west' : null;
  const v: Facing | null = y > 0 ? 'south' : y < 0 ? 'north' : null;
  if (h && v) return prev === h || prev === v ? prev : h;
  return (h ?? v) as Facing;
}

/** Facing toward an offset (attack target), with hysteresis so a target near a diagonal does not flip every frame. */
export function facingFromVector(prev: Facing, dx: number, dy: number): Facing {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const h: Facing = dx >= 0 ? 'east' : 'west', v: Facing = dy >= 0 ? 'south' : 'north';
  const prevHorizontal = prev === 'east' || prev === 'west';
  if (prevHorizontal) return ax >= ay * 0.75 ? h : v;
  return ay >= ax * 0.75 ? v : h;
}

export interface AnimFrameInput {
  /** Seconds of simulated time to advance; 0 while paused / choosing an upgrade / dead. */
  dt: number; alive: boolean;
  moving: boolean; inputX: number; inputY: number; runSpeed: number;
  dashing: boolean; dashX: number; dashY: number;
  /** Sim dash seconds left (drives the Dash clip's progress) and a one-frame flag set when the sim actually removed player HP. */
  dashRemaining?: number; hurt?: boolean;
  /** Seconds until the sim's automatic weapon fires, and whether an enemy is in range right now. */
  attackClock: number; hasTarget: boolean; targetDx: number; targetDy: number;
  /** Set on the render frame where the sim fired a fresh basic attack (offset to its first target). */
  shot: { dx: number; dy: number } | null;
}
/** `legs` is the Run frame to draw for the lower body while the punch plays during movement (null = the whole body is the clip frame). */
export interface AnimPose { facing: Facing; clip: KaiClip; frame: number; legs: number | null; }
/** Frame split between upper body (punch) and legs (run): this many frame-px above the ground origin, just under the belt. */
export const KAI_SPLIT_ABOVE_FEET = 64;
/** Minimum seconds between facing changes, so target switches and diagonal jitter cannot flip the sprite every frame. */
const FACING_DWELL = 0.12;

const MAX_PUNCH_RATE = 2.5;

const DASH_RECOVERY_SECONDS = 0.12;

export class KaiAnimator {
  facing: Facing = 'south';
  clip: KaiClip = 'Idle';
  private time = 0;
  private punchTime = -1;
  private punchRate = 1;
  private runTime = 0;
  private sinceTurn = 1;
  private movingNow = false;
  private hurtTime = -1;
  private deathTime = -1;
  private dashRec = -1;
  private dashProg = 0;
  private dashWas = false;

  constructor(private readonly manifests: KaiManifests) {}

  get punching() { return this.punchTime >= 0; }
  get dead() { return this.deathTime >= 0; }

  private turn(next: Facing, force = false) { if (next !== this.facing && (force || this.sinceTurn >= FACING_DWELL)) { this.facing = next; this.sinceTurn = 0; } }

  private info(clip: KaiClip) { return this.manifests[this.facing].animations[clip]; }

  /** Playback rate and lead time so that the impact frame lands on the sim's weapon tick even when attack speed outruns the 0.875 s clip. */
  private punchPlan(period: number) {
    const p = this.info('BasicPunch'); const duration = p.frames / p.fps;
    const rate = Math.min(MAX_PUNCH_RATE, Math.max(1, duration / (period * 0.92)));
    return { rate, impactT: (p.events.impact ?? 0) / p.fps, duration };
  }

  private startPunch(t: number, rate: number) { this.punchTime = t; this.punchRate = rate; if (this.clip !== 'BasicPunch') { this.clip = 'BasicPunch'; } }

  /** Priority: Death > Hurt > Dash (incl. recovery) > BasicPunch > Run > Idle. Hurt and Dash never start a punch; the sim still fires its weapon. */
  update(i: AnimFrameInput, attackPeriod: number): AnimPose {
    const plan = this.punchPlan(attackPeriod);
    if (!i.alive) {
      if (this.deathTime < 0) { this.punchTime = -1; this.hurtTime = -1; this.dashRec = -1; this.dashWas = false; this.deathTime = 0; this.clip = 'Death'; }
      else this.deathTime += i.dt;
      this.movingNow = false; return this.pose();
    }
    if (this.deathTime >= 0) { this.deathTime = -1; this.clip = 'Idle'; this.time = 0; }
    this.sinceTurn += i.dt;
    this.movingNow = i.moving || i.dashing;

    if (i.hurt) { this.punchTime = -1; this.dashRec = -1; this.hurtTime = 0; }
    if (i.dashing) {
      if (!this.dashWas) { this.punchTime = -1; this.hurtTime = -1; this.turn(facingFromInput(this.facing, i.dashX, i.dashY), true); }
      else this.turn(facingFromInput(this.facing, i.dashX, i.dashY));
      this.dashRec = -1; this.dashProg = Math.min(1, Math.max(0, 1 - (i.dashRemaining ?? SIM_DASH_SECONDS / 2) / SIM_DASH_SECONDS));
    } else if (this.dashWas) this.dashRec = 0;
    this.dashWas = i.dashing;
    if (this.dashRec >= 0 && !i.dashing) { this.dashRec += i.dt; if (this.dashRec >= DASH_RECOVERY_SECONDS || (i.moving && this.dashRec >= 0.05)) this.dashRec = -1; }
    if (this.hurtTime >= 0) {
      const h = this.info('Hurt'); this.hurtTime += i.dt;
      if (this.hurtTime >= h.frames / h.fps || (this.movingNow && this.hurtTime >= (h.events.interruptible_from ?? h.frames) / h.fps)) this.hurtTime = -1;
    }
    const busy = this.hurtTime >= 0 || i.dashing || this.dashRec >= 0;

    if (!busy) {
      if (i.shot) {
        // the sim just fired: keep an aligned predicted punch, otherwise (target appeared this instant / extreme fire rate) snap in near the impact frame
        const aligned = this.punching && Math.abs(this.punchTime - plan.impactT) <= 0.2;
        if (!aligned) { this.startPunch(Math.max(0, plan.impactT - 3 / this.info('BasicPunch').fps), plan.rate); this.turn(facingFromVector(this.facing, i.shot.dx, i.shot.dy), true); }
      } else if (!this.punching && i.hasTarget && i.attackClock <= plan.impactT / plan.rate) {
        this.startPunch(plan.impactT - Math.max(0, i.attackClock) * plan.rate, plan.rate);
        this.turn(facingFromVector(this.facing, i.targetDx, i.targetDy), true);
      }
      if (this.punching) {
        this.punchTime += i.dt * this.punchRate;
        if (this.punchTime >= plan.duration) this.punchTime = -1;
      } else if (i.moving) this.turn(facingFromInput(this.facing, i.inputX, i.inputY));
    } else this.punchTime = -1;

    const want: KaiClip = this.hurtTime >= 0 ? 'Hurt' : (i.dashing || this.dashRec >= 0) ? 'Dash' : this.punching ? 'BasicPunch' : i.moving ? 'Run' : 'Idle';
    if (want !== this.clip) { this.clip = want; this.time = 0; }
    const runStep = i.dt * Math.min(18, Math.max(10, 14 * i.runSpeed / 250)) / 14;
    if (this.movingNow) this.runTime += runStep; else this.runTime = 0;
    if (want === 'Run') this.time += runStep;
    else if (want === 'Idle') this.time += i.dt;
    return this.pose();
  }

  pose(): AnimPose {
    const a = this.info(this.clip);
    let frame: number;
    if (this.clip === 'Dash') {
      const rec = a.events.recover_start ?? a.frames - 3;
      frame = this.dashRec >= 0 ? Math.min(a.frames - 1, rec + Math.floor(this.dashRec / DASH_RECOVERY_SECONDS * (a.frames - rec))) : Math.min(rec - 1, Math.floor(this.dashProg * rec));
    } else {
      const t = this.clip === 'BasicPunch' ? Math.max(0, this.punchTime) : this.clip === 'Hurt' ? Math.max(0, this.hurtTime) : this.clip === 'Death' ? Math.max(0, this.deathTime) : this.time;
      const raw = Math.floor(t * a.fps + 1e-6);
      frame = a.loop ? raw % a.frames : Math.min(a.frames - 1, raw);
    }
    const run = this.info('Run');
    const legs = this.clip === 'BasicPunch' && this.movingNow ? Math.floor(this.runTime * run.fps + 1e-6) % run.frames : null;
    return { facing: this.facing, clip: this.clip, frame, legs };
  }
}

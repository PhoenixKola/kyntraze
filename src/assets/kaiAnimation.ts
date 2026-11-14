/** Kai base-form directional animation: manifest contract + pure animation state (no Phaser, unit-testable). */
export type Facing = 'south' | 'north' | 'east' | 'west';
export type KaiBaseClip = 'Idle' | 'Run' | 'BasicPunch' | 'Dash' | 'Hurt' | 'Death';
/** Transform exists only in the Form I sheets. */
export type KaiClip = KaiBaseClip | 'Transform';
/** Which art set is shown: the approved base Kai, or the separately authored Form I sheets (never a tinted base). */
export type KaiForm = 'base' | 'f1';
export const KAI_DIRS: readonly Facing[] = ['south', 'north', 'east', 'west'];
export const KAI_CLIPS: readonly KaiBaseClip[] = ['Idle', 'Run', 'BasicPunch', 'Dash', 'Hurt', 'Death'];
export const KAI_F1_CLIPS: readonly KaiClip[] = [...KAI_CLIPS, 'Transform'];
/** Sim dash length (MovementSystem): the Dash clip's travel frames are mapped onto it so the animation follows the real dash. */
export const SIM_DASH_SECONDS = 0.22;
export const KAI_REGISTRY_KEY = 'kai-manifests';
export const KAI_F1_REGISTRY_KEY = 'kai-f1-manifests';

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
  root_motion: { baked: boolean }; animations: Record<KaiBaseClip, KaiClipInfo> & { Transform?: KaiClipInfo };
}
export type KaiManifests = Record<Facing, KaiManifest>;

/** Frame size and ground origin of one clip (per-clip override, else the direction's shared frame). */
export function clipFrame(m: KaiManifest, clip: KaiClip) {
  const a = m.animations[clip] as KaiClipInfo;
  return { w: a.frame_width ?? m.frame_width, h: a.frame_height ?? m.frame_height, ox: (a.origin_px ?? m.origin_px)[0], oy: (a.origin_px ?? m.origin_px)[1] };
}

const formRoot = (form: KaiForm) => (form === 'f1' ? '/art/kai-f1' : '/art/kai');
export const kaiManifestUrl = (dir: Facing, form: KaiForm = 'base') => `${formRoot(form)}/${dir}/manifest.json`;
export const kaiSheetUrl = (dir: Facing, clip: KaiClipInfo, form: KaiForm = 'base') => `${formRoot(form)}/${dir}/${clip.sheet}`;
export const kaiTextureKey = (dir: Facing, clip: KaiClip, form: KaiForm = 'base') => `${form === 'f1' ? 'kaif1' : 'kai'}-${dir}-${clip}`;

const num = (v: unknown, what: string) => { if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw new Error(`Kai manifest: bad ${what}`); return v; };

export function parseKaiManifest(raw: unknown, dir: Facing, form: KaiForm = 'base'): KaiManifest {
  const m = raw as Partial<KaiManifest> | null;
  if (!m || typeof m !== 'object') throw new Error(`Kai manifest ${dir}: not an object`);
  if (m.direction !== dir) throw new Error(`Kai manifest ${dir}: direction is ${String(m.direction)}`);
  num(m.frame_width, `${dir} frame_width`); num(m.frame_height, `${dir} frame_height`);
  if (!Array.isArray(m.origin_px) || m.origin_px.length !== 2) throw new Error(`Kai manifest ${dir}: origin_px`);
  num(m.origin_px[0], `${dir} origin x`); num(m.origin_px[1], `${dir} origin y`);
  if (!m.root_motion || m.root_motion.baked !== false) throw new Error(`Kai manifest ${dir}: root_motion.baked must be false`);
  for (const clip of form === 'f1' ? KAI_F1_CLIPS : KAI_CLIPS) {
    const a = (m.animations as Record<string, KaiClipInfo> | undefined)?.[clip];
    if (!a || typeof a.sheet !== 'string') throw new Error(`Kai manifest ${dir}: missing ${clip}`);
    num(a.frames, `${dir} ${clip} frames`); num(a.fps, `${dir} ${clip} fps`);
    if (typeof a.loop !== 'boolean') throw new Error(`Kai manifest ${dir}: ${clip} loop`);
    if (a.frame_width !== undefined) { num(a.frame_width, `${dir} ${clip} frame_width`); num(a.frame_height, `${dir} ${clip} frame_height`); if (!Array.isArray(a.origin_px) || a.origin_px.length !== 2) throw new Error(`Kai manifest ${dir}: ${clip} origin_px`); }
    if (clip === 'Death' && (a.loop || a.terminal !== 'hold_last_frame')) throw new Error(`Kai manifest ${dir}: Death must hold its last frame`);
  }
  if (form === 'f1' && typeof m.animations!.Transform?.events?.form_commit !== 'number') throw new Error(`Kai manifest ${dir}: Transform needs a form_commit event`);
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
  /** The sim's form flag (player.form); an edge 0 -> 1 starts the transformation, 1 -> 0 the power-down. */
  form?: 0 | 1;
  /** Seconds until the sim's automatic weapon fires, and whether an enemy is in range right now. */
  attackClock: number; hasTarget: boolean; targetDx: number; targetDy: number;
  /** Set on the render frame where the sim fired a fresh basic attack (offset to its first target). */
  shot: { dx: number; dy: number } | null;
}
/** `legs` is the Run frame to draw for the lower body while the punch plays during movement (null = the whole body is the clip frame). */
export interface AnimPose { facing: Facing; clip: KaiClip; frame: number; legs: number | null; /** which sheet set the frame belongs to */ form: KaiForm; /** events raised by the update that produced this pose */ events: readonly KaiAnimEvent[]; }
/** Frame split between upper body (punch) and legs (run): this many frame-px above the ground origin, just under the belt. */
export const KAI_SPLIT_ABOVE_FEET = 64;
/** Minimum seconds between facing changes, so target switches and diagonal jitter cannot flip the sprite every frame. */
const FACING_DWELL = 0.12;

const MAX_PUNCH_RATE = 2.5;

const DASH_RECOVERY_SECONDS = 0.12;
/** After the Death clip has played through, hold its final frame this long before Results may appear. */
export const DEATH_RESULTS_HOLD_SECONDS = 0.35;
/** Powering down: the Transform clip's pre-commit (base hair) frames play backwards over this long. */
export const FORM_REVERT_SECONDS = 0.25;

/** Animation events raised on the update where they happen (render-side hooks for FX and, later, audio). */
export type KaiAnimEvent = 'form_start' | 'form_commit' | 'form_end';

export class KaiAnimator {
  facing: Facing = 'south';
  clip: KaiClip = 'Idle';
  /** Which art set is visible (separate Form I sheets, never a tint): switches at the Transform clip's form_commit frame, immediately on interruption, back on expiry. */
  visualForm: KaiForm = 'base';
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
  private transformTime = -1;
  private revertTime = -1;
  private simFormPrev = 0;
  private events: KaiAnimEvent[] = [];

  /** `f1` = the Form I manifests; without them the form input is ignored (base-only play). */
  constructor(private readonly manifests: KaiManifests, private readonly f1?: KaiManifests) {}

  get punching() { return this.punchTime >= 0; }
  get dead() { return this.deathTime >= 0; }
  get transforming() { return this.transformTime >= 0; }
  /** True once the Death clip has played through and held its last frame for DEATH_RESULTS_HOLD_SECONDS. Never true while alive. */
  deathPresented(): boolean { if (this.deathTime < 0) return false; const d = this.info('Death'); return this.deathTime >= d.frames / d.fps + DEATH_RESULTS_HOLD_SECONDS; }

  private turn(next: Facing, force = false) { if (next !== this.facing && (force || this.sinceTurn >= FACING_DWELL)) { this.facing = next; this.sinceTurn = 0; } }

  private set(form: KaiForm) { return form === 'f1' && this.f1 ? this.f1 : this.manifests; }
  private info(clip: KaiClip, form: KaiForm = this.formOf(clip)): KaiClipInfo { return this.set(form)[this.facing].animations[clip] as KaiClipInfo; }
  /** Transform and its reverse live in the Form I sheets; everything else uses the visible art set. */
  private formOf(clip: KaiClip): KaiForm { return clip === 'Transform' ? 'f1' : this.visualForm; }

  /** Playback rate and lead time so that the impact frame lands on the sim's weapon tick even when attack speed outruns the 0.875 s clip. */
  private punchPlan(period: number) {
    const p = this.info('BasicPunch'); const duration = p.frames / p.fps;
    const rate = Math.min(MAX_PUNCH_RATE, Math.max(1, duration / (period * 0.92)));
    return { rate, impactT: (p.events.impact ?? 0) / p.fps, duration };
  }

  private startPunch(t: number, rate: number) { this.punchTime = t; this.punchRate = rate; if (this.clip !== 'BasicPunch') { this.clip = 'BasicPunch'; } }

  /** Pull the form change forward (hurt/dash/death interrupt the cinematic): the sim already committed, so the art must not stay behind. */
  private commitNow(simForm: number) {
    if (this.transformTime >= 0) { this.transformTime = -1; if (simForm && this.visualForm !== 'f1') { this.visualForm = 'f1'; this.events.push('form_commit'); } }
  }

  /** Priority: Death > Hurt > Dash (incl. recovery) > Transform > Power-down > BasicPunch > Run > Idle. Hurt and Dash never start a punch; the sim still fires its weapon. */
  update(i: AnimFrameInput, attackPeriod: number): AnimPose {
    this.events = [];
    const simForm = this.f1 ? (i.form ?? 0) : 0;
    if (!i.alive) {
      if (this.deathTime < 0) { this.commitNow(simForm); this.punchTime = -1; this.hurtTime = -1; this.dashRec = -1; this.dashWas = false; this.revertTime = -1; if (simForm) this.visualForm = 'f1'; this.deathTime = 0; this.clip = 'Death'; }
      else this.deathTime += i.dt;
      this.simFormPrev = simForm; this.movingNow = false; return this.pose();
    }
    if (this.deathTime >= 0) { this.deathTime = -1; this.clip = 'Idle'; this.time = 0; this.visualForm = 'base'; this.transformTime = -1; this.revertTime = -1; this.simFormPrev = 0; }   // a new run reuses the animator
    this.sinceTurn += i.dt;
    this.movingNow = i.moving || i.dashing;

    if (simForm === 1 && this.simFormPrev === 0) { this.punchTime = -1; this.hurtTime = -1; this.dashRec = -1; this.revertTime = -1; this.transformTime = 0; this.visualForm = 'base'; this.events.push('form_start'); }
    else if (simForm === 0 && this.simFormPrev === 1) { this.transformTime = -1; this.punchTime = -1; this.visualForm = 'base'; this.revertTime = 0; this.events.push('form_end'); }
    this.simFormPrev = simForm;

    if (i.hurt) { this.commitNow(simForm); this.punchTime = -1; this.dashRec = -1; this.revertTime = -1; this.hurtTime = 0; }
    if (i.dashing) {
      if (!this.dashWas) { this.commitNow(simForm); this.punchTime = -1; this.hurtTime = -1; this.revertTime = -1; this.turn(facingFromInput(this.facing, i.dashX, i.dashY), true); }
      else this.turn(facingFromInput(this.facing, i.dashX, i.dashY));
      this.dashRec = -1; this.dashProg = Math.min(1, Math.max(0, 1 - (i.dashRemaining ?? SIM_DASH_SECONDS / 2) / SIM_DASH_SECONDS));
    } else if (this.dashWas) this.dashRec = 0;
    this.dashWas = i.dashing;
    if (this.dashRec >= 0 && !i.dashing) { this.dashRec += i.dt; if (this.dashRec >= DASH_RECOVERY_SECONDS || (i.moving && this.dashRec >= 0.05)) this.dashRec = -1; }
    if (this.hurtTime >= 0) {
      const h = this.info('Hurt'); this.hurtTime += i.dt;
      if (this.hurtTime >= h.frames / h.fps || (this.movingNow && this.hurtTime >= (h.events.interruptible_from ?? h.frames) / h.fps)) this.hurtTime = -1;
    }
    if (this.transformTime >= 0 && this.hurtTime < 0 && !i.dashing) {
      const t = this.info('Transform', 'f1'); this.transformTime += i.dt;
      if (this.visualForm !== 'f1' && this.transformTime >= (t.events.form_commit ?? 0) / t.fps - 1e-6) { this.visualForm = 'f1'; this.events.push('form_commit'); }
      if (this.transformTime >= t.frames / t.fps - 1e-6 || (this.movingNow && this.transformTime >= (t.events.interruptible_from ?? t.frames) / t.fps)) this.transformTime = -1;
    }
    if (this.revertTime >= 0 && this.transformTime < 0) { this.revertTime += i.dt; if (this.revertTime >= FORM_REVERT_SECONDS || (this.movingNow && this.revertTime >= 0.1)) this.revertTime = -1; }
    const busy = this.hurtTime >= 0 || i.dashing || this.dashRec >= 0 || this.transformTime >= 0 || this.revertTime >= 0;
    const plan = this.punchPlan(attackPeriod);

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

    const want: KaiClip = this.hurtTime >= 0 ? 'Hurt' : (i.dashing || this.dashRec >= 0) ? 'Dash' : (this.transformTime >= 0 || this.revertTime >= 0) ? 'Transform' : this.punching ? 'BasicPunch' : i.moving ? 'Run' : 'Idle';
    if (want !== this.clip) { this.clip = want; this.time = 0; }
    const runStep = i.dt * Math.min(18, Math.max(10, 14 * i.runSpeed / 250)) / 14;
    if (this.movingNow) this.runTime += runStep; else this.runTime = 0;
    if (want === 'Run') this.time += runStep;
    else if (want === 'Idle') this.time += i.dt;
    return this.pose();
  }

  /** Events raised by the most recent update(). */
  pose(): AnimPose {
    const form = this.formOf(this.clip);
    const a = this.info(this.clip, form);
    let frame: number;
    if (this.clip === 'Dash') {
      const rec = a.events.recover_start ?? a.frames - 3;
      frame = this.dashRec >= 0 ? Math.min(a.frames - 1, rec + Math.floor(this.dashRec / DASH_RECOVERY_SECONDS * (a.frames - rec))) : Math.min(rec - 1, Math.floor(this.dashProg * rec));
    } else if (this.clip === 'Transform') {
      const commit = a.events.form_commit ?? 5;
      frame = this.transformTime >= 0 ? Math.min(a.frames - 1, Math.floor(this.transformTime * a.fps + 1e-6)) : Math.max(0, commit - 1 - Math.floor(Math.min(0.999, this.revertTime / FORM_REVERT_SECONDS) * commit));
    } else {
      const t = this.clip === 'BasicPunch' ? Math.max(0, this.punchTime) : this.clip === 'Hurt' ? Math.max(0, this.hurtTime) : this.clip === 'Death' ? Math.max(0, this.deathTime) : this.time;
      const raw = Math.floor(t * a.fps + 1e-6);
      frame = a.loop ? raw % a.frames : Math.min(a.frames - 1, raw);
    }
    const run = this.info('Run');
    const legs = this.clip === 'BasicPunch' && this.movingNow ? Math.floor(this.runTime * run.fps + 1e-6) % run.frames : null;
    return { facing: this.facing, clip: this.clip, frame, legs, form, events: this.events };
  }
}

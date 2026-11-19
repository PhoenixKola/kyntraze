/** Kai base-form directional animation: manifest contract + pure animation state (no Phaser, unit-testable). */
import { skinRoot } from './skin';
import { BEAM, SPHERE } from '../content/abilities';
import { CANNON, DRAGON } from '../content/cometheart';
import { RIFT } from '../content/stillfire';
export type Facing = 'south' | 'north' | 'east' | 'west';
/** RunLower + RunPunchUpper are the two LAYERS of the moving attack (legs+hips of the Run cycle, and an upper body whose frames are `step * 8 + leg phase`); the runtime draws the lower one first. */
export type KaiBaseClip = 'Idle' | 'Run' | 'BasicPunch' | 'Dash' | 'Hurt' | 'Death' | 'Beam' | 'Sphere' | 'RunLower' | 'RunPunchUpper' | 'Lunge' | 'Uppercut' | 'Slam';
/** Transform exists only in the Form I sheets. */
export type KaiClip = KaiBaseClip | 'Transform' | 'IdleSpecial' | 'Guard' | 'Riposte';
/** B23: Vex's own clips (blade-ready counter stance, outward counter-cut). Optional per sheet set: a set without them plays the older mapping. */
export const VEX_CLIPS = ['Guard', 'Riposte'] as const;
/** Which art set is shown: the approved base Kai, or the separately authored Form I sheets (never a tinted base). */
export type KaiForm = 'base' | 'f1' | 'f2' | 'f3';
export const KAI_DIRS: readonly Facing[] = ['south', 'north', 'east', 'west'];
export const KAI_CLIPS: readonly KaiBaseClip[] = ['Idle', 'Run', 'BasicPunch', 'Dash', 'Hurt', 'Death', 'Beam', 'Sphere', 'RunLower', 'RunPunchUpper'];
/** B22 Kai-only clips (Surge Step / Meteor Drive Lunge, Rising Flare Uppercut, Sunfall Crucible Slam); Ren / Sora sheets do not have them. */
export const KAI_KIT_CLIPS = ['Lunge', 'Uppercut', 'Slam'] as const;
/** Leg phases per strike step in RunPunchUpper. */
export const RUN_PHASES = 8;
export const KAI_F1_CLIPS: readonly KaiClip[] = [...KAI_CLIPS, 'Transform'];
/** Sim dash length (MovementSystem): the Dash clip's travel frames are mapped onto it so the animation follows the real dash. */
export const SIM_DASH_SECONDS = 0.22;
export const KAI_REGISTRY_KEY = 'kai-manifests';
export const KAI_ANCHORS_KEY = 'kai-anchors';
export const KAI_ANCHORS_URL = '/art/kai-anchors.json';
/** Fist anchors of the Beam / Sphere clips, exported with the sprites (sprite px relative to the manifest ground origin, y down). n = near/screen-left fist, f = far, m = midpoint. */
export interface AnchorFrame { n: [number, number]; f: [number, number]; m: [number, number] }
export type AnchorClip = 'Beam' | 'Sphere' | 'BasicPunch';
export interface AnchorTable { forms: Record<KaiForm, Record<Facing, Record<AnchorClip, AnchorFrame[]>>> }
export interface WorldPt { x: number; y: number }
export interface HandAnchor { n: WorldPt; f: WorldPt; m: WorldPt }
/** World position of the two fists for a drawn frame. (heroX, heroY) is where the sprite's ground origin is placed in the world, `scale` the sprite scale. */
export function handAnchorWorld(t: AnchorTable, form: KaiForm, facing: Facing, clip: KaiClip, frame: number, heroX: number, heroY: number, scale: number): HandAnchor | null {
  if (clip !== 'Beam' && clip !== 'Sphere' && clip !== 'BasicPunch') return null;
  const fr = t.forms[form]?.[facing]?.[clip]?.[frame]; if (!fr) return null;
  const w = (p: [number, number]) => ({ x: heroX + p[0] * scale, y: heroY + p[1] * scale });
  return { n: w(fr.n), f: w(fr.f), m: w(fr.m) };
}
export const KAI_F1_REGISTRY_KEY = 'kai-f1-manifests';
export const KAI_F2_REGISTRY_KEY = 'kai-f2-manifests';
export const KAI_F3_REGISTRY_KEY = 'kai-f3-manifests';

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
  root_motion: { baked: boolean }; animations: Record<KaiBaseClip, KaiClipInfo> & { Transform?: KaiClipInfo; IdleSpecial?: KaiClipInfo; Guard?: KaiClipInfo; Riposte?: KaiClipInfo };
}
export type KaiManifests = Record<Facing, KaiManifest>;

/** Frame size and ground origin of one clip (per-clip override, else the direction's shared frame). */
export function clipFrame(m: KaiManifest, clip: KaiClip) {
  const a = m.animations[clip] as KaiClipInfo;
  return { w: a.frame_width ?? m.frame_width, h: a.frame_height ?? m.frame_height, ox: (a.origin_px ?? m.origin_px)[0], oy: (a.origin_px ?? m.origin_px)[1] };
}

const formRoot = (form: KaiForm) => skinRoot(form === 'f3' ? '/art/kai-f3' : form === 'f2' ? '/art/kai-f2' : form === 'f1' ? '/art/kai-f1' : '/art/kai');
export const kaiManifestUrl = (dir: Facing, form: KaiForm = 'base') => `${formRoot(form)}/${dir}/manifest.json`;
export const kaiSheetUrl = (dir: Facing, clip: KaiClipInfo, form: KaiForm = 'base') => `${formRoot(form)}/${dir}/${clip.sheet}`;
export const kaiTextureKey = (dir: Facing, clip: KaiClip, form: KaiForm = 'base') => `${form === 'f3' ? 'kaif3' : form === 'f2' ? 'kaif2' : form === 'f1' ? 'kaif1' : 'kai'}-${dir}-${clip}`;

const num = (v: unknown, what: string) => { if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw new Error(`Kai manifest: bad ${what}`); return v; };

export function parseKaiManifest(raw: unknown, dir: Facing, form: KaiForm = 'base'): KaiManifest {
  const m = raw as Partial<KaiManifest> | null;
  if (!m || typeof m !== 'object') throw new Error(`Kai manifest ${dir}: not an object`);
  if (m.direction !== dir) throw new Error(`Kai manifest ${dir}: direction is ${String(m.direction)}`);
  num(m.frame_width, `${dir} frame_width`); num(m.frame_height, `${dir} frame_height`);
  if (!Array.isArray(m.origin_px) || m.origin_px.length !== 2) throw new Error(`Kai manifest ${dir}: origin_px`);
  num(m.origin_px[0], `${dir} origin x`); num(m.origin_px[1], `${dir} origin y`);
  if (!m.root_motion || m.root_motion.baked !== false) throw new Error(`Kai manifest ${dir}: root_motion.baked must be false`);
  for (const clip of form !== 'base' ? KAI_F1_CLIPS : KAI_CLIPS) {
    const a = (m.animations as Record<string, KaiClipInfo> | undefined)?.[clip];
    if (!a || typeof a.sheet !== 'string') throw new Error(`Kai manifest ${dir}: missing ${clip}`);
    num(a.frames, `${dir} ${clip} frames`); num(a.fps, `${dir} ${clip} fps`);
    if (typeof a.loop !== 'boolean') throw new Error(`Kai manifest ${dir}: ${clip} loop`);
    if (a.frame_width !== undefined) { num(a.frame_width, `${dir} ${clip} frame_width`); num(a.frame_height, `${dir} ${clip} frame_height`); if (!Array.isArray(a.origin_px) || a.origin_px.length !== 2) throw new Error(`Kai manifest ${dir}: ${clip} origin_px`); }
    if (clip === 'Death' && (a.loop || a.terminal !== 'hold_last_frame')) throw new Error(`Kai manifest ${dir}: Death must hold its last frame`);
  }
  if (form !== 'base' && typeof m.animations!.Transform?.events?.form_commit !== 'number') throw new Error(`Kai manifest ${dir}: Transform needs a form_commit event`);
  for (const c of ['Beam', 'Sphere'] as const) { const r = m.animations![c].events?.release ?? (form === 'f3' && c === 'Sphere' ? m.animations![c].events?.strike_a : undefined); if (typeof r !== 'number' || r < 1 || r >= m.animations![c].frames - 1) throw new Error(`Kai manifest ${dir}: ${c} release event`); }
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
  form?: 0 | 1 | 2 | 3;
  /** B12 Form II reveal (sim.cinema): the whole body plays the Transform clip mapped onto this timeline. `to` = the form it ends in (B13: 3 = Stillfire Apex). */
  cinema?: { t: number; dur: number; commitAt: number; to?: 1 | 2 | 3 } | null;
  /** Seconds until the sim's automatic weapon fires, and whether an enemy is in range right now. */
  attackClock: number; hasTarget: boolean; targetDx: number; targetDy: number;
  /** Set on the render frame where the sim fired a fresh basic attack (offset to its first target). */
  shot: { dx: number; dy: number } | null;
  /** The sim's active signature ability (player.cast): its clock drives the Beam / Sphere clip so the release frame lands on the sim's release tick. */
  /** One-frame trigger: Surge Step started (plays the Lunge clip once). */
  lunge?: boolean;
  cast?: { id: number; kind: CastKind; face: Facing; t: number; dur?: number; dirX: number; dirY: number; released?: boolean; rt?: number } | null;
}
/** `legs` is the RunLower frame drawn under the hero sprite while the attack plays during movement (null = the whole body is the clip frame). */
export interface AnimPose { facing: Facing; clip: KaiClip; frame: number; legs: number | null; /** which sheet set the frame belongs to */ form: KaiForm; /** events raised by the update that produced this pose */ events: readonly KaiAnimEvent[]; }
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

/** Clip frame for a cast at sim time t: frames before the clip's `release` event are spread over the sim's wind-up, the rest over what is left, so the release frame lands on the release tick whatever the clip's fps. */
export type CastKind = 'beam' | 'sphere' | 'dragon' | 'comet' | 'rift' | 'reversal' | 'scatter' | 'meteor' | 'flare' | 'crucible';
/** The sheet clip each cast plays: Dragonfang Rush is a body-driven BasicPunch (its `impact` frame is the release), Cometbreaker the Beam clip. */
export const CAST_CLIP: Record<CastKind, 'Beam' | 'Sphere' | 'BasicPunch' | 'Lunge' | 'Uppercut' | 'Slam'> = { beam: 'Beam', sphere: 'Sphere', dragon: 'BasicPunch', comet: 'Beam', rift: 'Beam', reversal: 'Sphere', scatter: 'BasicPunch', meteor: 'Lunge', flare: 'Uppercut', crucible: 'Slam' };
/** Silver Rift: anticipation, a seamless looping charge hold (events hold_start..hold_end) for as long as E is held, then the release tail. Instinct Reversal spreads the whole Sphere clip over the string of strikes. */
function riftFrame(a: KaiClipInfo, t: number, dur: number | undefined, released: boolean, rt: number): number {
  const hs = a.events.hold_start ?? 3, he = Math.max(hs, a.events.hold_end ?? hs + 3), rel = a.events.release ?? he + 1;
  if (!released) { if (t < RIFT.minCharge) return Math.min(hs - 1, Math.floor(t / RIFT.minCharge * hs)); return hs + Math.floor((t - RIFT.minCharge) * Math.max(8, a.fps)) % (he - hs + 1); }
  const tail = Math.max(0.1, (dur ?? t + 0.5) - (t - rt)); return Math.min(a.frames - 1, rel + Math.floor(Math.min(0.999999, rt / tail) * (a.frames - rel)));
}
export function castFrame(a: KaiClipInfo, kind: CastKind, t: number, dur?: number, released = false, rt = 0): number {
  if (kind === 'rift') return riftFrame(a, t, dur, released, rt);
  if (kind === 'reversal') return Math.min(a.frames - 1, Math.floor(((t * 5) % 1) * Math.min(a.frames, 10)) + (released ? 0 : 0));   // a sustained string of strikes loops a quick strike motion
  if (kind === 'scatter') { const imp = a.events.impact ?? Math.floor(a.frames / 2), lo = Math.max(0, imp - 3), hi = Math.min(a.frames - 1, imp + 2); return lo + Math.floor(((t / 0.14) % 1) * (hi - lo + 1)); }
  if (kind === 'meteor') { const imp = a.events.impact ?? a.events.release ?? Math.floor(a.frames / 2), lo = Math.max(0, imp - 3), hi = Math.min(a.frames - 1, imp + 2); return t < 0.12 ? Math.max(0, Math.floor(t / 0.12 * lo)) : lo + Math.floor((((t - 0.12) / 0.17) % 1) * (hi - lo + 1)); }
  if (kind === 'flare' || kind === 'crucible') { const rel = a.events.release ?? Math.floor(a.frames / 2), tr = kind === 'flare' ? 0.2 : 0.55; if (t < tr) return Math.min(rel - 1, Math.max(0, Math.floor(t / tr * rel))); return Math.min(a.frames - 1, rel + Math.floor(Math.min(0.999999, (t - tr) / Math.max(0.1, (dur ?? tr + 0.5) - tr)) * (a.frames - rel))); }
  const rel = (kind === 'dragon' ? a.events.impact : a.events.release) ?? Math.floor(a.frames / 2);
  const tr = kind === 'beam' ? BEAM.charge : kind === 'sphere' ? SPHERE.gather : kind === 'dragon' ? DRAGON.windup : CANNON.gather;
  const total = dur ?? (kind === 'beam' ? BEAM.charge + BEAM.fire + BEAM.recover : kind === 'sphere' ? SPHERE.gather + SPHERE.recover : kind === 'dragon' ? DRAGON.windup + DRAGON.lunge + DRAGON.recover : CANNON.gather + CANNON.fire + CANNON.recover);
  if (t < tr) return Math.min(rel - 1, Math.max(0, Math.floor(t / tr * rel)));
  return Math.min(a.frames - 1, rel + Math.floor(Math.min(0.999999, (t - tr) / (total - tr)) * (a.frames - rel)));
}

export class KaiAnimator {
  facing: Facing = 'south';
  clip: KaiClip = 'Idle';
  /** Which art set is visible (separate Form I sheets, never a tint): switches at the Transform clip's form_commit frame, immediately on interruption, back on expiry. */
  visualForm: KaiForm = 'base';
  private time = 0;
  private punchTime = -1;
  private punchRate = 1;
  private runPunchTime = -1;
  private runTime = 0;
  private sinceTurn = 1;
  private movingNow = false;
  private hurtTime = -1; private lungeTime = -1;
  private deathTime = -1;
  private dashRec = -1;
  private dashProg = 0;
  private dashWas = false;
  private transformTime = -1;
  private revertTime = -1;
  private simFormPrev = 0;
  private events: KaiAnimEvent[] = [];
  private castT = 0;
  private castKind: CastKind = 'beam';
  private castReleased = false;
  private castRt = 0;
  private cinemaTo: 2 | 3 = 2;
  private idleFor = 0;
  private special = -1;
  private castDur: number | undefined;
  private casting = false;
  private cinemaOn = false;
  private cinemaT = 0;
  private cinemaCommitAt = 1;
  private cinemaDur = 1;
  private castId = 0;

  /** `f1` = the Form I manifests; without them the form input is ignored (base-only play). */
  constructor(private readonly manifests: KaiManifests, private readonly f1?: KaiManifests, private readonly f2?: KaiManifests, private readonly f3?: KaiManifests) {}

  get punching() { return this.punchTime >= 0; }
  get runPunching() { return this.runPunchTime >= 0; }
  private planted = false;
  /** B22: a shot that goes in a different cardinal direction than the run (e.g. backing away from a pursuer) is shown as a short planted strike toward the target, so the visible hand and the shot agree; same-direction shots keep the RunPunchUpper + RunLower composite. */
  private plantedStrike(i: AnimFrameInput): boolean {
    if (this.planted) { if (this.punching || this.runPunchTime >= 0 || i.shot) return true; this.planted = false; return false; }
    if (i.shot && i.moving && facingFromVector(this.facing, i.shot.dx, i.shot.dy) !== facingFromInput(this.facing, i.inputX, i.inputY)) { this.planted = true; return true; }
    return false;
  }
  get dead() { return this.deathTime >= 0; }
  get transforming() { return this.transformTime >= 0 || this.cinemaOn; }
  /** True once the Death clip has played through and held its last frame for DEATH_RESULTS_HOLD_SECONDS. Never true while alive. */
  deathPresented(): boolean { if (this.deathTime < 0) return false; const d = this.info('Death'); return this.deathTime >= d.frames / d.fps + DEATH_RESULTS_HOLD_SECONDS; }

  private turn(next: Facing, force = false) { if (next !== this.facing && (force || this.sinceTurn >= FACING_DWELL)) { this.facing = next; this.sinceTurn = 0; } }

  private set(form: KaiForm) { return form === 'f3' && this.f3 ? this.f3 : form === 'f3' && this.f2 ? this.f2 : form === 'f2' && this.f2 ? this.f2 : form !== 'base' && this.f1 ? this.f1 : this.manifests; }
  private info(clip: KaiClip, form: KaiForm = this.formOf(clip)): KaiClipInfo { return this.set(form)[this.facing].animations[clip] as KaiClipInfo; }
  /** Transform and its reverse live in the Form I sheets; everything else uses the visible art set. */
  private formOf(clip: KaiClip): KaiForm { return clip === 'Transform' ? (this.cinemaOn ? (this.cinemaTo === 3 && this.f3 ? 'f3' : 'f2') : 'f1') : clip === 'IdleSpecial' ? 'f3' : this.visualForm; }

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

  /** Priority: Death > Hurt > Dash (incl. recovery) > Transform > Power-down > Beam/Sphere cast > BasicPunch > Run > Idle. Hurt and Dash never start a punch; the sim still fires its weapon. */
  update(i: AnimFrameInput, attackPeriod: number): AnimPose {
    this.events = [];
    const simForm = this.f1 ? Math.min(i.form ?? 0, this.f3 ? 3 : this.f2 ? 2 : 1) : 0;
    const formArt = (f: number): KaiForm => (f === 3 ? 'f3' : f === 2 ? 'f2' : 'f1');
    if (!i.alive) {
      if (this.deathTime < 0) { this.commitNow(simForm); this.punchTime = -1; this.runPunchTime = -1; this.hurtTime = -1; this.dashRec = -1; this.dashWas = false; this.revertTime = -1; if (simForm) this.visualForm = formArt(simForm); this.deathTime = 0; this.clip = 'Death'; }
      else this.deathTime += i.dt;
      this.simFormPrev = simForm; this.movingNow = false; return this.pose();
    }
    if (this.deathTime >= 0) { this.deathTime = -1; this.clip = 'Idle'; this.time = 0; this.visualForm = 'base'; this.transformTime = -1; this.revertTime = -1; this.simFormPrev = 0; this.cinemaOn = false; }   // a new run reuses the animator
    this.sinceTurn += i.dt;
    this.movingNow = i.moving || i.dashing;

    if (i.cinema && (i.cinema.to === 3 ? this.f3 : this.f2)) {   // B12 Form II reveal: the whole body plays the Form II Transform clip on the sim's cinematic timeline
      if (!this.cinemaOn) { this.cinemaOn = true; this.punchTime = -1; this.runPunchTime = -1; this.hurtTime = -1; this.dashRec = -1; this.revertTime = -1; this.transformTime = -1; this.dashWas = false; this.casting = false; this.cinemaTo = i.cinema.to === 3 ? 3 : 2; this.special = -1; this.events.push('form_start'); }
      this.cinemaT = i.cinema.t; this.cinemaDur = i.cinema.dur; this.cinemaCommitAt = i.cinema.commitAt; this.clip = 'Transform';
      if (simForm >= 2 && this.visualForm !== formArt(simForm)) { this.visualForm = formArt(simForm); this.events.push('form_commit'); }
      this.simFormPrev = simForm; this.movingNow = false; return this.pose();
    }
    if (this.cinemaOn) { this.cinemaOn = false; this.clip = 'Idle'; this.time = 0; if (simForm >= 2) this.visualForm = formArt(simForm); }
    if (simForm >= 2 && this.simFormPrev !== simForm) { this.visualForm = formArt(simForm); this.transformTime = -1; this.revertTime = -1; this.events.push('form_commit'); }
    else if (simForm === 1 && this.simFormPrev === 0) { this.punchTime = -1; this.runPunchTime = -1; this.hurtTime = -1; this.dashRec = -1; this.revertTime = -1; this.transformTime = 0; this.visualForm = 'base'; this.events.push('form_start'); }
    else if (simForm === 0 && this.simFormPrev >= 1) { this.transformTime = -1; this.punchTime = -1; this.runPunchTime = -1; this.visualForm = 'base'; this.revertTime = 0; this.events.push('form_end'); }
    this.simFormPrev = simForm;

    if (i.hurt) this.lungeTime = -1;
    if (i.hurt) { this.commitNow(simForm); this.punchTime = -1; this.runPunchTime = -1; this.dashRec = -1; this.revertTime = -1; this.hurtTime = 0; }
    if (i.dashing) {
      if (!this.dashWas) { this.commitNow(simForm); this.punchTime = -1; this.runPunchTime = -1; this.hurtTime = -1; this.revertTime = -1; this.turn(facingFromInput(this.facing, i.dashX, i.dashY), true); }
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
    const casting = !!i.cast && !busy;
    if (i.cast && casting) {
      if (i.cast.id !== this.castId) { this.castId = i.cast.id; this.turn(i.cast.face, true); }
      this.castT = i.cast.t; this.castKind = i.cast.kind; this.castDur = i.cast.dur; this.castReleased = !!i.cast.released; this.castRt = i.cast.rt ?? 0; this.punchTime = -1; this.runPunchTime = -1;
    }
    this.casting = casting;

    if (casting) { /* the signature ability owns the hands */ }
    else if (!busy && this.movingNow && !this.plantedStrike(i)) {
      // Pre-B12: the auto-attack is visible while running as two layers of the SAME rig (RunPunchUpper over RunLower, leg-phase matched), not a pixel crop of two sprites.
      // Facing stays input-driven (target changes never turn the body mid-run); the sim keeps sole authority over when the hit lands, we only predict it from attackClock.
      if (i.moving) this.turn(facingFromInput(this.facing, i.inputX, i.inputY));
      const rp = this.info('RunPunchUpper'), rpDur = rp.frames / RUN_PHASES / rp.fps, rpImpact = (rp.events.impact ?? 3 * RUN_PHASES) / RUN_PHASES / rp.fps;
      if (this.punchTime >= 0) { const bp = this.info('BasicPunch'); this.runPunchTime = Math.min(rpDur - 1e-3, this.punchTime / (bp.frames / bp.fps) * rpDur); this.punchTime = -1; }   // started moving mid-punch: carry its progress over
      if (i.shot) { if (!(this.runPunching && Math.abs(this.runPunchTime - rpImpact) <= 0.12)) this.runPunchTime = Math.max(0, rpImpact - 1.5 / rp.fps); }
      else if (!this.runPunching && i.hasTarget && i.attackClock <= rpImpact) this.runPunchTime = rpImpact - Math.max(0, i.attackClock);
      if (this.runPunching) { this.runPunchTime += i.dt; if (this.runPunchTime >= rpDur) this.runPunchTime = -1; }
    } else if (!busy) {
      if (this.runPunchTime >= 0) { const bp = this.info('BasicPunch'), rp = this.info('RunPunchUpper'); this.punchTime = Math.min(bp.frames / bp.fps - 1e-3, this.runPunchTime / (rp.frames / RUN_PHASES / rp.fps) * (bp.frames / bp.fps)); this.runPunchTime = -1; }   // stopped mid-attack: finish it as the standing punch
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
    } else { this.punchTime = -1; this.runPunchTime = -1; }

    // B13: Stillfire Apex's rare special idle (slow head turn, relaxed hand) after a long calm spell; it plays once and never interrupts anything
    const sp = this.visualForm === 'f3' ? this.f3?.[this.facing]?.animations.IdleSpecial : undefined;
    const calm = !!sp && !i.moving && !busy && !casting && !this.punching;
    if (calm) { this.idleFor += i.dt; if (this.special < 0 && this.idleFor >= 9) { this.special = 0; this.idleFor = 0; } } else { this.idleFor = 0; this.special = -1; }
    if (this.special >= 0 && sp) { this.special += i.dt; if (this.special >= sp.frames / sp.fps) this.special = -1; }
    if (i.lunge && !i.dashing && !casting && this.hurtTime < 0) this.lungeTime = 0; else if (this.lungeTime >= 0) { this.lungeTime += i.dt; if (this.lungeTime > 0.58 || casting || i.dashing) this.lungeTime = -1; }
    const want: KaiClip = this.special >= 0 ? 'IdleSpecial' : this.hurtTime >= 0 ? 'Hurt' : (i.dashing || this.dashRec >= 0) ? 'Dash' : this.lungeTime >= 0 ? 'Lunge' : (this.transformTime >= 0 || this.revertTime >= 0) ? 'Transform' : casting ? CAST_CLIP[i.cast!.kind] : this.punching ? 'BasicPunch' : this.runPunching && i.moving ? 'RunPunchUpper' : i.moving ? 'Run' : 'Idle';
    if (want !== this.clip) { this.clip = want; this.time = 0; }
    const runStep = i.dt * Math.min(18, Math.max(10, 14 * i.runSpeed / 250)) / 14;
    if (this.movingNow) this.runTime += runStep; else this.runTime = 0;
    if (want === 'Run') this.time += runStep;
    else if (want === 'Idle' || want === 'IdleSpecial') this.time += i.dt;
    return this.pose();
  }

  /** Which of the 8 Run leg poses the body is in right now (the same value drives RunLower and the upper layer's frame block). */
  private legPhase() { const run = this.info('Run'); return Math.floor(this.runTime * run.fps + 1e-6) % RUN_PHASES % run.frames; }

  /** Events raised by the most recent update(). */
  pose(): AnimPose {
    const form = this.formOf(this.clip);
    const a = this.info(this.clip, form);
    let frame: number;
    if (this.clip === 'Dash') {
      const rec = a.events.recover_start ?? a.frames - 3;
      frame = this.dashRec >= 0 ? Math.min(a.frames - 1, rec + Math.floor(this.dashRec / DASH_RECOVERY_SECONDS * (a.frames - rec))) : Math.min(rec - 1, Math.floor(this.dashProg * rec));
    } else if (this.clip === 'Transform' && this.cinemaOn) {
      const commit = a.events.form_commit ?? 5, u = Math.min(1, this.cinemaT / this.cinemaCommitAt);
      frame = this.cinemaT < this.cinemaCommitAt ? Math.min(commit - 1, Math.floor(Math.pow(u, 0.75) * commit)) : Math.min(a.frames - 1, commit + Math.floor(Math.min(0.999, (this.cinemaT - this.cinemaCommitAt) / Math.max(0.01, this.cinemaDur - this.cinemaCommitAt)) * (a.frames - commit)));
    } else if (this.clip === 'Transform') {
      const commit = a.events.form_commit ?? 5;
      frame = this.transformTime >= 0 ? Math.min(a.frames - 1, Math.floor(this.transformTime * a.fps + 1e-6)) : Math.max(0, commit - 1 - Math.floor(Math.min(0.999, this.revertTime / FORM_REVERT_SECONDS) * commit));
    } else if (this.clip === 'RunPunchUpper') {
      frame = Math.min(a.frames / RUN_PHASES - 1, Math.floor(Math.max(0, this.runPunchTime) * a.fps + 1e-6)) * RUN_PHASES + this.legPhase();
    } else if (this.casting && (this.clip === 'Beam' || this.clip === 'Sphere' || this.clip === 'BasicPunch' || this.clip === 'Lunge' || this.clip === 'Uppercut' || this.clip === 'Slam')) {
      frame = castFrame(a, this.castKind, this.castT, this.castDur, this.castReleased, this.castRt);
    } else {
      const t = this.clip === 'Lunge' ? Math.max(0, this.lungeTime) : this.clip === 'BasicPunch' ? Math.max(0, this.punchTime) : this.clip === 'Hurt' ? Math.max(0, this.hurtTime) : this.clip === 'Death' ? Math.max(0, this.deathTime) : this.time;
      const raw = Math.floor(t * a.fps + 1e-6);
      frame = a.loop ? raw % a.frames : Math.min(a.frames - 1, raw);
    }
    const legs = this.clip === 'RunPunchUpper' ? this.legPhase() : null;
    return { facing: this.facing, clip: this.clip, frame, legs, form, events: this.events };
  }
}

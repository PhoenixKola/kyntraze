/** B19: Ren / Sora clip selection. Same sheet contract as Kai (parseKaiManifest, KaiClip names, RunPunchUpper layering) so the renderer draws a pose the same way; only the state machine differs, because the hero's moves are driven by the sim's HeroCast timeline (never by a render-side guess).
 *  Clip meaning per hero is documented in art/characters/<hero>/ART-NOTES.md: BasicPunch = auto strike / Q beat (Ren) or needle / volley cast (Sora), Beam = Meteor Rush strike (Ren) or Celestial Lance (Sora), Sphere = Bloodstar Impact (Ren) or Zero Horizon (Sora). */
import { skinRoot } from './skin';
import { RUN_PHASES, SIM_DASH_SECONDS, facingFromInput, facingFromVector, type AnimPose, type Facing, type KaiClip, type KaiClipInfo, type KaiManifests } from './kaiAnimation';
import type { HeroAct } from '../content/heroKits';
import { REN, SORA, VEX } from '../content/heroKits';
import { REN_E, REN_Q, REN_R } from '../content/renCombat';
import { VEX1_E, VEX1_Q, VEX1_R, VEX2_E, VEX2_Q, VEX2_R } from '../content/vexCombat';
/** B28 Vex casts: seconds until the act's release frame (and, for Mirror Guard, how long the guard holds) in the sim, so the authored poses land on the real timeline. */
const VEX_CAST: Record<string, { tr: number; hold?: number }> = { mirror_guard: { tr: 0.2, hold: VEX1_Q.total }, phantom_legion: { tr: VEX2_Q.cast }, rift_execution: { tr: VEX1_E.windup + VEX1_E.arrive }, dim_severance: { tr: VEX2_E.windup }, oath_ruin: { tr: VEX1_R.windup }, domain_exile: { tr: VEX2_R.cast } };
const VEX_STRIKES = ['Strike1', 'Strike2', 'Strike3', 'Strike4'] as const;

/** The heroes whose art is a hero sheet set (Kai has his own kaiAnimation pipeline). */
export type HeroArt = 'ren' | 'sora' | 'vex';
/** Appearance sets: base, f1 (first transformation), f2 (Vex's Voidheart Exile only). */
export type HeroForm = 'base' | 'f1' | 'f2';
export const HERO_ART: readonly HeroArt[] = ['ren', 'sora', 'vex'];
export const isHeroArt = (h: string): h is HeroArt => h === 'ren' || h === 'sora' || h === 'vex';
/** Which sheet sets exist (all four facings, every clip). A missing set draws the clearly-marked dev placeholder body instead of half a rig. */
export const HERO_SHEETS: Record<HeroArt, { base: boolean; f1: boolean; f2: boolean; anchors: boolean }> = { ren: { base: true, f1: true, f2: false, anchors: true }, sora: { base: true, f1: true, f2: false, anchors: true }, vex: { base: true, f1: true, f2: true, anchors: true } };
export const heroForms = (h: HeroArt): HeroForm[] => (['base', 'f1', 'f2'] as const).filter(f => HERO_SHEETS[h][f]);
/** Motion/FX rig family: Vex reuses Ren's state machine and effect logic (his art, textures and sounds are his own explicit keys). */
export const rigOf = (h: HeroArt): 'ren' | 'sora' => (h === 'sora' ? 'sora' : 'ren');
export const VOID_TINT = 0x9a90c0;
export const HERO_REGISTRY_KEY = (hero: string, form: HeroForm) => `hero-${hero}-${form}-manifests`;
export const HERO_ANCHORS_KEY = (hero: string) => `hero-${hero}-anchors`;
const FORM_SUFFIX: Record<HeroForm, string> = { base: '', f1: '-f1', f2: '-f2' };
/** Outfits are Kai/Ren/Sora/Vex-specific (skinRoot checks the owner), and Vex's f2 set has no outfit variants. */
export const heroRoot = (hero: string, form: HeroForm) => (form === 'f2' ? `/art/${hero}-f2` : skinRoot(`/art/${hero}${FORM_SUFFIX[form]}`));
export const heroManifestUrl = (hero: string, dir: Facing, form: HeroForm) => `${heroRoot(hero, form)}/${dir}/manifest.json`;
export const heroSheetUrl = (hero: string, dir: Facing, clip: KaiClipInfo, form: HeroForm) => `${heroRoot(hero, form)}/${dir}/${clip.sheet}`;
export const heroAnchorsUrl = (hero: string) => `/art/${hero}-anchors.json`;
export const heroTextureKey = (hero: string, dir: Facing, clip: KaiClip, form: HeroForm) => `${hero}${form === 'base' ? '' : form}-${dir}-${clip}`;

export interface HeroActView { /** seconds since this act's successful counter (Vex), large when none */ riposte?: number; id: number; act: HeroAct; t: number; dur: number; face: Facing; released: boolean; moving: boolean; beats: number; hop: number; hops: number; hopT: number; charge: number }
export interface HeroAnimInput {
  dt: number; alive: boolean; moving: boolean; inputX: number; inputY: number; runSpeed: number;
  dashing: boolean; dashX: number; dashY: number; dashRemaining: number; hurt: boolean;
  form: number; cinema: { t: number; dur: number; commitAt: number } | null;
  act: HeroActView | null;
  /** the sim's last automatic strike (time it happened, offset direction) */ strike: { t: number; x: number; y: number };
  /** B26 Ren Crimson Fury: the last auto beat (0 jab, 1 kick, 2 hook, 3 uppercut) and seconds since it landed; null when none */ fury?: { beat: number; t: number } | null;
  /** B26 Ren Skybreaker: seconds airborne (0 on the ground) */ flyT?: number;
}
const FACING_DWELL = 0.12, DEATH_HOLD = 0.35, DASH_REC = 0.12;
const frameAt = (a: KaiClipInfo, u: number, lo = 0, hi = a.frames - 1) => Math.max(lo, Math.min(hi, lo + Math.floor(Math.min(0.999999, Math.max(0, u)) * (hi - lo + 1))));

/** B20: pose progress (0..1 of the pre-release frames) over the pre-release time (0..1). Crouch runs at constant rate, the leap launches fast, hangs briefly at the apex and accelerates into the slam; ends exactly at the release frame. */
export function leapCurve(u: number, rel: number, crouchShare: number): number {
  const cs = Math.min(0.6, Math.max(0.1, crouchShare)), crouchFrames = 7 / rel;
  if (u <= cs) return (u / cs) * crouchFrames;
  const w = (u - cs) / (1 - cs), apex = 0.55, f = w < 0.45 ? apex * (1 - (1 - w / 0.45) ** 2) : w < 0.72 ? apex + 0.07 * ((w - 0.45) / 0.27) : apex + 0.07 + (1 - apex - 0.07) * ((w - 0.72) / 0.28) ** 1.8;
  return crouchFrames + (1 - crouchFrames) * Math.min(1, f);
}
export class HeroAnimator {
  facing: Facing = 'south'; clip: KaiClip = 'Idle'; visualForm: 'base' | 'f1' = 'base';
  private time = 0; private runTime = 0; private sinceTurn = 1; private hurtT = -1; private deathT = -1; private dashRec = -1; private dashWas = false; private dashProg = 0;
  private strikeT = -1; private lastStrike = -9; private actId = 0; private beatSeen = 0; private beatT = 99; private formPrev = 0; private moveNow = false; private cinemaOn = false; private cinemaT = 0; private cinemaCommit = 1; private cinemaDur = 1;
  private actView: HeroActView | null = null;
  private furyView: { beat: number; t: number } | null = null; private flyWas = false; private flyDur = 0; private flying = false; private landT = -1; private landDive = false; private relT = -1;
  private formNow = 0;
  constructor(readonly hero: HeroArt, private readonly base: KaiManifests, private readonly f1?: KaiManifests, private readonly f2?: KaiManifests) {}
  get dead() { return this.deathT >= 0; }
  deathPresented() { if (this.deathT < 0) return false; const d = this.info('Death'); return this.deathT >= d.frames / d.fps + DEATH_HOLD; }
  private set(form: 'base' | 'f1' = this.visualForm) { if (form === 'f1' && this.hero === 'vex' && this.formNow === 2 && this.f2 && this.clip !== 'Transform') return this.f2; return form === 'f1' && this.f1 ? this.f1 : this.base; }
  private info(clip: KaiClip, form: 'base' | 'f1' = this.clip === 'Transform' ? 'f1' : this.visualForm): KaiClipInfo { return this.set(form)[this.facing].animations[clip] as KaiClipInfo; }
  private turn(f: Facing, force = false) { if (f !== this.facing && (force || this.sinceTurn >= FACING_DWELL)) { this.facing = f; this.sinceTurn = 0; } }
  private leg() { const r = this.info('Run'); return Math.floor(this.runTime * r.fps + 1e-6) % RUN_PHASES % r.frames; }

  update(i: HeroAnimInput): AnimPose {
    const events: AnimPose['events'] = [], ev = events as unknown as string[];
    if (!i.alive) { if (this.deathT < 0) { this.deathT = 0; this.hurtT = -1; this.dashRec = -1; this.strikeT = -1; this.cinemaOn = false; this.clip = 'Death'; if (i.form) this.visualForm = this.f1 ? 'f1' : 'base'; } else this.deathT += i.dt; return this.pose(events); }
    if (this.deathT >= 0) { this.deathT = -1; this.clip = 'Idle'; this.time = 0; this.visualForm = 'base'; this.formPrev = 0; this.cinemaOn = false; }
    this.formNow = i.form; this.sinceTurn += i.dt; this.moveNow = i.moving || i.dashing; this.actView = i.act; this.furyView = this.renForm() || this.vexForm() ? i.fury ?? null : null;
    if (i.cinema && this.f1) {
      if (!this.cinemaOn) { this.cinemaOn = true; this.strikeT = -1; this.hurtT = -1; this.dashRec = -1; ev.push('form_start'); }
      this.cinemaT = i.cinema.t; this.cinemaDur = i.cinema.dur; this.cinemaCommit = i.cinema.commitAt; this.clip = 'Transform';
      if (i.cinema.t >= i.cinema.commitAt && this.visualForm !== (this.f1 ? 'f1' : 'base')) { this.visualForm = this.f1 ? 'f1' : 'base'; ev.push('form_commit'); }
      this.formPrev = i.form; this.moveNow = false; return this.pose(events);
    }
    if (this.cinemaOn) { this.cinemaOn = false; this.clip = 'Idle'; this.time = 0; if (i.form) this.visualForm = this.f1 ? 'f1' : 'base'; }
    if (i.form && !this.formPrev) { this.visualForm = this.f1 ? 'f1' : 'base'; ev.push('form_commit'); } else if (!i.form && this.formPrev) { this.visualForm = 'base'; ev.push('form_end'); }
    this.formPrev = i.form;
    if (i.hurt) { this.hurtT = 0; this.strikeT = -1; this.dashRec = -1; }
    if (i.dashing) { if (!this.dashWas) { this.hurtT = -1; this.strikeT = -1; this.turn(facingFromInput(this.facing, i.dashX, i.dashY), true); } else this.turn(facingFromInput(this.facing, i.dashX, i.dashY)); this.dashRec = -1; this.dashProg = Math.min(1, Math.max(0, 1 - i.dashRemaining / SIM_DASH_SECONDS)); }
    else if (this.dashWas) this.dashRec = 0;
    this.dashWas = i.dashing;
    if (this.dashRec >= 0 && !i.dashing) { this.dashRec += i.dt; if (this.dashRec >= DASH_REC || (i.moving && this.dashRec >= 0.05)) this.dashRec = -1; }
    if (this.hurtT >= 0) { const h = this.info('Hurt'); this.hurtT += i.dt; if (this.hurtT >= h.frames / h.fps || (this.moveNow && this.hurtT >= (h.events.interruptible_from ?? h.frames) / h.fps)) this.hurtT = -1; }
    const busy = this.hurtT >= 0 || i.dashing || this.dashRec >= 0, a = i.act && !busy ? i.act : null;
    if (a) { if (a.id !== this.actId) { this.actId = a.id; this.turn(a.face, true); this.beatSeen = 0; this.beatT = 99; } else if (a.act === 'meteor_rush') this.turn(a.face, true); else if (a.act === 'crimson_break') this.turn(a.face, true); if (a.beats > this.beatSeen) { this.beatSeen = a.beats; this.beatT = 0; } this.beatT += i.dt; this.strikeT = -1; }
    else if (!busy) {
      if (i.strike.t > this.lastStrike + 1e-6) { this.lastStrike = i.strike.t; this.strikeT = 0; this.turn(facingFromVector(this.facing, i.strike.x, i.strike.y), true); } else if (this.strikeT >= 0) this.strikeT += i.dt;
      if (this.strikeT > 0.3) this.strikeT = -1;
      if (this.strikeT < 0 && i.moving) this.turn(facingFromInput(this.facing, i.inputX, i.inputY));
    } else this.strikeT = -1;
    const runStep = i.dt * Math.min(18, Math.max(10, 14 * i.runSpeed / 250)) / 14;
    if (this.moveNow) this.runTime += runStep; else this.runTime = 0;
    this.flying = (this.renForm() || this.soraForm() || this.vexForm()) && (i.flyT ?? 0) > 0 && this.has('Glide');
    if (this.flying) { this.flyDur = i.flyT ?? 0; this.flyWas = true; this.landT = -1; } else if (this.flyWas) { this.flyWas = false; this.landT = 0; this.landDive = this.flyDur >= 0.5 && this.has('Dive'); }
    if (this.landT >= 0) { this.landT += i.dt; if (this.landT > (this.landDive ? 0.4 : 0.2) || (i.moving && this.landT > 0.1)) this.landT = -1; }
    const landing = this.landT >= 0 && this.landDive, fury = this.furyClip(i.moving);
    if (a && (a.act === 'nova_fist' || a.act === 'abyssal_fang' || a.act === 'event_horizon') && a.released) { if (this.relT < 0) this.relT = 0; this.relT += i.dt; } else this.relT = -1;
    const want: KaiClip = this.hurtT >= 0 ? 'Hurt' : (i.dashing || this.dashRec >= 0) ? (this.vexForm() && this.formNow === 2 && this.has('Blink') ? 'Blink' : 'Dash') : a ? this.actClip(a, i.moving) : this.flying ? (this.flyDur < 0.3 && this.has('Takeoff') ? 'Takeoff' : 'Glide') : landing ? 'Dive' : fury ? fury : this.strikeT >= 0 ? (i.moving ? 'RunPunchUpper' : 'BasicPunch') : i.moving ? 'Run' : this.vexForm() && this.formNow === 2 && this.has('Hover') ? 'Hover' : 'Idle';
    if (want !== this.clip) { this.clip = want; this.time = 0; }
    if (want === 'Run') this.time += runStep; else if (want === 'Idle' || want === 'Hover' || want === 'Glide' || want === 'Takeoff') this.time += i.dt;
    return this.pose(events);
  }
  private soraForm() { return this.hero === 'sora' && this.visualForm === 'f1'; }
  private vexForm() { return this.hero === 'vex' && this.visualForm === 'f1'; }
  private renForm() { return this.hero === 'ren' && this.visualForm === 'f1'; }
  /** Crimson Fury beat clip while standing; a moving strike keeps the RunPunchUpper layering. */
  private furyClip(moving: boolean): KaiClip | null {
    const f = this.furyView; if (!f || moving) return null; const c: KaiClip = (this.vexForm() ? VEX_STRIKES : (['Jab', 'Kick', 'Hook', 'Uppercut'] as const))[f.beat & 3]; if (!this.has(c)) return null;
    const a = this.info(c), rel = a.events.release ?? 3; return f.t < (a.frames - Math.max(0, rel - 2)) / a.fps ? c : null;
  }
  private has(clip: KaiClip): boolean { return !!(this.set(this.visualForm)[this.facing].animations as Partial<Record<KaiClip, KaiClipInfo>>)[clip]; }
  private actClip(a: HeroActView, moving: boolean): KaiClip {
    switch (a.act) {
      case 'crimson_break': case 'azure_volley': return moving ? 'RunPunchUpper' : 'BasicPunch';
      case 'meteor_rush': return a.hop < a.hops && a.hopT <= REN.e.hopTime ? 'Dash' : a.hop >= a.hops ? 'Dash' : 'BasicPunch';
      case 'infernal_cyclone': return this.renForm() && this.has('Cyclone') ? 'Cyclone' : this.has('Slam') ? 'Slam' : 'Sphere';   // B26: Ren-authored clip in Crimson Ascendant, older mapping when a sheet set lacks it
      case 'scarlet_rampage': return this.renForm() && this.has('Rampage') ? 'Rampage' : a.hop === 0 || a.hop === 1 ? 'Dash' : 'BasicPunch';
      case 'crimson_catastrophe': return this.renForm() && this.has('Pound') ? 'Pound' : 'Sphere';
      case 'nova_fist': return this.renForm() && this.has(a.released ? 'Lunge' : 'NovaCharge') ? (a.released ? 'Lunge' : 'NovaCharge') : a.released ? 'Dash' : 'BasicPunch';
      // B28: Vex's authored casts (each falls back to the older mapping when a sheet set lacks the clip)
      case 'mirror_guard': return this.vexForm() && this.has('CastQ') ? 'CastQ' : this.has('Guard') ? 'Guard' : 'BasicPunch';
      case 'phantom_legion': return this.vexForm() && this.has('CastQ') ? 'CastQ' : 'Sphere';
      case 'rift_execution': case 'dim_severance': return this.vexForm() && this.has('CastE') ? 'CastE' : 'Dash';
      case 'oath_ruin': case 'domain_exile': return this.vexForm() && this.has('CastR') ? 'CastR' : 'Sphere';
      case 'abyssal_fang': case 'event_horizon': return this.vexForm() && this.has(a.released ? 'VRelease' : 'VCharge') ? (a.released ? 'VRelease' : 'VCharge') : a.released ? 'Beam' : 'Sphere';
      case 'bloodstar': case 'zero_horizon': return 'Sphere';
      case 'celestial_lance': return 'Beam';
      // B27: Sora's Sovereign moves reuse the existing gather / thrust clips until his own poses are authored (reported as reuse, not as new poses)
      case 'azure_prison': return moving ? 'RunPunchUpper' : 'Sphere';
      case 'heavens_spear': case 'azure_collapse': return 'Sphere';
      case 'astral_devastation': return a.released ? 'Beam' : 'Sphere';
      case 'parry_halo': return this.has('Guard') ? ((a.riposte ?? 9) < 0.6 && this.has('Riposte') ? 'Riposte' : 'Guard') : 'BasicPunch';
      case 'rift_reversal': return this.has('Riposte') && a.t >= VEX.e.windup ? 'Riposte' : 'Dash';
      case 'oathbreaker_seal': case 'ultimate': return 'Sphere';
      default: return 'BasicPunch';   // acts of a later hero batch without their own clip yet
    }
  }
  pose(events: AnimPose['events'] = []): AnimPose {
    const form = this.clip === 'Transform' ? 'f1' : this.visualForm, a = this.info(this.clip, form), v = this.actView; let frame = 0;
    if (this.clip === 'Dash' || this.clip === 'Blink') {
      const rec = a.events.recover_start ?? a.frames - 3;
      if (v?.act === 'meteor_rush') frame = v.hop >= v.hops ? Math.min(a.frames - 1, rec + Math.floor(Math.min(0.999, Math.max(0, v.t - v.hops * (REN.e.hopTime + REN.e.strikeTime)) / REN.e.recover) * (a.frames - rec))) : frameAt(a, v.hopT / REN.e.hopTime, 0, rec - 1);
      else frame = this.dashRec >= 0 ? Math.min(a.frames - 1, rec + Math.floor(this.dashRec / DASH_REC * (a.frames - rec))) : Math.min(rec - 1, Math.floor(this.dashProg * rec));
    } else if (this.clip === 'Transform') {
      const commit = a.events.form_commit ?? 5, u = Math.min(1, this.cinemaT / this.cinemaCommit);
      frame = this.cinemaT < this.cinemaCommit ? Math.min(commit - 1, Math.floor(Math.pow(u, 0.75) * commit)) : Math.min(a.frames - 1, commit + Math.floor(Math.min(0.999, (this.cinemaT - this.cinemaCommit) / Math.max(0.01, this.cinemaDur - this.cinemaCommit)) * (a.frames - commit)));
    } else if (this.clip === 'BasicPunch' || this.clip === 'RunPunchUpper') {
      const base = this.clip === 'RunPunchUpper' ? Math.floor(a.frames / RUN_PHASES) : a.frames, imp = (a.events.impact ?? (this.clip === 'RunPunchUpper' ? 3 * RUN_PHASES : Math.floor(a.frames / 2))) / (this.clip === 'RunPunchUpper' ? RUN_PHASES : 1);
      const lo = Math.max(0, Math.floor(imp) - 3), hi = Math.min(base - 1, Math.floor(imp) + 2);
      let u = 0; if (v && (v.act === 'crimson_break' || v.act === 'azure_volley')) u = v.act === 'crimson_break' ? this.beatT / (this.visualForm === 'f1' ? REN.q.formGap : REN.q.gap) : Math.max(0, v.t - SORA.q.windup) / SORA.q.burst * 0.9 + 0.05;
      else if (v?.act === 'meteor_rush') u = Math.max(0, v.hopT - REN.e.hopTime) / REN.e.strikeTime; else u = this.strikeT / 0.22;
      const step = frameAt(a, u, lo, hi); frame = this.clip === 'RunPunchUpper' ? step * RUN_PHASES + this.leg() : step;
    } else if ((this.clip === 'Guard' || this.clip === 'Riposte') && v) {
      if (this.clip === 'Guard') frame = Math.floor(v.t * a.fps) % a.frames;
      else if (v.act === 'parry_halo') frame = Math.min(a.frames - 1, (a.events.anticipation_start ?? 1) + 2 + Math.floor((v.riposte ?? 0) * a.fps));
      else frame = Math.min(a.frames - 1, 3 + Math.floor(Math.min(0.999, Math.max(0, v.t - VEX.e.windup) / Math.max(0.05, v.dur - VEX.e.windup)) * (a.frames - 3)));
    } else if (this.clip === 'Sphere' && v) {
      const rel = a.events.release ?? Math.floor(a.frames / 2), tr = v.act === 'bloodstar' ? REN.r.windup + REN.r.flight : SORA.r.summon;
      frame = v.t < tr ? Math.min(rel - 1, Math.floor(leapCurve(v.t / tr, rel, v.act === 'bloodstar' ? REN.r.windup / tr : 0.4) * rel)) : Math.min(a.frames - 1, rel + Math.floor(Math.min(0.999999, (v.t - tr) / Math.max(0.05, v.dur - tr)) * (a.frames - rel)));
    } else if ((this.clip === 'CastQ' || this.clip === 'CastE' || this.clip === 'CastR') && v && VEX_CAST[v.act]) {
      const c = VEX_CAST[v.act], rel = a.events.release ?? 6;
      if (c.hold !== undefined) { const hs = a.events.hold ?? 6, he = a.events.hold_end ?? 11; frame = v.t < c.tr ? Math.min(hs - 1, Math.floor(v.t / c.tr * hs)) : v.t < c.hold ? hs + Math.floor((v.t - c.tr) * a.fps) % (he - hs + 1) : Math.min(a.frames - 1, he + 1 + Math.floor(Math.min(0.999, (v.t - c.hold) / Math.max(0.05, v.dur - c.hold)) * (a.frames - he - 1))); }
      else frame = v.t < c.tr ? Math.min(rel - 1, Math.floor(v.t / c.tr * rel)) : Math.min(a.frames - 1, rel + Math.floor(Math.min(0.999, (v.t - c.tr) / Math.max(0.05, v.dur - c.tr)) * (a.frames - rel)));
    } else if (this.clip === 'VCharge' && v) {
      const hs = a.events.hold ?? 5, he = a.events.hold_end ?? 11;
      frame = v.charge < 0.25 ? Math.min(hs - 1, Math.floor(v.charge / 0.25 * hs)) : hs + Math.floor(v.charge * a.fps) % (he - hs + 1);
    } else if (this.clip === 'VRelease' && v) {
      frame = Math.min(a.frames - 1, Math.floor(Math.max(0, this.relT) * a.fps));
    } else if (this.vexForm() && (this.clip === 'Strike1' || this.clip === 'Strike2' || this.clip === 'Strike3' || this.clip === 'Strike4') && this.furyView) {
      frame = Math.min(a.frames - 1, Math.max(0, (a.events.release ?? 3) - 2) + Math.floor(this.furyView.t * a.fps));
    } else if (this.renForm() && (this.clip === 'Jab' || this.clip === 'Kick' || this.clip === 'Hook' || this.clip === 'Uppercut') && this.furyView) {
      frame = Math.min(a.frames - 1, Math.max(0, (a.events.release ?? 3) - 2) + Math.floor(this.furyView.t * a.fps));
    } else if (this.clip === 'Cyclone' && v) {
      const ss = a.events.spin_start ?? 5, rel = a.events.release ?? 17, w = REN_Q.windup, sp = REN_Q.spin;
      frame = v.t < w ? Math.min(ss - 1, Math.floor(v.t / w * ss)) : v.t < w + sp ? ss + Math.floor((v.t - w) * a.fps) % Math.max(1, rel - ss) : Math.min(a.frames - 1, rel + Math.floor(Math.min(0.999999, (v.t - w - sp) / REN_Q.recover) * (a.frames - rel)));
    } else if (this.clip === 'Rampage' && v) {
      const dr = a.events.drive ?? 6, rel = a.events.release ?? 13, ap = REN_E.approach, dv = REN_E.drive;
      frame = v.t < ap ? Math.min(dr - 1, Math.floor(v.t / ap * dr)) : v.t < ap + dv ? Math.min(rel - 1, dr + Math.floor((v.t - ap) / dv * (rel - dr))) : Math.min(a.frames - 1, rel + Math.floor(Math.min(0.999999, (v.t - ap - dv) / REN_E.recover) * (a.frames - rel)));
    } else if (this.clip === 'Pound' && v) {
      const w = REN_R.windup, g = REN_R.gap, hit = [w, w + g, w + 2 * g, w + 2 * g + REN_R.finalGap], rel = a.events.release ?? 6, sb = a.events.strike_b ?? 13, fin = a.events.final ?? 18;
      let k = -1; for (let n = 0; n < 4; n++) if (v.t >= hit[n]) k = n;
      if (k < 0) frame = Math.min(rel - 1, Math.floor(v.t / w * rel));
      else if (k === 3) frame = Math.min(a.frames - 1, fin + Math.floor(Math.min(0.999999, (v.t - hit[3]) / REN_R.recover) * (a.frames - fin)));
      else { const base = [rel, sb, rel][k], since = v.t - hit[k], gap = hit[k + 1] - hit[k]; frame = since < 0.1 ? base : [10 + Math.floor(since / gap * 3), 3 + Math.floor(since / gap * 3), 17][k]; frame = Math.min(frame, a.frames - 1); }
    } else if (this.clip === 'NovaCharge' && v) {
      const hs = a.events.hold ?? 5, he = a.events.hold_end ?? 11;
      frame = v.charge < 0.25 ? Math.min(hs - 1, Math.floor(v.charge / 0.25 * hs)) : hs + Math.floor(v.charge * a.fps) % (he - hs + 1);
    } else if (this.clip === 'Lunge' && v) {
      frame = Math.min(a.frames - 1, Math.max(0, (a.events.release ?? 3) - 1) + Math.floor(Math.max(0, this.relT) * a.fps));
    } else if (this.clip === 'Dive' && this.landT >= 0) {
      const rel = a.events.release ?? 7, end = a.events.interruptible_from ?? 15; frame = Math.min(a.frames - 1, rel - 1 + Math.floor(Math.min(0.999, this.landT / 0.4) * Math.max(1, end - rel + 2)));
    } else if (this.clip === 'Beam' && v) {
      const hs = a.events.hold_start ?? 3, he = Math.max(hs, a.events.hold_end ?? hs + 3), rel = a.events.release ?? he + 1;
      if (!v.released) frame = v.charge < SORA.e.minCharge ? Math.min(hs - 1, Math.floor(v.charge / SORA.e.minCharge * hs)) : hs + Math.floor((v.charge - SORA.e.minCharge) * Math.max(8, a.fps)) % (he - hs + 1);
      else { const tf = v.t - SORA.e.maxCharge, tail = SORA.e.fire + SORA.e.recover; frame = Math.min(a.frames - 1, rel + Math.floor(Math.min(0.999, Math.max(0, tf) / tail) * (a.frames - rel))); }
    } else {
      const t = this.clip === 'Hurt' ? Math.max(0, this.hurtT) : this.clip === 'Death' ? Math.max(0, this.deathT) : this.time, raw = Math.floor(t * a.fps + 1e-6);
      frame = a.loop ? raw % a.frames : Math.min(a.frames - 1, raw);
    }
    return { facing: this.facing, clip: this.clip, frame, legs: this.clip === 'RunPunchUpper' ? this.leg() : null, form, events };
  }
}

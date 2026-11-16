/** B19: Ren / Sora clip selection. Same sheet contract as Kai (parseKaiManifest, KaiClip names, RunPunchUpper layering) so the renderer draws a pose the same way; only the state machine differs, because the hero's moves are driven by the sim's HeroCast timeline (never by a render-side guess).
 *  Clip meaning per hero is documented in art/characters/<hero>/ART-NOTES.md: BasicPunch = auto strike / Q beat (Ren) or needle / volley cast (Sora), Beam = Meteor Rush strike (Ren) or Celestial Lance (Sora), Sphere = Bloodstar Impact (Ren) or Zero Horizon (Sora). */
import { RUN_PHASES, SIM_DASH_SECONDS, facingFromInput, facingFromVector, type AnimPose, type Facing, type KaiClip, type KaiClipInfo, type KaiManifests } from './kaiAnimation';
import type { HeroAct } from '../content/heroKits';
import { REN, SORA } from '../content/heroKits';

/** Which hero sheet sets are complete (all four facings, every clip) and may be loaded. Flip to true only when public/art/<hero>[-f1]/ is fully built; until then the hero draws the clearly-marked dev placeholder body instead of half a rig. */
export const HERO_SHEETS: Record<'ren' | 'sora', { base: boolean; f1: boolean; anchors: boolean }> = { ren: { base: true, f1: true, anchors: true }, sora: { base: true, f1: true, anchors: true } };
export const HERO_REGISTRY_KEY = (hero: string, form: 'base' | 'f1') => `hero-${hero}-${form}-manifests`;
export const HERO_ANCHORS_KEY = (hero: string) => `hero-${hero}-anchors`;
export const heroRoot = (hero: string, form: 'base' | 'f1') => `/art/${hero}${form === 'f1' ? '-f1' : ''}`;
export const heroManifestUrl = (hero: string, dir: Facing, form: 'base' | 'f1') => `${heroRoot(hero, form)}/${dir}/manifest.json`;
export const heroSheetUrl = (hero: string, dir: Facing, clip: KaiClipInfo, form: 'base' | 'f1') => `${heroRoot(hero, form)}/${dir}/${clip.sheet}`;
export const heroAnchorsUrl = (hero: string) => `/art/${hero}-anchors.json`;
export const heroTextureKey = (hero: string, dir: Facing, clip: KaiClip, form: 'base' | 'f1') => `${hero}${form === 'f1' ? 'f1' : ''}-${dir}-${clip}`;

export interface HeroActView { id: number; act: HeroAct; t: number; dur: number; face: Facing; released: boolean; moving: boolean; beats: number; hop: number; hops: number; hopT: number; charge: number }
export interface HeroAnimInput {
  dt: number; alive: boolean; moving: boolean; inputX: number; inputY: number; runSpeed: number;
  dashing: boolean; dashX: number; dashY: number; dashRemaining: number; hurt: boolean;
  form: number; cinema: { t: number; dur: number; commitAt: number } | null;
  act: HeroActView | null;
  /** the sim's last automatic strike (time it happened, offset direction) */ strike: { t: number; x: number; y: number };
}
const FACING_DWELL = 0.12, DEATH_HOLD = 0.35, DASH_REC = 0.12;
const frameAt = (a: KaiClipInfo, u: number, lo = 0, hi = a.frames - 1) => Math.max(lo, Math.min(hi, lo + Math.floor(Math.min(0.999999, Math.max(0, u)) * (hi - lo + 1))));

export class HeroAnimator {
  facing: Facing = 'south'; clip: KaiClip = 'Idle'; visualForm: 'base' | 'f1' = 'base';
  private time = 0; private runTime = 0; private sinceTurn = 1; private hurtT = -1; private deathT = -1; private dashRec = -1; private dashWas = false; private dashProg = 0;
  private strikeT = -1; private lastStrike = -9; private actId = 0; private beatSeen = 0; private beatT = 99; private formPrev = 0; private moveNow = false; private cinemaOn = false; private cinemaT = 0; private cinemaCommit = 1; private cinemaDur = 1;
  private actView: HeroActView | null = null;
  constructor(readonly hero: 'ren' | 'sora', private readonly base: KaiManifests, private readonly f1?: KaiManifests) {}
  get dead() { return this.deathT >= 0; }
  deathPresented() { if (this.deathT < 0) return false; const d = this.info('Death'); return this.deathT >= d.frames / d.fps + DEATH_HOLD; }
  private set(form: 'base' | 'f1' = this.visualForm) { return form === 'f1' && this.f1 ? this.f1 : this.base; }
  private info(clip: KaiClip, form: 'base' | 'f1' = this.clip === 'Transform' ? 'f1' : this.visualForm): KaiClipInfo { return this.set(form)[this.facing].animations[clip] as KaiClipInfo; }
  private turn(f: Facing, force = false) { if (f !== this.facing && (force || this.sinceTurn >= FACING_DWELL)) { this.facing = f; this.sinceTurn = 0; } }
  private leg() { const r = this.info('Run'); return Math.floor(this.runTime * r.fps + 1e-6) % RUN_PHASES % r.frames; }

  update(i: HeroAnimInput): AnimPose {
    const events: AnimPose['events'] = [], ev = events as unknown as string[];
    if (!i.alive) { if (this.deathT < 0) { this.deathT = 0; this.hurtT = -1; this.dashRec = -1; this.strikeT = -1; this.cinemaOn = false; this.clip = 'Death'; if (i.form) this.visualForm = this.f1 ? 'f1' : 'base'; } else this.deathT += i.dt; return this.pose(events); }
    if (this.deathT >= 0) { this.deathT = -1; this.clip = 'Idle'; this.time = 0; this.visualForm = 'base'; this.formPrev = 0; this.cinemaOn = false; }
    this.sinceTurn += i.dt; this.moveNow = i.moving || i.dashing; this.actView = i.act;
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
    const want: KaiClip = this.hurtT >= 0 ? 'Hurt' : (i.dashing || this.dashRec >= 0) ? 'Dash' : a ? this.actClip(a, i.moving) : this.strikeT >= 0 ? (i.moving ? 'RunPunchUpper' : 'BasicPunch') : i.moving ? 'Run' : 'Idle';
    if (want !== this.clip) { this.clip = want; this.time = 0; }
    if (want === 'Run') this.time += runStep; else if (want === 'Idle') this.time += i.dt;
    return this.pose(events);
  }
  private actClip(a: HeroActView, moving: boolean): KaiClip {
    switch (a.act) {
      case 'crimson_break': case 'azure_volley': return moving ? 'RunPunchUpper' : 'BasicPunch';
      case 'meteor_rush': return a.hop < a.hops && a.hopT <= REN.e.hopTime ? 'Dash' : a.hop >= a.hops ? 'Dash' : 'BasicPunch';
      case 'bloodstar': case 'zero_horizon': return 'Sphere';
      case 'celestial_lance': return 'Beam';
    }
  }
  pose(events: AnimPose['events'] = []): AnimPose {
    const form = this.clip === 'Transform' ? 'f1' : this.visualForm, a = this.info(this.clip, form), v = this.actView; let frame = 0;
    if (this.clip === 'Dash') {
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
    } else if (this.clip === 'Sphere' && v) {
      const rel = a.events.release ?? Math.floor(a.frames / 2), tr = v.act === 'bloodstar' ? REN.r.windup + REN.r.flight : SORA.r.summon;
      frame = v.t < tr ? Math.min(rel - 1, Math.floor(v.t / tr * rel)) : Math.min(a.frames - 1, rel + Math.floor(Math.min(0.999999, (v.t - tr) / Math.max(0.05, v.dur - tr)) * (a.frames - rel)));
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

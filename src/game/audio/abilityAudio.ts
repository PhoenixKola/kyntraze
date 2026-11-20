import { B22Sfx, B22_EVENT_SFX, EVENT_SFX, kaiCombatSfx, signatureSfx } from './b22Sfx';
import { isBoss } from '../../content/enemies';
import type { AbilityEvent, EnemyEvent, GameState, Impact } from '../../sim/GameState';
import { MusicDirector, STINGERS, type MusicCue } from './music';
import { UPGRADES } from '../../content/upgrades';

/** Minimal slice of the Web Audio API the ability sounds need; real code passes a browser AudioContext, tests pass a fake. */
export interface GainLike { gain: { value: number; setTargetAtTime(v: number, t: number, tc: number): void }; connect(n: unknown): void; disconnect(): void }
export interface SourceLike { buffer: unknown; playbackRate: { value: number }; onended: (() => void) | null; connect(n: unknown): void; start(when?: number): void; stop(when?: number): void; disconnect(): void }
export interface CtxLike { state: string; currentTime: number; destination: unknown; createGain(): GainLike; createBufferSource(): SourceLike; resume(): Promise<void>; suspend(): Promise<void>; decodeAudioData(b: ArrayBuffer): Promise<unknown> }

export const ABILITY_SOUNDS = ['beam_charge', 'beam_charge_f1', 'beam_fire', 'beam_fire_f1', 'beam_pulse_0', 'beam_pulse_1', 'beam_pulse_2', 'beam_end', 'cast_cancel',
  'sphere_gather', 'sphere_gather_f1', 'sphere_throw', 'sphere_flight', 'sphere_burst', 'sphere_burst_f1',
  /** B12 Form II (art/characters/kai/abilities/audio/synth_b12.py) */
  'form2_charge', 'form2_break', 'form2_commit', 'form2_end', 'aura_crackle', 'dragon_windup', 'dragon_launch', 'dragon_hit', 'comet_gather', 'comet_fire', 'comet_end', 'finisher',
  /** B13 Form III (art/characters/kai/abilities/audio/synth_b13.py) */
  'form3_silence', 'form3_omen', 'form3_reveal', 'form3_end', 'aura_hover', 'glide', 'form3_dash', 'rift_charge', 'rift_blink', 'rift_fire', 'rift_end', 'reversal_hit_a', 'reversal_hit_b', 'reversal_hit_c', 'reversal_end', 'evasion', 'finisher3'] as const;
export type AbilitySound = (typeof ABILITY_SOUNDS)[number];
export const soundUrl = (n: string) => `/audio/kai-abilities/${n}.wav`;
/** B19 Ren / Sora (art/characters/heroes/audio/synth_b19.py): Ren is low and grounded, Sora high and crystalline. Names are unique, so the shared event kinds only differ by hero where the sim says so. */
export const HERO_SOUNDS = ['ren_auto_a', 'ren_auto_b', 'ren_auto_fin', 'ren_q_start', 'ren_q_beat', 'ren_q_fin', 'rush_start', 'rush_hop', 'rush_strike', 'rush_end', 'bloodstar_crouch', 'bloodstar_leap', 'bloodstar_slam', 'bloodstar_ring', 'bloodstar_rebound',
  'ren_ascend_charge', 'ren_ascend_break', 'ren_ascend_commit', 'ren_ascend_end', 'ren_aura',
  'needle_fire', 'volley_fire', 'lance_charge', 'lance_tier', 'lance_fire', 'lance_pulse', 'lance_end', 'horizon_summon', 'horizon_converge', 'horizon_burst', 'horizon_end',
  'sora_ascend_charge', 'sora_ascend_break', 'sora_ascend_commit', 'sora_ascend_end', 'sora_aura'] as const;
export type HeroSound = (typeof HERO_SOUNDS)[number];
export const heroSoundUrl = (n: string) => `/audio/hero-abilities/${n}.wav`;
/** B07 enemy sounds (original synthesis, art/enemies/audio/synth_b07.py). Quieter than Kai's, distance-attenuated, voice-capped so a crowd cannot bury the ability mix. */
export const ENEMY_SOUNDS = ['pursuer_wind', 'lunge', 'flanker_wind', 'slash', 'bruiser_wind', 'bruiser_slam', 'ranged_charge', 'ranged_shot', 'bolt_hit', 'death_small', 'death_heavy'] as const;
export type EnemySound = (typeof ENEMY_SOUNDS)[number];
export const enemySoundUrl = (n: string) => `/audio/enemies/${n}.wav`;
/** B08 boss and elite sounds (original synthesis, art/bosses/audio/synth_b08.py). Bosses are heard from further away and have their own voice slot so a crowd cannot bury a boss cue. */
export const BOSS_SOUNDS = ['boss_warning', 'warden_roar', 'warden_step', 'rupture_warn', 'rupture_burst', 'sweep_wind', 'sweep_hit', 'charge_wind', 'charge_hit', 'warden_hurt', 'warden_death',
  'seraph_arrive', 'seraph_volley_wind', 'seraph_volley_fire', 'seraph_blink_out', 'seraph_blink_in', 'seraph_ring_wind', 'seraph_ring_burst', 'seraph_spiral_pulse', 'seraph_phase', 'seraph_hurt', 'seraph_death',
  'aegis_brace', 'aegis_ram', 'aegis_block', 'cantor_charge', 'cantor_fire', 'cantor_aura_off'] as const;
export type BossSound = (typeof BOSS_SOUNDS)[number];
export const bossSoundUrl = (n: string) => `/audio/bosses/${n}.wav`;
/** B09 arena hazard and ambient sounds (art/arenas/audio/synth_b09.py). Ambient accents are rare, quiet and render-side only. */
export const ARENA_SOUNDS = ['surge_warn', 'surge_fire', 'pylon_charge', 'pylon_pulse', 'amb_gloam_a', 'amb_gloam_b', 'amb_ashen_a', 'amb_ashen_b'] as const;
export type ArenaSound = (typeof ARENA_SOUNDS)[number];
export const arenaSoundUrl = (n: string) => `/audio/arenas/${n}.wav`;
/** B15 combat feedback (art/combat/audio/synth_b15.py): one voice per presentation impact, coalesced so a crowd cannot turn into a buzz. */
/** B21 accents (art/combat/audio/synth_b21.py): impact frames, evolution sparks/echoes, shield break, boss damage, floor cracks, aura surges. Own 'cue' slot with a small voice cap and a per-sound minimum gap. */
export const B21_SOUNDS = ['impact_frame', 'evo_spark', 'evo_echo', 'shield_shatter', 'shield_down', 'boss_crack', 'floor_crack', 'aura_surge_ren', 'aura_surge_sora', 'aura_surge_gold', 'aura_surge_silver'] as const;
export type B21Sound = (typeof B21_SOUNDS)[number];
export const b21SoundUrl = (n: string) => `/audio/b21/${n}.wav`;
export const B21_MIX = { maxVoices: 3, minGap: 0.09 } as const;
export const COMBAT_SOUNDS = ['hit_light', 'hit_heavy', 'hit_boss', 'block_deflect', 'player_hurt', 'revive', 'form1_ignite'] as const;
export type CombatSound = (typeof COMBAT_SOUNDS)[number];
export const combatSoundUrl = (n: string) => `/audio/combat/${n}.wav`;
export const COMBAT_MIX = { light: 0.34, heavy: 0.7, boss: 0.65, block: 0.6, hurt: 0.85, maxHitVoices: 3, minGapLight: 0.07, minGapHeavy: 0.09, hearRange: 700 } as const;
/** B16 UI / progression sounds (art/audio/ui/synth_b16_ui.py). They play on their own bus so the Settings UI slider governs them. */
export const UI_SOUNDS = ['ui_hover', 'ui_click', 'ui_confirm', 'ui_back', 'ui_pause', 'ui_resume', 'ui_toggle_on', 'ui_toggle_off', 'ui_slider', 'lv_pick', 'lv_epic', 'xp_pickup', 'drive_ready'] as const;
export type UiSound = (typeof UI_SOUNDS)[number];
export const uiSoundUrl = (n: string) => `/audio/ui/${n}.wav`;
const UI_SET: ReadonlySet<string> = new Set(UI_SOUNDS.filter(n => n !== 'xp_pickup' && n !== 'drive_ready'));
/** User mix: every value 0..1. Trims keep the default mix sensible (score under effects, UI under both). */
export interface Volumes { master: number; music: number; sfx: number; ui: number }
export const DEFAULT_VOLUMES: Volumes = { master: 1, music: 0.7, sfx: 1, ui: 0.8 };
/** seconds of near-silence between the finale boss falling and the victory theme */
export const VICTORY_BEAT_S = 1.7;
const TRIM = { master: 0.8, music: 0.5, sfx: 1, ui: 0.7 } as const;
export const ARENA_MIX = { level: 0.62, hearRange: 1400, minGain: 0.4, ambient: 0.16, ambientMin: 14, ambientMax: 30 } as const;
export const BOSS_MIX = { level: 0.78, hearRange: 1100, minGain: 0.45, maxVoices: 4, minGap: 0.045 } as const;
export const ENEMY_MIX = { level: 0.5, hearRange: 620, minGain: 0.12, maxVoices: 6, minGap: 0.045 } as const;
/** Voice slots: a new sound in a slot replaces the old one (no stacked charge swells, one beam body, one burst). `pulse` allows two overlapping zaps. */
type Slot = 'cue' | 'zap' | 'ui' | 'hit' | 'hurt' | 'charge' | 'fire' | 'flight' | 'burst' | 'pulse' | 'misc' | 'enemy' | 'boss' | 'aura';
const MAX_PULSE_VOICES = 2;
/** B19: the very frequent tiny sounds (Ren's auto punches, Sora's needles) share two voices and a minimum gap, so a fast fire rate can never become a buzz. */
export const HERO_ZAP = { maxVoices: 2, minGap: 0.1 } as const;

interface Voice { src: SourceLike; gain: GainLike; slot: Slot; name: string }

export class AbilityAudio {
  private buffers = new Map<string, unknown>();
  private voices = new Set<Voice>();
  private master: GainLike | null = null;
  private busMusic: GainLike | null = null; private busSfx: GainLike | null = null; private busUi: GainLike | null = null;
  private volumes: Volumes = { ...DEFAULT_VOLUMES };
  music: MusicDirector | null = null;
  private wantCue: MusicCue | null = null;
  private lastEvent = 0;
  private pulseCycle = 0;
  private muted = false;
  private loading: Promise<void> | null = null;
  private lastPhase = '';
  private nextHover = 0;
  /** QA: every sound that actually started, in order. */
  readonly started: string[] = [];
  constructor(private readonly ctx: CtxLike, private readonly fetchBuffer: (url: string) => Promise<ArrayBuffer>) {}

  get activeVoices() { return this.voices.size; }
  get loaded() { return this.buffers.size; }
  get state() { return this.ctx.state; }

  /** Call from a user gesture (keydown / pointerdown): resumes the context and decodes the sounds once. */
  unlock(): Promise<void> {
    void this.ctx.resume().catch(() => undefined);
    if (!this.master) {
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.volumes.master * TRIM.master; this.master.connect(this.ctx.destination);
      const bus = (v: number) => { const g = this.ctx.createGain(); g.gain.value = v; g.connect(this.master!); return g; };
      this.busMusic = bus(this.volumes.music * TRIM.music); this.busSfx = bus(this.volumes.sfx * TRIM.sfx); this.busUi = bus(this.volumes.ui * TRIM.ui);
      this.music = new MusicDirector(this.ctx, this.busMusic, this.fetchBuffer);
      void this.music.preload(['title', ...STINGERS]).then(() => { if (this.wantCue) this.music?.setCue(this.wantCue, 0.8); });
      if (this.wantCue) this.music.setCue(this.wantCue, 0.8);
    }
    this.loading ??= Promise.all([...ABILITY_SOUNDS.map(n => [n, soundUrl(n)] as const), ...ENEMY_SOUNDS.map(n => [n, enemySoundUrl(n)] as const), ...BOSS_SOUNDS.map(n => [n, bossSoundUrl(n)] as const), ...ARENA_SOUNDS.map(n => [n, arenaSoundUrl(n)] as const), ...COMBAT_SOUNDS.map(n => [n, combatSoundUrl(n)] as const), ...B21_SOUNDS.map(n => [n, b21SoundUrl(n)] as const), ...UI_SOUNDS.map(n => [n, uiSoundUrl(n)] as const)].map(async ([n, url]) => { try { this.buffers.set(n, await this.ctx.decodeAudioData(await this.fetchBuffer(url))); } catch { /* a missing sound must never break the game */ } })).then(() => undefined);
    return this.loading;
  }

  setMuted(m: boolean) {
    if (m === this.muted) return;
    this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volumes.master * TRIM.master, this.ctx.currentTime, 0.01); if (m) this.stopAll(0.02);
  }
  /** Settings sliders: smooth, immediate, also for sounds already playing (the buses carry the level). */
  setVolumes(v: Partial<Volumes>) {
    const clean = (x: number | undefined, d: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x as number : d)); const t = this.ctx.currentTime;
    this.volumes = { master: clean(v.master ?? this.volumes.master, 1), music: clean(v.music ?? this.volumes.music, 0.7), sfx: clean(v.sfx ?? this.volumes.sfx, 1), ui: clean(v.ui ?? this.volumes.ui, 0.8) };
    if (this.master && !this.muted) this.master.gain.setTargetAtTime(this.volumes.master * TRIM.master, t, 0.02);
    this.busMusic?.gain.setTargetAtTime(this.volumes.music * TRIM.music, t, 0.02); this.busSfx?.gain.setTargetAtTime(this.volumes.sfx * TRIM.sfx, t, 0.02); this.busUi?.gain.setTargetAtTime(this.volumes.ui * TRIM.ui, t, 0.02);
  }
  get volume() { return { ...this.volumes }; }
  /** Menu / scene music request; applied as soon as the context is unlocked by a real gesture. */
  setCue(cue: MusicCue | null, fadeS = 1.4) { this.wantCue = cue; this.music?.setCue(cue, fadeS); }
  /** A UI sound (hover / click / toggle ...). Honours mute and the UI slider; keeps its own tiny voice cap. */
  ui(name: UiSound, vol = 1, rate = 1) { this.play(name, 'ui', vol, rate); }

  private lastCue = new Map<string, number>();
  /** B21 accent, fired by a presentation layer exactly when its visual lands. */
  cue(name: B21Sound, vol = 1, rate = 1) { const now = this.ctx.currentTime, last = this.lastCue.get(name) ?? -9; if (now - last < B21_MIX.minGap) return; this.lastCue.set(name, now); this.play(name, 'cue', vol, rate); }
  private lastEnemy = new Map<string, number>();
  private lastEnemyEvent = 0;
  private play(name: AbilitySound | EnemySound | BossSound | ArenaSound | CombatSound | UiSound | HeroSound | B21Sound, slot: Slot, vol = 1, rate = 1) {
    const buf = this.buffers.get(name); if (!buf || !this.master || this.muted) return;
    if (slot === 'ui') { if ([...this.voices].filter(v => v.slot === 'ui').length >= 4) return; }
    else if (slot === 'enemy') { if ([...this.voices].filter(v => v.slot === 'enemy').length >= ENEMY_MIX.maxVoices) return; }
    else if (slot === 'boss') { if ([...this.voices].filter(v => v.slot === 'boss').length >= BOSS_MIX.maxVoices) return; }
    else if (slot === 'hit') { if ([...this.voices].filter(v => v.slot === 'hit').length >= COMBAT_MIX.maxHitVoices) return; }
    else if (slot === 'cue') { if ([...this.voices].filter(v => v.slot === 'cue').length >= B21_MIX.maxVoices) return; }
    else if (slot === 'zap') { if ([...this.voices].filter(v => v.slot === 'zap').length >= HERO_ZAP.maxVoices) return; }
    else if (slot === 'pulse') { if ([...this.voices].filter(v => v.slot === 'pulse').length >= MAX_PULSE_VOICES) return; }
    else this.stopSlot(slot, 0.03);
    const src = this.ctx.createBufferSource(), gain = this.ctx.createGain(); src.buffer = buf; src.playbackRate.value = rate; gain.gain.value = vol;
    src.connect(gain); gain.connect((UI_SET.has(name) ? this.busUi : this.busSfx) ?? this.master); const v: Voice = { src, gain, slot, name };
    src.onended = () => { this.voices.delete(v); try { src.disconnect(); gain.disconnect(); } catch { /* already gone */ } };
    this.voices.add(v); this.started.push(name); src.start();
  }
  private stopVoice(v: Voice, fadeS: number) {
    this.voices.delete(v); const t = this.ctx.currentTime;
    try { v.gain.gain.setTargetAtTime(0, t, Math.max(0.004, fadeS / 4)); v.src.stop(t + fadeS + 0.02); } catch { /* already stopped */ }
  }
  private stopSlot(slot: Slot, fadeS: number) { for (const v of [...this.voices]) if (v.slot === slot) this.stopVoice(v, fadeS); }
  /** Cancelled / dead / muted / disposed: nothing may keep sounding. */
  stopAll(fadeS = 0.04, keepUi = false) { for (const v of [...this.voices]) if (!(keepUi && v.slot === 'ui')) this.stopVoice(v, fadeS); }

  /** Apply one sim event. Sounds follow the simulation (charge / release / pulse / burst ticks), never display frame callbacks. */
  handle(ev: AbilityEvent, form: 0 | 1 | 2 | 3, hero: 'kai' | 'ren' | 'sora' | 'vex' = 'kai') {
    if (hero !== 'kai' && this.handleHero(ev, hero === 'vex' ? 'ren' : hero)) return;
    const f1 = form >= 1 ? '_f1' : '';
    switch (ev.kind) {
      // B12 Form II: every voice is started and stopped by a sim event, so the sound follows the timeline exactly (and cancel / death / pause silence it through the shared slots)
      case 'form2_start': if (ev.n) { this.play('form2_charge', 'charge', 1, 2.0 / 1.55); } else this.play('dragon_windup', 'charge', 0.9, 0.6); break;
      case 'form2_break': this.stopSlot('charge', 0.03); this.play('form2_break', 'burst'); break;
      case 'form2_commit': this.play('form2_commit', 'fire'); break;
      case 'form2_end': this.stopSlot('aura', 0.1); this.play('form2_end', 'misc', 0.8); break;
      case 'dragon_windup': this.play('dragon_windup', 'charge'); break;
      case 'dragon_launch': this.stopSlot('charge', 0.02); this.play('dragon_launch', 'fire'); break;
      case 'dragon_hit': this.play('dragon_hit', 'pulse', 1, 0.95 + Math.random() * 0.1); break;
      case 'comet_gather': this.play('comet_gather', 'charge'); break;
      case 'comet_fire': this.stopSlot('charge', 0.03); this.play('comet_fire', 'fire'); break;
      case 'comet_end': this.stopSlot('fire', 0.14); this.play('comet_end', 'misc', 0.8); break;
      case 'finisher': this.play('finisher', 'burst'); break;
      // B13 Form III: quiet and precise; the same slots, so charge / hover / beam voices can never outlive their sim state
      case 'form3_start': this.stopSlot('aura', 0.05); this.play('form3_silence', 'charge', ev.n ? 1 : 0.7, ev.n ? 1 : 1.4); break;
      case 'form3_omen': this.play('form3_omen', 'misc', 0.8); break;
      case 'form3_commit': this.stopSlot('charge', 0.05); this.play('form3_reveal', 'fire', ev.n === 0 ? 0.9 : 1, 1); break;
      case 'form3_end': this.stopSlot('aura', 0.12); this.stopSlot('charge', 0.04); this.play('form3_end', 'misc', 0.8); break;
      case 'form3_dash': this.play('form3_dash', 'misc', 0.9, 0.95 + Math.random() * 0.1); break;
      case 'rift_charge': this.play('rift_charge', 'charge', 0.85, 0.68); break;
      case 'rift_blink': this.play('rift_blink', 'misc', 0.9); break;
      case 'rift_fire': this.stopSlot('charge', 0.03); this.play('rift_fire', 'fire', 0.7 + 0.15 * (ev.n ?? 0), 1.1 - 0.05 * (ev.n ?? 0)); break;
      case 'rift_end': this.stopSlot('fire', 0.1); this.play('rift_end', 'misc', 0.7); break;
      case 'reversal_hit': this.play((['reversal_hit_a', 'reversal_hit_b', 'reversal_hit_c'] as const)[(ev.n ?? 0) % 3], 'pulse', 0.9, 1 + 0.06 * (ev.n ?? 0)); break;
      case 'reversal_end': this.play('reversal_end', 'burst', ev.n ? 0.9 : 0.4); break;
      case 'evasion': this.play('evasion', 'misc', 1); break;
      case 'finisher3': this.stopSlot('aura', 0.05); this.play('finisher3', 'burst'); break;
      case 'beam_charge': this.play(`beam_charge${f1}` as AbilitySound, 'charge'); break;
      case 'beam_fire': this.stopSlot('charge', 0.04); this.play(`beam_fire${f1}` as AbilitySound, 'fire'); break;
      case 'beam_pulse': this.play(`beam_pulse_${this.pulseCycle++ % 3}` as AbilitySound, 'pulse', ev.n ? 1 : 0.45, 0.97 + Math.random() * 0.06); break;
      case 'beam_end': this.stopSlot('fire', 0.07); this.stopSlot('pulse', 0.04); this.play('beam_end', 'misc', 0.8); break;
      case 'cast_cancel': this.stopSlot('aura', 0.05); this.stopSlot('charge', 0.03); this.stopSlot('fire', 0.04); this.stopSlot('flight', 0.04); this.play('cast_cancel', 'misc', 0.8); break;
      case 'sphere_gather': this.play(`sphere_gather${f1}` as AbilitySound, 'charge'); break;
      case 'sphere_launch': this.stopSlot('charge', 0.06); this.play('sphere_throw', 'misc'); this.play('sphere_flight', 'flight', 0.9); break;
      case 'sphere_burst': this.stopSlot('flight', 0.03); this.play(`sphere_burst${f1}` as AbilitySound, 'burst'); break;
    }
  }

  private zapAt = -1; private autoCycle = 0; private heroLoading: Promise<void> | null = null;
  /** B19: Ren / Sora sounds are fetched on demand (first hero run), so Kai-only play never downloads them. Safe to call every frame. */
  loadHeroSounds(): Promise<void> {
    this.heroLoading ??= Promise.all(HERO_SOUNDS.map(async n => { try { this.buffers.set(n, await this.ctx.decodeAudioData(await this.fetchBuffer(heroSoundUrl(n)))); } catch { /* a missing sound must never break the game */ } })).then(() => undefined);
    return this.heroLoading;
  }
  /** B19: Ren / Sora events. Every voice is started and stopped by a sim event and lives in the shared slots, so cancel / death / pause / level-up silence it exactly like Kai's. Returns false for kinds it does not own (cast_cancel stays shared). */
  private handleHero(ev: AbilityEvent, hero: 'ren' | 'sora'): boolean {
    const n = ev.n ?? 0, now = this.ctx.currentTime;
    switch (ev.kind) {
      case 'ascend_start': this.stopSlot('aura', 0.05); this.play(hero === 'ren' ? 'ren_ascend_charge' : 'sora_ascend_charge', 'charge', n ? 1 : 0.85, n ? 1.6 / 1.55 : 2.0); return true;   // n = 1: the first, long reveal; later ones are shorter
      case 'ascend_break': this.stopSlot('charge', 0.03); this.play(hero === 'ren' ? 'ren_ascend_break' : 'sora_ascend_break', 'burst'); return true;
      case 'ascend_commit': this.play(hero === 'ren' ? 'ren_ascend_commit' : 'sora_ascend_commit', 'fire'); return true;
      case 'ascend_end': this.stopSlot('aura', 0.1); this.play(hero === 'ren' ? 'ren_ascend_end' : 'sora_ascend_end', 'misc', 0.8); return true;
      case 'auto_finisher': this.play('ren_auto_fin', 'burst', 0.85); return true;
      case 'auto_hit': if (now - this.zapAt >= HERO_ZAP.minGap) { this.zapAt = now; this.play(this.autoCycle++ % 2 ? 'ren_auto_b' : 'ren_auto_a', 'zap', 0.7, 0.96 + Math.random() * 0.08); } return true;
      case 'needle_fire': if (now - this.zapAt >= HERO_ZAP.minGap) { this.zapAt = now; this.play('needle_fire', 'zap', 0.55, 0.94 + Math.random() * 0.12); } return true;
      case 'hero_q': if (hero === 'ren') this.play('ren_q_start', 'misc', 0.8); return true;
      case 'hero_q_beat': { const last = (n & 128) !== 0, beat = n >> 8; if (last) this.play('ren_q_fin', 'burst'); else this.play('ren_q_beat', 'pulse', 0.85, 1 + 0.045 * beat); return true; }
      case 'rush_start': this.play('rush_start', 'fire', 0.85); return true;
      case 'rush_hop': this.play('rush_hop', 'misc', 0.7, 0.92 + 0.06 * (n % 4)); return true;
      case 'rush_strike': this.play('rush_strike', 'burst', 0.8 + 0.2 * Math.min(1, n / 3), 0.95 + Math.random() * 0.1); return true;
      case 'rush_end': this.stopSlot('fire', 0.05); this.play('rush_end', 'misc', 0.6); return true;
      case 'bloodstar_crouch': this.play('bloodstar_crouch', 'charge', 0.85); return true;
      case 'bloodstar_leap': this.stopSlot('charge', 0.04); this.play('bloodstar_leap', 'fire'); return true;
      case 'bloodstar_slam': this.stopSlot('fire', 0.03); this.play('bloodstar_slam', 'burst'); this.play('bloodstar_ring', 'misc', 0.7); this.eventDuck = { until: now + 1.4, level: 0.55 }; return true;
      case 'bloodstar_ring': return true;   // the ring is part of the slam tail
      case 'bloodstar_rebound': this.play('bloodstar_rebound', 'flight', 0.9); return true;
      case 'bloodstar_end': this.stopSlot('fire', 0.05); return true;
      case 'volley_fire': this.play('volley_fire', 'fire', 0.85, Math.max(0.85, 1 - 0.02 * (n - 7))); return true;
      case 'lance_charge': this.play('lance_charge', 'charge', 0.8); return true;
      case 'lance_tier': this.play('lance_tier', 'misc', 0.7, 1 + 0.12 * (n - 1)); return true;
      case 'lance_fire': this.stopSlot('charge', 0.04); this.play('lance_fire', 'fire', 0.75 + 0.1 * n, 1.05 - 0.05 * n); return true;
      case 'lance_pulse': this.play('lance_pulse', 'pulse', n ? 0.55 : 0.3, 0.97 + Math.random() * 0.06); return true;
      case 'lance_end': this.stopSlot('fire', 0.1); this.stopSlot('pulse', 0.04); this.play('lance_end', 'misc', 0.7); return true;
      case 'horizon_summon': this.play('horizon_summon', 'charge', 0.9); return true;
      case 'horizon_converge': this.stopSlot('charge', 0.08); this.play('horizon_converge', 'flight', 0.9); return true;
      case 'horizon_burst': this.stopSlot('flight', 0.02); this.play('horizon_burst', 'burst', n ? 0.95 : 0.6); this.eventDuck = { until: now + 1.0, level: 0.6 }; return true;
      case 'horizon_end': this.play('horizon_end', 'misc', 0.5); return true;
      default: return false;
    }
  }

  private lastImpact = 0; private lastXp = -1; private xpRate = 1; private lastHitAt = new Map<string, number>();
  /** One sim impact -> sound. Light hits are quiet, short and rate-limited; heavy / boss / block / hurt are distinct and each get their own gap so none can mask another. A kill is covered by its enemy_death sound, so a killing blow plays the heavy hit only when it was heavy. */
  handleImpact(e: Impact, px: number, py: number) {
    const d = Math.hypot(e.x - px, e.y - py); if (d > COMBAT_MIX.hearRange && e.kind !== 'hurt' && e.kind !== 'revive') return;
    const fall = Math.max(0.35, 1 - d / COMBAT_MIX.hearRange), now = this.ctx.currentTime;
    const gate = (k: string, gap: number) => { if (now - (this.lastHitAt.get(k) ?? -1) < gap) return false; this.lastHitAt.set(k, now); return true; };
    const rate = 0.95 + Math.random() * 0.1;
    if (e.kind === 'xp') { const streak = now - this.lastXp < 0.4 ? Math.min(1.7, this.xpRate * 1.05) : 1; this.lastXp = now; this.xpRate = streak; if (gate('xp', 0.045)) this.play('xp_pickup', 'ui', 0.8, streak); }
    else if (e.kind === 'hurt') { if (gate('hurt', 0.12)) this.play('player_hurt', 'hurt', COMBAT_MIX.hurt * (e.heavy ? 1 : 0.8), rate); }
    else if (e.kind === 'revive') this.play('revive', 'misc', 0.9);
    else if (e.kind === 'form') { this.play('form1_ignite', 'burst', 0.95); this.eventDuck = { until: this.ctx.currentTime + 1.1, level: 0.5 }; }
    else if (e.kind === 'block') { if (gate('block', 0.1)) this.play('block_deflect', 'hit', COMBAT_MIX.block * fall, rate); }
    else if (e.kind === 'hit') {
      if (e.boss) { if (gate('boss', COMBAT_MIX.minGapHeavy)) this.play('hit_boss', 'hit', COMBAT_MIX.boss * fall, rate); }
      else if (e.heavy) { if (gate('heavy', COMBAT_MIX.minGapHeavy)) this.play('hit_heavy', 'hit', COMBAT_MIX.heavy * fall, rate); }
      else if (gate('light', COMBAT_MIX.minGapLight)) this.play('hit_light', 'hit', COMBAT_MIX.light * fall, rate);
    }
  }

  /** One enemy event -> sound. Only attacks near the player are heard, loudness falls with distance, and the same sound cannot restart within a few ms. */
  handleEnemy(ev: EnemyEvent, px: number, py: number) {
    if ((ev.kind === 'hazard_warn' || ev.kind === 'hazard_fire') && (ev.tag === 'surge' || ev.tag === 'pylon')) {
      const d = Math.hypot(ev.x - px, ev.y - py), g = ARENA_MIX.level * Math.max(ARENA_MIX.minGain, 1 - d / ARENA_MIX.hearRange);
      this.play(ev.tag === 'surge' ? (ev.kind === 'hazard_warn' ? 'surge_warn' : 'surge_fire') : (ev.kind === 'hazard_warn' ? 'pylon_charge' : 'pylon_pulse'), 'boss', g); return;
    }
    const boss = ev.enemy === 'warden' || ev.enemy === 'seraph' || ev.kind === 'hazard_fire' || ev.kind === 'enemy_phase' || ev.kind === 'enemy_intro';
    const d = Math.hypot(ev.x - px, ev.y - py), mix = boss ? BOSS_MIX : ENEMY_MIX; if (d > mix.hearRange) return;
    const gain = mix.level * Math.max(mix.minGain, 1 - d / mix.hearRange);
    const say = (n: EnemySound | BossSound, v = 1) => {
      const now = this.ctx.currentTime, last = this.lastEnemy.get(n) ?? -1;
      if (now - last < mix.minGap) return; this.lastEnemy.set(n, now); this.play(n, boss ? 'boss' : 'enemy', gain * v);
    };
    const tag = ev.tag ?? '', k = ev.enemy;
    switch (ev.kind) {
      case 'enemy_intro': this.music?.stinger('stinger_boss', 0.9); this.eventDuck = { until: this.ctx.currentTime + 2.2, level: 0.5 }; say('boss_warning', 0.9); say(k === 'warden' ? 'warden_roar' : 'seraph_arrive'); break;
      case 'enemy_phase': say(k === 'warden' ? 'warden_roar' : 'seraph_phase'); break;
      case 'enemy_hurt': say(k === 'warden' ? 'warden_hurt' : 'seraph_hurt', 0.8); break;
      case 'enemy_block': say('aegis_block', 0.9); break;
      case 'hazard_fire': if (tag === 'rupture' || tag === 'residue') say('rupture_burst', 0.9); break;
      case 'enemy_telegraph':
        if (k === 'warden') say(tag === 'rupture' ? 'rupture_warn' : tag === 'rush' ? 'charge_wind' : 'sweep_wind');
        else if (k === 'seraph') say(tag === 'ring' || tag === 'spiral' ? 'seraph_ring_wind' : tag === 'blink' ? 'seraph_blink_out' : 'seraph_volley_wind');
        else say(k === 'pursuer' ? 'pursuer_wind' : k === 'flanker' ? 'flanker_wind' : k === 'bruiser' ? 'bruiser_wind' : k === 'aegis' ? 'aegis_brace' : k === 'cantor' ? 'cantor_charge' : 'ranged_charge');
        break;
      case 'enemy_strike':
        if (k === 'warden') { if (tag === 'sweep') say('sweep_hit'); else if (tag === 'rush_end') say('charge_hit'); }
        else if (k === 'seraph') { if (tag === 'blink_in') say('seraph_blink_in'); }
        else if (k === 'pursuer') say('lunge'); else if (k === 'flanker') say('slash'); else if (k === 'aegis') say('aegis_ram');
        break;
      case 'enemy_slam': say('bruiser_slam', 1.3); break;
      case 'enemy_shot':
        if (k === 'seraph') say(tag === 'ring' ? 'seraph_ring_burst' : tag === 'spiral' ? 'seraph_spiral_pulse' : 'seraph_volley_fire');
        else say(k === 'cantor' ? 'cantor_fire' : 'ranged_shot');
        break;
      case 'enemy_shot_hit': say('bolt_hit', 0.8); break;
      case 'enemy_death':
        if (k === 'warden') say('warden_death'); else if (k === 'seraph') say('seraph_death');
        else if (k === 'cantor') { say('death_small', 0.8); say('cantor_aura_off', 0.7); }
        else say(k === 'bruiser' || k === 'aegis' ? 'death_heavy' : 'death_small', k === 'bruiser' || k === 'aegis' ? 1.1 : 0.8);
        break;
    }
  }

  private nextAmbient = 0;
  private nextCrackle = 0;
  /** A rare, quiet distant accent for the arena (not a soundtrack): one of two sounds every ~14-30 s of running time. Render-side randomness only; the sim never sees it. */
  ambient(arena: 'gloam' | 'ashen' | 'aetherfall' | 'paradox', time: number) {
    if (arena === 'aetherfall' || arena === 'paradox') return;   // realm ambience is part of the realm score (b22 audio)
    if (this.nextAmbient === 0) { this.nextAmbient = time + 10 + Math.random() * 10; return; }
    if (time < this.nextAmbient) return;
    this.nextAmbient = time + ARENA_MIX.ambientMin + Math.random() * (ARENA_MIX.ambientMax - ARENA_MIX.ambientMin);
    if (this.voices.size > 0) return;
    this.play(`amb_${arena}_${Math.random() < 0.5 ? 'a' : 'b'}` as ArenaSound, 'misc', ARENA_MIX.ambient);
  }

  private victorySeen = -1; private lastDrive = 0; private lastBosses = 0; private finalWarned = false; private eventDuck = { until: 0, level: 1 }; private lastDuck = -1; private preloaded = '';
  /** The score follows the simulation: arena theme, boss themes while a boss is alive, victory / defeat, ducking for pause, level-up, boss warnings and transformation reveals. */
  private driveMusic(s: GameState) {
    const m = this.music; if (!m) return;
    if (this.preloaded !== s.arenaId) { this.preloaded = s.arenaId; void m.preload([s.arenaId, 'warden', 'seraph', 'victory', 'defeat']); }
    const boss = s.enemies.find(e => e.hp > 0 && isBoss(e.kind) && !e.part);
    if (s.phase === 'victory') {   // B17: the Seraph's death is staged for ~2 s; the score drops to a near-silent beat, then the victory theme enters on the shimmer
      if (this.victorySeen < 0) this.victorySeen = this.ctx.currentTime;
      if (this.ctx.currentTime - this.victorySeen < VICTORY_BEAT_S) m.setCue(null, 0.5); else m.setCue('victory', 0.15);
    } else if (s.phase === 'dead') m.setCue('defeat', 0.5); else m.setCue(boss ? boss.kind as MusicCue : s.arenaId, boss ? 0.9 : 2.4);
    if (s.time < 5) { this.finalWarned = false; this.lastBosses = s.bossesDefeated; }
    if (s.phase === 'running') {
      if (s.hero === 'kai' && s.player.drive >= 65 && this.lastDrive < 65 && s.player.form === 0) this.ui('drive_ready', 0.9); else if (s.player.drive >= 100 && this.lastDrive < 100) this.ui('drive_ready', 0.9, 1.25);
      this.lastDrive = s.player.drive;
      if (s.bossesDefeated > this.lastBosses && s.phase === 'running') { m.stinger('stinger_reward'); this.eventDuck = { until: this.ctx.currentTime + 2.5, level: 0.55 }; }
      this.lastBosses = s.bossesDefeated;
      if (!this.finalWarned && s.time >= 870 && s.time < 900 && !boss) { this.finalWarned = true; m.stinger('stinger_final_warning'); this.eventDuck = { until: this.ctx.currentTime + 4, level: 0.45 }; }
    }
    // duck level = the strictest of: phase, transformation reveal, recent event
    let level = s.phase === 'paused' ? 0.3 : s.phase === 'upgrade' ? 0.5 : 1;
    if (s.cinema) level = Math.min(level, s.cinema.to === 3 ? (s.cinema.first ? 0.04 : 0.15) : s.cinema.first ? 0.3 : 0.5);
    if (this.ctx.currentTime < this.eventDuck.until) level = Math.min(level, this.eventDuck.level);
    if (Math.abs(level - this.lastDuck) > 0.001) { m.setDuck(level, level < this.lastDuck ? 0.08 : 0.5); this.lastDuck = level; }
  }

  /** Per render frame: feed new sim events, follow the run phase (pause freezes sound, death silences casts). */
  sync(s: GameState) {
    if (s.hero !== 'kai' && this.master) void this.loadHeroSounds();
    if (s.phase !== this.lastPhase) {
      // the context stays running (music + UI keep playing); sim-driven effect voices are cut so nothing from a frozen moment lingers
      void this.ctx.resume().catch(() => undefined);
      if (s.phase !== 'running') this.stopAll(s.phase === 'dead' ? 0.06 : 0.04, true);
      if (this.lastPhase === 'running' && s.phase === 'paused') this.ui('ui_pause');
      else if (this.lastPhase === 'paused' && s.phase === 'running') this.ui('ui_resume');
      else if (s.phase === 'upgrade' && this.lastPhase !== 'upgrade') { this.music?.stinger('stinger_levelup', 0.8); const rar = s.upgradeOffers.map(id => UPGRADES.find(u => u.id === id)?.rarity); if (rar.includes('epic')) this.ui('lv_epic', 0.9); else if (rar.includes('rare')) this.ui('lv_epic', 0.5, 0.82); }   // B20: Rare offers get a lower, softer take of the same chime
      this.lastPhase = s.phase;
    }
    this.driveMusic(s);
    if (s.phase === 'running') this.ambient(s.arenaId, s.time);
    if (s.phase === 'running' && s.hero !== 'kai' && s.player.form === 1 && !s.cinema && s.time >= this.nextHover) { this.nextHover = s.time + 1.9; this.play(s.hero === 'ren' ? 'ren_aura' : 'sora_aura', 'aura', 0.55); }   // B19: the transformed state's very soft sustained bed, re-armed from the sim clock like Kai's hover
    if (s.phase === 'running' && s.hero === 'kai' && s.player.form === 3 && !s.cinema && s.time >= this.nextHover) { this.nextHover = s.time + 1.9; this.play('aura_hover', 'aura', 0.55); }   // B13: a very soft sustained hover tone, re-armed from the sim clock so pause / death / form end silence it
    if (s.phase === 'running' && s.player.form === 2 && !s.cinema && s.time >= this.nextCrackle) { this.nextCrackle = s.time + 2.4 + Math.random() * 3; this.play('aura_crackle', 'aura', 0.55); }   // a quiet low crackle while Form II burns
    for (const im of s.impacts) {
      if (im.id <= this.lastImpact) continue; this.lastImpact = im.id;
      if (s.phase === 'running') this.handleImpact(im, s.player.x, s.player.y);
    }
    for (const ev of s.abilityEvents) {
      if (ev.id <= this.lastEvent) continue; this.lastEvent = ev.id;
      if (s.phase === 'running' || (s.phase === 'victory' && ev.kind === 'finisher')) this.handle(ev, s.hero === 'kai' ? (s.cast?.form ?? s.sphere?.form ?? s.player.form) : (s.player.form === 1 ? 1 : 0), s.hero);
    }
    for (const ev of s.enemyEvents) {
      if (ev.id <= this.lastEnemyEvent) continue; this.lastEnemyEvent = ev.id;
      if (s.phase === 'running') { this.handleEnemy(ev, s.player.x, s.player.y); this.b22Enemy(ev); }
    }
    this.b22Sync(s);
  }
  /** B22 sounds: runtime-synthesised recipes (see b22Sfx.ts), one per B22 sim event; only while the run is live, each id once. */
  private readonly b22sfx = new B22Sfx(); private b22Cur = 0; private b22Ab = 0; private b22Last = new Map<string, number>();
  private b22Play(name: string, gain = 1) {
    const ctx = this.ctx as unknown as AudioContext; if (!this.busSfx || typeof ctx.createBuffer !== 'function') return;
    const now = this.ctx.currentTime; if (now - (this.b22Last.get(name) ?? -9) < 0.06) return; this.b22Last.set(name, now);
    const buf = this.b22sfx.buffer(ctx, name); if (!buf) return; const src = this.ctx.createBufferSource(), g = this.ctx.createGain(); (src as unknown as { buffer: AudioBuffer }).buffer = buf; g.gain.value = gain * 0.8; src.connect(g as never); g.connect(this.busSfx as never); src.start(0);
  }
  private b22Enemy(ev: { kind: string; enemy: string; tag?: string }) {
    const realm = ['sky_lancer', 'halo_scribe', 'citadel_bulwark', 'rift_mimic', 'phase_harrier', 'singularity_husk', 'halo_sigil'].includes(ev.enemy);
    if (ev.kind === 'enemy_phase') this.b22Play('boss_phase');
    else if (ev.kind === 'enemy_strike' && ev.tag && /open|fold_open|mirror_open|harmony_break|evade_open|_down/.test(ev.tag)) this.b22Play(ev.tag.includes('down') ? 'boss_break' : 'boss_open');
    else if (realm && ev.kind === 'enemy_strike') this.b22Play(ev.enemy === 'phase_harrier' ? 'phase_blink' : 'lance_strike', 0.7);
    else if (ev.kind === 'enemy_block' && ev.tag === 'mirror_break') this.b22Play('boss_break');
  }
  private autoKey = -1; private autoId = -9;
  private b22Sync(s: GameState) {
    if (!s.b22 || s.phase !== 'running') return;
    for (const ev of s.b22.ev) { if (ev.id <= this.b22Cur) continue; this.b22Cur = ev.id; const r = B22_EVENT_SFX[ev.kind] ?? signatureSfx(ev.kind); if (r) this.b22Play(r); }
    for (const ev of s.abilityEvents) { if (ev.id <= this.b22Ab) continue; this.b22Ab = ev.id; if (ev.kind === 'kai_auto') { const key = (ev.n ?? 0) & 255; if (key === this.autoKey && ev.id - this.autoId <= 1) { this.autoId = ev.id; continue; } this.autoKey = key; this.autoId = ev.id; }
      const r = EVENT_SFX[ev.kind] ?? kaiCombatSfx(ev.kind, ev.n ?? 0); if (r) this.b22Play(r); }
  }
  /** Scene teardown (retry / home): reset per-run counters and cut effect voices. The context, buses and score survive so the next scene (or the menu) continues the music. */
  dispose() { this.nextHover = 0; this.nextAmbient = 0; this.nextCrackle = 0; this.lastEvent = 0; this.lastImpact = 0; this.lastHitAt.clear(); this.lastEnemyEvent = 0; this.b22Cur = 0; this.b22Ab = 0; this.lastEnemy.clear(); this.lastPhase = ''; this.lastBosses = 0; this.victorySeen = -1; this.lastDrive = 0; this.finalWarned = false; this.eventDuck = { until: 0, level: 1 }; this.lastDuck = -1; this.preloaded = ''; this.music?.setDuck(1, 0.3); this.stopAll(0.01, true); }
}

let shared: AbilityAudio | null = null;
/** One AudioContext for the whole page (retries create new scenes, not new contexts). Returns null where Web Audio is unavailable. */
export function sharedAbilityAudio(): AbilityAudio | null {
  if (shared) return shared;
  const Ctor = (globalThis as unknown as { AudioContext?: new () => CtxLike }).AudioContext; if (!Ctor) return null;
  shared = new AbilityAudio(new Ctor(), async url => (await fetch(url)).arrayBuffer()); return shared;
}

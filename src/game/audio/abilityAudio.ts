import type { AbilityEvent, EnemyEvent, GameState, Impact } from '../../sim/GameState';

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
export const COMBAT_SOUNDS = ['hit_light', 'hit_heavy', 'hit_boss', 'block_deflect', 'player_hurt', 'revive'] as const;
export type CombatSound = (typeof COMBAT_SOUNDS)[number];
export const combatSoundUrl = (n: string) => `/audio/combat/${n}.wav`;
export const COMBAT_MIX = { light: 0.34, heavy: 0.7, boss: 0.65, block: 0.6, hurt: 0.85, maxHitVoices: 3, minGapLight: 0.07, minGapHeavy: 0.09, hearRange: 700 } as const;
export const ARENA_MIX = { level: 0.62, hearRange: 1400, minGain: 0.4, ambient: 0.16, ambientMin: 14, ambientMax: 30 } as const;
export const BOSS_MIX = { level: 0.78, hearRange: 1100, minGain: 0.45, maxVoices: 4, minGap: 0.045 } as const;
export const ENEMY_MIX = { level: 0.5, hearRange: 620, minGain: 0.12, maxVoices: 6, minGap: 0.045 } as const;
const MASTER = 0.8;
/** Voice slots: a new sound in a slot replaces the old one (no stacked charge swells, one beam body, one burst). `pulse` allows two overlapping zaps. */
type Slot = 'hit' | 'hurt' | 'charge' | 'fire' | 'flight' | 'burst' | 'pulse' | 'misc' | 'enemy' | 'boss' | 'aura';
const MAX_PULSE_VOICES = 2;

interface Voice { src: SourceLike; gain: GainLike; slot: Slot; name: string }

export class AbilityAudio {
  private buffers = new Map<string, unknown>();
  private voices = new Set<Voice>();
  private master: GainLike | null = null;
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
    if (!this.master) { this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : MASTER; this.master.connect(this.ctx.destination); }
    this.loading ??= Promise.all([...ABILITY_SOUNDS.map(n => [n, soundUrl(n)] as const), ...ENEMY_SOUNDS.map(n => [n, enemySoundUrl(n)] as const), ...BOSS_SOUNDS.map(n => [n, bossSoundUrl(n)] as const), ...ARENA_SOUNDS.map(n => [n, arenaSoundUrl(n)] as const), ...COMBAT_SOUNDS.map(n => [n, combatSoundUrl(n)] as const)].map(async ([n, url]) => { try { this.buffers.set(n, await this.ctx.decodeAudioData(await this.fetchBuffer(url))); } catch { /* a missing sound must never break the game */ } })).then(() => undefined);
    return this.loading;
  }

  setMuted(m: boolean) {
    if (m === this.muted) return;
    this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : MASTER, this.ctx.currentTime, 0.01); if (m) this.stopAll(0.02);
  }

  private lastEnemy = new Map<string, number>();
  private lastEnemyEvent = 0;
  private play(name: AbilitySound | EnemySound | BossSound | ArenaSound | CombatSound, slot: Slot, vol = 1, rate = 1) {
    const buf = this.buffers.get(name); if (!buf || !this.master || this.muted) return;
    if (slot === 'enemy') { if ([...this.voices].filter(v => v.slot === 'enemy').length >= ENEMY_MIX.maxVoices) return; }
    else if (slot === 'boss') { if ([...this.voices].filter(v => v.slot === 'boss').length >= BOSS_MIX.maxVoices) return; }
    else if (slot === 'hit') { if ([...this.voices].filter(v => v.slot === 'hit').length >= COMBAT_MIX.maxHitVoices) return; }
    else if (slot === 'pulse') { if ([...this.voices].filter(v => v.slot === 'pulse').length >= MAX_PULSE_VOICES) return; }
    else this.stopSlot(slot, 0.03);
    const src = this.ctx.createBufferSource(), gain = this.ctx.createGain(); src.buffer = buf; src.playbackRate.value = rate; gain.gain.value = vol;
    src.connect(gain); gain.connect(this.master); const v: Voice = { src, gain, slot, name };
    src.onended = () => { this.voices.delete(v); try { src.disconnect(); gain.disconnect(); } catch { /* already gone */ } };
    this.voices.add(v); this.started.push(name); src.start();
  }
  private stopVoice(v: Voice, fadeS: number) {
    this.voices.delete(v); const t = this.ctx.currentTime;
    try { v.gain.gain.setTargetAtTime(0, t, Math.max(0.004, fadeS / 4)); v.src.stop(t + fadeS + 0.02); } catch { /* already stopped */ }
  }
  private stopSlot(slot: Slot, fadeS: number) { for (const v of [...this.voices]) if (v.slot === slot) this.stopVoice(v, fadeS); }
  /** Cancelled / dead / muted / disposed: nothing may keep sounding. */
  stopAll(fadeS = 0.04) { for (const v of [...this.voices]) this.stopVoice(v, fadeS); }

  /** Apply one sim event. Sounds follow the simulation (charge / release / pulse / burst ticks), never display frame callbacks. */
  handle(ev: AbilityEvent, form: 0 | 1 | 2 | 3) {
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

  private lastImpact = 0; private lastHitAt = new Map<string, number>();
  /** One sim impact -> sound. Light hits are quiet, short and rate-limited; heavy / boss / block / hurt are distinct and each get their own gap so none can mask another. A kill is covered by its enemy_death sound, so a killing blow plays the heavy hit only when it was heavy. */
  handleImpact(e: Impact, px: number, py: number) {
    const d = Math.hypot(e.x - px, e.y - py); if (d > COMBAT_MIX.hearRange && e.kind !== 'hurt' && e.kind !== 'revive') return;
    const fall = Math.max(0.35, 1 - d / COMBAT_MIX.hearRange), now = this.ctx.currentTime;
    const gate = (k: string, gap: number) => { if (now - (this.lastHitAt.get(k) ?? -1) < gap) return false; this.lastHitAt.set(k, now); return true; };
    const rate = 0.95 + Math.random() * 0.1;
    if (e.kind === 'hurt') { if (gate('hurt', 0.12)) this.play('player_hurt', 'hurt', COMBAT_MIX.hurt * (e.heavy ? 1 : 0.8), rate); }
    else if (e.kind === 'revive') this.play('revive', 'misc', 0.9);
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
      case 'enemy_intro': say('boss_warning', 0.9); say(k === 'warden' ? 'warden_roar' : 'seraph_arrive'); break;
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
  ambient(arena: 'gloam' | 'ashen', time: number) {
    if (this.nextAmbient === 0) { this.nextAmbient = time + 10 + Math.random() * 10; return; }
    if (time < this.nextAmbient) return;
    this.nextAmbient = time + ARENA_MIX.ambientMin + Math.random() * (ARENA_MIX.ambientMax - ARENA_MIX.ambientMin);
    if (this.voices.size > 0) return;
    this.play(`amb_${arena}_${Math.random() < 0.5 ? 'a' : 'b'}` as ArenaSound, 'misc', ARENA_MIX.ambient);
  }

  /** Per render frame: feed new sim events, follow the run phase (pause freezes sound, death silences casts). */
  sync(s: GameState) {
    if (s.phase !== this.lastPhase) {
      if (s.phase === 'running') void this.ctx.resume().catch(() => undefined);
      else { if (s.phase === 'dead') this.stopAll(0.06); void this.ctx.suspend().catch(() => undefined); }
      this.lastPhase = s.phase;
    }
    if (s.phase === 'running') this.ambient(s.arenaId, s.time);
    if (s.phase === 'running' && s.player.form === 3 && !s.cinema && s.time >= this.nextHover) { this.nextHover = s.time + 1.9; this.play('aura_hover', 'aura', 0.55); }   // B13: a very soft sustained hover tone, re-armed from the sim clock so pause / death / form end silence it
    if (s.phase === 'running' && s.player.form === 2 && !s.cinema && s.time >= this.nextCrackle) { this.nextCrackle = s.time + 2.4 + Math.random() * 3; this.play('aura_crackle', 'aura', 0.55); }   // a quiet low crackle while Form II burns
    for (const im of s.impacts) {
      if (im.id <= this.lastImpact) continue; this.lastImpact = im.id;
      if (s.phase === 'running') this.handleImpact(im, s.player.x, s.player.y);
    }
    for (const ev of s.abilityEvents) {
      if (ev.id <= this.lastEvent) continue; this.lastEvent = ev.id;
      if (s.phase === 'running' || (s.phase === 'victory' && ev.kind === 'finisher')) this.handle(ev, s.cast?.form ?? s.sphere?.form ?? s.player.form);
    }
    for (const ev of s.enemyEvents) {
      if (ev.id <= this.lastEnemyEvent) continue; this.lastEnemyEvent = ev.id;
      if (s.phase === 'running') this.handleEnemy(ev, s.player.x, s.player.y);
    }
  }
  dispose() { this.nextHover = 0; this.nextAmbient = 0; this.nextCrackle = 0; this.lastEvent = 0; this.lastImpact = 0; this.lastHitAt.clear(); this.lastEnemyEvent = 0; this.lastEnemy.clear(); this.lastPhase = ''; this.stopAll(0.01); try { this.master?.disconnect(); } catch { /* ignore */ } this.master = null; }
}

let shared: AbilityAudio | null = null;
/** One AudioContext for the whole page (retries create new scenes, not new contexts). Returns null where Web Audio is unavailable. */
export function sharedAbilityAudio(): AbilityAudio | null {
  if (shared) return shared;
  const Ctor = (globalThis as unknown as { AudioContext?: new () => CtxLike }).AudioContext; if (!Ctor) return null;
  shared = new AbilityAudio(new Ctor(), async url => (await fetch(url)).arrayBuffer()); return shared;
}

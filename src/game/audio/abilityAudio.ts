import type { AbilityEvent, EnemyEvent, GameState } from '../../sim/GameState';

/** Minimal slice of the Web Audio API the ability sounds need; real code passes a browser AudioContext, tests pass a fake. */
export interface GainLike { gain: { value: number; setTargetAtTime(v: number, t: number, tc: number): void }; connect(n: unknown): void; disconnect(): void }
export interface SourceLike { buffer: unknown; playbackRate: { value: number }; onended: (() => void) | null; connect(n: unknown): void; start(when?: number): void; stop(when?: number): void; disconnect(): void }
export interface CtxLike { state: string; currentTime: number; destination: unknown; createGain(): GainLike; createBufferSource(): SourceLike; resume(): Promise<void>; suspend(): Promise<void>; decodeAudioData(b: ArrayBuffer): Promise<unknown> }

export const ABILITY_SOUNDS = ['beam_charge', 'beam_charge_f1', 'beam_fire', 'beam_fire_f1', 'beam_pulse_0', 'beam_pulse_1', 'beam_pulse_2', 'beam_end', 'cast_cancel',
  'sphere_gather', 'sphere_gather_f1', 'sphere_throw', 'sphere_flight', 'sphere_burst', 'sphere_burst_f1'] as const;
export type AbilitySound = (typeof ABILITY_SOUNDS)[number];
export const soundUrl = (n: string) => `/audio/kai-abilities/${n}.wav`;
/** B07 enemy sounds (original synthesis, art/enemies/audio/synth_b07.py). Quieter than Kai's, distance-attenuated, voice-capped so a crowd cannot bury the ability mix. */
export const ENEMY_SOUNDS = ['pursuer_wind', 'lunge', 'flanker_wind', 'slash', 'bruiser_wind', 'bruiser_slam', 'ranged_charge', 'ranged_shot', 'bolt_hit', 'death_small', 'death_heavy'] as const;
export type EnemySound = (typeof ENEMY_SOUNDS)[number];
export const enemySoundUrl = (n: string) => `/audio/enemies/${n}.wav`;
export const ENEMY_MIX = { level: 0.5, hearRange: 620, minGain: 0.12, maxVoices: 6, minGap: 0.045 } as const;
const MASTER = 0.8;
/** Voice slots: a new sound in a slot replaces the old one (no stacked charge swells, one beam body, one burst). `pulse` allows two overlapping zaps. */
type Slot = 'charge' | 'fire' | 'flight' | 'burst' | 'pulse' | 'misc' | 'enemy';
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
    this.loading ??= Promise.all([...ABILITY_SOUNDS.map(n => [n, soundUrl(n)] as const), ...ENEMY_SOUNDS.map(n => [n, enemySoundUrl(n)] as const)].map(async ([n, url]) => { try { this.buffers.set(n, await this.ctx.decodeAudioData(await this.fetchBuffer(url))); } catch { /* a missing sound must never break the game */ } })).then(() => undefined);
    return this.loading;
  }

  setMuted(m: boolean) {
    if (m === this.muted) return;
    this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : MASTER, this.ctx.currentTime, 0.01); if (m) this.stopAll(0.02);
  }

  private lastEnemy = new Map<string, number>();
  private lastEnemyEvent = 0;
  private play(name: AbilitySound | EnemySound, slot: Slot, vol = 1, rate = 1) {
    const buf = this.buffers.get(name); if (!buf || !this.master || this.muted) return;
    if (slot === 'enemy') { if ([...this.voices].filter(v => v.slot === 'enemy').length >= ENEMY_MIX.maxVoices) return; }
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
  handle(ev: AbilityEvent, form: 0 | 1) {
    const f1 = form === 1 ? '_f1' : '';
    switch (ev.kind) {
      case 'beam_charge': this.play(`beam_charge${f1}` as AbilitySound, 'charge'); break;
      case 'beam_fire': this.stopSlot('charge', 0.04); this.play(`beam_fire${f1}` as AbilitySound, 'fire'); break;
      case 'beam_pulse': this.play(`beam_pulse_${this.pulseCycle++ % 3}` as AbilitySound, 'pulse', ev.n ? 1 : 0.45, 0.97 + Math.random() * 0.06); break;
      case 'beam_end': this.stopSlot('fire', 0.07); this.stopSlot('pulse', 0.04); this.play('beam_end', 'misc', 0.8); break;
      case 'cast_cancel': this.stopSlot('charge', 0.03); this.stopSlot('fire', 0.04); this.stopSlot('flight', 0.04); this.play('cast_cancel', 'misc', 0.8); break;
      case 'sphere_gather': this.play(`sphere_gather${f1}` as AbilitySound, 'charge'); break;
      case 'sphere_launch': this.stopSlot('charge', 0.06); this.play('sphere_throw', 'misc'); this.play('sphere_flight', 'flight', 0.9); break;
      case 'sphere_burst': this.stopSlot('flight', 0.03); this.play(`sphere_burst${f1}` as AbilitySound, 'burst'); break;
    }
  }

  /** One enemy event -> sound. Only attacks near the player are heard, loudness falls with distance, and the same sound cannot restart within a few ms. */
  handleEnemy(ev: EnemyEvent, px: number, py: number) {
    const d = Math.hypot(ev.x - px, ev.y - py); if (d > ENEMY_MIX.hearRange) return;
    const gain = ENEMY_MIX.level * Math.max(ENEMY_MIX.minGain, 1 - d / ENEMY_MIX.hearRange);
    const say = (n: EnemySound, v = 1) => {
      const now = this.ctx.currentTime, last = this.lastEnemy.get(n) ?? -1;
      if (now - last < ENEMY_MIX.minGap) return; this.lastEnemy.set(n, now); this.play(n, 'enemy', gain * v);
    };
    switch (ev.kind) {
      case 'enemy_telegraph': say(ev.enemy === 'pursuer' ? 'pursuer_wind' : ev.enemy === 'flanker' ? 'flanker_wind' : ev.enemy === 'bruiser' ? 'bruiser_wind' : 'ranged_charge'); break;
      case 'enemy_strike': if (ev.enemy === 'pursuer') say('lunge'); else if (ev.enemy === 'flanker') say('slash'); break;
      case 'enemy_slam': say('bruiser_slam', 1.3); break;
      case 'enemy_shot': say('ranged_shot'); break;
      case 'enemy_shot_hit': say('bolt_hit', 0.8); break;
      case 'enemy_death': say(ev.enemy === 'bruiser' ? 'death_heavy' : 'death_small', ev.enemy === 'bruiser' ? 1.1 : 0.8); break;
    }
  }

  /** Per render frame: feed new sim events, follow the run phase (pause freezes sound, death silences casts). */
  sync(s: GameState) {
    if (s.phase !== this.lastPhase) {
      if (s.phase === 'running') void this.ctx.resume().catch(() => undefined);
      else { if (s.phase === 'dead') this.stopAll(0.06); void this.ctx.suspend().catch(() => undefined); }
      this.lastPhase = s.phase;
    }
    for (const ev of s.abilityEvents) {
      if (ev.id <= this.lastEvent) continue; this.lastEvent = ev.id;
      if (s.phase === 'running') this.handle(ev, s.cast?.form ?? s.sphere?.form ?? s.player.form);
    }
    for (const ev of s.enemyEvents) {
      if (ev.id <= this.lastEnemyEvent) continue; this.lastEnemyEvent = ev.id;
      if (s.phase === 'running') this.handleEnemy(ev, s.player.x, s.player.y);
    }
  }
  dispose() { this.lastEvent = 0; this.lastEnemyEvent = 0; this.lastEnemy.clear(); this.lastPhase = ''; this.stopAll(0.01); try { this.master?.disconnect(); } catch { /* ignore */ } this.master = null; }
}

let shared: AbilityAudio | null = null;
/** One AudioContext for the whole page (retries create new scenes, not new contexts). Returns null where Web Audio is unavailable. */
export function sharedAbilityAudio(): AbilityAudio | null {
  if (shared) return shared;
  const Ctor = (globalThis as unknown as { AudioContext?: new () => CtxLike }).AudioContext; if (!Ctor) return null;
  shared = new AbilityAudio(new Ctor(), async url => (await fetch(url)).arrayBuffer()); return shared;
}

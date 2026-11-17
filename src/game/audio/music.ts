import type { GainLike, SourceLike, CtxLike } from './abilityAudio';

/** B16 score: seamless loops cross-fade, stingers sit on top, `duck` dips the whole score for transformations / boss warnings / pause. One director per audio context. */
export const MUSIC_CUES = ['title', 'gloam', 'ashen', 'warden', 'seraph', 'victory', 'defeat', 'aetherfall', 'paradox', 'castellan', 'regent', 'oathkeeper', 'mirror_tyrant', 'chronophage', 'hollow_choir', 'sovereign', 'coop_stinger'] as const;
export type MusicCue = (typeof MUSIC_CUES)[number];
export const STINGERS = ['stinger_boss', 'stinger_final_warning', 'stinger_reward', 'stinger_levelup'] as const;
export type Stinger = (typeof STINGERS)[number];
export const musicUrl = (n: string) => `/audio/music/${n}.ogg`;
const ONE_SHOT: ReadonlySet<string> = new Set(['victory', 'defeat']);

interface Playing { cue: MusicCue; src: SourceLike & { loop?: boolean }; gain: GainLike }

export class MusicDirector {
  private buffers = new Map<string, unknown>();
  private pending = new Map<string, Promise<void>>();
  private current: Playing | null = null;
  private want: MusicCue | null = null;
  private duckNode: GainLike | null = null;
  /** QA: cue changes in order */
  readonly log: string[] = [];
  constructor(private readonly ctx: CtxLike, private readonly out: GainLike, private readonly fetchBuffer: (url: string) => Promise<ArrayBuffer>) {}
  get cue(): MusicCue | null { return this.current?.cue ?? null; }
  get loaded() { return this.buffers.size; }
  private get duckGain(): GainLike { if (!this.duckNode) { this.duckNode = this.ctx.createGain(); this.duckNode.gain.value = 1; this.duckNode.connect(this.out); } return this.duckNode; }

  /** Decode a file once; a missing / undecodable file is reported and leaves the game silent for that cue, never throwing. */
  load(name: string): Promise<void> {
    if (this.buffers.has(name)) return Promise.resolve();
    let p = this.pending.get(name);
    if (!p) { p = this.fetchBuffer(musicUrl(name)).then(b => this.ctx.decodeAudioData(b)).then(b => { this.buffers.set(name, b); }).catch(() => { this.log.push(`load-failed:${name}`); }).finally(() => { this.pending.delete(name); }); this.pending.set(name, p); }
    return p;
  }
  preload(names: readonly string[]) { return Promise.all(names.map(n => this.load(n))); }

  /** Switch the score. Same cue = no-op (so a re-render, retry or pause can never double a track). */
  setCue(cue: MusicCue | null, fadeS = 1.4) {
    if (cue === this.want && (cue === null ? !this.current : this.current?.cue === cue || this.pending.has(cue))) return;
    this.want = cue;
    if (!cue) { this.fadeOutCurrent(fadeS); return; }
    const start = () => {
      if (this.want !== cue || this.current?.cue === cue) return;
      const buf = this.buffers.get(cue); if (!buf) return;
      this.fadeOutCurrent(fadeS);
      const src = this.ctx.createBufferSource() as SourceLike & { loop?: boolean }, gain = this.ctx.createGain(), now = this.ctx.currentTime;
      src.buffer = buf; src.loop = !ONE_SHOT.has(cue); gain.gain.value = 0; gain.gain.setTargetAtTime(1, now, Math.max(0.03, fadeS / 4));
      src.connect(gain); gain.connect(this.duckGain);
      const me: Playing = { cue, src, gain }; this.current = me; this.log.push(cue);
      src.onended = () => { try { src.disconnect(); gain.disconnect(); } catch { /* gone */ } if (this.current === me) this.current = null; };
      src.start();
    };
    if (this.buffers.has(cue)) start(); else void this.load(cue).then(start);
  }
  private fadeOutCurrent(fadeS: number) {
    const c = this.current; if (!c) return; this.current = null;
    const t = this.ctx.currentTime; try { c.gain.gain.setTargetAtTime(0, t, Math.max(0.02, fadeS / 4)); c.src.stop(t + fadeS + 0.15); } catch { /* already stopped */ }
  }

  /** A short musical sting on top of the score (boss arrival, reward, level-up). Never loops, never queues. */
  stinger(name: Stinger, vol = 1) {
    const buf = this.buffers.get(name); if (!buf) { void this.load(name); return; }
    const src = this.ctx.createBufferSource(), gain = this.ctx.createGain(); src.buffer = buf; gain.gain.value = vol; src.connect(gain); gain.connect(this.out);
    src.onended = () => { try { src.disconnect(); gain.disconnect(); } catch { /* gone */ } }; this.log.push(name); src.start();
  }

  /** Set the score's duck level (0..1); `tc` is the time constant, so a quick drop and a slow return are just two calls. */
  setDuck(level: number, tc = 0.12) { this.duckGain.gain.setTargetAtTime(level, this.ctx.currentTime, Math.max(0.01, tc)); }
  stop(fadeS = 0.4) { this.want = null; this.fadeOutCurrent(fadeS); }
}

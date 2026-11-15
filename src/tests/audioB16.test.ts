import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MusicDirector, MUSIC_CUES, STINGERS, musicUrl } from '../game/audio/music';
import { AbilityAudio, UI_SOUNDS, uiSoundUrl, type CtxLike, type GainLike, type SourceLike } from '../game/audio/abilityAudio';
import { migrateSave, DEFAULT_SETTINGS } from '../sim/SaveSystem';
import { makeState } from '../sim/GameState';

class Src implements SourceLike { buffer: unknown = null; playbackRate = { value: 1 }; loop = false; onended: (() => void) | null = null; started = false; stopped = false; connect() {} disconnect() {} start() { this.started = true; } stop() { this.stopped = true; } }
class Gain implements GainLike { gain = { value: 1, targets: [] as number[], setTargetAtTime(v: number) { this.targets.push(v); } }; connect() {} disconnect() {} }
class Ctx implements CtxLike {
  state = 'running'; currentTime = 0; destination = {}; sources: Src[] = []; gains: Gain[] = [];
  createGain() { const g = new Gain(); this.gains.push(g); return g as unknown as GainLike; } createBufferSource() { const s = new Src(); this.sources.push(s); return s; }
  async resume() {} async suspend() {} async decodeAudioData(b: ArrayBuffer) { return { bytes: b.byteLength }; }
}
const tick = () => new Promise(r => setTimeout(r, 0));
const mk = () => { const ctx = new Ctx(); const out = ctx.createGain(); return { ctx, m: new MusicDirector(ctx, out, async () => new ArrayBuffer(8)) }; };

describe('B16 music director', () => {
  it('starts a cue once; the same cue again (re-render / retry / pause) never doubles it', async () => {
    const { ctx, m } = mk(); m.setCue('gloam'); await tick(); m.setCue('gloam'); m.setCue('gloam'); await tick();
    expect(ctx.sources.filter(s => s.started)).toHaveLength(1); expect(ctx.sources[0].loop).toBe(true); expect(m.log).toEqual(['gloam']);
  });
  it('cross-fades: the old track is faded out and stopped, only one is current', async () => {
    const { ctx, m } = mk(); m.setCue('gloam'); await tick(); m.setCue('warden'); await tick();
    expect(ctx.sources[0].stopped).toBe(true); expect(m.cue).toBe('warden'); expect(ctx.sources.filter(s => s.started && !s.stopped)).toHaveLength(1);
  });
  it('victory / defeat are one-shots, not loops', async () => { const { ctx, m } = mk(); m.setCue('victory'); await tick(); expect(ctx.sources[0].loop).toBe(false); });
  it('a request that is superseded while loading never plays', async () => { const { ctx, m } = mk(); m.setCue('ashen'); m.setCue('seraph'); await tick(); await tick(); expect(m.log).toEqual(['seraph']); expect(ctx.sources.filter(s => s.started)).toHaveLength(1); });
  it('a missing file is reported and never throws', async () => {
    const ctx = new Ctx(), m = new MusicDirector(ctx, ctx.createGain(), async () => { throw new Error('404'); }); m.setCue('title'); await tick(); await tick();
    expect(m.cue).toBeNull(); expect(m.log).toContain('load-failed:title');
  });
  it('stinger plays on top without touching the current cue; duck sets a level', async () => {
    const { ctx, m } = mk(); m.setCue('gloam'); await m.preload(['stinger_boss']); await tick(); m.stinger('stinger_boss'); expect(m.cue).toBe('gloam'); expect(ctx.sources.filter(s => s.started)).toHaveLength(2);
    m.setDuck(0.1); expect(ctx.gains.some(g => g.gain.targets.includes(0.1))).toBe(true);
  });
});

describe('B16 audio hub', () => {
  const mkHub = async () => { const ctx = new Ctx(); const a = new AbilityAudio(ctx, async () => new ArrayBuffer(8)); await a.unlock(); return { ctx, a }; };
  it('title cue requested before unlock starts after it', async () => {
    const ctx = new Ctx(), a = new AbilityAudio(ctx, async () => new ArrayBuffer(8)); a.setCue('title'); await a.unlock(); await tick(); await tick(); expect(a.music?.cue).toBe('title');
  });
  it('volumes are clamped and applied to the buses immediately', async () => {
    const { a } = await mkHub(); a.setVolumes({ music: 5, sfx: -1, ui: Number.NaN }); expect(a.volume).toMatchObject({ music: 1, sfx: 0, ui: 0.8 });
  });
  it('a real run drives the score: arena theme, victory, defeat; dispose keeps the score alive for the next scene', async () => {
    const { a, ctx } = await mkHub(); const s = makeState(3, 'ashen'); a.sync(s); await tick(); await tick(); expect(a.music?.cue).toBe('ashen');
    s.phase = 'victory'; a.sync(s); await tick(); expect(a.music?.cue).toBeNull();   // B17: a silent beat first
    ctx.currentTime += 2; a.sync(s); await tick(); expect(a.music?.cue).toBe('victory'); a.dispose(); expect(a.music?.cue).toBe('victory');
    const s2 = makeState(4, 'gloam'); s2.phase = 'dead'; a.sync(s2); await tick(); expect(a.music?.cue).toBe('defeat');
  });
  it('a boss on the field switches to its theme, and removing it returns to the arena', async () => {
    const { a } = await mkHub(); const s = makeState(3, 'gloam'); a.sync(s); await tick(); await tick();
    s.enemies.push({ id: 99, kind: 'warden', hp: 100, x: 0, y: 0 } as never); a.sync(s); await tick(); expect(a.music?.cue).toBe('warden'); s.enemies.length = 0; a.sync(s); await tick(); expect(a.music?.cue).toBe('gloam');
  });
  it('mute silences the master without stopping the score; UI sounds obey the UI bus', async () => {
    const { a } = await mkHub(); a.setMuted(true); a.ui('ui_click'); expect(a.started).not.toContain('ui_click'); a.setMuted(false); a.ui('ui_click'); expect(a.started).toContain('ui_click');
  });
});

describe('B16 settings persistence', () => {
  it('defaults and clamping', () => {
    expect(migrateSave(null).settings).toMatchObject({ master: 1, music: 0.7, sfx: 1, ui: 0.8 });
    expect(migrateSave({ settings: { music: 3, sfx: -2, master: 'x', ui: 0.35 } }).settings).toMatchObject({ music: 1, sfx: 0, master: 1, ui: 0.35 });
    expect(DEFAULT_SETTINGS.mute).toBe(false);
  });
});

describe('B16 shipped files', () => {
  const pub = (u: string) => join(process.cwd(), 'public', u);
  it('every cue, stinger and UI sound exists, is non-empty and has a valid header', () => {
    for (const n of [...MUSIC_CUES, ...STINGERS]) { const f = pub(musicUrl(n)); expect(existsSync(f), n).toBe(true); expect(statSync(f).size).toBeGreaterThan(5000); expect(readFileSync(f).subarray(0, 4).toString()).toBe('OggS'); }
    for (const n of UI_SOUNDS) { const f = pub(uiSoundUrl(n)); expect(existsSync(f), n).toBe(true); expect(readFileSync(f).subarray(0, 4).toString()).toBe('RIFF'); }
  });
});

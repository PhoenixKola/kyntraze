import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AbilityAudio, HERO_SOUNDS, HERO_ZAP, type CtxLike, type GainLike, type SourceLike } from '../game/audio/abilityAudio';
import { makeState, type AbilityEvent } from '../sim/GameState';

class Ctx implements CtxLike {
  state = 'running'; currentTime = 0; destination = {}; sources: Src[] = [];
  createGain(): GainLike { return { gain: { value: 1, setTargetAtTime: () => undefined }, connect: () => undefined, disconnect: () => undefined }; }
  createBufferSource(): SourceLike { const s = new Src(); this.sources.push(s); return s; }
  async resume() {} async suspend() {} async decodeAudioData(b: ArrayBuffer) { return { bytes: b.byteLength }; }
}
class Src implements SourceLike { buffer: unknown = null; playbackRate = { value: 1 }; onended: (() => void) | null = null; stopped = false; connect() {} disconnect() {} start() {} stop() { this.stopped = true; } }
const mk = async () => { const ctx = new Ctx(); const a = new AbilityAudio(ctx, async () => new ArrayBuffer(64)); await a.unlock(); await a.loadHeroSounds(); return { ctx, a }; };
let id = 1;
const ev = (kind: AbilityEvent['kind'], n?: number): AbilityEvent => ({ id: id++, kind, x: 0, y: 0, n });
const dir = join(__dirname, '..', '..', 'public', 'audio', 'hero-abilities');

describe('hero sound files', () => {
  it('every referenced WAV exists and is 16-bit mono 44.1 kHz with a consistent header, no clipping, within level limits', () => {
    const rep = JSON.parse(readFileSync(join(dir, 'loudness.json'), 'utf8'));
    for (const n of HERO_SOUNDS) {
      const f = join(dir, n + '.wav'); expect(existsSync(f), n).toBe(true);
      const b = readFileSync(f); expect(b.toString('ascii', 0, 4)).toBe('RIFF'); expect(b.toString('ascii', 8, 12)).toBe('WAVE'); expect(b.readUInt16LE(20)).toBe(1); expect(b.readUInt16LE(22)).toBe(1); expect(b.readUInt32LE(24)).toBe(44100); expect(b.readUInt16LE(34)).toBe(16);
      expect(b.toString('ascii', 36, 40)).toBe('data'); expect(b.readUInt32LE(40)).toBe(b.length - 44);
      expect(rep[n].peak_dBFS).toBeLessThanOrEqual(-0.9); expect(rep[n].clipped_samples).toBe(0); expect(rep[n].seconds).toBeGreaterThan(0.1 - 1e-9);
    }
    expect(existsSync(join(__dirname, '..', '..', 'art', 'characters', 'heroes', 'audio', 'synth_b19.py'))).toBe(true);
  });
  it('windows: the tiny frequent sounds stay tiny and the charges are no longer than the sim windows they cover', () => {
    const rep = JSON.parse(readFileSync(join(dir, 'loudness.json'), 'utf8'));
    expect(rep.needle_fire.seconds).toBeLessThanOrEqual(0.15); expect(rep.ren_auto_a.seconds).toBeLessThanOrEqual(0.25); expect(rep.ren_q_beat.seconds).toBeLessThanOrEqual(0.25); expect(rep.lance_pulse.seconds).toBeLessThanOrEqual(0.25);
    expect(rep.lance_charge.seconds).toBeLessThanOrEqual(1.45); expect(rep.ren_ascend_charge.seconds).toBeLessThanOrEqual(1.6 + 1e-9); expect(rep.ren_aura.seam_ok).toBe(true); expect(rep.sora_aura.seam_ok).toBe(true);
    expect(rep.needle_fire.peak_dBFS).toBeLessThan(rep.lance_fire.peak_dBFS - 6);   // needles are much quieter than the Lance
  });
});

describe('hero event routing', () => {
  it('Ren and Sora play different transformation sounds for the same event kinds; the first reveal is its own long sound', async () => {
    const r = await mk(), s = await mk();
    r.a.handle(ev('ascend_start', 1), 0, 'ren'); s.a.handle(ev('ascend_start', 1), 0, 'sora'); r.a.handle(ev('ascend_break'), 1, 'ren'); s.a.handle(ev('ascend_break'), 1, 'sora'); r.a.handle(ev('ascend_commit'), 1, 'ren'); s.a.handle(ev('ascend_commit'), 1, 'sora');
    expect(r.a.started).toEqual(['ren_ascend_charge', 'ren_ascend_break', 'ren_ascend_commit']); expect(s.a.started).toEqual(['sora_ascend_charge', 'sora_ascend_break', 'sora_ascend_commit']);
    expect(r.ctx.sources[0].playbackRate.value).toBeCloseTo(1.6 / 1.55, 3); const rep = await mk(); rep.a.handle(ev('ascend_start', 0), 0, 'ren'); expect(rep.ctx.sources[0].playbackRate.value).toBe(2);   // a repeat reveal is played shorter
    expect(r.ctx.sources[0].stopped).toBe(true);   // the break cuts the charge voice
  });
  it('Ren: auto, Q beats (rising pitch, heavy finisher), Rush and Bloodstar map to their own sounds', async () => {
    const { ctx, a } = await mk();
    a.handle(ev('auto_hit'), 0, 'ren'); a.handle(ev('auto_finisher'), 0, 'ren'); a.handle(ev('hero_q'), 0, 'ren'); a.handle(ev('hero_q_beat', (0 << 8) | 5), 0, 'ren'); a.handle(ev('hero_q_beat', (3 << 8) | 5), 0, 'ren'); a.handle(ev('hero_q_beat', (4 << 8) | 128 | 5), 0, 'ren');
    expect(a.started).toEqual(['ren_auto_a', 'ren_auto_fin', 'ren_q_start', 'ren_q_beat', 'ren_q_beat', 'ren_q_fin']);
    const beats = ctx.sources.filter((_, i) => i === 3 || i === 4).map(s => s.playbackRate.value); expect(beats[1]).toBeGreaterThan(beats[0]);
    const b = await mk(); for (const k of ['rush_start', 'rush_hop', 'rush_strike', 'rush_end', 'bloodstar_crouch', 'bloodstar_leap', 'bloodstar_slam', 'bloodstar_rebound'] as const) b.a.handle(ev(k, 2), 0, 'ren');
    expect(b.a.started).toEqual(['rush_start', 'rush_hop', 'rush_strike', 'rush_end', 'bloodstar_crouch', 'bloodstar_leap', 'bloodstar_slam', 'bloodstar_ring', 'bloodstar_rebound']);
  });
  it('Sora: needles, volley, Lance (charge, tier ticks, fire, pulses, end) and Horizon (summon, converge, burst) map to their own sounds', async () => {
    const { a } = await mk();
    for (const k of ['needle_fire', 'volley_fire', 'lance_charge', 'lance_tier', 'lance_fire', 'lance_pulse', 'lance_end', 'horizon_summon', 'horizon_converge', 'horizon_burst', 'horizon_end'] as const) a.handle(ev(k, 1), 1, 'sora');
    expect(a.started).toEqual(['needle_fire', 'volley_fire', 'lance_charge', 'lance_tier', 'lance_fire', 'lance_pulse', 'lance_end', 'horizon_summon', 'horizon_converge', 'horizon_burst', 'horizon_end']);
  });
  it('hero sounds are fetched on demand, never at the unlock (Kai-only play downloads none)', async () => {
    const ctx = new Ctx(), urls: string[] = []; const a = new AbilityAudio(ctx, async u => { urls.push(u); return new ArrayBuffer(8); }); await a.unlock(); expect(urls.some(u => u.includes('hero-abilities'))).toBe(false);
    const s = makeState(1); s.hero = 'ren'; s.phase = 'running'; a.sync(s); await a.loadHeroSounds(); expect(urls.filter(u => u.includes('hero-abilities'))).toHaveLength(HERO_SOUNDS.length);
  });
  it('Kai is unchanged: his events still use his sounds and hero kinds are ignored for him', async () => {
    const { a } = await mk(); a.handle(ev('beam_charge'), 0); a.handle(ev('beam_fire'), 0); a.handle(ev('lance_fire', 1), 0); a.handle(ev('rush_strike', 1), 0, 'kai');
    expect(a.started).toEqual(['beam_charge', 'beam_fire']);
  });
});

describe('hero voice caps and cleanup', () => {
  it('needles and auto punches are gated: a burst of events in one instant starts one voice, and never more than the zap cap sound at once', async () => {
    const { ctx, a } = await mk(); for (let i = 0; i < 20; i++) a.handle(ev('needle_fire', 1), 0, 'sora'); expect(a.started.filter(n => n === 'needle_fire')).toHaveLength(1);
    for (let i = 1; i <= 30; i++) { ctx.currentTime = i * (HERO_ZAP.minGap + 0.001); a.handle(ev('needle_fire', 1), 0, 'sora'); a.handle(ev('auto_hit'), 0, 'ren'); }
    expect([...(a as unknown as { voices: Set<{ slot: string }> }).voices].filter(v => v.slot === 'zap').length).toBeLessThanOrEqual(HERO_ZAP.maxVoices);
  });
  it('a cancelled Lance charge, a death and a pause leave nothing sounding (UI aside)', async () => {
    const c = await mk(); c.a.handle(ev('lance_charge'), 0, 'sora'); expect(c.a.activeVoices).toBe(1); c.a.handle(ev('cast_cancel'), 0, 'sora'); expect([...(c.a as unknown as { voices: Set<{ name: string }> }).voices].map(v => v.name)).toEqual(['cast_cancel']);
    for (const phase of ['paused', 'dead', 'upgrade'] as const) {
      const { a } = await mk(); const s = makeState(1); s.hero = 'ren'; a.handle(ev('bloodstar_crouch'), 0, 'ren'); a.handle(ev('horizon_summon'), 0, 'sora'); expect(a.activeVoices).toBeGreaterThan(0);
      s.phase = 'running'; a.sync(s); s.phase = phase; a.sync(s); expect([...(a as unknown as { voices: Set<{ slot: string }> }).voices].filter(v => v.slot !== 'ui')).toHaveLength(0);
    }
  });
  it('the transformed bed is re-armed from the sim clock, once per window, only for a transformed hero, and ends with ascend_end', async () => {
    const { a } = await mk(); const s = makeState(1); s.hero = 'ren'; s.phase = 'running'; s.player.form = 1; s.time = 10; a.sync(s); a.sync(s); expect(a.started.filter(n => n === 'ren_aura')).toHaveLength(1);
    s.time = 12; a.sync(s); expect(a.started.filter(n => n === 'ren_aura')).toHaveLength(2); a.handle(ev('ascend_end'), 0, 'ren');
    expect([...(a as unknown as { voices: Set<{ slot: string }> }).voices].filter(v => v.slot === 'aura')).toHaveLength(0);
    const k = await mk(); const ks = makeState(1); ks.phase = 'running'; ks.player.form = 1; ks.time = 10; k.a.sync(ks); expect(k.a.started).not.toContain('ren_aura'); expect(k.a.started).not.toContain('sora_aura');   // Kai's Flarebound is not an Ascendant
  });
  it('the hero path routes sim events through sync (hero + form passed), and the 65 % Drive cue stays Kai-only', async () => {
    const { a } = await mk(); const s = makeState(1); s.hero = 'sora'; s.phase = 'running'; s.player.drive = 70; s.abilityEvents.push(ev('volley_fire', 7)); a.sync(s);
    expect(a.started).toContain('volley_fire'); expect(a.started).not.toContain('drive_ready');
  });
});

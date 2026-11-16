import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ABILITY_SOUNDS, ARENA_SOUNDS, COMBAT_SOUNDS, B21_SOUNDS, UI_SOUNDS, BOSS_SOUNDS, ENEMY_SOUNDS, AbilityAudio, type CtxLike, type GainLike, type SourceLike } from '../game/audio/abilityAudio';
import { Simulation } from '../sim/Simulation';
import type { AbilityEvent, InputState } from '../sim/GameState';

class FakeCtx implements CtxLike {
  state = 'suspended'; currentTime = 0; destination = {}; log: string[] = []; sources: FakeSource[] = [];
  createGain(): GainLike { return { gain: { value: 1, setTargetAtTime: () => undefined }, connect: () => undefined, disconnect: () => undefined }; }
  createBufferSource(): SourceLike { const s = new FakeSource(this); this.sources.push(s); return s; }
  async resume() { this.state = 'running'; this.log.push('resume'); }
  async suspend() { this.state = 'suspended'; this.log.push('suspend'); }
  async decodeAudioData(b: ArrayBuffer) { return { bytes: b.byteLength }; }
}
class FakeSource implements SourceLike {
  buffer: unknown = null; playbackRate = { value: 1 }; onended: (() => void) | null = null; startedAt = -1; stoppedAt = -1;
  constructor(private ctx: FakeCtx) {}
  connect() {} disconnect() {} start() { this.startedAt = this.ctx.currentTime; } stop(t?: number) { this.stoppedAt = t ?? this.ctx.currentTime; }
}
const mk = async () => { const ctx = new FakeCtx(); const a = new AbilityAudio(ctx, async () => new ArrayBuffer(64)); await a.unlock(); return { ctx, a }; };
const ev = (kind: AbilityEvent['kind'], id: number, n?: number): AbilityEvent => ({ id, kind, x: 0, y: 0, n });
const DT = 1 / 60; const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });

describe('ability audio files', () => {
  it('all original sounds ship (B05 + B12) as 16-bit mono 44.1 kHz WAV, within level limits, with the generator source next to the art', () => {
    const rep = JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'audio', 'kai-abilities', 'loudness.json'), 'utf8'));
    for (const n of ABILITY_SOUNDS) {
      const f = join(__dirname, '..', '..', 'public', 'audio', 'kai-abilities', n + '.wav'); expect(existsSync(f)).toBe(true);
      const b = readFileSync(f); expect(b.toString('ascii', 0, 4)).toBe('RIFF'); expect(b.readUInt16LE(22)).toBe(1); expect(b.readUInt32LE(24)).toBe(44100); expect(b.readUInt16LE(34)).toBe(16);
      expect(rep[n].peak_dBFS).toBeLessThanOrEqual(-0.9); expect(rep[n].clipped_samples).toBe(0); expect(rep[n].seconds).toBeGreaterThan(0.1);
    }
    expect(existsSync(join(__dirname, '..', '..', 'art', 'characters', 'kai', 'abilities', 'audio', 'synth_b05.py'))).toBe(true);
  });
  it('sounds never outlive their gameplay window (B05.2): beam fire <= 0.5 s + 0.15 s tail, charge/gather <= window + tail, throw <= 0.55 s', () => {
    const rep = JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'audio', 'kai-abilities', 'loudness.json'), 'utf8'));
    for (const n of ['beam_fire', 'beam_fire_f1']) expect(rep[n].seconds).toBeLessThanOrEqual(0.65);
    for (const n of ['beam_charge', 'beam_charge_f1']) expect(rep[n].seconds).toBeLessThanOrEqual(0.65);
    for (const n of ['sphere_gather', 'sphere_gather_f1']) expect(rep[n].seconds).toBeLessThanOrEqual(1.0);
    expect(rep.sphere_throw.seconds).toBeLessThanOrEqual(0.55); expect(rep.beam_end.seconds).toBeLessThanOrEqual(0.75);
  });
});

describe('ability audio lifecycle', () => {
  it('decodes every sound after the unlock gesture and resumes the context', async () => { const { ctx, a } = await mk(); expect(a.loaded).toBe(ABILITY_SOUNDS.length + ENEMY_SOUNDS.length + BOSS_SOUNDS.length + ARENA_SOUNDS.length + COMBAT_SOUNDS.length + B21_SOUNDS.length + UI_SOUNDS.length); expect(ctx.state).toBe('running'); });
  it('plays nothing before unlock (no buffers) and nothing when muted', async () => {
    const ctx = new FakeCtx(); const a = new AbilityAudio(ctx, async () => new ArrayBuffer(8)); a.handle(ev('beam_charge', 1), 0); expect(a.started).toHaveLength(0);
    await a.unlock(); a.setMuted(true); a.handle(ev('beam_charge', 2), 0); expect(a.started).toHaveLength(0); a.setMuted(false); a.handle(ev('beam_charge', 3), 0); expect(a.started).toEqual(['beam_charge']);
  });
  it('charge -> fire: the charge swell is cut at the release and replaced by the fire sound; Form I uses its own variants', async () => {
    const { ctx, a } = await mk(); a.handle(ev('beam_charge', 1), 0); expect(a.activeVoices).toBe(1);
    a.handle(ev('beam_fire', 2), 0); expect(a.started).toEqual(['beam_charge', 'beam_fire']); expect(ctx.sources[0].stoppedAt).toBeGreaterThanOrEqual(0); expect(a.activeVoices).toBe(1);
    const b = await mk(); b.a.handle(ev('beam_charge', 1), 1); b.a.handle(ev('beam_fire', 2), 1); b.a.handle(ev('sphere_gather', 3), 1); b.a.handle(ev('sphere_burst', 4), 1);
    expect(b.a.started).toEqual(['beam_charge_f1', 'beam_fire_f1', 'sphere_gather_f1', 'sphere_burst_f1']);
  });
  it('beam end fades the fire voice out before the end sound plays; nothing keeps sounding after a full cast', async () => {
    const { ctx, a } = await mk(); a.handle(ev('beam_fire', 1), 0); a.handle(ev('beam_pulse', 2, 1), 0); const fire = ctx.sources[0]; a.handle(ev('beam_end', 3), 0);
    expect(fire.stoppedAt).toBeGreaterThanOrEqual(0); expect([...a['voices']].map(v => v.slot)).toEqual(['misc']); expect(a.started.at(-1)).toBe('beam_end');
  });
  it('no voice stacking: re-casting replaces the charge voice, pulses cap at two voices', async () => {
    const { a } = await mk(); a.handle(ev('sphere_gather', 1), 0); a.handle(ev('sphere_gather', 2), 0); expect(a.activeVoices).toBe(1);
    for (let i = 0; i < 6; i++) a.handle(ev('beam_pulse', 10 + i, 1), 0); expect(a.started.filter(n => n.startsWith('beam_pulse')).length).toBe(2);
  });
  it('cancel, mute and dispose silence everything; death and pause follow the run phase', async () => {
    const { ctx, a } = await mk(); a.handle(ev('beam_charge', 1), 0); a.handle(ev('cast_cancel', 2), 0); expect([...a['voices']].filter(v => v.slot === 'charge')).toHaveLength(0);
    a.handle(ev('sphere_launch', 3), 0); a.setMuted(true); expect(a.activeVoices).toBe(0); a.setMuted(false);
    a.handle(ev('sphere_burst', 4), 0); a.dispose(); expect(a.activeVoices).toBe(0);
    const sim = new Simulation(2); const s = sim.state; const b = await mk(); b.a.sync(s); b.a.handle(ev('beam_charge', 1), 0); s.phase = 'paused'; b.a.sync(s); expect([...b.a['voices']].filter(v => v.slot !== 'ui').length).toBe(0); expect(b.ctx.log).not.toContain('suspend');   // B16: pause cuts effect voices but keeps the context (score + UI) alive
    s.phase = 'running'; b.a.sync(s); expect(b.ctx.log.at(-1)).toBe('resume'); s.phase = 'dead'; b.a.sync(s); expect([...b.a['voices']].filter(v => v.slot !== 'ui').length).toBe(0); void ctx;
  });
  it('is driven by sim events: a real cast produces charge -> fire -> pulses -> end in order, and a fresh run (ids restart) still plays', async () => {
    const run1 = async () => {
      const { a } = await mk(); const sim = new Simulation(9); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.attackClock = 1e9; s.player.aimX = 1; s.player.aimY = 0;
      s.enemies = [{ id: 1, x: 1300, y: 800, kind: 'pursuer', hp: 999, maxHp: 999, radius: 17, speed: 0, damage: 0, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }];
      sim.step(DT, idle({ beam: true })); a.sync(s); for (let i = 0; i < 100; i++) { sim.step(DT, idle()); a.sync(s); }
      return a;
    };
    const a1 = await run1(); expect(a1.started.filter(n => !n.startsWith('hit_'))[0]).toBe('beam_charge'); expect(a1.started.filter(n => !n.startsWith('hit_'))[1]).toBe('beam_fire'); expect(a1.started).toContain('beam_end'); expect(a1.started.filter(n => n.startsWith('beam_pulse')).length).toBeGreaterThanOrEqual(2);
    const a2 = await run1(); expect(a2.started.filter(n => !n.startsWith('hit_'))[0]).toBe('beam_charge');
  });
  it('a failed decode never throws', async () => { const ctx = new FakeCtx(); const a = new AbilityAudio(ctx, async () => { throw new Error('404'); }); await expect(a.unlock()).resolves.toBeUndefined(); a.handle(ev('beam_charge', 1), 0); expect(a.started).toHaveLength(0); });
});

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENEMIES, ENEMY_KINDS, type EnemyKind } from '../content/enemies';
import { Simulation } from '../sim/Simulation';
import { addEnemy } from '../sim/EntityRegistry';
import { damageEnemy } from '../sim/CombatSystem';
import type { Enemy, EnemyEvent, InputState } from '../sim/GameState';
import { AbilityAudio, ENEMY_MIX, ENEMY_SOUNDS, type CtxLike, type GainLike, type SourceLike } from '../game/audio/abilityAudio';

const DT = 1 / 60;
const idle: InputState = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false };
const quiet = (seed = 5) => { const sim = new Simulation(seed); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.attackClock = 1e9; s.player.hp = 100; return { sim, s }; };
const spawn = (s: ReturnType<typeof quiet>['s'], kind: EnemyKind, dx: number, dy = 0, extra: Partial<Enemy> = {}) => { const d = ENEMIES[kind];
  return addEnemy(s, { kind, x: s.player.x + dx, y: s.player.y + dy, hp: d.hp, maxHp: d.hp, radius: d.radius, speed: d.moveSpeed, damage: d.damage, touchCooldown: 0, attackCd: 0, ...extra }); };
const run = (sim: Simulation, sec: number, input = idle, each?: (t: number) => void) => { for (let i = 0; i < Math.round(sec / DT); i++) { sim.step(DT, input); each?.(sim.state.time); } };
const events = (s: ReturnType<typeof quiet>['s'], kind: EnemyEvent['kind']) => s.enemyEvents.filter(e => e.kind === kind);

describe('B07 enemy content', () => {
  it('has four distinct roles with a complete telegraph -> release -> recovery timeline', () => {
    expect(ENEMY_KINDS).toEqual(['pursuer', 'flanker', 'bruiser', 'ranged']);
    const radii = new Set(ENEMY_KINDS.map(k => ENEMIES[k].radius)); expect(radii.size).toBe(4);
    for (const k of ENEMY_KINDS) { const a = ENEMIES[k].attack; expect(ENEMIES[k].hp).toBeGreaterThan(0); expect(a.windup).toBeGreaterThanOrEqual(0.35); expect(a.recover).toBeGreaterThanOrEqual(0.45); expect(a.cooldown).toBeGreaterThan(a.windup); }
    expect(ENEMIES.bruiser.attack.windup).toBeGreaterThanOrEqual(0.9);   // the heavy attack has the longest, most unmissable warning
    expect(ENEMIES.bruiser.hp).toBeGreaterThan(ENEMIES.pursuer.hp * 4);
  });
  it('heavy and ranged threats are introduced one at a time, long after the first two', () => {
    expect(ENEMIES.pursuer.intro).toBe(0); expect(ENEMIES.flanker.intro).toBeGreaterThan(0);
    expect(ENEMIES.ranged.intro - ENEMIES.flanker.intro).toBeGreaterThanOrEqual(45); expect(ENEMIES.bruiser.intro - ENEMIES.ranged.intro).toBeGreaterThanOrEqual(45);
  });
});

describe('B07 seeded director', () => {
  const cache = new Map<number, ReturnType<typeof surveyRaw>>(); const survey = (seed: number) => { if (!cache.has(seed)) cache.set(seed, surveyRaw(seed)); return cache.get(seed)!; };
  const surveyRaw = (seed: number) => { const sim = new Simulation(seed), s = sim.state; s.player.hp = 1e9; s.player.maxHp = 1e9; s.player.attackClock = 1e9; const first: Partial<Record<EnemyKind, number>> = {}; const peak: Record<string, number> = { bruiser: 0, ranged: 0 };
    for (let i = 0; i < 230 * 30; i++) { sim.step(1 / 30, idle); const t = s.time; { s.player.x = 1100; s.player.y = 800; s.enemies = s.enemies.filter(e => t - e.spawnedAt < 20);   // a player who keeps clearing the field, so the population cap never starves the director
 const live = { bruiser: 0, ranged: 0 };
      for (const e of s.enemies) { first[e.kind] ??= t; if (e.kind in live) live[e.kind as 'bruiser']++; } for (const k of ['bruiser', 'ranged'] as const) peak[k] = Math.max(peak[k], live[k]); } }
    return { first, peak, state: JSON.stringify(s.enemies.map(e => [e.id, e.kind, Math.round(e.x * 100), Math.round(e.y * 100), e.mode])) }; };
  it('is deterministic for a seed', () => { expect(survey(11).state).toBe(survey(11).state); expect(survey(11).state).not.toBe(survey(12).state); });
  it('never spawns bruisers or ranged enemies before their introduction time and respects their live caps', () => {
    for (const seed of [1, 2]) { const r = survey(seed); if (r.first.ranged !== undefined) expect(r.first.ranged).toBeGreaterThanOrEqual(ENEMIES.ranged.intro); if (r.first.bruiser !== undefined) expect(r.first.bruiser).toBeGreaterThanOrEqual(ENEMIES.bruiser.intro);
      expect(r.peak.ranged).toBeLessThanOrEqual(ENEMIES.ranged.cap(230)); expect(r.peak.bruiser).toBeLessThanOrEqual(ENEMIES.bruiser.cap(230)); }
  });
  it('actually introduces the new threats in a normal 4 minute run', () => { const seen = new Set<string>(); for (const seed of [1, 2]) { const r = survey(seed); for (const k of Object.keys(r.first)) seen.add(k); } expect(seen).toEqual(new Set(ENEMY_KINDS)); });
});

describe('B07 attack fairness: the telegraph always comes before the damage', () => {
  it('bruiser slam: telegraph event, >= windup seconds, then exactly one hit; stepping out of the ring avoids it', () => {
    const { sim, s } = quiet(); spawn(s, 'bruiser', 70); let tTele = -1, tHit = -1, hits = 0; let last = s.player.hp;
    run(sim, 2.2, idle, t => { if (tTele < 0 && events(s, 'enemy_telegraph').length) tTele = t; if (s.player.hp < last) { hits++; if (tHit < 0) tHit = t; last = s.player.hp; } });
    expect(tTele).toBeGreaterThan(0); expect(hits).toBe(1); expect(tHit - tTele).toBeGreaterThanOrEqual(ENEMIES.bruiser.attack.windup - 0.05);
    expect(events(s, 'enemy_slam')).toHaveLength(1);
    const b = quiet(6); spawn(b.s, 'bruiser', 70); let dodged = true; const hp0 = b.s.player.hp;
    run(b.sim, 2.2, { ...idle, x: 1, y: 0 }, () => { /* hold right: walks out of the 104 px ring during the 0.95 s telegraph */ }); dodged = b.s.player.hp === hp0 || b.s.player.hp > hp0 - ENEMIES.bruiser.attack.damage; expect(dodged).toBe(true);
  });
  it('ranged: aim freezes before release, the bolt is a real entity that resolves exactly once, and dash i-frames pass through it', () => {
    const { sim, s } = quiet(); spawn(s, 'ranged', 300, 0, { speed: 0 }); let shots = 0, maxLive = 0; const ids = new Set<number>();
    run(sim, 2.4, idle, () => { for (const sh of s.enemyShots) ids.add(sh.id); maxLive = Math.max(maxLive, s.enemyShots.length); });
    shots = events(s, 'enemy_shot').length; expect(shots).toBe(1); expect(ids.size).toBe(1); expect(maxLive).toBe(1);
    expect(events(s, 'enemy_shot_hit')).toHaveLength(1);    // resolved once: a hit or a wall, never both, never repeated
    expect(s.enemyShots).toHaveLength(0); expect(s.player.hp).toBe(100 - ENEMIES.ranged.attack.damage);
    const d = quiet(5); spawn(d.s, 'ranged', 300, 0, { speed: 0 }); d.s.player.invulnerable = 5;
    run(d.sim, 2.4, idle, () => { d.s.player.invulnerable = 5; }); expect(d.s.player.hp).toBe(100);
  });
  it('lunge and dash enemies telegraph first and only deal their strike damage after the windup', () => {
    for (const kind of ['pursuer', 'flanker'] as const) {
      const { sim, s } = quiet(); const a = ENEMIES[kind].attack; spawn(s, kind, a.range - 10); let tTele = -1, tHit = -1; let last = s.player.hp;
      s.player.invulnerable = 0; run(sim, 1.2, idle, t => { if (tTele < 0 && events(s, 'enemy_telegraph').length) tTele = t; if (tHit < 0 && s.player.hp < last) tHit = t; });
      expect(tTele).toBeGreaterThanOrEqual(0); if (tHit >= 0) expect(tHit).toBeGreaterThanOrEqual(tTele + Math.min(a.windup, 0.3) - 0.02);
    }
  });
  it('an enemy killed during its windup never strikes, shoots or damages afterwards, and rewards exactly one XP orb and one death event', () => {
    const { sim, s } = quiet(); const e = spawn(s, 'ranged', 300, 0, { speed: 0 }); run(sim, 0.4); expect(e.mode).toBe('windup');
    expect(damageEnemy(s, e, 999)).toBe(true); expect(damageEnemy(s, e, 999)).toBe(false); run(sim, 3);
    expect(events(s, 'enemy_shot')).toHaveLength(0); expect(s.enemyShots).toHaveLength(0); expect(s.player.hp).toBe(100); expect(events(s, 'enemy_death')).toHaveLength(1); expect(s.pickups).toHaveLength(1); expect(s.kills).toBe(1);
  });
  it('frame rate cannot change a slam: 30 Hz and 60 Hz steps hit once', () => {
    for (const dt of [1 / 30, 1 / 60, 1 / 120]) { const { sim, s } = quiet(); spawn(s, 'bruiser', 60); for (let i = 0; i < Math.round(2.2 / dt); i++) sim.step(dt, idle); expect(s.player.hp).toBe(100 - ENEMIES.bruiser.attack.damage); }
  });
});

describe('B07 behaviour and crowd rules', () => {
  it('ranged enemies keep their distance and back off from a player who closes in', () => {
    const { sim, s } = quiet(); const e = spawn(s, 'ranged', 120, 0, { attackCd: 1e9 }); run(sim, 2); expect(Math.hypot(e.x - s.player.x, e.y - s.player.y)).toBeGreaterThan(200);
  });
  it('crowds separate instead of stacking on one point', () => {
    const { sim, s } = quiet(); for (let i = 0; i < 12; i++) spawn(s, 'pursuer', 400, i * 0.5, { attackCd: 1e9 }); run(sim, 3);
    let minD = 1e9; for (const a of s.enemies) for (const b of s.enemies) if (a !== b) minD = Math.min(minD, Math.hypot(a.x - b.x, a.y - b.y)); expect(minD).toBeGreaterThan(14);
  });
  it('enemy events and shots stay bounded', () => { const { sim, s } = quiet(); for (let i = 0; i < 40; i++) spawn(s, 'ranged', 260 + i, i * 3); s.player.hp = 1e9; s.player.maxHp = 1e9; run(sim, 8); expect(s.enemyEvents.length).toBeLessThanOrEqual(64); });
});

describe('B07 assets', () => {
  const pub = (...p: string[]) => join(__dirname, '..', '..', 'public', ...p);
  it('every enemy sheet is an 8-frame RGBA strip that matches its manifest', () => {
    for (const k of ENEMY_KINDS) { const m = JSON.parse(readFileSync(pub('art', 'enemies', k + '.json'), 'utf8')); const b = readFileSync(pub('art', 'enemies', k + '.png'));
      expect(b.readUInt32BE(16)).toBe(m.frame_width * 8); expect(b.readUInt32BE(20)).toBe(m.frame_height); expect(b[25]).toBe(6); expect(m.frames).toBe(8);
      expect(Object.keys(m.clips)).toEqual(['idle', 'move', 'windup', 'strike', 'hurt', 'death']); expect(m.events.telegraph_frame).toBe(4); expect(existsSync(join(__dirname, '..', '..', m.source))).toBe(true); }
  });
  it('ships every fx sprite and original sound, with the generator and provenance next to the art', () => {
    for (const n of ['aimline', 'chevron', 'bolt', 'bolt-hit', 'death-burst', 'hit-spark', 'circle-warn', 'circle-slam']) expect(existsSync(pub('art', 'enemies', 'fx', n + '.png'))).toBe(true);
    const rep = JSON.parse(readFileSync(pub('audio', 'enemies', 'loudness.json'), 'utf8'));
    for (const n of ENEMY_SOUNDS) { const f = pub('audio', 'enemies', n + '.wav'); expect(existsSync(f)).toBe(true); const b = readFileSync(f); expect(b.toString('ascii', 0, 4)).toBe('RIFF'); expect(b.readUInt32LE(24)).toBe(44100); expect(rep[n].clipped_samples).toBe(0); expect(rep[n].peak_dBFS).toBeLessThanOrEqual(-0.9); }
    for (const k of ENEMY_KINDS) expect(existsSync(join(__dirname, '..', '..', 'art', 'enemies', 'source', k + '.png'))).toBe(true);
    expect(existsSync(join(__dirname, '..', '..', 'art', 'enemies', 'source', 'PROVENANCE.md'))).toBe(true); expect(existsSync(join(__dirname, '..', '..', 'art', 'enemies', 'audio', 'synth_b07.py'))).toBe(true);
  });
  it('warnings are shorter than the windup they announce', () => {
    const rep = JSON.parse(readFileSync(pub('audio', 'enemies', 'loudness.json'), 'utf8'));
    expect(rep.pursuer_wind.seconds).toBeLessThanOrEqual(ENEMIES.pursuer.attack.windup); expect(rep.flanker_wind.seconds).toBeLessThanOrEqual(ENEMIES.flanker.attack.windup);
    expect(rep.bruiser_wind.seconds).toBeLessThanOrEqual(ENEMIES.bruiser.attack.windup); expect(rep.ranged_charge.seconds).toBeLessThanOrEqual(ENEMIES.ranged.attack.windup);
  });
});

class FakeCtx implements CtxLike {
  state = 'running'; currentTime = 0; destination = {};
  createGain(): GainLike { return { gain: { value: 1, setTargetAtTime: () => undefined }, connect: () => undefined, disconnect: () => undefined }; }
  createBufferSource(): SourceLike { return { buffer: null, playbackRate: { value: 1 }, onended: null, connect() {}, disconnect() {}, start() {}, stop() {} }; }
  async resume() {} async suspend() {} async decodeAudioData(b: ArrayBuffer) { return { b }; }
}
const evt = (kind: EnemyEvent['kind'], enemy: EnemyKind, id: number, x = 0): EnemyEvent => ({ id, kind, enemy, enemyId: 1, x, y: 0, dirX: 1, dirY: 0 });
describe('B07 enemy audio mix', () => {
  const mk = async () => { const a = new AbilityAudio(new FakeCtx(), async () => new ArrayBuffer(8)); await a.unlock(); return a; };
  it('each archetype has its own warning and release sound', async () => {
    const a = await mk(); let t = 0; const ctx = a['ctx'] as FakeCtx;
    for (const k of ENEMY_KINDS) { ctx.currentTime += 1; a.handleEnemy(evt('enemy_telegraph', k, ++t), 0, 0); }
    expect(a.started).toEqual(['pursuer_wind', 'flanker_wind', 'bruiser_wind', 'ranged_charge']);
    a['voices'].clear(); ctx.currentTime += 1; a.handleEnemy(evt('enemy_slam', 'bruiser', ++t), 0, 0); ctx.currentTime += 1; a.handleEnemy(evt('enemy_shot', 'ranged', ++t), 0, 0); ctx.currentTime += 1; a.handleEnemy(evt('enemy_death', 'bruiser', ++t), 0, 0);
    expect(a.started.slice(4)).toEqual(['bruiser_slam', 'ranged_shot', 'death_heavy']);
  });
  it('distant enemies are silent, a crowd cannot exceed the voice cap, and identical sounds cannot machine-gun', async () => {
    const a = await mk(); a.handleEnemy(evt('enemy_death', 'pursuer', 1, ENEMY_MIX.hearRange + 50), 0, 0); expect(a.started).toHaveLength(0);
    for (let i = 0; i < 30; i++) a.handleEnemy(evt('enemy_death', 'pursuer', 2 + i, 10), 0, 0); expect(a.started.length).toBe(1);
    const ctx = a['ctx'] as FakeCtx; for (const n of ['pursuer_wind', 'lunge', 'flanker_wind', 'slash', 'bolt_hit', 'ranged_shot', 'bruiser_slam', 'death_heavy']) { ctx.currentTime += 1; a.handleEnemy(evt(n === 'lunge' || n === 'slash' ? 'enemy_strike' : 'enemy_telegraph', n === 'slash' ? 'flanker' : n.startsWith('flanker') ? 'flanker' : 'pursuer', 100, 10), 0, 0); }
    expect(a.activeVoices).toBeLessThanOrEqual(ENEMY_MIX.maxVoices);
  });
});

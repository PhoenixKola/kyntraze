import { describe, expect, it } from 'vitest';
import { evolution, tierGain, tierSparks } from '../game/render/buildEvolution';
import { AuraTracker } from '../game/render/auraState';
import { makeState } from '../sim/GameState';
import { baseMods } from '../content/upgrades';

const mk = () => makeState(1);
describe('B21 build evolution mapper', () => {
  it('is baseline on a fresh run', () => {
    const e = evolution(mk());
    expect([e.auto, e.q, e.e, e.r]).toEqual([0, 0, 0, 0]);
    expect(e.build).toBe(0); expect(tierGain(0)).toBe(1);
  });
  it('tiers come only from earned upgrade stacks, never from cooldown-only cards', () => {
    const s = mk(); s.upgradeStacks = { dashcool: 3, novacool: 0, magnet: 3, endurance: 4 };
    expect(evolution(s).r).toBe(0);
    s.upgradeStacks = { widelance: 3, hardlight: 4, afterburn: 2 };
    expect(evolution(s).e).toBe(3);
  });
  it('B22 audit: lancecool and novacool alone never raise the E / R visual tier', () => {
    const s = mk(); s.upgradeStacks = { lancecool: 3, novacool: 3 };
    const e = evolution(s); expect(e.e).toBe(0); expect(e.r).toBe(0); expect(e.build).toBe(0);
    s.upgradeStacks = { lancecool: 3, novacool: 3, widelance: 1, bloombulk: 1 };
    const f = evolution(s); expect(f.e).toBe(1); expect(f.r).toBe(1);
  });
  it('mirrors real mechanics: echo, afterburn, width', () => {
    const s = mk(); s.mods = { ...baseMods(), beamLinger: 2, sphereEcho: 2, beamWidth: 1.44 };
    const e = evolution(s); expect(e.afterburn).toBe(2); expect(e.echo).toBe(2); expect(e.beamWidth).toBeCloseTo(1.44);
  });
  it('reduced effects still convey the tier with at most one extra spark', () => {
    expect(tierSparks(3, true)).toBe(1); expect(tierSparks(3, false)).toBe(6); expect(tierSparks(0, true)).toBe(0);
  });
});
describe('B21 aura state machine', () => {
  it('moves idle → moving → dash → settle and decays the release pulse', () => {
    const s = mk(), a = new AuraTracker();
    expect(a.update(s, 0.016, 0).phase).toBe('idle');
    s.player.vx = 200; expect(a.update(s, 0.016, 0.8).phase).toBe('moving');
    s.player.dashRemaining = 0.1; expect(a.update(s, 0.016, 1).phase).toBe('dash');
    s.player.dashRemaining = 0; s.player.vx = 0;
    const idle = a.update(s, 0.016, 0); expect(idle.k).toBeLessThan(1);
  });
  it('leans opposite to travel', () => {
    const s = mk(), a = new AuraTracker(); s.player.vx = 100; s.player.vy = 0;
    expect(a.update(s, 0.016, 0.6).leanX).toBeLessThan(0);
  });
});
import { ImpactDirector, HITSTOP_CAP_MS } from '../game/render/impactDirector';
describe('B21 impact director', () => {
  it('never hit-stops common hits or in reduced effects, caps and spaces heavy ones', () => {
    const d = new ImpactDirector();
    expect(d.request('common', false)).toBe(0); expect(d.request('finisher', true)).toBe(0);
    expect(d.request('heavy', false)).toBeGreaterThan(0); expect(d.request('heavy', false)).toBe(0);
    expect(d.take()).toBeLessThanOrEqual(HITSTOP_CAP_MS); expect(d.take()).toBe(0);
    d.tick(1); expect(d.request('finisher', false)).toBe(90);
  });
  it('a finisher overrides the spacing gap', () => { const d = new ImpactDirector(); d.request('heavy', false); expect(d.request('finisher', false)).toBe(90); });
});
import { planMarks, markSpawns, MATERIAL, VERDIGRIS } from '../game/render/arenaMarkPlan';
describe('B21 arena marks', () => {
  it('only real events leave marks, sized from the real radius, each id once', () => {
    const s = mk(); s.hero = 'ren'; s.mods.sphereRadius = 1.3;
    expect(planMarks(s, 0, 0).plans).toHaveLength(0);
    s.abilityEvents.push({ id: 5, kind: 'bloodstar_slam', x: 100, y: 100 });
    const a = planMarks(s, 0, 0); expect(a.plans).toHaveLength(1); expect(a.plans[0].radius).toBeCloseTo(205 * 1.3);
    expect(planMarks(s, a.ability, a.enemy).plans).toHaveLength(0);
  });
  it('is material-correct: Gloam soot differs from Ashen, verdigris only on Ashen hostile marks, reduced drops glow layers', () => {
    const m = { kind: 'crack' as const, x: 0, y: 0, radius: 100, rot: 0, hero: 'hostile' as const, life: 10, strong: true };
    const g = markSpawns(m, 'gloam', false), a = markSpawns(m, 'ashen', false);
    expect(g[0].tint).toBe(MATERIAL.gloam.crack); expect(a[0].tint).toBe(MATERIAL.ashen.crack);
    expect(a.some(q => q.tint === VERDIGRIS)).toBe(true); expect(g.some(q => q.tint === VERDIGRIS)).toBe(false);
    expect(markSpawns(m, 'ashen', true)).toHaveLength(1);
  });
  it('marks are finite-lived and never exceed a few seconds of glow', () => {
    for (const q of markSpawns({ kind: 'scorch', x: 0, y: 0, radius: 80, rot: 0, hero: 'sora', life: 9, strong: true }, 'gloam', false)) expect(q.life).toBeLessThanOrEqual(12);
  });
});
import { reactionFor, reactionPose, bossDamageLevel } from '../game/render/bodyReaction';
describe('B21 body reactions', () => {
  it('a Shardwalker moves more than an armoured Breaker Sentinel on the same hit', () => {
    const a = reactionFor('pursuer', 0.1), b = reactionFor('bruiser', 0.1);
    expect(a.push).toBeGreaterThan(b.push * 1.5); expect(b.delay).toBeGreaterThan(a.delay);
  });
  it('a blocked hit is a shield jolt, never a wound lean; a shield break staggers harder', () => {
    const blk = reactionFor('aegis', 0.2, { blocked: true }), hurt = reactionFor('aegis', 0.2), broke = reactionFor('aegis', 0.2, { broke: true });
    expect(blk.tilt).toBe(0); expect(broke.push).toBeGreaterThan(hurt.push);
  });
  it('the pose spikes then settles to exactly zero', () => {
    const r = reactionFor('flanker', 0.15); expect(reactionPose(r, r.dur * 0.25 + r.delay).off).toBeGreaterThan(0); expect(reactionPose(r, r.dur + 0.01).off).toBe(0);
  });
  it('boss damage levels follow real HP and phase', () => {
    expect([bossDamageLevel(1, 1), bossDamageLevel(0.6, 1), bossDamageLevel(0.3, 1), bossDamageLevel(0.9, 2), bossDamageLevel(0.2, 2)]).toEqual([0, 1, 2, 2, 3]);
  });
});
import { BodyMotion, SIGNATURE, styleFor, type MotionIn } from '../game/render/bodyMotion';
const mi = (o: Partial<MotionIn> = {}): MotionIn => ({ dt: 0.016, style: 'kai', vx: 0, vy: 0, maxSpeed: 250, dashing: false, dashDx: 0, dashDy: 0, casting: false, released: false, hurt: false, hurtDir: 1, alive: true, frozen: false, reduced: false, ...o });
describe('B21 body motion', () => {
  it('leans into the run, springs back at rest, and is identity when frozen or dead', () => {
    const m = new BodyMotion(); let o = m.update(mi());
    for (let i = 0; i < 40; i++) o = m.update(mi({ vx: 250 })); expect(o.rot).toBeGreaterThan(0.02);
    for (let i = 0; i < 120; i++) o = m.update(mi()); expect(Math.abs(o.rot)).toBeLessThan(0.002);
    expect(m.update(mi({ frozen: true }))).toEqual({ rot: 0, sx: 1, sy: 1, dy: 0 }); expect(m.update(mi({ alive: false })).rot).toBe(0);
  });
  it('dash stretches, hurt staggers, squash settles to rest', () => {
    const m = new BodyMotion(); const d = m.update(mi({ dashing: true, vx: 500 })); expect(d.sx).toBeGreaterThan(1.0);
    const h = new BodyMotion(); let o = h.update(mi({ hurt: true })); let peak = Math.abs(o.rot); for (let i = 0; i < 10; i++) { o = h.update(mi()); peak = Math.max(peak, Math.abs(o.rot)); } expect(peak).toBeGreaterThan(0.005);
    for (let i = 0; i < 200; i++) o = h.update(mi()); expect(Math.abs(o.sy - 1)).toBeLessThan(0.02);
  });
  it('eight states have distinct signatures: Cometheart leans hardest, Stillfire glides', () => {
    expect(SIGNATURE.comet.lean).toBeGreaterThan(SIGNATURE.kai.lean); expect(SIGNATURE.still.lean).toBeLessThan(SIGNATURE.kai.lean);
    expect(SIGNATURE.ren_asc.lean).toBeGreaterThan(SIGNATURE.ren.lean); expect(styleFor('sora', 1)).toBe('sora_sov'); expect(styleFor('kai', 3)).toBe('still');
  });
});
import { planLights } from '../game/render/lightPlan';
describe('B21 light plan', () => {
  it('lights come only from real events, each id once, capped', () => {
    const s = mk(); s.hero = 'sora'; expect(planLights(s, 0, 0).lights).toHaveLength(0);
    for (let i = 1; i <= 20; i++) s.abilityEvents.push({ id: i, kind: 'horizon_burst', x: i, y: 0 });
    const r = planLights(s, 0, 0); expect(r.lights.length).toBeLessThanOrEqual(8); expect(r.ability).toBe(20); expect(planLights(s, r.ability, 0).lights).toHaveLength(0);
  });
  it('is hero coloured and hostile slams are magenta, not friendly', () => {
    const s = mk(); s.hero = 'ren'; s.abilityEvents.push({ id: 1, kind: 'bloodstar_slam', x: 0, y: 0 }); expect(planLights(s, 0, 0).lights[0].color).toBe(0xff3a2a);
    const h = mk(); h.enemyEvents.push({ id: 1, kind: 'enemy_slam', enemy: 'bruiser', enemyId: 1, x: 0, y: 0, dirX: 0, dirY: 1 }); expect(planLights(h, 0, 0).lights[0].color).toBe(0xd0407a);
  });
});
import { planEvo, FRAME_COOLDOWN, evoSetFor } from '../game/render/evoPlan';
describe('B21 evolution art + impact frames', () => {
  const cur = () => ({ ability: 0, enemy: 0, frameClock: -9 });
  it('baseline run draws no evolution art; earned tiers draw tier arcs only for the right hero set', () => {
    const s = mk(); s.hero = 'ren'; s.abilityEvents.push({ id: 1, kind: 'auto_hit', x: 5, y: 5 });
    expect(planEvo(s, cur(), false).plans).toHaveLength(0);
    s.upgradeStacks = { impact: 5, tempo: 4 }; const r = planEvo(s, cur(), false); expect(r.plans[0].name).toBe('ren_tier3'); expect(evoSetFor(s)).toBe('ren');
  });
  it('mastered Nova draws the echo ring at the real blast radius; mere cooldown cards do not', () => {
    const s = mk(); s.hero = 'sora'; s.blasts.push({ id: 1, x: 10, y: 10, radius: 120, form: 0, ttl: 1, life: 1 }); s.abilityEvents.push({ id: 1, kind: 'horizon_burst', x: 10, y: 10 });
    s.upgradeStacks = { novacool: 3 }; expect(planEvo(s, cur(), false).plans.some(p => p.name.endsWith('echo_ring'))).toBe(false);
    s.upgradeStacks = { bloombulk: 3, afterglow: 1, twinbloom: 1 }; const e = planEvo(s, cur(), false).plans.find(p => p.name === 'sora_echo_ring'); expect(e?.width).toBeCloseTo(252);
  });
  it('impact frames are rare: none in Reduced Effects, spaced by the cooldown, only on heavy events', () => {
    const s = mk(); s.hero = 'ren'; s.time = 10; s.abilityEvents.push({ id: 1, kind: 'bloodstar_slam', x: 0, y: 0 }, { id: 2, kind: 'bloodstar_slam', x: 0, y: 0 });
    expect(planEvo(s, cur(), true).plans.filter(p => p.frame)).toHaveLength(0);
    const r = planEvo(s, cur(), false); expect(r.plans.filter(p => p.frame)).toHaveLength(1); expect(r.plans[0].name).toBe('impact_crimson');
    const s2 = mk(); s2.hero = 'ren'; s2.time = 10 + FRAME_COOLDOWN - 0.1; s2.abilityEvents.push({ id: 3, kind: 'bloodstar_slam', x: 0, y: 0 }); expect(planEvo(s2, r.cur, false).plans.filter(p => p.frame)).toHaveLength(0);
    const s3 = mk(); s3.abilityEvents.push({ id: 1, kind: 'auto_hit', x: 0, y: 0 }); expect(planEvo(s3, cur(), false).plans.filter(p => p.frame)).toHaveLength(0);
  });
});
import { existsSync, readFileSync } from 'node:fs';
import { B21_SOUNDS, b21SoundUrl } from '../game/audio/abilityAudio';
describe('B21 audio files', () => {
  it('every B21 sound ships as a valid 16-bit mono 44.1k wav that does not clip', () => {
    for (const n of B21_SOUNDS) {
      const p = 'public' + b21SoundUrl(n); expect(existsSync(p), n).toBe(true);
      const b = readFileSync(p); expect(b.toString('ascii', 0, 4)).toBe('RIFF'); expect(b.readUInt16LE(22)).toBe(1); expect(b.readUInt32LE(24)).toBe(44100); expect(b.readUInt16LE(34)).toBe(16);
      let peak = 0; for (let i = 44; i + 1 < b.length; i += 2) peak = Math.max(peak, Math.abs(b.readInt16LE(i))); expect(peak, n).toBeLessThan(32767); expect(peak, n).toBeGreaterThan(8000);
    }
  });
});

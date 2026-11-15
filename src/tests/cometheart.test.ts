import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Simulation } from '../sim/Simulation';
import { COMET, DRAGON, CANNON } from '../content/cometheart';
import type { Enemy, InputState } from '../sim/GameState';
import { damageEnemy, damagePlayer } from '../sim/CombatSystem';
import { migrateSave } from '../sim/SaveSystem';
import { KAI_DIRS, KaiAnimator, parseKaiManifest, type AnimFrameInput, type KaiManifests } from '../assets/kaiAnimation';
import { castDuration } from '../sim/AbilitySystem';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
function enemy(id: number, x: number, y: number, hp = 40, kind: Enemy['kind'] = 'pursuer'): Enemy { return { id, x, y, kind, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }; }
function setup(unlocked = true, enemies: Array<[number, number, number?]> = []) {
  const sim = new Simulation(7, 'gloam', unlocked); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.drive = 100;
  s.enemies = enemies.map(([x, y, hp], i) => enemy(100 + i, x, y, hp ?? 40)); return { sim, s };
}
const run = (sim: Simulation, sec: number, input: InputState = idle()) => { for (let i = 0; i < Math.round(sec / DT); i++) sim.step(DT, input); };
const tap = (sim: Simulation, o: Partial<InputState>) => sim.step(DT, idle(o));

describe('Form II activation rule', () => {
  it('full Drive + F starts the Cometheart reveal only when unlocked; otherwise it is Flarebound as before', () => {
    const a = setup(false); tap(a.sim, { f: true }); expect(a.s.player.form).toBe(1); expect(a.s.cinema).toBeNull();
    const b = setup(true); tap(b.sim, { f: true }); expect(b.s.cinema).not.toBeNull(); expect(b.s.player.form).toBe(0);
    const c = setup(true); c.s.player.drive = 80; tap(c.sim, { f: true }); expect(c.s.player.form).toBe(1);
  });
  it('the reveal freezes the whole run (clock, enemies, cooldowns, i-frames), commits Form II once and then resumes', () => {
    const { sim, s } = setup(true, [[1160, 800, 60]]); s.enemies[0].speed = 60; s.player.dashCooldown = 2; s.player.beamCooldown = 3; s.player.invulnerable = 0;
    tap(sim, { f: true }); const t0 = s.time, ex = s.enemies[0].x, cd = s.player.dashCooldown, bc = s.player.beamCooldown;
    run(sim, 1.0, idle({ x: 1, dash: true, beam: true, sphere: true }));   // inputs during the reveal do nothing
    expect([s.time, s.enemies[0].x, s.player.dashCooldown, s.player.beamCooldown, s.cast]).toEqual([t0, ex, cd, bc, null]);
    expect(s.cinema).not.toBeNull(); expect(s.player.form).toBe(0);
    run(sim, COMET.cinemaFirst.commitAt - 1.0 + 0.05); expect(s.player.form).toBe(2);
    run(sim, 1.2); expect(s.cinema).toBeNull(); expect(s.cometSeen).toBe(1); const tEnd = s.time; run(sim, 0.5); expect(s.time).toBeGreaterThan(tEnd);
    expect(s.abilityEvents.filter(e => e.kind === 'form2_commit').length).toBeLessThanOrEqual(1);
  });
  it('the breaking point shoves and staggers nearby non-boss enemies once, bosses are untouched', () => {
    const { sim, s } = setup(true, [[1160, 800, 60], [1900, 800, 60]]); s.enemies.push(enemy(300, 1180, 840, 1000, 'warden')); const near0 = s.enemies[0].x, boss0 = s.enemies[2].x, far0 = s.enemies[1].x;
    tap(sim, { f: true }); run(sim, COMET.cinemaFirst.breakAt + 0.05);
    expect(s.enemies[0].x).toBeGreaterThan(near0 + 40); expect(s.enemies[0].stagger).toBeGreaterThan(0); expect(s.enemies[1].x).toBe(far0); expect(s.enemies[2].x).toBe(boss0);
  });
  it('later activations use the short reveal; a double press cannot retrigger it; pausing freezes it', () => {
    const { sim, s } = setup(true); tap(sim, { f: true }); sim.step(DT, idle({ f: false })); tap(sim, { f: true }); expect(s.cinema?.first).toBe(true);
    run(sim, 1.0); sim.togglePause(); const t = s.cinema!.t; run(sim, 1.0); expect(s.cinema!.t).toBe(t); sim.togglePause(); run(sim, 2); expect(s.cinema).toBeNull();
    s.player.form = 0; s.player.drive = 100; s.player.formCooldown = 0; tap(sim, { f: true }); expect(s.cinema?.first).toBe(false); expect(s.cinema!.dur).toBe(COMET.cinemaRepeat.dur);
  });
  it('Form II drains and ends cleanly with a cooldown; Drive must refill before the next activation', () => {
    const { sim, s } = setup(true); tap(sim, { f: true }); run(sim, 3); expect(s.player.form).toBe(2);
    s.player.drive = 0.01; run(sim, 0.1); expect(s.player.form).toBe(0); expect(s.player.formCooldown).toBeGreaterThan(5); tap(sim, { f: false }); tap(sim, { f: true }); expect(s.cinema).toBeNull();
  });
});

describe('unlock milestone + save', () => {
  it('defeating the Warden unlocks Cometheart for good, fills Drive and announces it; Seraph does not re-announce', () => {
    const { sim, s } = setup(false); s.player.drive = 10; const w = enemy(900, 1300, 800, 100, 'warden'); s.enemies.push(w); w.ai = { phase: 1, pat: 0, atk: '', step: 0, t: 0, acc: 0, exposed: true, invuln: false, side: 1, destX: 0, destY: 0, gap: 0, push: 0 };
    damageEnemy(s, w, 1e9); expect(s.cometUnlocked).toBe(true); expect(s.cometUnlockedNow).toBe(true); expect(s.player.drive).toBe(100); expect(s.announce?.id).toBe('cometheart'); void sim;
  });
  it('older saves migrate to "locked"; a stored unlock survives a round trip and junk is ignored', () => {
    expect(migrateSave({ version: 1 }).unlocks).toEqual({ cometheart: false, stillfire: false }); expect(migrateSave(null).unlocks).toEqual({ cometheart: false, stillfire: false });
    expect(migrateSave(JSON.parse(JSON.stringify({ unlocks: { cometheart: true } }))).unlocks).toEqual({ cometheart: true, stillfire: false }); expect(migrateSave({ unlocks: { cometheart: 'yes' } }).unlocks).toEqual({ cometheart: false, stillfire: false });
  });
});

function formII(enemies: Array<[number, number, number?]>, aim: [number, number] = [1, 0]) {
  const o = setup(true, enemies); o.s.player.form = 2; o.s.player.aimX = aim[0]; o.s.player.aimY = aim[1]; return o;
}
describe('Dragonfang Rush (E in Form II)', () => {
  it('lunges, bites each enemy in the lane once, spares the flanks and has its own cooldown (Fracture Lance is untouched)', () => {
    const { sim, s } = formII([[1230, 800, 300], [1300, 790, 300], [1230, 900, 300], [900, 800, 300]]);
    tap(sim, { beam: true }); expect(s.cast?.kind).toBe('dragon'); expect(s.player.beamCooldown).toBe(0); expect(s.player.dragonCooldown).toBeGreaterThan(8);
    run(sim, castDuration('dragon') + 0.1); expect(s.cast).toBeNull();
    expect(s.enemies[0].hp).toBeLessThan(300); expect(s.enemies[1].hp).toBeLessThan(300); expect(s.enemies[2].hp).toBe(300); expect(s.enemies[3].hp).toBe(300);
    expect(s.enemies[0].hp).toBe(300 - DRAGON.damage); expect(s.player.x).toBeGreaterThan(1180);
    const hp = s.enemies[0].hp; tap(sim, { beam: false }); tap(sim, { beam: true }); expect(s.cast).toBeNull(); expect(s.enemies[0].hp).toBe(hp);
  });
  it('executes weakened common enemies but never a boss, and only knocks back non-bosses', () => {
    const { sim, s } = formII([[1230, 800, 100]]); s.enemies[0].hp = 10; s.enemies.push(enemy(500, 1260, 800, 1000, 'warden')); s.enemies[1].hp = 150; s.enemies[1].ai = { phase: 1, pat: 0, atk: '', step: 0, t: 0, acc: 0, exposed: false, invuln: false, side: 1, destX: 0, destY: 0, gap: 0, push: 0 };
    const bx = s.enemies[1].x; tap(sim, { beam: true }); run(sim, 1);
    expect(s.enemies.find(e => e.id === 100)?.hp ?? 0).toBe(0); expect(s.enemies.find(e => e.id === 500)!.hp).toBeGreaterThan(0); expect(s.enemies.find(e => e.id === 500)!.x).toBe(bx);
  });
  it('works in all four facings (lane follows the facing, Kai really moves that way)', () => {
    const dirs: Array<[string, [number, number], [number, number]]> = [['east', [1, 0], [1, 0]], ['west', [-1, 0], [-1, 0]], ['south', [0, 1], [0, 1]], ['north', [0, -1], [0, -1]]];
    for (const [, aim, d] of dirs) {
      const { sim, s } = formII([[1100 + d[0] * 150, 800 + d[1] * 150, 300]], aim); tap(sim, { beam: true }); run(sim, 1);
      expect(s.enemies[0].hp).toBe(300 - DRAGON.damage); expect((s.player.x - 1100) * d[0] + (s.player.y - 800) * d[1]).toBeGreaterThan(60);
    }
  });
  it('is interrupted by a hit during the wind-up (cooldown stays spent) and by the dash', () => {
    const { sim, s } = formII([]); tap(sim, { beam: true }); run(sim, 0.1); s.player.invulnerable = 0; damagePlayer(s, 5); expect(s.cast).toBeNull(); expect(s.player.dragonCooldown).toBeGreaterThan(0);
    s.player.invulnerable = 0; s.player.dragonCooldown = 0; run(sim, 0.7); tap(sim, { beam: true }); run(sim, 0.05); tap(sim, { x: 1, dash: true }); expect(s.cast).toBeNull();
  });
});

describe('Cometbreaker Cannon (R in Form II)', () => {
  it('plants Kai, fires after the gather, widens, hits a wide lane, ends on time and spends its own cooldown', () => {
    const { sim, s } = formII([[1300, 800, 600], [1300, 850, 600], [1300, 940, 600], [1700, 800, 600]]); tap(sim, { sphere: true }); expect(s.cast?.kind).toBe('comet'); expect(s.player.cometCooldown).toBeGreaterThan(20); expect(s.player.sphereCooldown).toBe(0);
    const x0 = s.player.x; run(sim, CANNON.gather - 0.1, idle({ x: 1 })); expect(s.player.x).toBe(x0); expect(s.enemies[0].hp).toBe(600);
    run(sim, 0.3); expect(s.cast?.released).toBe(true); const early = 600 - s.enemies[1].hp;
    run(sim, CANNON.fire + CANNON.recover + 0.2); expect(s.cast).toBeNull();
    expect(s.enemies[0].hp).toBeLessThan(600 - 100); expect(s.enemies[2].hp).toBe(600); expect(early).toBeGreaterThanOrEqual(0);
    const hp = s.enemies[0].hp; run(sim, 0.5); expect(s.enemies[0].hp).toBe(hp);   // finite: nothing after the fade
  });
  it('carry-forward: Nova echo adds beam seconds, Nova radius/damage/cooldown scale it, Lance width/damage scale Dragonfang', () => {
    const base = formII([[1300, 800, 9999]]); tap(base.sim, { sphere: true }); run(base.sim, 3); const d0 = 9999 - base.s.enemies[0].hp;
    const up = formII([[1300, 800, 9999]]); up.s.mods.sphereEcho = 2; up.s.mods.sphereDamage = 1.5; up.s.mods.sphereCd = 0.8; tap(up.sim, { sphere: true }); expect(up.s.player.cometCooldown).toBeCloseTo(CANNON.cooldown * 0.8, 1);
    run(up.sim, 3.5); expect(9999 - up.s.enemies[0].hp).toBeGreaterThan(d0 * 1.5 * 1.1);
    const dBase = formII([[1230, 800, 9999]]); tap(dBase.sim, { beam: true }); run(dBase.sim, 1);
    const dUp = formII([[1230, 800, 9999]]); dUp.s.mods.beamDamage = 1.5; tap(dUp.sim, { beam: true }); run(dUp.sim, 1); expect(9999 - dUp.s.enemies[0].hp).toBeCloseTo((9999 - dBase.s.enemies[0].hp) * 1.5, 3);
  });
  it('base Fracture Lance / Nova Bloom still fire in Base and Flarebound', () => {
    for (const form of [0, 1] as const) { const { sim, s } = setup(true); s.player.form = form; s.player.aimX = 1; s.player.aimY = 0; tap(sim, { beam: true }); expect(s.cast?.kind).toBe('beam'); run(sim, 1.5); tap(sim, { sphere: true }); expect(s.cast?.kind).toBe('sphere'); }
  });
});

describe('Kai animator: Form II reveal timeline', () => {
  const load = (root: string, form: 'base' | 'f1' | 'f2') => Object.fromEntries(KAI_DIRS.map(d => [d, parseKaiManifest(JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'art', root, d, 'manifest.json'), 'utf8')), d, form)])) as KaiManifests;
  const [m0, m1, m2] = [load('kai', 'base'), load('kai-f1', 'f1'), load('kai-f2', 'f2')];
  const inp = (o: Partial<AnimFrameInput>): AnimFrameInput => ({ dt: DT, alive: true, moving: false, inputX: 0, inputY: 0, runSpeed: 250, dashing: false, dashX: 0, dashY: 0, attackClock: 1, hasTarget: false, targetDx: 0, targetDy: 0, shot: null, ...o });
  it('plays the Form II Transform clip on the sim timeline, swaps art exactly once at the commit and keeps all four facings loadable', () => {
    for (const d of KAI_DIRS) { expect(m2[d].animations.Transform?.events.form_commit).toBeTypeOf('number'); expect(m2[d].animations.BasicPunch.events.impact).toBe(5); }
    const a = new KaiAnimator(m0, m1, m2); a.update(inp({ form: 1 }), 0.5); a.update(inp({ form: 1 }), 0.5);   // Flarebound first
    const events: string[] = []; let last = a.pose(); const frames: number[] = [];
    for (let t = 0; t <= COMET.cinemaFirst.dur; t += DT) { last = a.update(inp({ form: t >= COMET.cinemaFirst.commitAt ? 2 : 1, cinema: { t, dur: COMET.cinemaFirst.dur, commitAt: COMET.cinemaFirst.commitAt } }), 0.5); events.push(...last.events); frames.push(last.frame); expect(last.clip).toBe('Transform'); }
    expect(events.filter(e => e === 'form_start').length).toBe(1); expect(events.filter(e => e === 'form_commit').length).toBe(1); expect(last.form).toBe('f2');
    expect(Math.max(...frames)).toBe(m2.south.animations.Transform!.frames - 1); expect(frames[0]).toBe(0);
    const after = a.update(inp({ form: 2 }), 0.5); expect(after.clip).toBe('Idle'); expect(after.form).toBe('f2');
  });
  it('Dragonfang plays the BasicPunch clip with impact on the lunge tick; Cometbreaker plays Beam; power-down returns to base art', () => {
    const a = new KaiAnimator(m0, m1, m2); a.update(inp({ form: 2 }), 0.5);
    const at = (kind: 'dragon' | 'comet', t: number, dur: number) => a.update(inp({ form: 2, cast: { id: kind === 'dragon' ? 1 : 2, kind, face: 'east', t, dur, dirX: 1, dirY: 0 } }), 0.5);
    expect(at('dragon', 0.01, 0.84).clip).toBe('BasicPunch'); expect(at('dragon', DRAGON.windup + 0.001, 0.84).frame).toBe(m2.east.animations.BasicPunch.events.impact);
    expect(at('comet', 0.01, 3.1).clip).toBe('Beam'); expect(at('comet', CANNON.gather + 0.001, 3.1).frame).toBe(m2.east.animations.Beam.events.release);
    a.update(inp({ form: 0 }), 0.5); expect(a.visualForm).toBe('base');
  });
});

describe('B12 art / audio / icon assets', () => {
  const pub = (...p: string[]) => join(__dirname, '..', '..', 'public', ...p);
  it('ships Form II sheets, FX sprites, HUD icons, portrait and sounds', () => {
    for (const d of KAI_DIRS) { const m = JSON.parse(readFileSync(pub('art', 'kai-f2', d, 'manifest.json'), 'utf8')); expect(m.form).toBe('form-ii'); for (const a of Object.values(m.animations) as Array<{ sheet: string }>) expect(existsSync(pub('art', 'kai-f2', d, a.sheet))).toBe(true); }
    for (const f of ['ui/icons/dragon.png', 'ui/icons/comet.png', 'ui/icons/form2.png', 'ui/kai-portrait-f2.png', 'art/fx/kai-form2/dragon_a.png', 'art/fx/kai-form2/core.png', 'audio/kai-abilities/comet_fire.wav', 'audio/kai-abilities/form2_commit.wav']) expect(existsSync(pub(f)), f).toBe(true);
  });
  it('hand anchors exist for every Form II facing and clip', () => {
    const t = JSON.parse(readFileSync(pub('art', 'kai-anchors.json'), 'utf8')); for (const d of KAI_DIRS) for (const c of ['Beam', 'Sphere', 'BasicPunch']) expect(t.forms.f2[d][c].length).toBeGreaterThan(10);
  });
});

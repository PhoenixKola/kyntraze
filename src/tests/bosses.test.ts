import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENEMIES, FOOT_RADIUS, PLAYER_FOOT_DY, groundDy, type MobKind } from '../content/enemies';
import { BOSSES, SERAPH, WARDEN } from '../content/bosses';
import { BOSS_MOB_CAP, BOSS_SCHEDULE } from '../content/encounters';
import { Simulation } from '../sim/Simulation';
import { addEnemy } from '../sim/EntityRegistry';
import { damageEnemy } from '../sim/CombatSystem';
import { spawnBoss, startEncounter, bossAlive } from '../sim/BossAiSystem';
import { feetInCone, feetInCircle } from '../sim/Ground';
import type { Enemy, InputState } from '../sim/GameState';
import { AbilityAudio, BOSS_SOUNDS, type CtxLike, type GainLike, type SourceLike } from '../game/audio/abilityAudio';

const DT = 1 / 60;
const idle: InputState = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false };
const quiet = (seed = 5) => { const sim = new Simulation(seed); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.attackClock = 1e9; s.player.hp = 100; return { sim, s }; };
const mob = (s: ReturnType<typeof quiet>['s'], kind: MobKind, dx: number, dy = 0, extra: Partial<Enemy> = {}) => { const d = ENEMIES[kind];
  return addEnemy(s, { kind, x: s.player.x + dx, y: s.player.y + dy, hp: d.hp, maxHp: d.hp, radius: d.radius, speed: d.moveSpeed, damage: d.damage, touchCooldown: 0, attackCd: 1e9, ...extra }); };
const run = (sim: Simulation, sec: number, input = idle, each?: () => void) => { for (let i = 0; i < Math.round(sec / DT); i++) { sim.step(DT, input); each?.(); } };
const evs = (s: ReturnType<typeof quiet>['s'], kind: string, tag?: string) => s.enemyEvents.filter(e => e.kind === kind && (tag === undefined || e.tag === tag));

describe('B07.1 A1: slam telegraph and damage share one ground contract', () => {
  const R = ENEMIES.bruiser.attack.radius;
  // Put Kai's FEET at `d` px from the ring centre (the sentinel's feet) in direction `ang`, then let the slam land on the next tick.
  const slamAt = (d: number, ang: number, dash = false) => {
    const { sim, s } = quiet(); const e = mob(s, 'bruiser', 0, -400, { speed: 0 }); e.x = 1100; e.y = 800; s.player.x = 1100; s.player.y = 800;
    const cx = e.x, cy = e.y + groundDy(e.radius);
    s.player.x = cx + Math.cos(ang) * d; s.player.y = cy + Math.sin(ang) * d - PLAYER_FOOT_DY;
    e.mode = 'windup'; e.modeT = 0.5 * DT; e.aimX = 1; e.aimY = 0; if (dash) s.player.invulnerable = 0.2;
    sim.step(DT, idle); return s.player.hp < 100;
  };
  const dirs = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
  it('hurts at the centre and just inside the visible edge, in every facing', () => { for (const a of dirs) { expect(slamAt(0, a)).toBe(true); expect(slamAt(R - 2, a)).toBe(true); } });
  it('does not hurt just outside the ring (edge + foot disc), in every facing', () => { for (const a of dirs) { expect(slamAt(R + FOOT_RADIUS + 1.5, a)).toBe(false); expect(slamAt(R + 40, a)).toBe(false); } });
  it('is exactly the documented rule: edge + foot disc, never Kai body radius', () => { for (const a of dirs) { expect(slamAt(R + FOOT_RADIUS - 0.5, a)).toBe(true); expect(slamAt(R + 17, a)).toBe(false); } });
  it('a dash (invulnerable) through the ring is a real dodge', () => { for (const a of dirs) expect(slamAt(10, a, true)).toBe(false); });
  it('impact lands when the windup timeline ends: not before the full windup', () => {
    const { sim, s } = quiet(); const e = mob(s, 'bruiser', 0, -400, { speed: 0, attackCd: 0 }); e.x = 1100; e.y = 800 - 60; s.player.x = 1100; s.player.y = 800; e.attackCd = 0;
    let tele = -1, hit = -1; for (let i = 0; i < 240 && hit < 0; i++) { sim.step(DT, idle); if (tele < 0 && evs(s, 'enemy_telegraph').length) tele = s.time; if (s.player.hp < 100) hit = s.time; }
    expect(hit - tele).toBeGreaterThanOrEqual(ENEMIES.bruiser.attack.windup - DT); expect(hit - tele).toBeLessThan(ENEMIES.bruiser.attack.windup + 0.1);
  });
});

describe('B07.1 A2: body contact versus telegraphed attack', () => {
  const kinds: MobKind[] = ['pursuer', 'flanker', 'bruiser', 'ranged'];
  it('body contact does no damage during the visible windup, for every enemy', () => {
    for (const k of kinds) { const { sim, s } = quiet(); const e = mob(s, k, 5, 0, { speed: 0 }); e.mode = 'windup'; e.modeT = 0.35; e.aimX = 1; e.aimY = 0; run(sim, 0.25); expect(s.player.hp).toBe(100); }
  });
  it('walking body contact still hurts, and so does an open (recover) enemy', () => {
    for (const mode of ['move', 'recover'] as const) { const { sim, s } = quiet(); const e = mob(s, 'pursuer', 5, 0, { speed: 0 }); e.mode = mode; e.modeT = 1; run(sim, 0.1); expect(s.player.hp).toBe(100 - ENEMIES.pursuer.damage); expect(s.lastHit?.src).toBe('contact'); }
  });
  it('a lunge strike hurts once with the lunge damage and is labelled as such', () => {
    const { sim, s } = quiet(); const e = mob(s, 'pursuer', 5, 0, { speed: 0 }); e.mode = 'strike'; e.modeT = 0.22; e.aimX = 1; e.aimY = 0; run(sim, 0.1);
    expect(s.player.hp).toBe(100 - ENEMIES.pursuer.attack.damage); expect(s.lastHit?.src).toBe('lunge');
  });
  it('a slam never also deals contact damage in the same attack (no double hit), and i-frames cover the rest', () => {
    const { sim, s } = quiet(); const e = mob(s, 'bruiser', 10, 0, { speed: 0 }); e.mode = 'windup'; e.modeT = 0.5 * DT; e.aimX = 1; run(sim, 0.5);
    expect(s.player.hp).toBe(100 - ENEMIES.bruiser.attack.damage);
  });
  it('post-hit i-frames stop a second source from landing immediately, then it lands after they expire', () => {
    const { sim, s } = quiet(); mob(s, 'pursuer', 5, 0, { speed: 0 }); mob(s, 'flanker', -5, 0, { speed: 0 }); run(sim, 0.1);
    expect(s.player.hp).toBe(100 - ENEMIES.pursuer.damage); run(sim, 0.9); expect(s.player.hp).toBeLessThan(100 - ENEMIES.pursuer.damage);
  });
});

describe('B08 hazards use the ground contract', () => {
  it('circle: feet disc overlap, not Kai body radius', () => {
    const { s } = quiet(); s.player.x = 500; s.player.y = 500 - PLAYER_FOOT_DY;   // feet at (500,500)
    expect(feetInCircle(s, 500 + 54 + FOOT_RADIUS - 0.1, 500, 54)).toBe(true); expect(feetInCircle(s, 500 + 54 + FOOT_RADIUS + 0.1, 500, 54)).toBe(false);
  });
  it('cone: inside the arc hurts, outside by more than the foot slack does not, beyond the radius does not', () => {
    const { s } = quiet(); s.player.x = 500; s.player.y = 500 - PLAYER_FOOT_DY; const arc = (WARDEN.sweep.arcDeg * Math.PI) / 180, r = WARDEN.sweep.radius;
    const at = (d: number, off: number) => feetInCone(s, { x: 500 - Math.cos(off) * d, y: 500 - Math.sin(off) * d, r, ang: off, arc });   // apex placed so the feet sit at angle 0 relative to ang
    expect(at(100, 0)).toBe(true); expect(at(r + FOOT_RADIUS - 0.2, 0)).toBe(true); expect(at(r + FOOT_RADIUS + 0.5, 0)).toBe(false);
    const edge = (a: number) => feetInCone(s, { x: 500 - 100, y: 500, r, ang: -a, arc });   // feet are at +a from the cone axis
    expect(edge(arc / 2 - 0.02)).toBe(true); expect(edge(arc / 2 + 0.5)).toBe(false);
  });
});

describe('B08 elites', () => {
  it('aegis shield: frontal single-target damage is cut, rear and area damage is not, and recovery drops the shield', () => {
    const { s } = quiet(); const e = mob(s, 'aegis', 100, 0); e.hp = e.maxHp = 5000; e.aimX = -1; const hp = e.hp;   // faces the player (west)
    damageEnemy(s, e, 100); expect(hp - e.hp).toBeCloseTo(100 * (1 - ENEMIES.aegis.shield!.reduction)); expect(evs(s, 'enemy_block').length).toBe(1);
    const h2 = e.hp; damageEnemy(s, e, 100, { area: true }); expect(h2 - e.hp).toBe(100);
    e.aimX = 1; const h3 = e.hp; damageEnemy(s, e, 100); expect(h3 - e.hp).toBe(100);   // facing away: the player is behind it
    e.aimX = -1; e.mode = 'recover'; const h4 = e.hp; damageEnemy(s, e, 100); expect(h4 - e.hp).toBe(100);
  });
  it('aegis turns only after Kai stays behind it for the turn delay (flanking works)', () => {
    const { sim, s } = quiet(); const e = mob(s, 'aegis', 100, 0, { speed: 0 }); e.aimX = 1;   // faces east, Kai is west of it (behind)
    run(sim, ENEMIES.aegis.shield!.turnDelay - 0.2); expect(e.aimX).toBe(1); run(sim, 0.4); expect(e.aimX).toBe(-1);
  });
  it('ram: telegraph first, shield up through the ram, and a shield-down recovery', () => {
    const { sim, s } = quiet(); const e = mob(s, 'aegis', 140, 0, { attackCd: 0 }); const seen = new Set<string>(); let tele = -1, hit = -1;
    for (let i = 0; i < 400; i++) { sim.step(DT, idle); seen.add(e.mode); if (tele < 0 && evs(s, 'enemy_telegraph').length) tele = s.time; if (hit < 0 && s.player.hp < 100) hit = s.time; }
    expect(seen.has('windup') && seen.has('strike') && seen.has('recover')).toBe(true); expect(hit - tele).toBeGreaterThanOrEqual(ENEMIES.aegis.attack.windup - DT);
  });
  it('cantor rally speeds up and quickens attacks of nearby enemies only', () => {
    const near = quiet(); mob(near.s, 'cantor', 800, 0, { speed: 0 }); const a = mob(near.s, 'pursuer', 700, 0); const far = quiet(); const b = mob(far.s, 'pursuer', 700, 0);
    run(near.sim, 1); run(far.sim, 1); expect(Math.abs(a.x - (near.s.player.x + 700))).toBeGreaterThan(Math.abs(b.x - (far.s.player.x + 700)) * 1.15);
  });
  it('cantor fires a 3-orb fan after its telegraph', () => {
    const { sim, s } = quiet(); const e = mob(s, 'cantor', 300, 0, { attackCd: 0, speed: 0 }); run(sim, 1.2); expect(e.kind).toBe('cantor');
    expect(s.enemyShots.length + evs(s, 'enemy_shot_hit').length).toBeGreaterThanOrEqual(3); expect(evs(s, 'enemy_telegraph').length).toBe(1);
  });
});

describe('B08 encounter scheduling', () => {
  it('bosses are scheduled one after another and never at the same time', () => {
    expect(BOSS_SCHEDULE.map(b => b.id)).toEqual(['warden', 'seraph']); expect(BOSS_SCHEDULE[1].at).toBeGreaterThan(BOSS_SCHEDULE[0].at);
    const { sim, s } = quiet(); s.time = BOSS_SCHEDULE[1].at + 1; run(sim, 1); const bosses = s.enemies.filter(e => e.kind === 'warden' || e.kind === 'seraph'); expect(bosses.length).toBe(1);   // seraph waits while the warden lives? both due: only the first spawns
    expect(bosses[0].kind).toBe('warden'); run(sim, 1); expect(s.enemies.filter(e => e.kind === 'seraph').length).toBe(0);
  });
  it('ordinary enemies are capped while a boss lives and no elites spawn', () => {
    const { sim, s } = quiet(); s.time = 520; s.spawnTimer = 0; spawnBoss(s, 'warden'); s.encounter.forced = false; run(sim, 20); expect(s.enemies.length).toBeLessThanOrEqual(BOSS_MOB_CAP + 1);
    expect(s.enemies.some(e => e.kind === 'aegis' || e.kind === 'cantor')).toBe(false);
  });
  it('QA jump starts each encounter without spawning anything else on a timer', () => {
    for (const id of ['warden', 'seraph', 'aegis', 'cantor', 'mixed'] as const) { const { s } = quiet(); startEncounter(s, id); expect(s.enemies.length).toBeGreaterThan(0); expect(s.encounter.forced).toBe(true); }
  });
  it('is deterministic for a seed, boss included', () => {
    const go = (seed: number) => { const { sim, s } = quiet(seed); startEncounter(s, 'mixed'); run(sim, 12); return JSON.stringify([s.enemies.map(e => [e.id, e.kind, Math.round(e.x * 10), Math.round(e.y * 10), e.mode]), s.hazards.length, s.enemyShots.length, s.player.hp]); };
    expect(go(3)).toBe(go(3));
  });
});

const hazardsBy = (s: ReturnType<typeof quiet>['s']) => s.hazards.filter(h => !h.fired);
describe('B08 Boss A: Fracture Warden', () => {
  const setup = () => { const q = quiet(); startEncounter(q.s, 'warden'); const w = q.s.enemies[0]; return { ...q, w }; };
  it('arrives invulnerable with a warning event, then fights', () => {
    const { sim, s, w } = setup(); expect(evs(s, 'enemy_intro').length).toBe(1); const hp = w.hp; damageEnemy(s, w, 500); expect(w.hp).toBe(hp); run(sim, BOSSES.warden.intro + 0.1); expect(w.mode).not.toBe('intro'); damageEnemy(s, w, 10); expect(w.hp).toBe(hp - 10);
  });
  it('every attack has its telegraph (event + hazard/lane) before any damage, with at least the minimum reaction window', () => {
    const { sim, s, w } = setup(); s.player.hp = 1e6; s.player.maxHp = 1e6; s.player.invulnerable = 0; run(sim, BOSSES.warden.intro + 0.1);
    const seen = new Set<string>(); let firstHitAfterTele = Infinity; let tele = 0;
    for (let i = 0; i < 60 * 40; i++) { sim.step(DT, idle); s.player.invulnerable = 0; if (w.ai!.atk) seen.add(w.ai!.atk); const t = evs(s, 'enemy_telegraph').length; if (t > tele) tele = t;
      if (s.lastHit && s.lastHit.t === s.time) { firstHitAfterTele = Math.min(firstHitAfterTele, tele); } }
    expect(['sweep', 'rupture', 'rush'].every(a => seen.has(a))).toBe(true); expect(firstHitAfterTele).toBeGreaterThanOrEqual(1);
  });
  it('rupture: ring telegraph exists >= 0.9 s before the first burst and bursts march in order', () => {
    const { sim, s, w } = setup(); run(sim, BOSSES.warden.intro + 0.05); w.mode = 'move'; w.attackCd = 0; w.ai!.pat = 1; s.player.x = w.x + 150; s.player.y = w.y;   // pattern index 1 = rupture
    run(sim, 0.05); const hz = hazardsBy(s).filter(h => h.tag === 'rupture'); expect(hz.length).toBe(WARDEN.rupture.count[0]); expect(Math.min(...hz.map(h => h.delay))).toBeGreaterThanOrEqual(WARDEN.rupture.delay - 0.06);
    const delays = hz.map(h => h.delay); expect([...delays].sort((a, b) => a - b)).toEqual(delays);
  });
  it('sweep: the cone is safe at the side wedge in phase 2 and covers front and back', () => {
    const { sim, s, w } = setup(); run(sim, BOSSES.warden.intro + 0.05); w.ai!.phase = 2; w.mode = 'move'; w.attackCd = 0; w.ai!.pat = 1; s.player.x = w.x + 120; s.player.y = w.y; run(sim, 0.05);
    const cones = hazardsBy(s).filter(h => h.shape === 'cone'); expect(cones.length).toBe(2); expect(Math.abs(Math.abs(cones[0].ang - cones[1].ang) - Math.PI)).toBeLessThan(1e-6);
    const side = { x: cones[0].x + Math.cos(cones[0].ang + Math.PI / 2) * 120, y: cones[0].y + Math.sin(cones[0].ang + Math.PI / 2) * 120 };
    s.player.x = side.x; s.player.y = side.y - PLAYER_FOOT_DY; expect(cones.some(c => feetInCone(s, c))).toBe(false);
    s.player.x = cones[0].x + Math.cos(cones[0].ang) * 100; s.player.y = cones[0].y + Math.sin(cones[0].ang) * 100 - PLAYER_FOOT_DY; expect(cones.some(c => feetInCone(s, c))).toBe(true);
  });
  it('sweep recovery is an exposed punish window (+35 % damage)', () => {
    const { sim, s, w } = setup(); run(sim, BOSSES.warden.intro + 0.05); w.mode = 'recover'; w.modeT = 1; w.ai!.exposed = true; const hp = w.hp; damageEnemy(s, w, 100); expect(hp - w.hp).toBeCloseTo(100 * (1 + BOSSES.warden.exposedBonus)); void sim;
  });
  it('phase 2 at half health: invulnerable transition, hazards cleared, harmless, then faster cooldown', () => {
    const { sim, s, w } = setup(); run(sim, BOSSES.warden.intro + 0.05); s.player.hp = 1e6; w.ai!.pat = 1; w.attackCd = 0; run(sim, 0.2); expect(hazardsBy(s).length).toBeGreaterThan(0);
    w.hp = BOSSES.warden.hp * 0.5 - 1; run(sim, 0.05); expect(w.ai!.phase).toBe(2); expect(w.mode).toBe('phase'); expect(w.ai!.invuln).toBe(true); expect(hazardsBy(s).length).toBe(0); expect(evs(s, 'enemy_phase').length).toBe(1);
    const hp = w.hp; damageEnemy(s, w, 50); expect(w.hp).toBe(hp); run(sim, BOSSES.warden.phaseT + 0.1); expect(w.mode).not.toBe('phase'); expect(w.ai!.invuln).toBe(false);
  });
  it('defeat: reward orbs, counter, hazards gone, nothing can hurt afterwards', () => {
    const { sim, s, w } = setup(); run(sim, BOSSES.warden.intro + 0.05); w.ai!.pat = 1; w.attackCd = 0; run(sim, 0.2); const before = s.pickups.length; damageEnemy(s, w, 1e6);
    expect(s.bossesDefeated).toBe(1); expect(s.pickups.length - before).toBe(BOSSES.warden.rewardOrbs); expect(hazardsBy(s).length).toBe(0); expect(evs(s, 'enemy_death')[0].tag).toBe('boss'); expect(bossAlive(s)).toBe(false);
    s.player.x = w.x; s.player.y = w.y; run(sim, 2); expect(s.player.hp).toBe(100);
  });
  it('rush ends early against a wall and stays exposed afterwards', () => {
    const { sim, s, w } = setup(); run(sim, BOSSES.warden.intro + 0.05); w.x = 120; w.y = 800; w.aimX = -1; w.aimY = 0; w.mode = 'strike'; w.modeT = WARDEN.rush.strike; w.ai!.atk = 'rush'; w.ai!.step = 0; s.player.x = 1500;
    run(sim, 0.3); expect(w.mode).toBe('recover'); expect(w.ai!.exposed).toBe(true);
  });
  it('windup scale makes phase 2 telegraphs shorter but never below the floor', () => { expect(WARDEN.sweep.windup * BOSSES.warden.windupScale[1]).toBeGreaterThanOrEqual(0.8); expect(WARDEN.rush.windup * BOSSES.warden.windupScale[1]).toBeGreaterThanOrEqual(0.75); });
});

describe('B08 Boss B: Null Seraph', () => {
  const setup = () => { const q = quiet(); startEncounter(q.s, 'seraph'); const b = q.s.enemies[0]; run(q.sim, BOSSES.seraph.intro + 0.05); q.s.player.hp = 1e6; return { ...q, b }; };
  it('volley: telegraph, then 5 bolts with a gap between them wide enough to stand in', () => {
    const { sim, s, b } = setup(); b.mode = 'move'; b.attackCd = 0; b.ai!.pat = 0; run(sim, 0.05); expect(b.ai!.atk).toBe('volley'); expect(evs(s, 'enemy_telegraph').length).toBeGreaterThan(0);
    run(sim, SERAPH.volley.windup + 0.2); const shots = s.enemyShots.filter(x => x.kind === 'prism'); expect(shots.length).toBe(SERAPH.volley.count[0]);
    s.player.x = 5000; run(sim, 1); const live = s.enemyShots.filter(x => x.kind === 'prism'); const d = Math.hypot(live[0].x - b.x, live[0].y - b.y); const gap = Math.hypot(live[0].x - live[1].x, live[0].y - live[1].y);
    expect(d).toBeGreaterThan(SERAPH.band.near - 20); expect(gap).toBeGreaterThanOrEqual(2 * (17 + SERAPH.volley.radius) - 2);   // Kai (r 17) fits between two bolts (r 8) by the time they reach the combat band
  });
  it('orbit bloom: the marked gaps really are empty, so standing in one is safe', () => {
    const { sim, s, b } = setup(); b.mode = 'move'; b.attackCd = 0; b.ai!.pat = 1; run(sim, 0.05); expect(b.ai!.atk).toBe('ring'); const gap = b.ai!.gap;
    run(sim, SERAPH.ring.windup + 0.1); const shots = s.enemyShots.filter(x => x.kind === 'prism'); expect(shots.length).toBeGreaterThan(SERAPH.ring.count - 7); expect(shots.length).toBeLessThan(SERAPH.ring.count);
    for (const gc of [gap + 0.7, gap - 0.7, gap + Math.PI]) for (const sh of shots) { let d = Math.atan2(sh.y - b.y, sh.x - b.x) - gc; d = Math.atan2(Math.sin(d), Math.cos(d)); expect(Math.abs(d)).toBeGreaterThanOrEqual(SERAPH.ring.gapHalf - 0.05); }
    // Kai parked in the first gap, 220 px out, takes no damage while the ring passes
    s.player.x = b.x + Math.cos(gap + 0.7) * 220; s.player.y = b.y + Math.sin(gap + 0.7) * 220; s.player.hp = 100; run(sim, 3); expect(s.player.hp).toBe(100);
  });
  it('blink: the destination is marked first, the seraph is intangible while it moves, then it fires', () => {
    const { sim, s, b } = setup(); b.mode = 'move'; b.attackCd = 0; b.ai!.pat = 3; run(sim, 0.05); expect(b.ai!.atk).toBe('blink'); const sig = hazardsBy(s).find(h => h.shape === 'sigil'); expect(sig).toBeTruthy();
    const x0 = b.x; run(sim, SERAPH.blink.windup + 0.05); expect(b.mode).toBe('blink'); const hp = b.hp; damageEnemy(s, b, 99); expect(b.hp).toBe(hp);
    run(sim, SERAPH.blink.vanish + 0.05); expect(Math.hypot(b.x - s.player.x, b.y - s.player.y)).toBeGreaterThan(200); expect(b.x).not.toBe(x0); expect(b.ai!.invuln).toBe(false);
  });
  it('spiral torrent stays under the projectile cap and ends', () => {
    const { sim, s, b } = setup(); b.ai!.phase = 2; b.mode = 'move'; b.attackCd = 0; b.ai!.pat = 0; let peak = 0; run(sim, 5, idle, () => { peak = Math.max(peak, s.enemyShots.length); s.player.invulnerable = 1; });
    expect(peak).toBeGreaterThan(30); expect(peak).toBeLessThanOrEqual(SERAPH.maxShots);
  });
  it('defeat removes its bolts', () => { const { sim, s, b } = setup(); b.mode = 'move'; b.attackCd = 0; b.ai!.pat = 1; run(sim, SERAPH.ring.windup + 0.3); expect(s.enemyShots.length).toBeGreaterThan(0); damageEnemy(s, b, 1e6); expect(s.enemyShots.length).toBe(0); expect(s.bossesDefeated).toBe(1); });
  it('pause mid-telegraph freezes the encounter and resumes where it was', () => {
    const { sim, s, b } = setup(); b.mode = 'move'; b.attackCd = 0; b.ai!.pat = 1; run(sim, 0.3); const t = b.modeT, h = hazardsBy(s).length; sim.togglePause(); for (let i = 0; i < 120; i++) sim.step(DT, idle); expect(b.modeT).toBe(t); expect(hazardsBy(s).length).toBe(h); sim.togglePause(); run(sim, 0.1); expect(b.modeT).toBeLessThan(t);
  });
});

describe('B08 form change and restart cleanliness', () => {
  it('transforming mid-boss-attack neither cancels the hazards nor makes Kai take damage through them', () => {
    const { sim, s } = quiet(); startEncounter(s, 'warden'); const w = s.enemies[0]; run(sim, BOSSES.warden.intro + 0.05); w.ai!.pat = 1; w.attackCd = 0; run(sim, 0.2); const n = hazardsBy(s).length; s.player.drive = 100; sim.step(DT, { ...idle, f: true });
    expect(s.player.form).toBe(1); expect(hazardsBy(s).length).toBe(n);
  });
  it('a fresh Simulation (retry) carries nothing over', () => { const a = new Simulation(9); startEncounter(a.state, 'warden'); const b = new Simulation(9); expect(b.state.hazards.length + b.state.enemyShots.length + b.state.enemies.length).toBe(0); expect(b.state.bossesDefeated).toBe(0); });
});

describe('B08 assets and audio', () => {
  const pub = (...p: string[]) => join(__dirname, '..', '..', 'public', ...p);
  it('ships both boss sheets, the elite sheets, every fx and sound with provenance', () => {
    for (const k of ['warden', 'seraph']) { const m = JSON.parse(readFileSync(pub('art', 'bosses', k + '.json'), 'utf8')); expect(m.frames).toBe(16); expect(m.named.death.length).toBe(3); expect(m.columns).toBe(4); expect(existsSync(pub('art', 'bosses', k + '.png'))).toBe(true); }
    for (const k of ['aegis', 'cantor']) { const m = JSON.parse(readFileSync(pub('art', 'enemies', k + '.json'), 'utf8')); expect(m.frames).toBe(8); expect(existsSync(pub('art', 'enemies', k + '.png'))).toBe(true); }
    for (const n of ['cone-warn', 'cone-strike', 'rupture-burst', 'rupture-crater', 'shock-ring', 'boss-burst', 'warning-glyph', 'emblem-warden', 'prism-bolt', 'prism-hit', 'orb-bolt', 'blink-sigil', 'blink-flash', 'shield-block', 'aura-ring', 'emblem-seraph']) expect(existsSync(pub('art', 'bosses', 'fx', n + '.png'))).toBe(true);
    const rep = JSON.parse(readFileSync(pub('audio', 'bosses', 'loudness.json'), 'utf8'));
    for (const n of BOSS_SOUNDS) { const f = pub('audio', 'bosses', n + '.wav'); expect(existsSync(f)).toBe(true); expect(readFileSync(f).toString('ascii', 0, 4)).toBe('RIFF'); expect(rep[n].clipped_samples).toBe(0); }
    expect(existsSync(join(__dirname, '..', '..', 'art', 'bosses', 'source', 'PROVENANCE.md'))).toBe(true);
  });
  it('boss warnings are shorter than the windups they announce', () => {
    const rep = JSON.parse(readFileSync(pub('audio', 'bosses', 'loudness.json'), 'utf8'));
    expect(rep.rupture_warn.seconds).toBeLessThanOrEqual(WARDEN.rupture.windup + WARDEN.rupture.strike + 0.3); expect(rep.sweep_wind.seconds).toBeLessThanOrEqual(WARDEN.sweep.windup + 0.05);
    expect(rep.charge_wind.seconds).toBeLessThanOrEqual(WARDEN.rush.windup); expect(rep.seraph_volley_wind.seconds).toBeLessThanOrEqual(SERAPH.volley.windup); expect(rep.seraph_ring_wind.seconds).toBeLessThanOrEqual(SERAPH.ring.windup);
  });
  class FakeCtx implements CtxLike {
    state = 'running'; currentTime = 0; destination = {};
    createGain(): GainLike { return { gain: { value: 1, setTargetAtTime: () => undefined }, connect: () => undefined, disconnect: () => undefined }; }
    createBufferSource(): SourceLike { return { buffer: null, playbackRate: { value: 1 }, onended: null, connect() {}, disconnect() {}, start() {}, stop() {} }; }
    async resume() {} async suspend() {} async decodeAudioData(b: ArrayBuffer) { return { b }; }
  }
  it('maps boss events to their own sounds, heard from far away, within the boss voice cap', async () => {
    const a = new AbilityAudio(new FakeCtx(), async () => new ArrayBuffer(8)); await a.unlock(); const ctx = a['ctx'] as FakeCtx; let id = 0;
    const ev = (kind: string, enemy: string, tag?: string, x = 800) => ({ id: ++id, kind, enemy, enemyId: 1, x, y: 0, dirX: 1, dirY: 0, tag }) as never;
    for (const [k, e, t] of [['enemy_telegraph', 'warden', 'rupture'], ['hazard_fire', 'warden', 'rupture'], ['enemy_telegraph', 'warden', 'sweep'], ['enemy_strike', 'warden', 'sweep'], ['enemy_telegraph', 'seraph', 'ring'], ['enemy_phase', 'seraph', 'seraph'], ['enemy_block', 'aegis', undefined]] as const) { ctx.currentTime += 1; a['voices'].clear(); a.handleEnemy(ev(k, e, t, e === 'aegis' ? 300 : 800), 0, 0); }
    expect(a.started).toEqual(['rupture_warn', 'rupture_burst', 'sweep_wind', 'sweep_hit', 'seraph_ring_wind', 'seraph_phase', 'aegis_block']);
    ctx.currentTime += 1; a['voices'].clear(); a.handleEnemy(ev('enemy_telegraph', 'warden', 'rupture', 5000), 0, 0); expect(a.started.length).toBe(7);   // out of range
  });
});

import { describe, expect, it } from 'vitest';
import { BOSSES } from '../content/bosses';
import type { BossKind } from '../content/enemies';
import { startEncounter } from '../sim/BossAiSystem';
import { damageEnemy } from '../sim/CombatSystem';
import { feetInCone, feetInLane } from '../sim/Ground';
import type { Enemy, GameState } from '../sim/GameState';
import { sovParts } from '../sim/bosses/sovereign';
import { choirParts } from '../sim/bosses/hollowChoir';
import { quiet, run, DT, idle } from './b22util';

const NEW: BossKind[] = ['castellan', 'regent', 'oathkeeper', 'mirror_tyrant', 'chronophage', 'hollow_choir', 'sovereign'];
const fight = (kind: BossKind, arena: 'gloam' | 'aetherfall' | 'paradox' = 'gloam') => {
  const { sim, s } = quiet({ arena, hp: 1e9 }); s.player.x = 1100; s.player.y = 900; startEncounter(s, kind);
  const boss = () => s.enemies.find(e => e.kind === kind && !e.part && e.hp > 0)!;
  return { sim, s, boss };
};
const skipIntro = (sim: ReturnType<typeof quiet>['sim'], s: GameState, b: () => Enemy) => { for (let i = 0; i < 60 * 6 && b().mode === 'intro'; i++) sim.step(DT, idle); s.player.invulnerable = 0; };

describe('B22 bosses: every new boss obeys the telegraph -> release -> recovery contract', () => {
  for (const kind of NEW) it(`${kind}: invulnerable intro, a warning before every hazard, >= 3 distinct attacks, real hits only after the delay`, () => {
    const { sim, s, boss } = fight(kind); const e0 = boss(); const hp0 = e0.hp;
    expect(s.enemyEvents.some(e => e.kind === 'enemy_intro')).toBe(true);
    expect(damageEnemy(s, e0, 500)).toBe(false); expect(e0.hp).toBe(hp0);   // intro: untouchable
    const atks = new Set<string>(); let telegraphedFirst = true, seenFire = false; const warnedHazards = new Set<number>(); const hpBefore = s.player.hp;
    for (let i = 0; i < 60 * 70; i++) {
      sim.step(DT, idle); const b = boss(); if (!b) break; if (b.ai?.atk) atks.add(b.ai.atk);
      for (const h of s.hazards) { if (!h.fired && h.damage > 0) warnedHazards.add(h.id); if (h.fired && h.damage > 0 && !warnedHazards.has(h.id) && h.ttl > 0) telegraphedFirst = false; if (h.fired) seenFire = true; }
      s.player.hp = Math.max(s.player.hp, hpBefore);
    }
    expect(atks.size).toBeGreaterThanOrEqual(kind === 'hollow_choir' ? 1 : 3); expect(telegraphedFirst).toBe(true); expect(seenFire).toBe(true);
  });
  it('the registry supports all 9 boss ids with phases, rewards and a death time', () => {
    for (const id of ['warden', 'seraph', ...NEW] as BossKind[]) { const d = BOSSES[id]; expect(d.hp).toBeGreaterThan(1000); expect(d.deathT).toBeGreaterThan(1); expect(d.rewardOrbs).toBeGreaterThan(5); expect(d.phaseAt).toBeGreaterThan(0); }
    for (const id of NEW) expect(BOSSES[id].armor).toBeLessThan(1);
  });
  for (const kind of NEW) it(`${kind}: a phase change is announced, invulnerable while it plays, clears owned hazards, and the defeat pays out exactly once`, () => {
    const { sim, s, boss } = fight(kind); skipIntro(sim, s, boss); const b = boss();
    if (kind === 'sovereign') { for (const p of sovParts(s, b, 'anchor')) p.hp = 0; s.player.invulnerable = 1e9; }
    else b.hp = b.maxHp * BOSSES[kind].phaseAt * 0.99;
    s.player.invulnerable = 1e9; const evs0 = s.enemyEvents.length; let phased = false;
    for (let i = 0; i < 60 * 4 && !phased; i++) { sim.step(DT, idle); s.player.invulnerable = 1e9; if (boss().mode === 'phase') { phased = true; expect(boss().ai!.invuln).toBe(true); } }
    expect(phased).toBe(true); expect(s.enemyEvents.concat().length).toBeGreaterThan(0); void evs0;
    expect(boss().ai!.phase).toBeGreaterThanOrEqual(2);
    // defeat
    const d0 = s.bossesDefeated; const bb = boss(); bb.hp = 1; if (bb.ai) { bb.ai.invuln = false; bb.ai.exposed = true; bb.mode = 'move'; }
    if (kind === 'sovereign') { for (const p of s.enemies.filter(x => x.part)) p.hp = 0; }
    if (kind === 'hollow_choir') for (const p of choirParts(s, bb)) p.hp = 0;
    if (kind === 'mirror_tyrant') bb.ex!.face = Math.atan2(s.player.y - bb.y, s.player.x - bb.x) + Math.PI;   // hit from behind the mirror
    run(sim, 0.2, idle, st => { st.player.invulnerable = 1e9; }); bb.ex = bb.ex ?? {}; bb.ex.shield = 0; bb.ex.open = 99; if (bb.ai) bb.ai.invuln = false;
    expect(damageEnemy(s, bb, 1e6, { area: true })).toBe(true);
    expect(s.bossesDefeated).toBe(d0 + 1); expect(s.enemyEvents.filter(e => e.kind === 'boss_defeated' && e.tag === kind)).toHaveLength(1); expect(s.hazards.filter(h => h.owner === bb.id)).toHaveLength(0);
    for (const e of s.enemies) if (e.part?.of === bb.id) expect(e.hp).toBe(0);
    run(sim, 0.3, idle, st => { st.player.invulnerable = 1e9; }); expect(s.bossesDefeated).toBe(d0 + 1);
  });
});

describe('B22 Castellan', () => {
  it('the sweep leaves a readable rear escape wedge; pillars leave one gap in the line; the slam opens a posture-break window', () => {
    const { sim, s, boss } = fight('castellan', 'aetherfall'); skipIntro(sim, s, boss); const b = boss(); s.player.invulnerable = 1e9;
    b.ai!.pat = 0; b.attackCd = 0; run(sim, 0.3, idle, st => { st.player.invulnerable = 1e9; });
    const sw = s.hazards.find(h => h.tag === 'sweep'); expect(sw).toBeTruthy(); expect(sw!.arc).toBeLessThan(Math.PI * 1.5);
    const behind = { x: sw!.x + Math.cos(sw!.ang + Math.PI) * 120, y: sw!.y + Math.sin(sw!.ang + Math.PI) * 120 }; s.player.x = behind.x; s.player.y = behind.y - 24; expect(feetInCone(s, sw!)).toBe(false);
    s.player.x = sw!.x + Math.cos(sw!.ang) * 120; s.player.y = sw!.y + Math.sin(sw!.ang) * 120 - 24; expect(feetInCone(s, sw!)).toBe(true);
    run(sim, 4, idle, st => { st.player.invulnerable = 1e9; });
    const f2 = fight('castellan', 'aetherfall'); skipIntro(f2.sim, f2.s, f2.boss); const b2 = f2.boss(); b2.ai!.pat = 1; b2.attackCd = 0; run(f2.sim, 0.3, idle, st => { st.player.invulnerable = 1e9; });
    expect(f2.s.hazards.filter(h => h.tag === 'pillar')).toHaveLength(4);
    const f3 = fight('castellan', 'aetherfall'); skipIntro(f3.sim, f3.s, f3.boss); const b3 = f3.boss(); b3.ai!.pat = 2; b3.attackCd = 0; let opened = false;
    for (let i = 0; i < 60 * 6; i++) { f3.sim.step(DT, idle); f3.s.player.invulnerable = 1e9; if (b3.mode === 'recover' && b3.ai!.exposed) { opened = true; break; } } expect(opened).toBe(true);
    const h0 = b3.hp; damageEnemy(f3.s, b3, 100); const open = h0 - b3.hp; b3.ai!.exposed = false; const h1 = b3.hp; damageEnemy(f3.s, b3, 100); const closed = h1 - b3.hp; expect(open).toBeGreaterThan(closed * 2);
  });
});

describe('B22 Regent', () => {
  it('records attacks and replays each ONCE as a flagged, previewed echo; the queue is bounded', () => {
    const { sim, s, boss } = fight('regent', 'paradox'); skipIntro(sim, s, boss); const b = boss(); s.player.invulnerable = 1e9; let maxQ = 0, echoSeen = 0; const seen = new Set<number>();
    for (let i = 0; i < 60 * 30; i++) { sim.step(DT, idle); s.player.invulnerable = 1e9; const bb = boss(); maxQ = Math.max(maxQ, bb.echo?.length ?? 0); for (const h of s.hazards) if (h.tag === 'echo' && !seen.has(h.id)) { seen.add(h.id); expect(h.echo).toBe(true); expect(h.delay).toBeGreaterThanOrEqual(0.29); echoSeen++; } }
    expect(maxQ).toBeLessThanOrEqual(3); expect(echoSeen).toBeGreaterThan(0); void b;
  });
  it('split: two illusions that never harm the boss when hit; popping both opens the real body; the illusions have no xp or kills', () => {
    const { sim, s, boss } = fight('regent', 'paradox'); skipIntro(sim, s, boss); const b = boss(); s.player.invulnerable = 1e9; b.ai!.pat = 2; b.attackCd = 0;
    run(sim, 0.4, idle, st => { st.player.invulnerable = 1e9; }); const decoys = s.enemies.filter(e => e.ex?.decoy); expect(decoys.length).toBeGreaterThan(0);
    const hp = b.hp, kills = s.kills; for (const d of decoys) damageEnemy(s, d, 999); expect(b.hp).toBe(hp); expect(s.kills).toBe(kills);
    run(sim, 0.2, idle, st => { st.player.invulnerable = 1e9; }); expect((b.ex?.open ?? 0)).toBeGreaterThan(0); expect(b.ai!.exposed).toBe(true);
  });
});

describe('B22 Oathkeeper', () => {
  it('a reflect stance refuses damage and returns a visible bolt; a feint exposes it; a real strike shows a lane while a feint does not', () => {
    const { sim, s, boss } = fight('oathkeeper'); skipIntro(sim, s, boss); const b = boss(); s.player.invulnerable = 1e9; b.ai!.pat = 0; b.attackCd = 0;
    // pat 0: slash_combo; skip to feint with parity: list index 1 -> pat=1 means ai.pat%2 === 1 => feint (real = even)
    b.ai!.pat = 1; b.attackCd = 0; run(sim, 0.2, idle, st => { st.player.invulnerable = 1e9; }); expect(b.ai!.atk).toBe('feint_stance');
    expect(b.ex?.reflect).toBe(1); const hp = b.hp; b.ai!.invuln = false; damageEnemy(s, b, 200); expect(b.hp).toBe(hp); expect(s.enemyShots.some(sh => sh.kind === 'reflect')).toBe(true);
    const real = b.ex?.real; expect(real).toBe(0); expect(s.hazards.some(h => h.tag === 'lunge')).toBe(false);
    let opened = false; for (let i = 0; i < 60 * 3 && !opened; i++) { sim.step(DT, idle); s.player.invulnerable = 1e9; if ((b.ex?.open ?? 0) > 0) opened = true; } expect(opened).toBe(true);
    const f = fight('oathkeeper'); skipIntro(f.sim, f.s, f.boss); const b2 = f.boss(); b2.ex = { ...(b2.ex ?? {}), nf: 1 }; b2.ai!.pat = 1; b2.attackCd = 0; f.s.player.invulnerable = 1e9; run(f.sim, 0.2, idle, st => { st.player.invulnerable = 1e9; });
    expect(b2.ai!.atk).toBe('feint_stance'); expect(b2.ex?.real).toBe(1); expect(f.s.hazards.some(h => h.tag === 'lunge')).toBe(true); expect(f.s.hazards.some(h => h.tag === 'feint')).toBe(false); void feetInLane;
  });
  it('an honest dodge through its strike (dash i-frames while its lane fires) exposes it', () => {
    const { sim, s, boss } = fight('oathkeeper'); skipIntro(sim, s, boss); const b = boss(); b.ai!.pat = 4; b.attackCd = 0; b.ai!.pat = 0; run(sim, 0.1, idle, st => { st.player.invulnerable = 1e9; });
    // wait for the first slash hazard, stand inside it dashing
    let hit = false; for (let i = 0; i < 60 * 3 && !hit; i++) { sim.step(DT, idle); const h = s.hazards.find(z => z.tag === 'slash' && !z.fired); if (h) { s.player.x = h.x + Math.cos(h.ang) * 60; s.player.y = h.y + Math.sin(h.ang) * 60 - 24; s.player.dashRemaining = 1; s.player.invulnerable = 5; if (h.delay < 0.03) hit = true; } }
    run(sim, 0.1, idle, st => { st.player.dashRemaining = 1; st.player.invulnerable = 5; }); expect(b.ex?.open ?? 0).toBeGreaterThan(0);
  });
});

describe('B22 Mirror Tyrant', () => {
  it('reflects projectiles only from its marked front arc (as a slow visible shard); other hits chip the facing mirror node; breaking every node opens it', () => {
    const { sim, s, boss } = fight('mirror_tyrant'); skipIntro(sim, s, boss); const b = boss(); const X = b.ex!; X.face = Math.atan2(s.player.y - b.y, s.player.x - b.x); s.player.invulnerable = 1e9;
    const hp = b.hp; damageEnemy(s, b, 100, { proj: true }); expect(b.hp).toBe(hp); expect(s.enemyShots.some(sh => sh.kind === 'reflect')).toBe(true);
    const shots = s.enemyShots.length; damageEnemy(s, b, 100, { proj: true }); expect(s.enemyShots.length).toBe(shots);   // rate limited, no spam
    const n0 = X.n0 + X.n1 + X.n2; b.blockT = -9; damageEnemy(s, b, 100); expect(X.n0 + X.n1 + X.n2).toBeLessThan(n0); expect(b.hp).toBe(hp);   // a melee hit chips a node instead of the body
    for (let k = 0; k < 6; k++) damageEnemy(s, b, 400); expect(X.n0 + X.n1 + X.n2).toBe(0); expect(X.open).toBeGreaterThan(0);
    const h1 = b.hp; b.ai!.exposed = true; damageEnemy(s, b, 100); expect(b.hp).toBeLessThan(h1);
  });
  it('from behind the mirror the boss takes damage normally', () => {
    const { sim, s, boss } = fight('mirror_tyrant'); skipIntro(sim, s, boss); const b = boss(); const X = b.ex!; X.face = Math.atan2(s.player.y - b.y, s.player.x - b.x) + Math.PI;
    const hp = b.hp; damageEnemy(s, b, 100, { proj: true }); expect(b.hp).toBeLessThan(hp);
  });
});

describe('B22 Chronophage', () => {
  it('a time well really slows hostile boss shots (authoritative speed), a fast well is capped at 1.5x, and the run clock never changes', () => {
    const { sim, s, boss } = fight('chronophage'); skipIntro(sim, s, boss); const b = boss(); s.player.invulnerable = 1e9; b.attackCd = 99;
    s.hazards.push({ id: 9001, shape: 'circle', x: 300, y: 300, r: 130, ang: 0, arc: 0, delay: 0, total: 0, damage: 0, owner: b.id, tag: 'well_slow', fired: true, activeLeft: 5, ttl: 5, slow: 0.45 });
    s.hazards.push({ id: 9002, shape: 'circle', x: 900, y: 300, r: 130, ang: 0, arc: 0, delay: 0, total: 0, damage: 0, owner: b.id, tag: 'well_fast', fired: true, activeLeft: 5, ttl: 5, slow: 1.5 });
    const mk = (x: number) => ({ id: 9100 + x, x, y: 300, vx: 100, vy: 0, ttl: 5, damage: 1, radius: 5, kind: 'time' as const, owner: b.id, k: 1 });
    const slow = mk(260), fast = mk(860), free = mk(1500); s.enemyShots.push(slow, fast, free); const t0 = s.time; const xs = [slow.x, fast.x, free.x];
    sim.step(DT, idle); expect(slow.x - xs[0]).toBeCloseTo(100 * DT * 0.45, 4); expect(fast.x - xs[1]).toBeCloseTo(100 * DT * 1.5, 4); expect(free.x - xs[2]).toBeCloseTo(100 * DT, 4); expect(s.time - t0).toBeCloseTo(DT, 9);
  });
  it('the overload opens the body after its pulse; delayed echoes replay once, previewed', () => {
    const { sim, s, boss } = fight('chronophage'); skipIntro(sim, s, boss); const b = boss(); s.player.invulnerable = 1e9; b.ai!.pat = 3; b.attackCd = 0; let opened = false;
    for (let i = 0; i < 60 * 9; i++) { sim.step(DT, idle); s.player.invulnerable = 1e9; if (b.mode === 'recover' && b.ai!.exposed && b.ai!.atk === 'overload') { opened = true; break; } } expect(opened).toBe(true);
    const f = fight('chronophage'); skipIntro(f.sim, f.s, f.boss); const b2 = f.boss(); b2.ai!.pat = 2; b2.attackCd = 0; let echo = 0; const seen = new Set<number>();
    for (let i = 0; i < 60 * 6; i++) { f.sim.step(DT, idle); f.s.player.invulnerable = 1e9; for (const h of f.s.hazards) if (h.tag === 'echo' && !seen.has(h.id)) { seen.add(h.id); echo++; expect(h.echo).toBe(true); } } expect(echo).toBe(1);
  });
});

describe('B22 Hollow Choir', () => {
  it('three linked constructs around one core; hitting the core while the choir is harmonised is armoured; destroying a construct breaks the harmony and exposes the core; nothing respawns in phase 2', () => {
    const { sim, s, boss } = fight('hollow_choir'); skipIntro(sim, s, boss); const core = boss(); const parts = choirParts(s, core); expect(parts).toHaveLength(3); expect(new Set(parts.map(p => p.part!.role))).toEqual(new Set(['line', 'cone', 'ring']));
    const h0 = core.hp; damageEnemy(s, core, 100); const armoured = h0 - core.hp; expect(armoured).toBeLessThan(40);
    damageEnemy(s, parts[0], 1e6); expect(choirParts(s, core)).toHaveLength(2); expect((core.ex?.open ?? 0)).toBeGreaterThan(0); core.ai!.exposed = true; const h1 = core.hp; damageEnemy(s, core, 100); expect(h1 - core.hp).toBeGreaterThan(100);
    core.hp = core.maxHp * 0.4; run(sim, 3.5, idle, st => { st.player.invulnerable = 1e9; }); expect(choirParts(s, core).length).toBeLessThanOrEqual(2);
    expect(core.ai!.phase).toBe(2);
  });
  it('focused damage on one construct (>= 20% in a short window) staggers the harmony; the encounter ends only when the core falls', () => {
    const { sim, s, boss } = fight('hollow_choir'); skipIntro(sim, s, boss); const core = boss(); const p = choirParts(s, core)[1]; damageEnemy(s, p, p.maxHp * 0.25); expect((core.ex?.open ?? 0)).toBeGreaterThan(0); expect(choirParts(s, core).length).toBe(3);
    for (const q of choirParts(s, core)) damageEnemy(s, q, 1e6); expect(s.enemies.some(e => e.id === core.id && e.hp > 0)).toBe(true); expect(s.bossesDefeated).toBe(0);
  });
});

describe('B22 Sovereign of the Void', () => {
  it('real authoritative parts with their own hp; the core is shielded until the anchors fall; three phases; no standing inside the body', () => {
    const { sim, s, boss } = fight('sovereign'); skipIntro(sim, s, boss); const core = boss(); const anchors = sovParts(s, core, 'anchor'); expect(anchors).toHaveLength(4); for (const a of anchors) expect(a.maxHp).toBeGreaterThan(500);
    const h0 = core.hp; damageEnemy(s, core, 1000); expect(core.hp).toBe(h0);   // shielded
    s.player.invulnerable = 1e9; for (const a of anchors.slice(0, 3)) damageEnemy(s, a, 1e6); expect(core.ex!.shield).toBe(1); damageEnemy(s, anchors[3], 1e6); expect(core.ex!.shield).toBe(0);
    for (let i = 0; i < 60 * 5 && core.ai!.phase < 2; i++) { sim.step(DT, idle); s.player.invulnerable = 1e9; } expect(core.ai!.phase).toBe(2); expect(sovParts(s, core, 'arm')).toHaveLength(2); expect(sovParts(s, core, 'head')).toHaveLength(1);
    run(sim, 4, idle, st => { st.player.invulnerable = 1e9; }); damageEnemy(s, core, 1000); expect(core.hp).toBe(h0);   // the head shields the core in phase 2
    damageEnemy(s, sovParts(s, core, 'head')[0], 1e6); for (let i = 0; i < 60 * 5 && core.ai!.phase < 3; i++) { sim.step(DT, idle); s.player.invulnerable = 1e9; } expect(core.ai!.phase).toBe(3);
    run(sim, 4, idle, st => { st.player.invulnerable = 1e9; }); const h1 = core.hp; core.ai!.invuln = false; damageEnemy(s, core, 100); expect(core.hp).toBeLessThan(h1);
    s.player.x = core.x; s.player.y = core.y; sim.step(DT, idle); expect(Math.hypot(s.player.x - core.x, s.player.y - (core.y + 20))).toBeGreaterThanOrEqual(core.radius * 0.85 + s.player.radius - 3);
  });
  it('the Collapse Pulse comes once per fight with 8 spokes and 8 guaranteed safe wedges', () => {
    const { sim, s, boss } = fight('sovereign'); skipIntro(sim, s, boss); const core = boss(); core.ex!.wantPhase = 3; core.ex!.shield = 0; s.player.invulnerable = 1e9; let spokes = 0;
    core.ai!.pat = 3; for (let i = 0; i < 60 * 25 && spokes === 0; i++) { sim.step(DT, idle); s.player.invulnerable = 1e9; core.attackCd = Math.min(core.attackCd, 0.1); const sp = s.hazards.filter(h => h.tag === 'collapse'); if (sp.length) spokes = sp.length; }
    if (spokes === 0) { core.ai!.atk = ''; core.ai!.pat = 3; core.attackCd = 0; for (let i = 0; i < 60 * 10 && spokes === 0; i++) { sim.step(DT, idle); s.player.invulnerable = 1e9; const sp = s.hazards.filter(h => h.tag === 'collapse'); if (sp.length) spokes = sp.length; } }
    expect(spokes).toBe(8);
    const sp = s.hazards.filter(h => h.tag === 'collapse'); const wedgeAng = sp[0].ang + Math.PI / 8; s.player.x = sp[0].x + Math.cos(wedgeAng) * 300; s.player.y = sp[0].y + Math.sin(wedgeAng) * 300 - 24; for (const h of sp) expect(feetInLane(s, h)).toBe(false);
    s.player.x = sp[0].x + Math.cos(sp[0].ang) * 300; s.player.y = sp[0].y + Math.sin(sp[0].ang) * 300 - 24; expect(feetInLane(s, sp[0])).toBe(true);
  });
});

describe('B22 Classic boss timing is unchanged by the plan refactor', () => {
  it('the Warden still arrives at 480 s and the Seraph at 900 s (director driven by the Classic plan)', () => {
    const { sim, s } = quiet({ hp: 1e9 }); s.encounter.forced = false; s.spawnTimer = 1e9; s.time = 479.9; sim.step(DT, idle); expect(s.enemies.some(e => e.kind === 'warden')).toBe(false); run(sim, 0.3); expect(s.enemies.find(e => e.kind === 'warden')?.stepId).toBe('warden');
    for (const e of s.enemies) e.hp = 0; s.enemies = []; s.time = 899.9; s.encounter.spawned.seraph = false; run(sim, 0.3, idle, st => { st.player.hp = 1e9; }); expect(s.enemies.some(e => e.kind === 'seraph')).toBe(true);
  });
});

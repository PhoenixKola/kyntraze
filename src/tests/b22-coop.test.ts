import { describe, expect, it } from 'vitest';
import { ENEMIES, type MobKind } from '../content/enemies';
import { addEnemy } from '../sim/EntityRegistry';
import { damageEnemy, damagePlayer } from '../sim/CombatSystem';
import type { Enemy, GameState, InputState } from '../sim/GameState';
import { NO_CONFIG } from '../sim/RunConfig';
import { quiet, DT, idle } from './b22util';
import { inSlot, nearestSlot, slotPlayer, standing } from '../sim/CoopSystem';
import { REVIVE, PAIRS } from '../b22/pairs';
import { startEncounter } from '../sim/BossAiSystem';
import type { HeroId } from '../content/heroes';
import { slotHero } from '../sim/CoopCombos';

const duo = (a: HeroId = 'kai', b: HeroId = 'ren') => {
  const q = quiet({ hero: a, arena: 'gloam', hp: 1e6, seed: 8 }); q.s.encounter.forced = true; q.sim.joinPartner({ ...NO_CONFIG, hero: b });
  const p0 = q.s.player, p1 = slotPlayer(q.s, 1); p0.x = 1000; p0.y = 800; p1.x = 1100; p1.y = 800; p1.hp = p1.maxHp = 1e6; p1.attackClock = 1e9; p1.nextXp = 1e9;
  return { ...q, p0, p1 };
};
const mob = (s: GameState, x: number, y: number, kind: MobKind = 'pursuer', hp = 1e7): Enemy => { const d = ENEMIES[kind]; return addEnemy(s, { kind, x, y, hp, maxHp: hp, radius: d.radius, speed: 0, damage: 8, touchCooldown: 0, attackCd: 1e9, aimX: 1, aimY: 0 }); };
const step = (sim: ReturnType<typeof duo>['sim'], n: number, a: InputState = idle, b: InputState = idle) => { for (let i = 0; i < n; i++) sim.step(DT, a, b); };
const kill = (s: GameState, i: number) => inSlot(s, i, () => { s.player.invulnerable = 0; s.player.hp = 1; damagePlayer(s, 1e9, 'x'); });

describe('B22.6 co-op: two real fighters on one simulation', () => {
  it('two independent fighters: separate heroes, stats, positions and input streams; swapping never corrupts either', () => {
    const { sim, s, p0, p1 } = duo('kai', 'sora'); expect(s.hero).toBe('kai'); expect(slotHero(s, 1)).toBe('sora'); expect(p1.attackRange).toBeGreaterThan(300); expect(p0.attackRange).toBeLessThan(300);
    const x0 = p0.x, y1 = p1.y; step(sim, 30, { ...idle, x: 1 }, { ...idle, y: -1 }); expect(s.player.x).toBeGreaterThan(x0 + 30); expect(slotPlayer(s, 1).y).toBeLessThan(y1 - 30); expect(slotPlayer(s, 1).x).toBeCloseTo(1100, 0); expect(s.party!.cur).toBe(0);
    expect(inSlot(s, 1, () => s.hero)).toBe('sora'); expect(s.hero).toBe('kai');
  });
  it('both fighters cast their own Q with their own cooldowns and kits at the same time', () => {
    const { sim, s } = duo('kai', 'ren'); const es = [0, 1, 2, 3].map(i => mob(s, 1050 + i * 15, 760 + i * 20)); step(sim, 1, { ...idle, q: true }, { ...idle, q: true });
    expect(s.player.qCooldown).toBeGreaterThan(5); expect(inSlot(s, 1, () => s.player.qCooldown)).toBeGreaterThan(5); expect(inSlot(s, 1, () => s.hx.act?.act ?? null)).toBe('crimson_break'); expect(s.hx.act).toBeNull();
    step(sim, 120); expect(es.reduce((a, e) => a + e.maxHp - e.hp, 0)).toBeGreaterThan(50);
  });
  it('enemies hunt the NEAREST standing fighter; damage lands on the one that was hit, never on both', () => {
    const { sim, s, p1 } = duo('kai', 'ren'); p1.x = 1700; p1.y = 800; const e = mob(s, 1600, 800); e.attackCd = 0; step(sim, 60 * 2);
    expect(e.aimX).toBeGreaterThan(0);   // aimed at the partner on the right
    const hp0 = s.player.hp, hp1 = slotPlayer(s, 1).hp; s.hazards.push({ id: 9001, shape: 'circle', x: 1700, y: 824, r: 60, ang: 0, arc: 0, delay: 0.05, total: 0.05, damage: 50, owner: 3, tag: 'x', fired: false, ttl: 0 }); step(sim, 10);
    expect(slotPlayer(s, 1).hp).toBe(hp1 - 50); expect(s.player.hp).toBe(hp0);
  });
  it('a hostile shot can hit either fighter, only the one it touches', () => {
    const { sim, s, p1 } = duo('kai', 'ren'); s.enemyShots.push({ id: 1, x: p1.x + 4, y: p1.y, vx: 0, vy: 0, ttl: 3, damage: 25, radius: 8, kind: 'prism', owner: 4, k: 1 }); const hp0 = s.player.hp, hp1 = p1.hp; step(sim, 2);
    expect(slotPlayer(s, 1).hp).toBe(hp1 - 25); expect(s.player.hp).toBe(hp0);
  });
  it('shared XP: a crystal levels BOTH fighters; each makes their own upgrade choice in turn from their own kit; the run resumes after both', () => {
    const { sim, s, p0, p1 } = duo('kai', 'sora'); p0.nextXp = p1.nextXp = 5; s.pickups.push({ id: 77, x: p0.x, y: p0.y, xp: 6, age: 0 }); step(sim, 2);
    expect(s.phase).toBe('upgrade'); expect(s.party!.chooser).toBe(0); expect(s.upgradeOffers).toHaveLength(3); expect(p0.level).toBe(2); expect(slotPlayer(s, 1).level).toBe(2); expect(s.party!.queue).toEqual([1]);
    const first = s.upgradeOffers[0]; expect(sim.chooseUpgrade(first)).toBe(true); expect(s.phase).toBe('upgrade'); expect(s.party!.chooser).toBe(1); expect(s.upgradeStacks[first]).toBe(1); expect(inSlot(s, 1, () => s.upgradeStacks[first])).toBeUndefined();
    expect(sim.chooseUpgrade(s.upgradeOffers[0])).toBe(true); expect(s.phase).toBe('running'); expect(Object.keys(inSlot(s, 1, () => s.upgradeStacks)).length).toBe(1);
  });
  it('downed -> revive by standing near the partner (no extra button), capped per fighter; the downed fighter is ignored by enemies; both lost is a defeat', () => {
    const { sim, s } = duo('kai', 'ren'); kill(s, 1); expect(standing(s, 1)).toBe(false); expect(s.phase).toBe('running'); expect(slotPlayer(s, 1).hp).toBe(0);
    const e = mob(s, 1900, 800); e.attackCd = 0; slotPlayer(s, 1).x = 1900; slotPlayer(s, 1).y = 800; step(sim, 60 * 2); expect(nearestSlot(s, e.x, e.y)).toBe(0);   // the target is the standing fighter far away, not the downed one beside it
    s.player.x = slotPlayer(s, 1).x - 30; s.player.y = slotPlayer(s, 1).y; e.hp = 0; step(sim, Math.round((REVIVE.hold + 0.3) / DT)); expect(standing(s, 1)).toBe(true); expect(slotPlayer(s, 1).hp).toBeCloseTo(slotPlayer(s, 1).maxHp * REVIVE.hpFraction, 0);
    for (let k = 1; k < REVIVE.maxPerPlayer; k++) { kill(s, 1); s.player.x = slotPlayer(s, 1).x - 30; s.player.y = slotPlayer(s, 1).y; step(sim, Math.round((REVIVE.hold + 0.4) / DT)); expect(standing(s, 1)).toBe(true); }
    kill(s, 1); s.player.x = slotPlayer(s, 1).x - 30; step(sim, 60 * 4); expect(standing(s, 1)).toBe(false); expect(s.party!.slots[1].down.out).toBe(true);   // cap reached: no infinite revives
    s.player.invulnerable = 0; s.player.hp = 1; damagePlayer(s, 1e9, 'x'); expect(s.phase).toBe('dead');
  });
  it('a boss fight works for two: health is scaled, a kill pays once, and a downed partner does not deadlock it', () => {
    const { sim, s } = duo('kai', 'sora'); startEncounter(s, 'warden'); const b = s.enemies.find(e => e.kind === 'warden')!; for (let i = 0; i < 400 && b.mode === 'intro'; i++) sim.step(DT, idle, idle);
    expect(b.maxHp).toBeLessThan(1600 * 1.6 + 1); expect(b.maxHp).toBeGreaterThan(1600 * 1.5); kill(s, 1); expect(standing(s, 1)).toBe(false);
    b.ai!.invuln = false; const d0 = s.bossesDefeated; damageEnemy(s, b, 1e9); expect(s.bossesDefeated).toBe(d0 + 1); step(sim, 10); expect(s.bossesDefeated).toBe(d0 + 1);
  });
  it('the tether keeps the pair within camera range; solo runs never create a party', () => {
    const { sim, s, p0, p1 } = duo('kai', 'ren'); p1.x = p0.x + 2000; p1.y = p0.y; step(sim, 5); expect(Math.hypot(slotPlayer(s, 1).x - s.player.x, slotPlayer(s, 1).y - s.player.y)).toBeLessThan(1700);
    const solo = quiet({ hp: 1e6 }); expect(solo.s.party).toBeUndefined(); expect(solo.s.b22.party).toBeNull();
  });
  it('the co-op director scales threat for two but keeps the enemy count bounded', () => {
    const { sim, s } = duo('kai', 'ren'); s.encounter.forced = false; s.spawnTimer = 0; let peak = 0;
    for (let i = 0; i < 60 * 120; i++) { sim.step(DT, idle, idle); s.player.hp = 1e9; slotPlayer(s, 1).hp = 1e9; if (s.phase === 'upgrade') { sim.chooseUpgrade(s.upgradeOffers[0]); } peak = Math.max(peak, s.enemies.length); }
    expect(peak).toBeLessThanOrEqual(130); expect(['running', 'upgrade']).toContain(s.phase);
  }, 60000);
});

describe('B22.6 pair combination attacks (six pairings, real events from both fighters, Resonance-gated)', () => {
  const grant = (s: GameState) => { s.party!.shared.resonance = 100; };
  const abilityHit = (s: GameState, i: number, e: Enemy, slot: 'q' | 'e' | 'r') => { inSlot(s, i, () => { s.b22.ctxSlot = slot; damageEnemy(s, e, 30); s.b22.ctxSlot = null; s.party!.slots[i].lastHits = [...s.b22.hits]; }); };
  it('all six pairings are defined and resolve from the two fighters\' heroes', () => { expect(PAIRS).toHaveLength(6); for (const p of PAIRS) { const { s } = duo(p.heroes[0], p.heroes[1]); expect(s.party!.shared.pair).toBe(p.id); } });
  it('Kai + Ren: Kai marks with a heavy hit; only Ren\'s heavy strike on that foe erupts; costs Resonance and starts a cooldown', () => {
    const { sim, s, p0 } = duo('kai', 'ren'); grant(s); const t = mob(s, p0.x + 90, p0.y);
    abilityHit(s, 0, t, 'q'); expect(s.party!.slots[0].lastHits.length).toBe(1); sim.step(DT, idle, idle); sim.step(DT, idle, idle);
    expect(s.party!.shared.pairMark?.enemy).toBe(t.id); step(sim, 30); expect(s.b22.ev.some(e => e.kind === 'pair_attack')).toBe(false);   // no partner payoff: nothing fires by itself
    s.party!.shared.pairMark!.t = s.time; abilityHit(s, 1, t, 'e'); s.party!.slots[0].lastHits = []; sim.step(DT, idle, idle);
    expect(s.b22.ev.some(e => e.kind === 'pair_attack')).toBe(true); expect(s.party!.shared.resonance).toBeLessThan(100); expect(s.party!.shared.pairCd).toBeGreaterThan(10);
  });
  it('Kai + Sora: both firing E within 1.2 s lands a shared lance where their aim lines cross', () => {
    const { sim, s, p0, p1 } = duo('kai', 'sora'); grant(s); p0.x = 900; p0.y = 800; p1.x = 1100; p1.y = 1000; const foe = mob(s, 1100, 800);
    inSlot(s, 0, () => { s.player.aimX = 1; s.player.aimY = 0; }); inSlot(s, 1, () => { s.player.aimX = 0; s.player.aimY = -1; });
    sim.step(DT, { ...idle, beam: true }, { ...idle, beam: true, beamHeld: true }); for (let i = 0; i < 40; i++) sim.step(DT, idle, { ...idle, beamHeld: true }); step(sim, 30);
    expect(s.party!.shared.pairCd > 0 || s.b22.ev.some(e => e.kind === 'pair_attack')).toBe(true); expect(foe.hp).toBeLessThan(foe.maxHp);
  });
  it('without Resonance, with the fighters too far apart, or with only one fighter acting, no pair attack ever fires', () => {
    const { sim, s, p0 } = duo('kai', 'ren'); const t = mob(s, p0.x + 90, p0.y); s.party!.shared.resonance = 0; abilityHit(s, 0, t, 'q'); step(sim, 2); expect(s.party!.shared.pairMark).toBeNull();
    grant(s); slotPlayer(s, 1).x = p0.x + 900; step(sim, 2); expect(s.b22.ev.some(e => e.kind === 'pair_attack')).toBe(false);
  });
  it('Resonance: both fighters transforming inside the window starts a 6 s team state with +20% damage; it always ends', () => {
    const { sim, s } = duo('kai', 'ren'); grant(s); s.player.drive = 100; slotPlayer(s, 1).drive = 100; inSlot(s, 1, () => { s.heroFormUnlocked = true; slotPlayer(s, 1); }); const e = mob(s, 1300, 800);
    sim.step(DT, { ...idle, f: true }, { ...idle, f: true }); step(sim, 10); expect(s.party!.shared.resonanceT).toBeGreaterThan(4);
    const h0 = e.hp; damageEnemy(s, e, 100); expect(h0 - e.hp).toBeGreaterThan(115); step(sim, 60 * 7); expect(s.party!.shared.resonanceT).toBe(0);
  });
});

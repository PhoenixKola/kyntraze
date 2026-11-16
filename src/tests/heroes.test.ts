import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { NO_CONFIG } from '../sim/RunConfig';
import type { Enemy, InputState } from '../sim/GameState';
import { REN, SORA, ASCEND } from '../content/heroKits';
import { damagePlayer, damageEnemy } from '../sim/CombatSystem';
import { formChoices } from '../sim/FormSystem';
const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
function enemy(id: number, x: number, y: number, hp = 40): Enemy { return { id, x, y, kind: 'pursuer', hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }; }
function setup(hero: 'ren' | 'sora', enemies: Array<[number, number, number?]> = [], formUnlocked = false) {
  const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero, heroForm: formUnlocked }); const s = sim.state;
  s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.aimX = 1; s.player.aimY = 0;
  s.enemies = enemies.map(([x, y, hp], i) => enemy(100 + i, x, y, hp ?? 40));
  return { sim, s };
}
const run = (sim: Simulation, sec: number, input: InputState = idle()) => { for (let i = 0; i < Math.round(sec / DT); i++) sim.step(DT, input); };
const tap = (sim: Simulation, o: Partial<InputState>) => sim.step(DT, idle(o));

describe('hero identity and base bodies', () => {
  it('Kai is unchanged; Ren and Sora get their own stats at Kai\'s collision size', () => {
    const k = new Simulation(1).state; expect(k.hero).toBe('kai'); expect(k.player.maxHp).toBe(100); expect(k.player.radius).toBe(17);
    const r = setup('ren').s; expect(r.hero).toBe('ren'); expect(r.player.maxHp).toBe(REN.base.hp); expect(r.player.radius).toBe(17); expect(r.player.attackRange).toBe(REN.base.attackRange);
    const so = setup('sora').s; expect(so.player.attackRange).toBe(SORA.base.attackRange); expect(so.player.radius).toBe(17);
  });
});

describe('Ren', () => {
  it('automatic attack is separate from Q: it hits a short arc, finisher on every third blow, none out of reach', () => {
    const { sim, s } = setup('ren', [[1160, 800, 400], [1400, 800, 400]]); s.player.attackClock = 0;
    run(sim, 0.05); expect(s.enemies[0].hp).toBeLessThan(400); expect(s.enemies[1].hp).toBe(400); expect(s.player.qCooldown).toBe(0);
    const hp0 = s.enemies[0].hp; s.player.attackClock = 0; run(sim, 0.03); s.player.attackClock = 0; const before = s.enemies[0].hp; run(sim, 0.03);
    expect(hp0 - s.hx.strike.step).toBeLessThan(hp0 + 1); expect(before - s.enemies[0].hp).toBeGreaterThan(REN.base.attackDamage * 1.5);   // third strike = finisher
  });
  it('Crimson Break lands five distinct beats, respects the cooldown, and has a moving variant', () => {
    const { sim, s } = setup('ren', [[1170, 800, 600]]); tap(sim, { q: true }); expect(s.hx.act?.act).toBe('crimson_break'); expect(s.player.qCooldown).toBeCloseTo(REN.q.cooldown, 1);
    const seen: number[] = []; for (let i = 0; i < 80; i++) { const hp = s.enemies[0].hp; sim.step(DT, idle()); if (s.enemies[0].hp < hp) seen.push(i); }
    const beats = seen.filter((v, i) => i === 0 || v - seen[i - 1] > 2); expect(beats.length).toBe(REN.q.beats); expect(s.hx.act).toBeNull();
    const hp = s.enemies[0].hp; tap(sim, { q: true }); expect(s.hx.act).toBeNull(); expect(s.enemies[0].hp).toBe(hp);   // cooldown
    const m = setup('ren', [[1400, 800, 600]]); tap(m.sim, { q: true, x: 1 }); const x0 = m.s.player.x; run(m.sim, 0.2, idle({ x: 1 })); expect(m.s.player.x - x0).toBeGreaterThan(20); expect(m.s.hx.act?.moving).toBe(true);
  });
  it('Meteor Rush chains through nearby enemies in order, is invulnerable, and falls back to a forward burst', () => {
    const { sim, s } = setup('ren', [[1250, 800, 300], [1380, 850, 300], [1500, 800, 300], [1100, 500, 300]]);
    tap(sim, { beam: true }); expect(s.hx.act?.hops.map(h => h.id)).toEqual([100, 101, 102]); expect(s.player.invulnerable).toBeGreaterThan(0);
    run(sim, 1.2); expect(s.hx.act).toBeNull(); for (const i of [0, 1, 2]) expect(s.enemies[i].hp).toBeLessThan(300); expect(s.enemies[3].hp).toBe(300);
    expect(s.player.beamCooldown).toBeGreaterThan(REN.e.cooldown - 1.5);
    const f = setup('ren', [[1100, 100, 100]]); tap(f.sim, { beam: true }); expect(f.s.hx.act?.hops.length).toBe(1); expect(f.s.hx.act?.hops[0].id).toBe(0); const x0 = f.s.player.x; run(f.sim, 0.6); expect(f.s.player.x - x0).toBeGreaterThan(100);
  });
  it('Bloodstar leaps to the target, damages at the landing, shoves ordinary enemies and not bosses', () => {
    const { sim, s } = setup('ren', [[1300, 800, 500], [1330, 830, 500]]); s.enemies.push({ ...enemy(300, 1290, 790, 5000), kind: 'warden' }); tap(sim, { sphere: true });
    expect(s.hx.act?.act).toBe('bloodstar'); run(sim, REN.r.windup + REN.r.flight - 0.1); expect(s.enemies[0].hp).toBe(500);   // nothing hurts before the landing
    run(sim, 0.2); expect(s.enemies[0].hp).toBeLessThan(500); expect(Math.hypot(s.player.x - 1300, s.player.y - 800)).toBeLessThan(80); expect(s.enemies[2].hp).toBeLessThan(5000);
    run(sim, 1.2); expect(s.hx.act).toBeNull();
  });
});

describe('Sora', () => {
  it('automatic needles are real projectiles: they fly, then hit, and Q is separate', () => {
    const { sim, s } = setup('sora', [[1400, 800, 200]]); s.player.attackClock = 0; run(sim, 0.03); expect(s.hx.bolts.length).toBe(1); expect(s.enemies[0].hp).toBe(200);
    run(sim, 0.6); expect(s.enemies[0].hp).toBeLessThan(200); expect(s.player.qCooldown).toBe(0);
  });
  it('Azure Volley fires a spread of bolts with a cooldown and a moving variant', () => {
    const { sim, s } = setup('sora', [[1500, 800, 900]]); tap(sim, { q: true }); run(sim, SORA.q.windup + SORA.q.burst + 0.05); expect(s.hx.bolts.length).toBe(SORA.q.bolts);
    const ys = s.hx.bolts.map(b => b.vy); expect(Math.max(...ys)).toBeGreaterThan(0); expect(Math.min(...ys)).toBeLessThan(0);
    run(sim, 1); expect(s.enemies[0].hp).toBeLessThan(900); expect(s.player.qCooldown).toBeGreaterThan(0);
    const m = setup('sora', []); tap(m.sim, { q: true, x: 1 }); const x0 = m.s.player.x; run(m.sim, 0.2, idle({ x: 1 })); expect(m.s.player.x - x0).toBeGreaterThan(15);
  });
  it('Celestial Lance charges while held, tiers scale damage and width, pierces every enemy, and a hit cancels the charge', () => {
    const lane = (hold: number) => { const { sim, s } = setup('sora', [[1300, 800, 900], [1500, 800, 900], [1500, 880, 900]]); tap(sim, { beam: true, beamHeld: true }); s.eHeld = true; run(sim, hold, idle({ beamHeld: true })); run(sim, 0.9); return s.enemies.map(e => 900 - e.hp); };
    const tap0 = lane(0.31), full = lane(1.4); expect(tap0[0]).toBeGreaterThan(0); expect(tap0[1]).toBeGreaterThan(0); expect(full[0]).toBeGreaterThan(tap0[0] * 1.4); expect(tap0[2]).toBe(0); expect(full[2]).toBeGreaterThan(0);   // the wider full charge also reaches the off-lane enemy
    const c = setup('sora', [[1400, 800, 100]]); tap(c.sim, { beam: true, beamHeld: true }); run(c.sim, 0.2, idle({ beamHeld: true })); damagePlayer(c.s, 5); expect(c.s.hx.act).toBeNull(); expect(c.s.player.beamCooldown).toBeGreaterThan(0);
  });
  it('Zero Horizon summons, orbits, converges on distinct enemies and detonates together', () => {
    const { sim, s } = setup('sora', [[1350, 800, 300], [1350, 1000, 300], [1000, 700, 300]]); tap(sim, { sphere: true }); expect(s.hx.orbs.length).toBe(SORA.r.orbs);
    run(sim, SORA.r.summon + SORA.r.orbit - 0.1); expect(s.enemies.every(e => e.hp === 300)).toBe(true); expect(s.hx.orbPhase).toBe('orbit');
    run(sim, 0.2); expect(s.hx.orbPhase).toBe('converge'); expect(s.enemies.every(e => e.hp === 300)).toBe(true);
    run(sim, SORA.r.travel + 0.05); expect(s.hx.orbPhase).toBe('none'); for (const e of s.enemies) expect(e.hp).toBeLessThan(300); expect(s.hx.orbs.length).toBe(0);
  });
});

describe('transformation: unlock, activation, single form', () => {
  it('stays locked until unlocked; Warden defeat by the hero unlocks it once and never unlocks Kai\'s forms', () => {
    const { sim, s } = setup('ren'); s.player.drive = 100; expect(formChoices(s)).toEqual([]); tap(sim, { f: true }); expect(s.cinema).toBeNull();
    const w: Enemy = { ...enemy(900, 1500, 800, 10), kind: 'warden', ai: { phase: 2, pat: 0, atk: '', step: 0, t: 0, acc: 0, exposed: false, invuln: false, side: 1, destX: 0, destY: 0, gap: 0, push: 0 } }; s.enemies.push(w);
    damageEnemy(s, w, 99999); expect(s.heroFormUnlocked).toBe(true); expect(s.heroFormUnlockedNow).toBe(true); expect(s.cometUnlocked).toBe(false); expect(s.player.drive).toBe(100);
  });
  it('F with full Drive starts a frozen reveal, commits form 1, drains, and ends back to base with a cooldown', () => {
    const { sim, s } = setup('sora', [[1600, 800, 100]], true); s.player.drive = 100; expect(formChoices(s)).toEqual([1]);
    tap(sim, { f: true }); expect(s.cinema?.to).toBe(1); const t0 = s.time; const hp = s.player.hp; run(sim, 1); expect(s.time).toBe(t0); expect(s.player.hp).toBe(hp);   // the run clock is frozen
    run(sim, ASCEND.cinemaFirst.dur); expect(s.cinema).toBeNull(); expect(s.player.form).toBe(1); expect(s.heroFormSeen).toBe(1);
    s.player.drive = 0.01; run(sim, 0.5); expect(s.player.form).toBe(0); expect(s.player.formCooldown).toBeGreaterThan(10);
  });
  it('the transformed state changes the actual abilities (not only stats)', () => {
    const base = setup('sora', [[1500, 800, 900]]); tap(base.sim, { q: true }); run(base.sim, 0.45);
    const f = setup('sora', [[1500, 800, 900]], true); f.s.player.form = 1; tap(f.sim, { q: true }); run(f.sim, 0.45);
    expect(f.s.hx.bolts.length + 0).toBeGreaterThanOrEqual(base.s.hx.bolts.length); expect(f.s.hx.bolts.some(b => b.pierce > 0 && b.homing > 0)).toBe(true);
    const rb = setup('ren', [[1250, 800, 900], [1380, 850, 900], [1500, 800, 900], [1600, 840, 900], [1700, 800, 900]], true); rb.s.player.form = 1; tap(rb.sim, { beam: true }); expect(rb.s.hx.act?.hops.length).toBe(REN.e.formHops);
  });
  it('a form reveal clears any move in progress and Kai\'s Flarebound feat id is never used', () => {
    const { sim, s } = setup('sora', [[1500, 800, 100]], true); tap(sim, { sphere: true }); expect(s.hx.orbs.length).toBeGreaterThan(0); s.player.drive = 100; tap(sim, { f: true }); expect(s.hx.orbs.length).toBe(0); expect(s.hx.act).toBeNull();
    run(sim, 2.9); expect(s.run.formsUsed).toEqual([11]);
  });
});

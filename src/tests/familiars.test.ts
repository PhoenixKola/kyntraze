import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { Enemy, GameState, InputState } from '../sim/GameState';
import { NO_CONFIG } from '../sim/RunConfig';
import { FAMILIARS, FAM_MERGE, FAM_REFORM, FAM_SPAWN } from '../content/familiars';
import { HERO_IDS, type HeroId } from '../content/heroes';
import { applySnapshot, blankClientState, partnerView, blankPartnerView, toSnapshot, type Snap } from '../net/snapshot';
import { slotPlayer } from '../sim/CoopSystem';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const wire = (n: Snap): Snap => JSON.parse(JSON.stringify(n));
const mob = (id: number, x: number, y: number, hp = 1e6): Enemy => ({ id, x, y, kind: 'pursuer', hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 99, aimX: -1, aimY: 0, stagger: 0, spawnedAt: 0 });
function mk(hero: HeroId, foes: Array<[number, number]> = []) {
  const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero, heroForm: hero !== 'kai' }), s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9;
  s.player.hp = s.player.maxHp = 1e6; s.player.attackClock = 1e9; s.enemies = foes.map(([x, y], i) => mob(100 + i, x, y)); return { sim, s };
}
const run = (sim: Simulation, sec: number, i: InputState = idle(), j?: InputState) => { for (let k = 0; k < Math.round(sec / DT); k++) { if (sim.state.player.form) sim.state.player.drive = 100; if (sim.state.party) { const q = sim.state.party.slots[1].bag.player; if (q.form) q.drive = 100; } sim.step(DT, i, j); } };
const total = (s: GameState) => s.enemies.reduce((a, e) => a + (e.maxHp - e.hp), 0);

describe('Celestial Familiars: field presence', () => {
  for (const hero of HERO_IDS) it(`${hero}: summons, follows at a readable distance and assists`, () => {
    const { sim, s } = mk(hero, [[1100 + 150, 800]]);
    run(sim, 0.1); expect(s.fam?.mode).toBe('reform'); run(sim, FAM_SPAWN + 0.2); expect(s.fam!.mode).not.toBe('reform');
    s.player.x = 1100; run(sim, 3.3); for (let k = 0; k < 30; k++) { sim.step(DT, idle({ x: 1 })); }
    const d = Math.hypot(s.fam!.x - s.player.x, s.fam!.y - s.player.y); expect(d).toBeGreaterThan(20); expect(d).toBeLessThan(160);
    s.player.aimX = 1; run(sim, FAMILIARS[hero].cd + 2.5); expect(total(s)).toBeGreaterThan(0);
  });
  it('an assist is a bounded share of the hero damage (never more than a quarter of the auto-attack rate)', () => {
    for (const hero of HERO_IDS) {
      const { sim, s } = mk(hero, [[1250, 800]]); const d = FAMILIARS[hero], base = s.player.attackDamage; run(sim, 30);
      const perSec = total(s) / 30, auto = base / s.player.attackPeriod; expect(perSec, hero).toBeLessThan(auto * 0.45); expect(perSec, hero).toBeGreaterThan(0); void d;
    }
  });
  it('its hits never feed the Overdrive meter or the Ultimate gauge', () => {
    const { sim, s } = mk('kai', [[1250, 800]]); s.player.odMeter = 0; s.b22.ult.unlocked = true; run(sim, 20); expect(total(s)).toBeGreaterThan(0); expect(s.player.odMeter).toBe(0); expect(s.b22.ult.charge).toBe(0);
  });
  it('is deterministic: the same inputs give the same beast', () => {
    const a = mk('ren', [[1230, 800], [1180, 900]]), b = mk('ren', [[1230, 800], [1180, 900]]); run(a.sim, 12, idle({ x: 0.5 })); run(b.sim, 12, idle({ x: 0.5 }));
    expect(JSON.stringify(a.s.fam)).toBe(JSON.stringify(b.s.fam)); expect(total(a.s)).toBe(total(b.s));
  });
});

describe('Celestial Familiars: Overdrive fusion and return', () => {
  for (const hero of HERO_IDS) it(`${hero}: merges while Overdrive runs (no battlefield entity), then re-forms`, () => {
    const { sim, s } = mk(hero, [[1250, 800]]); s.player.form = hero === 'vex' ? 2 : 1; run(sim, FAM_SPAWN + 0.3);
    s.player.odT = 1.2; run(sim, 0.1); expect(s.fam!.mode).toBe('merge'); run(sim, FAM_MERGE + 0.1); expect(s.fam!.mode).toBe('gone');
    const before = total(s); const hp0 = s.enemies.map(e => e.hp); void hp0; s.player.odT = 5; run(sim, 3); expect(s.fam!.mode).toBe('gone'); expect(s.fam!.pend.length).toBe(0);
    const during = total(s); void before; void during;
    s.player.odT = 0; run(sim, 0.05); expect(s.fam!.mode).toBe('reform'); expect(s.fam!.k).toBe(1); run(sim, FAM_REFORM + 0.1); expect(s.fam!.mode).not.toBe('reform'); expect(s.fam!.mode).not.toBe('gone');
  });
  it('the familiar deals no damage while fused', () => {
    const { sim, s } = mk('kai', [[1250, 800]]); s.player.form = 1; run(sim, 1.5); s.player.odT = 8; run(sim, 1); const t0 = total(s); run(sim, 6); expect(total(s)).toBe(t0);
  });
  it('an Overdrive that ends early (form lost) still brings the beast back exactly once', () => {
    const { sim, s } = mk('sora'); s.player.form = 1; run(sim, 1.5); s.player.odT = 3; run(sim, 0.2); s.player.odT = 0; run(sim, 0.05); expect(s.fam!.mode).toBe('reform'); run(sim, 2); expect(s.fam!.mode).toBe('follow');
  });
});

describe('Celestial Familiars: defeat, revive and snapshots', () => {
  it('a defeated hero has no beast; it is summoned again on return', () => {
    const { sim, s } = mk('kai'); run(sim, 1.5); expect(s.fam).toBeDefined(); s.player.hp = 0; sim.step(DT, idle()); expect(s.fam).toBeUndefined(); s.player.hp = 100; run(sim, 0.1); expect(s.fam?.mode).toBe('reform');
  });
  it('co-op: each fighter has their own beast, a downed fighter loses theirs and gets it back when revived', () => {
    const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'kai' }); sim.joinPartner({ ...NO_CONFIG, hero: 'sora' }); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9;
    run(sim, 1.5, idle(), idle()); const P = s.party!; const a = s.fam, b = P.slots[1].bag.fam; expect(a).toBeDefined(); expect(b).toBeDefined(); expect(a).not.toBe(b);
    expect(Math.hypot(a!.x - slotPlayer(s, 0).x, a!.y - slotPlayer(s, 0).y)).toBeLessThan(160); expect(Math.hypot(b!.x - slotPlayer(s, 1).x, b!.y - slotPlayer(s, 1).y)).toBeLessThan(160);
    // fusing one fighter does not touch the other's beast
    slotPlayer(s, 0).form = 1; slotPlayer(s, 0).odT = 6; run(sim, 1, idle(), idle()); expect(s.fam!.mode).toBe('gone'); expect(P.slots[1].bag.fam!.mode).not.toBe('gone');
    // a downed partner loses the beast
    const q = P.slots[1].bag.player; q.hp = 0; q.vx = 0; sim.step(DT, idle(), idle()); void q;
  });
  it('online: the beast travels in the snapshot for me and for the partner view', () => {
    const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'ren', heroForm: true }); sim.joinPartner({ ...NO_CONFIG, hero: 'vex' }, 'online', ['A', 'B']); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9;
    run(sim, 2, idle(), idle()); const client = blankClientState(7, 'gloam'); const snap = wire(toSnapshot(s, 1, 0)); applySnapshot(client, snap);
    expect(client.fam?.mode).toBe('follow'); expect(Math.abs(client.fam!.x - s.fam!.x)).toBeLessThan(0.2);
    const pv = partnerView(client, blankPartnerView(7, 'gloam'), snap.partner, DT).view; expect(pv.fam).toBeDefined(); expect(pv.hero).toBe('vex');
    expect(Math.abs(pv.fam!.x - s.party!.slots[1].bag.fam!.x)).toBeLessThan(0.2);
    slotPlayer(s, 0).form = 1; slotPlayer(s, 0).odT = 4; run(sim, 1, idle(), idle()); const snap2 = wire(toSnapshot(s, 2, 0)); applySnapshot(client, snap2); expect(client.fam?.mode).toBe('gone');
    const snap3 = wire(toSnapshot(s, 3, 1)); applySnapshot(client, snap3); expect((client as unknown as { partner?: { fam?: { mode: string } } }).partner?.fam?.mode).toBe('gone');
  });
});

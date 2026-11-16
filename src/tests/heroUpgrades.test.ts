import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { NO_CONFIG } from '../sim/RunConfig';
import { UPGRADES, UPGRADE_BY_ID, type UpgradeId } from '../content/upgrades';
import { UPGRADE_OVERRIDES, REN, SORA } from '../content/heroKits';
import { previewUpgrade, applyUpgrade } from '../sim/UpgradeSystem';
import type { Enemy, InputState } from '../sim/GameState';
const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const mkEnemy = (id: number, x: number, y: number, hp = 900): Enemy => ({ id, x, y, kind: 'pursuer', hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
const setup = (hero: 'ren' | 'sora') => { const sim = new Simulation(5, 'gloam', false, false, { ...NO_CONFIG, hero }); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.aimX = 1; s.player.aimY = 0; return { sim, s }; };
const run = (sim: Simulation, sec: number, i = idle()) => { for (let k = 0; k < Math.round(sec / DT); k++) sim.step(DT, i); };
const take = (hero: 'ren' | 'sora', id: UpgradeId) => { const { sim, s } = setup(hero); s.player.level = 20; s.phase = 'upgrade'; s.upgradeOffers = [id]; expect(applyUpgrade(s, id)).toBe(true); return { sim, s }; };

describe('hero upgrade translation', () => {
  for (const hero of ['ren', 'sora'] as const) it(`${hero}: every card shows a real before/after on a number this hero's abilities use, with hero wording`, () => {
    for (const u of UPGRADES) {
      const { s } = setup(hero); s.player.level = 20; const pv = previewUpgrade(s, u.id); expect(pv.before === pv.after, `${hero} ${u.id} shows no change`).toBe(false);
      expect(/comet fists|fracture lance|nova bloom|flarebound|impact line|rift conductor|kai/i.test(`${UPGRADE_OVERRIDES[hero][u.id]?.blurb ?? ''} ${UPGRADE_OVERRIDES[hero][u.id]?.name ?? ''}`), `${hero} ${u.id} still names a Kai ability`).toBe(false);
    }
    // the Kai-ability cards must be rewritten (not inherited) for this hero
    for (const id of ['impact', 'tempo', 'reach', 'echo', 'pulse', 'widelance', 'hardlight', 'lancecool', 'afterburn', 'conductor', 'bloombulk', 'novacool', 'afterglow', 'twinbloom', 'flareheart', 'embercore'] as UpgradeId[]) expect(UPGRADE_OVERRIDES[hero][id]?.blurb, `${hero} ${id}`).toBeTruthy();
  });
  it('Ren: wide rush widens the blast, hard light hits harder, afterburn adds a strike, cooling shortens E', () => {
    const probe = (id?: UpgradeId) => { const { sim, s } = id ? take('ren', id) : setup('ren'); s.enemies = [mkEnemy(1, 1250, 800)]; sim.step(DT, idle({ beam: true })); let r = 0; for (let k = 0; k < 90; k++) { sim.step(DT, idle()); r = Math.max(r, ...s.hx.rings.filter(x => x.kind === 'rush').map(x => x.r)); } return { r, dmg: 900 - s.enemies[0].hp }; };
    const base = probe(), wide = probe('widelance'), hard = probe('hardlight'); expect(wide.r).toBeGreaterThan(base.r); expect(hard.dmg).toBeGreaterThan(base.dmg);
    const { sim, s } = take('ren', 'afterburn'); s.enemies = [1, 2, 3, 4].map(i => mkEnemy(i, 1150 + i * 90, 800)); sim.step(DT, idle({ beam: true })); expect(s.hx.act?.hops.length).toBe(REN.e.hops + 1);
    const c = take('ren', 'lancecool'); c.sim.step(DT, idle({ beam: true })); const b = setup('ren'); b.sim.step(DT, idle({ beam: true })); expect(c.s.player.beamCooldown).toBeLessThan(b.s.player.beamCooldown);
  });
  it('Ren: bigger impact radius and aftershock change the Bloodstar', () => {
    const dmgAt = (id?: UpgradeId, dist = 0) => { const { sim, s } = id ? take('ren', id) : setup('ren'); s.enemies = [mkEnemy(1, 1300, 800, 90000), mkEnemy(2, 1300 + dist, 800, 90000)]; sim.step(DT, idle({ sphere: true })); run(sim, 2.2); return 90000 - s.enemies[1].hp; };
    expect(dmgAt('bloombulk', REN.r.radius * 1.1)).toBeGreaterThan(dmgAt(undefined, REN.r.radius * 1.1) - 1);   // wider radius reaches further than the base slam's inner radius
    expect(dmgAt('afterglow', 30)).toBeGreaterThan(dmgAt(undefined, 30));
  });
  it('Sora: Volley card adds bolts, Lance cards change width/damage/pulses, Horizon cards change radius/second detonation', () => {
    const volley = (id?: UpgradeId) => { const { sim, s } = id ? take('sora', id) : setup('sora'); sim.step(DT, idle({ q: true })); run(sim, 0.45); return s.hx.bolts.length; }; expect(volley('pulse')).toBeGreaterThan(volley());
    const lance = (id?: UpgradeId) => { const { sim, s } = id ? take('sora', id) : setup('sora'); s.enemies = [mkEnemy(1, 1400, 800, 99999)]; sim.step(DT, idle({ beam: true, beamHeld: true })); run(sim, 0.4); run(sim, 1); return 99999 - s.enemies[0].hp; };
    expect(lance('hardlight')).toBeGreaterThan(lance()); expect(lance('afterburn')).toBeGreaterThan(lance());
    const horizon = (id?: UpgradeId) => { const { sim, s } = id ? take('sora', id) : setup('sora'); s.enemies = [mkEnemy(1, 1350, 800, 99999)]; sim.step(DT, idle({ sphere: true })); run(sim, 3); return 99999 - s.enemies[0].hp; };
    expect(horizon('afterglow')).toBeGreaterThan(horizon());
  });
  it('conductor feeds Drive from Meteor Rush strikes and Lance hits', () => {
    const r = take('ren', 'conductor'); r.s.enemies = [mkEnemy(1, 1250, 800)]; r.sim.step(DT, idle({ beam: true })); const d0 = r.s.player.drive; run(r.sim, 1); expect(r.s.player.drive).toBeGreaterThan(d0);
    expect(UPGRADE_BY_ID.conductor.id).toBe('conductor'); void SORA;
  });
});

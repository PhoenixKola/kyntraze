import { describe, expect, it, beforeEach } from 'vitest';
import { blankMeta, computeEarnings, contractAvailable, equipBoon, finalizeRun, migrateMeta, purchase, setContract, featProgress, type RunResult } from '../sim/MetaSystem';
import { migrateSave, loadSave, storeSave, SAVE_KEY } from '../sim/SaveSystem';
import { Simulation } from '../sim/Simulation';
import { GameBridge } from '../bridge/GameBridge';
import { CONTRACT_RULES, EARN, UNLOCK_BY_ID } from '../content/meta';
import { createOffer } from '../sim/UpgradeSystem';
import { makeRunState } from '../sim/RunConfig';

const run = (o: Partial<RunResult> = {}): RunResult => ({ runId: 'r1', arena: 'gloam', won: false, seconds: 180, kills: 120, level: 6, score: 1500, wardenKills: 0, seraphKills: 0, formsUsed: [], maxCategoryStacks: 2, contract: null, ...o });
const none = { cometheart: false, stillfire: false, victory: false, hadRun: false };
const cfg = (o: object = {}) => ({ boon: null, contract: null, rerolls: 0, banishes: 0, ...o }) as never;

describe('B18 earnings', () => {
  it('an early defeat still earns something; a victory earns much more', () => {
    const short = computeEarnings(run()).reduce((s, l) => s + l.marks, 0), win = computeEarnings(run({ won: true, seconds: 900, kills: 900, wardenKills: 1, seraphKills: 1 })).reduce((s, l) => s + l.marks, 0);
    expect(short).toBeGreaterThan(5); expect(win).toBeGreaterThan(short * 5); expect(win).toBeGreaterThanOrEqual(EARN.victory + EARN.warden + EARN.seraph);
  });
  it('farming ten seconds earns almost nothing', () => expect(computeEarnings(run({ seconds: 10, kills: 3 })).length).toBe(0));
  it('the contract bonus only pays on victory', () => {
    expect(computeEarnings(run({ contract: 'overrun' })).some(l => l.label.includes('OVERRUN'))).toBe(false);
    expect(computeEarnings(run({ contract: 'overrun', won: true })).some(l => l.label.includes('OVERRUN'))).toBe(true);
  });
});

describe('B18 exactly-once grants', () => {
  it('the same run id never pays twice; a new id (same seed, retry) pays again', () => {
    const a = finalizeRun(blankMeta(), run()); expect(a.reward?.total).toBeGreaterThan(0);
    const again = finalizeRun(a.meta, run()); expect(again.reward).toBeNull(); expect(again.meta.marks).toBe(a.meta.marks); expect(again.meta.counters.runs).toBe(1);
    expect(finalizeRun(a.meta, run({ runId: 'r2' })).meta.counters.runs).toBe(2);
  });
  it('feats and mastery are awarded once and never negative', () => {
    const a = finalizeRun(blankMeta(), run({ won: true, wardenKills: 1, seraphKills: 1, seconds: 700 }));
    expect(a.reward?.newFeats).toEqual(expect.arrayContaining(['first_run', 'first_win', 'warden_down', 'survivor10', 'gloam_win']));
    expect(a.reward?.newMastery).toEqual(expect.arrayContaining(['gloam.clear', 'gloam.long', 'gloam.warden']));
    const b = finalizeRun(a.meta, run({ runId: 'r2', won: true, wardenKills: 1, seraphKills: 1, seconds: 700 }));
    expect(b.reward?.newFeats).toEqual([]); expect(b.reward?.newMastery).toEqual([]); expect(b.meta.marks).toBeGreaterThanOrEqual(a.meta.marks);
  });
  it('feat progress is honest', () => { let m = blankMeta(); for (let i = 0; i < 3; i++) m = finalizeRun(m, run({ runId: 'w' + i, won: true })).meta; expect(featProgress(m, 'wins5')).toMatchObject({ done: false, value: 3, goal: 5 }); });
  it('arena records are tracked per arena', () => { const m = finalizeRun(blankMeta(), run({ arena: 'ashen', won: true, seconds: 800 })).meta; expect(m.arenas.ashen.wins).toBe(1); expect(m.arenas.gloam.wins).toBe(0); expect(m.arenas.ashen.bestSeconds).toBe(800); });
});

describe('B18 purchases and equip', () => {
  const rich = { ...blankMeta(), marks: 500 };
  it('spends exactly the cost, once, and auto-equips the first boon', () => {
    const r = purchase(rich, 'boon_bulwark'); expect(r.ok).toBe(true); expect(r.meta.marks).toBe(500 - UNLOCK_BY_ID.boon_bulwark.cost); expect(r.meta.boon).toBe('bulwark');
    const dup = purchase(r.meta, 'boon_bulwark'); expect(dup.ok).toBe(false); expect(dup.reason).toBe('owned'); expect(dup.meta.marks).toBe(r.meta.marks);
  });
  it('refuses without funds or requirements and never goes negative', () => {
    expect(purchase(blankMeta(), 'boon_bulwark').reason).toBe('funds'); expect(purchase(rich, 'tool_banish').reason).toBe('locked'); expect(purchase({ ...blankMeta(), marks: 14 }, 'boon_bulwark').meta.marks).toBe(14);
  });
  it('only owned boons equip; contracts honour their requirement', () => {
    expect(equipBoon(rich, 'swift').boon).toBeNull(); expect(setContract(blankMeta(), 'overrun').contract).toBeNull();
    const m = finalizeRun(blankMeta(), run()).meta; expect(contractAvailable(m, 'overrun')).toBe(true); expect(setContract(m, 'overrun').contract).toBe('overrun'); expect(contractAvailable(m, 'nosw')).toBe(false);
  });
});

describe('B18 save migration', () => {
  it('a fresh save has no form entitlements and no marks', () => { const s = migrateSave(null); expect(s.unlocks).toEqual({ cometheart: false, stillfire: false }); expect(s.meta.marks).toBe(0); });
  it('Form II / Form III / victory entitlements are preserved and credited once', () => {
    const old = { version: 1, settings: { mute: true, reducedEffects: true, pauseOnBlur: false }, best: { score: 9000, survivalSeconds: 900, kills: 700, level: 15, seed: 4, victory: true }, arena: 'ashen', unlocks: { cometheart: true, stillfire: true } };
    const s = migrateSave(old); expect(s.unlocks).toEqual({ cometheart: true, stillfire: true }); expect(s.settings.mute).toBe(true); expect(s.arena).toBe('ashen'); expect(s.best?.score).toBe(9000);
    expect(s.meta.feats.first_win).toBeDefined(); expect(s.meta.feats.warden_down).toBeDefined(); expect(s.meta.marks).toBe(80);
    const again = migrateSave(JSON.parse(JSON.stringify(s))); expect(again.meta).toEqual(s.meta); expect(again.unlocks).toEqual(s.unlocks);
  });
  it('a Form II only save does not unlock Form III', () => { const s = migrateSave({ unlocks: { cometheart: true } }); expect(s.unlocks?.stillfire).toBe(false); expect(s.meta.feats.first_win).toBeUndefined(); });
  it('invalid meta fields fall back per field and cannot create currency or unknown unlocks', () => {
    const m = migrateMeta({ v: 1, marks: -50, owned: ['boon_bulwark', 'nope'], boon: 'swift', contract: 'bogus', feats: { first_run: 'x' }, counters: { runs: 'many' } }, none);
    expect(m.marks).toBe(0); expect(m.owned).toEqual(['boon_bulwark']); expect(m.boon).toBeNull(); expect(m.contract).toBeNull(); expect(m.feats.first_run).toBeUndefined(); expect(m.counters.runs).toBe(0);
  });
});

describe('B18 storage', () => {
  beforeEach(() => { /* each test installs its own store */ });
  it('corrupt JSON is kept aside and the game still loads', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear() };
    store.set(SAVE_KEY, "{not json"); const s = loadSave(); expect(s.meta.marks).toBe(0); expect(store.get(SAVE_KEY + '.corrupt')).toBe("{not json");
    storeSave(s); expect(JSON.parse(store.get(SAVE_KEY)!).meta.v).toBe(1);
  });
});

describe('B18 run config in the sim', () => {
  it('boons apply real, bounded effects', () => {
    const base = new Simulation(7).state.player, b = new Simulation(7, 'gloam', false, false, cfg({ boon: 'bulwark' })).state.player;
    expect(b.maxHp).toBe(base.maxHp + 20); expect(new Simulation(7, 'gloam', false, false, cfg({ boon: 'swift' })).state.player.speed).toBeCloseTo(base.speed * 1.08);
    expect(new Simulation(7, 'gloam', false, false, cfg({ boon: 'spark' })).state.player.drive).toBe(25);
  });
  it('contracts change the run: Glass Vanguard, Overrun spawn pace, Relic Pressure, No Second Wind', () => {
    const mk = (contract: string) => new Simulation(7, 'gloam', false, false, cfg({ contract }));
    expect(mk('glass').state.player.maxHp).toBe(Math.round(100 * CONTRACT_RULES.glassHp)); expect(mk('overrun').state.run.spawnMult).toBe(CONTRACT_RULES.overrunSpawn); expect(mk('pressure').state.run.hazardMult).toBe(CONTRACT_RULES.pressureHazard);
    const sim = mk('nosw'); sim.state.player.level = 30; sim.state.upgradeStacks = { endurance: 1, mending: 1, plating: 1, impact: 5, tempo: 4, reach: 3, echo: 3, pulse: 3 };
    let seen = false; for (let i = 0; i < 80; i++) if (createOffer(sim.state, sim.rng).includes('secondwind')) seen = true; expect(seen).toBe(false);
  });
  it('reroll and banish are bounded by their charges and only work on the level-up screen', () => {
    const sim = new Simulation(11, 'gloam', false, false, cfg({ rerolls: 1, banishes: 1 }));
    expect(sim.reroll()).toBe(false); sim.debugLevelUp(); expect(sim.state.phase).toBe('upgrade');
    const before = [...sim.state.upgradeOffers]; expect(sim.reroll()).toBe(true); expect(sim.state.upgradeOffers).toHaveLength(3); expect(sim.state.upgradeOffers.some(o => !before.includes(o))).toBe(true); expect(sim.reroll()).toBe(false);
    const gone = sim.state.upgradeOffers[0]; expect(sim.banish(gone)).toBe(true); expect(sim.state.upgradeOffers).not.toContain(gone); expect(sim.state.upgradeOffers).toHaveLength(3); expect(sim.banish(sim.state.upgradeOffers[0])).toBe(false);
    for (let i = 0; i < 40; i++) expect(createOffer(sim.state, sim.rng)).not.toContain(gone);
  });
  it('the same seed and config replay identically', () => {
    const c = cfg({ boon: 'scholar', contract: 'overrun' }), a = new Simulation(5, 'ashen', false, false, c), b = new Simulation(5, 'ashen', false, false, c);
    for (let i = 0; i < 600; i++) { a.step(1 / 60, { x: 1, y: 0 } as never); b.step(1 / 60, { x: 1, y: 0 } as never); }
    expect(a.state.enemies.length).toBe(b.state.enemies.length); expect(a.state.player.x).toBe(b.state.player.x); expect(makeRunState().rerollsLeft).toBe(0);
  });
});

describe('B18 bridge: one reward per run', () => {
  it('publishing a finished run repeatedly grants once; a retry with the same seed is a new run id', () => {
    const save = migrateSave(null), bridge = new GameBridge(save), sim = new Simulation(3); bridge.bind(sim);
    sim.state.time = 200; sim.state.kills = 100; sim.state.phase = 'dead'; bridge.publish(true); const marks = save.meta.marks; bridge.publish(true); bridge.publish(true);
    expect(marks).toBeGreaterThan(0); expect(save.meta.marks).toBe(marks); expect(save.meta.counters.runs).toBe(1); expect(bridge.snapshot().reward?.total).toBe(marks);
    const bridge2 = new GameBridge(save), sim2 = new Simulation(3); bridge2.bind(sim2); expect(bridge2.runId).not.toBe(bridge.runId);
    sim2.state.time = 200; sim2.state.kills = 100; sim2.state.phase = 'dead'; bridge2.publish(true); expect(save.meta.counters.runs).toBe(2);
  });
});

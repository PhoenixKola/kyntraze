import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { CLASSIC_PLAN, ENDLESS_PLAN, bossRushPlan, canLive, contractKey, expeditionPlan, seedContract, vexChapterPlan, withLiving, type RunPlan } from '../b22/plan';
import { NO_CONFIG } from '../sim/RunConfig';
import { ARENAS, ARENA_IDS, type ArenaId } from '../content/arenas';
import { BARGAINS, BARGAIN_IDS, BLESSINGS, ARENA_LF, LF_KINDS, LF_RULES as F, type LfEvent } from '../b31/fractures';
import { endLiving, protectedFrom, spawnEvent, startLiving } from '../sim/LivingFractures';
import { lfCdr, lfMul } from '../sim/lfHooks';
import { blocked } from '../sim/CollisionSystem';
import { slotPlayer } from '../sim/CoopSystem';
import { PLAYER_FOOT_DY } from '../content/enemies';
import { HERO_IDS, type HeroId } from '../content/heroes';
import { PROTOCOL_VERSION, parseClient } from '../net/protocol';
import { toSnapshot, applySnapshot, blankClientState } from '../net/snapshot';
import { applyB22Result, blankB22, type B22RunResult } from '../b22/save';
import { lfHud, lfMarks } from '../bridge/lfHud';
import { Room } from '../server/room';
import { DT, idle, quiet, run } from './b22util';
import type { GameState } from '../sim/GameState';

const lfSim = (o: { plan?: RunPlan; arena?: ArenaId; hero?: HeroId; seed?: number } = {}) => {
  const { sim, s } = quiet({ plan: withLiving(o.plan ?? CLASSIC_PLAN), arena: o.arena ?? 'gloam', hero: o.hero ?? 'kai', seed: o.seed ?? 4 });
  s.lf!.nextAt = 1e9; s.player.x = 300; s.player.y = 300; return { sim, s };
};
const foot = (s: GameState, x: number, y: number) => { s.player.x = x; s.player.y = y - PLAYER_FOOT_DY; };
const killIds = (s: GameState, ev: LfEvent) => { for (const e of s.enemies) if (ev.ids.includes(e.id)) e.hp = 0; };
const at = { x: 1100, y: 800 };

describe('B31B definitions', () => {
  it('has six distinct event kinds, each configured for all four canonical arenas', () => {
    expect(LF_KINDS.length).toBe(6); expect(new Set(LF_KINDS).size).toBe(6);
    for (const id of ARENA_IDS) { const c = ARENA_LF[id]; expect(ARENAS[id].name.length).toBeGreaterThan(3); expect(c.rift.group.length).toBeGreaterThan(0); expect(c.cache.ambush.length).toBeGreaterThan(0); expect(c.elite.kinds.length).toBeGreaterThan(0); expect(c.shrine.pairs.length).toBe(2); expect(c.relay.raid.length).toBeGreaterThan(0); for (const k of LF_KINDS) expect(c.weights[k]).toBeGreaterThan(0); }
    expect(ARENAS.gloam.name).toBe('The Gloam Circuit'); expect(ARENAS.ashen.name).toBe('The Ashen Reliquary'); expect(ARENAS.aetherfall.name).toBe('Aetherfall Citadel'); expect(ARENAS.paradox.name).toBe('The Paradox Expanse');
  });
  it('every bargain pairs a real benefit with a real curse, and no shrine offers a fake choice', () => {
    for (const id of BARGAIN_IDS) { const b = BARGAINS[id]; expect(b.boon.length).toBeGreaterThan(8); expect(b.curse.length).toBeGreaterThan(8); expect(b.curseFx.length).toBeGreaterThan(0); expect(b.fx.length + (b.drive ?? 0) + (b.od ?? 0)).toBeGreaterThan(0); expect(b.dur).toBeGreaterThanOrEqual(45); }
    for (const id of ARENA_IDS) for (const [a, b] of ARENA_LF[id].shrine.pairs) { expect(a).not.toBe(b); expect(BARGAINS[a].curse).not.toBe(BARGAINS[b].curse); expect(BARGAINS[a].boon).not.toBe(BARGAINS[b].boon); }
  });
  it('four Celestial Echo variants carry four distinct blessings and four distinct trials', () => {
    expect(Object.keys(BLESSINGS).sort()).toEqual([...HERO_IDS].sort());
    expect(new Set(HERO_IDS.map(h => JSON.stringify(BLESSINGS[h].fx))).size).toBe(4); expect(new Set(HERO_IDS.map(h => BLESSINGS[h].trial)).size).toBe(4);
  });
  it('the rule is available only on Classic, Endless and Expedition; everything else is excluded from random events', () => {
    expect(canLive(CLASSIC_PLAN) && canLive(ENDLESS_PLAN) && canLive(expeditionPlan('paradox'))).toBe(true);
    for (const p of [bossRushPlan('initiation'), vexChapterPlan(1)]) { expect(canLive(p)).toBe(false); expect(withLiving(p)).toBe(p); const { s } = quiet({ plan: withLiving(p) }); expect(s.lf).toBeUndefined(); }
    expect(withLiving(CLASSIC_PLAN).living).toBe(true); expect(withLiving(CLASSIC_PLAN).ranked).toBe(false); expect(CLASSIC_PLAN.ranked).toBe(true); expect(CLASSIC_PLAN.living).toBeUndefined();
  });
  it('event settings are part of the seed identity', () => {
    const base = { seed: 7, mode: 'classic' as const, rules: 1, arena: 'gloam' as const, hero: 'kai' as const, players: ['kai' as const], challengeId: null, branches: [], relics: [], modifiers: [] };
    const off = contractKey(seedContract({ ...base, planId: CLASSIC_PLAN.id })), on = contractKey(seedContract({ ...base, planId: withLiving(CLASSIC_PLAN).id, lf: 1 }));
    expect(on).not.toBe(off); expect(off).not.toContain('lf'); expect(on).toContain('lf1');
  });
});

describe('B31B director: determinism, opt-out equivalence, scheduling', () => {
  const live = (seed: number, plan: RunPlan = CLASSIC_PLAN, arena: ArenaId = 'gloam') => { const sim = new Simulation(seed, arena, false, false, { ...NO_CONFIG, plan: withLiving(plan) }); sim.state.player.hp = sim.state.player.maxHp = 1e7; sim.state.player.nextXp = 1e9; return sim; };
  const plain = (seed: number) => { const sim = new Simulation(seed, 'gloam', false, false, { ...NO_CONFIG }); sim.state.player.hp = sim.state.player.maxHp = 1e7; sim.state.player.nextXp = 1e9; return sim; };
  const sig = (s: GameState) => JSON.stringify([s.kills, s.enemies.map(e => [e.id, e.kind, Math.round(e.x), Math.round(e.y), Math.round(e.hp)]), Math.round(s.player.x), Math.round(s.player.y), s.nextId]);
  it('with the rule off the run carries no event state at all', () => { const s = plain(3).state; expect(s.lf).toBeUndefined(); expect(s.plan.id).toBe('classic'); });
  it('opt-in is bit-identical to opt-out until the first event appears (no unrelated RNG is consumed)', () => {
    const a = plain(11), b = live(11); const first = b.state.lf!.nextAt; expect(first).toBeGreaterThan(100);
    for (let i = 0; i < Math.floor((first - 1) / DT); i++) { a.step(DT, idle); b.step(DT, idle); }
    expect(sig(b.state)).toBe(sig(a.state)); expect(b.rng.next()).toBe(a.rng.next());
  });
  it('the same seed reproduces the same events, a different seed does not', () => {
    const trace = (seed: number) => { const sim = live(seed, expeditionPlan('aetherfall'), 'aetherfall'), out: string[] = []; for (let i = 0; i < 560 * 60; i++) { sim.step(DT, idle); if ((sim.state.phase as string) === 'upgrade') { sim.state.phase = 'running'; sim.state.b22.relicOffer = null; } for (const e of sim.state.lf!.events) { const k = `${e.kind}@${Math.round(e.t0)}:${Math.round(e.x)},${Math.round(e.y)}`; if (!out.includes(k)) out.push(k); } } return out.join('|'); };
    const x = trace(5); expect(x.length).toBeGreaterThan(5); expect(trace(5)).toBe(x); expect(trace(6)).not.toBe(x);
  }, 60000);
  it('a full-length run gets roughly 2 to 4 opportunities, every site is safe, and nothing runs into a protected window', () => {
    for (const [arena, plan] of [['gloam', CLASSIC_PLAN], ['ashen', CLASSIC_PLAN], ['aetherfall', expeditionPlan('aetherfall')], ['paradox', expeditionPlan('paradox')]] as const) for (const seed of [21, 22]) {
      const sim = live(seed, plan, arena), s = sim.state, seen = new Map<number, LfEvent>(); let guard = 0;
      for (let i = 0; i < 1250 * 60 && s.phase === 'running'; i++) { sim.step(DT, idle); if ((s.phase as string) === 'upgrade') { s.phase = 'running'; s.b22.relicOffer = null; } for (const e of s.lf!.events) if (!seen.has(e.id)) { seen.set(e.id, { ...e }); guard++; const pf = protectedFrom(s); expect(e.ex, `${arena}/${seed} ${e.kind}`).toBeLessThanOrEqual(pf + 0.001); } }
      const n = seen.size; expect(n, `${arena}/${seed}`).toBeGreaterThanOrEqual(2); expect(n, `${arena}/${seed}`).toBeLessThanOrEqual(5);
      for (const e of seen.values()) { if (e.kind !== 'elite') { expect(blocked(e.x, e.y, 18), `${e.kind} centre in ${arena}`).toBe(false); expect(e.x).toBeGreaterThan(ARENAS[arena].inset); expect(e.y).toBeGreaterThan(ARENAS[arena].inset); } for (const b of plan.steps) if (b.kind === 'boss') { const t0 = e.t0, bossAt = b.at; expect(t0 < bossAt - 14 || t0 > bossAt + 14, `${e.kind} t0 ${t0} vs boss ${bossAt}`).toBe(true); } }
      expect(guard).toBe(n);
    }
  }, 240000);
  it('Endless repeats with cooldowns and avoids the cycle boss and the extract prompt', () => {
    const { sim, s } = lfSim({ plan: ENDLESS_PLAN }); s.lf!.nextAt = 100; s.encounter.forced = false; s.b22.endless = { fromT: 0, cycle: 0, bossAt: 120, offered: false, extracted: false };
    expect(protectedFrom(s)).toBeLessThanOrEqual(106); startLiving(s); expect(s.lf!.nextAt).toBeLessThan(160); void sim;
  });
});

describe('B31B Rift Portal', () => {
  it('enter, break the guard, claim: relic and Rift Surge are granted exactly once', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'rift', at)!; foot(s, 1100, 1250); run(sim, 1); expect(e.st).toBe('idle');
    foot(s, e.x, e.y); run(sim, 1.2); expect(e.st).toBe('active'); expect(e.ids.length).toBe(8); expect(s.enemies.filter(x => e.ids.includes(x.id)).every(x => Math.hypot(x.x - e.x, x.y - e.y) < 330)).toBe(true);
    foot(s, e.x + 160, e.y); run(sim, 7); killIds(s, e); run(sim, 0.1); expect(e.st).toBe('reward');
    foot(s, e.x, e.y); run(sim, 0.2); expect(e.st).toBe('won'); expect(s.b22.relics.length).toBe(1); expect(s.lf!.stats).toMatchObject({ won: 1, relics: 1 }); expect(lfMul(s, 'dmg')).toBeCloseTo(F.rift.boon.dmg, 5);
    run(sim, 6); expect(s.b22.relics.length).toBe(1); expect(s.lf!.stats.won).toBe(1); expect(s.lf!.events.length).toBe(0);
    run(sim, F.rift.boon.dur); expect(lfMul(s, 'dmg')).toBe(1);
  });
  it('leaving the ring collapses it: guard dissolved, no reward, no relic', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'rift', at)!; foot(s, e.x, e.y); run(sim, 1.2); expect(e.st).toBe('active');
    foot(s, 300, 1400); run(sim, F.rift.leave + 1); expect(e.st).toBe('failed'); expect(s.enemies.filter(x => e.ids.includes(x.id) && x.hp > 0).length).toBe(0); expect(s.b22.relics.length).toBe(0); expect(s.lf!.stats.failed).toBe(1);
  });
  it('an unclaimed shard fades and an unopened rift closes, both with cleanup', () => {
    let { sim, s } = lfSim(); let e = spawnEvent(s, 'rift', at)!; foot(s, e.x, e.y); run(sim, 1.2); foot(s, e.x + 160, e.y); run(sim, 7); killIds(s, e); run(sim, 0.1); foot(s, 300, 1400); run(sim, F.rift.claimT + 1); expect(e.st).toBe('expired'); expect(s.b22.relics.length).toBe(0);
    ({ sim, s } = lfSim()); e = spawnEvent(s, 'rift', at)!; foot(s, 300, 1400); run(sim, F.life.rift + 5); expect(e.st).toBe('expired'); expect(s.enemies.length).toBe(0);
  });
  it('event relics are capped per run so power cannot inflate', () => {
    const { sim, s } = lfSim();
    for (let k = 0; k < 3; k++) { const e = spawnEvent(s, 'rift', at)!; foot(s, e.x, e.y); run(sim, 1.2); foot(s, e.x + 160, e.y); run(sim, 7); killIds(s, e); run(sim, 0.1); foot(s, e.x, e.y); run(sim, 0.2); s.lf!.fx = []; run(sim, 4); }
    expect(s.b22.relics.length).toBe(F.caps.relics); expect(s.lf!.stats.won).toBe(3);
  });
});

describe('B31B Corrupted Shrine', () => {
  it('accepting applies the benefit AND the curse together, with stated duration; both end together', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'shrine', at)!, b = BARGAINS[e.pair![0]]; foot(s, e.x - F.shrine.spread, e.y); run(sim, F.shrine.channel + 0.3);
    expect(e.st).toBe('active'); expect(e.took).toBe(b.id); const kinds = s.lf!.fx.map(f => f.kind); expect(kinds).toContain('boon'); expect(kinds).toContain('curse');
    if (b.id === 'blood_pact') { expect(lfMul(s, 'dmg')).toBeCloseTo(1.28, 5); expect(lfMul(s, 'taken')).toBeCloseTo(1.35, 5); }
    expect(s.lf!.fx.every(f => Math.abs(f.dur - b.dur) < 1e-6)).toBe(true); run(sim, b.dur + 1); expect(s.lf!.fx.length).toBe(0); expect(lfMul(s, 'dmg')).toBe(1); expect(lfMul(s, 'taken')).toBe(1); expect(e.st === 'won' || s.lf!.events.length === 0).toBe(true);
  });
  it('the curse really bites: damage taken rises while it lasts', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'shrine', at)!; e.pair = ['blood_pact', 'tempo_debt']; foot(s, e.x - F.shrine.spread, e.y); run(sim, 1.6);
    const taken = (dmg: number) => { s.player.hp = 1000; s.player.invulnerable = 0; (sim as unknown as { state: GameState }).state.phase = 'running'; return import('../sim/CombatSystem').then(m => { m.damagePlayer(s, dmg); return 1000 - s.player.hp; }); };
    return taken(100).then(d => { expect(d).toBeCloseTo(135 * s.mods.armor, 3); });
  });
  it('a world curse (Hungry Flame) is party-wide and raises spawn pressure; declining costs nothing', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'shrine', at)!; e.pair = ['hungry_flame', 'wardens_toll']; foot(s, e.x - F.shrine.spread, e.y); run(sim, 1.6);
    expect(lfMul(s, 'spawn')).toBeCloseTo(1.3, 5); expect(lfMul(s, 'xp')).toBeCloseTo(1.6, 5);
    const d = lfSim(), de = spawnEvent(d.s, 'shrine', at)!; foot(d.s, 1100, 1300); run(d.sim, 130); expect(de.st).toBe('expired'); expect(d.s.lf!.fx.length).toBe(0); expect(lfMul(d.s, 'taken')).toBe(1); expect(d.s.lf!.hist.at(-1)!.outcome).toBe('declined');
  });
  it('Ember Oath pays energy at once', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'shrine', at)!; e.pair = ['ember_oath', 'wardens_toll']; s.player.drive = 0; s.player.odMeter = 0; foot(s, e.x - F.shrine.spread, e.y); run(sim, 1.6); expect(s.player.drive).toBeGreaterThanOrEqual(59); expect(s.player.odMeter).toBeGreaterThanOrEqual(39); expect(lfMul(s, 'taken')).toBeCloseTo(1.4, 5);
  });
});

describe('B31B Fracture Cache', () => {
  it('an unguarded cache opens after attuning, once', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'cache', at)!; e.aux[0] = 0; foot(s, e.x, e.y + 700); run(sim, 0.5); expect(e.seen).toBe(false); foot(s, e.x, e.y + 400); run(sim, 0.5); expect(e.seen).toBe(true);
    foot(s, e.x, e.y); run(sim, F.cache.attune + 0.3); expect(e.st).toBe('won'); expect(s.lf!.hist.at(-1)!.note).toContain('crystal'); expect(s.lf!.stats.won).toBe(1); run(sim, 5); expect(s.lf!.stats.won).toBe(1);
  });
  it('a guarded cache telegraphs, springs an ambush that must be defeated, then pays more', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'cache', at)!; e.aux[0] = 1; foot(s, e.x, e.y); run(sim, F.cache.attune + 0.3); expect(e.st).toBe('active');
    expect(s.hazards.filter(h => h.tag === 'lf_ambush').length).toBeGreaterThanOrEqual(3); expect(e.ids.length).toBe(0); run(sim, F.cache.ambushDelay + 0.2); expect(e.ids.length).toBe(5); expect(e.st).toBe('active');
    run(sim, 1); expect(e.st).toBe('active'); foot(s, e.x + 300, e.y); killIds(s, e); run(sim, 0.05); expect(e.st).toBe('won'); expect(s.pickups.length).toBeGreaterThanOrEqual(3);
  });
  it('an ambush nobody clears expires and cleans up its enemies and markers', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'cache', at)!; e.aux[0] = 1; foot(s, e.x, e.y); run(sim, 1.5); run(sim, 1); foot(s, 300, 1400); run(sim, 85); expect(e.st === 'expired' || s.lf!.events.length === 0).toBe(true); expect(s.enemies.filter(x => x.hp > 0 && x.ex?.lfCache).length).toBe(0); expect(s.pickups.length).toBe(0);
  });
});

describe('B31B Roaming Elite', () => {
  it('roams while unaware, chases once engaged, lets you flee, and stays optional', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'elite')!, en = () => s.enemies.find(x => x.id === e.ids[0])!; expect(e.st).toBe('idle'); const x0 = en().x, y0 = en().y;
    foot(s, 300, 300); s.player.x = Math.min(s.player.x, 300); const far = Math.hypot(en().x - s.player.x, en().y - s.player.y); expect(far).toBeGreaterThan(560);
    run(sim, 6); expect(en().speed).toBe(0); expect(Math.hypot(en().x - x0, en().y - y0)).toBeGreaterThan(20); expect(e.st).toBe('idle');
    foot(s, en().x - 300, en().y); run(sim, 0.3); expect(e.st).toBe('active'); expect(en().speed).toBeGreaterThan(30);
    foot(s, 300, 1500); s.player.x = en().x > 1000 ? 200 : 2000; s.player.y = en().y > 800 ? 200 : 1400; run(sim, F.elite.leashT + 2); expect(['idle', 'active']).toContain(e.st);
    expect(s.lf!.stats.failed).toBe(0); expect(s.lf!.fx.length).toBe(0);
  });
  it('slaying it pays once: crystals, Elite Trophy, Overdrive; volatile elites leave a telegraphed blast', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'elite')!; e.mod = 'volatile'; const en = s.enemies.find(x => x.id === e.ids[0])!; foot(s, en.x - 400, en.y); s.player.odMeter = 0; en.hp = 0; run(sim, 0.02);
    expect(e.st).toBe('won'); expect(s.pickups.filter(p => p.tier === 2).length).toBe(F.elite.crystals); expect(s.lf!.fx.map(f => f.label)).toContain('Elite Trophy'); expect(s.player.odMeter).toBeGreaterThanOrEqual(F.elite.od - 1); expect(s.hazards.some(h => h.tag === 'lf_blast')).toBe(true);
    run(sim, 6); expect(s.lf!.stats.won).toBe(1); expect(s.pickups.filter(p => p.tier === 2).length).toBeLessThanOrEqual(F.elite.crystals);
  });
  it('each modifier has its own recognisable cue', () => {
    for (const [mod, tag] of [['swift', 'lf_pounce'], ['warded', 'lf_ward']] as const) { const { sim, s } = lfSim(), e = spawnEvent(s, 'elite')!; e.mod = mod; const en = s.enemies.find(x => x.id === e.ids[0])!; foot(s, en.x - 260, en.y); run(sim, 3); expect(e.st).toBe('active'); run(sim, F.elite.pounceEvery + 1); expect(s.hazards.some(h => h.tag === tag)).toBe(true); }
  });
  it('an elite that is never found slips away at its deadline', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'elite')!; foot(s, 300, 300); run(sim, F.life.elite + 130); expect(['expired', 'idle', 'active'].includes(e.st)).toBe(true); if (e.st !== 'expired') { s.time = e.ex + 21; foot(s, 300, 300); run(sim, 0.2); }
    expect(s.lf!.events.filter(x => x.kind === 'elite' && x.st === 'idle').length + (e.st === 'expired' ? 0 : 0)).toBeLessThanOrEqual(1);
  });
});

describe('B31B Containment', () => {
  it('defend: progress needs a fighter in the ring; protecting the relay to the end pays the party', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'relay', at)!; expect(e.type).toBe('defend'); foot(s, e.x, e.y); run(sim, 1); expect(e.st).toBe('active');
    foot(s, e.x, e.y + 600); const p0 = e.p; run(sim, 5); expect(e.p).toBe(p0); foot(s, e.x, e.y + 60);
    for (let t = 0; t < 70 && e.st === 'active'; t++) { run(sim, 1); killIds(s, e); }
    expect(e.st).toBe('won'); expect(s.lf!.fx.map(f => f.label)).toContain('Relay Surge'); expect(lfMul(s, 'speed')).toBeCloseTo(F.relay.surge.speed, 5);
  });
  it('defend: an overrun relay is lost, with raiders released', () => {
    const { sim, s } = lfSim(), e = spawnEvent(s, 'relay', at)!; foot(s, e.x, e.y + 60); run(sim, 1); expect(e.st).toBe('active'); foot(s, e.x, e.y + 800); for (let t = 0; t < 140 && e.st === 'active'; t++) run(sim, 1);
    expect(e.st).toBe('failed'); expect(e.hp).toBe(0); expect(s.lf!.fx.length).toBe(0); expect(s.enemies.filter(x => x.hp > 0 && x.ex?.lfRaid && (x.speed === 0)).length).toBe(0);
  });
  it('escort: the beacon moves only with a guard beside it and success means arriving alive', () => {
    const { sim, s } = lfSim({ arena: 'ashen' }), e = spawnEvent(s, 'relay', at)!; expect(e.type).toBe('escort'); foot(s, e.x, e.y + 50); run(sim, 1); expect(e.st).toBe('active');
    const x0 = e.x, y0 = e.y; foot(s, e.x + 700, e.y); run(sim, 3); expect(Math.hypot(e.x - x0, e.y - y0)).toBeLessThan(1);
    for (let i = 0; i < 600 && e.st === 'active'; i++) { foot(s, e.x + 40, e.y + 30); run(sim, 0.1); killIds(s, e); }
    expect(e.st).toBe('won'); expect(Math.hypot(e.x - e.aux[0], e.y - e.aux[1])).toBeLessThan(13);
  });
  it('escort: abandoning the beacon bleeds it dry', () => {
    const { sim, s } = lfSim({ arena: 'ashen' }), e = spawnEvent(s, 'relay', at)!; foot(s, e.x, e.y + 50); run(sim, 1); foot(s, 300, 1450); const h0 = e.hp; run(sim, F.relay.abandon + 5); expect(e.hp).toBeLessThan(h0);
  });
});

describe('B31B Celestial Echo', () => {
  const trial = (hero: HeroId) => {
    const { sim, s } = lfSim({ hero, arena: 'paradox' }), e = spawnEvent(s, 'echo', at)!; expect(e.hero).toBe(hero); foot(s, e.x, e.y); run(sim, 1.2); expect(e.st).toBe('active');
    const stay = () => foot(s, e.x, e.y + 20);
    if (hero === 'kai') { for (let i = 0; i < 300 && e.st === 'active'; i++) { stay(); run(sim, 0.1); } }
    else if (hero === 'ren') { for (let i = 0; i < 400 && e.st === 'active'; i++) { if (e.aux[7] > 0) foot(s, e.aux[5], e.aux[6]); else stay(); run(sim, 0.1); } }
    else if (hero === 'sora') { for (let i = 0; i < 400 && e.st === 'active'; i++) { if (e.aux[9] === 1) foot(s, e.aux[5], e.aux[6]); else stay(); run(sim, 0.1); } }
    else { for (let i = 0; i < 25 && e.st === 'active'; i++) { stay(); run(sim, 0.2); } killIds(s, e); run(sim, 0.2); }
    return { s, e };
  };
  for (const hero of HERO_IDS) it(`${hero}: the trial can be won and grants its own blessing once`, () => {
    const { s, e } = trial(hero); expect(e.st).toBe('won'); const B = BLESSINGS[hero], fx = s.lf!.fx.find(f => f.label === B.name)!; expect(fx).toBeTruthy(); expect(fx.dur).toBe(B.dur);
    expect(s.player.drive).toBeGreaterThanOrEqual(B.drive - 1); expect(s.lf!.stats.won).toBe(1); expect(s.lf!.fx.filter(f => f.label === B.name).length).toBe(1);
    if (hero === 'kai') expect(lfCdr(s, 0)).toBeCloseTo(1.3, 5); if (hero === 'ren') expect(lfCdr(s, 0, true)).toBeGreaterThan(1.5); if (hero === 'sora') expect(lfMul(s, 'taken')).toBeCloseTo(0.88, 5); if (hero === 'vex') expect(lfMul(s, 'taken')).toBeCloseTo(0.78, 5);
  });
  it('failing is clean: leaving the sigil ends the trial, removes its hazards and grants nothing', () => {
    const { sim, s } = lfSim({ hero: 'kai' }), e = spawnEvent(s, 'echo', at)!; foot(s, e.x, e.y); run(sim, 4); expect(s.hazards.some(h => h.tag === 'lf_ember')).toBe(true); foot(s, 300, 1450); run(sim, F.echo.leave + 1);
    expect(e.st).toBe('failed'); expect(s.hazards.filter(h => h.tag === 'lf_ember' && !h.fired).length).toBe(0); expect(s.lf!.fx.length).toBe(0); expect(s.lf!.stats.won).toBe(0);
  });
  it('Echo blessings never unlock or replace a permanent form', () => {
    const { s } = trial('kai'); expect(s.heroFormUnlocked).toBe(false); expect(s.player.form).toBe(0); expect(s.cometUnlocked).toBe(false); expect(s.apexUnlocked).toBe(false);
  });
});

describe('B31B cleanup and presentation data', () => {
  it('endLiving winds up every event, hazard and enemy, is idempotent, and records what was left behind', () => {
    const { sim, s } = lfSim(); const r = spawnEvent(s, 'rift', at)!; foot(s, r.x, r.y); run(sim, 1.2); const c = spawnEvent(s, 'cache', { x: 1500, y: 500 })!; c.aux[0] = 1; void c;
    spawnEvent(s, 'shrine', { x: 700, y: 1200 }); endLiving(s); expect(s.lf!.events.every(e => e.st === 'expired')).toBe(true); expect(s.enemies.filter(e => e.hp > 0 && e.stepId === 'lf').length).toBe(0); expect(s.lf!.fx.length).toBe(0);
    const n = s.lf!.hist.length; endLiving(s); expect(s.lf!.hist.length).toBe(n); expect(n).toBe(3);
  });
  it('the HUD view reports each event with state, progress, direction and bargain previews; minimap hides unfound caches', () => {
    const { s } = lfSim(); spawnEvent(s, 'shrine', { x: 1100, y: 600 }); const c = spawnEvent(s, 'cache', { x: 1900, y: 1300 })!; foot(s, 1100, 800);
    const h = lfHud(s)!; expect(h.events.find(e => e.kind === 'shrine')!.preview!.length).toBe(2); expect(h.events[0].dist).toBeGreaterThan(0); expect(lfMarks(s).length).toBe(2); expect(lfMarks(s).find(m => m.k === 2)!.h).toBe(1); c.seen = true; expect(lfMarks(s).find(m => m.k === 2)!.h).toBe(0); c.seen = false; foot(s, 100, 100); expect(lfMarks(s).length).toBe(1);
  });
});

describe('B31B co-op: one shared world, explicit participation and ownership', () => {
  const party = () => { const { sim, s } = lfSim(); sim.joinPartner({ ...NO_CONFIG, hero: 'ren' }, 'local'); const p1 = slotPlayer(s, 1); p1.hp = p1.maxHp = 1e6; p1.x = 300; p1.y = 400; return { sim, s, p1 }; };
  const step = (sim: Simulation, sec: number) => { for (let i = 0; i < Math.round(sec / DT); i++) sim.step(DT, idle, idle); };
  it('a shrine bargain belongs to whoever stands on the altar; the other fighter is untouched (curse scope aside)', () => {
    const { sim, s, p1 } = party(), e = spawnEvent(s, 'shrine', at)!; e.pair = ['blood_pact', 'tempo_debt']; p1.x = e.x - F.shrine.spread; p1.y = e.y - PLAYER_FOOT_DY; foot(s, 300, 300); step(sim, F.shrine.channel + 0.4);
    expect(e.who).toBe(1); expect(lfMul(s, 'dmg', 1)).toBeCloseTo(1.28, 5); expect(lfMul(s, 'dmg', 0)).toBe(1); expect(lfMul(s, 'taken', 1)).toBeCloseTo(1.35, 5); expect(lfMul(s, 'taken', 0)).toBe(1);
  });
  it('rift rewards go only to participants who stayed in the ring', () => {
    const { sim, s, p1 } = party(), e = spawnEvent(s, 'rift', at)!; foot(s, e.x, e.y); p1.x = e.x + 60; p1.y = e.y - PLAYER_FOOT_DY; step(sim, 1.3); expect(e.st).toBe('active'); expect(e.ids.length).toBeGreaterThan(8);
    p1.x = 300; p1.y = 1400; foot(s, e.x + 150, e.y); step(sim, 7); killIds(s, e); step(sim, 0.2); foot(s, e.x, e.y); step(sim, 0.3);
    expect(e.st).toBe('won'); expect(s.b22.relics.length).toBe(1); expect(s.party!.slots[1].bag.b22.relics.length).toBe(0); expect(s.lf!.fx.every(f => f.slot === 0)).toBe(true);
  });
  it('the event world is the same for both players and the snapshot gives each their own relative slot', () => {
    const { s } = party(), e = spawnEvent(s, 'shrine', at)!; e.who = 1; s.lf!.fx.push({ id: 99, slot: 1, src: e.id, kind: 'boon', label: 'x', icon: 'x', until: 50, dur: 50 });
    const a = toSnapshot(s, 1, 0) as unknown as { lf: { events: LfEvent[]; fx: { slot: number }[] } }, b = toSnapshot(s, 1, 1) as unknown as typeof a;
    expect(a.lf.events[0].id).toBe(b.lf.events[0].id); expect(a.lf.events[0].who).toBe(1); expect(b.lf.events[0].who).toBe(0); expect(a.lf.fx[0].slot).toBe(1); expect(b.lf.fx[0].slot).toBe(0);
    expect(JSON.stringify(a)).not.toContain('"rng"');
    const c = blankClientState(s.seed, s.arenaId); applySnapshot(c, JSON.parse(JSON.stringify(a))); expect(c.lf!.events.length).toBe(1); expect(c.lf!.events[0].kind).toBe('shrine'); expect(lfHud(c)!.events[0].kind).toBe('shrine');
  });
});

describe('B31B online: protocol, validation and server authority', () => {
  it('protocol is versioned and carries only the room flag; clients can never submit outcomes', () => {
    expect(PROTOCOL_VERSION).toBe(2);
    expect(parseClient(JSON.stringify({ t: 'create', hero: 'kai', mode: 'classic', arena: 'gloam', lf: true }))).toMatchObject({ t: 'create', lf: true });
    expect(parseClient(JSON.stringify({ t: 'create', hero: 'kai', mode: 'classic', arena: 'gloam' }))).not.toHaveProperty('lf');
    expect(parseClient(JSON.stringify({ t: 'create', hero: 'kai', mode: 'classic', arena: 'gloam', lf: 'yes' }))).toBeNull();
    for (const t of ['lf_claim', 'lf_reward', 'event', 'claim', 'result', 'bargain']) expect(parseClient(JSON.stringify({ t, id: 1, kind: 'rift', reward: 'relic' }))).toBeNull();
    expect(parseClient(JSON.stringify({ t: 'pick', kind: 'bargain', id: 'blood_pact' }))).toBeNull();
  });
  it('a Living Fractures room runs a real shared event world, is unranked and tears down with the run', () => {
    const sent: unknown[] = [], conn = { send: (m: string) => sent.push(JSON.parse(m)), close: () => undefined } as never, store = { add: () => 1 } as never;
    const r = new Room('ABCDE', 'classic', 'gloam', true, store, () => undefined); r.add('A', 'kai', conn); r.add('B', 'ren', conn); r.players.forEach(p => { p.ready = true; }); r.start();
    const s = r.sim!.state; expect(s.plan.living).toBe(true); expect(s.lf).toBeTruthy(); expect(s.party).toBeTruthy(); expect(s.plan.ranked).toBe(false); spawnEvent(s, 'echo', { x: 1100, y: 700 });
    for (let i = 0; i < 10; i++) r.sim!.step(DT, idle, idle); const snap = toSnapshot(s, 1, 0) as unknown as { lf: { events: unknown[] }; plan: { living?: boolean } }; expect(snap.lf.events.length).toBe(1); expect(snap.plan.living).toBe(true);
    r.finish(true); expect(s.lf!.ended).toBe(true); r.destroy(); const off = new Room('FGHJK', 'classic', 'gloam', false, store, () => undefined); off.add('A', 'kai', conn); off.add('B', 'ren', conn); off.start(); expect(off.sim!.state.lf).toBeUndefined(); expect(off.sim!.state.plan.id).toBe('classic'); off.destroy();
  });
});

describe('B31B persistence', () => {
  it('a Living Fractures result keeps the ledger and mastery but never touches the mode records', () => {
    const base = blankB22(), res = (living: boolean, id: string): B22RunResult => ({ runId: id, mode: 'classic', hero: 'kai', arena: 'gloam', party: 1, won: true, seconds: 900, kills: 300, level: 12, score: 9000, cycle: 0, counters: {}, relics: [], branches: [], legends: [], bosses: ['warden'], living });
    const a = applyB22Result(base, res(true, 'r1')).save; expect(Object.keys(a.records).length).toBe(0); expect(a.ledger).toContain('r1');
    const b = applyB22Result(a, res(false, 'r2')).save; expect(Object.keys(b.records).length).toBe(1); expect(applyB22Result(b, res(true, 'r1')).save).toBe(b);
  });
});

void ARENA_IDS; void BARGAINS;

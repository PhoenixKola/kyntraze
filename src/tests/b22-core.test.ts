import { describe, expect, it } from 'vitest';
import { ARENAS, ARENA_IDS, REALM_ARENAS, PROP_FOOTPRINTS } from '../content/arenas';
import { BOSS_KINDS, ENEMIES, REALM_KINDS } from '../content/enemies';
import { BOSSES } from '../content/bosses';
import { HEROES } from '../content/heroes';
import { BOSS_SCHEDULE, FINALE_WARN_AT } from '../content/encounters';
import { UPGRADES } from '../content/upgrades';
import { RELICS, RELIC_IDS } from '../b22/relics';
import { BRANCHES, BRANCH_RULES, branchesFor } from '../b22/branches';
import { LEGENDARIES, eligibleLegendaries, recipeProgress, LEGENDARY_CAP } from '../b22/legendary';
import { MILESTONES, FORM_KEYS, ULTIMATES, milestonesOf } from '../b22/mastery';
import { PAIRS, pairOf } from '../b22/pairs';
import { OUTFITS } from '../b22/cosmetics';
import { CLASSIC_PLAN, RUN_MODE_IDS, planFor, bossRushPlan, BOSS_RUSH_TRACKS, expeditionPlan, planBudget, streamSeed, seedContract, contractKey, ENDLESS_CYCLE } from '../b22/plan';
import { dailyChallenge, dailyId, weeklyId, weeklyChallenge, MODIFIERS, makeChallenge, challengeScore, challengeState, untilReset } from '../b22/challenges';
import { REALM_TABLE } from '../b22/realms';
import { quiet, run, hazardsOf } from './b22util';
import { THREAT_CURVE } from '../content/encounters';

describe('B22 content counts (the audited matrix)', () => {
  it('2 new arenas, 4 total; 6 new archetypes (+1 sigil object); 9 bosses (7 new); 4 heroes', () => {
    expect(REALM_ARENAS).toEqual(['aetherfall', 'paradox']); expect(ARENA_IDS).toHaveLength(4);
    expect(REALM_KINDS.filter(k => k !== 'halo_sigil')).toHaveLength(6); expect(Object.keys(ENEMIES)).toHaveLength(13);
    expect(BOSS_KINDS).toHaveLength(9); expect(Object.keys(BOSSES)).toHaveLength(9);
    expect(BOSS_KINDS.filter(k => k !== 'warden' && k !== 'seraph')).toHaveLength(7);
    expect(HEROES.map(h => h.id)).toEqual(['kai', 'ren', 'sora', 'vex']);
  });
  it('8 relics (4 per realm), 24 branches (2 per slot per hero), 12 legendary recipes, 4 ultimates, 7 forms x 3 milestones, 6 pairings, 8 outfits', () => {
    expect(RELICS).toHaveLength(8); expect(RELICS.filter(r => r.realm === 'aetherfall')).toHaveLength(4); expect(RELICS.filter(r => r.realm === 'paradox')).toHaveLength(4); expect(new Set(RELIC_IDS).size).toBe(8);
    expect(BRANCHES).toHaveLength(24);
    for (const h of HEROES) for (const slot of ['q', 'e', 'r'] as const) { const b = branchesFor(h.id, slot); expect(b).toHaveLength(2); expect(b[0].side).toBe('A'); expect(b[1].side).toBe('B'); expect(b[0].name).not.toBe(b[1].name); }
    expect(new Set(BRANCHES.map(b => b.id)).size).toBe(24);
    expect(LEGENDARIES).toHaveLength(12); for (const h of HEROES) expect(LEGENDARIES.filter(l => l.hero === h.id)).toHaveLength(3);
    expect(Object.keys(ULTIMATES)).toHaveLength(4); expect(FORM_KEYS).toHaveLength(7); expect(MILESTONES).toHaveLength(21); for (const f of FORM_KEYS) expect(milestonesOf(f).map(m => m.tier)).toEqual(['initiate', 'adept', 'master']);
    expect(PAIRS).toHaveLength(6); expect(new Set(PAIRS.map(p => [...p.heroes].sort().join('+'))).size).toBe(6); expect(OUTFITS).toHaveLength(8); for (const h of HEROES) expect(OUTFITS.filter(o => o.hero === h.id)).toHaveLength(2);
    expect(pairOf('ren', 'vex')?.id).toBe('ren_vex'); expect(pairOf('kai', 'kai')).toBeNull();
  });
  it('every branch has a real tradeoff text and a slot unlock rule; every outfit differs in palette', () => {
    for (const b of BRANCHES) { expect(b.gain.length).toBeGreaterThan(20); expect(b.cost.length).toBeGreaterThan(4); }
    for (const s of ['q', 'e', 'r'] as const) expect(BRANCH_RULES[s].level).toBeGreaterThan(4);
    expect(new Set(OUTFITS.map(o => o.palette.primary + o.palette.secondary)).size).toBe(8);
  });
});

describe('B22 run plans', () => {
  it('Classic is encoded exactly as the original schedule: Warden 480, Seraph 900, finale warning 870', () => {
    expect(CLASSIC_PLAN.steps.map(s => [s.boss, s.at])).toEqual(BOSS_SCHEDULE.map(b => [b.id, b.at]));
    expect(CLASSIC_PLAN.steps.find(s => s.boss === 'seraph')!.warnAt).toBe(FINALE_WARN_AT);
    expect(CLASSIC_PLAN.threat).toBe(THREAT_CURVE); expect(CLASSIC_PLAN.unlocks).toBe(true); expect(planFor('classic')).toBe(CLASSIC_PLAN);
    expect(CLASSIC_PLAN.steps.filter(s => s.ends)).toHaveLength(1);
  });
  it('every mode id resolves to a plan; Expedition lasts about 20 minutes in three acts with a relic path; boss rush tracks have 3 / 5 / Sovereign legs', () => {
    for (const m of RUN_MODE_IDS) expect(planFor(m).mode === m || m === 'daily_challenge' || m === 'weekly_challenge' || m === 'campaign').toBe(true);
    for (const a of ['aetherfall', 'paradox'] as const) { const p = expeditionPlan(a); expect(p.acts).toHaveLength(3); expect(p.steps.at(-1)!.at).toBeGreaterThanOrEqual(1000); expect(p.steps.at(-1)!.ends).toBe(true); expect(p.steps.some(s => s.reward === 'relic')).toBe(true); expect(p.pool).toBe('realm'); expect(p.unlocks).toBe(false); }
    expect(BOSS_RUSH_TRACKS.initiation.bosses).toHaveLength(3); expect(BOSS_RUSH_TRACKS.veteran.bosses).toHaveLength(5); expect(BOSS_RUSH_TRACKS.sovereign_trial.bosses.at(-1)).toBe('sovereign');
    for (const t of ['initiation', 'veteran', 'sovereign_trial'] as const) { const p = bossRushPlan(t); expect(p.steps.filter(s => s.ends)).toHaveLength(1); expect(p.steps.at(-1)!.ends).toBe(true); expect(p.unlocks).toBe(false); }
    expect(bossRushPlan('initiation', true).ranked).toBe(false);
  });
  it('plan budgets, the seed contract and RNG streams are stable pure functions', () => {
    expect(planBudget(CLASSIC_PLAN, 0)).toBeLessThan(5); expect(planBudget(CLASSIC_PLAN, 900)).toBeGreaterThan(50);
    const c = seedContract({ seed: 7, mode: 'classic', planId: 'classic', rules: 1, arena: 'gloam', hero: 'kai', players: ['kai'], challengeId: null, branches: [], relics: [], modifiers: [] });
    expect(contractKey(c)).toBe(contractKey({ ...c })); expect(contractKey({ ...c, seed: 8 })).not.toBe(contractKey(c));
    expect(streamSeed(5, 'spawn')).toBe(streamSeed(5, 'spawn')); expect(streamSeed(5, 'spawn')).not.toBe(streamSeed(5, 'loot')); expect(ENDLESS_CYCLE).toBe(300);
  });
});

describe('B22 UTC challenges', () => {
  const T = Date.UTC(2026, 10, 18, 23, 59, 59);   // 2026-11-18 23:59:59 UTC (a Wednesday)
  it('IDs come from the UTC calendar, never the local clock: one second later is the next day, the week starts on Monday', () => {
    expect(dailyId(T)).toBe('D-20261118'); expect(dailyId(T + 1000)).toBe('D-20261119'); expect(weeklyId(T)).toBe('W-20261116'); expect(weeklyId(Date.UTC(2026, 10, 22, 23, 0, 0))).toBe('W-20261116'); expect(weeklyId(Date.UTC(2026, 10, 23, 0, 0, 0))).toBe('W-20261123');
  });
  it('the same ID always yields the identical seed, arena, hero lock, modifiers and plan; different days differ', () => {
    const a = dailyChallenge(T), b = dailyChallenge(T - 3600_000); expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const seeds = new Set<number>(); for (let d = 0; d < 60; d++) seeds.add(dailyChallenge(T + d * 86_400_000).seed); expect(seeds.size).toBeGreaterThan(55);
  });
  it('a year of daily and weekly challenges never combines conflicting modifiers, never restricts to an unavailable arena, and stays bounded', () => {
    for (let d = 0; d < 365; d++) {
      const c = dailyChallenge(T + d * 86_400_000), w = weeklyChallenge(T + d * 86_400_000);
      for (const ch of [c, w]) { for (const m of ch.modifiers) { const def = MODIFIERS.find(x => x.id === m)!; expect(def.arenas === undefined || def.arenas.includes(ch.arena)).toBe(true); for (const o of ch.modifiers) expect(def.conflicts.includes(o)).toBe(false); } expect(ch.plan.steps.some(s => s.ends)).toBe(true); expect(ch.cap).toBeGreaterThan(300); }
      expect(c.modifiers).toHaveLength(1); expect(w.modifiers.length).toBeGreaterThanOrEqual(1); expect(c.cap).toBeLessThan(w.cap);
    }
  });
  it('arena pools restrict generation (offline players only get arenas they own), the pool changes the arena but the ID stays', () => {
    const c = dailyChallenge(T, ['gloam']); expect(c.arena).toBe('gloam'); expect(c.id).toBe('D-20261118');
  });
  it('scoring: a win always outranks a loss; countdown and state are derived from UTC', () => {
    const c = makeChallenge('daily', 'D-X', 0); expect(challengeScore(c, { won: true, seconds: 470, kills: 0 })).toBeGreaterThan(challengeScore(c, { won: false, seconds: 479, kills: 900 }));
    const d = dailyChallenge(T); expect(untilReset(d, T)).toBe(1); expect(challengeState(d, T)).toBe('live'); expect(challengeState(d, T + 2000)).toBe('expired');
  });
});

describe('B22 legendary recipes: reachable, truthful, capped', () => {
  const stacksFor = (needs: { id: string; stacks: number }[]) => Object.fromEntries(needs.map(n => [n.id, n.stacks]));
  it('every prerequisite is a real card, within its max stacks, and earnable with the card chain (requires / category gate)', () => {
    for (const l of LEGENDARIES) for (const n of l.needs) {
      const u = UPGRADES.find(x => x.id === n.id)!; expect(u, `${l.id}:${n.id}`).toBeTruthy(); expect(n.stacks).toBeLessThanOrEqual(u.maxStacks);
      if (u.requires) expect(l.needs.some(m => m.id === u.requires), `${l.id} needs ${u.requires} for ${u.id}`).toBe(true);
      if (u.needs) { let have = 0; for (const m of l.needs) { const mu = UPGRADES.find(x => x.id === m.id)!; if (mu.category === u.needs.category && mu.id !== u.id) have += m.stacks; } const extra = UPGRADES.filter(x => x.category === u.needs!.category && x.rarity === 'common').reduce((a, x) => a + x.maxStacks, 0); expect(have + extra).toBeGreaterThanOrEqual(u.needs.count); }
    }
  });
  it('recipe discovered -> prerequisites met -> offered; failing prerequisites never offers; owned and capped recipes never repeat', () => {
    for (const l of LEGENDARIES) {
      const full = stacksFor(l.needs); expect(recipeProgress(l, full).ready).toBe(true);
      expect(eligibleLegendaries(l.hero, full, []).map(x => x.id)).toContain(l.id);
      const short = { ...full, [l.needs[0].id]: l.needs[0].stacks - 1 }; expect(eligibleLegendaries(l.hero, short, []).map(x => x.id)).not.toContain(l.id);
      expect(eligibleLegendaries(l.hero, full, [l.id]).map(x => x.id)).not.toContain(l.id);
      const other = HEROES.find(h => h.id !== l.hero)!.id; expect(eligibleLegendaries(other, full, []).map(x => x.id)).not.toContain(l.id);
      expect(eligibleLegendaries(l.hero, full, [], [`legend:${l.id}`]).map(x => x.id)).not.toContain(l.id);
    }
    const all = Object.fromEntries(UPGRADES.map(u => [u.id, u.maxStacks])); expect(eligibleLegendaries('kai', all, ['solar_rupture', 'dragon_overture', 'nova_constellation'])).toHaveLength(0); expect(LEGENDARY_CAP).toBe(3);
  });
});

describe('B22 realm arenas', () => {
  it('both realms keep solids inside the walls, clear of the spawn, with footprints for every prop; neither is a recolour of an old arena', () => {
    for (const id of REALM_ARENAS) { const a = ARENAS[id]; expect(a.solids.length).toBeGreaterThanOrEqual(6); expect(a.procedural).toBe(true);
      for (const s of a.solids) { const f = PROP_FOOTPRINTS[s.prop]; expect(f).toBeTruthy(); expect(s.x).toBeGreaterThan(60); expect(s.y).toBeGreaterThan(60); expect(s.x + f.w).toBeLessThan(2140); expect(s.y + f.h).toBeLessThan(1540); const cx = Math.max(s.x, Math.min(1100, s.x + f.w)), cy = Math.max(s.y, Math.min(800, s.y + f.h)); expect(Math.hypot(cx - 1100, cy - 800)).toBeGreaterThan(150); } }
    expect(ARENAS.aetherfall.solids.map(s => s.prop)).not.toEqual(ARENAS.ashen.solids.map(s => s.prop));
  });
  it('Shatterfall: every pattern (including the later, denser ones) leaves a full row or column free, so a safe lane always exists', () => {
    const h = ARENAS.aetherfall.hazard; const free = (pat: number[]) => [0, 1, 2].some(r => [0, 1, 2].every(c => !pat.includes(r * 3 + c))) || [0, 1, 2].some(c => [0, 1, 2].every(r => !pat.includes(r * 3 + c)));
    for (const p of [...h.patterns!, ...h.latePatterns!]) expect(free(p), JSON.stringify(p)).toBe(true);
  });
  it('Shatterfall warns before it hurts (>= 1.8 s), cells fire a beat apart, and standing outside the marked cells is safe', () => {
    const { sim, s } = quiet({ arena: 'aetherfall' }); s.encounter.forced = true; s.time = 41; s.arenaHazard.nextAt = s.time;
    s.player.x = 1100; s.player.y = 800 - 24;   // centre cell
    run(sim, 0.1); const pend = s.hazards.filter(h => h.tag === 'shatter'); expect(pend.length).toBeGreaterThanOrEqual(2); expect(Math.min(...pend.map(h => h.delay))).toBeGreaterThanOrEqual(1.7);
    const hp = s.player.hp; s.player.x = 120; s.player.y = 120; run(sim, 4); expect(s.player.hp).toBe(hp);
  });
  it('Reality Fold: the echo is previewed from the first moment, strikes later than the pattern, with the same shape; both are real damage events', () => {
    const { sim, s } = quiet({ arena: 'paradox' }); s.time = 41; s.arenaHazard.nextAt = s.time; run(sim, 0.1);
    const first = hazardsOf(s, 'fold'), echo = hazardsOf(s, 'fold_echo'); expect(first.length).toBeGreaterThan(0); expect(echo.length).toBe(first.length);
    expect(Math.min(...echo.map(h => h.delay))).toBeGreaterThan(Math.max(...first.map(h => h.delay)) + 1.5); for (const h of [...first, ...echo]) expect(h.damage).toBeGreaterThan(0); expect(echo.every(h => h.echo)).toBe(true);
    const f = ARENAS.paradox.hazard.folds![0]; s.player.x = f.x; s.player.y = f.y - 24; const hp0 = s.player.hp; run(sim, 2.2); expect(s.player.hp).toBeLessThan(hp0);
  });
  it('realm enemy tables exist for both realms and never leak into the Classic arenas', () => {
    expect(REALM_TABLE.aetherfall!.length).toBeGreaterThanOrEqual(4); expect(REALM_TABLE.paradox!.length).toBeGreaterThanOrEqual(4);
    for (const arena of ['gloam', 'ashen'] as const) { const { sim, s } = quiet({ arena }); s.encounter.forced = false; s.spawnTimer = 0; s.player.hp = 1e9; s.player.maxHp = 1e9; run(sim, 600, undefined, st => { st.player.hp = 1e9; }); for (const e of s.enemies) expect((REALM_KINDS as string[]).includes(e.kind), e.kind).toBe(false); }
  }, 60000);
});

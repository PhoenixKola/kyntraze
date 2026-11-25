import { describe, expect, it } from 'vitest';
import { CHRONICLES, CHRONICLE_BY_ID, CHRONICLE_IDS, allArcsDone, chronicleDone, chronicleLock, chronicleOfPlan, nextChronicle, sceneUnlocked } from '../b31/chronicles';
import { vexChapterPlan } from '../b22/plan';
import { ARENA_IDS } from '../content/arenas';
import { BOSS_KINDS, ENEMIES } from '../content/enemies';
import { applyB22Result, blankB22, migrateB22, type B22RunResult, type B22Save } from '../b22/save';
import { nexusLine } from '../b31/nexusChatter';
import { damageEnemy } from '../sim/CombatSystem';
import { quiet, run, DT, idle } from './b22util';

const prog = (b: B22Save) => ({ chronicles: b.chronicles, story: { done: b.story.done as number[] } });
const res = (o: Partial<B22RunResult> & { chronicleId: string; runId: string }): B22RunResult => ({ mode: 'campaign', hero: 'kai', arena: 'gloam', party: 1, won: true, seconds: 120, kills: 10, level: 3, score: 100, cycle: 0, counters: {}, relics: [], branches: [], legends: [], bosses: [], ...o });
const win = (b: B22Save, id: string, hero: B22RunResult['hero'] = 'kai', runId = `r-${id}-${b.ledger.length}`) => applyB22Result(b, res({ chronicleId: id, hero, runId })).save;

describe('B31A chapter definitions', () => {
  it('has all 13 chapters: 9 new missions, Vex\'s 3 originals and one finale', () => {
    expect(CHRONICLES.length).toBe(13); expect(new Set(CHRONICLE_IDS).size).toBe(13);
    expect(CHRONICLES.filter(c => c.plan.mode === 'campaign').length).toBe(10); expect(CHRONICLES.filter(c => c.plan.mode === 'vex_trial').length).toBe(3);
    for (const c of CHRONICLES) {
      expect(ARENA_IDS).toContain(c.arena); expect(c.plan.steps.filter(s => s.ends).length).toBe(1); expect(c.intro.lines.length).toBeGreaterThanOrEqual(3); expect(c.outro.lines.length).toBeGreaterThanOrEqual(2);
      expect(c.plan.ranked).toBe(false); expect(new Set(c.plan.steps.map(s => s.id)).size).toBe(c.plan.steps.length);
      for (const s of c.plan.steps) { if (s.boss) expect(BOSS_KINDS as readonly string[]).toContain(s.boss); for (const w of s.wave ?? []) expect(ENEMIES).toHaveProperty(w.kind); if (s.kind === 'hold') expect(s.hold).toBeGreaterThan(0); }
      if (c.hero) expect(c.plan.heroLock).toBe(c.hero); expect(chronicleOfPlan(c.plan)).toBe(c.id);
    }
    expect(CHRONICLE_BY_ID.finale.plan.heroLock).toBeNull();
  });
  it('keeps Vex\'s original plans, ids and rewards untouched', () => {
    for (const n of [1, 2, 3] as const) { expect(CHRONICLE_BY_ID[`vex_${n}` as 'vex_1'].plan).toEqual(vexChapterPlan(n)); expect(CHRONICLE_BY_ID[`vex_${n}` as 'vex_1'].plan.id).toBe(`vex_trial_${n}`); expect(CHRONICLE_BY_ID[`vex_${n}` as 'vex_1'].marks).toBe(0); }
  });
});

describe('B31A progression and persistence', () => {
  it('fresh save: first chapter of each arc is open, the rest and the finale are sealed with a reason', () => {
    const p = prog(blankB22());
    for (const id of ['kai_1', 'ren_1', 'sora_1', 'vex_1'] as const) expect(chronicleLock(p, id)).toBeNull();
    for (const id of ['kai_2', 'kai_3', 'ren_2', 'sora_3', 'vex_2', 'finale'] as const) expect(chronicleLock(p, id)).toMatch(/\S/);
    expect(chronicleLock(p, 'kai_2')).toContain(CHRONICLE_BY_ID.kai_1.name);
  });
  it('legacy Trial completions count without any migration; finale opens only when all twelve are done', () => {
    let b = blankB22(); b.story.done = [1, 2, 3]; expect(chronicleDone(prog(b), 'vex_3')).toBe(true); expect(chronicleLock(prog(b), 'vex_2')).toBeNull();
    for (const id of ['kai_1', 'kai_2', 'kai_3', 'ren_1', 'ren_2', 'ren_3', 'sora_1', 'sora_2'] as const) b = win(b, id);
    expect(allArcsDone(prog(b))).toBe(false); expect(chronicleLock(prog(b), 'finale')).toContain('Sora');
    b = win(b, 'sora_3'); expect(allArcsDone(prog(b))).toBe(true); expect(chronicleLock(prog(b), 'finale')).toBeNull(); expect(nextChronicle(prog(b), 'sora_3')).toBe('finale'); expect(nextChronicle(prog(b), 'finale')).toBeNull();
  });
  it('migration is additive and idempotent: old saves get an empty block, junk is dropped', () => {
    const old = migrateB22({ v: 1, story: { done: [1], seen: true }, vexForms: [true, false] }); expect(old.chronicles).toEqual({ done: [], seen: [], visits: 0, last: null }); expect(old.story.done).toEqual([1]);
    const dirty = migrateB22({ chronicles: { done: ['kai_1', 'nope', 7], seen: ['kai_1.intro', 'x.intro', 'kai_1.zzz'], visits: -4, last: { id: 'bad', won: true } } });
    expect(dirty.chronicles).toEqual({ done: ['kai_1'], seen: ['kai_1.intro'], visits: 0, last: null }); expect(migrateB22(dirty)).toEqual(dirty);
  });
  it('completion and the one-time reward are granted once; losses, replays and duplicate results grant nothing', () => {
    const b0 = blankB22(), lost = applyB22Result(b0, res({ chronicleId: 'kai_1', runId: 'a', won: false }));
    expect(lost.save.chronicles.done).toEqual([]); expect(lost.save.chronicles.last).toEqual({ id: 'kai_1', won: false }); expect(lost.grant.chronicles).toEqual([]);
    const first = applyB22Result(lost.save, res({ chronicleId: 'kai_1', runId: 'b' })); expect(first.save.chronicles.done).toEqual(['kai_1']); expect(first.grant.chronicles).toEqual(['kai_1']);
    const dup = applyB22Result(first.save, res({ chronicleId: 'kai_1', runId: 'b' })); expect(dup.save).toBe(first.save); expect(dup.grant.chronicles).toEqual([]);
    const replay = applyB22Result(first.save, res({ chronicleId: 'kai_1', runId: 'c' })); expect(replay.save.chronicles.done).toEqual(['kai_1']); expect(replay.grant.chronicles).toEqual([]);
  });
  it('Vex\'s original chapter win still unlocks his forms and pays no chronicle marks; scenes stay sealed until played or finished', () => {
    const r = applyB22Result(blankB22(), res({ mode: 'vex_trial', hero: 'vex', chronicleId: 'vex_2', storyChapter: 2, runId: 'v' }));
    expect(r.save.vexForms[0]).toBe(true); expect(r.save.chronicles.done).toContain('vex_2'); expect(r.grant.chronicles).toEqual([]);
    const p = prog(blankB22()); expect(sceneUnlocked(p, 'kai_1', 'intro')).toBe(false);
    const seen = blankB22(); seen.chronicles.seen = ['kai_1.intro']; expect(sceneUnlocked(prog(seen), 'kai_1', 'intro')).toBe(true); expect(sceneUnlocked(prog(seen), 'kai_1', 'outro')).toBe(false); expect(chronicleDone(prog(seen), 'kai_1')).toBe(false);
  });
});

describe('B31A missions run on the real simulation', () => {
  it('a hold mission is lost to the clock only if the hero dies; surviving the hold timer wins', () => {
    const c = CHRONICLE_BY_ID.kai_1, { sim, s } = quiet({ plan: c.plan, hero: 'kai', arena: 'gloam' }); s.encounter.forced = false; s.spawnTimer = 1e9;
    run(sim, 100); expect(s.phase).toBe('running'); expect(s.encounter.doneAt.hold).toBeUndefined();
    run(sim, 120); expect(s.phase).toBe('victory'); expect(s.encounter.doneAt.hold).toBeDefined();
  });
  it('a wave mission needs every wave broken; the last one ends the run', () => {
    const c = CHRONICLE_BY_ID.ren_1, { sim, s } = quiet({ plan: c.plan, hero: 'ren', arena: 'ashen' }); s.encounter.forced = false; s.spawnTimer = 1e9;
    for (let t = 0; t < 4000 && s.phase === 'running'; t++) { sim.step(DT, idle); for (const ids of Object.values(s.encounter.waves ?? {})) for (const e of s.enemies) if (ids.includes(e.id)) e.hp = 0; }
    expect(Object.keys(s.encounter.doneAt).sort()).toEqual(['gate1', 'gate2', 'gate3']); expect(s.phase).toBe('victory');
  });
  it('dying fails the mission (no victory)', () => {
    const c = CHRONICLE_BY_ID.kai_1, { sim, s } = quiet({ plan: c.plan, hero: 'kai' }); s.encounter.forced = false; s.player.hp = 0; run(sim, 3); expect(s.phase).not.toBe('victory');
  });
});

describe('B31A every chapter launches on the real simulation', () => {
  it('all 13 plans start, run, and put their first step on the field at the right time', () => {
    for (const c of CHRONICLES) {
      const { sim, s } = quiet({ plan: c.plan, hero: c.hero ?? 'kai', arena: c.arena, hp: 1e6 }); s.encounter.forced = false; s.spawnTimer = 1e9;
      const first = c.plan.steps[0], at = first.kind === 'hold' ? first.at : first.at; run(sim, at + 1);
      expect(s.phase, c.id).toBe('running'); expect(s.encounter.spawned[first.id], c.id).toBe(true);
      if (first.kind === 'boss') expect(s.enemies.some(e => e.kind === first.boss), c.id).toBe(true);
      if (first.kind === 'elite_wave') expect((s.encounter.waves?.[first.id] ?? []).length, c.id).toBeGreaterThan(0);
    }
  });
  it('a boss duel ends the mission when the boss falls (Castellan, reduced health)', () => {
    const c = CHRONICLE_BY_ID.kai_3, { sim, s } = quiet({ plan: c.plan, hero: 'kai', arena: 'aetherfall' }); s.encounter.forced = false; run(sim, 8);
    const boss = s.enemies.find(e => e.kind === 'castellan')!; expect(boss).toBeTruthy(); expect(boss.maxHp).toBeGreaterThan(0);
    for (let i = 0; i < 6000 && s.phase === 'running'; i++) { for (const e of s.enemies) if (e.kind === 'castellan' && e.hp > 0) damageEnemy(s, e, 1e9); sim.step(DT, idle); }
    expect(s.phase).toBe('victory');
  });
});

describe('B31A Nexus chatter', () => {
  it('reacts to a loss, to progress and never repeats on consecutive visits', () => {
    const b = blankB22(); const lines0 = new Set(Array.from({ length: 6 }, (_, v) => nexusLine(prog(b), 'kai', { done: 1, total: 3 }, v).text)); expect(lines0.size).toBeGreaterThan(1);
    for (let v = 0; v < 8; v++) expect(nexusLine(prog(b), 'ren', { done: 0, total: 1 }, v).text).not.toBe(nexusLine(prog(b), 'ren', { done: 0, total: 1 }, v + 1).text);
    const lost = applyB22Result(b, res({ chronicleId: 'kai_1', runId: 'x', won: false })).save; const pool = Array.from({ length: 12 }, (_, v) => nexusLine(prog(lost), 'kai', { done: 1, total: 3 }, v).text);
    expect(pool.some(t => /fast|stand|dragon|Falling/i.test(t))).toBe(true);
    const arc = win(win(b, 'kai_1'), 'kai_2'); expect(Array.from({ length: 6 }, (_, v) => nexusLine(prog(arc), 'kai', { done: 1, total: 3 }, v).text).join()).not.toBe(Array.from({ length: 6 }, (_, v) => nexusLine(prog(b), 'kai', { done: 1, total: 3 }, v).text).join());
  });
});

import { describe, expect, it } from 'vitest';
import { applyB22Result, blankB22, equipOutfit, migrateB22, outfitUnlocked, recordKey, safeServerUrl, type B22RunResult } from '../b22/save';
import { migrateSave } from '../sim/SaveSystem';
import { OUTFITS } from '../b22/cosmetics';
import { MILESTONES } from '../b22/mastery';

const res = (o: Partial<B22RunResult> = {}): B22RunResult => ({ runId: 'r1', mode: 'classic', hero: 'kai', arena: 'gloam', party: 1, won: true, seconds: 900, kills: 500, level: 20, score: 9000, cycle: 0, counters: {}, relics: [], branches: [], legends: [], bosses: [], ...o });
describe('B22 additive save', () => {
  it('a legacy (B18-B21) save migrates with a clean b22 block and loses nothing; migrating again changes nothing', () => {
    const legacy = { version: 1, settings: { mute: true, master: 0.4 }, hero: 'ren', arena: 'ashen', unlocks: { cometheart: true, stillfire: true, ren: true }, best: { score: 1234, survivalSeconds: 900, kills: 400, level: 18, seed: 7, victory: true, hero: 'kai' }, meta: { v: 1, marks: 77, lifetime: 120, owned: ['boon_bulwark'], boon: 'bulwark', contract: null, crest: null, feats: { first_win: 3 }, mastery: {}, counters: { runs: 5, wins: 2, deaths: 3, kills: 900, wardenKills: 4, seraphKills: 2 }, arenas: {}, granted: ['x'], introSeen: true, legacyGift: 0, heroes: {} } };
    const a = migrateSave(legacy), b = migrateSave(JSON.parse(JSON.stringify(a)));
    expect(a.meta.marks).toBe(77); expect(a.unlocks?.stillfire).toBe(true); expect(a.hero).toBe('ren'); expect(a.b22).toEqual(blankB22()); expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(a.meta.arenas.aetherfall.runs).toBe(0); expect(a.meta.heroes.vex.runs).toBe(0);
  });
  it('corrupt / hostile b22 data degrades per field and never trusts a server URL', () => {
    const m = migrateB22({ vexForms: 'yes', story: { done: [1, 7, 'x'] }, mastery: { 'flarebound.initiate': true, bogus: true }, owned: ['aura_detail_flarebound', 'nope', 5], records: { 'classic|kai|gloam|1': { runs: -5, wins: 'a', bestScore: 1e99 }, 'evil|x|y|9': { runs: 1 } }, challenges: { 'D-20261118': { best: 5, done: true, status: 'verified' }, junk: { best: 1 } }, server: { url: 'javascript:alert(1)', name: '<b>x</b>' }, ledger: ['a', 5] });
    expect(m.vexForms).toEqual([false, false]); expect(m.story.done).toEqual([1]); expect(Object.keys(m.mastery)).toEqual(['flarebound.initiate']); expect(m.owned).toEqual(['aura_detail_flarebound']);
    expect(Object.keys(m.records)).toEqual(['classic|kai|gloam|1']); expect(m.records['classic|kai|gloam|1'].runs).toBe(0); expect(m.challenges['D-20261118'].status).toBe('local'); expect(Object.keys(m.challenges)).toEqual(['D-20261118']); expect(m.server.url).toBe(''); expect(m.ledger).toEqual(['a']);
    expect(safeServerUrl('wss://play.example.com/x')).toBe('wss://play.example.com'); expect(safeServerUrl('ws://127.0.0.1:2567')).toBe('ws://127.0.0.1:2567'); expect(safeServerUrl('ws://evil.com')).toBe(''); expect(safeServerUrl('https://x.com')).toBe('');
  });
  it('a run is granted exactly once per run id (retry / reload / reconnect cannot double-grant); practice runs grant nothing', () => {
    const c = Object.fromEntries(MILESTONES.filter(m => m.form === 'flarebound').map(m => [m.counter, m.goal])); const first = applyB22Result(blankB22(), res({ counters: c }));
    expect(first.grant.milestones).toEqual(['flarebound.initiate', 'flarebound.adept', 'flarebound.master']); expect(first.save.records[recordKey('classic', 'kai', 'gloam')].runs).toBe(1); expect(first.save.owned).toContain('crest_flarebound');
    const again = applyB22Result(first.save, res({ counters: c })); expect(again.save).toBe(first.save); expect(again.grant.milestones).toEqual([]);
    const next = applyB22Result(first.save, res({ runId: 'r2', counters: c })); expect(next.grant.milestones).toEqual([]); expect(next.save.records[recordKey('classic', 'kai', 'gloam')].runs).toBe(2);
    expect(applyB22Result(blankB22(), res({ practice: true, counters: c })).save.ledger).toEqual([]);
  });
  it('Vex forms: chapter 2 clears Riftbound, chapter 3 (Oathkeeper) clears Voidheart; losing or a different mode grants neither; records are mode / hero / arena / party scoped', () => {
    let s = blankB22(); s = applyB22Result(s, res({ runId: 'a', mode: 'vex_trial', hero: 'vex', storyChapter: 2, won: false })).save; expect(s.vexForms).toEqual([false, false]);
    s = applyB22Result(s, res({ runId: 'b', mode: 'vex_trial', hero: 'vex', storyChapter: 2 })).save; expect(s.vexForms).toEqual([true, false]); expect(s.story.done).toEqual([2]);
    s = applyB22Result(s, res({ runId: 'c', mode: 'boss_rush', hero: 'vex', bosses: ['oathkeeper'] })).save; expect(s.vexForms).toEqual([true, false]);
    s = applyB22Result(s, res({ runId: 'd', mode: 'vex_trial', hero: 'vex', storyChapter: 3 })).save; expect(s.vexForms).toEqual([true, true]); expect(s.owned).toContain('crest_vanguard');
    const k1 = recordKey('endless', 'kai', 'gloam', 1), k2 = recordKey('endless', 'kai', 'gloam', 2); s = applyB22Result(s, res({ runId: 'e', mode: 'endless', cycle: 4 })).save; s = applyB22Result(s, res({ runId: 'f', mode: 'endless', party: 2, cycle: 1 })).save; expect(s.records[k1].bestCycle).toBe(4); expect(s.records[k2].bestCycle).toBe(1);
  });
  it('outfits unlock only from real facts and equip only for their own hero', () => {
    const o = OUTFITS.find(x => x.id === 'kai_circuit_vanguard')!; const s = blankB22();
    expect(outfitUnlocked(o, { heroWins: { kai: 1 }, b22: s })).toBe(false); expect(outfitUnlocked(o, { heroWins: { kai: 2 }, b22: s })).toBe(true);
    expect(equipOutfit(s, 'kai', 'kai_circuit_vanguard', { heroWins: { kai: 0 } })).toBe(s); expect(equipOutfit(s, 'ren', 'kai_circuit_vanguard', { heroWins: { kai: 9 } })).toBe(s);
    expect(equipOutfit(s, 'kai', 'kai_circuit_vanguard', { heroWins: { kai: 2 } }).equipped.outfit.kai).toBe('kai_circuit_vanguard');
  });
});

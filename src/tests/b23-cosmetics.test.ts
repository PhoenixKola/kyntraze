import { describe, expect, it } from 'vitest';
import { applyB22Result, blankB22, equipAura, equipB22Crest, migrateB22, type B22RunResult } from '../b22/save';
import { AURA_DETAIL, CONTOUR, CONTOUR_FORM, edgePalette, setEdgeDetails } from '../game/render/edgePalette';
import { FORM_KEYS, MILESTONES } from '../b22/mastery';

const run = (over: Partial<B22RunResult>): B22RunResult => ({ runId: 'r1', mode: 'classic', hero: 'kai', arena: 'gloam', party: 1, won: true, seconds: 600, kills: 100, level: 10, score: 1000, cycle: 0, counters: {}, relics: [], branches: [], legends: [], bosses: [], ...over } as B22RunResult);

describe('B23 mastery rewards are equippable and survive reload', () => {
  it('an edge detail can only be equipped once earned, per form, and is restored by migration', () => {
    let s = blankB22(); expect(equipAura(s, 'flarebound', true)).toBe(s);
    s = applyB22Result(s, run({ counters: { 'hit.flarebound': 25 } })).save; expect(s.owned).toContain('aura_detail_flarebound');
    s = equipAura(s, 'flarebound', true); expect(s.equipped.aura.flarebound).toBe('aura_detail_flarebound'); expect(s.equipped.aura.cometheart).toBeUndefined();
    const again = migrateB22(JSON.parse(JSON.stringify(s))); expect(again.equipped.aura.flarebound).toBe('aura_detail_flarebound');
    const forged = JSON.parse(JSON.stringify(s)); forged.equipped.aura.cometheart = 'aura_detail_cometheart'; forged.equipped.aura.stillfire = 'not_a_reward'; const m = migrateB22(forged);
    expect(m.equipped.aura.cometheart).toBeUndefined(); expect(m.equipped.aura.stillfire).toBeUndefined();
    expect(equipAura(s, 'flarebound', false).equipped.aura.flarebound).toBeUndefined();
  });
  it('a crest equips only if owned and is a crest; migration drops a forged crest', () => {
    let s = blankB22(); expect(equipB22Crest(s, 'crest_endless')).toBe(s);
    s = applyB22Result(s, run({ mode: 'endless', cycle: 3, won: false })).save; expect(s.owned).toContain('crest_endless');
    s = equipB22Crest(s, 'crest_endless'); expect(s.equipped.crest).toBe('crest_endless'); expect(migrateB22(JSON.parse(JSON.stringify(s))).equipped.crest).toBe('crest_endless');
    expect(equipB22Crest(s, 'aura_detail_flarebound').equipped.crest).toBe('crest_endless');
    const forged = JSON.parse(JSON.stringify(s)); forged.owned.push('aura_detail_flarebound'); forged.equipped.crest = 'aura_detail_flarebound'; expect(migrateB22(forged).equipped.crest).toBeNull();
  });
  it('every form has an edge detail reward and a distinct palette in the same colour family', () => {
    expect(MILESTONES.filter(m => m.reward.kind === 'aura_detail').map(m => m.form).sort()).toEqual([...FORM_KEYS].sort());
    for (const [key, form] of Object.entries(CONTOUR_FORM)) {
      const d = AURA_DETAIL[key], c = CONTOUR[key]; expect(d).toBeDefined(); expect(JSON.stringify(d)).not.toBe(JSON.stringify(c));
      const dom = (p: number[]) => p.indexOf(Math.max(...p)); expect(dom(d.c2)).toBe(dom(c.c2));   // same dominant channel: the canonical colour family is kept
      setEdgeDetails({ [form]: `aura_detail_${form}` }); expect(edgePalette(key)).toBe(d); setEdgeDetails({ [form]: 'aura_detail_other' }); expect(edgePalette(key)).toBe(c);
    }
    setEdgeDetails({});
  });
});

import { finisherFor, setFinisherRewards } from '../game/render/edgePalette';
import { SIGNATURES } from '../game/render/advancedFx';
describe('B23 adept finishers', () => {
  it('only an owned finisher of the current form plays; each form has its own signature', () => {
    setFinisherRewards([]); for (const k of Object.keys(CONTOUR_FORM)) expect(finisherFor(k)).toBeNull();
    setFinisherRewards(['finisher_flarebound', 'aura_detail_cometheart']); expect(finisherFor('flare')).toBe('finisher_flare'); expect(finisherFor('comet')).toBeNull();
    for (const k of Object.keys(CONTOUR_FORM)) expect(SIGNATURES[`finisher_${k}`], k).toBeDefined();
    expect(new Set(Object.keys(CONTOUR_FORM).map(k => SIGNATURES[`finisher_${k}`].shape)).size).toBe(7); setFinisherRewards([]);
  });
});

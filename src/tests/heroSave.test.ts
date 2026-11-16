import { describe, expect, it } from 'vitest';
import { migrateSave } from '../sim/SaveSystem';
import { blankMeta, finalizeRun, type RunResult } from '../sim/MetaSystem';
import { GameBridge } from '../bridge/GameBridge';
import { Simulation } from '../sim/Simulation';
import { damageEnemy } from '../sim/CombatSystem';
import type { Enemy } from '../sim/GameState';

const result = (o: Partial<RunResult> = {}): RunResult => ({ runId: 'r1', arena: 'gloam', won: false, seconds: 200, kills: 80, level: 6, score: 500, wardenKills: 0, seraphKills: 0, formsUsed: [], maxCategoryStacks: 1, contract: null, ...o });
describe('B19 save and meta', () => {
  it('older saves load as Kai with no Ren / Sora unlocks; new keys survive a round trip; junk is ignored', () => {
    const fresh = migrateSave(null); expect(fresh.hero).toBe('kai'); expect(fresh.unlocks).toEqual({ cometheart: false, stillfire: false });
    const s = migrateSave({ hero: 'sora', unlocks: { cometheart: true, ren: true, sora: 'yes' } }); expect(s.hero).toBe('sora'); expect(s.unlocks?.ren).toBe(true); expect(s.unlocks?.sora).toBeUndefined(); expect(s.unlocks?.cometheart).toBe(true);
    expect(migrateSave({ hero: 'zed' }).hero).toBe('kai'); expect(migrateSave(JSON.parse(JSON.stringify(s))).unlocks).toEqual(s.unlocks);
  });
  it('a Ren / Sora victory never unlocks Kai\'s Form III on reload; a Kai victory (or an old save) still does', () => {
    const best = { score: 1, survivalSeconds: 900, kills: 1, level: 1, seed: 1, victory: true };
    expect(migrateSave({ best: { ...best, hero: 'ren' } }).unlocks?.stillfire).toBe(false); expect(migrateSave({ best: { ...best, hero: 'kai' } }).unlocks?.stillfire).toBe(true); expect(migrateSave({ best }).unlocks?.stillfire).toBe(true);
  });
  it('per-runner records, the ascend feats and the exactly-once reward', () => {
    const a = finalizeRun(blankMeta(), result({ hero: 'ren', formsUsed: [10], wardenKills: 1 })); expect(a.meta.heroes.ren.runs).toBe(1); expect(a.meta.heroes.ren.wardenKills).toBe(1); expect(a.meta.heroes.kai.runs).toBe(0);
    expect(a.meta.feats.ren_ascend).toBeDefined(); expect(a.meta.feats.flare).toBeUndefined(); expect(a.meta.feats.sora_ascend).toBeUndefined();
    const again = finalizeRun(a.meta, result({ hero: 'ren', formsUsed: [10] })); expect(again.reward).toBeNull(); expect(again.meta).toBe(a.meta);
    const b = finalizeRun(a.meta, result({ runId: 'r2', hero: 'sora', formsUsed: [11] })); expect(b.meta.feats.sora_ascend).toBeDefined(); expect(b.meta.heroes.sora.runs).toBe(1); expect(b.meta.marks).toBeGreaterThan(a.meta.marks);
  });
  it('the bridge deploys the saved runner, passes its unlock, and persists the Warden unlock once', () => {
    const save = migrateSave({ hero: 'ren' }); const bridge = new GameBridge(save); expect(bridge.getRunConfig().hero).toBe('ren'); expect(bridge.getRunConfig().heroForm).toBe(false);
    const sim = new Simulation(3, 'gloam', false, false, bridge.getRunConfig()); bridge.bind(sim); const s = sim.state; expect(s.hero).toBe('ren'); expect(s.heroFormUnlocked).toBe(false);
    const w: Enemy = { id: 9, x: 1200, y: 800, kind: 'warden', hp: 5, maxHp: 5, radius: 30, speed: 0, damage: 0, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 9, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0, ai: { phase: 2, pat: 0, atk: '', step: 0, t: 0, acc: 0, exposed: false, invuln: false, side: 1, destX: 0, destY: 0, gap: 0, push: 0 } }; s.enemies.push(w); damageEnemy(s, w, 99);
    bridge.publish(true); expect(save.unlocks?.ren).toBe(true); expect(save.unlocks?.cometheart).toBe(false); expect(save.unlocks?.sora).toBeUndefined();
    const next = new GameBridge(save); expect(next.getRunConfig().heroForm).toBe(true); expect(new Simulation(3, 'gloam', false, false, next.getRunConfig()).state.heroFormUnlocked).toBe(true);
  });
});

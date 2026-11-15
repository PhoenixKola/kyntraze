import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { Simulation } from '../sim/Simulation';
import { makeState } from '../sim/GameState';
import { damageEnemy, damagePlayer } from '../sim/CombatSystem';
import { spawnBoss } from '../sim/BossAiSystem';
import { liveThreat } from '../sim/EnemyDirector';
import { applyUpgrade } from '../sim/UpgradeSystem';
import { BOSS_SCHEDULE, BREATHER, FINALE_WARN_AT, THREAT_CURVE, budgetScale, threatBudget } from '../content/encounters';
import { UPGRADES } from '../content/upgrades';
import { gradeRun } from '../sim/GameTelemetry';
import { GameBridge } from '../bridge/GameBridge';

const quiet = (seed = 5, arena: 'gloam' | 'ashen' = 'gloam') => { const sim = new Simulation(seed, arena); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.attackClock = 1e9; return { sim, s }; };
const input = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false };
const run = (sim: Simulation, sec: number) => { for (let i = 0; i < sec * 60; i++) sim.step(1 / 60, input); };
const kill = (s: ReturnType<typeof makeState>, id: string) => { const b = s.enemies.find(e => e.kind === id)!; b.ai && (b.ai.invuln = false); damageEnemy(s, b, 1e9); };

describe('run plan', () => {
  it('puts the Warden mid-run and the Seraph as a late finale with a warning before it', () => {
    expect(BOSS_SCHEDULE.map(b => b.id)).toEqual(['warden', 'seraph']);
    expect(BOSS_SCHEDULE[0].at).toBeGreaterThanOrEqual(420); expect(BOSS_SCHEDULE[0].at).toBeLessThanOrEqual(600);
    expect(BOSS_SCHEDULE[1].at).toBeGreaterThanOrEqual(840); expect(BOSS_SCHEDULE[1].at).toBeLessThanOrEqual(1020);
    expect(FINALE_WARN_AT).toBeLessThan(BOSS_SCHEDULE[1].at);
  });
  it('threat budget rises monotonically, breathers and the finale quiet cut it, boss recovery too', () => {
    for (let i = 1; i < THREAT_CURVE.length; i++) expect(THREAT_CURVE[i][1]).toBeGreaterThanOrEqual(THREAT_CURVE[i - 1][1]);
    expect(threatBudget(0)).toBeLessThan(5); expect(threatBudget(900)).toBeGreaterThan(50);
    expect(budgetScale(60, -1)).toBe(1); expect(budgetScale(BREATHER.start + 2, -1)).toBe(BREATHER.scale); expect(budgetScale(BREATHER.start + BREATHER.length + 5, -1)).toBe(1);
    expect(budgetScale(FINALE_WARN_AT + 5, -1)).toBeLessThan(0.5); expect(budgetScale(500, 490)).toBeLessThan(0.5);
  });
  it('the director holds live threat near the budget instead of flooding the arena', () => {
    const sim = new Simulation(11, 'gloam'), s = sim.state; s.player.hp = s.player.maxHp = 1e7; s.player.attackClock = 1e9;
    let peak = 0; for (let t = 0; t < 300; t += 1 / 60) { sim.step(1 / 60, input); s.player.hp = 1e7; peak = Math.max(peak, liveThreat(s)); }
    expect(peak).toBeLessThan(threatBudget(300) + 8); expect(s.enemies.length).toBeLessThan(80);
  }, 60000);
  it('announces the finale once, 30 s before the Seraph, and spawns the Seraph on schedule', () => {
    const { sim, s } = quiet(); s.encounter.forced = false; s.spawnTimer = 0; s.time = FINALE_WARN_AT - 0.1; s.encounter.spawned.warden = true; run(sim, 1);
    expect(s.announce?.id).toBe('finale'); const at = s.announce!.at; s.time = BOSS_SCHEDULE[1].at - 0.05; run(sim, 0.5);
    expect(s.enemies.some(e => e.kind === 'seraph')).toBe(true); expect(s.announce!.at).toBe(at);
  });
});

describe('victory lifecycle', () => {
  it('defeating the Seraph wins the run: no hostile entities remain and nothing can hurt Kai', () => {
    const { sim, s } = quiet(); spawnBoss(s, 'seraph'); s.enemies[0].mode = 'move'; s.enemies[0].ai!.invuln = false;
    s.hazards.push({ id: 900, shape: 'circle', x: s.player.x, y: s.player.y, r: 99, ang: 0, arc: 0, delay: 0.01, total: 0.01, damage: 50, owner: 0, tag: 'x', fired: false, ttl: 0 });
    s.enemyShots.push({ id: 901, x: s.player.x, y: s.player.y, vx: 0, vy: 0, ttl: 5, damage: 50, radius: 8 });
    kill(s, 'seraph'); expect(s.phase).toBe('victory'); expect(s.hazards).toHaveLength(0); expect(s.enemyShots).toHaveLength(0); expect(s.victoryAt).toBeGreaterThanOrEqual(0);
    const hp = s.player.hp; expect(damagePlayer(s, 50)).toBe(false); run(sim, 5); expect(s.player.hp).toBe(hp); expect(s.phase).toBe('victory');
  });
  it('is awarded once, only while running, and never over a defeat', () => {
    const { s } = quiet(); spawnBoss(s, 'seraph'); const boss = s.enemies[0]; kill(s, 'seraph'); const at = s.victoryAt; s.time += 5; boss.hp = 5; damageEnemy(s, boss, 1e9); expect(s.victoryAt).toBe(at); expect(s.bossesDefeated).toBe(2);
    const d = quiet(); d.s.phase = 'dead'; spawnBoss(d.s, 'seraph'); kill(d.s, 'seraph'); expect(d.s.phase).toBe('dead');
  });
  it('the Seraph dying during the level-up screen cannot happen: abilities do not step while the upgrade UI is up', () => {
    const { sim, s } = quiet(); s.phase = 'upgrade'; const t = s.time; sim.step(1 / 60, input); expect(s.time).toBe(t);
  });
  it('victory outranks and outscores a defeat; telemetry carries victory + bosses', () => {
    const win = gradeRun({ seed: 1, survivalSeconds: 990, kills: 900, level: 24, victory: true, bosses: 2 }), lose = gradeRun({ seed: 1, survivalSeconds: 990, kills: 900, level: 24, victory: false, bosses: 1 });
    expect(win.score).toBeGreaterThan(lose.score + 2000);
  });
  it('the bridge reports victory, hides Results until the beat has played, and ignores a premature mark', () => {
    const { sim, s } = quiet(); const b = new GameBridge({ settings: {}, best: null } as never); b.bind(sim); b.markVictoryShown(); expect(b.snapshot().victoryShown).toBe(false);
    spawnBoss(s, 'seraph'); kill(s, 'seraph'); b.publish(true); expect(b.snapshot()).toMatchObject({ phase: 'victory', victoryShown: false, bosses: 1 });
    b.markVictoryShown(); expect(b.snapshot().victoryShown).toBe(true);
  });
});

describe('Warden payoff', () => {
  it('heals, then offers one guaranteed Rare-or-better pick once the death beat is over, and never twice', () => {
    const { sim, s } = quiet(7); s.player.level = 9; s.player.hp = 20; spawnBoss(s, 'warden'); s.enemies[0].mode = 'move'; s.enemies[0].ai!.invuln = false;
    kill(s, 'warden'); expect(s.player.hp).toBeGreaterThan(55); expect(s.bossReward).toBe(1); expect(s.phase).toBe('running');
    s.player.xp = 0; s.pickups.length = 0; run(sim, 3.5); expect(s.phase).toBe('upgrade'); expect(s.rewardPick).toBe(true);
    expect(s.upgradeOffers.some(id => UPGRADES.find(u => u.id === id)!.rarity !== 'common')).toBe(true);
    expect(applyUpgrade(s, s.upgradeOffers[0])).toBe(true); expect(s.rewardPick).toBe(false); run(sim, 3); expect(s.phase).toBe('running'); expect(s.bossReward).toBe(0);
  });
});

describe('both arenas support the full run', () => {
  for (const arena of ['gloam', 'ashen'] as const) it(`${arena}: an unkillable orbiting bot reaches and wins the finale (simulated, not human play)`, () => {
    const sim = new Simulation(21, arena), s = sim.state; let a = 0; const log: number[] = [];
    for (let i = 0; i < 60 * 60 * 24 && s.phase !== 'victory'; i++) {
      a += 0.012; const near = s.enemies.find(e => e.kind === 'seraph' && e.hp > 0);
      sim.step(1 / 60, near && Math.hypot(near.x - s.player.x, near.y - s.player.y) > 150 ? { ...input, x: (near.x - s.player.x) / 100, y: (near.y - s.player.y) / 100, beam: i % 420 === 3, sphere: i % 900 === 5 } : { ...input, x: Math.cos(a), y: Math.sin(a), q: i % 510 === 0, beam: i % 420 === 3, sphere: i % 960 === 5, f: s.player.drive >= 70 });
      s.player.hp = s.player.maxHp = 1e7; if (s.phase === 'upgrade') { if (s.rewardPick) log.push(s.time); sim.chooseUpgrade(s.upgradeOffers[0]); }
    }
    expect(s.phase).toBe('victory'); expect(s.time).toBeGreaterThan(BOSS_SCHEDULE[1].at); expect(s.time).toBeLessThan(1500); expect(s.bossesDefeated).toBe(2); expect(log.length).toBe(1);
    expect(s.player.level).toBeGreaterThanOrEqual(18); expect(s.player.level).toBeLessThanOrEqual(45);
    console.log(`SIM ${arena}: victory at ${(s.time / 60).toFixed(1)} min, level ${s.player.level}, kills ${s.kills}, upgrades ${Object.values(s.upgradeStacks).reduce((x, y) => x + y, 0)}`);
  }, 240000);
});

describe('B10.1 icons', () => {
  it('every upgrade ships a full-colour 96x96 icon with real alpha and visible colour (not a flat grey glyph)', () => {
    for (const u of UPGRADES) {
      const f = `public/ui/upgrades/${u.id}.png`; expect(fs.existsSync(f), u.id).toBe(true); const b = fs.readFileSync(f);
      expect(b.readUInt32BE(16), u.id).toBe(96); expect(b.readUInt32BE(20), u.id).toBe(96); expect(b[25], `${u.id} colour type RGBA`).toBe(6);
    }
  });
  it('victory art shipped', () => { expect(fs.existsSync('public/ui/victory-key.webp')).toBe(true); expect(fs.existsSync('public/ui/victory-crest.png')).toBe(true); });
});

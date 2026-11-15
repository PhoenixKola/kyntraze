import { ENEMIES, type MobKind } from '../content/enemies';
import { RULES } from '../core/Rules';
import type { GameState } from './GameState';
import type { SeededRng } from '../core/SeededRng';
import { addEnemy } from './EntityRegistry';
import { blocked } from './CollisionSystem';
import { BOSS_MOB_CAP, BOSS_SCHEDULE, BOSS_THREAT_CAP, FINALE_WARN_AT, THREAT_COST, budgetScale, threatBudget } from '../content/encounters';
import { bossAlive, spawnBoss } from './BossAiSystem';
export const liveThreat = (state: GameState) => { let t = 0; for (const e of state.enemies) if (e.hp > 0 && e.kind in THREAT_COST) t += THREAT_COST[e.kind as MobKind]; return t; };
export function updateDirector(state: GameState, rng: SeededRng, dt: number) {
  // Bosses come on the run plan's clock, one at a time; the QA-forced encounter run never auto-spawns them again.
  const boss = bossAlive(state);
  if (!state.encounter.forced && !boss) for (const b of BOSS_SCHEDULE) if (!state.encounter.spawned[b.id] && state.time >= b.at) { spawnBoss(state, b.id); break; }
  if (!state.encounter.forced && (!state.announce || state.announce.id === 'cometheart') && state.time >= FINALE_WARN_AT && !state.encounter.spawned.seraph) state.announce = { id: 'finale', text: 'THE NULL SERAPH APPROACHES', sub: 'Hold your ground. End it.', at: state.time };
  if (state.enemies.length >= (boss ? BOSS_MOB_CAP : RULES.maxEnemies)) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  const t = state.time;
  state.spawnTimer = (1.1 - 0.7 * Math.min(1, t / 300)) * rng.between(0.8, 1.2);
  let budget = threatBudget(t) * budgetScale(t, state.lastBossDefeatAt); if (boss) budget = Math.min(budget * 0.5, BOSS_THREAT_CAP);
  let threat = liveThreat(state);
  const batch = 1 + (t > 240 ? 1 : 0) + (t > 600 ? 1 : 0);
  for (let i = 0; i < batch && threat < budget && state.enemies.length < RULES.maxEnemies; i++) { const k = spawnEnemy(state, rng); if (!k) break; threat += THREAT_COST[k]; }
}
/** Heavy and ranged threats appear at their own intro times (never together), under a live cap; pursuer and flanker keep the original roll order. */
function pickKind(state: GameState, rng: SeededRng): MobKind {
  const boss = bossAlive(state);
  for (const kind of ['bruiser', 'ranged', 'cantor', 'aegis'] as const) {
    const def = ENEMIES[kind]; if (def.elite && boss) continue;
    if (state.time < def.intro || rng.next() >= def.weight) continue;
    let live = 0; for (const e of state.enemies) if (e.kind === kind && e.hp > 0) live++;
    if (live < def.cap(state.time)) return kind;
  }
  return state.time > state.nextFlanker && rng.next() < 0.32 ? 'flanker' : 'pursuer';
}
export function spawnEnemy(state: GameState, rng: SeededRng): MobKind | null {
  const p = state.player;
  const kind = pickKind(state, rng);
  const def = ENEMIES[kind];
  const hp = def.hp + Math.floor(state.time / 60) * def.hpPerMinute;
  // Place outside the 960x540 camera view where possible, without clipping the world.
  for (let attempt = 0; attempt < 25; attempt++) {
    const theta = rng.between(0, Math.PI * 2), range = rng.between(570, 700);
    const x = p.x + Math.cos(theta) * range, y = p.y + Math.sin(theta) * range;
    if (blocked(x, y, def.radius) || x < 60 || y < 60 || x > RULES.worldWidth - 60 || y > RULES.worldHeight - 60) continue;
    addEnemy(state, { kind, x, y, hp, maxHp: hp, radius: def.radius,
      speed: def.moveSpeed + Math.min(32, state.time / 18) * Math.min(1, def.moveSpeed / 74), damage: def.damage, touchCooldown: 0, attackCd: def.attack.cooldown * 0.6, aimX: -Math.cos(theta), aimY: -Math.sin(theta) });
    return kind;
  }
  return null;   // no unsafe fallback spawn next to the player
}

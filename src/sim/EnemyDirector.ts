import { ENEMIES, type MobKind } from '../content/enemies';
import { RULES } from '../core/Rules';
import type { GameState } from './GameState';
import type { SeededRng } from '../core/SeededRng';
import { addEnemy } from './EntityRegistry';
import { blocked } from './CollisionSystem';
import { BOSS_MOB_CAP, BOSS_THREAT_CAP, THREAT_COST, budgetScale } from '../content/encounters';
import { bossAlive, spawnBoss } from './BossAiSystem';
import { ENDLESS_BOSS_ROTATION, ENDLESS_CYCLE, planBudget, type EncounterStep } from '../b22/plan';
import { REALM_BASE, REALM_TABLE, endlessKinds, type RealmSlot } from '../b22/realms';
import { MODIFIER_RULES } from '../b22/challenges';
import { spawnWave } from './B22Encounters';

export const liveThreat = (state: GameState) => { let t = 0; for (const e of state.enemies) if (e.hp > 0 && e.kind in THREAT_COST && !e.part) t += THREAT_COST[e.kind as MobKind]; return t; };
const bossSteps = (state: GameState) => state.plan.steps.filter(s => s.kind === 'boss');
const done = (state: GameState, id: string) => state.encounter.doneAt[id] !== undefined;
/** A step is due when its clock says so and (for chained steps) the previous step has finished. */
function due(state: GameState, step: EncounterStep): boolean {
  if (state.encounter.spawned[step.id]) return false;
  if (step.trigger === 'time') return state.time >= step.at;
  const i = state.plan.steps.indexOf(step), prev = state.plan.steps[i - 1];
  return !prev || (done(state, prev.id) && state.time >= state.encounter.doneAt[prev.id] + step.at);
}
export function updateDirector(state: GameState, rng: SeededRng, dt: number) {
  const plan = state.plan, boss = bossAlive(state), forced = state.encounter.forced;
  if (!forced) {
    if (!boss) for (const st of plan.steps) {
      if (!due(state, st)) continue;
      if (st.kind === 'boss') { spawnBoss(state, st.boss!, st); break; }
      state.encounter.spawned[st.id] = true; spawnWave(state, rng, st); break;
    }
    // pre-arrival warnings (Classic: the Null Seraph's 30 s finale warning); never replaces a live Cometheart unlock banner
    if (!state.announce || state.announce.id === 'cometheart') for (const st of plan.steps) {
      if (st.warnAt !== undefined && state.time >= st.warnAt && !state.encounter.spawned[st.id] && !state.b22.announced[st.id]) { state.b22.announced[st.id] = true; state.announce = { id: st.kind === 'boss' && plan.mode === 'classic' ? 'finale' : 'step', text: st.warnText ?? '', sub: st.warnSub ?? '', at: state.time }; break; }
    }
    if (plan.cycle > 0 && state.b22.endless) endlessBosses(state);
  }
  if (plan.mobs === 'none' || (plan.mobs === 'adds' && !boss)) return;
  const cap = boss ? BOSS_MOB_CAP : Math.round(RULES.maxEnemies * (state.b22.party ? 1.1 : 1));
  if (state.enemies.length >= cap) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  const t = state.time, e = state.b22.endless, cyc = e ? Math.floor((t - e.fromT) / ENDLESS_CYCLE) : 0;
  state.spawnTimer = (1.1 - 0.7 * Math.min(1, t / 300)) * rng.between(0.8, 1.2) * state.run.spawnMult;
  const rel = e ? t - e.fromT : t;
  let budget = (e ? Math.min(110, 66 * (1 + 0.1 * cyc)) * (rel % ENDLESS_CYCLE < 12 ? 0.55 : 1) : planBudget(plan, t)) * budgetScale(t, state.lastBossDefeatAt, e ? { breathers: false, quietFrom: null } : { breathers: plan.breathers, quietFrom: plan.finaleQuietFrom });
  if (boss) budget = Math.min(budget * 0.5, BOSS_THREAT_CAP);
  budget *= state.b22.party ? 1.55 : 1;
  let threat = liveThreat(state);
  const batch = 1 + (t > 240 ? 1 : 0) + (t > 600 ? 1 : 0);
  for (let i = 0; i < batch && threat < budget && state.enemies.length < cap; i++) { const k = spawnEnemy(state, rng); if (!k) break; threat += THREAT_COST[k]; }
}
/** Endless: a boss from the rotation arrives 120 s into every cycle, hp growing with the cycle; defeating it pays a heal + pick, never the run's victory. */
function endlessBosses(state: GameState) {
  const e = state.b22.endless!, cyc = Math.floor((state.time - e.fromT) / ENDLESS_CYCLE), at = e.fromT + cyc * ENDLESS_CYCLE + 120, id = `endless_${cyc}`;
  if (state.time < at || state.encounter.spawned[id] || bossAlive(state)) return;
  const kind = ENDLESS_BOSS_ROTATION[cyc % ENDLESS_BOSS_ROTATION.length];
  spawnBoss(state, kind, { id, kind: 'boss', boss: kind, trigger: 'time', at, reward: 'heal_pick', hpMul: Math.min(2.6, 0.8 + 0.3 * cyc), warnText: '', warnSub: '' });
}
interface Cand { kind: MobKind; weight: number; cap: number }
function realmCandidates(state: GameState): Cand[] {
  const out: Cand[] = [], t = state.time, e = state.b22.endless, cyc = e ? Math.floor((t - e.fromT) / ENDLESS_CYCLE) : -1;
  const rows: RealmSlot[] = e ? endlessKinds(cyc) : (REALM_TABLE[state.arenaId] ?? []);
  for (const r of rows) { const def = ENEMIES[r.kind]; if (t < Math.max(r.intro, 0) || def.elite && bossAlive(state)) continue; out.push({ kind: r.kind, weight: r.weight, cap: def.cap(e ? t - e.fromT + 240 : t) }); }
  const m = state.plan.modifiers;
  if (m.includes('prismatic_rain')) out.push({ kind: 'ranged', weight: 0.14 * (MODIFIER_RULES.rain.rangedWeight - 1), cap: 7 });
  if (m.includes('guardians_burden') && !bossAlive(state)) out.push({ kind: 'aegis', weight: 0.05 * MODIFIER_RULES.burden.aegisWeight, cap: 1 + 1 + MODIFIER_RULES.burden.aegisCapAdd });
  if (m.includes('mirror_march')) out.push({ kind: 'rift_mimic', weight: MODIFIER_RULES.mirror.mimicWeight, cap: 3 });
  return out;
}
/** Heavy and ranged threats appear at their own intro times (never together), under a live cap; pursuer and flanker keep the original roll order. */
function pickKind(state: GameState, rng: SeededRng): MobKind {
  const boss = bossAlive(state), plan = state.plan;
  const e = state.b22.endless, mixed = plan.pool === 'realm' || !!e || plan.modifiers.length > 0;
  if (mixed) {
    for (const c of realmCandidates(state)) {
      if (rng.next() >= c.weight) continue;
      let live = 0; for (const x of state.enemies) if (x.kind === c.kind && x.hp > 0) live++;
      if (live < c.cap) return c.kind;
    }
    if (plan.pool === 'realm') { if (state.time > 150 && rng.next() < 0.1) return 'ranged'; return state.time > state.nextFlanker && rng.next() < 0.3 ? 'flanker' : 'pursuer'; }
  }
  for (const kind of ['bruiser', 'ranged', 'cantor', 'aegis'] as const) {
    const def = ENEMIES[kind]; if (def.elite && boss) continue;
    const ofs = e ? e.fromT - 200 : 0;   // endless re-introduces the heavy kinds on a fresh schedule
    if (state.time - ofs < def.intro || rng.next() >= def.weight) continue;
    let live = 0; for (const x of state.enemies) if (x.kind === kind && x.hp > 0) live++;
    if (live < def.cap(state.time - ofs)) return kind;
  }
  return state.time > state.nextFlanker && rng.next() < 0.32 ? 'flanker' : 'pursuer';
}
void REALM_BASE;
export function spawnEnemy(state: GameState, rng: SeededRng): MobKind | null {
  const p = state.player;
  const kind = pickKind(state, rng);
  const def = ENEMIES[kind];
  const e = state.b22.endless, cyc = e ? Math.max(0, Math.floor((state.time - e.fromT) / ENDLESS_CYCLE)) : 0;
  const hp = (def.hp + Math.floor(state.time / 60) * def.hpPerMinute) * (1 + 0.12 * cyc) * state.run.enemyHpMult;
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
void bossSteps;

/** B22 non-boss encounter steps (elite waves, relic shrines), relic offers and the plan's completion bookkeeping. Pure sim: reads the plan, writes GameState. */
import type { GameState } from './GameState';
import type { SeededRng } from '../core/SeededRng';
import { ENEMIES, type MobKind } from '../content/enemies';
import { addEnemy } from './EntityRegistry';
import { blocked } from './CollisionSystem';
import { RULES } from '../core/Rules';
import type { EncounterStep } from '../b22/plan';
import { REALM_RELICS, RELIC_IDS, type RelicId } from '../b22/relics';
import { MODIFIER_RULES } from '../b22/challenges';
import { b22Emit } from '../b22/state';

/** The relics a run may be offered: the realm's own four first, then the other realm's (Endless / challenges mix both). */
export function relicPool(state: GameState): RelicId[] {
  const own = REALM_RELICS(state.arenaId), all = RELIC_IDS.filter(r => !state.b22.relics.includes(r));
  const fresh = own.filter(r => !state.b22.relics.includes(r));
  return fresh.length >= 2 ? fresh : all;
}
export function offerRelic(state: GameState, rng: SeededRng) {
  const pool = relicPool(state).slice(); if (!pool.length || state.phase !== 'running') return false;
  const offer: RelicId[] = [], want = Math.min(3, pool.length); while (offer.length < want) offer.push(pool.splice(rng.int(pool.length), 1)[0]);
  state.b22.relicOffer = offer; state.phase = 'upgrade'; state.upgradeOffers = []; return true;
}
export function grantRelic(state: GameState, id: RelicId): boolean {
  if (state.b22.relics.includes(id)) return false;
  state.b22.relics.push(id); b22Emit(state.b22, 'relic_gain', state.player.x, state.player.y, { tag: id }); return true;
}
/** Picks a relic from the open offer. */
export function chooseRelic(state: GameState, id: RelicId): boolean {
  const o = state.b22.relicOffer; if (state.phase !== 'upgrade' || !o || !o.includes(id)) return false;
  grantRelic(state, id); state.b22.relicOffer = null; state.phase = 'running'; return true;
}
export function spawnWave(state: GameState, rng: SeededRng, st: EncounterStep) {
  if (st.kind === 'relic') { if (state.plan.modifiers.includes('relic_gamble')) { state.encounter.doneAt[st.id] = state.time; return; } offerRelic(state, rng); state.encounter.doneAt[st.id] = state.time; return; }
  const ids: number[] = [], p = state.player;
  for (const w of st.wave ?? []) for (let i = 0; i < w.n; i++) {
    const def = ENEMIES[w.kind as MobKind]; if (!def) continue;
    for (let a = 0; a < 30; a++) {
      const th = rng.between(0, Math.PI * 2), r = rng.between(480, 620), x = p.x + Math.cos(th) * r, y = p.y + Math.sin(th) * r;
      if (blocked(x, y, def.radius) || x < 70 || y < 70 || x > RULES.worldWidth - 70 || y > RULES.worldHeight - 70) continue;
      const hp = def.hp + Math.floor(state.time / 60) * def.hpPerMinute;
      const e = addEnemy(state, { kind: w.kind as MobKind, x, y, hp, maxHp: hp, radius: def.radius, speed: def.moveSpeed, damage: def.damage, touchCooldown: 0, attackCd: def.attack.cooldown * 0.6, aimX: -Math.cos(th), aimY: -Math.sin(th), stepId: st.id });
      ids.push(e.id); break;
    }
  }
  (state.encounter.waves ??= {})[st.id] = ids;
}
/** Elite-wave completion: every tracked enemy dead -> the step is done and pays its reward (a relic offer in the Expedition). */
export function updateEncounters(state: GameState, rng: SeededRng) {
  const w = state.encounter.waves; if (!w) return;
  for (const st of state.plan.steps) {
    const ids = w[st.id]; if (st.kind !== 'elite_wave' || !ids || state.encounter.doneAt[st.id] !== undefined) continue;
    if (state.enemies.some(e => ids.includes(e.id) && e.hp > 0)) continue;
    state.encounter.doneAt[st.id] = state.time; state.announce = { id: 'step', text: 'WAVE BROKEN', sub: st.ends ? 'The trial is complete' : 'A relic answers', at: state.time };
    if (st.ends) state.b22.endStep = st.id;
    else if (st.reward === 'relic' && state.phase === 'running' && !state.plan.modifiers.includes('relic_gamble')) offerRelic(state, rng);
  }
}
/** Relic Gamble: a free random realm relic at the configured levels (no choice). */
export function gambleRelics(state: GameState, rng: SeededRng) {
  if (!state.plan.modifiers.includes('relic_gamble')) return;
  for (const lv of MODIFIER_RULES.gamble.levels) if (state.player.level >= lv && !state.b22.relicGrants.includes(lv)) { state.b22.relicGrants.push(lv); const pool = relicPool(state); if (pool.length) grantRelic(state, pool[rng.int(pool.length)]); }
}

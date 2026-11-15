import { ARENAS, PROP_FOOTPRINTS } from '../content/arenas';
import type { GameState } from './GameState';

const BOSS_QUIET = 2.5;
/** Arena hazard director: one telegraphed hazard at a time, never while a boss is in a committed attack, deterministic (cycle index, no RNG). Data lives in content/arenas.ts. */
export function updateArenaHazards(state: GameState) {
  const def = ARENAS[state.arenaId].hazard, ah = state.arenaHazard;
  const bossBusy = state.enemies.some(e => (e.kind === 'warden' || e.kind === 'seraph') && e.hp > 0 && e.mode !== 'move' && e.mode !== 'recover') || state.hazards.some(h => h.owner !== 0 && !h.fired);
  if (bossBusy) ah.quietUntil = state.time + BOSS_QUIET;
  if (ah.nextAt === 0) ah.nextAt = def.startAt;
  if (state.time < ah.nextAt || state.time < ah.quietUntil || state.hazards.some(h => h.owner === 0 && !h.fired)) return;
  const bossAlive = state.enemies.some(e => (e.kind === 'warden' || e.kind === 'seraph') && e.hp > 0);
  const u = Math.min(1, Math.max(0, (state.time - def.startAt) / Math.max(1, def.intervalEndAt - def.startAt)));
  ah.nextAt = state.time + (def.intervalStart + (def.intervalEnd - def.intervalStart) * u) * (bossAlive ? 1.6 : 1);
  const i = ah.count++;
  if (def.id === 'lane-surge') {
    const lane = def.lanes![i % def.lanes!.length];
    state.hazards.push({ id: state.nextId++, shape: 'rect', x: lane.x, y: lane.y, w: lane.w, h: lane.h, r: 0, ang: 0, arc: 0, delay: def.warn, total: def.warn, active: def.active, damage: def.damage, owner: 0, tag: 'surge', fired: false, ttl: 0 });
    state.enemyEvents.push({ id: state.nextId++, kind: 'hazard_warn', enemy: 'warden', enemyId: 0, x: lane.x, y: lane.y, dirX: 1, dirY: 0, tag: 'surge' });
  } else {
    const pylons = ARENAS[state.arenaId].solids.filter(s => s.prop === 'pylon'), p = pylons[def.order![i % def.order!.length] % pylons.length], fp = PROP_FOOTPRINTS.pylon;
    const x = p.x + fp.w / 2, y = p.y + fp.h / 2;
    state.hazards.push({ id: state.nextId++, shape: 'circle', x, y, r: def.radius!, ang: 0, arc: 0, delay: def.warn, total: def.warn, active: def.active, damage: def.damage, owner: 0, tag: 'pylon', fired: false, ttl: 0 });
    state.enemyEvents.push({ id: state.nextId++, kind: 'hazard_warn', enemy: 'warden', enemyId: 0, x, y, dirX: 1, dirY: 0, tag: 'pylon' });
  }
  if (state.enemyEvents.length > 64) state.enemyEvents.splice(0, state.enemyEvents.length - 64);
}

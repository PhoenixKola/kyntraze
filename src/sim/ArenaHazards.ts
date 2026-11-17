import { ARENAS, PROP_FOOTPRINTS } from '../content/arenas';
import { isBoss } from '../content/enemies';
import type { GameState } from './GameState';

const BOSS_QUIET = 2.5;
const bossLive = (s: GameState) => s.enemies.some(e => isBoss(e.kind) && !e.part && e.hp > 0);
/** Arena hazard director: one telegraphed hazard at a time, never while a boss is in a committed attack, deterministic (cycle index, no RNG). Data lives in content/arenas.ts. */
export function updateArenaHazards(state: GameState) {
  const def = ARENAS[state.arenaId].hazard, ah = state.arenaHazard;
  const bossBusy = state.enemies.some(e => isBoss(e.kind) && !e.part && e.hp > 0 && e.mode !== 'move' && e.mode !== 'recover') || state.hazards.some(h => h.owner !== 0 && !h.fired);
  if (bossBusy) ah.quietUntil = state.time + BOSS_QUIET;
  if (ah.nextAt === 0) ah.nextAt = def.startAt;
  if (state.time < ah.nextAt || state.time < ah.quietUntil || state.hazards.some(h => h.owner === 0 && !h.fired)) return;
  const bossAlive = bossLive(state);
  const u = Math.min(1, Math.max(0, (state.time - def.startAt) / Math.max(1, def.intervalEndAt - def.startAt)));
  const mods = state.plan.modifiers;
  const modScale = (mods.includes('fractured_momentum') ? 0.77 : 1) * (mods.includes('skyfall_circuit') ? 0.6 : 1);
  ah.nextAt = state.time + (def.intervalStart + (def.intervalEnd - def.intervalStart) * u) * (bossAlive ? 1.6 : 1) * state.run.hazardMult * modScale;
  const i = ah.count++;
  const warnEvent = (x: number, y: number, tag: string) => state.enemyEvents.push({ id: state.nextId++, kind: 'hazard_warn', enemy: 'warden', enemyId: 0, x, y, dirX: 1, dirY: 0, tag });
  if (def.id === 'lane-surge') {
    const lane = def.lanes![i % def.lanes!.length];
    state.hazards.push({ id: state.nextId++, shape: 'rect', x: lane.x, y: lane.y, w: lane.w, h: lane.h, r: 0, ang: 0, arc: 0, delay: def.warn, total: def.warn, active: def.active, damage: def.damage, owner: 0, tag: 'surge', fired: false, ttl: 0 });
    warnEvent(lane.x, lane.y, 'surge');
  } else if (def.id === 'pylon-pulse') {
    const pylons = ARENAS[state.arenaId].solids.filter(s => s.prop === 'pylon'), p = pylons[def.order![i % def.order!.length] % pylons.length], fp = PROP_FOOTPRINTS.pylon;
    const x = p.x + fp.w / 2, y = p.y + fp.h / 2;
    state.hazards.push({ id: state.nextId++, shape: 'circle', x, y, r: def.radius!, ang: 0, arc: 0, delay: def.warn, total: def.warn, active: def.active, damage: def.damage, owner: 0, tag: 'pylon', fired: false, ttl: 0 });
    warnEvent(x, y, 'pylon');
  } else if (def.id === 'shatterfall') {
    // B22 Aetherfall: floor sections crack, pulse, then discharge. Every pattern leaves at least one full column free (validated in tests); cells in a pattern fire a beat apart so the order is readable.
    const pool = state.time >= (def.lateAt ?? 1e9) && def.latePatterns ? def.latePatterns : def.patterns!, pat = pool[i % pool.length], step = def.stagger ?? 0.25;
    pat.forEach((ci, k) => {
      const c = def.cells![ci], delay = def.warn + k * step;
      state.hazards.push({ id: state.nextId++, shape: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, r: 0, ang: 0, arc: 0, delay, total: delay, active: def.active, damage: def.damage, owner: 0, tag: 'shatter', fired: false, ttl: 0 });
      warnEvent(c.x, c.y, 'shatter');
    });
  } else {
    // B22 Paradox: a marked fold stores a short pattern, strikes with it after the warning, then ECHOES it once. The echo is created now, so its warning is visible from the start.
    const fold = def.folds![i % def.folds!.length], kind = i % 3, gap = def.echoGap ?? 2.2;
    const shapes: { shape: 'circle' | 'lane'; x: number; y: number; r: number; w?: number; ang: number }[] = [];
    if (kind === 0) shapes.push({ shape: 'circle', x: fold.x, y: fold.y, r: fold.r, ang: 0 });
    else if (kind === 1) for (let k = 0; k < 4; k++) shapes.push({ shape: 'lane', x: fold.x, y: fold.y, r: fold.r + 110, w: 62, ang: k * Math.PI / 2 });
    else for (let k = 0; k < 3; k++) shapes.push({ shape: 'circle', x: fold.x + Math.cos(k * 2.094 + 0.5) * fold.r * 0.95, y: fold.y + Math.sin(k * 2.094 + 0.5) * fold.r * 0.95, r: fold.r * 0.55, ang: 0 });
    for (const [echo, delay, dmg, tag] of [[false, def.warn, def.damage, 'fold'], [true, def.warn + gap, Math.round(def.damage * 0.85), 'fold_echo']] as const) for (const sh of shapes) {
      state.hazards.push({ id: state.nextId++, shape: sh.shape, x: sh.x, y: sh.y, r: sh.r, w: sh.w, ang: sh.ang, arc: 0, delay, total: delay, active: def.active, damage: dmg, owner: 0, tag, fired: false, ttl: 0, echo });
    }
    warnEvent(fold.x, fold.y, 'fold');
  }
  if (state.enemyEvents.length > 64) state.enemyEvents.splice(0, state.enemyEvents.length - 64);
}

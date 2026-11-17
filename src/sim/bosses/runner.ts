/** Generic telegraph -> release -> active -> recovery runner for the B22 bosses. The behaviour tables (one file per boss) supply moves, pattern order, locomotion and special rules; this file owns the state machine so every boss follows the same fair timeline contract. */
import type { Enemy, GameState } from '../GameState';
import { BOSSES } from '../../content/bosses';
import type { BossKind } from '../../content/enemies';
import { normalize } from '../../core/Math';
import { Behavior, Ctx, clearOwn, ev, ex, gOf, newAi } from './kit';
import { castellan } from './castellan';
import { regent } from './regent';
import { oathkeeper } from './oathkeeper';
import { mirrorTyrant } from './mirrorTyrant';
import { chronophage } from './chronophage';
import { hollowChoir } from './hollowChoir';
import { sovereign } from './sovereign';

export const BEHAVIORS: Partial<Record<BossKind, Behavior>> = { castellan, regent, oathkeeper, mirror_tyrant: mirrorTyrant, chronophage, hollow_choir: hollowChoir, sovereign };
export const isB22Boss = (k: string): boolean => k in BEHAVIORS;
export const behaviorOf = (k: string) => BEHAVIORS[k as BossKind];

function ctx(s: GameState, e: Enemy, dt: number): Ctx {
  const ai = (e.ai ??= newAi()), def = BOSSES[e.kind as BossKind], p = s.player;
  const dx = p.x - e.x, dy = p.y - e.y, v = normalize(dx, dy);
  return { s, e, ai, ph: ai.phase - 1, dt, dist: Math.hypot(dx, dy), v, base: Math.atan2(v.y, v.x), g: gOf(e), def };
}
function desiredPhase(e: Enemy, b: Behavior): 1 | 2 | 3 {
  const def = BOSSES[e.kind as BossKind], f = e.hp / e.maxHp;
  let ph: 1 | 2 | 3 = f <= def.phaseAt ? 2 : 1;
  if (b.phases === 3 && def.phaseAt2 !== undefined && f <= def.phaseAt2) ph = 3;
  return Math.max(ph, ex(e).wantPhase ?? 1) as 1 | 2 | 3;
}
function startPhase(c: Ctx, to: 1 | 2 | 3, b: Behavior) {
  const { s, e, ai, def } = c; clearOwn(s, e.id);
  ai.phase = to; ai.atk = ''; ai.step = 0; ai.exposed = false; ai.invuln = true; ai.pat = 0; e.mode = 'phase'; e.modeT = def.phaseT;
  ex(e).open = 0; ev(s, 'enemy_phase', e, e.aimX, e.aimY, e.kind);
  b.onPhase?.({ ...c, ph: to - 1 });
}
export function updateB22Boss(s: GameState, e: Enemy, dt: number) {
  const b = BEHAVIORS[e.kind as BossKind]; if (!b) return;
  const c = ctx(s, e, dt), { ai, def } = c, X = ex(e);
  e.touchCooldown = Math.max(0, e.touchCooldown - dt); e.attackCd = Math.max(0, e.attackCd - dt);
  if (X.open > 0) { X.open -= dt; ai.exposed = true; if (X.open <= 0) { ai.exposed = e.mode === 'recover' ? ai.exposed : false; } }
  const want = desiredPhase(e, b);
  if (e.mode !== 'intro' && e.mode !== 'phase' && want > ai.phase) startPhase(c, want, b);
  b.onTick?.(c, dt);
  const ph = ai.phase - 1, ws = def.windupScale[Math.min(1, ph)];
  switch (e.mode) {
    case 'intro': e.modeT -= dt; ai.invuln = true; e.aimX = c.v.x; e.aimY = c.v.y; if (e.modeT <= 0) { ai.invuln = false; e.mode = 'move'; e.attackCd = 1; } return;
    case 'phase': e.modeT -= dt; ai.invuln = true; if (e.modeT <= 0) { ai.invuln = false; e.mode = 'move'; e.attackCd = def.cooldown[Math.min(1, ph)]; } return;
    case 'move': {
      b.locomote(c); e.aimX = c.v.x; e.aimY = c.v.y;
      if (e.attackCd <= 0 && !X.busy) {
        const list = b.pattern(ph); const name = list[ai.pat % list.length]; ai.pat++;
        const m = b.moves[name]; if (!m) return;
        ai.atk = name; ai.step = 0; ai.acc = 0; ai.t = 0; ai.exposed = (X.open ?? 0) > 0; e.mode = 'windup'; e.modeT = m.windup * ws;
        m.tele?.({ ...c, ph });
        ev(s, 'enemy_telegraph', e, c.v.x, c.v.y, name);
      }
      return;
    }
    case 'windup': {
      e.modeT -= dt;
      if (e.modeT <= 0) { const m = b.moves[ai.atk]; e.mode = 'strike'; e.modeT = m.strike; m.fire?.({ ...c, ph }); ev(s, 'enemy_strike', e, e.aimX, e.aimY, ai.atk); }
      return;
    }
    case 'strike': {
      e.modeT -= dt; const m = b.moves[ai.atk]; m.tick?.({ ...c, ph }, dt);
      if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = m.recover; ai.exposed = !!m.exposed || (X.open ?? 0) > 0; if (m.exposed) ev(s, 'enemy_strike', e, 0, 0, `${ai.atk}_open`); }
      return;
    }
    default: {   // recover
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'move'; ai.exposed = (X.open ?? 0) > 0; ai.atk = ''; e.attackCd = def.cooldown[Math.min(1, ph)]; }
    }
  }
}

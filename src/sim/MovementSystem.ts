import { surgeSpeedMul } from './KaiKit';
import type { GameState, InputState } from './GameState';
import { normalize } from '../core/Math';
import { slideMove, flyMove, ejectFromSolids } from './CollisionSystem';
import { cancelCast, castMoveScale } from './AbilitySystem';
import { APEX } from '../content/stillfire';
import { FLY, OD } from '../content/kaiCombat';
import { REN_FLY } from '../content/renCombat';
import { SORA_FLY } from '../content/soraCombat';
import { VEX_FLY } from '../content/vexCombat';
import { ASCEND } from '../content/heroKits';
/** Dash charges: Kai Form II = 2, Form III = 3, Vex Form II (last form) = 2, everything else 1. */
export function dashMax(state: GameState): number { const f = state.player.form; return state.hero === 'kai' ? (f === 3 ? 3 : f === 2 ? 2 : 1) : state.hero === 'vex' && f === 2 ? 2 : 1; }
export function movePlayer(state: GameState, input: InputState, dt: number) {
  const p = state.player;
  const direction = normalize(input.x, input.y);
  const apex = p.form === 3;
  const dmax = dashMax(state); p.dashUsed = Math.min(p.dashUsed, dmax);
  if (input.dash && (p.dashUsed < dmax || p.dashCooldown <= 0) && (direction.x !== 0 || direction.y !== 0)) {
    cancelCast(state);
    p.dashDx = direction.x; p.dashDy = direction.y; p.dashRemaining = apex ? 0.13 : 0.22; p.dashUsed = Math.min(dmax, p.dashUsed + 1); if (p.dashCooldown <= 0) p.dashCooldown = 3.2 * state.mods.dashCd; p.invulnerable = Math.max(p.invulnerable, 0.25);
    state.impacts.push({ id: state.nextId++, kind: 'dash', x: p.x, y: p.y, ttl: apex ? 0.3 : 0.22, life: apex ? 0.3 : 0.22 });
    if (apex) state.abilityEvents.push({ id: state.nextId++, kind: 'form3_dash', x: p.x, y: p.y });
  }
  const odMul = ((state.hero === 'kai' || state.hero === 'ren' || state.hero === 'sora' || state.hero === 'vex') && p.odT > 0 ? OD.speedMul : 1) * (state.hero === 'kai' && p.flyT > 0 && p.form >= 1 ? FLY.form[p.form as 1 | 2 | 3].speed : state.hero === 'ren' && p.flyT > 0 && p.form >= 1 ? REN_FLY.speed : state.hero === 'sora' && p.flyT > 0 && p.form >= 1 ? SORA_FLY.speed : state.hero === 'vex' && p.flyT > 0 && p.form >= 1 ? VEX_FLY.form[p.form === 2 ? 2 : 1].speed : 1), formSpeed = odMul * (!p.form ? surgeSpeedMul(state) : state.hero === 'ren' ? ASCEND.ren.speedMul : state.hero === 'sora' ? ASCEND.sora.speedMul : state.hero === 'vex' ? ASCEND.vex.speedMul[Math.min(1, p.form - 1)] : 1.16);
  const dashing = p.dashRemaining > 0; const lock = dashing ? 1 : castMoveScale(state) * (state.b22.ult.act ? 0.15 : 1);
  if (apex) {
    // Form III glides: velocity eases toward the input (ease-in / ease-out), the dash is a near-instant displacement (same ~175 px as before, in 0.13 s)
    const sp = dashing ? 1350 : p.speed * lock * APEX.speedMul, wx = (dashing ? p.dashDx : direction.x) * sp, wy = (dashing ? p.dashDy : direction.y) * sp;
    const k = dashing || p.flyT > 0 ? 1 : 1 - Math.exp(-dt / APEX.glideEase); p.vx += (wx - p.vx) * k; p.vy += (wy - p.vy) * k;
    (p.flyT > 0 ? flyMove : slideMove)(p, p.vx, p.vy, dt);
  } else {
    p.vx = 0; p.vy = 0;
    (p.flyT > 0 ? flyMove : slideMove)(p, (dashing ? p.dashDx * 800 : direction.x * p.speed * lock) * formSpeed, (dashing ? p.dashDy * 800 : direction.y * p.speed * lock) * formSpeed, dt);
  }
  if (p.flyT <= 0) ejectFromSolids(p);
  p.dashRemaining = Math.max(0, p.dashRemaining - dt);
  if (apex && dashing && p.dashRemaining <= 0) { p.vx = p.dashDx * p.speed * APEX.speedMul; p.vy = p.dashDy * p.speed * APEX.speedMul; }
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  if (p.dashUsed > 0 && p.dashCooldown <= 0) { p.dashUsed--; if (p.dashUsed > 0) p.dashCooldown = 3.2 * state.mods.dashCd; }
  p.invulnerable = Math.max(0, p.invulnerable - dt);
}

import { surgeSpeedMul } from './KaiKit';
import type { GameState, InputState } from './GameState';
import { normalize } from '../core/Math';
import { slideMove } from './CollisionSystem';
import { cancelCast, castMoveScale } from './AbilitySystem';
import { APEX } from '../content/stillfire';
import { ASCEND } from '../content/heroKits';
export function movePlayer(state: GameState, input: InputState, dt: number) {
  const p = state.player;
  const direction = normalize(input.x, input.y);
  const apex = p.form === 3;
  if (input.dash && p.dashCooldown <= 0 && (direction.x !== 0 || direction.y !== 0)) {
    cancelCast(state);
    p.dashDx = direction.x; p.dashDy = direction.y; p.dashRemaining = apex ? 0.13 : 0.22; p.dashCooldown = 3.2 * state.mods.dashCd; p.invulnerable = Math.max(p.invulnerable, 0.25);
    state.impacts.push({ id: state.nextId++, kind: 'dash', x: p.x, y: p.y, ttl: apex ? 0.3 : 0.22, life: apex ? 0.3 : 0.22 });
    if (apex) state.abilityEvents.push({ id: state.nextId++, kind: 'form3_dash', x: p.x, y: p.y });
  }
  const formSpeed = !p.form ? surgeSpeedMul(state) : state.hero === 'ren' ? ASCEND.ren.speedMul : state.hero === 'sora' ? ASCEND.sora.speedMul : state.hero === 'vex' ? ASCEND.vex.speedMul[Math.min(1, p.form - 1)] : 1.16;
  const dashing = p.dashRemaining > 0; const lock = dashing ? 1 : castMoveScale(state) * (state.b22.ult.act ? 0.15 : 1);
  if (apex) {
    // Form III glides: velocity eases toward the input (ease-in / ease-out), the dash is a near-instant displacement (same ~175 px as before, in 0.13 s)
    const sp = dashing ? 1350 : p.speed * lock * APEX.speedMul, wx = (dashing ? p.dashDx : direction.x) * sp, wy = (dashing ? p.dashDy : direction.y) * sp;
    const k = dashing ? 1 : 1 - Math.exp(-dt / APEX.glideEase); p.vx += (wx - p.vx) * k; p.vy += (wy - p.vy) * k;
    slideMove(p, p.vx, p.vy, dt);
  } else {
    p.vx = 0; p.vy = 0;
    slideMove(p, (dashing ? p.dashDx * 800 : direction.x * p.speed * lock) * formSpeed, (dashing ? p.dashDy * 800 : direction.y * p.speed * lock) * formSpeed, dt);
  }
  p.dashRemaining = Math.max(0, p.dashRemaining - dt);
  if (apex && dashing && p.dashRemaining <= 0) { p.vx = p.dashDx * p.speed * APEX.speedMul; p.vy = p.dashDy * p.speed * APEX.speedMul; }
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
}

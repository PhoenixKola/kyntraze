/** B21.6 (pure half): which real events cast a short-lived coloured light on the floor, how big and how bright. Capped, additive, top-left lighting is preserved by keeping every light a soft radial pool under the effect. */
import type { GameState } from '../../sim/GameState';

export interface LightPlan { x: number; y: number; radius: number; color: number; alpha: number; life: number }
const COL = { kai: 0xffb347, cyan: 0x59d6ff, ren: 0xff3a2a, sora: 0x55c0ff, silver: 0xdfe8ff, gold: 0xffd34a, hostile: 0xd0407a };

export function planLights(s: GameState, afterAbility: number, afterEnemy: number): { lights: LightPlan[]; ability: number; enemy: number } {
  const lights: LightPlan[] = []; let ability = afterAbility, enemy = afterEnemy;
  const kaiCol = s.player.form === 3 ? COL.silver : s.player.form === 2 ? COL.gold : s.player.form === 1 ? COL.kai : COL.cyan;
  const col = s.hero === 'ren' ? COL.ren : s.hero === 'sora' ? COL.sora : kaiCol;
  const R = (r: number, a: number, life: number, c = col, x?: number, y?: number, e?: { x: number; y: number }) => lights.push({ x: x ?? e!.x, y: y ?? e!.y, radius: r, color: c, alpha: a, life });
  for (const e of s.abilityEvents) {
    if (e.id <= afterAbility) continue; ability = Math.max(ability, e.id);
    switch (e.kind) {
      case 'beam_fire': case 'comet_fire': case 'rift_fire': { const c = s.cast; if (c) { R(150, 0.32, 0.5, col, s.player.x + c.dirX * 60, s.player.y + 10 + c.dirY * 60); R(110, 0.22, 0.5, col, s.player.x + c.dirX * c.len * 0.55, s.player.y + 10 + c.dirY * c.len * 0.55); } break; }
      case 'lance_fire': { const c = s.hx.act; if (c && c.act === 'celestial_lance') { const t = 0.3 + 0.1 * c.tier; R(140 + 20 * c.tier, t, 0.55, col, c.sx, c.sy + 10); R(120, 0.22 * t / 0.3, 0.55, col, c.sx + c.dirX * c.len * 0.5, c.sy + 10 + c.dirY * c.len * 0.5); } break; }
      case 'sphere_burst': { const b = s.blasts.find(q => Math.abs(q.x - e.x) < 2 && Math.abs(q.y - e.y) < 2); R((b?.radius ?? 190) * 1.25, 0.45, 0.6, col, e.x, e.y); break; }
      case 'horizon_burst': R(160, 0.4, 0.5, col, e.x, e.y); break;
      case 'bloodstar_slam': R(300, 0.5, 0.8, col, e.x, e.y); break;
      case 'bloodstar_rebound': R(240, 0.35, 0.5, col, e.x, e.y); break;
      case 'rush_strike': R(100, 0.3, 0.3, col, e.x, e.y); break;
      case 'dragon_hit': case 'comet_pulse': case 'rift_pulse': case 'reversal_hit': R(80, 0.22, 0.25, col, e.x, e.y); break;
      case 'ascend_break': case 'form2_break': case 'form3_break': R(320, 0.5, 0.9, col, s.player.x, s.player.y); break;
      default: break;
    }
  }
  for (const e of s.enemyEvents) {
    if (e.id <= afterEnemy) continue; enemy = Math.max(enemy, e.id);
    if (e.kind === 'enemy_slam') R(e.enemy === 'bruiser' ? 120 : 200, 0.3, 0.5, COL.hostile, e.x, e.y + 12);
  }
  return { lights: lights.slice(0, 8), ability, enemy };
}

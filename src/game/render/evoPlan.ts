/** B21.2 / B21.6 (pure half): what the ImageGen ability-evolution art and the rare anime impact frames show for each REAL sim event. Tier arcs, pierce sparks, echo rings and afterburn trails only appear for earned upgrades; an impact frame only for a short list of genuinely heavy events, spaced out and never under Reduced Effects. */
import type { GameState } from '../../sim/GameState';
import { REN } from '../../content/heroKits';
import { SPHERE } from '../../content/abilities';
import { evolution, type Evolution } from './buildEvolution';

export type EvoSet = 'kai' | 'comet' | 'still' | 'ren' | 'sora';
export interface EvoPlan { name: string; x: number; y: number; width: number; rot: number; life: number; alpha: number; frame?: boolean; ox?: number; vx?: number; vy?: number }

export const evoSetFor = (s: Pick<GameState, 'hero' | 'player'>): EvoSet => (s.hero === 'ren' ? 'ren' : s.hero === 'sora' ? 'sora' : s.player.form === 3 ? 'still' : s.player.form === 2 ? 'comet' : 'kai');
const FRAME_COLOR = (s: Pick<GameState, 'hero' | 'player'>) => (s.hero === 'ren' ? 'crimson' : s.hero === 'sora' ? 'azure' : s.player.form === 3 ? 'silver' : s.player.form >= 1 ? 'gold' : 'azure');
export const FRAME_COOLDOWN = 1.4;
const tierName = (set: EvoSet, tier: number) => (tier >= 3 ? `${set}_tier3` : `${set}_tier2`);

export interface EvoCursor { ability: number; enemy: number; frameClock: number }
export function planEvo(s: GameState, cur: EvoCursor, reduced: boolean, evo: Evolution = evolution(s, s.hero === 'ren' ? 2 : 1)): { plans: EvoPlan[]; cur: EvoCursor } {
  const plans: EvoPlan[] = [], set = evoSetFor(s), c = s.cast, h = s.hx.act, p = s.player; let { ability, enemy } = cur; const frameClock = cur.frameClock;
  let frameAt = frameClock;
  const frame = (x: number, y: number, w: number, a = 0.9) => { if (reduced || s.time - frameAt < FRAME_COOLDOWN) return; frameAt = s.time; plans.push({ name: `impact_${FRAME_COLOR(s)}`, x, y, width: w, rot: 0, life: 0.09, alpha: a, frame: true }); };
  for (const e of s.abilityEvents) {
    if (e.id <= cur.ability) continue; ability = Math.max(ability, e.id);
    const ang = Math.atan2(h?.dirY ?? s.hx.strike.y, h?.dirX ?? s.hx.strike.x);
    switch (e.kind) {
      case 'auto_hit': case 'auto_finisher': if (evo.auto >= 2) plans.push({ name: tierName(set, e.kind === 'auto_finisher' ? 3 : evo.auto), x: e.x, y: e.y, width: 90 + 20 * evo.auto, rot: ang, life: 0.18, alpha: 0.9, ox: 0.3 }); break;
      case 'hero_q_beat': if (evo.q >= 2 && ((e.n ?? 0) & 128) !== 0) plans.push({ name: tierName(set, evo.q), x: e.x, y: e.y, width: 140, rot: ang, life: 0.22, alpha: 0.9, ox: 0.3 }); break;
      case 'beam_fire': if (c && c.kind === 'beam' && evo.afterburn > 0) plans.push({ name: `${set}_afterburn_trail`, x: p.x + c.dirX * 40, y: p.y + 10 + c.dirY * 40, width: Math.min(c.len, 260 + 90 * evo.afterburn), rot: Math.atan2(c.dirY, c.dirX), life: 0.5 + 0.25 * evo.afterburn, alpha: 0.55, ox: 0 }); break;
      case 'beam_pulse': case 'lance_pulse': case 'comet_pulse': case 'rift_pulse': if (evo.e >= 1 && (e.n ?? 1) > 0) plans.push({ name: `${set}_pierce_spark`, x: e.x, y: e.y, width: 46 + 14 * evo.e, rot: (e.id * 1.7) % 6.28, life: 0.2, alpha: 0.95 }); break;
      case 'lance_fire': if (h && h.act === 'celestial_lance' && h.tier >= 2) frame(h.sx + h.dirX * 80, h.sy + h.dirY * 80, 420, 0.8); break;
      case 'comet_fire': frame(p.x, p.y, 440, 0.8); break;
      case 'finisher': case 'finisher3': frame(e.x, e.y, 400, 0.8); break;
      case 'rush_strike': if (evo.e >= 2) plans.push({ name: tierName(set, evo.e), x: e.x, y: e.y, width: 150, rot: ang, life: 0.24, alpha: 0.9 }); if (evo.e >= 1) plans.push({ name: `${set}_pierce_spark`, x: e.x, y: e.y, width: 60, rot: e.id, life: 0.2, alpha: 0.9 }); break;
      case 'rift_blink': { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy); if (d > 20 && set === 'still') plans.push({ name: 'still_blink_slash', x: (e.x + p.x) / 2, y: (e.y + p.y) / 2 - 20, width: Math.min(560, d * 1.2), rot: Math.atan2(dy, dx), life: 0.28, alpha: 0.9 }); break; }
      case 'sphere_burst': case 'horizon_burst': { if (evo.r >= 2) { const b = s.blasts.find(q => Math.abs(q.x - e.x) < 2 && Math.abs(q.y - e.y) < 2); plans.push({ name: `${set}_echo_ring`, x: e.x, y: e.y + 4, width: 2 * (b?.radius ?? SPHERE.radius * s.mods.sphereRadius) * 1.05, rot: 0, life: 0.5, alpha: 0.75 }); } if (evo.echo >= 2) frame(e.x, e.y, 520, 0.8); break; }
      case 'bloodstar_slam': frame(e.x, e.y, 460, 0.75); break;
      case 'bloodstar_ring': if (evo.echo > 0 || evo.r >= 1) plans.push({ name: 'ren_echo_ring', x: e.x, y: e.y + 6, width: 2 * REN.r.radius * s.mods.sphereRadius * REN.r.ring, rot: 0, life: 0.55, alpha: 0.8 }); break;
      case 'ascend_break': case 'form2_break': case 'form3_break': frame(p.x, p.y - 30, 560, 0.85); break;
      default: break;
    }
  }
  for (const e of s.enemyEvents) {
    if (e.id <= cur.enemy) continue; enemy = Math.max(enemy, e.id);
    if (e.kind === 'boss_defeated') frame(e.x, e.y - 30, 620, 0.9);
  }
  return { plans, cur: { ability, enemy, frameClock: frameAt } };
}

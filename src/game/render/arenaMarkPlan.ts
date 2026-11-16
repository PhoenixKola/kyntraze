/** B21.5 (pure half): temporary battle scars on the floor. Pure `planMarks` decides WHAT a real sim event leaves behind (material-correct per arena, sized from the real radius); `ArenaMarks` draws them from a bounded FxPool and lets them fade. Cosmetic only: never touches collision, hazards or the simulation. */
import type { ArenaId } from '../../content/arenas';
import type { GameState } from '../../sim/GameState';
import { REN, SORA } from '../../content/heroKits';
import { SPHERE } from '../../content/abilities';
import type { FxSpawn } from './fxPool';
const vfxKey = (n: string, solar: boolean) => `vfx-${n}-${solar ? 's' : 'b'}`;   // same key contract as fxPool (kept here so this file stays Phaser-free and unit-testable)

export type MarkHero = 'kai' | 'ren' | 'sora' | 'hostile';
export interface MarkPlan { kind: 'crack' | 'scorch' | 'lane'; x: number; y: number; radius: number; rot: number; hero: MarkHero; life: number; strong: boolean }

const HERO_GLOW: Record<MarkHero, number> = { kai: 0xffb347, ren: 0xff3a2a, sora: 0x55c0ff, hostile: 0xd0407a };
/** Material of each floor: Gloam is scored dark metal with thin lit seams, Ashen is cracked charcoal masonry with verdigris resonance. */
export const MATERIAL = {
  gloam: { soot: 0x0b0e14, sootAlpha: 0.7, crack: 0x1c222c, ash: false },
  ashen: { soot: 0x17130f, sootAlpha: 0.75, crack: 0x0e0b09, ash: true },
} as const;
export const VERDIGRIS = 0x4fa58d;

export function planMarks(s: GameState, afterAbility: number, afterEnemy: number): { plans: MarkPlan[]; ability: number; enemy: number } {
  const plans: MarkPlan[] = []; let ability = afterAbility, enemy = afterEnemy;
  const hero: MarkHero = s.hero === 'ren' ? 'ren' : s.hero === 'sora' ? 'sora' : 'kai';
  for (const e of s.abilityEvents) {
    if (e.id <= afterAbility) continue; ability = Math.max(ability, e.id);
    switch (e.kind) {
      case 'bloodstar_slam': plans.push({ kind: 'crack', x: e.x, y: e.y + 6, radius: REN.r.radius * s.mods.sphereRadius, rot: (e.id * 0.7) % 6.28, hero, life: 12, strong: true }); break;
      case 'rush_strike': plans.push({ kind: 'scorch', x: e.x, y: e.y + 8, radius: 36 * s.mods.beamWidth, rot: e.id, hero, life: 6, strong: false }); break;
      case 'sphere_burst': { const b = s.blasts.find(q => Math.abs(q.x - e.x) < 2 && Math.abs(q.y - e.y) < 2); plans.push({ kind: 'scorch', x: e.x, y: e.y + 4, radius: (b?.radius ?? SPHERE.radius * s.mods.sphereRadius) * 0.8, rot: 0, hero, life: 9, strong: true }); break; }
      case 'horizon_burst': plans.push({ kind: 'crack', x: e.x, y: e.y + 6, radius: SORA.r.radius * s.mods.sphereRadius * 0.9, rot: (e.id * 0.9) % 6.28, hero, life: 8, strong: false }); break;
      case 'lance_fire': { const c = s.hx.act; if (c && c.act === 'celestial_lance') plans.push({ kind: 'lane', x: c.sx, y: c.sy + 10, radius: c.len, rot: Math.atan2(c.dirY, c.dirX), hero, life: 3.5, strong: true }); break; }
      case 'beam_fire': { const c = s.cast; if (c && c.kind === 'beam') plans.push({ kind: 'lane', x: s.player.x + c.dirX * 30, y: s.player.y + 12 + c.dirY * 30, radius: c.len, rot: Math.atan2(c.dirY, c.dirX), hero, life: 3, strong: false }); break; }
      default: break;
    }
  }
  for (const e of s.enemyEvents) {
    if (e.id <= afterEnemy) continue; enemy = Math.max(enemy, e.id);
    if (e.kind === 'enemy_slam') plans.push({ kind: 'crack', x: e.x, y: e.y + 12, radius: e.enemy === 'bruiser' ? 120 : 160, rot: (e.id * 1.3) % 6.28, hero: 'hostile', life: 10, strong: true });
  }
  return { plans, ability, enemy };
}

/** The spawn recipe of one mark: a soot/crack body in the floor's material, then a short additive heat glow (the energized seam) that cools. */
export function markSpawns(m: MarkPlan, arena: ArenaId, reduced: boolean): FxSpawn[] {
  const mat = MATERIAL[arena], glow = arena === 'ashen' && m.hero !== 'ren' && m.hero !== 'sora' ? VERDIGRIS : HERO_GLOW[m.hero], out: FxSpawn[] = [];
  const wide = (r: number) => (2 * r) / 279;
  if (m.kind === 'lane') {
    const cx = m.x + Math.cos(m.rot) * m.radius * 0.5, cy = m.y + Math.sin(m.rot) * m.radius * 0.5;
    out.push({ key: vfxKey('scorch', false), x: cx, y: cy, depth: 2.82, life: m.life, blend: 'normal', tint: mat.soot, s0: m.radius / 329, s1: m.radius / 329, sy: 0.22, a0: mat.sootAlpha * 0.55, a1: 0, rot: m.rot, fadeIn: 0.05 });
    if (!reduced) out.push({ key: vfxKey('scorch', false), x: cx, y: cy, depth: 2.83, life: Math.min(1.4, m.life), blend: 'add', tint: glow, s0: m.radius / 329, s1: m.radius / 329, sy: 0.12, a0: 0.5, a1: 0, rot: m.rot });
    return out;
  }
  if (m.kind === 'scorch') {
    out.push({ key: vfxKey('scorch', false), x: m.x, y: m.y, depth: 2.82, life: m.life, blend: 'normal', tint: mat.soot, s0: (2 * m.radius) / 329, s1: (2 * m.radius) / 329, a0: mat.sootAlpha, a1: 0, rot: m.rot, fadeIn: 0.04 });
    if (!reduced) out.push({ key: vfxKey('scorch', false), x: m.x, y: m.y, depth: 2.83, life: 1.6, blend: 'add', tint: glow, s0: (2 * m.radius) / 329, s1: (1.6 * m.radius) / 329, a0: 0.55, a1: 0, rot: m.rot });
    return out;
  }
  out.push({ key: vfxKey('circ_crack', false), x: m.x, y: m.y, depth: 2.84, life: m.life, blend: 'normal', tint: mat.crack, s0: wide(m.radius), s1: wide(m.radius), sy: 0.55, a0: 0.9, a1: 0, rot: m.rot, fadeIn: 0.03 });
  if (!reduced) {
    out.push({ key: vfxKey('circ_crack', false), x: m.x, y: m.y, depth: 2.85, life: m.strong ? 3.2 : 1.8, blend: 'add', tint: glow, s0: wide(m.radius), s1: wide(m.radius), sy: 0.55, a0: 0.75, a1: 0, rot: m.rot });
    if (mat.ash) out.push({ key: vfxKey('dust', false), x: m.x, y: m.y - 4, depth: 2.9, life: 1.1, blend: 'normal', tint: 0x6b6258, s0: wide(m.radius) * 0.6, s1: wide(m.radius) * 1.1, sy: 0.6, a0: 0.4, a1: 0 });
  }
  return out;
}


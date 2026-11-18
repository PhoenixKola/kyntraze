/** Single seam between the classic combat code and everything B22 layers on top. CombatSystem calls only these two functions per hit. Damage flagged `fx` (branch / legendary / relic / ultimate effects) never re-enters these hooks, so nothing can recurse or chain forever. */
import type { Enemy, GameState } from './GameState';
import { RELIC_RULES } from '../b22/relics';
import { b22Emit, bump } from '../b22/state';
import { isBoss } from '../content/enemies';
import { activeForm } from './B22Mastery';
import { onHitLogged, onNeedleHit, slotOfAct } from './BranchSystem';
import { chargeUltimate } from './UltimateSystem';
import { damageEnemy } from './CombatSystem';

export interface HitOpts { area?: boolean; proj?: boolean; fx?: boolean }
export function b22PreDamage(s: GameState, e: Enemy, dmg: number, o?: HitOpts): number {
  if (o?.fx) return dmg;
  const b = s.b22; let m = 1;
  if (b.relics.length) {
    if (b.sigilCharge > 0 && dmg >= RELIC_RULES.sigil.minHit && !e.ai?.invuln) { m *= RELIC_RULES.sigil.mul; b.sigilCharge = 0; b22Emit(b, 'sigil_strike', e.x, e.y); }
    if (b.featherBoost > s.time && slotOfAct(s) === 'e') m *= RELIC_RULES.feather.mul;
    if (b.bearings.length) m *= 1 + RELIC_RULES.compass.dmg * b.bearings.length;
  }
  if (b.momentumT > 0) m *= 1.15;
  if (b.party && b.party.resonanceT > 0) m *= 1.2;   // team Resonance (both fighters transformed together)
  if (b.marks.length && b.marks.some(k => k.enemy === e.id && k.src === 'vuln')) m *= 1.3;
  return dmg * m;
}
export function b22PostDamage(s: GameState, e: Enemy, dmg: number, o?: HitOpts): void {
  if (o?.fx || dmg <= 0) return;
  const b = s.b22, slot = b.ctxSlot ?? slotOfAct(s), form = activeForm(s);
  if (b.hits.length < 64) b.hits.push({ id: e.id, dmg, slot, x: e.x, y: e.y });
  if (form) { bump(b, `hit.${form}`); if (e.hp <= 0 && !e.part && e.kind !== 'halo_sigil') bump(b, `kill.${form}`); }
  chargeUltimate(s, dmg);
  if (b.relics.includes('halo_prism') && dmg >= s.player.attackDamage * RELIC_RULES.prism.heavy) {
    b.prismCount++;
    if (b.prismCount % RELIC_RULES.prism.every === 0 && s.time - b.prismAt >= RELIC_RULES.prism.gap) {
      let t: Enemy | null = null, bd = RELIC_RULES.prism.range ** 2;
      for (const o2 of s.enemies) { if (o2 === e || o2.hp <= 0 || o2.ai?.invuln || o2.part?.role === 'decoy') continue; const d = (o2.x - e.x) ** 2 + (o2.y - e.y) ** 2; if (d < bd) { bd = d; t = o2; } }
      if (t) { b.prismAt = s.time; damageEnemy(s, t, dmg * RELIC_RULES.prism.share, { area: true, fx: true }); b22Emit(b, 'prism', e.x, e.y, { x2: t.x, y2: t.y }); }
    }
  }
  onHitLogged(s, e, dmg, slot);
  if (o?.proj && s.hero === 'sora' && !slot) onNeedleHit(s, e, dmg);
  void isBoss;
}

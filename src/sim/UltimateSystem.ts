/** B22 Ascension Protocol: one earned ultimate per hero. R becomes the ULTIMATE while the gauge is full (the HUD says so; nothing is keyboard-only, a pad's R button does the same). Real cooldown (60 s), a charge earned by dealing damage, a lockout, and per-hero timelines built from the bounded primitives in BranchSystem. */
import type { Enemy, GameState } from './GameState';
import { areaFx, lineFx, schedule } from './BranchSystem';
import { ULTIMATES, ULTIMATE_RULES } from '../b22/mastery';
import { b22Emit, bump } from '../b22/state';
import { slideMove } from './CollisionSystem';
import { isBoss } from '../content/enemies';
import { normalize } from '../core/Math';
import { damageEnemy } from './CombatSystem';
import { emit, nearest } from './HeroSystem';
import { freeAim } from './ApexSystem';

const alive = (e: Enemy) => e.hp > 0;
const q = (s: GameState) => s.player.qDamage;
export const ultReady = (s: GameState) => s.b22.ult.unlocked && s.b22.ult.charge >= ULTIMATE_RULES.max - 1e-6 && s.b22.ult.cd <= 0 && !s.b22.ult.act;
export const ultActive = (s: GameState) => !!s.b22.ult.act;
/** Unlock: the Ascension path must have started (one branch chosen) and the run must have reached the unlock level. */
export function updateUltimateUnlock(s: GameState) {
  const u = s.b22.ult; if (u.unlocked) return;
  if (s.player.level >= ULTIMATE_RULES.unlockLevel && s.b22.branches.length >= ULTIMATE_RULES.needsBranches) { u.unlocked = true; s.announce = { id: 'ultimate', text: `${ULTIMATES[s.hero].name.toUpperCase()} READY TO CHARGE`, sub: 'Fill the gauge, then press R', at: s.time }; }
}
export function chargeUltimate(s: GameState, dmg: number) { const u = s.b22.ult; if (!u.unlocked || u.act || u.cd > 0) return; u.charge = Math.min(ULTIMATE_RULES.max, u.charge + dmg * ULTIMATE_RULES.chargePerDamage + ULTIMATE_RULES.chargePerHit); }
const aimOf = (s: GameState, range: number) => {
  const p = s.player, fa = freeAim(s); if (fa) return { x: fa.x, y: fa.y };
  const t = nearest(s, range); if (t) { const d = normalize(t.x - p.x, t.y - p.y); if (d.x || d.y) return d; }
  return normalize(p.aimX, p.aimY);
};
export function startUltimate(s: GameState): boolean {
  if (!ultReady(s) || s.phase !== 'running' || s.cinema || s.player.hp <= 0 || s.player.dashRemaining > 0 || s.hx.act || s.cast) return false;
  const p = s.player, d = aimOf(s, 600), def = ULTIMATES[s.hero];
  const dur = s.hero === 'kai' ? 2.5 : s.hero === 'ren' ? 2.4 : s.hero === 'sora' ? 2.6 : 2.2;
  const t = nearest(s, 380); const tx = t?.x ?? p.x + d.x * 180, ty = t?.y ?? p.y + d.y * 180;
  s.b22.ult.act = { id: def.id, t: 0, dur, dirX: d.x, dirY: d.y, tx, ty, step: 0, hits: [] }; s.b22.ult.charge = 0; s.b22.ult.cd = def.cooldown;
  p.invulnerable = Math.max(p.invulnerable, 0.3); bump(s.b22, 'ult.cast');
  emit(s, 'ult_start', p.x, p.y); b22Emit(s.b22, 'ult_start', p.x, p.y, { tag: def.id }); return true;
}
const ultHit = (s: GameState, e: Enemy, dmg: number) => damageEnemy(s, e, isBoss(e.kind) ? Math.min(dmg, e.maxHp * 0.08) : dmg, { area: true, fx: true });
export function updateUltimate(s: GameState, dt: number) {
  const u = s.b22.ult; u.cd = Math.max(0, u.cd - dt); const a = u.act; if (!a) return;
  const p = s.player, before = a.t; a.t += dt; const at = (x: number) => before < x && a.t >= x, rel = (kind: string, n: number) => { emit(s, 'ult_release', p.x, p.y, n); b22Emit(s.b22, kind, a.tx, a.ty, { n }); };
  if (s.hero === 'kai') {
    if (at(0.5)) { areaFx(s, a.tx, a.ty, 110, q(s) * 1.5, 60, 0.4, 10, 'ult_strike'); rel('ult_strike', 0); }
    if (at(0.9)) { areaFx(s, a.tx, a.ty, 150, q(s) * 2.0, 80, 0.5, 12, 'ult_strike'); rel('ult_strike', 1); }
    if (at(1.3)) { areaFx(s, a.tx, a.ty, 190, q(s) * 2.6, 100, 0.6, 14, 'ult_strike'); rel('ult_strike', 2); }
    if (at(1.7)) { lineFx(s, p.x, p.y, p.x + a.dirX * 720, p.y + a.dirY * 720, 120, q(s) * 4.0, 10, 'ult_cannon'); rel('ult_cannon', 3); }
  } else if (s.hero === 'ren') {
    if (a.step === 0 && a.t >= 0.35) {   // the charge: a real contact decides the payoff
      a.step = 1; let target: Enemy | null = null, bd = 330 * 330; for (const e of s.enemies) if (alive(e) && !e.part) { const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; target = e; } }
      if (target) { const d = normalize(target.x - p.x, target.y - p.y), dist = Math.min(300, Math.hypot(target.x - p.x, target.y - p.y) - target.radius - p.radius); slideMove(p, d.x * dist * 8, d.y * dist * 8, 0.125); if (Math.hypot(target.x - p.x, target.y - p.y) < target.radius + p.radius + 40) { ultHit(s, target, q(s) * 1.2); a.hits.push(target.id); } a.tx = p.x; a.ty = p.y; }
      else { slideMove(p, a.dirX * 140 * 8, a.dirY * 140 * 8, 0.125); a.tx = p.x; a.ty = p.y; a.dur += 0.8; }   // a miss leaves you committed and open
      rel('ult_charge', a.hits.length);
    }
    if (a.step === 1 && a.t >= 0.95) { a.step = 2; const contact = a.hits.length > 0; areaFx(s, a.tx, a.ty, contact ? 200 : 150, q(s) * (contact ? 4.5 : 2.3), contact ? 220 : 120, 1.0, 16, 'ult_collapse'); rel('ult_collapse', contact ? 1 : 0); }
  } else if (s.hero === 'sora') {
    if (a.t < 1.0) { const d = aimOf(s, 760); a.dirX = d.x; a.dirY = d.y; }   // aim tracks while the orbits arrange, then locks
    if (at(1.0)) rel('ult_lock', 0);
    if (at(1.4)) { lineFx(s, p.x, p.y, p.x + a.dirX * 820, p.y + a.dirY * 820, 96, q(s) * 5.5, 14, 'ult_beam'); rel('ult_beam', 1); }
  } else {
    if (at(0.3)) {
      let bosses = 0; const c = s.enemies.filter(e => alive(e) && !e.part && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 440 ** 2).sort((x, y) => (x.x - p.x) ** 2 + (x.y - p.y) ** 2 - ((y.x - p.x) ** 2 + (y.y - p.y) ** 2));
      for (const e of c) { if (a.hits.length >= 6) break; if (isBoss(e.kind)) { if (bosses) continue; bosses++; } a.hits.push(e.id); b22Emit(s.b22, 'mark', e.x, e.y, { n: e.id }); }
      rel('ult_mark', a.hits.length);
    }
    if (a.t >= 0.9) {
      const idx = Math.floor((a.t - 0.9) / 0.12), timed = s.time - (s.b22.vex.parryCd ?? -99) < 3 || s.time - (s.b22.vex.riposteT ?? -99) < 3;
      while (a.step <= idx && a.step < a.hits.length) { const e = s.enemies.find(x => x.id === a.hits[a.step] && alive(x)); if (e) { ultHit(s, e, q(s) * 2.2 * (timed ? 1.6 : 1)); b22Emit(s.b22, 'ult_judge', e.x, e.y, { n: timed ? 1 : 0 }); emit(s, 'ult_release', e.x, e.y, timed ? 1 : 0); } a.step++; }
    }
  }
  if (a.t >= a.dur) { u.act = null; emit(s, 'ult_end', p.x, p.y); p.invulnerable = Math.max(0, p.invulnerable); }
}
void schedule;

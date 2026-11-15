import type { AbilityEventKind, GameState } from './GameState';
import { RULES } from '../core/Rules';
import { COMET } from '../content/cometheart';
import { isBoss } from '../content/enemies';
import { slideMove } from './CollisionSystem';

function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n });
  if (s.abilityEvents.length > 24) s.abilityEvents.splice(0, s.abilityEvents.length - 24);
}
/** Which form F would start right now, or null: Cometheart needs the unlock and a FULL Drive gauge, Flarebound the usual 65 %. */
export function formReady(state: GameState): 1 | 2 | null {
  const p = state.player;
  if (state.phase !== 'running' || state.cinema || p.formCooldown > 0 || p.hp <= 0) return null;
  if (state.cometUnlocked && p.form !== 2 && p.drive >= COMET.charge - 1e-6) return 2;
  if (p.form === 0 && p.drive >= RULES.formCharge) return 1;
  return null;
}
export function activateForm(state: GameState) {
  const p = state.player; const which = formReady(state); if (!which) return false;
  if (which === 1) {
    p.form = 1; p.invulnerable = Math.max(p.invulnerable, 0.5);
    state.impacts.push({ id: state.nextId++, kind: 'form', x: p.x, y: p.y, ttl: 0.5, life: 0.5 });
    return true;
  }
  // Cometheart: the whole sim freezes for the reveal; the form itself commits at `commitAt` so the art, the stats and the flash agree.
  const first = state.cometSeen === 0, c = first ? COMET.cinemaFirst : COMET.cinemaRepeat;
  state.cinema = { t: 0, dur: c.dur, breakAt: c.breakAt, commitAt: c.commitAt, first, from: p.form, broke: false, committed: false };
  state.cast = null; state.sphere = null; p.dashRemaining = 0; 
  emit(state, 'form2_start', p.x, p.y, first ? 1 : 0);
  return true;
}
/** One frozen-world tick of the cinematic. Nothing else in the sim advances while this runs (see Simulation.step). */
export function updateCinema(s: GameState, dt: number) {
  const c = s.cinema; if (!c) return; const p = s.player;
  c.t += dt;
  if (!c.broke && c.t >= c.breakAt) {
    c.broke = true; emit(s, 'form2_break', p.x, p.y);
    for (const e of s.enemies) {
      if (e.hp <= 0 || isBoss(e.kind)) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > COMET.knockRadius + e.radius) continue;
      const k = 1 - d / (COMET.knockRadius + e.radius) * 0.6, dir = d < 1 ? { x: 0, y: 1 } : { x: dx / d, y: dy / d };
      for (let i = 0; i < 5; i++) slideMove(e, dir.x * COMET.knockPush * k * 4, dir.y * COMET.knockPush * k * 4, 0.05);
      e.stagger = Math.max(e.stagger, COMET.stagger);
    }
  }
  if (!c.committed && c.t >= c.commitAt) { c.committed = true; p.form = 2; p.drive = 100; emit(s, 'form2_commit', p.x, p.y); }
  if (c.t >= c.dur - 1e-9) { if (!c.committed) { c.committed = true; p.form = 2; p.drive = 100; } s.cinema = null; s.cometSeen++; p.invulnerable = Math.max(p.invulnerable, 0.5); }
}
export function endForm2(s: GameState) { const p = s.player; emit(s, 'form2_end', p.x, p.y); p.form = 0; p.formCooldown = COMET.cooldown * s.mods.formCd; }

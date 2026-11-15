import type { AbilityEventKind, GameState } from './GameState';
import { RULES } from '../core/Rules';
import { COMET } from '../content/cometheart';
import { APEX } from '../content/stillfire';
import { isBoss } from '../content/enemies';
import { slideMove } from './CollisionSystem';
import { cancelCast } from './AbilitySystem';

function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n });
  if (s.abilityEvents.length > 24) s.abilityEvents.splice(0, s.abilityEvents.length - 24);
}
/** Every form F could start right now (ascending). Flarebound needs 65 % Drive, Cometheart a FULL gauge after the Warden, Stillfire Apex a FULL gauge after the 10:00 mark when the save has it. */
export function formChoices(state: GameState): (1 | 2 | 3)[] {
  const p = state.player; const r: (1 | 2 | 3)[] = [];
  if (state.phase !== 'running' || state.cinema || p.formCooldown > 0 || p.hp <= 0) return r;
  if (p.form === 0 && p.drive >= RULES.formCharge) r.push(1);
  if (state.cometUnlocked && p.form < 2 && p.drive >= COMET.charge - 1e-6) r.push(2);
  if (state.apexUnlocked && p.form !== 3 && state.time >= state.apexGate && p.drive >= APEX.charge - 1e-6) r.push(3);
  return r;
}
/** The forms a plain tap can pick between: Flarebound drops out when a full-Drive form is available (the B12 rule), but stays in the selector. */
const primary = (c: (1 | 2 | 3)[]) => (c.some(f => f > 1) ? c.filter(f => f > 1) : c);
/** The form a tap would start: the explicit pick if it is ready, else the highest ready one; null if nothing is ready. */
export function selectedForm(state: GameState): 1 | 2 | 3 | null {
  const c = formChoices(state); if (!c.length) return null; const pk = state.selector.pick;
  return (pk && c.includes(pk) ? pk : primary(c).at(-1)) as 1 | 2 | 3;
}
/** Legacy single-form query kept for the HUD / tests: the form F starts if there is no choice to make. */
export function formReady(state: GameState): 1 | 2 | 3 | null { return selectedForm(state); }
export function activateForm(state: GameState, want?: 1 | 2 | 3) {
  const p = state.player; const which = want && formChoices(state).includes(want) ? want : selectedForm(state); if (!which) return false;
  state.selector.pick = which; state.selector.open = false;
  if (which === 1) {
    p.form = 1; p.invulnerable = Math.max(p.invulnerable, 0.5);
    state.impacts.push({ id: state.nextId++, kind: 'form', x: p.x, y: p.y, ttl: 0.5, life: 0.5 });
    return true;
  }
  // Cometheart / Stillfire Apex: the whole sim freezes for the reveal; the form itself commits at `commitAt` so the art, the stats and the effects agree.
  const apex = which === 3, first = (apex ? state.apexSeen : state.cometSeen) === 0, c = apex ? (first ? APEX.cinemaFirst : APEX.cinemaRepeat) : (first ? COMET.cinemaFirst : COMET.cinemaRepeat);
  state.cinema = { t: 0, dur: c.dur, breakAt: c.breakAt, commitAt: c.commitAt, first, from: p.form, to: which, broke: false, committed: false };
  state.cast = null; state.sphere = null; p.dashRemaining = 0; p.vx = 0; p.vy = 0;
  emit(state, apex ? 'form3_start' : 'form2_start', p.x, p.y, first ? 1 : 0);
  return true;
}
/** Seconds the selector may stay open before it cancels itself (the sim is frozen meanwhile). */
export const SELECTOR_MAX = 4;
/** F: one ready form starts at once; several open the selector immediately (the sim freezes while it is open). A press while it is open confirms the highlighted card, so a quick double-tap of F starts the remembered form. Only press edges matter. */
export function formInput(s: GameState, down: boolean, wasDown: boolean) {
  if (!down || wasDown) return;
  const c = formChoices(s); if (!c.length) return;
  if (s.selector.open) { activateForm(s, s.selector.pick || undefined); return; }
  if (c.length === 1) { activateForm(s); return; }
  s.selector.open = true; s.selector.held = 0; s.selector.step = 0; s.selector.pick = selectedForm(s) ?? c.at(-1)!;
}
export interface SelectorCmd { pick?: number; move?: number; confirm?: boolean; cancel?: boolean; fEdge?: boolean }
/** One tick while the selector is open: only its own input runs, the run itself does not advance. */
export function updateSelector(s: GameState, dt: number, cmd: SelectorCmd) {
  const sel = s.selector, c = formChoices(s);
  if (c.length < 2) { sel.open = false; return; }
  sel.held += dt;
  if (cmd.cancel || sel.held >= SELECTOR_MAX) { sel.open = false; return; }
  if (cmd.pick && cmd.pick >= 1 && cmd.pick <= c.length) { activateForm(s, c[cmd.pick - 1]); return; }
  if (cmd.move) { const cur = Math.max(0, c.indexOf(sel.pick as 1 | 2 | 3)); sel.pick = c[(cur + (cmd.move > 0 ? 1 : -1) + c.length) % c.length]; sel.held = 0; }
  if (cmd.confirm || cmd.fEdge) activateForm(s, sel.pick || undefined);
}
/** One frozen-world tick of the cinematic. Nothing else in the sim advances while this runs (see Simulation.step). */
export function updateCinema(s: GameState, dt: number) {
  const c = s.cinema; if (!c) return; const p = s.player; const apex = c.to === 3, K = apex ? APEX : COMET;
  const ev = (a: 'break' | 'commit') => (apex ? (a === 'break' ? 'form3_break' : 'form3_commit') : (a === 'break' ? 'form2_break' : 'form2_commit')) as AbilityEventKind;
  c.t += dt;
  if (apex && c.first && !c.broke && c.t >= 0.9 && c.t - dt < 0.9) emit(s, 'form3_omen', p.x, p.y);
  if (!c.broke && c.t >= c.breakAt) {
    c.broke = true; emit(s, ev('break'), p.x, p.y);
    for (const e of s.enemies) {
      if (e.hp <= 0 || isBoss(e.kind)) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > K.knockRadius + e.radius) continue;
      const k = 1 - d / (K.knockRadius + e.radius) * 0.6, dir = d < 1 ? { x: 0, y: 1 } : { x: dx / d, y: dy / d };
      for (let i = 0; i < 5; i++) slideMove(e, dir.x * K.knockPush * k * 4, dir.y * K.knockPush * k * 4, 0.05);
      e.stagger = Math.max(e.stagger, K.stagger);
    }
  }
  if (!c.committed && c.t >= c.commitAt) { c.committed = true; p.form = c.to; p.drive = 100; emit(s, ev('commit'), p.x, p.y); }
  if (c.t >= c.dur - 1e-9) { if (!c.committed) { c.committed = true; p.form = c.to; p.drive = 100; } s.cinema = null; if (apex) s.apexSeen++; else s.cometSeen++; p.invulnerable = Math.max(p.invulnerable, 0.5); }
}
export function endForm2(s: GameState) { const p = s.player; emit(s, 'form2_end', p.x, p.y); p.form = 0; p.formCooldown = COMET.cooldown * s.mods.formCd; }
export function endForm3(s: GameState) {
  const p = s.player; emit(s, 'form3_end', p.x, p.y); p.form = 0; p.formCooldown = APEX.cooldown * s.mods.formCd; p.vx = 0; p.vy = 0;
  if (s.cast && s.cast.kind === 'rift' && !s.cast.released) cancelCast(s);   // an unreleased charge dies with the form (its cooldown stays spent)
}

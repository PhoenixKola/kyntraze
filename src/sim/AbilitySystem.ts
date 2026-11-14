import type { AbilityEventKind, Cast, Face, GameState, InputState, SphereShot } from './GameState';
import { BEAM, SPHERE } from '../content/abilities';
import { damageEnemy } from './CombatSystem';
import { blocked, slideMove } from './CollisionSystem';
import { clamp, normalize } from '../core/Math';
import { BEAM_MUZZLE, SPHERE_RELEASE } from '../content/handAnchors';
import { KAI_GROUND_DY, KAI_SCALE } from '../assets/kaiAnimation';

const EVENT_CAP = 24;
function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n });
  if (s.abilityEvents.length > EVENT_CAP) s.abilityEvents.splice(0, s.abilityEvents.length - EVENT_CAP);
}
/** Seconds into the cast at which the ability is released (beam fires / sphere is thrown). */
export const releaseTime = (kind: Cast['kind']) => (kind === 'beam' ? BEAM.charge : SPHERE.gather);
export const castDuration = (kind: Cast['kind']) => (kind === 'beam' ? BEAM.charge + BEAM.fire + BEAM.recover : SPHERE.gather + SPHERE.recover);
const BEAM_PULSES = Math.round(BEAM.fire / BEAM.pulseEvery);

/** Movement scale while casting (1 when free). */
export function castMoveScale(s: GameState): number {
  const c = s.cast; if (!c) return 1;
  if (c.kind === 'beam') return c.t < BEAM.charge ? BEAM.moveScaleCharge : c.t < BEAM.charge + BEAM.fire ? BEAM.moveScaleFire : BEAM.moveScaleRecover;
  return c.t < SPHERE.gather ? SPHERE.moveScaleGather : SPHERE.moveScaleRecover;
}

/** Remember the facing from real movement input; it is the aim for both abilities. */
export function trackAim(s: GameState, input: InputState) {
  const d = normalize(input.x, input.y); if (d.x !== 0 || d.y !== 0) { s.player.aimX = d.x; s.player.aimY = d.y; }
}

function beamLength(x: number, y: number, dx: number, dy: number, max: number): number {
  for (let d = 0; d <= max; d += 8) if (blocked(x + dx * d, y + dy * d, 0)) return Math.max(0, d - 8);
  return max;
}
const AXIS: Record<Face, [number, number]> = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] };
/** Cardinal sprite facing for a direction: horizontal wins ties (the same rule the renderer used before B05.1). */
export const faceOf = (dx: number, dy: number): Face => (Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'east' : 'west') : (dy >= 0 ? 'south' : 'north'));
/** Rotate the aim toward the facing axis until it is within `max` rad of it. */
export function clampToFace(dx: number, dy: number, face: Face, max: number) {
  const [ax, ay] = AXIS[face]; const n = normalize(dx, dy); const a = Math.atan2(ax * n.y - ay * n.x, ax * n.x + ay * n.y);   // signed angle axis -> aim
  if (Math.abs(a) <= max) return n;
  const t = Math.sign(a) * max; const c = Math.cos(t), s2 = Math.sin(t); return { x: ax * c - ay * s2, y: ax * s2 + ay * c };
}
const worldPoint = (s: GameState, pt: { x: number; y: number }) => ({ x: s.player.x + pt.x * KAI_SCALE, y: s.player.y + KAI_GROUND_DY + pt.y * KAI_SCALE });
/** Where the two fists meet at release, in world px: the sim lane and the thrown sphere start here (table generated from the exported sprite anchors). */
export const beamOrigin = (s: GameState, c: Cast) => worldPoint(s, BEAM_MUZZLE[c.form ? 'f1' : 'base'][c.face]);
export const sphereOrigin = (s: GameState, c: Cast) => worldPoint(s, SPHERE_RELEASE[c.form ? 'f1' : 'base'][c.face]);

function pickAim(s: GameState): { x: number; y: number } {
  const p = s.player; const base = normalize(p.aimX, p.aimY);
  let best: { x: number; y: number } | null = null; let bestD = Infinity;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 1 || d > BEAM.length) continue;
    const v = { x: (e.x - p.x) / d, y: (e.y - p.y) / d };
    if (v.x * base.x + v.y * base.y < BEAM.aimAssistCos) continue;
    if (d < bestD) { bestD = d; best = v; }
  }
  return best ?? base;
}

function pickSphereTarget(s: GameState): { x: number; y: number } {
  const p = s.player; let best: { x: number; y: number } | null = null; let bestScore = -Infinity;
  const near = s.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= SPHERE.maxRange);
  for (const e of near) {
    let n = 0; for (const o of near) if (Math.hypot(o.x - e.x, o.y - e.y) <= SPHERE.clusterRadius) n++;
    const score = n * 1000 - Math.hypot(e.x - p.x, e.y - p.y);
    if (score > bestScore) { bestScore = score; best = { x: e.x, y: e.y }; }
  }
  if (best) return best;
  const d = normalize(p.aimX, p.aimY); let r = SPHERE.defaultRange;
  while (r > 0 && blocked(p.x + d.x * r, p.y + d.y * r, 8)) r -= 10;
  return { x: p.x + d.x * r, y: p.y + d.y * r };
}

export function startAbility(s: GameState, kind: Cast['kind']): boolean {
  const p = s.player;
  if (s.phase !== 'running' || s.cast || p.dashRemaining > 0 || p.hp <= 0) return false;
  if (kind === 'beam' ? p.beamCooldown > 0 : p.sphereCooldown > 0) return false;
  const tg = kind === 'sphere' ? pickSphereTarget(s) : null;
  const raw = tg ? normalize(tg.x - p.x, tg.y - p.y) : pickAim(s);
  const aim = raw.x === 0 && raw.y === 0 ? normalize(p.aimX, p.aimY) : raw; const face = faceOf(aim.x, aim.y);
  const dir = kind === 'beam' ? clampToFace(aim.x, aim.y, face, BEAM.maxAimOffset) : aim;
  if (kind === 'beam') p.beamCooldown = BEAM.cooldown; else p.sphereCooldown = SPHERE.cooldown;
  s.cast = { id: s.nextId++, kind, face, t: 0, dirX: dir.x, dirY: dir.y, form: p.form, released: false, pulses: 0, len: 0, tx: tg?.x ?? p.x, ty: tg?.y ?? p.y };
  emit(s, kind === 'beam' ? 'beam_charge' : 'sphere_gather', p.x, p.y);
  return true;
}

/** End the cast now (dash, or a hit before release). The cooldown stays spent. */
export function cancelCast(s: GameState) {
  if (!s.cast) return; emit(s, 'cast_cancel', s.player.x, s.player.y); s.cast = null;
}
/** A hit interrupts only the wind-up; once released the attack always completes. */
export function interruptOnHit(s: GameState) { if (s.cast && !s.cast.released) cancelCast(s); }

function beamPulse(s: GameState, c: Cast) {
  const o = beamOrigin(s, c); let hits = 0; const hw = BEAM.halfWidth * (c.form ? BEAM.formWidth : 1); const dmg = BEAM.damage * (c.form ? BEAM.formDamage : 1);
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const ex = e.x - o.x, ey = e.y - o.y; const along = ex * c.dirX + ey * c.dirY;
    if (along < -e.radius || along > c.len + e.radius) continue;
    if (Math.abs(ex * -c.dirY + ey * c.dirX) > hw + e.radius) continue;
    damageEnemy(s, e, dmg); hits++;
    if (e.hp > 0) slideMove(e, c.dirX * BEAM.knockback * 60, c.dirY * BEAM.knockback * 60, 1 / 60);
  }
  emit(s, 'beam_pulse', o.x + c.dirX * c.len, o.y + c.dirY * c.len, hits);
}

function detonate(s: GameState, sh: SphereShot) {
  const radius = SPHERE.radius * (sh.form ? SPHERE.formRadius : 1); const dmg = SPHERE.damage * (sh.form ? SPHERE.formDamage : 1);
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - sh.x1, dy = e.y - sh.y1; const d = Math.hypot(dx, dy);
    if (d > radius + e.radius) continue;
    const fall = 1 - (1 - SPHERE.edgeFalloff) * clamp(d / radius, 0, 1);
    if (!damageEnemy(s, e, dmg * fall)) {
      const dir = d < 1 ? { x: 0, y: 1 } : { x: dx / d, y: dy / d };
      for (let i = 0; i < 4; i++) slideMove(e, dir.x * SPHERE.knockback * fall, dir.y * SPHERE.knockback * fall, 0.25);
    }
  }
  s.blasts.push({ id: s.nextId++, x: sh.x1, y: sh.y1, radius, form: sh.form, ttl: 0.9, life: 0.9 });
  emit(s, 'sphere_burst', sh.x1, sh.y1);
}

export function updateAbilities(s: GameState, dt: number) {
  const p = s.player;
  p.beamCooldown = Math.max(0, p.beamCooldown - dt); p.sphereCooldown = Math.max(0, p.sphereCooldown - dt);
  for (const b of s.blasts) b.ttl -= dt;
  s.blasts = s.blasts.filter(b => b.ttl > 0);
  const sh = s.sphere;
  if (sh) { sh.t += dt; if (sh.t >= SPHERE.flight) { s.sphere = null; detonate(s, sh); } }
  const c = s.cast; if (!c) return;
  const before = c.t; c.t += dt;
  if (c.kind === 'beam') {
    if (!c.released && c.t >= BEAM.charge - 1e-9) {
      c.released = true; const o = beamOrigin(s, c); c.len = beamLength(o.x, o.y, c.dirX, c.dirY, BEAM.length); emit(s, 'beam_fire', o.x, o.y);
    }
    if (c.released) {
      const due = Math.min(BEAM_PULSES, Math.floor((c.t - BEAM.charge) / BEAM.pulseEvery + 1e-9) + 1);   // pulse 0 lands on the release tick
      while (c.pulses < due) { c.pulses++; beamPulse(s, c); }
      if (before < BEAM.charge + BEAM.fire && c.t >= BEAM.charge + BEAM.fire) emit(s, 'beam_end', p.x, p.y);
    }
  } else if (!c.released && c.t >= SPHERE.gather - 1e-9) {
    c.released = true; const o = sphereOrigin(s, c);
    s.sphere = { id: s.nextId++, x0: o.x, y0: o.y, x1: c.tx, y1: c.ty, t: 0, form: c.form };
    emit(s, 'sphere_launch', o.x, o.y);
  }
  if (c.t >= castDuration(c.kind) - 1e-9) s.cast = null;
}

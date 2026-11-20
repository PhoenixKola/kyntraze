import type { AbilityEventKind, Cast, Face, GameState, InputState, SphereShot } from './GameState';
import { BEAM, SPHERE } from '../content/abilities';
import { damageEnemy } from './CombatSystem';
import { blocked, slideMove } from './CollisionSystem';
import { clamp, normalize } from '../core/Math';
import { BEAM_MUZZLE, SPHERE_RELEASE, PUNCH_FIST } from '../content/handAnchors';
import { CANNON, CARRY, DRAGON } from '../content/cometheart';
import { isBoss } from '../content/enemies';
import { KAI_GROUND_DY, KAI_SCALE } from '../assets/kaiAnimation';
import { RIFT, REVERSAL } from '../content/stillfire';
import { cancelHero, heroMoveScale, heroStartE, heroStartR, interruptHero } from './HeroSystem';
import { startRift, startReversal, updateRift, updateReversal, trackFreeAim, freeAim } from './ApexSystem';
import { crucibleR, flareE, isKitKind, kaiMoveScale, updateKaiKit } from './KaiKit';
import { STRIKES } from '../content/kaiKit';
import { SIG } from '../content/kaiCombat';
import { updateKaiCombat } from './KaiCombat';

const EVENT_CAP = 24;
function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n });
  if (s.abilityEvents.length > EVENT_CAP) s.abilityEvents.splice(0, s.abilityEvents.length - EVENT_CAP);
}
/** Seconds into the cast at which the ability is released (beam fires / sphere is thrown). */
export const releaseTime = (kind: Cast['kind']) => (kind === 'rift' ? RIFT.minCharge : kind === 'reversal' ? REVERSAL.lead : kind === 'beam' ? BEAM.charge : kind === 'sphere' ? SPHERE.gather : kind === 'dragon' ? DRAGON.windup : CANNON.gather);
export const castDuration = (kind: Cast['kind']) => (kind === 'rift' ? RIFT.maxCharge + RIFT.fire[2] + RIFT.recover : kind === 'reversal' ? REVERSAL.lead + REVERSAL.recover + 2 : kind === 'beam' ? BEAM.charge + BEAM.fire + BEAM.recover : kind === 'sphere' ? SPHERE.gather + SPHERE.recover : kind === 'dragon' ? DRAGON.windup + DRAGON.lunge + DRAGON.recover : CANNON.gather + CANNON.fire + CANNON.recover);
const FORM_KEY = ['base', 'f1', 'f2', 'f3'] as const;
/** Anchor table lookup that falls back to Form II until the Form III anchors exist for a table/facing. */
const anchor = <T extends Record<string, Record<Face, { x: number; y: number }>>>(t: T, form: number, face: Face) => ((t as Record<string, Record<Face, { x: number; y: number }> | undefined>)[FORM_KEY[form]] ?? t.f2)[face];
const BEAM_PULSES = Math.round(BEAM.fire / BEAM.pulseEvery);
const BEAM_PULSES_MAX = BEAM_PULSES + Math.round(BEAM.recover / BEAM.pulseEvery);

/** Movement scale while casting (1 when free). */
export function castMoveScale(s: GameState): number {
  if (s.hero !== 'kai') return heroMoveScale(s);
  const c = s.cast; if (!c) return 1;
  if (c.kind === 'signature') return c.released ? SIG.moveScaleRelease : SIG.moveScaleCharge;
  if (isKitKind(c.kind)) return kaiMoveScale(c);
  if (c.kind === 'rift') return !c.released ? RIFT.moveScaleCharge : (c.rt ?? 0) < RIFT.fire[c.tier ?? 0] ? RIFT.moveScaleFire : RIFT.moveScaleRecover;
  if (c.kind === 'reversal') return REVERSAL.moveScale;
  if (c.kind === 'dragon') return c.t < DRAGON.windup ? DRAGON.moveScaleWindup : c.t < DRAGON.windup + DRAGON.lunge ? 0 : DRAGON.moveScaleRecover;
  if (c.kind === 'comet') return c.t < CANNON.gather ? CANNON.moveScaleGather : c.t < c.dur - CANNON.recover ? CANNON.moveScaleFire : CANNON.moveScaleRecover;
  if (c.kind === 'beam') return c.t < BEAM.charge ? BEAM.moveScaleCharge : c.t < BEAM.charge + BEAM.fire ? BEAM.moveScaleFire : BEAM.moveScaleRecover;
  return c.t < SPHERE.gather ? SPHERE.moveScaleGather : SPHERE.moveScaleRecover;
}

/** Remember the facing from real movement input; it is the aim for both abilities. */
export function trackAim(s: GameState, input: InputState) {
  trackFreeAim(s, input.aimX, input.aimY, input.aimSrc, input.aimDist);
  const d = normalize(input.x, input.y); if (d.x !== 0 || d.y !== 0) { s.player.aimX = d.x; s.player.aimY = d.y; }
}

export function beamLength(x: number, y: number, dx: number, dy: number, max: number): number {
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
/** World position of Kai's striking fist for an automatic attack facing `face` (the same exported contact anchors the Beam / Dragon use). */
export const fistWorld = (s: GameState, form: number, face: Face) => worldPoint(s, anchor(PUNCH_FIST, form, face));
export const punchOrigin = (s: GameState, c: Cast) => worldPoint(s, anchor(PUNCH_FIST, c.form, c.face));
const worldPoint = (s: GameState, pt: { x: number; y: number }) => ({ x: s.player.x + pt.x * KAI_SCALE, y: s.player.y + KAI_GROUND_DY + pt.y * KAI_SCALE });
/** Where the two fists meet at release, in world px: the sim lane and the thrown sphere start here (table generated from the exported sprite anchors). */
export const beamOrigin = (s: GameState, c: Cast) => worldPoint(s, anchor(BEAM_MUZZLE, c.form, c.face));
export const sphereOrigin = (s: GameState, c: Cast) => worldPoint(s, anchor(SPHERE_RELEASE, c.form, c.face));

function pickAim(s: GameState, range: number = BEAM.length, cosLimit: number = BEAM.aimAssistCos): { x: number; y: number } {
  const p = s.player; const base = normalize(p.aimX, p.aimY);
  let best: { x: number; y: number } | null = null; let bestD = Infinity;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 1 || d > range) continue;
    const v = { x: (e.x - p.x) / d, y: (e.y - p.y) / d };
    if (v.x * base.x + v.y * base.y < cosLimit) continue;
    if (d < bestD) { bestD = d; best = v; }
  }
  return best ?? base;
}

/** Nova Bloom with a free aim (pointer / right stick): the blast lands where the pointer is (or, on a stick, along the aim at the default range), pulled onto the densest enemy cluster right there; walls pull it back. */
function aimedSphereTarget(s: GameState, a: { x: number; y: number; d?: number }): { x: number; y: number } {
  const p = s.player; let r = clamp(a.d ?? SPHERE.defaultRange, 70, SPHERE.maxRange);
  while (r > 0 && blocked(p.x + a.x * r, p.y + a.y * r, 8)) r -= 10;
  const pt = { x: p.x + a.x * r, y: p.y + a.y * r }; let best: { x: number; y: number } | null = null; let bestScore = -Infinity;
  const near = s.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= SPHERE.maxRange + 40);
  for (const e of near) {
    const dp = Math.hypot(e.x - pt.x, e.y - pt.y); if (dp > SPHERE.clusterRadius * 0.9) continue;
    let n = 0; for (const o of near) if (Math.hypot(o.x - e.x, o.y - e.y) <= SPHERE.clusterRadius) n++;
    const score = n * 1000 - dp; if (score > bestScore) { bestScore = score; best = { x: e.x, y: e.y }; }
  }
  return best ?? pt;
}
function pickSphereTarget(s: GameState): { x: number; y: number } {
  const fa = freeAim(s); if (fa) return aimedSphereTarget(s, fa);
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

export function startAbility(s: GameState, key: 'beam' | 'sphere'): boolean {
  if (s.hero !== 'kai') return key === 'beam' ? heroStartE(s) : heroStartR(s);
  const p = s.player;
  if (key === 'sphere' && s.cast?.kind === 'reversal' && !s.cast.released && s.cast.t > STRIKES.escapeAfter + 0.3) { s.cast.nextAt = -1; return false; }   // R again ends the chain
  if (s.phase !== 'running' || s.cinema || s.cast || p.dashRemaining > 0 || p.hp <= 0) return false;
  if (p.form === 1) return key === 'beam' ? flareE(s) : crucibleR(s);   // B22: Rising Flare / Sunfall Crucible own E / R in Flarebound
  if (p.form === 3) return key === 'beam' ? startRift(s) : startReversal(s);   // B13: Silver Rift / Instinct Reversal own E / R in Stillfire Apex
  // B12: in Cometheart the E / R keys fire Dragonfang Rush / Cometbreaker Cannon (own cooldowns); Base / Flarebound keep Fracture Lance / Nova Bloom untouched
  const kind: Cast['kind'] = p.form === 2 ? (key === 'beam' ? 'dragon' : 'comet') : key;
  if (kind === 'dragon' ? p.dragonCooldown > 0 : kind === 'comet' ? p.cometCooldown > 0 : kind === 'beam' ? p.beamCooldown > 0 : p.sphereCooldown > 0) return false;
  const tg = kind === 'sphere' ? pickSphereTarget(s) : null;
  const fa = freeAim(s);   // pointer / right stick: the exact aim, any angle (the body keeps the nearest of its four facings)
  const raw = fa && kind !== 'sphere' ? { x: fa.x, y: fa.y } : tg ? normalize(tg.x - p.x, tg.y - p.y) : kind === 'comet' ? normalize(p.aimX, p.aimY) : pickAim(s, kind === 'dragon' ? DRAGON.aimRange : BEAM.length, kind === 'dragon' ? DRAGON.aimAssistCos : BEAM.aimAssistCos);
  const aim = raw.x === 0 && raw.y === 0 ? normalize(p.aimX, p.aimY) : raw; const face = faceOf(aim.x, aim.y);
  const dir = kind === 'sphere' || fa ? aim : clampToFace(aim.x, aim.y, face, kind === 'beam' ? BEAM.maxAimOffset : kind === 'dragon' ? DRAGON.maxAimOffset : CANNON.maxAimOffset);
  if (kind === 'beam') p.beamCooldown = BEAM.cooldown * s.mods.beamCd; else if (kind === 'sphere') p.sphereCooldown = SPHERE.cooldown * s.mods.sphereCd;
  else if (kind === 'dragon') p.dragonCooldown = DRAGON.cooldown * s.mods.beamCd; else p.cometCooldown = CANNON.cooldown * s.mods.sphereCd;
  s.cast = { id: s.nextId++, kind, face, t: 0, dirX: dir.x, dirY: dir.y, form: p.form, released: false, pulses: 0, len: 0, tx: tg?.x ?? p.x, ty: tg?.y ?? p.y, sx: p.x, sy: p.y, hits: [], dur: castDuration(kind), charge: 0, ax: p.aimX, ay: p.aimY };
  emit(s, kind === 'beam' ? 'beam_charge' : kind === 'sphere' ? 'sphere_gather' : kind === 'dragon' ? 'dragon_windup' : 'comet_gather', p.x, p.y);
  return true;
}

/** End the cast now (dash, or a hit before release). The cooldown stays spent. */
export function cancelCast(s: GameState) {
  if (s.hero !== 'kai') { cancelHero(s); return; }
  if (!s.cast) return; if (s.cast.kind === 'reversal') s.player.reversalCooldown = Math.max(s.player.reversalCooldown, REVERSAL.cooldown * s.mods.sphereCd);   // an escaped chain pays the full cooldown
  if (s.cast.kind === 'rift' && !s.cast.released) s.player.riftCooldown = Math.max(s.player.riftCooldown, RIFT.cancelCooldown * s.mods.beamCd);   // a cancelled charge is never free
  emit(s, 'cast_cancel', s.player.x, s.player.y); s.cast = null;
}
/** A hit interrupts only the wind-up; once released the attack always completes. */
export function interruptOnHit(s: GameState) { if (s.hero !== 'kai') { interruptHero(s); return; } if (s.cast && !s.cast.released) cancelCast(s); }

function beamPulse(s: GameState, c: Cast) {
  const o = beamOrigin(s, c); let hits = 0; const hold = Math.min(1, (c.charge ?? 0) / BEAM.holdMax), hw = BEAM.halfWidth * s.mods.beamWidth * (c.form ? BEAM.formWidth : 1) * (1 + 0.8 * hold); const dmg = BEAM.damage * s.mods.beamDamage * (c.form ? BEAM.formDamage * s.mods.formPower : 1) * (1 + 1.0 * hold);
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const ex = e.x - o.x, ey = e.y - o.y; const along = ex * c.dirX + ey * c.dirY;
    if (along < -e.radius || along > c.len + e.radius) continue;
    if (Math.abs(ex * -c.dirY + ey * c.dirX) > hw + e.radius) continue;
    damageEnemy(s, e, dmg); hits++;
    if (s.mods.beamDrive > 0 && s.player.form === 0) s.player.drive = Math.min(100, s.player.drive + s.mods.beamDrive * s.mods.driveGain);
    if (e.hp > 0) slideMove(e, c.dirX * BEAM.knockback * 60, c.dirY * BEAM.knockback * 60, 1 / 60);
  }
  emit(s, 'beam_pulse', o.x + c.dirX * c.len, o.y + c.dirY * c.len, hits);
}

function detonate(s: GameState, sh: SphereShot) {
  const radius = SPHERE.radius * s.mods.sphereRadius * (sh.form ? SPHERE.formRadius : 1); const dmg = SPHERE.damage * s.mods.sphereDamage * (sh.form ? SPHERE.formDamage * s.mods.formPower : 1);
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - sh.x1, dy = e.y - sh.y1; const d = Math.hypot(dx, dy);
    if (d > radius + e.radius) continue;
    const fall = 1 - (1 - SPHERE.edgeFalloff) * clamp(d / radius, 0, 1);
    if (!damageEnemy(s, e, dmg * fall, { area: true })) {
      const dir = d < 1 ? { x: 0, y: 1 } : { x: dx / d, y: dy / d };
      for (let i = 0; i < 4; i++) slideMove(e, dir.x * SPHERE.knockback * fall, dir.y * SPHERE.knockback * fall, 0.25);
    }
  }
  s.blasts.push({ id: s.nextId++, x: sh.x1, y: sh.y1, radius, form: sh.form, ttl: 0.9, life: 0.9 });
  emit(s, 'sphere_burst', sh.x1, sh.y1);
  if (s.mods.sphereEcho > 0) s.echoes.push({ id: s.nextId++, x: sh.x1, y: sh.y1, radius: radius * (s.mods.sphereEcho === 2 ? 1.1 : 0.85), damage: dmg * (s.mods.sphereEcho === 2 ? 1 : 0.5), form: sh.form, t: 0.85 });
}
function echoBurst(s: GameState, ec: GameState['echoes'][number]) {
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - ec.x, dy = e.y - ec.y, d = Math.hypot(dx, dy); if (d > ec.radius + e.radius) continue;
    const fall = 1 - (1 - SPHERE.edgeFalloff) * clamp(d / ec.radius, 0, 1);
    if (!damageEnemy(s, e, ec.damage * fall, { area: true })) { const dir = d < 1 ? { x: 0, y: 1 } : { x: dx / d, y: dy / d }; for (let i = 0; i < 4; i++) slideMove(e, dir.x * SPHERE.knockback * 0.6 * fall, dir.y * SPHERE.knockback * 0.6 * fall, 0.25); }
  }
  s.blasts.push({ id: s.nextId++, x: ec.x, y: ec.y, radius: ec.radius, form: ec.form, ttl: 0.9, life: 0.9 });
  emit(s, 'sphere_burst', ec.x, ec.y);
}

export function updateAbilities(s: GameState, dt: number) {
  const p = s.player;
  p.beamCooldown = Math.max(0, p.beamCooldown - dt); p.sphereCooldown = Math.max(0, p.sphereCooldown - dt); p.dragonCooldown = Math.max(0, p.dragonCooldown - dt); p.cometCooldown = Math.max(0, p.cometCooldown - dt); p.riftCooldown = Math.max(0, p.riftCooldown - dt); p.reversalCooldown = Math.max(0, p.reversalCooldown - dt); p.evadeCooldown = Math.max(0, p.evadeCooldown - dt);
  if (s.hero === 'kai') { updateKaiKit(s, dt); updateKaiCombat(s, dt); }
  for (const b of s.blasts) b.ttl -= dt;
  s.blasts = s.blasts.filter(b => b.ttl > 0);
  if (s.echoes.length) { for (const ec of s.echoes) ec.t -= dt; const due = s.echoes.filter(ec => ec.t <= 0); s.echoes = s.echoes.filter(ec => ec.t > 0); for (const ec of due) echoBurst(s, ec); }
  const sh = s.sphere;
  if (sh) { sh.t += dt; if (sh.t >= SPHERE.flight) { s.sphere = null; detonate(s, sh); } }
  const c = s.cast; if (!c || isKitKind(c.kind) || c.kind === 'signature') return;
  const before = c.t; c.t += dt;
  if (c.kind === 'beam' && !c.released) {   // Fracture Lance: holding E keeps the charge steerable until the last moment; letting go (or the hold limit) fires it
    const fa = freeAim(s);
    if (fa) { c.dirX = fa.x; c.dirY = fa.y; c.face = faceOf(fa.x, fa.y); }
    else if (p.aimX !== c.ax || p.aimY !== c.ay) { const d = normalize(p.aimX, p.aimY); c.ax = p.aimX; c.ay = p.aimY; c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); }
    if (c.t >= BEAM.charge - 1e-9 && s.eHeld && (c.charge ?? 0) < BEAM.holdMax) { c.charge = (c.charge ?? 0) + dt; c.t = BEAM.charge - 1e-6; }
  }
  if (c.kind === 'rift') { updateRift(s, c, dt); if (c.released && c.t >= c.dur - 1e-9) s.cast = null; return; }
  if (c.kind === 'reversal') { updateReversal(s, c); if (c.t >= c.dur - 1e-9) s.cast = null; return; }
  if (c.kind === 'dragon') updateDragon(s, c, dt); else if (c.kind === 'comet') updateComet(s, c, before);
  else if (c.kind === 'beam') {
    if (!c.released && c.t >= BEAM.charge - 1e-9) {
      c.released = true; const o = beamOrigin(s, c); c.len = beamLength(o.x, o.y, c.dirX, c.dirY, BEAM.length); emit(s, 'beam_fire', o.x, o.y);
    }
    if (c.released) {
      const due = Math.min(Math.min(BEAM_PULSES_MAX, BEAM_PULSES + s.mods.beamLinger), Math.floor((c.t - BEAM.charge) / BEAM.pulseEvery + 1e-9) + 1);   // pulse 0 lands on the release tick
      while (c.pulses < due) { c.pulses++; beamPulse(s, c); }
      if (before < BEAM.charge + BEAM.fire && c.t >= BEAM.charge + BEAM.fire) emit(s, 'beam_end', p.x, p.y);
    }
  } else if (!c.released && c.t >= SPHERE.gather - 1e-9) {
    c.released = true; const o = sphereOrigin(s, c);
    s.sphere = { id: s.nextId++, x0: o.x, y0: o.y, x1: c.tx, y1: c.ty, t: 0, form: c.form };
    emit(s, 'sphere_launch', o.x, o.y);
  }
  if (c.t >= c.dur - 1e-9) { if (c.kind === 'dragon') emit(s, 'dragon_end', p.x, p.y); else if (c.kind === 'comet' && c.released) emit(s, 'comet_end', p.x, p.y); s.cast = null; }
}

const easeOut = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 3;
const dragonReach = (s: GameState) => DRAGON.reach + CARRY.afterburnReach * s.mods.beamLinger;
/** Distance of the dragon's tip along the strike (from where Kai started) `tl` seconds after the release. */
export const dragonHead = (s: GameState, tl: number) => easeOut(tl / (DRAGON.lunge + 0.1)) * (dragonReach(s) + DRAGON.lungeDist) + 28;
/** Dragonfang Rush: wind-up, then Kai lunges while a dragon of gold energy runs out of the fist; every enemy in the lane is bitten once, in order of distance along the strike. */
function updateDragon(s: GameState, c: Cast, dt: number) {
  const p = s.player;
  if (!c.released && c.t >= DRAGON.windup - 1e-9) {
    c.released = true; const o = punchOrigin(s, c); c.tx = o.x; c.ty = o.y; emit(s, 'dragon_launch', o.x, o.y);
  }
  if (!c.released) return;
  const tl = c.t - DRAGON.windup;
  if (tl <= DRAGON.lunge + 1e-9) {   // the committed lunge: Kai really moves (collision-checked), with a few i-frames so the commit is not cheaply interrupted
    const want = DRAGON.lungeDist * easeOut(tl / DRAGON.lunge), tx = c.sx + c.dirX * want, ty = c.sy + c.dirY * want;
    if (dt > 0) slideMove(p, (tx - p.x) / dt, (ty - p.y) / dt, dt);
    p.invulnerable = Math.max(p.invulnerable, 0.12);
  }
  const head = dragonHead(s, tl);
  const hw = DRAGON.halfWidth * s.mods.beamWidth, dmg = DRAGON.damage * s.mods.beamDamage * s.mods.formPower; let hits = 0;
  for (const e of s.enemies) {
    if (e.hp <= 0 || c.hits.includes(e.id)) continue;
    const ex = e.x - c.sx, ey = e.y - c.sy, along = ex * c.dirX + ey * c.dirY;
    if (along < -e.radius || along > head + e.radius) continue;
    if (Math.abs(ex * -c.dirY + ey * c.dirX) > hw + e.radius) continue;
    c.hits.push(e.id); hits++;
    const weak = !isBoss(e.kind) && e.hp <= e.maxHp * DRAGON.executeBelow;
    if (!damageEnemy(s, e, weak ? e.hp + 1 : dmg) && e.hp > 0 && !isBoss(e.kind)) {
      for (let i = 0; i < 3; i++) slideMove(e, c.dirX * DRAGON.knockback / 0.6, c.dirY * DRAGON.knockback / 0.6, 0.2);
      e.stagger = Math.max(e.stagger, DRAGON.stagger);
    }
    if (s.mods.beamDrive > 0 && p.form !== 1) p.drive = Math.min(100, p.drive + s.mods.beamDrive * s.mods.driveGain);
  }
  if (hits) emit(s, 'dragon_hit', c.sx + c.dirX * head, c.sy + c.dirY * head, hits);
}
export const cannonHalfWidth = (s: GameState, tf: number) => (CANNON.halfWidth0 + (CANNON.halfWidth1 - CANNON.halfWidth0) * easeOut(tf / CANNON.expand)) * s.mods.sphereRadius;
export const cannonFireTime = (s: GameState) => CANNON.fire + CARRY.echoSeconds * s.mods.sphereEcho;
/** Cometbreaker Cannon: planted gather, then a beam that starts focused and opens to its full width; finite (fire time + Nova echo) and always followed by a recovery. */
function updateComet(s: GameState, c: Cast, before: number) {
  const fireT = cannonFireTime(s);
  if (!c.released && c.t >= CANNON.gather - 1e-9) {
    c.released = true; c.dur = CANNON.gather + fireT + CANNON.recover; const o = beamOrigin(s, c); c.len = beamLength(o.x, o.y, c.dirX, c.dirY, CANNON.length); emit(s, 'comet_fire', o.x, o.y);
  }
  if (!c.released) return;
  const tf = c.t - CANNON.gather; const due = Math.min(Math.round(fireT / CANNON.pulseEvery), Math.floor(tf / CANNON.pulseEvery + 1e-9) + 1);
  while (c.pulses < due) { c.pulses++; cometPulse(s, c, Math.min(tf, c.pulses * CANNON.pulseEvery)); }
  if (before < CANNON.gather + fireT && c.t >= CANNON.gather + fireT) emit(s, 'comet_end', s.player.x, s.player.y);
}
function cometPulse(s: GameState, c: Cast, tf: number) {
  const o = beamOrigin(s, c); const hw = cannonHalfWidth(s, tf), dmg = CANNON.damage * s.mods.sphereDamage * s.mods.formPower; let hits = 0;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const ex = e.x - o.x, ey = e.y - o.y, along = ex * c.dirX + ey * c.dirY;
    if (along < -e.radius || along > c.len + e.radius) continue;
    if (Math.abs(ex * -c.dirY + ey * c.dirX) > hw + e.radius) continue;
    damageEnemy(s, e, dmg); hits++;
    if (e.hp > 0 && !isBoss(e.kind)) slideMove(e, c.dirX * CANNON.knockback * 60, c.dirY * CANNON.knockback * 60, 1 / 60);
  }
  emit(s, 'comet_pulse', o.x + c.dirX * c.len, o.y + c.dirY * c.len, hits);
}

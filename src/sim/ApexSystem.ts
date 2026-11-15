import type { AbilityEventKind, Cast, Enemy, GameState } from './GameState';
import { APEX_CARRY, EVASION, REVERSAL, RIFT } from '../content/stillfire';
import { isBoss } from '../content/enemies';
import { blocked, slideMove } from './CollisionSystem';
import { damageEnemy } from './CombatSystem';
import { beamOrigin, faceOf } from './AbilitySystem';
import { normalize } from '../core/Math';

function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n });
  if (s.abilityEvents.length > 24) s.abilityEvents.splice(0, s.abilityEvents.length - 24);
}
const tierOf = (charge: number) => (charge >= RIFT.tier2At ? 2 : charge >= RIFT.tier1At ? 1 : 0);

/** The Silver Rift aim: the pointer / right stick while it is (or was recently) driving, else the movement facing. Always a unit vector, any angle. */
export function riftAim(s: GameState): { x: number; y: number } {
  const a = s.aim; if (a.src !== 'none' && s.time - a.at <= RIFT.aimHold) return { x: a.x, y: a.y };
  return normalize(s.player.aimX, s.player.aimY);
}
/** Called every tick with the raw input: remembers the last pointer / stick direction. */
export function trackFreeAim(s: GameState, ax: number | undefined, ay: number | undefined, src: 'pointer' | 'stick' | undefined) {
  if (ax === undefined || ay === undefined || (ax === 0 && ay === 0)) return;
  const n = normalize(ax, ay); s.aim.x = n.x; s.aim.y = n.y; s.aim.at = s.time; s.aim.src = src ?? 'pointer';
}

/** Is Kai standing safely at (x, y)? Not in a wall, not inside a body, not in a telegraphed hazard or a bolt. */
export function safeSpot(s: GameState, x: number, y: number, from?: { x: number; y: number }): boolean {
  const r = s.player.radius;
  if (blocked(x, y, r + 2)) return false;
  if (from) { const d = Math.hypot(x - from.x, y - from.y); for (let t = 8; t < d; t += 8) if (blocked(from.x + (x - from.x) * t / d, from.y + (y - from.y) * t / d, r)) return false; }
  for (const e of s.enemies) if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < e.radius + r + 6) return false;
  for (const h of s.hazards) {
    if (h.shape === 'sigil' || h.fired && !(h.activeLeft && h.activeLeft > 0)) continue;
    const reach = h.shape === 'rect' ? Math.hypot((h.w ?? 0) / 2, (h.h ?? 0) / 2) : h.r;
    if (Math.hypot(h.x - x, h.y - y) < reach + r + 10) return false;
  }
  for (const b of s.enemyShots) if (Math.hypot(b.x - x, b.y - y) < b.radius + r + 24) return false;
  return true;
}
/** Look for a safe blink target around the point opposite the aim; null when none exists (the release then happens in place). */
export function findBlink(s: GameState, dir: { x: number; y: number }): { x: number; y: number } | null {
  const p = s.player; const base = Math.atan2(-dir.y, -dir.x);
  for (const dist of [RIFT.blinkDist, RIFT.blinkDist * 0.72, RIFT.blinkDist * 0.5]) {
    for (let i = 0; i < RIFT.blinkTries; i++) {
      const off = ([0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9] as const)[i]; const a = base + off;
      const x = p.x + Math.cos(a) * dist, y = p.y + Math.sin(a) * dist;
      if (safeSpot(s, x, y, p)) return { x, y };
    }
  }
  return null;
}
const rayLength = (x: number, y: number, dx: number, dy: number, max: number) => { for (let d = 0; d <= max; d += 8) if (blocked(x + dx * d, y + dy * d, 0)) return Math.max(0, d - 8); return max; };

export const riftFireTime = (s: GameState, tier: number) => RIFT.fire[tier] + APEX_CARRY.lingerSeconds * s.mods.beamLinger;
export function startRift(s: GameState): boolean {
  const p = s.player; if (p.riftCooldown > 0) return false;
  const d = riftAim(s); const face = faceOf(d.x, d.y);
  p.riftCooldown = RIFT.startLock;
  s.cast = { id: s.nextId++, kind: 'rift', face, t: 0, dirX: d.x, dirY: d.y, form: 3, released: false, pulses: 0, len: 0, tx: p.x, ty: p.y, sx: p.x, sy: p.y, hits: [], dur: RIFT.maxCharge + 1.5, charge: 0, tier: 0, rt: 0, blink: null };
  emit(s, 'rift_charge', p.x, p.y); return true;
}
function releaseRift(s: GameState, c: Cast) {
  const p = s.player; c.released = true; c.rt = 0; c.charge = c.t; c.tier = tierOf(c.t);
  const d = riftAim(s); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y);
  const b = findBlink(s, d);
  if (b) { c.blink = { x0: p.x, y0: p.y, x1: b.x, y1: b.y }; emit(s, 'rift_blink', p.x, p.y); p.x = b.x; p.y = b.y; p.invulnerable = Math.max(p.invulnerable, 0.12); }
  const o = beamOrigin(s, c); c.len = rayLength(o.x, o.y, c.dirX, c.dirY, RIFT.length);
  c.dur = c.t + riftFireTime(s, c.tier) + RIFT.recover;
  p.riftCooldown = RIFT.cooldown * s.mods.beamCd; emit(s, 'rift_fire', o.x, o.y, c.tier);
}
export function updateRift(s: GameState, c: Cast, dt: number) {
  const p = s.player;
  if (!c.released) {
    c.charge = c.t; c.tier = tierOf(c.t);
    const d = riftAim(s); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y);
    if ((!s.eHeld && c.t >= RIFT.minCharge) || c.t >= RIFT.maxCharge) releaseRift(s, c);
    return;
  }
  c.rt = (c.rt ?? 0) + dt; const fire = riftFireTime(s, c.tier ?? 0), total = Math.round(fire / RIFT.pulseEvery);
  const due = Math.min(total, Math.floor(c.rt / RIFT.pulseEvery + 1e-9) + 1);
  while (c.pulses < due) { c.pulses++; riftPulse(s, c); }
  if (c.rt - dt < fire && c.rt >= fire) emit(s, 'rift_end', p.x, p.y);
}
function riftPulse(s: GameState, c: Cast) {
  const t = c.tier ?? 0, o = beamOrigin(s, c); let hits = 0; const hw = RIFT.halfWidth[t] * s.mods.beamWidth, dmg = RIFT.damage[t] * s.mods.beamDamage * s.mods.formPower;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const ex = e.x - o.x, ey = e.y - o.y, along = ex * c.dirX + ey * c.dirY;
    if (along < -e.radius || along > c.len + e.radius) continue;
    if (Math.abs(ex * -c.dirY + ey * c.dirX) > hw + e.radius) continue;
    damageEnemy(s, e, dmg); hits++;
    if (s.mods.beamDrive > 0) s.player.drive = Math.min(100, s.player.drive + s.mods.beamDrive * s.mods.driveGain);
    if (e.hp > 0 && !isBoss(e.kind)) slideMove(e, c.dirX * 220, c.dirY * 220, 1 / 60);
  }
  emit(s, 'rift_pulse', o.x + c.dirX * c.len, o.y + c.dirY * c.len, hits);
}

// ---- Instinct Reversal --------------------------------------------------------------------------------------------------------------------------
export const reversalReach = (s: GameState) => REVERSAL.range * s.mods.sphereRadius;
export const reversalTargets = (s: GameState) => REVERSAL.maxTargets + APEX_CARRY.echoTargets * s.mods.sphereEcho;
/** Nearest non-boss enemies first (stable by id on ties), a boss only as the last pick so it can be struck but never dominates the string. */
export function pickReversalTargets(s: GameState): number[] {
  const p = s.player, reach = reversalReach(s);
  const near = s.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= reach + e.radius).map(e => ({ e, d: Math.hypot(e.x - p.x, e.y - p.y), boss: isBoss(e.kind) }));
  near.sort((a, b) => Number(a.boss) - Number(b.boss) || a.d - b.d || a.e.id - b.e.id);
  const out: number[] = []; let bosses = 0;
  for (const n of near) { if (out.length >= reversalTargets(s)) break; if (n.boss) { if (bosses >= 1) continue; bosses++; } out.push(n.e.id); }
  return out;
}
export function startReversal(s: GameState): boolean {
  const p = s.player; if (p.reversalCooldown > 0) return false;
  const seq = pickReversalTargets(s); const first = seq.length ? s.enemies.find(e => e.id === seq[0]) : undefined;
  const d = first ? normalize(first.x - p.x, first.y - p.y) : normalize(p.aimX, p.aimY);
  p.reversalCooldown = (seq.length ? REVERSAL.cooldown : REVERSAL.emptyCooldown) * (seq.length ? s.mods.sphereCd : 1);
  s.cast = { id: s.nextId++, kind: 'reversal', face: faceOf(d.x, d.y), t: 0, dirX: d.x, dirY: d.y, form: 3, released: false, pulses: 0, len: 0, tx: p.x, ty: p.y, sx: p.x, sy: p.y, hits: [], dur: REVERSAL.lead + seq.length * REVERSAL.hop + 0.06 + REVERSAL.recover, seq, hop: 0, fin: [] };
  emit(s, 'reversal_start', p.x, p.y, seq.length); return true;
}
/** Where Kai lands to strike `e`: beside it, preferring the side facing away from the next target so the string flows through the crowd. */
function strikeSpot(s: GameState, e: Enemy, away: { x: number; y: number }) {
  const p = s.player, dist = e.radius + p.radius + REVERSAL.strikeOffset * 0.35; const base = Math.atan2(away.y, away.x);
  for (const off of [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2, Math.PI]) {
    const a = base + off, x = e.x + Math.cos(a) * dist, y = e.y + Math.sin(a) * dist;
    if (blocked(x, y, p.radius + 2)) continue;
    let clear = true; for (const o of s.enemies) if (o !== e && o.hp > 0 && Math.hypot(o.x - x, o.y - y) < o.radius + p.radius - 2) { clear = false; break; }
    if (clear) { for (const h of s.hazards) if (h.shape !== 'sigil' && !h.fired && Math.hypot(h.x - x, h.y - y) < h.r + p.radius) { clear = false; break; } }
    if (clear) return { x, y };
  }
  return null;
}
export function updateReversal(s: GameState, c: Cast) {
  const p = s.player, seq = c.seq ?? [], n = seq.length;
  if (c.t >= REVERSAL.lead - 1e-9 && n === 0 && !c.released) { c.released = true; emit(s, 'reversal_end', p.x, p.y, 0); return; }
  while ((c.hop ?? 0) < n && c.t >= REVERSAL.lead + (c.hop ?? 0) * REVERSAL.hop - 1e-9) {
    const i = c.hop ?? 0; c.hop = i + 1; const e = s.enemies.find(en => en.id === seq[i]);
    if (!e || e.hp <= 0) continue;
    const nxt = s.enemies.find(en => en.id === seq[i + 1] && en.hp > 0); const away = nxt ? normalize(e.x - nxt.x, e.y - nxt.y) : normalize(e.x - p.x, e.y - p.y);
    const spot = strikeSpot(s, e, away);
    if (spot) { p.x = spot.x; p.y = spot.y; }
    const dir = normalize(e.x - p.x, e.y - p.y); p.aimX = dir.x; p.aimY = dir.y; c.dirX = dir.x; c.dirY = dir.y; c.face = faceOf(dir.x, dir.y);
    p.invulnerable = Math.max(p.invulnerable, REVERSAL.hopIFrames);
    const ex = e.x, ey = e.y; c.fin?.push({ x: ex, y: ey });
    const dead = damageEnemy(s, e, REVERSAL.damage * s.mods.sphereDamage * s.mods.formPower);
    if (!dead && !isBoss(e.kind)) e.stagger = Math.max(e.stagger, REVERSAL.stagger);
    if (isBoss(e.kind)) c.hits.push(e.id);
    emit(s, 'reversal_hit', ex, ey, i);
  }
  if (!c.released && n > 0 && (c.hop ?? 0) >= n && c.t >= REVERSAL.lead + n * REVERSAL.hop + 0.04) {
    c.released = true;
    // the finishing beat: every struck point flashes at once (a small area hit; a boss takes at most one extra tick)
    const hitBoss = new Set<number>(c.hits); const R = REVERSAL.finishRadius * s.mods.sphereRadius;
    for (const f of c.fin ?? []) {
      for (const e of s.enemies) {
        if (e.hp <= 0 || Math.hypot(e.x - f.x, e.y - f.y) > R + e.radius) continue;
        if (isBoss(e.kind)) { if (hitBoss.size >= REVERSAL.bossHits && !hitBoss.has(e.id)) continue; if (c.hits.filter(h => h === e.id).length >= REVERSAL.bossHits) continue; c.hits.push(e.id); }
        damageEnemy(s, e, REVERSAL.finishDamage * s.mods.sphereDamage * s.mods.formPower, { area: true });
      }
      emit(s, 'reversal_flash', f.x, f.y);
    }
    emit(s, 'reversal_end', p.x, p.y, n);
  }
}

// ---- Perfect Evasion ----------------------------------------------------------------------------------------------------------------------------
/** Called by damagePlayer BEFORE damage lands: in Form III a ready evasion refuses the hit, sidesteps Kai to a safe spot and leaves a ghost behind. Returns true when the hit was evaded. */
export function tryPerfectEvasion(s: GameState, from?: { x: number; y: number }): boolean {
  const p = s.player;
  if (p.form !== 3 || p.evadeCooldown > 0 || p.dashRemaining > 0 || s.cinema) return false;
  const away = from ? normalize(p.x - from.x, p.y - from.y) : { x: 0, y: 1 }, perp = { x: -away.y, y: away.x };
  const ox = p.x, oy = p.y;
  for (const [dx, dy] of [[perp.x, perp.y], [-perp.x, -perp.y], [away.x, away.y], [perp.x + away.x, perp.y + away.y], [-perp.x + away.x, -perp.y + away.y], [-away.x, -away.y]] as const) {
    const n = normalize(dx, dy), x = ox + n.x * EVASION.sidestep, y = oy + n.y * EVASION.sidestep;
    if (safeSpot(s, x, y, p)) { p.x = x; p.y = y; break; }
  }
  p.evadeCooldown = EVASION.cooldown; p.invulnerable = Math.max(p.invulnerable, EVASION.iframes);
  emit(s, 'evasion', ox, oy); return true;
}

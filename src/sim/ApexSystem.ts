import type { AbilityEventKind, Cast, Enemy, GameState, RiftChain } from './GameState';
import { CHAIN, STRIKES } from '../content/kaiKit';
import { RULES } from '../core/Rules';
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
/** The free aim only while it is fresh (pointer / right stick), else null: Lance, Dragonfang, Nova, Cannon and the Rift all aim with this. */
export function freeAim(s: GameState): { x: number; y: number; d?: number } | null {
  const a = s.aim; return a.src !== 'none' && s.time - a.at <= RIFT.aimHold ? { x: a.x, y: a.y, d: a.src === 'pointer' ? a.d : undefined } : null;
}
export function trackFreeAim(s: GameState, ax: number | undefined, ay: number | undefined, src: 'pointer' | 'stick' | undefined, dist?: number) {
  if (ax === undefined || ay === undefined || (ax === 0 && ay === 0)) return;
  const n = normalize(ax, ay); s.aim.x = n.x; s.aim.y = n.y; s.aim.at = s.time; s.aim.src = src ?? 'pointer'; s.aim.d = dist;
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
  c.blink = null;
  const o = beamOrigin(s, c); c.len = rayLength(o.x, o.y, c.dirX, c.dirY, RIFT.length);
  c.dur = c.t + riftFireTime(s, c.tier) + RIFT.recover; c.chain = { state: 'main', left: CHAIN.follow, hit: false, nextAt: 0, hop: 0, dests: [], fireAt: 0, pulses: 0, tier: c.tier, dx: 0, dy: 0, len: 0, ox: 0, oy: 0 };
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
  if (c.rt - dt < fire && c.rt >= fire && !(c.chain && c.chain.hit)) emit(s, 'rift_end', p.x, p.y);
  if (c.chain && c.chain.state !== 'done') updateChain(s, c, fire);
}
function riftPulse(s: GameState, c: Cast) {
  const t = c.tier ?? 0, o = beamOrigin(s, c); let hits = 0; const hw = RIFT.halfWidth[t] * s.mods.beamWidth, dmg = RIFT.damage[t] * s.mods.beamDamage * s.mods.formPower;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const ex = e.x - o.x, ey = e.y - o.y, along = ex * c.dirX + ey * c.dirY;
    if (along < -e.radius || along > c.len + e.radius) continue;
    if (Math.abs(ex * -c.dirY + ey * c.dirX) > hw + e.radius) continue;
    const hp0 = e.hp; damageEnemy(s, e, dmg); hits++; if (c.chain && (e.hp < hp0 || e.hp <= 0)) c.chain.hit = true;
    if (s.mods.beamDrive > 0) s.player.drive = Math.min(100, s.player.drive + s.mods.beamDrive * s.mods.driveGain);
    if (e.hp > 0 && !isBoss(e.kind)) slideMove(e, c.dirX * 220, c.dirY * 220, 1 / 60);
  }
  emit(s, 'rift_pulse', o.x + c.dirX * c.len, o.y + c.dirY * c.len, hits);
}

// ---- Silver Rift teleport chain -----------------------------------------------------------------------------------------------------------------
const hash32 = (a: number, b: number, c: number) => { let h = (a ^ Math.imul(b, 0x9e3779b1) ^ Math.imul(c, 0x85ebca6b)) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clearLine = (x0: number, y0: number, x1: number, y1: number) => { const d = Math.hypot(x1 - x0, y1 - y0); for (let t = 12; t < d; t += 12) if (blocked(x0 + (x1 - x0) * t / d, y0 + (y1 - y0) * t / d, 0)) return false; return true; };
/** The nearest living, damageable enemy to a point with a clear beam line to it (stable on ties by id). */
function beamTarget(s: GameState, x: number, y: number): Enemy | null {
  let best: Enemy | null = null, bd = Infinity;
  for (const e of s.enemies) {
    if (e.hp <= 0 || e.ai?.invuln) continue; const d = Math.hypot(e.x - x, e.y - y); if (d > CHAIN.beamReach || d < 1) continue;
    if ((d < bd - 1e-6 || (Math.abs(d - bd) <= 1e-6 && best && e.id < best.id)) && clearLine(x, y, e.x, e.y)) { best = e; bd = d; }
  }
  return best;
}
/** Seeded, bounded search for a legal landing with a shootable target; null when none exists (the chain then ends cleanly). */
function pickHop(s: GameState, c: Cast, ch: RiftChain): { x: number; y: number; t: Enemy } | null {
  const p = s.player, m = 60, W = RULES.worldWidth, H = RULES.worldHeight;
  for (let k = 0; k < CHAIN.attempts; k++) {
    const x = m + hash32(s.seed, c.id * 31 + ch.hop, k * 2) * (W - 2 * m), y = m + hash32(s.seed, c.id * 31 + ch.hop, k * 2 + 1) * (H - 2 * m);
    if (Math.hypot(x - p.x, y - p.y) < CHAIN.minHop || ch.dests.some(d => Math.hypot(d.x - x, d.y - y) < CHAIN.minApart)) continue;
    if (!safeSpot(s, x, y)) continue;
    const t = beamTarget(s, x, y); if (t) return { x, y, t };
  }
  return null;
}
function updateChain(s: GameState, c: Cast, fire: number) {
  const ch = c.chain!, p = s.player, rt = c.rt ?? 0;
  if (ch.state === 'main') {
    if (rt < fire) return;
    if (!ch.hit) { ch.state = 'done'; return; }
    ch.state = 'wait'; ch.nextAt = rt + CHAIN.settle * 0.5; c.dur = 1e9; return;
  }
  if (ch.state === 'wait' && rt >= ch.nextAt) {
    const hop = pickHop(s, c, ch);
    if (!hop) { ch.state = 'done'; c.dur = c.t + RIFT.recover; emit(s, 'rift_end', p.x, p.y); return; }
    emit(s, 'rift_hop', p.x, p.y, ch.hop); p.x = hop.x; p.y = hop.y; p.vx = 0; p.vy = 0; p.invulnerable = Math.max(p.invulnerable, CHAIN.iframes);
    const d = normalize(hop.t.x - p.x, hop.t.y - p.y); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); p.aimX = d.x; p.aimY = d.y;
    const o = beamOrigin(s, c); c.len = Math.min(CHAIN.beamReach, Math.hypot(hop.t.x - o.x, hop.t.y - o.y) + hop.t.radius + 40);
    ch.dests.push({ x: hop.x, y: hop.y }); ch.hop++; ch.state = 'fire'; ch.fireAt = rt + CHAIN.aimLead; ch.pulses = 0; emit(s, 'rift_fire', o.x, o.y, 3 + ch.tier); return;
  }
  if (ch.state === 'fire') {
    const t = ch.tier;
    while (ch.pulses < CHAIN.pulses && rt >= ch.fireAt + ch.pulses * CHAIN.pulseEvery - 1e-9) {
      ch.pulses++; const o = beamOrigin(s, c), hw = RIFT.halfWidth[t] * s.mods.beamWidth * 0.9, dmg = RIFT.damage[t] * CHAIN.damageMul * s.mods.beamDamage * s.mods.formPower; let hits = 0;
      for (const e of s.enemies) {
        if (e.hp <= 0) continue; const ex = e.x - o.x, ey = e.y - o.y, along = ex * c.dirX + ey * c.dirY;
        if (along < -e.radius || along > c.len + e.radius || Math.abs(ex * -c.dirY + ey * c.dirX) > hw + e.radius) continue;
        damageEnemy(s, e, dmg); hits++; if (e.hp > 0 && !isBoss(e.kind)) slideMove(e, c.dirX * 160, c.dirY * 160, 1 / 60);
      }
      emit(s, 'rift_pulse', o.x + c.dirX * c.len, o.y + c.dirY * c.len, hits);
    }
    if (ch.pulses >= CHAIN.pulses && rt >= ch.fireAt + CHAIN.pulses * CHAIN.pulseEvery + 0.03) {
      ch.left--; if (ch.left <= 0) { ch.state = 'done'; c.dur = c.t + RIFT.recover; emit(s, 'rift_end', p.x, p.y); } else { ch.state = 'wait'; ch.nextAt = rt + CHAIN.settle; }
    }
  }
}

// ---- Instinct Reversal --------------------------------------------------------------------------------------------------------------------------
export const reversalReach = (s: GameState) => REVERSAL.range * s.mods.sphereRadius;
const strikable = (e: Enemy) => e.hp > 0 && !e.ai?.invuln && !(e.part && e.part.role === 'decoy');
function reversalTargets(s: GameState, led: Record<number, number>): Enemy[] {
  const p = s.player, reach = reversalReach(s);
  return s.enemies.filter(e => strikable(e) && Math.hypot(e.x - p.x, e.y - p.y) <= reach + e.radius).sort((a, b) => (led[a.id] ?? 0) - (led[b.id] ?? 0) || Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y) || a.id - b.id);
}
export function startReversal(s: GameState): boolean {
  const p = s.player; if (p.reversalCooldown > 0) return false;
  const led: Record<number, number> = {}, near = reversalTargets(s, led); const first = near[0];
  const d = first ? normalize(first.x - p.x, first.y - p.y) : normalize(p.aimX, p.aimY);
  p.reversalCooldown = near.length ? REVERSAL.cooldown * s.mods.sphereCd : REVERSAL.emptyCooldown;
  s.cast = { id: s.nextId++, kind: 'reversal', face: faceOf(d.x, d.y), t: 0, dirX: d.x, dirY: d.y, form: 3, released: false, pulses: 0, len: 0, tx: p.x, ty: p.y, sx: p.x, sy: p.y, hits: [], dur: near.length ? 1e9 : REVERSAL.lead + 0.2, hop: 0, led, nextAt: REVERSAL.lead, fin: [] };
  emit(s, 'reversal_start', p.x, p.y, near.length); return true;
}
/** Where Kai lands to strike `e`: beside it, away from the crowd's centre when possible. */
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
function endReversal(s: GameState, c: Cast) {
  const p = s.player; c.released = true; c.dur = c.t + REVERSAL.recover; c.nextAt = 1e9; p.reversalCooldown = Math.max(p.reversalCooldown, REVERSAL.cooldown * s.mods.sphereCd);   // the chain pays its full cooldown when it stops
  const last = c.fin?.[c.fin.length - 1];
  if (last) { const R = STRIKES.finishRadius * s.mods.sphereRadius; for (const e of s.enemies) if (e.hp > 0 && !e.ai?.invuln && Math.hypot(e.x - last.x, e.y - last.y) <= R + e.radius) damageEnemy(s, e, STRIKES.finishDamage * s.mods.sphereDamage * s.mods.formPower, { area: true }); emit(s, 'reversal_flash', last.x, last.y); }
  emit(s, 'reversal_end', p.x, p.y, c.hop ?? 0);
}
export function updateReversal(s: GameState, c: Cast) {
  const p = s.player, led = (c.led ??= {});
  if (c.released) return;
  if (c.dur < 1e8) { if (c.t >= REVERSAL.lead - 1e-9) { c.released = true; emit(s, 'reversal_end', p.x, p.y, 0); } return; }   // nothing was in reach: a short empty cast
  if (p.form !== 3 || p.hp <= 0) { endReversal(s, c); return; }
  if ((c.nextAt ?? 0) < 0) { endReversal(s, c); return; }
  for (let guard = 0; guard < 3 && !c.released && c.t >= (c.nextAt ?? 0) - 1e-9; guard++) {
    const cands = reversalTargets(s, led);
    if (!cands.length) { endReversal(s, c); return; }
    let struck = false;
    for (const e of cands.slice(0, 4)) {
      const crowd = cands.filter(o => o !== e), cx = crowd.length ? crowd.reduce((a, o) => a + o.x, 0) / crowd.length : p.x, cy = crowd.length ? crowd.reduce((a, o) => a + o.y, 0) / crowd.length : p.y;
      const spot = strikeSpot(s, e, normalize(e.x - cx, e.y - cy)); if (!spot) { led[e.id] = (led[e.id] ?? 0) + 2; continue; }
      p.x = spot.x; p.y = spot.y; p.vx = 0; p.vy = 0;
      const dir = normalize(e.x - p.x, e.y - p.y); p.aimX = dir.x; p.aimY = dir.y; c.dirX = dir.x; c.dirY = dir.y; c.face = faceOf(dir.x, dir.y);
      p.invulnerable = Math.max(p.invulnerable, REVERSAL.hopIFrames);
      const ex = e.x, ey = e.y, hp0 = e.hp; damageEnemy(s, e, REVERSAL.damage * STRIKES.damageMul * s.mods.sphereDamage * s.mods.formPower);
      if (e.hp > 0 && !isBoss(e.kind)) e.stagger = Math.max(e.stagger, REVERSAL.stagger);
      led[e.id] = (led[e.id] ?? 0) + (e.hp < hp0 || e.hp <= 0 ? 1 : 3);   // an enemy that refuses damage sinks to the back of the rotation
      c.hop = (c.hop ?? 0) + 1; c.fin = [{ x: ex, y: ey }]; emit(s, 'reversal_strike', ex, ey, c.hop); emit(s, 'reversal_hit', ex, ey, c.hop);
      struck = true; break;
    }
    c.nextAt = c.t + (struck ? STRIKES.every : STRIKES.every * 0.5);
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

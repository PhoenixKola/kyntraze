import { strikeHand } from './Strike';
/** B19: the combat kits of Ren (crimson brawler) and Sora (azure controller). Kai's systems are untouched; Simulation / WeaponSystem / AbilitySystem hand over to this file only when `state.hero !== 'kai'`.
 *  Slot mapping: Q = qCooldown, E = beamCooldown (+ beam mods), R = sphereCooldown (+ sphere mods). The automatic attack is separate from Q and keeps running while moving. */
import type { AbilityEventKind, Bolt, Enemy, Face, GameState, HeroCast, Orb } from './GameState';
import { damageEnemy } from './CombatSystem';
import { blocked, slideMove } from './CollisionSystem';
import { clamp, normalize } from '../core/Math';
import { isBoss } from '../content/enemies';
import { ASCEND, REN, SORA, type HeroAct } from '../content/heroKits';
import { freeAim } from './ApexSystem';
import { HERO_ANCHORS } from '../content/heroAnchors';
import { KAI_GROUND_DY, KAI_SCALE } from '../assets/kaiAnimation';
import { densestOrbTarget } from './BranchSystem';
import { isRenAct, renE, renFuryAuto, renMoveScale, renQ, renR, renCancelAct, updateRenAct, updateRenCombat } from './RenCombat';
import { isSoraAct, soraBladeAuto, soraCancelAct, soraE, soraMoveScale, soraQ, soraR, updateSoraAct, updateSoraCombat } from './SoraCombat';
import { updateVexAct, updateVexMarks, vexAuto, vexE, vexMoveScale, vexQ, vexR } from './VexSystem';
import { isVexFormAct, updateVexCombat, updateVexFormAct, vexFormAuto, vexFormCancelAct, vexFormE, vexFormMoveScale, vexFormQ, vexFormR } from './VexCombat';

const EVENT_CAP = 24, BOLT_CAP = 90;
export function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n });
  if (s.abilityEvents.length > EVENT_CAP) s.abilityEvents.splice(0, s.abilityEvents.length - EVENT_CAP);
}
const faceOf = (dx: number, dy: number): Face => (Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'east' : 'west') : (dy >= 0 ? 'south' : 'north'));
const easeOut = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 3;
const easeIn = (u: number) => clamp(u, 0, 1) ** 2;
const alive = (e: Enemy) => e.hp > 0;
const inForm = (s: GameState) => s.player.form >= 1;
/** Damage multiplier of the transformed state (Ascendant / Sovereign). */
const formMul = (s: GameState, base: number) => (inForm(s) ? base * s.mods.formPower : 1);
export const nearest = (s: GameState, range: number): Enemy | null => {
  const p = s.player; let best: Enemy | null = null, bd = range * range;
  for (const e of s.enemies) { if (!alive(e)) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d <= bd) { bd = d; best = e; } }
  return best;
};
/** Free aim (pointer / right stick) wins; otherwise the nearest enemy in `range`; otherwise the facing. */
export function aimDir(s: GameState, range: number): { x: number; y: number } {
  const fa = freeAim(s); if (fa) return { x: fa.x, y: fa.y };
  const p = s.player, e = nearest(s, range);
  if (e) { const d = normalize(e.x - p.x, e.y - p.y); if (d.x || d.y) return d; }
  return normalize(p.aimX, p.aimY);
}
/** Is the straight path between two points free of walls (sampled at the player's body radius)? */
export function pathClear(x0: number, y0: number, x1: number, y1: number, r: number): boolean {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 12));
  for (let i = 1; i <= n; i++) { const u = i / n; if (blocked(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r)) return false; }
  return true;
}
export const driveGain = (s: GameState, amount: number) => { if (s.player.form === 0) s.player.drive = Math.min(100, s.player.drive + amount * s.mods.driveGain); };
const feedConductor = (s: GameState) => { if (s.mods.beamDrive > 0) driveGain(s, s.mods.beamDrive); };
export const push = (_s: GameState, e: Enemy, dx: number, dy: number, dist: number, stagger = 0) => {
  if (isBoss(e.kind) || e.hp <= 0) return;
  const d = Math.hypot(dx, dy) || 1; for (let i = 0; i < 4; i++) slideMove(e, dx / d * dist * 4, dy / d * dist * 4, 0.0625);   // 4 x 0.0625 s x (dist * 4 px/s) = dist px
  if (stagger > 0) e.stagger = Math.max(e.stagger, stagger);
};
export function newCast(s: GameState, act: HeroAct, dir: { x: number; y: number }, dur: number): HeroCast {
  const p = s.player;
  return { id: s.nextId++, act, t: 0, dirX: dir.x, dirY: dir.y, face: faceOf(dir.x, dir.y), form: p.form, released: false, dur, moving: s.hx.moving, beats: 0, hop: 0, hopT: 0, hops: [], sx: p.x, sy: p.y, tx: p.x, ty: p.y, charge: 0, tier: 0, len: 0, pulses: 0, hits: [] };
}
const ring = (s: GameState, kind: 'slam' | 'ring' | 'rebound' | 'horizon' | 'rush', x: number, y: number, r: number, dur: number) => { s.hx.rings.push({ id: s.nextId++, x, y, r, t: 0, dur, kind }); if (s.hx.rings.length > 24) s.hx.rings.shift(); };
const arc = (s: GameState, x0: number, y0: number, x1: number, y1: number, dur = 0.22) => { s.hx.arcs.push({ id: s.nextId++, x0, y0, x1, y1, t: 0, dur }); if (s.hx.arcs.length > 24) s.hx.arcs.shift(); };

/* ------------------------------------------------------------------ hand anchors (muzzles) */
/** Where a hero's energy leaves the hands, in world px: the exported sprite hand anchors for the facing and form when they exist (needle = leading hand at the strike, lance / orb = both hands), else a casting hand a little forward of the body at chest height. */
export const hand = (s: GameState, dx: number, dy: number, forward = 24, which: 'needle' | 'lance' | 'orb' = 'needle') => {
  const set = HERO_ANCHORS[s.hero as 'ren' | 'sora']?.[s.player.form === 1 ? 'f1' : 'base'], a = set?.[faceOf(dx, dy)]?.[which];
  if (a) return { x: s.player.x + a.x * KAI_SCALE, y: s.player.y + KAI_GROUND_DY + a.y * KAI_SCALE };
  return { x: s.player.x + dx * forward, y: s.player.y - 14 + dy * forward * 0.7 };
};

/** Direction from a muzzle point to the nearest enemy within `range` of the muzzle (so a shot leaves the HAND and still crosses the target), else the given fallback. */
function aimFromMuzzle(s: GameState, ox: number, oy: number, range: number, fallback: { x: number; y: number }): { x: number; y: number } {
  const fa = freeAim(s); if (fa) return fallback;
  let best: Enemy | null = null, bd = range * range;
  for (const e of s.enemies) { if (!alive(e)) continue; const d = (e.x - ox) ** 2 + (e.y - oy) ** 2; if (d <= bd) { bd = d; best = e; } }
  if (!best) return fallback; const d = normalize(best.x - ox, best.y - oy); return d.x || d.y ? d : fallback;
}

/* ------------------------------------------------------------------ automatic attacks */
export function updateHeroAuto(s: GameState, dt: number) {
  const p = s.player; if (s.hx.act || s.cinema) return;
  p.attackClock -= dt; if (p.attackClock > 0) return;
  if (s.hero === 'ren') renAuto(s); else if (s.hero === 'vex') { if (inForm(s)) vexFormAuto(s); else vexAuto(s); } else soraAuto(s);
}
function renAuto(s: GameState) {
  if (inForm(s)) { renFuryAuto(s); return; }   // B26: Crimson Ascendant has its own four-beat Crimson Fury
  const p = s.player, form = inForm(s), period = Math.max(0.16, p.attackPeriod * (form ? 0.78 : 1));
  const tgt = nearest(s, p.attackRange); if (!tgt) { p.attackClock = 0; return; }   // melee waits for someone in reach instead of wasting the swing
  p.attackClock += period;
  const dir = normalize(tgt.x - p.x, tgt.y - p.y), step = s.hx.autoStep++ % REN.auto.step, fin = step === REN.auto.step - 1;
  const cos = Math.cos(((form ? REN.auto.arcDeg + 12 : REN.auto.arcDeg) * Math.PI) / 180);
  const cands = s.enemies.filter(e => { if (!alive(e)) return false; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); return d <= p.attackRange + e.radius && (d < 1 || (dx * dir.x + dy * dir.y) / d >= cos); })
    .sort((a, b) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2)).slice(0, p.targets + (form ? 1 : 0));
  const dmg = p.attackDamage * formMul(s, form ? ASCEND.ren.autoMul : 1) * (fin ? REN.auto.finisherMul : 1);
  let hits = 0; for (const e of cands) { damageEnemy(s, e, dmg); hits++; if (fin) push(s, e, e.x - p.x, e.y - p.y, REN.auto.finisherPush / 4, 0.2); driveGain(s, fin ? 2.4 : 1.4); }
  s.hx.strike = { x: dir.x, y: dir.y, t: s.time, step, hand: strikeHand(faceOf(dir.x, dir.y), dir.x, dir.y, step) };
  emit(s, fin ? 'auto_finisher' : 'auto_hit', p.x + dir.x * 34, p.y + dir.y * 34, hits);
}
function soraAuto(s: GameState) {
  if (inForm(s)) { soraBladeAuto(s); return; }   // B27: Azure Sovereign has its own four-beat Astral Blades
  const p = s.player, form = inForm(s), period = Math.max(0.16, p.attackPeriod * (form ? 0.8 : 1));
  const cands = s.enemies.filter(e => alive(e) && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (p.attackRange + e.radius) ** 2).sort((a, b) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2));
  if (!cands.length) { p.attackClock = 0; return; }
  p.attackClock += period;
  const n = Math.min(cands.length, p.targets + (form ? 1 : 0)), dmg = p.attackDamage * formMul(s, form ? ASCEND.sora.autoMul : 1);
  for (let i = 0; i < n; i++) {
    const t = cands[i], dir = normalize(t.x - p.x, t.y - p.y), o = hand(s, dir.x, dir.y, SORA.auto.muzzle);
    spawnBolt(s, { x: o.x, y: o.y, dirX: dir.x, dirY: dir.y, speed: SORA.auto.speed, ttl: (p.attackRange + 60) / SORA.auto.speed + 0.12, damage: dmg, radius: SORA.auto.radius, kind: 'needle', pierce: form ? SORA.auto.formPierce : 0, homing: SORA.auto.homing });
    if (i === 0) { const st = s.hx.autoStep++ % 2; s.hx.strike = { x: dir.x, y: dir.y, t: s.time, step: st, hand: strikeHand(faceOf(dir.x, dir.y), dir.x, dir.y, st) }; }
  }
  emit(s, 'needle_fire', p.x, p.y, n);
}
function spawnBolt(s: GameState, o: { x: number; y: number; dirX: number; dirY: number; speed: number; ttl: number; damage: number; radius: number; kind: Bolt['kind']; pierce: number; homing: number }) {
  if (s.hx.bolts.length >= BOLT_CAP) s.hx.bolts.shift();
  s.hx.bolts.push({ id: s.nextId++, x: o.x, y: o.y, vx: o.dirX * o.speed, vy: o.dirY * o.speed, ttl: o.ttl, damage: o.damage, radius: o.radius, kind: o.kind, pierce: o.pierce, hits: [], homing: o.homing, form: s.player.form });
}

/* ------------------------------------------------------------------ Q */
export function heroActivateQ(s: GameState): boolean {
  const p = s.player; if (p.qCooldown > 0 || s.hx.act || s.cinema || p.dashRemaining > 0 || p.hp <= 0) return false;
  const form = inForm(s);
  if (s.hero === 'vex') return form ? vexFormQ(s) : vexQ(s);   // B28: Mirror Guard / Phantom Legion replace Parry Halo while transformed
  if (s.hero === 'sora' && form) return soraQ(s);   // B27: Azure Prison replaces Azure Volley in the transformed state
  if (s.hero === 'ren' && form) return renQ(s);   // B26: Infernal Cyclone replaces Crimson Break in the transformed state
  if (s.hero === 'ren') {
    const dir = aimDir(s, 190); const beats = form ? REN.q.formBeats : REN.q.beats, gap = form ? REN.q.formGap : REN.q.gap;
    p.qCooldown = REN.q.cooldown; s.hx.act = newCast(s, 'crimson_break', dir, 0.06 + beats * gap + REN.q.recover);
    emit(s, 'hero_q', p.x, p.y, beats);
  } else {
    const dir = aimDir(s, SORA.base.attackRange); p.qCooldown = SORA.q.cooldown;
    s.hx.act = newCast(s, 'azure_volley', dir, SORA.q.windup + SORA.q.burst + SORA.q.recover); emit(s, 'hero_q', p.x, p.y, soraVolleyBolts(s));
  }
  return true;
}
const soraVolleyBolts = (s: GameState) => (inForm(s) ? SORA.q.formBolts : SORA.q.bolts) + Math.max(0, Math.round((s.player.qRadius - SORA.base.qRadius) / 25));
function updateCrimsonBreak(s: GameState, c: HeroCast, before: number) {
  const p = s.player, form = c.form === 1, beats = form ? REN.q.formBeats : REN.q.beats, gap = form ? REN.q.formGap : REN.q.gap;
  const due = Math.min(beats, Math.floor((c.t - 0.06) / gap + 1e-9) + 1);
  while (c.beats < due && c.t >= 0.06 - 1e-9) {
    const i = c.beats++, last = i === beats - 1;
    // the beats re-aim at the nearest enemy in front so a moving Ren still connects; the committed facing is the cast's
    const dir = s.hx.moving && !freeAim(s) ? normalize(p.aimX, p.aimY) : { x: c.dirX, y: c.dirY };
    const reach = p.qRadius * (form ? REN.q.formReach : 1), cos = Math.cos((REN.q.arcDeg * Math.PI) / 180), dmg = p.qDamage * REN.q.beatMul * (last ? REN.q.finisherMul : 1) * formMul(s, form ? 1.15 : 1);
    let hits = 0;
    for (const e of s.enemies) {
      if (!alive(e)) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > reach + e.radius) continue;
      if (d > 1 && (dx * dir.x + dy * dir.y) / d < cos) continue;
      if (!damageEnemy(s, e, dmg)) { push(s, e, dx || dir.x, dy || dir.y, last ? 26 : 8, last ? 0.45 : 0.1); } hits++; driveGain(s, 0.9);
    }
    if (last && form) {   // Ascendant: the closing beat throws a crimson line down the lane
      for (const e of s.enemies) { if (!alive(e)) continue; const dx = e.x - p.x, dy = e.y - p.y, along = dx * dir.x + dy * dir.y; if (along < reach || along > reach + 170 || Math.abs(dx * -dir.y + dy * dir.x) > 44 + e.radius) continue; damageEnemy(s, e, dmg * 0.8); hits++; }
    }
    if (!s.hx.moving) slideMove(p, dir.x * REN.q.step * 10, dir.y * REN.q.step * 10, 0.1);   // a planted combination still steps into the crowd
    c.dirX = dir.x; c.dirY = dir.y; c.face = faceOf(dir.x, dir.y);
    emit(s, 'hero_q_beat', p.x + dir.x * 56, p.y + dir.y * 40, (i << 8) | (last ? 128 : 0) | Math.min(hits, 127));
  }
  if (before < c.dur && c.t >= c.dur - 1e-9) emit(s, 'hero_q_end', p.x, p.y);
}
function updateAzureVolley(s: GameState, c: HeroCast) {
  const p = s.player, form = c.form === 1, n = soraVolleyBolts(s), spread = ((form ? SORA.q.formSpreadDeg : SORA.q.spreadDeg) * Math.PI) / 180;
  const due = c.t < SORA.q.windup ? 0 : Math.min(n, Math.floor(((c.t - SORA.q.windup) / SORA.q.burst) * n + 1e-9) + 1);
  const m0 = hand(s, c.dirX, c.dirY, 24), aim = aimFromMuzzle(s, m0.x, m0.y, SORA.base.attackRange + 40, { x: c.dirX, y: c.dirY }), base = Math.atan2(aim.y, aim.x), dmg = p.qDamage * SORA.q.boltMul * formMul(s, form ? 1.1 : 1);
  while (c.beats < due) {
    const k = c.beats++, u = n === 1 ? 0 : k / (n - 1) - 0.5, a = base + u * spread, row = form && k % 2 ? 0.94 : 1, o = hand(s, Math.cos(a), Math.sin(a), 24);
    spawnBolt(s, { x: o.x, y: o.y, dirX: Math.cos(a), dirY: Math.sin(a), speed: SORA.q.speed * row, ttl: SORA.q.ttl, damage: dmg, radius: SORA.q.radius, kind: 'volley', pierce: form ? 1 : 0, homing: form ? SORA.q.formHoming : 0 });
    if (k === 0) emit(s, 'volley_fire', o.x, o.y, n);
  }
}

/* ------------------------------------------------------------------ E */
export function heroStartE(s: GameState): boolean {
  const p = s.player; if (p.beamCooldown > 0 || s.hx.act || s.cinema || p.dashRemaining > 0 || p.hp <= 0 || s.phase !== 'running') return false;
  return s.hero === 'ren' ? (inForm(s) ? renE(s) : startRush(s)) : s.hero === 'vex' ? (inForm(s) ? vexFormE(s) : vexE(s)) : inForm(s) ? soraE(s) : startLance(s);
}
export function heroStartR(s: GameState): boolean {
  const p = s.player;
  if (s.hero === 'vex' && !inForm(s) && s.b22.marks.some(m => m.src === 'seal') && s.phase === 'running' && !s.cinema && p.hp > 0) return vexR(s);   // R again: detonate the Seal early (base form only)
  if (p.sphereCooldown > 0 || s.hx.act || s.cinema || p.dashRemaining > 0 || p.hp <= 0 || s.phase !== 'running') return false;   // the cooldown / busy guard had been swallowed by the comment above
  return s.hero === 'ren' ? (inForm(s) ? renR(s) : startBloodstar(s)) : s.hero === 'vex' ? (inForm(s) ? vexFormR(s) : vexR(s)) : inForm(s) ? soraR(s) : startHorizon(s);
}
/** Meteor Rush plan: chain of nearest unvisited enemies, each reachable by a wall-free straight line. Fixed at the press, so the route is predictable. */
function planRush(s: GameState, count: number): { x: number; y: number; id: number }[] {
  const p = s.player, hops: { x: number; y: number; id: number }[] = [], seen = new Set<number>();
  let cx = p.x, cy = p.y, reach: number = REN.e.seek;
  for (let i = 0; i < count; i++) {
    let best: Enemy | null = null, bd = reach * reach;
    for (const e of s.enemies) { if (!alive(e) || seen.has(e.id)) continue; const d = (e.x - cx) ** 2 + (e.y - cy) ** 2; if (d < bd && pathClear(cx, cy, e.x, e.y, p.radius * 0.6)) { bd = d; best = e; } }
    if (!best) break; seen.add(best.id); hops.push({ x: best.x, y: best.y, id: best.id }); cx = best.x; cy = best.y; reach = REN.e.chain;
  }
  return hops;
}
function startRush(s: GameState): boolean {
  const p = s.player, form = inForm(s), hops = planRush(s, (form ? REN.e.formHops : REN.e.hops) + s.mods.beamLinger);
  const dir = hops.length ? normalize(hops[0].x - p.x, hops[0].y - p.y) : aimDir(s, 0);
  const c = newCast(s, 'meteor_rush', dir, 0); p.beamCooldown = REN.e.cooldown * s.mods.beamCd;
  if (hops.length) c.hops = hops; else { let r: number = REN.e.fallback; while (r > 0 && !pathClear(p.x, p.y, p.x + dir.x * r, p.y + dir.y * r, p.radius * 0.6)) r -= 14; c.hops = [{ x: p.x + dir.x * Math.max(r, 40), y: p.y + dir.y * Math.max(r, 40), id: 0 }]; }
  c.dur = c.hops.length * (REN.e.hopTime + REN.e.strikeTime) + REN.e.recover; c.sx = p.x; c.sy = p.y; s.hx.act = c;
  p.invulnerable = Math.max(p.invulnerable, 0.3); emit(s, 'rush_start', p.x, p.y, c.hops.length); beginHop(s, c); return true;
}
function beginHop(s: GameState, c: HeroCast) {
  const p = s.player, h = c.hops[c.hop]; c.sx = p.x; c.sy = p.y; c.hopT = 0;
  if (h.id) { const e = s.enemies.find(en => en.id === h.id && alive(en)); if (e) { h.x = e.x; h.y = e.y; } }
  const d = normalize(h.x - p.x, h.y - p.y); if (d.x || d.y) { c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); }
  if (h.id) { const stop = (s.enemies.find(en => en.id === h.id)?.radius ?? 16) + p.radius + REN.e.arrival; c.tx = h.x - d.x * stop; c.ty = h.y - d.y * stop; } else { c.tx = h.x; c.ty = h.y; }
  emit(s, 'rush_hop', p.x, p.y, c.hop);
}
function rushStrike(s: GameState, c: HeroCast) {
  const p = s.player, form = c.form === 1, h = c.hops[c.hop], r = (h.id ? REN.e.blast : REN.e.fallbackBlast) * s.mods.beamWidth * (form ? REN.e.formBlast : 1), dmg = (h.id ? REN.e.damage : REN.e.fallbackDamage) * s.mods.beamDamage * formMul(s, form ? 1.15 : 1);
  const bx = h.id ? h.x : p.x + c.dirX * 30, by = h.id ? h.y : p.y + c.dirY * 30;
  let hits = 0;
  for (const e of s.enemies) {
    if (!alive(e)) continue; const dx = e.x - bx, dy = e.y - by, d = Math.hypot(dx, dy); if (d > r + e.radius) continue;
    const fall = 1 - 0.4 * clamp(d / r, 0, 1); if (!damageEnemy(s, e, dmg * fall, { area: true })) push(s, e, dx, dy, 18 * fall, 0.35); hits++; feedConductor(s);
  }
  if (form && c.hop > 0) {   // Ascendant: the route itself burns (enemies on the line between two strikes)
    const a = c.hops[c.hop - 1], x0 = a.x, y0 = a.y, x1 = h.x, y1 = h.y, L = Math.hypot(x1 - x0, y1 - y0) || 1;
    for (const e of s.enemies) { if (!alive(e) || e.id === h.id) continue; const u = clamp(((e.x - x0) * (x1 - x0) + (e.y - y0) * (y1 - y0)) / (L * L), 0, 1), px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u; if (Math.hypot(e.x - px, e.y - py) <= 34 + e.radius) { damageEnemy(s, e, dmg * 0.4, { area: true }); hits++; } }
    arc(s, x0, y0, x1, y1, 0.3);
  }
  ring(s, 'rush', bx, by, r, 0.32); emit(s, 'rush_strike', bx, by, hits);
}
function updateRush(s: GameState, c: HeroCast, dt: number) {
  const p = s.player, per = REN.e.hopTime + REN.e.strikeTime;
  if (c.hop >= c.hops.length) return;
  c.hopT += dt; p.invulnerable = Math.max(p.invulnerable, 0.12);
  if (c.hopT <= REN.e.hopTime + 1e-9) {
    const u = easeOut(c.hopT / REN.e.hopTime), wx = c.sx + (c.tx - c.sx) * u, wy = c.sy + (c.ty - c.sy) * u;
    if (dt > 0) slideMove(p, (wx - p.x) / dt, (wy - p.y) / dt, dt);
  } else if (c.pulses < c.hop + 1) { c.pulses = c.hop + 1; rushStrike(s, c); }
  if (c.hopT >= per - 1e-9) { c.hop++; if (c.hop < c.hops.length) beginHop(s, c); else { c.len = c.t + REN.e.recover; emit(s, 'rush_end', p.x, p.y); } }
}

function startBloodstar(s: GameState): boolean {
  const p = s.player, tg = pickGround(s, REN.r.range, REN.r.defaultRange, 130, REN.base.radius), dir = normalize(tg.x - p.x, tg.y - p.y);
  const c = newCast(s, 'bloodstar', dir.x || dir.y ? dir : normalize(p.aimX, p.aimY), REN.r.windup + REN.r.flight + REN.r.recover); p.sphereCooldown = REN.r.cooldown * s.mods.sphereCd;
  c.tx = tg.x; c.ty = tg.y; c.sx = p.x; c.sy = p.y; s.hx.act = c; emit(s, 'bloodstar_crouch', p.x, p.y); return true;
}
/** Ground target for a leap / blast: the pointer spot (or stick direction at the default range) pulled onto the densest nearby cluster; walls pull it back. */
export function pickGround(s: GameState, maxRange: number, defaultRange: number, cluster: number, bodyR: number): { x: number; y: number } {
  const p = s.player, fa = freeAim(s); let best: { x: number; y: number } | null = null, bestScore = -Infinity, pt: { x: number; y: number };
  const clampWall = (x: number, y: number) => { let r = Math.hypot(x - p.x, y - p.y); const d = normalize(x - p.x, y - p.y); while (r > 0 && blocked(p.x + d.x * r, p.y + d.y * r, bodyR)) r -= 10; return { x: p.x + d.x * r, y: p.y + d.y * r }; };
  if (fa) { const r = clamp(fa.d ?? defaultRange, 70, maxRange); pt = clampWall(p.x + fa.x * r, p.y + fa.y * r); }
  const near = s.enemies.filter(e => alive(e) && Math.hypot(e.x - p.x, e.y - p.y) <= maxRange);
  for (const e of near) {
    if (fa && Math.hypot(e.x - pt!.x, e.y - pt!.y) > cluster * 0.9) continue;
    let n = 0; for (const o of near) if (Math.hypot(o.x - e.x, o.y - e.y) <= cluster) n++;
    const score = n * 1000 - (fa ? Math.hypot(e.x - pt!.x, e.y - pt!.y) : Math.hypot(e.x - p.x, e.y - p.y)); if (score > bestScore) { bestScore = score; best = { x: e.x, y: e.y }; }
  }
  if (best) return clampWall(best.x, best.y);
  if (fa) return pt!;
  const d = normalize(p.aimX, p.aimY); return clampWall(p.x + d.x * defaultRange, p.y + d.y * defaultRange);
}
function slam(s: GameState, c: HeroCast) {
  const p = s.player, form = c.form === 1, R = REN.r.radius * s.mods.sphereRadius, dmg = REN.r.damage * s.mods.sphereDamage * formMul(s, form ? REN.r.formDamage : 1);
  let hits = 0;
  for (const e of s.enemies) {
    if (!alive(e)) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > R + e.radius) continue;
    const fall = 1 - (1 - REN.r.edgeFalloff) * clamp(d / R, 0, 1); if (!damageEnemy(s, e, dmg * fall, { area: true })) push(s, e, dx || 0.01, dy || 0.01, REN.r.push * fall / 4, REN.r.stagger * fall); hits++;
  }
  ring(s, 'slam', p.x, p.y, R, 0.5); emit(s, 'bloodstar_slam', p.x, p.y, hits);
  s.hx.pending.push({ at: s.hx.t + REN.r.ringAt, x: p.x, y: p.y, radius: R * REN.r.ring, damage: dmg * REN.r.ringDamage, push: 0, kind: 'ring' });
  if (form) s.hx.pending.push({ at: s.hx.t + REN.r.reboundAt, x: p.x, y: p.y, radius: R * REN.r.formRebound, damage: dmg * REN.r.reboundDamage, push: 140, kind: 'rebound' });
  if (s.mods.sphereEcho > 0) s.hx.pending.push({ at: s.hx.t + 0.9, x: p.x, y: p.y, radius: R * (s.mods.sphereEcho === 2 ? 1 : 0.85), damage: dmg * (s.mods.sphereEcho === 2 ? 1 : 0.5), push: 90, kind: 'ring' });
}
function updateBloodstar(s: GameState, c: HeroCast, dt: number, before: number) {
  const p = s.player, fl0 = REN.r.windup, fl1 = REN.r.windup + REN.r.flight;
  if (c.t >= fl0 && before < fl0) emit(s, 'bloodstar_leap', p.x, p.y);
  if (c.t >= fl0 && c.t < fl1 + 1e-9) {
    p.invulnerable = Math.max(p.invulnerable, 0.12); const u = easeOut((c.t - fl0) / REN.r.flight), wx = c.sx + (c.tx - c.sx) * u, wy = c.sy + (c.ty - c.sy) * u;
    if (dt > 0) slideMove(p, (wx - p.x) / dt, (wy - p.y) / dt, dt);
  }
  if (!c.released && c.t >= fl1 - 1e-9) { c.released = true; slam(s, c); }
  if (before < c.dur && c.t >= c.dur - 1e-9) emit(s, 'bloodstar_end', p.x, p.y);
}

/* ---- Sora's Celestial Lance */
function startLance(s: GameState): boolean {
  const p = s.player, dir = aimDir(s, SORA.e.length[0] + 200); const c = newCast(s, 'celestial_lance', dir, SORA.e.maxCharge + SORA.e.fire + SORA.e.recover);
  s.hx.act = c; emit(s, 'lance_charge', p.x, p.y); void p; return true;
}
const lanceTier = (charge: number, form: boolean) => { let t = 0; for (let i = 0; i < SORA.e.tiers.length; i++) if (charge >= SORA.e.tiers[i] - 1e-9) t = i; return Math.min(2, t + (form ? SORA.e.formTierBoost : 0)); };
export const lanceHalfWidth = (s: GameState, tier: number, form: boolean) => SORA.e.halfWidth[tier] * s.mods.beamWidth * (form ? SORA.e.formWidth : 1);
export const lanceLength = (tier: number) => SORA.e.length[tier];
function lanceRay(x: number, y: number, dx: number, dy: number, max: number): number { for (let d = 0; d <= max; d += 8) if (blocked(x + dx * d, y + dy * d, 0)) return Math.max(0, d - 8); return max; }
function lanceFire(s: GameState, c: HeroCast) {
  const p = s.player, form = c.form === 1, tier = lanceTier(c.charge, form), pre = hand(s, c.dirX, c.dirY, 26, 'lance'), dir = freeAim(s) ?? aimFromMuzzle(s, pre.x, pre.y, SORA.e.length[tier], aimDir(s, SORA.e.length[tier]));
  c.dirX = dir.x; c.dirY = dir.y; c.face = faceOf(dir.x, dir.y); c.tier = tier; c.released = true; c.t = SORA.e.maxCharge; c.dur = c.t + SORA.e.fire + SORA.e.recover;
  const o = hand(s, dir.x, dir.y, 26, 'lance'); c.sx = o.x; c.sy = o.y; c.len = lanceRay(o.x, o.y, dir.x, dir.y, SORA.e.length[tier]);
  p.beamCooldown = SORA.e.cooldown * s.mods.beamCd; emit(s, 'lance_fire', o.x, o.y, tier); lancePulse(s, c, 1);
}
function lancePulse(s: GameState, c: HeroCast, scale: number) {
  const form = c.form === 1, hw = lanceHalfWidth(s, c.tier, form), dmg = SORA.e.damage[c.tier] * s.mods.beamDamage * formMul(s, form ? 1.12 : 1) * scale; let hits = 0;
  const lane: Enemy[] = [];
  for (const e of s.enemies) {
    if (!alive(e)) continue; const ex = e.x - c.sx, ey = e.y - c.sy, along = ex * c.dirX + ey * c.dirY; if (along < -e.radius || along > c.len + e.radius) continue;
    if (Math.abs(ex * -c.dirY + ey * c.dirX) > hw + e.radius) continue; lane.push(e);
  }
  for (const e of lane) { damageEnemy(s, e, dmg); hits++; feedConductor(s); }
  if (form && c.pulses === 0) {   // Sovereign: blue-white arcs leap to enemies beside the beam, and a flare detonates at its tip
    let n = 0;
    for (const e of s.enemies) {
      if (!alive(e) || lane.includes(e) || n >= SORA.e.formArcs) continue; const ex = e.x - c.sx, ey = e.y - c.sy, along = clamp(ex * c.dirX + ey * c.dirY, 0, c.len), px = c.sx + c.dirX * along, py = c.sy + c.dirY * along;
      if (Math.hypot(e.x - px, e.y - py) <= SORA.e.formArcRange + e.radius) { damageEnemy(s, e, dmg * 0.6, { area: true }); arc(s, px, py, e.x, e.y); n++; hits++; }
    }
    const tx = c.sx + c.dirX * c.len, ty = c.sy + c.dirY * c.len;
    for (const e of s.enemies) if (alive(e) && Math.hypot(e.x - tx, e.y - ty) <= SORA.e.formFlare + e.radius) { damageEnemy(s, e, dmg * 0.5, { area: true }); hits++; }
    ring(s, 'horizon', tx, ty, SORA.e.formFlare, 0.35);
  }
  c.pulses++; emit(s, 'lance_pulse', c.sx + c.dirX * c.len, c.sy + c.dirY * c.len, hits);
}
function updateLance(s: GameState, c: HeroCast, dt: number) {
  if (!c.released) {
    const before = c.charge; c.charge = Math.min(SORA.e.maxCharge, c.charge + dt);
    const d = freeAim(s); if (d) { c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); } else { const a = aimDir(s, 560); c.dirX = a.x; c.dirY = a.y; c.face = faceOf(a.x, a.y); }
    for (let i = 1; i < SORA.e.tiers.length; i++) if (before < SORA.e.tiers[i] && c.charge >= SORA.e.tiers[i]) emit(s, 'lance_tier', s.player.x, s.player.y, i);
    c.t = c.charge;   // charging is not on the cast clock: it holds until release or the cap
    if ((!s.eHeld && c.charge >= SORA.e.minCharge) || c.charge >= SORA.e.maxCharge - 1e-9) lanceFire(s, c);
    return;
  }
  const tf = c.t - SORA.e.maxCharge, extra = 1 + s.mods.beamLinger, every = SORA.e.fire / extra;
  while (c.pulses < 1 + extra && tf >= c.pulses * every - 1e-9) lancePulse(s, c, 0.5);
}

/* ---- Sora's Zero Horizon */
function startHorizon(s: GameState): boolean {
  const p = s.player, form = inForm(s), n = form ? SORA.r.formOrbs : SORA.r.orbs, dir = aimDir(s, SORA.r.range);
  const c = newCast(s, 'zero_horizon', dir, SORA.r.summon + (form ? SORA.r.formOrbit : SORA.r.orbit) + SORA.r.recover);
  p.sphereCooldown = SORA.r.cooldown * s.mods.sphereCd; s.hx.act = c;
  s.hx.orbs = Array.from({ length: n }, (_, i): Orb => ({ id: s.nextId++, a: (i / n) * Math.PI * 2, x: p.x, y: p.y, tx: p.x, ty: p.y, fx: p.x, fy: p.y }));
  s.hx.orbPhase = 'summon'; s.hx.orbT = 0; s.hx.orbForm = p.form; s.hx.orbRadius = SORA.r.radius * s.mods.sphereRadius; s.hx.orbDamage = SORA.r.damage * s.mods.sphereDamage * formMul(s, form ? SORA.r.formDamage : 1);
  emit(s, 'horizon_summon', p.x, p.y, n); return true;
}
function assignOrbTargets(s: GameState) {
  const p = s.player, orbs = s.hx.orbs, R = s.hx.orbRadius;
  const cands = s.enemies.filter(e => alive(e) && Math.hypot(e.x - p.x, e.y - p.y) <= SORA.r.range);
  const pts: { x: number; y: number; w: number }[] = [];
  const scored = cands.map(e => ({ e, n: cands.filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= R).length })).sort((a, b) => b.n - a.n || Math.hypot(a.e.x - p.x, a.e.y - p.y) - Math.hypot(b.e.x - p.x, b.e.y - p.y));
  for (const { e } of scored) { if (pts.length >= orbs.length) break; if (pts.every(q => Math.hypot(q.x - e.x, q.y - e.y) >= R * 0.8)) pts.push({ x: e.x, y: e.y, w: 1 }); }
  const dir = s.hx.act ? { x: s.hx.act.dirX, y: s.hx.act.dirY } : normalize(p.aimX, p.aimY);
  if (!pts.length) { const cx = p.x + dir.x * 190, cy = p.y + dir.y * 190; pts.push({ x: cx, y: cy, w: 1 }); }
  orbs.forEach((o, i) => {
    const t = pts[i % pts.length], extra = Math.floor(i / pts.length), ang = (extra * 2.399) + i;   // surplus orbs ring the same target so they never stack exactly
    o.fx = o.x; o.fy = o.y; const off = extra ? R * 0.55 : 0; o.tx = t.x + Math.cos(ang) * off; o.ty = t.y + Math.sin(ang) * off;
  });
}
function detonateOrbs(s: GameState, scale: number) {
  const h = s.hx, R = h.orbRadius; let hits = 0; const cx = h.orbs.reduce((a, o) => a + o.tx, 0) / Math.max(1, h.orbs.length), cy = h.orbs.reduce((a, o) => a + o.ty, 0) / Math.max(1, h.orbs.length);
  if (s.b22.legendary.includes('zero_convergence') && h.orbs.length) {   // B22 Zero Convergence: one precision blast at the densest convergence point instead of scattered bursts
    const { cx: bx, cy: by } = densestOrbTarget(s);
    for (const e of s.enemies) { if (!alive(e)) continue; const d = Math.hypot(e.x - bx, e.y - by); if (d > R * 1.3 + e.radius) continue; damageEnemy(s, e, h.orbDamage * Math.min(4, h.orbs.length * 0.6) * scale * (1 - 0.3 * clamp(d / (R * 1.3), 0, 1)), { area: true }); hits++; }
    ring(s, 'horizon', bx, by, R * 1.3, 0.5); emit(s, 'horizon_burst', bx, by, hits); return { cx: bx, cy: by };
  }
  for (const o of h.orbs) {
    for (const e of s.enemies) {
      if (!alive(e)) continue; const dx = e.x - o.tx, dy = e.y - o.ty, d = Math.hypot(dx, dy); if (d > R + e.radius) continue;
      const fall = 1 - 0.4 * clamp(d / R, 0, 1); damageEnemy(s, e, h.orbDamage * fall * scale, { area: true }); hits++;
    }
    ring(s, 'horizon', o.tx, o.ty, R, 0.4);
  }
  emit(s, 'horizon_burst', cx, cy, hits);
  return { cx, cy };
}
function updateOrbs(s: GameState, dt: number) {
  const h = s.hx; if (h.orbPhase === 'none') return;
  const p = s.player, form = h.orbForm === 1, orbit = form ? SORA.r.formOrbit : SORA.r.orbit; h.orbT += dt;
  if (h.orbPhase === 'summon' || h.orbPhase === 'orbit') {
    const spin = h.orbT * (form ? 7 : 5.5), k = h.orbPhase === 'summon' ? easeOut(h.orbT / SORA.r.summon) : 1, R = SORA.r.orbitRadius * (0.35 + 0.65 * k);
    h.orbs.forEach((o, i) => { const a = o.a + spin; o.x = p.x + Math.cos(a) * R; o.y = p.y + Math.sin(a) * R * 0.72 - 10; void i; });
    if (h.orbPhase === 'summon' && h.orbT >= SORA.r.summon) h.orbPhase = 'orbit';
    if (h.orbPhase === 'orbit' && h.orbT >= SORA.r.summon + orbit) { assignOrbTargets(s); h.orbPhase = 'converge'; h.orbT = 0; emit(s, 'horizon_converge', p.x, p.y, h.orbs.length); }
  } else if (h.orbPhase === 'converge') {
    const u = easeIn(h.orbT / SORA.r.travel);
    for (const o of h.orbs) { o.x = o.fx + (o.tx - o.fx) * u; o.y = o.fy + (o.ty - o.fy) * u; }
    if (h.orbT >= SORA.r.travel - 1e-9) {
      const { cx, cy } = detonateOrbs(s, 1);
      if (form) h.pending.push({ at: h.t + 0.18, x: cx, y: cy, radius: SORA.r.formRing, damage: h.orbDamage * SORA.r.formRingDamage, push: 0, kind: 'horizon' });
      if (s.mods.sphereEcho > 0) { const echo = s.mods.sphereEcho === 2 ? 1 : 0.5; h.pending.push({ at: h.t + 0.6, x: cx, y: cy, radius: -1, damage: echo, push: 0, kind: 'horizon' }); }   // radius -1 = repeat the orb detonations at `damage` x strength
      h.orbPhase = 'none'; emit(s, 'horizon_end', cx, cy); h.echoOrbs = h.orbs.map(o => ({ ...o })); h.orbs = [];
    }
  }
}

/* ------------------------------------------------------------------ per-tick update */
export function updateHero(s: GameState, dt: number) {
  const h = s.hx; h.t += dt; updateRenCombat(s, dt); updateSoraCombat(s, dt); updateVexCombat(s, dt);
  if (s.hero === 'vex') updateVexMarks(s, dt);
  for (const r of h.rings) r.t += dt; h.rings = h.rings.filter(r => r.t < r.dur);
  for (const a of h.arcs) a.t += dt; h.arcs = h.arcs.filter(a => a.t < a.dur);
  const due = h.pending.filter(q => q.at <= h.t); h.pending = h.pending.filter(q => q.at > h.t);
  for (const q of due) {
    if (q.radius < 0 && h.echoOrbs) {   // Afterimage / Twin Horizon: the same orb detonations again
      const keep = h.orbs, keepR = h.orbRadius; h.orbs = h.echoOrbs; detonateOrbs(s, q.damage); h.orbs = keep; void keepR; continue;
    }
    let hits = 0;
    for (const e of s.enemies) {
      if (!alive(e)) continue; const dx = e.x - q.x, dy = e.y - q.y, d = Math.hypot(dx, dy); if (d > q.radius + e.radius) continue;
      if (q.kind === 'ring' && d < q.radius / REN.r.ring - 4 && q.push === 0) continue;   // the outer ring only hits the band outside the slam
      if (!damageEnemy(s, e, q.damage, { area: true }) && q.push > 0) push(s, e, dx || 0.01, dy || 0.01, q.push / 4, 0.4); hits++;
    }
    ring(s, q.kind === 'rebound' ? 'rebound' : q.kind === 'horizon' ? 'horizon' : 'ring', q.x, q.y, q.radius, 0.45);
    emit(s, q.kind === 'rebound' ? 'bloodstar_rebound' : q.kind === 'horizon' ? 'horizon_burst' : 'bloodstar_ring', q.x, q.y, hits);
  }
  updateBolts(s, dt); updateOrbs(s, dt);
  const c = h.act; if (!c) return;
  const before = c.t; if (c.act !== 'celestial_lance' || c.released) c.t += dt;
  switch (c.act) {
    case 'crimson_break': updateCrimsonBreak(s, c, before); break;
    case 'meteor_rush': updateRush(s, c, dt); break;
    case 'bloodstar': updateBloodstar(s, c, dt, before); break;
    case 'azure_volley': updateAzureVolley(s, c); break;
    case 'celestial_lance': updateLance(s, c, dt); if (c.released && before < SORA.e.maxCharge + SORA.e.fire && c.t >= SORA.e.maxCharge + SORA.e.fire) emit(s, 'lance_end', s.player.x, s.player.y); break;
    case 'zero_horizon': break;
    case 'parry_halo': case 'rift_reversal': case 'oathbreaker_seal': updateVexAct(s, c, dt, before); break;
    case 'infernal_cyclone': case 'scarlet_rampage': case 'crimson_catastrophe': case 'nova_fist': updateRenAct(s, c, dt, before); break;
    case 'azure_prison': case 'heavens_spear': case 'azure_collapse': case 'astral_devastation': updateSoraAct(s, c, dt); break;
    case 'mirror_guard': case 'rift_execution': case 'oath_ruin': case 'abyssal_fang': case 'phantom_legion': case 'dim_severance': case 'domain_exile': case 'event_horizon': updateVexFormAct(s, c, dt); break;
    case 'ultimate': break;
  }
  if (h.act === c && (c.act === 'celestial_lance' ? c.released && c.t >= c.dur - 1e-9 : c.act === 'meteor_rush' ? c.hop >= c.hops.length && c.t >= c.len - 1e-9 : c.t >= c.dur - 1e-9)) h.act = null;
}
function updateBolts(s: GameState, dt: number) {
  const bolts = s.hx.bolts; if (!bolts.length) return; const keep: Bolt[] = [];
  for (const b of bolts) {
    b.ttl -= dt; if (b.ttl <= 0) continue;
    if (b.homing > 0) {   // gentle steering toward the nearest enemy ahead, speed unchanged
      let best: Enemy | null = null, bd = 260 * 260; const sp = Math.hypot(b.vx, b.vy);
      for (const e of s.enemies) { if (!alive(e) || b.hits.includes(e.id)) continue; const dx = e.x - b.x, dy = e.y - b.y, d2 = dx * dx + dy * dy; if (d2 < bd && (dx * b.vx + dy * b.vy) > 0) { bd = d2; best = e; } }
      if (best) { const want = Math.atan2(best.y - b.y, best.x - b.x), cur = Math.atan2(b.vy, b.vx); let da = want - cur; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; const a = cur + da * clamp(b.homing * 60 * dt, 0, 1); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (blocked(b.x, b.y, 0)) continue;
    let dead = false;
    for (const e of s.enemies) {
      if (!alive(e) || b.hits.includes(e.id)) continue; if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > (e.radius + b.radius) ** 2) continue;
      damageEnemy(s, e, b.damage, { proj: true }); b.hits.push(e.id); if (b.kind === 'needle') driveGain(s, 1.1);
      if (b.pierce <= 0) { dead = true; break; } b.pierce--;
    }
    if (!dead) keep.push(b);
  }
  s.hx.bolts = keep;
}

/* ------------------------------------------------------------------ cross-system hooks */
/** castMoveScale for the heroes (0 = rooted by a committed move). */
export function heroMoveScale(s: GameState): number {
  const c = s.hx.act; if (!c) return 1;
  switch (c.act) {
    case 'crimson_break': return c.moving ? REN.q.moveScale : 0.28;
    case 'meteor_rush': return 0;
    case 'bloodstar': return c.t < REN.r.windup + REN.r.flight ? 0 : 0.5;
    case 'azure_volley': return SORA.q.moveScale;
    case 'celestial_lance': return !c.released ? SORA.e.moveCharge : c.t < SORA.e.maxCharge + SORA.e.fire ? SORA.e.moveFire : 0.6;
    case 'zero_horizon': return c.t < SORA.r.summon ? SORA.r.moveScale : 0.7;
    case 'parry_halo': case 'rift_reversal': case 'oathbreaker_seal': return vexMoveScale(c);
    case 'infernal_cyclone': case 'scarlet_rampage': case 'crimson_catastrophe': case 'nova_fist': return renMoveScale(c);
    case 'azure_prison': case 'heavens_spear': case 'azure_collapse': case 'astral_devastation': return soraMoveScale(c);
    case 'mirror_guard': case 'rift_execution': case 'oath_ruin': case 'abyssal_fang': case 'phantom_legion': case 'dim_severance': case 'domain_exile': case 'event_horizon': return vexFormMoveScale(c);
    case 'ultimate': return 0.2;
  }
}
/** Dash (or the form reveal) ends the move now. A cancelled Lance charge is never free; a dash does not cancel the orbs already summoned. */
export function cancelHero(s: GameState) {
  const c = s.hx.act; if (!c) return;
  if (isRenAct(c)) { renCancelAct(s, c); return; }
  if (isSoraAct(c)) { soraCancelAct(s, c); return; }
  if (isVexFormAct(c)) { vexFormCancelAct(s, c); return; }
  if (c.act === 'celestial_lance' && !c.released) s.player.beamCooldown = Math.max(s.player.beamCooldown, SORA.e.cooldown * SORA.e.cancelCooldown * s.mods.beamCd);
  if (c.act === 'zero_horizon' && s.hx.orbPhase !== 'converge') { s.hx.orbs = []; s.hx.orbPhase = 'none'; }
  emit(s, 'cast_cancel', s.player.x, s.player.y); s.hx.act = null;
}
/** A hit interrupts only an unreleased Lance charge; every other move is committed. */
export function interruptHero(s: GameState) { const c = s.hx.act; if (c && ((c.act === 'celestial_lance' && !c.released) || (c.act === 'nova_fist' && !c.released) || (c.act === 'astral_devastation' && !c.released) || ((c.act === 'abyssal_fang' || c.act === 'event_horizon') && !c.released))) cancelHero(s); }
/** Hard reset used by the transformation reveal: nothing of the old move may leak into the cinematic. */
export function clearHero(s: GameState) { s.hx.act = null; s.hx.sf = []; s.hx.vf = []; s.hx.bolts = []; s.hx.orbs = []; s.hx.orbPhase = 'none'; s.hx.pending = []; s.hx.arcs = []; s.hx.rings = []; }

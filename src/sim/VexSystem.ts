import { faceOf } from './AbilitySystem';
import { strikeHand } from './Strike';
/** B22.3 Vex: the counter specialist. Null Blade (auto), Parry Halo (Q), Rift Reversal (E), Oathbreaker Seal (R). Every effect is a real damage / status event in the sim; the renderer only reads it. Handed control by HeroSystem when `state.hero === 'vex'`. */
import type { AbilityEventKind, Enemy, GameState, HeroCast } from './GameState';
import { damageEnemy } from './CombatSystem';
import { blocked, slideMove } from './CollisionSystem';
import { ASCEND, VEX } from '../content/heroKits';
import { isBoss } from '../content/enemies';
import { normalize } from '../core/Math';
import { aimDir, driveGain, emit, newCast, nearest, pathClear, push } from './HeroSystem';
import { feetInCircle, feetInCone, feetInLane, feetInRect } from './Ground';
import { bump, b22Emit } from '../b22/state';
import { activeForm } from './B22Mastery';
import { behaviorOf } from './bosses/runner';

const alive = (e: Enemy) => e.hp > 0;
const form = (s: GameState) => s.player.form;
const formIdx = (s: GameState) => Math.max(0, Math.min(1, s.player.form - 1));
const formMul = (s: GameState, base: number) => (s.player.form ? base * s.mods.formPower : 1);
const emitK = (s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number) => emit(s, kind, x, y, n);
const coolMul = (s: GameState) => (form(s) === 1 ? VEX.e.formCool : form(s) === 2 ? 0.7 : 1);
const isMarked = (s: GameState, id: number) => s.b22.marks.some(m => m.enemy === id && m.src === 'seal');

/* ------------------------------------------------------------------ Null Blade */
export function vexAuto(s: GameState) {
  const p = s.player, f = form(s), period = Math.max(0.16, p.attackPeriod * (f ? 0.8 : 1));
  const tgt = nearest(s, p.attackRange); if (!tgt) { p.attackClock = 0; return; }
  p.attackClock += period;
  const dir = normalize(tgt.x - p.x, tgt.y - p.y), step = s.hx.autoStep++ % VEX.auto.step, fin = step === VEX.auto.step - 1;
  const cos = Math.cos(((f ? VEX.auto.arcDeg + 10 : VEX.auto.arcDeg) * Math.PI) / 180);
  const cands = s.enemies.filter(e => { if (!alive(e)) return false; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); return d <= p.attackRange + e.radius && (d < 1 || (dx * dir.x + dy * dir.y) / d >= cos); })
    .sort((a, b) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2)).slice(0, p.targets + (f ? 1 : 0));
  const base = p.attackDamage * formMul(s, f ? ASCEND.vex.autoMul[formIdx(s)] : 1) * (fin ? VEX.auto.finisherMul : 1) * (s.b22.vex.requiem > 0 && fin ? 1.5 : 1);
  let hits = 0;
  for (const e of cands) {
    const marked = isMarked(s, e.id), dmg = base * (marked ? VEX.auto.markMul : 1);
    const mk = marked ? s.b22.marks.find(m => m.enemy === e.id && m.src === 'seal') : undefined; if (mk) mk.power += dmg;
    damageEnemy(s, e, dmg); hits++; if (fin) push(s, e, e.x - p.x, e.y - p.y, VEX.auto.finisherPush / 4, 0.18); driveGain(s, fin ? 2.4 : 1.4);
  }
  if (fin && s.b22.vex.requiem > 0) s.b22.vex.requiem = 0;
  s.hx.strike = { x: dir.x, y: dir.y, t: s.time, step, hand: strikeHand(faceOf(dir.x, dir.y), dir.x, dir.y, step) };   // the blade hand: a target on the left is struck with a left-hand swing
  emit(s, fin ? 'auto_finisher' : 'auto_hit', p.x + dir.x * 34, p.y + dir.y * 34, hits);
}

/* ------------------------------------------------------------------ Q: Parry Halo */
export function vexQ(s: GameState): boolean {
  const p = s.player, dir = aimDir(s, 200);
  p.qCooldown = VEX.q.cooldown * coolMul(s); s.hx.act = newCast(s, 'parry_halo', dir, VEX.q.perfect * perfectScale(s) + VEX.q.guard + VEX.q.recover);
  const v = s.b22.vex; v.guardDir = { x: dir.x, y: dir.y }; v.parryT = 0; v.parryLeft = VEX.q.perfect * perfectScale(s) + VEX.q.guard;
  emitK(s, 'parry_start', p.x, p.y); return true;
}
const perfectScale = (s: GameState) => (form(s) === 1 ? VEX.q.formPerfect : form(s) === 2 ? 1.35 : 1) * (s.b22.branches.includes('reversal_guard') ? 1.6 : s.b22.branches.includes('mirror_counter') ? 0.7 : 1);
/** Called by damagePlayer for every hostile hit. Returns the damage that reaches Vex (0 = parried), or null when no guard applies. Arena hazards (owner 0) are never parryable. */
export function vexIntercept(s: GameState, dmg: number, from: { x: number; y: number } | undefined, owner: number | undefined): { dmg: number; parried: boolean } | null {
  if (s.hero !== 'vex') return null; const c = s.hx.act; if (!c || c.act !== 'parry_halo') return null;
  const v = s.b22.vex; if (c.t > v.parryLeft) return null;
  if (owner === 0) return null;   // lane surges, pylons, shatterfall: only dodging answers them
  const p = s.player;
  if (from) { const dx = from.x - p.x, dy = from.y - p.y, d = Math.hypot(dx, dy) || 1, cos = (dx * v.guardDir.x + dy * v.guardDir.y) / d; if (cos < Math.cos(((VEX.q.arcDeg * (s.b22.branches.includes('reversal_guard') ? 1.25 : 1)) / 2) * Math.PI / 180)) return null; }
  const perfect = c.t <= VEX.q.perfect * perfectScale(s) && s.time - (v.parryCd ?? 0) > VEX.q.gap;
  if (!perfect) { emitK(s, 'parry_guard', p.x, p.y); s.impacts.push({ id: s.nextId++, kind: 'block', x: p.x, y: p.y, ttl: 0.2, life: 0.2 }); return { dmg: dmg * (1 - VEX.q.reduce), parried: false }; }
  v.parryCd = s.time; riposte(s, from, owner); return { dmg: 0, parried: true };
}
function riposte(s: GameState, from: { x: number; y: number } | undefined, owner: number | undefined) {
  const p = s.player, v = s.b22.vex, c = s.hx.act!, f = form(s), hadCharge = v.requiem > 0;
  const dir = v.guardDir, reach = VEX.q.riposteReach * (s.b22.branches.includes('reversal_guard') ? 0.9 : 1), arc = (VEX.q.riposteArc * Math.PI) / 180 / 2;
  const mirror = s.b22.branches.includes('mirror_counter'), dmg = p.qDamage * VEX.q.riposteMul * formMul(s, f ? 1.15 : 1) * (mirror ? 1.9 : s.b22.branches.includes('reversal_guard') ? 0.85 : 1) * (v.requiem > 0 ? 1.4 : 1);
  let hits = 0; const hit: Enemy[] = [];
  for (const e of s.enemies) {
    if (!alive(e)) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > reach + e.radius) continue;
    const a = Math.abs(Math.atan2(dir.x * dy - dir.y * dx, dir.x * dx + dir.y * dy)); if (d > 40 && a > arc + 0.3) continue;
    hit.push(e);
  }
  hit.sort((a, b) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2));
  for (const e of hit.slice(0, 6)) { damageEnemy(s, e, dmg, { area: true }); if (!isBoss(e.kind)) e.stagger = Math.max(e.stagger, VEX.q.stun * (s.b22.branches.includes('reversal_guard') ? 1.4 : 1)); hits++; }
  if (owner) { const ow = s.enemies.find(e => e.id === owner && alive(e)); if (ow) { behaviorOf(ow.kind)?.onEvade?.(s, ow); if (!isBoss(ow.kind)) { ow.stagger = Math.max(ow.stagger, VEX.q.stun); } } }   // an honest parry exposes a rival and staggers an ordinary attacker
  s.b22.m['parry.perfect'] = (s.b22.m['parry.perfect'] ?? 0) + 1; if (f) bump(s.b22, 'parry.perfect.form');
  if (s.b22.branches.length >= 0) { p.qCooldown = Math.max(0, p.qCooldown * (1 - VEX.q.refund)); }
  if (s.mods.beamDrive > 0) driveGain(s, s.mods.beamDrive * 2); driveGain(s, VEX.q.drive);
  v.requiem = hadCharge ? 0 : s.b22.legendary.includes('shard_requiem') ? 1 : 0;   // a parry stores ONE charge; spending it is not refunded
  if (f === 2) markNearby(s, 260, 4);
  c.t = Math.max(c.t, c.dur - 0.16);   // a successful parry ends the guard; no chaining
  s.impacts.push({ id: s.nextId++, kind: 'block', x: p.x + dir.x * 30, y: p.y + dir.y * 30, ttl: 0.25, life: 0.25, heavy: true });
  emitK(s, 'parry_perfect', p.x + dir.x * 30, p.y + dir.y * 30, hits); b22Emit(s.b22, 'parry', p.x, p.y, { x2: from?.x, y2: from?.y });
}
function markNearby(s: GameState, range: number, cap: number) {
  const p = s.player; let n = 0;
  for (const e of s.enemies.filter(alive).sort((a, b) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2))) {
    if (n >= cap) break; if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > range * range || isMarked(s, e.id) || (isBoss(e.kind) && s.b22.marks.some(m => s.enemies.find(x => x.id === m.enemy && isBoss(x.kind))))) continue;
    s.b22.marks.push({ id: s.nextId++, enemy: e.id, t: VEX.r.fuse + 2, power: 0, src: 'seal' }); n++;
  }
}

/* ------------------------------------------------------------------ E: Rift Reversal */
/** A hostile hit is about to land on the feet: used to judge a PERFECT reversal (the shift answers a real threat). */
export function threatened(s: GameState, horizon = VEX.e.perfectWindow): boolean {
  for (const h of s.hazards) {
    if (h.damage <= 0 || h.shape === 'sigil' || h.owner === 0) continue;
    const soon = h.fired ? (h.activeLeft ?? 0) > 0 : h.delay <= horizon; if (!soon) continue;
    const hit = h.shape === 'cone' ? feetInCone(s, h) : h.shape === 'lane' ? feetInLane(s, h) : h.shape === 'rect' ? feetInRect(s, { x: h.x, y: h.y, w: h.w ?? 0, h: h.h ?? 0 }) : feetInCircle(s, h.x, h.y, h.r);
    if (hit) return true;
  }
  const p = s.player; for (const sh of s.enemyShots) if ((sh.x - p.x) ** 2 + (sh.y - p.y) ** 2 < (sh.radius + p.radius + 60) ** 2) return true;
  for (const e of s.enemies) if (e.hp > 0 && e.mode === 'strike' && !isBoss(e.kind) && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 110 ** 2) return true;
  return false;
}
export function vexE(s: GameState): boolean {
  const p = s.player, move = normalize(p.vx || 0, p.vy || 0);
  const nearT = nearest(s, 260), dir = aimDir(s, 260); let d = dir; if (s.hx.moving && (p.aimX || p.aimY)) d = normalize(p.aimX, p.aimY);
  void move; void nearT;
  const c = newCast(s, 'rift_reversal', d, VEX.e.windup + VEX.e.recover + 0.15);
  c.hops = []; c.charge = threatened(s) ? 1 : 0;   // charge=1 marks a PERFECT reversal (answered a real threat)
  p.beamCooldown = VEX.e.cooldown * s.mods.beamCd * coolMul(s) * (s.b22.branches.includes('eclipse_shift') ? 1.0 : 1);
  s.hx.act = c; p.invulnerable = Math.max(p.invulnerable, VEX.e.iframes);
  emitK(s, 'reversal_shift', p.x, p.y, c.charge ? 1 : 0); return true;
}
function doShift(s: GameState, c: HeroCast) {
  const p = s.player, f = form(s), eclipse = s.b22.branches.includes('eclipse_shift'), shadow = s.b22.branches.includes('shadow_riposte');
  let dist = VEX.e.distance * s.mods.beamWidth * (f === 2 ? VEX.e.formDistance : 1) * (eclipse ? 1.35 : shadow ? 0.7 : 1);
  let tx = p.x, ty = p.y;
  // shadow riposte: blink behind the nearest marked (or any) target in reach instead of along the aim
  let behind: Enemy | null = null;
  if (shadow) { for (const e of s.enemies) if (alive(e) && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (dist + e.radius) ** 2 && (!behind || isMarked(s, e.id))) behind = e; }
  if (behind) { const d0 = normalize(behind.x - p.x, behind.y - p.y); tx = behind.x + d0.x * (behind.radius + p.radius + 6); ty = behind.y + d0.y * (behind.radius + p.radius + 6); if (blocked(tx, ty, p.radius)) { tx = p.x; ty = p.y; behind = null; } }
  if (!behind) { for (let k = 0; k < 14 && dist > 20; k++, dist -= 14) { const x = p.x + c.dirX * dist, y = p.y + c.dirY * dist; if (!blocked(x, y, p.radius)) { tx = x; ty = y; break; } /* Rift Reversal crosses terrain: only the landing must be open */ } }
  c.sx = p.x; c.sy = p.y; c.tx = tx; c.ty = ty;
  if (f === 2 || eclipse) s.b22.zones.push({ id: s.nextId++, kind: 'line', x: c.sx, y: c.sy, x2: tx, y2: ty, r: 26, t: 0, dur: 2.2, tick: 0.3, next: 0.3, dmg: p.qDamage * 0.35, push: 0, src: 'vex_fracture' });
  p.x = tx; p.y = ty; emitK(s, 'reversal_blink', tx, ty);
  // riposte: a valid target in reach is struck at the other end; with none the move is a pure reposition
  const reach = VEX.e.strikeReach * (1 + (s.mods.beamWidth - 1) * 0.6), cands = s.enemies.filter(e => alive(e) && (e.x - tx) ** 2 + (e.y - ty) ** 2 <= (reach + e.radius) ** 2).sort((a, b) => (a.x - tx) ** 2 + (a.y - ty) ** 2 - ((b.x - tx) ** 2 + (b.y - ty) ** 2));
  const n = 1 + Math.round(s.mods.beamLinger) + (c.charge ? 1 : 0), dmgBase = p.qDamage * VEX.e.riposteMul * s.mods.beamDamage * formMul(s, f ? 1.15 : 1);
  let hits = 0;
  for (const e of cands.slice(0, n)) {
    damageEnemy(s, e, dmgBase * (eclipse ? 0.8 : shadow ? 1.25 : 1) * (e === behind ? 1.3 : 1)); hits++; e.stagger = Math.max(e.stagger, 0.35);
    if (isMarked(s, e.id)) { const mk = s.b22.marks.find(m => m.enemy === e.id); if (mk) mk.power += dmgBase; }
    if (s.mods.beamDrive > 0) driveGain(s, s.mods.beamDrive);
  }
  if (hits) { bump(s.b22, 'riposte', hits); if (f) bump(s.b22, 'riposte.form', hits); driveGain(s, 4); emitK(s, 'reversal_riposte', tx, ty, hits); if (c.charge) { bump(s.b22, 'riposte.perfect'); s.b22.vex.riposteT = s.time; if (s.b22.legendary.includes('null_waltz') && s.time - (s.b22.legendCd.null_waltz ?? -99) > 8) { s.b22.legendCd.null_waltz = s.time; s.b22.vex.nullWaltz = 3; s.b22.vex.waltzAt = s.time + 0.2; } } }
}
/** Seal: mark -> fuse -> detonate */
export function vexR(s: GameState): boolean {
  const p = s.player, hasMarks = s.b22.marks.some(m => m.src === 'seal');
  if (hasMarks) { detonateSeal(s); return true; }   // pressing R again detonates early (cooldown is already running)
  if (p.sphereCooldown > 0) return false;
  const c = newCast(s, 'oathbreaker_seal', aimDir(s, VEX.r.range), VEX.r.windup + VEX.r.recover);
  s.hx.act = c; p.sphereCooldown = VEX.r.cooldown * s.mods.sphereCd * coolMul(s);
  emitK(s, 'seal_mark', p.x, p.y); return true;
}
/** Oathbreaker Seal grows with each transformation: base, Riftbound, Voidheart Exile. */
export const marksCap = (s: GameState) => VEX.r.marksByForm[Math.min(2, s.player.form)];
function applySeal(s: GameState) {
  const p = s.player, severance = s.b22.branches.includes('severance_judgment'), cap = severance ? 2 : marksCap(s);
  const cands = s.enemies.filter(e => alive(e) && !e.part && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= VEX.r.range ** 2).sort((a, b) => {
    if (severance) { const pa = (isBoss(a.kind) ? 3 : a.maxHp > 100 ? 2 : 0), pb = (isBoss(b.kind) ? 3 : b.maxHp > 100 ? 2 : 0); if (pa !== pb) return pb - pa; }
    return (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2);
  });
  let n = 0, bosses = 0;
  for (const e of cands) {
    if (n >= cap) break; if (isBoss(e.kind)) { if (bosses >= VEX.r.bossMarks) continue; bosses++; }
    s.b22.marks.push({ id: s.nextId++, enemy: e.id, t: VEX.r.fuse, power: 0, src: 'seal' }); n++;
    b22Emit(s.b22, 'mark', e.x, e.y, { n: e.id });
  }
  return n;
}
export function detonateSeal(s: GameState) {
  const p = s.player, marks = s.b22.marks.filter(m => m.src === 'seal'); if (!marks.length) return;
  s.b22.marks = s.b22.marks.filter(m => m.src !== 'seal');
  const base = p.qDamage * VEX.r.damage * s.mods.sphereDamage * formMul(s, form(s) ? 1.15 : 1), radius = VEX.r.wave * s.mods.sphereRadius * (s.b22.branches.includes('marked_detonation') ? 1.3 : 1);
  const severance = s.b22.branches.includes('severance_judgment'), chain = s.b22.branches.includes('marked_detonation');
  const spread: Enemy[] = []; let n = 0;
  for (const m of marks) {
    const e = s.enemies.find(x => x.id === m.enemy && alive(x)); if (!e) continue;
    let dmg = (base + m.power * VEX.r.power) * (severance ? 1.9 : 1); if (isBoss(e.kind)) dmg = Math.min(dmg, e.maxHp * 0.06);
    damageEnemy(s, e, dmg, { area: true }); n++; if (severance && e.hp > 0 && !isBoss(e.kind)) e.stagger = Math.max(e.stagger, 1.2);
    if (severance && e.hp > 0) { const mk = { id: s.nextId++, enemy: e.id, t: 3, power: 0, src: 'vuln' }; s.b22.marks.push(mk); }
    for (const o of s.enemies) { if (!alive(o) || o === e || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > (radius + o.radius) ** 2) continue; damageEnemy(s, o, dmg * (chain ? 0.55 : 0.5), { area: true }); if (chain && !isBoss(o.kind) && spread.length < 3 && !isMarked(s, o.id)) spread.push(o); }
    b22Emit(s.b22, 'seal_blast', e.x, e.y, { n: radius });
  }
  if (s.b22.legendary.includes('oathbreaker_chain')) for (const o of spread.slice(0, 3)) if (o.hp > 0) damageEnemy(s, o, base * 0.6, { area: true });
  if (s.mods.sphereEcho > 0 && n) s.hx.pending.push({ at: s.hx.t + 0.6, x: p.x, y: p.y, radius: 1, damage: base * 0.5 * s.mods.sphereEcho, push: 0, kind: 'ring' });
  emitK(s, 'seal_detonate', p.x, p.y, n);
}

/* ------------------------------------------------------------------ per-tick (called from HeroSystem.updateHero) */
export function updateVexAct(s: GameState, c: HeroCast, dt: number, before: number) {
  void dt;
  if (c.act === 'parry_halo') { if (c.t >= s.b22.vex.parryLeft && before < s.b22.vex.parryLeft) emitK(s, 'parry_end', s.player.x, s.player.y); return; }
  if (c.act === 'rift_reversal') { if (before < VEX.e.windup && c.t >= VEX.e.windup) doShift(s, c); return; }
  if (c.act === 'oathbreaker_seal') { if (before < VEX.r.windup && c.t >= VEX.r.windup) { const n = applySeal(s); emitK(s, 'seal_mark', s.player.x, s.player.y, n); } }
}
/** Marks expire into their detonation; fractures and Null Waltz steps tick here. Runs every tick for Vex regardless of the active move. */
export function updateVexMarks(s: GameState, dt: number) {
  const marks = s.b22.marks; if (!marks.length) return;
  let fuse = false;
  for (const m of marks) { m.t -= dt; if (m.src === 'seal' && m.t <= 0) fuse = true; }
  s.b22.marks = marks.filter(m => (m.t > 0 || m.src === 'seal') && s.enemies.some(e => e.id === m.enemy && e.hp > 0));
  if (fuse && s.b22.marks.some(m => m.src === 'seal')) detonateSeal(s);
}
export const vexMoveScale = (c: HeroCast): number => (c.act === 'parry_halo' ? VEX.q.moveScale : c.act === 'rift_reversal' ? 0 : VEX.r.moveScale);
/** Perfect-evasion-like helper for tests / HUD: true while the guard's perfect window is open. */
export const parryOpen = (s: GameState) => { const c = s.hx.act; return !!c && c.act === 'parry_halo' && c.t <= VEX.q.perfect * perfectScale(s); };
export const vexActiveForm = (s: GameState) => activeForm(s);
void slideMove; void pathClear;

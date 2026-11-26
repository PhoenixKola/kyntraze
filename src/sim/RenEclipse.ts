/** B33 Ren, Ashen Eclipse (authoritative sim, form id 2): Cinderfang Chain auto, Eclipse Maul (Q), Ninefold Rupture (E), Ashen Cataclysm (R), Eclipse Fang (V) and the Ash Brand mechanic. Used only when `hero === 'ren'` and `form === 2`; Crimson Ascendant stays in RenCombat. Every damage call goes through damageEnemy once; committed data (aim, target ids, ground points) lives on the HeroCast.
 *  Ash Brand: form-II melee contacts mark genuine targets (cap per target, lifetime, global cap); a finisher consumes the marks of the foes it strikes for one bounded eruption. Eruptions never mark or consume, so nothing chains. Renderers only read ash_* events, the cast and `hx.brands`. */
import type { Enemy, GameState, HeroCast } from './GameState';
import { ASH, ASH_AUTO, ASH_E, ASH_SHIFT, ASH_Q, ASH_R, ASH_V, BRAND } from '../content/renEclipse';
import { REN_OD } from '../content/renCombat';
import { REN } from '../content/heroKits';
import { blocked, slideMove } from './CollisionSystem';
import { damageEnemy } from './CombatSystem';
import { clamp, normalize } from '../core/Math';
import { freeAim } from './ApexSystem';
import { handOffset, strikeHand } from './Strike';
import { aimDir, newCast, nearest, pathClear, pickGround, push } from './HeroSystem';
import { faceOf, fistWorld } from './AbilitySystem';
import { byDistId, emit, fixed, fm, odBit, once, ringFx } from './RenCombat';

const alive = (e: Enemy) => e.hp > 0;
export const ashForm = (s: GameState) => s.hero === 'ren' && s.player.form === 2;
export const isAshAct = (c: HeroCast | null) => !!c && (c.act === 'eclipse_maul' || c.act === 'ninefold_rupture' || c.act === 'ashen_cataclysm' || c.act === 'eclipse_fang');

/* ------------------------------------------------------------------ Ash Brand */
export const brandsOf = (s: GameState) => (s.hx.brands ??= []);
const markable = (e: Enemy) => alive(e) && !e.part && !e.ai?.invuln && !((e.blockT ?? 0) > 0);
function brand(s: GameState, e: Enemy) {
  if (!markable(e)) return; const list = brandsOf(s); let b = list.find(x => x.id === e.id);
  if (!b) { if (list.length >= BRAND.maxTargets) list.shift(); b = { id: e.id, n: 0, t: 0 }; list.push(b); }
  if (b.n < BRAND.cap) b.n++; b.t = s.time + BRAND.life; emit(s, 'ash_brand', e.x, e.y, b.n);
}
function takeBrand(s: GameState, e: Enemy): number { const list = brandsOf(s), i = list.findIndex(x => x.id === e.id); if (i < 0) return 0; const n = list[i].n; list.splice(i, 1); return n; }
/** One eruption per branded foe: damage scales with its stacks; ordinary neighbours take a small share. Eruption damage never marks and never consumes. Returns foes erupted. */
function erupt(s: GameState, e: Enemy): number {
  const n = takeBrand(s, e); if (n <= 0 || !alive(e)) return 0; const dmg = s.player.qDamage * fm(s) * BRAND.stackMul * n; damageEnemy(s, e, dmg, { area: true });
  let splash = 0; for (const o of s.enemies.filter(alive).sort(byDistId(e.x, e.y))) { if (splash >= BRAND.splashCap) break; if (o === e || Math.hypot(o.x - e.x, o.y - e.y) > BRAND.splashR + o.radius) continue; damageEnemy(s, o, dmg * BRAND.splashMul, { area: true }); splash++; }
  emit(s, 'ash_eruption', e.x, e.y, n | (Math.min(splash, 15) << 4) | odBit(s)); return 1;
}
export function updateBrands(s: GameState) {
  const list = s.hx.brands; if (!list?.length) return; const live = new Set(s.enemies.filter(alive).map(e => e.id));
  s.hx.brands = list.filter(b => b.t > s.time && live.has(b.id));
}

/* ------------------------------------------------------------------ Cinderfang Chain (automatic) */
export function ashAuto(s: GameState) {
  const p = s.player;
  const tgt = nearest(s, ASH_AUTO.reach + 20); if (!tgt || Math.hypot(tgt.x - p.x, tgt.y - p.y) - tgt.radius > ASH_AUTO.reach) { p.attackClock = 0; return; }
  p.attackClock += Math.max(0.16, p.attackPeriod * ASH_AUTO.period * (p.odT > 0 ? REN_OD.periodMul : 1));
  const step = s.hx.autoStep++ % ASH_AUTO.beats.length, beat = ASH_AUTO.beats[step], fin = step === ASH_AUTO.beats.length - 1;
  const dir = normalize(tgt.x - p.x, tgt.y - p.y), face = faceOf(dir.x, dir.y), hand = strikeHand(face, dir.x, dir.y, step);
  s.hx.strike = { x: dir.x, y: dir.y, t: s.time, step, hand };
  const dmg = p.attackDamage * ASH.autoMul * fm(s) * beat.mul, done = new Set<number>(), struck: Enemy[] = [];
  const cands = s.enemies.filter(e => { if (!alive(e)) return false; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); return d - e.radius <= ASH_AUTO.reach && (d < 1 || (dx * dir.x + dy * dir.y) / d >= beat.cos); }).sort(byDistId(p.x, p.y)).slice(0, p.targets + 1);
  let hits = 0; for (const e of cands) { damageEnemy(s, e, dmg); done.add(e.id); hits++; struck.push(e); if (!fin) brand(s, e); }
  if (fin) {
    for (const e of s.enemies.filter(alive).sort(byDistId(p.x, p.y))) {   // the crushing uppercut: a bounded sweep around Ren, bosses are hurt but never thrown
      if (done.size >= p.targets + 1 + ASH_AUTO.sweepCap) break; if (done.has(e.id) || Math.hypot(e.x - p.x, e.y - p.y) > ASH_AUTO.finisherSweep + e.radius) continue;
      done.add(e.id); hits++; struck.push(e); if (!damageEnemy(s, e, dmg * 0.6, { area: true }) && !fixed(e)) push(s, e, e.x - p.x, e.y - p.y, ASH_AUTO.finisherPush / 4, 0.25);
    }
    for (const e of struck) erupt(s, e);
  }
  const fa = fistWorld(s, s.player.form, face), ho = handOffset(face, hand), fx = fa.x + ho.x, fy = fa.y + ho.y;
  s.impacts.push({ id: s.nextId++, kind: 'shot', x: fx, y: fy, targetX: tgt.x, targetY: tgt.y, ttl: 0.2, life: 0.2, skip: true });
  /** n: beat (bits 0-1), finisher 32, right hand 64, Overdrive bit, hits from bit 8 (same packing as ren_auto) */
  emit(s, 'ash_auto', fx, fy, step | (fin ? 32 : 0) | (hand === 'right' ? 64 : 0) | (Math.min(hits, 63) << 8) | odBit(s), tgt.x, tgt.y);
}

/* ------------------------------------------------------------------ Q Eclipse Maul */
/** `charge`: 1 = a target was in the cone at the press (full three-strike rush), 0 = nothing ahead (one short committed lunge, no finisher). `hops[0]` = the committed target. */
export function ashQ(s: GameState): boolean {
  const p = s.player, dir = aimDir(s, ASH_Q.range);
  const tgt = s.enemies.filter(e => { if (!alive(e)) return false; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); return d - e.radius <= ASH_Q.range && (d < 1 || (dx * dir.x + dy * dir.y) / d >= ASH_Q.coneCos) && pathClear(p.x, p.y, e.x, e.y, p.radius * 0.6); }).sort(byDistId(p.x, p.y))[0] ?? null;
  const strikes = tgt ? ASH_Q.strikes : 1; p.qCooldown = ASH_Q.cooldown;
  const c = newCast(s, 'eclipse_maul', tgt ? normalize(tgt.x - p.x, tgt.y - p.y) : dir, ASH_Q.windup + (strikes - 1) * ASH_Q.gap + ASH_Q.recover + 0.05); s.hx.act = c; c.charge = tgt ? 1 : 0; c.hops = [{ x: tgt?.x ?? p.x, y: tgt?.y ?? p.y, id: tgt?.id ?? 0 }]; c.sx = p.x; c.sy = p.y;
  emit(s, 'ash_q_start', p.x, p.y, (tgt ? 1 : 0) | odBit(s), c.hops[0].x, c.hops[0].y); return true;
}
function updateMaul(s: GameState, c: HeroCast, dt: number, before: number) {
  void dt; const p = s.player, strikes = c.charge ? ASH_Q.strikes : 1, q = p.qDamage * fm(s), tg = c.hops[0].id ? s.enemies.find(e => e.id === c.hops[0].id && alive(e)) : undefined;
  while (c.beats < strikes && c.t >= ASH_Q.windup + c.beats * ASH_Q.gap - 1e-9) {
    const k = c.beats++, last = c.charge === 1 && k === strikes - 1;
    if (tg) { const d = normalize(tg.x - p.x, tg.y - p.y); if (d.x || d.y) { c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); } }
    const room = tg ? Math.max(0, Math.hypot(tg.x - p.x, tg.y - p.y) - tg.radius - p.radius - 6) : ASH_Q.missStep, travel = Math.min(c.charge ? ASH_Q.step : ASH_Q.missStep, room);   // never through the target, never through a wall (slideMove)
    for (let i = 0; i < 4; i++) slideMove(p, (c.dirX * travel) / 0.05, (c.dirY * travel) / 0.05, 0.0125);
    p.invulnerable = Math.max(p.invulnerable, ASH_Q.iframes);
    const fx = p.x + c.dirX * (p.radius + 26), fy = p.y + c.dirY * (p.radius + 26), cos = Math.cos(0.95); let hits = 0, kills = 0;
    for (const e of s.enemies.filter(alive).sort(byDistId(fx, fy))) {
      if (hits >= ASH_Q.cap) break; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d - e.radius > ASH_Q.reach + 14 || (d > 1 && (dx * c.dirX + dy * c.dirY) / d < cos)) continue;
      const hp0 = e.hp; damageEnemy(s, e, q * (ASH_Q.mul[Math.min(k, 2)] ?? 1)); hits++; if (e.hp <= 0 && hp0 > 0) kills++; else if (!last) brand(s, e);
      if (e.hp > 0 && !fixed(e)) push(s, e, c.dirX, c.dirY, 18, 0.15);
    }
    if (last) {   // compact finisher: a short maul burst at the fist, consuming marks on the foes it strikes
      const R = ASH_Q.finalR * s.mods.beamWidth; let n = 0;
      for (const e of s.enemies.filter(alive).sort(byDistId(fx, fy))) { if (n >= ASH_Q.cap) break; const dx = e.x - fx, dy = e.y - fy, d = Math.hypot(dx, dy); if (d > R + e.radius) continue; damageEnemy(s, e, q * ASH_Q.finalMul * (1 - 0.35 * clamp(d / R, 0, 1)), { area: true }); n++; if (e.hp > 0 && !fixed(e)) push(s, e, dx || 0.01, dy || 0.01, ASH_Q.push / 4, ASH_Q.stagger); erupt(s, e); }
      ringFx(s, 'slam', fx, fy, R, 0.4); hits += n;
    }
    emit(s, 'ash_q_hit', fx, fy, k | (last ? 16 : 0) | (c.charge ? 32 : 0) | (Math.min(hits, 63) << 8) | odBit(s), c.dirX, c.dirY);
  }
  if (before < c.dur && c.t >= c.dur - 1e-9) emit(s, 'ash_q_end', p.x, p.y, odBit(s));
}

/* ------------------------------------------------------------------ E Ninefold Rupture */
/** `hop`: 0 coil (warning, rooted, nine tail shadows converge), 1 pounce (bounded leap, short invulnerability), 2 recover after the rupture. `tx,ty` = committed ground point, `sx,sy` = start. */
export function ashE(s: GameState): boolean {
  const p = s.player, tg = pickGround(s, ASH_E.range, ASH_E.defaultRange, 130, REN.base.radius), d = normalize(tg.x - p.x, tg.y - p.y);
  const c = newCast(s, 'ninefold_rupture', d.x || d.y ? d : normalize(p.aimX, p.aimY), ASH_E.coil + ASH_E.pounce + ASH_E.recover); p.beamCooldown = ASH_E.cooldown * s.mods.beamCd; c.tx = tg.x; c.ty = tg.y; c.sx = p.x; c.sy = p.y; s.hx.act = c;
  emit(s, 'ash_e_coil', tg.x, tg.y, odBit(s), p.x, p.y); return true;
}
function updateRupture(s: GameState, c: HeroCast, dt: number, before: number) {
  const p = s.player;
  if (c.hop === 0 && c.t >= ASH_E.coil - 1e-9) { c.hop = 1; c.hopT = 0; c.sx = p.x; c.sy = p.y; emit(s, 'ash_e_dive', p.x, p.y, odBit(s), c.tx, c.ty); }
  if (c.hop === 1) {
    c.hopT += dt; const u = clamp(c.hopT / ASH_E.pounce, 0, 1), e = 1 - (1 - u) ** 3, wx = c.sx + (c.tx - c.sx) * e, wy = c.sy + (c.ty - c.sy) * e;
    if (dt > 0) slideMove(p, (wx - p.x) / dt, (wy - p.y) / dt, dt); p.invulnerable = Math.max(p.invulnerable, ASH_E.iframes > c.hopT ? 0.06 : 0);
    if (u >= 1) {
      c.hop = 2; const R = ASH_E.R * s.mods.beamWidth, dmg = p.qDamage * fm(s) * s.mods.beamDamage * ASH_E.mul; let n = 0;   // rupture at the REAL landing point (a wall may have stopped the leap)
      for (const t of s.enemies.filter(alive).sort(byDistId(p.x, p.y))) {
        if (n >= ASH_E.cap) break; const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy); if (d > R + t.radius) continue;
        damageEnemy(s, t, dmg * (1 - 0.4 * clamp(d / R, 0, 1)), { area: true }); n++; if (t.hp > 0 && !fixed(t)) push(s, t, dx || 0.01, dy || 0.01, ASH_E.push / 4, ASH_E.stagger); erupt(s, t);
      }
      ringFx(s, 'slam', p.x, p.y, R, 0.5); emit(s, 'ash_e_rupture', p.x, p.y, (Math.min(n, 63) << 8) | odBit(s));
    }
  }
  if (before < c.dur && c.t >= c.dur - 1e-9) emit(s, 'ash_e_end', p.x, p.y, odBit(s));
}

/* ------------------------------------------------------------------ R Ashen Cataclysm */
/** The strike is a capsule from Ren along `dir` for `len` px (wall-clipped); `tx,ty` is its far end and the centre of the closing rupture. Each foe is struck once by each stage. */
export function ashR(s: GameState): boolean {
  const p = s.player, tg = pickGround(s, ASH_R.range, ASH_R.defaultRange, 150, REN.base.radius); let d = normalize(tg.x - p.x, tg.y - p.y); if (!d.x && !d.y) d = normalize(p.aimX, p.aimY);
  let len = clamp(Math.hypot(tg.x - p.x, tg.y - p.y) + 90, 160, ASH_R.maxLen); while (len > 60 && blocked(p.x + d.x * len, p.y + d.y * len, 8)) len -= 14;
  const c = newCast(s, 'ashen_cataclysm', d, ASH_R.windup + ASH_R.strikeGap + ASH_R.recover); p.sphereCooldown = ASH_R.cooldown * s.mods.sphereCd; c.len = len; c.tx = p.x + d.x * len; c.ty = p.y + d.y * len; c.sx = p.x; c.sy = p.y; s.hx.act = c;
  emit(s, 'ash_r_core', c.tx, c.ty, odBit(s), p.x, p.y); return true;
}
function updateCataclysm(s: GameState, c: HeroCast, before: number) {
  const p = s.player, base = fm(s) * s.mods.sphereDamage, sr = s.mods.sphereRadius;
  if (c.beats === 0 && c.t >= ASH_R.windup - 1e-9) {   // stage 1: the spectral fox strike down the lane
    c.beats = 1; const hw = ASH_R.halfWidth * sr; let n = 0; const ox = c.sx, oy = c.sy;
    for (const e of s.enemies.filter(alive).sort(byDistId(ox, oy))) {
      if (n >= ASH_R.cap) break; const rx = e.x - ox, ry = e.y - oy, along = rx * c.dirX + ry * c.dirY, perp = Math.abs(-rx * c.dirY + ry * c.dirX);
      if (along < -e.radius || along > c.len + e.radius || perp > hw + e.radius || !once(c, e.id)) continue;
      damageEnemy(s, e, ASH_R.strikeMul * base, { area: true }); n++; erupt(s, e);
    }
    emit(s, 'ash_r_strike', c.tx, c.ty, (Math.min(n, 63) << 8) | odBit(s), c.sx, c.sy);
  }
  if (!c.released && c.t >= ASH_R.windup + ASH_R.strikeGap - 1e-9) {   // stage 2: the closing rupture at the far end
    c.released = true; const R = ASH_R.ruptureR * sr; let n = 0;
    for (const e of s.enemies.filter(alive).sort(byDistId(c.tx, c.ty))) {
      if (n >= ASH_R.cap) break; const dx = e.x - c.tx, dy = e.y - c.ty, d = Math.hypot(dx, dy); if (d > R + e.radius) continue;
      damageEnemy(s, e, ASH_R.ruptureMul * base * (1 - 0.4 * clamp(d / R, 0, 1)), { area: true }); n++; if (e.hp > 0 && !fixed(e)) push(s, e, dx || 0.01, dy || 0.01, ASH_R.push / 4, ASH_R.stagger); erupt(s, e);
    }
    ringFx(s, 'slam', c.tx, c.ty, R, 0.55); emit(s, 'ash_r_rupture', c.tx, c.ty, (Math.min(n, 63) << 8) | odBit(s));
  }
  if (before < c.dur && c.t >= c.dur - 1e-9) emit(s, 'ash_r_end', p.x, p.y, odBit(s));
}

/* ------------------------------------------------------------------ V Eclipse Fang */
const tierOf = (charge: number) => ASH_V.stages.reduce((t, v, i) => (charge >= v ? i + 1 : t), 0);
export const fangCharge = (s: GameState): { charge: number; tier: number } | null => { const c = s.hx.act; return c && c.act === 'eclipse_fang' && !c.released ? { charge: c.charge, tier: tierOf(c.charge) } : null; };
const vAim = (s: GameState) => { const fa = freeAim(s); return fa ? { x: fa.x, y: fa.y } : normalize(s.player.aimX, s.player.aimY); };
export function startFang(s: GameState): boolean {
  const p = s.player;
  if (!ashForm(s) || p.sigCd > 0 || s.phase !== 'running' || s.cinema || s.hx.act || s.b22.ult.act || p.dashRemaining > 0 || p.hp <= 0 || p.flyT > 0) return false;
  const c = newCast(s, 'eclipse_fang', vAim(s), ASH_V.maxHold + 2); s.hx.act = c; emit(s, 'ash_v_charge', p.x, p.y, odBit(s)); return true;
}
/** An unreleased charge is cancelled for free (cooldown untouched); a released technique always finishes. */
export function cancelFang(s: GameState) { const c = s.hx.act; if (c && c.act === 'eclipse_fang' && !c.released) { s.hx.act = null; emit(s, 'ash_v_cancel', s.player.x, s.player.y); } }
function releaseFang(s: GameState, c: HeroCast) {
  const p = s.player, d = vAim(s), tier = tierOf(c.charge), range = ASH_V.range + ASH_V.rangeTier * tier; let tg: Enemy | null = null;
  for (const e of s.enemies.filter(alive).sort(byDistId(p.x, p.y))) { const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy); if (dist < 1 || dist > range + e.radius) continue; if ((dx * d.x + dy * d.y) / dist >= ASH_V.aimCos) { tg = e; break; } }
  const dir = tg ? normalize(tg.x - p.x, tg.y - p.y) : d;
  let reach = tg ? Math.max(0, Math.hypot(tg.x - p.x, tg.y - p.y) - tg.radius - p.radius - 8 + 0) : ASH_V.missRush;
  while (reach > 0 && blocked(p.x + dir.x * reach, p.y + dir.y * reach, 0)) reach -= 8;
  c.released = true; c.tier = tier; c.hopT = 0; c.dirX = dir.x; c.dirY = dir.y; c.face = faceOf(dir.x, dir.y); c.sx = p.x; c.sy = p.y; c.tx = p.x + dir.x * reach; c.ty = p.y + dir.y * reach; c.len = reach; c.hop = tg ? tg.id : -1; c.pulses = 0; c.hits = [];
  const tail = tier >= 3 ? ASH_V.jawAt[1] + 0.05 : tier === 2 ? ASH_V.follow + 0.05 : 0.1;
  c.dur = c.t + ASH_V.lunge + tail + ASH_V.recover; p.sigCd = ASH_V.cooldown; p.invulnerable = Math.max(p.invulnerable, ASH_V.lunge + 0.06);   // a real release spends the cooldown even on a miss
  emit(s, 'ash_v_release', p.x, p.y, tier | odBit(s), c.tx, c.ty);
}
function updateFang(s: GameState, c: HeroCast, dt: number) {
  const p = s.player;
  if (p.hp <= 0 || s.cinema) { if (c.released) { emit(s, 'ash_v_end', p.x, p.y, odBit(s)); s.hx.act = null; } else cancelFang(s); return; }
  if (!c.released && (p.form !== 2 || c.form !== p.form || s.b22.ult.act)) { cancelFang(s); return; }
  if (!c.released) {
    const d = vAim(s); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.charge += dt;
    const t = tierOf(c.charge); if (t > c.tier) { c.tier = t; emit(s, 'ash_v_tier', p.x, p.y, t | odBit(s)); }
    if ((!s.sigHeld && c.charge >= ASH_V.minHold) || c.charge >= ASH_V.maxHold) releaseFang(s, c);
    return;
  }
  const rt0 = c.hopT, rt = rt0 + dt; c.hopT = rt; const L = ASH_V.lunge, tier = c.tier, q = p.qDamage * fm(s) * ASH_V.tierMul[tier];
  if (rt0 < L) {
    const u = Math.min(1, rt / L), e = 1 - (1 - u) ** 3, tx = c.sx + (c.tx - c.sx) * e, ty = c.sy + (c.ty - c.sy) * e; if (dt > 0) slideMove(p, (tx - p.x) / dt, (ty - p.y) / dt, dt);
    const fist = { x: p.x + c.dirX * (p.radius + 16), y: p.y + c.dirY * (p.radius + 16) };   // the maul pierces: every foe the gauntlet passes through is struck once
    for (const e of s.enemies.filter(alive).sort(byDistId(fist.x, fist.y))) {
      if (c.hits.length >= ASH_V.pierceCap) break; if (Math.hypot(e.x - fist.x, e.y - fist.y) > ASH_V.contactR + e.radius || !once(c, e.id)) continue;
      const hp0 = e.hp; damageEnemy(s, e, ASH_V.hit * q, { slot: 'none' }); if (e.hp < hp0 || e.hp <= 0) { c.pulses = 1; c.tx = e.x; c.ty = e.y; emit(s, 'ash_v_hit', e.x, e.y, tier | odBit(s), c.dirX, c.dirY); if (e.hp > 0) brand(s, e); } else emit(s, 'ash_v_block', e.x, e.y, odBit(s));
    }
  }
  if (rt0 < L && rt >= L && c.pulses !== 1) { c.pulses = -1; emit(s, 'ash_v_miss', p.x + c.dirX * 40, p.y + c.dirY * 40, odBit(s)); p.sigCd = Math.min(p.sigCd, 8); c.dur = Math.min(c.dur, c.t + ASH_V.recover); }   // a miss never explodes
  if (c.pulses === 1) {
    const ti = rt - L, cx = c.tx, cy = c.ty, base = p.qDamage * fm(s) * ASH_V.tierMul[tier];
    const pulse = (i: number, r: number, mul: number, pushPx: number, eruptAll = false) => { let n = 0; for (const e of s.enemies.filter(alive).sort(byDistId(cx, cy))) { if (n >= ASH_V.cap) break; const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy); if (d > r + e.radius) continue; damageEnemy(s, e, base * mul * (1 - 0.35 * clamp(d / r, 0, 1)), { area: true }); n++; if (e.hp > 0 && !fixed(e) && pushPx > 0) push(s, e, dx || 0.01, dy || 0.01, pushPx / 4, 0.3); if (eruptAll) erupt(s, e); } ringFx(s, 'ring', cx, cy, r, 0.4); emit(s, 'ash_v_pulse', cx, cy, i | (tier << 5) | (Math.min(n, 63) << 8) | odBit(s)); };
    if (tier <= 1) { if (once(c, -1)) pulse(0, ASH_V.pulseR + ASH_V.pulseGrow * tier, ASH_V.pulseMul, ASH_V.push, tier === 1); }
    else if (tier === 2) { if (once(c, -1)) pulse(0, ASH_V.pulseR + ASH_V.pulseGrow * tier, ASH_V.pulseMul, ASH_V.push); if (ti >= ASH_V.follow && once(c, -2)) pulse(1, ASH_V.followR, ASH_V.followMul, ASH_V.push * 0.6, true); }
    else {   // the fox-jaw: an upper and a lower bite, then the eruption of every mark inside
      if (once(c, -1)) pulse(0, ASH_V.jawR * 0.8, ASH_V.jawMul, ASH_V.push * 0.8);
      if (ti >= ASH_V.jawAt[0] && once(c, -2)) pulse(1, ASH_V.jawR, ASH_V.jawMul, ASH_V.push);
      if (ti >= ASH_V.jawAt[1] && once(c, -3)) pulse(2, ASH_V.eruptR, ASH_V.jawMul * 1.2, ASH_V.push * 1.3, true);
    }
  }
  if (c.t >= c.dur - 1e-9) { emit(s, 'ash_v_end', p.x, p.y, odBit(s)); s.hx.act = null; }
}

/* ------------------------------------------------------------------ dispatch from HeroSystem */
export function updateAshAct(s: GameState, c: HeroCast, dt: number, before: number) {
  switch (c.act) {
    case 'eclipse_maul': updateMaul(s, c, dt, before); break;
    case 'ninefold_rupture': updateRupture(s, c, dt, before); break;
    case 'ashen_cataclysm': updateCataclysm(s, c, before); break;
    case 'eclipse_fang': updateFang(s, c, dt); break;
    default: break;
  }
}
export function ashMoveScale(c: HeroCast): number {
  switch (c.act) {
    case 'eclipse_maul': return c.t < ASH_Q.windup ? ASH_Q.moveWindup : 0;
    case 'ninefold_rupture': return 0;
    case 'ashen_cataclysm': return c.t < ASH_R.windup ? 0.25 : 0;
    case 'eclipse_fang': return c.released ? 0 : ASH_V.moveCharge;
    default: return 1;
  }
}
/** A dash / reveal / shift ends the act now. Unreleased V is free; everything else ends cleanly (its cost is already paid and nothing is queued behind it). */
export function ashCancelAct(s: GameState, c: HeroCast) {
  if (c.act === 'eclipse_fang') { if (!c.released) { s.hx.act = null; emit(s, 'ash_v_cancel', s.player.x, s.player.y); } return; }
  emit(s, c.act === 'eclipse_maul' ? 'ash_q_end' : c.act === 'ninefold_rupture' ? 'ash_e_end' : 'ash_r_end', s.player.x, s.player.y, odBit(s)); s.hx.act = null;
}

/* ------------------------------------------------------------------ form shift (Crimson Ascendant <-> Ashen Eclipse) */
export function ashShift(s: GameState, to: 1 | 2): boolean {
  const p = s.player;
  if (s.hero !== 'ren' || p.form < 1 || to === p.form || !s.heroFormUnlocked || (to === 2 && !s.renF2) || s.phase !== 'running' || s.cinema || s.selector.open || p.hp <= 0 || p.formCooldown > 0 || p.drive < ASH_SHIFT.minDrive) return false;
  const c = s.hx.act; if (c) { if (c.act === 'nova_fist' || c.act === 'eclipse_fang') { if (!c.released) s.hx.act = null; } else s.hx.act = null; }   // an unreleased V charge ends; a released V keeps its committed form; any other act ends
  p.form = to; p.drive = Math.max(1, p.drive - ASH_SHIFT.cost); p.formCooldown = ASH_SHIFT.cooldown * s.mods.formCd; p.invulnerable = Math.max(p.invulnerable, 0.2); p.flyT = 0; p.air = 0; p.flyHold = 0; p.flyOn = false;
  if (to === 1) s.hx.brands = [];   // marks belong to the eclipse
  emit(s, 'ash_shift', p.x, p.y, to | odBit(s)); return true;
}
export function ashShiftInput(s: GameState, fDown: boolean, wasF: boolean) {
  const p = s.player; if (s.hero !== 'ren' || p.form < 1 || !s.renF2) return;
  if (fDown && !wasF && !s.selector.open) ashShift(s, p.form === 1 ? 2 : 1);
}

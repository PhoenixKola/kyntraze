/** B26 Ren, Crimson Ascendant (authoritative sim): Crimson Fury auto, Infernal Cyclone (Q), Scarlet Rampage (E), Crimson Catastrophe (R), the charged Crimson Nova Fist (V), Primal Overdrive (the Crimson Nine-Tailed Fox) and Skybreaker flight. Used only when `hero === 'ren'` and the form is Ascendant; the base kit stays in HeroSystem. Every damage call goes through damageEnemy once; committed data (form, aim, target ids, ground points) lives on the HeroCast so a later change cannot reroute a move. Renderers only read the ren_* events and the cast. */
import type { AbilityEventKind, Enemy, GameState, HeroCast, InputState } from './GameState';
import { REN_AUTO, REN_E, REN_FLY, REN_OD, REN_Q, REN_R, REN_V } from '../content/renCombat';
import { ASCEND, REN } from '../content/heroKits';
import { isBoss } from '../content/enemies';
import { blocked, slideMove } from './CollisionSystem';
import { damageEnemy } from './CombatSystem';
import { clamp, normalize } from '../core/Math';
import { freeAim } from './ApexSystem';
import { handOffset, strikeHand } from './Strike';
import { aimDir, newCast, nearest, pathClear, pickGround, push } from './HeroSystem';
import { faceOf, fistWorld } from './AbilitySystem';

const alive = (e: Enemy) => e.hp > 0;
const byDistId = (x: number, y: number) => (a: Enemy, b: Enemy) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((b.x - x) ** 2 + (b.y - y) ** 2) || a.id - b.id;
const easeOut = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 3;
const odBit = (s: GameState) => (s.player.odT > 0 ? REN_OD.bit : 0);
export const renForm = (s: GameState) => s.hero === 'ren' && s.player.form >= 1;
const fm = (s: GameState) => s.mods.formPower;
/** Boss bodies, boss parts, shielded or invulnerable enemies are never grabbed, pulled or displaced. */
const fixed = (e: Enemy) => isBoss(e.kind) || !!e.part || !!e.ai?.invuln || (e.blockT ?? 0) > 0;
function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number, tx?: number, ty?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n, ...(tx !== undefined ? { tx, ty } : {}) });
  if (s.abilityEvents.length > 40) s.abilityEvents.splice(0, s.abilityEvents.length - 40);
}
const ringFx = (s: GameState, kind: 'slam' | 'ring' | 'rush', x: number, y: number, r: number, dur: number) => { s.hx.rings.push({ id: s.nextId++, x, y, r, t: 0, dur, kind }); if (s.hx.rings.length > 24) s.hx.rings.shift(); };
const once = (c: HeroCast, key: number) => { if (c.hits.includes(key)) return false; c.hits.push(key); return true; };
/** One area hit, deterministic order (distance then id), capped target count; ordinary enemies are pushed outward, fixed ones never. Returns the number of enemies hurt. */
function areaHit(s: GameState, x: number, y: number, r: number, dmg: number, pushPx: number, stagger: number, cap: number, minR = 0): number {
  let n = 0;
  for (const e of s.enemies.filter(alive).sort(byDistId(x, y))) {
    if (n >= cap) break; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > r + e.radius || d < minR) continue;
    const fall = 1 - 0.4 * clamp(d / r, 0, 1);
    if (!damageEnemy(s, e, dmg * fall, { area: true }) && pushPx > 0 && !fixed(e)) push(s, e, dx || 0.01, dy || 0.01, (pushPx * fall) / 4, stagger * fall); n++;
  }
  return n;
}

/* ------------------------------------------------------------------ Crimson Fury (automatic) */
export function renFuryAuto(s: GameState) {
  const p = s.player;
  const tgt = nearest(s, REN_AUTO.reach + 20); if (!tgt || Math.hypot(tgt.x - p.x, tgt.y - p.y) - tgt.radius > REN_AUTO.reach) { p.attackClock = 0; return; }   // close range only: nobody within arm's reach = no swing and no far hit
  p.attackClock += Math.max(0.16, p.attackPeriod * REN_AUTO.period * (p.odT > 0 ? REN_OD.periodMul : 1));
  const step = s.hx.autoStep++ % REN_AUTO.beats.length, beat = REN_AUTO.beats[step], fin = step === REN_AUTO.beats.length - 1;
  const dir = normalize(tgt.x - p.x, tgt.y - p.y), face = faceOf(dir.x, dir.y), hand = strikeHand(face, dir.x, dir.y, step);
  s.hx.strike = { x: dir.x, y: dir.y, t: s.time, step, hand };
  const cos = Math.cos((82 * Math.PI) / 180), dmg = p.attackDamage * ASCEND.ren.autoMul * fm(s) * beat.mul, done = new Set<number>();
  const cands = s.enemies.filter(e => { if (!alive(e)) return false; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); return d - e.radius <= REN_AUTO.reach && (d < 1 || (dx * dir.x + dy * dir.y) / d >= cos); }).sort(byDistId(p.x, p.y)).slice(0, p.targets + 1);
  let hits = 0; for (const e of cands) { damageEnemy(s, e, dmg); done.add(e.id); hits++; }
  if (fin) for (const e of s.enemies.filter(alive).sort(byDistId(p.x, p.y))) {   // the uppercut's small sweep: everyone in arm's reach around Ren, capped, bosses are hurt but never thrown
    if (done.size >= p.targets + 1 + REN_AUTO.sweepCap) break; if (done.has(e.id) || Math.hypot(e.x - p.x, e.y - p.y) > REN_AUTO.finisherSweep + e.radius) continue;
    done.add(e.id); hits++; if (!damageEnemy(s, e, dmg * 0.6, { area: true }) && !fixed(e)) push(s, e, e.x - p.x, e.y - p.y, REN_AUTO.finisherPush / 4, 0.25);
  }
  const fa = fistWorld(s, s.player.form, face), ho = handOffset(face, hand), fx = fa.x + ho.x, fy = fa.y + ho.y;
  s.impacts.push({ id: s.nextId++, kind: 'shot', x: fx, y: fy, targetX: tgt.x, targetY: tgt.y, ttl: 0.2, life: 0.2, skip: true });   // drives the punch pose; never draws a bolt
  /** n: beat (bits 0-1), finisher 32, right hand 64, Overdrive bit, hit count from bit 8 */
  emit(s, 'ren_auto', fx, fy, step | (fin ? 32 : 0) | (hand === 'right' ? 64 : 0) | (Math.min(hits, 63) << 8) | odBit(s), tgt.x, tgt.y);
}

/* ------------------------------------------------------------------ Q Infernal Cyclone */
export function renQ(s: GameState): boolean {
  const p = s.player, dir = aimDir(s, 190); p.qCooldown = REN_Q.cooldown;
  const c = newCast(s, 'infernal_cyclone', dir, REN_Q.windup + REN_Q.spin + REN_Q.recover); s.hx.act = c; c.sx = p.x; c.sy = p.y;
  emit(s, 'ren_q_start', p.x, p.y, odBit(s)); return true;
}
function updateCyclone(s: GameState, c: HeroCast, dt: number, before: number) {
  const p = s.player, rs = p.qRadius / REN.base.qRadius, spinEnd = REN_Q.windup + REN_Q.spin, q = p.qDamage * fm(s);
  if (c.t > REN_Q.windup && before < spinEnd) {   // bounded pull of ordinary enemies toward the spinning fighter, never through walls (slideMove) and never past arm's reach
    for (const e of s.enemies) {
      if (!alive(e) || fixed(e)) continue; const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
      if (d > REN_Q.pullR * rs + e.radius || d < p.radius + e.radius + 8) continue; slideMove(e, (dx / d) * REN_Q.pullSpeed, (dy / d) * REN_Q.pullSpeed, dt);
    }
  }
  const tickAt = (k: number) => REN_Q.windup + ((k + 0.5) * REN_Q.spin) / REN_Q.ticks;
  while (c.beats < REN_Q.ticks && c.t >= tickAt(c.beats)) { const k = c.beats++, n = areaHit(s, p.x, p.y, REN_Q.tickR * rs, q * REN_Q.tickMul, 0, 0, REN_Q.tickCap); emit(s, 'ren_q_tick', p.x, p.y, k | (Math.min(n, 63) << 8) | odBit(s)); }
  if (!c.released && c.t >= spinEnd - 1e-9) {
    c.released = true; const R = REN_Q.releaseR * rs, n = areaHit(s, p.x, p.y, R, q * REN_Q.releaseMul, REN_Q.push, REN_Q.stagger, REN_Q.releaseCap);
    ringFx(s, 'slam', p.x, p.y, R, 0.45); emit(s, 'ren_q_release', p.x, p.y, Math.min(n, 63) << 8 | odBit(s));
  }
  if (before < c.dur && c.t >= c.dur - 1e-9) emit(s, 'ren_q_end', p.x, p.y, odBit(s));
}

/* ------------------------------------------------------------------ E Scarlet Rampage */
/** mode in `charge`: 0 grab-and-drive, 1 shoulder strike (boss / shielded / part), 2 forward rush with nothing to grab. `hops[0]` = target, `hops[1]` = drive destination. `hop`: 0 approach, 1 drive, 2 recover. */
export function renE(s: GameState): boolean {
  const p = s.player, dir = aimDir(s, REN_E.range);
  const tgt = s.enemies.filter(e => { if (!alive(e)) return false; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); return d - e.radius <= REN_E.range && (d < 1 || (dx * dir.x + dy * dir.y) / d >= REN_E.coneCos) && pathClear(p.x, p.y, e.x, e.y, p.radius * 0.6); }).sort(byDistId(p.x, p.y))[0] ?? null;
  const c = newCast(s, 'scarlet_rampage', dir, 0); p.beamCooldown = REN_E.cooldown * s.mods.beamCd; c.sx = p.x; c.sy = p.y;
  if (tgt) {
    const d = normalize(tgt.x - p.x, tgt.y - p.y); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.charge = fixed(tgt) ? 1 : 0; c.hops = [{ x: tgt.x, y: tgt.y, id: tgt.id }, { x: tgt.x, y: tgt.y, id: 0 }];
  } else {
    let r: number = REN_E.missRush; while (r > 0 && !pathClear(p.x, p.y, p.x + dir.x * r, p.y + dir.y * r, p.radius * 0.6)) r -= 12;
    c.charge = 2; c.hops = [{ x: p.x + dir.x * Math.max(r, 30), y: p.y + dir.y * Math.max(r, 30), id: 0 }, { x: 0, y: 0, id: 0 }];
  }
  c.dur = REN_E.approach + (c.charge === 0 ? REN_E.drive : 0) + REN_E.recover; s.hx.act = c; p.invulnerable = Math.max(p.invulnerable, 0.25);
  emit(s, 'ren_e_start', p.x, p.y, c.charge | odBit(s), c.hops[0].x, c.hops[0].y); return true;
}
function standPoint(p: { radius: number }, e: Enemy | undefined, c: HeroCast) { const g = p.radius + (e?.radius ?? 16) + 6, t = c.hops[0]; return { x: t.x - c.dirX * g, y: t.y - c.dirY * g }; }
function updateRampage(s: GameState, c: HeroCast, dt: number, before: number) {
  const p = s.player, q = p.qDamage * fm(s) * s.mods.beamDamage, bw = s.mods.beamWidth, tg = c.hops[0].id ? s.enemies.find(e => e.id === c.hops[0].id && alive(e)) : undefined;
  p.invulnerable = Math.max(p.invulnerable, 0.12);
  if (c.hop === 0) {
    c.hopT += dt; const u = easeOut(c.hopT / REN_E.approach);
    if (c.charge !== 2 && tg) { c.hops[0].x = tg.x; c.hops[0].y = tg.y; }
    const st = c.charge === 2 ? { x: c.hops[0].x, y: c.hops[0].y } : standPoint(p, tg, c), wx = c.sx + (st.x - c.sx) * u, wy = c.sy + (st.y - c.sy) * u;
    if (dt > 0) slideMove(p, (wx - p.x) / dt, (wy - p.y) / dt, dt);
    if (c.hopT >= REN_E.approach - 1e-9) {
      c.hopT = 0;
      if (c.charge === 0 && tg) {
        const hp0 = tg.hp; damageEnemy(s, tg, q * REN_E.grabMul); emit(s, 'ren_e_grab', tg.x, tg.y, (tg.hp < hp0 ? 1 : 0) | odBit(s));
        let r = 0; while (r < REN_E.driveDist && !blocked(p.x + c.dirX * (r + 12), p.y + c.dirY * (r + 12), p.radius * 0.6)) r += 12;   // validated path: the lane ends at the first wall
        c.hops[1] = { x: p.x + c.dirX * r, y: p.y + c.dirY * r, id: 0 }; c.sx = p.x; c.sy = p.y; c.hop = r < 24 ? 2 : 1; if (c.hop === 2) { slam(s, c, tg.x, tg.y); }
      } else if (c.charge === 1) {   // boss / shield / part: a grounded shoulder strike and splash, no relocation, no grab
        const n = areaHit(s, c.hops[0].x, c.hops[0].y, REN_E.shoulderR * bw, q * REN_E.shoulderMul, REN_E.push0, 0, REN_E.slamCap); ringFx(s, 'rush', c.hops[0].x, c.hops[0].y, REN_E.shoulderR * bw, 0.3);
        emit(s, 'ren_e_hit', c.hops[0].x, c.hops[0].y, 1 | (Math.min(n, 63) << 8) | odBit(s)); c.hop = 2; c.dur = c.t + REN_E.recover;
      } else if (c.charge === 2 || (c.charge === 0 && !tg)) {   // nothing to grab (or it died on the way): bounded rush and a ground impact, no fake grab
        const x = c.charge === 2 ? c.hops[0].x : p.x + c.dirX * 30, y = c.charge === 2 ? c.hops[0].y : p.y + c.dirY * 30, n = areaHit(s, x, y, REN_E.missR * bw, q * REN_E.missMul, REN_E.push0, 0, REN_E.slamCap);
        ringFx(s, 'rush', x, y, REN_E.missR * bw, 0.3); emit(s, 'ren_e_hit', x, y, 2 | (Math.min(n, 63) << 8) | odBit(s)); c.hop = 2; c.dur = c.t + REN_E.recover;
      }
    }
  } else if (c.hop === 1) {
    c.hopT += dt; const u = clamp(c.hopT / REN_E.drive, 0, 1), dest = c.hops[1], wx = c.sx + (dest.x - c.sx) * u, wy = c.sy + (dest.y - c.sy) * u;
    if (dt > 0) slideMove(p, (wx - p.x) / dt, (wy - p.y) / dt, dt);
    let stuck = false;
    if (tg) {
      const g = p.radius + tg.radius + 6, ex = p.x + c.dirX * g, ey = p.y + c.dirY * g; tg.stagger = Math.max(tg.stagger, 0.2);
      if (dt > 0) slideMove(tg, (ex - tg.x) / dt, (ey - tg.y) / dt, dt); if (Math.hypot(ex - tg.x, ey - tg.y) > 30) stuck = true;
    }
    if (!tg || c.hopT >= REN_E.drive - 1e-9 || stuck) slam(s, c, tg ? tg.x : p.x + c.dirX * (p.radius + 22), tg ? tg.y : p.y + c.dirY * (p.radius + 22));
  }
  if (before < c.dur && c.t >= c.dur - 1e-9) emit(s, 'ren_e_end', p.x, p.y, odBit(s));
}
function slam(s: GameState, c: HeroCast, x: number, y: number) {
  const p = s.player, bw = s.mods.beamWidth, n = areaHit(s, x, y, REN_E.slamR * bw, p.qDamage * fm(s) * s.mods.beamDamage * REN_E.slamMul, REN_E.push0 * 1.2, 0.5, REN_E.slamCap);
  ringFx(s, 'slam', x, y, REN_E.slamR * bw, 0.4); emit(s, 'ren_e_slam', x, y, (Math.min(n, 63) << 8) | odBit(s)); c.hop = 2; c.dur = c.t + REN_E.recover;
}

/* ------------------------------------------------------------------ R Crimson Catastrophe */
export function renR(s: GameState): boolean {
  const p = s.player, tg = pickGround(s, REN_R.range, REN_R.defaultRange, 130, REN.base.radius), d = normalize(tg.x - p.x, tg.y - p.y);
  const finalAt = REN_R.windup + (REN_R.hits - 1) * REN_R.gap + REN_R.finalGap, c = newCast(s, 'crimson_catastrophe', d.x || d.y ? d : normalize(p.aimX, p.aimY), finalAt + REN_R.recover);
  p.sphereCooldown = REN_R.cooldown * s.mods.sphereCd; c.tx = tg.x; c.ty = tg.y; c.sx = p.x; c.sy = p.y; s.hx.act = c;
  emit(s, 'ren_r_mark', tg.x, tg.y, odBit(s)); return true;
}
function updateCatastrophe(s: GameState, c: HeroCast, before: number) {
  const p = s.player, sr = s.mods.sphereRadius, base = fm(s) * s.mods.sphereDamage, finalAt = REN_R.windup + (REN_R.hits - 1) * REN_R.gap + REN_R.finalGap;
  while (c.beats < REN_R.hits && c.t >= REN_R.windup + c.beats * REN_R.gap - 1e-9) {
    const k = c.beats++, side = k % 2, x = c.tx + (side ? 1 : -1) * REN_R.fistOffset, y = c.ty, R = REN_R.fistR * sr, n = areaHit(s, x, y, R, REN_R.fistMul * base, REN_R.push * 0.6, REN_R.stagger, REN_R.cap);
    ringFx(s, 'ring', x, y, R, 0.35); emit(s, 'ren_r_hit', x, y, k | (side << 4) | (Math.min(n, 63) << 8) | odBit(s));
  }
  if (!c.released && c.t >= finalAt - 1e-9) {
    c.released = true; const R = REN_R.finalR * sr, n = areaHit(s, c.tx, c.ty, R, REN_R.finalMul * base, REN_R.push, REN_R.stagger * 1.4, REN_R.cap);
    ringFx(s, 'slam', c.tx, c.ty, R, 0.5); emit(s, 'ren_r_hit', c.tx, c.ty, 3 | (1 << 5) | (Math.min(n, 63) << 8) | odBit(s));
  }
  if (before < c.dur && c.t >= c.dur - 1e-9) emit(s, 'ren_r_end', p.x, p.y, odBit(s));
}

/* ------------------------------------------------------------------ V Crimson Nova Fist */
const tierOf = (charge: number) => REN_V.stages.reduce((t, v, i) => (charge >= v ? i + 1 : t), 0);
export const novaReady = (s: GameState) => { const p = s.player; return renForm(s) && p.sigCd <= 0; };
export const novaCharge = (s: GameState): { charge: number; tier: number } | null => { const c = s.hx.act; return c && c.act === 'nova_fist' && !c.released ? { charge: c.charge, tier: tierOf(c.charge) } : null; };
function vAim(s: GameState) { const fa = freeAim(s); return fa ? { x: fa.x, y: fa.y } : normalize(s.player.aimX, s.player.aimY); }
export function startNova(s: GameState): boolean {
  const p = s.player;
  if (!novaReady(s) || s.phase !== 'running' || s.cinema || s.hx.act || s.b22.ult.act || p.dashRemaining > 0 || p.hp <= 0 || p.flyT > 0) return false;
  const d = vAim(s), c = newCast(s, 'nova_fist', d, REN_V.maxHold + 2); s.hx.act = c; emit(s, 'ren_v_charge', p.x, p.y, odBit(s)); return true;
}
/** An unreleased charge is cancelled for free (cooldown untouched); a released technique always finishes. */
export function cancelNova(s: GameState) { const c = s.hx.act; if (c && c.act === 'nova_fist' && !c.released) { s.hx.act = null; emit(s, 'ren_v_cancel', s.player.x, s.player.y); } }
function releaseNova(s: GameState, c: HeroCast) {
  const p = s.player, d = vAim(s), tier = tierOf(c.charge);
  let tg: Enemy | null = null;
  for (const e of s.enemies.filter(alive).sort(byDistId(p.x, p.y))) { const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy); if (dist < 1 || dist > REN_V.range + e.radius) continue; if ((dx * d.x + dy * d.y) / dist >= REN_V.aimCos) { tg = e; break; } }
  if (!tg) { const n = nearest(s, 170); tg = n; }
  const dir = tg ? normalize(tg.x - p.x, tg.y - p.y) : d;
  let reach = tg ? Math.max(0, Math.hypot(tg.x - p.x, tg.y - p.y) - tg.radius - p.radius - 8) : 120;
  while (reach > 0 && blocked(p.x + dir.x * reach, p.y + dir.y * reach, 0)) reach -= 8;
  c.released = true; c.tier = tier; c.hopT = 0; c.dirX = dir.x; c.dirY = dir.y; c.face = faceOf(dir.x, dir.y); c.sx = p.x; c.sy = p.y; c.tx = p.x + dir.x * reach; c.ty = p.y + dir.y * reach; c.len = reach; c.hop = tg ? tg.id : -1; c.pulses = 0; c.hits = [];
  const tail = tier >= 3 ? REN_V.ringAt + 0.05 : tier === 2 ? REN_V.spiral[1] + 0.05 : 0.1;
  c.dur = c.t + REN_V.lunge + tail + REN_V.recover; p.sigCd = REN_V.cooldown; p.invulnerable = Math.max(p.invulnerable, REN_V.lunge + 0.08);   // a real release spends the cooldown even on a miss
  emit(s, 'ren_v_release', p.x, p.y, tier | odBit(s), c.tx, c.ty);
}
function novaContact(s: GameState, c: HeroCast): boolean {
  const p = s.player, tier = c.tier, q = p.qDamage * fm(s) * REN_V.tierMul[tier], fist = { x: p.x + c.dirX * (p.radius + 14), y: p.y + c.dirY * (p.radius + 14) };
  const near = s.enemies.filter(e => alive(e) && Math.hypot(e.x - fist.x, e.y - fist.y) <= REN_V.contactR + e.radius).sort(byDistId(fist.x, fist.y)), prim = near.find(e => e.id === c.hop) ?? near[0];
  if (!prim) { emit(s, 'ren_v_miss', fist.x, fist.y, odBit(s)); s.player.sigCd = Math.min(s.player.sigCd, 8); return false; }   // a miss never explodes
  const hp0 = prim.hp; damageEnemy(s, prim, REN_V.hit * q, { slot: 'none' }); c.tx = prim.x; c.ty = prim.y;
  if (prim.hp < hp0 || prim.hp <= 0) { emit(s, 'ren_v_hit', prim.x, prim.y, tier | odBit(s)); return true; }
  emit(s, 'ren_v_block', prim.x, prim.y, odBit(s)); return false;
}
function updateNova(s: GameState, c: HeroCast, dt: number) {
  const p = s.player;
  if (p.hp <= 0 || s.cinema) { if (c.released) { emit(s, 'ren_v_end', p.x, p.y, odBit(s)); s.hx.act = null; } else cancelNova(s); return; }
  if (!c.released && (p.form < 1 || c.form !== p.form || s.b22.ult.act)) { cancelNova(s); return; }
  if (!c.released) {
    const d = vAim(s); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.charge += dt;
    const t = tierOf(c.charge); if (t > c.tier) { c.tier = t; emit(s, 'ren_v_tier', p.x, p.y, t | odBit(s)); }
    if ((!s.sigHeld && c.charge >= REN_V.minHold) || c.charge >= REN_V.maxHold) releaseNova(s, c);
    return;
  }
  const rt0 = c.hopT, rt = rt0 + dt; c.hopT = rt; const L = REN_V.lunge, tier = c.tier;
  if (rt0 < L) { const u = Math.min(1, rt / L), e = 1 - (1 - u) ** 3, tx = c.sx + (c.tx - c.sx) * e, ty = c.sy + (c.ty - c.sy) * e; if (dt > 0) slideMove(p, (tx - p.x) / dt, (ty - p.y) / dt, dt); }
  if (rt0 < L && rt >= L) { c.pulses = novaContact(s, c) ? 1 : -1; if (c.pulses === -1) c.dur = Math.min(c.dur, c.t + REN_V.recover); }
  if (c.pulses === 1) {
    const ti = rt - L, cx = c.tx, cy = c.ty, base = p.qDamage * fm(s) * REN_V.tierMul[tier], pulse = (i: number, r: number, mul: number, pushPx: number) => { const n = areaHit(s, cx, cy, r, base * mul, pushPx, 0.3, REN_V.cap); ringFx(s, 'ring', cx, cy, r, 0.35); emit(s, 'ren_v_pulse', cx, cy, i | (tier << 5) | (Math.min(n, 63) << 8) | odBit(s)); };
    if (tier <= 1) { if (once(c, 0)) pulse(0, REN_V.burstR + REN_V.burstGrow * tier, REN_V.burstMul, REN_V.push); }
    else if (tier === 2) {
      if (once(c, 0)) pulse(0, REN_V.burstR + REN_V.burstGrow * tier, REN_V.burstMul, REN_V.push);
      REN_V.spiral.forEach((at, i) => { if (ti >= at && once(c, i + 1)) pulse(i + 1, REN_V.spiralR + 20 * i, REN_V.spiralMul, REN_V.push * 0.6); });
    } else {
      if (once(c, 0)) pulse(0, REN_V.eruptR, REN_V.eruptMul, REN_V.push * 1.3);
      if (ti >= REN_V.ringAt && once(c, 1)) { const n = areaHit(s, cx, cy, REN_V.ringR, base * REN_V.ringMul, 0, 0, REN_V.cap, REN_V.eruptR * 0.8); ringFx(s, 'ring', cx, cy, REN_V.ringR, 0.45); emit(s, 'ren_v_pulse', cx, cy, 1 | (tier << 5) | (Math.min(n, 63) << 8) | odBit(s)); }
    }
  }
  if (c.t >= c.dur - 1e-9) { emit(s, 'ren_v_end', p.x, p.y, odBit(s)); s.hx.act = null; }
}

/* ------------------------------------------------------------------ dispatch from HeroSystem.updateHero */
export function updateRenAct(s: GameState, c: HeroCast, dt: number, before: number) {
  switch (c.act) {
    case 'infernal_cyclone': updateCyclone(s, c, dt, before); break;
    case 'scarlet_rampage': updateRampage(s, c, dt, before); break;
    case 'crimson_catastrophe': updateCatastrophe(s, c, before); break;
    case 'nova_fist': updateNova(s, c, dt); break;
    default: break;
  }
}
/** Movement scale (0 = rooted) while one of the form moves runs. */
export function renMoveScale(c: HeroCast): number {
  switch (c.act) {
    case 'infernal_cyclone': return c.t < REN_Q.windup ? REN_Q.moveWindup : c.t < REN_Q.windup + REN_Q.spin ? REN_Q.moveSpin : 0.5;
    case 'scarlet_rampage': return 0;
    case 'crimson_catastrophe': return 0.25;
    case 'nova_fist': return c.released ? 0 : REN_V.moveCharge;
    default: return 1;
  }
}
/** Dash / reveal cancels the act: a cyclone just ends (its cost is already paid, no queued pulses), an unreleased nova is free, everything else ends cleanly. */
export function renCancelAct(s: GameState, c: HeroCast) {
  if (c.act === 'nova_fist') { if (!c.released) { s.hx.act = null; emit(s, 'ren_v_cancel', s.player.x, s.player.y); } return; }
  emit(s, c.act === 'infernal_cyclone' ? 'ren_q_end' : c.act === 'scarlet_rampage' ? 'ren_e_end' : 'ren_r_end', s.player.x, s.player.y, odBit(s)); s.hx.act = null;
}
export const isRenAct = (c: HeroCast | null) => !!c && (c.act === 'infernal_cyclone' || c.act === 'scarlet_rampage' || c.act === 'crimson_catastrophe' || c.act === 'nova_fist');

/* ------------------------------------------------------------------ Primal Overdrive */
export const renOdReady = (s: GameState) => { const p = s.player; return renForm(s) && p.odT <= 0 && p.odMeter >= 100; };
export function startRenOverdrive(s: GameState): boolean {
  const p = s.player; if (!renOdReady(s) || s.phase !== 'running' || s.cinema || p.hp <= 0) return false;
  p.odMeter = 0; p.odT = REN_OD.duration; emit(s, 'ren_od_start', p.x, p.y, p.form); return true;
}
/** Per real hit / kill meter gain. A short window caps how many gains count, so volleys, bursts and zones cannot run the meter away; nothing fills it during Overdrive. */
export function renOdGain(s: GameState, kill = false) {
  const p = s.player; if (!renForm(s) || p.odT > 0) return;
  const w = (s.hx.odWin ??= { t: -9, n: 0 }); if (s.time - w.t >= REN_OD.window) { w.t = s.time; w.n = 0; }
  const cost = kill ? 2 : 1; if (w.n + cost > REN_OD.windowHits) return; w.n += cost;
  p.odMeter = Math.min(100, p.odMeter + (kill ? REN_OD.perKill : REN_OD.perHit));
}

/* ------------------------------------------------------------------ Skybreaker */
function updateFlight(s: GameState, dt: number) {
  const p = s.player, held = s.flyHeld;
  p.flyCd = Math.max(0, p.flyCd - dt); p.flyHold = held ? p.flyHold + dt : 0;
  if (p.flyT === 0) p.air = Math.max(0, p.air - dt * 8);
  const busy = !!s.hx.act || !!s.cinema || p.hp <= 0 || p.form < 1 || !!s.b22.ult.act;
  if (p.flyT === 0) {
    if (!busy && held && p.flyHold >= REN_FLY.holdToLift && p.flyCd <= 0 && p.drive >= REN_FLY.minDrive && p.dashRemaining <= 0) { p.flyT = 0.001; emit(s, 'ren_fly_start', p.x, p.y, odBit(s)); }
    return;
  }
  p.flyT += dt; p.air += (1 - p.air) * Math.min(1, dt * REN_FLY.rise); p.drive = Math.max(0, p.drive - REN_FLY.drain * dt);
  if (!held || p.flyT > REN_FLY.maxT || p.drive < 8 || busy) {
    const dive = !busy && p.flyT >= REN_FLY.slamMinT;   // one bounded impact at the real ground contact, only after an eligible flight
    p.flyT = 0; p.flyCd = REN_FLY.cooldown; p.flyHold = 0;
    let n = 0; if (dive) { n = areaHit(s, p.x, p.y, REN_FLY.slamR, p.qDamage * fm(s) * REN_FLY.slamMul, REN_FLY.slamPush, 0.4, 14); ringFx(s, 'slam', p.x, p.y, REN_FLY.slamR, 0.45); p.invulnerable = Math.max(p.invulnerable, 0.15); }
    emit(s, 'ren_fly_land', p.x, p.y, (dive ? 1 : 0) | (Math.min(n, 63) << 8) | odBit(s));
  }
}

/* ------------------------------------------------------------------ per tick + input */
export function updateRenCombat(s: GameState, dt: number) {
  const p = s.player; if (s.hero !== 'ren') return;
  p.sigCd = Math.max(0, p.sigCd - dt);   // ticks in base and every form, never reset by form changes
  if (p.hp <= 0 || s.cinema) { if (p.odT > 0) { p.odT = 0; emit(s, 'ren_od_end', p.x, p.y, p.form); } if (p.flyT > 0) { p.flyT = 0; p.air = 0; } return; }
  if (p.odT > 0) { p.odT -= dt; if (p.odT <= 0 || p.form < 1) { p.odT = 0; emit(s, 'ren_od_end', p.x, p.y, p.form); } }
  updateFlight(s, dt);
}
/** Per tick, per fighter, with their own raw input and the previous tick's held state. */
export function renCombatInput(s: GameState, input: InputState, prev: { sig: boolean; od: boolean }): { sig: boolean; od: boolean } {
  const sigDown = !!(input.sig || input.sigHeld), odDown = !!input.od;
  s.sigHeld = !!input.sigHeld; s.flyHeld = !!input.flyHeld;
  if (input.sigAbort) cancelNova(s); else if (sigDown && !prev.sig) startNova(s);
  if (odDown && !prev.od) startRenOverdrive(s);
  return { sig: sigDown, od: odDown };
}

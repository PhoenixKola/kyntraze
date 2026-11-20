/** B27 Sora, Azure Sovereign (authoritative sim): Astral Blades auto, Azure Prison (Q), Heaven's Spear (E), Celestial Collapse (R), the charged Astral Devastation (V), Primal Overdrive (the Astral Phoenix) and Skybreaker flight. Used only when `hero === 'sora'` and the form is Sovereign; the base kit stays in HeroSystem. Every damage call goes through damageEnemy once. The committed plan of each move (ground points, ids, tier, damage, Overdrive bit) lives in a plain SoraField so a later change of the world, the form or the aim cannot reroute it; renderers only read the sora_* events and the fields. */
import type { AbilityEventKind, Bolt, Enemy, GameState, HeroCast, InputState, SoraField } from './GameState';
import { SORA_AUTO, SORA_E, SORA_FLY, SORA_OD, SORA_Q, SORA_R, SORA_V } from '../content/soraCombat';
import { ASCEND, SORA } from '../content/heroKits';
import { isBoss } from '../content/enemies';
import { blocked, slideMove } from './CollisionSystem';
import { damageEnemy } from './CombatSystem';
import { clamp, normalize } from '../core/Math';
import { freeAim } from './ApexSystem';
import { strikeHand } from './Strike';
import { aimDir, hand, newCast, nearest, pickGround, push } from './HeroSystem';
import { faceOf } from './AbilitySystem';

const alive = (e: Enemy) => e.hp > 0;
const byDistId = (x: number, y: number) => (a: Enemy, b: Enemy) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((b.x - x) ** 2 + (b.y - y) ** 2) || a.id - b.id;
const odBit = (s: GameState) => (s.player.odT > 0 ? SORA_OD.bit : 0);
export const soraForm = (s: GameState) => s.hero === 'sora' && s.player.form >= 1;
const fm = (s: GameState) => s.mods.formPower;
const has = (s: GameState, id: string) => (s.b22.branches as string[]).includes(id);
const legend = (s: GameState, id: string) => (s.b22.legendary as string[]).includes(id);
/** Boss bodies, boss parts, shielded or invulnerable enemies are never held, pulled or displaced. */
const fixed = (e: Enemy) => isBoss(e.kind) || !!e.part || !!e.ai?.invuln || (e.blockT ?? 0) > 0;
const FIELD_CAP = 10, BOLT_CAP = 90;
function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number, tx?: number, ty?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n, ...(tx !== undefined ? { tx, ty } : {}) });
  if (s.abilityEvents.length > 40) s.abilityEvents.splice(0, s.abilityEvents.length - 40);
}
const fields = (s: GameState) => (s.hx.sf ??= []);
function addField(s: GameState, f: Omit<SoraField, 'id' | 't' | 'hit'>) { const a = fields(s); if (a.length >= FIELD_CAP) a.shift(); a.push({ id: s.nextId++, t: 0, hit: [], ...f }); }
/** One area hit, deterministic order (distance then id), capped target count; ordinary enemies are pushed outward, fixed ones never. Returns the ids hurt. */
function areaHit(s: GameState, x: number, y: number, r: number, dmg: number, pushPx: number, stagger: number, cap: number, slot: 'q' | 'e' | 'r' | 'none', ids?: number[]): number {
  let n = 0;
  for (const e of s.enemies.filter(alive).sort(byDistId(x, y))) {
    if (n >= cap) break; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > r + e.radius) continue;
    const fall = 1 - 0.35 * clamp(d / r, 0, 1);
    if (!damageEnemy(s, e, dmg * fall, { area: true, slot }) && pushPx > 0 && !fixed(e)) push(s, e, dx || 0.01, dy || 0.01, (pushPx * fall) / 4, stagger * fall);
    ids?.push(e.id); n++;
  }
  return n;
}
const ringFx = (s: GameState, kind: 'slam' | 'ring' | 'horizon', x: number, y: number, r: number, dur: number) => { s.hx.rings.push({ id: s.nextId++, x, y, r, t: 0, dur, kind }); if (s.hx.rings.length > 24) s.hx.rings.shift(); };
/** nearest free point on the way from the fighter to a wanted ground point (a mark never sits inside a wall) */
function freePoint(s: GameState, x: number, y: number): { x: number; y: number } {
  const p = s.player; let r = Math.hypot(x - p.x, y - p.y); const d = normalize(x - p.x, y - p.y);
  while (r > 0 && blocked(p.x + d.x * r, p.y + d.y * r, 0)) r -= 10;
  return { x: p.x + d.x * r, y: p.y + d.y * r };
}

/* ------------------------------------------------------------------ Astral Blades (automatic) */
export function soraBladeAuto(s: GameState) {
  const p = s.player;
  const cands = s.enemies.filter(e => alive(e) && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (SORA_AUTO.range + e.radius) ** 2).sort(byDistId(p.x, p.y));
  if (!cands.length) { p.attackClock = 0; return; }
  p.attackClock += Math.max(0.16, p.attackPeriod * SORA_AUTO.period * (p.odT > 0 ? SORA_OD.periodMul : 1));
  const step = s.hx.autoStep++ % SORA_AUTO.beats.length, beat = SORA_AUTO.beats[step], tgt = cands[0];
  const dir = normalize(tgt.x - p.x, tgt.y - p.y), face = faceOf(dir.x, dir.y), perp = { x: -dir.y, y: dir.x }, dmg = (p.attackDamage * ASCEND.sora.autoMul * fm(s) * beat.mul) / beat.n;
  const shots: { ox: number; oy: number; t: Enemy; ang?: number }[] = [], sh = SORA_AUTO.shoulder, oy = p.y - 26;
  const shoulder = (side: number) => ({ ox: p.x + perp.x * side * sh, oy: oy + perp.y * side * sh * 0.5 });
  if (beat.kind === 'left') shots.push({ ...shoulder(-1), t: tgt });
  else if (beat.kind === 'right') shots.push({ ...shoulder(1), t: tgt });
  else if (beat.kind === 'cross') { shots.push({ ...shoulder(-1), t: tgt }, { ...shoulder(1), t: tgt }); }
  else for (let i = -1; i <= 1; i++) shots.push({ ...shoulder(i * 0.8), t: tgt, ang: i * SORA_AUTO.fanSpread });
  if (beat.n === 1) for (const e of cands.slice(1, 1 + Math.min(SORA_AUTO.extraCap, p.targets - 1))) shots.push({ ...shoulder(shots.length % 2 ? 1 : -1), t: e });
  for (const sh2 of shots) {
    const aim = normalize(sh2.t.x - sh2.ox, sh2.t.y - sh2.oy), a = Math.atan2(aim.y, aim.x) + (sh2.ang ?? 0), dx = Math.cos(a), dy = Math.sin(a);
    if (s.hx.bolts.length >= BOLT_CAP) s.hx.bolts.shift();
    const b: Bolt = { id: s.nextId++, x: sh2.ox, y: sh2.oy, vx: dx * SORA_AUTO.speed, vy: dy * SORA_AUTO.speed, ttl: (SORA_AUTO.range + 60) / SORA_AUTO.speed + 0.1, damage: dmg, radius: SORA_AUTO.radius * (beat.kind === 'fan' ? 0.8 : 1), kind: 'blade', pierce: SORA_AUTO.pierceForm, hits: [], homing: 0.03, form: p.form };
    s.hx.bolts.push(b);
  }
  const hnd = strikeHand(face, dir.x, dir.y, step), o = hand(s, dir.x, dir.y, 22);
  s.hx.strike = { x: dir.x, y: dir.y, t: s.time, step, hand: hnd };
  /** n: beat (bits 0-1), blades from bit 4, Overdrive bit */
  emit(s, 'sora_auto', o.x, o.y, step | (Math.min(shots.length, 7) << 4) | odBit(s), tgt.x, tgt.y);
}

/* ------------------------------------------------------------------ Q Azure Prison */
export function soraQ(s: GameState): boolean {
  const p = s.player, pt = pickGround(s, SORA_Q.range, SORA_Q.defaultRange, 120, SORA.base.radius), d = normalize(pt.x - p.x, pt.y - p.y), rs = p.qRadius / SORA.base.qRadius;
  p.qCooldown = SORA_Q.cooldown;
  const c = newCast(s, 'azure_prison', d.x || d.y ? d : normalize(p.aimX, p.aimY), SORA_Q.windup + SORA_Q.recover); c.tx = pt.x; c.ty = pt.y; s.hx.act = c;
  const r = SORA_Q.radius * rs;
  addField(s, { k: 'prison', x: pt.x, y: pt.y, dmg: p.qDamage * fm(s), form: p.form, od: p.odT > 0 ? 1 : 0, tier: 0, r, d: [0] });
  emit(s, 'sora_q_cast', pt.x, pt.y, Math.round(r) | odBit(s)); return true;
}
function updatePrison(s: GameState, f: SoraField, dt: number): boolean {
  const before = f.t; f.t += dt; const hold0 = SORA_Q.form, hold1 = SORA_Q.form + SORA_Q.hold, R = f.r;
  if (f.t >= hold0 && before < hold0) { for (const e of s.enemies.filter(alive).sort(byDistId(f.x, f.y))) if (!fixed(e) && Math.hypot(e.x - f.x, e.y - f.y) <= R + e.radius && f.hit.length < SORA_Q.cap) f.hit.push(e.id); }
  if (f.t >= hold0 && f.t < hold1) {
    for (const e of s.enemies) {
      if (!alive(e) || fixed(e) || !f.hit.includes(e.id)) continue; e.stagger = Math.max(e.stagger, 0.12);   // the game's own slow: ordinary captured enemies crawl
      const dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy); if (d > R * SORA_Q.edge && d > 1) slideMove(e, (dx / d) * 120, (dy / d) * 120, dt);   // a soft wall: captured ones cannot walk out, and never through walls (slideMove)
    }
    for (let k = 0; k < SORA_Q.ticks; k++) { const at = hold0 + ((k + 0.5) * SORA_Q.hold) / SORA_Q.ticks; if (before < at && f.t >= at) { const n = areaHit(s, f.x, f.y, R, f.dmg * SORA_Q.tickMul, 0, 0, SORA_Q.cap, 'q'); emit(s, 'sora_q_tick', f.x, f.y, k | (Math.min(n, 63) << 8) | (f.od ? SORA_OD.bit : 0)); } }
  }
  if (f.t >= hold1) {
    const n = areaHit(s, f.x, f.y, R * 1.05, f.dmg * SORA_Q.shatterMul, 90, 0.5, SORA_Q.cap, 'q'); ringFx(s, 'slam', f.x, f.y, R * 1.05, 0.4);
    emit(s, 'sora_q_shatter', f.x, f.y, (Math.min(n, 63) << 8) | (f.od ? SORA_OD.bit : 0)); return true;
  }
  return false;
}

/* ------------------------------------------------------------------ E Heaven's Spear */
export function soraE(s: GameState): boolean {
  const p = s.player, dir = aimDir(s, SORA_E.range), lane = has(s, 'piercing_meridian'), range = lane ? SORA_E.laneRange : SORA_E.range;
  const count = Math.min(SORA_E.spearsMax, SORA_E.spears + Math.max(0, Math.round(s.mods.beamLinger)));
  const marks: { x: number; y: number }[] = [];
  const laneMark = (i: number) => freePoint(s, p.x + dir.x * (110 + i * SORA_E.spacing * (lane ? 1.7 : 1)), p.y + dir.y * (110 + i * SORA_E.spacing * (lane ? 1.7 : 1)));
  if (lane) for (let i = 0; i < count; i++) marks.push(laneMark(i));   // Piercing Meridian: a straight, longer, narrower lane of spears
  else {
    const tg = s.enemies.filter(e => alive(e) && (() => { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); return d <= range + e.radius && (d < 1 || (dx * dir.x + dy * dir.y) / d >= SORA_E.coneCos); })()).sort(byDistId(p.x, p.y)).slice(0, count);
    for (const e of tg) marks.push({ x: e.x, y: e.y });   // the marked spot is where the target stands NOW; spears never track
    for (let i = 0; marks.length < count; i++) marks.push(laneMark(i));
  }
  p.beamCooldown = SORA_E.cooldown * s.mods.beamCd;
  const c = newCast(s, 'heavens_spear', dir, SORA_E.windup + SORA_E.recover); s.hx.act = c;
  const r = SORA_E.radius * s.mods.beamWidth;   // the Meridian width tradeoff is already in mods.beamWidth
  addField(s, { k: 'spears', x: p.x, y: p.y, dmg: p.qDamage * fm(s) * s.mods.beamDamage * SORA_E.mul, form: p.form, od: p.odT > 0 ? 1 : 0, tier: count, r, d: [0, ...marks.flatMap(m => [m.x, m.y])] });
  emit(s, 'sora_e_start', p.x, p.y, count | odBit(s), marks[0].x, marks[0].y);
  marks.forEach((m, i) => emit(s, 'sora_e_mark', m.x, m.y, i | (Math.round(r) << 4) | odBit(s)));
  return true;
}
function updateSpears(s: GameState, f: SoraField, dt: number): boolean {
  f.t += dt; const n = f.tier;
  while (f.d[0] < n && f.t >= SORA_E.lead + f.d[0] * SORA_E.gap) {
    const i = f.d[0]++, x = f.d[1 + i * 2], y = f.d[2 + i * 2], ids: number[] = [];
    // a repeat hit by the same sequence is reduced, so spears cannot all stack on one boss body
    let hits = 0;
    for (const e of s.enemies.filter(alive).sort(byDistId(x, y))) {
      if (hits >= SORA_E.cap) break; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > f.r + e.radius) continue;
      const again = f.hit.includes(e.id); if (!damageEnemy(s, e, f.dmg * (again ? SORA_E.repeatMul : 1) * (1 - 0.3 * clamp(d / f.r, 0, 1)), { area: true, slot: 'e' }) && !fixed(e)) push(s, e, dx || 0.01, dy || 0.01, 10, 0.25);
      if (!again) f.hit.push(e.id); ids.push(e.id); hits++;
    }
    ringFx(s, 'ring', x, y, f.r, 0.3); emit(s, 'sora_e_land', x, y, i | (Math.min(hits, 63) << 8) | (f.od ? SORA_OD.bit : 0));
  }
  if (f.d[0] >= n && f.t >= SORA_E.lead + (n - 1) * SORA_E.gap + 0.25) { emit(s, 'sora_e_end', f.x, f.y, (Math.min(f.hit.length, 63) << 8) | (f.od ? SORA_OD.bit : 0)); return true; }
  return false;
}

/* ------------------------------------------------------------------ R Celestial Collapse */
export function soraR(s: GameState): boolean {
  const p = s.player, pt = pickGround(s, SORA_R.range, SORA_R.defaultRange, 150, SORA.base.radius), d = normalize(pt.x - p.x, pt.y - p.y);
  p.sphereCooldown = SORA_R.cooldown * s.mods.sphereCd;
  const c = newCast(s, 'azure_collapse', d.x || d.y ? d : normalize(p.aimX, p.aimY), SORA_R.windup + SORA_R.recover); c.tx = pt.x; c.ty = pt.y; s.hx.act = c;
  const focus = has(s, 'celestial_collapse'), zero = legend(s, 'zero_convergence'), sr = s.mods.sphereRadius * (focus ? SORA_R.focusR : 1);
  const dmg = p.qDamage * fm(s) * s.mods.sphereDamage * SORA_R.burstMul * (focus ? SORA_R.focusMul : 1) * (zero ? 1.5 : 1);
  addField(s, { k: 'collapse', x: pt.x, y: pt.y, dmg, form: p.form, od: p.odT > 0 ? 1 : 0, tier: s.mods.sphereEcho >= 1 && !zero && !focus ? 1 : 0, r: SORA_R.pullR * sr, d: [0, 0, SORA_R.burstR * sr] });   // d: pull ticks done, burst done (1) / echo done (2), burst radius
  emit(s, 'sora_r_cast', pt.x, pt.y, Math.round(SORA_R.pullR * sr) | odBit(s)); return true;
}
function updateCollapse(s: GameState, f: SoraField, dt: number): boolean {
  const before = f.t; f.t += dt; const R = f.r;
  if (f.t < SORA_R.pull) {
    for (const e of s.enemies) {   // collision-safe pull of ordinary enemies; bosses and parts never move
      if (!alive(e) || fixed(e)) continue; const dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy); if (d > R + e.radius || d < 18) continue;
      slideMove(e, (dx / d) * SORA_R.pullSpeed, (dy / d) * SORA_R.pullSpeed, dt);
    }
    const k = Math.floor(f.t / SORA_R.tickEvery); if (k > f.d[0] && Math.floor(before / SORA_R.tickEvery) < k) { f.d[0] = k; areaHit(s, f.x, f.y, R * 0.6, f.dmg * SORA_R.tickMul / 6, 0, 0, 8, 'r'); }
  } else if (f.d[1] === 0) {
    f.d[1] = 1; const ids: number[] = [], B = f.d[2], n = areaHit(s, f.x, f.y, B, f.dmg, SORA_R.push, SORA_R.stagger, SORA_R.cap, 'r', ids); f.hit = ids;
    ringFx(s, 'horizon', f.x, f.y, B, 0.5); emit(s, 'sora_r_burst', f.x, f.y, (Math.min(n, 63) << 8) | (f.od ? SORA_OD.bit : 0) | (f.tier ? 1 : 0));
  } else if (f.d[1] === 1 && f.tier && f.t >= SORA_R.pull + SORA_R.echoGap) {   // Afterglow / Twin Bloom: one smaller echo of the burst (never a second pull)
    f.d[1] = 2; const n = areaHit(s, f.x, f.y, f.d[2] * 0.85, f.dmg * SORA_R.echoMul, SORA_R.push * 0.6, 0.3, SORA_R.cap, 'r'); ringFx(s, 'ring', f.x, f.y, f.d[2] * 0.85, 0.35); emit(s, 'sora_r_burst', f.x, f.y, (Math.min(n, 63) << 8) | (f.od ? SORA_OD.bit : 0) | 2);
  }
  if (f.d[1] >= (f.tier ? 2 : 1)) { emit(s, 'sora_r_end', f.x, f.y, f.od ? SORA_OD.bit : 0); return true; }
  return false;
}

/* ------------------------------------------------------------------ V Astral Devastation */
const tierOf = (charge: number) => SORA_V.stages.reduce((t, v, i) => (charge >= v ? i + 1 : t), 0);
export const astralReady = (s: GameState) => { const p = s.player; return soraForm(s) && p.sigCd <= 0; };
export const astralCharge = (s: GameState): { charge: number; tier: number } | null => { const c = s.hx.act; return c && c.act === 'astral_devastation' && !c.released ? { charge: c.charge, tier: tierOf(c.charge) } : null; };
function vAim(s: GameState) { const fa = freeAim(s); if (fa) return { x: fa.x, y: fa.y }; const t = nearest(s, SORA_V.range); return t ? normalize(t.x - s.player.x, t.y - s.player.y) : normalize(s.player.aimX, s.player.aimY); }
export function startAstral(s: GameState): boolean {
  const p = s.player;
  if (!astralReady(s) || s.phase !== 'running' || s.cinema || s.hx.act || s.b22.ult.act || p.dashRemaining > 0 || p.hp <= 0 || p.flyT > 0) return false;
  const d = vAim(s), c = newCast(s, 'astral_devastation', d, SORA_V.maxHold + 2); s.hx.act = c; emit(s, 'sora_v_charge', p.x, p.y, odBit(s)); return true;
}
/** An unreleased charge is cancelled for free (cooldown untouched); a released technique always finishes. */
export function cancelAstral(s: GameState) { const c = s.hx.act; if (c && c.act === 'astral_devastation' && !c.released) { s.hx.act = null; emit(s, 'sora_v_cancel', s.player.x, s.player.y); } }
function releaseAstral(s: GameState, c: HeroCast) {
  const p = s.player, d = vAim(s), tier = tierOf(c.charge), o = hand(s, d.x, d.y, 24, 'orb'), range = SORA_V.range + SORA_V.rangeTier * tier;
  c.released = true; c.tier = tier; c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.dur = c.t + SORA_V.recover; p.sigCd = SORA_V.cooldown;   // a real release spends the cooldown even on a miss
  const sp = SORA_V.speed + SORA_V.speedTier * tier;
  addField(s, { k: 'astral', x: o.x, y: o.y, dmg: p.qDamage * fm(s) * SORA_V.tierMul[tier], form: p.form, od: p.odT > 0 ? 1 : 0, tier, r: SORA_V.radius + SORA_V.radiusTier * tier, d: [d.x * sp, d.y * sp, 0, range, 0, 0] });   // d: vx, vy, travelled, range, state (0 flying, 1 detonating), time since detonation
  emit(s, 'sora_v_release', o.x, o.y, tier | odBit(s), o.x + d.x * range, o.y + d.y * range);
}
function updateAstral(s: GameState, f: SoraField, dt: number): boolean {
  const base = f.dmg, tier = f.tier;
  if (f.d[4] === 0) {
    const sp = Math.hypot(f.d[0], f.d[1]), steps = Math.max(1, Math.ceil((sp * dt) / 8)), sx = (f.d[0] * dt) / steps, sy = (f.d[1] * dt) / steps;
    for (let i = 0; i < steps; i++) {
      const nx = f.x + sx, ny = f.y + sy;
      if (blocked(nx, ny, 0)) { emit(s, 'sora_v_fizzle', f.x, f.y, 1 | (tier << 4) | (f.od ? SORA_OD.bit : 0)); s.player.sigCd = Math.min(s.player.sigCd, 8); return true; }   // an obstacle ends it: a small fizzle, no hit
      f.x = nx; f.y = ny; f.d[2] += Math.hypot(sx, sy);
      const prim = s.enemies.filter(e => alive(e) && !e.ai?.invuln && (e.x - f.x) ** 2 + (e.y - f.y) ** 2 <= (f.r + e.radius) ** 2).sort(byDistId(f.x, f.y))[0];
      if (prim) {
        const hp0 = prim.hp; damageEnemy(s, prim, SORA_V.hit * base, { slot: 'none' });
        if (prim.hp < hp0 || prim.hp <= 0) { f.d[4] = 1; f.d[5] = 0; f.hit = [prim.id]; emit(s, 'sora_v_hit', f.x, f.y, tier | (f.od ? SORA_OD.bit : 0)); break; }
        emit(s, 'sora_v_block', f.x, f.y, f.od ? SORA_OD.bit : 0); return true;   // shield / block: consumed without a blast
      }
      if (f.d[2] >= f.d[3]) { emit(s, 'sora_v_fizzle', f.x, f.y, 0 | (tier << 4) | (f.od ? SORA_OD.bit : 0)); s.player.sigCd = Math.min(s.player.sigCd, 8); return true; }
    }
    return false;
  }
  f.d[5] += dt; const ti = f.d[5], cx = f.x, cy = f.y, odb = f.od ? SORA_OD.bit : 0;
  const pulse = (i: number, r: number, mul: number, pushPx: number) => { const n = areaHit(s, cx, cy, r, base * mul, pushPx, 0.3, SORA_V.cap, 'none'); ringFx(s, 'ring', cx, cy, r, 0.4); emit(s, 'sora_v_pulse', cx, cy, i | (tier << 5) | (Math.min(n, 63) << 8) | odb); };
  if (once(f, 0)) pulse(0, SORA_V.burstR + SORA_V.burstGrow * tier, SORA_V.burstMul, SORA_V.push);
  if (tier >= 2 && ti >= 0.12 && once(f, 1)) pulse(1, SORA_V.ringR, SORA_V.ringMul, SORA_V.push * 0.6);   // the second, wider layer
  if (tier >= 3 && ti >= SORA_V.afterAt && once(f, 2)) pulse(2, SORA_V.afterR, SORA_V.afterMul, 0);   // the controlled afterpulse
  return ti >= (tier >= 3 ? SORA_V.afterAt + 0.1 : tier >= 2 ? 0.25 : 0.12);
}
const once = (f: SoraField, key: number) => { const k = 1000 + key; if (f.hit.includes(k)) return false; f.hit.push(k); return true; };
function updateAstralCast(s: GameState, c: HeroCast, dt: number) {
  const p = s.player;
  if (p.hp <= 0 || s.cinema) { if (c.released) { emit(s, 'sora_v_end', p.x, p.y, odBit(s)); s.hx.act = null; } else cancelAstral(s); return; }
  if (!c.released && (p.form < 1 || c.form !== p.form || s.b22.ult.act)) { cancelAstral(s); return; }
  if (!c.released) {
    const d = vAim(s); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.charge += dt;
    const t = tierOf(c.charge); if (t > c.tier) { c.tier = t; emit(s, 'sora_v_tier', p.x, p.y, t | odBit(s)); }
    if ((!s.sigHeld && c.charge >= SORA_V.minHold) || c.charge >= SORA_V.maxHold) releaseAstral(s, c);
    return;
  }
  if (c.t >= c.dur - 1e-9) { emit(s, 'sora_v_end', p.x, p.y, odBit(s)); s.hx.act = null; }
}

/* ------------------------------------------------------------------ dispatch from HeroSystem.updateHero */
export function updateSoraAct(s: GameState, c: HeroCast, dt: number) {
  if (c.act === 'astral_devastation') updateAstralCast(s, c, dt);
}
/** Movement scale (0 = rooted) while one of the form moves runs. */
export function soraMoveScale(c: HeroCast): number {
  switch (c.act) {
    case 'azure_prison': return c.t < SORA_Q.windup ? SORA_Q.moveWindup : 0.8;
    case 'heavens_spear': return c.t < SORA_E.windup ? SORA_E.moveWindup : 0.7;
    case 'azure_collapse': return SORA_R.moveScale;
    case 'astral_devastation': return c.released ? 0.3 : SORA_V.moveCharge;
    default: return 1;
  }
}
/** Dash / reveal cancels the act: a committed field keeps resolving by its own plan, an unreleased V charge is free. */
export function soraCancelAct(s: GameState, c: HeroCast) {
  if (c.act === 'astral_devastation') { if (!c.released) cancelAstral(s); else { emit(s, 'sora_v_end', s.player.x, s.player.y, odBit(s)); s.hx.act = null; } return; }
  emit(s, c.act === 'azure_prison' ? 'sora_q_end' : c.act === 'heavens_spear' ? 'sora_e_end' : 'sora_r_end', s.player.x, s.player.y, odBit(s)); s.hx.act = null;
}
export const isSoraAct = (c: HeroCast | null) => !!c && (c.act === 'azure_prison' || c.act === 'heavens_spear' || c.act === 'azure_collapse' || c.act === 'astral_devastation');

/* ------------------------------------------------------------------ Primal Overdrive */
export const soraOdReady = (s: GameState) => { const p = s.player; return soraForm(s) && p.odT <= 0 && p.odMeter >= 100; };
export function startSoraOverdrive(s: GameState): boolean {
  const p = s.player; if (!soraOdReady(s) || s.phase !== 'running' || s.cinema || p.hp <= 0) return false;
  p.odMeter = 0; p.odT = SORA_OD.duration; emit(s, 'sora_od_start', p.x, p.y, p.form); return true;
}
/** Per real hit / kill meter gain. A short window caps how many gains count, so volleys, bursts and zones cannot run the meter away; nothing fills it during Overdrive. */
export function soraOdGain(s: GameState, kill = false) {
  const p = s.player; if (!soraForm(s) || p.odT > 0) return;
  const w = (s.hx.odWin ??= { t: -9, n: 0 }); if (s.time - w.t >= SORA_OD.window) { w.t = s.time; w.n = 0; }
  const cost = kill ? 2 : 1; if (w.n + cost > SORA_OD.windowHits) return; w.n += cost;
  p.odMeter = Math.min(100, p.odMeter + (kill ? SORA_OD.perKill : SORA_OD.perHit));
}

/* ------------------------------------------------------------------ Skybreaker */
function updateFlight(s: GameState, dt: number) {
  const p = s.player, held = s.flyHeld;
  p.flyCd = Math.max(0, p.flyCd - dt); p.flyHold = held ? p.flyHold + dt : 0;
  if (p.flyT === 0) p.air = Math.max(0, p.air - dt * 8);
  const busy = !!s.hx.act || !!s.cinema || p.hp <= 0 || p.form < 1 || !!s.b22.ult.act;
  if (p.flyT === 0) {
    if (!busy && held && p.flyHold >= SORA_FLY.holdToLift && p.flyCd <= 0 && p.drive >= SORA_FLY.minDrive && p.dashRemaining <= 0) { p.flyT = 0.001; emit(s, 'sora_fly_start', p.x, p.y, odBit(s)); }
    return;
  }
  p.flyT += dt; p.air += (1 - p.air) * Math.min(1, dt * SORA_FLY.rise); p.drive = Math.max(0, p.drive - SORA_FLY.drain * dt);
  if (!held || p.flyT > SORA_FLY.maxT || p.drive < 8 || busy) {
    const dive = !busy && p.flyT >= SORA_FLY.slamMinT;   // one bounded impact at the real ground contact, only after an eligible flight
    p.flyT = 0; p.flyCd = SORA_FLY.cooldown; p.flyHold = 0;
    let n = 0; if (dive) { n = areaHit(s, p.x, p.y, SORA_FLY.slamR, p.qDamage * fm(s) * SORA_FLY.slamMul, SORA_FLY.slamPush, 0.4, 14, 'none'); ringFx(s, 'ring', p.x, p.y, SORA_FLY.slamR, 0.4); p.invulnerable = Math.max(p.invulnerable, 0.15); }
    emit(s, 'sora_fly_land', p.x, p.y, (dive ? 1 : 0) | (Math.min(n, 63) << 8) | odBit(s));
  }
}

/* ------------------------------------------------------------------ per tick + input */
export function updateSoraCombat(s: GameState, dt: number) {
  const p = s.player; if (s.hero !== 'sora') return;
  p.sigCd = Math.max(0, p.sigCd - dt);   // ticks in base and every form, never reset by form changes
  if (p.hp <= 0 || s.cinema) { s.hx.sf = []; if (p.odT > 0) { p.odT = 0; emit(s, 'sora_od_end', p.x, p.y, p.form); } if (p.flyT > 0) { p.flyT = 0; p.air = 0; } return; }
  if (p.odT > 0) { p.odT -= dt; if (p.odT <= 0 || p.form < 1) { p.odT = 0; emit(s, 'sora_od_end', p.x, p.y, p.form); } }
  const a = s.hx.sf; if (a?.length) {
    const keep: SoraField[] = [];
    for (const f of a) { const done = f.k === 'prison' ? updatePrison(s, f, dt) : f.k === 'spears' ? updateSpears(s, f, dt) : f.k === 'collapse' ? updateCollapse(s, f, dt) : updateAstral(s, f, dt); if (!done) keep.push(f); }
    s.hx.sf = keep;
  }
  updateFlight(s, dt);
}
/** Per tick, per fighter, with their own raw input and the previous tick's held state. */
export function soraCombatInput(s: GameState, input: InputState, prev: { sig: boolean; od: boolean }): { sig: boolean; od: boolean } {
  const sigDown = !!(input.sig || input.sigHeld), odDown = !!input.od;
  s.sigHeld = !!input.sigHeld; s.flyHeld = !!input.flyHeld;
  if (input.sigAbort) cancelAstral(s); else if (sigDown && !prev.sig) startAstral(s);
  if (odDown && !prev.od) startSoraOverdrive(s);
  return { sig: sigDown, od: odDown };
}

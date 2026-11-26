/** B34 Sora, Eventide Seraph (form 2, authoritative sim): Prism Feathers auto, Constellation Pierce (Q), Seraph's Descent (E), Eventide Judgment (R), the charged Astral Rebirth (V), the Eventide Phoenix Overdrive (shared Sora meter and timer) and Celestial Glide flight (in SoraCombat, parameterised by form). Explicit hero + form dispatch: Azure Sovereign (form 1) is untouched. Every damage call goes through damageEnemy once; committed plans live in plain SoraFields so a later change of world, form or aim cannot reroute them. Star Traces (cap 8, 5 s) come only from direct Prism Feather hits and are consumed once each. Renderers only read the sera_* events, the fields and hx.traces. */
import type { AbilityEventKind, Bolt, Enemy, GameState, HeroCast, SoraField } from './GameState';
import { SERA, SERA_AUTO, SERA_E, SERA_Q, SERA_R, SERA_SHIFT, SERA_V, TRACE } from '../content/soraSeraph';
import { SORA_OD } from '../content/soraCombat';
import { ASCEND, SORA } from '../content/heroKits';
import { blocked } from './CollisionSystem';
import { damageEnemy } from './CombatSystem';
import { clamp, normalize } from '../core/Math';
import { freeAim } from './ApexSystem';
import { strikeHand } from './Strike';
import { aimDir, hand, newCast, nearest, pickGround } from './HeroSystem';
import { faceOf } from './AbilitySystem';
import { addField, alive, areaHit, byDistId, emit as emitBase, fixed, fm, freePoint, odBit, ringFx } from './SoraCombat';

const emit = (s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number, tx?: number, ty?: number) => emitBase(s, kind, x, y, n, tx, ty);
export const SERA_FIELDS = new Set<string>(['pierce', 'nodes', 'judg', 'rebirth']);
export const seraForm = (s: GameState) => s.hero === 'sora' && s.player.form === 2;
const BOLT_CAP = 90;

/* ------------------------------------------------------------------ Star Trace */
export const tracesOf = (s: GameState) => (s.hx.traces ??= []);
const traceable = (e: Enemy) => alive(e) && !e.part && !e.ai?.invuln && !((e.blockT ?? 0) > 0);
export function addTrace(s: GameState, e: Enemy) {
  if (!traceable(e)) return; const list = tracesOf(s); let t = list.find(x => x.id === e.id);
  if (!t) { if (list.length >= TRACE.cap) list.shift(); t = { id: e.id, t: 0 }; list.push(t); }
  t.t = s.time + TRACE.life; emit(s, 'sera_trace', e.x, e.y, 1);
}
function takeTrace(s: GameState, e: Enemy): boolean { const list = tracesOf(s), i = list.findIndex(x => x.id === e.id); if (i < 0) return false; list.splice(i, 1); return true; }
/** Consume the traces of foes within r of (x, y), once each (deterministic order, capped): one bounded precision hit per trace. Returns how many were consumed. */
function consumeAt(s: GameState, x: number, y: number, r: number, base: number): number {
  if (!s.hx.traces?.length) return 0; let n = 0;
  for (const e of s.enemies.filter(alive).sort(byDistId(x, y))) {
    if (n >= TRACE.consumeCap) break; if (Math.hypot(e.x - x, e.y - y) > r + e.radius || !takeTrace(s, e)) continue;
    damageEnemy(s, e, base * TRACE.bonusMul, { area: true }); emit(s, 'sera_burst', e.x, e.y, 1 | odBit(s)); n++;
  }
  return n;
}
export function updateTraces(s: GameState) {
  const list = s.hx.traces; if (!list?.length) return;
  if (!seraForm(s)) { s.hx.traces = []; return; }
  const live = new Set(s.enemies.filter(alive).map(e => e.id)); s.hx.traces = list.filter(t => t.t > s.time && live.has(t.id));
}

/* ------------------------------------------------------------------ Prism Feathers (automatic) */
export function seraAuto(s: GameState) {
  const p = s.player;
  const cands = s.enemies.filter(e => alive(e) && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (SERA_AUTO.range + e.radius) ** 2).sort(byDistId(p.x, p.y));
  if (!cands.length) { p.attackClock = 0; return; }
  p.attackClock += Math.max(0.16, p.attackPeriod * SERA_AUTO.period * (p.odT > 0 ? SORA_OD.periodMul : 1));
  const step = s.hx.autoStep++ % SERA_AUTO.beats.length, beat = SERA_AUTO.beats[step], tgt = cands[0];
  const dir = normalize(tgt.x - p.x, tgt.y - p.y), face = faceOf(dir.x, dir.y), perp = { x: -dir.y, y: dir.x }, dmg = (p.attackDamage * ASCEND.sora.autoMul * SERA.autoMul * fm(s) * beat.mul) / beat.n;
  const shots: { ox: number; oy: number; t: Enemy; ang?: number }[] = [], sh = SERA_AUTO.shoulder, oy = p.y - 28;
  const shoulder = (side: number) => ({ ox: p.x + perp.x * side * sh, oy: oy + perp.y * side * sh * 0.5 });
  if (beat.kind === 'left') shots.push({ ...shoulder(-1), t: tgt }); else if (beat.kind === 'right') shots.push({ ...shoulder(1), t: tgt });
  else if (beat.kind === 'cross') shots.push({ ...shoulder(-1), t: tgt, ang: SERA_AUTO.crossAngle }, { ...shoulder(1), t: tgt, ang: -SERA_AUTO.crossAngle });   // each feather starts on one side and crosses the line to the target
  else shots.push({ ox: p.x, oy, t: tgt });
  if (beat.n === 1 && beat.kind !== 'lance') for (const e of cands.slice(1, 1 + Math.min(SERA_AUTO.extraCap, p.targets - 1))) shots.push({ ...shoulder(shots.length % 2 ? 1 : -1), t: e });
  const lance = beat.kind === 'lance';
  for (const sh2 of shots) {
    const aim = normalize(sh2.t.x - sh2.ox, sh2.t.y - sh2.oy), a = Math.atan2(aim.y, aim.x) + (sh2.ang ?? 0), dx = Math.cos(a), dy = Math.sin(a), sp = lance ? SERA_AUTO.lanceSpeed : SERA_AUTO.speed;
    if (s.hx.bolts.length >= BOLT_CAP) s.hx.bolts.shift();
    const b: Bolt = { id: s.nextId++, x: sh2.ox, y: sh2.oy, vx: dx * sp, vy: dy * sp, ttl: (SERA_AUTO.range + 60) / sp + 0.1, damage: dmg, radius: lance ? SERA_AUTO.lanceRadius : SERA_AUTO.radius, kind: 'feather', pierce: beat.pierce, hits: [], homing: sh2.ang ? 0 : 0.03, form: p.form };
    s.hx.bolts.push(b);
  }
  const hnd = strikeHand(face, dir.x, dir.y, step), o = hand(s, dir.x, dir.y, 22);
  s.hx.strike = { x: dir.x, y: dir.y, t: s.time, step, hand: hnd };
  emit(s, 'sera_auto', o.x, o.y, step | (Math.min(shots.length, 7) << 4) | odBit(s), tgt.x, tgt.y);
}

/* ------------------------------------------------------------------ Q Constellation Pierce */
const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy, t = l2 ? clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1) : 0; return Math.hypot(px - (ax + vx * t), py - (ay + vy * t)); };
export function seraQ(s: GameState): boolean {
  const p = s.player; let dir = aimDir(s, SERA_Q.range); const cosA = Math.cos(SERA_Q.assist); let best: Enemy | null = null, bd = 1e9;
  for (const e of s.enemies) { if (!alive(e) || e.hp <= 0) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); if (d > SERA_Q.range || d < 1 || (dx * dir.x + dy * dir.y) / d < cosA || d >= bd) continue; best = e; bd = d; }   // the fan centres on the nearest foe in front, so a lance is never wasted beside it
  if (best) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy); dir = { x: dx / d, y: dy / d }; }
  const o = hand(s, dir.x, dir.y, 22), ends: number[] = [];
  p.qCooldown = SERA_Q.cooldown;
  const c = newCast(s, 'constellation_pierce', dir, SERA_Q.windup + SERA_Q.recover); s.hx.act = c;
  for (let i = 0; i < SERA_Q.lanes; i++) {
    const ang = Math.atan2(dir.y, dir.x) + (i - (SERA_Q.lanes - 1) / 2) * SERA_Q.spread, dx = Math.cos(ang), dy = Math.sin(ang); let r = 0;
    while (r < SERA_Q.range && !blocked(o.x + dx * (r + 8), o.y + dy * (r + 8), 0)) r += 8;   // a lance never passes a wall
    r = Math.max(SERA_Q.minLane, r); ends.push(o.x + dx * r, o.y + dy * r);
  }
  addField(s, { k: 'pierce', x: o.x, y: o.y, dmg: p.qDamage * fm(s) * SERA_Q.mul, form: p.form, od: p.odT > 0 ? 1 : 0, tier: SERA_Q.lanes, r: SERA_Q.halfWidth, d: [0, ...ends] });
  emit(s, 'sera_q_cast', o.x, o.y, odBit(s), ends[ends.length / 2 - 1 | 0] ?? o.x, ends[1] ?? o.y);
  return true;
}
function updatePierce(s: GameState, f: SoraField, dt: number): boolean {
  f.t += dt; const n = f.tier;
  while (f.d[0] < n && f.t >= SERA_Q.lead + f.d[0] * SERA_Q.gap) {
    const i = f.d[0]++, ex = f.d[1 + i * 2], ey = f.d[2 + i * 2]; let hits = 0, follow = 0;
    for (const e of s.enemies.filter(alive).sort(byDistId(f.x, f.y))) {
      if (hits >= SERA_Q.cap) break; if (segDist(e.x, e.y, f.x, f.y, ex, ey) > f.r + e.radius) continue;
      damageEnemy(s, e, f.dmg, { area: true, slot: 'q' }); if (!fixed(e)) e.stagger = Math.max(e.stagger, SERA_Q.stagger); hits++;
      if (takeTrace(s, e)) { damageEnemy(s, e, f.dmg * SERA_Q.followMul, { area: true, slot: 'q' }); emit(s, 'sera_burst', e.x, e.y, 2 | odBit(s)); follow++; }
    }
    emit(s, 'sera_q_lance', f.x, f.y, i | (Math.min(hits, 31) << 4) | (Math.min(follow, 7) << 9) | (f.od ? SORA_OD.bit : 0), ex, ey);
  }
  if (f.d[0] >= n && f.t >= SERA_Q.lead + (n - 1) * SERA_Q.gap + 0.2) { emit(s, 'sera_q_end', f.x, f.y, f.od ? SORA_OD.bit : 0); return true; }
  return false;
}

/* ------------------------------------------------------------------ E Seraph's Descent */
export function seraE(s: GameState): boolean {
  const p = s.player, dir = aimDir(s, SERA_E.range), count = Math.min(SERA_E.nodesMax, SERA_E.nodes + Math.max(0, Math.round(s.mods.beamLinger))), marks: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) marks.push(freePoint(s, p.x + dir.x * (SERA_E.first + i * SERA_E.spacing), p.y + dir.y * (SERA_E.first + i * SERA_E.spacing)));
  p.beamCooldown = SERA_E.cooldown * s.mods.beamCd;
  const c = newCast(s, 'seraphs_descent', dir, SERA_E.windup + SERA_E.recover); s.hx.act = c;
  const r = SERA_E.radius * s.mods.beamWidth;
  addField(s, { k: 'nodes', x: p.x, y: p.y, dmg: p.qDamage * fm(s) * s.mods.beamDamage * SERA_E.mul, form: p.form, od: p.odT > 0 ? 1 : 0, tier: count, r, d: [0, 0, ...marks.flatMap(m => [m.x, m.y])] });   // d: strikes done, convergence done, then the node points
  emit(s, 'sera_e_start', p.x, p.y, count | odBit(s), marks[0].x, marks[0].y);
  marks.forEach((m, i) => emit(s, 'sera_e_node', m.x, m.y, i | (Math.round(r) << 4) | odBit(s)));
  return true;
}
function updateNodes(s: GameState, f: SoraField, dt: number): boolean {
  f.t += dt; const n = f.tier, odb = f.od ? SORA_OD.bit : 0;
  while (f.d[0] < n && f.t >= SERA_E.lead + f.d[0] * SERA_E.gap) {
    const i = f.d[0]++, x = f.d[2 + i * 2], y = f.d[3 + i * 2]; let hits = 0;
    for (const e of s.enemies.filter(alive).sort(byDistId(x, y))) {
      if (hits >= SERA_E.cap) break; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > f.r + e.radius) continue;
      damageEnemy(s, e, f.dmg * (1 - 0.3 * clamp(d / f.r, 0, 1)), { area: true, slot: 'e' }); hits++;
    }
    ringFx(s, 'ring', x, y, f.r, 0.3); emit(s, 'sera_e_strike', x, y, i | (Math.min(hits, 63) << 8) | odb);
  }
  if (f.d[0] >= n && f.d[1] === 0 && f.t >= SERA_E.lead + (n - 1) * SERA_E.gap + 0.12) {   // the convergence: the nodes draw together and every Star Trace they cover pays out once
    f.d[1] = 1; let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += f.d[2 + i * 2]; cy += f.d[3 + i * 2]; } cx /= n; cy /= n;
    let spread = 0; for (let i = 0; i < n; i++) spread = Math.max(spread, Math.hypot(f.d[2 + i * 2] - cx, f.d[3 + i * 2] - cy)); const cr = Math.min(220, spread + SERA_E.convR), got = consumeAt(s, cx, cy, cr, f.dmg * SERA_E.convMul);
    ringFx(s, 'ring', cx, cy, cr, 0.4); emit(s, 'sera_e_conv', cx, cy, Math.round(cr) | (Math.min(got, 15) << 12) | odb);
  }
  if (f.d[1] === 1 && f.t >= SERA_E.lead + (n - 1) * SERA_E.gap + 0.45) { emit(s, 'sera_e_end', f.x, f.y, odb); return true; }
  return false;
}

/* ------------------------------------------------------------------ R Eventide Judgment */
const STARS: readonly (readonly [number, number])[] = [[20, 0.82], [75, 1.0], [140, 0.74], [200, 1.0], [255, 0.88], [305, 1.0], [352, 0.8]];
export function seraR(s: GameState): boolean {
  const p = s.player, pt = pickGround(s, SERA_R.range, SERA_R.defaultRange, 150, SORA.base.radius), d = normalize(pt.x - p.x, pt.y - p.y);
  p.sphereCooldown = SERA_R.cooldown * s.mods.sphereCd;
  const c = newCast(s, 'eventide_judgment', d.x || d.y ? d : normalize(p.aimX, p.aimY), SERA_R.windup + SERA_R.recover); c.tx = pt.x; c.ty = pt.y; s.hx.act = c;
  const stars = STARS.slice(0, SERA_R.stars).flatMap(([deg, k]) => { const a = (deg * Math.PI) / 180; let r = SERA_R.ringR * k; while (r > 20 && blocked(pt.x + Math.cos(a) * r, pt.y + Math.sin(a) * r, 0)) r -= 12; return [pt.x + Math.cos(a) * r, pt.y + Math.sin(a) * r]; });
  const dmg = p.qDamage * fm(s) * s.mods.sphereDamage, R = SERA_R.holdR * s.mods.sphereRadius;
  addField(s, { k: 'judg', x: pt.x, y: pt.y, dmg, form: p.form, od: p.odT > 0 ? 1 : 0, tier: 0, r: R, d: [0, 0, 0, 0, ...stars] });   // d: lit stars, linked(1), swept(1), novaDone(1), then the star points
  emit(s, 'sera_r_cast', pt.x, pt.y, Math.round(R) | odBit(s)); return true;
}
function updateJudgment(s: GameState, f: SoraField, dt: number): boolean {
  f.t += dt; const n = SERA_R.stars, odb = f.od ? SORA_OD.bit : 0, R = f.r;
  while (f.d[0] < n && f.t >= SERA_R.igniteFrom + f.d[0] * SERA_R.igniteGap) { const i = f.d[0]++; emit(s, 'sera_r_node', f.d[4 + i * 2], f.d[5 + i * 2], i | odb); }
  if (f.d[0] >= n && f.d[1] === 0 && f.t >= SERA_R.igniteFrom + n * SERA_R.igniteGap + 0.05) {
    f.d[1] = 1; for (const e of s.enemies.filter(alive).sort(byDistId(f.x, f.y))) if (!fixed(e) && Math.hypot(e.x - f.x, e.y - f.y) <= R + e.radius && f.hit.length < SERA_R.capture) f.hit.push(e.id);
    emit(s, 'sera_r_link', f.x, f.y, n | odb);
  }
  if (f.d[1] === 1 && f.d[2] === 0) for (const e of s.enemies) if (alive(e) && !fixed(e) && f.hit.includes(e.id)) e.stagger = Math.max(e.stagger, 0.12);   // the game's own slow: held ordinary foes crawl; bosses and parts never
  if (f.t >= SERA_R.sweepAt && f.d[2] === 0) { f.d[2] = 1; const k = areaHit(s, f.x, f.y, SERA_R.sweepR, f.dmg * SERA_R.sweepMul, 0, SERA_R.sweepStagger, SERA_R.cap, 'r'); emit(s, 'sera_r_sweep', f.x, f.y, (Math.min(k, 63) << 8) | odb); }
  if (f.t >= SERA_R.novaAt && f.d[3] === 0) {
    f.d[3] = 1; const k = areaHit(s, f.x, f.y, SERA_R.novaR, f.dmg * SERA_R.novaMul, SERA_R.push, SERA_R.stagger, SERA_R.cap, 'r'), got = consumeAt(s, f.x, f.y, SERA_R.novaR, f.dmg * 2);
    ringFx(s, 'horizon', f.x, f.y, SERA_R.novaR, 0.5); emit(s, 'sera_r_nova', f.x, f.y, (Math.min(k, 63) << 8) | (Math.min(got, 15) << 4) | odb);
  }
  if (f.t >= SERA_R.endAt) { emit(s, 'sera_r_end', f.x, f.y, odb); return true; }
  return false;
}

/* ------------------------------------------------------------------ V Astral Rebirth */
const tierOf = (charge: number) => SERA_V.stages.reduce((t, v, i) => (charge >= v ? i + 1 : t), 0);
function vAim(s: GameState) { const fa = freeAim(s); if (fa) return { x: fa.x, y: fa.y }; const t = nearest(s, SERA_V.range); return t ? normalize(t.x - s.player.x, t.y - s.player.y) : normalize(s.player.aimX, s.player.aimY); }
export function seraStartV(s: GameState): boolean {
  const p = s.player;
  if (!seraForm(s) || p.sigCd > 0 || s.phase !== 'running' || s.cinema || s.hx.act || s.b22.ult.act || p.dashRemaining > 0 || p.hp <= 0 || p.flyT > 0) return false;
  const d = vAim(s), c = newCast(s, 'astral_rebirth', d, SERA_V.maxHold + 2); s.hx.act = c; emit(s, 'sera_v_charge', p.x, p.y, odBit(s)); return true;
}
/** An unreleased charge is cancelled for free (cooldown untouched); a released technique always finishes. */
export function cancelRebirth(s: GameState) { const c = s.hx.act; if (c && c.act === 'astral_rebirth' && !c.released) { s.hx.act = null; emit(s, 'sera_v_cancel', s.player.x, s.player.y); } }
function releaseRebirth(s: GameState, c: HeroCast) {
  const p = s.player, d = vAim(s), tier = tierOf(c.charge), o = hand(s, d.x, d.y, 24, 'orb'), range = SERA_V.range + SERA_V.rangeTier * tier;
  c.released = true; c.tier = tier; c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.dur = c.t + SERA_V.recover; p.sigCd = SERA_V.cooldown;   // a real release spends the cooldown even on a miss
  const sp = SERA_V.speed + SERA_V.speedTier * tier;
  addField(s, { k: 'rebirth', x: o.x, y: o.y, dmg: p.qDamage * fm(s) * SERA_V.tierMul[tier], form: p.form, od: p.odT > 0 ? 1 : 0, tier, r: SERA_V.radius + SERA_V.radiusTier * tier, d: [d.x * sp, d.y * sp, 0, range, 0, 0] });   // d: vx, vy, travelled, range, state (0 flying, 1 detonating), time since detonation
  emit(s, 'sera_v_release', o.x, o.y, tier | odBit(s), o.x + d.x * range, o.y + d.y * range);
}
const once = (f: SoraField, key: number) => { const k = 1000 + key; if (f.hit.includes(k)) return false; f.hit.push(k); return true; };
function updateRebirth(s: GameState, f: SoraField, dt: number): boolean {
  const base = f.dmg, tier = f.tier, odb = f.od ? SORA_OD.bit : 0;
  if (f.d[4] === 0) {
    const sp = Math.hypot(f.d[0], f.d[1]), steps = Math.max(1, Math.ceil((sp * dt) / 8)), sx = (f.d[0] * dt) / steps, sy = (f.d[1] * dt) / steps;
    for (let i = 0; i < steps; i++) {
      const nx = f.x + sx, ny = f.y + sy;
      if (blocked(nx, ny, 0)) { emit(s, 'sera_v_miss', f.x, f.y, 1 | (tier << 4) | odb); s.player.sigCd = Math.min(s.player.sigCd, 8); return true; }
      f.x = nx; f.y = ny; f.d[2] += Math.hypot(sx, sy);
      const prim = s.enemies.filter(e => alive(e) && !e.ai?.invuln && (e.x - f.x) ** 2 + (e.y - f.y) ** 2 <= (f.r + e.radius) ** 2).sort(byDistId(f.x, f.y))[0];
      if (prim) {
        const hp0 = prim.hp; damageEnemy(s, prim, SERA_V.hit * base, { slot: 'none' });
        if (prim.hp < hp0 || prim.hp <= 0) { f.d[4] = 1; f.d[5] = 0; f.hit = [prim.id]; emit(s, 'sera_v_hit', f.x, f.y, tier | odb); break; }
        emit(s, 'sera_v_block', f.x, f.y, odb); return true;   // shield / block: consumed without a burst
      }
      if (f.d[2] >= f.d[3]) { emit(s, 'sera_v_miss', f.x, f.y, 0 | (tier << 4) | odb); s.player.sigCd = Math.min(s.player.sigCd, 8); return true; }
    }
    return false;
  }
  f.d[5] += dt; const ti = f.d[5], cx = f.x, cy = f.y;
  const pulse = (i: number, r: number, mul: number, pushPx: number) => { const n = areaHit(s, cx, cy, r, base * mul, pushPx, 0.3, SERA_V.cap, 'none'); ringFx(s, 'ring', cx, cy, r, 0.4); consumeAt(s, cx, cy, Math.max(r, SERA_V.traceR), base); emit(s, 'sera_v_pulse', cx, cy, i | (tier << 5) | (Math.min(n, 63) << 8) | odb); };
  if (once(f, 0)) pulse(0, SERA_V.burstR + SERA_V.burstGrow * tier, SERA_V.burstMul, SERA_V.push);
  if (tier >= 2 && ti >= 0.12 && once(f, 1)) pulse(1, SERA_V.ringR, SERA_V.ringMul, SERA_V.push * 0.6);
  if (tier >= 3 && ti >= SERA_V.phoenixAt && once(f, 2)) pulse(2, SERA_V.phoenixR, SERA_V.phoenixMul, 0);   // the Phoenix-shaped burst
  if (tier >= 3 && ti >= SERA_V.afterAt && once(f, 3)) pulse(3, SERA_V.afterR, SERA_V.afterMul, 0);   // the bounded aftershock
  return ti >= (tier >= 3 ? SERA_V.afterAt + 0.15 : tier >= 2 ? 0.25 : 0.12);
}
function updateRebirthCast(s: GameState, c: HeroCast, dt: number) {
  const p = s.player;
  if (p.hp <= 0 || s.cinema) { if (c.released) { emit(s, 'sera_v_end', p.x, p.y, odBit(s)); s.hx.act = null; } else cancelRebirth(s); return; }
  if (!c.released && (p.form !== 2 || c.form !== p.form || s.b22.ult.act)) { cancelRebirth(s); return; }
  if (!c.released) {
    const d = vAim(s); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.charge += dt;
    const t = tierOf(c.charge); if (t > c.tier) { c.tier = t; emit(s, 'sera_v_tier', p.x, p.y, t | odBit(s)); }
    if ((!s.sigHeld && c.charge >= SERA_V.minHold) || c.charge >= SERA_V.maxHold) releaseRebirth(s, c);
    return;
  }
  if (c.t >= c.dur - 1e-9) { emit(s, 'sera_v_end', p.x, p.y, odBit(s)); s.hx.act = null; }
}

/* ------------------------------------------------------------------ dispatch from SoraCombat / HeroSystem */
export function updateSeraField(s: GameState, f: SoraField, dt: number): boolean { return f.k === 'pierce' ? updatePierce(s, f, dt) : f.k === 'nodes' ? updateNodes(s, f, dt) : f.k === 'judg' ? updateJudgment(s, f, dt) : updateRebirth(s, f, dt); }
export function updateSeraAct(s: GameState, c: HeroCast, dt: number) { if (c.act === 'astral_rebirth') updateRebirthCast(s, c, dt); }
export function seraMoveScale(c: HeroCast): number {
  switch (c.act) {
    case 'constellation_pierce': return c.t < SERA_Q.windup ? SERA_Q.moveWindup : 0.8;
    case 'seraphs_descent': return c.t < SERA_E.windup ? SERA_E.moveWindup : 0.7;
    case 'eventide_judgment': return SERA_R.moveScale;
    case 'astral_rebirth': return c.released ? 0.3 : SERA_V.moveCharge;
    default: return 1;
  }
}
/** Dash / reveal / shift cancels the act: a committed field keeps resolving by its own plan, an unreleased V charge is free. */
export function seraCancelAct(s: GameState, c: HeroCast) {
  if (c.act === 'astral_rebirth') { if (!c.released) cancelRebirth(s); else { emit(s, 'sera_v_end', s.player.x, s.player.y, odBit(s)); s.hx.act = null; } return; }
  emit(s, c.act === 'constellation_pierce' ? 'sera_q_end' : c.act === 'seraphs_descent' ? 'sera_e_end' : 'sera_r_end', s.player.x, s.player.y, odBit(s)); s.hx.act = null;
}
export const isSeraAct = (c: HeroCast | null) => !!c && (c.act === 'constellation_pierce' || c.act === 'seraphs_descent' || c.act === 'eventide_judgment' || c.act === 'astral_rebirth');

/* ------------------------------------------------------------------ form shift (Azure Sovereign <-> Eventide Seraph) */
export function seraShift(s: GameState, to: 1 | 2): boolean {
  const p = s.player;
  if (s.hero !== 'sora' || p.form < 1 || to === p.form || !s.heroFormUnlocked || (to === 2 && !s.soraF2) || s.phase !== 'running' || s.cinema || s.selector.open || p.hp <= 0 || p.formCooldown > 0 || p.drive < SERA_SHIFT.minDrive) return false;
  const c = s.hx.act; if (c) { if (c.act === 'astral_devastation' || c.act === 'astral_rebirth') { if (!c.released) s.hx.act = null; } else s.hx.act = null; }   // an unreleased V charge ends; a released V keeps its committed form; any other act ends
  p.form = to; p.drive = Math.max(1, p.drive - SERA_SHIFT.cost); p.formCooldown = SERA_SHIFT.cooldown * s.mods.formCd; p.invulnerable = Math.max(p.invulnerable, 0.2); p.flyT = 0; p.air = 0; p.flyHold = 0; p.flyOn = false;
  if (to === 1) s.hx.traces = [];   // traces belong to the seraph
  emit(s, 'sera_shift', p.x, p.y, to | odBit(s)); return true;
}
export function seraShiftInput(s: GameState, fDown: boolean, wasF: boolean) {
  const p = s.player; if (s.hero !== 'sora' || p.form < 1 || !s.soraF2) return;
  if (fDown && !wasF && !s.selector.open) seraShift(s, p.form === 1 ? 2 : 1);
}

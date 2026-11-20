/** B28 Vex, Riftbound (form 1) and Voidheart Exile (form 2) (authoritative sim): Phantom Edge / Invisible Judgment autos, Mirror Guard / Phantom Legion (Q), Rift Execution / Dimensional Severance (E), Oath of Ruin / Domain of the Exile (R), Abyssal Fang / Event Horizon (V), the Abyssal Guardian Overdrive, per-form Skybreaker flight and the Vex-only Form Shift. Used only when `hero === 'vex'` and the form is 1 or 2; the base kit stays in VexSystem. Every damage call goes through damageEnemy once. The committed plan of each move (ground points, ids, tier, damage, form, Overdrive bit) lives in a plain VexField, so a later change of the world, the aim or the form cannot reroute it; renderers only read the vex_* events and the fields. */
import type { AbilityEventKind, Enemy, GameState, HeroCast, InputState, VexField, VexFieldKind } from './GameState';
import { VEX1_AUTO, VEX1_E, VEX1_Q, VEX1_R, VEX1_V, VEX2_AUTO, VEX2_E, VEX2_Q, VEX2_R, VEX2_V, VEX_FLY, VEX_OD, VEX_SHIFT } from '../content/vexCombat';
import { ASCEND, VEX } from '../content/heroKits';
import { isBoss } from '../content/enemies';
import { blocked, slideMove } from './CollisionSystem';
import { damageEnemy } from './CombatSystem';
import { clamp, normalize } from '../core/Math';
import { freeAim } from './ApexSystem';
import { strikeHand } from './Strike';
import { aimDir, hand, newCast, nearest, pathClear, push } from './HeroSystem';
import { faceOf } from './AbilitySystem';
import { bump, b22Emit } from '../b22/state';
import { detonateSeal, threatened } from './VexSystem';

const alive = (e: Enemy) => e.hp > 0;
const byDistId = (x: number, y: number) => (a: Enemy, b: Enemy) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((b.x - x) ** 2 + (b.y - y) ** 2) || a.id - b.id;
const odBit = (s: GameState) => (s.player.odT > 0 ? VEX_OD.bit : 0);
export const vexForm = (s: GameState) => s.hero === 'vex' && s.player.form >= 1;
const fm = (s: GameState) => s.mods.formPower;
const has = (s: GameState, id: string) => (s.b22.branches as string[]).includes(id);
const legend = (s: GameState, id: string) => (s.b22.legendary as string[]).includes(id);
const marked = (s: GameState, id: number) => s.b22.marks.some(m => m.enemy === id && m.src === 'seal');
const fixed = (e: Enemy) => isBoss(e.kind) || !!e.part || !!e.ai?.invuln || (e.blockT ?? 0) > 0;
const FIELD_CAP = 12;
function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number, tx?: number, ty?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n, ...(tx !== undefined ? { tx, ty } : {}) });
  if (s.abilityEvents.length > 40) s.abilityEvents.splice(0, s.abilityEvents.length - 40);
}
const fields = (s: GameState) => (s.hx.vf ??= []);
function addField(s: GameState, k: VexFieldKind, f: Omit<VexField, 'id' | 't' | 'hit' | 'k'>) { const a = fields(s); if (a.length >= FIELD_CAP) a.shift(); a.push({ id: s.nextId++, k, t: 0, hit: [], ...f }); }
const ringFx = (s: GameState, kind: 'slam' | 'ring' | 'rush', x: number, y: number, r: number, dur: number) => { s.hx.rings.push({ id: s.nextId++, x, y, r, t: 0, dur, kind }); if (s.hx.rings.length > 24) s.hx.rings.shift(); };
type Slot = 'q' | 'e' | 'r' | 'none';
/** One area hit, deterministic order (distance then id), capped target count; ordinary enemies are pushed outward, fixed ones never. Returns the number of enemies hurt. */
function areaHit(s: GameState, x: number, y: number, r: number, dmg: number, pushPx: number, stagger: number, cap: number, slot: Slot): number {
  let n = 0;
  for (const e of s.enemies.filter(alive).sort(byDistId(x, y))) {
    if (n >= cap) break; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > r + e.radius) continue;
    const fall = 1 - 0.3 * clamp(d / r, 0, 1);
    if (!damageEnemy(s, e, dmg * fall, { area: true, slot }) && pushPx > 0 && !fixed(e)) push(s, e, dx || 0.01, dy || 0.01, (pushPx * fall) / 4, stagger * fall);
    n++;
  }
  return n;
}
/** distance from a point to a segment, with the position along it */
function segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number) { const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, t = clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1); return { d: Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t)), t }; }
function freePoint(s: GameState, x: number, y: number): { x: number; y: number } { const p = s.player; let r = Math.hypot(x - p.x, y - p.y); const d = normalize(x - p.x, y - p.y); while (r > 0 && blocked(p.x + d.x * r, p.y + d.y * r, 0)) r -= 10; return { x: p.x + d.x * r, y: p.y + d.y * r }; }
const coolMul = (s: GameState) => (s.player.form === 2 ? 0.9 : 1);
function threatEvidence(s: GameState, hits: number) {   // a real threat-timed answer: counts as a riposte (First Riposte / Exile's Measure) and arms Null Waltz
  if (hits <= 0) return; bump(s.b22, 'riposte', hits); if (s.player.form === 2) bump(s.b22, 'riposte.form', hits);   // First Riposte is a Voidheart feat s.b22.vex.riposteT = s.time;
  if (legend(s, 'null_waltz') && s.time - (s.b22.legendCd.null_waltz ?? -99) > 8) { s.b22.legendCd.null_waltz = s.time; s.b22.vex.nullWaltz = 3; s.b22.vex.waltzAt = s.time + 0.2; }
}

/* ------------------------------------------------------------------ autos */
export function vexFormAuto(s: GameState) { if (s.player.form === 1) riftAuto(s); else voidAuto(s); }
function riftAuto(s: GameState) {
  const p = s.player, A = VEX1_AUTO;
  const tgt = nearest(s, A.reach + 20); if (!tgt || Math.hypot(tgt.x - p.x, tgt.y - p.y) - tgt.radius > A.reach) { p.attackClock = 0; return; }   // short and medium reach only: nobody in range = no swing
  p.attackClock += Math.max(0.16, p.attackPeriod * A.period * (p.odT > 0 ? VEX_OD.periodMul : 1));
  const step = s.hx.autoStep++ % A.beats.length, beat = A.beats[step], fin = step === A.beats.length - 1;
  const dir = normalize(tgt.x - p.x, tgt.y - p.y), face = faceOf(dir.x, dir.y), hnd = strikeHand(face, dir.x, dir.y, step), cos = Math.cos(((beat.arc / 2) * Math.PI) / 180);
  let dmg = p.attackDamage * ASCEND.vex.autoMul[0] * fm(s) * beat.mul; if (fin && s.b22.vex.requiem > 0) { dmg *= 1.5; s.b22.vex.requiem = 0; }
  const cands = s.enemies.filter(e => { if (!alive(e)) return false; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); return d - e.radius <= A.reach && (d < 1 || (dx * dir.x + dy * dir.y) / d >= cos); }).sort(byDistId(p.x, p.y)).slice(0, p.targets + (fin ? A.sweepCap : 1));
  let hits = 0;
  for (const e of cands) {
    const mk = marked(s, e.id), d = dmg * (mk ? VEX.auto.markMul : 1);   // the mark bonus only where the target really carries a mark
    const m = mk ? s.b22.marks.find(x => x.enemy === e.id && x.src === 'seal') : undefined; if (m) m.power += d;
    damageEnemy(s, e, d, { area: true }); hits++; if (fin && !fixed(e)) push(s, e, e.x - p.x, e.y - p.y, A.finisherPush / 4, 0.18);
  }
  s.hx.strike = { x: dir.x, y: dir.y, t: s.time, step, hand: hnd };
  /** n: beat (bits 0-1), form bits 2-3, finisher 32, right hand 64, hits from bit 8, Overdrive bit */
  emit(s, 'vex_auto', p.x + dir.x * 40, p.y + dir.y * 40, step | (1 << 2) | (fin ? 32 : 0) | (hnd === 'right' ? 64 : 0) | (Math.min(hits, 63) << 8) | odBit(s), tgt.x, tgt.y);
}
function voidAuto(s: GameState) {
  const p = s.player, A = VEX2_AUTO;
  const cands = s.enemies.filter(e => alive(e) && !e.part && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (A.range + e.radius) ** 2 && pathClear(p.x, p.y, e.x, e.y, 4)).sort(byDistId(p.x, p.y));   // no cut through walls
  if (!cands.length) { p.attackClock = 0; return; }
  p.attackClock += Math.max(0.16, p.attackPeriod * A.period * (p.odT > 0 ? VEX_OD.periodMul : 1));
  const step = s.hx.autoStep++ % A.beats.length, beat = A.beats[step], fin = step === A.beats.length - 1, tgt = cands[0], dir = normalize(tgt.x - p.x, tgt.y - p.y), hnd = strikeHand(faceOf(dir.x, dir.y), dir.x, dir.y, step);
  const pts = beat.kind === 'single' || beat.kind === 'angle' ? [tgt] : beat.kind === 'double' ? [tgt, cands[1] ?? tgt] : cands.slice(0, A.cap);
  let dmg = (p.attackDamage * ASCEND.vex.autoMul[1] * fm(s) * beat.mul) / pts.length; if (fin && s.b22.vex.requiem > 0) { dmg *= 1.5; s.b22.vex.requiem = 0; }
  addField(s, 'judg', { x: p.x, y: p.y, dmg, form: 2, od: p.odT > 0 ? 1 : 0, tier: step, r: A.cutR, d: pts.flatMap(e => [e.x, e.y, e.id]) });   // committed points and ids: the cut lands there after the delay or fizzles
  s.hx.strike = { x: dir.x, y: dir.y, t: s.time, step, hand: hnd };
  emit(s, 'vex_auto', p.x + dir.x * 30, p.y + dir.y * 30, step | (2 << 2) | (fin ? 32 : 0) | (hnd === 'right' ? 64 : 0) | (Math.min(pts.length, 63) << 8) | odBit(s), tgt.x, tgt.y);
}
function updateJudg(s: GameState, f: VexField, dt: number): boolean {
  f.t += dt; if (f.t < VEX2_AUTO.delay) return false;
  for (let i = 0; i + 2 < f.d.length; i += 3) {
    const x = f.d[i], y = f.d[i + 1], e = s.enemies.find(q => q.id === f.d[i + 2] && alive(q)), ok = !!e && (e.x - x) ** 2 + (e.y - y) ** 2 <= (f.r + e.radius) ** 2;   // a target that left the committed point is missed
    if (ok && e) damageEnemy(s, e, f.dmg * (marked(s, e.id) ? VEX.auto.markMul : 1), { area: true });
    emit(s, 'vex_judg_cut', x, y, (ok ? 1 : 0) | (f.tier << 1) | (f.od ? VEX_OD.bit : 0));
  }
  return true;
}

/* ------------------------------------------------------------------ Q */
export function vexFormQ(s: GameState): boolean { return s.player.form === 1 ? mirrorGuardQ(s) : legionQ(s); }
const perfectScale = (s: GameState) => (has(s, 'reversal_guard') ? 1.6 : has(s, 'mirror_counter') ? 0.7 : 1);
function mirrorGuardQ(s: GameState): boolean {
  const p = s.player, dir = aimDir(s, 220), Q = VEX1_Q, v = s.b22.vex;
  p.qCooldown = Q.cooldown * coolMul(s); s.hx.act = newCast(s, 'mirror_guard', dir, Q.total + Q.recover);
  v.guardDir = { x: dir.x, y: dir.y }; v.parryT = 0; v.parryLeft = Q.total; emit(s, 'vex_q_guard', p.x, p.y, 0 | odBit(s)); return true;
}
/** A hostile hit is about to land on Vex. Returns the damage that reaches him (0 = parried) or null when no form guard applies. Arena hazards (owner 0) are never parryable. */
export function vexFormIntercept(s: GameState, dmg: number, from: { x: number; y: number } | undefined, owner: number | undefined): { dmg: number; parried: boolean } | null {
  if (s.hero !== 'vex' || s.player.form < 1 || owner === 0) return null;
  const p = s.player, v = s.b22.vex, c = s.hx.act;
  if (p.form === 1 && c && c.act === 'mirror_guard' && c.t <= VEX1_Q.total) {
    if (from) { const dx = from.x - p.x, dy = from.y - p.y, d = Math.hypot(dx, dy) || 1, cos = (dx * v.guardDir.x + dy * v.guardDir.y) / d; if (cos < Math.cos(((VEX1_Q.arcDeg * (has(s, 'reversal_guard') ? 1.25 : 1)) / 2) * Math.PI / 180)) return null; }
    const perfect = c.t <= VEX1_Q.perfect * perfectScale(s) && s.time - (v.parryCd ?? 0) > VEX1_Q.gap;
    if (!perfect) { emit(s, 'vex_q_guard', p.x, p.y, 2 | odBit(s)); s.impacts.push({ id: s.nextId++, kind: 'block', x: p.x, y: p.y, ttl: 0.2, life: 0.2 }); return { dmg: dmg * (1 - VEX1_Q.reduce), parried: false }; }   // a late hit is only softened, never a counter
    v.parryCd = s.time; mirrorRiposte(s, from, owner, c); return { dmg: 0, parried: true };
  }
  if (p.form === 2) {
    const clones = fields(s).filter(f => f.k === 'clone' && f.d[3] === 0); if (!clones.length) return null;
    const age = Math.min(...clones.map(f => f.t));
    if (has(s, 'mirror_counter') && age <= VEX2_Q.counterWindow) {   // a precisely timed hit shortly after the Legion forms: one precision counter, then nothing
      for (const f of fields(s)) if (f.k === 'clone') f.d[3] = 1;
      const tgt = (owner ? s.enemies.find(e => e.id === owner && alive(e)) : undefined) ?? nearest(s, 260);
      if (tgt) { const n = areaHit(s, tgt.x, tgt.y, 70, p.qDamage * VEX2_Q.counterMul * fm(s), 0, 0, 4, 'q'); if (n) { threatEvidence(s, n); v.requiem = legend(s, 'shard_requiem') && v.requiem === 0 ? 1 : 0; } emit(s, 'vex_q_echo', tgt.x, tgt.y, 7 | odBit(s)); }
      return { dmg: 0, parried: true };
    }
    if (has(s, 'reversal_guard')) { const f = clones[0]; for (const g of fields(s)) if (g.k === 'clone') g.d[3] = 1; f.t = VEX2_Q.life; emit(s, 'vex_q_guard', f.x, f.y, 4 | odBit(s)); return { dmg: 0, parried: true }; }   // a copy steps in front of one eligible hit and is spent
  }
  return null;
}
function mirrorRiposte(s: GameState, from: { x: number; y: number } | undefined, owner: number | undefined, c: HeroCast) {
  const p = s.player, v = s.b22.vex, hadCharge = v.requiem > 0, Q = VEX1_Q;
  const dmg = p.qDamage * Q.echoMul * fm(s) * (has(s, 'mirror_counter') ? 1.9 : has(s, 'reversal_guard') ? 0.85 : 1) * (hadCharge ? 1.4 : 1);
  addField(s, 'echo', { x: p.x, y: p.y, dmg, form: 1, od: p.odT > 0 ? 1 : 0, tier: 0, r: Q.echoR, d: [owner ?? 0, 0] });
  bump(s.b22, 'parry.perfect'); bump(s.b22, 'parry.perfect.form'); s.b22.m['parry.perfect'] = s.b22.m['parry.perfect'] ?? 0;
  p.qCooldown = Math.max(0, p.qCooldown * (1 - Q.refund)); if (s.mods.beamDrive > 0 && p.form === 0) p.drive = Math.min(100, p.drive + s.mods.beamDrive * 2);
  v.requiem = hadCharge ? 0 : legend(s, 'shard_requiem') ? 1 : 0;   // a perfect guard stores ONE charge; spending it is not refunded
  c.t = Math.max(c.t, c.dur - 0.16); p.invulnerable = Math.max(p.invulnerable, 0.2);
  s.impacts.push({ id: s.nextId++, kind: 'block', x: p.x + v.guardDir.x * 30, y: p.y + v.guardDir.y * 30, ttl: 0.25, life: 0.25, heavy: true });
  emit(s, 'vex_q_guard', p.x + v.guardDir.x * 30, p.y + v.guardDir.y * 30, 1 | odBit(s)); b22Emit(s.b22, 'parry', p.x, p.y, { x2: from?.x, y2: from?.y });
}
function updateEcho(s: GameState, f: VexField, dt: number): boolean {
  f.t += dt; const Q = VEX1_Q;
  while (f.d[1] < Q.echoes && f.t >= Q.echoAt[f.d[1]]) {
    const i = f.d[1]++, tgt = (f.d[0] ? s.enemies.find(e => e.id === f.d[0] && alive(e)) : undefined) ?? s.enemies.filter(e => alive(e) && (e.x - f.x) ** 2 + (e.y - f.y) ** 2 <= (Q.echoReach + e.radius) ** 2).sort(byDistId(f.x, f.y))[0];
    if (!tgt) continue; areaHit(s, tgt.x, tgt.y, f.r, f.dmg, 0, 0, 4, 'q'); if (!fixed(tgt)) tgt.stagger = Math.max(tgt.stagger, Q.stun); emit(s, 'vex_q_echo', tgt.x, tgt.y, i | (f.od ? VEX_OD.bit : 0));
  }
  return f.d[1] >= Q.echoes;
}
function legionQ(s: GameState): boolean {
  const p = s.player, Q = VEX2_Q, dir = aimDir(s, 200), base = Math.atan2(dir.y, dir.x);
  p.qCooldown = Q.cooldown * coolMul(s); const c = newCast(s, 'phantom_legion', dir, Q.cast); s.hx.act = c;
  for (const g of fields(s).filter(f => f.k === 'clone')) g.t = Q.life;   // a recast replaces the old Legion, never stacks a second one
  let n = 0;
  for (let i = 0; i < Q.copies; i++) {
    const a = base + Math.PI / 2 + (i * Math.PI * 2) / Q.copies; let r = Q.spawnR, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.8;
    while (r > 20 && blocked(x, y, 12)) { r -= 14; x = p.x + Math.cos(a) * r; y = p.y + Math.sin(a) * r * 0.8; }
    if (r <= 20) continue;
    addField(s, 'clone', { x, y, dmg: p.attackDamage * ASCEND.vex.autoMul[1] * fm(s) * Q.mul, form: 2, od: p.odT > 0 ? 1 : 0, tier: i, r: 0, d: [0, 0.2 + 0.12 * i, i, 0] }); n++;   // d: target id, attack cooldown, index, used-flag
  }
  emit(s, 'vex_q_legion', p.x, p.y, n | odBit(s)); return true;
}
function updateClone(s: GameState, f: VexField, dt: number): boolean {
  f.t += dt; if (f.t >= VEX2_Q.life) { emit(s, 'vex_q_legion', f.x, f.y, 0); return true; }
  const p = s.player, Q = VEX2_Q;
  const cands = s.enemies.filter(e => alive(e) && !e.part && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (Q.range + e.radius) ** 2).sort(byDistId(p.x, p.y)), tgt = cands.length ? cands[f.tier % cands.length] : null;   // each copy takes its own stable target
  f.d[0] = tgt ? tgt.id : 0;
  let gx = f.x, gy = f.y; if (tgt) { gx = tgt.x; gy = tgt.y; } else { const a = f.tier * 2.09 + s.time * 0.6; gx = p.x + Math.cos(a) * Q.spawnR; gy = p.y + Math.sin(a) * Q.spawnR * 0.8; }
  if (Math.hypot(f.x - p.x, f.y - p.y) > Q.leash) { gx = p.x; gy = p.y; }
  const d = Math.hypot(gx - f.x, gy - f.y); if (d > 6) { const m = { x: f.x, y: f.y, radius: 12 } as unknown as Enemy; slideMove(m, ((gx - f.x) / d) * Q.speed, ((gy - f.y) / d) * Q.speed, dt); f.x = m.x; f.y = m.y; }
  f.d[1] -= dt;
  if (tgt && f.d[1] <= 0 && Math.hypot(tgt.x - f.x, tgt.y - f.y) <= Q.strikeR + tgt.radius) { f.d[1] = Q.atkEvery; damageEnemy(s, tgt, f.dmg, { area: true, fx: true, noOd: true }); emit(s, 'vex_q_clone_cut', tgt.x, tgt.y, f.tier | (f.od ? VEX_OD.bit : 0), f.x, f.y); }
  return false;
}

/* ------------------------------------------------------------------ E */
export function vexFormE(s: GameState): boolean { return s.player.form === 1 ? riftE(s) : severE(s); }
function landing(s: GameState, tgt: Enemy): { x: number; y: number } | null {
  const p = s.player, d = normalize(tgt.x - p.x, tgt.y - p.y), g = tgt.radius + p.radius + VEX1_E.behind;
  for (const a of [0, 0.7, -0.7, 1.4, -1.4]) {
    const c = Math.cos(a), sn = Math.sin(a), x = tgt.x + (d.x * c - d.y * sn) * g, y = tgt.y + (d.x * sn + d.y * c) * g;
    if (!blocked(x, y, p.radius) && !s.enemies.some(e => alive(e) && e !== tgt && (e.x - x) ** 2 + (e.y - y) ** 2 < (e.radius + p.radius * 0.7) ** 2)) return { x, y };   // a free, open spot outside every collision footprint
  }
  return null;
}
function riftE(s: GameState): boolean {
  const p = s.player, E = VEX1_E, dir = aimDir(s, E.range), eclipse = has(s, 'eclipse_shift'), shadow = has(s, 'shadow_riposte'), range = E.range * (eclipse ? 1.35 : shadow ? 0.8 : 1);
  const cands = s.enemies.filter(e => { if (!alive(e) || e.part || e.ai?.invuln) return false; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); return d - e.radius <= range && (d < 1 || (dx * dir.x + dy * dir.y) / d >= E.coneCos); })
    .sort((a, b) => (shadow ? Number(marked(s, b.id)) - Number(marked(s, a.id)) : 0) || byDistId(p.x, p.y)(a, b));
  let tgt: Enemy | null = null, land: { x: number; y: number } | null = null;
  for (const e of cands.slice(0, 4)) { const l = landing(s, e); if (l) { tgt = e; land = l; break; } }
  const c = newCast(s, 'rift_execution', tgt ? normalize(tgt.x - p.x, tgt.y - p.y) : dir, E.windup + E.arrive + E.cut + E.recover); s.hx.act = c;
  c.sx = p.x; c.sy = p.y; c.tx = land ? land.x : p.x; c.ty = land ? land.y : p.y; c.hop = tgt ? tgt.id : 0; c.hopT = land ? 1 : 0; c.charge = threatened(s) ? 1 : 0; c.beats = 0;
  p.beamCooldown = E.cooldown * s.mods.beamCd * coolMul(s); p.invulnerable = Math.max(p.invulnerable, E.iframes);
  emit(s, 'vex_e_open', p.x, p.y, (land ? 1 : 0) | (c.charge << 1) | odBit(s), c.tx, c.ty); return true;
}
function updateRiftExec(s: GameState, c: HeroCast) {
  const p = s.player, E = VEX1_E;
  if (c.beats === 0 && c.t >= E.windup + E.arrive) {
    c.beats = 1; if (c.hopT) { p.x = c.tx; p.y = c.ty; } emit(s, 'vex_e_arrive', p.x, p.y, (c.hopT ? 1 : 0) | odBit(s), c.sx, c.sy);
    if (c.hopT && has(s, 'eclipse_shift')) s.b22.zones.push({ id: s.nextId++, kind: 'line', x: c.sx, y: c.sy, x2: p.x, y2: p.y, r: 26, t: 0, dur: 2.2, tick: 0.3, next: 0.3, dmg: p.qDamage * 0.35, push: 0, src: 'vex_fracture' });   // one bounded residual fracture along the real path
  }
  if (c.beats === 1 && c.t >= E.windup + E.arrive + E.cut) {
    c.beats = 2; const tgt = c.hop ? s.enemies.find(e => e.id === c.hop && alive(e)) : undefined, cx = c.hopT && tgt ? tgt.x : p.x + c.dirX * E.fallbackReach, cy = c.hopT && tgt ? tgt.y : p.y + c.dirY * E.fallbackReach;
    const base = p.qDamage * E.mul * fm(s) * s.mods.beamDamage * (has(s, 'eclipse_shift') ? 0.8 : has(s, 'shadow_riposte') ? 1.25 : 1) * (c.hopT ? 1 : 0.6); let hits = 0;
    const list = s.enemies.filter(alive).filter(e => (e.x - cx) ** 2 + (e.y - cy) ** 2 <= (E.cutR * (1 + (s.mods.beamWidth - 1) * 0.6) + e.radius) ** 2).sort((a, b) => (a === tgt ? -1 : b === tgt ? 1 : 0) || byDistId(cx, cy)(a, b)).slice(0, E.cap + Math.round(s.mods.beamLinger));
    for (const e of list) { damageEnemy(s, e, base * (e === tgt ? 1.3 : 1) * (marked(s, e.id) ? 1.2 : 1), { area: true, slot: 'e' }); hits++; if (!fixed(e)) e.stagger = Math.max(e.stagger, 0.35); }
    ringFx(s, 'ring', cx, cy, E.cutR, 0.3); emit(s, 'vex_e_cut', cx, cy, (Math.min(hits, 63) << 8) | (c.hopT ? 1 : 0) | odBit(s));
    if (c.charge) threatEvidence(s, hits);
  }
}
function severE(s: GameState): boolean {
  const p = s.player, E = VEX2_E, dir = aimDir(s, E.length), eclipse = has(s, 'eclipse_shift');
  // Shadow Riposte: a short safe step behind a valid marked target before the cut
  if (has(s, 'shadow_riposte')) { const t = s.enemies.filter(e => alive(e) && !e.part && marked(s, e.id) && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (E.step + e.radius) ** 2).sort(byDistId(p.x, p.y))[0]; if (t) { const l = landing(s, t); if (l && pathClear(p.x, p.y, l.x, l.y, p.radius * 0.5)) { p.x = l.x; p.y = l.y; } } }
  let len = E.length * (eclipse ? 1.35 : 1); for (let d = 20; d <= len; d += 10) if (blocked(p.x + dir.x * d, p.y + dir.y * d, 0)) { len = Math.max(60, d - 10); break; }   // the lane stops at terrain
  const w = E.width * s.mods.beamWidth, c = newCast(s, 'dim_severance', dir, E.windup + E.recover); s.hx.act = c; p.beamCooldown = E.cooldown * s.mods.beamCd * coolMul(s);
  const extra = Math.min(2, Math.max(0, Math.round(s.mods.beamLinger)));
  addField(s, 'sever', { x: p.x, y: p.y, dmg: p.qDamage * E.mul * fm(s) * s.mods.beamDamage, form: 2, od: p.odT > 0 ? 1 : 0, tier: threatened(s) ? 1 : 0, r: w, d: [p.x + dir.x * len, p.y + dir.y * len, 0, extra] });   // d: lane end x, y, pulses done, extra pulses
  emit(s, 'vex_e_warn', p.x, p.y, Math.round(w) | odBit(s), p.x + dir.x * len, p.y + dir.y * len); return true;
}
function laneHit(s: GameState, f: VexField, mul: number, widen: number, cap: number, slot: Slot, tag: number) {
  let hits = 0; const x1 = f.d[0], y1 = f.d[1];
  for (const e of s.enemies.filter(alive).sort(byDistId(f.x, f.y))) {
    if (hits >= cap) break; const sd = segDist(e.x, e.y, f.x, f.y, x1, y1); if (sd.d > (f.r * widen) / 2 + e.radius) continue;
    const times = f.hit.filter(id => id === e.id).length; if (times >= 2) continue;   // a lane hurts each enemy at most twice (cut and reconnect)
    damageEnemy(s, e, f.dmg * mul, { area: true, slot }); f.hit.push(e.id); hits++; if (!fixed(e)) e.stagger = Math.max(e.stagger, 0.3);
  }
  void tag; return hits;
}
function updateSever(s: GameState, f: VexField, dt: number): boolean {
  const E = VEX2_E, before = f.t; f.t += dt;
  if (before < E.warn && f.t >= E.warn) { const n = laneHit(s, f, 1, 1, E.cap, 'e', 0); emit(s, 'vex_e_cut', f.x, f.y, (Math.min(n, 63) << 8) | 4 | (f.od ? VEX_OD.bit : 0), f.d[0], f.d[1]); if (f.tier) threatEvidence(s, n); b22Emit(s.b22, 'sever', f.x, f.y, { x2: f.d[0], y2: f.d[1] }); }
  const k = f.d[2]; if (k <= f.d[3] && f.t >= E.warn + E.shockGap * (k + 1)) {
    f.d[2] = k + 1; const n = laneHit(s, f, k === 0 ? E.shockMul / 1 : E.extraMul * 2, k === 0 ? 1.4 : 1.2, E.cap, 'e', 1); emit(s, 'vex_e_shock', f.x, f.y, (Math.min(n, 63) << 8) | (k === 0 ? 1 : 0) | (f.od ? VEX_OD.bit : 0), f.d[0], f.d[1]);
  }
  return f.d[2] > f.d[3] && f.t >= E.warn + E.shockGap * (f.d[3] + 1) + 0.15;
}

/* ------------------------------------------------------------------ R */
export function vexFormR(s: GameState): boolean { return s.player.form === 1 ? riftR(s) : domainR(s); }
function riftR(s: GameState): boolean {
  const p = s.player, R = VEX1_R, dir = aimDir(s, R.range), severe = has(s, 'severance_judgment'), n = severe ? R.sealsSevere : R.seals;
  const tg = s.enemies.filter(e => alive(e) && !e.part && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (R.range + e.radius) ** 2).sort((a, b) => (severe ? Number(isBoss(b.kind)) - Number(isBoss(a.kind)) || b.maxHp - a.maxHp : 0) || byDistId(p.x, p.y)(a, b));
  const pts: { x: number; y: number }[] = [];
  for (const e of tg) { if (pts.length >= n - 1) break; if (pts.every(q => Math.hypot(q.x - e.x, q.y - e.y) >= 60)) pts.push({ x: e.x, y: e.y }); }   // saved ground coordinates: the seals do not follow
  for (let i = 0; pts.length < n - 1; i++) { const side = i % 2 ? 1 : -1, x = p.x + dir.x * (110 + i * R.spacing) - dir.y * 28 * side, y = p.y + dir.y * (110 + i * R.spacing) + dir.x * 28 * side; pts.push(freePoint(s, x, y)); }
  const cx = pts.reduce((a, q) => a + q.x, 0) / pts.length, cy = pts.reduce((a, q) => a + q.y, 0) / pts.length; pts.push(freePoint(s, cx, cy));   // the last, widest seal converges on the chain
  const c = newCast(s, 'oath_ruin', dir, R.windup + R.recover); s.hx.act = c; p.sphereCooldown = R.cooldown * s.mods.sphereCd * coolMul(s);
  addField(s, 'seal', { x: p.x, y: p.y, dmg: p.qDamage * fm(s) * s.mods.sphereDamage * R.mul, form: 1, od: p.odT > 0 ? 1 : 0, tier: n, r: R.r * s.mods.sphereRadius, d: [0, ...pts.flatMap(q => [q.x, q.y])] });
  emit(s, 'vex_r_cast', p.x, p.y, n | odBit(s)); pts.forEach((q, i) => emit(s, 'vex_r_mark', q.x, q.y, i | (n << 4) | odBit(s))); return true;
}
function updateSeal(s: GameState, f: VexField, dt: number): boolean {
  f.t += dt; const R = VEX1_R, n = f.tier, sr = s.mods.sphereRadius;
  while (f.d[0] < n && f.t >= R.windup + R.warn + f.d[0] * R.gap) {
    const i = f.d[0]++, x = f.d[1 + i * 2], y = f.d[2 + i * 2], last = i === n - 1, rad = (last ? R.finalR : R.r) * sr; let hits = 0;
    for (const e of s.enemies.filter(alive).sort(byDistId(x, y))) {
      if (hits >= R.cap) break; if ((e.x - x) ** 2 + (e.y - y) ** 2 > (rad + e.radius) ** 2) continue;
      if (f.hit.filter(id => id === e.id).length >= R.repeats) continue;   // no chain of overlapping seals melts one body
      damageEnemy(s, e, f.dmg * (last ? R.finalMul / R.mul : 1) * (f.hit.includes(e.id) ? 0.4 : 1), { area: true, slot: 'r' }); f.hit.push(e.id); hits++;
      if (!fixed(e) && last) push(s, e, e.x - x || 0.01, e.y - y || 0.01, 30, 0.4);
      if (!isBoss(e.kind) && s.b22.marks.filter(m => m.src === 'seal').length < R.markCap && !marked(s, e.id)) s.b22.marks.push({ id: s.nextId++, enemy: e.id, t: R.markFuse, power: 0, src: 'seal' });   // a genuine, bounded mark
    }
    ringFx(s, last ? 'slam' : 'ring', x, y, rad, 0.4); emit(s, 'vex_r_erupt', x, y, i | (last ? 32 : 0) | (Math.min(hits, 63) << 8) | (f.od ? VEX_OD.bit : 0));
    if (last && has(s, 'marked_detonation') && s.b22.marks.some(m => m.src === 'seal')) detonateSeal(s);
  }
  return f.d[0] >= n && f.t >= R.windup + R.warn + n * R.gap;
}
function domainR(s: GameState): boolean {
  const p = s.player, R = VEX2_R; p.sphereCooldown = R.cooldown * s.mods.sphereCd * coolMul(s);
  const c = newCast(s, 'domain_exile', aimDir(s, 200), R.cast); s.hx.act = c;
  addField(s, 'domain', { x: p.x, y: p.y, dmg: p.qDamage * fm(s) * s.mods.sphereDamage * R.mul, form: 2, od: p.odT > 0 ? 1 : 0, tier: 0, r: R.radius * s.mods.sphereRadius, d: [0, 0] });   // d: ticks done, strikes spent
  emit(s, 'vex_r_cast', p.x, p.y, Math.round(R.radius * s.mods.sphereRadius) | odBit(s)); return true;
}
function updateDomain(s: GameState, f: VexField, dt: number): boolean {
  const p = s.player, R = VEX2_R; f.t += dt; f.x = p.x; f.y = p.y;   // the field follows Vex's ground position
  while (f.t >= (f.d[0] + 1) * R.every && f.d[0] < Math.floor(R.dur / R.every)) {
    const k = f.d[0]++, severe = has(s, 'severance_judgment');
    const inside = s.enemies.filter(e => alive(e) && !e.part && (e.x - f.x) ** 2 + (e.y - f.y) ** 2 <= (f.r + e.radius) ** 2).sort((a, b) => a.id - b.id);
    let pick: Enemy[]; if (severe) pick = inside.slice().sort((a, b) => Number(isBoss(b.kind)) - Number(isBoss(a.kind)) || b.maxHp - a.maxHp || a.id - b.id).slice(0, 2); else pick = inside.length <= R.targets ? inside : Array.from({ length: R.targets }, (_, j) => inside[(k * R.targets + j) % inside.length]);   // stable rotation, nobody is strobed
    let spread = 0;
    for (const e of pick) {
      if (f.d[1] >= R.budget) break; f.d[1]++; const was = marked(s, e.id);
      damageEnemy(s, e, f.dmg * (severe ? 1.25 : 1), { area: true, slot: 'r' }); if (!fixed(e)) e.stagger = Math.max(e.stagger, R.stagger);
      if (severe && e.hp > 0) s.b22.marks.push({ id: s.nextId++, enemy: e.id, t: 3, power: 0, src: 'vuln' });
      if (was && has(s, 'marked_detonation')) for (const o of s.enemies.filter(alive).sort(byDistId(e.x, e.y))) { if (spread >= 3) break; if (o === e || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > (110 + o.radius) ** 2) continue; damageEnemy(s, o, f.dmg * 0.4, { area: true, slot: 'r' }); spread++; }
      emit(s, 'vex_r_tick', e.x, e.y, (k & 15) | (f.od ? VEX_OD.bit : 0));
    }
  }
  if (f.t >= R.dur) { emit(s, 'vex_r_end', f.x, f.y, f.od ? VEX_OD.bit : 0); return true; }
  return false;
}

/* ------------------------------------------------------------------ V (Abyssal Fang / Event Horizon) */
const stagesOf = (s: GameState) => (s.player.form === 1 ? VEX1_V : VEX2_V).stages;
const maxHoldOf = (s: GameState) => (s.player.form === 1 ? VEX1_V : VEX2_V).maxHold;
const tierOf = (s: GameState, charge: number) => stagesOf(s).reduce((t, v, i) => (charge >= v ? i + 1 : t), 0);
export const vexVReady = (s: GameState) => vexForm(s) && s.player.sigCd <= 0;
const isVAct = (c: HeroCast | null) => !!c && (c.act === 'abyssal_fang' || c.act === 'event_horizon');
export const vexCharge = (s: GameState): { charge: number; tier: number } | null => { const c = s.hx.act; return c && isVAct(c) && !c.released ? { charge: c.charge, tier: tierOf(s, c.charge) } : null; };
function vAim(s: GameState) { const fa = freeAim(s); if (fa) return { x: fa.x, y: fa.y }; const t = nearest(s, VEX1_V.seek); return t ? normalize(t.x - s.player.x, t.y - s.player.y) : normalize(s.player.aimX, s.player.aimY); }
export function startVexV(s: GameState): boolean {
  const p = s.player;
  if (!vexVReady(s) || s.phase !== 'running' || s.cinema || s.hx.act || s.b22.ult.act || p.dashRemaining > 0 || p.hp <= 0 || p.flyT > 0) return false;
  const c = newCast(s, p.form === 1 ? 'abyssal_fang' : 'event_horizon', vAim(s), maxHoldOf(s) + 2); s.hx.act = c; emit(s, 'vex_v_charge', p.x, p.y, p.form | odBit(s)); return true;
}
/** An unreleased charge is cancelled for free (cooldown untouched); a released technique always finishes. */
export function cancelVexV(s: GameState) { const c = s.hx.act; if (c && isVAct(c) && !c.released) { s.hx.act = null; emit(s, 'vex_v_cancel', s.player.x, s.player.y); } }
function releaseV(s: GameState, c: HeroCast) {
  const p = s.player, d = vAim(s), tier = tierOf(s, c.charge); c.released = true; c.tier = tier; c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.sx = p.x; c.sy = p.y; p.sigCd = 45;   // a real release spends the cooldown even on a miss
  if (c.act === 'abyssal_fang') {
    const F = VEX1_V; let reach = F.reach + F.reachTier * tier; while (reach > 0 && blocked(p.x + d.x * reach, p.y + d.y * reach, p.radius * 0.6)) reach -= 8;
    c.tx = p.x + d.x * reach; c.ty = p.y + d.y * reach; c.len = reach; c.hopT = 0; c.pulses = 0; c.hits = []; c.dur = c.t + F.lunge + (tier >= 3 ? F.pulseAt * F.pulses + 0.1 : 0.1) + F.recover; p.invulnerable = Math.max(p.invulnerable, F.lunge + 0.08);
    emit(s, 'vex_v_release', p.x, p.y, tier | (1 << 3) | odBit(s), c.tx, c.ty);
  } else {
    const H = VEX2_V, o = hand(s, d.x, d.y, 24, 'orb'), sp = H.speed + H.speedTier * tier, range = H.range + H.rangeTier * tier; c.dur = c.t + H.recover;
    addField(s, 'horizon', { x: o.x, y: o.y, dmg: p.qDamage * fm(s) * H.tierMul[tier], form: 2, od: p.odT > 0 ? 1 : 0, tier, r: H.radius, d: [d.x * sp, d.y * sp, 0, range, 0, 0] });   // d: vx, vy, travelled, range, state (0 flying, 1 imploding), time since contact
    emit(s, 'vex_v_release', o.x, o.y, tier | (2 << 3) | odBit(s), o.x + d.x * range, o.y + d.y * range);
  }
}
function updateVAct(s: GameState, c: HeroCast, dt: number) {
  const p = s.player, od = odBit(s);
  if (p.hp <= 0 || s.cinema) { if (c.released) { emit(s, 'vex_v_end', p.x, p.y, od); s.hx.act = null; } else cancelVexV(s); return; }
  if (!c.released && (p.form < 1 || c.form !== p.form || s.b22.ult.act)) { cancelVexV(s); return; }
  if (!c.released) {
    const d = vAim(s); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.charge += dt; const t = tierOf(s, c.charge); if (t > c.tier) { c.tier = t; emit(s, 'vex_v_tier', p.x, p.y, t | od); }
    const min = p.form === 1 ? VEX1_V.minHold : VEX2_V.minHold; if ((!s.sigHeld && c.charge >= min) || c.charge >= maxHoldOf(s)) releaseV(s, c); return;
  }
  if (c.act === 'abyssal_fang') {
    const F = VEX1_V, rt0 = c.hopT, rt = rt0 + dt; c.hopT = rt;
    if (rt0 < F.lunge) { const u = Math.min(1, rt / F.lunge), e = 1 - (1 - u) ** 3; if (dt > 0) slideMove(p, ((c.sx + (c.tx - c.sx) * e) - p.x) / dt, ((c.sy + (c.ty - c.sy) * e) - p.y) / dt, dt); }
    if (rt0 < F.lunge * 0.5 && rt >= F.lunge * 0.5) fangStrike(s, c);
    if (c.pulses > 0) for (let k = 0; k < F.pulses; k++) { const at = F.lunge * 0.5 + F.pulseAt * (k + 1); if (rt0 < at && rt >= at) fangPulse(s, c, k); }
  }
  if (c.t >= c.dur - 1e-9) { emit(s, 'vex_v_end', p.x, p.y, od); s.hx.act = null; }
}
function fangStrike(s: GameState, c: HeroCast) {
  const p = s.player, F = VEX1_V, x0 = c.sx, y0 = c.sy, x1 = c.tx + c.dirX * 40, y1 = c.ty + c.dirY * 40, base = p.qDamage * fm(s) * F.tierMul[c.tier];
  const line = s.enemies.filter(alive).map(e => ({ e, sd: segDist(e.x, e.y, x0, y0, x1, y1) })).filter(o => o.sd.d <= F.width / 2 + o.e.radius).sort((a, b) => a.sd.t - b.sd.t || a.e.id - b.e.id).slice(0, F.pierce);
  let hits = 0, first: Enemy | null = null;
  for (const { e } of line) {
    const hp0 = e.hp; damageEnemy(s, e, base * (hits === 0 ? F.hit : F.pierceMul), { area: true, slot: 'none' });
    if (e.hp < hp0 || e.hp <= 0) { hits++; first ??= e; } else { if (hits === 0) emit(s, 'vex_v_block', e.x, e.y, odBit(s)); break; }   // a shield or block ends the line: no pierce through it
  }
  if (!hits || !first) { if (!line.length) emit(s, 'vex_v_miss', c.tx, c.ty, odBit(s)); s.player.sigCd = Math.min(s.player.sigCd, 8); return; }   // a miss only dissipates, never an explosion
  emit(s, 'vex_v_hit', first.x, first.y, c.tier | (Math.min(hits, 15) << 4) | odBit(s), x0, y0); if (c.tier >= 3) c.pulses = 1;
}
function fangPulse(s: GameState, c: HeroCast, k: number) {
  const p = s.player, F = VEX1_V, n = s.enemies.filter(alive).filter(e => segDist(e.x, e.y, c.sx, c.sy, c.tx + c.dirX * 40, c.ty + c.dirY * 40).d <= F.width / 2 + e.radius + 8).slice(0, F.pierce);
  for (const e of n) damageEnemy(s, e, p.qDamage * fm(s) * F.tierMul[c.tier] * F.pulseMul, { area: true, slot: 'none' });
  emit(s, 'vex_v_pulse', (c.sx + c.tx) / 2, (c.sy + c.ty) / 2, k | (c.tier << 5) | (Math.min(n.length, 63) << 8) | odBit(s));
}
const once = (f: VexField, key: number) => { const k = 1000 + key; if (f.hit.includes(k)) return false; f.hit.push(k); return true; };
function updateHorizon(s: GameState, f: VexField, dt: number): boolean {
  const H = VEX2_V, tier = f.tier, od = f.od ? VEX_OD.bit : 0;
  if (f.d[4] === 0) {
    const sp = Math.hypot(f.d[0], f.d[1]), steps = Math.max(1, Math.ceil((sp * dt) / 8)), sx = (f.d[0] * dt) / steps, sy = (f.d[1] * dt) / steps;
    for (let i = 0; i < steps; i++) {
      const nx = f.x + sx, ny = f.y + sy;
      if (blocked(nx, ny, 0)) { emit(s, 'vex_v_fizzle', f.x, f.y, 1 | (tier << 4) | od); s.player.sigCd = Math.min(s.player.sigCd, 8); return true; }   // an obstacle ends it: no blast
      f.x = nx; f.y = ny; f.d[2] += Math.hypot(sx, sy);
      const prim = s.enemies.filter(e => alive(e) && !e.ai?.invuln && (e.x - f.x) ** 2 + (e.y - f.y) ** 2 <= (f.r + e.radius) ** 2).sort(byDistId(f.x, f.y))[0];
      if (prim) { const hp0 = prim.hp; damageEnemy(s, prim, H.hit * f.dmg, { slot: 'none' }); if (prim.hp < hp0 || prim.hp <= 0) { f.d[4] = 1; f.d[5] = 0; emit(s, 'vex_v_hit', f.x, f.y, tier | (2 << 3) | od); break; } emit(s, 'vex_v_block', f.x, f.y, od); return true; }
      if (f.d[2] >= f.d[3]) { emit(s, 'vex_v_fizzle', f.x, f.y, 0 | (tier << 4) | od); s.player.sigCd = Math.min(s.player.sigCd, 8); return true; }   // range end with nothing met: it fizzles, no fake hit
    }
    return false;
  }
  f.d[5] += dt; const ti = f.d[5], pullR = H.pullR + H.pullTier * tier;
  if (ti < H.pull) for (const e of s.enemies) { if (!alive(e) || fixed(e)) continue; const dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy); if (d > pullR + e.radius || d < 16) continue; slideMove(e, (dx / d) * H.pullSpeed, (dy / d) * H.pullSpeed, dt); }   // collision-safe pull, ordinary enemies only
  const pulse = (i: number, r: number, mul: number, pushPx: number) => { const n = areaHit(s, f.x, f.y, r, f.dmg * mul, pushPx, 0.3, H.cap, 'none'); ringFx(s, 'ring', f.x, f.y, r, 0.4); emit(s, 'vex_v_pulse', f.x, f.y, i | (tier << 5) | (Math.min(n, 63) << 8) | (2 << 20) | od); };
  if (ti >= H.pull && once(f, 0)) pulse(0, H.eruptR + H.eruptTier * tier, H.eruptMul, H.push);
  if (tier >= 3 && ti >= H.pull + H.shockAt && once(f, 1)) pulse(1, H.shockR, H.shockMul, 0);
  return ti >= H.pull + (tier >= 3 ? H.shockAt + 0.1 : 0.1);
}

/* ------------------------------------------------------------------ dispatch from HeroSystem */
export function updateVexFormAct(s: GameState, c: HeroCast, dt: number) {
  switch (c.act) {
    case 'rift_execution': updateRiftExec(s, c); break;
    case 'abyssal_fang': case 'event_horizon': updateVAct(s, c, dt); break;
    default: break;
  }
}
export function vexFormMoveScale(c: HeroCast): number {
  switch (c.act) {
    case 'mirror_guard': return VEX1_Q.moveScale; case 'rift_execution': return 0; case 'oath_ruin': return VEX1_R.moveScale; case 'phantom_legion': return 0.8; case 'dim_severance': return c.t < VEX2_E.windup ? 0.35 : 0.6; case 'domain_exile': return VEX2_R.moveScale;
    case 'abyssal_fang': return c.released ? 0 : VEX1_V.moveCharge; case 'event_horizon': return c.released ? 0.3 : VEX2_V.moveCharge; default: return 1;
  }
}
export const isVexFormAct = (c: HeroCast | null) => !!c && ['mirror_guard', 'rift_execution', 'oath_ruin', 'abyssal_fang', 'phantom_legion', 'dim_severance', 'domain_exile', 'event_horizon'].includes(c.act);
/** Dash / reveal ends the act now: committed fields keep resolving by their own plan, an unreleased V charge is free. */
export function vexFormCancelAct(s: GameState, c: HeroCast) {
  if (isVAct(c)) { if (!c.released) cancelVexV(s); else { emit(s, 'vex_v_end', s.player.x, s.player.y, odBit(s)); s.hx.act = null; } return; }
  s.hx.act = null;
}

/* ------------------------------------------------------------------ Primal Overdrive (Abyssal Guardian) */
export const vexOdReady = (s: GameState) => { const p = s.player; return vexForm(s) && p.odT <= 0 && p.odMeter >= 100; };
export function startVexOverdrive(s: GameState): boolean {
  const p = s.player; if (!vexOdReady(s) || s.phase !== 'running' || s.cinema || p.hp <= 0) return false;
  p.odMeter = 0; p.odT = VEX_OD.duration; emit(s, 'vex_od_start', p.x, p.y, p.form); return true;
}
/** Per real hit / kill meter gain, rate limited; nothing fills it during Overdrive, and spectral copies never feed it (noOd). */
export function vexOdGain(s: GameState, kill = false) {
  const p = s.player; if (!vexForm(s) || p.odT > 0) return;
  const w = (s.hx.odWin ??= { t: -9, n: 0 }); if (s.time - w.t >= VEX_OD.window) { w.t = s.time; w.n = 0; }
  const cost = kill ? 2 : 1; if (w.n + cost > VEX_OD.windowHits) return; w.n += cost;
  p.odMeter = Math.min(100, p.odMeter + (kill ? VEX_OD.perKill : VEX_OD.perHit));
}

/* ------------------------------------------------------------------ Skybreaker */
function updateFlight(s: GameState, dt: number) {
  const p = s.player, held = s.flyHeld, f = (p.form === 2 ? 2 : 1) as 1 | 2, spec = VEX_FLY.form[f];
  p.flyCd = Math.max(0, p.flyCd - dt); p.flyHold = held ? p.flyHold + dt : 0;
  if (p.flyT === 0) p.air = Math.max(0, p.air - dt * 8);
  const busy = !!s.hx.act || !!s.cinema || p.hp <= 0 || p.form < 1 || !!s.b22.ult.act;
  if (p.flyT === 0) {
    if (!busy && held && p.flyHold >= VEX_FLY.holdToLift && p.flyCd <= 0 && p.drive >= VEX_FLY.minDrive && p.dashRemaining <= 0) { p.flyT = 0.001; emit(s, 'vex_fly_start', p.x, p.y, f | odBit(s)); }
    return;
  }
  p.flyT += dt; p.air += (1 - p.air) * Math.min(1, dt * VEX_FLY.rise); p.drive = Math.max(0, p.drive - spec.drain * dt);
  if (!held || p.flyT > VEX_FLY.maxT || p.drive < 8 || busy) {
    const dive = !busy && p.flyT >= VEX_FLY.slamMinT;   // one bounded impact at the real ground contact, only after an eligible flight
    p.flyT = 0; p.flyCd = VEX_FLY.cooldown; p.flyHold = 0;
    let n = 0; if (dive) { n = areaHit(s, p.x, p.y, spec.slamR, p.qDamage * fm(s) * spec.slamMul, spec.slamPush, 0.4, 14, 'none'); ringFx(s, 'ring', p.x, p.y, spec.slamR, 0.45); p.invulnerable = Math.max(p.invulnerable, 0.15); }
    emit(s, 'vex_fly_land', p.x, p.y, (dive ? 1 : 0) | (f << 1) | (Math.min(n, 63) << 8) | odBit(s));
  }
}

/* ------------------------------------------------------------------ Form Shift (Vex only: Riftbound <-> Voidheart Exile) */
/** Switch to the other UNLOCKED form. Costs Drive and starts the shared form cooldown. An unreleased V charge and any ordinary act end (Q / E / R cooldowns, V cooldown, flight cooldown and Overdrive are untouched; Overdrive keeps its remaining timer and only swaps style). A flight lands safely without a slam. Committed fields keep their own form attribution; copies and the domain end. */
export function vexShift(s: GameState, to: number): boolean {
  const p = s.player;
  if (s.hero !== 'vex' || p.form < 1 || (to !== 1 && to !== 2) || to === p.form || !s.b22.vex.forms[to - 1] || s.phase !== 'running' || s.cinema || s.selector.open || p.hp <= 0 || p.formCooldown > 0 || p.drive < VEX_SHIFT.minDrive) return false;
  const c = s.hx.act; if (c) { if (isVAct(c) && c.released) { /* a released V keeps its committed form */ } else if (isVAct(c)) cancelVexV(s); else s.hx.act = null; }
  p.form = to as 1 | 2; p.drive = Math.max(1, p.drive - VEX_SHIFT.cost); p.formCooldown = VEX_SHIFT.cooldown * s.mods.formCd; p.invulnerable = Math.max(p.invulnerable, 0.2); p.flyT = 0; p.air = 0; p.flyHold = 0;
  emit(s, 'vex_shift', p.x, p.y, to | odBit(s)); return true;
}
export function vexShiftInput(s: GameState, input: InputState, fDown: boolean, wasF: boolean) {
  const p = s.player; if (s.hero !== 'vex' || p.form < 1) return;
  if (input.selPick && input.selPick >= 1 && input.selPick <= 3) { vexShift(s, input.selPick); return; }
  if (fDown && !wasF && !s.selector.open) vexShift(s, p.form === 1 ? 2 : 1);
}

/* ------------------------------------------------------------------ per tick + input */
export function updateVexCombat(s: GameState, dt: number) {
  const p = s.player; if (s.hero !== 'vex') return;
  p.sigCd = Math.max(0, p.sigCd - dt);   // ticks in base and every form, never reset by form changes
  if (p.hp <= 0 || s.cinema) { s.hx.vf = []; if (p.odT > 0) { p.odT = 0; emit(s, 'vex_od_end', p.x, p.y, p.form); } if (p.flyT > 0) { p.flyT = 0; p.air = 0; } return; }
  if (p.odT > 0) { p.odT -= dt; if (p.odT <= 0 || p.form < 1) { p.odT = 0; emit(s, 'vex_od_end', p.x, p.y, p.form); } }
  const a = s.hx.vf; if (a?.length) {
    const keep: VexField[] = [];
    for (const f of a) {
      if ((f.k === 'clone' || f.k === 'domain') && p.form !== 2) { if (f.k === 'domain') emit(s, 'vex_r_end', f.x, f.y, 0); continue; }   // copies and the domain end cleanly with the form (or a shift out of it)
      const done = f.k === 'judg' ? updateJudg(s, f, dt) : f.k === 'echo' ? updateEcho(s, f, dt) : f.k === 'clone' ? updateClone(s, f, dt) : f.k === 'seal' ? updateSeal(s, f, dt) : f.k === 'sever' ? updateSever(s, f, dt) : f.k === 'domain' ? updateDomain(s, f, dt) : f.k === 'horizon' ? updateHorizon(s, f, dt) : true;
      if (!done) keep.push(f);
    }
    s.hx.vf = keep;
  }
  updateFlight(s, dt);
}
/** Per tick, per fighter, with their own raw input and the previous tick's held state. */
export function vexCombatInput(s: GameState, input: InputState, prev: { sig: boolean; od: boolean }): { sig: boolean; od: boolean } {
  const sigDown = !!(input.sig || input.sigHeld), odDown = !!input.od;
  s.sigHeld = !!input.sigHeld; s.flyHeld = !!input.flyHeld;
  if (input.sigAbort) cancelVexV(s); else if (sigDown && !prev.sig) startVexV(s);
  if (odDown && !prev.od) startVexOverdrive(s);
  return { sig: sigDown, od: odDown };
}
void VEX2_V;

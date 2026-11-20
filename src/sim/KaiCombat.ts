/** Kai combat identity (authoritative sim): form-specific automatic fighting styles, the charged signature technique of each transformation (hold, aim, release, lunge, contact, detonate) and Primal Overdrive. The renderer only reads the state and events produced here. */
import type { AbilityEventKind, Cast, Enemy, GameState, InputState } from './GameState';
import { AUTO, FLY, MELEE, OD, SHIFT, SIG, type Beat, type SigForm } from '../content/kaiCombat';
import { formChoices } from './FormSystem';
import { cancelCast } from './AbilitySystem';
import { isBoss } from '../content/enemies';
import { blocked, slideMove } from './CollisionSystem';
import { damageEnemy } from './CombatSystem';
import { normalize } from '../core/Math';
import { faceOf, fistWorld } from './AbilitySystem';
import { freeAim } from './ApexSystem';
import { handOffset, strikeHand } from './Strike';
import { surgeAutoMul } from './KaiKit';
import { novaCharge, renCombatInput, renOdGain } from './RenCombat';
import { astralCharge, soraCombatInput, soraOdGain } from './SoraCombat';
import { vexCharge, vexCombatInput, vexOdGain, vexShift, vexShiftInput } from './VexCombat';

const alive = (e: Enemy) => e.hp > 0;
function emit(s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number, tx?: number, ty?: number) {
  s.abilityEvents.push({ id: s.nextId++, kind, x, y, n, ...(tx !== undefined ? { tx, ty } : {}) });
  if (s.abilityEvents.length > 40) s.abilityEvents.splice(0, s.abilityEvents.length - 40);
}
const clearAt = (x: number, y: number) => !blocked(x, y, 0);

/* ------------------------------------------------------------------ automatic fighting styles */
/** One authoritative auto-attack: picks the beat of the current form's profile, resolves contact (melee) or a ranged strike per target, and emits ONE `kai_auto` event per target for the renderer. Encoding of `n`: beat index (bits 0-1), form (bits 2-3), ranged (16), finisher (32), hand right (64). */
export function kaiAuto(s: GameState, dt: number) {
  const p = s.player, form = p.form as 0 | 1 | 2 | 3, prof = AUTO[form];
  p.attackClock -= dt; if (p.attackClock > 0) return;
  p.attackClock += Math.max(0.16, p.attackPeriod * prof.period * (p.odT > 0 ? OD.periodMul : 1));
  const cands = s.enemies.filter(alive).map(e => ({ e, d: Math.hypot(e.x - p.x, e.y - p.y) })).filter(c => c.d <= p.attackRange).sort((a, b) => a.d - b.d);
  const amount = Math.min(cands.length, p.targets + (form ? 1 : 0)); if (amount === 0) return;
  const step = s.hx.autoStep++ % prof.beats.length, beat: Beat = prof.beats[step], fin = step === prof.beats.length - 1;
  const pd = normalize(cands[0].e.x - p.x, cands[0].e.y - p.y), hand = strikeHand(faceOf(pd.x, pd.y), pd.x, pd.y, step);
  s.hx.strike = { x: pd.x, y: pd.y, t: s.time, step, hand };
  const sf = faceOf(pd.x, pd.y), fa = fistWorld(s, form, sf), ho = handOffset(sf, hand), fist = { x: fa.x + ho.x, y: fa.y + ho.y };
  const base = p.attackDamage * surgeAutoMul(s) * (form ? 1.4 * s.mods.formPower : 1) * beat.mul, done = new Set<number>();
  for (let i = 0; i < amount; i++) {
    const { e, d } = cands[i], melee = d - e.radius <= MELEE, ranged = !melee;
    if (ranged || i === 0) s.impacts.push({ id: s.nextId++, kind: 'shot', x: fist.x, y: fist.y, targetX: e.x, targetY: e.y, ttl: 0.2, life: 0.2, skip: melee });   // drives the punch pose; only ranged shots draw a bolt
    damageEnemy(s, e, base); done.add(e.id);
    if (form === 0) p.drive = Math.min(100, p.drive + 1.7 * s.mods.driveGain);
    emit(s, 'kai_auto', fist.x, fist.y, step | (form << 2) | (ranged ? 16 : 0) | (fin ? 32 : 0) | (hand === 'right' ? 64 : 0), e.x, e.y);
  }
  if (beat.sweep) for (const e of s.enemies) { if (!alive(e) || done.has(e.id) || Math.hypot(e.x - p.x, e.y - p.y) > beat.sweep + e.radius) continue; done.add(e.id); damageEnemy(s, e, base * 0.6, { area: true }); }
  if (beat.chain) { const t0 = cands[0].e, f = s.enemies.filter(e => alive(e) && !done.has(e.id) && Math.hypot(e.x - t0.x, e.y - t0.y) <= 140).sort((a, b) => Math.hypot(a.x - t0.x, a.y - t0.y) - Math.hypot(b.x - t0.x, b.y - t0.y))[0]; if (f) { damageEnemy(s, f, base * beat.chain, { area: true }); emit(s, 'kai_auto', t0.x, t0.y, 3 | (form << 2) | 128, f.x, f.y); } }
}

/* ------------------------------------------------------------------ signature technique */
const tierOf = (charge: number) => SIG.stages.reduce((t, v, i) => (charge >= v ? i + 1 : t), 0);
export const sigReady = (s: GameState) => { const p = s.player; return p.form >= 1 && p.sigCd <= 0; };
export function sigCharge(s: GameState): { charge: number; tier: number } | null { if (s.hero === 'ren') return novaCharge(s); if (s.hero === 'sora') return astralCharge(s); if (s.hero === 'vex') return vexCharge(s); const c = s.cast; return c && c.kind === 'signature' && !c.released ? { charge: c.t, tier: tierOf(c.t) } : null; }
function aimDir(s: GameState) { const fa = freeAim(s); return fa ? { x: fa.x, y: fa.y } : normalize(s.player.aimX, s.player.aimY); }

export function startSignature(s: GameState): boolean {
  const p = s.player;
  if (s.hero !== 'kai' || !sigReady(s) || s.phase !== 'running' || s.cinema || s.cast || s.b22.ult.act || p.dashRemaining > 0 || p.hp <= 0) return false;
  const d = aimDir(s);
  s.cast = { id: s.nextId++, kind: 'signature', face: faceOf(d.x, d.y), t: 0, dirX: d.x, dirY: d.y, form: p.form, released: false, pulses: 0, len: 0, tx: p.x, ty: p.y, sx: p.x, sy: p.y, hits: [], dur: SIG.maxHold + 2, charge: 0, tier: 0, rt: 0 };
  emit(s, 'sig_charge', p.x, p.y, p.form); return true;
}
export function cancelSignature(s: GameState) { const c = s.cast; if (c && c.kind === 'signature' && !c.released) { s.cast = null; emit(s, 'sig_cancel', s.player.x, s.player.y); } }

function pickTarget(s: GameState, d: { x: number; y: number }): Enemy | null {
  const p = s.player; let best: Enemy | null = null, bd = Infinity;
  for (const e of s.enemies) {
    if (!alive(e)) continue; const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy); if (dist < 1 || dist > SIG.range + e.radius) continue;
    if ((dx * d.x + dy * d.y) / dist < SIG.aimCos) continue;
    if (dist < bd) { bd = dist; best = e; }
  }
  return best;
}
function nearestWithin(s: GameState, r: number): Enemy | null { const p = s.player; let best: Enemy | null = null, bd = r; for (const e of s.enemies) { if (!alive(e)) continue; const d = Math.hypot(e.x - p.x, e.y - p.y) - e.radius; if (d < bd) { bd = d; best = e; } } return best; }
function releaseSignature(s: GameState, c: Cast) {
  const p = s.player, f = c.form as SigForm, d = aimDir(s), tier = tierOf(c.t), tg = pickTarget(s, d) ?? nearestWithin(s, 170);
  const dir = tg ? normalize(tg.x - p.x, tg.y - p.y) : d;
  let reach = tg ? Math.max(0, Math.hypot(tg.x - p.x, tg.y - p.y) - tg.radius - p.radius - 8) : 120;
  while (reach > 0 && !clearAt(p.x + dir.x * reach, p.y + dir.y * reach)) reach -= 8;
  c.released = true; c.charge = c.t; c.tier = tier; c.rt = 0; c.dirX = dir.x; c.dirY = dir.y; c.face = faceOf(dir.x, dir.y);
  c.sx = p.x; c.sy = p.y; c.tx = p.x + dir.x * reach; c.ty = p.y + dir.y * reach; c.len = reach; c.hop = tg ? tg.id : -1; c.pulses = 0; c.hits = [];
  c.dur = c.t + SIG.lunge[f] + tailOf(f, tier) + SIG.recover;
  p.sigCd = SIG.cooldown; p.invulnerable = Math.max(p.invulnerable, SIG.lunge[f] + 0.08);
  emit(s, 'sig_release', p.x, p.y, tier | (f << 3), c.tx, c.ty);
}
const tailOf = (f: SigForm, tier: number) => (f === 1 ? (tier >= 3 ? SIG.flare.bigAt : 0.1) : f === 2 ? (tier >= 3 ? SIG.comet.clapAt : SIG.comet.pulseEvery * (1 + tier)) : SIG.still.releaseAt + 0.05);

/** Applies the contact. Returns true when it connected with something. */
function contact(s: GameState, c: Cast, f: SigForm): boolean {
  const p = s.player, tier = c.tier ?? 0, q = p.qDamage * s.mods.formPower * SIG.tierMul[tier], palm = { x: p.x + c.dirX * (p.radius + 14), y: p.y + c.dirY * (p.radius + 14) };
  const near = s.enemies.filter(e => alive(e) && Math.hypot(e.x - palm.x, e.y - palm.y) <= SIG.contactR + e.radius).sort((a, b) => Math.hypot(a.x - palm.x, a.y - palm.y) - Math.hypot(b.x - palm.x, b.y - palm.y));
  const prim = near.find(e => e.id === c.hop) ?? near[0];
  if (!prim) { emit(s, 'sig_miss', palm.x, palm.y, f); p.sigCd = Math.min(p.sigCd, 8); return false; }   // a miss only costs a short lockout, not the full cooldown
  const hit = (f === 1 ? SIG.flare.hit : f === 2 ? SIG.comet.hit : SIG.still.hit) * q, hp0 = prim.hp;
  damageEnemy(s, prim, hit, { slot: 'none' });
  c.tx = prim.x; c.ty = prim.y;   // the effects centre on what was actually struck
  if (prim.hp < hp0 || prim.hp <= 0) emit(s, 'sig_hit', prim.x, prim.y, tier | (f << 3));
  else emit(s, 'sig_block', prim.x, prim.y, f);
  return prim.hp < hp0 || prim.hp <= 0;
}
function area(s: GameState, x: number, y: number, r: number, dmg: number, push: number, skip?: number) {
  for (const e of s.enemies) {
    if (!alive(e) || e.id === skip) continue; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > r + e.radius) continue;
    const fall = 1 - 0.4 * Math.min(1, d / r), hp0 = e.hp;
    damageEnemy(s, e, dmg * fall, { area: true, slot: 'none' });
    if (e.hp > 0 && !isBoss(e.kind) && push > 0) for (let i = 0; i < 3; i++) slideMove(e, (dx / (d || 1)) * push * fall, (dy / (d || 1)) * push * fall, 0.12);
    void hp0;
  }
}
function pull(s: GameState, x: number, y: number, r: number, dt: number) {
  for (const e of s.enemies) {
    if (!alive(e) || isBoss(e.kind)) continue;   // bosses keep their displacement immunity
    const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy); if (d > r + e.radius || d < 14) continue;
    const sp = SIG.still.pullSpeed * dt; slideMove(e, (dx / d) * sp, (dy / d) * sp, 1);
  }
}

function updateSignatureCast(s: GameState, c: Cast, dt: number) {
  const p = s.player, f = c.form as SigForm;   // the technique keeps the form it was committed in, whatever the player becomes meanwhile
  if (p.hp <= 0 || s.cinema) { if (c.released) { emit(s, 'sig_end', p.x, p.y, f); s.cast = null; } else cancelSignature(s); return; }
  if (!c.released && (p.form < 1 || c.form !== p.form || s.b22.ult.act)) { cancelSignature(s); return; }
  c.t += dt;
  if (!c.released) {
    const d = aimDir(s); c.dirX = d.x; c.dirY = d.y; c.face = faceOf(d.x, d.y); c.charge = c.t;
    const tier = tierOf(c.t); if (tier > (c.tier ?? 0)) { c.tier = tier; emit(s, 'sig_tier', p.x, p.y, tier); }
    if (!s.sigHeld && c.t >= SIG.minHold && c.t < SIG.stages[0] && !(pickTarget(s, d) ?? nearestWithin(s, 170))) { cancelSignature(s); return; }   // a quick tap with nothing in reach is cancelled for free instead of burning the 45 s cooldown on a harmless miss
    if ((!s.sigHeld && c.t >= SIG.minHold) || c.t >= SIG.maxHold) releaseSignature(s, c);
    return;
  }
  const rt0 = c.rt ?? 0, rt = rt0 + dt; c.rt = rt; const L = SIG.lunge[f], tier = c.tier ?? 0;
  if (rt0 < L) {   // bounded, collision-safe approach: Kai travels exactly the pre-validated path
    const u = Math.min(1, rt / L), e = 1 - (1 - u) ** 3, tx = c.sx + (c.tx - c.sx) * e, ty = c.sy + (c.ty - c.sy) * e;
    if (dt > 0) slideMove(p, (tx - p.x) / dt, (ty - p.y) / dt, dt);
  }
  if (rt0 < L && rt >= L) { c.pulses = contact(s, c, f) ? 1 : -1; c.nextAt = rt; if (c.pulses === -1) c.dur = Math.min(c.dur, c.t + SIG.recover); }   // pulses: 1 = connected, -1 = missed
  if (c.pulses === 1) {
    const ti = rt - L, st = c.led ?? (c.led = {}), cx = c.tx, cy = c.ty;
    if (f === 1) {
      if (!st[0]) { st[0] = 1; area(s, cx, cy, SIG.flare.splashR + SIG.flare.splashGrow * tier, p.qDamage * s.mods.formPower * SIG.tierMul[tier] * SIG.flare.splash, SIG.flare.push); emit(s, 'sig_pulse', cx, cy, 0 | (f << 3) | (tier << 5)); }
      if (tier >= 3 && !st[1] && ti >= SIG.flare.bigAt) { st[1] = 1; area(s, cx, cy, SIG.flare.bigR, p.qDamage * s.mods.formPower * SIG.flare.big, SIG.flare.push * 1.3); emit(s, 'sig_pulse', cx, cy, 1 | (f << 3) | (tier << 5)); }
    } else if (f === 2) {
      const n = tier >= 3 ? 4 : 1 + tier;
      for (let k = 1; k <= n; k++) if (!st[k] && ti >= SIG.comet.pulseEvery * k) { st[k] = 1; area(s, cx, cy, SIG.comet.pulseR, p.qDamage * s.mods.formPower * SIG.comet.pulse, SIG.comet.push); emit(s, 'sig_pulse', cx, cy, 0 | (f << 3) | (tier << 5)); }
      if (tier >= 3 && !st[9] && ti >= SIG.comet.clapAt) { st[9] = 1; area(s, cx, cy, SIG.comet.clapR, p.qDamage * s.mods.formPower * SIG.comet.clap, SIG.comet.push * 1.4); emit(s, 'sig_pulse', cx, cy, 1 | (f << 3) | (tier << 5)); }
    } else {
      const R = SIG.still.pullR + SIG.still.pullGrow * tier;
      if (ti < SIG.still.releaseAt) pull(s, cx, cy, R, dt);
      else if (!st[0]) { st[0] = 1; area(s, cx, cy, SIG.still.releaseR + SIG.still.releaseGrow * tier, p.qDamage * s.mods.formPower * SIG.tierMul[tier] * SIG.still.release, SIG.still.push); emit(s, 'sig_pulse', cx, cy, 1 | (f << 3) | (tier << 5)); }
    }
  }
  if (c.t >= c.dur - 1e-9) { emit(s, 'sig_end', p.x, p.y, f); s.cast = null; }
}

/* ------------------------------------------------------------------ Primal Overdrive */
export const odReady = (s: GameState) => { const p = s.player; return s.hero === 'kai' && p.form >= 1 && p.odT <= 0 && p.odMeter >= 100; };
export function startOverdrive(s: GameState): boolean {
  const p = s.player; if (!odReady(s) || s.phase !== 'running' || s.cinema || p.hp <= 0) return false;
  p.odMeter = 0; p.odT = OD.duration; emit(s, 'od_start', p.x, p.y, p.form); return true;
}
/** Per-hit meter gain, called from damageEnemy for a transformed Kai that is not already in Overdrive. */
export function odGain(s: GameState, kill = false) { const p = s.player; if (s.hero === 'ren') { renOdGain(s, kill); return; } if (s.hero === 'sora') { soraOdGain(s, kill); return; } if (s.hero === 'vex') { vexOdGain(s, kill); return; } if (s.hero === 'kai' && p.form >= 1 && p.odT <= 0) p.odMeter = Math.min(100, p.odMeter + (kill ? OD.perKill : OD.perHit)); }

/* ------------------------------------------------------------------ per-tick + input */
export function updateKaiCombat(s: GameState, dt: number) {
  const p = s.player; if (s.hero !== 'kai') return;
  p.sigCd = Math.max(0, p.sigCd - dt);   // ticks in live sim time, in every form
  if (p.odT > 0) { p.odT -= dt; if (p.odT <= 0 || p.form < 1) { p.odT = 0; emit(s, 'od_end', p.x, p.y, p.form); } }
  const c = s.cast; if (c && c.kind === 'signature') updateSignatureCast(s, c, dt);
  updateFlight(s, dt);
}

/* ------------------------------------------------------------------ Skybreaker flight */
function updateFlight(s: GameState, dt: number) {
  const p = s.player, f = p.form as 1 | 2 | 3, held = s.flyHeld;
  p.flyCd = Math.max(0, p.flyCd - dt); p.flyHold = held ? p.flyHold + dt : 0;
  if (p.flyT === 0) { p.air = Math.max(0, p.air - dt * 8); }
  const busy = !!s.cast || !!s.cinema || p.hp <= 0 || p.form < 1 || !!s.b22.ult.act;
  if (p.flyT === 0) {
    if (!busy && held && p.flyHold >= FLY.holdToLift && p.flyCd <= 0 && p.drive >= FLY.minDrive && p.dashRemaining <= 0) { p.flyT = 0.001; emit(s, 'fly_start', p.x, p.y, f); }
    return;
  }
  const spec = FLY.form[f] ?? FLY.form[1];
  p.flyT += dt; p.air += (1 - p.air) * Math.min(1, dt * spec.rise); p.drive = Math.max(0, p.drive - spec.drain * dt);
  if (!held || p.flyT > FLY.maxT || p.drive < 8 || busy) {
    const dive = !busy && p.flyT >= FLY.slamMinT;
    p.flyT = 0; p.flyCd = FLY.cooldown; p.flyHold = 0;
    if (dive) { area(s, p.x, p.y, FLY.slam.r, p.qDamage * s.mods.formPower * FLY.slam.dmg, FLY.slam.push); p.invulnerable = Math.max(p.invulnerable, 0.15); }
    emit(s, 'fly_land', p.x, p.y, (dive ? 1 : 0) | (f << 1));
  }
}

/* ------------------------------------------------------------------ Form Shift */
/** Switch to another unlocked transformation instantly. Costs Drive and starts the shared form cooldown, so it cannot be spammed; an unreleased charge is cancelled, a flight ends. */
export function formShift(s: GameState, to: 1 | 2 | 3): boolean {
  const p = s.player;
  if (s.hero === 'vex') return vexShift(s, to);   // B28: Riftbound <-> Voidheart Exile
  if (s.hero !== 'kai' || p.form < 1 || to === p.form || s.phase !== 'running' || s.cinema || p.hp <= 0 || p.formCooldown > 0 || p.drive < SHIFT.minDrive) return false;
  if (to === 2 && !s.cometUnlocked) return false;
  if (to === 3 && !s.apexUnlocked) return false;
  if (s.cast && !(s.cast.kind === 'signature' && s.cast.released)) { if (s.cast.kind === 'signature') cancelSignature(s); else cancelCast(s); }
  p.form = to; p.drive = Math.max(1, p.drive - SHIFT.cost); p.formCooldown = SHIFT.cooldown * s.mods.formCd; p.invulnerable = Math.max(p.invulnerable, 0.3); p.flyT = 0; p.air = 0;
  emit(s, 'form_shift', p.x, p.y, to); return true;
}
export function formShiftInput(s: GameState, input: InputState, fDown: boolean, wasF: boolean) {
  const p = s.player; if (s.hero === 'vex') { vexShiftInput(s, input, fDown, wasF); return; }
  if (s.hero !== 'kai' || p.form < 1) return;
  if (input.selPick && input.selPick >= 1 && input.selPick <= 3) { formShift(s, input.selPick as 1 | 2 | 3); return; }
  if (fDown && !wasF && formChoices(s).length === 0 && !s.selector.open) { for (let k = 1; k <= 2; k++) { const to = (((p.form - 1 + k) % 3) + 1) as 1 | 2 | 3; if (formShift(s, to)) return; } }
}
/** Called once per tick per fighter with their raw input and the previous tick's held state; returns the new held flags. */
export function kaiCombatInput(s: GameState, input: InputState, prev: { sig: boolean; od: boolean }): { sig: boolean; od: boolean } {
  if (s.hero === 'vex') return vexCombatInput(s, input, prev);   // B28: Vex's V / G / flight live in VexCombat
  if (s.hero === 'sora') return soraCombatInput(s, input, prev);   // B27: Sora's V / G / flight live in SoraCombat
  if (s.hero === 'ren') return renCombatInput(s, input, prev);   // B26: Ren's V / G / flight live in RenCombat
  const sigDown = !!(input.sig || input.sigHeld), odDown = !!input.od;
  s.sigHeld = !!input.sigHeld; s.flyHeld = !!input.flyHeld;
  if (input.sigAbort) cancelSignature(s);
  else if (sigDown && !prev.sig) startSignature(s);
  if (odDown && !prev.od) startOverdrive(s);
  return { sig: sigDown, od: odDown };
}

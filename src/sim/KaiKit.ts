/** B22 Kai kit: four distinct Qs (Surge Step, Scatter Burst, Meteor Drive, Silver Echo) and Flarebound's Rising Flare / Sunfall Crucible. Everything is authoritative sim state on `hx.kk` (so co-op slot swaps carry it); the renderer only reads it. */
import type { AbilityEventKind, Cast, Enemy, Face, GameState } from './GameState';
import { CRUCIBLE, ECHO, METEOR, RISE, SCATTER, SURGE } from '../content/kaiKit';
import { isBoss } from '../content/enemies';
import { blocked, slideMove } from './CollisionSystem';
import { damageEnemy } from './CombatSystem';
import { normalize } from '../core/Math';
import { faceOf, punchOrigin } from './AbilitySystem';
import { freeAim } from './ApexSystem';

export interface KShot { id: number; x: number; y: number; vx: number; vy: number; ttl: number; dmg: number; hand: 0 | 1; ang: number }
export interface Clone { id: number; x: number; y: number; hp: number; maxHp: number; life: number; maxLife: number; atk: number; dmg: number; face: Face; moving: boolean; hitCd: Record<number, number>; flash: number; swing: number; radius: number }
export interface Pillar { id: number; x: number; y: number; at: number; fired: boolean; r: number; dmg: number }
export interface Crucible { id: number; x: number; y: number; t: number; life: number; r: number; pulse: number; pulses: number; dmg: number; finalDmg: number; finalR: number; done: boolean }
export interface KaiKit { surge: number; surgeForm: number; fired: number; shots: KShot[]; clone: Clone | null; pillars: Pillar[]; riseHits: Record<number, number>; riseDir: { x: number; y: number; ox: number; oy: number; t: number } | null; crucible: Crucible | null; meteorBeat: number }
export const newKit = (): KaiKit => ({ surge: 0, surgeForm: 0, fired: 0, shots: [], clone: null, pillars: [], riseHits: {}, riseDir: null, crucible: null, meteorBeat: 0 });
export const kitOf = (s: GameState): KaiKit => (s.hx.kk ??= newKit());
const alive = (e: Enemy) => e.hp > 0;
const emit = (s: GameState, kind: AbilityEventKind, x: number, y: number, n?: number) => { s.abilityEvents.push({ id: s.nextId++, kind, x, y, n }); if (s.abilityEvents.length > 40) s.abilityEvents.splice(0, s.abilityEvents.length - 40); };
const clearLine = (x0: number, y0: number, x1: number, y1: number) => { const d = Math.hypot(x1 - x0, y1 - y0); for (let t = 12; t < d; t += 12) if (blocked(x0 + (x1 - x0) * t / d, y0 + (y1 - y0) * t / d, 0)) return false; return true; };

/** Buff multipliers computed from timed state (never written into the base stats). */
export const surgeActive = (s: GameState) => { const k = s.hx?.kk; return !!k && k.surge > 0 && s.player.form === 0; };
export const surgeSpeedMul = (s: GameState) => (surgeActive(s) ? SURGE.speedMul : 1);
export const surgeAutoMul = (s: GameState) => (surgeActive(s) ? SURGE.autoMul : 1);

function aimOrNearest(s: GameState, range: number): { x: number; y: number } {
  const p = s.player, fa = freeAim(s); if (fa) return { x: fa.x, y: fa.y };
  let best: Enemy | null = null, bd = Infinity; for (const e of s.enemies) { if (!alive(e)) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < range && d < bd) { bd = d; best = e; } }
  return best ? normalize(best.x - p.x, best.y - p.y) : normalize(p.aimX, p.aimY);
}
function startCast(s: GameState, kind: Cast['kind'], dir: { x: number; y: number }, dur: number, extra: Partial<Cast> = {}): Cast {
  const p = s.player; const face = faceOf(dir.x, dir.y);
  const c: Cast = { id: s.nextId++, kind, face, t: 0, dirX: dir.x, dirY: dir.y, form: p.form, released: false, pulses: 0, len: 0, tx: p.x, ty: p.y, sx: p.x, sy: p.y, hits: [], dur, ...extra };
  s.cast = c; return c;
}
export const isKitKind = (k: Cast['kind']) => k === 'scatter' || k === 'meteor' || k === 'flare' || k === 'crucible';
export function kaiCastReady(s: GameState): boolean { const p = s.player; return s.phase === 'running' && !s.cinema && !s.cast && p.dashRemaining <= 0 && p.hp > 0; }

/* ------------------------------------------------------------------ Q (form-keyed) */
export function kaiQ(s: GameState): boolean {
  const p = s.player; if (p.qCooldown > 0 || !kaiCastReady(s)) return false;
  const k = kitOf(s);
  if (p.form === 0) { p.qCooldown = SURGE.cooldown; k.surge = SURGE.duration; k.surgeForm = 0; emit(s, 'surge_start', p.x, p.y); return true; }
  if (p.form === 1) {
    const dir = aimOrNearest(s, SCATTER.range), dur = SCATTER.wind + SCATTER.shots * SCATTER.every + SCATTER.recover;
    p.qCooldown = SCATTER.cooldown; startCast(s, 'scatter', dir, dur); k.fired = 0; emit(s, 'hero_q', p.x, p.y); return true;
  }
  if (p.form === 2) {
    const dir = aimOrNearest(s, 300), dur = METEOR.windup + METEOR.beats * METEOR.beatEvery + METEOR.recover;
    p.qCooldown = METEOR.cooldown; k.meteorBeat = 0; startCast(s, 'meteor', dir, dur); emit(s, 'meteor_start', p.x, p.y); return true;
  }
  if (k.clone) return false;   // one echo per Kai; never stacked, never cloned
  const spot = echoSpot(s); if (!spot) return false;
  p.qCooldown = ECHO.cooldown;
  const maxHp = Math.max(8, p.maxHp * ECHO.hpFrac), life = Math.min(ECHO.maxLife, ECHO.life * (1 + (s.mods.formPower - 1) * 0));
  k.clone = { id: s.nextId++, x: spot.x, y: spot.y, hp: maxHp, maxHp, life, maxLife: life, atk: 0.25, dmg: p.attackDamage * 1.4 * s.mods.formPower * ECHO.dmgFrac * (p.qDamage / 34) ** 0.5, face: faceOf(p.aimX, p.aimY), moving: false, hitCd: {}, flash: 0.4, swing: 0, radius: 15 };
  emit(s, 'clone_spawn', spot.x, spot.y); return true;
}
function echoSpot(s: GameState): { x: number; y: number } | null {
  const p = s.player;
  for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI, 0, 2.4, -2.4, 0.8, -0.8]) {
    const x = p.x + Math.cos(a) * ECHO.spawnDist, y = p.y + Math.sin(a) * ECHO.spawnDist;
    if (!blocked(x, y, 16) && !s.enemies.some(e => alive(e) && Math.hypot(e.x - x, e.y - y) < e.radius + 14)) return { x, y };
  }
  return null;
}

/* ------------------------------------------------------------------ Flarebound E / R */
export function flareE(s: GameState): boolean {
  const p = s.player; if (p.beamCooldown > 0 || !kaiCastReady(s)) return false;
  const dir = aimOrNearest(s, 420), k = kitOf(s), dur = RISE.windup + RISE.pillars * RISE.gap + RISE.recover;
  p.beamCooldown = RISE.cooldown * s.mods.beamCd; k.riseHits = {}; k.pillars = [];
  const r = RISE.radius * s.mods.beamWidth, dmg = RISE.damage * s.mods.beamDamage * s.mods.formPower, n = RISE.pillars + Math.round(s.mods.beamLinger > 0 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const d = RISE.first + i * RISE.step, x = p.x + dir.x * d, y = p.y + dir.y * d;
    if (blocked(x, y, 8) || !clearLine(p.x, p.y, x, y)) break;
    k.pillars.push({ id: s.nextId++, x, y, at: s.time + RISE.windup + i * RISE.gap, fired: false, r, dmg });
  }
  k.riseDir = { x: dir.x, y: dir.y, ox: p.x, oy: p.y, t: s.time };
  startCast(s, 'flare', dir, dur + Math.max(0, n - RISE.pillars) * RISE.gap); emit(s, 'flare_start', p.x, p.y, k.pillars.length); return true;
}
function crucibleTarget(s: GameState, dir: { x: number; y: number }, dist?: number): { x: number; y: number } {
  const p = s.player; let r = Math.max(100, Math.min(CRUCIBLE.range, dist ?? 260)); while (r > 40 && (blocked(p.x + dir.x * r, p.y + dir.y * r, 12) || !clearLine(p.x, p.y, p.x + dir.x * r, p.y + dir.y * r))) r -= 12;
  const pt = { x: p.x + dir.x * r, y: p.y + dir.y * r }; let best: { x: number; y: number } | null = null, bs = -1;
  for (const e of s.enemies) { if (!alive(e)) continue; const dp = Math.hypot(e.x - pt.x, e.y - pt.y); if (dp > 150 || Math.hypot(e.x - p.x, e.y - p.y) > CRUCIBLE.range + 40) continue; let n = 0; for (const o of s.enemies) if (alive(o) && Math.hypot(o.x - e.x, o.y - e.y) <= CRUCIBLE.radius) n++; const sc = n * 1000 - dp; if (sc > bs) { bs = sc; best = { x: e.x, y: e.y }; } }
  const t = best ?? pt; return blocked(t.x, t.y, 10) ? { x: p.x + dir.x * 40, y: p.y + dir.y * 40 } : t;
}
export function crucibleR(s: GameState): boolean {
  const p = s.player, k = kitOf(s); if (p.sphereCooldown > 0 || k.crucible || !kaiCastReady(s)) return false;
  const fa = freeAim(s), dir = fa ? { x: fa.x, y: fa.y } : aimOrNearest(s, CRUCIBLE.range), tg = crucibleTarget(s, dir, fa?.d);
  p.sphereCooldown = CRUCIBLE.cooldown * s.mods.sphereCd; startCast(s, 'crucible', normalize(tg.x - p.x, tg.y - p.y), CRUCIBLE.windup + CRUCIBLE.recover, { tx: tg.x, ty: tg.y });
  emit(s, 'crucible_cast', tg.x, tg.y); return true;
}

export function kaiMoveScale(c: Cast): number {
  if (c.kind === 'scatter') return SCATTER.moveScale; if (c.kind === 'meteor') return 0; if (c.kind === 'flare') return RISE.moveScale; return CRUCIBLE.moveScale;
}
export const kaiReleaseTime = (kind: Cast['kind']) => (kind === 'scatter' ? SCATTER.wind : kind === 'meteor' ? METEOR.windup : kind === 'flare' ? RISE.windup : CRUCIBLE.windup);

/* ------------------------------------------------------------------ per tick */
export function updateKaiKit(s: GameState, dt: number) {
  const k = s.hx.kk; const p = s.player;
  if (k) {
    if (k.surge > 0) { if (p.form !== k.surgeForm) { k.surge = 0; emit(s, 'surge_end', p.x, p.y); } else { k.surge -= dt; if (k.surge <= 0) { k.surge = 0; emit(s, 'surge_end', p.x, p.y); } } }
    updateShots(s, k, dt); updatePillars(s, k); updateCrucible(s, k, dt); updateClone(s, k, dt);
    if (p.form !== 3 && k.clone) { emit(s, 'clone_end', k.clone.x, k.clone.y); k.clone = null; }
  }
  const c = s.cast; if (!c || !isKitKind(c.kind)) return; c.t += dt;
  if (c.kind === 'scatter') castScatter(s, c); else if (c.kind === 'meteor') castMeteor(s, c); else if (c.kind === 'flare') { if (c.released === false && c.t >= RISE.windup) c.released = true; if (c.t >= c.dur - 1e-9) { emit(s, 'flare_end', p.x, p.y); s.cast = null; } } else if (c.kind === 'crucible') castCrucible(s, c);
}

/** Scatter Burst: exactly SCATTER.shots real projectiles, alternating hands, spread across the nearby enemies. */
function castScatter(s: GameState, c: Cast) {
  const k = kitOf(s), p = s.player;
  while (k.fired < SCATTER.shots && c.t >= SCATTER.wind + k.fired * SCATTER.every - 1e-9) {
    c.released = true; const i = k.fired++, hand = (i % 2) as 0 | 1, o = punchOrigin(s, c);
    const tg = s.enemies.filter(e => alive(e) && Math.hypot(e.x - p.x, e.y - p.y) <= SCATTER.range && clearLine(o.x, o.y, e.x, e.y)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y) || a.id - b.id);
    let dir: { x: number; y: number };
    if (tg.length) { const e = tg[i % tg.length]; dir = normalize(e.x - o.x, e.y - o.y); } else { const base = Math.atan2(c.dirY, c.dirX), off = ((i / (SCATTER.shots - 1)) - 0.5) * 2 * (SCATTER.spreadDeg * Math.PI / 180); dir = { x: Math.cos(base + off), y: Math.sin(base + off) }; }
    const side = (hand ? 1 : -1) * 7, ox = o.x - dir.y * side, oy = o.y + dir.x * side;
    c.dirX = dir.x; c.dirY = dir.y; c.face = faceOf(dir.x, dir.y);
    k.shots.push({ id: s.nextId++, x: ox, y: oy, vx: dir.x * SCATTER.speed, vy: dir.y * SCATTER.speed, ttl: SCATTER.range / SCATTER.speed, dmg: p.qDamage * SCATTER.damageMul * s.mods.formPower, hand, ang: Math.atan2(dir.y, dir.x) });
    emit(s, 'scatter_fire', ox, oy, i);
  }
  if (c.t >= c.dur - 1e-9) { emit(s, 'hero_q_end', p.x, p.y); s.cast = null; }
}
function blast(s: GameState, x: number, y: number, dmg: number) {
  const r = SCATTER.blast * (s.player.qRadius / 132); let n = 0;
  for (const e of s.enemies) { if (!alive(e)) continue; if (Math.hypot(e.x - x, e.y - y) <= r + e.radius) { damageEnemy(s, e, dmg, { area: true }); n++; } }
  emit(s, 'scatter_blast', x, y, n);
}
function updateShots(s: GameState, k: KaiKit, dt: number) {
  if (!k.shots.length) return;
  const keep: KShot[] = [];
  for (const sh of k.shots) {
    const steps = Math.max(1, Math.ceil(Math.hypot(sh.vx, sh.vy) * dt / 10)); let done = false;
    for (let i = 0; i < steps && !done; i++) {
      sh.x += sh.vx * dt / steps; sh.y += sh.vy * dt / steps;
      if (blocked(sh.x, sh.y, 2)) { sh.x -= sh.vx * dt / steps; sh.y -= sh.vy * dt / steps; blast(s, sh.x, sh.y, sh.dmg); done = true; break; }
      for (const e of s.enemies) if (alive(e) && Math.hypot(e.x - sh.x, e.y - sh.y) <= e.radius + SCATTER.radius) { blast(s, sh.x, sh.y, sh.dmg); done = true; break; }
    }
    if (done) continue;
    sh.ttl -= dt; if (sh.ttl <= 0) { blast(s, sh.x, sh.y, sh.dmg); continue; }
    keep.push(sh);
  }
  k.shots = keep;
}

/** Meteor Drive: windup, then three body-driven advancing strike beats along the locked lane; each beat hits an enemy at most once. */
function castMeteor(s: GameState, c: Cast) {
  const k = kitOf(s), p = s.player;
  while (k.meteorBeat < METEOR.beats && c.t >= METEOR.windup + k.meteorBeat * METEOR.beatEvery - 1e-9) {
    const b = k.meteorBeat++, last = b === METEOR.beats - 1;
    for (let sub = 0; sub < 4; sub++) { const nx = p.x + c.dirX * METEOR.step / 4, ny = p.y + c.dirY * METEOR.step / 4; if (blocked(nx, ny, p.radius)) break; p.x = nx; p.y = ny; }
    p.invulnerable = Math.max(p.invulnerable, METEOR.iframes); c.released = true;
    const fx = p.x + c.dirX * 30, fy = p.y + c.dirY * 30, dmg = p.qDamage * METEOR.damageMul * (last ? METEOR.finalMul : 1) * s.mods.formPower; let n = 0;
    for (const e of s.enemies) {
      if (!alive(e) || Math.hypot(e.x - fx, e.y - fy) > METEOR.reach + e.radius) continue;
      damageEnemy(s, e, dmg, { area: true }); n++;
      if (e.hp > 0 && !isBoss(e.kind)) for (let i = 0; i < 3; i++) slideMove(e, c.dirX * (last ? METEOR.finalKnock : METEOR.knock) / 0.45, c.dirY * (last ? METEOR.finalKnock : METEOR.knock) / 0.45, 0.15);
    }
    emit(s, 'meteor_beat', fx, fy, last ? 100 + n : n);
  }
  if (c.t >= c.dur - 1e-9) { emit(s, 'meteor_end', p.x, p.y); s.cast = null; }
}

/** Rising Flare: the telegraphed pillars erupt in order; an enemy can be caught by at most RISE.maxHitsPerEnemy of them. */
function updatePillars(s: GameState, k: KaiKit) {
  if (!k.pillars.length) return;
  for (const pl of k.pillars) {
    if (pl.fired || s.time < pl.at) continue; pl.fired = true; let n = 0;
    for (const e of s.enemies) {
      if (!alive(e) || Math.hypot(e.x - pl.x, e.y - pl.y) > pl.r + e.radius || (k.riseHits[e.id] ?? 0) >= RISE.maxHitsPerEnemy) continue;
      k.riseHits[e.id] = (k.riseHits[e.id] ?? 0) + 1; damageEnemy(s, e, pl.dmg, { area: true }); n++;
      if (e.hp > 0 && !isBoss(e.kind)) { const d = normalize(e.x - pl.x, e.y - pl.y); for (let i = 0; i < 3; i++) slideMove(e, d.x * RISE.push / 0.45, d.y * RISE.push / 0.45, 0.15); e.stagger = Math.max(e.stagger, 0.3); }
    }
    emit(s, 'flare_pillar', pl.x, pl.y, n);
  }
  if (k.pillars.every(x => x.fired) && s.time > k.pillars[k.pillars.length - 1].at + 0.5) k.pillars = [];
}

/** Sunfall Crucible: a committed zone that outlives the cast, drawing non-bosses gently inward, pulsing, then erupting once. */
function castCrucible(s: GameState, c: Cast) {
  const k = kitOf(s), p = s.player;
  if (!c.released && c.t >= CRUCIBLE.windup - 1e-9) {
    c.released = true; const echo = Math.min(2, s.mods.sphereEcho), r = CRUCIBLE.radius * s.mods.sphereRadius;
    k.crucible = { id: s.nextId++, x: c.tx, y: c.ty, t: 0, life: CRUCIBLE.life, r, pulse: 0, pulses: CRUCIBLE.pulses + echo, dmg: CRUCIBLE.pulseDamage * s.mods.sphereDamage * s.mods.formPower, finalDmg: CRUCIBLE.finalDamage * s.mods.sphereDamage * s.mods.formPower * (1 + 0.15 * echo), finalR: r * CRUCIBLE.finalRadiusMul, done: false };
  }
  if (c.t >= c.dur - 1e-9) { void p; s.cast = null; }
}
function updateCrucible(s: GameState, k: KaiKit, dt: number) {
  const z = k.crucible; if (!z) return; z.t += dt;
  for (const e of s.enemies) { if (!alive(e) || isBoss(e.kind) || e.hp <= 0) continue; const d = Math.hypot(e.x - z.x, e.y - z.y); if (d < z.r + e.radius && d > 14) slideMove(e, (z.x - e.x) / d * CRUCIBLE.pull, (z.y - e.y) / d * CRUCIBLE.pull, dt); }
  const gap = (z.life - 0.35) / z.pulses;
  while (z.pulse < z.pulses && z.t >= (z.pulse + 1) * gap - 1e-9) {
    z.pulse++; let n = 0; for (const e of s.enemies) if (alive(e) && Math.hypot(e.x - z.x, e.y - z.y) <= z.r + e.radius) { damageEnemy(s, e, z.dmg, { area: true }); n++; }
    emit(s, 'crucible_pulse', z.x, z.y, n);
  }
  if (!z.done && z.t >= z.life - 1e-9) {
    z.done = true; let n = 0;
    for (const e of s.enemies) if (alive(e) && Math.hypot(e.x - z.x, e.y - z.y) <= z.finalR + e.radius) { damageEnemy(s, e, z.finalDmg, { area: true }); n++; if (e.hp > 0 && !isBoss(e.kind)) { e.stagger = Math.max(e.stagger, CRUCIBLE.stagger); const d = normalize(e.x - z.x, e.y - z.y); for (let i = 0; i < 3; i++) slideMove(e, d.x * 150 / 0.45, d.y * 150 / 0.45, 0.15); } }
    emit(s, 'crucible_final', z.x, z.y, n); k.crucible = null;
  }
}

/** Silver Echo: an owned summon (not a second player). Seeks a target, keeps its distance, takes real contact damage from enemies and dies or dissolves on schedule. */
function updateClone(s: GameState, k: KaiKit, dt: number) {
  const c = k.clone; if (!c) return;
  c.life -= dt; c.flash = Math.max(0, c.flash - dt); c.swing = Math.max(0, c.swing - dt); c.atk -= dt;
  for (const id of Object.keys(c.hitCd)) { c.hitCd[+id] -= dt; if (c.hitCd[+id] <= 0) delete c.hitCd[+id]; }
  const p = s.player; let tgt: Enemy | null = null, bd = Infinity;
  for (const e of s.enemies) { if (!alive(e)) continue; const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < ECHO.seek && d < bd) { bd = d; tgt = e; } }
  let mx = 0, my = 0;
  if (tgt) { const d = bd, v = normalize(tgt.x - c.x, tgt.y - c.y); c.face = faceOf(v.x, v.y); if (d > ECHO.keep + 30) { mx = v.x; my = v.y; } else if (d < ECHO.keep - 40) { mx = -v.x; my = -v.y; }
    if (d <= p.attackRange && c.atk <= 0) { c.atk = ECHO.atkEvery; c.swing = 0.2; s.impacts.push({ id: s.nextId++, kind: 'shot', x: c.x, y: c.y - 15, targetX: tgt.x, targetY: tgt.y, ttl: 0.2, life: 0.2 }); damageEnemy(s, tgt, c.dmg); } }
  else { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d > 120) { const v = normalize(p.x - c.x, p.y - c.y); mx = v.x; my = v.y; } }
  c.moving = mx !== 0 || my !== 0; if (c.moving) slideMove(c, mx * ECHO.speed, my * ECHO.speed, dt);
  for (const e of s.enemies) {
    if (!alive(e) || isBoss(e.kind) && e.mode !== 'strike' && Math.hypot(e.x - c.x, e.y - c.y) > e.radius + c.radius) continue;
    if (Math.hypot(e.x - c.x, e.y - c.y) > e.radius + c.radius + 2 || c.hitCd[e.id]) continue;
    c.hitCd[e.id] = ECHO.contactCd; c.hp -= Math.max(1, e.damage * 0.6); c.flash = 0.15; emit(s, 'clone_hit', c.x, c.y);
  }
  if (c.hp <= 0 || c.life <= 0) { emit(s, 'clone_end', c.x, c.y, c.hp <= 0 ? 1 : 0); k.clone = null; }
}
/** Enemies treat a nearby echo as a decoy when it is closer than Kai (bounded range). */
export function decoyFor(s: GameState, e: { x: number; y: number }): { x: number; y: number } | null {
  const c = s.hx.kk?.clone; if (!c) return null; const p = s.player, dc = Math.hypot(c.x - e.x, c.y - e.y);
  return dc <= ECHO.decoyRange && dc < Math.hypot(p.x - e.x, p.y - e.y) ? c : null;
}
export function endKaiKit(s: GameState) { const k = s.hx.kk; if (!k) return; k.shots = []; k.pillars = []; k.crucible = null; if (k.clone) { emit(s, 'clone_end', k.clone.x, k.clone.y); k.clone = null; } k.surge = 0; }

export function kitSnap(s: GameState): { surge: number; cloneHp: number; cloneLife: number; crucible: boolean; chain: 'none' | 'rift' | 'reversal' } {
  const k = s.hx?.kk, c = s.cast, ch = c?.kind === 'reversal' && !c.released && c.dur > 1e8 ? 'reversal' : c?.kind === 'rift' && c.chain && c.chain.state !== 'done' && c.chain.state !== 'main' ? 'rift' : 'none';
  return { surge: surgeActive(s) ? k!.surge : 0, cloneHp: k?.clone ? k.clone.hp / k.clone.maxHp : 0, cloneLife: k?.clone ? k.clone.life : 0, crucible: !!k?.crucible, chain: ch };
}

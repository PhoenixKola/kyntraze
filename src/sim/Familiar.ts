/** Celestial Familiars (sim): one companion per fighter, deterministic (no RNG, a pure function of the state), run once per standing fighter right after that fighter's own systems so co-op and online share one authority. It follows its hero, lends a bounded assist every few seconds, FUSES into the hero while Primal Overdrive is on (no battlefield entity, no attacks) and re-forms when it ends. Its hits are `fx` damage: they never feed the Overdrive meter, the Ultimate gauge, relic procs or mastery logs, so it adds value without becoming a second build. */
import type { Enemy, Familiar, GameState } from './GameState';
import { damageEnemy } from './CombatSystem';
import { emit, push } from './HeroSystem';
import { FAMILIARS, FAM_ASSIST_CD, FAM_ASSIST_GAP, FAM_MERGE, FAM_REFORM, FAM_SPAWN, type FamiliarDef } from '../content/familiars';

const HIT = { fx: true, noOd: true } as const;
const MAX_FX = 5, MAX_PEND = 6, TELEPORT = 640;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const alive = (e: Enemy) => e.hp > 0 && !e.part && !e.ai?.invuln && e.mode !== 'intro';
const baseDamage = (s: GameState) => s.player.attackDamage * (s.player.form ? 1.4 * s.mods.formPower : 1);

function born(s: GameState): Familiar {
  const p = s.player;
  return { x: p.x - 18, y: p.y - 6, face: 1, side: -1, lx: p.x, mode: 'reform', t: 0, k: 0, cd: 1.6, tid: 0, tx: p.x, ty: p.y, hop: 0, hp: p.hp, hurt: -9, act: 0, assist: -9, born: s.time, fx: [], pend: [] };
}
const addFx = (f: Familiar, T: number, x: number, y: number, k: number) => { f.fx.push({ x, y, at: T, k }); if (f.fx.length > MAX_FX) f.fx.shift(); };
function chase(f: Familiar, tx: number, ty: number, rate: number, max: number, dt: number) {
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy); if (d < 0.01) return;
  const step = Math.min(d * (1 - Math.exp(-rate * dt)), max * dt); f.x += (dx / d) * step; f.y += (dy / d) * step;
}
/** The foe this beast would like: dragon / phoenix the nearest, fox the most wounded, guardian the nearest within its short reach. */
function pick(s: GameState, def: FamiliarDef, from?: Enemy): Enemy | null {
  const p = s.player; let best: Enemy | null = null, bs = Infinity;
  for (const e of s.enemies) {
    if (!alive(e) || e === from) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d > def.range + e.radius) continue;
    const score = def.style === 'darts' ? e.hp / e.maxHp + d / 20000 : d; if (score < bs) { bs = score; best = e; }
  }
  return best;
}
const byId = (s: GameState, id: number) => { for (const e of s.enemies) if (e.id === id) return e; return null; };

function hit(s: GameState, f: Familiar, e: Enemy, dmg: number, k: number) {
  damageEnemy(s, e, dmg, HIT); addFx(f, s.time, e.x, e.y, k); emit(s, 'fam_hit', e.x, e.y, k);
}
/** Starts an assist if a foe is in reach; otherwise retry shortly. */
function begin(s: GameState, f: Familiar, def: FamiliarDef) {
  const t = pick(s, def); if (!t) { f.cd = 0.3; return; }
  f.mode = 'windup'; f.t = 0; f.tid = t.id; f.tx = t.x; f.ty = t.y; f.hop = 0; emit(s, 'fam_attack', f.x, f.y, 0);
}
function windup(s: GameState, f: Familiar, def: FamiliarDef, dt: number) {
  const p = s.player, e = byId(s, f.tid); if (e && alive(e)) { f.tx = e.x; f.ty = e.y; }
  const dx = f.tx - p.x, dy = f.ty - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  if (def.style === 'bite') chase(f, f.tx - ux * 34, f.ty - uy * 34, 11, 900, dt);
  else if (def.style === 'pulse') chase(f, p.x + ux * Math.min(d * 0.55, 120), p.y + uy * Math.min(d * 0.55, 120), 8, 700, dt);
  else if (def.style === 'flares') chase(f, p.x - ux * 22, p.y - uy * 22 - 10, 7, 500, dt);
  else chase(f, p.x + ux * 28, p.y + uy * 28, 12, 900, dt);
  f.face = f.tx >= f.x ? 1 : -1;
  if (f.t >= def.windup) { f.mode = 'strike'; f.t = 0; f.hop = 0; strike(s, f, def); }
}
const STRIKE_LEN = { bite: 0.2, darts: 0.46, flares: 0.22, pulse: 0.22 } as const;
/** One beat of the assist, called when the strike begins and (darts / flares) on later beats. */
function strike(s: GameState, f: Familiar, def: FamiliarDef) {
  const T = s.time, base = baseDamage(s) * def.mul; let e = byId(s, f.tid); if (e && !alive(e)) e = null;
  if (def.style === 'bite') {
    if (!e) e = pick(s, def); if (!e) return;
    hit(s, f, e, base, 1); f.x = e.x - Math.sign(e.x - s.player.x || 1) * (e.radius + 14); f.y = e.y;
    let n = 0; for (const o of s.enemies) { if (o === e || !alive(o) || n >= 5) continue; if (Math.hypot(o.x - e.x, o.y - e.y) <= 72 + o.radius) { damageEnemy(s, o, base * 0.42, HIT); n++; } }
    addFx(f, T, e.x, e.y, 3);
  } else if (def.style === 'darts') {
    if (!e) e = pick(s, def, undefined); if (!e) return; f.tid = e.id;
    const a = f.hop * 2.1 + (f.hop % 2 ? Math.PI : 0), r = e.radius + 22; f.x = e.x + Math.cos(a) * r; f.y = e.y + Math.sin(a) * r * 0.7; f.face = e.x >= f.x ? 1 : -1;
    hit(s, f, e, base * (e.hp < e.maxHp * 0.5 ? 1.35 : 1), f.hop === 2 ? 2 : 0);
  } else if (def.style === 'flares') {
    if (!e) e = pick(s, def); if (!e) return; f.tid = e.id; if (f.pend.length >= MAX_PEND) return;
    const d = Math.hypot(e.x - f.x, e.y - f.y); f.pend.push({ at: T + 0.1 + d / 900, t0: T, id: e.id, dmg: base, sx: f.x, sy: f.y - def.hover * 0.6, tx: e.x, ty: e.y });
  } else {
    let n = 0; for (const o of s.enemies) {
      if (!alive(o) || n >= 6) continue; if (Math.hypot(o.x - f.x, o.y - f.y) > 112 + o.radius) continue;
      damageEnemy(s, o, base, HIT); push(s, o, o.x - f.x, o.y - f.y, 34, 0.28); addFx(f, T, o.x, o.y, 0); n++;
    }
    addFx(f, T, f.x, f.y, 4);
  }
}
function flushPend(s: GameState, f: Familiar) {
  if (!f.pend.length) return; const T = s.time;
  for (let i = f.pend.length - 1; i >= 0; i--) {
    const q = f.pend[i]; if (T < q.at) continue; f.pend.splice(i, 1);
    const e = byId(s, q.id); if (e && alive(e)) { hit(s, f, e, q.dmg, 5); }
  }
}

export function updateFamiliar(s: GameState, dt: number) {
  const p = s.player;
  if (p.hp <= 0 || s.run.noFamiliar) { s.fam = undefined; return; }
  const def = FAMILIARS[s.hero], T = s.time; let f = s.fam;
  if (!f) { f = s.fam = born(s); emit(s, 'fam_spawn', f.x, f.y, 0); }
  const od = p.odT > 0;
  if (od && f.mode !== 'merge' && f.mode !== 'gone') { f.mode = 'merge'; f.t = 0; f.pend.length = 0; f.tid = 0; emit(s, 'fam_merge', f.x, f.y, 0); }
  else if (!od && (f.mode === 'merge' || f.mode === 'gone')) {
    if (f.mode === 'gone') { f.x = p.x + f.side * 14; f.y = p.y - 8; }
    f.mode = 'reform'; f.t = 0; f.k = 1; f.cd = Math.max(f.cd, 1.4); emit(s, 'fam_return', f.x, f.y, 0);
  }
  f.t += dt;
  if (p.hp < f.hp - 0.5) f.hurt = T; f.hp = p.hp;
  if (f.mode === 'merge') {
    chase(f, p.x, p.y - 22, 6 + 16 * clamp(f.t / FAM_MERGE, 0, 1), 1400, dt);
    if (f.t >= FAM_MERGE) { f.mode = 'gone'; f.t = 0; }
    return;
  }
  if (f.mode === 'gone') return;
  // which side of the hero it keeps: behind his travel, switched only on real movement
  const mx = p.x - f.lx; f.lx = p.x; if (Math.abs(mx) > 0.6) f.side = mx > 0 ? -1 : 1;
  const act = s.cast?.id ?? s.hx.act?.id ?? 0;
  if (act && act !== f.act && T - f.assist > FAM_ASSIST_GAP && f.mode === 'follow') { f.cd = Math.min(f.cd, FAM_ASSIST_CD); f.assist = T; }
  f.act = act;
  flushPend(s, f);
  const anchorX = p.x + f.side * def.dist, anchorY = p.y - 10 + (def.hover ? 0 : 8);
  if (Math.hypot(f.x - p.x, f.y - p.y) > TELEPORT) { f.x = anchorX; f.y = anchorY; f.mode = 'reform'; f.t = 0; f.k = 1; f.pend.length = 0; }
  if (f.mode === 'reform') {
    chase(f, anchorX, anchorY, def.follow, def.speed, dt); f.face = f.side === 1 ? -1 : 1;
    if (f.t >= (f.k ? FAM_REFORM : FAM_SPAWN)) { f.mode = 'follow'; f.t = 0; }
  } else if (f.mode === 'follow') {
    const tx = f.x; chase(f, anchorX, anchorY, def.follow, def.speed, dt); const vx = f.x - tx; if (Math.abs(vx) > 0.4) f.face = vx > 0 ? 1 : -1; else f.face = f.side === 1 ? -1 : 1;
    f.cd -= dt; if (f.cd <= 0) begin(s, f, def);
  } else if (f.mode === 'windup') windup(s, f, def, dt);
  else if (f.mode === 'strike') {
    const len = STRIKE_LEN[def.style];
    if (def.style === 'darts') { const beat = Math.floor(f.t / 0.14); if (beat > f.hop && beat <= 2) { f.hop = beat; strike(s, f, def); } }
    else if (def.style === 'flares' && f.hop === 0 && f.t >= 0.12) { f.hop = 1; strike(s, f, def); }
    if (f.t >= len) { f.mode = 'recover'; f.t = 0; f.cd = def.cd; }
  } else {
    chase(f, anchorX, anchorY, def.follow * 0.8, def.speed, dt);
    if (f.t >= def.recover) { f.mode = 'follow'; f.t = 0; }
  }
}

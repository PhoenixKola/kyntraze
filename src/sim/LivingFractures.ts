/** B31B Living Fractures: the deterministic event director and the six authoritative event state machines (Rift Portal, Corrupted Shrine, Fracture Cache, Roaming Elite, Containment, Celestial Echo). Pure sim: reads and writes GameState, uses simulation time only, draws every random number from its own stream (`streamSeed(seed, 'living-fractures')`) so combat and cosmetic RNG are never consumed, and with the rule off nothing here runs. Rewards, curses, participation and cleanup are all decided here; clients only ever receive the resulting state. */
import { SeededRng } from '../core/SeededRng';
import { RULES } from '../core/Rules';
import { ARENAS } from '../content/arenas';
import { ENEMIES, PLAYER_FOOT_DY, groundDy, type MobKind } from '../content/enemies';
import type { HeroId } from '../content/heroes';
import { streamSeed } from '../b22/plan';
import { ARENA_LF, BARGAINS, BLESSINGS, ELITE_COPY, ELITE_MODS, LF_COPY, LF_KINDS, LF_RULES as F, LF_TERMINAL, LF_VERSION, blankLfStats, type LfEvent, type LfFx, type LfKind, type LfState } from '../b31/fractures';
import type { Enemy, GameState, Hazard } from './GameState';
import { blocked, slideMove } from './CollisionSystem';
import { addEnemy, addPickup, pushEnemyEvent } from './EntityRegistry';
import { bossAlive } from './BossAiSystem';
import { b22Emit } from '../b22/state';
import { grantRelic, relicPool } from './B22Encounters';
import { inSlot, slotPlayer, standing } from './CoopSystem';
import { slotHero } from './CoopCombos';
import { xpTimeScale } from './CombatSystem';
import { lfCdr, lfMul, lfRegen } from './lfHooks';

const TAU = Math.PI * 2, OWNER = (ev: LfEvent) => -(1000 + ev.id);
const COOLDOWNS = ['qCooldown', 'beamCooldown', 'sphereCooldown', 'sigCd', 'dragonCooldown', 'cometCooldown', 'riftCooldown', 'reversalCooldown'] as const;
const pl = (s: GameState, i: number) => (s.party ? slotPlayer(s, i) : s.player);
const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;

/* ------------------------------------------------------------------ setup */
export const modeKey = (s: GameState): 'classic' | 'expedition' | 'endless' => (s.b22.endless || s.plan.cycle > 0 ? 'endless' : s.plan.mode === 'fracture_expedition' ? 'expedition' : 'classic');
/** Creates the director for a run that opted into Living Fractures (a no-op otherwise). */
export function startLiving(s: GameState) {
  if (!s.plan.living) { s.lf = undefined; return; }
  const rng = new SeededRng(streamSeed(s.seed, 'living-fractures')), [a, b] = F.first[modeKey(s)];
  s.lf = { v: LF_VERSION, rng, nextAt: rng.between(a, b), waitSince: -1, spawned: 0, seq: 1, lastKind: '', events: [], fx: [], log: [], hist: [], stats: blankLfStats(), ended: false };
}
/** Endless after a Classic win keeps the same director; its next opportunity is re-timed to the Endless cadence. */
export function livingEndlessLeg(s: GameState) { const lf = s.lf; if (!lf) return; lf.nextAt = Math.max(lf.nextAt, s.time + F.first.endless[0]); lf.waitSince = -1; }

/* ------------------------------------------------------------------ fighters and geometry */
interface Fx { slot: number; x: number; y: number }
/** Standing fighters with their ground (foot) point. */
function fighters(s: GameState): Fx[] {
  if (!s.party) return s.player.hp > 0 ? [{ slot: 0, x: s.player.x, y: s.player.y + PLAYER_FOOT_DY }] : [];
  const out: Fx[] = []; for (let i = 0; i < s.party.slots.length; i++) if (standing(s, i)) { const q = pl(s, i); out.push({ slot: i, x: q.x, y: q.y + PLAYER_FOOT_DY }); } return out;
}
const near = (fs: Fx[], x: number, y: number, r: number) => fs.filter(f => dist2(f.x, f.y, x, y) <= r * r);
const nearest = (fs: Fx[], x: number, y: number): Fx | null => { let b: Fx | null = null, bd = Infinity; for (const f of fs) { const d = dist2(f.x, f.y, x, y); if (d < bd) { bd = d; b = f; } } return b; };
const partyK = (s: GameState) => (s.party ? F.party : 1);
const compass = (dx: number, dy: number) => ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'][((Math.round(Math.atan2(dy, dx) / (TAU / 8)) % 8) + 8) % 8];
const clearFree = (x: number, y: number, r: number, pad = 18) => { if (blocked(x, y, pad)) return false; for (let k = 0; k < 8; k++) if (blocked(x + Math.cos((k / 8) * TAU) * r, y + Math.sin((k / 8) * TAU) * r, pad)) return false; return true; };

/** Coarse flood fill of ground the fighters can actually walk to, from the nearest fighter. */
const CELL = 48, GW = Math.ceil(RULES.worldWidth / CELL), GH = Math.ceil(RULES.worldHeight / CELL);
function reachable(from: { x: number; y: number }): Set<number> {
  const seen = new Set<number>(), q: number[] = [], cx = Math.floor(from.x / CELL), cy = Math.floor(from.y / CELL);
  const ok = (gx: number, gy: number) => gx >= 0 && gy >= 0 && gx < GW && gy < GH && !blocked(gx * CELL + CELL / 2, gy * CELL + CELL / 2, 14);
  let start = cx + cy * GW; if (!ok(cx, cy)) { let found = false; for (let d = 1; d < 6 && !found; d++) for (let dy = -d; dy <= d && !found; dy++) for (let dx = -d; dx <= d; dx++) if (ok(cx + dx, cy + dy)) { start = cx + dx + (cy + dy) * GW; found = true; break; } }
  seen.add(start); q.push(start);
  for (let i = 0; i < q.length; i++) { const c = q[i], gx = c % GW, gy = (c - gx) / GW; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = gx + dx, ny = gy + dy, k = nx + ny * GW; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); q.push(k); } } }
  return seen;
}
const cellOf = (x: number, y: number) => Math.floor(x / CELL) + Math.floor(y / CELL) * GW;
/** Static arena hazard footprints (lane surge lanes, ashen pylon rings): events never sit inside them. */
function inHazardArea(s: GameState, x: number, y: number, pad: number): boolean {
  const h = ARENAS[s.arenaId].hazard;
  if (h.id === 'lane-surge') return h.lanes!.some(l => Math.abs(x - l.x) < l.w / 2 + pad && Math.abs(y - l.y) < l.h / 2 + pad);
  if (h.id === 'pylon-pulse') return ARENAS[s.arenaId].solids.some(o => o.prop === 'pylon' && dist2(x, y, o.x + 30, o.y + 22) < (h.radius! + pad) ** 2);
  return false;
}
/** A safe, reachable place for an event: clear of props and walls, away from other events, inside the party tether, not on top of a fighter and not inside a live hazard. */
let FORCE: { x: number; y: number } | null = null;
function findSite(s: GameState, lf: LfState, clear: number, reach?: Set<number>): { x: number; y: number } | null {
  if (FORCE) return FORCE;
  const fs = fighters(s); if (!fs.length) return null; const rng = lf.rng!, a = ARENAS[s.arenaId], m = a.inset + clear + 30, rs = reach ?? reachable(nearest(fs, RULES.worldWidth / 2, RULES.worldHeight / 2)!);
  for (let i = 0; i < 56; i++) {
    const x = rng.between(m, RULES.worldWidth - m), y = rng.between(m, RULES.worldHeight - m);
    if (!rs.has(cellOf(x, y)) || !clearFree(x, y, clear)) continue;
    const dn = Math.sqrt(Math.min(...fs.map(f => dist2(f.x, f.y, x, y)))), df = Math.sqrt(Math.max(...fs.map(f => dist2(f.x, f.y, x, y))));
    if (dn < F.minDist || dn > F.maxDist || df > F.farDist) continue;
    if (lf.events.some(e => !LF_TERMINAL.includes(e.st) && dist2(e.x, e.y, x, y) < F.spacing ** 2)) continue;
    if (inHazardArea(s, x, y, clear) || s.hazards.some(z => z.owner === 0 && !z.fired && dist2(z.x, z.y, x, y) < (z.r + clear + (z.w ?? 0)) ** 2)) continue;
    return { x, y };
  }
  return null;
}
/** Valid points on a ring (props and walls skipped), so a spawn never lands inside geometry. */
function ringPoints(_s: GameState, lf: LfState, cx: number, cy: number, r: number, n: number, rad = 20): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [], a0 = lf.rng!.between(0, TAU);
  for (let i = 0; i < n; i++) for (const k of [1, 0.85, 1.15, 0.7]) { const th = a0 + (i / n) * TAU, x = cx + Math.cos(th) * r * k, y = cy + Math.sin(th) * r * k; if (!blocked(x, y, rad)) { out.push({ x, y }); break; } }
  return out;
}

/* ------------------------------------------------------------------ small authoritative helpers */
function say(s: GameState, kind: LfKind | 'info', title: string, sub: string) { const lf = s.lf!; if (/OPENS|ACTIVE|ESCORT|DEFEND|SEEN YOU|APEX/.test(title) || title.startsWith('ECHO OF')) b22Emit(s.b22, 'lf_open', 0, 0); else if (/AMBUSH/.test(title)) b22Emit(s.b22, 'lf_ambush', 0, 0); else if (/STRUCK/.test(title)) b22Emit(s.b22, 'lf_bargain', 0, 0); else if (/HUMS|STALKS|SHRINE$|RIFT$|RELAY$|ECHO$/.test(title) && kind !== 'info') b22Emit(s.b22, 'lf_found', 0, 0); lf.log.push({ id: lf.seq++, t: s.time, kind, title, sub }); if (lf.log.length > 8) lf.log.splice(0, lf.log.length - 8); }
function mob(s: GameState, kind: MobKind, x: number, y: number, hpMul = 1, extra: Record<string, number> = {}): Enemy {
  const def = ENEMIES[kind], hp = (def.hp + Math.floor(s.time / 60) * def.hpPerMinute) * hpMul * s.run.enemyHpMult * lfMul(s, 'foeHp');
  return addEnemy(s, { kind, x, y, hp, maxHp: hp, radius: def.radius, speed: def.moveSpeed + Math.min(32, s.time / 18) * Math.min(1, def.moveSpeed / 74), damage: def.damage, touchCooldown: 0, attackCd: def.attack.cooldown * 0.6, aimX: 0, aimY: 1, stepId: 'lf', ex: { lf: 1, ...extra } });
}
const room = (s: GameState, n: number) => s.enemies.length + n < RULES.maxEnemies - 6;
const live = (s: GameState, ids: number[]) => ids.filter(id => s.enemies.some(e => e.id === id && e.hp > 0));
function dissolve(s: GameState, ids: number[]) { for (const e of s.enemies) if (ids.includes(e.id) && e.hp > 0) { e.hp = 0; pushEnemyEvent(s, 'enemy_death', e, e.aimX, e.aimY); } }
function haz(s: GameState, ev: LfEvent, h: { shape: Hazard['shape']; x: number; y: number; r: number; delay: number; damage: number; tag: string; w?: number; h?: number; ang?: number; active?: number }) {
  if (s.hazards.length > 70) return;
  s.hazards.push({ id: s.nextId++, shape: h.shape, x: h.x, y: h.y, r: h.r, w: h.w, h: h.h, ang: h.ang ?? 0, arc: 0, delay: h.delay, total: h.delay, active: h.active ?? 0.45, damage: h.damage, owner: OWNER(ev), tag: h.tag, fired: false, ttl: 0 });
  s.enemyEvents.push({ id: s.nextId++, kind: 'hazard_warn', enemy: 'warden', enemyId: 0, x: h.x, y: h.y, dirX: 1, dirY: 0, tag: h.tag }); if (s.enemyEvents.length > 64) s.enemyEvents.splice(0, s.enemyEvents.length - 64);
}
const clearHazards = (s: GameState, ev: LfEvent) => { s.hazards = s.hazards.filter(h => h.owner !== OWNER(ev) || h.fired); };
/** Next run time at which the director must stay out (scripted steps, boss arrivals, the finale, Endless cycle boss / extract, the time cap). */
export function protectedFrom(s: GameState): number {
  let t = Infinity; const plan = s.plan;
  for (const st of plan.steps) { if (s.encounter.spawned[st.id] || st.trigger !== 'time') continue; t = Math.min(t, (st.warnAt ?? st.at) - (st.kind === 'boss' ? 14 : 10)); }
  if (plan.finaleQuietFrom != null) t = Math.min(t, plan.finaleQuietFrom - 10);
  if (plan.duration > 0) t = Math.min(t, plan.duration - 25);
  const e = s.b22.endless; if (e) { const cyc = Math.floor((s.time - e.fromT) / 300), bossAt = e.fromT + cyc * 300 + 120; if (s.time < bossAt) t = Math.min(t, bossAt - 14); t = Math.min(t, e.fromT + (cyc + 1) * 300 - F.endlessCycleGuard); }
  return t;
}
function addFx(s: GameState, slot: number, src: number, kind: LfFx['kind'], label: string, icon: string, dur: number, v: Partial<LfFx>) {
  const lf = s.lf!; lf.fx = lf.fx.filter(f => !(f.slot === slot && f.label === label));
  lf.fx.push({ id: lf.seq++, slot, src, kind, label, icon, until: s.time + dur, dur, ...v });
  const mine = lf.fx.filter(f => f.slot === slot && f.kind === 'boon'); if (mine.length > F.caps.boonStack) lf.fx = lf.fx.filter(f => f !== mine[0]);
  if (kind === 'boon') lf.stats.boons++; else lf.stats.curses++;
}
const alive = (s: GameState, slot: number) => (s.party ? standing(s, slot) : s.player.hp > 0);
function heal(s: GameState, slot: number, frac: number) { if (!alive(s, slot)) return; const q = pl(s, slot); q.hp = Math.min(q.maxHp, q.hp + q.maxHp * frac); }
function energy(s: GameState, slot: number, drive: number, od: number) { if (!alive(s, slot)) return; const q = pl(s, slot); q.drive = Math.min(100, q.drive + drive); q.odMeter = Math.min(100, q.odMeter + od); }
function crystals(s: GameState, x: number, y: number, n: number) { for (let i = 0; i < n; i++) if (s.pickups.length < RULES.maxPickups) { const th = (i / Math.max(1, n)) * TAU + 0.6; addPickup(s, { x: x + Math.cos(th) * 34, y: y + Math.sin(th) * 24, xp: Math.round((5 + s.time / 70) * xpTimeScale(s.time) * 10) / 10, age: 0, tier: 2 }); } }
function settle(s: GameState, ev: LfEvent, outcome: 'won' | 'failed' | 'expired' | 'declined' | 'ended', note: string) {
  const lf = s.lf!; if (LF_TERMINAL.includes(ev.st)) return;
  ev.st = outcome === 'won' ? 'won' : outcome === 'failed' ? 'failed' : 'expired'; ev.ta = s.time;
  if (outcome === 'won') lf.stats.won++; else if (outcome === 'failed') lf.stats.failed++; else lf.stats.expired++;
  b22Emit(s.b22, outcome === 'won' ? 'lf_win' : outcome === 'failed' ? 'lf_fail' : 'lf_found', ev.x, ev.y);
  lf.hist.push({ kind: ev.kind, variant: ev.variant, outcome, t: Math.round(s.time), note }); if (lf.hist.length > 14) lf.hist.splice(0, lf.hist.length - 14);
  clearHazards(s, ev);
}
const nameOf = (ev: LfEvent) => ev.kind === 'rift' ? ARENA_LF[ev.variant].rift.name : ev.kind === 'shrine' ? ARENA_LF[ev.variant].shrine.name : ev.kind === 'cache' ? ARENA_LF[ev.variant].cache.name : ev.kind === 'relay' ? ARENA_LF[ev.variant].relay.name : ev.kind === 'echo' ? ARENA_LF[ev.variant].echoName : LF_COPY.elite.name;
function mk(s: GameState, kind: LfKind, x: number, y: number, r: number, life: number, extra: Partial<LfEvent> = {}): LfEvent {
  const lf = s.lf!, pf = protectedFrom(s);
  return { id: lf.seq++, kind, variant: s.arenaId, x, y, r, st: 'idle', t0: s.time, ta: s.time, ex: Math.min(s.time + life, pf - 2), seen: false, p: 0, hp: 0, hpMax: 0, parts: [], who: -1, tag: '', ids: [], aux: new Array(14).fill(0), ...extra };
}
/** Active-challenge deadline: a limit from now, clamped so it can never run into a protected window. */
const deadline = (s: GameState, limit: number) => Math.min(s.time + limit, protectedFrom(s) - 1);

/* ------------------------------------------------------------------ rewards */
function payRift(s: GameState, ev: LfEvent) {
  const lf = s.lf!, slots = [0, 1].filter(i => (s.party ? i < s.party.slots.length : i === 0) && ev.aux[3 + i] >= F.rift.minIn), who = slots.length ? slots : ev.who >= 0 ? [ev.who] : [];
  const notes: string[] = [];
  for (const i of who) {
    heal(s, i, F.rift.heal); addFx(s, i, ev.id, 'boon', 'Rift Surge', 'rift', F.rift.boon.dur, { dmg: F.rift.boon.dmg });
    if (lf.stats.relics < F.caps.relics) { const id = inSlot(s, i, () => { const pool = relicPool(s).filter(r => !s.b22.relics.includes(r)); if (!pool.length) return null; const pick = pool[lf.rng!.int(pool.length)]; return grantRelic(s, pick) ? pick : null; }); if (id) { lf.stats.relics++; notes.push(`relic ${id.replace(/_/g, ' ')}`); } }
  }
  crystals(s, ev.x, ev.y, 2); return notes.length ? notes.join(', ') : 'Rift Surge: +16% damage';
}
function payCache(s: GameState, ev: LfEvent) {
  const guarded = ev.aux[0] > 0, fs = near(fighters(s), ev.x, ev.y, 520), who = fs.length ? fs.map(f => f.slot) : ev.who >= 0 ? [ev.who] : [];
  for (const i of who) { heal(s, i, guarded ? F.cache.heal * 1.5 : F.cache.heal); energy(s, i, F.cache.drive, guarded ? 15 : 0); if (guarded) addFx(s, i, ev.id, 'boon', 'Charged Core', 'cache', 40, { dmg: 1.1 }); }
  crystals(s, ev.x, ev.y, guarded ? F.cache.crystals[1] : F.cache.crystals[0]); return guarded ? 'ambush cleared: 3 crystals, charge' : '1 crystal, Drive';
}
function payEcho(s: GameState, ev: LfEvent) {
  const hero = ev.hero!, B = BLESSINGS[hero], notes: string[] = [];
  for (const i of [0, 1]) { if (!(s.party ? i < s.party.slots.length : i === 0) || ev.aux[10 + i] < 3) continue;
    const h = s.party ? slotHero(s, i) : s.hero;
    if (h === hero) { addFx(s, i, ev.id, 'boon', B.name, 'echo', B.dur, B.fx); energy(s, i, B.drive, B.od); notes.push(B.name); }
    else { energy(s, i, F.echo.spark.drive, 0); heal(s, i, F.echo.spark.heal); notes.push('Echo Spark'); } }
  return notes.join(', ') || 'The echo fades';
}

/* ------------------------------------------------------------------ spawners */
type Spawner = (s: GameState, lf: LfState, reach: Set<number>) => LfEvent | null;
const heroesIn = (s: GameState): HeroId[] => (s.party ? s.party.slots.map((_, i) => slotHero(s, i)) : [s.hero]);
const SPAWN: Record<LfKind, Spawner> = {
  rift(s, lf, reach) { const p = findSite(s, lf, F.rift.clear, reach); return p ? mk(s, 'rift', p.x, p.y, F.rift.zoneR, F.life.rift) : null; },
  shrine(s, lf, reach) { const p = findSite(s, lf, F.shrine.clear, reach); if (!p) return null; const pairs = ARENA_LF[s.arenaId].shrine.pairs; return mk(s, 'shrine', p.x, p.y, F.shrine.spread + F.shrine.altarR, F.life.shrine, { pair: pairs[lf.rng!.int(pairs.length)], took: null }); },
  cache(s, lf, reach) { const p = findSite(s, lf, F.cache.clear, reach); return p ? mk(s, 'cache', p.x, p.y, F.cache.r, F.life.cache, { aux: [lf.rng!.next() < F.cache.guarded ? 1 : 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }) : null; },
  elite(s, lf) {
    const fs = fighters(s), me = nearest(fs, s.player.x, s.player.y); if (!me) return null; const rng = lf.rng!, kinds = ARENA_LF[s.arenaId].elite.kinds, kind = kinds[rng.int(kinds.length)], mod = ELITE_MODS[rng.int(ELITE_MODS.length)], def = ENEMIES[kind];
    for (let i = 0; i < 40; i++) {
      const th = rng.between(0, TAU), d = rng.between(F.elite.spawnMin, F.elite.spawnMax), x = me.x + Math.cos(th) * d, y = me.y + Math.sin(th) * d;
      if (blocked(x, y, def.radius + 8) || x < 120 || y < 120 || x > RULES.worldWidth - 120 || y > RULES.worldHeight - 120 || fs.some(f => dist2(f.x, f.y, x, y) < 560 ** 2)) continue;
      const e = mob(s, kind, x, y, F.elite.hpMul[mod] * (s.party ? 1.45 : 1), { lfMod: ELITE_MODS.indexOf(mod) + 1 });
      if (mod === 'swift') e.speed *= F.elite.swiftMul; e.damage *= 1.15;
      return mk(s, 'elite', x, y, e.radius + 14, F.life.elite, { mod, ids: [e.id], hp: e.hp, hpMax: e.maxHp, tag: `${ELITE_COPY[mod].name} ${def.name}`, aux: [e.speed, x, y, 0, 0, 0, x, y, 0, 0, 0, 0, 0, 0] });
    } return null;
  },
  relay(s, lf, reach) {
    const p = findSite(s, lf, F.relay.clear, reach); if (!p) return null; const cfg = ARENA_LF[s.arenaId].relay, hp = F.relay.hp * partyK(s);
    const ev = mk(s, 'relay', p.x, p.y, F.relay.near, F.life.relay, { type: cfg.type, hp, hpMax: hp });
    if (cfg.type === 'escort') {
      for (let i = 0; i < 16; i++) { const q = FORCE ? { x: p.x + Math.cos(i * 0.7) * 800, y: p.y + Math.sin(i * 0.7) * 800 } : findSite(s, lf, F.relay.clear, reach); if (!q) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < F.relay.routeMin || d > F.relay.routeMax) continue; let ok = true; for (let t = 0; t <= 1 && ok; t += 24 / d) if (blocked(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t, 22)) ok = false; if (ok) { ev.aux[0] = q.x; ev.aux[1] = q.y; ev.aux[4] = d; return ev; } }
      return null;   // no clear route: no escort rather than an impossible one
    }
    return ev;
  },
  echo(s, lf, reach) { const p = findSite(s, lf, F.echo.clear, reach); if (!p) return null; const hs = heroesIn(s), hero = hs[lf.rng!.int(hs.length)]; return mk(s, 'echo', p.x, p.y, F.echo.zoneR, F.life.echo, { hero, tag: BLESSINGS[hero].name }); },
};

/** QA / tests: put one event of `kind` into the world now (optionally at a chosen point), exactly as the director would, without touching the schedule. */
export function spawnEvent(s: GameState, kind: LfKind, at?: { x: number; y: number }): LfEvent | null {
  const lf = s.lf; if (!lf) return null; FORCE = at ?? null;
  try { const ev = SPAWN[kind](s, lf, new Set()); if (!ev) return null; ev.ex = Math.max(ev.ex, s.time + 120); lf.events.push(ev); lf.spawned++; lf.lastKind = kind; return ev; } finally { FORCE = null; }
}
/* ------------------------------------------------------------------ the director */
function eligibleNow(s: GameState, lf: LfState): boolean {
  if (s.phase !== 'running' || s.cinema || s.selector.open || bossAlive(s)) return false;
  if (s.lastBossDefeatAt >= 0 && s.time - s.lastBossDefeatAt < F.bossAfter) return false;
  if (lf.events.filter(e => !LF_TERMINAL.includes(e.st)).length >= F.maxActive) return false;
  for (const st of s.plan.steps) if (s.encounter.spawned[st.id] && s.encounter.doneAt[st.id] === undefined) return false;   // a scripted wave / boss step is running
  if (s.b22.relicOffer || s.b22.branchOffer) return false;
  return protectedFrom(s) - s.time >= 55;
}
function direct(s: GameState, lf: LfState) {
  if (s.time < lf.nextAt || !eligibleNow(s, lf)) return;
  if (lf.waitSince < 0) lf.waitSince = s.time;
  const gap = F.gap[modeKey(s)], fs = fighters(s); if (!fs.length) return;
  const w = ARENA_LF[s.arenaId].weights, rng = lf.rng!, order: LfKind[] = [];
  const pool = LF_KINDS.filter(k => k !== lf.lastKind), weights = pool.map(k => w[k] * (lf.hist.some(h => h.kind === k) || lf.events.some(e => e.kind === k) ? 1 : 1.6));
  for (let n = pool.length; n > 0; n--) { const tot = weights.reduce((a, b) => a + b, 0); let r = rng.next() * tot, i = 0; for (; i < weights.length - 1; i++) { r -= weights[i]; if (r < 0) break; } order.push(pool[i]); pool.splice(i, 1); weights.splice(i, 1); }
  const reach = reachable(nearest(fs, s.player.x, s.player.y)!);
  for (const kind of order.slice(0, 4)) {
    const ev = SPAWN[kind](s, lf, reach); if (!ev || ev.ex - s.time < 50) continue;
    lf.events.push(ev); lf.spawned++; lf.lastKind = kind; lf.waitSince = -1; lf.nextAt = s.time + rng.between(gap[0], gap[1]);
    const me = nearest(fs, ev.x, ev.y)!, dir = compass(ev.x - me.x, ev.y - me.y), n = nameOf(ev);
    b22Emit(s.b22, 'lf_found', ev.x, ev.y);
    if (kind === 'cache') say(s, kind, 'SOMETHING HUMS NEARBY', `A sealed cache · ${dir}`); else if (kind === 'elite') say(s, kind, 'AN ELITE STALKS THE ARENA', `${ev.tag} · ${dir}`); else say(s, kind, n.toUpperCase(), `${LF_COPY[kind].verb} · ${dir}`);
    return;
  }
  lf.nextAt = s.time + F.retry; if (s.time - lf.waitSince > F.window) { lf.nextAt = s.time + rng.between(gap[0], gap[1]); lf.waitSince = -1; }   // no safe site in the window: skip this opportunity
}

/* ------------------------------------------------------------------ per-kind state machines */
function stepRift(s: GameState, ev: LfEvent, fs: Fx[], dt: number) {
  const lf = s.lf!, a = ev.aux;
  if (ev.st === 'idle') {
    if (s.time >= ev.ex) return settle(s, ev, 'expired', 'The rift closed unopened');
    a[0] = near(fs, ev.x, ev.y, F.rift.enterR).length ? a[0] + dt : Math.max(0, a[0] - dt * 2); ev.p = Math.min(1, a[0] / F.rift.enterT);
    if (a[0] >= F.rift.enterT) {
      ev.st = 'active'; ev.ta = s.time; ev.ex = deadline(s, 110); lf.stats.started++; ev.who = near(fs, ev.x, ev.y, F.rift.enterR)[0]?.slot ?? 0;
      const g = ARENA_LF[s.arenaId].rift.group, list: MobKind[] = []; for (const e of g) for (let i = 0; i < Math.round(e.n * (e.n > 1 ? partyK(s) : 1)); i++) list.push(e.kind);
      const pts = ringPoints(s, lf, ev.x, ev.y, 250, list.length); list.forEach((k, i) => { const p = pts[i % Math.max(1, pts.length)]; if (p && room(s, 1)) ev.ids.push(mob(s, k, p.x, p.y, F.rift.hpMul, { lfRift: 1 }).id); });
      ev.hpMax = ev.ids.length; ev.hp = ev.hpMax; say(s, 'rift', 'THE RIFT OPENS', 'Break the guard inside the ring. Leave it for long and it collapses.');
    }
  } else if (ev.st === 'active') {
    for (const f of near(fs, ev.x, ev.y, ev.r)) a[3 + f.slot] += dt;
    const inside = near(fs, ev.x, ev.y, ev.r).length > 0; a[1] = inside ? 0 : a[1] + dt;
    const left = live(s, ev.ids).length; ev.hp = left; ev.p = ev.hpMax ? 1 - left / ev.hpMax : 1;
    if (!left) { ev.st = 'reward'; ev.ta = s.time; a[2] = s.time + F.rift.claimT; ev.ex = Math.min(a[2], protectedFrom(s) - 1); say(s, 'rift', 'RIFT CLEARED', 'Touch the shard to claim it'); }
    else if (a[1] >= F.rift.leave) { dissolve(s, ev.ids); settle(s, ev, 'failed', 'The rift collapsed: nobody stayed'); say(s, 'rift', 'THE RIFT COLLAPSES', 'You left the ring'); }
    else if (s.time >= ev.ex) { dissolve(s, ev.ids); settle(s, ev, 'expired', 'The rift ran out of time'); say(s, 'rift', 'THE RIFT SEALS', 'Out of time'); }
  } else if (ev.st === 'reward') {
    const c = near(fs, ev.x, ev.y, F.rift.claimR)[0];
    if (c) { ev.who = c.slot; const note = payRift(s, ev); settle(s, ev, 'won', note); say(s, 'rift', 'RIFT SHARD CLAIMED', note); }
    else if (s.time >= ev.ex) { settle(s, ev, 'expired', 'The shard faded unclaimed'); say(s, 'rift', 'THE SHARD FADES', 'Unclaimed'); }
  }
}
function stepShrine(s: GameState, ev: LfEvent, fs: Fx[], dt: number) {
  const a = ev.aux, ax = [ev.x - F.shrine.spread, ev.x + F.shrine.spread];
  if (ev.st === 'idle') {
    if (s.time >= ev.ex) { settle(s, ev, 'declined', 'Declined: nobody accepted'); return say(s, 'shrine', 'THE SHRINE GOES DARK', 'You declined'); }
    let took = -1, by = -1;
    for (let i = 0; i < 2; i++) { const on = near(fs, ax[i], ev.y, F.shrine.altarR); a[i] = on.length ? a[i] + dt : Math.max(0, a[i] - dt * F.shrine.decay); if (a[i] >= F.shrine.channel && took < 0) { took = i; by = on.length ? on[0].slot : (nearest(fs, ax[i], ev.y)?.slot ?? 0); } }
    ev.p = Math.max(a[0], a[1]) / F.shrine.channel;
    if (took >= 0) {
      const b = BARGAINS[ev.pair![took]]; ev.took = b.id; ev.who = by; ev.st = 'active'; ev.ta = s.time; ev.ex = s.time + b.dur; s.lf!.stats.started++;
      for (const f of b.fx) addFx(s, by, ev.id, 'boon', b.name, 'shrine', b.dur, f);
      for (const f of b.curseFx) addFx(s, b.scope === 'party' ? -1 : by, ev.id, 'curse', `${b.name} (curse)`, 'shrine', b.dur, f);
      if (b.drive || b.od) energy(s, by, b.drive ?? 0, b.od ?? 0);
      say(s, 'shrine', `${b.name.toUpperCase()} STRUCK`, `${b.boon}. ${b.curse}. ${b.dur} s.`);
    }
  } else if (ev.st === 'active' && s.time >= ev.ex) { settle(s, ev, 'won', `${BARGAINS[ev.took!].name} ran its course`); }
}
function stepCache(s: GameState, ev: LfEvent, fs: Fx[], dt: number) {
  const lf = s.lf!, a = ev.aux, guarded = a[0] > 0;
  const open = () => { const note = payCache(s, ev); settle(s, ev, 'won', note); say(s, 'cache', 'CACHE OPENED', note); };
  if (ev.st === 'idle') {
    if (s.time >= ev.ex) return settle(s, ev, 'expired', 'The cache faded unfound');
    if (!ev.seen && near(fs, ev.x, ev.y, F.cache.reveal).length) { ev.seen = true; lf.stats.discovered++; say(s, 'cache', 'FRACTURE CACHE FOUND', guarded ? 'Sealed and guarded. Something waits.' : 'Stay close to attune it.'); }
    const on = near(fs, ev.x, ev.y, F.cache.r); ev.p = on.length ? Math.min(1, ev.p + dt / F.cache.attune) : Math.max(0, ev.p - dt * 0.6);
    if (ev.p >= 1) {
      ev.who = on[0]?.slot ?? 0; ev.seen = true;
      if (!guarded) return open();
      ev.st = 'active'; ev.ta = s.time; ev.ex = deadline(s, 80); lf.stats.started++; a[1] = s.time + F.cache.ambushDelay;
      const kinds = ARENA_LF[s.arenaId].cache.ambush, list: MobKind[] = []; for (const k of kinds) for (let i = 0; i < Math.round(k.n * (k.n > 1 ? partyK(s) : 1)); i++) list.push(k.kind);
      const pts = ringPoints(s, lf, ev.x, ev.y, F.cache.ambushR, Math.min(5, list.length), 22); a[2] = pts.length; pts.forEach((p, i) => { a[3 + i * 2] = p.x; a[4 + i * 2] = p.y; haz(s, ev, { shape: 'sigil', x: p.x, y: p.y, r: 46, delay: F.cache.ambushDelay, damage: 0, tag: 'lf_ambush' }); });
      ev.tag = list.join(','); ev.hpMax = list.length; say(s, 'cache', 'AMBUSH', 'The cache cracks. Marked ground: they are coming.');
    }
  } else if (ev.st === 'active') {
    if (a[1] > 0 && s.time >= a[1]) {
      a[1] = -1; const list = ev.tag.split(',') as MobKind[], n = Math.max(1, a[2]); for (let i = 0; i < list.length; i++) { const k = i % n; if (room(s, 1)) ev.ids.push(mob(s, list[i], a[3 + k * 2] + (i >= n ? 14 : 0), a[4 + k * 2], 1, { lfCache: 1 }).id); }
      ev.hpMax = ev.ids.length;
    }
    if (a[1] < 0) { const left = live(s, ev.ids).length; ev.hp = left; ev.p = ev.hpMax ? 1 - left / ev.hpMax : 1; if (!left) open(); }
    if (ev.st === 'active' && s.time >= ev.ex) { dissolve(s, ev.ids); settle(s, ev, 'expired', 'The ambush overran the cache'); say(s, 'cache', 'THE CACHE COLLAPSES', 'Out of time'); }
  }
}
function eliteEnemy(s: GameState, ev: LfEvent) { return s.enemies.find(e => e.id === ev.ids[0]); }
function stepElite(s: GameState, ev: LfEvent, fs: Fx[], dt: number) {
  const lf = s.lf!, a = ev.aux, e = eliteEnemy(s, ev), mod = ev.mod!;
  if (!e || e.hp <= 0) {   // killed (we only ever remove it ourselves through settle)
    const x = e?.x ?? ev.x, y = e?.y ?? ev.y; if (mod === 'volatile') haz(s, ev, { shape: 'circle', x, y: y + 18, r: F.elite.blastR, delay: F.elite.blastDelay, damage: F.elite.blastDmg, tag: 'lf_blast' });
    const who = near(fs, x, y, 900).map(f => f.slot); crystals(s, x, y, F.elite.crystals);
    for (const i of who) { addFx(s, i, ev.id, 'boon', 'Elite Trophy', 'elite', F.elite.boon.dur, { dmg: F.elite.boon.dmg }); energy(s, i, 0, F.elite.od); }
    ev.parts = who; ev.who = who[0] ?? -1; const note = `${ev.tag} slain: 3 crystals, +14% damage, Overdrive`; ev.st = 'won'; ev.ta = s.time; lf.stats.won++; lf.hist.push({ kind: 'elite', variant: ev.variant, outcome: 'won', t: Math.round(s.time), note }); say(s, 'elite', 'ELITE SLAIN', note);
    return;
  }
  ev.x = e.x; ev.y = e.y + groundDy(e.radius); ev.hp = e.hp; ev.hpMax = e.maxHp; if (!ev.seen && near(fs, e.x, e.y, F.notice).length) { ev.seen = true; lf.stats.discovered++; }
  if (s.time >= ev.ex && (!near(fs, e.x, e.y, 360).length || s.time >= ev.ex + 20)) { dissolve(s, ev.ids); settle(s, ev, 'expired', 'The elite slipped away'); return say(s, 'elite', 'THE ELITE SLIPS AWAY', 'You let it go'); }
  const me = nearest(fs, e.x, e.y), d = me ? Math.hypot(me.x - e.x, me.y - e.y) : 9999;
  if (ev.st === 'idle' && (d < F.elite.aggro || e.hp < e.maxHp)) { ev.st = 'active'; ev.ta = s.time; a[3] = 0; a[4] = s.time + 2; e.speed = a[0]; lf.stats.started++; say(s, 'elite', 'IT HAS SEEN YOU', `${ELITE_COPY[mod].name}: ${ELITE_COPY[mod].cue}.`); }
  if (ev.st === 'active') {
    a[3] = d > F.elite.leash ? a[3] + dt : 0;
    if (a[3] >= F.elite.leashT) { ev.st = 'idle'; a[1] = e.x; a[2] = e.y; a[3] = 0; e.speed = 0; }
    else if (me && s.time >= a[4]) {
      if (mod === 'swift') { a[4] = s.time + F.elite.pounceEvery; haz(s, ev, { shape: 'circle', x: me.x, y: me.y, r: F.elite.pounceR, delay: F.elite.pounceDelay, damage: F.elite.pounceDmg, tag: 'lf_pounce' }); }
      else if (mod === 'warded') { a[4] = s.time + F.elite.wardEvery; haz(s, ev, { shape: 'circle', x: e.x, y: e.y + groundDy(e.radius), r: F.elite.wardR, delay: F.elite.wardDelay, damage: F.elite.wardDmg, tag: 'lf_ward' }); }
      else a[4] = s.time + 3;
    }
  } else {   // roaming: it wanders between clear waypoints at its own pace and ignores nobody who walks into it
    e.speed = 0; const tx = a[1] - e.x, ty = a[2] - e.y, td = Math.hypot(tx, ty), sp = F.elite.roam * (mod === 'swift' ? 1.5 : 1);
    if (td < 24 || a[5] > 1.4) { a[5] = 0; for (let i = 0; i < 10; i++) { const th = lf.rng!.between(0, TAU), L = lf.rng!.between(220, 520), x = e.x + Math.cos(th) * L, y = e.y + Math.sin(th) * L; let ok = x > 160 && y > 160 && x < RULES.worldWidth - 160 && y < RULES.worldHeight - 160; for (let t = 0; t <= 1 && ok; t += 0.12) if (blocked(e.x + (x - e.x) * t, e.y + (y - e.y) * t, e.radius + 6)) ok = false; if (ok) { a[1] = x; a[2] = y; break; } } }
    else { const bx = e.x, by = e.y; slideMove(e, (tx / td) * sp, (ty / td) * sp, dt); a[5] = Math.hypot(e.x - bx, e.y - by) < sp * dt * 0.3 ? a[5] + dt : 0; if (Math.abs(tx) > 1) e.aimX = tx > 0 ? 1 : -1; }
  }
}
const FOE_BASE = 'bs';
function stepRelay(s: GameState, ev: LfEvent, fs: Fx[], dt: number) {
  const lf = s.lf!, a = ev.aux, escort = ev.type === 'escort', raiders = s.enemies.filter(e => e.hp > 0 && ev.ids.includes(e.id));
  const release = () => { for (const e of raiders) if (e.ex && e.ex[FOE_BASE]) e.speed = e.ex[FOE_BASE]; };
  if (ev.st === 'idle') {
    if (s.time >= ev.ex) return settle(s, ev, 'expired', 'Nobody answered the relay');
    a[7] = near(fs, ev.x, ev.y, 130).length ? a[7] + dt : Math.max(0, a[7] - dt); ev.p = 0;
    if (a[7] >= 0.8) { ev.st = 'active'; ev.ta = s.time; ev.ex = deadline(s, escort ? 150 : 130); a[2] = s.time + 4; lf.stats.started++; say(s, 'relay', escort ? 'ESCORT THE BEACON' : 'DEFEND THE RELAY', escort ? 'It moves only while you stay close. Guard it to the far marker.' : `Hold ${F.relay.defendT} seconds inside the ring while it charges.`); }
    return;
  }
  if (ev.st !== 'active') return;
  const close = near(fs, ev.x, ev.y, escort ? F.relay.escortNear : F.relay.near);
  if (escort) {   // the beacon travels only with a guard beside it
    if (close.length) { const dx = a[0] - ev.x, dy = a[1] - ev.y, d = Math.hypot(dx, dy), step = Math.min(d, F.relay.escortSpeed * dt); if (d > 6 && !blocked(ev.x + (dx / d) * step, ev.y + (dy / d) * step, 18)) { ev.x += (dx / d) * step; ev.y += (dy / d) * step; a[5] += step; } }
    const left = Math.hypot(a[0] - ev.x, a[1] - ev.y); ev.p = left <= 12 ? 1 : Math.max(0, Math.min(1, 1 - left / Math.max(1, a[4])));
  } else if (close.length) ev.p = Math.min(1, ev.p + dt / F.relay.defendT);
  for (const f of close) if (!ev.parts.includes(f.slot)) ev.parts.push(f.slot);
  a[3] = near(fs, ev.x, ev.y, 430).length ? 0 : a[3] + dt; if (a[3] > F.relay.abandon) ev.hp -= F.relay.abandonDps * dt;
  if (s.time >= a[2] && room(s, F.relay.raidN)) {   // an assault wave from the outside in
    a[2] = s.time + F.relay.raidEvery; const cfg = ARENA_LF[s.arenaId].relay, n = F.relay.raidN + (s.party ? 1 : 0) + (a[6] >= 3 ? 1 : 0), pts = ringPoints(s, lf, ev.x, ev.y, F.relay.raidR, n);
    pts.forEach((p, i) => { const e = mob(s, cfg.raid[(a[6] + i) % cfg.raid.length], p.x, p.y, 0.9, { lfRaid: 1 }); e.ex![FOE_BASE] = e.speed; ev.ids.push(e.id); }); a[6]++;
  }
  for (const e of raiders) {   // raiders go for the relay until a fighter gets close, then fight normally
    const me = nearest(fs, e.x, e.y), freed = !!(e.ex && e.ex.free);
    if (!freed && me && dist2(me.x, me.y, e.x, e.y) < F.relay.aggroP ** 2) { e.ex!.free = 1; e.speed = e.ex![FOE_BASE]; continue; }
    if (freed) continue; e.speed = 0; const dx = ev.x - e.x, dy = ev.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d > F.relay.contact * 0.8) slideMove(e, (dx / d) * e.ex![FOE_BASE] * 0.9, (dy / d) * e.ex![FOE_BASE] * 0.9, dt);
    if (d < F.relay.contact + e.radius) ev.hp -= e.damage * F.relay.dpsMul * dt;
  }
  if (ev.hp <= 0) { ev.hp = 0; release(); settle(s, ev, 'failed', escort ? 'The beacon was destroyed' : 'The relay was destroyed'); return say(s, 'relay', escort ? 'BEACON LOST' : 'RELAY LOST', 'It was overrun'); }
  if (ev.p >= 1) {
    release(); const sf = F.relay.surge, who = ev.parts.length ? ev.parts : near(fs, ev.x, ev.y, 600).map(f => f.slot);
    for (const i of who) { addFx(s, i, ev.id, 'boon', 'Relay Surge', 'relay', sf.dur, { speed: sf.speed, cdr: sf.cdr, dmg: sf.dmg }); heal(s, i, F.relay.heal); }
    crystals(s, ev.x, ev.y, F.relay.crystals); settle(s, ev, 'won', 'Relay Surge: speed, recharge, damage'); say(s, 'relay', escort ? 'BEACON DELIVERED' : 'RELAY CHARGED', 'Relay Surge for the party');
  } else if (s.time >= ev.ex) { release(); settle(s, ev, 'expired', 'The relay ran out of time'); say(s, 'relay', 'RELAY LOST', 'Out of time'); }
}
function echoPoint(_s: GameState, lf: LfState, ev: LfEvent, minFrom?: { x: number; y: number }, rim = 0.75): { x: number; y: number } {
  for (let i = 0; i < 24; i++) { const th = lf.rng!.between(0, TAU), d = Math.sqrt(lf.rng!.next()) * ev.r * rim, x = ev.x + Math.cos(th) * d, y = ev.y + Math.sin(th) * d; if (!blocked(x, y, 24) && (!minFrom || dist2(x, y, minFrom.x, minFrom.y) > 110 ** 2)) return { x, y }; }
  return { x: ev.x, y: ev.y };
}
function stepEcho(s: GameState, ev: LfEvent, fs: Fx[], dt: number) {
  const lf = s.lf!, a = ev.aux, hero = ev.hero!, E = F.echo, fail = (why: string) => { dissolve(s, ev.ids); settle(s, ev, 'failed', why); say(s, 'echo', 'THE ECHO FADES', why); };
  if (ev.st === 'idle') {
    if (s.time >= ev.ex) return settle(s, ev, 'expired', 'The echo faded unanswered');
    if (!ev.seen && near(fs, ev.x, ev.y, F.notice).length) { ev.seen = true; lf.stats.discovered++; }
    a[0] = near(fs, ev.x, ev.y, E.enterR).length ? a[0] + dt : Math.max(0, a[0] - dt * 2); ev.p = Math.min(1, a[0] / E.enterT);
    if (a[0] >= E.enterT) {
      ev.st = 'active'; ev.ta = s.time; a[2] = s.time; a[4] = s.time + 1.2; lf.stats.started++; ev.who = near(fs, ev.x, ev.y, E.enterR)[0]?.slot ?? 0;
      const limit = hero === 'kai' ? E.kai.dur + 14 : hero === 'ren' ? E.ren.orbs * (E.ren.orbT + 2) + 14 : hero === 'sora' ? 46 : E.vex.limit + 14; ev.ex = deadline(s, limit);
      const add = (k: MobKind, n: number) => { const pts = ringPoints(s, lf, ev.x, ev.y, ev.r + 40, n); for (const p of pts) if (room(s, 1)) ev.ids.push(mob(s, k, p.x, p.y, 1, { lfEcho: 1 }).id); };
      const base = ARENA_LF[s.arenaId].cache.ambush[0].kind;
      if (hero === 'kai') add(base, Math.round(3 * partyK(s))); else if (hero === 'ren') add(base, 2); else if (hero === 'sora') add(base, Math.round(3 * partyK(s)));
      else { const k = ARENA_LF[s.arenaId].elite.kinds[0], p = { x: ev.x, y: ev.y }; if (room(s, 1)) { const e = mob(s, k, p.x, p.y, 1.7 * (s.party ? 1.4 : 1), { lfEcho: 1, lfWard: 1 }); ev.ids.unshift(e.id); ev.hpMax = e.maxHp; ev.hp = e.hp; a[3] = 0; a[4] = s.time + E.vex.every; } }
      say(s, 'echo', `${BLESSINGS[hero].place.toUpperCase()}`, BLESSINGS[hero].trial);
    }
    return;
  }
  if (ev.st !== 'active') return;
  const inside = near(fs, ev.x, ev.y, ev.r + 40); for (const f of inside) a[10 + f.slot] += dt; a[1] = inside.length ? 0 : a[1] + dt;
  if (a[1] >= E.leave) return fail('You left the sigil');
  if (s.time >= ev.ex) return fail('The trial ran out of time');
  const t = s.time - a[2], win = () => { const note = payEcho(s, ev); settle(s, ev, 'won', note); say(s, 'echo', `${BLESSINGS[hero].name.toUpperCase()}`, `${BLESSINGS[hero].boon} · ${BLESSINGS[hero].dur} s`); };
  if (hero === 'kai') {
    ev.p = Math.min(1, t / E.kai.dur);
    if (s.time >= a[4] && a[3] < E.kai.waves) { a[3]++; a[4] = s.time + E.kai.every; for (let i = 0; i < E.kai.per; i++) { const p = echoPoint(s, lf, ev, undefined, 0.8); haz(s, ev, { shape: 'circle', x: p.x, y: p.y, r: E.kai.r, delay: E.kai.delay, damage: E.kai.dmg, tag: 'lf_ember' }); } }
    if (t >= E.kai.dur && inside.length) win();
  } else if (hero === 'ren') {
    if (a[7] <= 0 && a[8] < E.ren.orbs && s.time >= a[4]) { const p = echoPoint(s, lf, ev, a[8] > 0 ? { x: a[5], y: a[6] } : undefined, 0.78); a[5] = p.x; a[6] = p.y; a[7] = s.time + E.ren.orbT; for (let i = 0; i < E.ren.trap; i++) { const th = (i / E.ren.trap) * TAU + 0.9; haz(s, ev, { shape: 'circle', x: p.x + Math.cos(th) * 78, y: p.y + Math.sin(th) * 78, r: E.ren.r, delay: E.ren.delay + i * 0.5, damage: E.ren.dmg, tag: 'lf_trap' }); } }
    if (a[7] > 0) {
      ev.p = a[8] / E.ren.orbs;
      if (near(fs, a[5], a[6], E.ren.touch).length) { a[8]++; a[7] = 0; a[4] = s.time + 0.8; ev.p = a[8] / E.ren.orbs; if (a[8] >= E.ren.orbs) return win(); }
      else if (s.time >= a[7]) return fail('The spirit light faded');
    }
  } else if (hero === 'sora') {
    const S = E.sora, per = S.lanes * S.stagger + S.delay + 0.7;
    if (a[3] < S.cycles && s.time >= a[4]) { a[3]++; a[4] = s.time + per; for (let i = 0; i < S.lanes; i++) { const h = i % 2 === 0, off = (i < 2 ? -1 : 1) * (60 + 55 * (i % 3)) * (a[3] % 2 ? 1 : -1); haz(s, ev, { shape: 'rect', x: h ? ev.x : ev.x + off, y: h ? ev.y + off : ev.y, r: 0, w: h ? ev.r * 2 : S.w, h: h ? S.w : ev.r * 2, delay: S.delay + i * S.stagger, damage: S.dmg, tag: 'lf_lane', active: 0.5 }); } }
    ev.p = Math.min(1, t / (S.cycles * per + S.apexT));
    if (a[3] >= S.cycles && a[9] === 0 && s.time >= a[4] - 0.2) { const p = echoPoint(s, lf, ev, undefined, 0.85); a[5] = p.x; a[6] = p.y; a[7] = s.time + S.apexT; a[9] = 1; say(s, 'echo', 'THE APEX OPENS', 'Reach the marker'); }
    if (a[9] === 1) { if (near(fs, a[5], a[6], S.touch).length) return win(); if (s.time >= a[7]) return fail('The updraft closed'); }
  } else {
    const W = eliteEnemy(s, ev); ev.p = W ? 1 - W.hp / W.maxHp : 1; if (W) { ev.hp = W.hp; ev.hpMax = W.maxHp; ev.x = ev.x; }
    if (!W || W.hp <= 0) return win();
    if (s.time >= a[4]) { a[4] = s.time + E.vex.every; haz(s, ev, { shape: 'circle', x: W.x, y: W.y + groundDy(W.radius), r: E.vex.r, delay: E.vex.delay, damage: E.vex.dmg, tag: 'lf_oath' }); }
  }
}

/* ------------------------------------------------------------------ tick */
const STEP: Record<LfKind, (s: GameState, ev: LfEvent, fs: Fx[], dt: number) => void> = { rift: stepRift, shrine: stepShrine, cache: stepCache, elite: stepElite, relay: stepRelay, echo: stepEcho };
export function updateLiving(s: GameState, dt: number) {
  const lf = s.lf; if (!lf || lf.ended) return;
  lf.fx = lf.fx.filter(f => f.until > s.time);
  const slots = s.party ? s.party.slots.length : 1;
  for (let i = 0; i < slots; i++) {   // per-fighter timed effects that act each tick: regeneration and faster recharge
    if (!alive(s, i)) continue; const q = pl(s, i), r = lfRegen(lf.fx, i, s.time); if (r) q.hp = Math.min(q.maxHp, q.hp + r * dt);
    const k = lfCdr(s, i); if (k > 1) for (const key of COOLDOWNS) if (q[key] > 0) q[key] = Math.max(0, q[key] - dt * (k - 1));
    const kd = lfCdr(s, i, true); if (kd > 1 && q.dashCooldown > 0) q.dashCooldown = Math.max(0, q.dashCooldown - dt * (kd - 1));
  }
  const fs = fighters(s);
  for (const ev of lf.events) {
    if (LF_TERMINAL.includes(ev.st)) continue;
    if (!ev.seen && ev.kind !== 'cache' && ev.kind !== 'elite' && ev.kind !== 'echo' && near(fs, ev.x, ev.y, F.notice).length) { ev.seen = true; lf.stats.discovered++; }
    STEP[ev.kind](s, ev, fs, dt);
  }
  lf.events = lf.events.filter(ev => !LF_TERMINAL.includes(ev.st) || s.time - ev.ta < (ev.kind === 'elite' && ev.mod === 'volatile' ? 4 : 3.5));
  direct(s, lf);
}
/** The run ended (victory, defeat, extraction): everything still in flight is wound up, so no entity, hazard or marker outlives the run. Safe to call twice. */
export function endLiving(s: GameState) {
  const lf = s.lf; if (!lf || lf.ended) return; lf.ended = true;
  for (const ev of lf.events) if (!LF_TERMINAL.includes(ev.st)) { dissolve(s, ev.ids); const was = ev.st; settle(s, ev, 'ended', was === 'idle' ? 'Left behind when the run ended' : 'Unfinished when the run ended'); }
  s.hazards = s.hazards.filter(h => h.owner > -1000);
  lf.fx = [];
}

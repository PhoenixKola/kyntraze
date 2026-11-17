/** B22 Ascension Protocol: the authoritative effects of the 24 ability branches and the 12 legendary recipes. Everything is built from five bounded primitives (area, cone, line, chain, zone) so caps, boss limits and anti-recursion are enforced in ONE place. Effects fire from real events: a cast starting, or a real hit logged by CombatSystem. Nothing here is a renderer effect. */
import type { Enemy, GameState } from './GameState';
import { damageEnemy } from './CombatSystem';
import { slideMove } from './CollisionSystem';
import { isBoss } from '../content/enemies';
import { BEAM } from '../content/abilities';
import { REN, SORA } from '../content/heroKits';
import { b22Emit, bump, type ScheduledFx, type Zone } from '../b22/state';
import type { BranchId, Slot } from '../b22/branches';
import { BRANCH_BY_ID, BRANCH_RULES, branchesFor } from '../b22/branches';
import { LEGENDARY_BY_ID, eligibleLegendaries, type LegendaryId } from '../b22/legendary';
import { normalize } from '../core/Math';
import { emit } from './HeroSystem';

const alive = (e: Enemy) => e.hp > 0;
const FX_CAP = 40, ZONE_CAP = 12, BOSS_FX_FRAC = 0.045;
const has = (s: GameState, id: BranchId) => s.b22.branches.includes(id);
const legend = (s: GameState, id: LegendaryId) => s.b22.legendary.includes(id);
const q = (s: GameState) => s.player.qDamage;

/* ---------------------------------------------------------------- primitives */
/** Damage that can never re-trigger anything: flagged `fx`, boss damage capped to a fraction of its max hp per event. */
function hit(s: GameState, e: Enemy, dmg: number, area = true): boolean {
  const d = isBoss(e.kind) ? Math.min(dmg, e.maxHp * BOSS_FX_FRAC) : dmg;
  return damageEnemy(s, e, d, { area, fx: true });
}
function shove(e: Enemy, dx: number, dy: number, dist: number, stagger: number) {
  if (isBoss(e.kind) || e.hp <= 0) return; const d = Math.hypot(dx, dy) || 1;
  for (let i = 0; i < 4; i++) slideMove(e, dx / d * dist * 4, dy / d * dist * 4, 0.0625);
  if (stagger > 0) e.stagger = Math.max(e.stagger, stagger);
}
export function areaFx(s: GameState, x: number, y: number, r: number, dmg: number, push: number, stagger: number, cap: number, tag = 'area'): number {
  const c = s.enemies.filter(e => alive(e) && !e.part?.role.includes('decoy') && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.radius) ** 2).sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((b.x - x) ** 2 + (b.y - y) ** 2)).slice(0, cap);
  for (const e of c) { hit(s, e, dmg); if (push) shove(e, e.x - x, e.y - y, push / 4, stagger); else if (stagger) e.stagger = Math.max(e.stagger, stagger); }
  b22Emit(s.b22, tag, x, y, { n: r }); return c.length;
}
export function lineFx(s: GameState, x0: number, y0: number, x1: number, y1: number, w: number, dmg: number, cap: number, tag = 'line', exclude?: Set<number>): number {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; const hits: Enemy[] = [];
  for (const e of s.enemies) { if (!alive(e) || exclude?.has(e.id)) continue; const ex = e.x - x0, ey = e.y - y0, along = ex * ux + ey * uy, across = Math.abs(-ex * uy + ey * ux); if (along >= -e.radius && along <= L + e.radius && across <= w / 2 + e.radius) hits.push(e); }
  hits.sort((a, b) => ((a.x - x0) ** 2 + (a.y - y0) ** 2) - ((b.x - x0) ** 2 + (b.y - y0) ** 2));
  for (const e of hits.slice(0, cap)) { hit(s, e, dmg); exclude?.add(e.id); }
  b22Emit(s.b22, tag, x0, y0, { x2: x1, y2: y1, n: w }); return Math.min(cap, hits.length);
}
export function coneFx(s: GameState, x: number, y: number, ang: number, arcRad: number, r: number, dmg: number, push: number, stagger: number, cap: number, tag = 'cone'): number {
  const c = s.enemies.filter(e => { if (!alive(e)) return false; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > r + e.radius) return false; let da = Math.atan2(dy, dx) - ang; da = Math.atan2(Math.sin(da), Math.cos(da)); return d < 30 || Math.abs(da) <= arcRad / 2; }).slice(0, cap);
  for (const e of c) { hit(s, e, dmg); if (push) shove(e, e.x - x, e.y - y, push / 4, stagger); }
  b22Emit(s.b22, tag, x, y, { x2: x + Math.cos(ang) * r, y2: y + Math.sin(ang) * r, n: arcRad }); return c.length;
}
/** Chains from `from` to up to `n` other living foes within `range`, each at most once (the `used` set), never back to the source. */
export function chainFx(s: GameState, from: { x: number; y: number }, n: number, dmg: number, range: number, used: Set<number>, tag = 'chain'): number {
  let k = 0, cur = from;
  for (let i = 0; i < n; i++) {
    let best: Enemy | null = null, bd = range * range;
    for (const e of s.enemies) { if (!alive(e) || used.has(e.id) || e.part?.role === 'decoy') continue; const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2; if (d < bd) { bd = d; best = e; } }
    if (!best) break; used.add(best.id); hit(s, best, dmg, false); b22Emit(s.b22, tag, cur.x, cur.y, { x2: best.x, y2: best.y }); cur = best; k++;
  }
  return k;
}
export function schedule(s: GameState, f: Omit<ScheduledFx, 'id'>) { if (s.b22.fx.length < FX_CAP) s.b22.fx.push({ id: s.nextId++, ...f }); }
export function zoneFx(s: GameState, z: Omit<Zone, 'id' | 't' | 'next'>) { if (s.b22.zones.length < ZONE_CAP) s.b22.zones.push({ id: s.nextId++, t: 0, next: z.tick, ...z }); }

/* ---------------------------------------------------------------- which slot a hit belongs to */
export function slotOfAct(s: GameState): Slot | null {
  const c = s.cast, h = s.hx.act;
  if (c) return c.kind === 'beam' || c.kind === 'dragon' || c.kind === 'rift' ? 'e' : 'r';
  if (h) { switch (h.act) { case 'crimson_break': case 'azure_volley': case 'parry_halo': return 'q'; case 'meteor_rush': case 'celestial_lance': case 'rift_reversal': return 'e'; case 'bloodstar': case 'zero_horizon': case 'oathbreaker_seal': return 'r'; default: return null; } }
  return null;
}

/* ---------------------------------------------------------------- choosing branches / recipes */
/** Is a branch due for this hero now? Earned: the slot's level AND enough casts of that skill this run. */
export function dueBranch(s: GameState): Slot | null {
  const b = s.b22; if (b.branchOffer) return null;
  for (const slot of ['q', 'e', 'r'] as const) if (!b.branchDone.includes(slot) && s.player.level >= BRANCH_RULES[slot].level && b.casts[slot] >= BRANCH_RULES[slot].casts) return slot;
  return null;
}
export function offerBranch(s: GameState): boolean {
  const slot = dueBranch(s); if (!slot) return false; const [a, b] = branchesFor(s.hero, slot);
  s.b22.branchOffer = { slot, a: a.id, b: b.id }; return true;
}
export function chooseBranch(s: GameState, id: BranchId): boolean {
  const o = s.b22.branchOffer; if (!o || (o.a !== id && o.b !== id) || s.phase !== 'upgrade') return false;
  const def = BRANCH_BY_ID[id], t = def.tradeoff, p = s.player;
  if (t.qDamage) p.qDamage *= t.qDamage; if (t.beamDamage) s.mods.beamDamage *= t.beamDamage; if (t.sphereDamage) s.mods.sphereDamage *= t.sphereDamage; if (t.beamCd) s.mods.beamCd *= t.beamCd; if (t.sphereCd) s.mods.sphereCd *= t.sphereCd; if (t.sphereRadius) s.mods.sphereRadius *= t.sphereRadius; if (t.beamWidth) s.mods.beamWidth *= t.beamWidth; if (t.qCd) p.qCooldown = Math.max(p.qCooldown, 0);
  if (id === 'seismic_impact') p.qRadius *= 0.85; if (id === 'celestial_collapse') s.mods.sphereDamage *= 0.6;
  s.b22.branches.push(id); s.b22.branchDone.push(def.slot); s.b22.branchOffer = null; s.phase = 'running'; return true;
}
export function offerLegendary(s: GameState): LegendaryId | null {
  const e = eligibleLegendaries(s.hero, s.upgradeStacks, s.b22.legendary, s.run.banished as string[]); if (!e.length) return null;
  if (!s.b22.legendOffer) s.b22.legendOffer = e[0].id; return s.b22.legendOffer;
}
export function chooseLegendary(s: GameState, id: LegendaryId): boolean {
  if (s.b22.legendOffer !== id || s.phase !== 'upgrade' || s.b22.legendary.includes(id)) return false;
  s.b22.legendary.push(id); s.b22.legendOffer = null; s.upgradeOffers = []; s.phase = 'running'; b22Emit(s.b22, 'legend_gain', s.player.x, s.player.y, { tag: id }); void LEGENDARY_BY_ID; return true;
}

/* ---------------------------------------------------------------- casts */
let seq = 0;
/** A Q / E / R actually started. Counts the cast (this is what makes a branch "earned") and fires its immediate / scheduled effects. */
export function onCast(s: GameState, slot: Slot) {
  const p = s.player, b = s.b22, at = s.time; b.casts[slot]++; bump(b, `cast.${slot}`);
  const c = s.cast, h = s.hx.act, dir = c ? { x: c.dirX, y: c.dirY } : h ? { x: h.dirX, y: h.dirY } : normalize(p.aimX, p.aimY);
  const ang = Math.atan2(dir.y, dir.x);
  if (c?.kind === 'dragon') bump(b, 'dragon.cast');
  b.castHits = []; b.castId = ++seq;
  // ---- Kai
  if (s.hero === 'kai') {
    if (slot === 'q') {
      if (has(s, 'seismic_impact')) for (const k of [1, 2]) schedule(s, { at: at + 0.25 * k, kind: 'area', x: p.x, y: p.y, r: p.qRadius * 0.85, dmg: q(s) * 0.45, push: 40, stagger: 0.5, cap: 8, src: 'seismic_impact' });
      if (has(s, 'pressure_wave')) coneFx(s, p.x, p.y, ang, (70 * Math.PI) / 180, 230, q(s) * 0.5, 150, 0.8, 8, 'pressure_wave');
    } else if (slot === 'e') {
      if (has(s, 'burning_wake')) zoneFx(s, { kind: 'line', x: p.x, y: p.y, x2: p.x + dir.x * (c?.kind === 'beam' ? BEAM.length : 300), y2: p.y + dir.y * (c?.kind === 'beam' ? BEAM.length : 300), r: 30, dur: 2.4, tick: 0.3, dmg: q(s) * 0.3 * s.mods.beamDamage, push: 0, src: 'burning_wake' });
      if (legend(s, 'solar_rupture')) schedule(s, { at: at + 0.6, kind: 'line', x: p.x, y: p.y, x2: p.x + dir.x * 520, y2: p.y + dir.y * 520, r: 0, w: 70, dmg: q(s) * 0.9, push: 0, stagger: 0, cap: 6, src: 'solar_rupture' });
    } else if (slot === 'r') {
      const tx = c?.tx ?? p.x, ty = c?.ty ?? p.y, R = 190 * s.mods.sphereRadius;
      if (has(s, 'twin_nova')) { schedule(s, { at: at + 0.3, kind: 'nova', x: tx, y: ty, r: R * 0.7, dmg: q(s) * 0.7 * s.mods.sphereDamage, push: 60, stagger: 0.3, cap: 12, src: 'twin_nova' }); schedule(s, { at: at + 0.75, kind: 'nova', x: tx, y: ty, r: R, dmg: q(s) * 0.7 * s.mods.sphereDamage, push: 60, stagger: 0.3, cap: 12, src: 'twin_nova' }); }
    }
  }
  // ---- Ren
  if (s.hero === 'ren') {
    if (slot === 'q' && has(s, 'crimson_guardbreak')) schedule(s, { at: at + REN.q.beats * REN.q.gap + 0.35, kind: 'cone', x: p.x, y: p.y, ang, r: 135, w: (100 * Math.PI) / 180, dmg: q(s) * 1.4, push: 120, stagger: 1.0, cap: 6, src: 'crimson_guardbreak', tag: 'guardbreak' });
    if (slot === 'e' && legend(s, 'meteor_crucible')) b.legendMisc.crucible = 1;
  }
  // ---- Sora
  if (s.hero === 'sora') {
    if (slot === 'q' && has(s, 'needle_spiral')) for (let i = 0; i < 6; i++) { const a = ang + (i - 2.5) * 0.35; s.hx.bolts.push({ id: s.nextId++, x: p.x, y: p.y - 10, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, ttl: 1.3, damage: q(s) * 0.18, radius: 7, kind: 'volley', pierce: 0, hits: [], homing: 0.1, form: p.form }); }
  }
  // ---- relic: Echo Lens + Skyforge Feather ride on every cast
  relicOnCast(s, slot, ang);
}
function relicOnCast(s: GameState, slot: Slot, ang: number) {
  const b = s.b22, p = s.player;
  if (b.relics.includes('echo_lens') && (b.relicCd.echo_lens ?? 0) <= 0) {
    const t = s.enemies.filter(alive).sort((x, y) => (x.x - p.x) ** 2 + (x.y - p.y) ** 2 - ((y.x - p.x) ** 2 + (y.y - p.y) ** 2))[0];
    if (t && (t.x - p.x) ** 2 + (t.y - p.y) ** 2 < 420 ** 2) { b.relicCd.echo_lens = 4; schedule(s, { at: s.time + 0.6, kind: 'area', x: t.x, y: t.y, r: 90, dmg: q(s) * 0.35, push: 0, stagger: 0, cap: 4, src: 'echo_lens', tag: 'echo_warn' }); b22Emit(b, 'echo_warn', t.x, t.y, { n: 90 }); }
  }
  if (slot === 'e' && b.featherArmed > 0) { b.featherArmed = 0; b.featherBoost = s.time + 1.4; b.relicCd.skyforge_feather = 6; b22Emit(b, 'feather', p.x, p.y, { n: ang }); }
}

/* ---------------------------------------------------------------- per real hit (called from the post-damage hook) */
export function onHitLogged(s: GameState, e: Enemy, dmg: number, slot: Slot | null) {
  const b = s.b22, p = s.player;
  if (slot && !b.castHits.includes(e.id)) b.castHits.push(e.id);
  if (slot === 'e' && s.hero === 'kai' && has(s, 'prism_conductor') && (b.legendMisc.chainFor ?? -1) !== e.id) { const used = new Set<number>([e.id, ...b.castHits]); chainFx(s, e, 2, dmg * 0.4, 280, used, 'prism_chain'); b.legendMisc.chainN = (b.legendMisc.chainN ?? 0) + 1; }
  if (slot === 'e' && s.hero === 'ren' && has(s, 'bloodline_relay') && (b.legendMisc.relayN ?? 0) < 3) { const used = new Set<number>([e.id, ...b.castHits]); if (chainFx(s, e, 1, dmg * 0.6, 300, used, 'relay')) b.legendMisc.relayN = (b.legendMisc.relayN ?? 0) + 1; }
  if (slot === 'q' && s.hero === 'ren' && has(s, 'relentless_chain') && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 150 ** 2) { b.legendMisc.chainHits = (b.legendMisc.chainHits ?? 0) + 1; if (b.legendMisc.chainHits % 3 === 0 && (b.legendMisc.extraBeats ?? 0) < 3) { b.legendMisc.extraBeats = (b.legendMisc.extraBeats ?? 0) + 1; areaFx(s, p.x, p.y, 120, q(s) * 0.22, 40, 0.2, 6, 'relentless_beat'); } }
  if (slot === 'e' && s.hero === 'sora' && has(s, 'celestial_prism') && e === s.enemies.find(x => x.id === b.castHits[0]) && (b.legendMisc.fanned ?? -1) !== b.castId) {
    b.legendMisc.fanned = b.castId ?? 0; const c = s.enemies.filter(x => alive(x) && x !== e && (x.x - e.x) ** 2 + (x.y - e.y) ** 2 < 520 ** 2).sort((x, y) => (x.x - e.x) ** 2 + (x.y - e.y) ** 2 - ((y.x - e.x) ** 2 + (y.y - e.y) ** 2)).slice(0, 3);
    for (const t of c) { hit(s, t, dmg * 0.5, false); b22Emit(b, 'prism_fan', e.x, e.y, { x2: t.x, y2: t.y }); }
  }
  if (slot === 'q' && s.hero === 'kai' && false) void 0;
}
/** Sora auto needles: the 4th landed needle splits into two seeking fragments (cooldown 1.2 s). */
export function onNeedleHit(s: GameState, e: Enemy, dmg: number) {
  const b = s.b22; if (!legend(s, 'blue_needle_storm')) return;
  b.legendMisc.needles = (b.legendMisc.needles ?? 0) + 1; if (b.legendMisc.needles % 4 !== 0 || s.time - (b.legendCd.blue_needle_storm ?? -9) < 1.2) return;
  b.legendCd.blue_needle_storm = s.time;
  for (const sgn of [-1, 1]) { const a = Math.atan2(s.player.y - e.y, s.player.x - e.x) + Math.PI + sgn * 0.8; s.hx.bolts.push({ id: s.nextId++, x: e.x, y: e.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, ttl: 0.7, damage: dmg * 0.4, radius: 6, kind: 'needle', pierce: 0, hits: [e.id], homing: 0.14, form: s.player.form }); }
  b22Emit(b, 'needle_split', e.x, e.y);
}

/* ---------------------------------------------------------------- ability events (real sim events) */
export function onAbilityEvent(s: GameState, kind: string, x: number, y: number, n: number | undefined) {
  const p = s.player, b = s.b22, h = s.hx.act, ang = h ? Math.atan2(h.dirY, h.dirX) : Math.atan2(p.aimY, p.aimX);
  switch (kind) {
    case 'bloodstar_slam': {
      if (has(s, 'red_comet_rain')) { const c = s.enemies.filter(alive).filter(e => (e.x - x) ** 2 + (e.y - y) ** 2 < 340 ** 2).sort((a, c2) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((c2.x - x) ** 2 + (c2.y - y) ** 2)).slice(0, 4); c.forEach((e, i) => schedule(s, { at: s.time + 0.25 * (i + 1), kind: 'area', x: e.x, y: e.y, r: 72, dmg: q(s) * 0.4 * s.mods.sphereDamage, push: 30, stagger: 0.3, cap: 4, src: 'red_comet_rain', tag: `follow:${e.id}`, hit: [e.id] })); }
      if (has(s, 'crimson_crater')) zoneFx(s, { kind: 'ring', x, y, x2: x, y2: y, r: REN.r.radius * s.mods.sphereRadius * 0.9, dur: 3.5, tick: 0.5, dmg: q(s) * 0.25, push: 40, src: 'crimson_crater' });
      if (legend(s, 'bloodstar_rupture')) zoneFx(s, { kind: 'circle', x, y, x2: x, y2: y, r: 150, dur: 4, tick: 0.4, dmg: q(s) * 0.2, push: 50, src: 'bloodstar_rupture' });
      break;
    }
    case 'rush_end': {
      if (has(s, 'meteor_collision')) areaFx(s, p.x, p.y, 130, q(s) * 1.2, 200, 0.6, 8, 'collision');
      if (legend(s, 'meteor_crucible') && h) { zoneFx(s, { kind: 'line', x: h.sx, y: h.sy, x2: p.x, y2: p.y, r: 36, dur: 2.4, tick: 0.3, dmg: q(s) * 0.3, push: 0, src: 'meteor_crucible' }); areaFx(s, p.x, p.y, 120, q(s) * 0.8, 160, 0.4, 8, 'crucible_burst'); }
      break;
    }
    case 'rush_strike': bump(b, 'rush.strike.form', s.player.form ? 1 : 0); break;
    case 'dragon_end': { if (s.cast && s.cast.hits.length >= 3) bump(b, 'dragon.multi'); if (legend(s, 'dragon_overture')) dragonOverture(s); break; }
    case 'sphere_burst': case 'comet_fire': {
      if (s.hero === 'kai') {
        if (has(s, 'starfall_bloom') && kind === 'sphere_burst') { const c = s.enemies.filter(alive).filter(e => (e.x - x) ** 2 + (e.y - y) ** 2 < 260 ** 2).slice(0, 3); c.forEach((e, i) => schedule(s, { at: s.time + 0.8 + 0.12 * i, kind: 'area', x: e.x, y: e.y, r: 85, dmg: q(s) * 0.4 * s.mods.sphereDamage, push: 40, stagger: 0.3, cap: 5, src: 'starfall_bloom', tag: `follow:${e.id}`, hit: [e.id] })); }
        if (legend(s, 'nova_constellation') && kind === 'sphere_burst' && s.mods.sphereEcho >= 2 && (b.legendMisc.constellation ?? -1) !== (b.castId ?? 0)) {
          b.legendMisc.constellation = b.castId ?? 0; for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4, r = 120 + 40 * (i % 2); schedule(s, { at: s.time + 0.5 + 0.12 * i, kind: 'nova', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, r: 62, dmg: q(s) * 0.3, push: 0, stagger: 0, cap: 6, src: 'nova_constellation' }); }
        }
      }
      break;
    }
    case 'lance_fire': {
      if (s.hero === 'sora') {
        const tier = h?.tier ?? 0; const dmg = SORA.e.damage[tier] * s.mods.beamDamage;
        if (tier >= 2 && p.form) bump(b, 'lance.t3.form');
        if (has(s, 'piercing_meridian') && h) lineFx(s, h.sx, h.sy, h.sx + h.dirX * 1000, h.sy + h.dirY * 1000, 22, dmg * 0.7, 12, 'meridian');
        if (legend(s, 'prismatic_meridian') && h) zoneFx(s, { kind: 'line', x: h.sx, y: h.sy, x2: h.sx + h.dirX * 700, y2: h.sy + h.dirY * 700, r: 24, dur: 0.8, tick: 0.2, dmg: dmg * 0.25, push: 0, src: 'prismatic_meridian' });
      }
      break;
    }
    case 'lance_pulse': { maxN(b, 'lance.pierce', n ?? 0); break; }
    case 'lance_end': { if (legend(s, 'prismatic_meridian')) { const ids = b.castHits.slice(0, 5); for (let i = 0; i + 1 < ids.length && i < 4; i++) { const a = s.enemies.find(e => e.id === ids[i]), c2 = s.enemies.find(e => e.id === ids[i + 1]); if (a && c2 && alive(a) && alive(c2) && (a.x - c2.x) ** 2 + (a.y - c2.y) ** 2 < 300 ** 2) { hit(s, c2, SORA.e.damage[1] * 0.35, false); b22Emit(b, 'arc', a.x, a.y, { x2: c2.x, y2: c2.y }); } } } break; }
    case 'horizon_converge': {
      if (has(s, 'celestial_collapse') || legend(s, 'zero_convergence')) { const o = s.hx.orbs; if (o.length) { const { cx, cy } = densestOrbTarget(s); schedule(s, { at: s.time + 0.5, kind: 'nova', x: cx, y: cy, r: (legend(s, 'zero_convergence') ? 125 : 150) * s.mods.sphereRadius, dmg: q(s) * (legend(s, 'zero_convergence') ? 2.8 : 2.2), push: 120, stagger: 0.6, cap: 16, src: legend(s, 'zero_convergence') ? 'zero_convergence' : 'celestial_collapse', tag: 'collapse_blast' }); } }
      break;
    }
    case 'horizon_burst': { if (has(s, 'starfield_array') && s.b22.zones.filter(z => z.src === 'starfield_array').length < 5) zoneFx(s, { kind: 'circle', x, y, x2: x, y2: y, r: 80, dur: 3, tick: 0.5, dmg: q(s) * 0.2, push: 0, src: 'starfield_array' }); break; }
    case 'evasion': bump(b, 'evade.count'); break;
    case 'auto_finisher': {
      if (legend(s, 'crimson_relay') && s.hero === 'ren' && s.time - (b.legendCd.crimson_relay ?? -9) > 4) {
        const struck = new Set(b.hits.map(h2 => h2.id)); const c = s.enemies.filter(alive).filter(e => !struck.has(e.id) && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 280 ** 2).sort((a, c2) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((c2.x - p.x) ** 2 + (c2.y - p.y) ** 2))[0];
        if (c) { b.legendCd.crimson_relay = s.time; const d = normalize(c.x - p.x, c.y - p.y); slideMove(p, d.x * 520, d.y * 520, 0.12); hit(s, c, p.attackDamage * 2.4, false); b22Emit(b, 'relay_dash', p.x, p.y, { x2: c.x, y2: c.y }); }
      }
      break;
    }
    default: break;
  }
  void ang; void x; void y;
}
/** The orb target with the most living foes around it: a precision blast goes where it matters, not at the average of the orbs. */
export function densestOrbTarget(s: GameState): { cx: number; cy: number } {
  const o = s.hx.orbs; let best = { cx: o[0].tx, cy: o[0].ty }, bn = -1; const R = s.hx.orbRadius * 1.3 || 120;
  for (const q2 of o) { let n = 0; for (const e of s.enemies) if (e.hp > 0 && (e.x - q2.tx) ** 2 + (e.y - q2.ty) ** 2 <= (R + e.radius) ** 2) n++; if (n > bn) { bn = n; best = { cx: q2.tx, cy: q2.ty }; } }
  return best;
}
const maxN = (b: GameState['b22'], key: string, v: number) => { if (v > (b.m[key] ?? 0)) b.m[key] = v; };
function dragonOverture(s: GameState) {
  const b = s.b22; if (s.time - (b.legendCd.dragon_overture ?? -9) < 5) return; b.legendCd.dragon_overture = s.time;
  const p = s.player, c = s.enemies.filter(alive).sort((a, c2) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((c2.x - p.x) ** 2 + (c2.y - p.y) ** 2)).slice(0, 3);
  c.forEach((e, i) => schedule(s, { at: s.time + 0.15 * (i + 1), kind: 'strike', x: e.x, y: e.y, r: 70, dmg: q(s) * 0.7, push: 60, stagger: 0.3, cap: 3, src: 'dragon_overture', tag: `follow:${e.id}`, hit: [e.id] }));
}

/* ---------------------------------------------------------------- per tick */
export function updateFx(s: GameState, dt: number) {
  const b = s.b22;
  if (b.fx.length) {
    const due = b.fx.filter(f => f.at <= s.time); b.fx = b.fx.filter(f => f.at > s.time);
    for (const f of due) {
      let x = f.x, y = f.y; if (f.hit?.length) { const t = s.enemies.find(e => e.id === f.hit![0] && alive(e)); if (t) { x = t.x; y = t.y; } }
      if (f.kind === 'cone') coneFx(s, f.x, f.y, f.ang ?? 0, f.w ?? 1.2, f.r, f.dmg, f.push, f.stagger, f.cap, f.tag ?? 'cone');
      else if (f.kind === 'line') lineFx(s, f.x, f.y, f.x2 ?? f.x, f.y2 ?? f.y, f.w ?? 40, f.dmg, f.cap, f.tag ?? 'line');
      else { const n = areaFx(s, x, y, f.r, f.dmg, f.push, f.stagger, f.cap, f.tag?.startsWith('follow') ? 'follow_burst' : f.kind === 'nova' ? 'nova_fx' : (f.tag ?? 'area')); void n; }
      emit(s, f.src.includes('rupture') || f.src.includes('overture') || f.src === 'solar_rupture' ? 'legend_fx' : 'branch_fx', x, y, f.cap);
    }
  }
  if (b.zones.length) {
    for (const z of b.zones) {
      z.t += dt; z.next -= dt;
      if (z.next > 0) continue; z.next += z.tick;
      for (const e of s.enemies) {
        if (!alive(e)) continue; let inside = false, ex = e.x, ey = e.y;
        if (z.kind === 'line') { const dx = z.x2 - z.x, dy = z.y2 - z.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, along = (ex - z.x) * ux + (ey - z.y) * uy, across = Math.abs(-(ex - z.x) * uy + (ey - z.y) * ux); inside = along >= -e.radius && along <= L + e.radius && across <= z.r + e.radius; }
        else if (z.kind === 'circle') inside = (ex - z.x) ** 2 + (ey - z.y) ** 2 <= (z.r + e.radius) ** 2;
        else { const d = Math.hypot(ex - z.x, ey - z.y); inside = d <= z.r + e.radius && d >= z.r * 0.55; }
        if (!inside) continue; hit(s, e, z.dmg);
        if (z.push) { if (z.kind === 'circle' || z.kind === 'ring') shove(e, ex - z.x, ey - z.y, z.push / 4, 0.1); }
      }
    }
    b.zones = b.zones.filter(z => z.t < z.dur);
  }
}

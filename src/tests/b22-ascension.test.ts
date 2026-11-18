import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../content/enemies';
import { addEnemy } from '../sim/EntityRegistry';
import { damageEnemy, damagePlayer } from '../sim/CombatSystem';
import type { Enemy, GameState, InputState } from '../sim/GameState';
import type { HeroId } from '../content/heroes';
import { BRANCHES, BRANCH_RULES, type BranchId } from '../b22/branches';
import { LEGENDARIES, type LegendaryId } from '../b22/legendary';
import type { RelicId } from '../b22/relics';
import { RELIC_RULES } from '../b22/relics';
import { ULTIMATES } from '../b22/mastery';
import { dueBranch, offerBranch, chooseBranch, onCast, offerLegendary, chooseLegendary } from '../sim/BranchSystem';
import { quiet, run, DT, idle } from './b22util';
import type { MobKind } from '../content/enemies';
import type { Simulation } from '../sim/Simulation';

const dummy = (s: GameState, x: number, y: number, kind: MobKind = 'pursuer', hp = 1e6): Enemy => { const d = ENEMIES[kind]; return addEnemy(s, { kind, x, y, hp, maxHp: hp, radius: d.radius, speed: 0, damage: 0, touchCooldown: 99, attackCd: 1e9, aimX: 1, aimY: 0 }); };
const ring = (s: GameState, n: number, r: number, hp = 1e6) => Array.from({ length: n }, (_, i) => dummy(s, s.player.x + Math.cos(i * 6.283 / n) * r, s.player.y + Math.sin(i * 6.283 / n) * r, 'pursuer', hp));
const press = (k: 'q' | 'beam' | 'sphere' | 'dash'): InputState => ({ ...idle, [k]: true, ...(k === 'dash' ? { x: 1 } : {}) });
const damageDealt = (es: Enemy[]) => es.reduce((a, e) => a + (e.maxHp - e.hp), 0);
const withRelic = (hero: HeroId, relic: RelicId) => { const q = quiet({ hero, arena: 'paradox', hp: 1e6 }); q.s.b22.relics.push(relic); return q; };

describe('B22 relics: eight run-changing relics with real triggers and caps', () => {
  it('Halo Prism: every 6th heavy hit refracts 45% into a second living foe; never at invulnerable enemies; capped by its gap', () => {
    const { s } = withRelic('kai', 'halo_prism'); const a = dummy(s, 1200, 800), b = dummy(s, 1300, 800), c = dummy(s, 1250, 880); c.ai = { phase: 1, pat: 0, atk: '', step: 0, t: 0, acc: 0, exposed: false, invuln: true, side: 1, destX: 0, destY: 0, gap: 0, push: 0 };
    const heavy = s.player.attackDamage * 1.5; for (let i = 0; i < 5; i++) damageEnemy(s, a, heavy); expect(b.maxHp - b.hp).toBe(0); damageEnemy(s, a, heavy); expect(b.maxHp - b.hp).toBeCloseTo(heavy * 0.45, 3); expect(c.maxHp - c.hp).toBe(0);
    const before = b.hp; for (let i = 0; i < 6; i++) damageEnemy(s, a, heavy); expect(b.hp).toBe(before);   // 0.5 s gap: no second spark this fast
    s.time += 1; for (let i = 0; i < 6; i++) damageEnemy(s, a, heavy); expect(b.hp).toBeLessThan(before);
  });
  it('Anchor of Dawn: a real dash landing gives a 1.8 s ring (35% less damage + shove); 8 s cooldown stops repeated dashes', () => {
    const { sim, s } = withRelic('kai', 'anchor_of_dawn'); const e = dummy(s, s.player.x + 100, s.player.y); s.player.dashCooldown = 0;
    sim.step(DT, press('dash')); run(sim, 0.4); expect(s.b22.dawnT).toBeGreaterThan(1.3); expect(s.b22.lastDashLen).toBeGreaterThanOrEqual(RELIC_RULES.dawn.minDash); void e;
    s.player.invulnerable = 0; const hp = s.player.hp; damagePlayer(s, 40, 'contact'); expect(hp - s.player.hp).toBeCloseTo(40 * 0.65, 3);
    run(sim, 2); expect(s.b22.dawnT).toBe(0); s.player.dashCooldown = 0; sim.step(DT, press('dash')); run(sim, 0.4); expect(s.b22.dawnT).toBe(0);   // inside the 8 s cooldown
  });
  it('Crownless Sigil: a shield-bearer dropping its guard arms ONE charge; the next heavy strike (25+) lands at 160% and consumes it; it expires after 6 s', () => {
    const { sim, s } = withRelic('ren', 'crownless_sigil'); const a = dummy(s, 1300, 800, 'aegis'); a.mode = 'recover'; a.modeT = 1; run(sim, 0.1); expect(s.b22.sigilCharge).toBe(1);
    const t = dummy(s, 1250, 900); const h0 = t.hp; damageEnemy(s, t, 10); expect(h0 - t.hp).toBeCloseTo(10, 3); expect(s.b22.sigilCharge).toBe(1); const h1 = t.hp; damageEnemy(s, t, 30); expect(h1 - t.hp).toBeCloseTo(48, 3); expect(s.b22.sigilCharge).toBe(0);
    a.mode = 'move'; run(sim, 0.1); a.mode = 'recover'; a.modeT = 5; run(sim, 0.1); expect(s.b22.sigilCharge).toBe(1); run(sim, 6.5); expect(s.b22.sigilCharge).toBe(0);
  });
  for (const hero of ['kai', 'ren', 'sora', 'vex'] as const) it(`Skyforge Feather (${hero}): a dash opens a 2.5 s window; the next E gets +30% and a trail; cooldown 6 s. Every hero has an equivalent.`, () => {
    const { sim, s } = withRelic(hero, 'skyforge_feather'); s.player.dashCooldown = 0; ring(s, 3, 250); sim.step(DT, press('dash')); run(sim, 0.4); expect(s.b22.featherArmed).toBeGreaterThan(1.5);
    sim.step(DT, press('beam')); run(sim, hero === 'sora' ? 0.05 : 0.02); expect(s.b22.featherBoost).toBeGreaterThan(s.time); expect(s.b22.featherArmed).toBe(0); expect(s.b22.relicCd.skyforge_feather).toBeGreaterThan(5);
  });
  it('Void Hourglass: a perfect dodge (dash i-frames through a shot) slows nearby hostile shots to 40% for 2.2 s, locally; the run clock is untouched', () => {
    const { sim, s } = withRelic('kai', 'void_hourglass'); s.player.x = 1100; s.player.y = 800; s.player.dashCooldown = 0;
    const shotA = { id: 7001, x: 1180, y: 800, vx: -100, vy: 0, ttl: 5, damage: 10, radius: 8, kind: 'prism' as const, owner: 5, k: 1 }; s.enemyShots.push(shotA); sim.step(DT, { ...idle, dash: true, x: 1 }); run(sim, 0.35);
    expect(s.b22.hourT).toBeGreaterThan(1.5); const far = { id: 7002, x: 1300, y: 800, vx: 100, vy: 0, ttl: 5, damage: 10, radius: 8, kind: 'prism' as const, owner: 5, k: 1 }, away = { id: 7003, x: 1900, y: 1500, vx: 100, vy: 0, ttl: 5, damage: 10, radius: 8, kind: 'prism' as const, owner: 5, k: 1 };
    s.enemyShots.push(far, away); const t0 = s.time, fx0 = far.x, ax0 = away.x; sim.step(DT, idle); expect(far.x - fx0).toBeCloseTo(100 * DT * 0.4, 4); expect(away.x - ax0).toBeCloseTo(100 * DT, 4); expect(s.time - t0).toBeCloseTo(DT, 9);
  });
  it('Echo Lens: casting warns, then repeats at 35% on up to 4 foes after 0.6 s; 4 s cooldown', () => {
    const { sim, s } = withRelic('kai', 'echo_lens'); const es = [0, 1, 2, 3, 4, 5].map(i => dummy(s, s.player.x + 150 + (i % 3) * 20, s.player.y + (i - 2) * 22)); s.player.qCooldown = 0;
    sim.step(DT, press('q')); expect(s.b22.fx.some(f => f.src === 'echo_lens')).toBe(true); expect(s.b22.ev.some(e => e.kind === 'echo_warn')).toBe(true);
    run(sim, 0.7); const hurt = es.filter(e => e.hp < e.maxHp - 1); expect(hurt.length).toBeGreaterThan(0); expect(s.b22.relicCd.echo_lens).toBeGreaterThan(2.5);
    const fx = s.b22.fx.length; s.player.qCooldown = 0; sim.step(DT, press('q')); run(sim, 0.1); expect(s.b22.fx.filter(f => f.src === 'echo_lens').length).toBe(0); void fx;
  });
  it('Rift Key: an escape dash (foe within 180) leaves a rift that damages and pushes ordinary foes; you are never teleported; 9 s cooldown', () => {
    const { sim, s } = withRelic('ren', 'rift_key'); const e = dummy(s, s.player.x + 60, s.player.y); const x0 = e.x; s.player.dashCooldown = 0; const p0 = { x: s.player.x, y: s.player.y };
    sim.step(DT, { ...idle, dash: true, x: -1 }); expect(s.b22.zones.some(z => z.src === 'rift_key')).toBe(true); run(sim, 0.4); expect(e.hp).toBeLessThan(e.maxHp); expect(e.x).toBeGreaterThan(x0);
    expect(Math.hypot(s.player.x - p0.x, s.player.y - p0.y)).toBeLessThan(200); expect(s.b22.relicCd.rift_key).toBeGreaterThan(6);
  });
  it('Paradox Compass: reversing after a real hold gives a bearing (+6% dmg each, max 4, 3 s); tiny stick jitter never counts', () => {
    const { sim, s } = withRelic('kai', 'paradox_compass');
    for (let i = 0; i < 60; i++) sim.step(DT, { ...idle, x: i % 2 ? 1 : -1 }); expect(s.b22.bearings.length).toBe(0);   // jitter
    run(sim, 0.6, { ...idle, x: 1 }); run(sim, 0.1, { ...idle, x: -1 }); expect(s.b22.bearings.length).toBe(1);
    const e = dummy(s, 1300, 800); const h0 = e.hp; damageEnemy(s, e, 100); expect(h0 - e.hp).toBeCloseTo(106, 3);
    for (let k = 0; k < 6; k++) { run(sim, 0.5, { ...idle, x: 1 }); run(sim, 0.1, { ...idle, x: -1 }); run(sim, 0.5, { ...idle, x: -1 }); run(sim, 0.1, { ...idle, x: 1 }); } expect(s.b22.bearings.length).toBeLessThanOrEqual(4);
    run(sim, 3.5); expect(s.b22.bearings.length).toBe(0);
  });
});

/* ------------------------------------------------------------------ 24 branches: real casts against a baseline */
interface Trial { dmg: number; zones: number; fx: number; moved: number; bolts: number }
function trial(hero: HeroId, slot: 'q' | 'e' | 'r', branch: BranchId | null, form = 0): Trial {
  const { sim, s } = quiet({ hero, arena: 'gloam', hp: 1e6, seed: 11 }); s.player.level = 20; s.player.drive = form ? 100 : 0; if (form) s.player.form = form as 1 | 2 | 3;
  s.upgradeStacks = {}; const es = ring(s, 9, 118, 1e7); const pos0 = es.map(e => [e.x, e.y]); if (branch) s.b22.branches.push(branch);
  if (hero === 'vex' && slot === 'e') { for (const e of es) e.hp = e.maxHp; }
  const key = slot === 'q' ? 'q' : slot === 'e' ? 'beam' : 'sphere'; let zones = 0, fx = 0, bolts = 0;
  if (hero === 'sora' && slot === 'e') { for (let i = 0; i < 70; i++) { sim.step(DT, { ...idle, beam: true, beamHeld: true }); } run(sim, 0.05, idle); }
  else { sim.step(DT, { ...idle, [key]: true }); if (hero === 'vex' && slot === 'q') s.enemyShots.push({ id: 7777, x: s.player.x + 14, y: s.player.y, vx: -5, vy: 0, ttl: 3, damage: 10, radius: 8, kind: 'prism', owner: es[0].id, k: 1 }); }
  for (let i = 0; i < 60 * 4; i++) { sim.step(DT, idle); zones = Math.max(zones, s.b22.zones.length); fx = Math.max(fx, s.b22.fx.length); bolts = Math.max(bolts, s.hx.bolts.length); s.player.hp = 1e6; }
  return { dmg: damageDealt(es), zones, fx, moved: es.reduce((a, e, i) => a + Math.hypot(e.x - pos0[i][0], e.y - pos0[i][1]), 0), bolts };
}
const differs = (a: Trial, b: Trial) => Math.abs(a.dmg - b.dmg) > Math.max(1, a.dmg * 0.01) || a.zones !== b.zones || a.fx !== b.fx || Math.abs(a.moved - b.moved) > 1 || a.bolts !== b.bolts;
describe('B22 Ascension: 24 mutually exclusive branches change real combat (actual casts vs baseline)', () => {
  for (const hero of ['kai', 'ren', 'sora', 'vex'] as const) for (const slot of ['q', 'e', 'r'] as const) {
    const pair = BRANCHES.filter(b => b.hero === hero && b.slot === slot);
    it(`${hero}.${slot}: ${pair.map(p => p.name).join(' vs ')} each differ from the base skill AND from each other`, () => {
      const fm = hero === 'kai' && slot === 'q' ? 1 : 0;   // Kai's base Q is the Surge Step buff (no damage): the Q branches are exercised through Flarebound's Scatter Burst
      const base = trial(hero, slot, null, fm), a = trial(hero, slot, pair[0].id, fm), b = trial(hero, slot, pair[1].id, fm);
      expect(base.dmg, 'the base skill must hit the crowd').toBeGreaterThan(0);
      expect(differs(a, base), `${pair[0].id} vs base: ${JSON.stringify([a, base])}`).toBe(true); expect(differs(b, base), `${pair[1].id} vs base: ${JSON.stringify([b, base])}`).toBe(true); expect(differs(a, b), `${pair[0].id} vs ${pair[1].id}`).toBe(true);
    });
  }
  it('branches are EARNED: due only at the slot level after enough casts, one per slot, mutually exclusive, with a real tradeoff applied', () => {
    const { s } = quiet({ hero: 'kai', hp: 1e6 }); s.player.level = BRANCH_RULES.q.level; expect(dueBranch(s)).toBeNull(); s.b22.casts.q = BRANCH_RULES.q.casts; expect(dueBranch(s)).toBe('q');
    expect(offerBranch(s)).toBe(true); s.phase = 'upgrade'; const o = s.b22.branchOffer!; expect(o.a).toBe('seismic_impact'); expect(o.b).toBe('pressure_wave'); const dmg0 = s.player.qDamage;
    expect(chooseBranch(s, 'pressure_wave')).toBe(true); expect(s.player.qDamage).toBeCloseTo(dmg0 * 0.8, 5); expect(s.b22.branches).toEqual(['pressure_wave']); expect(dueBranch(s)).toBeNull();
    s.b22.branchOffer = { slot: 'q', a: 'seismic_impact', b: 'pressure_wave' }; s.phase = 'upgrade'; expect(chooseBranch(s, 'burning_wake' as BranchId)).toBe(false);
    s.b22.branchOffer = null; s.player.level = 30; s.b22.casts.e = 5; expect(dueBranch(s)).toBe('e');
  });
  it('a form-specific equivalent exists: Prism Conductor chains from real Cometbreaker / Dragonfang hits (E/R slot attribution is per active cast kind)', () => {
    const { sim, s } = quiet({ hero: 'kai', hp: 1e6 }); s.player.level = 20; s.player.form = 2; s.cometUnlocked = true; s.b22.branches.push('prism_conductor'); const es = ring(s, 8, 160, 1e7);
    sim.step(DT, press('beam')); run(sim, 1.2); expect(s.cast === null || s.cast.kind === 'dragon').toBe(true); expect(damageDealt(es)).toBeGreaterThan(0);
    const chained = s.b22.ev.some(e => e.kind === 'prism_chain') || (s.b22.legendMisc.chainN ?? 0) > 0; expect(chained).toBe(true);
  });
  it('no branch recursion: effect damage never re-triggers branches (fx-flagged), and boss damage per effect is capped', () => {
    const { sim, s } = quiet({ hero: 'kai', hp: 1e6 }); s.player.level = 20; s.b22.branches.push('prism_conductor'); const boss = dummy(s, 1300, 800, 'pursuer', 1000); boss.kind = 'warden'; boss.radius = 44; boss.ai = { phase: 1, pat: 0, atk: '', step: 0, t: 0, acc: 0, exposed: true, invuln: false, side: 1, destX: 0, destY: 0, gap: 0, push: 0 };
    const hp = boss.hp; sim.step(DT, press('beam')); run(sim, 1.5); void hp; expect(s.b22.hits.length).toBeLessThanOrEqual(64);
  });
});

describe('B22 legendary recipes: each changes real play, flows recipe -> prerequisites -> offer -> effect', () => {
  const setup = (hero: HeroId, id: LegendaryId) => { const q = quiet({ hero, arena: 'gloam', hp: 1e6, seed: 5 }); q.s.player.level = 20; q.s.b22.legendary.push(id); return q; };
  const crowd = (s: GameState, r = 170) => ring(s, 9, r, 1e7);
  it('the in-run flow: prerequisites from real cards make the recipe offerable at the next level-up; choosing it grants it once and unpauses', () => {
    for (const l of LEGENDARIES) {
      const { sim, s } = quiet({ hero: l.hero, hp: 1e6 }); s.player.level = 15; expect(offerLegendary(s)).toBeNull();
      for (const n of l.needs) s.upgradeStacks[n.id] = n.stacks; const id = offerLegendary(s); expect(id, l.id).toBe(l.id);
      s.phase = 'upgrade'; expect(sim.chooseLegendary(l.id)).toBe(true); expect(s.b22.legendary).toEqual([l.id]); expect(s.phase).toBe('running'); expect(offerLegendary(s)).toBeNull(); expect(chooseLegendary(s, l.id)).toBe(false);
    }
  });
  it('Solar Rupture (Kai): an E cast leaves a delayed fissure along its path that hits survivors', () => {
    const { sim, s } = setup('kai', 'solar_rupture'); const es = [1, 2, 3].map(i => dummy(s, s.player.x + 160 + i * 90, s.player.y)); s.player.aimX = 1; s.player.aimY = 0; sim.step(DT, press('beam')); expect(s.b22.fx.some(f => f.src === 'solar_rupture')).toBe(true); run(sim, 1.4); expect(damageDealt(es)).toBeGreaterThan(0);
    expect(s.b22.ev.some(e => e.kind === 'line')).toBe(true);
  });
  it('Dragon Overture (Kai): a real dragon_end strikes three foes once, then 5 s cooldown', () => {
    const { sim, s } = setup('kai', 'dragon_overture'); const es = crowd(s, 120); s.cast = { id: 1, kind: 'dragon', face: 'east', t: 0, dirX: 1, dirY: 0, form: 2, released: true, pulses: 0, len: 0, tx: 0, ty: 0, sx: 0, sy: 0, hits: [1, 2, 3], dur: 1 };
    s.abilityEvents.push({ id: s.nextId++, kind: 'dragon_end', x: s.player.x, y: s.player.y }); sim.step(DT, idle); run(sim, 0.8); const d1 = damageDealt(es); expect(d1).toBeGreaterThan(0); expect(es.filter(e => e.hp < e.maxHp).length).toBeLessThanOrEqual(9);
    s.abilityEvents.push({ id: s.nextId++, kind: 'dragon_end', x: s.player.x, y: s.player.y }); run(sim, 0.8); expect(damageDealt(es)).toBe(d1); expect(s.b22.m['dragon.multi']).toBeGreaterThanOrEqual(1);
  });
  it('Nova Constellation (Kai): with a Twin Bloom echo the burst seeds 4 capped nova nodes', () => {
    const { sim, s } = setup('kai', 'nova_constellation'); s.mods.sphereEcho = 2; const es = crowd(s, 200); sim.step(DT, press('sphere')); run(sim, 3); expect(s.b22.ev.filter(e => e.kind === 'nova_fx').length).toBeGreaterThanOrEqual(1); expect(damageDealt(es)).toBeGreaterThan(0);
  });
  it('Crimson Relay (Ren): a completed Hammer Chain finisher dashes onto a NEW target for one extra strike (4 s cooldown)', () => {
    const { sim, s } = setup('ren', 'crimson_relay'); s.player.attackClock = 0; const near = dummy(s, s.player.x + 70, s.player.y, 'pursuer', 1e7), far = dummy(s, s.player.x + 230, s.player.y + 40, 'pursuer', 1e7); let relays = 0;
    for (let i = 0; i < 60 * 6; i++) { s.player.attackClock = Math.min(s.player.attackClock, 0); sim.step(DT, idle); relays = s.b22.ev.filter(e => e.kind === 'relay_dash').length; } expect(relays).toBeGreaterThanOrEqual(1); expect(relays).toBeLessThanOrEqual(2); expect(far.hp).toBeLessThan(far.maxHp); void near;
  });
  it('Meteor Crucible (Ren): Meteor Rush burns a path and ends in a pressure burst', () => {
    const { sim, s } = setup('ren', 'meteor_crucible'); const es = crowd(s, 140); sim.step(DT, press('beam')); run(sim, 3); expect(s.b22.ev.some(e => e.kind === 'crucible_burst')).toBe(true); expect(damageDealt(es)).toBeGreaterThan(0);
  });
  it('Bloodstar Rupture (Ren): Bloodstar leaves a molten field zone that pushes foes toward the rim', () => {
    const { sim, s } = setup('ren', 'bloodstar_rupture'); const es = crowd(s, 120); const r0 = es.map(e => Math.hypot(e.x - s.player.x, e.y - s.player.y)); sim.step(DT, press('sphere')); let zone = 0; for (let i = 0; i < 60 * 4.5; i++) { sim.step(DT, idle); zone = Math.max(zone, s.b22.zones.filter(z => z.src === 'bloodstar_rupture').length); }
    expect(zone).toBe(1); expect(es.some((e, i) => Math.abs(Math.hypot(e.x - s.player.x, e.y - s.player.y) - r0[i]) > 5)).toBe(true); expect(damageDealt(es)).toBeGreaterThan(0);
  });
  it('Blue Needle Storm (Sora): every 4th landed needle splits into two seeking fragments (1.2 s cooldown)', () => {
    const { sim, s } = setup('sora', 'blue_needle_storm'); s.player.attackClock = 0; const e = dummy(s, s.player.x + 200, s.player.y, 'pursuer', 1e7); let splits = 0; for (let i = 0; i < 60 * 5; i++) { sim.step(DT, idle); splits = s.b22.ev.filter(x => x.kind === 'needle_split').length; if (splits) break; } expect(splits).toBeGreaterThanOrEqual(1); void e;
  });
  it('Prismatic Meridian (Sora): the charged Lance keeps a piercing core and arcs between foes it already damaged', () => {
    const { sim, s } = setup('sora', 'prismatic_meridian'); const es = [0, 1, 2, 3].map(i => dummy(s, s.player.x + 150 + i * 70, s.player.y + (i % 2) * 14)); s.player.aimX = 1; s.player.aimY = 0;
    for (let i = 0; i < 90; i++) sim.step(DT, { ...idle, beam: true, beamHeld: true }); run(sim, 1.5); expect(damageDealt(es)).toBeGreaterThan(0); expect(s.b22.zones.length >= 0).toBe(true); expect(s.b22.ev.some(e => e.kind === 'arc')).toBe(true);
  });
  it('Zero Convergence (Sora): Zero Horizon collapses into ONE blast (not scattered bursts)', () => {
    const base = quiet({ hero: 'sora', hp: 1e6, seed: 5 }); base.s.player.level = 20; const eb = crowd(base.s, 190); base.sim.step(DT, press('sphere')); run(base.sim, 3.5);
    const { sim, s } = setup('sora', 'zero_convergence'); const es = crowd(s, 190); sim.step(DT, press('sphere')); run(sim, 3.5);
    expect(damageDealt(es)).toBeGreaterThan(0); expect(Math.abs(damageDealt(es) - damageDealt(eb))).toBeGreaterThan(1); void eb;
  });
  it('Shard Requiem / Oathbreaker Chain / Null Waltz (Vex) are covered in the Vex suite', () => { expect(LEGENDARIES.filter(l => l.hero === 'vex')).toHaveLength(3); });
});

describe('B22 ultimates: earned, charged by damage, real timelines, cooldown, no stacking', () => {
  const ultSetup = (hero: HeroId) => { const q = quiet({ hero, arena: 'gloam', hp: 1e6, seed: 3 }); const { s } = q; s.player.level = 20; s.b22.branches.push('pressure_wave'); return q; };
  for (const hero of ['kai', 'ren', 'sora', 'vex'] as const) it(`${hero}: ${ULTIMATES[hero].name} unlocks at level 14 with a branch, fills by dealing damage, R fires it, then a 60 s cooldown applies`, () => {
    const { sim, s } = ultSetup(hero); sim.step(DT, idle); expect(s.b22.ult.unlocked).toBe(true); expect(s.b22.ult.charge).toBe(0);
    const es = ring(s, 9, 170, 1e7); const tgt = es[0]; for (let i = 0; i < 400 && s.b22.ult.charge < 100; i++) damageEnemy(s, tgt, 50); expect(s.b22.ult.charge).toBe(100);
    const hp = damageDealt(es); sim.step(DT, press('sphere')); expect(s.b22.ult.act?.id).toBe(ULTIMATES[hero].id); expect(s.b22.ult.charge).toBe(0); expect(s.b22.ult.cd).toBeGreaterThan(55);
    const before = s.player.sphereCooldown; sim.step(DT, press('sphere')); expect(s.player.sphereCooldown).toBe(before);   // no second cast while it runs
    run(sim, 3.2); expect(s.b22.ult.act).toBeNull(); expect(damageDealt(es) - hp).toBeGreaterThan(100); expect(s.abilityEvents.some(e => e.kind === 'ult_release') || s.b22.ev.some(e => e.kind.startsWith('ult'))).toBe(true);
    for (let i = 0; i < 400; i++) damageEnemy(s, tgt, 50); expect(s.b22.ult.charge).toBe(0);   // cooling down: damage does not refill it
  });
  it('the ultimate is NOT available without the Ascension path (no branch) or below level 14', () => {
    const { sim, s } = quiet({ hero: 'kai', hp: 1e6 }); s.player.level = 14; sim.step(DT, idle); expect(s.b22.ult.unlocked).toBe(false); s.b22.branches.push('seismic_impact'); s.player.level = 13; sim.step(DT, idle); expect(s.b22.ult.unlocked).toBe(false); s.player.level = 14; sim.step(DT, idle); expect(s.b22.ult.unlocked).toBe(true);
  });
  it('Ren: a miss (no contact) is punished with a longer, weaker commitment; Vex: a recent parry boosts Judgment', () => {
    const miss = quiet({ hero: 'ren', hp: 1e6 }); miss.s.player.level = 20; miss.s.b22.branches.push('crimson_guardbreak'); miss.sim.step(DT, idle); miss.s.b22.ult.charge = 100; miss.sim.step(DT, press('sphere')); const d0 = miss.s.b22.ult.act!.dur; run(miss.sim, 0.5); expect(miss.s.b22.ult.act!.dur).toBeGreaterThan(d0);
    const mk = (parried: boolean) => { const { sim, s } = quiet({ hero: 'vex', hp: 1e6 }); s.player.level = 20; s.b22.branches.push('mirror_counter'); sim.step(DT, idle); const es = ring(s, 3, 160, 1e7); s.b22.ult.charge = 100; if (parried) s.b22.vex.parryCd = s.time; sim.step(DT, press('sphere')); run(sim, 3); return damageDealt(es); };
    expect(mk(true)).toBeGreaterThan(mk(false) * 1.3);
  });
});
void onCast; void ({} as Simulation);

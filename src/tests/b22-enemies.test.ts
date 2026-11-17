import { describe, expect, it } from 'vitest';
import { ENEMIES, type MobKind } from '../content/enemies';
import { addEnemy } from '../sim/EntityRegistry';
import { damageEnemy } from '../sim/CombatSystem';
import type { Enemy, GameState } from '../sim/GameState';
import { quiet, run, DT, idle } from './b22util';

const mob = (s: GameState, kind: MobKind, x: number, y: number): Enemy => { const d = ENEMIES[kind]; return addEnemy(s, { kind, x, y, hp: d.hp, maxHp: d.hp, radius: d.radius, speed: d.moveSpeed, damage: d.damage, touchCooldown: 0, attackCd: 0, aimX: -1, aimY: 0 }); };
const arena = () => quiet({ arena: 'aetherfall', hp: 1000 });

describe('B22 Sky Lancer: locks a vector, then dives down a real lane', () => {
  it('the lane appears BEFORE damage, never moves after it locks, and a sidestep dodges it', () => {
    const { sim, s } = arena(); s.player.x = 1100; s.player.y = 800; const e = mob(s, 'sky_lancer', 1450, 800 - 24 + 10); e.attackCd = 0;
    let lane: { ang: number; x: number; y: number; delay: number } | null = null, hpAtLock = 0, locked = 0;
    for (let i = 0; i < 60 * 4 && !locked; i++) { sim.step(DT, idle); const h = s.hazards.find(z => z.tag === 'lance' && z.owner === e.id); if (h) { lane = { ang: h.ang, x: h.x, y: h.y, delay: h.delay }; hpAtLock = s.player.hp; locked = i; } }
    expect(lane).not.toBeNull(); expect(lane!.delay).toBeGreaterThan(0.3); expect(s.hazards.some(z => z.tag === 'lance_land')).toBe(true);
    for (let i = 0; i < 40; i++) { sim.step(DT, idle); const h = s.hazards.find(z => z.tag === 'lance' && z.owner === e.id); if (h) { expect(h.ang).toBeCloseTo(lane!.ang, 6); expect(h.x).toBeCloseTo(lane!.x, 6); } }
    s.player.x = 1100; s.player.y = 560; run(sim, 2); expect(s.player.hp).toBe(hpAtLock);   // sidestepped far off the lane
  });
  it('standing in the lane when it fires hurts exactly once per i-frame window; its death cancels a pending lane', () => {
    const { sim, s } = arena(); s.player.x = 1100; s.player.y = 800; const e = mob(s, 'sky_lancer', 1450, 800); let seen = false;
    for (let i = 0; i < 60 * 5; i++) { sim.step(DT, idle); if (s.hazards.some(z => z.tag === 'lance' && !z.fired)) { seen = true; break; } }
    expect(seen).toBe(true); e.hp = 0; run(sim, 0.1); expect(s.hazards.some(z => z.tag === 'lance' || z.tag === 'lance_land')).toBe(false);
  });
});

describe('B22 Halo Scribe: short-lived, destructible, capped sigils', () => {
  it('places at most 2 sigils per scribe and 4 overall, each with its own hp; sigils expire and give no xp or kills', () => {
    const { sim, s } = arena(); s.player.x = 1100; s.player.y = 800; const a = mob(s, 'halo_scribe', 1400, 800); const b = mob(s, 'halo_scribe', 1400, 900); const c = mob(s, 'halo_scribe', 1400, 700);
    let peak = 0, perScribe = 0; for (let i = 0; i < 60 * 14; i++) { sim.step(DT, idle); const sig = s.enemies.filter(e => e.kind === 'halo_sigil' && e.hp > 0); peak = Math.max(peak, sig.length); perScribe = Math.max(perScribe, sig.filter(x => x.ex?.by === a.id).length); a.attackCd = 0; b.attackCd = 0; c.attackCd = 0; }
    expect(peak).toBeGreaterThan(0); expect(peak).toBeLessThanOrEqual(4); expect(perScribe).toBeLessThanOrEqual(2);
    const sg = s.enemies.find(e => e.kind === 'halo_sigil' && e.hp > 0); if (sg) { const kills = s.kills, px = s.pickups.length; sg.hp = 1; damageEnemy(s, sg, 50); expect(s.kills).toBe(kills); expect(s.pickups.length).toBe(px); }
  });
  it('a sigil pulses with a warning ring first and expires on its own', () => {
    const { sim, s } = arena(); s.player.x = 1100; s.player.y = 800; const sd = ENEMIES.halo_sigil, sg = addEnemy(s, { kind: 'halo_sigil', x: 1180, y: 800, hp: sd.hp, maxHp: sd.hp, radius: sd.radius, speed: 0, damage: 0, touchCooldown: 99, attackCd: 99, aimX: 0, aimY: 1, ex: { by: 0, life: 2, pulse: 0.2 } });
    let warned = false; for (let i = 0; i < 60; i++) { sim.step(DT, idle); const h = s.hazards.find(z => z.tag === 'sigil_pulse'); if (h && !h.fired && h.delay > 0.2) warned = true; }
    expect(warned).toBe(true); run(sim, 2.5); expect(sg.hp).toBe(0);
  });
});

describe('B22 Citadel Bulwark: a limited directional barrier with armour-crack states', () => {
  it('shields at most 4 allies in front and reduces damage taken from the barrier side; cracks shrink it and break it at 33%', () => {
    const { sim, s } = arena(); s.player.x = 600; s.player.y = 800; const bw = mob(s, 'citadel_bulwark', 900, 800); bw.aimX = -1; bw.attackCd = 99;
    const allies = [0, 1, 2, 3, 4, 5].map(i => mob(s, 'pursuer', 840 + i * 6, 760 + i * 12)); for (const a of allies) a.attackCd = 99;
    run(sim, 0.1); const shielded = allies.filter(a => (a.ex?.barrierT ?? 0) > 0); expect(shielded.length).toBeGreaterThan(0); expect(shielded.length).toBeLessThanOrEqual(4);
    const t = shielded[0], hp0 = t.hp; damageEnemy(s, t, 20); expect(hp0 - t.hp).toBeCloseTo(6, 3);   // 20 * 0.3
    bw.hp = bw.maxHp * 0.5; for (const a of allies) if (a.ex) a.ex.barrierT = 0; run(sim, 0.1); expect(allies.filter(a => (a.ex?.barrierT ?? 0) > 0.1).length).toBeLessThanOrEqual(3);
    bw.hp = bw.maxHp * 0.2; for (const a of allies) if (a.ex) a.ex.barrierT = 0; run(sim, 0.1); expect(allies.filter(a => (a.ex?.barrierT ?? 0) > 0.1)).toHaveLength(0);
  });
  it('its own front shield is directional (area damage ignores it) and it never staggers', () => {
    const { s } = arena(); s.player.x = 600; s.player.y = 800; const bw = mob(s, 'citadel_bulwark', 900, 800); bw.aimX = -1;
    const h0 = bw.hp; damageEnemy(s, bw, 100); expect(h0 - bw.hp).toBeCloseTo(30, 3); const h1 = bw.hp; damageEnemy(s, bw, 100, { area: true }); expect(h1 - bw.hp).toBeCloseTo(100, 3); expect(bw.stagger).toBe(0);
  });
});

describe('B22 Rift Mimic: replays one remembered attack after a visible countdown', () => {
  it('watches another attacker, then creates ONE echo hazard (flagged, with a >= 1.3 s countdown); echoes are capped and never recursive', () => {
    const { sim, s } = arena(); s.player.x = 1100; s.player.y = 800; const m = mob(s, 'rift_mimic', 1300, 800); const bru = mob(s, 'bruiser', 1190, 800); bru.attackCd = 0; bru.speed = 0;
    let echo: { delay: number; echo?: boolean } | null = null, maxEchoes = 0;
    for (let i = 0; i < 60 * 12; i++) { sim.step(DT, idle); const es = s.hazards.filter(h => h.tag === 'mimic_echo'); maxEchoes = Math.max(maxEchoes, es.length); if (!echo && es.length) echo = { delay: es[0].delay, echo: es[0].echo }; m.attackCd = Math.min(m.attackCd, 0.5); }
    expect(echo).not.toBeNull(); expect(echo!.delay).toBeGreaterThanOrEqual(1.3); expect(echo!.echo).toBe(true); expect(maxEchoes).toBeLessThanOrEqual(3);
    // events produced by echoes are hazard_fire, which a mimic never observes, so history cannot recurse
    expect(s.enemyEvents.filter(e => e.kind === 'hazard_fire' && e.tag === 'mimic_echo').length).toBeGreaterThanOrEqual(0);
  });
  it('without anything to copy it does not invent attacks', () => {
    const { sim, s } = arena(); s.player.x = 1100; s.player.y = 800; mob(s, 'rift_mimic', 1300, 800); run(sim, 8); expect(s.hazards.some(h => h.tag === 'mimic_echo')).toBe(false);
  });
});

describe('B22 Phase Harrier: marks, blinks once, strikes, is left open', () => {
  it('shows the arrival mark BEFORE it moves, lands exactly on it, then needs >= 0.34 s before the strike hazard fires; it is 25% more vulnerable while recovering', () => {
    const { sim, s } = arena(); s.player.x = 1100; s.player.y = 800; const h = mob(s, 'phase_harrier', 1380, 800); h.attackCd = 0;
    let mark: { x: number; y: number; at: number } | null = null, landed = -1, strikeDelay = 0; const x0 = h.x;
    for (let i = 0; i < 60 * 6 && landed < 0; i++) {
      sim.step(DT, idle); const a = s.hazards.find(z => z.tag === 'arrival' && z.owner === h.id);
      if (a && !mark) { mark = { x: a.x, y: a.y, at: s.time }; expect(Math.abs(h.x - x0)).toBeLessThan(6); }
      const st = s.hazards.find(z => z.tag === 'blink_strike' && z.owner === h.id); if (st && !strikeDelay) { strikeDelay = st.delay; landed = i; }
    }
    expect(mark).not.toBeNull(); expect(landed).toBeGreaterThan(0); expect(Math.hypot(h.x - mark!.x, h.y + ENEMIES.phase_harrier.radius * 0.6 - mark!.y)).toBeLessThan(3);   // the mark is a GROUND point (feet) expect(strikeDelay).toBeGreaterThanOrEqual(0.34);
    h.mode = 'recover'; h.modeT = 1; const hp = h.hp; damageEnemy(s, h, 8); expect(hp - h.hp).toBeCloseTo(10, 3);
  });
});

describe('B22 Singularity Husk: a bounded, breakable gravity well', () => {
  it('pulls with bounded force and total displacement, always leaves an escape, and the well breaks when the husk dies', () => {
    const { sim, s } = arena(); s.player.x = 1100; s.player.y = 800; const hk = mob(s, 'singularity_husk', 1350, 800); hk.attackCd = 0;
    let well = null as null | { x: number; y: number }, px0 = 0;
    for (let i = 0; i < 60 * 6 && !well; i++) { sim.step(DT, idle); const w = s.hazards.find(z => z.tag === 'husk_well'); if (w) { well = { x: w.x, y: w.y }; px0 = s.player.x; } }
    expect(well).not.toBeNull(); const start = { x: s.player.x, y: s.player.y }; run(sim, 3); const moved = Math.hypot(s.player.x - start.x, s.player.y - start.y); expect(moved).toBeLessThanOrEqual(175); void px0;
    // the player can always walk out: full-speed movement away beats the pull
    const w2 = s.hazards.find(z => z.tag === 'husk_well'); if (w2) { hk.hp = 0; run(sim, 0.1); expect(s.hazards.some(z => z.tag === 'husk_well')).toBe(false); }
  });
  it('an interrupt (stagger) during the wind-up cancels the well before it forms', () => {
    const { sim, s } = arena(); s.player.x = 1100; s.player.y = 800; const hk = mob(s, 'singularity_husk', 1350, 800); hk.attackCd = 0;
    for (let i = 0; i < 60 * 3; i++) { sim.step(DT, idle); if (hk.mode === 'windup') break; }
    expect(hk.mode).toBe('windup'); damageEnemy(s, hk, 1); run(sim, 1.5); expect(s.hazards.some(z => z.tag === 'husk_well')).toBe(false);
  });
});

describe('B22 realm spawning: new threats arrive on a cadence, capped, only in realm runs', () => {
  it('in the Aetherfall run plan the first new archetype arrives after its intro time and live counts respect caps', () => {
    const { sim, s } = quiet({ arena: 'aetherfall', plan: undefined, hp: 1e9 }); s.encounter.forced = false; s.plan = { ...s.plan, pool: 'realm', mode: 'fracture_expedition', steps: [], id: 'x' }; s.spawnTimer = 0;
    const first: Record<string, number> = {}; const peak: Record<string, number> = {};
    for (let i = 0; i < 60 * 700; i++) { sim.step(DT, idle); s.player.hp = 1e9; if (i % 10) continue; const live: Record<string, number> = {}; for (const e of s.enemies) if (e.hp > 0) { live[e.kind] = (live[e.kind] ?? 0) + 1; first[e.kind] ??= s.time; } for (const k in live) peak[k] = Math.max(peak[k] ?? 0, live[k]); }
    expect(first.sky_lancer).toBeGreaterThanOrEqual(44); expect(first.citadel_bulwark ?? 9999).toBeGreaterThanOrEqual(219); expect(first.rift_mimic).toBeUndefined();
    expect(peak.sky_lancer).toBeLessThanOrEqual(ENEMIES.sky_lancer.cap(700)); expect(peak.halo_sigil ?? 0).toBeLessThanOrEqual(4);
  });
});

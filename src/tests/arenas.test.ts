import { describe, expect, it } from 'vitest';
import { ARENAS, ARENA_IDS, PROP_FOOTPRINTS, obstaclesOf } from '../content/arenas';
import { FOOT_RADIUS, PLAYER_FOOT_DY } from '../content/enemies';
import { Simulation } from '../sim/Simulation';
import { blocked } from '../sim/CollisionSystem';
import { feetInRect } from '../sim/Ground';
import { startEncounter } from '../sim/BossAiSystem';
import type { InputState } from '../sim/GameState';

const DT = 1 / 60;
const idle: InputState = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false };
type Q = ReturnType<typeof quiet>;
const quiet = (arena: 'gloam' | 'ashen', seed = 4) => { const sim = new Simulation(seed, arena); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.attackClock = 1e9; s.player.hp = 100; s.player.nextXp = 1e9; return { sim, s }; };
const run = (sim: Simulation, sec: number, input = idle, each?: () => void) => { for (let i = 0; i < Math.round(sec / DT); i++) { sim.step(DT, input); each?.(); } };
const placeFeet = (s: Q['s'], x: number, y: number) => { s.player.x = x; s.player.y = y - PLAYER_FOOT_DY; };
const pending = (s: Q['s']) => s.hazards.filter(h => h.owner === 0 && !h.fired);

describe('B09 arena content', () => {
  it('has four unlocked arenas (B22 adds the two realms) with their own hazard and solids', () => {
    expect(ARENA_IDS).toEqual(['gloam', 'ashen', 'aetherfall', 'paradox']);
    for (const id of ARENA_IDS) { const a = ARENAS[id]; expect(a.unlocked).toBe(true); expect(a.solids.length).toBeGreaterThanOrEqual(6); expect(a.blurb.length).toBeGreaterThan(40); expect(a.hazard.warn).toBeGreaterThanOrEqual(1.4); }
    expect(ARENAS.gloam.hazard.id).toBe('lane-surge'); expect(ARENAS.ashen.hazard.id).toBe('pylon-pulse'); expect(ARENAS.aetherfall.hazard.id).toBe('shatterfall'); expect(ARENAS.paradox.hazard.id).toBe('reality-fold');
    expect(ARENAS.ashen.solids.filter(s => s.prop === 'pylon').length).toBe(4);
  });
  it('the Gloam Circuit keeps its original obstacle layout exactly (no regression)', () => {
    expect(obstaclesOf(ARENAS.gloam.solids)).toEqual([{ x: 690, y: 465, w: 125, h: 55 }, { x: 1340, y: 500, w: 90, h: 180 }, { x: 780, y: 1155, w: 155, h: 64 }, { x: 1490, y: 1200, w: 165, h: 70 }, { x: 1070, y: 235, w: 145, h: 48 }, { x: 370, y: 930, w: 120, h: 80 }]);
  });
  it('solids stay inside the walls and keep the spawn area open', () => {
    for (const id of ARENA_IDS) for (const s of ARENAS[id].solids) {
      const f = PROP_FOOTPRINTS[s.prop]; expect(s.x).toBeGreaterThan(60); expect(s.y).toBeGreaterThan(60); expect(s.x + f.w).toBeLessThan(2200 - 60); expect(s.y + f.h).toBeLessThan(1600 - 60);
      const cx = Math.max(s.x, Math.min(1100, s.x + f.w)), cy = Math.max(s.y, Math.min(800, s.y + f.h)); expect(Math.hypot(cx - 1100, cy - 800)).toBeGreaterThan(150);
    }
  });
  it('a run collides with ITS arena', () => {
    const g = ARENAS.gloam.solids[0], a = ARENAS.ashen.solids.find(s => s.prop === 'monolith')!;
    new Simulation(1, 'gloam'); expect(blocked(g.x + 20, g.y + 20, 5)).toBe(true); expect(blocked(a.x + 20, a.y + 20, 5)).toBe(false);
    new Simulation(1, 'ashen'); expect(blocked(g.x + 20, g.y + 20, 5)).toBe(false); expect(blocked(a.x + 20, a.y + 20, 5)).toBe(true);
    new Simulation(1, 'gloam');
  });
  it('a run is a pure function of seed and arena (deterministic)', () => {
    const go = (arena: 'gloam' | 'ashen') => { const { sim, s } = quiet(arena, 8); s.spawnTimer = 0.1; s.player.hp = 1e6; run(sim, 50); return JSON.stringify([s.enemies.map(e => [e.kind, Math.round(e.x), Math.round(e.y)]), s.hazards.length, s.arenaHazard]); };
    expect(go('gloam')).toBe(go('gloam')); expect(go('ashen')).toBe(go('ashen'));
  });
});

describe('B09 rect hazard contract', () => {
  it('feet disc vs axis-aligned rect: inside, edge + foot disc, outside, corner', () => {
    const { s } = quiet('gloam'); const r = { x: 500, y: 500, w: 200, h: 80 };
    placeFeet(s, 500, 500); expect(feetInRect(s, r)).toBe(true);
    placeFeet(s, 500, 540 + FOOT_RADIUS - 0.2); expect(feetInRect(s, r)).toBe(true); placeFeet(s, 500, 540 + FOOT_RADIUS + 0.2); expect(feetInRect(s, r)).toBe(false);
    placeFeet(s, 600 + FOOT_RADIUS - 0.2, 500); expect(feetInRect(s, r)).toBe(true); placeFeet(s, 600 + FOOT_RADIUS + 0.2, 500); expect(feetInRect(s, r)).toBe(false);
    placeFeet(s, 605, 545); expect(feetInRect(s, r)).toBe(false); placeFeet(s, 604, 544); expect(feetInRect(s, r)).toBe(true);
  });
});

describe('B09 Lane Surge (Gloam Circuit)', () => {
  it('no hazard before its start time; a full warning precedes any damage', () => {
    const { sim, s } = quiet('gloam'); run(sim, ARENAS.gloam.hazard.startAt - 2); expect(s.hazards.length).toBe(0); expect(s.arenaHazard.count).toBe(0);
    const lane = ARENAS.gloam.hazard.lanes![0]; let tWarn = -1, tHit = -1;
    for (let i = 0; i < 60 * 8; i++) { placeFeet(s, 400, lane.y); sim.step(DT, idle); if (tWarn < 0 && s.enemyEvents.some(e => e.kind === 'hazard_warn')) tWarn = s.time; if (tHit < 0 && s.player.hp < 100) tHit = s.time; }
    expect(tWarn).toBeGreaterThan(0); expect(tHit - tWarn).toBeGreaterThanOrEqual(ARENAS.gloam.hazard.warn - 2 * DT); expect(tHit - tWarn).toBeLessThan(ARENAS.gloam.hazard.warn + 0.1); expect(s.lastHit?.src).toBe('surge');
  });
  it('standing beside the lane is safe; stepping off during the warning dodges it; a dash through is a dodge', () => {
    for (const mode of ['beside', 'step', 'dash'] as const) {
      const { sim, s } = quiet('gloam'); s.time = 50; s.arenaHazard.nextAt = s.time; const lane = ARENAS.gloam.hazard.lanes![0], half = lane.h / 2;
      placeFeet(s, 400, mode === 'beside' ? lane.y + half + FOOT_RADIUS + 1.5 : lane.y);
      if (mode === 'dash') { run(sim, ARENAS.gloam.hazard.warn - 0.05); s.player.invulnerable = 0.8; run(sim, 0.7); }
      else if (mode === 'step') { run(sim, 0.3); run(sim, 1.2, { ...idle, y: 1 }); run(sim, 1); }
      else run(sim, 3);
      expect(s.player.hp).toBe(100);
    }
  });
  it('hits once per pass (i-frames), and the active window ends', () => {
    const { sim, s } = quiet('gloam'); s.time = 50; s.arenaHazard.nextAt = s.time; const lane = ARENAS.gloam.hazard.lanes![0]; let hits = 0, last = 100;
    for (let i = 0; i < 60 * 3; i++) { placeFeet(s, 400, lane.y); sim.step(DT, idle); if (s.player.hp < last) { hits++; last = s.player.hp; } }
    expect(hits).toBe(1); expect(s.player.hp).toBe(100 - ARENAS.gloam.hazard.damage); expect(s.hazards.filter(h => h.owner === 0).length).toBe(0);
  });
  it('runs one hazard at a time and keeps cycling over a long run', () => {
    const { sim, s } = quiet('gloam'); const seen = new Set<number>(); let maxPending = 0; s.player.hp = 1e6;
    run(sim, 200, idle, () => { const p = pending(s); maxPending = Math.max(maxPending, p.length); if (p.length) seen.add(p[0].id); });
    expect(maxPending).toBe(1); expect(seen.size).toBeGreaterThanOrEqual(10); expect(s.arenaHazard.count).toBe(seen.size);
  });
  it('is frozen by pause and does not start during a boss attack', () => {
    const { sim, s } = quiet('gloam'); s.time = 50; s.arenaHazard.nextAt = s.time; run(sim, 0.5); const d = pending(s)[0].delay; sim.togglePause(); for (let i = 0; i < 120; i++) sim.step(DT, idle); expect(pending(s)[0].delay).toBe(d); sim.togglePause();
    const b = quiet('gloam'); startEncounter(b.s, 'warden'); b.s.time = 60; run(b.sim, 3); b.s.hazards.length = 0; b.s.player.hp = 1e6;
    const w = b.s.enemies[0]; b.s.arenaHazard.nextAt = b.s.time;
    for (let i = 0; i < 60; i++) { w.mode = 'windup'; w.modeT = 5; w.ai!.atk = 'sweep'; b.sim.step(DT, idle); }
    expect(pending(b.s).length).toBe(0); w.mode = 'move'; w.attackCd = 99; run(b.sim, 0.5); expect(pending(b.s).length).toBe(0); run(b.sim, 2.6); expect(b.s.arenaHazard.count).toBeGreaterThan(0);
  });
});

describe('B09 Pylon Pulse (Ashen Reliquary)', () => {
  it('rings one pylon on its ground point; boundary = radius + foot disc; a dash dodges', () => {
    const def = ARENAS.ashen.hazard, py = ARENAS.ashen.solids.filter(p => p.prop === 'pylon');
    for (const [dist, hit] of [[def.radius! - 2, true], [def.radius! + FOOT_RADIUS - 0.4, true], [def.radius! + FOOT_RADIUS + 1.5, false]] as const) {
      const { sim, s } = quiet('ashen'); s.time = 50; s.arenaHazard.nextAt = s.time; run(sim, 0.05); const h = pending(s)[0]; expect(h.shape).toBe('circle'); expect(h.r).toBe(def.radius);
      const first = py[def.order![0]]; expect(h.x).toBe(first.x + 30); expect(h.y).toBe(first.y + 22);
      for (let i = 0; i < 60 * (def.warn + 0.4); i++) { placeFeet(s, h.x + dist, h.y); sim.step(DT, idle); }
      expect(s.player.hp < 100).toBe(hit);
    }
    const { sim, s } = quiet('ashen'); s.time = 50; s.arenaHazard.nextAt = s.time; run(sim, 0.05); const h = pending(s)[0]; placeFeet(s, h.x + 20, h.y); run(sim, def.warn - 0.05); s.player.invulnerable = 0.8; run(sim, 0.7); expect(s.player.hp).toBe(100);
  });
  it('cycles through the four pylons in the data order', () => {
    const { sim, s } = quiet('ashen'); s.player.hp = 1e6; const centres: string[] = [];
    run(sim, 120, idle, () => { const p = pending(s)[0]; if (p) { const k = `${p.x},${p.y}`; if (centres[centres.length - 1] !== k) centres.push(k); } });
    const py = ARENAS.ashen.solids.filter(p => p.prop === 'pylon'), expected = ARENAS.ashen.hazard.order!.map(i => `${py[i].x + 30},${py[i].y + 22}`);
    expect(centres.slice(0, expected.length)).toEqual(expected);
  });
});

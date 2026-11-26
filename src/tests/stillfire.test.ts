import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { APEX, EVASION, REVERSAL, RIFT } from '../content/stillfire';
import type { Enemy, InputState } from '../sim/GameState';
import { damageEnemy, damagePlayer } from '../sim/CombatSystem';
import { migrateSave } from '../sim/SaveSystem';
import { formChoices, selectedForm } from '../sim/FormSystem';
import { riftAim } from '../sim/ApexSystem';
import { CHAIN } from '../content/kaiKit';
import { castFrame, type KaiClipInfo } from '../assets/kaiAnimation';
import { readPad, AIM_DEADZONE, type PadLike } from '../game/input/gamepadMap';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
function enemy(id: number, x: number, y: number, hp = 40, kind: Enemy['kind'] = 'pursuer'): Enemy { return { id, x, y, kind, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }; }
/** A Form III run: both unlocks, no time gate, full Drive, nobody else around. */
function setup(enemies: Array<[number, number, number?]> = [], opts: { apex?: boolean; gate?: number } = {}) {
  const sim = new Simulation(7, 'gloam', true, opts.apex ?? true); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.apexGate = opts.gate ?? 0;
  s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.drive = 100; s.player.hp = s.player.maxHp = 1e6;
  s.enemies = enemies.map(([x, y, hp], i) => enemy(100 + i, x, y, hp ?? 400)); return { sim, s };
}
const run = (sim: Simulation, sec: number, input: InputState = idle()) => { for (let i = 0; i < Math.round(sec / DT); i++) sim.step(DT, input); };
/** A tap of F; when several forms are ready the first press opens the picker and the second press confirms the highlighted one. */
const startForm = (sim: Simulation) => { for (let k = 0; k < 2; k++) { sim.step(DT, idle({ f: true, fHeld: true })); sim.step(DT, idle({ fHeld: false })); } };
/** Straight into Form III (the cinematic played out). */
function apexForm(enemies: Array<[number, number, number?]> = []) {
  const r = setup(enemies); r.s.selector.pick = 3; startForm(r.sim);
  run(r.sim, APEX.cinemaFirst.dur + 0.2); r.s.player.drive = 100; r.s.player.evadeCooldown = 0; r.s.player.invulnerable = 0; return r;
}

describe('Form III unlock and persistence', () => {
  it('a fresh save does not have it; a save with a Seraph victory does; the explicit flag survives migration', () => {
    expect(migrateSave(null).unlocks?.stillfire).toBe(false);
    expect(migrateSave({ best: { score: 10, survivalSeconds: 900, kills: 3, level: 9, seed: 1, victory: true } }).unlocks?.stillfire).toBe(true);
    expect(migrateSave({ best: { score: 10, survivalSeconds: 100, kills: 3, level: 2, seed: 1, victory: false } }).unlocks?.stillfire).toBe(false);
    expect(migrateSave({ unlocks: { cometheart: true, stillfire: true } }).unlocks).toEqual({ cometheart: true, stillfire: true });
    expect(migrateSave({ unlocks: { cometheart: true } }).unlocks?.cometheart).toBe(true);   // B12 progress is never touched
  });
  it('defeating the Seraph flags the unlock for the save but Form III does not appear in that same run', () => {
    const { sim, s } = setup([], { apex: false }); s.enemies = [enemy(900, 1300, 800, 100, 'seraph')]; s.player.drive = 100;
    damageEnemy(s, s.enemies[0], 1e9);
    expect(s.apexUnlockedNow).toBe(true); expect(s.apexUnlocked).toBe(false); expect(s.phase).toBe('victory'); expect(formChoices(s)).not.toContain(3); void sim;
  });
  it('without the save flag Form III can never start, however full the Drive', () => {
    const { sim, s } = setup([], { apex: false }); expect(formChoices(s)).not.toContain(3); startForm(sim); expect(s.cinema?.to).not.toBe(3);
  });
  it('is available only after the late-midgame mark (10:00) with a full Drive gauge', () => {
    const { s } = setup([], { gate: 600 }); s.time = 599; expect(formChoices(s)).not.toContain(3); s.time = 601; expect(formChoices(s)).toContain(3);
    s.player.drive = 99; expect(formChoices(s)).not.toContain(3);
  });
});

describe('form selector (opens on the press, run frozen while open)', () => {
  const press = (sim: Simulation, o: Partial<InputState> = {}) => { sim.step(DT, idle({ f: true, fHeld: true, ...o })); sim.step(DT, idle({ fHeld: false })); };
  it('with several forms ready F opens the picker at once, freezing the run; a second press (double-tap) starts the remembered form', () => {
    const a = setup(); expect(formChoices(a.s)).toEqual([1, 2, 3]); expect(selectedForm(a.s)).toBe(3);
    press(a.sim); expect(a.s.selector.open).toBe(true); expect(a.s.cinema).toBeNull(); expect(a.s.selector.pick).toBe(3);
    const t = a.s.time; run(a.sim, 1); expect(a.s.time).toBe(t);      // frozen while the picker is open
    press(a.sim); expect(a.s.cinema?.to).toBe(3); expect(a.s.selector.open).toBe(false);
  });
  it('1 / 2 / 3 start the card, move + confirm works, cancel closes without starting, and it times out by itself', () => {
    const k = setup(); press(k.sim); k.sim.step(DT, idle({ selPick: 2 })); expect(k.s.cinema?.to).toBe(2);
    const m = setup(); press(m.sim); m.sim.step(DT, idle({ selMove: -1 })); expect(m.s.selector.pick).toBe(2); m.sim.step(DT, idle({ selMove: -1 })); expect(m.s.selector.pick).toBe(1); m.sim.step(DT, idle({ selMove: 1 })); expect(m.s.selector.pick).toBe(2); m.sim.step(DT, idle({ selConfirm: true })); expect(m.s.cinema?.to).toBe(2);
    const c = setup(); press(c.sim); c.sim.step(DT, idle({ selCancel: true })); expect(c.s.selector.open).toBe(false); expect(c.s.cinema).toBeNull(); expect(c.s.player.form).toBe(0);
    const o = setup(); press(o.sim); run(o.sim, 4.2); expect(o.s.selector.open).toBe(false); expect(o.s.cinema).toBeNull();
  });
  it('an explicit Cometheart pick is remembered as the highlighted card', () => {
    const a = setup(); a.s.selector.pick = 2; startForm(a.sim); expect(a.s.cinema?.to).toBe(2);
  });
  it('with exactly one ready form (Flarebound at 65%) F starts it at once', () => {
    const a = setup(); a.s.player.drive = 70; a.sim.step(DT, idle({ f: true })); expect(a.s.selector.open).toBe(false); expect(a.s.player.form).toBe(1);
  });
});

describe('Form III reveal', () => {
  it('first activation freezes the whole run for ~3.6 s, repeats are ~1.3 s, and nothing leaks while frozen', () => {
    const { sim, s } = setup([[1180, 800, 60]]); s.enemies[0].speed = 60; s.player.dashCooldown = 2; s.player.riftCooldown = 3; s.selector.pick = 3;
    startForm(sim); expect(s.cinema).not.toBeNull(); expect(s.cinema!.dur).toBeGreaterThanOrEqual(3.4); expect(s.cinema!.dur).toBeLessThanOrEqual(3.8);
    const t0 = s.time, ex = s.enemies[0].x, cd = s.player.dashCooldown, rc = s.player.riftCooldown, hp = s.player.hp;
    run(sim, 1.5, idle({ x: 1, dash: true, beam: true, beamHeld: true, sphere: true }));
    expect([s.time, s.enemies[0].x, s.player.dashCooldown, s.player.riftCooldown, s.cast, s.player.hp]).toEqual([t0, ex, cd, rc, null, hp]);
    run(sim, APEX.cinemaFirst.dur); expect(s.cinema).toBeNull(); expect(s.player.form).toBe(3); expect(s.apexSeen).toBe(1);
    // repeat variant
    s.player.form = 0; s.player.drive = 100; s.player.formCooldown = 0; s.selector.pick = 3; startForm(sim); expect(s.cinema!.dur).toBeLessThanOrEqual(1.5);
  });
  it('shoves and staggers nearby non-bosses at the break, never bosses; pause freezes the reveal; commit emits once', () => {
    const { sim, s } = setup([[1160, 800, 60], [2000, 800, 60]]); s.enemies.push(enemy(300, 1180, 840, 1000, 'warden')); const n0 = s.enemies[0].x, b0 = s.enemies[2].x; s.selector.pick = 3;
    startForm(sim); run(sim, 1.0); sim.togglePause(); const t = s.cinema!.t; run(sim, 1); expect(s.cinema!.t).toBe(t); sim.togglePause();
    run(sim, APEX.cinemaFirst.breakAt - t + 0.05); expect(s.enemies[0].x).toBeGreaterThan(n0 + 30); expect(s.enemies[0].stagger).toBeGreaterThan(0); expect(s.enemies[2].x).toBe(b0);
    run(sim, 2); expect(s.abilityEvents.filter(e => e.kind === 'form3_commit').length).toBeLessThanOrEqual(1);
  });
  it('after the reveal there is no free damage: i-frames cover the resume', () => { const r = setup(); r.s.selector.pick = 3; startForm(r.sim); run(r.sim, APEX.cinemaFirst.dur + 0.02); expect(r.s.cinema).toBeNull(); expect(r.s.player.invulnerable).toBeGreaterThan(0.3); });
});

describe('glide, dash and drain', () => {
  it('Form III eases into movement (no instant start) and the dash is a short near-instant displacement', () => {
    const { sim, s } = apexForm(); const x0 = s.player.x; sim.step(DT, idle({ x: 1 })); const d1 = s.player.x - x0; run(sim, 0.4, idle({ x: 1 })); const v = s.player.vx; expect(d1).toBeLessThan(250 * APEX.speedMul * DT * 0.6); expect(v).toBeGreaterThan(250);
    run(sim, 0.5); s.player.dashCooldown = 0; const xd = s.player.x; sim.step(DT, idle({ x: 1, dash: true })); run(sim, 0.2); expect(s.player.x - xd).toBeGreaterThan(120); expect(s.player.x - xd).toBeLessThan(260);
  });
  it('drains Drive, ends cleanly with a cooldown and drops an unreleased charge', () => {
    const { sim, s } = apexForm(); s.player.drive = 1; sim.step(DT, idle({ x: 0, beam: true, beamHeld: true })); expect(s.cast?.kind).toBe('rift'); run(sim, 0.6, idle({ beamHeld: true }));
    expect(s.player.form).toBe(0); expect(s.player.formCooldown).toBeGreaterThan(0); expect(s.cast).toBeNull(); expect(s.abilityEvents.some(e => e.kind === 'form3_end')).toBe(true);
  });
});

describe('E Silver Rift', () => {
  it('charges while Kai keeps moving (at the movement penalty) and follows a free diagonal aim', () => {
    const { sim, s } = apexForm(); const x0 = s.player.x; const a = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
    sim.step(DT, idle({ x: 1, beam: true, beamHeld: true, aimX: a.x, aimY: a.y, aimSrc: 'pointer' })); run(sim, 0.4, idle({ x: 1, beamHeld: true, aimX: a.x, aimY: a.y, aimSrc: 'pointer' }));
    expect(s.cast?.kind).toBe('rift'); expect(s.cast!.released).toBe(false); expect(s.player.x).toBeGreaterThan(x0 + 20);
    expect(s.cast!.dirX).toBeCloseTo(a.x, 3); expect(s.cast!.dirY).toBeCloseTo(a.y, 3);   // not snapped to a cardinal
    const x1 = s.player.x; run(sim, 0.3, idle({ x: 1, beamHeld: true, aimX: a.x, aimY: a.y, aimSrc: 'pointer' })); expect(s.player.x - x1).toBeLessThan(250 * APEX.speedMul * 0.3 * 0.75);
  });
  it('a controller stick aim works the same, and the aim is remembered when the stick is released', () => {
    const { sim, s } = apexForm(); sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 0, aimY: 1, aimSrc: 'stick' })); run(sim, 0.1, idle({ beamHeld: true, aimX: -0.6, aimY: 0.8, aimSrc: 'stick' }));
    run(sim, 0.1, idle({ beamHeld: true })); const d = riftAim(s); expect(d.x).toBeCloseTo(-0.6, 2); expect(d.y).toBeCloseTo(0.8, 2);
  });
  it('short and full charges are different tiers; the release no longer blinks first and fires from the hand origin', () => {
    const quick = apexForm([[1300, 770, 400000]]); quick.sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(quick.sim, 0.2, idle({ aimX: 1, aimY: 0, aimSrc: 'pointer' }));
    expect(quick.s.cast?.released).toBe(true); expect(quick.s.cast?.tier).toBe(0); expect(Math.hypot(quick.s.player.x - 1100, quick.s.player.y - 800)).toBeLessThan(2);   // the blink moved into the post-hit chain
    run(quick.sim, 0.45); const dq = 400000 - quick.s.enemies[0].hp;
    const full = apexForm([[1300, 770, 400000]]); full.sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(full.sim, RIFT.maxCharge, idle({ beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' }));
    expect(full.s.cast?.tier).toBe(2); run(full.sim, 0.7); const df = 400000 - full.s.enemies[0].hp; expect(dq).toBeGreaterThan(0); expect(df).toBeGreaterThan(dq * 1.5);
    expect(full.s.abilityEvents.some(e => e.kind === 'rift_fire')).toBe(true);
  });
  const field = (): Array<[number, number, number?]> => { const out: Array<[number, number, number?]> = [[1300, 770, 400000]]; for (let x = 300; x <= 2000; x += 300) for (let y = 300; y <= 1400; y += 300) if (Math.hypot(x - 1100, y - 800) > 120 && Math.hypot(x - 1300, y - 770) > 60) out.push([x, y, 400000]); return out; };
  it('after the first beam damages something, Kai teleports five times and fires a beam at the nearest target from each landing', () => {
    const r = apexForm(field()); const hops: Array<{ x: number; y: number }> = []; let fires = 0; const seen = new Set<number>(); let hpTotal0 = r.s.enemies.reduce((a, e) => a + e.hp, 0);
    r.sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' }));
    for (let i = 0; i < 480; i++) { r.sim.step(DT, idle({ aimX: 1, aimY: 0, aimSrc: 'pointer' })); for (const e of r.s.abilityEvents) if (!seen.has(e.id)) { seen.add(e.id); if (e.kind === 'rift_hop') hops.push({ x: e.x, y: e.y }); if (e.kind === 'rift_fire' && (e.n ?? 0) >= 3) fires++; } }
    expect(hops.length).toBe(CHAIN.follow); expect(fires).toBe(CHAIN.follow); expect(r.s.cast).toBeNull();
    expect(r.s.enemies.reduce((a, e) => a + e.hp, 0)).toBeLessThan(hpTotal0);
    const landed = hops.map((_h, i) => (i === hops.length - 1 ? { x: r.s.player.x, y: r.s.player.y } : hops[i + 1])); void landed;
    for (let i = 1; i < hops.length; i++) expect(Math.hypot(hops[i].x - hops[i - 1].x, hops[i].y - hops[i - 1].y)).toBeGreaterThan(CHAIN.minApart);
    expect(r.s.player.x).toBeGreaterThan(40); expect(r.s.player.y).toBeGreaterThan(40);
  });
  it('the chain is deterministic per seed and differs between seeds', () => {
    const pos = (seed: number) => { const r = apexForm(field()); r.s.seed = seed; r.sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(r.sim, 4, idle({ aimX: 1, aimY: 0, aimSrc: 'pointer' })); return [Math.round(r.s.player.x), Math.round(r.s.player.y)].join(','); };
    expect(pos(11)).toBe(pos(11)); expect(pos(11)).not.toBe(pos(97));
  });
  it('a first beam that hits nothing finishes normally with no teleports; a lone dying target ends the chain cleanly', () => {
    const miss = apexForm([[1300, 1500, 4000]]); miss.sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(miss.sim, 3, idle({ aimX: 1, aimY: 0, aimSrc: 'pointer' }));
    expect(miss.s.abilityEvents.filter(e => e.kind === 'rift_hop').length).toBe(0); expect(miss.s.cast).toBeNull(); expect(Math.hypot(miss.s.player.x - 1100, miss.s.player.y - 800)).toBeLessThan(2);
    const lone = apexForm([[1300, 770, 1]]); lone.sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(lone.sim, 3, idle({ aimX: 1, aimY: 0, aimSrc: 'pointer' }));
    expect(lone.s.abilityEvents.filter(e => e.kind === 'rift_hop').length).toBe(0); expect(lone.s.cast).toBeNull();
  });
  it('hits a boss too, has a cooldown (no spam), and cancelling a charge is never free', () => {
    const { sim, s } = apexForm(); s.enemies = [enemy(700, 1300, 770, 4000, 'warden')]; sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(sim, 0.3, idle({ aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(sim, 1);
    expect(s.enemies[0].hp).toBeLessThan(4000); expect(s.player.riftCooldown).toBeGreaterThan(5); run(sim, 4); expect(s.cast).toBeNull(); sim.step(DT, idle({ beam: true, beamHeld: true })); expect(s.cast).toBeNull();
    const c = apexForm(); c.sim.step(DT, idle({ beam: true, beamHeld: true })); c.sim.step(DT, idle({ beamHeld: true, x: 1, dash: true })); expect(c.s.cast).not.toBeNull(); c.sim.step(DT, idle({ beamHeld: true, x: 1, dash: true })); expect(c.s.cast).toBeNull(); expect(c.s.player.riftCooldown).toBeGreaterThanOrEqual(RIFT.cancelCooldown - 0.1);
  });
  it('Lance upgrades carry into Silver Rift (damage, width, pulses)', () => {
    const base = apexForm([[1300, 770, 4000]]); const up = apexForm([[1300, 770, 4000]]); up.s.mods.beamDamage = 2; up.s.mods.beamWidth = 1.5;
    for (const r of [base, up]) { r.sim.step(DT, idle({ beam: true, beamHeld: true, aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(r.sim, 0.2, idle({ aimX: 1, aimY: 0, aimSrc: 'pointer' })); run(r.sim, 1.2); }
    expect(4000 - up.s.enemies[0].hp).toBeGreaterThan((4000 - base.s.enemies[0].hp) * 1.8);
  });
  it('animation: the charge hold loops for as long as E is held, then plays the release tail', () => {
    const a = { frames: 20, fps: 20, loop: false, sheet: 'x', events: { hold_start: 4, hold_end: 7, release: 8 } } as KaiClipInfo;
    const hold = new Set<number>(); for (let t = 0.2; t < 1.4; t += 0.05) hold.add(castFrame(a, 'rift', t, 3, false, 0)); expect([...hold].every(f => f >= 4 && f <= 7)).toBe(true);
    expect(castFrame(a, 'rift', 1.5, 2.4, true, 0.0)).toBeGreaterThanOrEqual(8); expect(castFrame(a, 'rift', 2.3, 2.4, true, 0.9)).toBeLessThanOrEqual(19);
  });
});

describe('R Instinct Reversal (sustained)', () => {
  const crowd: Array<[number, number, number?]> = [[1180, 800], [1200, 860], [1050, 760], [1000, 840], [1230, 740], [1150, 700], [1300, 820], [1100, 900]];
  const strikes = (s: { abilityEvents: Array<{ kind: string }> }) => s.abilityEvents.filter(e => e.kind === 'reversal_strike').length;
  it('keeps striking past four targets and re-strikes survivors while enemies remain in radius', () => {
    const { sim, s } = apexForm(crowd); sim.step(DT, idle({ sphere: true })); expect(s.cast?.kind).toBe('reversal'); let n = 0; const seen = new Set<number>();
    for (let i = 0; i < 240; i++) { sim.step(DT, idle()); for (const e of s.abilityEvents) if (!seen.has(e.id)) { seen.add(e.id); if (e.kind === 'reversal_strike') n++; } }
    expect(n).toBeGreaterThan(8); expect(s.enemies.filter(e => e.hp < 400).length).toBeGreaterThanOrEqual(7); expect(s.cast?.kind).toBe('reversal');
  });
  it('stops promptly once nothing is left in radius and pays the full cooldown', () => {
    const { sim, s } = apexForm([[1180, 800, 30], [1200, 860, 30], [1050, 760, 30]]); sim.step(DT, idle({ sphere: true })); run(sim, 3);
    expect(s.enemies.every(e => e.hp <= 0)).toBe(true); expect(s.cast).toBeNull(); expect(s.player.reversalCooldown).toBeGreaterThan(10);
  });
  it('acquires an enemy that arrives mid-chain', () => {
    const { sim, s } = apexForm([[1180, 800, 400]]); sim.step(DT, idle({ sphere: true })); run(sim, 0.5);
    s.enemies.push(enemy(900, s.player.x - 20, s.player.y + 120, 60)); run(sim, 2); { const n = s.enemies.find(e => e.id === 900); expect(!n || n.hp < 60).toBe(true); }
  });
  it('Kai never ends outside the arena, and a cast with nobody near fails gracefully', () => {
    const { sim, s } = apexForm([[200, 200, 400], [260, 210, 400]]); s.player.x = 230; s.player.y = 260; sim.step(DT, idle({ sphere: true })); run(sim, 1.5); expect(s.player.x).toBeGreaterThan(20); expect(s.player.y).toBeGreaterThan(20);
    const e = apexForm(); e.sim.step(DT, idle({ sphere: true })); run(e.sim, 0.8); expect(e.s.cast).toBeNull(); expect(e.s.player.reversalCooldown).toBeLessThan(5);
  });
  it('a boss can be hit repeatedly but only once per beat; R again ends the chain with the full cooldown', () => {
    const { sim, s } = apexForm([]); s.enemies.push(enemy(800, 1230, 800, 4000, 'warden')); sim.step(DT, idle({ sphere: true })); run(sim, 1.2);
    const n = strikes(s); const lost = 4000 - s.enemies[0].hp; expect(lost).toBeGreaterThan(REVERSAL.damage); expect(lost).toBeLessThan(REVERSAL.damage * 9 + REVERSAL.finishDamage * 3);
    sim.step(DT, idle({ sphere: true })); run(sim, 0.3); expect(s.cast).toBeNull(); expect(s.player.reversalCooldown).toBeGreaterThan(10); void n;
  });
  it('Nova upgrades widen the strike radius', () => {
    const near: Array<[number, number, number?]> = [[1100 + 330, 800, 400]]; const a = apexForm(near); const b = apexForm(near); b.s.mods.sphereRadius = 1.4;
    a.sim.step(DT, idle({ sphere: true })); b.sim.step(DT, idle({ sphere: true })); expect(a.s.cast?.dur).toBeLessThan(1e8); expect(b.s.cast?.dur).toBeGreaterThan(1e8);
  });
});

describe('Perfect Evasion', () => {
  it('refuses one hit, sidesteps Kai, then needs its cooldown; no double trigger on one hit', () => {
    const { sim, s } = apexForm([[1130, 800, 400]]); const hp = s.player.hp, x = s.player.x, y = s.player.y;
    expect(damagePlayer(s, 20, 'lunge')).toBe(false); expect(s.player.hp).toBe(hp); expect(Math.hypot(s.player.x - x, s.player.y - y)).toBeGreaterThan(EVASION.sidestep * 0.4);
    expect(s.player.evadeCooldown).toBeGreaterThan(8); expect(s.abilityEvents.filter(e => e.kind === 'evasion').length).toBe(1);
    run(sim, EVASION.iframes + 0.1); expect(damagePlayer(s, 20, 'lunge')).toBe(true); expect(s.player.hp).toBeLessThan(hp);   // cooldown: the next hit lands
    run(sim, EVASION.cooldown + 0.1); s.player.invulnerable = 0; expect(damagePlayer(s, 20, 'lunge')).toBe(false);
  });
  it('does not exist outside Form III, and does not eat a dash', () => {
    const a = setup(); expect(damagePlayer(a.s, 5)).toBe(true); const { s } = apexForm(); s.player.dashRemaining = 0.1; s.player.invulnerable = 0; expect(damagePlayer(s, 5)).toBe(true);
  });
  it('the HUD can tell available from recovering (cooldown exposed)', () => { const { s } = apexForm(); expect(s.player.evadeCooldown).toBe(0); damagePlayer(s, 5); expect(s.player.evadeCooldown).toBeGreaterThan(0); });
});

describe('finisher and regressions', () => {
  it('a Form III boss kill raises the silver finisher (not the gold one) and still reaches victory', () => {
    const { s } = apexForm(); s.enemies = [enemy(900, 1300, 800, 100, 'seraph')]; damageEnemy(s, s.enemies[0], 1e9);
    expect(s.abilityEvents.some(e => e.kind === 'finisher3')).toBe(true); expect(s.abilityEvents.some(e => e.kind === 'finisher')).toBe(false); expect(s.phase).toBe('victory');
  });
  it('Form I / II keep their own E / R (Fracture Lance / Dragonfang) and an unrelated cast is untouched', () => {
    const a = setup([], { apex: false }); a.s.player.form = 2; a.sim.step(DT, idle({ beam: true })); expect(a.s.cast?.kind).toBe('dragon');
    const b = setup([], { apex: false }); b.s.player.form = 0; b.sim.step(DT, idle({ beam: true })); expect(b.s.cast?.kind).toBe('beam');
  });
});

describe('controller right stick', () => {
  const pad = (axes: number[]): PadLike => ({ index: 0, connected: true, mapping: 'standard', axes, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
  it('gives a free analog direction (not snapped to 8 ways) with a deadzone, and ignores drift', () => {
    const r = readPad(pad([0, 0, 0.5, 0.3])); expect(Math.atan2(r.aim.y, r.aim.x)).toBeCloseTo(Math.atan2(0.3, 0.5), 2);   // 31 degrees: no snapping
    expect(readPad(pad([0, 0, 0.05, -0.04])).aim).toEqual({ x: 0, y: 0 }); expect(AIM_DEADZONE).toBeGreaterThan(0.2);
    expect(readPad(pad([0.9, 0, 0, 0])).aim).toEqual({ x: 0, y: 0 });   // the left stick never aims
  });
});

import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { AbilityEvent, Enemy, InputState } from '../sim/GameState';
import { NO_CONFIG } from '../sim/RunConfig';
import { SERA, SERA_E, SERA_R, SERA_SHIFT, SERA_V, TRACE } from '../content/soraSeraph';
import { ASCEND } from '../content/heroKits';
import { formChoices, activateForm } from '../sim/FormSystem';
import { seraShift, tracesOf } from '../sim/SoraSeraph';
import { damageEnemy } from '../sim/CombatSystem';
import { dashMax } from '../sim/MovementSystem';
import { SLOT_KEYS } from '../sim/CoopSystem';
import { migrateB22, blankB22 } from '../b22/save';
import { withEverythingUnlocked } from '../sim/SaveSystem';
import { seraSfx, SFX } from '../game/audio/b22Sfx';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const mob = (id: number, x: number, y: number, hp = 1e6, kind: Enemy['kind'] = 'pursuer'): Enemy => ({ id, x, y, kind, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
function sora(form: 0 | 1 | 2, enemies: Array<[number, number, number?, Enemy['kind']?]> = [], cfg: Partial<typeof NO_CONFIG> = {}) {
  const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'sora', heroForm: true, soraF2: true, ...cfg }), s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9;
  s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.hp = s.player.maxHp = 1e6; s.player.form = form; s.player.drive = 100; s.player.aimX = 1; s.player.aimY = 0;
  s.enemies = enemies.map(([x, y, hp, k], i) => mob(100 + i, x, y, hp ?? 1e6, k)); return { sim, s };
}
const collect = (sim: Simulation, sec: number, input: InputState = idle()) => { const seen = new Set<number>(), out: AbilityEvent[] = []; for (let k = 0; k < Math.round(sec / DT); k++) { sim.step(DT, input); for (const e of sim.state.abilityEvents) if (!seen.has(e.id)) { seen.add(e.id); out.push(e); } } return out; };
const hitsOf = (e: AbilityEvent) => ((e.n ?? 0) >> 8) & 63;

describe('Eventide Seraph unlock and lifecycle', () => {
  it('is gated by the saved flag and by Azure Sovereign being unlocked; old saves default to locked', () => {
    expect(blankB22().soraF2).toBeFalsy(); expect(migrateB22({ v: 1 }).soraF2).toBeFalsy(); expect(migrateB22({ soraF2: true }).soraF2).toBe(true); expect(migrateB22({ soraF2: 'yes' }).soraF2).toBeFalsy();
    expect(sora(0, [], { soraF2: false }).s.soraF2).toBe(false); expect(sora(0, [], { heroForm: false }).s.soraF2).toBe(false); expect(sora(0).s.soraF2).toBe(true);
    const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'ren', heroForm: true, soraF2: true }); expect(sim.state.soraF2).toBe(false);
  });
  it('unlock-all QA save includes it', () => { const save = { version: 1, settings: {}, b22: blankB22(), meta: { feats: {}, mastery: {}, heroes: {} } } as never; expect(withEverythingUnlocked(save).b22!.soraF2).toBe(true); });
  it('the earn flag alone does not grant the form in the live run', () => {
    const { s } = sora(0, [], { soraF2: false }); expect(s.soraF2).toBe(false); s.soraF2Now = true; expect(s.soraF2).toBe(false); expect(formChoices(s)).not.toContain(2);
  });
  it('defeating the Null Seraph as Sora flags the unlock but the form is not in that run; other heroes, a locked Sovereign and a Warden earn nothing', () => {
    const a = sora(1, [[1300, 800, 100, 'seraph']], { soraF2: false }); damageEnemy(a.s, a.s.enemies[0], 1e9); expect(a.s.soraF2Now).toBe(true); expect(a.s.soraF2).toBe(false); expect(formChoices(a.s)).not.toContain(2);
    const b = sora(1, [[1300, 800, 100, 'seraph']], { soraF2: false, heroForm: false }); damageEnemy(b.s, b.s.enemies[0], 1e9); expect(b.s.soraF2Now).toBe(false);
    const c = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'ren', heroForm: true }), cs = c.state; cs.enemies = [mob(900, 1300, 800, 100, 'seraph')]; damageEnemy(cs, cs.enemies[0], 1e9); expect(cs.soraF2Now).toBe(false);
    const d = sora(1, [[1300, 800, 100, 'warden']], { soraF2: false }); damageEnemy(d.s, d.s.enemies[0], 1e9); expect(d.s.soraF2Now).toBe(false);
  });
  it('from base with full Drive both forms are offered; with the flag off only Sovereign', () => {
    expect(formChoices(sora(0).s)).toEqual([1, 2]); expect(formChoices(sora(0, [], { soraF2: false }).s)).toEqual([1]); expect(formChoices(sora(1).s)).toEqual([]);
  });
  it('the first reveal is the long one and counts per form; the Sovereign counter is untouched', () => {
    const { sim, s } = sora(0); s.heroFormSeen = 3; expect(activateForm(s, 2)).toBe(true); expect(s.cinema?.dur).toBe(SERA.cinemaFirst.dur); expect(s.cinema?.to).toBe(2);
    collect(sim, SERA.cinemaFirst.dur + 0.2); expect(s.player.form).toBe(2); expect(s.soraSeen2).toBe(1); expect(s.heroFormSeen).toBe(3);
    s.player.form = 0; s.player.drive = 100; s.player.formCooldown = 0; activateForm(s, 2); expect(s.cinema?.dur).toBe(SERA.cinemaRepeat.dur);
  });
  it('drains at its own rate and ends cleanly into the form cooldown with the traces cleared', () => {
    const { sim, s } = sora(2, [[1150, 800]]); tracesOf(s).push({ id: 100, t: 99 }); s.player.drive = 1; collect(sim, 0.6); expect(s.player.form).toBe(0); expect(s.player.formCooldown).toBeGreaterThan(SERA.cooldown - 2); expect(tracesOf(s).length).toBe(0);
    const a = sora(2), b = sora(1); collect(a.sim, 2); collect(b.sim, 2); expect(100 - a.s.player.drive).toBeCloseTo(SERA.drain * 2, 0); expect(100 - b.s.player.drive).toBeCloseTo(ASCEND.sora.drain * 2, 0);
  });
});

describe('Form Shift Sovereign <-> Seraph', () => {
  it('costs Drive, starts the shared cooldown, works both ways and never refills', () => {
    const { s } = sora(1); s.player.drive = 80; expect(seraShift(s, 2)).toBe(true); expect(s.player.form).toBe(2); expect(s.player.drive).toBe(80 - SERA_SHIFT.cost); expect(s.player.formCooldown).toBeCloseTo(SERA_SHIFT.cooldown, 5);
    expect(seraShift(s, 1)).toBe(false); s.player.formCooldown = 0; expect(seraShift(s, 1)).toBe(true); expect(s.player.form).toBe(1); expect(s.player.drive).toBe(80 - 2 * SERA_SHIFT.cost);
  });
  it('is refused below the minimum Drive, in base, during the reveal, when locked, or to the same form', () => {
    const a = sora(1); a.s.player.drive = SERA_SHIFT.minDrive - 1; expect(seraShift(a.s, 2)).toBe(false);
    expect(seraShift(sora(0).s, 2)).toBe(false); expect(seraShift(sora(1, [], { soraF2: false }).s, 2)).toBe(false);
    const d = sora(1); expect(seraShift(d.s, 1)).toBe(false); d.s.cinema = { t: 0, dur: 1, breakAt: 0.5, commitAt: 0.5, first: false, from: 1, to: 2, broke: false, committed: false }; expect(seraShift(d.s, 2)).toBe(false);
  });
  it('shifting out cancels an unreleased V and clears the traces', () => {
    const { sim, s } = sora(2, [[1300, 800]]); sim.step(DT, idle({ sig: true, sigHeld: true })); expect(s.hx.act?.act).toBe('astral_rebirth'); tracesOf(s).push({ id: 100, t: 99 }); expect(seraShift(s, 1)).toBe(true); expect(s.hx.act).toBeNull(); expect(tracesOf(s).length).toBe(0);
  });
  it('the F key shifts through the real input path', () => {
    const { sim, s } = sora(1); s.player.drive = 90; sim.step(DT, idle({ f: true })); expect(s.player.form).toBe(2);
  });
});

describe('Prism Feathers and Star Traces', () => {
  it('fires four beats: left, right, a crossing pair, then a piercing lance, all real feather bolts', () => {
    const { sim, s } = sora(2, [[1400, 800]]); s.player.attackClock = 0; const ev = collect(sim, 4.2); const autos = ev.filter(e => e.kind === 'sera_auto');
    expect(autos.length).toBeGreaterThanOrEqual(4); expect(autos.slice(0, 4).map(e => e.n! & 3)).toEqual([0, 1, 2, 3]); expect(autos.slice(0, 4).map(e => (e.n! >> 4) & 7)).toEqual([1, 1, 2, 1]);
  });
  it('direct hits leave at most one trace per foe, capped at 8 foes, expiring after their life', () => {
    const many: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [1250 + (i % 4) * 22, 700 + Math.floor(i / 4) * 55]);
    const { sim, s } = sora(2, many); s.player.attackClock = 0; collect(sim, 6); const t = tracesOf(s); expect(t.length).toBeLessThanOrEqual(TRACE.cap); expect(new Set(t.map(x => x.id)).size).toBe(t.length);
    s.player.attackClock = 1e9; collect(sim, TRACE.life + 0.5); expect(tracesOf(s).length).toBe(0);
  });
  it('bosses are never traced, and nothing but a direct feather hit creates a trace', () => {
    const { sim, s } = sora(2, [[1300, 800, 1e6, 'warden']]); s.player.attackClock = 0; collect(sim, 3); expect(tracesOf(s).length).toBe(0);
    const o = sora(2, [[1300, 800]]); o.sim.step(DT, idle({ q: true })); collect(o.sim, 1); expect(tracesOf(o.s).length).toBe(0);   // Q, E, R and V never mark
  });
  it('is deterministic: the same seed and input give identical events', () => {
    const run = () => { const { sim, s } = sora(2, [[1300, 800], [1320, 840]]); s.player.attackClock = 0; return collect(sim, 3).map(e => `${e.kind}:${e.n}:${Math.round(e.x)}`).join('|'); };
    expect(run()).toBe(run());
  });
});

describe('Constellation Pierce (Q)', () => {
  it('fires five lances in order along the aim and hits what they cross', () => {
    const { sim, s } = sora(2, [[1300, 800], [1500, 805]]); const hp0 = s.enemies.map(e => e.hp); sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('constellation_pierce');
    const ev = collect(sim, 1).filter(e => e.kind === 'sera_q_lance'); expect(ev.map(e => e.n! & 15)).toEqual([0, 1, 2, 3, 4]); expect(ev.some(e => ((e.n! >> 4) & 31) > 0)).toBe(true); expect(s.enemies[0].hp).toBeLessThan(hp0[0]);
  });
  it('a lance stops at a wall and never reaches a foe behind it', () => {
    const { sim, s } = sora(2, [[1300, 800]]); s.player.x = 120; s.player.y = 800; s.player.aimX = -1; sim.step(DT, idle({ q: true })); const ev = collect(sim, 1).filter(e => e.kind === 'sera_q_lance');
    expect(ev.length).toBe(5); for (const e of ev) expect(Math.hypot(e.tx! - e.x, e.ty! - e.y)).toBeLessThan(300);
  });
  it('consumes a trace once for a precision follow-up; an untraced foe gets none', () => {
    const { sim, s } = sora(2, [[1300, 800], [1310, 830]]); tracesOf(s).push({ id: 100, t: 99 }); sim.step(DT, idle({ q: true })); const ev = collect(sim, 1);
    expect(ev.filter(e => e.kind === 'sera_burst').length).toBe(1); expect(tracesOf(s).some(t => t.id === 100)).toBe(false);
  });
  it('a miss plays no impact and a boss is damaged but never moved', () => {
    const a = sora(2, []); a.sim.step(DT, idle({ q: true })); const ev = collect(a.sim, 1).filter(e => e.kind === 'sera_q_lance'); expect(ev.every(e => ((e.n! >> 4) & 31) === 0)).toBe(true);
    const { sim, s } = sora(2, [[1300, 800, 1e6, 'warden']]); const bx = s.enemies[0].x, hp = s.enemies[0].hp; sim.step(DT, idle({ q: true })); collect(sim, 1); expect(s.enemies[0].hp).toBeLessThan(hp); expect(Math.abs(s.enemies[0].x - bx)).toBeLessThan(2);
  });
});

describe("Seraph's Descent (E) and Eventide Judgment (R)", () => {
  it('Descent: nodes telegraph first, strikes land in order, the convergence consumes traces once and never before the last strike', () => {
    const { sim, s } = sora(2, [[1230, 800], [1306, 810]]); tracesOf(s).push({ id: 100, t: 99 }, { id: 101, t: 99 }); const hp0 = s.enemies.map(e => e.hp);
    sim.step(DT, idle({ beam: true })); expect(s.hx.act?.act).toBe('seraphs_descent'); const early = collect(sim, SERA_E.lead - 0.1); expect(early.some(e => e.kind === 'sera_e_strike')).toBe(false); expect(s.enemies[0].hp).toBe(hp0[0]);
    const ev = collect(sim, 1.6); const strikes = ev.filter(e => e.kind === 'sera_e_strike'); expect(strikes.map(e => e.n! & 15)).toEqual([0, 1, 2, 3]); const conv = ev.find(e => e.kind === 'sera_e_conv'); expect(conv).toBeTruthy(); expect(ev.indexOf(conv!)).toBeGreaterThan(ev.indexOf(strikes[3]));
    expect(tracesOf(s).length).toBe(0); expect(ev.filter(e => e.kind === 'sera_burst').length).toBe(2); expect(s.enemies[0].hp).toBeLessThan(hp0[0]);
  });
  it('Descent hurts a boss but never moves it, and nothing happens far from the nodes', () => {
    const { sim, s } = sora(2, [[1230, 800, 1e6, 'warden'], [2000, 800]]); const bx = s.enemies[0].x, hp = s.enemies.map(e => e.hp); sim.step(DT, idle({ beam: true })); collect(sim, 2); expect(s.enemies[0].hp).toBeLessThan(hp[0]); expect(Math.abs(s.enemies[0].x - bx)).toBeLessThan(2); expect(s.enemies[1].hp).toBe(hp[1]);
  });
  it('Judgment: seven stars ignite, link, the Phoenix sweeps once and the nova closes once; far foes are untouched, ordinary foes slowed, a boss never moved', () => {
    const { sim, s } = sora(2, [[1300, 800], [1330, 820], [1300, 770, 1e6, 'warden'], [2100, 800]]); sim.step(DT, idle({ sphere: true })); expect(s.hx.act?.act).toBe('eventide_judgment'); const hp0 = s.enemies.map(e => e.hp), bx = s.enemies[2].x;
    const ev = collect(sim, SERA_R.endAt + 0.3); expect(ev.filter(e => e.kind === 'sera_r_node').length).toBe(SERA_R.stars); expect(ev.filter(e => e.kind === 'sera_r_link').length).toBe(1); expect(ev.filter(e => e.kind === 'sera_r_sweep').length).toBe(1); expect(ev.filter(e => e.kind === 'sera_r_nova').length).toBe(1);
    const order = ['sera_r_node', 'sera_r_link', 'sera_r_sweep', 'sera_r_nova'].map(k => ev.findIndex(e => e.kind === k)); expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(s.enemies[0].hp).toBeLessThan(hp0[0]); expect(s.enemies[2].hp).toBeLessThan(hp0[2]); expect(Math.abs(s.enemies[2].x - bx)).toBeLessThan(2); expect(s.enemies[3].hp).toBe(hp0[3]);
  });
});

describe('Astral Rebirth (V)', () => {
  it('charge tiers rise with the hold and a cancelled charge is free', () => {
    const { sim, s } = sora(2, [[1300, 800]]); sim.step(DT, idle({ sig: true, sigHeld: true })); const ev = collect(sim, SERA_V.stages[2] + 0.1, idle({ sigHeld: true })); expect(ev.filter(e => e.kind === 'sera_v_tier').map(e => e.n! & 3)).toEqual([1, 2, 3]);
    sim.step(DT, idle({ sigAbort: true })); expect(s.hx.act).toBeNull(); expect(s.player.sigCd).toBe(0); expect(ev.some(e => e.kind === 'sera_v_release')).toBe(false);
  });
  it('a release that touches nothing is a miss: cooldown capped, no pulse, no burst', () => {
    const { sim, s } = sora(2, []); sim.step(DT, idle({ sig: true, sigHeld: true })); collect(sim, 0.2, idle({ sigHeld: true })); const ev = collect(sim, 1.6, idle());
    expect(ev.some(e => e.kind === 'sera_v_release')).toBe(true); expect(ev.some(e => e.kind === 'sera_v_miss')).toBe(true); expect(ev.some(e => e.kind === 'sera_v_pulse')).toBe(false); expect(s.player.sigCd).toBeLessThanOrEqual(8);
  });
  it('a full-tier hit unfolds the Phoenix burst and a bounded aftershock; a trace inside is consumed once', () => {
    const { sim, s } = sora(2, [[1260, 800]]); tracesOf(s).push({ id: 100, t: 99 }); sim.step(DT, idle({ sig: true, sigHeld: true })); collect(sim, SERA_V.stages[2] + 0.1, idle({ sigHeld: true })); const ev = collect(sim, 1.6, idle());
    const pulses = ev.filter(e => e.kind === 'sera_v_pulse'); expect(pulses.map(e => e.n! & 31)).toEqual([0, 1, 2, 3]); expect(pulses.every(e => ((e.n! >> 5) & 7) === 3)).toBe(true); expect(ev.some(e => e.kind === 'sera_v_hit')).toBe(true); expect(ev.filter(e => e.kind === 'sera_burst').length).toBe(1);
  });
  it('a wall ends it with a miss and no blast', () => {
    const { sim, s } = sora(2, []); s.player.x = 80; s.player.aimX = -1; sim.step(DT, idle({ sig: true, sigHeld: true })); collect(sim, 0.2, idle({ sigHeld: true })); const ev = collect(sim, 1, idle()); expect(ev.some(e => e.kind === 'sera_v_pulse')).toBe(false);
  });
});

describe('flight, Overdrive and integration hazards', () => {
  it('Celestial Glide lifts faster than Sovereign flight, costs Drive, and a dive lands a bounded flare only after an eligible flight', () => {
    const a = sora(2, [[1100, 860]]), b = sora(1, [[1100, 860]]); for (const q of [a, b]) collect(q.sim, 0.9, idle({ flyHeld: true }));
    expect(a.s.player.flyT).toBeGreaterThan(0); expect(b.s.player.flyT).toBeGreaterThan(0); expect(a.s.player.air).toBeGreaterThanOrEqual(b.s.player.air - 1e-9); expect(a.s.player.drive).toBeLessThan(100); expect(a.s.player.invulnerable).toBeLessThan(0.5);
    const ev = collect(a.sim, 0.5, idle()); const land = ev.find(e => e.kind === 'sora_fly_land'); expect(land).toBeTruthy(); expect(land!.n! & 1).toBe(1); expect(hitsOf(land!)).toBeGreaterThan(0); expect(a.s.player.flyT).toBe(0);
  });
  it('the Overdrive timer and meter are the shared Sora ones, and the phoenix event reports the form', () => {
    const { sim, s } = sora(2); s.player.odMeter = 100; const ev = collect(sim, 0.2, idle({ od: true })); expect(s.player.odT).toBeGreaterThan(0); expect(ev.find(e => e.kind === 'sora_od_start')?.n).toBe(2);
  });
  it('co-op slot state carries the new fields and every seraph event has a recipe', () => {
    for (const k of ['soraF2', 'soraF2Now', 'soraSeen2']) expect(SLOT_KEYS as readonly string[]).toContain(k);
    const cases: Array<[string, number]> = [['sera_auto', 0], ['sera_auto', 3], ['sera_trace', 1], ['sera_burst', 1], ['sera_q_cast', 0], ['sera_q_lance', 0], ['sera_q_lance', 1 << 4], ['sera_e_node', 0], ['sera_e_strike', 0], ['sera_e_conv', 0], ['sera_r_cast', 0], ['sera_r_node', 0], ['sera_r_link', 0], ['sera_r_sweep', 0], ['sera_r_nova', 0], ['sera_v_charge', 0], ['sera_v_tier', 1], ['sera_v_release', 0], ['sera_v_hit', 0], ['sera_v_pulse', (3 << 5) | 2], ['sera_v_pulse', 0], ['sera_v_miss', 0], ['sera_v_block', 0], ['sera_v_cancel', 0], ['sera_start', 0], ['sera_break', 0], ['sera_commit', 0], ['sera_shift', 0], ['sera_end', 0]];
    for (const [k, n] of cases) { const r = seraSfx(k, n); expect(r, `${k}/${n}`).toBeTruthy(); expect(SFX[r!], r!).toBeTruthy(); }
  });
  it('Azure Sovereign and Ren are untouched by form 2 existing', () => {
    const { sim, s } = sora(1, [[1300, 800]]); sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('azure_prison'); collect(sim, 1.5); sim.step(DT, idle({ beam: true })); expect(s.hx.act?.act).toBe('heavens_spear');
    const r = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'ren', heroForm: true, renF2: true }); r.state.player.form = 2; r.state.player.drive = 100; r.state.spawnTimer = 1e9; r.state.enemies = [mob(1, 1200, 800)]; r.state.player.x = 1100; r.state.player.y = 800; r.step(DT, idle({ q: true })); expect(r.state.hx.act?.act).toBe('eclipse_maul');
  });
});

describe('B35 fixes', () => {
  it('both second forms carry two dash charges, the first forms keep one', () => {
    expect(dashMax(sora(2).s)).toBe(2); expect(dashMax(sora(1).s)).toBe(1);
    const r = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'ren', heroForm: true, renF2: true }); r.state.player.form = 2; expect(dashMax(r.state)).toBe(2); r.state.player.form = 1; expect(dashMax(r.state)).toBe(1);
  });
  it('a Sora needle chases the foe it was aimed at and never slips past a moving or tiny one', () => {
    const { sim, s } = sora(0, [[1400, 800]]); s.player.attackClock = 0; s.enemies[0].radius = 8; s.enemies[0].speed = 0; const hp = s.enemies[0].hp;
    for (let k = 0; k < 120; k++) { s.enemies[0].y = 800 + Math.sin(k / 6) * 90; sim.step(DT, idle()); }
    expect(s.enemies[0].hp).toBeLessThan(hp);
  });
  it('fast bolts are swept: a thin bolt cannot tunnel through a small foe between two ticks', () => {
    const { sim, s } = sora(0, [[1200, 800]]); s.enemies[0].radius = 4; s.hx.bolts.push({ id: 9001, x: 1180, y: 800, vx: 3000, vy: 0, ttl: 1, damage: 5, radius: 2, kind: 'needle', pierce: 0, hits: [], homing: 0, form: 0 }); const hp = s.enemies[0].hp; sim.step(DT, idle()); expect(s.enemies[0].hp).toBeLessThan(hp);
  });
  it('a V press refused while another cast is busy is buffered and starts the moment the hands are free (V no longer drops randomly)', () => {
    const { sim, s } = sora(2, [[1300, 800]]); sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('constellation_pierce');
    sim.step(DT, idle({ sig: true, sigHeld: true })); expect(s.hx.act?.act).toBe('constellation_pierce');   // refused: hands busy
    let started = false; for (let k = 0; k < 40 && !started; k++) { sim.step(DT, idle({ sigHeld: true })); started = s.hx.act?.act === 'astral_rebirth'; }
    expect(started).toBe(true);
  });
  it('a buffered V is dropped after its window and by an abort', () => {
    const { sim, s } = sora(2, [[1300, 800]]); s.player.sigCd = 30; sim.step(DT, idle({ sig: true, sigHeld: true })); s.player.sigCd = 0; for (let k = 0; k < 40; k++) sim.step(DT, idle());
    expect(s.hx.act?.act).not.toBe('astral_rebirth');
  });
});

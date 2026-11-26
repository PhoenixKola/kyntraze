import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { AbilityEvent, Enemy, InputState } from '../sim/GameState';
import { NO_CONFIG } from '../sim/RunConfig';
import { ASH, ASH_AUTO, ASH_E, ASH_Q, ASH_SHIFT, ASH_V, BRAND } from '../content/renEclipse';
import { ASCEND } from '../content/heroKits';
import { formChoices, activateForm } from '../sim/FormSystem';
import { ashShift, brandsOf } from '../sim/RenEclipse';
import { damageEnemy } from '../sim/CombatSystem';
import { SLOT_KEYS } from '../sim/CoopSystem';
import { migrateB22, blankB22 } from '../b22/save';
import { withEverythingUnlocked } from '../sim/SaveSystem';
import { ashSfx, SFX } from '../game/audio/b22Sfx';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const mob = (id: number, x: number, y: number, hp = 1e6, kind: Enemy['kind'] = 'pursuer'): Enemy => ({ id, x, y, kind, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
function ren(form: 0 | 1 | 2, enemies: Array<[number, number, number?, Enemy['kind']?]> = [], cfg: Partial<typeof NO_CONFIG> = {}) {
  const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'ren', heroForm: true, renF2: true, ...cfg }), s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9;
  s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.hp = s.player.maxHp = 1e6; s.player.form = form; s.player.drive = 100; s.player.aimX = 1; s.player.aimY = 0;
  s.enemies = enemies.map(([x, y, hp, k], i) => mob(100 + i, x, y, hp ?? 1e6, k)); return { sim, s };
}
const collect = (sim: Simulation, sec: number, input: InputState = idle()) => { const seen = new Set<number>(), out: AbilityEvent[] = []; for (let k = 0; k < Math.round(sec / DT); k++) { sim.step(DT, input); for (const e of sim.state.abilityEvents) if (!seen.has(e.id)) { seen.add(e.id); out.push(e); } } return out; };
const hitsOf = (e: AbilityEvent) => ((e.n ?? 0) >> 8) & 63;

describe('Ashen Eclipse unlock and lifecycle', () => {
  it('is gated by the saved flag and by Crimson Ascendant being unlocked; old saves default to locked', () => {
    expect(blankB22().renF2).toBeFalsy(); expect(migrateB22({ v: 1 }).renF2).toBeFalsy(); expect(migrateB22({ renF2: true }).renF2).toBe(true); expect(migrateB22({ renF2: 'yes' }).renF2).toBeFalsy();
    expect(ren(0, [], { renF2: false }).s.renF2).toBe(false); expect(ren(0, [], { heroForm: false }).s.renF2).toBe(false); expect(ren(0).s.renF2).toBe(true);
    const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'sora', heroForm: true, renF2: true }); expect(sim.state.renF2).toBe(false);
  });
  it('unlock-all QA save includes it', () => { const save = { version: 1, settings: {}, b22: blankB22(), meta: { feats: {}, mastery: {}, heroes: {} } } as never; expect(withEverythingUnlocked(save).b22!.renF2).toBe(true); });
  it('a run without the flag never offers the form, and the earn flag alone does not grant it in the live run', () => {
    const { s } = ren(0, [], { renF2: false }); expect(s.renF2).toBe(false); expect(s.renF2Now).toBe(false); s.renF2Now = true; expect(s.renF2).toBe(false); expect(formChoices(s)).not.toContain(2);
  });
  it('defeating the Null Seraph as Ren flags the unlock for the save but the form does not appear in that run; other heroes and a locked Ascendant earn nothing', () => {
    const a = ren(1, [[1300, 800, 100, 'seraph']], { renF2: false }); damageEnemy(a.s, a.s.enemies[0], 1e9); expect(a.s.renF2Now).toBe(true); expect(a.s.renF2).toBe(false); expect(formChoices(a.s)).not.toContain(2);
    const b = ren(1, [[1300, 800, 100, 'seraph']], { renF2: false, heroForm: false }); damageEnemy(b.s, b.s.enemies[0], 1e9); expect(b.s.renF2Now).toBe(false);
    const c = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'sora', heroForm: true }), cs = c.state; cs.enemies = [mob(900, 1300, 800, 100, 'seraph')]; damageEnemy(cs, cs.enemies[0], 1e9); expect(cs.renF2Now).toBe(false);
    const d = ren(1, [[1300, 800, 100, 'warden']], { renF2: false }); damageEnemy(d.s, d.s.enemies[0], 1e9); expect(d.s.renF2Now).toBe(false);   // the Warden grants nothing here
  });
  it('from base with full Drive both forms are offered; with the flag off only Ascendant', () => {
    expect(formChoices(ren(0).s)).toEqual([1, 2]); expect(formChoices(ren(0, [], { renF2: false }).s)).toEqual([1]); expect(formChoices(ren(1).s)).toEqual([]);
  });
  it('the first reveal is the long one and counts per form; the Ascendant counter is untouched', () => {
    const { sim, s } = ren(0); s.heroFormSeen = 3; expect(activateForm(s, 2)).toBe(true); expect(s.cinema?.dur).toBe(ASH.cinemaFirst.dur); expect(s.cinema?.to).toBe(2);
    collect(sim, ASH.cinemaFirst.dur + 0.2); expect(s.player.form).toBe(2); expect(s.renSeen2).toBe(1); expect(s.heroFormSeen).toBe(3);
    s.player.form = 0; s.player.drive = 100; s.player.formCooldown = 0; activateForm(s, 2); expect(s.cinema?.dur).toBe(ASH.cinemaRepeat.dur);
  });
  it('drains at its own rate and ends cleanly into the form cooldown with the marks cleared', () => {
    const { sim, s } = ren(2, [[1150, 800]]); brandsOf(s).push({ id: 100, n: 2, t: 99 }); s.player.drive = 1; collect(sim, 0.6); expect(s.player.form).toBe(0); expect(s.player.formCooldown).toBeGreaterThan(ASH.cooldown - 2); expect(brandsOf(s).length).toBe(0);
    const a = ren(2), b = ren(1); collect(a.sim, 2); collect(b.sim, 2); expect(100 - a.s.player.drive).toBeCloseTo(ASH.drain * 2, 0); expect(100 - b.s.player.drive).toBeCloseTo(ASCEND.ren.drain * 2, 0);
  });
});

describe('Form Shift Ascendant <-> Eclipse', () => {
  it('costs Drive, starts the shared cooldown, works both ways and never refills', () => {
    const { s } = ren(1); s.player.drive = 80; expect(ashShift(s, 2)).toBe(true); expect(s.player.form).toBe(2); expect(s.player.drive).toBe(80 - ASH_SHIFT.cost); expect(s.player.formCooldown).toBeCloseTo(ASH_SHIFT.cooldown, 5);
    expect(ashShift(s, 1)).toBe(false); s.player.formCooldown = 0; expect(ashShift(s, 1)).toBe(true); expect(s.player.form).toBe(1); expect(s.player.drive).toBe(80 - 2 * ASH_SHIFT.cost);
  });
  it('is refused below the minimum Drive, in base, during the reveal, when locked, or to the same form', () => {
    const a = ren(1); a.s.player.drive = ASH_SHIFT.minDrive - 1; expect(ashShift(a.s, 2)).toBe(false);
    const b = ren(0); expect(ashShift(b.s, 2)).toBe(false);
    const c = ren(1, [], { renF2: false }); expect(ashShift(c.s, 2)).toBe(false);
    const d = ren(1); expect(ashShift(d.s, 1)).toBe(false); d.s.cinema = { t: 0, dur: 1, breakAt: 0.5, commitAt: 0.5, first: false, from: 1, to: 2, broke: false, committed: false }; expect(ashShift(d.s, 2)).toBe(false);
  });
  it('shifting out cancels an unreleased V and clears the marks', () => {
    const { sim, s } = ren(2, [[1300, 800]]); sim.step(DT, idle({ sig: true, sigHeld: true })); expect(s.hx.act?.act).toBe('eclipse_fang'); brandsOf(s).push({ id: 100, n: 1, t: 99 }); expect(ashShift(s, 1)).toBe(true); expect(s.hx.act).toBeNull(); expect(brandsOf(s).length).toBe(0);
  });
});

describe('Cinderfang Chain and Ash Brand', () => {
  it('swings only at arm\'s reach, and the fourth beat is the finisher that detonates marks', () => {
    const far = ren(2, [[1100 + ASH_AUTO.reach + 80, 800]]); far.s.player.attackClock = 0; expect(collect(far.sim, 1).some(e => e.kind === 'ash_auto')).toBe(false);
    const { sim, s } = ren(2, [[1160, 800], [1175, 830]]); s.player.attackClock = 0; const ev = collect(sim, 4.5); const autos = ev.filter(e => e.kind === 'ash_auto');
    expect(autos.length).toBeGreaterThanOrEqual(4); expect(autos.slice(0, 4).map(e => (e.n! & 32) !== 0)).toEqual([false, false, false, true]);
    const er = ev.filter(e => e.kind === 'ash_eruption'); expect(er.length).toBeGreaterThanOrEqual(1); for (const e of er) expect(e.n! & 15).toBeLessThanOrEqual(BRAND.cap);
  });
  it('caps stacks per target and expires; an eruption never marks anything', () => {
    const { sim, s } = ren(2, [[1160, 800]]); s.player.attackClock = 0; collect(sim, 2.5); const b = brandsOf(s).find(x => x.id === 100); if (b) expect(b.n).toBeLessThanOrEqual(BRAND.cap);
    s.player.attackClock = 1e9; brandsOf(s).length = 0; brandsOf(s).push({ id: 100, n: 3, t: s.time + 0.05 }); collect(sim, 0.2); expect(brandsOf(s).some(x => x.id === 100)).toBe(false);
  });
  it('is deterministic: the same seed and input give identical events', () => {
    const run = () => { const { sim, s } = ren(2, [[1160, 800], [1180, 840]]); s.player.attackClock = 0; return collect(sim, 3).map(e => `${e.kind}:${e.n}:${Math.round(e.x)}`).join('|'); };
    expect(run()).toBe(run());
  });
});

describe('Eclipse Maul (Q)', () => {
  it('with a target: three strikes, the last a compact finisher, collision-safe travel, hits counted', () => {
    const { sim, s } = ren(2, [[1230, 800]]); const x0 = s.player.x; sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('eclipse_maul');
    const ev = collect(sim, 1.2).filter(e => e.kind === 'ash_q_hit'); expect(ev.length).toBe(ASH_Q.strikes); expect((ev[2].n! & 16) !== 0).toBe(true); expect(s.player.x).toBeGreaterThan(x0); expect(s.player.x).toBeLessThan(s.enemies[0].x);
    expect(ev.some(e => hitsOf(e) > 0)).toBe(true); expect(s.hx.act).toBeNull();
  });
  it('with nothing ahead it is one short committed lunge: no hits, no finisher, no fake impact', () => {
    const { sim, s } = ren(2, []); const x0 = s.player.x; sim.step(DT, idle({ q: true })); const ev = collect(sim, 1).filter(e => e.kind === 'ash_q_hit');
    expect(ev.length).toBe(1); expect(hitsOf(ev[0])).toBe(0); expect(ev[0].n! & 16).toBe(0); expect(s.player.x - x0).toBeLessThanOrEqual(ASH_Q.missStep + 1);
  });
  it('never carries a boss with it and stops at a wall', () => {
    const { sim, s } = ren(2, [[1230, 800, 1e6, 'warden']]); const bx = s.enemies[0].x; sim.step(DT, idle({ q: true })); collect(sim, 1.2); expect(Math.abs(s.enemies[0].x - bx)).toBeLessThan(2);
    const w = ren(2, []); w.s.player.x = 60; w.s.player.aimX = -1; w.sim.step(DT, idle({ q: true })); collect(w.sim, 1.2); expect(w.s.player.x).toBeGreaterThan(20);
  });
});

describe('Ninefold Rupture (E) and Ashen Cataclysm (R)', () => {
  it('Rupture: warning first, damage only at the landing, marks inside erupt, a boss is hurt but never moved', () => {
    const { sim, s } = ren(2, [[1300, 800], [1315, 810], [1300, 780, 1e6, 'warden']]); brandsOf(s).push({ id: 100, n: 3, t: s.time + 9 }); const hp0 = s.enemies.map(e => e.hp), bx = s.enemies[2].x;
    sim.step(DT, idle({ beam: true })); expect(s.hx.act?.act).toBe('ninefold_rupture'); const early = collect(sim, ASH_E.coil - 0.1); expect(early.some(e => e.kind === 'ash_e_rupture')).toBe(false); expect(s.enemies[0].hp).toBe(hp0[0]);
    const ev = collect(sim, 1); const r = ev.find(e => e.kind === 'ash_e_rupture'); expect(r).toBeTruthy(); expect(hitsOf(r!)).toBeGreaterThan(0); expect(ev.some(e => e.kind === 'ash_eruption')).toBe(true);
    expect(s.enemies[2].hp).toBeLessThan(hp0[2]); expect(Math.abs(s.enemies[2].x - bx)).toBeLessThan(2); expect(brandsOf(s).some(b => b.id === 100)).toBe(false);
  });
  it('Cataclysm: one strike and one rupture, each foe hit at most once per stage, far foes untouched', () => {
    const { sim, s } = ren(2, [[1200, 800], [1300, 805], [1900, 800]]); sim.step(DT, idle({ sphere: true })); expect(s.hx.act?.act).toBe('ashen_cataclysm'); const hp0 = s.enemies.map(e => e.hp);
    const ev = collect(sim, 2); const st = ev.filter(e => e.kind === 'ash_r_strike'), ru = ev.filter(e => e.kind === 'ash_r_rupture'); expect(st.length).toBe(1); expect(ru.length).toBe(1);
    expect(hitsOf(st[0])).toBeGreaterThan(0); expect(hitsOf(ru[0])).toBeGreaterThan(0); expect(s.enemies[0].hp).toBeLessThan(hp0[0]); expect(s.enemies[2].hp).toBe(hp0[2]);
  });
});

describe('Eclipse Fang (V)', () => {
  it('charge tiers rise with the hold and a cancelled charge is free', () => {
    const { sim, s } = ren(2, [[1300, 800]]); sim.step(DT, idle({ sig: true, sigHeld: true })); const ev = collect(sim, ASH_V.stages[2] + 0.1, idle({ sigHeld: true })); expect(ev.filter(e => e.kind === 'ash_v_tier').map(e => e.n! & 3)).toEqual([1, 2, 3]);
    sim.step(DT, idle({ sigAbort: true })); expect(s.hx.act).toBeNull(); expect(s.player.sigCd).toBe(0); expect(ev.some(e => e.kind === 'ash_v_release')).toBe(false);
  });
  it('a release that touches nothing is a miss: cooldown capped, no pulse, no eruption', () => {
    const { sim, s } = ren(2, []); sim.step(DT, idle({ sig: true, sigHeld: true })); collect(sim, 0.2, idle({ sigHeld: true })); const ev = collect(sim, 1.2, idle());
    expect(ev.some(e => e.kind === 'ash_v_release')).toBe(true); expect(ev.some(e => e.kind === 'ash_v_miss')).toBe(true); expect(ev.some(e => e.kind === 'ash_v_pulse' || e.kind === 'ash_eruption')).toBe(false); expect(s.player.sigCd).toBeLessThanOrEqual(8);
  });
  it('a full-tier hit ends in the fox jaw: two bites then the eruption pulse, and the marks inside erupt', () => {
    const { sim, s } = ren(2, [[1250, 800]]); brandsOf(s).push({ id: 100, n: 3, t: s.time + 9 }); sim.step(DT, idle({ sig: true, sigHeld: true })); collect(sim, ASH_V.stages[2] + 0.1, idle({ sigHeld: true })); const ev = collect(sim, 1.5, idle());
    const pulses = ev.filter(e => e.kind === 'ash_v_pulse'); expect(pulses.length).toBe(3); expect(pulses.every(e => ((e.n! >> 5) & 7) === 3)).toBe(true); expect(ev.some(e => e.kind === 'ash_v_hit')).toBe(true); expect(ev.some(e => e.kind === 'ash_eruption')).toBe(true);
  });
});

describe('integration hazards', () => {
  it('co-op slot state carries the new fields and every ash event has a recipe', () => {
    for (const k of ['renF2', 'renF2Now', 'renSeen2']) expect(SLOT_KEYS as readonly string[]).toContain(k);
    const cases: Array<[string, number]> = [['ash_auto', (1 << 8) | 0], ['ash_auto', (1 << 8) | 32], ['ash_q_hit', (1 << 8) | 16], ['ash_q_hit', 32], ['ash_e_rupture', 0], ['ash_r_strike', 0], ['ash_v_pulse', 3 << 5], ['ash_v_miss', 0], ['ash_start', 0], ['ash_break', 0], ['ash_commit', 0], ['ash_shift', 0], ['ash_end', 0], ['ash_eruption', 2], ['ash_brand', 1]];
    for (const [k, n] of cases) { const r = ashSfx(k, n); expect(r, `${k}/${n}`).toBeTruthy(); expect(SFX[r!], r!).toBeTruthy(); }
    expect(ashSfx('ash_auto', 0)).toBeNull();
  });
  it('the Crimson Ascendant kit is untouched by form 2 existing', () => {
    const { sim, s } = ren(1, [[1230, 800]]); sim.step(DT, idle({ q: true })); expect(s.hx.act?.act).toBe('infernal_cyclone'); collect(sim, 1.2); sim.step(DT, idle({ beam: true })); expect(s.hx.act?.act).toBe('scarlet_rampage');
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { AbilityEvent, Enemy, InputState } from '../sim/GameState';
import { METEOR, ECHO } from '../content/kaiKit';
import { kitOf } from '../sim/KaiKit';
import type { InputController } from '../game/input/InputController';
import { b32Sfx, EVENT_SFX, SFX } from '../game/audio/b22Sfx';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const mob = (id: number, x: number, y: number, hp = 4000): Enemy => ({ id, x, y, kind: 'pursuer', hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 });
function kai(form: 0 | 1 | 2 | 3, enemies: Array<[number, number, number?]> = []) {
  const sim = new Simulation(7, 'gloam', true, true), s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9;
  s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.hp = s.player.maxHp = 1e6; s.player.form = form; s.apexGate = 0; s.player.drive = 100; s.player.aimX = 1; s.player.aimY = 0;
  s.enemies = enemies.map(([x, y, hp], i) => mob(100 + i, x, y, hp ?? 4000)); return { sim, s };
}
const collect = (sim: Simulation, sec: number, input: InputState = idle()) => { const seen = new Set<number>(), out: AbilityEvent[] = []; for (let k = 0; k < Math.round(sec / DT); k++) { sim.step(DT, input); for (const e of sim.state.abilityEvents) if (!seen.has(e.id)) { seen.add(e.id); out.push(e); } } return out; };

describe('B32 Meteor Drive: three readable beats with a committed end point', () => {
  it('reports each beat with its start point, index and hit count; the last beat is flagged', () => {
    const { sim, s } = kai(2, [[1210, 800], [1290, 800], [1370, 800]]); const x0 = s.player.x; sim.step(DT, idle({ q: true }));
    const ev = collect(sim, 1.4).filter(e => e.kind === 'meteor_beat'); expect(ev.length).toBe(METEOR.beats);
    expect(ev.map(e => e.b)).toEqual([0, 1, 2]); expect(ev[0].tx).toBeCloseTo(x0, 0); expect(ev[1].tx).toBeCloseTo(x0 + METEOR.step, 0); expect(ev[2].tx).toBeCloseTo(x0 + METEOR.step * 2, 0);
    expect(ev.map(e => e.n! >= 100)).toEqual([false, false, true]); expect(s.player.x - x0).toBeCloseTo(METEOR.step * METEOR.beats, 0);
  });
  it('the final beat reaches further than the earlier beats and a clear lane reports zero hits (no impact for a whiff)', () => {
    const edge = 1100 + METEOR.step * 3 + 30 + METEOR.reach + 40;   // beyond an ordinary beat's reach of the last point, inside the final reach
    const a = kai(2, [[edge, 800]]); a.sim.step(DT, idle({ q: true })); const evA = collect(a.sim, 1.4).filter(e => e.kind === 'meteor_beat'); expect(evA[2].n).toBe(101);
    const b = kai(2, []); b.sim.step(DT, idle({ q: true })); const evB = collect(b.sim, 1.4).filter(e => e.kind === 'meteor_beat'); expect(evB.map(e => e.n)).toEqual([0, 0, 100]);
    expect(b32Sfx('meteor_beat', 0, 0)).toBe('kk_meteor_miss'); expect(b32Sfx('meteor_beat', 100, 2)).toBe('kk_meteor_miss'); expect(b32Sfx('meteor_beat', 105, 2)).toBe('kk_meteor_fin'); expect(b32Sfx('meteor_beat', 3, 1)).toBe('kk_meteor_1');
  });
  it('cast time includes the final pause and still ends cleanly', () => {
    const { sim, s } = kai(2, [[1200, 800]]); sim.step(DT, idle({ q: true })); const dur = METEOR.windup + METEOR.beats * METEOR.beatEvery + METEOR.finalPause + METEOR.recover; expect(s.cast?.dur).toBeCloseTo(dur, 5);
    for (let i = 0; i < Math.round((dur + 0.1) / DT); i++) sim.step(DT, idle()); expect(s.cast).toBeNull();
  });
});

describe('B32 Silver Echo: the double chooses a target and strikes visibly', () => {
  it('emits a target lock and strike events with the real target position, and names the target on the clone', () => {
    const { sim, s } = kai(3, [[1240, 800, 1e6]]); sim.step(DT, idle({ q: true })); const c = kitOf(s).clone!; expect(c).toBeTruthy();
    const ev = collect(sim, 2.2); const lock = ev.find(e => e.kind === 'clone_target'), hit = ev.find(e => e.kind === 'clone_strike');
    expect(lock).toBeTruthy(); expect(hit).toBeTruthy(); expect(hit!.tx).toBeCloseTo(s.enemies[0].x, 0); expect(kitOf(s).clone!.tid).toBe(s.enemies[0].id);
    expect(1e6 - s.enemies[0].hp).toBeGreaterThan(0);   // the strike event only fires with real damage
  });
  it('distinguishes a destroyed double from an expired one', () => {
    const e = kai(3); e.sim.step(DT, idle({ q: true })); const exp = collect(e.sim, ECHO.maxLife + 1).find(x => x.kind === 'clone_end'); expect(exp?.n ?? 0).toBe(0);
    const k = kai(3); k.s.player.maxHp = k.s.player.hp = 100; k.sim.step(DT, idle({ q: true })); const c = kitOf(k.s).clone!; for (let i = 0; i < 6; i++) k.s.enemies.push({ ...mob(300 + i, c.x + 2 * i, c.y), damage: 80, touchCooldown: 0 });
    const ev = collect(k.sim, 2).find(x => x.kind === 'clone_end'); expect(ev?.n).toBe(1);
    expect(b32Sfx('clone_end', 1)).toBe('kk_echo_shatter'); expect(b32Sfx('clone_end', 0)).toBe('kk_echo_fade');
  });
  it('every new event has a defined recipe', () => { for (const k of ['surge_end', 'clone_strike', 'clone_target']) expect(SFX[EVENT_SFX[k]], k).toBeTruthy(); for (const r of ['kk_meteor_1', 'kk_meteor_fin', 'kk_meteor_miss', 'kk_echo_shatter', 'kk_echo_fade']) expect(SFX[r], r).toBeTruthy(); });
});

describe('B32 Left Alt flight toggle (solo); co-op and controller keep their keys', () => {
  type Ev = { code: string; repeat: boolean; defaultPrevented: boolean; preventDefault(): void };
  const handlers: Record<string, Array<(e: Ev) => void>> = {};
  const fire = (type: string, code: string): Ev => { const e: Ev = { code, repeat: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; (handlers[type] ?? []).forEach(h => h(e)); return e; };
  const press = (code: string) => fire('keydown', code), release = (code: string) => fire('keyup', code);
  let IC: typeof InputController;
  const make = (coop: boolean) => { const ic = new IC(() => undefined, () => undefined, () => undefined, () => []); ic.coop = coop; return ic; };
  beforeAll(async () => { (globalThis as unknown as { window: object }).window = { addEventListener: (t: string, h: (e: Ev) => void) => { (handlers[t] ??= []).push(h); }, removeEventListener: (t: string, h: (e: Ev) => void) => { handlers[t] = (handlers[t] ?? []).filter(x => x !== h); } }; IC = (await import('../game/input/InputController')).InputController; });
  it('solo: Left Alt toggles flight, Ctrl no longer does', () => {
    const ic = make(false); press('ControlLeft'); release('ControlLeft'); expect(ic.read().flyToggle).toBeUndefined();
    press('AltLeft'); expect(ic.read().flyToggle).toBe(true); expect(ic.read().flyToggle).toBeUndefined(); release('AltLeft'); ic.destroy();
  });
  it('co-op: P1 keeps Left Ctrl, P2 keeps Right Ctrl, Alt does nothing', () => {
    const ic = make(true); press('AltLeft'); expect(ic.read().flyToggle).toBeUndefined(); release('AltLeft');
    press('ControlLeft'); expect(ic.read().flyToggle).toBe(true); release('ControlLeft');
    press('ControlRight'); expect(ic.readP2().flyToggle).toBe(true); release('ControlRight'); ic.destroy();
  });
  it('Alt keydown is default-prevented so the browser menu bar never steals focus', () => { const ic = make(false); expect(press('AltLeft').defaultPrevented).toBe(true); ic.destroy(); });
});

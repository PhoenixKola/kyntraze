import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { Enemy, InputState } from '../sim/GameState';
import { damageEnemy } from '../sim/CombatSystem';
import { slotOfAct } from '../sim/BranchSystem';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const mob = (id: number, x: number, y: number): Enemy => ({ id, x, y, kind: 'pursuer', hp: 1e6, maxHp: 1e6, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnT: 0 } as unknown as Enemy);
function kai(form: 0 | 1 | 2 | 3) {
  const sim = new Simulation(7, 'gloam', true, true), s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9;
  s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.hp = s.player.maxHp = 1e6; s.player.form = form; s.apexGate = 0; s.player.drive = 100; s.player.aimX = 1; s.player.aimY = 0;
  s.enemies = [mob(100, 1300, 800), mob(101, 1320, 760), mob(102, 1280, 850)]; return { sim, s };
}

describe('B23 hit provenance: the damage producer decides the slot, not whatever cast is live', () => {
  it('Kai kit casts map to their own slots (Scatter/Meteor = Q, Rising Flare = E, Crucible = R)', () => {
    const want: Array<[0 | 1 | 2 | 3, Partial<InputState>, string]> = [[1, { q: true }, 'q'], [2, { q: true }, 'q'], [1, { beam: true }, 'e'], [1, { sphere: true }, 'r']];
    for (const [form, input, slot] of want) { const { sim, s } = kai(form); sim.step(DT, idle(input)); expect(s.cast, `${form}/${slot}`).not.toBeNull(); expect(slotOfAct(s)).toBe(slot); }
  });
  it('every Scatter Burst blast is logged as a Q hit, even after the cast ended and while an E is charging', () => {
    const { sim, s } = kai(1), seen = new Set<string | null>(), push = s.b22.hits.push.bind(s.b22.hits); s.b22.hits.push = (...h) => { for (const x of h) seen.add(x.slot); return push(...h); }; const step = (i: InputState) => sim.step(DT, i);
    step(idle({ q: true })); let guard = 0; while (s.cast && guard++ < 400) step(idle());
    for (let k = 0; k < 60; k++) step(idle({ beam: true, beamHeld: true } as Partial<InputState>));
    for (let k = 0; k < 120; k++) step(idle());
    expect(seen.has('q')).toBe(true); expect(seen.has('r')).toBe(false);
  });
  it('an explicit producer slot overrides the live cast, and "none" opts out of every slot', () => {
    const { sim, s } = kai(1); sim.step(DT, idle({ sphere: true })); expect(slotOfAct(s)).toBe('r');
    damageEnemy(s, s.enemies[0], 10, { slot: 'q' }); damageEnemy(s, s.enemies[1], 10, { slot: 'none' });
    const last = s.b22.hits.slice(-2); expect(last[0].slot).toBe('q'); expect(last[1].slot).toBeNull();
  });
});

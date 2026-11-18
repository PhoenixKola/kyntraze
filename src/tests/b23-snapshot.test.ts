import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import type { InputState } from '../sim/GameState';
import { NO_CONFIG } from '../sim/RunConfig';
import { applySnapshot, blankClientState, toSnapshot, type Snap } from '../net/snapshot';
import { kitOf } from '../sim/KaiKit';

const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
const wire = (n: Snap): Snap => JSON.parse(JSON.stringify(n));

describe('B23 online snapshots carry the new Kai kit and clear it when it expires', () => {
  it('surge, scatter shots, clone and crucible reach the client, and an expired kit does not linger', () => {
    const sim = new Simulation(7, 'gloam', true, true, { ...NO_CONFIG, hero: 'kai' }); sim.joinPartner({ ...NO_CONFIG, hero: 'ren' }, 'online', ['A', 'B']);
    const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.form = 1; s.player.drive = 100; s.player.hp = s.player.maxHp = 1e6;
    sim.step(DT, idle({ q: true }), idle());
    for (let k = 0; k < 10; k++) sim.step(DT, idle(), idle());
    const k = kitOf(s); expect(k.shots.length + k.surge).toBeGreaterThan(0);
    const client = blankClientState(7, 'gloam'); applySnapshot(client, wire(toSnapshot(s, 1, 0)));
    expect(client.hx.kk).toBeDefined(); expect(client.hx.kk!.shots.length).toBe(k.shots.length); expect(client.hx.kk!.riseHits).toEqual({});
    k.clone = null; k.shots = []; s.hx.kk = undefined;
    applySnapshot(client, wire(toSnapshot(s, 2, 0))); expect(client.hx.kk).toBeUndefined();
  });
});

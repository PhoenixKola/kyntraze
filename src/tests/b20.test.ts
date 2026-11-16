import { describe, expect, it } from 'vitest';
import { Simulation, ABILITY_BUFFER } from '../sim/Simulation';
import { NO_CONFIG } from '../sim/RunConfig';
import type { InputState } from '../sim/GameState';
const DT = 1 / 60;
const idle = (o: Partial<InputState> = {}): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, ...o });
function ren() { const sim = new Simulation(7, 'gloam', false, false, { ...NO_CONFIG, hero: 'ren' }); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.attackClock = 1e9; s.enemies = []; return { sim, s }; }

describe('B20 ability input buffer', () => {
  it('a Q press just before the cooldown ends still fires; one pressed too early is dropped', () => {
    const a = ren(); a.s.player.qCooldown = 0.1; a.sim.step(DT, idle({ q: true })); expect(a.s.hx.act).toBeNull();
    a.sim.step(DT, idle()); for (let i = 0; i < 6; i++) a.sim.step(DT, idle()); expect(a.s.hx.act?.act).toBe('crimson_break');
    const b = ren(); b.s.player.qCooldown = 0.6; b.sim.step(DT, idle({ q: true })); for (let i = 0; i < 40; i++) b.sim.step(DT, idle()); expect(b.s.hx.act).toBeNull();
    expect(ABILITY_BUFFER).toBeLessThanOrEqual(0.2);
  });
  it('a held key does not re-fire every tick and a released Sora E is never buffered into a charge', () => {
    const { sim, s } = ren(); sim.step(DT, idle({ q: true })); const cd = s.player.qCooldown; for (let i = 0; i < 20; i++) sim.step(DT, idle({ q: true })); expect(s.player.qCooldown).toBeLessThan(cd);
    const so = new Simulation(3, 'gloam', false, false, { ...NO_CONFIG, hero: 'sora' }); so.state.spawnTimer = 1e9; so.state.player.beamCooldown = 0.1; so.step(DT, idle({ beam: true })); so.step(DT, idle());
    for (let i = 0; i < 12; i++) so.step(DT, idle()); expect(so.state.hx.act).toBeNull();
  });
});

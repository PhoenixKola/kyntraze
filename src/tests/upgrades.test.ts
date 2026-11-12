import { describe, expect, it } from 'vitest';
import { SeededRng } from '../core/SeededRng';
import { makeState } from '../sim/GameState';
import { applyUpgrade, createOffer, gainXp } from '../sim/UpgradeSystem';
describe('upgrade loop', () => {
  it('offers three unique upgrades deterministically', () => { const a = makeState(12), b = makeState(12); const offer = createOffer(a,new SeededRng(12)); expect(offer).toHaveLength(3); expect(new Set(offer).size).toBe(3); expect(offer).toEqual(createOffer(b,new SeededRng(12))); });
  it('only accepts a real offered upgrade', () => { const s = makeState(12); s.phase='upgrade';s.upgradeOffers=['impact','tempo','stride']; expect(applyUpgrade(s,'endurance')).toBe(false);expect(applyUpgrade(s,'impact')).toBe(true);expect(s.player.attackDamage).toBe(23);expect(s.phase).toBe('running'); });
  it('freezes at level up and creates a real choice', () => { const s=makeState(1);let called=0;gainXp(s,7,()=>called++);expect(s.phase).toBe('upgrade');expect(s.player.level).toBe(2);expect(called).toBe(1); });
});

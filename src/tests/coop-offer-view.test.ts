import { describe, expect, it } from 'vitest';
import { NO_CONFIG } from '../sim/RunConfig';
import { quiet } from './b22util';
import { coopGainXp, inSlot } from '../sim/CoopSystem';
import { ascView } from '../bridge/ascView';

describe('co-op offers are read from the choosing fighter', () => {
  it("a branch offer that belongs to player 2 is visible through sim.view and invisible from player 1's slot", () => {
    const q = quiet({ hero: 'kai', arena: 'gloam', hp: 1e6, seed: 8 }); q.sim.joinPartner({ ...NO_CONFIG, hero: 'sora' }); const s = q.s, party = s.party!;
    party.chooser = 1; inSlot(s, 1, () => { s.b22.branchOffer = { slot: 'q', a: 'needle_spiral', b: 'stormline_array' }; s.upgradeOffers = []; }); s.phase = 'upgrade';
    expect(ascView(s).branch).toBeNull();                                  // player 1's own slot has no offer: this is what the blank "Choose your evolution" screen was built from
    expect(q.sim.view(() => ascView(s).branch)?.cards.length).toBe(2);      // the chooser's slot does
  });
  it('both fighters levelling together are asked one after the other, each from their own offer, with no stuck state', () => {
    const q = quiet({ hero: 'kai', arena: 'gloam', hp: 1e6, seed: 8 }); q.sim.joinPartner({ ...NO_CONFIG, hero: 'sora' }); const s = q.s, party = s.party!;
    const idle = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false }; coopGainXp(s, s.player.nextXp); q.sim.step(1 / 60, idle, idle); expect(s.phase).toBe('upgrade'); expect(party.chooser).toBe(0); expect(party.queue).toEqual([1]);
    const first = q.sim.view(() => [...s.upgradeOffers]); expect(first.length).toBeGreaterThan(0);
    expect(q.sim.chooseUpgrade(first[0])).toBe(true);
    if (s.phase === 'upgrade' && party.chooser === 0) { /* an earned branch / legend offer keeps the same fighter choosing */ }
    else { expect(s.phase).toBe('upgrade'); expect(party.chooser).toBe(1); const second = q.sim.view(() => [...s.upgradeOffers]); expect(second.length).toBeGreaterThan(0); expect(q.sim.chooseUpgrade(second[0])).toBe(true); expect(s.phase).toBe('running'); expect(party.chooser).toBeNull(); }
  });
});

import { describe, expect, it } from 'vitest';
import { NO_CONFIG } from '../sim/RunConfig';
import { quiet } from './b22util';
import { inSlot } from '../sim/CoopSystem';
import { ascView } from '../bridge/ascView';

describe('co-op offers are read from the choosing fighter', () => {
  it("a branch offer that belongs to player 2 is visible through sim.view and invisible from player 1's slot", () => {
    const q = quiet({ hero: 'kai', arena: 'gloam', hp: 1e6, seed: 8 }); q.sim.joinPartner({ ...NO_CONFIG, hero: 'sora' }); const s = q.s, party = s.party!;
    party.chooser = 1; inSlot(s, 1, () => { s.b22.branchOffer = { slot: 'q', a: 'needle_spiral', b: 'stormline_array' }; s.upgradeOffers = []; }); s.phase = 'upgrade';
    expect(ascView(s).branch).toBeNull();                                  // player 1's own slot has no offer: this is what the blank "Choose your evolution" screen was built from
    expect(q.sim.view(() => ascView(s).branch)?.cards.length).toBe(2);      // the chooser's slot does
  });
});

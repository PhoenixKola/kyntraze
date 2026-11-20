// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { startServer } from '../server';
import { parseClient } from '../net/protocol';
import { NetClient } from '../net/RemoteSimulation';
import { applySnapshot, blankClientState, partnerView, blankPartnerView, type Snap } from '../net/snapshot';

describe('online hotfix', () => {
  it('accepts heartbeat nonces and still rejects epoch-sized or malformed pings', () => {
    expect(parseClient(JSON.stringify({ t: 'ping', n: 7 }))).toEqual({ t: 'ping', n: 7 });
    expect(parseClient(JSON.stringify({ t: 'ping', n: Date.now() }))).toBeNull();
    expect(parseClient(JSON.stringify({ t: 'ping', n: 'x' }))).toBeNull();
  });
  it('a real client heartbeat is answered without any bad_message error', async () => {
    const srv = await startServer({ port: 0 }), c = new NetClient(`ws://127.0.0.1:${srv.port}`, 'Tester');
    await c.connect(); await new Promise(r => setTimeout(r, 3400));
    expect(c.error).toBeNull(); expect(c.rtt).toBeGreaterThanOrEqual(0); c.close(); srv.close();
  }, 10000);
  it('applySnapshot clears a cast, a sphere and an expired kit, and applies mods and aim', () => {
    const s = blankClientState(1, 'gloam'), f = (o: object) => ({ tick: 1, time: 1, phase: 'running', arena: 'gloam', kills: 0, plan: { id: 'classic', mode: 'classic', name: 'Classic' }, announce: null, me: { player: s.player, hero: 'kai', hx: { ...s.hx, kk: undefined }, cast: null, sphere: null, mods: { ...s.mods }, aim: { ...s.aim }, heroFormUnlocked: false, b22: {}, ...o }, partner: null, enemies: [], shots: [], hazards: [], pickups: [], impacts: [], abil: [], enemyEv: [], b22: {}, offers: [], stacks: {}, chooser: null, party: null }) as unknown as Snap;
    applySnapshot(s, f({ cast: { kind: 'beam', t: 0.1 }, sphere: { id: 1 }, mods: { ...s.mods, beamDamage: 3 }, aim: { ...s.aim, x: 0, y: -1 }, heroFormUnlocked: true }));
    expect(s.cast).not.toBeNull(); expect(s.sphere).not.toBeNull(); expect(s.mods.beamDamage).toBe(3); expect(s.aim.y).toBe(-1); expect(s.heroFormUnlocked).toBe(true);
    applySnapshot(s, f({}));
    expect(s.cast).toBeNull(); expect(s.sphere).toBeNull(); expect(s.hx.kk).toBeUndefined();
  });
  it('the partner view carries the partner hero and eases its position without touching the real state', () => {
    const main = blankClientState(1, 'gloam'), view = blankPartnerView(1, 'gloam'), p = { ...main.player, x: 500, y: 400 };
    const np = { player: p, hero: 'ren', hx: { ...main.hx }, cast: null, sphere: null, mods: { ...main.mods }, aim: { ...main.aim }, heroFormUnlocked: false, b22: {} };
    partnerView(main, view, np, 0.016); expect(view.hero).toBe('ren'); expect(view.player.x).toBe(500);
    np.player = { ...p, x: 520 }; partnerView(main, view, np, 0.016); expect(view.player.x).toBeGreaterThan(500); expect(view.player.x).toBeLessThan(520);
    expect(main.hero).toBe('kai'); expect(main.player.x).not.toBe(500);
  });
});

describe('effect ownership', () => {
  it('snapshot events carry slots relative to the receiver and the partner view only sees its own', () => {
    const main = blankClientState(1, 'gloam'), view = blankPartnerView(1, 'gloam');
    main.abilityEvents = [{ id: 1, kind: 'beam_fire', x: 0, y: 0, slot: 0 }, { id: 2, kind: 'comet_fire', x: 0, y: 0, slot: 1 }];
    const np = { player: { ...main.player }, hero: 'kai', hx: { ...main.hx }, cast: null, sphere: null, mods: { ...main.mods }, aim: { ...main.aim }, heroFormUnlocked: false, b22: {} };
    partnerView(main, view, np, 0.016);
    expect(view.abilityEvents.map(e => e.id)).toEqual([2]);
  });
});

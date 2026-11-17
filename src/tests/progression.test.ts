import { resolvePick } from './b22util';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { SeededRng } from '../core/SeededRng';
import { makeState, xpThreshold } from '../sim/GameState';
import { Simulation } from '../sim/Simulation';
import { applyUpgrade, createOffer, gainXp, previewUpgrade } from '../sim/UpgradeSystem';
import { CATEGORIES, UPGRADES, UPGRADE_BY_ID, type UpgradeId } from '../content/upgrades';
import { mapStatus } from '../app/ui/Minimap';
import { blankMap } from '../bridge/UiSnapshot';
import { damagePlayer } from '../sim/CombatSystem';

const take = (s: ReturnType<typeof makeState>, id: UpgradeId) => { s.phase = 'upgrade'; s.upgradeOffers = [id]; return applyUpgrade(s, id); };
describe('upgrade content', () => {
  it('has a real pool: 25 cards across 7 categories and 3 rarities, unique ids, a shipped icon each', () => {
    expect(UPGRADES).toHaveLength(25); expect(new Set(UPGRADES.map(u => u.id)).size).toBe(25);
    expect(new Set(UPGRADES.map(u => u.category))).toEqual(new Set(Object.keys(CATEGORIES)));
    expect(new Set(UPGRADES.map(u => u.rarity))).toEqual(new Set(['common', 'rare', 'epic']));
    for (const u of UPGRADES) { expect(fs.existsSync(`public/ui/upgrades/${u.id}.png`), u.id).toBe(true); expect(u.blurb.length).toBeLessThan(80); }
    for (const c of ['core', 'beam', 'sphere', 'survival', 'mobility', 'pickup', 'drive', 'epic']) expect(fs.existsSync(`public/ui/cards/${c}.webp`), c).toBe(true);
  });
  it('every card changes the number it advertises, and the preview matches the result', () => {
    for (const u of UPGRADES) {
      const s = makeState(3); s.player.level = 12; s.player.hp = 40;
      if (u.requires) take(s, u.requires);
      if (u.needs) for (const o of UPGRADES.filter(x => x.category === u.needs!.category && x.id !== u.id && !x.requires && x.rarity !== 'epic').slice(0, u.needs.count)) take(s, o.id);
      const pv = previewUpgrade(s, u.id); expect(pv.before, u.id).not.toBe(pv.after);
      expect(take(s, u.id), u.id).toBe(true);
      expect(`${u.stat.read(s).toFixed(u.stat.digits ?? 0)}${u.stat.unit ?? ''}`, u.id).toBe(pv.after);
    }
  });
});
describe('offers', () => {
  it('keeps epics out of the early game and gates them behind a build', () => {
    for (let seed = 1; seed < 60; seed++) { const s = makeState(seed); s.player.level = 5; expect(createOffer(s, new SeededRng(seed)).every(id => UPGRADE_BY_ID[id].rarity !== 'epic')).toBe(true); }
    const s = makeState(1); s.player.level = 12;
    for (let i = 0; i < 100; i++) expect(createOffer(s, new SeededRng(i)).every(id => !UPGRADE_BY_ID[id].needs && !UPGRADE_BY_ID[id].requires)).toBe(true);
  });
  it('opens synergy cards once the build exists, and Twin Bloom only after Afterglow', () => {
    const s = makeState(1); s.player.level = 12; s.upgradeStacks = { hardlight: 1, widelance: 1 };
    let conductor = false, twin = false;
    for (let i = 0; i < 200; i++) { const o = createOffer(s, new SeededRng(i)); if (o.includes('conductor')) conductor = true; if (o.includes('twinbloom')) twin = true; }
    expect(conductor).toBe(true); expect(twin).toBe(false);
    s.upgradeStacks.afterglow = 1; for (let i = 0; i < 300; i++) if (createOffer(s, new SeededRng(i)).includes('twinbloom')) twin = true;
    expect(twin).toBe(true);
  });
  it('puts a Rare-or-better card in every third-level offer and never repeats a card inside one offer', () => {
    for (let seed = 1; seed < 80; seed++) { const s = makeState(seed); s.player.level = 6; const o = createOffer(s, new SeededRng(seed)); expect(new Set(o).size).toBe(3); expect(o.some(id => UPGRADE_BY_ID[id].rarity !== 'common')).toBe(true); }
  });
  it('never offers a maxed card', () => {
    const s = makeState(1); s.player.level = 10; s.upgradeStacks = Object.fromEntries(UPGRADES.filter(u => u.category !== 'core').map(u => [u.id, u.maxStacks]));
    for (let i = 0; i < 50; i++) expect(createOffer(s, new SeededRng(i)).every(id => UPGRADE_BY_ID[id].category === 'core')).toBe(true);
  });
});
describe('upgrade effects', () => {
  it('stack as designed', () => {
    const s = makeState(1); s.player.level = 9;
    take(s, 'widelance'); take(s, 'widelance'); expect(s.mods.beamWidth).toBeCloseTo(1.44);
    take(s, 'lancecool'); expect(s.mods.beamCd).toBeCloseTo(0.88);
    take(s, 'afterglow'); expect(s.mods.sphereEcho).toBe(1); take(s, 'twinbloom'); expect(s.mods.sphereEcho).toBe(2);
    take(s, 'richveins'); gainXp(s, 5); expect(s.player.xp).toBeCloseTo(5.6);
    take(s, 'mending'); expect(s.mods.regen).toBeCloseTo(0.8);
  });
  it('Second Wind refuses one killing blow, once', () => {
    const s = makeState(1); take(s, 'secondwind'); s.player.hp = 5; s.player.invulnerable = 0;
    expect(damagePlayer(s, 50)).toBe(true); expect(s.phase).toBe('running'); expect(s.player.hp).toBe(50); expect(s.player.invulnerable).toBeGreaterThan(2);
    s.player.invulnerable = 0; s.player.hp = 5; damagePlayer(s, 50); expect(s.phase).toBe('dead');
  });
  it('Plating reduces damage taken', () => { const s = makeState(1); take(s, 'plating'); damagePlayer(s, 100); expect(s.player.hp).toBeCloseTo(100 - 93); });
});
describe('pacing', () => {
  it('xp curve rises monotonically from a short first level', () => { expect(xpThreshold(1)).toBeLessThanOrEqual(9); for (let l = 1; l < 40; l++) expect(xpThreshold(l + 1)).toBeGreaterThan(xpThreshold(l)); });
  it('an orbiting bot with an unkillable body lands in the target band (first level < 45 s, L5 by 2:30, L9+ by 5:30, no gap over 75 s)', () => {
    const sim = new Simulation(7, 'gloam'), s = sim.state; let t = 0, a = 0;
    while (t < 330) {
      a += 0.01; sim.step(1 / 60, { x: Math.cos(a), y: Math.sin(a), dash: false, q: Math.floor(t * 10) % 85 === 0, f: s.player.drive >= 70, beam: Math.floor(t * 10) % 70 === 3, sphere: Math.floor(t * 10) % 160 === 5 });
      t += 1 / 60; s.player.hp = s.player.maxHp = 1e7;
      if (s.phase === 'upgrade') resolvePick(sim);
    }
    expect(s.levelUpAt[0]).toBeLessThan(45); expect(s.levelUpAt.filter(x => x < 150).length + 1).toBeGreaterThanOrEqual(5); expect(s.player.level).toBeGreaterThanOrEqual(9);
    expect(Math.max(...s.levelUpAt.map((x, i) => x - (s.levelUpAt[i - 1] ?? 0)))).toBeLessThan(75);
  }, 60000);
});
describe('minimap status', () => {
  it('reads the arena at a glance', () => {
    expect(mapStatus(blankMap, false).text).toBe('CLEAR'); expect(mapStatus({ ...blankMap, near: 3 }, false).text).toBe('CONTACT');
    expect(mapStatus({ ...blankMap, near: 9 }, false).text).toBe('SWARM'); expect(mapStatus({ ...blankMap, near: 20 }, false).text).toBe('OVERRUN');
    expect(mapStatus({ ...blankMap, eliteNear: true, near: 1 }, false).text).toBe('ELITE'); expect(mapStatus(blankMap, true)).toEqual({ text: 'BOSS', tone: 'boss' });
    expect(mapStatus({ ...blankMap, near: 30, hazards: [{ shape: 'circle', x: 0, y: 0, r: 1, w: 0, h: 0, warn: 0.4, live: false }] }, false).text).toBe('HAZARD');
  });
});

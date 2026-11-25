import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { HEROES } from '../content/heroes';
import { formsFor, kitFor } from '../app/heroKitView';
import { ARENA_IDS } from '../content/arenas';

const pub = (p: string) => existsSync(`public/${p}`);
describe('B29.1 hero showcase data', () => {
  it('lists base plus every real transformation per hero (Kai 3, Ren 1, Sora 1, Vex 2) with real idle sheets', () => {
    const n = Object.fromEntries(HEROES.map(h => [h.id, formsFor(h.id).length - 1]));
    expect(n).toEqual({ kai: 3, ren: 1, sora: 1, vex: 2 });
    for (const h of HEROES) for (const f of formsFor(h.id)) expect(pub(f.sheet), f.sheet).toBe(true);
  });
  it('every appearance has a real kit: auto, Q, E, R, dash; transformed ones add V, Overdrive and flight', () => {
    for (const h of HEROES) formsFor(h.id).forEach((_, i) => {
      const keys = kitFor(h.id, i).map(a => a.key);
      for (const k of ['AUTO', 'Q', 'E', 'R', 'SHIFT']) expect(keys, `${h.id}/${i} ${k}`).toContain(k);
      if (i > 0) for (const k of ['V', 'G', 'CTRL']) expect(keys, `${h.id}/${i} ${k}`).toContain(k); else expect(keys).not.toContain('V');
      for (const a of kitFor(h.id, i)) { expect(a.name.length).toBeGreaterThan(2); expect(a.text.length).toBeGreaterThan(10); expect(pub(`ui/icons/${a.icon}.png`), `${h.id}/${i} icon ${a.icon}`).toBe(true); }
    });
  });
  it('previews are pure data: reading a kit never touches any state', () => {
    const before = JSON.stringify(formsFor('kai')); kitFor('kai', 3); kitFor('vex', 2); expect(JSON.stringify(formsFor('kai'))).toBe(before);
  });
});
describe('B29.1 menu art', () => {
  it('ships the authored backgrounds, mode emblems and arena scenes the screens reference', () => {
    for (const n of ['hero_chamber', 'observatory', 'vault', 'altar', 'library', 'alliance']) expect(pub(`art/menu/${n}.webp`), n).toBe(true);
    for (const m of ['classic', 'endless', 'fracture_expedition', 'boss_rush', 'daily_challenge', 'weekly_challenge', 'vex_trial']) expect(pub(`art/menu/mode-${m}.webp`), m).toBe(true);
    for (const a of ARENA_IDS) expect(pub(`art/menu/arena-${a}.webp`), a).toBe(true);
  });
});

/** Maps B22 content ids to the ImageGen icon files in public/art/b22 (sliced from icon sheets by scripts/b22-art-process.py). */
import { RELICS } from './relics';
import { BRANCHES } from './branches';
import { LEGENDARIES } from './legendary';
import type { HeroId } from '../content/heroes';

const idx = <T extends { id: string }>(list: readonly T[], id: string) => Math.max(0, list.findIndex(x => x.id === id));
export const relicArt = (id: string) => `relic_${idx(RELICS, id)}`;
export const legendArt = (id: string) => `leg_${idx(LEGENDARIES, id)}`;
const HERO_BASE: Record<string, string> = { kai: 'brA_0', ren: 'brA_6', sora: 'brB_6', vex: 'brB_0' };
export const branchArt = (id: string) => {
  const b = BRANCHES.find(x => x.id === id); if (!b) return 'brA_0';
  const mine = BRANCHES.filter(x => x.hero === b.hero), n = Math.min(5, mine.indexOf(b)), base = HERO_BASE[b.hero] ?? 'brA_0', [pre, start] = [base.slice(0, 3), Number(base.slice(4))];
  return `${pre}_${start + n}`;
};
export const ultArt = (hero: HeroId) => `ult_${Math.max(0, ['kai', 'ren', 'sora', 'vex'].indexOf(hero))}`;
export const outfitArt = (id: string) => `outfit_${id}`;

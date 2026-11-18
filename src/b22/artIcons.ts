/** Maps B22 content ids to the ImageGen icon files in public/art/b22 (sliced from icon sheets by scripts/b22-art-process.py). */
import { RELICS } from './relics';
import type { HeroId } from '../content/heroes';

const idx = <T extends { id: string }>(list: readonly T[], id: string) => Math.max(0, list.findIndex(x => x.id === id));
export const relicArt = (id: string) => `relic_${idx(RELICS, id)}`;
export const legendArt = (id: string) => `ic_${id}`;
export const branchArt = (id: string) => `ic_${id}`;
export const ultArt = (hero: HeroId) => `ult_${Math.max(0, ['kai', 'ren', 'sora', 'vex'].indexOf(hero))}`;
export const outfitArt = (id: string) => `outfit_${id}`;

import { HERO_KIT } from './heroKits';
export type HeroId = 'kai' | 'ren' | 'sora';
export const HERO_IDS: readonly HeroId[] = ['kai', 'ren', 'sora'];
export const isHeroId = (v: unknown): v is HeroId => typeof v === 'string' && (HERO_IDS as readonly string[]).includes(v);
export interface HeroDef { id: HeroId; name: string; title: string; accent: string; weapon: string; role: string; playable: boolean; /** form display names, base first (Kai has three transformations; Ren and Sora exactly one) */ forms: readonly string[] }
export const HEROES: readonly HeroDef[] = [
  { id: 'kai', name: 'KAI', title: 'KINETIC VANGUARD', accent: '#eeb56c', weapon: 'Comet Fists', role: 'Close-range impact · momentum', playable: true, forms: ['base', 'flarebound', 'cometheart', 'stillfire-apex'] },
  { id: 'ren', name: 'REN', title: 'CRIMSON FIGHTER', accent: '#ff4a3d', weapon: HERO_KIT.ren.auto, role: HERO_KIT.ren.roleLine, playable: true, forms: ['base', 'crimson-ascendant'] },
  { id: 'sora', name: 'SORA', title: 'AZURE FIGHTER', accent: '#59b8ff', weapon: HERO_KIT.sora.auto, role: HERO_KIT.sora.roleLine, playable: true, forms: ['base', 'azure-sovereign'] },
];
export const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h])) as Record<HeroId, HeroDef>;

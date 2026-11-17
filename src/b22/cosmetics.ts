/** B22 cosmetics: eight premium alternate outfits (two per hero), aura palettes, victory poses, crests, finishers and portraits. All are VISUAL only (never a hidden power source) and unlock from real conditions recorded in the save ledger. Art ids point into public/art/outfits (production art pending: the runtime tints/overlays the base sprite until ImageGen packs land). */
import type { HeroId } from '../content/heroes';
import { MILESTONES } from './mastery';

export type OutfitId = 'kai_circuit_vanguard' | 'kai_celestial_wanderer' | 'ren_ironheart_bruiser' | 'ren_ember_ronin' | 'sora_azure_artificer' | 'sora_skybound_oracle' | 'vex_oathkeepers_ruin' | 'vex_eclipse_nomad';
export interface OutfitDef { id: OutfitId; hero: HeroId; name: string; blurb: string; silhouette: string; unlock: Unlock; palette: { primary: string; secondary: string; glow: string }; aura: string; pose: string; icon: string }
export type Unlock = { kind: 'wins'; hero: HeroId; n: number } | { kind: 'boss'; boss: string } | { kind: 'mastery'; milestone: string } | { kind: 'mode'; mode: string } | { kind: 'story' } | { kind: 'default' };
const O = (id: OutfitId, hero: HeroId, name: string, blurb: string, silhouette: string, unlock: Unlock, palette: OutfitDef['palette']): OutfitDef => ({ id, hero, name, blurb, silhouette, unlock, palette, aura: `aura_${id}`, pose: `pose_${id}`, icon: `outfit_${id}` });
export const OUTFITS: readonly OutfitDef[] = [
  O('kai_circuit_vanguard', 'kai', 'Circuit Vanguard', 'Techfighter plating over the same sturdy boots.', 'angular shoulder plates, belt panel', { kind: 'wins', hero: 'kai', n: 2 }, { primary: '#5a6b7a', secondary: '#eeb56c', glow: '#9fe8ff' }),
  O('kai_celestial_wanderer', 'kai', 'Celestial Wanderer', 'A torn ceremonial jacket and sash.', 'long jacket tails, sash', { kind: 'mode', mode: 'fracture_expedition' }, { primary: '#e8dcc0', secondary: '#c9a24a', glow: '#fff0b0' }),
  O('ren_ironheart_bruiser', 'ren', 'Ironheart Bruiser', 'A heavy crimson gauntlet kit.', 'oversized gauntlets, chest guard', { kind: 'wins', hero: 'ren', n: 2 }, { primary: '#7a2b2b', secondary: '#c0c0c8', glow: '#ff6a4d' }),
  O('ren_ember_ronin', 'ren', 'Ember Ronin', 'A disciplined narrow combat silhouette.', 'narrow coat, wrapped forearms', { kind: 'boss', boss: 'castellan' }, { primary: '#2b2224', secondary: '#ff7a3d', glow: '#ffb070' }),
  O('sora_azure_artificer', 'sora', 'Azure Artificer', 'A precise techno-ranged rig.', 'visor, backpack array', { kind: 'wins', hero: 'sora', n: 2 }, { primary: '#2d4a7a', secondary: '#8fe0ff', glow: '#59b8ff' }),
  O('sora_skybound_oracle', 'sora', 'Skybound Oracle', 'An elegant long-sleeved channeling mantle.', 'long sleeves, floating mantle', { kind: 'boss', boss: 'regent' }, { primary: '#d6e4ff', secondary: '#7a8cd6', glow: '#bfe0ff' }),
  O('vex_oathkeepers_ruin', 'vex', "Oathkeeper's Ruin", 'Broken guardian regalia.', 'cracked pauldrons, torn tabard', { kind: 'story' }, { primary: '#1d1730', secondary: '#a070ff', glow: '#c7a8ff' }),
  O('vex_eclipse_nomad', 'vex', 'Eclipse Nomad', 'Lightweight exile armor and cloth.', 'hooded cloak, light greaves', { kind: 'mastery', milestone: 'riftbound.adept' }, { primary: '#2a2a3a', secondary: '#7a5cc8', glow: '#e0d0ff' }),
];
export const OUTFIT_BY_ID = Object.fromEntries(OUTFITS.map(o => [o.id, o])) as Record<OutfitId, OutfitDef>;
export const isOutfitId = (v: unknown): v is OutfitId => typeof v === 'string' && v in OUTFIT_BY_ID;
export const outfitsFor = (hero: HeroId) => OUTFITS.filter(o => o.hero === hero);

/** Crests and aura / finisher / pose rewards that come from mastery, plus a few from modes. Every id is a real earned unlock. */
export interface CosmeticDef { id: string; kind: 'aura_detail' | 'finisher' | 'crest' | 'victory_pose' | 'aura_master' | 'crest_mode'; name: string; source: string }
export const COSMETICS: readonly CosmeticDef[] = [
  ...MILESTONES.map(m => ({ id: m.reward.id, kind: m.reward.kind as CosmeticDef['kind'], name: m.reward.label, source: `Mastery · ${m.name}` })),
  { id: 'crest_endless', kind: 'crest_mode', name: 'Endless crest', source: 'Reach Endless cycle 3' },
  { id: 'crest_boss_rush', kind: 'crest_mode', name: 'Gauntlet crest', source: 'Clear the Initiation Gauntlet' },
  { id: 'crest_sovereign', kind: 'crest_mode', name: 'Sovereign crest', source: 'Clear the Sovereign Trial' },
  { id: 'crest_expedition', kind: 'crest_mode', name: 'Expedition crest', source: 'Finish a Fracture Expedition' },
  { id: 'crest_alliance', kind: 'crest_mode', name: 'Alliance crest', source: 'Win a co-op run' },
  { id: 'crest_vanguard', kind: 'crest_mode', name: 'Vanguard crest', source: 'Finish the Trial of the Oathbroken' },
  { id: 'crest_daily', kind: 'crest_mode', name: 'Daily crest', source: 'Complete a Daily Challenge' },
];
export const COSMETIC_IDS = new Set(COSMETICS.map(c => c.id));
export const isCosmeticId = (v: unknown): v is string => typeof v === 'string' && COSMETIC_IDS.has(v);

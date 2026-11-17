/** B22 Fractured Realms: eight run-changing expedition relics (four per realm). Not B18 start boons and not flat stats: each has a trigger, a cooldown or stack cap, and an authoritative effect in sim/RelicSystem.ts. All numbers live here so card text and sim cannot disagree. */
import type { ArenaId } from '../content/arenas';

export type RelicId = 'halo_prism' | 'anchor_of_dawn' | 'crownless_sigil' | 'skyforge_feather' | 'void_hourglass' | 'echo_lens' | 'rift_key' | 'paradox_compass';
export interface RelicDef { id: RelicId; realm: Extract<ArenaId, 'aetherfall' | 'paradox'>; name: string; trigger: string; effect: string; limit: string; icon: string; accent: string }
export const RELICS: readonly RelicDef[] = [
  { id: 'halo_prism', realm: 'aetherfall', name: 'Halo Prism', trigger: 'Every 6th heavy hit (at least 120% of your auto damage)', effect: 'Refracts a spark into a second living foe for 45% of that hit.', limit: 'Once per 0.5 s; never targets invulnerable enemies.', icon: 'relic_halo_prism', accent: '#ffe08a' },
  { id: 'anchor_of_dawn', realm: 'aetherfall', name: 'Anchor of Dawn', trigger: 'Landing a dash of 90+ px or a Bloodstar leap', effect: 'A dawn ring for 1.8 s: 35% less damage taken and nearby foes are shoved back.', limit: 'Cooldown 8 s, so repeated tiny dashes do nothing.', icon: 'relic_anchor_of_dawn', accent: '#fff2b8' },
  { id: 'crownless_sigil', realm: 'aetherfall', name: 'Crownless Sigil', trigger: 'A boss is exposed, or a shield-bearer drops its guard', effect: 'Your next heavy strike (25+ damage) lands for 160%.', limit: 'One charge at a time; it expires after 6 s.', icon: 'relic_crownless_sigil', accent: '#f0c060' },
  { id: 'skyforge_feather', realm: 'aetherfall', name: 'Skyforge Feather', trigger: 'Dash, then use E within 2.5 s', effect: 'That E releases with +30% damage and a bright trail. Every hero has an E, so every hero benefits.', limit: 'Cooldown 6 s.', icon: 'relic_skyforge_feather', accent: '#d8f0ff' },
  { id: 'void_hourglass', realm: 'paradox', name: 'Void Hourglass', trigger: 'A perfect dodge (dash i-frames through an enemy shot)', effect: 'Hostile shots near you crawl at 40% speed for 2.2 s. Local only: the run clock never changes.', limit: 'Cooldown 7 s.', icon: 'relic_void_hourglass', accent: '#9a8cff' },
  { id: 'echo_lens', realm: 'paradox', name: 'Echo Lens', trigger: 'Casting Q, E or R', effect: 'A warned echo repeats the cast on the nearest foe after 0.6 s for 35% damage.', limit: 'Up to 4 targets, cooldown 4 s.', icon: 'relic_echo_lens', accent: '#7fe0e8' },
  { id: 'rift_key', realm: 'paradox', name: 'Rift Key', trigger: 'An escape dash (not a trivial one)', effect: 'Leaves a rift for 1.2 s that damages and pushes ordinary enemies away.', limit: 'Cooldown 9 s; you are never teleported.', icon: 'relic_rift_key', accent: '#c58bff' },
  { id: 'paradox_compass', realm: 'paradox', name: 'Paradox Compass', trigger: 'Reversing your heading by 90 degrees after holding a direction 0.35 s', effect: 'A bearing: +6% damage and +4% speed per bearing, up to 4, each lasting 3 s.', limit: 'Stick jitter does not count; you must hold the old direction and move 40 px.', icon: 'relic_paradox_compass', accent: '#6fe3e1' },
];
export const RELIC_BY_ID = Object.fromEntries(RELICS.map(r => [r.id, r])) as Record<RelicId, RelicDef>;
export const RELIC_IDS: readonly RelicId[] = RELICS.map(r => r.id);
export const isRelicId = (v: unknown): v is RelicId => typeof v === 'string' && v in RELIC_BY_ID;
export const REALM_RELICS = (realm: ArenaId): RelicId[] => RELICS.filter(r => r.realm === realm).map(r => r.id);
/** Every number the relic sim reads. */
export const RELIC_RULES = {
  prism: { every: 6, heavy: 1.2, share: 0.45, gap: 0.5, range: 320 },
  dawn: { minDash: 90, cooldown: 8, duration: 1.8, reduction: 0.35, radius: 150, push: 120 },
  sigil: { mul: 1.6, minHit: 25, expire: 6 },
  feather: { window: 2.5, cooldown: 6, mul: 1.3, boostFor: 1.4 },
  hourglass: { cooldown: 7, duration: 2.2, radius: 260, factor: 0.4 },
  lens: { cooldown: 4, delay: 0.6, share: 0.35, targets: 4, radius: 90 },
  key: { cooldown: 9, minDash: 90, duration: 1.2, radius: 85, dps: 30, push: 70 },
  compass: { hold: 0.35, travel: 40, max: 4, life: 3, dmg: 0.06, speed: 0.04 },
} as const;

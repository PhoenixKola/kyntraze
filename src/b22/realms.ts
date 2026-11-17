/** Which enemies a realm (or an opted-in Endless cycle) mixes in, and when. The six archetypes never spawn in Classic: the director only consults this for plans whose pool is 'realm'. */
import type { ArenaId } from '../content/arenas';
import type { MobKind } from '../content/enemies';
export interface RealmSlot { kind: MobKind; intro: number; weight: number }
export const REALM_TABLE: Partial<Record<ArenaId, RealmSlot[]>> = {
  aetherfall: [{ kind: 'sky_lancer', intro: 45, weight: 0.16 }, { kind: 'halo_scribe', intro: 130, weight: 0.11 }, { kind: 'citadel_bulwark', intro: 220, weight: 0.06 }, { kind: 'phase_harrier', intro: 330, weight: 0.1 }, { kind: 'singularity_husk', intro: 480, weight: 0.06 }],
  paradox: [{ kind: 'rift_mimic', intro: 60, weight: 0.15 }, { kind: 'phase_harrier', intro: 150, weight: 0.13 }, { kind: 'halo_scribe', intro: 200, weight: 0.09 }, { kind: 'singularity_husk', intro: 270, weight: 0.08 }, { kind: 'citadel_bulwark', intro: 420, weight: 0.05 }],
};
/** Old enemies that keep appearing in the realms so the new problems arrive mixed with familiar ones. */
export const REALM_BASE: MobKind[] = ['pursuer', 'flanker', 'ranged'];
/** Endless escalation table: cycle index (0-based, per 300 s) -> extra kinds unlocked for the mix. Cycle 2 onward explicitly opts into the realm enemies. */
export const ENDLESS_MIX: { cycle: number; kinds: RealmSlot[] }[] = [
  { cycle: 1, kinds: [{ kind: 'ranged', intro: 0, weight: 0.2 }, { kind: 'aegis', intro: 0, weight: 0.08 }] },
  { cycle: 2, kinds: [{ kind: 'sky_lancer', intro: 0, weight: 0.12 }, { kind: 'phase_harrier', intro: 0, weight: 0.1 }] },
  { cycle: 3, kinds: [{ kind: 'halo_scribe', intro: 0, weight: 0.09 }, { kind: 'singularity_husk', intro: 0, weight: 0.07 }, { kind: 'citadel_bulwark', intro: 0, weight: 0.05 }] },
  { cycle: 4, kinds: [{ kind: 'rift_mimic', intro: 0, weight: 0.1 }] },
];
export const endlessKinds = (cycle: number): RealmSlot[] => ENDLESS_MIX.filter(m => m.cycle <= cycle).flatMap(m => m.kinds);

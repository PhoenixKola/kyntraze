/** B22 Ascension Protocol: twelve legendary recipes. Prerequisites are REAL existing cards (src/content/upgrades.ts) so each is earnable in a 15-20 minute run; the resolver is pure and unit-tested per recipe. Effects live in sim/BranchSystem.ts. */
import type { HeroId } from '../content/heroes';
import type { UpgradeId } from '../content/upgrades';

export type LegendaryId = 'solar_rupture' | 'dragon_overture' | 'nova_constellation' | 'crimson_relay' | 'meteor_crucible' | 'bloodstar_rupture' | 'blue_needle_storm' | 'prismatic_meridian' | 'zero_convergence' | 'shard_requiem' | 'oathbreaker_chain' | 'null_waltz';
export interface Need { id: UpgradeId; stacks: number }
export interface LegendaryDef { id: LegendaryId; hero: HeroId; name: string; needs: Need[]; effect: string; limit: string; icon: string }
const L = (id: LegendaryId, hero: HeroId, name: string, needs: Need[], effect: string, limit: string): LegendaryDef => ({ id, hero, name, needs, effect, limit, icon: `legend_${id}` });
export const LEGENDARIES: readonly LegendaryDef[] = [
  L('solar_rupture', 'kai', 'Solar Rupture', [{ id: 'widelance', stacks: 2 }, { id: 'afterburn', stacks: 1 }], 'Every E cast opens a delayed solar fissure along its real path, hitting survivors once.', 'One fissure per cast, 6 targets.'),
  L('dragon_overture', 'kai', 'Dragon Overture', [{ id: 'reach', stacks: 2 }, { id: 'echo', stacks: 1 }], 'An auto-attack finisher chains three golden dragon strikes onto the nearest foes.', '3 strikes, cooldown 5 s.'),
  L('nova_constellation', 'kai', 'Nova Constellation', [{ id: 'afterglow', stacks: 1 }, { id: 'twinbloom', stacks: 1 }], 'The second bloom seeds up to 4 small nova nodes at safe, spaced locations.', '4 nodes, each bursts once.'),
  L('crimson_relay', 'ren', 'Crimson Relay', [{ id: 'tempo', stacks: 2 }, { id: 'reach', stacks: 2 }], 'A completed Hammer Chain finisher dashes to a new target for one extra finishing strike.', 'One relay per finisher, cooldown 4 s.'),
  L('meteor_crucible', 'ren', 'Meteor Crucible', [{ id: 'dashcool', stacks: 2 }, { id: 'hardlight', stacks: 2 }], 'Meteor Rush burns a path and ends in a pressure burst that shoves foes outward.', 'Path 2.4 s, one burst per rush.'),
  L('bloodstar_rupture', 'ren', 'Bloodstar Rupture', [{ id: 'bloombulk', stacks: 2 }, { id: 'afterglow', stacks: 1 }], 'Bloodstar leaves a molten fissure field that keeps pushing foes toward its edge.', 'One field, 4 s.'),
  L('blue_needle_storm', 'sora', 'Blue Needle Storm', [{ id: 'tempo', stacks: 2 }, { id: 'echo', stacks: 1 }], 'Every 4th auto needle that lands splits into two seeking fragments.', '2 fragments, 40% damage, cooldown 1.2 s.'),
  L('prismatic_meridian', 'sora', 'Prismatic Meridian', [{ id: 'widelance', stacks: 2 }, { id: 'conductor', stacks: 1 }], 'The charged Lance keeps a piercing core and arcs between foes it already damaged.', 'Up to 4 arcs per cast.'),
  L('zero_convergence', 'sora', 'Zero Convergence', [{ id: 'bloombulk', stacks: 2 }, { id: 'afterglow', stacks: 1 }, { id: 'twinbloom', stacks: 1 }], 'Zero Horizon collapses its orbs into one precision blast instead of scattering.', 'One blast, large radius, single point.'),
  L('shard_requiem', 'vex', 'Shard Requiem', [{ id: 'plating', stacks: 2 }, { id: 'surgecell', stacks: 2 }], 'A timed parry stores one retaliation charge that empowers your next Q or auto combo.', 'One stored charge, never stacks.'),
  L('oathbreaker_chain', 'vex', 'Oathbreaker Chain', [{ id: 'hardlight', stacks: 2 }, { id: 'afterburn', stacks: 1 }], 'A Seal detonation spreads a fracture mark to surviving adjacent enemies.', '3 spread marks, one generation.'),
  L('null_waltz', 'vex', 'Null Waltz', [{ id: 'dashcool', stacks: 2 }, { id: 'embercore', stacks: 1 }], 'A perfect Rift Reversal launches a 3-step precision counter sequence.', '3 steps, no extra invulnerability, cooldown 8 s.'),
];
/** B26: the same legendaries read differently in Crimson Ascendant. */
export const REN_FORM_LEGEND: Partial<Record<LegendaryId, string>> = {
  crimson_relay: 'Ascendant: a Crimson Fury uppercut finisher that really hits relays once (4 s cooldown).',
  meteor_crucible: 'Ascendant: the Scarlet Rampage path burns for 2.4 s and the slam ends in a pressure burst.',
  bloodstar_rupture: 'Ascendant: only the final fist of Catastrophe leaves the molten field (4 s).',
};
export const SORA_FORM_LEGEND: Partial<Record<LegendaryId, string>> = {
  blue_needle_storm: 'Sovereign: every fourth Astral Blade that really hits splits into two seeking fragments (1.2 s cooldown).',
  prismatic_meridian: "Sovereign: Heaven's Spear arcs between up to 5 struck foes (4 arcs).",
  zero_convergence: 'Sovereign: Celestial Collapse gathers its echo into one stronger precision burst (no echo, no control nodes).',
};
export const LEGENDARY_BY_ID = Object.fromEntries(LEGENDARIES.map(l => [l.id, l])) as Record<LegendaryId, LegendaryDef>;
export const isLegendaryId = (v: unknown): v is LegendaryId => typeof v === 'string' && v in LEGENDARY_BY_ID;
export const LEGENDARY_CAP = 3;
export const legendariesFor = (hero: HeroId) => LEGENDARIES.filter(l => l.hero === hero);
/** How many of a recipe's prerequisites are met (for the HUD's recipe tracker). */
export function recipeProgress(def: LegendaryDef, stacks: Readonly<Record<string, number>>): { met: number; total: number; ready: boolean } {
  let met = 0; for (const n of def.needs) if ((stacks[n.id] ?? 0) >= n.stacks) met++;
  return { met, total: def.needs.length, ready: met === def.needs.length };
}
/** Recipes that may be offered now: hero matches, prerequisites met, not owned, under the cap, not struck by a banish. Never offers an unreachable or already-owned recipe. */
export function eligibleLegendaries(hero: HeroId, stacks: Readonly<Record<string, number>>, owned: readonly LegendaryId[], banished: readonly string[] = []): LegendaryDef[] {
  if (owned.length >= LEGENDARY_CAP) return [];
  return legendariesFor(hero).filter(l => !owned.includes(l.id) && !banished.includes(`legend:${l.id}`) && recipeProgress(l, stacks).ready);
}

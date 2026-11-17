/** B22 Ascension Protocol: 24 mutually exclusive Q / E / R branches (2 per slot, 3 slots, 4 heroes). Each is a REAL mechanical change layered on the base skill by sim/BranchSystem.ts: extra authoritative effects plus a stat tradeoff applied when picked. Visual tiers (B21) are a separate layer. */
import type { HeroId } from '../content/heroes';

export type Slot = 'q' | 'e' | 'r';
export type BranchId =
  | 'seismic_impact' | 'pressure_wave' | 'prism_conductor' | 'burning_wake' | 'starfall_bloom' | 'twin_nova'
  | 'relentless_chain' | 'crimson_guardbreak' | 'bloodline_relay' | 'meteor_collision' | 'red_comet_rain' | 'crimson_crater'
  | 'needle_spiral' | 'stormline_array' | 'piercing_meridian' | 'celestial_prism' | 'starfield_array' | 'celestial_collapse'
  | 'reversal_guard' | 'mirror_counter' | 'shadow_riposte' | 'eclipse_shift' | 'marked_detonation' | 'severance_judgment';
export interface BranchDef {
  id: BranchId; hero: HeroId; slot: Slot; side: 'A' | 'B'; name: string; skill: string;
  /** what it adds, then what it costs: both are real */ gain: string; cost: string; icon: string;
  /** stat tradeoff applied once when chosen (multipliers on the existing mods / player stats) */ tradeoff: { qDamage?: number; beamDamage?: number; sphereDamage?: number; beamCd?: number; sphereCd?: number; qCd?: number; sphereRadius?: number; beamWidth?: number };
}
const B = (id: BranchId, hero: HeroId, slot: Slot, side: 'A' | 'B', name: string, skill: string, gain: string, cost: string, tradeoff: BranchDef['tradeoff'] = {}): BranchDef => ({ id, hero, slot, side, name, skill, gain, cost, icon: `branch_${id}`, tradeoff });
export const BRANCHES: readonly BranchDef[] = [
  B('seismic_impact', 'kai', 'q', 'A', 'Seismic Impact', 'Impact Pulse', 'Two compact quake pulses follow the pulse and stagger what they hit.', 'Pulse radius -15%.', { }),
  B('pressure_wave', 'kai', 'q', 'B', 'Pressure Wave', 'Impact Pulse', 'A forward cone shoves and slows foes away from you.', 'Burst damage -20%.', { qDamage: 0.8 }),
  B('prism_conductor', 'kai', 'e', 'A', 'Prism Conductor', 'Fracture Lance', 'Each enemy the cast actually hits chains energy to up to 2 more foes for 40%.', 'Cooldown +10%.', { beamCd: 1.1 }),
  B('burning_wake', 'kai', 'e', 'B', 'Burning Wake', 'Fracture Lance', 'The cast leaves a damaging afterburn line along its path for 2.4 s.', 'Direct damage -10%.', { beamDamage: 0.9 }),
  B('starfall_bloom', 'kai', 'r', 'A', 'Starfall Bloom', 'Nova Bloom', 'Marked enemies take delayed follow-up bursts at their own locations.', 'Main burst radius -10%.', { sphereRadius: 0.9 }),
  B('twin_nova', 'kai', 'r', 'B', 'Twin Nova', 'Nova Bloom', 'Two sequential growing rings in place with different hit windows.', 'Cooldown +12%.', { sphereCd: 1.12 }),
  B('relentless_chain', 'ren', 'q', 'A', 'Relentless Chain', 'Crimson Break', 'Earned close-range contacts extend the combo with capped chaining.', 'Per-beat damage -10%.', { qDamage: 0.9 }),
  B('crimson_guardbreak', 'ren', 'q', 'B', 'Crimson Guardbreak', 'Crimson Break', 'A slow forceful finish that breaks shields and opens stagger windows.', 'Cooldown +15%.', { qCd: 1.15 }),
  B('bloodline_relay', 'ren', 'e', 'A', 'Bloodline Relay', 'Meteor Rush', 'The chain relays between nearby targets for extra strikes.', 'Strike damage -10%.', { beamDamage: 0.9 }),
  B('meteor_collision', 'ren', 'e', 'B', 'Meteor Collision', 'Meteor Rush', 'The final strike is a heavy collision with a large splash and knockback.', 'One fewer relay strike (damage -15%).', { beamDamage: 0.85 }),
  B('red_comet_rain', 'ren', 'r', 'A', 'Red Comet Rain', 'Bloodstar Impact', 'Several smaller guided impacts follow the slam.', 'Main impact -20%.', { sphereDamage: 0.8 }),
  B('crimson_crater', 'ren', 'r', 'B', 'Crimson Crater', 'Bloodstar Impact', 'A massive crater with a lingering damaging fissure ring.', 'Cooldown +20%.', { sphereCd: 1.2 }),
  B('needle_spiral', 'sora', 'q', 'A', 'Needle Spiral', 'Azure Volley', 'Spiral needles home briefly and prefer foes not yet hit.', 'Volley damage -10%.', { qDamage: 0.9 }),
  B('stormline_array', 'sora', 'q', 'B', 'Stormline Array', 'Azure Volley', 'A straight barrage that pierces up to 3 foes per bolt for lane control.', 'No homing, damage -10%.', { qDamage: 0.9 }),
  B('piercing_meridian', 'sora', 'e', 'A', 'Piercing Meridian', 'Celestial Lance', 'A tighter, longer beam that pierces everything on its line.', 'Width -20%.', { beamWidth: 0.8 }),
  B('celestial_prism', 'sora', 'e', 'B', 'Celestial Prism', 'Celestial Lance', 'The central hit fans beams to marked foes, capped at 3.', 'Central damage -15%.', { beamDamage: 0.85 }),
  B('starfield_array', 'sora', 'r', 'A', 'Starfield Array', 'Zero Horizon', 'More orbs and persistent short area-control shots.', 'Cooldown +10%.', { sphereCd: 1.1 }),
  B('celestial_collapse', 'sora', 'r', 'B', 'Celestial Collapse', 'Zero Horizon', 'The orbs converge into one enormous aimed blast instead of scattering.', 'Single target area: radius concentrates.', { sphereDamage: 1.0 }),
  B('reversal_guard', 'vex', 'q', 'A', 'Reversal Guard', 'Parry Halo', 'A wider forgiving guard that stuns on a counter.', 'Lower riposte burst.', { qDamage: 0.85 }),
  B('mirror_counter', 'vex', 'q', 'B', 'Mirror Counter', 'Parry Halo', 'Narrow timing, but a high precision reflected riposte.', 'Narrow guard window.', { qDamage: 1.0 }),
  B('shadow_riposte', 'vex', 'e', 'A', 'Shadow Riposte', 'Rift Reversal', 'A short blink that hits and repositions behind a marked target.', 'Shorter reach.', { beamCd: 1.0 }),
  B('eclipse_shift', 'vex', 'e', 'B', 'Eclipse Shift', 'Rift Reversal', 'A longer evasive shift that leaves a damaging fracture line.', 'Cooldown +15%.', { beamCd: 1.15 }),
  B('marked_detonation', 'vex', 'r', 'A', 'Marked Detonation', 'Oathbreaker Seal', 'Marks chain-explode between valid foes.', 'Each mark deals less.', { sphereDamage: 0.9 }),
  B('severance_judgment', 'vex', 'r', 'B', 'Severance Judgment', 'Oathbreaker Seal', 'Fewer, empowered marks focus a priority enemy and open a vulnerability window.', 'Only 2 marks.', { sphereDamage: 1.0 }),
];
export const BRANCH_BY_ID = Object.fromEntries(BRANCHES.map(b => [b.id, b])) as Record<BranchId, BranchDef>;
export const isBranchId = (v: unknown): v is BranchId => typeof v === 'string' && v in BRANCH_BY_ID;
export const slotKey = (hero: HeroId, slot: Slot) => `${hero}.${slot}` as const;
export const branchesFor = (hero: HeroId, slot: Slot): [BranchDef, BranchDef] => BRANCHES.filter(b => b.hero === hero && b.slot === slot) as [BranchDef, BranchDef];
/** Earned, not handed out: the branch for a slot is offered at its level once that skill has been cast `casts` times this run. */
export const BRANCH_RULES: Record<Slot, { level: number; casts: number }> = { q: { level: 6, casts: 2 }, e: { level: 9, casts: 2 }, r: { level: 12, casts: 1 } };

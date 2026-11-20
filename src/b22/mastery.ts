/** B22 Ascension Protocol: seven form-mastery paths x three milestones = 21 objectives, plus the four ultimates. A milestone is judged from counters the SIM increments during a run (`B22State.m`), then persisted once; rewards are cosmetic or side-grades, never raw permanent power. */
import type { HeroId } from '../content/heroes';

export type FormKey = 'flarebound' | 'cometheart' | 'stillfire' | 'crimson_ascendant' | 'azure_sovereign' | 'riftbound' | 'voidheart_exile';
export const FORM_KEYS: readonly FormKey[] = ['flarebound', 'cometheart', 'stillfire', 'crimson_ascendant', 'azure_sovereign', 'riftbound', 'voidheart_exile'];
export const FORM_INFO: Record<FormKey, { hero: HeroId; name: string; accent: string }> = {
  flarebound: { hero: 'kai', name: 'Flarebound', accent: '#ffb347' }, cometheart: { hero: 'kai', name: 'Cometheart', accent: '#f4d36a' }, stillfire: { hero: 'kai', name: 'Stillfire Apex', accent: '#dfe8f2' },
  crimson_ascendant: { hero: 'ren', name: 'Crimson Ascendant', accent: '#ff4a3d' }, azure_sovereign: { hero: 'sora', name: 'Azure Sovereign', accent: '#59b8ff' },
  riftbound: { hero: 'vex', name: 'Riftbound', accent: '#a070ff' }, voidheart_exile: { hero: 'vex', name: 'Voidheart Exile', accent: '#c7b4ff' },
};
export type Tier = 'initiate' | 'adept' | 'master';
export const TIERS: readonly Tier[] = ['initiate', 'adept', 'master'];
/** A counter key the sim increments; `goal` is judged inside ONE run (nothing is grinded across runs). */
export interface Milestone { id: string; form: FormKey; tier: Tier; name: string; blurb: string; counter: string; goal: number; reward: { kind: 'aura_detail' | 'finisher' | 'crest' | 'victory_pose' | 'aura_master'; id: string; label: string } }
const M = (form: FormKey, tier: Tier, name: string, blurb: string, counter: string, goal: number, rk: Milestone['reward']['kind'], label: string): Milestone => ({ id: `${form}.${tier}`, form, tier, name, blurb, counter, goal, reward: { kind: rk, id: `${rk}_${form}`, label } });
export const MILESTONES: readonly Milestone[] = [
  M('flarebound', 'initiate', 'Ignition Proven', 'Land 25 hits while Flarebound.', 'hit.flarebound', 25, 'aura_detail', 'Ember-spark edge detail'),
  M('flarebound', 'adept', 'Burning Rhythm', 'Defeat 60 enemies in one Flarebound run.', 'kill.flarebound', 60, 'finisher', 'Solar finisher'),
  M('flarebound', 'master', 'Solar Verdict', 'Defeat a boss while Flarebound.', 'boss.flarebound', 1, 'crest', 'Solar crest + victory pose'),
  M('cometheart', 'initiate', 'Comet Strike', 'Use Dragonfang Rush 6 times in one run.', 'dragon.cast', 6, 'aura_detail', 'Comet-flicker edge detail'),
  M('cometheart', 'adept', 'Charged Lunge', 'Bite 3+ enemies with one Dragonfang lunge.', 'dragon.multi', 1, 'finisher', 'Comet finisher'),
  M('cometheart', 'master', 'Cometbreaker', 'Defeat a boss while in Cometheart.', 'boss.cometheart', 1, 'crest', 'Comet crest + victory pose'),
  M('stillfire', 'initiate', 'Quiet Step', 'Perfect-evade once.', 'evade.count', 1, 'aura_detail', 'Silver-ripple edge detail'),
  M('stillfire', 'adept', 'Weightless', 'Perfect-evade 5 times in one run.', 'evade.count', 5, 'finisher', 'Silver finisher'),
  M('stillfire', 'master', 'Untouched', 'Defeat a boss in Stillfire without taking damage during that fight.', 'boss.flawless.stillfire', 1, 'crest', 'Silver crest + victory pose'),
  M('crimson_ascendant', 'initiate', 'First Rush', 'Land 15 Scarlet Rampage contacts and slams in Ascendant.', 'rush.strike.form', 15, 'aura_detail', 'Ember-lash edge detail'),
  M('crimson_ascendant', 'adept', 'Scarlet Tide', 'Defeat 40 enemies in one Ascendant run.', 'kill.crimson_ascendant', 40, 'finisher', 'Crimson finisher'),
  M('crimson_ascendant', 'master', 'Ascendant Verdict', 'Defeat a boss in Ascendant.', 'boss.crimson_ascendant', 1, 'crest', 'Crimson crest + victory pose'),
  M('azure_sovereign', 'initiate', 'Full Charge', 'Land 3 fully charged Astral Devastations on an enemy in Sovereign.', 'lance.t3.form', 3, 'aura_detail', 'Azure-halo edge detail'),
  M('azure_sovereign', 'adept', 'Meridian', "Hit 5 different enemies with one Heaven's Spear sequence or one Celestial Collapse (the base Lance pierce still counts).", 'lance.pierce', 5, 'finisher', 'Azure finisher'),
  M('azure_sovereign', 'master', 'Sovereign Verdict', 'Defeat a boss in Sovereign.', 'boss.azure_sovereign', 1, 'crest', 'Azure crest + victory pose'),
  M('riftbound', 'initiate', 'Held Breath', 'Land a perfect parry while Riftbound.', 'parry.perfect.form', 1, 'aura_detail', 'Violet-shard edge detail'),
  M('riftbound', 'adept', 'Answered', 'Land 5 perfect parries in one run.', 'parry.perfect', 5, 'finisher', 'Violet finisher'),
  M('riftbound', 'master', 'Riftbound Verdict', 'Defeat a boss while Riftbound.', 'boss.riftbound', 1, 'crest', 'Violet crest + victory pose'),
  M('voidheart_exile', 'initiate', 'First Riposte', 'Land a Dimensional Severance on a real incoming threat in Voidheart.', 'riposte.form', 1, 'aura_detail', 'Broken-halo edge detail'),
  M('voidheart_exile', 'adept', 'Exile\'s Measure', 'Land 10 threat-timed ripostes in one run (Rift Reversal, Rift Execution or Dimensional Severance).', 'riposte', 10, 'finisher', 'Voidheart finisher'),
  M('voidheart_exile', 'master', 'Voidheart Verdict', 'Defeat the Oathkeeper, or any boss while Voidheart.', 'boss.voidheart_exile', 1, 'crest', 'Void crest + victory pose'),
];
export const MILESTONE_BY_ID = Object.fromEntries(MILESTONES.map(m => [m.id, m])) as Record<string, Milestone>;
export const milestonesOf = (form: FormKey) => MILESTONES.filter(m => m.form === form);
export const isMilestoneId = (v: unknown): v is string => typeof v === 'string' && v in MILESTONE_BY_ID;
/** Ultimates: one per hero. R becomes the ULTIMATE while the gauge is full (surfaced on the HUD); nothing is keyboard-only. */
export type UltimateId = 'celestial_dragonbreaker' | 'scarlet_cataclysm' | 'azure_event_horizon' | 'judgment_of_the_exile';
export interface UltimateDef { id: UltimateId; hero: HeroId; name: string; blurb: string; cooldown: number; lockout: number; icon: string }
export const ULTIMATES: Record<HeroId, UltimateDef> = {
  kai: { id: 'celestial_dragonbreaker', hero: 'kai', name: 'Celestial Dragonbreaker', blurb: 'Three escalating golden strikes, then a directional finishing cannon.', cooldown: 60, lockout: 2.4, icon: 'ult_celestial_dragonbreaker' },
  ren: { id: 'scarlet_cataclysm', hero: 'ren', name: 'Scarlet Cataclysm', blurb: 'Charge a real contact, then detonate a heavy ground collapse. A miss leaves you open.', cooldown: 60, lockout: 2.2, icon: 'ult_scarlet_cataclysm' },
  sora: { id: 'azure_event_horizon', hero: 'sora', name: 'Azure Event Horizon', blurb: 'Arrange orbiting energy, then release a targeted convergence beam.', cooldown: 60, lockout: 2.4, icon: 'ult_azure_event_horizon' },
  vex: { id: 'judgment_of_the_exile', hero: 'vex', name: 'Judgment of the Exile', blurb: 'Mark, counter and finish. Strongest when timed; still lands without a parry.', cooldown: 60, lockout: 2.2, icon: 'ult_judgment_of_the_exile' },
};
export const ULTIMATE_RULES = { unlockLevel: 14, needsBranches: 1, chargePerDamage: 0.045, chargePerHit: 0.35, max: 100 } as const;

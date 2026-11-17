import { CONTRACT_RULES, RUN_TOOLS, type BoonId, type ContractId } from '../content/meta';
import type { UpgradeId } from '../content/upgrades';
import type { GameState } from './GameState';
import type { HeroId } from '../content/heroes';
import { REN, SORA, VEX } from '../content/heroKits';
import { CLASSIC_PLAN, type RunPlan } from '../b22/plan';
import type { RelicId } from '../b22/relics';
import { MODIFIER_RULES } from '../b22/challenges';

/** B18: what the player chose before deploying. Captured once at run start and applied deterministically (no RNG), so a seed + config always replays identically. */
export interface RunConfig { boon: BoonId | null; contract: ContractId | null; rerolls: number; banishes: number; /** B19: the runner and whether its transformation is unlocked in the save (Kai's own forms keep their separate flags) */ hero?: HeroId; heroForm?: boolean;
  /** B22: the run plan (omitted = Classic), Vex's transformation unlocks (Riftbound, Voidheart), a starting relic, whether the ultimate may be earned, and the co-op partner (set by the party layer) */ plan?: RunPlan; vexForms?: [boolean, boolean]; startRelic?: RelicId | null }
export const NO_CONFIG: RunConfig = { boon: null, contract: null, rerolls: 0, banishes: 0 };
export const toolCharges = (rerollOwned: boolean, banishOwned: boolean) => ({ rerolls: rerollOwned ? RUN_TOOLS.rerolls : 0, banishes: banishOwned ? RUN_TOOLS.banishes : 0 });

export interface RunState { config: RunConfig; rerollsLeft: number; banishesLeft: number; /** cards struck by the player this run */ banished: UpgradeId[]; /** cards a contract removes from the pool */ excluded: UpgradeId[]; spawnMult: number; hazardMult: number; formsUsed: number[] }
export const makeRunState = (config: RunConfig = NO_CONFIG): RunState => ({ config, rerollsLeft: config.rerolls, banishesLeft: config.banishes, banished: [], excluded: [], spawnMult: 1, hazardMult: 1, formsUsed: [] });

/** Applies the boon and contract to a fresh state. Every effect is a small fixed number from content/meta.ts. */
export function applyRunConfig(state: GameState, config: RunConfig) {
  const p = state.player; state.run = makeRunState(config);
  state.plan = config.plan ?? CLASSIC_PLAN; state.b22.modifiers = [...state.plan.modifiers];
  applyHero(state, config.hero ?? 'kai', !!config.heroForm);
  if (config.vexForms) state.b22.vex.forms = [...config.vexForms];
  if (config.startRelic) state.b22.relics.push(config.startRelic);
  const mods = state.plan.modifiers;
  if (mods.includes('glass_vanguard')) { p.maxHp = Math.round(p.maxHp * MODIFIER_RULES.glass.hp); p.hp = p.maxHp; state.mods.xp *= MODIFIER_RULES.glass.xp; }
  if (mods.includes('no_second_wind') && !state.run.excluded.includes('secondwind')) state.run.excluded.push('secondwind');
  switch (config.boon) {
    case 'bulwark': p.maxHp += 20; p.hp += 20; break;
    case 'swift': p.speed *= 1.08; break;
    case 'magnet': p.pickupRadius *= 1.4; break;
    case 'spark': p.drive = Math.max(p.drive, 25); break;
    case 'scholar': state.mods.xp *= 1.1; break;
    default: break;
  }
  switch (config.contract) {
    case 'overrun': state.run.spawnMult = CONTRACT_RULES.overrunSpawn; break;
    case 'glass': { const hp = Math.round(p.maxHp * CONTRACT_RULES.glassHp); p.maxHp = hp; p.hp = hp; break; }
    case 'pressure': state.run.hazardMult = CONTRACT_RULES.pressureHazard; break;
    case 'nosw': state.run.excluded = ['secondwind']; break;
    default: break;
  }
}

/** Base body of the chosen runner. Kai keeps the engine defaults untouched. */
export function applyHero(state: GameState, hero: HeroId, formUnlocked: boolean) {
  const p = state.player; state.hero = hero; state.heroFormUnlocked = hero !== 'kai' && formUnlocked;
  if (hero === 'kai') return;
  const b = hero === 'ren' ? REN.base : hero === 'vex' ? VEX.base : SORA.base;
  p.maxHp = b.hp; p.hp = b.hp; p.speed = b.speed; p.attackDamage = b.attackDamage; p.attackPeriod = b.attackPeriod; p.attackRange = b.attackRange; p.targets = b.targets; p.qDamage = b.qDamage; p.qRadius = b.qRadius; p.radius = b.radius;
}

import type { RunPhase } from '../sim/GameState';
import type { Rarity, UpgradeCategory, UpgradeId } from '../content/upgrades';
import type { ArenaId } from '../content/arenas';
import type { RunReward } from '../sim/MetaSystem';
import type { BoonId, ContractId } from '../content/meta';
export interface UiSnapshot {
  phase: RunPhase; seed: number; hp: number; maxHp: number; xp: number; nextXp: number; level: number;
  seconds: number; kills: number; enemies: number; dashCooldown: number; qCooldown: number; beamCooldown: number; sphereCooldown: number;
  drive: number; form: 0 | 1 | 2 | 3; formCooldown: number; dragonCooldown: number; cometCooldown: number;
  /** B13 Stillfire Apex: unlocked in the save, startable now (gate + full Drive), Silver Rift / Instinct Reversal / Perfect Evasion cooldowns, Rift charge 0..1 while E is held, the F selector (open + the form it would start + the choices) */
  apexUnlocked: boolean; apexReady: boolean; riftCooldown: number; reversalCooldown: number; evadeCooldown: number; riftCharge: number; selector: { open: boolean; pick: 0 | 1 | 2 | 3; choices: (1 | 2 | 3)[]; left: number };
  /** Form II: unlocked for this account, a full Drive gauge + F would start it right now, and the reveal is playing. */
  cometUnlocked: boolean; cometReady: boolean; cinema: boolean; offers: UpgradeId[]; score: number;
  /** True once Kai's Death animation has finished and held (render-driven); the Results overlay waits for it. */
  deathShown: boolean;
  /** Active boss for the HUD bar, or null. `intro` is seconds left of the arrival warning; `flash` ticks up when it is hurt (for the bar's damage feedback). */
  boss: BossHud | null;
  arenaName: string;
  /** Rich level-up cards (same order as `offers`). */
  cards: OfferCard[];
  /** The build so far: one entry per owned card with its stack count. */
  owned: OwnedUpgrade[];
  map: MiniMap;
  /** Cooldown lengths after upgrades (the HUD sweep needs the real maximum). */
  cdMax: { dash: number; beam: number; sphere: number; form: number; dragon: number; comet: number; rift: number; reversal: number; evade: number };
  /** Seconds since Second Wind fired (drives a short HUD flash), or a large number. */
  sinceRevive: number; revives: number;
  run: RunHud;
  /** True once the finale beat has played and the Victory results may show (render-driven, like deathShown). */
  victoryShown: boolean;
  /** The level-up screen is a boss reward pick, not a level. */
  rewardPick: boolean;
  bosses: number;
  /** B18: this run's contract / boon, remaining level-up tools, the finished run's mark breakdown (null until the run ends) and the persistent balance */
  contract: ContractId | null; boon: BoonId | null; rerolls: number; banishes: number; reward: RunReward | null; marks: number; crest: string | null;
}
/** Run progress for the HUD: the clock, the plan's two boss times, and the next event to hint at. */
export interface RunHud { t: number; wardenAt: number; finaleAt: number; wardenDone: boolean; finaleOut: boolean; nextLabel: string; nextIn: number; announce: { text: string; sub: string; age: number } | null }
export interface OfferCard { id: UpgradeId; name: string; blurb: string; category: UpgradeCategory; rarity: Rarity; stack: number; max: number; label: string; before: string; after: string }
export interface OwnedUpgrade { id: UpgradeId; stacks: number }
/** Minimap feed. `foes` is a flat [x, y, kind, ...] list: kind 0 grunt, 1 caster, 2 elite, 3 boss. Hazards carry warning progress (0..1) or `live` once they have fired. */
export interface MapHazard { shape: 'circle' | 'rect' | 'cone' | 'sigil'; x: number; y: number; r: number; w: number; h: number; warn: number; live: boolean }
export interface MiniMap { arena: ArenaId; px: number; py: number; ax: number; ay: number; foes: number[]; hazards: MapHazard[]; near: number; nearest: number; eliteNear: boolean; bossNear: boolean }
export const blankMap: MiniMap = { arena: 'gloam', px: 1100, py: 800, ax: 0, ay: 1, foes: [], hazards: [], near: 0, nearest: 9999, eliteNear: false, bossNear: false };
export interface BossHud { id: 'warden' | 'seraph'; name: string; hp: number; maxHp: number; phase: 1 | 2; phases: 2; mode: string; intro: number; invuln: boolean; exposed: boolean }
export const blankSnapshot: UiSnapshot = { phase: 'running', seed: 0, hp: 100, maxHp: 100, xp: 0, nextXp: 7,
  level: 1, seconds: 0, kills: 0, enemies: 0, dashCooldown: 0, qCooldown: 0, beamCooldown: 0, sphereCooldown: 0, drive: 0,
  form: 0, formCooldown: 0, dragonCooldown: 0, cometCooldown: 0, apexUnlocked: false, apexReady: false, riftCooldown: 0, reversalCooldown: 0, evadeCooldown: 0, riftCharge: 0, selector: { open: false, pick: 0, choices: [], left: 4 }, cometUnlocked: false, cometReady: false, cinema: false, offers: [], score: 0, deathShown: false, boss: null, arenaName: 'THE GLOAM CIRCUIT', cards: [], owned: [], map: blankMap, cdMax: { dash: 3.2, beam: 7, sphere: 16, form: 6, dragon: 9, comet: 22, rift: 8, reversal: 14, evade: 9 }, sinceRevive: 999, revives: 0, victoryShown: false, rewardPick: false, bosses: 0,
  contract: null, boon: null, rerolls: 0, banishes: 0, reward: null, marks: 0, crest: null, run: { t: 0, wardenAt: 480, finaleAt: 900, wardenDone: false, finaleOut: false, nextLabel: 'FRACTURE WARDEN', nextIn: 480, announce: null } };

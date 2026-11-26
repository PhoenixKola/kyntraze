import type { RunPhase } from '../sim/GameState';
import type { Rarity, UpgradeCategory, UpgradeId } from '../content/upgrades';
import type { ArenaId } from '../content/arenas';
import type { RunReward } from '../sim/MetaSystem';
import type { BoonId, ContractId } from '../content/meta';
import type { HeroId } from '../content/heroes';
import type { AbilityTip, TipSlot } from './abilityTips';
import type { AscView } from './ascView';
import type { LfHud } from './lfHud';
export interface UiSnapshot {
  phase: RunPhase; seed: number; hp: number; maxHp: number; xp: number; nextXp: number; level: number;
  seconds: number; kills: number; enemies: number; dashCooldown: number; sigCd: number; odMeter: number; odT: number; sigCharge: number; sigTier: number; flying: boolean; dashLeft: number; dashMax: number; qCooldown: number; beamCooldown: number; sphereCooldown: number;
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
  /** B19: the runner, whether its single transformation is unlocked / startable now, Lance charge 0..1 with its tier (-1 = not charging), and the in-run Ascend cooldown */
  hero: HeroId; heroFormUnlocked: boolean; heroReady: boolean; lanceCharge: number; lanceTier: number; heroAct: string;
  /** Rich level-up cards (same order as `offers`). */
  cards: OfferCard[];
  /** The build so far: one entry per owned card with its stack count. */
  owned: OwnedUpgrade[];
  map: MiniMap;
  /** Cooldown lengths after upgrades (the HUD sweep needs the real maximum). */
  /** B22 Kai kit readouts for the HUD: Surge seconds left, Silver Echo hp / life fractions, Crucible zone live, and whether the sustained Reversal / Rift chain is running */ kit: { surge: number; cloneHp: number; cloneLife: number; crucible: boolean; beat: number; chain: 'none' | 'rift' | 'reversal' };
  cdMax: { q: number; flare: number; crucible: number; dash: number; beam: number; sphere: number; form: number; dragon: number; comet: number; rift: number; reversal: number; evade: number };
  /** Seconds since Second Wind fired (drives a short HUD flash), or a large number. */
  sinceRevive: number; revives: number;
  run: RunHud;
  /** B22.6 the second fighter (null in solo) */ /** B23: highest transformation reached this run (own numbering), for the win-screen victory pose */ bestForm: number; /** B23: equipped B22 crest id (mastery or mode crest), shown on the results screen */ b22Crest: string | null; partner: { name: string; hero: HeroId; hp: number; maxHp: number; form: number; drive: number; down: boolean; out: boolean; revive: number; level: number; xp: number; nextXp: number; /** the partner's own ability bar data: cooldowns, form, kit, tooltips */ bar?: import('./abilityView').AbilityView | null } | null; party: { resonance: number; resonanceT: number; pair: string | null; chooser: number | null } | null;
  /** B22: branch / relic / legendary offers, ultimate gauge, Endless state */ asc: AscView | null;
  /** B22: hover tooltips for the ability tiles (real numbers for this build) */ tips: Record<TipSlot, AbilityTip> | null;
  /** True once the finale beat has played and the Victory results may show (render-driven, like deathShown). */
  victoryShown: boolean;
  /** The level-up screen is a boss reward pick, not a level. */
  rewardPick: boolean;
  bosses: number;
  /** B18: this run's contract / boon, remaining level-up tools, the finished run's mark breakdown (null until the run ends) and the persistent balance */
  contract: ContractId | null; boon: BoonId | null; rerolls: number; banishes: number; reward: RunReward | null; marks: number; crest: string | null;
  /** B31B Living Fractures: events, live boons / curses, announcements and the result summary (null when the rule is off) */ lf: LfHud | null;
}
/** Run progress for the HUD: the clock, the plan's two boss times, and the next event to hint at. */
export interface RunHud { t: number; wardenAt: number; finaleAt: number; wardenDone: boolean; finaleOut: boolean; nextLabel: string; nextIn: number; announce: { text: string; sub: string; age: number } | null; /** B31A: the live mission objective of a Fracture Chronicles run (replaces the Classic boss countdown) */ objText?: string }
export interface OfferCard { /** which ability or control this card improves, for the key hint */ slot?: 'auto' | 'q' | 'e' | 'r' | 'dash' | 'f'; id: UpgradeId; name: string; blurb: string; /** hero-specific category label (Ren: RUSH / IMPACT, Sora: LANCE / HORIZON) */ catName?: string; category: UpgradeCategory; rarity: Rarity; stack: number; max: number; label: string; before: string; after: string }
export interface OwnedUpgrade { id: UpgradeId; stacks: number }
/** Minimap feed. `foes` is a flat [x, y, kind, ...] list: kind 0 grunt, 1 caster, 2 elite, 3 boss. Hazards carry warning progress (0..1) or `live` once they have fired. */
export interface MapHazard { shape: 'circle' | 'rect' | 'cone' | 'sigil' | 'lane'; x: number; y: number; r: number; w: number; h: number; warn: number; live: boolean }
export interface MiniMap { /** B31B: event markers (k = kind, st = 0 idle / 1 active / 2 reward, h = vague hint of a hidden cache) */ lf?: { x: number; y: number; k: number; st: number; p: number; h: number }[]; /** the second fighter (co-op), drawn as a second marker */ ally?: { x: number; y: number; ax: number; ay: number; down: boolean }; arena: ArenaId; px: number; py: number; ax: number; ay: number; foes: number[]; hazards: MapHazard[]; near: number; nearest: number; eliteNear: boolean; bossNear: boolean }
export const blankMap: MiniMap = { arena: 'gloam', px: 1100, py: 800, ax: 0, ay: 1, foes: [], hazards: [], near: 0, nearest: 9999, eliteNear: false, bossNear: false };
export interface BossPartHud { role: string; hp: number; maxHp: number; id: number }
export interface BossHud { id: string; name: string; hp: number; maxHp: number; phase: number; phases: number; mode: string; intro: number; invuln: boolean; exposed: boolean; /** B22: authoritative parts (anchors, arms, constructs) with their own health */ parts: BossPartHud[]; /** B22: the core is shielded by its parts */ shielded: boolean }
export const blankSnapshot: UiSnapshot = { kit: { surge: 0, cloneHp: 0, cloneLife: 0, crucible: false, beat: 0, chain: 'none' }, phase: 'running', seed: 0, hp: 100, maxHp: 100, xp: 0, nextXp: 7,
  level: 1, seconds: 0, kills: 0, enemies: 0, dashCooldown: 0, sigCd: 0, odMeter: 0, odT: 0, sigCharge: 0, sigTier: -1, flying: false, dashLeft: 1, dashMax: 1, qCooldown: 0, beamCooldown: 0, sphereCooldown: 0, drive: 0,
  form: 0, formCooldown: 0, dragonCooldown: 0, cometCooldown: 0, apexUnlocked: false, apexReady: false, riftCooldown: 0, reversalCooldown: 0, evadeCooldown: 0, riftCharge: 0, selector: { open: false, pick: 0, choices: [], left: 4 }, cometUnlocked: false, cometReady: false, hero: 'kai', heroFormUnlocked: false, heroReady: false, lanceCharge: 0, lanceTier: -1, heroAct: '', cinema: false, offers: [], score: 0, deathShown: false, boss: null, arenaName: 'THE GLOAM CIRCUIT', cards: [], owned: [], map: blankMap, cdMax: { q: 8.5, flare: 9, crucible: 18, dash: 3.2, beam: 7, sphere: 16, form: 6, dragon: 9, comet: 22, rift: 8, reversal: 14, evade: 9 }, sinceRevive: 999, revives: 0, victoryShown: false, rewardPick: false, bosses: 0,
  bestForm: 0, b22Crest: null, tips: null, asc: null, partner: null, party: null, contract: null, boon: null, rerolls: 0, banishes: 0, reward: null, marks: 0, crest: null, lf: null, run: { t: 0, wardenAt: 480, finaleAt: 900, wardenDone: false, finaleOut: false, nextLabel: 'FRACTURE WARDEN', nextIn: 480, announce: null } };

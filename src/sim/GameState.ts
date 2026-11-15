import type { UpgradeId, Mods } from '../content/upgrades';
import { baseMods } from '../content/upgrades';
import type { EnemyKind } from '../content/enemies';
import type { ArenaId } from '../content/arenas';
export type RunPhase = 'running' | 'paused' | 'upgrade' | 'dead' | 'victory';
/** A one-shot run milestone message (finale warning); the HUD shows it for a few seconds. */
export interface Announce { id: string; text: string; sub: string; at: number }
export interface Vec { x: number; y: number }
export interface InputState extends Vec { dash: boolean; q: boolean; f: boolean; beam?: boolean; sphere?: boolean; /** B13: E / F held (Silver Rift charge, form selector); aimX/aimY = a unit world direction from the pointer or the right stick, present only while that aim source is active */ beamHeld?: boolean; fHeld?: boolean; aimX?: number; aimY?: number; aimSrc?: 'pointer' | 'stick'; /** world distance from Kai to the pointer (pointer aim only) */ aimDist?: number; /** form selector (sim is frozen while it is open): 1-based card index, step -1/+1, confirm, cancel */ selPick?: number; selMove?: number; selConfirm?: boolean; selCancel?: boolean; }
export interface Fighter extends Vec {
  hp: number; maxHp: number; radius: number; speed: number; attackDamage: number; attackPeriod: number;
  attackRange: number; attackClock: number; targets: number; pickupRadius: number;
  dashRemaining: number; dashCooldown: number; dashDx: number; dashDy: number; invulnerable: number;
  qCooldown: number; beamCooldown: number; sphereCooldown: number; aimX: number; aimY: number; qDamage: number; qRadius: number; drive: number; form: FormId; formCooldown: number; dragonCooldown: number; cometCooldown: number; riftCooldown: number; reversalCooldown: number; evadeCooldown: number; /** glide velocity (Form III) */ vx: number; vy: number;
  xp: number; nextXp: number; level: number;
}
export type EnemyMode = 'move' | 'windup' | 'strike' | 'recover' | 'intro' | 'phase' | 'blink';
/** Boss-only state: the attack currently running, which phase, a step counter inside multi-part attacks, and flags the damage rules read. */
export interface BossAi { phase: 1 | 2; pat: number; atk: string; step: number; t: number; acc: number; exposed: boolean; invuln: boolean; side: 1 | -1; destX: number; destY: number; gap: number; push: number }
export interface Enemy extends Vec { id: number; kind: EnemyKind; hp: number; maxHp: number; radius: number; speed: number; damage: number; touchCooldown: number;
  /** attack state machine: the attack timeline is simulated, the renderer only reads it */
  mode: EnemyMode; modeT: number; attackCd: number; aimX: number; aimY: number; stagger: number; spawnedAt: number; ai?: BossAi; blockT?: number; }
export interface EnemyShot extends Vec { id: number; vx: number; vy: number; ttl: number; damage: number; radius: number; kind?: 'bolt' | 'orb' | 'prism'; }
/** A timed ground area: warns for `delay` seconds, then resolves once against Kai's feet. circle/cone hurt; sigil is a marker only. Centre is a ground point. */
export interface Hazard extends Vec { id: number; shape: 'circle' | 'cone' | 'sigil' | 'rect'; r: number; w?: number; h?: number; active?: number; activeLeft?: number; ang: number; arc: number; delay: number; total: number; damage: number; owner: number; tag: string; fired: boolean; ttl: number; lane?: number }
export type EnemyEventKind = 'enemy_telegraph' | 'enemy_strike' | 'enemy_shot' | 'enemy_shot_hit' | 'enemy_death' | 'enemy_slam' | 'enemy_phase' | 'enemy_intro' | 'enemy_block' | 'enemy_hurt' | 'hazard_fire' | 'hazard_warn' | 'boss_defeated';
export interface EnemyEvent extends Vec { id: number; kind: EnemyEventKind; enemy: EnemyKind; enemyId: number; dirX: number; dirY: number; tag?: string }
/** tier picks the crystal art: 0 shard, 1 gem, 2 large gem (elites), 3 boss core. */
export interface Pickup extends Vec { id: number; xp: number; age: number; tier?: 0 | 1 | 2 | 3; }
export interface Impact extends Vec { id: number; kind: 'shot' | 'pulse' | 'hit' | 'hurt' | 'block' | 'revive' | 'xp' | 'dash' | 'form'; ttl: number; life: number; targetX?: number; targetY?: number; /** B15 presentation semantics: 'hit' = an enemy took damage, 'block' = a shield absorbed it, 'hurt' = Kai lost HP. `boss`/`heavy` pick the weight class; `elite` marks shield-bearers. */ boss?: boolean; heavy?: boolean; kill?: boolean; }
export type AbilityKind = 'beam' | 'sphere' | 'dragon' | 'comet' | 'rift' | 'reversal';
export type FormId = 0 | 1 | 2 | 3;
/** B12 Form II reveal: the sim is frozen while this exists. `from` = the form Kai had when it started. */
export interface Cinema { t: number; dur: number; breakAt: number; commitAt: number; first: boolean; from: FormId; /** the form this reveal ends in (2 Cometheart, 3 Stillfire Apex) */ to: 2 | 3; broke: boolean; committed: boolean }
/** Kai is locked into a signature ability. form and aim are snapshotted at the cast so a mid-cast form expiry cannot change damage. */
export type Face = 'south' | 'north' | 'east' | 'west';
export interface Cast { id: number; kind: AbilityKind; face: Face; t: number; dirX: number; dirY: number; form: FormId; released: boolean; pulses: number; len: number; tx: number; ty: number; /** Dragonfang: where the lunge started and the enemy ids already bitten */ sx: number; sy: number; hits: number[]; /** total seconds of this cast (Cometbreaker's length depends on the Nova echo build) */ dur: number;
  /** B13 Silver Rift: charge seconds, tier 0-2 and the blink taken at release; Instinct Reversal: target ids, hop index, finishing-flash points */ charge?: number; tier?: number; rt?: number; blink?: { x0: number; y0: number; x1: number; y1: number } | null; seq?: number[]; hop?: number; fin?: { x: number; y: number }[] }
export interface SphereShot { id: number; x0: number; y0: number; x1: number; y1: number; t: number; form: FormId }
/** Afterglow / Twin Bloom: a queued second burst of Nova Bloom. */
export interface SphereEcho { id: number; x: number; y: number; radius: number; damage: number; form: FormId; t: number }
export interface Blast { id: number; x: number; y: number; radius: number; form: FormId; ttl: number; life: number }
export type AbilityEventKind = 'beam_charge' | 'beam_fire' | 'beam_pulse' | 'beam_end' | 'sphere_gather' | 'sphere_launch' | 'sphere_burst' | 'cast_cancel' | 'dragon_windup' | 'dragon_launch' | 'dragon_hit' | 'dragon_end' | 'comet_gather' | 'comet_fire' | 'comet_pulse' | 'comet_end' | 'form2_start' | 'form2_break' | 'form2_commit' | 'form2_end' | 'finisher' | 'form3_start' | 'form3_omen' | 'form3_commit' | 'form3_break' | 'form3_end' | 'rift_charge' | 'rift_blink' | 'rift_fire' | 'rift_pulse' | 'rift_end' | 'reversal_start' | 'reversal_hit' | 'reversal_flash' | 'reversal_end' | 'evasion' | 'finisher3' | 'form3_dash';
export interface AbilityEvent extends Vec { id: number; kind: AbilityEventKind; /** beam_pulse: enemies damaged by this pulse */ n?: number }
export interface GameState {
  seed: number; time: number; phase: RunPhase; kills: number; player: Fighter; enemies: Enemy[];
  pickups: Pickup[]; impacts: Impact[]; mods: Mods; echoes: SphereEcho[]; levelUpAt: number[]; reviveAt: number; lastBossDefeatAt: number; announce: Announce | null; bossReward: number; rewardAt: number; rewardPick: boolean; victoryAt: number; upgradeOffers: UpgradeId[]; upgradeStacks: Record<string, number>;
  nextId: number; spawnTimer: number; nextFlanker: number;
  /** E held this tick (Silver Rift charge) */ eHeld: boolean; cast: Cast | null; sphere: SphereShot | null; blasts: Blast[]; abilityEvents: AbilityEvent[]; enemyShots: EnemyShot[]; enemyEvents: EnemyEvent[];
  arenaId: ArenaId; arenaHazard: { nextAt: number; count: number; quietUntil: number };
  cinema: Cinema | null; /** B13: Form III unlocked in the save (a Seraph victory in an EARLIER run) */ apexUnlocked: boolean; apexUnlockedNow: boolean; apexSeen: number; /** run time from which Form III may start (QA lowers it) */ apexGate: number; /** form selector: `pick` 0 = auto (highest ready), `open` while F is held */ selector: { open: boolean; pick: 0 | 1 | 2 | 3; held: number; step: number }; /** Silver Rift aim memory (world unit vector) and when a pointer / stick last drove it */ aim: { x: number; y: number; at: number; src: 'none' | 'pointer' | 'stick'; d?: number }; cometUnlocked: boolean; /** set the tick the unlock happens so the app can persist it once */ cometUnlockedNow: boolean; cometSeen: number; hazards: Hazard[]; encounter: { spawned: Record<string, boolean>; forced: boolean }; bossesDefeated: number; lastHit: { src: string; t: number } | null; }
/** XP to clear `level`: a gentle opening (level 2 inside ~25 s) that steepens through the mid game so builds have time to matter. Pacing target: ~L5 at 2 min, ~L10 at 5, ~L16 at 9, ~L22 by 15. */
export function xpThreshold(level: number) { return Math.round(4 + level * 3.2 + level * level * 1.05); }
export function makeState(seed: number, arenaId: ArenaId = 'gloam', cometUnlocked = false, apexUnlocked = false): GameState {
  return { cinema: null, apexUnlocked, apexUnlockedNow: false, apexSeen: 0, apexGate: 600, selector: { open: false, pick: 0, held: 0, step: 0 }, aim: { x: 0, y: 1, at: -99, src: 'none' }, cometUnlocked, cometUnlockedNow: false, cometSeen: 0, seed, arenaId, arenaHazard: { nextAt: 0, count: 0, quietUntil: 0 }, time: 0, phase: 'running', kills: 0, enemies: [], pickups: [], impacts: [], mods: baseMods(), echoes: [], levelUpAt: [], reviveAt: -99, lastBossDefeatAt: -1, announce: null, bossReward: 0, rewardAt: 0, rewardPick: false, victoryAt: -1, upgradeOffers: [],
    upgradeStacks: {}, eHeld: false, nextId: 1, spawnTimer: 0.18, nextFlanker: 7, cast: null, sphere: null, blasts: [], abilityEvents: [], enemyShots: [], enemyEvents: [], hazards: [], encounter: { spawned: {}, forced: false }, bossesDefeated: 0, lastHit: null,
    player: { x: 1100, y: 800, radius: 17, hp: 100, maxHp: 100, speed: 250, attackDamage: 17,
      attackPeriod: 0.55, attackRange: 242, attackClock: 0.12, targets: 1, pickupRadius: 72,
      dashRemaining: 0, dashCooldown: 0, dashDx: 0, dashDy: 0, invulnerable: 0,
      qCooldown: 0, beamCooldown: 0, sphereCooldown: 0, aimX: 0, aimY: 1, qDamage: 34, qRadius: 132, drive: 0, form: 0, formCooldown: 0, dragonCooldown: 0, cometCooldown: 0, riftCooldown: 0, reversalCooldown: 0, evadeCooldown: 0, vx: 0, vy: 0,
      xp: 0, level: 1, nextXp: xpThreshold(1), }, };
}

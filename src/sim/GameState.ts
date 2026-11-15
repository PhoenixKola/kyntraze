import type { UpgradeId } from '../content/upgrades';
import type { EnemyKind } from '../content/enemies';
import type { ArenaId } from '../content/arenas';
export type RunPhase = 'running' | 'paused' | 'upgrade' | 'dead';
export interface Vec { x: number; y: number }
export interface InputState extends Vec { dash: boolean; q: boolean; f: boolean; beam?: boolean; sphere?: boolean; }
export interface Fighter extends Vec {
  hp: number; maxHp: number; radius: number; speed: number; attackDamage: number; attackPeriod: number;
  attackRange: number; attackClock: number; targets: number; pickupRadius: number;
  dashRemaining: number; dashCooldown: number; dashDx: number; dashDy: number; invulnerable: number;
  qCooldown: number; beamCooldown: number; sphereCooldown: number; aimX: number; aimY: number; qDamage: number; qRadius: number; drive: number; form: 0 | 1; formCooldown: number;
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
export interface Pickup extends Vec { id: number; xp: number; age: number; }
export interface Impact extends Vec { id: number; kind: 'shot' | 'pulse' | 'hit' | 'xp' | 'dash' | 'form'; ttl: number; life: number; targetX?: number; targetY?: number; }
export type AbilityKind = 'beam' | 'sphere';
/** Kai is locked into a signature ability. form and aim are snapshotted at the cast so a mid-cast form expiry cannot change damage. */
export type Face = 'south' | 'north' | 'east' | 'west';
export interface Cast { id: number; kind: AbilityKind; face: Face; t: number; dirX: number; dirY: number; form: 0 | 1; released: boolean; pulses: number; len: number; tx: number; ty: number }
export interface SphereShot { id: number; x0: number; y0: number; x1: number; y1: number; t: number; form: 0 | 1 }
export interface Blast { id: number; x: number; y: number; radius: number; form: 0 | 1; ttl: number; life: number }
export type AbilityEventKind = 'beam_charge' | 'beam_fire' | 'beam_pulse' | 'beam_end' | 'sphere_gather' | 'sphere_launch' | 'sphere_burst' | 'cast_cancel';
export interface AbilityEvent extends Vec { id: number; kind: AbilityEventKind; /** beam_pulse: enemies damaged by this pulse */ n?: number }
export interface GameState {
  seed: number; time: number; phase: RunPhase; kills: number; player: Fighter; enemies: Enemy[];
  pickups: Pickup[]; impacts: Impact[]; upgradeOffers: UpgradeId[]; upgradeStacks: Record<string, number>;
  nextId: number; spawnTimer: number; nextFlanker: number;
  cast: Cast | null; sphere: SphereShot | null; blasts: Blast[]; abilityEvents: AbilityEvent[]; enemyShots: EnemyShot[]; enemyEvents: EnemyEvent[];
  arenaId: ArenaId; arenaHazard: { nextAt: number; count: number; quietUntil: number };
  hazards: Hazard[]; encounter: { spawned: Record<string, boolean>; forced: boolean }; bossesDefeated: number; lastHit: { src: string; t: number } | null; }
export function xpThreshold(level: number) { return 4 + level * 3 + Math.floor(level * level * 0.9); }
export function makeState(seed: number, arenaId: ArenaId = 'gloam'): GameState {
  return { seed, arenaId, arenaHazard: { nextAt: 0, count: 0, quietUntil: 0 }, time: 0, phase: 'running', kills: 0, enemies: [], pickups: [], impacts: [], upgradeOffers: [],
    upgradeStacks: {}, nextId: 1, spawnTimer: 0.18, nextFlanker: 7, cast: null, sphere: null, blasts: [], abilityEvents: [], enemyShots: [], enemyEvents: [], hazards: [], encounter: { spawned: {}, forced: false }, bossesDefeated: 0, lastHit: null,
    player: { x: 1100, y: 800, radius: 17, hp: 100, maxHp: 100, speed: 250, attackDamage: 17,
      attackPeriod: 0.55, attackRange: 242, attackClock: 0.12, targets: 1, pickupRadius: 72,
      dashRemaining: 0, dashCooldown: 0, dashDx: 0, dashDy: 0, invulnerable: 0,
      qCooldown: 0, beamCooldown: 0, sphereCooldown: 0, aimX: 0, aimY: 1, qDamage: 34, qRadius: 132, drive: 0, form: 0, formCooldown: 0,
      xp: 0, level: 1, nextXp: xpThreshold(1), }, };
}

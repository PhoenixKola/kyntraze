import type { UpgradeId } from '../content/upgrades';
import type { EnemyKind } from '../content/enemies';
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
export interface Enemy extends Vec { id: number; kind: EnemyKind; hp: number; maxHp: number; radius: number; speed: number; damage: number; touchCooldown: number; }
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
  cast: Cast | null; sphere: SphereShot | null; blasts: Blast[]; abilityEvents: AbilityEvent[]; }
export function xpThreshold(level: number) { return 4 + level * 3 + Math.floor(level * level * 0.9); }
export function makeState(seed: number): GameState {
  return { seed, time: 0, phase: 'running', kills: 0, enemies: [], pickups: [], impacts: [], upgradeOffers: [],
    upgradeStacks: {}, nextId: 1, spawnTimer: 0.18, nextFlanker: 7, cast: null, sphere: null, blasts: [], abilityEvents: [],
    player: { x: 1100, y: 800, radius: 17, hp: 100, maxHp: 100, speed: 250, attackDamage: 17,
      attackPeriod: 0.55, attackRange: 242, attackClock: 0.12, targets: 1, pickupRadius: 72,
      dashRemaining: 0, dashCooldown: 0, dashDx: 0, dashDy: 0, invulnerable: 0,
      qCooldown: 0, beamCooldown: 0, sphereCooldown: 0, aimX: 0, aimY: 1, qDamage: 34, qRadius: 132, drive: 0, form: 0, formCooldown: 0,
      xp: 0, level: 1, nextXp: xpThreshold(1), }, };
}

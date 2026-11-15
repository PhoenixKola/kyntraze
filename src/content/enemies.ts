export type EnemyKind = 'pursuer' | 'flanker' | 'bruiser' | 'ranged';
export type EnemyAttack = 'lunge' | 'dash' | 'slam' | 'shot';
export interface EnemyDef {
  id: EnemyKind; name: string; role: string; hp: number; hpPerMinute: number; moveSpeed: number; damage: number; radius: number; xp: number; accent: string;
  /** Attack timeline in seconds: telegraph (windup) -> release (strike) -> vulnerable recovery. damage is dealt only at/after `strike` begins, never during windup. */
  attack: { kind: EnemyAttack; range: number; minRange: number; windup: number; strike: number; recover: number; cooldown: number; damage: number; speed: number; radius: number };
  /** Time (s) the game's clock must reach before the director may spawn this kind (never two new threats at once), a spawn weight and a live cap. */
  intro: number; weight: number; cap: (time: number) => number;
}
export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  pursuer: { id: 'pursuer', name: 'Shardwalker', role: 'Hunched patrol that lunges once it gets close', hp: 25, hpPerMinute: 5, moveSpeed: 74, damage: 10, radius: 17, xp: 1, accent: '#b66b80',
    attack: { kind: 'lunge', range: 96, minRange: 0, windup: 0.5, strike: 0.22, recover: 0.5, cooldown: 3.2, damage: 14, speed: 330, radius: 0 }, intro: 0, weight: 1, cap: () => 999 },
  flanker: { id: 'flanker', name: 'Rift Stalker', role: 'Fast raider that circles, coils and dash-slashes', hp: 18, hpPerMinute: 5, moveSpeed: 118, damage: 7, radius: 15, xp: 2, accent: '#80a4d4',
    attack: { kind: 'dash', range: 150, minRange: 70, windup: 0.38, strike: 0.3, recover: 0.55, cooldown: 3.6, damage: 11, speed: 470, radius: 0 }, intro: 7, weight: 0.32, cap: () => 999 },
  bruiser: { id: 'bruiser', name: 'Breaker Sentinel', role: 'Slow armoured enforcer with a telegraphed ground slam', hp: 150, hpPerMinute: 16, moveSpeed: 46, damage: 12, radius: 26, xp: 6, accent: '#9a8fb0',
    attack: { kind: 'slam', range: 118, minRange: 0, windup: 0.95, strike: 0.12, recover: 1.0, cooldown: 2.4, damage: 26, speed: 0, radius: 104 }, intro: 150, weight: 0.07, cap: t => Math.min(3, 1 + Math.floor(Math.max(0, t - 150) / 240)) },
  ranged: { id: 'ranged', name: 'Shard Channeler', role: 'Hovering caster that keeps its distance and fires a dodgeable bolt', hp: 20, hpPerMinute: 4, moveSpeed: 66, damage: 6, radius: 16, xp: 3, accent: '#c13bff',
    attack: { kind: 'shot', range: 430, minRange: 150, windup: 0.8, strike: 0.15, recover: 0.5, cooldown: 2.9, damage: 12, speed: 235, radius: 8 }, intro: 70, weight: 0.14, cap: t => Math.min(4, 2 + Math.floor(Math.max(0, t - 70) / 200)) },
};
/** Distance a ranged enemy tries to keep: it backs off inside `near`, closes in beyond `far`, and drifts sideways in between. */
export const RANGED_BAND = { near: 230, far: 340 } as const;
/** The last fraction of a ranged windup during which the aim line is frozen so the shot can be read and sidestepped. */
export const AIM_LOCK_FRACTION = 0.45;
export const ENEMY_KINDS: EnemyKind[] = ['pursuer', 'flanker', 'bruiser', 'ranged'];

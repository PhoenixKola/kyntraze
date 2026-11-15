export type MobKind = 'pursuer' | 'flanker' | 'bruiser' | 'ranged' | 'aegis' | 'cantor';
export type BossKind = 'warden' | 'seraph';
export type EnemyKind = MobKind | BossKind;
export type EnemyAttack = 'lunge' | 'dash' | 'slam' | 'shot';
export interface EnemyDef {
  id: MobKind; name: string; role: string; hp: number; hpPerMinute: number; moveSpeed: number; damage: number; radius: number; xp: number; accent: string;
  /** Attack timeline in seconds: telegraph (windup) -> release (strike) -> vulnerable recovery. damage is dealt only at/after `strike` begins, never during windup. `fan` fires several bolts spread over `spread` radians. */
  attack: { kind: EnemyAttack; range: number; minRange: number; windup: number; strike: number; recover: number; cooldown: number; damage: number; speed: number; radius: number; fan?: { count: number; spread: number } };
  /** Time (s) the game's clock must reach before the director may spawn this kind (never two new threats at once), a spawn weight and a live cap. */
  intro: number; weight: number; cap: (time: number) => number;
  /** Elite markers: `caster` keeps the ranged band and hovers; `shield` blocks single-target damage from the front arc; `aura` buffs nearby non-boss enemies. */
  elite?: boolean; caster?: boolean; shield?: { arc: number; reduction: number; turnDelay: number }; aura?: { radius: number; speed: number; recover: number };
}
export const ENEMIES: Record<MobKind, EnemyDef> = {
  pursuer: { id: 'pursuer', name: 'Shardwalker', role: 'Hunched patrol that lunges once it gets close', hp: 25, hpPerMinute: 5, moveSpeed: 74, damage: 10, radius: 17, xp: 1, accent: '#b66b80',
    attack: { kind: 'lunge', range: 96, minRange: 0, windup: 0.5, strike: 0.22, recover: 0.5, cooldown: 3.2, damage: 14, speed: 330, radius: 0 }, intro: 0, weight: 1, cap: () => 999 },
  flanker: { id: 'flanker', name: 'Rift Stalker', role: 'Fast raider that circles, coils and dash-slashes', hp: 18, hpPerMinute: 5, moveSpeed: 118, damage: 7, radius: 15, xp: 2, accent: '#80a4d4',
    attack: { kind: 'dash', range: 150, minRange: 70, windup: 0.38, strike: 0.3, recover: 0.55, cooldown: 3.6, damage: 11, speed: 470, radius: 0 }, intro: 7, weight: 0.32, cap: () => 999 },
  bruiser: { id: 'bruiser', name: 'Breaker Sentinel', role: 'Slow armoured enforcer with a telegraphed ground slam', hp: 150, hpPerMinute: 16, moveSpeed: 46, damage: 12, radius: 26, xp: 6, accent: '#9a8fb0',
    attack: { kind: 'slam', range: 118, minRange: 0, windup: 0.95, strike: 0.12, recover: 1.0, cooldown: 2.4, damage: 26, speed: 0, radius: 104 }, intro: 150, weight: 0.07, cap: t => Math.min(3, 1 + Math.floor(Math.max(0, t - 150) / 240)) },
  ranged: { id: 'ranged', name: 'Shard Channeler', role: 'Hovering caster that keeps its distance and fires a dodgeable bolt', hp: 20, hpPerMinute: 4, moveSpeed: 66, damage: 6, radius: 16, xp: 3, accent: '#c13bff',
    attack: { kind: 'shot', range: 430, minRange: 150, windup: 0.8, strike: 0.15, recover: 0.5, cooldown: 2.9, damage: 12, speed: 235, radius: 8 }, intro: 70, weight: 0.14, cap: t => Math.min(4, 2 + Math.floor(Math.max(0, t - 70) / 200)), caster: true },
  aegis: { id: 'aegis', name: 'Aegis Shardbearer', role: 'Elite: frontal crystal shield, rams forward and drops it while recovering', hp: 220, hpPerMinute: 18, moveSpeed: 52, damage: 14, radius: 22, xp: 10, accent: '#b8506a', elite: true,
    attack: { kind: 'dash', range: 175, minRange: 60, windup: 0.75, strike: 0.4, recover: 1.0, cooldown: 3.0, damage: 20, speed: 380, radius: 0 }, intro: 330, weight: 0.05, cap: t => (t >= 540 ? 2 : 1),
    shield: { arc: 65, reduction: 0.8, turnDelay: 0.6 } },
  cantor: { id: 'cantor', name: 'Rift Cantor', role: 'Elite caster: rallies nearby enemies and fires a slow orb fan', hp: 90, hpPerMinute: 8, moveSpeed: 70, damage: 6, radius: 18, xp: 8, accent: '#d65bff', elite: true, caster: true,
    attack: { kind: 'shot', range: 430, minRange: 150, windup: 0.9, strike: 0.15, recover: 0.5, cooldown: 3.6, damage: 10, speed: 175, radius: 9, fan: { count: 3, spread: 0.56 } }, intro: 260, weight: 0.05, cap: t => (t >= 420 ? 2 : 1),
    aura: { radius: 190, speed: 1.3, recover: 1.25 } },
};
/** Distance a ranged enemy tries to keep: it backs off inside `near`, closes in beyond `far`, and drifts sideways in between. */
export const RANGED_BAND = { near: 230, far: 340 } as const;
/** The last fraction of a ranged windup during which the aim line is frozen so the shot can be read and sidestepped. */
export const AIM_LOCK_FRACTION = 0.45;
export const ENEMY_KINDS: MobKind[] = ['pursuer', 'flanker', 'bruiser', 'ranged', 'aegis', 'cantor'];
export const isBoss = (k: EnemyKind): k is BossKind => k === 'warden' || k === 'seraph';
/** Ground-plane contract (B07.1): a hostile area is centred on its owner's feet and hurts Kai only when his feet disc overlaps it. */
export const PLAYER_FOOT_DY = 24;
export const FOOT_RADIUS = 6;
export const groundDy = (radius: number) => radius * 0.6;

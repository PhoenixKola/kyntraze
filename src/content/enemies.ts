export type MobKind = 'pursuer' | 'flanker' | 'bruiser' | 'ranged' | 'aegis' | 'cantor' | 'sky_lancer' | 'halo_scribe' | 'citadel_bulwark' | 'rift_mimic' | 'phase_harrier' | 'singularity_husk' | 'halo_sigil';
export type BossKind = 'warden' | 'seraph' | 'castellan' | 'regent' | 'oathkeeper' | 'mirror_tyrant' | 'chronophage' | 'hollow_choir' | 'sovereign';
export type EnemyKind = MobKind | BossKind;
export type EnemyAttack = 'lunge' | 'dash' | 'slam' | 'shot' | 'lance' | 'sigil' | 'barrier' | 'echo' | 'blink' | 'pull' | 'pulse';
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
    attack: { kind: 'slam', range: 118, minRange: 0, windup: 0.95, strike: 0.12, recover: 1.0, cooldown: 2.4, damage: 26, speed: 0, radius: 104 }, intro: 150, weight: 0.07, cap: t => Math.min(4, 1 + Math.floor(Math.max(0, t - 150) / 270)) },
  ranged: { id: 'ranged', name: 'Shard Channeler', role: 'Hovering caster that keeps its distance and fires a dodgeable bolt', hp: 20, hpPerMinute: 4, moveSpeed: 66, damage: 6, radius: 16, xp: 3, accent: '#c13bff',
    attack: { kind: 'shot', range: 430, minRange: 150, windup: 0.8, strike: 0.15, recover: 0.5, cooldown: 2.9, damage: 12, speed: 235, radius: 8 }, intro: 70, weight: 0.14, cap: t => Math.min(4, 2 + Math.floor(Math.max(0, t - 70) / 200)), caster: true },
  aegis: { id: 'aegis', name: 'Aegis Shardbearer', role: 'Elite: frontal crystal shield, rams forward and drops it while recovering', hp: 220, hpPerMinute: 18, moveSpeed: 52, damage: 14, radius: 22, xp: 10, accent: '#b8506a', elite: true,
    attack: { kind: 'dash', range: 175, minRange: 60, windup: 0.75, strike: 0.4, recover: 1.0, cooldown: 3.0, damage: 20, speed: 380, radius: 0 }, intro: 330, weight: 0.05, cap: t => (t >= 780 ? 3 : t >= 540 ? 2 : 1),
    shield: { arc: 65, reduction: 0.8, turnDelay: 0.6 } },
  cantor: { id: 'cantor', name: 'Rift Cantor', role: 'Elite caster: rallies nearby enemies and fires a slow orb fan', hp: 90, hpPerMinute: 8, moveSpeed: 70, damage: 6, radius: 18, xp: 8, accent: '#d65bff', elite: true, caster: true,
    attack: { kind: 'shot', range: 430, minRange: 150, windup: 0.9, strike: 0.15, recover: 0.5, cooldown: 3.6, damage: 10, speed: 175, radius: 9, fan: { count: 3, spread: 0.56 } }, intro: 260, weight: 0.05, cap: t => (t >= 720 ? 3 : t >= 420 ? 2 : 1),
    aura: { radius: 190, speed: 1.3, recover: 1.25 } },
  // ---- B22 Fractured Realms: six new problems. They only spawn in the realm arenas / Expedition (see b22/realms.ts), never in Classic. `intro` is run time in seconds inside a realm run.
  sky_lancer: { id: 'sky_lancer', name: 'Sky Lancer', role: 'Locks a vector, then dives down a marked lane with its lance', hp: 46, hpPerMinute: 6, moveSpeed: 84, damage: 8, radius: 16, xp: 3, accent: '#f2d27a',
    attack: { kind: 'lance', range: 430, minRange: 150, windup: 1.0, strike: 0.3, recover: 1.1, cooldown: 4.4, damage: 18, speed: 960, radius: 24 }, intro: 45, weight: 0.16, cap: t => Math.min(4, 1 + Math.floor(t / 240)) },
  halo_scribe: { id: 'halo_scribe', name: 'Halo Scribe', role: 'Inscribes short-lived pulsing sigils you can smash for safety', hp: 38, hpPerMinute: 5, moveSpeed: 62, damage: 5, radius: 16, xp: 4, accent: '#ffe9a8', caster: true,
    attack: { kind: 'sigil', range: 400, minRange: 140, windup: 0.9, strike: 0.2, recover: 0.7, cooldown: 5.2, damage: 12, speed: 0, radius: 92 }, intro: 130, weight: 0.12, cap: t => Math.min(3, 1 + Math.floor(Math.max(0, t - 130) / 260)) },
  citadel_bulwark: { id: 'citadel_bulwark', name: 'Citadel Bulwark', role: 'Heavy that projects a frontal barrier over a few allies, then shoves', hp: 210, hpPerMinute: 18, moveSpeed: 44, damage: 12, radius: 26, xp: 9, accent: '#e6c98a', elite: true, shield: { arc: 70, reduction: 0.7, turnDelay: 0.7 },
    attack: { kind: 'barrier', range: 120, minRange: 0, windup: 1.1, strike: 0.35, recover: 1.2, cooldown: 3.4, damage: 22, speed: 260, radius: 0 }, intro: 220, weight: 0.06, cap: t => (t >= 600 ? 2 : 1) },
  rift_mimic: { id: 'rift_mimic', name: 'Rift Mimic', role: 'Watches an attack, then replays a simplified echo of it after a countdown', hp: 52, hpPerMinute: 6, moveSpeed: 78, damage: 7, radius: 16, xp: 4, accent: '#9fe6e0',
    attack: { kind: 'echo', range: 520, minRange: 0, windup: 0.5, strike: 0.2, recover: 0.8, cooldown: 4.0, damage: 14, speed: 0, radius: 70 }, intro: 60, weight: 0.14, cap: t => Math.min(3, 1 + Math.floor(t / 300)) },
  phase_harrier: { id: 'phase_harrier', name: 'Phase Harrier', role: 'Marks where it will land, blinks there once, then strikes and is left open', hp: 34, hpPerMinute: 5, moveSpeed: 96, damage: 7, radius: 15, xp: 3, accent: '#b18cff',
    attack: { kind: 'blink', range: 330, minRange: 100, windup: 0.8, strike: 0.25, recover: 1.3, cooldown: 4.8, damage: 16, speed: 0, radius: 0 }, intro: 150, weight: 0.12, cap: t => Math.min(4, 1 + Math.floor(Math.max(0, t - 150) / 220)) },
  singularity_husk: { id: 'singularity_husk', name: 'Singularity Husk', role: 'Opens a bounded gravity well; breaks when it dies or is staggered', hp: 90, hpPerMinute: 10, moveSpeed: 40, damage: 8, radius: 20, xp: 6, accent: '#6a5cff', caster: true,
    attack: { kind: 'pull', range: 360, minRange: 120, windup: 1.0, strike: 0.2, recover: 1.0, cooldown: 7.0, damage: 6, speed: 0, radius: 150 }, intro: 270, weight: 0.07, cap: t => Math.min(2, 1 + Math.floor(Math.max(0, t - 270) / 360)) },
  halo_sigil: { id: 'halo_sigil', name: 'Halo Sigil', role: 'Summoned object: a pulsing energy sigil with its own health and expiry', hp: 16, hpPerMinute: 0, moveSpeed: 0, damage: 0, radius: 14, xp: 0, accent: '#ffe08a',
    attack: { kind: 'pulse', range: 0, minRange: 0, windup: 0.5, strike: 0.15, recover: 0, cooldown: 1.6, damage: 10, speed: 0, radius: 92 }, intro: 1e9, weight: 0, cap: () => 4 },
};
/** Distance a ranged enemy tries to keep: it backs off inside `near`, closes in beyond `far`, and drifts sideways in between. */
export const RANGED_BAND = { near: 230, far: 340 } as const;
/** The last fraction of a ranged windup during which the aim line is frozen so the shot can be read and sidestepped. */
export const AIM_LOCK_FRACTION = 0.45;
export const ENEMY_KINDS: MobKind[] = ['pursuer', 'flanker', 'bruiser', 'ranged', 'aegis', 'cantor'];
/** B22 kinds that ship no sprite sheet yet and are drawn by the realm renderer. */
export const REALM_KINDS: MobKind[] = ['sky_lancer', 'halo_scribe', 'citadel_bulwark', 'rift_mimic', 'phase_harrier', 'singularity_husk', 'halo_sigil'];
export const isRealmKind = (k: string): boolean => (REALM_KINDS as string[]).includes(k);
export const BOSS_KINDS: readonly BossKind[] = ['warden', 'seraph', 'castellan', 'regent', 'oathkeeper', 'mirror_tyrant', 'chronophage', 'hollow_choir', 'sovereign'];
export const isBoss = (k: EnemyKind): k is BossKind => (BOSS_KINDS as readonly string[]).includes(k);
/** Ground-plane contract (B07.1): a hostile area is centred on its owner's feet and hurts Kai only when his feet disc overlaps it. */
export const PLAYER_FOOT_DY = 24;
export const FOOT_RADIUS = 6;
export const groundDy = (radius: number) => radius * 0.6;

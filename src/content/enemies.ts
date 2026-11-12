export type EnemyKind = 'pursuer' | 'flanker';
export const ENEMIES = {
  pursuer: { id: 'pursuer', hp: 25, moveSpeed: 74, damage: 10, radius: 17, xp: 1, accent: '#b66b80' },
  flanker: { id: 'flanker', hp: 18, moveSpeed: 118, damage: 7, radius: 15, xp: 2, accent: '#80a4d4' },
} as const;

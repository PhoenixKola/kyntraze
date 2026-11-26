/** Kai's reworked kit (B22 combat corrections). Every number the sim reads for the four Qs, Flarebound E / R and the Silver Rift / Instinct Reversal rework lives here. */
export const SURGE = { name: 'Surge Step', cooldown: 11, duration: 5, speedMul: 1.25, autoMul: 1.15 } as const;
export const SCATTER = { name: 'Scatter Burst', cooldown: 10, shots: 10, every: 0.07, speed: 700, range: 440, radius: 9, blast: 46, damageMul: 0.5, wind: 0.08, recover: 0.2, moveScale: 0.55, spreadDeg: 16 } as const;
export const METEOR = { name: 'Meteor Drive', cooldown: 11, beats: 3, beatEvery: 0.2, step: 76, windup: 0.2, reach: 70, finalReach: 104, finalPause: 0.1, damageMul: 0.85, finalMul: 1.5, recover: 0.24, moveScale: 0, iframes: 0.11, knock: 96, finalKnock: 170 } as const;
export const ECHO = { name: 'Silver Echo', cooldown: 20, life: 8, hpFrac: 0.4, dmgFrac: 0.4, atkEvery: 0.6, speed: 215, keep: 150, seek: 420, contactCd: 0.7, decoyRange: 240, spawnDist: 72, maxLife: 10 } as const;
export const RISE = { name: 'Rising Flare', cooldown: 9, windup: 0.2, pillars: 4, gap: 0.13, first: 80, step: 85, radius: 56, damage: 16, push: 150, recover: 0.25, moveScale: 0.35, maxHitsPerEnemy: 2 } as const;
export const CRUCIBLE = { name: 'Sunfall Crucible', cooldown: 18, windup: 0.55, recover: 0.3, range: 340, radius: 138, life: 2.4, pulses: 4, pulseDamage: 16, finalDamage: 78, finalRadiusMul: 1.12, pull: 36, moveScale: 0.35, stagger: 0.5 } as const;
/** Silver Rift chain and Instinct Reversal sustained strikes. */
export const CHAIN = { follow: 5, settle: 0.22, pulses: 3, pulseEvery: 0.05, damageMul: 0.65, minHop: 170, minApart: 120, attempts: 48, beamReach: 520, iframes: 0.18, aimLead: 0.06 } as const;
export const STRIKES = { every: 0.19, damageMul: 1, finishDamage: 14, finishRadius: 54, escapeAfter: 0.25 } as const;

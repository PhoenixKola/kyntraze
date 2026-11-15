/** B12 Form II "Cometheart": every number the sim, the animator and the FX read. Form III (Stillfire Apex, B13) will extend FORM_TIERS, not replace it. */
export const COMET = {
  /** Unlock: defeating the Fracture Warden (~8:00) once. Persisted in the save; a fresh unlock also fills Drive so Form II is playable at once. */
  unlockBoss: 'warden' as const,
  /** Activation: F with a FULL Drive gauge once unlocked (Flarebound keeps its 65 % threshold). */
  charge: 100, drainPerSecond: 5, cooldown: 8,
  /** First activation of a run gets the full cinematic; later ones a short one. The sim is frozen for the whole cinematic (run clock, enemies, projectiles, hazards, cooldowns). */
  cinemaFirst: { dur: 2.6, breakAt: 1.55, commitAt: 1.8 },
  cinemaRepeat: { dur: 1.1, breakAt: 0.5, commitAt: 0.62 },
  /** The breaking-point pulse is real crowd control: non-boss enemies inside the radius are shoved and staggered once. */
  knockRadius: 250, knockPush: 150, stagger: 0.9,
  attackMul: 1.18, speedMul: 1.08,
} as const;
export const FORM_TIERS = ['base', 'flarebound', 'cometheart'] as const;

/** E in Form II. Body-driven forward strike: wind-up, a committed lunge, and a dragon of gold energy that bursts out of the fist and runs through the lane. */
export const DRAGON = {
  name: 'Dragonfang Rush', key: 'E', windup: 0.3, lunge: 0.2, recover: 0.34, lungeDist: 120, reach: 150, halfWidth: 36, damage: 40, knockback: 150, cooldown: 9,
  /** Non-boss, non-elite enemies at or below this fraction of max HP are finished outright (telegraphed by the red-gold fang marks on the lane). */
  executeBelow: 0.22, stagger: 0.7,
  moveScaleWindup: 0.1, moveScaleRecover: 0.5,
  /** The clip is BasicPunch: its `impact` frame lands on the lunge tick. */
  maxAimOffset: 0.52, aimAssistCos: Math.cos(0.5), aimRange: 330,
} as const;
/** R in Form II. Planted gather, a focused gold-white core that opens into a wide beam, finite and fading. */
export const CANNON = {
  name: 'Cometbreaker Cannon', key: 'R', gather: 1.1, fire: 1.5, recover: 0.5, length: 720, halfWidth0: 20, halfWidth1: 84, expand: 0.6, pulseEvery: 0.1, damage: 11, knockback: 3, cooldown: 22,
  moveScaleGather: 0, moveScaleFire: 0.08, moveScaleRecover: 0.5, maxAimOffset: 0.3,
} as const;
/** Carry-forward of the B10 builds (documented in the level-up preview and the Form II tooltip):
 *  Lance cards -> Dragonfang: Hard Light = damage, Wide Lance = width, Lance Cooling = cooldown, Afterburn = +reach per stack (the dragon runs further), Conductor = Drive per Dragonfang hit.
 *  Nova cards -> Cometbreaker: Bloom Bulk = beam width, Nova power = damage, Nova Cooling = cooldown, Afterglow / Twin Bloom = +0.4 / +0.8 s of beam. */
export const CARRY = { afterburnReach: 40, echoSeconds: 0.4 } as const;

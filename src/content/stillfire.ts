/** B13 Form III "Stillfire Apex": every number the sim, the animator and the FX read. Form II breaks the world, Form III bends it: quiet, precise, hovering. */
export const APEX = {
  /** Unlock: the Null Seraph defeated once (a victory). Persisted; usable from the NEXT run, never in the run that earns it. */
  unlockBoss: 'seraph' as const,
  /** Availability inside a run: a late-midgame window (10:00 of the 15:00 run) AND a full Drive gauge. */
  minTime: 600, charge: 100, drainPerSecond: 3.2, cooldown: 10,
  /** First activation of a run is the long quiet reveal; repeats are short. The whole sim is frozen for either (see Simulation.step). */
  cinemaFirst: { dur: 3.6, commitAt: 1.9, breakAt: 2.55 },
  cinemaRepeat: { dur: 1.3, commitAt: 0.55, breakAt: 0.78 },
  knockRadius: 230, knockPush: 110, stagger: 0.8,
  attackMul: 1.12, speedMul: 1.2,
  /** Native sprite px the boots hover above the floor (the sprite art is lifted by this much; the shadow stays on the ground plane). */
  hoverPx: 7,
  /** Glide: velocity eases toward the input (seconds to reach ~63 %). */
  glideEase: 0.09,
  /** Hold F this long (when more than one form is ready) to open the selector, then it steps on every `selectStep` seconds. */
  selectHold: 0.32, selectStep: 0.55,
} as const;

/** E in Form III: hold to charge while moving, aim 360 degrees, release = a short safe blink then a piercing silver beam. */
export const RIFT = {
  name: 'Silver Rift', key: 'E',
  minCharge: 0.16, maxCharge: 1.5, tier1At: 0.5, tier2At: 1.15,
  /** Per tier (0 quick, 1 charged, 2 full): half width, damage per pulse, beam seconds. */
  halfWidth: [13, 20, 30] as readonly number[], damage: [8, 13, 19] as readonly number[], fire: [0.32, 0.46, 0.62] as readonly number[],
  pulseEvery: 0.08, length: 660, recover: 0.28,
  blinkDist: 92, blinkTries: 7,
  /** Cooldown: a short anti-spam lock from the first charge tick, the rest when released; a cancelled charge keeps a partial cooldown (never free). */
  cooldown: 8, startLock: 0.5, cancelCooldown: 3.5,
  moveScaleCharge: 0.6, moveScaleFire: 0.35, moveScaleRecover: 0.7,
  /** Retention: the aim sticks to the last pointer / stick direction for this long after the input goes quiet before falling back to the facing. */
  aimHold: 3,
} as const;

/** R in Form III: a read-and-answer string of near-instant strikes between nearby enemies. */
export const REVERSAL = {
  name: 'Instinct Reversal', key: 'R',
  range: 280, maxTargets: 4, lead: 0.1, hop: 0.12, recover: 0.26, damage: 20, finishDamage: 11, finishRadius: 48, strikeOffset: 40,
  bossHits: 2, stagger: 0.7, hopIFrames: 0.14,
  cooldown: 14, emptyCooldown: 3, moveScale: 0,
} as const;

/** Perfect Evasion: a rare, clean sidestep that refuses one hit. */
export const EVASION = { cooldown: 9, sidestep: 78, iframes: 0.35, tries: 6 } as const;

/** Carry-forward of the B10 builds into Form III (shown in the level-up preview + Form III tooltip):
 *  Lance cards -> Silver Rift: Hard Light = damage, Wide Lance = width, Lance Cooling = cooldown, Afterburn (pulses) = +0.08 s of beam per stack, Conductor = Drive per Rift hit.
 *  Nova cards -> Instinct Reversal: Nova power = damage, Bloom Bulk = reach + finishing-flash radius, Nova Cooling = cooldown, Afterglow / Twin Bloom = +1 / +2 extra targets. */
export const APEX_CARRY = { lingerSeconds: 0.08, echoTargets: 1 } as const;

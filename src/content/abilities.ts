/** B05 signature abilities. All gameplay numbers live here; the Blender clips and the renderer follow these timings, never the other way round. */
export const BEAM = {
  name: 'Fracture Lance', key: 'E',
  charge: 0.5, fire: 0.5, recover: 0.3, pulseEvery: 0.1,
  length: 520, halfWidth: 26, damage: 15, knockback: 8, cooldown: 7,
  /** Form I: wider and harder (documented in the B05 status). */
  formWidth: 1.3, formDamage: 1.25,
  moveScaleCharge: 0.25, moveScaleFire: 0.15, moveScaleRecover: 0.6,
  aimAssistCos: Math.cos(0.42),
  /** The sprite has four views, so the beam may deviate at most this far (rad) from the facing axis; the lane always leaves the visible hands. */
  maxAimOffset: 0.52,
} as const;
export const SPHERE = {
  name: 'Nova Bloom', key: 'R',
  gather: 0.8, recover: 0.4, flight: 0.5,
  maxRange: 420, defaultRange: 300, radius: 190, damage: 60, edgeFalloff: 0.6, knockback: 140, cooldown: 16, clusterRadius: 130,
  formRadius: 1.2, formDamage: 1.2,
  moveScaleGather: 0.4, moveScaleRecover: 0.7,
} as const;
/** Render-side feel; camera shake only (reducedEffects disables shake and flashes entirely). */
export const ABILITY_FEEL = {
  beamShake: { ms: 140, intensity: 0.0018 }, sphereLaunchShake: { ms: 80, intensity: 0.0012 }, sphereBurstShake: { ms: 220, intensity: 0.0042 },
} as const;

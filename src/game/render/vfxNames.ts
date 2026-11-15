/** B07-pre ImageGen VFX sprites (no Phaser import so tests can read it). Each exists as <name>_b.png (cyan) and <name>_s.png (solar) under public/art/fx/kai-abilities/vfx. */
export const VFX_NAMES = ['bolt', 'hit', 'spark', 'dash_lines', 'dash_slash', 'dust', 'debris0', 'debris1', 'debris2', 'debris3', 'boom', 'plume', 'embers', 'scorch',
  'mote0', 'mote1', 'mote2', 'swirl', 'circ_zone', 'circ_rune', 'circ_wave', 'circ_crack'] as const;
export type VfxName = typeof VFX_NAMES[number];

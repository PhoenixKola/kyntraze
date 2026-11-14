/** Form colour looks used by the runtime FX (aura, burst). FINAL look: SOLAR (owner decision); ember/arc are kept as previews only. Mirrors art/characters/kai/form-i/palette.json (hair/eye colours live in the art, aura colours here).
 *  Swap the look by changing FORM_I_LOOK; nothing in the animation data depends on it. Reusable by later forms (different looks and `intensity`). */
export interface FormLook { label: string; aura: number; core: number }
export const FORM_LOOKS: Record<string, FormLook> = {
  ember: { label: 'A EMBER (crimson-orange)', aura: 0xff7846, core: 0xffecc8 },
  solar: { label: 'B SOLAR (amber-gold)', aura: 0xffc846, core: 0xfff8d6 },
  arc: { label: 'C ARC (electric violet)', aura: 0xa06eff, core: 0xece2ff },
};
export const FORM_I_LOOK = 'solar';

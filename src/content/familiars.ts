/** Celestial Familiars: one small beast companion per hero. Pure tuning data; the behaviour lives in sim/Familiar.ts and the drawing in game/render/familiarFx.ts. */
import type { HeroId } from './heroes';
export type FamStyle = 'bite' | 'darts' | 'flares' | 'pulse';
export interface FamiliarDef {
  id: 'dragon' | 'fox' | 'phoenix' | 'guardian'; name: string; title: string; style: FamStyle;
  /** distance (px) it keeps beside the hero, how fast it closes on that spot (1/s) and its top speed (px/s) */
  dist: number; follow: number; speed: number;
  /** seconds between assists, how far from the hero it will pick a foe, damage per hit as a fraction of the hero's auto-attack damage */
  cd: number; range: number; mul: number;
  /** attack timeline (s): windup, then (style specific) beats, then recover */
  windup: number; recover: number;
  /** drawn height above the ground point (px): flyers hover, the fox runs */
  hover: number; accent: number; edge: number;
}
export const FAMILIARS: Record<HeroId, FamiliarDef> = {
  kai: { id: 'dragon', name: 'Solar Wyrmling', title: 'Kai’s Dragon Familiar', style: 'bite', dist: 66, follow: 7, speed: 520, cd: 3.4, range: 330, mul: 0.85, windup: 0.3, recover: 0.32, hover: 34, accent: 0xff9a2e, edge: 0xffe3a0 },
  ren: { id: 'fox', name: 'Ember Kit', title: 'Ren’s Nine-Tailed Familiar', style: 'darts', dist: 58, follow: 8.5, speed: 640, cd: 3.0, range: 310, mul: 0.34, windup: 0.18, recover: 0.26, hover: 0, accent: 0xff7a2a, edge: 0xf2e6d2 },
  sora: { id: 'phoenix', name: 'Dawn Fledgling', title: 'Sora’s Phoenix Familiar', style: 'flares', dist: 72, follow: 6, speed: 480, cd: 3.1, range: 440, mul: 0.5, windup: 0.26, recover: 0.3, hover: 46, accent: 0xf6c8e2, edge: 0xfff4d8 },
  vex: { id: 'guardian', name: 'Abyssal Warden', title: 'Vex’s Guardian Familiar', style: 'pulse', dist: 54, follow: 5, speed: 430, cd: 4.2, range: 230, mul: 0.55, windup: 0.42, recover: 0.4, hover: 30, accent: 0x8a5cff, edge: 0xd9c8ff },
};
/** Overdrive fusion and the return after it (s). */
export const FAM_MERGE = 0.7, FAM_REFORM = 0.9, FAM_SPAWN = 1.1;
/** A cast by the hero hurries the next assist (never below this cooldown, at most once per FAM_ASSIST_GAP seconds) so the beast joins offensive windows without spamming. */
export const FAM_ASSIST_CD = 0.45, FAM_ASSIST_GAP = 1.8;
/** Transformations per hero (form ids 0..n-1) and the colour of the beast and its effects in each: it always matches its hero's current form. */
export const FAM_FORMS: Record<HeroId, number> = { kai: 4, ren: 3, sora: 3, vex: 3 };
const PAL: Record<HeroId, { accent: number; edge: number }[]> = {
  kai: [{ accent: 0x3ab4ff, edge: 0xcdeeff }, { accent: 0xff9a2e, edge: 0xffe3a0 }, { accent: 0xffd12a, edge: 0xfff2a0 }, { accent: 0xc9d6ee, edge: 0xffffff }],
  ren: [{ accent: 0xff6a3a, edge: 0xffd2b0 }, { accent: 0xff3a2a, edge: 0xffc4b8 }, { accent: 0xc8793a, edge: 0xf2e6d2 }],
  sora: [{ accent: 0x35c2ff, edge: 0xd6f3ff }, { accent: 0x5a8cff, edge: 0xdbe6ff }, { accent: 0xf6c8e2, edge: 0xfff4d8 }],
  vex: [{ accent: 0x8a7be8, edge: 0xdcd6ff }, { accent: 0xa06af0, edge: 0xe2ccff }, { accent: 0x8a929e, edge: 0xd5dae2 }],
};
export const famForm = (hero: HeroId, form: number) => Math.max(0, Math.min(FAM_FORMS[hero] - 1, Math.floor(form) || 0));
export const famPalette = (hero: HeroId, form: number) => PAL[hero][famForm(hero, form)];

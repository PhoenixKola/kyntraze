/** Contour palettes, state parameters and the equipped mastery edge details: pure data, no Phaser (so the save bridge and tests can use it). The shader that draws them is contourFilter.ts. */
export interface Palette { c1: number[]; c2: number[]; c3: number[]; flow: number; jag: number; sparks: number }
const rgb = (h: number) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
/** Edge parameters for one moment of play: how strong, how fast it flows, how rough and spark-laden it is. All eased by the renderer (never stepped), so the outline cannot strobe. */
export interface EdgeState { power: number; flowMul: number; jagAdd: number; sparkAdd: number }
export const EDGE_STATES: Record<'idle' | 'moving' | 'dash' | 'charge' | 'release' | 'settle', EdgeState> = {
  idle: { power: 0.82, flowMul: 0.8, jagAdd: 0, sparkAdd: 0 }, moving: { power: 0.95, flowMul: 1.15, jagAdd: 0.05, sparkAdd: 0.05 }, dash: { power: 1.05, flowMul: 1.9, jagAdd: 0.25, sparkAdd: 0.25 },
  charge: { power: 0.95, flowMul: 1.5, jagAdd: 0.1, sparkAdd: 0.3 }, release: { power: 1.12, flowMul: 2.2, jagAdd: 0.35, sparkAdd: 0.45 }, settle: { power: 0.9, flowMul: 1.0, jagAdd: 0.05, sparkAdd: 0.1 },
};
export const CONTOUR: Record<string, Palette> = {
  flare: { c1: rgb(0xc43d05), c2: rgb(0xffa21c), c3: rgb(0xfff1a0), flow: 3.2, jag: 0.2, sparks: 0.8 },
  comet: { c1: rgb(0xd97a00), c2: rgb(0xffd12a), c3: rgb(0xfffbd0), flow: 5.2, jag: 1.0, sparks: 1.0 },
  still: { c1: rgb(0x6f86b8), c2: rgb(0xc9d6ee), c3: rgb(0xffffff), flow: 1.7, jag: 0.0, sparks: 0.4 },
  ren: { c1: rgb(0x9a0a18), c2: rgb(0xff3a2a), c3: rgb(0xffc060), flow: 3.6, jag: 0.5, sparks: 0.8 },
  ash: { c1: rgb(0x1a1210), c2: rgb(0xc8793a), c3: rgb(0xf0e2c8), flow: 2.2, jag: 0.6, sparks: 0.6 },
  sora: { c1: rgb(0x0a3fb0), c2: rgb(0x35c2ff), c3: rgb(0xe6fbff), flow: 2.6, jag: 0.3, sparks: 0.6 },
  vex1: { c1: rgb(0x3b0f8a), c2: rgb(0xa06af0), c3: rgb(0xf0dcff), flow: 3.0, jag: 0.8, sparks: 0.9 },
  vex2: { c1: rgb(0x0c0e12), c2: rgb(0x7d8896), c3: rgb(0xeef3fa), flow: 1.9, jag: 0.2, sparks: 0.3 },
  surge: { c1: rgb(0x0a4fc0), c2: rgb(0x3ab4ff), c3: rgb(0xe6fbff), flow: 4.5, jag: 0.4, sparks: 0.3 },
};

/** Mastery "edge details": cosmetic variants of a form's contour, each keeping the form's colour family (same hue, different flow / roughness / spark behaviour and highlight colour). Keyed by contour key. Never a stat, never a trail. */
export const AURA_DETAIL: Record<string, Palette> = {
  flare: { c1: rgb(0xb83a04), c2: rgb(0xff8a1c), c3: rgb(0xffe27a), flow: 2.4, jag: 0.5, sparks: 1.3 },
  comet: { c1: rgb(0xc86f00), c2: rgb(0xffe04a), c3: rgb(0xffffff), flow: 7.2, jag: 1.3, sparks: 0.6 },
  still: { c1: rgb(0x5f86b8), c2: rgb(0xb8e8ff), c3: rgb(0xffffff), flow: 0.9, jag: 0.0, sparks: 0.0 },
  ren: { c1: rgb(0x8a0a18), c2: rgb(0xff4a2a), c3: rgb(0xffe08a), flow: 5.2, jag: 1.0, sparks: 1.0 },
  sora: { c1: rgb(0x0a4fc0), c2: rgb(0x7fe3ff), c3: rgb(0xffffff), flow: 1.8, jag: 0.0, sparks: 0.2 },
  vex1: { c1: rgb(0x3b0f8a), c2: rgb(0xb98aff), c3: rgb(0xffffff), flow: 3.4, jag: 1.3, sparks: 1.3 },
  vex2: { c1: rgb(0x0c0e12), c2: rgb(0x9aa5b4), c3: rgb(0xffffff), flow: 2.6, jag: 0.9, sparks: 0.6 },
};
/** Contour key -> the mastery form it belongs to (the equipped edge detail is stored per form). */
export const CONTOUR_FORM: Record<string, string> = { flare: 'flarebound', comet: 'cometheart', still: 'stillfire', ren: 'crimson_ascendant', sora: 'azure_sovereign', vex1: 'riftbound', vex2: 'voidheart_exile' };
let equippedDetails: Record<string, string> = {};
/** Set once per run from the save (form key -> reward id); a form with no entry keeps its canonical edge. */
export const setEdgeDetails = (d: Record<string, string | undefined>) => { equippedDetails = {}; for (const [k, v] of Object.entries(d)) if (v && v === `aura_detail_${k}`) equippedDetails[k] = v; };
let finishers = new Set<string>();
/** Earned finisher rewards (ids `finisher_<form>`), set once per run from the save. Cosmetic: a flourish on boss / elite kills, never damage, scoring or a lockout. */
export const setFinisherRewards = (owned: readonly string[]) => { finishers = new Set(owned.filter(id => id.startsWith('finisher_'))); };
export const finisherFor = (contourKey: string): string | null => { const f = CONTOUR_FORM[contourKey]; return f && finishers.has(`finisher_${f}`) ? `finisher_${contourKey}` : null; };
export const edgePalette = (key: string): Palette => { const f = CONTOUR_FORM[key]; return f && equippedDetails[f] && AURA_DETAIL[key] ? AURA_DETAIL[key] : CONTOUR[key]; };

/** Palette key of the transformation a fighter is in (null = untransformed), shared by the stroke, the ground ring and the effects. */
export const formKey = (hero: string, form: number): string | null => hero === 'kai' ? (form === 1 ? 'flare' : form === 2 ? 'comet' : form === 3 ? 'still' : null) : hero === 'vex' ? (form === 1 ? 'vex1' : form === 2 ? 'vex2' : null) : form >= 1 ? (hero === 'ren' ? (form === 2 ? 'ash' : 'ren') : 'sora') : null;
/** Ground ring / halo colour for each palette key (the mid colour of the form's contour). */
export const RING_TINT: Record<string, number> = { flare: 0xff9a2e, comet: 0xffd12a, still: 0xc9d6ee, ren: 0xff3a2a, ash: 0xc8793a, sora: 0x35c2ff, vex1: 0xa06af0, vex2: 0x8a929e, surge: 0x3ab4ff };

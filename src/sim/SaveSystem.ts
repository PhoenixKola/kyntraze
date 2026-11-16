import type { RunTelemetry } from './GameTelemetry';
import { DEFAULT_ARENA, isArenaId, type ArenaId } from '../content/arenas';
import { migrateMeta, type MetaState } from './MetaSystem';
import { isHeroId, type HeroId } from '../content/heroes';
export const SAVE_KEY = 'kyntraze-b00-v1';
/** B18: the dev-only QA route (`?qa=1` on the dev server) reads and writes a SEPARATE store, so test runs can never mint marks, feats or unlocks in the real save. Production builds never use it. */
export const QA_SAVE_KEY = 'kyntraze-b00-v1-qa';
export const isQaRoute = () => { try { return !!import.meta.env.DEV && new URLSearchParams(globalThis.location?.search ?? '').get('qa') === '1'; } catch { return false; } };
export const activeSaveKey = () => (isQaRoute() ? QA_SAVE_KEY : SAVE_KEY);
export interface GameSettings { mute: boolean; reducedEffects: boolean; pauseOnBlur: boolean; /** B16 mix, each 0..1 */ master: number; music: number; sfx: number; ui: number; }
export type VolumeKey = 'master' | 'music' | 'sfx' | 'ui';
export interface SaveV1 { version: 1; settings: GameSettings; best: (RunTelemetry & { score: number; /** B19: who set it (older saves: Kai) */ hero?: HeroId }) | null; /** B19: the selected runner (older saves: Kai) */ hero?: HeroId; /** last selected arena (persisted choice; older saves default to the Gloam Circuit) */ arena?: ArenaId; /** B12: permanent Kai unlocks (Cometheart = the Fracture Warden has been defeated once); older saves default to none */ unlocks?: { cometheart: boolean; stillfire?: boolean; /** B19: Crimson Ascendant / Azure Sovereign, each earned by defeating the Warden with that runner */ ren?: boolean; sora?: boolean }; /** B18 meta-progression (always present after migration) */ meta: MetaState; }
export const DEFAULT_SETTINGS: GameSettings = { mute: false, reducedEffects: false, pauseOnBlur: true, master: 1, music: 0.7, sfx: 1, ui: 0.8 };
const vol = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
export function migrateSave(raw: unknown): SaveV1 {
  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const st = typeof obj.settings === 'object' && obj.settings !== null ? obj.settings as Record<string, unknown> : {};
  const settings: GameSettings = { mute: st.mute === true, reducedEffects: st.reducedEffects === true, pauseOnBlur: st.pauseOnBlur !== false, master: vol(st.master, 1), music: vol(st.music, 0.7), sfx: vol(st.sfx, 1), ui: vol(st.ui, 0.8) };
  let best: SaveV1['best'] = null;
  const b = typeof obj.best === 'object' && obj.best !== null ? obj.best as Record<string, unknown> : {};
  if (Number.isFinite(b.score) && Number.isFinite(b.survivalSeconds) && Number.isFinite(b.kills) && Number.isFinite(b.level) && Number.isFinite(b.seed)) {
    best = { score: Math.max(0, Number(b.score)), survivalSeconds: Math.max(0, Number(b.survivalSeconds)), kills: Math.max(0, Number(b.kills)), level: Math.max(1, Number(b.level)), seed: Number(b.seed) >>> 0, victory: b.victory === true, ...(isHeroId(b.hero) ? { hero: b.hero } : {}) };
  }
  const un = typeof obj.unlocks === 'object' && obj.unlocks !== null ? obj.unlocks as Record<string, unknown> : {};
  const kaiWin = best?.victory === true && (!best.hero || best.hero === 'kai');   // a Ren / Sora victory never unlocks Kai's Form III
  const unlocks = { cometheart: un.cometheart === true, stillfire: un.stillfire === true || kaiWin };
  const meta = migrateMeta(obj.meta, { cometheart: unlocks.cometheart, stillfire: unlocks.stillfire, victory: best?.victory === true, hadRun: best !== null });
  return { version: 1, meta, settings, best, hero: isHeroId(obj.hero) ? obj.hero : 'kai', arena: isArenaId(obj.arena) ? obj.arena : DEFAULT_ARENA, unlocks: { cometheart: un.cometheart === true, stillfire: un.stillfire === true || kaiWin, ...(un.ren === true ? { ren: true } : {}), ...(un.sora === true ? { sora: true } : {}) } };   // B13: a save that already holds a Seraph victory has earned Stillfire Apex; a fresh one has not
}
export function loadSave(): SaveV1 {
  let text: string | null = null;
  try { text = globalThis.localStorage?.getItem(activeSaveKey()) ?? null; return migrateSave(text ? JSON.parse(text) : null); }
  catch { if (text) { try { globalThis.localStorage?.setItem(activeSaveKey() + '.corrupt', text); } catch { /* storage full or blocked */ } } return migrateSave(null); }   // unreadable data is kept aside before defaults can overwrite it
}
export function storeSave(save: SaveV1) { try { globalThis.localStorage?.setItem(activeSaveKey(), JSON.stringify(save)); return true; } catch { return false; } }

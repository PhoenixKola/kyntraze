import type { RunTelemetry } from './GameTelemetry';
import { DEFAULT_ARENA, isArenaId, type ArenaId } from '../content/arenas';
export const SAVE_KEY = 'kyntraze-b00-v1';
export interface GameSettings { mute: boolean; reducedEffects: boolean; pauseOnBlur: boolean; /** B16 mix, each 0..1 */ master: number; music: number; sfx: number; ui: number; }
export type VolumeKey = 'master' | 'music' | 'sfx' | 'ui';
export interface SaveV1 { version: 1; settings: GameSettings; best: (RunTelemetry & { score: number }) | null; /** last selected arena (persisted choice; older saves default to the Gloam Circuit) */ arena?: ArenaId; /** B12: permanent Kai unlocks (Cometheart = the Fracture Warden has been defeated once); older saves default to none */ unlocks?: { cometheart: boolean; stillfire?: boolean }; }
export const DEFAULT_SETTINGS: GameSettings = { mute: false, reducedEffects: false, pauseOnBlur: true, master: 1, music: 0.7, sfx: 1, ui: 0.8 };
const vol = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
export function migrateSave(raw: unknown): SaveV1 {
  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const st = typeof obj.settings === 'object' && obj.settings !== null ? obj.settings as Record<string, unknown> : {};
  const settings: GameSettings = { mute: st.mute === true, reducedEffects: st.reducedEffects === true, pauseOnBlur: st.pauseOnBlur !== false, master: vol(st.master, 1), music: vol(st.music, 0.7), sfx: vol(st.sfx, 1), ui: vol(st.ui, 0.8) };
  let best: SaveV1['best'] = null;
  const b = typeof obj.best === 'object' && obj.best !== null ? obj.best as Record<string, unknown> : {};
  if (Number.isFinite(b.score) && Number.isFinite(b.survivalSeconds) && Number.isFinite(b.kills) && Number.isFinite(b.level) && Number.isFinite(b.seed)) {
    best = { score: Math.max(0, Number(b.score)), survivalSeconds: Math.max(0, Number(b.survivalSeconds)), kills: Math.max(0, Number(b.kills)), level: Math.max(1, Number(b.level)), seed: Number(b.seed) >>> 0, victory: b.victory === true };
  }
  const un = typeof obj.unlocks === 'object' && obj.unlocks !== null ? obj.unlocks as Record<string, unknown> : {};
  return { version: 1, settings, best, arena: isArenaId(obj.arena) ? obj.arena : DEFAULT_ARENA, unlocks: { cometheart: un.cometheart === true, stillfire: un.stillfire === true || best?.victory === true } };   // B13: a save that already holds a Seraph victory has earned Stillfire Apex; a fresh one has not
}
export function loadSave(): SaveV1 {
  try { const text = globalThis.localStorage?.getItem(SAVE_KEY); return migrateSave(text ? JSON.parse(text) : null); }
  catch { return migrateSave(null); }
}
export function storeSave(save: SaveV1) { try { globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } }

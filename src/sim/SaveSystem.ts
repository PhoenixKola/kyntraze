import type { RunTelemetry } from './GameTelemetry';
export const SAVE_KEY = 'kyntraze-b00-v1';
export interface GameSettings { mute: boolean; reducedEffects: boolean; pauseOnBlur: boolean; }
export interface SaveV1 { version: 1; settings: GameSettings; best: (RunTelemetry & { score: number }) | null; }
export const DEFAULT_SETTINGS: GameSettings = { mute: false, reducedEffects: false, pauseOnBlur: true };
export function migrateSave(raw: unknown): SaveV1 {
  const obj = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  const st = typeof obj.settings === 'object' && obj.settings !== null ? obj.settings as Record<string, unknown> : {};
  const settings: GameSettings = { mute: st.mute === true, reducedEffects: st.reducedEffects === true, pauseOnBlur: st.pauseOnBlur !== false };
  let best: SaveV1['best'] = null;
  const b = typeof obj.best === 'object' && obj.best !== null ? obj.best as Record<string, unknown> : {};
  if (Number.isFinite(b.score) && Number.isFinite(b.survivalSeconds) && Number.isFinite(b.kills) && Number.isFinite(b.level) && Number.isFinite(b.seed)) {
    best = { score: Math.max(0, Number(b.score)), survivalSeconds: Math.max(0, Number(b.survivalSeconds)), kills: Math.max(0, Number(b.kills)), level: Math.max(1, Number(b.level)), seed: Number(b.seed) >>> 0, victory: b.victory === true };
  }
  return { version: 1, settings, best };
}
export function loadSave(): SaveV1 {
  try { const text = globalThis.localStorage?.getItem(SAVE_KEY); return migrateSave(text ? JSON.parse(text) : null); }
  catch { return migrateSave(null); }
}
export function storeSave(save: SaveV1) { try { globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } }

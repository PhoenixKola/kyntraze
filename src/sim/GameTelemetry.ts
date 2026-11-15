export interface RunTelemetry { seed: number; survivalSeconds: number; kills: number; level: number; victory: boolean; bosses?: number; }
/** Victory is worth a flat bonus plus a little per boss; a faster win (under 18 minutes) adds a time bonus so a clean run outranks a slow one. */
export function gradeRun(stats: RunTelemetry) {
  const base = stats.survivalSeconds * 4 + stats.kills * 8 + stats.level * 35 + (stats.bosses ?? 0) * 300;
  const win = stats.victory ? 2500 + Math.max(0, 1080 - stats.survivalSeconds) * 2 : 0;
  return { ...stats, score: Math.round(base + win) };
}

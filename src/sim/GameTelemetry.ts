export interface RunTelemetry { seed: number; survivalSeconds: number; kills: number; level: number; victory: boolean; }
export function gradeRun(stats: RunTelemetry) {
  const score = Math.round(stats.survivalSeconds * 4 + stats.kills * 8 + stats.level * 35);
  return { ...stats, score };
}

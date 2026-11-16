/** B21.6: one priority-managed budget for hit-stop. Requests never stack (ArenaScene takes the max), are capped, and a minimum gap keeps ordinary combat from freezing every 0.2 s. */
export const HITSTOP_CAP_MS = 120;
export const HITSTOP_MIN_GAP = 0.45;
export type ImpactWeight = 'common' | 'heavy' | 'finisher';
const MS: Record<ImpactWeight, number> = { common: 0, heavy: 45, finisher: 90 };
const PRIORITY: Record<ImpactWeight, number> = { common: 0, heavy: 1, finisher: 2 };

export class ImpactDirector {
  private pending = 0; private pendingPri = -1; private gap = 0;
  /** clock = render dt seconds, reduced = Reduced Effects / reduced motion (no hit-stop at all). */
  tick(dt: number) { this.gap = Math.max(0, this.gap - dt); }
  request(w: ImpactWeight, reduced: boolean): number {
    if (reduced || w === 'common') return 0;
    if (this.gap > 0 && PRIORITY[w] < 2) return 0;
    const ms = Math.min(HITSTOP_CAP_MS, MS[w]);
    if (PRIORITY[w] >= this.pendingPri) { this.pending = Math.max(this.pending, ms); this.pendingPri = PRIORITY[w]; this.gap = HITSTOP_MIN_GAP; }
    return ms;
  }
  take(): number { const v = this.pending; this.pending = 0; this.pendingPri = -1; return v; }
}

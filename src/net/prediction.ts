/** B23 bounded movement-only prediction for the online client. The server stays authoritative for collision, damage, abilities, progress and results; the client only replays its own UNACKNOWLEDGED movement inputs on top of the latest authoritative position, so the local fighter responds at once. Never predicted: teleports, hits, XP, kills, casts' effects. Disabled while the fighter is casting, dashing, in a reveal or down (the server position is used as is). Corrections are blended; a large discrepancy is a hard snap. */
export interface PendingMove { seq: number; dx: number; dy: number; dt: number }
export const PRED = { maxReplay: 0.3, blend: 0.4, snapDist: 140, deadzone: 0.5 } as const;
export class MovePredictor {
  private pending: PendingMove[] = [];
  /** Remember one sent input (direction is normalised here, like the sim does). */
  record(seq: number, ix: number, iy: number, dt: number) { const l = Math.hypot(ix, iy), k = l > 1 ? 1 / l : 1; this.pending.push({ seq, dx: ix * k, dy: iy * k, dt }); if (this.pending.length > 40) this.pending.shift(); }
  /** Drops everything the server already applied. */
  ack(seq: number) { this.pending = this.pending.filter(m => m.seq > seq); }
  /** The authoritative position advanced by the still-unacknowledged inputs (capped to PRED.maxReplay seconds). */
  replay(x: number, y: number, speed: number): { x: number; y: number } {
    let t = 0; for (let i = this.pending.length - 1; i >= 0; i--) { t += this.pending[i].dt; if (t > PRED.maxReplay) break; x += this.pending[i].dx * speed * this.pending[i].dt; y += this.pending[i].dy * speed * this.pending[i].dt; }
    return { x, y };
  }
  reset() { this.pending = []; }
  get length() { return this.pending.length; }
}
/** Blends the displayed position toward the predicted target; a discrepancy over PRED.snapDist (teleport, death, wall) snaps. */
export function reconcile(shownX: number, shownY: number, tx: number, ty: number): { x: number; y: number; snapped: boolean } {
  const ex = tx - shownX, ey = ty - shownY, d = Math.hypot(ex, ey);
  if (d > PRED.snapDist) return { x: tx, y: ty, snapped: true };
  if (d < PRED.deadzone) return { x: tx, y: ty, snapped: false };
  return { x: shownX + ex * PRED.blend, y: shownY + ey * PRED.blend, snapped: false };
}

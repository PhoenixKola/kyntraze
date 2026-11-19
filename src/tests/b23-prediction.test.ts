import { describe, expect, it } from 'vitest';
import { MovePredictor, PRED, reconcile } from '../net/prediction';

describe('B23 bounded online movement prediction', () => {
  it('replays only unacknowledged inputs on top of the authoritative position', () => {
    const p = new MovePredictor(); for (let i = 1; i <= 6; i++) p.record(i, 1, 0, 1 / 60);
    p.ack(3); expect(p.length).toBe(3); const r = p.replay(100, 50, 240); expect(r.x).toBeCloseTo(100 + 3 * 4, 5); expect(r.y).toBe(50);
  });
  it('normalises diagonals like the sim and caps the replay window', () => {
    const p = new MovePredictor(); for (let i = 1; i <= 60; i++) p.record(i, 1, 1, 1 / 60);
    const r = p.replay(0, 0, 240); const dist = Math.hypot(r.x, r.y); expect(dist).toBeLessThanOrEqual(240 * PRED.maxReplay + 1e-6); expect(dist).toBeGreaterThan(240 * PRED.maxReplay * 0.9);
  });
  it('blends small corrections, snaps large ones (teleport / death / wall) and ignores sub-pixel noise', () => {
    expect(reconcile(0, 0, 0.2, 0.1).snapped).toBe(false); expect(reconcile(0, 0, 0.2, 0.1).x).toBe(0.2);
    const b = reconcile(0, 0, 40, 0); expect(b.x).toBeCloseTo(40 * PRED.blend); expect(b.snapped).toBe(false);
    const s = reconcile(0, 0, PRED.snapDist + 10, 0); expect(s.snapped).toBe(true); expect(s.x).toBe(PRED.snapDist + 10);
  });
  it('a reset (cast, dash, reveal, down) drops every pending move so the server position is used as is', () => {
    const p = new MovePredictor(); p.record(1, 1, 0, 0.016); p.reset(); expect(p.replay(10, 10, 240)).toEqual({ x: 10, y: 10 });
  });
});

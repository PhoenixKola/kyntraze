import { describe, expect, it } from 'vitest';
import { SPLIT, planCoopCamera, splitViewports } from '../game/render/coopCamera';

describe('B23 co-op camera plan', () => {
  it('stays shared while close, splits beyond the on-threshold, and only merges again below the off-threshold (hysteresis)', () => {
    expect(planCoopCamera(false, 300, true, 960).split).toBe(false);
    expect(planCoopCamera(false, SPLIT.on + 1, true, 960).split).toBe(true);
    expect(planCoopCamera(true, SPLIT.on - 100, true, 960).split).toBe(true);   // between the thresholds it keeps its state
    expect(planCoopCamera(true, SPLIT.off - 1, true, 960).split).toBe(false);
    expect(planCoopCamera(false, SPLIT.on - 100, true, 960).split).toBe(false);
  });
  it('can be switched off in settings and never splits a canvas too narrow to read', () => {
    expect(planCoopCamera(false, 3000, false, 960).split).toBe(false); expect(planCoopCamera(true, 3000, true, SPLIT.minWidth - 1).split).toBe(false);
    expect(planCoopCamera(false, 3000, true, 640).zoomFactor).toBeCloseTo(0.55);
  });
  it('the two half viewports tile the canvas with a divider and no overlap', () => {
    for (const w of [960, 1281, 1920]) { const v = splitViewports(w, 540); expect(v.left.x + v.left.w).toBeLessThan(v.right.x); expect(v.right.x + v.right.w).toBe(w); expect(v.left.h).toBe(540); }
  });
});

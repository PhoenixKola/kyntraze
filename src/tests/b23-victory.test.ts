import { describe, expect, it } from 'vitest';
import { bestFormOf, victoryFrames, victoryPoseFor } from '../app/ui/victoryPose';
import { existsSync } from 'node:fs';

describe('B23 victory pose', () => {
  it('uses the look actually reached: a transformed pose only for a reached form, base look otherwise', () => {
    expect(victoryPoseFor('kai', 0)).toMatchObject({ root: 'kai', clip: 'Sphere' }); expect(victoryPoseFor('kai', 2)).toMatchObject({ root: 'kai-f2', clip: 'Transform' }); expect(victoryPoseFor('kai', 3).root).toBe('kai-f3');
    expect(victoryPoseFor('ren', 0).root).toBe('ren'); expect(victoryPoseFor('ren', 1).root).toBe('ren-f1'); expect(victoryPoseFor('sora', 1).root).toBe('sora-f1');
    expect(victoryPoseFor('vex', 0).root).toBe('vex'); expect(victoryPoseFor('vex', 1).root).toBe('vex-f1'); expect(victoryPoseFor('vex', 2).root).toBe('vex-f2');
  });
  it('best form comes from the run ledger in each hero\'s own numbering', () => {
    expect(bestFormOf('kai', [])).toBe(0); expect(bestFormOf('kai', [1, 3])).toBe(3); expect(bestFormOf('ren', [10])).toBe(1); expect(bestFormOf('ren', [11])).toBe(0); expect(bestFormOf('sora', [11])).toBe(1);
    expect(bestFormOf('vex', [12])).toBe(1); expect(bestFormOf('vex', [12, 13])).toBe(2); expect(bestFormOf('vex', [])).toBe(0);
  });
  it('loops held frames: after the commit for Transform, the raised hold for Sphere; always inside the clip', () => {
    expect(victoryFrames('Transform', 16, { reveal_hold: 8, interruptible_from: 10 })).toEqual({ from: 8, to: 12 }); expect(victoryFrames('Sphere', 24, { hold: 12, release: 16 })).toEqual({ from: 12, to: 16 });
    const v = victoryFrames('Transform', 10, { reveal_hold: 9, interruptible_from: 12 }); expect(v.to).toBeLessThanOrEqual(9); expect(v.from).toBeLessThanOrEqual(v.to);
  });
  it('every pose resolves to a shipped manifest', () => {
    for (const [h, f] of [['kai', 0], ['kai', 1], ['kai', 2], ['kai', 3], ['ren', 0], ['ren', 1], ['sora', 0], ['sora', 1], ['vex', 0], ['vex', 1], ['vex', 2]] as const) { const p = victoryPoseFor(h, f); expect(existsSync(new URL(`../../public/art/${p.root}/south/manifest.json`, import.meta.url)), `${h}/${f}`).toBe(true); }
  });
});

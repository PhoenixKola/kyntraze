import { describe, expect, it } from 'vitest';
import { attackPose } from '../game/render/bodyReaction';

describe('B23 enemy bodies act through their attacks', () => {
  it('crouch grows through the tell, stretches forward on the strike, then slumps and recovers to neutral', () => {
    const w0 = attackPose('bruiser', 'windup', 0, 0), w1 = attackPose('bruiser', 'windup', 1, 0); expect(w0.sy).toBeCloseTo(1); expect(w1.sy).toBeLessThan(0.95);
    const st = attackPose('flanker', 'strike', 0, 0); expect(st.sx).toBeGreaterThan(1.1); expect(st.fwd).toBeGreaterThan(8);
    expect(attackPose('bruiser', 'recover', 0, 1).sy).toBeLessThan(0.93); expect(attackPose('bruiser', 'recover', 0, 0).sy).toBe(1);
    expect(attackPose('pursuer', 'move', 0.5, 0)).toEqual({ sx: 1, sy: 1, fwd: 0 });
  });
  it('archetypes differ: flankers dart further than bruisers, bruisers slump harder', () => {
    expect(attackPose('flanker', 'strike', 0, 0).fwd).toBeGreaterThan(attackPose('bruiser', 'strike', 0, 0).fwd);
    expect(attackPose('bruiser', 'recover', 0, 1).sy).toBeLessThan(attackPose('flanker', 'recover', 0, 1).sy);
  });
});

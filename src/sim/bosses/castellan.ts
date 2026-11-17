/** The Crownless Castellan (Aetherfall): crystalline sweeps with a rear escape wedge, falling sky pillars with a staggered safe lane, a heavy slam that opens a posture-break window, and phase-two detached armour fragments that shift attack angles. Armour (0.55) only drops while the core is exposed. */
import { slideMove } from '../CollisionSystem';
import { Behavior, circle, cone, ex, pillarLine, ring, shot, sigil } from './kit';

const SWEEP = { windup: 1.1, strike: 0.25, recover: 1.2, r: 205, arc: (250 * Math.PI) / 180, damage: 28 };
export const castellan: Behavior = {
  phases: 2,
  pattern: ph => (ph === 0 ? ['crystal_sweep', 'pillar_fall', 'heavy_slam', 'pillar_fall'] : ['fragment_throw', 'crystal_sweep', 'pillar_fall', 'heavy_slam', 'core_burst']),
  locomote: c => { if (c.dist > 110) slideMove(c.e, c.v.x * c.e.speed, c.v.y * c.e.speed, c.dt); },
  moves: {
    crystal_sweep: {
      windup: SWEEP.windup, strike: SWEEP.strike, recover: SWEEP.recover,
      tele: c => {
        const off = (ex(c.e).frag ?? 0) > 0 ? 0.5 * c.ai.side : 0;   // a detached fragment bends the sweep angle for one attack
        ex(c.e).frag = 0;
        const w = c.def.windupScale[Math.min(1, c.ph)];
        cone(c.s, c.g.x, c.g.y, SWEEP.r, c.base + off, SWEEP.arc, SWEEP.windup * w, SWEEP.damage, c.e.id, 'sweep');
        if (c.ph === 1) cone(c.s, c.g.x, c.g.y, SWEEP.r, c.base + off + Math.PI, (160 * Math.PI) / 180, SWEEP.windup * w + SWEEP.strike + 0.55, SWEEP.damage - 4, c.e.id, 'sweep');
      },
    },
    pillar_fall: {
      windup: 0.9, strike: 0.2, recover: 0.8,
      tele: c => { const p = c.s.player, n = c.ph === 0 ? 5 : 7; pillarLine(c.s, c.e, p.x, p.y + 24, n, 112, 58, 1.0, 0.16, 24, c.ai.pat % n, 'pillar'); },
    },
    heavy_slam: {
      windup: 1.3, strike: 0.2, recover: 2.3, exposed: true,
      tele: c => { circle(c.s, c.g.x, c.g.y, 138, 1.3 * c.def.windupScale[Math.min(1, c.ph)], 34, c.e.id, 'slam'); },
    },
    fragment_throw: {
      windup: 0.9, strike: 0.2, recover: 0.9,
      tele: c => { sigil(c.s, c.e.x + Math.cos(c.base) * 200, c.e.y + Math.sin(c.base) * 200 + 20, 30, 0.9, c.e.id); },
      fire: c => { for (const o of [-0.35, 0, 0.35]) shot(c.s, c.e.x, c.e.y, c.base + o, 175, 12, 14, 3.4, 'shard', c.e.id); ex(c.e).frag = 1; c.ai.side = c.ai.side === 1 ? -1 : 1; },
    },
    core_burst: {
      windup: 1.0, strike: 0.2, recover: 1.9, exposed: true,
      tele: c => { sigil(c.s, c.e.x, c.e.y + 20, 70, 1.0, c.e.id, 'core'); },
      fire: c => { ring(c.s, c.e.x, c.e.y, 14, 150, 9, 14, 3.4, [c.base + 0.9, c.base - 0.9, c.base + Math.PI], 0.4, 0, 'shard', c.e.id); },
    },
  },
};

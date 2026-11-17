/** The Chronophage: localised time wells that REALLY slow (or capped-speed-up) its own projectiles inside a visible zone (authoritative: the shot moves at speed x k), delayed attack echoes, and a time-core overload that leaves the body open. The run clock, input polling and server step are never touched. */
import { slideMove } from '../CollisionSystem';
import { Behavior, circle, cone, hazard, recordEcho, replayEchoes, ring, sigil, lane } from './kit';

export const WELL = { slow: 0.45, fast: 1.5, radius: 130, life: 7, preview: 0.8 };
const well = (c: Parameters<NonNullable<Behavior['onTick']>>[0], x: number, y: number, fast: boolean) => hazard(c.s, { shape: 'circle', x, y, r: WELL.radius, delay: WELL.preview, damage: 0, owner: c.e.id, tag: fast ? 'well_fast' : 'well_slow', active: WELL.life, slow: fast ? WELL.fast : WELL.slow });
export const chronophage: Behavior = {
  phases: 2,
  pattern: ph => (ph === 0 ? ['place_wells', 'time_ring', 'echo_slash', 'overload'] : ['place_wells', 'echo_slash', 'time_ring', 'echo_slash', 'overload']),
  locomote: c => {
    c.ai.t += c.dt; if (c.ai.t > 3) { c.ai.t = 0; c.ai.side = c.ai.side === 1 ? -1 : 1; }
    let mx = -c.v.y * c.ai.side, my = c.v.x * c.ai.side, k = 0.55; if (c.dist < 220) { mx = -c.v.x; my = -c.v.y; k = 0.9; } else if (c.dist > 360) { mx = c.v.x; my = c.v.y; k = 1; }
    slideMove(c.e, mx * c.e.speed * k, my * c.e.speed * k, c.dt);
  },
  onTick: c => replayEchoes(c, 0.9, 16, 'echo'),
  moves: {
    place_wells: {
      windup: 0.8, strike: 0.2, recover: 0.8,
      tele: c => {
        const p = c.s.player, mid = { x: (c.e.x + p.x) / 2, y: (c.e.y + p.y) / 2 + 20 }, side = c.ai.side, px = -c.v.y * side, py = c.v.x * side;
        well(c, mid.x, mid.y, false);
        well(c, mid.x + px * 220, mid.y + py * 220, true);
        if (c.ph >= 1) well(c, mid.x - px * 220, mid.y - py * 220, false);
      },
    },
    time_ring: { windup: 0.9, strike: 0.2, recover: 0.9, tele: c => { sigil(c.s, c.e.x, c.e.y + 24, 64, 0.9, c.e.id, 'time_ring'); }, fire: c => { ring(c.s, c.e.x, c.e.y, 14, 190, 8, 12, 4.4, [c.base, c.base + 2.1, c.base - 2.1], 0.35, 0, 'time', c.e.id); } },
    echo_slash: {
      windup: 0.8, strike: 0.25, recover: 0.9,
      tele: c => {
        cone(c.s, c.g.x, c.g.y, 250, c.base, (80 * Math.PI) / 180, 0.8, 22, c.e.id, 'slash');
        recordEcho(c.e, { at: c.s.time + 0.8 + (c.ph === 0 ? 1.8 : 1.3), x: c.g.x, y: c.g.y, ang: c.base + Math.PI, kind: 'cone' });
        if (c.ph >= 1) { lane(c.s, c.g.x, c.g.y, c.base + 0.6, 460, 48, 1.3, 18, c.e.id, 'slash', 0.25); recordEcho(c.e, { at: c.s.time + 1.3 + 1.3, x: c.g.x, y: c.g.y, ang: c.base + 0.6 + Math.PI, kind: 'lane' }); }
      },
    },
    overload: {
      windup: 2.4, strike: 0.3, recover: 3.4, exposed: true,
      tele: c => { circle(c.s, c.g.x, c.g.y, 230, 2.4, 24, c.e.id, 'overload'); },
    },
  },
};

/** The Paradox Regent: readable mirrored echoes of its own earlier attacks, delayed cones and lines, split illusions where only the real body counts, and a vulnerability after each fold collapses. Echo and decoy counts are bounded. */
import { blocked, slideMove } from '../CollisionSystem';
import { addEnemy, pushEnemyEvent } from '../EntityRegistry';
import { RULES } from '../../core/Rules';
import { Behavior, circle, cone, ev, ex, lane, recordEcho, shot } from './kit';

const ECHO_DELAY = [2.4, 1.6];
const PREVIEW = 0.9;
export const regent: Behavior = {
  phases: 2,
  pattern: ph => (ph === 0 ? ['mirror_cone', 'delayed_line', 'split', 'fold_collapse'] : ['echo_barrage', 'mirror_cone', 'split', 'delayed_line', 'fold_collapse']),
  locomote: c => {
    c.ai.t += c.dt; if (c.ai.t > 3) { c.ai.t = 0; c.ai.side = c.ai.side === 1 ? -1 : 1; }
    let mx = -c.v.y * c.ai.side, my = c.v.x * c.ai.side, k = 0.55; if (c.dist < 210) { mx = -c.v.x; my = -c.v.y; k = 0.9; } else if (c.dist > 340) { mx = c.v.x; my = c.v.y; k = 1; }
    slideMove(c.e, mx * c.e.speed * k, my * c.e.speed * k, c.dt);
  },
  moves: {
    mirror_cone: {
      windup: 0.9, strike: 0.2, recover: 0.9,
      tele: c => {
        cone(c.s, c.g.x, c.g.y, 290, c.base, (70 * Math.PI) / 180, 0.9 * c.def.windupScale[Math.min(1, c.ph)], 22, c.e.id, 'mirror_cone');
        recordEcho(c.e, { at: c.s.time + 0.9 + ECHO_DELAY[Math.min(1, c.ph)], x: c.g.x, y: c.g.y, ang: c.base + Math.PI, kind: 'cone' });
      },
    },
    delayed_line: {
      windup: 0.8, strike: 0.25, recover: 1.0,
      tele: c => { lane(c.s, c.g.x, c.g.y, c.base, 540, 56, 1.4, 22, c.e.id, 'delayed_line', 0.25); recordEcho(c.e, { at: c.s.time + 1.4 + ECHO_DELAY[Math.min(1, c.ph)], x: c.g.x, y: c.g.y, ang: c.base + Math.PI, kind: 'lane' }); },
    },
    split: {
      windup: 1.0, strike: 0.3, recover: 1.7, exposed: true,
      tele: c => {
        const p = c.s.player; ex(c.e).split = 1; ex(c.e).decoys = 0;
        for (const sgn of [-1, 1]) {
          const a = c.base + sgn * 2.1, x = p.x + Math.cos(a) * 250, y = p.y + Math.sin(a) * 250;
          if (blocked(x, y, 24) || x < 100 || y < 100 || x > RULES.worldWidth - 100 || y > RULES.worldHeight - 100) continue;
          const d = addEnemy(c.s, { kind: 'regent', x, y, hp: 40, maxHp: 40, radius: 24, speed: 0, damage: 0, touchCooldown: 0, attackCd: 99, aimX: 1, aimY: 0, mode: 'move', stepId: c.e.stepId, ex: { decoy: 1, owner: c.e.id }, part: { of: c.e.id, role: 'decoy' } });
          pushEnemyEvent(c.s, 'enemy_intro', d, 0, 0, 'regent_decoy'); ex(c.e).decoys++;
        }
      },
      fire: c => { for (let i = 0; i < 5; i++) shot(c.s, c.e.x, c.e.y, c.base + (i - 2) * 0.3, 190, 8, 11, 3, 'shard', c.e.id); },
    },
    fold_collapse: {
      windup: 1.2, strike: 0.3, recover: 2.4, exposed: true,
      tele: c => { const p = c.s.player; circle(c.s, c.g.x, c.g.y, 120, 1.2, 24, c.e.id, 'fold'); circle(c.s, p.x, p.y + 24, 86, 1.4, 20, c.e.id, 'fold'); circle(c.s, c.g.x + Math.cos(c.base + 1.2) * 190, c.g.y + Math.sin(c.base + 1.2) * 190, 76, 1.6, 20, c.e.id, 'fold'); },
    },
    echo_barrage: {
      windup: 0.8, strike: 0.2, recover: 0.8,
      tele: c => {
        for (const [i, o] of [-0.5, 0.5].entries()) { cone(c.s, c.g.x, c.g.y, 260, c.base + o, (50 * Math.PI) / 180, 0.8 + i * 0.7, 20, c.e.id, 'mirror_cone'); recordEcho(c.e, { at: c.s.time + 0.8 + i * 0.7 + ECHO_DELAY[1], x: c.g.x, y: c.g.y, ang: c.base + o + Math.PI, kind: 'cone' }); }
      },
    },
  },
  onTick: c => {
    const e = c.e, q = e.echo, X = ex(e);
    // an echo's own preview starts PREVIEW seconds before it strikes, so it is always warned; each recorded echo plays exactly once
    if (q) for (let i = q.length - 1; i >= 0; i--) {
      const r = q[i]; if (c.s.time < r.at - PREVIEW) continue;
      const delay = Math.max(0.3, r.at - c.s.time);
      if (r.kind === 'cone') cone(c.s, r.x, r.y, 290, r.ang, (70 * Math.PI) / 180, delay, 16, e.id, 'echo', { echo: true }); else lane(c.s, r.x, r.y, r.ang, 540, 56, delay, 16, e.id, 'echo', 0.25, { echo: true });
      q.splice(i, 1);
    }
    // the split ends when both illusions are gone: the fold collapses and the real body is left open
    if (X.split) {
      const live = c.s.enemies.filter(d => d.hp > 0 && d.ex?.decoy && d.ex.owner === e.id).length;
      if (live === 0 && (X.decoys ?? 0) > 0) { X.split = 0; X.decoys = 0; X.open = 2.5; ev(c.s, 'enemy_strike', e, 0, 0, 'fold_open'); }
    }
  },
  onDeath: (s, e) => { for (const d of s.enemies) if (d.ex?.owner === e.id) d.hp = 0; },
};

/** The Mirror Tyrant: a reflective-crystal commander. Only the marked front arc reflects PROJECTILES (melee, beams and arena attacks are not reflected); the arc is built from breakable mirror nodes; the boss visibly turns (a telegraphed `turn` move) before the angle changes. Phase two narrows the arc and adds a fourth node. Breaking every node opens the boss. */
import { slideMove } from '../CollisionSystem';
import { Behavior, angDiff, circle, ev, ex, lane, ring, shot, sigil } from './kit';

const NODES = [{ n: 3, hp: 360, arc: (100 * Math.PI) / 180 }, { n: 4, hp: 300, arc: (70 * Math.PI) / 180 }];
const nodeCount = (X: Record<string, number>) => { let a = 0; for (let i = 0; i < 4; i++) if ((X[`n${i}`] ?? 0) > 0) a++; return a; };
function resetNodes(X: Record<string, number>, ph: number) { const c = NODES[Math.min(1, ph)]; for (let i = 0; i < 4; i++) X[`n${i}`] = i < c.n ? c.hp : 0; X.arc = c.arc; X.nn = c.n; }
export const mirrorTyrant: Behavior = {
  phases: 2,
  pattern: ph => (ph === 0 ? ['turn', 'shard_beam', 'prism_volley', 'mirror_nova', 'turn', 'shard_beam'] : ['turn', 'shard_beam', 'prism_volley', 'shatter_slam', 'mirror_nova', 'turn', 'prism_volley']),
  locomote: c => {
    c.ai.t += c.dt; if (c.ai.t > 3.2) { c.ai.t = 0; c.ai.side = c.ai.side === 1 ? -1 : 1; }
    let mx = -c.v.y * c.ai.side, my = c.v.x * c.ai.side, k = 0.5; if (c.dist < 200) { mx = -c.v.x; my = -c.v.y; k = 0.8; } else if (c.dist > 320) { mx = c.v.x; my = c.v.y; k = 1; }
    slideMove(c.e, mx * c.e.speed * k, my * c.e.speed * k, c.dt);
  },
  onSpawn: (s, e) => { const X = ex(e); resetNodes(X, 0); X.face = Math.atan2(s.player.y - e.y, s.player.x - e.x); X.tface = X.face; X.turning = 0; },
  onPhase: c => { resetNodes(ex(c.e), 1); ex(c.e).open = 0; },
  onTick: (c, dt) => {
    const X = ex(c.e);
    if (X.turning) { const d = angDiff(X.tface, X.face), step = 2.4 * dt; if (Math.abs(d) <= step) { X.face = X.tface; X.turning = 0; } else X.face += Math.sign(d) * step; }
    if (nodeCount(X) === 0 && !(X.open > 0) && c.e.mode === 'move') resetNodes(X, c.ai.phase - 1);   // the mirror regrows once the opening has closed
  },
  moves: {
    turn: {
      windup: 0.9, strike: 0.5, recover: 0.6,
      tele: c => { const X = ex(c.e); X.tface = c.base; sigil(c.s, c.e.x + Math.cos(c.base) * 170, c.e.y + Math.sin(c.base) * 170 + 18, 34, 0.9, c.e.id, 'turn'); },
      fire: c => { ex(c.e).turning = 1; ev(c.s, 'enemy_strike', c.e, Math.cos(ex(c.e).tface), Math.sin(ex(c.e).tface), 'turn'); },
    },
    shard_beam: { windup: 1.1, strike: 0.25, recover: 0.9, tele: c => { const X = ex(c.e); lane(c.s, c.g.x, c.g.y, X.face, 560, 46, 1.1 * c.def.windupScale[Math.min(1, c.ph)], 24, c.e.id, 'mirror_beam', 0.25); } },
    prism_volley: { windup: 0.9, strike: 0.2, recover: 0.9, tele: c => { sigil(c.s, c.e.x + Math.cos(ex(c.e).face) * 150, c.e.y + Math.sin(ex(c.e).face) * 150 + 18, 26, 0.9, c.e.id); }, fire: c => { const f = ex(c.e).face, n = c.ph === 0 ? 5 : 7; for (let i = 0; i < n; i++) shot(c.s, c.e.x, c.e.y, f + (i - (n - 1) / 2) * 0.24, 230, 8, 11, 2.8, 'prism', c.e.id); } },
    mirror_nova: { windup: 1.0, strike: 0.2, recover: 1.0, tele: c => { sigil(c.s, c.e.x, c.e.y + 20, 60, 1.0, c.e.id, 'nova'); }, fire: c => { ring(c.s, c.e.x, c.e.y, 12, 150, 8, 12, 3.4, [c.base, c.base + Math.PI], 0.45, 0, 'prism', c.e.id); } },
    shatter_slam: { windup: 1.2, strike: 0.2, recover: 2.0, exposed: true, tele: c => { circle(c.s, c.g.x, c.g.y, 130, 1.2, 28, c.e.id, 'slam'); } },
  },
  onDamage: (s, e, dmg, opts) => {
    const X = ex(e), p = s.player, a = Math.atan2(p.y - e.y, p.x - e.x), rel = angDiff(a, X.face ?? 0), half = (X.arc ?? NODES[0].arc) / 2;
    if (Math.abs(rel) > half) return dmg;   // behind or beside the mirror: the open side
    // front arc: a projectile is reflected as a slow, visible shard (rate limited); other hits chip the facing mirror node
    if (opts?.proj && s.time - (e.blockT ?? -1) > 0.45) { e.blockT = s.time; shot(s, e.x, e.y, a, 200, 8, 8, 2.4, 'reflect', e.id); ev(s, 'enemy_block', e, Math.cos(X.face), Math.sin(X.face)); return 0; }
    const nn = X.nn ?? 3, idx = Math.min(nn - 1, Math.max(0, Math.floor(((rel + half) / (2 * half)) * nn)));
    let i = idx; for (let k = 0; k < nn && (X[`n${i}`] ?? 0) <= 0; k++) i = (i + 1) % nn;
    if ((X[`n${i}`] ?? 0) <= 0) return dmg;   // every node down: the boss is open
    X[`n${i}`] -= dmg;
    if (X[`n${i}`] <= 0) { X[`n${i}`] = 0; ev(s, 'enemy_block', e, Math.cos(X.face), Math.sin(X.face), 'mirror_break'); if (nodeCount(X) === 0) { X.open = 5; ev(s, 'enemy_strike', e, 0, 0, 'mirror_open'); } }
    return 0;
  },
};

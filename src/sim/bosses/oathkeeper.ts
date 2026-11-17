/** The Oathkeeper: a rival guardian. Slash combos, reflect stances whose fair tell separates a real strike (it shows a lane) from a feint (it only shows a ring), blade waves, and (phase two) a mirror step. An honest dodge through its strike (dash i-frames, or Vex's parry) exposes it. */
import { blocked, slideMove } from '../CollisionSystem';
import { RULES } from '../../core/Rules';
import { Behavior, cone, ev, ex, gOf, lane, shot, sigil } from './kit';

export const oathkeeper: Behavior = {
  phases: 2,
  pattern: ph => (ph === 0 ? ['slash_combo', 'feint_stance', 'blade_wave', 'slash_combo'] : ['slash_combo', 'mirror_step', 'feint_stance', 'blade_wave', 'mirror_step']),
  locomote: c => { if (c.dist > 120) slideMove(c.e, c.v.x * c.e.speed, c.v.y * c.e.speed, c.dt); else if (c.dist < 70) slideMove(c.e, -c.v.x * c.e.speed * 0.6, -c.v.y * c.e.speed * 0.6, c.dt); },
  moves: {
    slash_combo: {
      windup: 0.7, strike: 1.0, recover: 1.1,
      tele: c => { const w = c.def.windupScale[Math.min(1, c.ph)]; cone(c.s, c.g.x, c.g.y, 130, c.base, (100 * Math.PI) / 180, 0.7 * w, 16, c.e.id, 'slash'); cone(c.s, c.g.x, c.g.y, 130, c.base + 0.5, (100 * Math.PI) / 180, 1.15 * w, 16, c.e.id, 'slash'); lane(c.s, c.g.x, c.g.y, c.base - 0.2, 260, 50, 1.6 * w, 20, c.e.id, 'slash', 0.2); },
    },
    feint_stance: {
      windup: 1.0, strike: 0.5, recover: 1.5,
      tele: c => {
        const X = ex(c.e); X.reflect = 1; X.nf = (X.nf ?? 0) + 1; X.real = X.nf % 2 === 0 ? 1 : 0; X.ang = c.base;   // the first stance is a feint (it teaches the tell), the next is real, and so on
        if (X.real) lane(c.s, c.g.x, c.g.y, c.base, 480, 60, 1.0 * c.def.windupScale[Math.min(1, c.ph)], 24, c.e.id, 'lunge', 0.3); else sigil(c.s, c.g.x, c.g.y, 64, 1.0, c.e.id, 'feint');
      },
      fire: c => { const X = ex(c.e); X.reflect = 0; if (!X.real) X.open = 2.0; },
      tick: c => { const X = ex(c.e); if (X.real) slideMove(c.e, Math.cos(X.ang) * 210, Math.sin(X.ang) * 210, c.dt); },
    },
    blade_wave: {
      windup: 0.8, strike: 0.25, recover: 1.0,
      tele: c => { for (const o of [-0.3, 0, 0.3]) lane(c.s, c.g.x, c.g.y, c.base + o, 620, 34, 0.9 * c.def.windupScale[Math.min(1, c.ph)], 18, c.e.id, 'wave', 0.2); },
    },
    mirror_step: {
      windup: 0.6, strike: 0.5, recover: 1.0,
      tele: c => {
        const p = c.s.player, back = Math.atan2(c.e.y - p.y, c.e.x - p.x); let dest: { x: number; y: number } | null = null;
        for (let i = 0; i < 6 && !dest; i++) { const a = back + Math.PI + (i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5), x = p.x + Math.cos(a) * 130, y = p.y + Math.sin(a) * 130; if (!blocked(x, y, 24) && x > 90 && y > 90 && x < RULES.worldWidth - 90 && y < RULES.worldHeight - 90) dest = { x, y }; }
        const X = ex(c.e); X.dx = dest?.x ?? c.e.x; X.dy = dest?.y ?? c.e.y; sigil(c.s, X.dx, X.dy + 14, 36, 0.6, c.e.id);
      },
      fire: c => { const X = ex(c.e); c.e.x = X.dx; c.e.y = X.dy; const p = c.s.player, a = Math.atan2(p.y - c.e.y, p.x - c.e.x), g = gOf(c.e); cone(c.s, g.x, g.y, 140, a, (110 * Math.PI) / 180, 0.45, 18, c.e.id, 'slash'); for (const o of [-0.25, 0.25]) shot(c.s, c.e.x, c.e.y, a + o, 220, 8, 10, 2.6, 'shard', c.e.id); },
    },
  },
  onDamage: (s, e, dmg) => {
    if (ex(e).reflect) {   // reflect stance: the hit is refused and a slow, visible bolt is returned (rate limited)
      if (s.time - (e.blockT ?? -1) > 0.6) { e.blockT = s.time; const p = s.player; shot(s, e.x, e.y, Math.atan2(p.y - e.y, p.x - e.x), 210, 9, 9, 2.4, 'reflect', e.id); ev(s, 'enemy_block', e, e.aimX >= 0 ? 1 : -1, 0); }
      return 0;
    }
    return dmg;
  },
  onEvade: (s, e) => { if (!ex(e).reflect) { ex(e).open = Math.max(ex(e).open ?? 0, 2.5); ev(s, 'enemy_strike', e, 0, 0, 'evade_open'); } },
};

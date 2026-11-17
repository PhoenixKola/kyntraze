/** Sovereign of the Void: the colossal final boss. Parts are REAL authoritative enemies with their own health and damage routing: four outer anchors shield the core (phase 1), then two arms and a head (phase 2), then the exposed core (phase 3). The core cannot be hurt while its shield part lives. Nobody can stand inside any part (push-out), and the once-per-fight Collapse Pulse leaves guaranteed safe wedges. */
import { addEnemy } from '../EntityRegistry';
import type { Enemy, GameState } from '../GameState';
import { Behavior, circle, clearOwn, ev, ex, lane, pushOut, ring, shot, sigil, cone } from './kit';

export const sovParts = (s: GameState, core: Enemy, role?: string) => s.enemies.filter(p => p.part?.of === core.id && p.hp > 0 && (!role || p.part.role === role));
const ANCHOR = [[-270, -150], [270, -150], [-270, 170], [270, 170]] as const;
const spawnPart = (s: GameState, core: Enemy, role: string, dx: number, dy: number, hp: number, radius: number, slot: number) =>
  addEnemy(s, { kind: 'sovereign', x: core.x + dx, y: core.y + dy, hp, maxHp: hp, radius, speed: 0, damage: 0, touchCooldown: 0, attackCd: 99, aimX: 0, aimY: 1, mode: 'move', stepId: core.stepId, part: { of: core.id, role }, ex: { slot, ox: dx, oy: dy } });
export const sovereign: Behavior = {
  phases: 3,
  spawnAt: () => ({ x: 1100, y: 560 }),
  pattern: ph => (ph === 0 ? ['sweep', 'anchor_pulse', 'orb_volley', 'sweep'] : ph === 1 ? ['limb_slam', 'orb_lanes', 'head_beam', 'limb_slam', 'orb_lanes'] : ['rotating_beams', 'ring_gaps', 'orb_lanes', 'collapse_pulse', 'rotating_beams', 'ring_gaps']),
  locomote: () => {},
  onSpawn: (s, e) => { ANCHOR.forEach(([dx, dy], i) => spawnPart(s, e, 'anchor', dx, dy, 650, 36, i)); ex(e).shield = 1; },
  onPhase: c => {
    const { s, e } = c;
    if (c.ph === 1) { spawnPart(s, e, 'arm', -250, 30, 900, 46, 0); spawnPart(s, e, 'arm', 250, 30, 900, 46, 1); spawnPart(s, e, 'head', 0, -170, 800, 40, 0); ex(e).shield = 1; }
    if (c.ph === 2) { ex(e).shield = 0; ex(e).open = 999; for (const a of sovParts(s, e, 'arm')) a.stagger = 2; }
    ev(s, 'enemy_phase', e, 0, 0, `sovereign_p${c.ph + 1}`);
  },
  onTick: c => {
    const { s, e } = c, X = ex(e), t = s.time;
    for (const p of s.enemies) if (p.part?.of === e.id && p.hp > 0) {
      const px = ex(p), bob = Math.sin(t * 0.9 + (px.slot ?? 0) * 1.7) * 9;
      p.x = e.x + (px.ox ?? 0) + bob * 0.6; p.y = e.y + (px.oy ?? 0) + Math.cos(t * 0.8 + (px.slot ?? 0)) * 7; p.aimX = c.v.x; p.aimY = c.v.y;
      pushOut(s, p.x, p.y + p.radius * 0.5, p.radius * 0.8);
    }
    pushOut(s, e.x, e.y + 20, e.radius * 0.85);
    if (c.ai.phase === 1 && sovParts(s, e, 'anchor').length === 0) X.wantPhase = Math.max(X.wantPhase ?? 1, 2);
    if (c.ai.phase === 2 && sovParts(s, e, 'head').length === 0) X.wantPhase = Math.max(X.wantPhase ?? 1, 3);
  },
  moves: {
    sweep: { windup: 1.5, strike: 0.3, recover: 1.5, tele: c => { cone(c.s, c.g.x, c.g.y + 40, 360, c.base, (200 * Math.PI) / 180, 1.5, 28, c.e.id, 'sweep'); } },
    anchor_pulse: {
      windup: 1.0, strike: 0.2, recover: 1.1,
      tele: c => { for (const a of sovParts(c.s, c.e, 'anchor')) lane(c.s, a.x, a.y + 14, Math.atan2(c.s.player.y - a.y, c.s.player.x - a.x), 600, 46, 1.3, 20, c.e.id, 'anchor_beam', 0.25); },
    },
    orb_volley: { windup: 0.9, strike: 0.2, recover: 1.0, tele: c => { sigil(c.s, c.e.x, c.e.y + 30, 60, 0.9, c.e.id); }, fire: c => { for (let i = 0; i < 7; i++) shot(c.s, c.e.x, c.e.y + 20, c.base + (i - 3) * 0.2, 175, 10, 11, 3.6, 'orb', c.e.id); } },
    limb_slam: {
      windup: 1.2, strike: 0.3, recover: 1.4,
      tele: c => { const p = c.s.player; for (const [i] of sovParts(c.s, c.e, 'arm').entries()) circle(c.s, p.x + (i ? 90 : -90), p.y + 24 + (i ? -30 : 30), 118, 1.2 + i * 0.35, 26, c.e.id, 'slam'); },
    },
    orb_lanes: { windup: 1.0, strike: 0.2, recover: 1.1, tele: c => { sigil(c.s, c.e.x, c.e.y + 30, 62, 1.0, c.e.id); }, fire: c => { ring(c.s, c.e.x, c.e.y + 20, 20, 165, 9, 12, 4, [c.base, c.base + 2.1, c.base - 2.1], 0.4, 0, 'prism', c.e.id); } },
    head_beam: {
      windup: 1.0, strike: 2.0, recover: 1.4,
      tele: c => { ex(c.e).bang = c.base; lane(c.s, c.e.x, c.e.y + 30, c.base, 640, 50, 1.0, 22, c.e.id, 'head_beam', 0.3); },
      tick: c => { const X = ex(c.e); X.bacc = (X.bacc ?? 0) + c.dt; if (X.bacc >= 0.5) { X.bacc = 0; X.bang = (X.bang ?? c.base) + 0.34; lane(c.s, c.e.x, c.e.y + 30, X.bang, 640, 50, 0.5, 20, c.e.id, 'head_beam', 0.25); } },
    },
    rotating_beams: {
      windup: 1.1, strike: 1.6, recover: 1.2,
      tele: c => { const X = ex(c.e); X.bang = c.base; for (let k = 0; k < 3; k++) lane(c.s, c.e.x, c.e.y + 30, c.base + k * 2.094, 640, 48, 1.1, 22, c.e.id, 'beam', 0.3); },
      tick: c => { const X = ex(c.e); X.bacc = (X.bacc ?? 0) + c.dt; if (X.bacc >= 0.45) { X.bacc = 0; X.bang = (X.bang ?? c.base) + 0.3; for (let k = 0; k < 3; k++) lane(c.s, c.e.x, c.e.y + 30, X.bang + k * 2.094, 640, 48, 0.5, 20, c.e.id, 'beam', 0.25); } },
    },
    ring_gaps: { windup: 1.0, strike: 0.2, recover: 1.0, tele: c => { sigil(c.s, c.e.x, c.e.y + 30, 70, 1.0, c.e.id); }, fire: c => { ring(c.s, c.e.x, c.e.y + 20, 24, 160, 9, 13, 4.2, [c.base, c.base + 1.57, c.base + 3.14, c.base - 1.57], 0.32, 0, 'prism', c.e.id); } },
    collapse_pulse: {
      windup: 2.6, strike: 0.5, recover: 2.6, exposed: true,
      tele: c => {
        const X = ex(c.e); if (X.collapsed) { for (let k = 0; k < 4; k++) lane(c.s, c.e.x, c.e.y + 30, c.base + k * 1.5708, 620, 50, 1.4, 22, c.e.id, 'beam', 0.3); return; }
        X.collapsed = 1; ev(c.s, 'enemy_phase', c.e, 0, 0, 'sovereign_collapse');
        for (let k = 0; k < 8; k++) lane(c.s, c.e.x, c.e.y + 30, k * 0.7854 + 0.3927, 760, 70, 2.6, 36, c.e.id, 'collapse', 0.5);   // 8 spokes leave 8 safe wedges between them
      },
    },
  },
  onDamage: (s, e, dmg) => {
    const X = ex(e);
    if (X.shield) {   // the core is shielded while its shield parts live: the hit is refused and the player is told why
      if (s.time - (e.blockT ?? -1) > 0.4) { e.blockT = s.time; ev(s, 'enemy_block', e, 0, 0, 'core_shield'); }
      return 0;
    }
    return dmg;
  },
  onPartDeath: (s, core, part) => {
    clearOwn(s, part.id); ev(s, 'enemy_strike', core, 0, 0, `${part.part!.role}_down`);
    if (part.part!.role === 'anchor' && sovParts(s, core, 'anchor').length === 0) { ex(core).shield = 0; ex(core).wantPhase = Math.max(ex(core).wantPhase ?? 1, 2); }
    if (part.part!.role === 'head') { ex(core).shield = 0; ex(core).wantPhase = 3; }
  },
  onDeath: (s, e) => { for (const p of s.enemies) if (p.part?.of === e.id) { p.hp = 0; clearOwn(s, p.id); } },
};

/** The Hollow Choir: three linked spectral constructs (line, cone, ring) around one silent core, attacking on a shared beat. Destroying or staggering a construct changes which attacks occur and exposes the core; phase two re-assigns the surviving constructs' roles and quickens the beat (nothing respawns). The encounter ends only when the core falls. */
import { addEnemy } from '../EntityRegistry';
import type { Enemy, GameState } from '../GameState';
import { Behavior, cone, ev, ex, lane, ring, shot, sigil, clearOwn } from './kit';

const ROLES = ['line', 'cone', 'ring'] as const;
const OFFS = [[0, -230], [200, 120], [-200, 120]] as const;
export const choirParts = (s: GameState, core: Enemy) => s.enemies.filter(p => p.part?.of === core.id && p.hp > 0);
const STAGGER = { frac: 0.2, window: 1.6 };
export const hollowChoir: Behavior = {
  phases: 2,
  spawnAt: () => ({ x: 1100, y: 720 }),
  pattern: () => ['beat'],
  locomote: () => {},
  onSpawn: (s, e) => {
    for (let i = 0; i < 3; i++) addEnemy(s, { kind: 'hollow_choir', x: e.x + OFFS[i][0], y: e.y + OFFS[i][1], hp: 680, maxHp: 680, radius: 26, speed: 0, damage: 0, touchCooldown: 0, attackCd: 99, aimX: 0, aimY: 1, mode: 'move', stepId: e.stepId, part: { of: e.id, role: ROLES[i] }, ex: { slot: i, recent: 0, rt: 0 } });
  },
  onPhase: c => { for (const p of choirParts(c.s, c.e)) { const i = ROLES.indexOf(p.part!.role as (typeof ROLES)[number]); p.part!.role = ROLES[(i + 1) % 3]; } },
  onTick: c => {
    const parts = choirParts(c.s, c.e), X = ex(c.e);
    for (const p of parts) { const px = ex(p); px.rt = Math.max(0, (px.rt ?? 0) - c.dt); if (px.rt === 0) px.recent = 0; const sl = px.slot ?? 0; p.x = c.e.x + OFFS[sl][0] + Math.sin(c.s.time * 0.8 + sl * 2) * 8; p.y = c.e.y + OFFS[sl][1] + Math.cos(c.s.time * 0.7 + sl) * 6; p.aimX = c.v.x; p.aimY = c.v.y; }
    if (parts.length === 0) X.open = 999;   // every voice silenced: the core stays open
  },
  moves: {
    beat: {
      windup: 0.9, strike: 0.2, recover: 0.6,
      tele: c => {
        const parts = choirParts(c.s, c.e); if (!parts.length) { sigil(c.s, c.e.x, c.e.y + 16, 70, 0.9, c.e.id, 'solo'); ex(c.e).who = -1; return; }
        const p = parts[c.ai.pat % parts.length]; ex(c.e).who = p.id; const role = p.part!.role, a = Math.atan2(c.s.player.y - p.y, c.s.player.x - p.x), g = { x: p.x, y: p.y + 16 };
        ex(c.e).ang = a; ex(c.e).role = ROLES.indexOf(role as (typeof ROLES)[number]);
        if (role === 'line') lane(c.s, g.x, g.y, a, 580, 52, 0.9 * c.def.windupScale[Math.min(1, c.ph)], 22, p.id, 'choir_line', 0.25);
        else if (role === 'cone') cone(c.s, g.x, g.y, 310, a, (80 * Math.PI) / 180, 0.9 * c.def.windupScale[Math.min(1, c.ph)], 22, p.id, 'choir_cone');
        else sigil(c.s, p.x, p.y + 16, 60, 0.9, p.id, 'choir_ring');
      },
      fire: c => {
        const X = ex(c.e), who = c.s.enemies.find(p => p.id === X.who); if (X.who === -1 || !who) { ring(c.s, c.e.x, c.e.y, 10, 140, 8, 11, 3, [c.base], 0.5, 0, 'prism', c.e.id); return; }
        if (who.part?.role === 'ring') ring(c.s, who.x, who.y, 14, 150, 8, 12, 3.4, [X.ang, X.ang + Math.PI], 0.42, 0, 'prism', who.id);
        void shot;
      },
    },
  },
  onPartHit: (s, core, part, dmg) => {
    const px = ex(part); px.recent = (px.recent ?? 0) + dmg; px.rt = STAGGER.window;
    if (px.recent >= part.maxHp * STAGGER.frac && s.time - (ex(core).staggerAt ?? -9) > 3) {   // enough focused damage interrupts the harmony
      ex(core).staggerAt = s.time; px.recent = 0; clearOwn(s, part.id); ex(core).open = Math.max(ex(core).open ?? 0, 3); ev(s, 'enemy_strike', core, 0, 0, 'harmony_break');
    }
  },
  onPartDeath: (s, core, part) => { clearOwn(s, part.id); ex(core).open = Math.max(ex(core).open ?? 0, 4.5); ev(s, 'enemy_strike', core, 0, 0, 'harmony_break'); },
  onDeath: (s, e) => { for (const p of s.enemies) if (p.part?.of === e.id) { p.hp = 0; clearOwn(s, p.id); } },
};

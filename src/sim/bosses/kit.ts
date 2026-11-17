/** Shared building blocks for the B22 boss behaviours: telegraphed ground hazards, hostile shots, nearest-target choice and the generic boss context. Hazards and shots are always authoritative GameState entries (never renderer-only). */
import type { BossAi, Enemy, GameState, Hazard } from '../GameState';
import { groundDy } from '../../content/enemies';
import { BOSSES } from '../../content/bosses';
import type { BossKind } from '../../content/enemies';
import { normalize } from '../../core/Math';
import { pushEnemyEvent } from '../EntityRegistry';

export const HAZARD_CAP = 44, SHOT_CAP = 190;
export const newAi = (): BossAi => ({ phase: 1, pat: 0, atk: '', step: 0, t: 0, acc: 0, exposed: false, invuln: false, side: 1, destX: 0, destY: 0, gap: 0, push: 0 });
export const ex = (e: Enemy) => (e.ex ??= {});
export interface Ctx { s: GameState; e: Enemy; ai: BossAi; ph: number; dt: number; dist: number; v: { x: number; y: number }; base: number; g: { x: number; y: number }; def: (typeof BOSSES)[BossKind] }
export interface Move { windup: number; strike: number; recover: number; exposed?: boolean; tele?(c: Ctx): void; fire?(c: Ctx): void; tick?(c: Ctx, dt: number): void }
export interface Behavior {
  phases: 2 | 3; moves: Record<string, Move>; pattern(ph: number): readonly string[];
  locomote(c: Ctx): void;
  spawnAt?(s: GameState): { x: number; y: number };
  onSpawn?(s: GameState, e: Enemy): void; onPhase?(c: Ctx): void; onTick?(c: Ctx, dt: number): void;
  /** returns the damage that actually reaches the boss (may route to parts, reflect, or null for none) */ onDamage?(s: GameState, e: Enemy, dmg: number, opts?: { area?: boolean; proj?: boolean; fx?: boolean }): number;
  onEvade?(s: GameState, e: Enemy): void; onDeath?(s: GameState, e: Enemy): void;
  /** multi-part bosses: a part took damage / was destroyed (the core is `core`) */ onPartHit?(s: GameState, core: Enemy, part: Enemy, dmg: number): void; onPartDeath?(s: GameState, core: Enemy, part: Enemy): void;
}

export function hazard(state: GameState, h: Partial<Hazard> & Pick<Hazard, 'shape' | 'x' | 'y' | 'r' | 'delay' | 'damage' | 'owner' | 'tag'>) {
  if (state.hazards.length >= HAZARD_CAP) return null;
  const full: Hazard = { id: state.nextId++, fired: false, ttl: 0, total: h.delay, ang: 0, arc: 0, ...h };
  state.hazards.push(full); return full;
}
export const circle = (s: GameState, x: number, y: number, r: number, delay: number, damage: number, owner: number, tag: string, extra: Partial<Hazard> = {}) => hazard(s, { shape: 'circle', x, y, r, delay, damage, owner, tag, ...extra });
export const cone = (s: GameState, x: number, y: number, r: number, ang: number, arcRad: number, delay: number, damage: number, owner: number, tag: string, extra: Partial<Hazard> = {}) => hazard(s, { shape: 'cone', x, y, r, ang, arc: arcRad, delay, damage, owner, tag, ...extra });
export const lane = (s: GameState, x: number, y: number, ang: number, len: number, w: number, delay: number, damage: number, owner: number, tag: string, active = 0.25, extra: Partial<Hazard> = {}) => hazard(s, { shape: 'lane', x, y, r: len, w, ang, delay, damage, owner, tag, active, ...extra });
export const sigil = (s: GameState, x: number, y: number, r: number, delay: number, owner: number, tag = 'sigil') => hazard(s, { shape: 'sigil', x, y, r, delay, damage: 0, owner, tag });
export function shot(state: GameState, x: number, y: number, ang: number, speed: number, radius: number, damage: number, ttl: number, kind: 'bolt' | 'orb' | 'prism' | 'shard' | 'time' | 'reflect' | 'lance' = 'prism', owner = 0) {
  if (state.enemyShots.length >= SHOT_CAP) return null;
  const sh = { id: state.nextId++, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, ttl, damage, radius, kind, owner, k: 1 };
  state.enemyShots.push(sh); return sh;
}
/** A ring of `n` shots with up to three gap centres (radians); the same readable shape the Seraph uses. */
export function ring(state: GameState, x: number, y: number, n: number, speed: number, radius: number, damage: number, ttl: number, gaps: number[], gapHalf: number, off = 0, kind: 'prism' | 'shard' | 'time' = 'prism', owner = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + off; let inGap = false;
    for (const gc of gaps) { let d = a - gc; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < gapHalf) inGap = true; }
    if (!inGap) shot(state, x, y, a, speed, radius, damage, ttl, kind, owner);
  }
}
export const gOf = (e: { x: number; y: number; radius: number }) => ({ x: e.x, y: e.y + groundDy(e.radius) });
export const angDiff = (a: number, b: number) => { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); };
export const clearOwn = (state: GameState, id: number) => { state.hazards = state.hazards.filter(h => h.owner !== id); state.enemyShots = state.enemyShots.filter(s => s.owner !== id); };
export const dirTo = (ax: number, ay: number, bx: number, by: number) => normalize(bx - ax, by - ay);
export const ev = (s: GameState, kind: Parameters<typeof pushEnemyEvent>[1], e: Enemy, dx = 0, dy = 0, tag?: string) => pushEnemyEvent(s, kind, e, dx, dy, tag);
/** Place `n` ground circles in a line across the target (perpendicular to the boss->target axis) leaving one gap index free: a readable staggered safe lane. */
export function pillarLine(s: GameState, e: Enemy, tx: number, ty: number, n: number, spacing: number, r: number, delay: number, step: number, damage: number, gapIdx: number, tag: string) {
  const d = dirTo(e.x, e.y, tx, ty), px = -d.y, py = d.x;
  for (let i = 0; i < n; i++) { if (i === gapIdx) continue; const o = (i - (n - 1) / 2) * spacing; circle(s, tx + px * o, ty + py * o, r, delay + i * step, damage, e.id, tag); }
}
/** Echo queue: remember an attack so it can be replayed once, later, as a clearly tagged hazard. Bounded to 3 entries. */
export function recordEcho(e: Enemy, rec: { at: number; x: number; y: number; ang: number; kind: string }) { const q = (e.echo ??= []); if (q.length >= 3) q.shift(); q.push(rec); }

/** Replays recorded echoes once, each starting `preview` seconds before it strikes so it is always warned. */
export function replayEchoes(c: Ctx, preview: number, damage: number, tag = 'echo') {
  const q = c.e.echo; if (!q) return;
  for (let i = q.length - 1; i >= 0; i--) {
    const r = q[i]; if (c.s.time < r.at - preview) continue;
    const delay = Math.max(0.3, r.at - c.s.time);
    if (r.kind === 'cone') cone(c.s, r.x, r.y, 270, r.ang, (70 * Math.PI) / 180, delay, damage, c.e.id, tag, { echo: true }); else lane(c.s, r.x, r.y, r.ang, 540, 56, delay, damage, c.e.id, tag, 0.25, { echo: true });
    q.splice(i, 1);
  }
}
/** Pushes the fighter out of a body so nobody can stand inside a boss and become untargetable. */
export function pushOut(s: GameState, bx: number, by: number, br: number) {
  const p = s.player, dx = p.x - bx, dy = p.y - by, d = Math.hypot(dx, dy), min = br + p.radius;
  if (d < min) { const u = d > 0.001 ? 1 / d : 0; p.x = bx + (d > 0.001 ? dx * u : 1) * min; p.y = by + (d > 0.001 ? dy * u : 0) * min; }
}

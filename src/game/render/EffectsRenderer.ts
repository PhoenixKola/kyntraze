import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { KAI_GROUND_DY } from '../../assets/kaiAnimation';
import { FxPool, vfxKey } from './fxPool';

/** Basic-attack bolt, hit bursts, dash and Q (Impact) visuals: ImageGen sprites (cyan Base / solar Form I colour ramps), all pooled. Driven by the sim's `impacts` list; each impact is consumed once. */
const MAX_HIT_BURSTS_PER_FRAME = 8;
const DASH_TRAIL_STEP = 0.028;

export class EffectsRenderer {
  private readonly pool: FxPool;
  private lastId = 0;
  private trailClock = 0;
  constructor(private readonly scene: Phaser.Scene) { this.pool = new FxPool(scene, 150); }

  render(state: GameState, reduced = false) {
    const p = state.player, solar = p.form >= 1 && p.form !== 3;   // B13: Stillfire Apex keeps the cool cyan/silver effect set
    const k = (n: string) => vfxKey(n, solar);
    const running = state.phase === 'running' || state.phase === 'dead' || state.phase === 'victory';
    const dt = running ? Math.min(0.05, this.scene.game.loop.delta / 1000) : 0;   // frozen with the sim while paused / choosing an upgrade
    const rnd = Math.random; let bursts = 0;
    for (const e of state.impacts) {
      if (e.id <= this.lastId) continue; this.lastId = e.id;
      if (e.kind === 'shot') {
        const tx = e.targetX ?? e.x, ty = e.targetY ?? e.y; const dx = tx - e.x, dy = ty - e.y; const dist = Math.max(24, Math.hypot(dx, dy)); const ang = Math.atan2(dy, dx);
        const flight = 0.09, sc = solar ? 1.0 : 0.82;
        // bolt: bright head at the sprite's right edge (origin 1,0.5), comet tail streams behind it; it travels fist -> target, then the hit burst (from the sim's 'hit') lands
        this.pool.spawn({ key: k('bolt'), x: e.x, y: e.y, depth: 10.4, life: flight, blend: 'normal', ox: 1, oy: 0.5, rot: ang, vx: dx / flight, vy: dy / flight, s0: sc * 0.6, s1: sc, a0: 1, a1: 1 });
        if (!reduced) {
          this.pool.spawn({ key: k('bolt'), x: e.x + dx * 0.55, y: e.y + dy * 0.55, depth: 10.3, life: 0.13, blend: 'add', ox: 1, oy: 0.5, rot: ang, s0: sc * 0.5, s1: sc * 0.9, a0: 0.55, a1: 0, delay: flight * 0.5 });   // fading after-glow along the path
          this.pool.spawn({ key: k('spark'), x: e.x, y: e.y, depth: 10.5, life: 0.12, blend: 'add', s0: 0.15, s1: solar ? 0.62 : 0.5, a0: 1, a1: 0, rot: rnd() * 3 });                                   // muzzle flare at the fist
        }
        void dist;
      } else if (e.kind === 'hit') {
        if (e.life > 0.3) {   // Kai was hit: a hot red-orange crack at his body, not an enemy hit
          this.pool.spawn({ key: vfxKey('hit', true), x: e.x, y: e.y - 8, depth: 10.6, life: 0.25, blend: 'normal', tint: 0xff7a6a, s0: 0.4, s1: 0.85, a0: 1, a1: 0, rot: rnd() * 6 });
        } else if (bursts++ < MAX_HIT_BURSTS_PER_FRAME) {
          const s = 0.5 + rnd() * 0.1;
          this.pool.spawn({ key: k('hit'), x: e.x, y: e.y - 8, depth: 11, life: 0.18, blend: 'normal', s0: s * 0.5, s1: s * (solar ? 1.4 : 1.2), a0: 1, a1: 0, rot: rnd() * 6.28 });
          if (!reduced && bursts <= 3) for (let i = 0; i < 2; i++) { const a = rnd() * 6.28, v = 90 + rnd() * 90; this.pool.spawn({ key: vfxKey('debris' + ((rnd() * 4) | 0), solar), x: e.x, y: e.y - 8, depth: 11, life: 0.28, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, ay: 380, s0: 0.45, s1: 0.2, a0: 1, a1: 0, rot: rnd() * 6, spin: 8 }); }
        }
      } else if (e.kind === 'xp') {
        this.pool.spawn({ key: vfxKey('spark', false), x: e.x, y: e.y, depth: 4.5, life: 0.2, blend: 'add', s0: 0.15, s1: 0.4, a0: 0.9, a1: 0, rot: rnd() });
      } else if (e.kind === 'pulse') {
        this.spawnImpact(e.x, e.y, p.qRadius * (solar ? 1.25 : 1), solar, reduced);
      } else if (e.kind === 'dash') {
        this.spawnDashStart(e.x, e.y, p.dashDx, p.dashDy, solar, reduced);
      }
    }
    // dash: a streak/afterimage ribbon is laid behind Kai while he moves
    if (p.dashRemaining > 0 && running && !reduced) {
      this.trailClock += dt;
      while (this.trailClock >= DASH_TRAIL_STEP) {
        this.trailClock -= DASH_TRAIL_STEP;
        const len = Math.hypot(p.dashDx, p.dashDy) || 1, ux = p.dashDx / len, uy = p.dashDy / len, ang = Math.atan2(uy, ux), side = (rnd() - 0.5) * 22;
        const cx = p.x - uy * side, cy = p.y - 6 + ux * side;
        this.pool.spawn({ key: k('dash_lines'), x: cx, y: cy, depth: 9.2, life: 0.2, blend: 'normal', ox: 1, oy: 0.5, rot: ang, s0: solar ? 0.78 : 0.62, s1: solar ? 0.5 : 0.4, a0: 0.9, a1: 0 });
        if (solar) this.pool.spawn({ key: vfxKey('mote' + ((rnd() * 3) | 0), true), x: cx, y: cy, depth: 9.1, life: 0.3, blend: 'add', ox: 1, oy: 0.5, rot: ang + (rnd() - 0.5) * 0.6, vx: -ux * 60, vy: -uy * 60 - 20, s0: 0.9, s1: 0.4, a0: 1, a1: 0 });
      }
    } else this.trailClock = 0;
    this.pool.update(dt);
  }

  private spawnDashStart(x: number, y: number, dx: number, dy: number, solar: boolean, reduced: boolean) {
    const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, ang = Math.atan2(uy, ux), fy = y + KAI_GROUND_DY - 4, rnd = Math.random;
    const dust = (ox: number, oy: number, s: number, delay: number) => this.pool.spawn({ key: vfxKey('dust', solar), x: ox, y: oy, depth: 5.8, life: 0.4, blend: 'normal', s0: s * 0.55, s1: s, a0: 0.85, a1: 0, vy: -16, vx: -ux * 20, delay, flipX: rnd() > 0.5 });
    dust(x - ux * 8, fy, solar ? 0.72 : 0.58, 0); dust(x - ux * 22, fy + 2, solar ? 0.55 : 0.44, 0.04);
    if (reduced) return;
    this.pool.spawn({ key: vfxKey('dash_slash', solar), x: x + ux * 6, y: y - 8 + uy * 6, depth: 9.3, life: 0.2, blend: 'normal', rot: ang, s0: solar ? 0.75 : 0.6, s1: solar ? 1.1 : 0.9, a0: 1, a1: 0, vx: ux * 70, vy: uy * 70 });
    this.pool.spawn({ key: vfxKey('spark', solar), x, y: y - 6, depth: 10.5, life: 0.14, blend: 'add', s0: 0.2, s1: solar ? 0.8 : 0.6, a0: 0.9, a1: 0, rot: rnd() * 3 });
    if (solar) this.pool.spawn({ key: vfxKey('circ_wave', true), x, y: fy, depth: 5.5, life: 0.28, blend: 'normal', s0: 0.08, s1: 0.28, sy: 0.5, a0: 0.9, a1: 0 });
  }

  /** Q: ground slam. The circular wave + crack decal end exactly on the sim damage radius (R); debris and dust fly out to it. */
  private spawnImpact(x: number, y: number, R: number, solar: boolean, reduced: boolean) {
    const rnd = Math.random, k = (n: string) => vfxKey(n, solar), pool = this.pool;
    const sw = (2 * R) / 303, sc = (2 * R) / 279;   // circ_wave 303 px, circ_crack 279 px across
    pool.spawn({ key: k('circ_crack'), x, y, depth: 3.3, life: solar ? 1.0 : 0.8, blend: 'normal', s0: sc * 0.35, s1: sc * 0.82, a0: 0.95, a1: 0, rot: rnd() * 6.28 });   // cracked ground fading out
    pool.spawn({ key: k('circ_wave'), x, y, depth: 5.4, life: 0.34, blend: 'normal', s0: sw * 0.18, s1: sw * 1.0, a0: 1, a1: 0 });                                         // the wave, ends on the damage circle
    pool.spawn({ key: k('spark'), x, y, depth: 10.5, life: 0.16, blend: 'add', s0: 0.3, s1: solar ? 1.9 : 1.5, a0: 0.55, a1: 0, rot: rnd() * 3 });                    // slam flash
    if (solar) pool.spawn({ key: k('circ_wave'), x, y, depth: 5.35, life: 0.42, blend: 'normal', s0: sw * 0.1, s1: sw * 0.78, a0: 0.8, a1: 0, delay: 0.07 });          // heavier: a second wave
    if (reduced) return;
    const nd = solar ? 14 : 10;
    for (let i = 0; i < nd; i++) { const a = (i / nd) * 6.28 + rnd() * 0.4, v = (R * (0.8 + rnd() * 0.5)) / 0.34; pool.spawn({ key: vfxKey('debris' + ((rnd() * 4) | 0), solar), x, y, depth: 9.1, life: 0.45, vx: Math.cos(a) * v * 0.7, vy: Math.sin(a) * v * 0.7 - 70, ay: 520, s0: 0.8 + rnd() * 0.5, s1: 0.4, a0: 1, a1: 0, rot: rnd() * 6, spin: (rnd() - 0.5) * 14 }); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + rnd() * 0.5; pool.spawn({ key: k('dust'), x: x + Math.cos(a) * R * 0.55, y: y + KAI_GROUND_DY * 0.3 + Math.sin(a) * R * 0.5, depth: 5.6, life: 0.5, blend: 'normal', s0: 0.35, s1: 0.8, a0: 0.8, a1: 0, vy: -22, delay: 0.1 + rnd() * 0.08 }); }
  }

  destroy() { this.pool.destroy(); }
}

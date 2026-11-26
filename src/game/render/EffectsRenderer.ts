import { grayKey, vexTint } from './vexTint';
import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { KAI_GROUND_DY } from '../../assets/kaiAnimation';
import { FxPool, vfxKey } from './fxPool';
import { b14Key } from './b14fx';
import { kick } from './cameraKick';
import { heroFxKey } from './heroFxView';

/** Basic-attack bolt, hit bursts, dash and Q (Impact) visuals: ImageGen sprites (cyan Base / solar Form I colour ramps), all pooled. Driven by the sim's `impacts` list; each impact is consumed once. */
const MAX_HIT_BURSTS_PER_FRAME = 8;
const DASH_TRAIL_STEP = 0.028;

/** Second forms keep their own dash / hit palette: grey-keyed Ren / Sora art multiplied by these, so no Crimson red or Sovereign blue leaks in. */
const REN_F2_TINT = { main: 0xe8a860, ghost: 0xa8683a }, SORA_F2_TINT = { main: 0xf6c8e2, ghost: 0xc9a0cc };
export class EffectsRenderer {
  private readonly pool: FxPool;
  private lastId = 0;
  private trailClock = 0;
  constructor(private readonly scene: Phaser.Scene) { this.pool = new FxPool(scene, 150); }

  render(state: GameState, reduced = false) {
    const p = state.player, hero = state.hero, mine = hero !== 'kai', solar = !mine && p.form >= 1 && p.form !== 3;   // B20: Ren / Sora never borrow Kai's orange solar set; they have their own ImageGen dash and hit art
    this.f2Tint = hero !== 'kai' && hero !== 'vex' && p.form === 2 ? (hero === 'ren' ? REN_F2_TINT : SORA_F2_TINT) : null; this.vexNow = hero === 'vex' || !!this.f2Tint; this.vexForm = p.form; const rh = hero === 'vex' ? 'ren' : hero;
    const g2 = (hero === 'vex' || !!this.f2Tint) && p.form === 2, hk = (n: string) => { const key = heroFxKey(hero === 'vex' ? 'vex' : rh === 'ren' ? 'ren' : 'sora', n); return g2 ? grayKey(this.scene, key) : key; }, hcol = hero === 'vex' ? vexTint(p.form).main : this.f2Tint ? this.f2Tint.main : rh === 'ren' ? 0xff4a3a : 0x9fe8ff;   // B13: Stillfire Apex keeps the cool cyan/silver effect set
    const k = (n: string) => vfxKey(n, solar);
    const running = state.phase === 'running' || state.phase === 'dead' || state.phase === 'victory';
    const dt = running ? Math.min(0.05, this.scene.game.loop.delta / 1000) : 0;   // frozen with the sim while paused / choosing an upgrade
    const rnd = Math.random; let bursts = 0;
    for (const e of state.impacts) {
      if (e.id <= this.lastId) continue; this.lastId = e.id;
      if (e.kind === 'shot') {
        const tx = e.targetX ?? e.x, ty = e.targetY ?? e.y; const dx = tx - e.x, dy = ty - e.y; const dist = Math.max(24, Math.hypot(dx, dy)); const ang = Math.atan2(dy, dx);
        const flight = 0.09, sc = solar ? 1.0 : 0.82;
        if (p.form >= 1 && this.shot(p.form, e.x, e.y, dx, dy, ang, reduced)) continue;
        // bolt: bright head at the sprite's right edge (origin 1,0.5), comet tail streams behind it; it travels fist -> target, then the hit burst (from the sim's 'hit') lands
        this.pool.spawn({ key: k('bolt'), x: e.x, y: e.y, depth: 10.4, life: flight, blend: 'normal', ox: 1, oy: 0.5, rot: ang, vx: dx / flight, vy: dy / flight, s0: sc * 0.6, s1: sc, a0: 1, a1: 1 });
        if (!reduced) {
          this.pool.spawn({ key: k('bolt'), x: e.x + dx * 0.55, y: e.y + dy * 0.55, depth: 10.3, life: 0.13, blend: 'add', ox: 1, oy: 0.5, rot: ang, s0: sc * 0.5, s1: sc * 0.9, a0: 0.55, a1: 0, delay: flight * 0.5 });   // fading after-glow along the path
          this.pool.spawn({ key: k('spark'), x: e.x, y: e.y, depth: 10.5, life: 0.12, blend: 'add', s0: 0.15, s1: solar ? 0.62 : 0.5, a0: 1, a1: 0, rot: rnd() * 3 });                                   // muzzle flare at the fist
        }
        void dist;
      } else if (e.kind === 'hurt') {   // Kai lost HP: a hot red-orange crack at his body and a short local kick (heavier for big hits)
        this.pool.spawn({ key: vfxKey('hit', true), x: e.x, y: e.y - 8, depth: 10.6, life: 0.25, blend: 'normal', tint: 0xff7a6a, s0: e.heavy ? 0.55 : 0.4, s1: e.heavy ? 1.05 : 0.85, a0: 1, a1: 0, rot: rnd() * 6 });
        kick(this.scene.cameras.main, e.heavy ? 160 : 90, e.heavy ? 0.0042 : 0.0022, reduced);
      } else if (e.kind === 'block') {   // a shield took the blow: a bright deflection glint thrown back at Kai, no burst, no debris
        if (bursts++ < MAX_HIT_BURSTS_PER_FRAME) {
          const away = Math.atan2(p.y - e.y, p.x - e.x);
          this.pool.spawn({ key: b14Key('glint'), x: e.x + Math.cos(away) * 22, y: e.y - 10 + Math.sin(away) * 22, depth: 11.3, life: 0.16, blend: 'add', tint: 0xcfe6ff, s0: 0.25, s1: 0.7, a0: 1, a1: 0, rot: rnd() * 3 });
          if (!reduced) this.pool.spawn({ key: b14Key('refract'), x: e.x + Math.cos(away) * 18, y: e.y - 10 + Math.sin(away) * 18, depth: 11.2, life: 0.14, blend: 'add', tint: 0xa8c8ff, rot: away + Math.PI / 2, s0: 0.3, s1: 0.6, a0: 0.9, a1: 0 });
        }
      } else if (e.kind === 'hit') {
        if (bursts++ < MAX_HIT_BURSTS_PER_FRAME) {
          const s = (0.5 + rnd() * 0.1) * (e.boss ? 0.8 : e.heavy ? 1.25 : 1);   // bosses keep their silhouette: smaller, no debris
          if (mine) { const sc = (e.boss ? 0.8 : e.heavy ? 1.3 : 1) * (p.form ? 1.15 : 1); this.pool.spawn({ ...this.vtint(), key: hk(rh === 'ren' ? 'rs_impact' : 'sm_hit'), x: e.x, y: e.y - 8, depth: 11, life: 0.2, blend: 'add', s0: sc * (rh === 'ren' ? 0.12 : 0.13), s1: sc * (rh === 'ren' ? 0.26 : 0.27), a0: 1, a1: 0, rot: rnd() * 6.28 }); if (e.heavy || e.kill) { kick(this.scene.cameras.main, e.boss ? 120 : 80, e.boss ? 0.003 : 0.0018, reduced); if (e.heavy && !e.boss) this.pool.spawn({ key: b14Key('shock_ring'), x: e.x, y: e.y + 10, depth: 3.9, life: 0.26, blend: 'add', tint: hcol, s0: 0.2, s1: 0.7, a0: 0.7, a1: 0 }); } continue; }
          if (bursts <= 3) this.hitFx(p.form, e.x, e.y - 8, Math.atan2(e.y - p.y, e.x - p.x), reduced);
          this.pool.spawn({ key: k('hit'), x: e.x, y: e.y - 8, depth: 11, life: 0.18, blend: 'normal', s0: s * 0.5, s1: s * (solar ? 1.4 : 1.2), a0: 1, a1: 0, rot: rnd() * 6.28 });
          if (!reduced && !e.boss && bursts <= 3) for (let i = 0, n = e.heavy ? 4 : 2; i < n; i++) { const a = rnd() * 6.28, v = 90 + rnd() * 90; this.pool.spawn({ key: vfxKey('debris' + ((rnd() * 4) | 0), solar), x: e.x, y: e.y - 8, depth: 11, life: 0.28, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, ay: 380, s0: 0.45, s1: 0.2, a0: 1, a1: 0, rot: rnd() * 6, spin: 8 }); }
          if (e.heavy || e.kill) { kick(this.scene.cameras.main, e.boss ? 120 : 80, e.boss ? 0.003 : 0.0018, reduced); if (e.heavy && !e.boss) this.pool.spawn({ key: b14Key('shock_ring'), x: e.x, y: e.y + 10, depth: 3.9, life: 0.26, blend: 'add', tint: solar ? 0xffc83c : 0x9fe8ff, s0: 0.2, s1: 0.7, a0: 0.7, a1: 0 }); }
        }
      } else if (e.kind === 'revive') {   // Second Wind: a warm white-gold ring out to the shove radius, distinct from the cyan/solar Impact Pulse and from a damage hit
        this.pool.spawn({ key: b14Key('shock_ring'), x: e.x, y: e.y + 10, depth: 5.5, life: 0.5, blend: 'add', tint: 0xfff0c0, s0: 0.2, s1: 1.9, a0: 0.9, a1: 0 });
        this.pool.spawn({ key: b14Key('glint'), x: e.x, y: e.y - 10, depth: 11.3, life: 0.4, blend: 'add', tint: 0xfff6d8, s0: 0.5, s1: 1.4, a0: 1, a1: 0 });
        kick(this.scene.cameras.main, 180, 0.003, reduced);
      } else if (e.kind === 'xp') {
        this.pool.spawn({ key: vfxKey('spark', false), x: e.x, y: e.y, depth: 4.5, life: 0.2, blend: 'add', s0: 0.15, s1: 0.4, a0: 0.9, a1: 0, rot: rnd() });
      } else if (e.kind === 'pulse') {
        if (p.form === 3) this.spawnApexImpact(e.x, e.y, p.qRadius * 1.25, reduced); else this.spawnImpact(e.x, e.y, p.qRadius * (solar ? 1.25 : 1), solar, reduced);
      } else if (e.kind === 'dash') {
        if (mine) this.spawnHeroDash(e.x, e.y, p.dashDx, p.dashDy, hk, p.form >= 1, reduced); else this.spawnDashStart(e.x, e.y, p.dashDx, p.dashDy, solar, reduced);
      }
    }
    // dash: a streak/afterimage ribbon is laid behind Kai while he moves
    if (p.dashRemaining > 0 && running && !reduced) {
      this.trailClock += dt;
      while (this.trailClock >= DASH_TRAIL_STEP) {
        this.trailClock -= DASH_TRAIL_STEP;
        const len = Math.hypot(p.dashDx, p.dashDy) || 1, ux = p.dashDx / len, uy = p.dashDy / len, ang = Math.atan2(uy, ux), side = (rnd() - 0.5) * 22;
        const cx = p.x - uy * side, cy = p.y - 6 + ux * side;
        if (mine) { this.pool.spawn({ ...this.vtint(), key: hk(rh === 'ren' ? 'rs_dashlines' : 'sm_dashlines'), x: cx, y: cy, depth: 9.2, life: 0.22, blend: 'add', ox: 1, oy: 0.5, rot: ang, s0: p.form ? 0.2 : 0.16, s1: p.form ? 0.13 : 0.1, a0: 0.9, a1: 0 }); if (p.form && !reduced) this.pool.spawn({ ...this.vtint(), key: hk(rh === 'ren' ? 'rs_afterimage' : 'sm_afterimage'), x: cx, y: cy, depth: 9.15, life: 0.26, blend: 'add', ox: 1, oy: 0.5, rot: ang, s0: 0.17, s1: 0.1, a0: 0.8, a1: 0 }); continue; }
        this.pool.spawn({ key: k('dash_lines'), x: cx, y: cy, depth: 9.2, life: 0.2, blend: 'normal', ox: 1, oy: 0.5, rot: ang, s0: solar ? 0.78 : 0.62, s1: solar ? 0.5 : 0.4, a0: 0.9, a1: 0 });
        if (solar) this.pool.spawn({ key: vfxKey('mote' + ((rnd() * 3) | 0), true), x: cx, y: cy, depth: 9.1, life: 0.3, blend: 'add', ox: 1, oy: 0.5, rot: ang + (rnd() - 0.5) * 0.6, vx: -ux * 60, vy: -uy * 60 - 20, s0: 0.9, s1: 0.4, a0: 1, a1: 0 });
      }
    } else this.trailClock = 0;
    this.pool.update(dt);
  }

  /** Per-form strike: each form throws its own shape (flame lash / comet streak / silver jab), not the same bolt recoloured. Returns true when it replaces the Base bolt. */
  private shot(form: number, x: number, y: number, dx: number, dy: number, ang: number, reduced: boolean) {
    const pool = this.pool, rnd = Math.random;
    if (form === 1) {          // Flarebound: a flame lash that licks out from the knuckles
      const flight = 0.1, key = b14Key(rnd() < 0.5 ? 'lash_a' : 'lash_b');
      pool.spawn({ key, x, y, depth: 10.4, life: flight + 0.06, blend: 'add', tint: 0xff7a1a, ox: 1, oy: 0.5, rot: ang, vx: dx / flight, vy: dy / flight, s0: 0.5, s1: 0.95, sy: 1 + (rnd() - 0.5) * 0.3, a0: 1, a1: 0.2 });
      pool.spawn({ key, x, y, depth: 10.5, life: flight + 0.04, blend: 'add', tint: 0xffe08a, ox: 1, oy: 0.5, rot: ang, vx: dx / flight, vy: dy / flight, s0: 0.3, s1: 0.6, a0: 1, a1: 0.3 });
      if (!reduced) pool.spawn({ key: vfxKey('embers', true), x, y, depth: 10.3, life: 0.22, blend: 'add', rot: ang, vx: dx * 2, vy: dy * 2 - 30, s0: 0.7, s1: 0.4, a0: 0.9, a1: 0 });
      return true;
    }
    if (form === 2) {          // Cometheart: a bright comet streak, fast, with a gold flash at the fist
      const flight = 0.07;
      pool.spawn({ key: b14Key('comet_streak'), x, y, depth: 10.4, life: flight + 0.08, blend: 'add', tint: 0xffc83c, ox: 1, oy: 0.5, rot: ang, vx: dx / flight, vy: dy / flight, s0: 0.7, s1: 1.25, a0: 1, a1: 0.1 });
      pool.spawn({ key: b14Key('comet_streak'), x, y, depth: 10.5, life: flight + 0.05, blend: 'add', tint: 0xfff6c8, ox: 1, oy: 0.5, rot: ang, vx: dx / flight, vy: dy / flight, s0: 0.38, s1: 0.7, a0: 1, a1: 0.2 });
      if (!reduced) pool.spawn({ key: b14Key('comet_flash'), x, y, depth: 10.6, life: 0.14, blend: 'add', tint: 0xffe28a, s0: 0.2, s1: 0.5, a0: 0.9, a1: 0, rot: rnd() * 3 });
      return true;
    }
    // Stillfire: a razor-thin silver jab and its fainter echo, no flash at the fist
    const flight = 0.055;
    pool.spawn({ key: b14Key('jab'), x, y, depth: 10.4, life: flight + 0.09, blend: 'add', tint: 0xeaf4ff, ox: 1, oy: 0.5, rot: ang, vx: dx / flight, vy: dy / flight, s0: 0.8, s1: 1.15, a0: 1, a1: 0 });
    if (!reduced) pool.spawn({ key: b14Key('jab'), x: x - dx * 0.02, y: y - dy * 0.02, depth: 10.3, life: flight + 0.14, blend: 'add', tint: 0x9fc8ff, ox: 1, oy: 0.5, rot: ang, vx: dx / (flight * 1.3), vy: dy / (flight * 1.3), s0: 0.6, s1: 1.0, a0: 0.55, a1: 0, delay: 0.035 });
    return true;
  }
  /** Per-form hit: Base = crisp crescent + pop, Flarebound = ember burst, Cometheart = star flash + flat shockwave, Stillfire = crossing refraction slashes and a glint. */
  private hitFx(form: number, x: number, y: number, ang: number, reduced: boolean) {
    const pool = this.pool, rnd = Math.random;
    if (form === 0) {
      pool.spawn({ key: b14Key(rnd() < 0.5 ? 'arc_a' : 'arc_b'), x: x - Math.cos(ang) * 6, y, depth: 11.1, life: 0.14, blend: 'add', tint: 0xbff6ff, rot: ang + Math.PI, s0: 0.55, s1: 0.95, a0: 1, a1: 0 });
      if (!reduced) pool.spawn({ key: b14Key('pop'), x, y, depth: 11.2, life: 0.12, blend: 'add', tint: 0xffffff, s0: 0.3, s1: 0.8, a0: 0.9, a1: 0, rot: rnd() });
    } else if (form === 1) {
      pool.spawn({ key: b14Key('ember_burst'), x, y, depth: 11.1, life: 0.22, blend: 'add', tint: 0xff8a2a, s0: 0.35, s1: 1.0, a0: 1, a1: 0, rot: rnd() * 6 });
      if (!reduced) pool.spawn({ key: b14Key('ember_burst'), x, y, depth: 11.2, life: 0.15, blend: 'add', tint: 0xffe9a0, s0: 0.2, s1: 0.55, a0: 1, a1: 0, rot: rnd() * 6 });
    } else if (form === 2) {
      pool.spawn({ key: b14Key('comet_flash'), x, y, depth: 11.2, life: 0.2, blend: 'add', tint: 0xffe28a, s0: 0.35, s1: 1.05, a0: 1, a1: 0, rot: rnd() * 3 });
      pool.spawn({ key: b14Key('shock_ring'), x, y: y + 14, depth: 3.9, life: 0.3, blend: 'add', tint: 0xffc83c, s0: 0.25, s1: 1.1, a0: 0.9, a1: 0 });
    } else {
      const base = ang + (rnd() < 0.5 ? 0.9 : -0.9);
      pool.spawn({ key: b14Key('refract'), x, y, depth: 11.2, life: 0.18, blend: 'add', tint: 0xeaf4ff, rot: base, s0: 0.6, s1: 0.95, a0: 1, a1: 0 });
      if (!reduced) {
        pool.spawn({ key: b14Key('refract'), x, y, depth: 11.2, life: 0.2, blend: 'add', tint: 0xbfdcff, rot: base + 2.1, s0: 0.5, s1: 0.85, a0: 0.9, a1: 0, delay: 0.05, flipX: true });
        pool.spawn({ key: b14Key('glint'), x, y, depth: 11.3, life: 0.2, blend: 'add', tint: 0xffffff, s0: 0.3, s1: 0.8, a0: 1, a1: 0, delay: 0.03 });
      }
    }
  }

  /** Ren / Sora dash start: hero-coloured crescent, speed lines and ground dust; transformed dashes are larger and add the ring/afterimage layer. */
  private vexNow = false; private vexForm = 0;
  private f2Tint: { main: number; ghost: number } | null = null;
  private tintOf() { return this.f2Tint ?? vexTint(this.vexForm); }
  private vtint(): { tint?: number } { return this.vexNow ? { tint: this.tintOf().main } : {}; }
  private spawnHeroDash(x: number, y: number, dx: number, dy: number, hk: (n: string) => string, form: boolean, reduced: boolean) {
    const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, ang = Math.atan2(uy, ux), fy = y + KAI_GROUND_DY - 4, ren = hk('x').includes('-ren-');
    this.pool.spawn({ key: vfxKey('dust', false), x: x - ux * 8, y: fy, depth: 5.8, life: 0.4, blend: 'normal', tint: this.vexNow ? this.tintOf().ghost : ren ? 0xb8504a : 0x8fb4e0, s0: 0.32, s1: 0.58, a0: 0.8, a1: 0, vy: -16, vx: -ux * 20 });
    if (reduced) return;
    this.pool.spawn({ ...this.vtint(), key: hk(ren ? 'rs_dashslash' : 'sm_dashslash'), x: x + ux * 8, y: y - 8 + uy * 8, depth: 9.3, life: 0.22, blend: 'add', rot: ang + Math.PI, s0: form ? 0.2 : 0.15, s1: form ? 0.3 : 0.22, a0: 1, a1: 0, vx: ux * 90, vy: uy * 90 });
    if (form) this.pool.spawn({ ...this.vtint(), key: hk(ren ? 'rs_ring' : 'sm_ring'), x, y: fy, depth: 5.5, life: 0.3, blend: 'add', s0: 0.08, s1: 0.28, sy: 1, a0: 0.9, a1: 0 });
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

  /** Q in Stillfire Apex: a silver-lavender refraction burst (thin ring, radial glass slashes, floating shards) instead of the cyan slam, ending on the same damage radius. */
  private spawnApexImpact(x: number, y: number, R: number, reduced: boolean) {
    const pool = this.pool, rnd = Math.random, SILVER = 0xe4e6ff, LAV = 0xb9b4ff;
    pool.spawn({ key: b14Key('ring_f3'), x, y, depth: 3.3, life: 0.9, blend: 'add', tint: LAV, s0: (2 * R * 0.35) / 110, s1: (2 * R * 0.84) / 110, a0: 0.75, a1: 0, rot: rnd() * 6.28 });
    pool.spawn({ key: b14Key('ring_f3'), x, y, depth: 5.4, life: 0.34, blend: 'add', tint: SILVER, s0: (2 * R * 0.18) / 110, s1: (2 * R) / 110, a0: 1, a1: 0 });
    pool.spawn({ key: b14Key('glint'), x, y: y - 6, depth: 10.5, life: 0.2, blend: 'add', tint: 0xffffff, s0: 0.6, s1: 2.2, a0: 0.8, a1: 0 });
    if (reduced) return;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28 + 0.2; pool.spawn({ key: b14Key('refract'), x: x + Math.cos(a) * R * 0.2, y: y + Math.sin(a) * R * 0.2, depth: 9.4, life: 0.3, blend: 'add', tint: i % 2 ? SILVER : LAV, rot: a, vx: Math.cos(a) * R / 0.3 * 0.6, vy: Math.sin(a) * R / 0.3 * 0.6, s0: 0.5, s1: 0.9, a0: 0.9, a1: 0 }); }
    for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, r = R * (0.3 + rnd() * 0.6); pool.spawn({ key: b14Key('shards'), x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.6, depth: 9.1, life: 0.6, blend: 'add', tint: SILVER, vy: -40 - rnd() * 40, s0: 0.45, s1: 0.2, a0: 0.9, a1: 0, rot: rnd() * 6, spin: (rnd() - 0.5) * 6 }); }
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

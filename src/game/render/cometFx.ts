import { PASSIVE_AURA } from './fxPolicy';
import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { CANNON, COMET, DRAGON } from '../../content/cometheart';
import { cannonFireTime, cannonHalfWidth, dragonHead } from '../../sim/AbilitySystem';
import type { Facing, HandAnchor } from '../../assets/kaiAnimation';
import { FxPool } from './fxPool';
import { GLOW_KEY, GroundDecal, ensureGlow } from './b14fx';

/** B12 Form II art: ImageGen sheets cut by art/characters/kai/form-ii/scripts/extract_fx.py into neutral sprites that are tinted gold here. */
export const COMET_FX_NAMES = ['aura_a', 'aura_b', 'beam', 'bolt_h0', 'bolt_h1', 'bolt_h2', 'bolt_h3', 'bolt_v0', 'bolt_v1', 'bolt_v2', 'bolt_v3', 'core', 'crack0', 'crack1', 'crack2', 'crack3',
  'debris0', 'debris1', 'debris2', 'debris3', 'debris4', 'debris5', 'dragon_a', 'dragon_b', 'flash', 'halo', 'head', 'ring_arc', 'star'] as const;
export const cometFxKey = (n: string) => `cmfx-${n}`;
export const cometFxUrl = (n: string) => `/art/fx/kai-form2/${n}.png`;

const GOLD = 0xffc83c, HOT = 0xfff2b0, WHITE = 0xfffbe8, DUST = 0xc9a56a;
const rnd = Math.random;
const pick = <T,>(a: readonly T[]) => a[(rnd() * a.length) | 0];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (u: number) => { u = clamp01(u); return u * u * (3 - 2 * u); };

export interface CometCtx {
  dt: number; state: GameState; hero: Phaser.GameObjects.Sprite; x: number; y: number; facing: Facing; reduced: boolean; crowded: boolean;
  /** Form II art is on screen (visual form), the Kai sprite moved this frame, the dash is running, and the on-screen fist anchor of the current frame (punch / beam clips). */
  f2: boolean; moving: boolean; speed: number; dashing: boolean; hand: HandAnchor | null; events: readonly string[];
}
interface DragonLive { sx: number; sy: number; dx: number; dy: number; age: number; s: GameState; hits: number }
interface BeamLive { ox: number; oy: number; dx: number; dy: number; len: number; age: number; fire: number; face: Facing }
interface Ghost { spr: Phaser.GameObjects.Sprite; age: number; life: number }

/** Everything Cometheart adds on screen: the living golden aura (idle / run / dash / charge / release / decay), ground cracks and debris, the reveal cinematic, Dragonfang Rush, Cometbreaker Cannon and the boss finisher.
 *  Pure render state: it reads the sim (cast, cinema, events), never writes it. All timers are dt-driven, so pause freezes it. */
export class CometFx {
  private readonly pool: FxPool;
  private readonly g: Phaser.GameObjects.Graphics;       // beam / lane / floor light
  private readonly under: Phaser.GameObjects.Graphics;   // ground light below Kai
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private flashA = 0; private flashRate = 5;
  private readonly rim: Phaser.GameObjects.Sprite[] = [];
  private readonly slices: Phaser.GameObjects.Image[] = [];
  private readonly glowSlices: Phaser.GameObjects.Image[] = [];
  private readonly beamTex: Phaser.GameObjects.TileSprite;
  private readonly core: Phaser.GameObjects.Image;
  private readonly ground: GroundDecal;                   // B14: ImageGen comet sigil under Kai (replaces the drawn gold ellipses)
  private readonly handGlow: Phaser.GameObjects.Image[];  // soft light at the fists (mid, near, far)
  private readonly lane: Phaser.GameObjects.Image[];      // dotted glints along the aimed lane while gathering (replaces the thin drawn line)
  private ghosts: Ghost[] = [];
  private lastEvent = 0; private clock = 0;
  private level = 0; private idleArc = 4; private bolt = 0.4; private foot = 0; private ghostClock = 0; private dustClock = 0; private glint = 0;
  private crackTimers: number[] = [];
  private dragon: DragonLive | null = null; private beam: BeamLive | null = null;
  private flashLeft = 0; private zoomMul = 1; private hitstop = 0; private sparkClock = 0;
  constructor(private readonly scene: Phaser.Scene) {
    this.pool = new FxPool(scene, 170);
    this.g = scene.add.graphics().setDepth(10.4).setBlendMode(Phaser.BlendModes.ADD); this.under = scene.add.graphics().setDepth(3.55).setBlendMode(Phaser.BlendModes.ADD);
    this.dim = scene.add.rectangle(0, 0, 4000, 3000, 0x05060a, 1).setScrollFactor(0).setDepth(40).setAlpha(0).setVisible(false).setOrigin(0.5);
    this.flashRect = scene.add.rectangle(0, 0, 4000, 3000, 0xfff0c0, 1).setScrollFactor(0).setDepth(41).setAlpha(0).setVisible(false).setOrigin(0.5);
    for (let i = 0; i < 4; i++) { const r = scene.add.sprite(0, 0, cometFxKey('halo')).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.7).setVisible(false).setTint(GOLD); r.setTintMode(Phaser.TintModes.FILL); this.rim.push(r); }
    const dtex = scene.textures.get(cometFxKey('dragon_a')).getSourceImage();
    for (let i = 0; i < 22; i++) {
      this.glowSlices.push(scene.add.image(0, 0, cometFxKey('dragon_a')).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.8).setVisible(false).setTint(0xff9a1a));
      this.slices.push(scene.add.image(0, 0, cometFxKey('dragon_a')).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.NORMAL).setDepth(10.9).setVisible(false).setTint(0xffd04a));
    }
    void dtex;
    this.beamTex = scene.add.tileSprite(0, 0, 10, scene.textures.get(cometFxKey('beam')).getSourceImage().height, cometFxKey('beam')).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setTint(HOT);
    this.core = scene.add.image(0, 0, cometFxKey('core')).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    ensureGlow(scene); this.ground = new GroundDecal(scene, 'sigil_f2', 0xff9f1a, 0.3);
    this.handGlow = [0, 1, 2].map(() => scene.add.image(0, 0, GLOW_KEY).setBlendMode(Phaser.BlendModes.ADD).setDepth(11.1).setVisible(false));
    this.lane = Array.from({ length: 7 }, () => scene.add.image(0, 0, cometFxKey('star')).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.6).setTint(GOLD).setVisible(false));
  }
  /** Camera zoom factor for the reveal (1 outside it) and a pending visual hit-stop in ms (the scene skips sim ticks for that long). */
  cameraZoom() { return this.zoomMul; }
  takeHitstop() { const h = this.hitstop; this.hitstop = 0; return h; }

  private spawn(key: string, x: number, y: number, o: { depth?: number; life: number; blend?: 'add' | 'normal'; tint?: number; vx?: number; vy?: number; ay?: number; s0?: number; s1?: number; a0?: number; a1?: number; rot?: number; spin?: number; delay?: number; ox?: number; oy?: number; sy?: number; fadeIn?: number }) {
    this.pool.spawn({ key: cometFxKey(key), x, y, depth: o.depth ?? 11, blend: o.blend ?? 'add', tint: o.tint ?? GOLD, ...o });
  }
  private bolts(x: number, y: number, n: number, r: number, tint = HOT, life = 0.14, depth = 11.2) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.283, v = rnd() < 0.5, d = r * (0.4 + rnd() * 0.6);
      this.spawn(v ? pick(['bolt_v0', 'bolt_v1', 'bolt_v2', 'bolt_v3']) : pick(['bolt_h0', 'bolt_h1', 'bolt_h2', 'bolt_h3']), x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, { depth, life, tint, s0: 0.8, s1: 1.1, a0: 1, a1: 0, rot: v ? (rnd() - 0.5) * 0.5 : (rnd() - 0.5) * 1.2 });
    }
  }
  private crack(x: number, y: number, s = 1, life = 1.7, reduced = false) {
    if (this.crackTimers.length >= 6) return;
    const v = pick(['crack0', 'crack1', 'crack2', 'crack3']);
    this.spawn(v, x, y + 2, { depth: 2.7, life, tint: GOLD, s0: s * 0.7, s1: s, a0: 0.95, a1: 0, rot: rnd() < 0.5 ? 0 : Math.PI, sy: 0.7 });
    this.spawn('halo', x, y + 2, { depth: 2.65, life: life * 0.6, tint: 0xffa21c, s0: s * 0.5, s1: s * 1.3, a0: 0.45, a1: 0, sy: 0.55 });
    this.crackTimers.push(life);
    if (!reduced) this.debris(x, y, 4 + ((s * 3) | 0), s);
  }
  private debris(x: number, y: number, n: number, s = 1) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.283, v = (50 + rnd() * 110) * s;
      this.spawn(pick(['debris0', 'debris1', 'debris2', 'debris3', 'debris4', 'debris5']), x, y - 2, { depth: 11.5, life: 0.55 + rnd() * 0.3, blend: 'normal', tint: rnd() < 0.5 ? 0xd9c9a0 : 0xffe9a0, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - 90 * s, ay: 420, s0: 0.8, s1: 0.5, a0: 1, a1: 0, spin: (rnd() - 0.5) * 10, rot: rnd() * 6 });
    }
    for (let i = 0; i < 3; i++) this.spawn('halo', x + (rnd() - 0.5) * 20, y, { depth: 4.2, life: 0.8, blend: 'normal', tint: DUST, vx: (rnd() - 0.5) * 60, vy: -18 - rnd() * 14, s0: 0.12, s1: 0.28 * s, a0: 0.22, a1: 0 });
  }
  private ring(x: number, y: number, s: number, life = 0.5, tint = HOT) { this.spawn('ring_arc', x, y, { depth: 3.6, life, tint, s0: 0.25, s1: s, a0: 1, a1: 0, sy: 0.8 }); }
  private ghost(hero: Phaser.GameObjects.Sprite, life: number, a: number, tint = GOLD) {
    if (this.ghosts.length >= 8) return;
    const spr = this.scene.add.sprite(hero.x, hero.y, hero.texture.key, hero.frame.name).setOrigin(hero.originX, hero.originY).setScale(hero.scaleX, hero.scaleY).setFlipX(hero.flipX).setDepth(9.4).setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setAlpha(a);
    spr.setTintMode(Phaser.TintModes.FILL); this.ghosts.push({ spr, age: 0, life });
  }
  private pulse(a: number, rate: number) { this.flashA = Math.max(this.flashA, a); this.flashRate = rate; }
  private shake(ms: number, k: number, reduced: boolean) { if (!reduced) this.scene.cameras.main.shake(ms, k); }

  /** The reveal as a pure function of the sim's frozen cinematic clock: dim, camera punch-in, then recovery. */
  private cinema(s: GameState, ctx: CometCtx) {
    const c = s.cinema, x = ctx.x, y = ctx.y, red = ctx.reduced;
    if (!c) { this.zoomMul += (1 - this.zoomMul) * Math.min(1, ctx.dt * 8); this.dim.setVisible(this.dim.alpha > 0.01); this.dim.setAlpha(Math.max(0, this.dim.alpha - ctx.dt * 1.2)); return; }
    const u = c.t / c.breakAt, peak = c.first ? 1.6 : 1.18, rec = clamp01((c.t - c.commitAt) / Math.max(0.1, c.dur - c.commitAt));
    const zoom = c.t < c.commitAt ? 1 + (peak - 1) * smooth(u * 1.1) : 1 + (peak - 1) * (1 - smooth(rec));
    this.zoomMul = red ? 1 : zoom;
    const dimA = (c.t < c.commitAt ? 0.4 * smooth(u * 1.2) : 0.4 * (1 - smooth(rec * 1.6))) * (red ? 0.5 : 1);
    this.dim.setVisible(true).setAlpha(dimA);
    const dt = ctx.dt;
    if (dt <= 0) return;
    // anticipation + charge: dust and light drawn inward, lightning crawling around the body, aura compressing
    if (c.t < c.breakAt && !red) {
      this.sparkClock += dt; const every = c.first ? 0.035 : 0.06;
      while (this.sparkClock > every) {
        this.sparkClock -= every; const a = rnd() * 6.283, r = (110 - 60 * u) + rnd() * 30;
        this.spawn('halo', x + Math.cos(a) * r, y - 30 + Math.sin(a) * r * 0.6, { depth: 11, life: 0.3, tint: HOT, vx: -Math.cos(a) * r / 0.3, vy: -Math.sin(a) * r * 0.6 / 0.3, s0: 0.08, s1: 0.02, a0: 0.9, a1: 0 });
      }
      this.bolt -= dt * (1 + 5 * u); if (this.bolt <= 0) { this.bolt = 0.3; this.bolts(x, y - 34, 1, 30 + 20 * (1 - u), HOT, 0.12); }
    }
    if (c.t < c.breakAt) this.level = Math.max(this.level, 0.5 + 0.5 * u);
  }

  private event(ev: GameState['abilityEvents'][number], ctx: CometCtx) {
    const { x, y, reduced, hero } = ctx, c = ctx.state.cast;
    switch (ev.kind) {
      case 'form2_break': {
        this.flashLeft = 0.1; this.level = 1.4;
        this.crack(x, y, 2.6, 2.4, reduced); this.crack(x + 40, y + 6, 1.4, 2.0, reduced); this.crack(x - 46, y + 4, 1.4, 2.0, reduced);
        this.ring(x, y, 3.2, 0.7, WHITE); this.ring(x, y, 4.4, 0.95, GOLD); this.spawn('halo', x, y, { depth: 3.4, life: 0.8, tint: GOLD, s0: 0.5, s1: 3.2, a0: 0.8, a1: 0, sy: 0.55 });
        this.spawn('star', x, y - 34, { depth: 11.5, life: 0.35, tint: WHITE, s0: 0.5, s1: 2.0, a0: 1, a1: 0 });
        if (!reduced) { this.shake(280, 0.006, false); this.pulse(0.3, 7); for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283 + rnd() * 0.3; this.spawn(pick(['bolt_h0', 'bolt_h1', 'bolt_h2', 'bolt_h3']), x + Math.cos(a) * 34, y - 24 + Math.sin(a) * 26, { depth: 11.4, life: 0.2 + rnd() * 0.15, tint: HOT, s0: 1.2, s1: 1.8, a0: 1, a1: 0, rot: a, delay: rnd() * 0.18 }); } this.debris(x, y, 14, 1.6); }
        break;
      }
      case 'form2_commit': {
        this.flashLeft = 0.12;
        this.spawn('flash', x, y - 36, { depth: 12, life: 0.5, tint: WHITE, s0: 0.4, s1: 3.4, a0: 1, a1: 0, rot: rnd() });
        this.spawn('star', x, y - 36, { depth: 12.1, life: 0.6, tint: HOT, s0: 0.3, s1: 3.2, a0: 1, a1: 0, rot: 0.4, spin: 0.8 });
        this.ring(x, y, 4.6, 0.9, WHITE);
        if (!reduced) { this.pulse(0.62, 3.2); this.shake(200, 0.004, false); this.bolts(x, y - 34, 14, 70, WHITE, 0.2, 12); }
        break;
      }
      case 'form2_end': this.ring(x, y, 2.4, 0.35, GOLD); break;
      case 'dragon_launch': {
        if (!c) break; this.dragon = { sx: c.sx, sy: c.sy + 24, dx: c.dirX, dy: c.dirY, age: 0, s: ctx.state, hits: 0 }; this.level = 1.2;
        const o = ctx.hand ? this.lead(ctx.hand, c.face) : { x: ev.x, y: ev.y };
        this.spawn('flash', o.x, o.y, { depth: 12, life: 0.22, tint: WHITE, s0: 0.3, s1: 1.4, a0: 1, a1: 0, rot: rnd() * 3 }); this.ring(c.sx, c.sy + 24, 2.2, 0.35, GOLD);
        this.crack(c.sx, c.sy + 24, 1.3, 1.5, reduced); this.shake(120, 0.003, reduced);
        for (let i = 0; i < 6 && !reduced; i++) this.spawn('halo', c.sx, c.sy + 22, { depth: 4.2, life: 0.5, blend: 'normal', tint: DUST, vx: -c.dirX * (60 + rnd() * 60) + (rnd() - 0.5) * 50, vy: -c.dirY * 30 - 10, s0: 0.12, s1: 0.3, a0: 0.3, a1: 0 });
        break;
      }
      case 'dragon_hit': {
        this.spawn('flash', ev.x, ev.y, { depth: 12, life: 0.2, tint: WHITE, s0: 0.5, s1: 1.8, a0: 1, a1: 0, rot: rnd() * 3 }); this.spawn('star', ev.x, ev.y, { depth: 12.1, life: 0.25, tint: HOT, s0: 0.4, s1: 1.7, a0: 1, a1: 0, rot: rnd() });
        this.ring(ev.x, ev.y + 14, 1.8, 0.4, GOLD); if (this.dragon) this.dragon.hits += ev.n ?? 1;
        if (!reduced) { this.hitstop = Math.max(this.hitstop, 55); this.shake(150, 0.0045, false); this.crack(ev.x, ev.y + 14, 1.1, 1.3, false); this.bolts(ev.x, ev.y, 5, 40, HOT, 0.16, 12); }
        break;
      }
      case 'comet_fire': {
        if (!c) break; const o = ctx.hand ? ctx.hand.m : { x: ev.x, y: ev.y };
        this.beam = { ox: o.x, oy: o.y, dx: c.dirX, dy: c.dirY, len: c.len, age: 0, fire: cannonFireTime(ctx.state), face: c.face }; this.level = 1.5;
        this.flashLeft = 0.08; this.spawn('flash', o.x, o.y, { depth: 12, life: 0.4, tint: WHITE, s0: 0.5, s1: 2.6, a0: 1, a1: 0 }); this.ring(c.sx, c.sy + 24, 3.6, 0.7, WHITE);
        this.crack(c.sx, c.sy + 24, 2.0, 2.2, reduced); this.crack(c.sx - c.dirX * 30, c.sy + 26, 1.2, 1.8, reduced);
        if (!reduced) { this.shake(260, 0.005, false); this.pulse(0.22, 8); }
        void hero; break;
      }
      case 'comet_pulse': if (ev.n && !reduced && rnd() < 0.5) { this.bolts(ev.x, ev.y, 2, 34, HOT, 0.14, 12); } break;
      case 'comet_end': if (this.beam) this.beam.age = Math.max(this.beam.age, this.beam.fire); break;
      case 'finisher': {
        const big = !!ev.n; this.flashLeft = 0.14;
        this.spawn('flash', ev.x, ev.y - 10, { depth: 12.5, life: 0.6, tint: WHITE, s0: 0.5, s1: big ? 6 : 4.2, a0: 1, a1: 0 }); this.spawn('star', ev.x, ev.y - 10, { depth: 12.6, life: 0.7, tint: HOT, s0: 0.3, s1: big ? 5 : 3.4, a0: 1, a1: 0, rot: 0.3 });
        this.ring(ev.x, ev.y + 10, big ? 7 : 5, 1.0, WHITE); this.ring(ev.x, ev.y + 10, big ? 9 : 6.5, 1.3, GOLD);
        for (let i = 0; i < 4; i++) this.crack(ev.x + (rnd() - 0.5) * 120, ev.y + 14 + (rnd() - 0.5) * 50, 1.8, 2.4, reduced);
        if (!reduced) {
          this.hitstop = 190; this.shake(360, 0.008, false); this.pulse(0.5, 4.5);
          for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 + rnd() * 0.3; this.spawn(pick(['bolt_h0', 'bolt_h1', 'bolt_h2', 'bolt_h3']), ev.x + Math.cos(a) * 30, ev.y + 12 + Math.sin(a) * 18, { depth: 3.8, life: 0.55, tint: HOT, vx: Math.cos(a) * 120, vy: Math.sin(a) * 60, s0: 1.1, s1: 1.8, a0: 1, a1: 0, rot: a, delay: i * 0.015 }); }
          this.debris(ev.x, ev.y + 10, 16, 1.8);
        }
        break;
      }
      default: break;
    }
  }
  private lead(h: HandAnchor, face: Facing) { return face === 'east' ? (h.n.x > h.f.x ? h.n : h.f) : face === 'west' ? (h.n.x < h.f.x ? h.n : h.f) : face === 'south' ? (h.n.y > h.f.y ? h.n : h.f) : (h.n.y < h.f.y ? h.n : h.f); }

  update(ctx: CometCtx) {
    const { dt, state: s, hero, x, y } = ctx; this.clock += dt; this.g.clear(); this.under.clear();
    this.flashLeft = Math.max(0, this.flashLeft - dt); this.flashA = Math.max(0, this.flashA - dt * this.flashRate); this.flashRect.setVisible(this.flashA > 0.01).setAlpha(this.flashA); this.crackTimers = this.crackTimers.map(v => v - dt).filter(v => v > 0);
    for (const ev of s.abilityEvents) { if (ev.id <= this.lastEvent) continue; this.lastEvent = ev.id; if (s.phase === 'running' || s.phase === 'victory') this.event(ev, ctx); }
    this.cinema(s, ctx);
    const c = s.cast, active = ctx.f2 && s.phase !== 'dead' && !s.cinema;
    // ---- aura intensity state machine: idle < run < dash < charge < release flare, attack fast, decay slow (graceful stop)
    const charging = !!c && !c.released && (c.kind === 'dragon' || c.kind === 'comet');
    let target = 0.55; if (ctx.moving) target = 0.8 + 0.2 * Math.min(1, ctx.speed / 300); if (ctx.dashing) target = 1.05; if (charging) target = 1.0 + (c!.kind === 'comet' ? 0.3 * Math.min(1, c!.t / CANNON.gather) : 0.1);
    if (!ctx.f2) target = s.cinema ? this.level : 0;
    this.level += (target - this.level) * Math.min(1, dt * (target > this.level ? 9 : 1.8));
    const L = this.level, show = PASSIVE_AURA && (L > 0.03 && ctx.f2 && !s.cinema || (!!s.cinema && L > 0.03));
    const t = this.clock;
    // body-hugging golden rim (4 offset copies of the hero frame behind him), breathing at rest, flaring with intensity
    for (let i = 0; i < 4; i++) {
      const r = this.rim[i]; r.setVisible(show); if (!show) continue;
      const rad = (2.2 + 0.7 * Math.sin(t * 5 + i * 1.7) + 2.6 * L) * (hero.scaleX / 0.5), dx = [rad, -rad, 0, 0][i], dy = [0, 0, -rad * 1.7, rad * 0.6][i];
      r.setTexture(hero.texture.key, hero.frame.name).setOrigin(hero.originX, hero.originY).setScale(hero.scaleX, hero.scaleY).setPosition(hero.x + dx, hero.y + dy).setFlipX(hero.flipX).setAlpha(Math.min(0.75, L * (i === 2 ? 0.34 : 0.27) * (1 + 0.25 * Math.sin(t * 8 + i))));
    }
    // floor light under Kai + warm back-light
    this.ground.update(dt, x, y, show, 98 + 18 * L, charging ? 0.5 + 0.5 * Math.min(1, (c?.t ?? 0) / CANNON.gather) : ctx.dashing ? 0.6 : 0, ctx.reduced);
    if (dt > 0 && active) this.ambient(ctx, L, charging);
    if (dt > 0 && !active && !s.cinema) { this.ghostClock = 0; }
    // ---- reveal flash: Kai goes white-hot for a few frames
    // ---- Dragonfang
    this.drawDragon(ctx); this.drawCannon(ctx, charging);
    // ---- ghosts (afterimages) decay
    for (let i = this.ghosts.length - 1; i >= 0; i--) { const gh = this.ghosts[i]; gh.age += dt; if (gh.age >= gh.life) { gh.spr.destroy(); this.ghosts.splice(i, 1); } else gh.spr.setAlpha(0.45 * (1 - gh.age / gh.life) ** 1.4); }
    this.pool.update(dt);

  }
  /** Is Kai flashing white-hot (reveal frames)? */
  get flashing() { return this.flashLeft > 0; }

  private ambient(ctx: CometCtx, L: number, charging: boolean) {
    void charging; void L; void this.idleArc; void this.foot; void this.dustClock; void this.glint; void this.backward; void this.dustPuff;   // passive blazes are retired (fxPolicy.ts); only the deliberate dash afterimage remains
    if (ctx.moving && ctx.dashing) { this.ghostClock += ctx.dt; if (this.ghostClock >= 0.04) { this.ghostClock = 0; this.ghost(ctx.hero, 0.28, 0.55); } }
  }
  private backward(ctx: CometCtx) { const f = ctx.facing; return f === 'east' ? { x: -1, y: 0 } : f === 'west' ? { x: 1, y: 0 } : f === 'south' ? { x: 0, y: -1 } : { x: 0, y: 1 }; }
  private dustPuff(x: number, y: number, back: { x: number; y: number }, k: number) { for (let i = 0; i < 2; i++) this.spawn('halo', x + back.x * 10, y, { depth: 4.2, life: 0.6, blend: 'normal', tint: DUST, vx: back.x * 30 + (rnd() - 0.5) * 30, vy: -16, s0: 0.1 * k, s1: 0.24 * k, a0: 0.2, a1: 0 }); }

  /** Dragonfang: an eastern energy dragon from the exported fist runs along the strike lane. It is cut into thin slices that ride a travelling sine wave, so it slithers instead of sliding as a flat sticker. */
  private drawDragon(ctx: CometCtx) {
    const d = this.dragon; for (const sp of [...this.slices, ...this.glowSlices]) sp.setVisible(false);
    if (!d) return; d.age += ctx.dt;
    const tl = d.age, headMax = dragonHead(d.s, 0.6), head = dragonHead(d.s, Math.min(tl, 0.6)) , fade = clamp01(1 - (tl - 0.32) / 0.3);
    if (fade <= 0) { this.dragon = null; return; }
    const tex = this.scene.textures.get(cometFxKey('dragon_a')).getSourceImage(), W = tex.width, H = tex.height, N = this.slices.length, sw = W / N, DS = 1.5;
    const vis = Math.min(W * DS, head + 24), ang = Math.atan2(d.dy, d.dx), nx = -d.dy, ny = d.dx; void headMax;
    const hx = d.sx + d.dx * head, hy = d.sy + d.dy * head - 18;   // the tip rides at fist height above the floor
    for (let i = 0; i < N; i++) {
      // slice i covers source x in [i*sw, (i+1)*sw]; i = N-1 is the head. Distance behind the tip:
      const behind = (N - 1 - i) * sw * DS; if (behind > vis) { this.slices[i].setVisible(false); this.glowSlices[i].setVisible(false); continue; }
      const wave = Math.sin(this.clock * 16 - i * 0.55) * (4 + 8 * (1 - i / N)) * (ctx.reduced ? 0.4 : 1);
      const px = hx - d.dx * (behind + sw * DS) + nx * wave, py = hy - d.dy * (behind + sw * DS) + ny * wave;
      const a = fade * (0.4 + 0.6 * Math.pow(i / N, 0.6));
      for (const [sp, al, sc] of [[this.glowSlices[i], 0.34, 1.16], [this.slices[i], 1, 1]] as const) {
        sp.setCrop(i * sw, 0, sw + 0.3, H).setVisible(true).setPosition(Math.round(px - Math.cos(ang) * i * sw * DS * sc), Math.round(py - Math.sin(ang) * i * sw * DS * sc)).setRotation(ang).setScale(DS * sc, DS * sc * (0.6 + 0.4 * (i / N))).setAlpha(a * al).setOrigin(0, 0.5);
      }
    }
    // shed sparks behind the head
    if (ctx.dt > 0 && !ctx.reduced && tl < 0.4) for (let i = 0; i < 2; i++) this.spawn('star', hx - d.dx * rnd() * 90 + nx * (rnd() - 0.5) * 30, hy - d.dy * rnd() * 90 + ny * (rnd() - 0.5) * 30, { depth: 11.6, life: 0.25, tint: HOT, s0: 0.2, s1: 0.06, a0: 1, a1: 0, rot: rnd() });
    // ground light along the lane
    this.g.lineStyle(10, 0xffa21c, 0.18 * fade); this.g.lineBetween(d.sx, d.sy, hx, hy + 18);
  }

  /** Cometbreaker: gather = growing core + inward streaks + a lane tick; fire = layered gold-to-white beam that starts focused and opens wide, laced with lightning, then collapses. */
  private drawCannon(ctx: CometCtx, charging: boolean) {
    const s = ctx.state, c = s.cast; this.core.setVisible(false); this.beamTex.setVisible(false); this.handGlow.forEach(g => g.setVisible(false)); this.lane.forEach(g => g.setVisible(false));
    const comet = c?.kind === 'comet' ? c : null;
    if (comet && !comet.released) {
      const o = ctx.hand ? ctx.hand.m : { x: ctx.x, y: ctx.y - 40 }, u = clamp01(comet.t / CANNON.gather), front = comet.face === 'north' ? 10.6 : 11;
      this.core.setVisible(true).setPosition(o.x, o.y).setDepth(front).setTint(WHITE).setScale(0.12 + 0.95 * u * u).setRotation(this.clock * 5).setAlpha(0.6 + 0.4 * u);
      // light comes only from the fists: a smooth radial glow at each hand and at the gathering orb, never a drawn disc, box or bar
      const hg = this.handGlow, hn = ctx.hand?.n ?? o, hf = ctx.hand?.f ?? o;
      hg[0].setVisible(true).setPosition(o.x, o.y).setDepth(front - 0.05).setTint(GOLD).setScale((0.22 + 1.1 * u) * 1.0).setAlpha(0.35 + 0.4 * u);
      hg[1].setVisible(true).setPosition(hn.x, hn.y).setDepth(front - 0.05).setTint(HOT).setScale(0.2 + 0.28 * u).setAlpha(0.3 + 0.45 * u);
      hg[2].setVisible(true).setPosition(hf.x, hf.y).setDepth(front - 0.05).setTint(HOT).setScale(0.2 + 0.28 * u).setAlpha(0.3 + 0.45 * u);
      const reach = CANNON.length * 0.7 * u;   // the lane: a dotted trail of glints that fades with distance
      this.lane.forEach((im, i) => { const f = (i + 1) / this.lane.length; im.setVisible(u > 0.08).setPosition(o.x + comet.dirX * reach * f, o.y + comet.dirY * reach * f).setRotation(Math.atan2(comet.dirY, comet.dirX)).setScale(0.12 + 0.1 * (1 - f)).setAlpha((0.55 - 0.45 * f) * Math.min(1, u * 3)); });
      if (ctx.dt > 0 && !ctx.reduced) { this.sparkClock += ctx.dt; while (this.sparkClock > 0.04) { this.sparkClock -= 0.04; const a = rnd() * 6.283, r = 70 + rnd() * 40; this.spawn('bolt_h0', o.x + Math.cos(a) * r, o.y + Math.sin(a) * r * 0.8, { depth: 11.5, life: 0.2, tint: HOT, vx: -Math.cos(a) * r / 0.2, vy: -Math.sin(a) * r * 0.8 / 0.2, s0: 0.5, s1: 0.15, a0: 0.2 + 0.7 * u, a1: 1, rot: a + Math.PI }); } }
      return;
    }
    void charging;
    const b = this.beam; if (!b) return; b.age += ctx.dt;
    const tf = b.age, closeAt = b.fire, env = tf < closeAt ? Math.min(1, tf / 0.08) * (1 - 0.4 * clamp01((tf - (closeAt - 0.3)) / 0.3)) : clamp01(1 - (tf - closeAt) / 0.3);
    if (env <= 0) { this.beam = null; return; }
    const o = ctx.hand && c?.kind === 'comet' ? ctx.hand.m : { x: b.ox, y: b.oy }; const ang = Math.atan2(b.dy, b.dx), nx = -b.dy, ny = b.dx, front = b.face === 'north' ? 9.5 : 10.6;
    const hw = cannonHalfWidth(s, Math.min(tf, closeAt)) * (tf < closeAt ? 1 : (1 - clamp01((tf - closeAt) / 0.3))) * (0.96 + 0.04 * Math.sin(this.clock * 60));
    const ex = o.x + b.dx * b.len, ey = o.y + b.dy * b.len, w0 = hw * 0.12;
    // layered body: wide gold haze -> bright gold -> white core, each a quad that opens from the fists to the full width
    const layers = [[1.0, GOLD, 0.16], [0.78, 0xffb82a, 0.26], [0.55, HOT, 0.4], [0.32, WHITE, 0.7], [0.16, 0xffffff, 0.9]] as const;
    for (const [f, col, al] of layers) {
      this.g.fillStyle(col, al * env); const a0 = w0 * f, a1 = hw * f, mid = hw * f * 0.92;
      this.g.fillPoints([new Phaser.Math.Vector2(o.x + nx * a0, o.y + ny * a0), new Phaser.Math.Vector2(o.x + b.dx * b.len * 0.22 + nx * mid, o.y + b.dy * b.len * 0.22 + ny * mid), new Phaser.Math.Vector2(ex + nx * a1, ey + ny * a1),
        new Phaser.Math.Vector2(ex - nx * a1, ey - ny * a1), new Phaser.Math.Vector2(o.x + b.dx * b.len * 0.22 - nx * mid, o.y + b.dy * b.len * 0.22 - ny * mid), new Phaser.Math.Vector2(o.x - nx * a0, o.y - ny * a0)], true);
    }
    // scrolling energy texture inside the lane (ImageGen beam segment) for living detail
    this.beamTex.setVisible(true).setPosition(o.x, o.y).setRotation(ang).setDepth(front + 0.05).setAlpha(0.55 * env);
    this.beamTex.width = Math.max(10, b.len); const sy = (hw * 1.5) / this.beamTex.height; this.beamTex.setScale(1, Math.max(0.05, sy)); this.beamTex.tilePositionX -= 700 * ctx.dt;
    this.handGlow[0].setVisible(true).setPosition(o.x, o.y).setDepth(front - 0.05).setTint(HOT).setScale(1.5 * Math.max(0.3, env)).setAlpha(0.7 * env);
    this.core.setVisible(true).setPosition(o.x, o.y).setDepth(front + 0.1).setTint(WHITE).setScale((0.9 + 0.12 * Math.sin(this.clock * 40)) * Math.max(0.3, env)).setRotation(this.clock * 7).setAlpha(0.95);
    // floor light along the lane + a standing glow where it ends
    this.under.lineStyle(Math.max(6, hw * 1.5), 0xffa21c, 0.12 * env); this.under.lineBetween(o.x, o.y + 22, ex, ey + 22);
    this.g.fillStyle(WHITE, 0.4 * env); this.g.fillCircle(ex, ey, 7 + hw * 0.18);
    if (ctx.dt > 0 && !ctx.reduced && env > 0.4) {   // lightning lacing both edges and the occasional ground scar under the beam
      this.sparkClock += ctx.dt; const every = ctx.crowded ? 0.07 : 0.035;
      while (this.sparkClock > every) { this.sparkClock -= every; const d = rnd() * b.len, side = rnd() < 0.5 ? -1 : 1, off = side * hw * (0.7 + rnd() * 0.5);
        this.spawn(pick(['bolt_h0', 'bolt_h1', 'bolt_h2', 'bolt_h3']), o.x + b.dx * d + nx * off, o.y + b.dy * d + ny * off, { depth: front + 0.2, life: 0.14, tint: pick([HOT, WHITE]), rot: ang + (rnd() - 0.5) * 0.5, s0: 0.9, s1: 1.2, a0: 1, a1: 0, sy: side }); }
      if (rnd() < ctx.dt * 3) this.crack(o.x + b.dx * (60 + rnd() * b.len * 0.8), o.y + b.dy * (60 + rnd() * b.len * 0.8) + 22, 0.8, 1.1, true);
    }
  }
  /** Reveal / finisher flash for the hero sprite tint (white-hot for a few frames). */
  destroy() {
    this.ground.destroy(); this.handGlow.forEach(g => g.destroy()); this.lane.forEach(g => g.destroy()); this.g.destroy(); this.under.destroy(); this.dim.destroy(); this.flashRect.destroy(); this.rim.forEach(r => r.destroy()); [...this.slices, ...this.glowSlices].forEach(i => i.destroy()); this.beamTex.destroy(); this.core.destroy();
    this.ghosts.forEach(g => g.spr.destroy()); this.ghosts = []; this.pool.destroy();
  }
}
void COMET; void DRAGON;

import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { RIFT } from '../../content/stillfire';
import { beamOrigin } from '../../sim/AbilitySystem';
import type { Facing, HandAnchor } from '../../assets/kaiAnimation';
import { FxPool } from './fxPool';

/** B13 Stillfire Apex effects: silver / ice-white, thin and quiet. Sprites are ImageGen art cut by art/characters/kai/form-iii/fx-scripts (manifest.json lists what exists; anything missing is skipped, never an error). */
export const F3_FX_MANIFEST_KEY = 'f3fx-manifest';
export const F3_FX_MANIFEST_URL = '/art/fx/kai-form3/manifest.json';
export const f3fxKey = (n: string) => `f3fx-${n}`;
export const f3fxUrl = (n: string) => `/art/fx/kai-form3/${n}.png`;

const SILVER = 0xdcecff, ICE = 0xa9d4ff, WHITE = 0xffffff, ROCK = 0xc4ccd8;
const rnd = Math.random;
const pick = <T,>(a: readonly T[]) => a[(rnd() * a.length) | 0];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (u: number) => { u = clamp01(u); return u * u * (3 - 2 * u); };

export interface ApexCtx {
  dt: number; state: GameState; hero: Phaser.GameObjects.Sprite; x: number; y: number; facing: Facing; reduced: boolean; crowded: boolean;
  /** Form III art is on screen (visual form f3, alive), the Kai sprite moved this frame, the dash is running, and the on-screen fist anchor of the current frame (Beam / Sphere clips). */
  f3: boolean; moving: boolean; speed: number; dashing: boolean; hand: HandAnchor | null; events: readonly string[];
}
interface Ghost { spr: Phaser.GameObjects.Sprite; age: number; life: number; a0: number; tint: number }
interface Beam { ox: number; oy: number; dx: number; dy: number; len: number; age: number; fire: number; tier: number }

/** Everything Stillfire Apex adds on screen: hover shadow, the breathing silver aura (idle / glide / dash / charge / release), the quiet reveal, Silver Rift (reticle, blink, beam), Instinct Reversal strikes, Perfect Evasion ghosts and the silent finisher.
 *  Pure render state driven by dt; it reads the sim (cast, cinema, events) and never writes it. */
export class ApexFx {
  private readonly pool: FxPool;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly under: Phaser.GameObjects.Graphics;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly cool: Phaser.GameObjects.Rectangle;
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly shadow: Phaser.GameObjects.Image | null;
  private readonly halo: Phaser.GameObjects.Image | null;
  private readonly halo2: Phaser.GameObjects.Image | null;
  private auraClock = 0;
  private readonly beamTex: Phaser.GameObjects.TileSprite | null;
  private readonly core: Phaser.GameObjects.Image | null;
  private ghosts: Ghost[] = [];
  private beam: Beam | null = null;
  private clock = 0; private level = 0; private lastEvent = 0; private flashA = 0; private flashRate = 5; private zoomMul = 1; private hitstop = 0; private dimA = 0; private coolA = 0;
  private dirX = 0; private dirY = 0; private wispClock = 0; private moteClock = 0; private rockClock = 1; private distortClock = 2; private dashWas = false; private tierSeen = 0; private reticleClock = 0;
  private flowClock = 0; private prevX = NaN; private prevY = NaN;
  constructor(private readonly scene: Phaser.Scene) {
    this.pool = new FxPool(scene, 130);
    this.g = scene.add.graphics().setDepth(10.45).setBlendMode(Phaser.BlendModes.ADD); this.under = scene.add.graphics().setDepth(3.55).setBlendMode(Phaser.BlendModes.ADD);
    this.dim = scene.add.rectangle(0, 0, 4000, 3000, 0x070a12, 1).setScrollFactor(0).setDepth(40).setAlpha(0).setVisible(false).setOrigin(0.5);
    this.cool = scene.add.rectangle(0, 0, 4000, 3000, 0x93a3b8, 1).setScrollFactor(0).setDepth(40.2).setAlpha(0).setVisible(false).setOrigin(0.5);
    this.flashRect = scene.add.rectangle(0, 0, 4000, 3000, 0xeaf4ff, 1).setScrollFactor(0).setDepth(41).setAlpha(0).setVisible(false).setOrigin(0.5);
    this.shadow = this.has('shadow_soft') ? scene.add.image(0, 0, f3fxKey('shadow_soft')).setDepth(3.8).setVisible(false) : null;
    // soft, outline-free glow (smooth radial gradient) in two layers that breathe out of phase: no hard capsule edge, nothing that looks like a static sprite
    const gk = f3fxKey('glow');
    if (!scene.textures.exists(gk)) {
      const cv = scene.textures.createCanvas(gk, 128, 192); const cx = cv?.getContext();
      if (cv && cx) { const g = cx.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.6)'); g.addColorStop(0.35, 'rgba(225,238,255,0.3)'); g.addColorStop(0.7, 'rgba(200,225,255,0.09)'); g.addColorStop(1, 'rgba(200,225,255,0)'); cx.setTransform(1, 0, 0, 1.5, 0, 0); cx.fillStyle = g; cx.fillRect(0, 0, 128, 128); cv.refresh(); }
    }
    this.halo = scene.textures.exists(gk) ? scene.add.image(0, 0, gk).setDepth(9.6).setBlendMode(Phaser.BlendModes.ADD).setTint(SILVER).setVisible(false) : null;
    this.halo2 = scene.textures.exists(gk) ? scene.add.image(0, 0, gk).setDepth(9.55).setBlendMode(Phaser.BlendModes.ADD).setTint(ICE).setVisible(false) : null;
    this.beamTex = this.has('rift_beam_seg') ? scene.add.tileSprite(0, 0, 10, scene.textures.get(f3fxKey('rift_beam_seg')).getSourceImage().height, f3fxKey('rift_beam_seg')).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.5).setVisible(false) : null;
    this.core = this.has('rift_core') ? scene.add.image(0, 0, f3fxKey('rift_core')).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.9).setVisible(false) : null;
  }
  private has(n: string) { return this.scene.textures.exists(f3fxKey(n)); }
  /** Camera factor of the reveal and a pending visual hit-stop (ms, skipped sim ticks). */
  cameraZoom() { return this.zoomMul; }
  takeHitstop() { const h = this.hitstop; this.hitstop = 0; return h; }
  get flashing() { return this.flashA > 0.05; }
  /** 1 normally; the dash briefly vanishes Kai (the afterimage stays behind). */
  heroAlphaMul = 1;

  private spawn(key: string, x: number, y: number, o: { depth?: number; life: number; blend?: 'add' | 'normal'; tint?: number; vx?: number; vy?: number; ay?: number; s0?: number; s1?: number; a0?: number; a1?: number; rot?: number; spin?: number; delay?: number; ox?: number; oy?: number; sy?: number; fadeIn?: number }) {
    if (!this.has(key)) return;
    this.pool.spawn({ key: f3fxKey(key), x, y, depth: o.depth ?? 11, blend: o.blend ?? 'add', tint: o.tint ?? SILVER, ...o });
  }
  private pulse(a: number, rate: number) { this.flashA = Math.max(this.flashA, a); this.flashRate = rate; }
  private ring(x: number, y: number, s: number, life = 0.6, tint = SILVER, a = 0.7) { this.spawn('ring_ripple', x, y, { depth: 3.7, life, tint, s0: 0.2, s1: s, a0: a, a1: 0, sy: 0.7 }); }
  private ghost(hero: Phaser.GameObjects.Sprite, life: number, a: number, tint = SILVER, x = hero.x, y = hero.y) {
    if (this.ghosts.length >= 9) return;
    const spr = this.scene.add.sprite(x, y, hero.texture.key, hero.frame.name).setOrigin(hero.originX, hero.originY).setScale(hero.scaleX, hero.scaleY).setDepth(9.4).setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setAlpha(a);
    spr.setTintMode(Phaser.TintModes.FILL); this.ghosts.push({ spr, age: 0, life, a0: a, tint });
  }
  private strikeFlash(x: number, y: number, s = 1, delay = 0) {
    this.spawn(pick(['strike_flash_a', 'strike_flash_b']), x, y, { depth: 11.4, life: 0.22, tint: WHITE, s0: 0.5 * s, s1: 1.1 * s, a0: 1, a1: 0, delay, rot: (rnd() - 0.5) * 0.8 });
    this.spawn('ring_ripple', x, y, { depth: 11.3, life: 0.3, tint: ICE, s0: 0.15 * s, s1: 0.6 * s, a0: 0.8, a1: 0, delay });
  }
  private floatRocks(x: number, y: number, n: number, spread: number, life = 1.6) {
    for (let i = 0; i < n; i++) this.spawn(pick(['rock_a', 'rock_b', 'rock_c']), x + (rnd() - 0.5) * spread, y + (rnd() - 0.5) * 8, { depth: pick([4.3, 11.5]), life: life * (0.7 + rnd() * 0.6), blend: 'normal', tint: ROCK, vy: -(14 + rnd() * 26), vx: (rnd() - 0.5) * 14, s0: 0.55, s1: 0.5, a0: 1, a1: 0, spin: (rnd() - 0.5) * 2.2, rot: rnd() * 6, fadeIn: 0.15 });
  }

  update(c: ApexCtx) {
    const { dt, state: s, hero } = c; const cin = s.cinema && s.cinema.to === 3 ? s.cinema : null;
    if (c.dt > 0) this.clock += dt;
    const k = hero.scaleX / 0.5, bodyY = c.y - 40 * k;
    const reduced = c.reduced, thin = reduced ? 0.4 : c.crowded ? 0.55 : 1;
    // ---- events raised by the sim since the last frame
    for (const ev of s.abilityEvents) {
      if (ev.id <= this.lastEvent) continue; this.lastEvent = ev.id;
      switch (ev.kind) {
        case 'form3_start': this.tierSeen = 0; break;
        case 'form3_commit': this.ring(ev.x, c.y, 2.4, 0.9, WHITE, 0.8); this.pulse(reduced ? 0.12 : 0.28, 4); for (let i = 0; i < 10; i++) this.spawn('mote_a', ev.x + (rnd() - 0.5) * 40 * k, bodyY + (rnd() - 0.5) * 60 * k, { life: 0.9, tint: WHITE, vx: (rnd() - 0.5) * 70, vy: -20 - rnd() * 50, s0: 0.7, s1: 0.2, a0: 1, a1: 0 }); break;
        case 'form3_break': this.ring(ev.x, c.y, 5, 1.1, SILVER, 0.55); this.spawn('distort_ring', ev.x, c.y, { depth: 3.6, life: 1.2, tint: ICE, s0: 0.3, s1: 3.6, a0: 0.28, a1: 0, sy: 0.7 }); this.floatRocks(ev.x, c.y, reduced ? 3 : 9, 120, 2.4); this.pulse(reduced ? 0.1 : 0.2, 3); if (!reduced) this.scene.cameras.main.shake(90, 0.0012); break;
        case 'rift_blink': { const nx = s.player.x; this.spawn('blink_streak', (ev.x + nx) / 2, ev.y + (c.y - s.player.y) - 38 * k, { depth: 10.2, life: 0.2, tint: WHITE, s0: Math.max(0.4, Math.hypot(nx - ev.x, s.player.y - ev.y) / 120), s1: Math.max(0.4, Math.hypot(nx - ev.x, s.player.y - ev.y) / 120), a0: 0.9, a1: 0, rot: Math.atan2(s.player.y - ev.y, nx - ev.x) }); this.ghost(hero, 0.35, 0.5, SILVER, ev.x, ev.y + (c.y - s.player.y)); this.ring(nx, c.y, 1.4, 0.45, SILVER, 0.7); break; }
        case 'rift_fire': { const cast = s.cast; this.pulse(reduced ? 0 : 0.12, 9); if (cast && cast.kind === 'rift') { const o = c.hand?.m ?? beamOrigin(s, cast); this.beam = { ox: o.x, oy: o.y, dx: cast.dirX, dy: cast.dirY, len: cast.len, age: 0, fire: RIFT.fire[cast.tier ?? 0], tier: cast.tier ?? 0 }; this.spawn('rift_flash', o.x, o.y, { depth: 11.5, life: 0.28, tint: WHITE, s0: 0.5 + 0.3 * (cast.tier ?? 0), s1: 1.3 + 0.4 * (cast.tier ?? 0), a0: 1, a1: 0 }); this.ring(o.x, o.y, 1.6 + 0.4 * (cast.tier ?? 0), 0.5, SILVER, 0.7); } break; }
        case 'reversal_hit': { this.strikeFlash(ev.x, ev.y - 22 * k, 1); this.spawn('strike_slash', ev.x, ev.y - 22 * k, { depth: 11.3, life: 0.2, tint: WHITE, s0: 0.9, s1: 1.2, a0: 1, a1: 0, rot: (ev.n ?? 0) * 1.1 + 0.4 }); if (Number.isFinite(this.prevX)) this.ghost(hero, 0.42, 0.45, SILVER, this.prevX, this.prevY); break; }
        case 'reversal_flash': this.strikeFlash(ev.x, ev.y - 22 * k, 1.35); break;
        case 'reversal_end': this.ring(ev.x, c.y, 2.2, 0.5, WHITE, 0.6); break;
        case 'evasion': { this.ghost(hero, 0.6, 0.7, 0xf2f8ff, ev.x, ev.y + (c.y - s.player.y)); this.ring(ev.x, ev.y + (c.y - s.player.y), 1.8, 0.5, WHITE, 0.8); this.spawn('afterimage_streak', (ev.x + s.player.x) / 2, bodyY, { depth: 10.2, life: 0.22, tint: WHITE, a0: 0.8, a1: 0, rot: Math.atan2(s.player.y - ev.y, s.player.x - ev.x) }); break; }
        case 'finisher3': {
          this.hitstop = Math.max(this.hitstop, reduced ? 0 : 150); const fy = ev.y + (c.y - s.player.y) - 30 * k;
          for (let i = 0; i < (reduced ? 3 : 8); i++) this.strikeFlash(ev.x + (rnd() - 0.5) * 70, fy + (rnd() - 0.5) * 50, 1.2, 0.18 + i * 0.035);
          this.spawn('finisher_pulse', ev.x, fy, { depth: 11.6, life: 1.0, tint: WHITE, s0: 0.2, s1: reduced ? 2.2 : 3.6, a0: 0.9, a1: 0, delay: 0.5 }); this.ring(ev.x, ev.y + (c.y - s.player.y), 6, 1.2, SILVER, 0.6);
          for (let i = 0; i < (reduced ? 6 : 16); i++) { const a = rnd() * 6.283; this.spawn(pick(['finisher_mote_a', 'finisher_mote_b', 'finisher_mote_c']), ev.x, fy, { depth: 11.6, life: 1.1, tint: WHITE, vx: Math.cos(a) * (40 + rnd() * 90), vy: Math.sin(a) * (30 + rnd() * 60) - 30, s0: 0.8, s1: 0.2, a0: 1, a1: 0, delay: 0.5 + rnd() * 0.1, rot: rnd() * 6 }); }
          this.ghost(hero, 0.55, 0.55, 0xf2f8ff, ev.x + 26, fy + 40 * k); this.dimA = Math.max(this.dimA, reduced ? 0 : 0.25); this.flashA = Math.max(this.flashA, reduced ? 0 : 0.18); this.flashRate = 2.5; break;
        }
        default: break;
      }
    }
    this.prevX = c.x; this.prevY = c.y;
    // ---- cinematic (the run is frozen; this is purely presentation)
    let dimT = 0, coolT = 0, zoomT = 1;
    if (cin) {
      const t = cin.t, tailT = Math.max(0, cin.dur - t);
      const peakDim = cin.first ? 0.42 : 0.22, peakCool = cin.first ? 0.16 : 0.07, peakZoom = cin.first ? 1.42 : 1.12;
      const inK = smooth(t / (cin.first ? 0.7 : 0.3)), outK = smooth(tailT / (cin.first ? 0.8 : 0.35));
      const k2 = Math.min(inK, outK);
      dimT = reduced ? peakDim * 0.5 * k2 : peakDim * k2; coolT = reduced ? 0 : peakCool * k2; zoomT = reduced ? 1 : 1 + (peakZoom - 1) * smooth(t / (cin.first ? 1.6 : 0.5)) * outK;
      if (cin.first && !cin.committed && t > 0.5 && this.moteClock <= 0) {   // quiet omen: the last power pulls inward, nearly silent
        this.moteClock = 0.05 * (reduced ? 2 : 1);
        for (let i = 0; i < 2; i++) { const a = rnd() * 6.283, r = 70 + rnd() * 50; this.spawn('mote_a', c.x + Math.cos(a) * r * k, bodyY + Math.sin(a) * r * k * 0.7, { life: 0.55, tint: 0xfff2c0, vx: -Math.cos(a) * r * 1.8, vy: -Math.sin(a) * r * 1.3, s0: 0.6, s1: 0.15, a0: 0.9, a1: 0 }); }
      }
      if (cin.t > 1.1 && !cin.committed && this.rockClock <= 0) { this.rockClock = 0.16; this.floatRocks(c.x, c.y, 1, 46 * k, 1.8); this.spawn('dust_a', c.x + (rnd() - 0.5) * 40 * k, c.y, { depth: 4.2, life: 0.9, tint: ROCK, blend: 'normal', vy: -18, s0: 0.3, s1: 0.7, a0: 0.35, a1: 0 }); }
    }
    this.moteClock -= dt; this.rockClock -= dt;
    this.dimA += ((dimT || (this.dimA > 0.26 ? this.dimA : 0)) - this.dimA) * Math.min(1, dt * 7);
    if (!cin && this.dimA < 0.26) this.dimA += (0 - this.dimA) * Math.min(1, dt * 7);
    this.coolA += (coolT - this.coolA) * Math.min(1, dt * 6); this.zoomMul += (zoomT - this.zoomMul) * Math.min(1, dt * (cin ? 9 : 5)); if (Math.abs(this.zoomMul - 1) < 0.0005 && !cin) this.zoomMul = 1;
    this.dim.setVisible(this.dimA > 0.01).setAlpha(this.dimA); this.cool.setVisible(this.coolA > 0.01).setAlpha(this.coolA);
    this.flashA = Math.max(0, this.flashA - dt * this.flashRate); this.flashRect.setVisible(this.flashA > 0.01).setAlpha(this.flashA);

    // ---- hover shadow + floor light (Kai's collision stays on the ground; the sprite art is lifted)
    const show = c.f3 || !!cin;
    if (this.shadow) {
      const lift = cin ? smooth((cin.t - cin.commitAt * 0.35) / Math.max(0.2, cin.commitAt * 0.65)) : 1;
      this.shadow.setVisible(show).setPosition(Math.round(c.x), Math.round(c.y + 2)).setScale((0.62 - 0.12 * lift + 0.015 * Math.sin(this.clock * 1.6)) * k, (0.3 - 0.05 * lift) * k).setAlpha(0.42 + 0.18 * (1 - lift) + 0.04 * this.level);
    }
    // ---- aura state machine
    const cast = s.cast, charging = cast?.kind === 'rift' && !cast.released, releasing = (cast?.kind === 'rift' && !!cast.released) || (cast?.kind === 'reversal');
    const dashing = c.dashing, moving = c.moving;
    const target = !show ? 0 : dashing ? 1 : charging ? 0.55 + 0.45 * clamp01((cast?.t ?? 0) / RIFT.maxCharge) : releasing ? 0.85 : moving ? 0.42 + 0.22 * clamp01(c.speed / 300) : 0.26;
    this.level += (target - this.level) * Math.min(1, dt * (target > this.level ? 8 : 2.2));
    const L = this.level;
    if (this.halo && this.halo2) {
      this.auraClock += dt * (1 + 1.6 * L);   // the flow speeds up with the action level
      const a = this.auraClock, hs = (150 * k) / this.halo.height;
      const b1 = 0.9 + 0.1 * Math.sin(a * 1.7) + 0.04 * Math.sin(a * 4.3), b2 = 0.9 + 0.1 * Math.sin(a * 1.1 + 1.9) + 0.05 * Math.sin(a * 3.1 + 0.7);
      // lean the glow opposite the glide so it trails instead of staying a centred blob
      const lx = -(this.dirX) * 5 * k * L, ly = -(this.dirY) * 3 * k * L;
      this.halo.setVisible(show).setPosition(Math.round(c.x + lx), Math.round(bodyY + ly - 2)).setScale(hs * (0.8 + 0.16 * L) * b1, hs * (0.9 + 0.1 * L) * (2 - b1)).setAlpha((reduced ? 0.22 : 0.3 + 0.35 * L) * b1).setRotation(0.05 * Math.sin(a * 0.8) - this.dirX * 0.12 * L);
      this.halo2.setVisible(show).setPosition(Math.round(c.x + lx * 1.8), Math.round(bodyY + ly * 1.5 - 4)).setScale(hs * (0.56 + 0.12 * L) * b2, hs * (0.74 + 0.1 * L) * (2 - b2)).setAlpha((reduced ? 0.16 : 0.22 + 0.3 * L) * b2).setRotation(-0.06 * Math.sin(a * 0.9 + 1) - this.dirX * 0.18 * L);
      // continuous rising wisps that sway: the aura reads as flowing energy rather than a shape
      this.flowClock -= dt;
      if (show && dt > 0 && this.flowClock <= 0 && !cin) {
        this.flowClock = (0.11 - 0.05 * L) / thin;
        const side = rnd() < 0.5 ? -1 : 1, off = (10 + rnd() * 12) * k, ph = rnd() * 6.283;
        this.spawn(pick(['aura_wisp_a', 'aura_wisp_b', 'aura_wisp_c']), c.x + side * off, c.y - (4 + rnd() * 18) * k, { depth: 9.5, life: 0.95 + rnd() * 0.5, tint: SILVER, vy: -(34 + 30 * L + rnd() * 18), vx: side * (4 + rnd() * 8) + Math.sin(ph) * 6, s0: (0.55 + rnd() * 0.3) * k, s1: (0.9 + rnd() * 0.4) * k, a0: 0.5 + 0.2 * L, a1: 0, rot: -Math.PI / 2 + side * 0.18 * Math.sin(ph), spin: side * (0.4 + rnd() * 0.5) * (rnd() < 0.5 ? 1 : -1), fadeIn: 0.3 });
      }
    }
    this.under.clear();
    if (show) { this.under.fillStyle(SILVER, (0.05 + 0.1 * L) * (reduced ? 0.6 : 1)); this.under.fillEllipse(c.x, c.y + 3, (56 + 44 * L) * k, (20 + 12 * L) * k); }
    // movement direction (smoothed): trails flow opposite
    const dxi = s.player.vx, dyi = s.player.vy, sp = Math.hypot(dxi, dyi);
    if (sp > 20) { const tx = dxi / sp, ty = dyi / sp; this.dirX += (tx - this.dirX) * Math.min(1, dt * 9); this.dirY += (ty - this.dirY) * Math.min(1, dt * 9); } else { this.dirX *= 1 - Math.min(1, dt * 6); this.dirY *= 1 - Math.min(1, dt * 6); }
    const dm = Math.hypot(this.dirX, this.dirY);
    if (show && dt > 0) {
      this.wispClock -= dt;
      if ((moving || dashing) && dm > 0.2 && this.wispClock <= 0) {
        this.wispClock = (dashing ? 0.018 : 0.06) / thin; const nx = this.dirX / dm, ny = this.dirY / dm;
        this.spawn(pick(['aura_wisp_a', 'aura_wisp_b', 'aura_wisp_c']), c.x - nx * 10 * k + (rnd() - 0.5) * 14 * k, bodyY + (rnd() - 0.5) * 40 * k, { depth: 9.5, life: dashing ? 0.3 : 0.5, tint: SILVER, vx: -nx * (dashing ? 160 : 70), vy: -ny * (dashing ? 160 : 70) - 8, s0: 0.7 * k, s1: 1.1 * k, a0: 0.55, a1: 0, rot: Math.atan2(-ny, -nx), fadeIn: 0.15 });
      }
      if (!moving && !dashing && this.moteClock <= 0 && !cin) { this.moteClock = 0.5 / thin; this.spawn(pick(['mote_a', 'mote_b']), c.x + (rnd() - 0.5) * 36 * k, bodyY + (rnd() - 0.5) * 50 * k, { life: 1.3, tint: WHITE, vy: -16 - rnd() * 14, vx: (rnd() - 0.5) * 8, s0: 0.5, s1: 0.2, a0: 0.9, a1: 0, fadeIn: 0.2 }); }
      this.distortClock -= dt;
      if (!reduced && !moving && !dashing && this.distortClock <= 0 && !cin) { this.distortClock = 2.6 + rnd() * 1.2; this.spawn('distort_ring', c.x, bodyY, { depth: 9.3, life: 1.6, tint: ICE, s0: 0.25 * k, s1: 0.9 * k, a0: 0.16, a1: 0, sy: 1.15 }); }
      if (!reduced && !cin && this.rockClock <= 0 && !dashing) { this.rockClock = (moving ? 1.8 : 1.1) / thin; this.floatRocks(c.x, c.y + 2, 1, 38 * k, 1.5); }
    }
    // ---- dash: the body vanishes, a silver afterimage stays at the departure point
    if (dashing && !this.dashWas) { this.ghost(hero, 0.55, 0.65, SILVER, c.x, c.y); this.spawn('afterimage_streak', c.x, bodyY, { depth: 10.2, life: 0.25, tint: WHITE, a0: 0.8, a1: 0, rot: Math.atan2(s.player.dashDy, s.player.dashDx) }); this.ring(c.x, c.y, 1.3, 0.4, SILVER, 0.6); }
    if (!dashing && this.dashWas) { this.ring(c.x, c.y, 1.7, 0.5, WHITE, 0.55); this.floatRocks(c.x, c.y, reduced ? 1 : 3, 40 * k, 1.3); }
    this.dashWas = dashing;
    this.heroAlphaMul = dashing ? 0.22 : 1;

    // ---- Silver Rift: aim reticle + gathering orb while E is held
    this.g.clear();
    if (charging && cast) {
      const o = c.hand?.m ?? beamOrigin(s, cast), ch = clamp01(cast.t / RIFT.maxCharge), dx = cast.dirX, dy = cast.dirY, len = 120 + 300 * ch;
      this.g.lineStyle(1.5, SILVER, 0.16 + 0.34 * ch).beginPath().moveTo(o.x + dx * 24, o.y + dy * 24).lineTo(o.x + dx * len, o.y + dy * len).strokePath();
      this.g.lineStyle(1, WHITE, 0.4 * ch).beginPath().moveTo(o.x + dx * 24, o.y + dy * 24).lineTo(o.x + dx * (len * 0.6), o.y + dy * (len * 0.6)).strokePath();
      this.reticleClock -= dt;
      this.spawn('rift_reticle_ring', o.x + dx * len, o.y + dy * len, { depth: 10.4, life: 0.07, tint: SILVER, s0: 0.5 + 0.3 * ch, s1: 0.5 + 0.3 * ch, a0: 0.8, a1: 0.8 });
      for (let d = 70; d < len - 20; d += 70) this.spawn('rift_reticle_tick', o.x + dx * d, o.y + dy * d, { depth: 10.4, life: 0.07, tint: SILVER, s0: 0.5, s1: 0.5, a0: 0.55 * ch + 0.15, a1: 0.55 * ch + 0.15, rot: Math.atan2(dy, dx) });
      if (this.core) { const pulse = 0.9 + 0.1 * Math.sin(this.clock * 18); this.core.setVisible(true).setPosition(Math.round(o.x), Math.round(o.y)).setScale((0.28 + 0.62 * ch) * pulse * k).setAlpha(0.55 + 0.4 * ch).setRotation(this.clock * 2); }
      if (this.moteClock <= 0 || ch > 0) { if (rnd() < 0.55 * thin) { const a = rnd() * 6.283, r = 36 + rnd() * 34; this.spawn('mote_b', o.x + Math.cos(a) * r, o.y + Math.sin(a) * r * 0.8, { life: 0.22, tint: WHITE, vx: -Math.cos(a) * r * 4, vy: -Math.sin(a) * r * 3.2, s0: 0.55, s1: 0.15, a0: 0.9, a1: 0 }); } }
      const tier = ch * RIFT.maxCharge >= RIFT.tier2At ? 2 : ch * RIFT.maxCharge >= RIFT.tier1At ? 1 : 0;
      if (tier > this.tierSeen) { this.tierSeen = tier; this.ring(o.x, o.y, 1.2 + 0.4 * tier, 0.4, WHITE, 0.8); }
    } else { this.core?.setVisible(false); if (!charging) this.tierSeen = 0; }
    // ---- Silver Rift beam (thin bright core, soft falloff, opens quickly and thins out)
    const b = this.beam;
    if (b) {
      b.age += dt; const u = b.age / b.fire;
      if (u >= 1.25) { this.beam = null; this.beamTex?.setVisible(false); }
      else {
        const hw = RIFT.halfWidth[b.tier], open = smooth(b.age / 0.07), fade = 1 - smooth((u - 0.7) / 0.55), th = hw * (0.55 + 0.45 * open) * (0.6 + 0.4 * fade), ang = Math.atan2(b.dy, b.dx);
        if (this.beamTex) { this.beamTex.setVisible(true).setPosition(b.ox, b.oy).setRotation(ang); this.beamTex.width = b.len; this.beamTex.setScale(1, (th * 2) / this.beamTex.height * 1.6).setAlpha(fade * (0.75 + 0.25 * Math.sin(this.clock * 40))); this.beamTex.tilePositionX -= dt * 380; }
        this.g.lineStyle(Math.max(1.5, th * 0.35), WHITE, 0.85 * fade).beginPath().moveTo(b.ox, b.oy).lineTo(b.ox + b.dx * b.len, b.oy + b.dy * b.len).strokePath();
        this.g.lineStyle(th * 1.4, ICE, 0.16 * fade).beginPath().moveTo(b.ox, b.oy).lineTo(b.ox + b.dx * b.len, b.oy + b.dy * b.len).strokePath();
      }
    }
    // ---- ghosts
    for (let i = this.ghosts.length - 1; i >= 0; i--) { const g = this.ghosts[i]; g.age += dt; if (g.age >= g.life) { g.spr.destroy(); this.ghosts.splice(i, 1); continue; } g.spr.setAlpha(g.a0 * (1 - g.age / g.life) ** 1.4); }
    this.pool.update(dt);
  }
  clear() { this.pool.clear(); for (const g of this.ghosts) g.spr.destroy(); this.ghosts = []; this.beam = null; this.beamTex?.setVisible(false); this.core?.setVisible(false); this.dim.setVisible(false); this.cool.setVisible(false); this.flashRect.setVisible(false); this.zoomMul = 1; this.dimA = 0; this.coolA = 0; this.flashA = 0; this.g.clear(); this.under.clear(); this.shadow?.setVisible(false); this.halo?.setVisible(false); this.halo2?.setVisible(false); }
  destroy() { this.clear(); this.pool.destroy(); this.g.destroy(); this.under.destroy(); this.dim.destroy(); this.cool.destroy(); this.flashRect.destroy(); this.shadow?.destroy(); this.halo?.destroy(); this.halo2?.destroy(); this.beamTex?.destroy(); this.core?.destroy(); }
}

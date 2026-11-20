import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { BEAM, SPHERE, ABILITY_FEEL } from '../../content/abilities';
import { beamLength, beamOrigin, sphereOrigin } from '../../sim/AbilitySystem';
import type { HandAnchor } from '../../assets/kaiAnimation';
import { FxPool, vfxKey } from './fxPool';
import { evolution, tierSparks } from './buildEvolution';

export const ABILITY_FX_NAMES = ['beam_seg', 'muzzle', 'impact', 'orb', 'streak', 'sphere', 'trail', 'ring', 'flash', 'dome'] as const;
export const abilityFxKey = (n: string) => `abfx-${n}`;
export const abilityFxUrl = (n: string) => `/art/fx/kai-abilities/${n}.png`;

/** FX art is drawn in 5x5-px blocks like the Form I set; 1 art pixel = 1 screen pixel, which matches Kai's displayed pixel grid. */
const K = 1;
const BASE_TINT = { aura: 0x2fb4e6, core: 0xbfeeff };
/** Form I: a true gold (the shared Solar core is nearly white, which turned the beam into a cream slab). */
const SOLAR_TINT = { aura: 0xff9d1c, core: 0xffd777 };
/** Visual hit-pause: FX/particles run at this fraction of real time for a few frames after a connecting pulse or a burst. The simulation is never paused or slowed. */
const HIT_PAUSE = { scale: 0.18, pulse: 0.055, burst: 0.1 };

interface P { img: Phaser.GameObjects.Image; age: number; life: number; x: number; y: number; vx: number; vy: number; s0: number; s1: number; a0: number; a1: number; rot: number; delay: number }
type Spawn = Partial<P> & { life: number };

/** Beam, orb, sphere and detonation visuals. Everything is a function of the sim state (cast / sphere / blasts), the on-screen fist anchors and a render dt that is 0 while paused, so it freezes with the game. */
export class AbilityFx {
  private pool: P[] = [];
  private g: Phaser.GameObjects.Graphics;
  private beamCore: Phaser.GameObjects.TileSprite;
  private beamGlow: Phaser.GameObjects.TileSprite;
  private muzzle: Phaser.GameObjects.Image;
  private orb: Phaser.GameObjects.Image;
  private sphere: Phaser.GameObjects.Image;
  private trail: Phaser.GameObjects.Image;
  private readonly vfx: FxPool;
  private readonly zone: Phaser.GameObjects.Image; private readonly rune: Phaser.GameObjects.Image; private readonly closing: Phaser.GameObjects.Image; private readonly swirl: Phaser.GameObjects.Image; private readonly zoneFill: Phaser.GameObjects.Graphics;
  private lastEvent = 0;
  private clock = 0;
  private streakClock = 0;
  private moteClock = 0;
  private pause = 0;
  private hitCast = 0;
  /** Debug/QA: last origin the beam / orb used, world px. */
  lastOrigin: { x: number; y: number; src: 'hand' | 'sim' } | null = null;
  constructor(private readonly scene: Phaser.Scene) {
    const add = (k: string) => scene.add.image(0, 0, abilityFxKey(k)).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.g = scene.add.graphics().setDepth(14.5);
    this.vfx = new FxPool(scene, 130); this.zoneFill = scene.add.graphics().setDepth(3.3);
    const tele = (n: string, d: number) => scene.add.image(0, 0, vfxKey(n, false)).setDepth(d).setVisible(false);
    this.zone = tele('circ_zone', 3.4); this.rune = tele('circ_rune', 3.5); this.closing = tele('circ_wave', 3.45); this.swirl = tele('swirl', 11.9);
    const seg = scene.textures.get(abilityFxKey('beam_seg')).getSourceImage();
    this.beamGlow = scene.add.tileSprite(0, 0, 10, seg.height, abilityFxKey('beam_seg')).setVisible(false).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0, 0.5);
    this.beamCore = scene.add.tileSprite(0, 0, 10, seg.height, abilityFxKey('beam_seg')).setVisible(false).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0, 0.5);
    this.muzzle = add('muzzle'); this.orb = add('orb'); this.sphere = add('sphere'); this.trail = add('trail').setOrigin(1, 0.5).setBlendMode(Phaser.BlendModes.SCREEN);   // SCREEN (not ADD) on purpose: an ADD trail batched with the rotating ADD sphere clipped rectangular chunks out of the sphere
  }

  /** Soft round glow behind the sphere: stacked translucent discs on the shared Graphics layer (a flat ellipse sprite would not read as a ball). */
  private glowDisc(x: number, y: number, r: number, tint: number, a: number) {
    this.g.fillStyle(tint, a * 0.22); this.g.fillCircle(x, y, r * 1.7); this.g.fillStyle(tint, a * 0.3); this.g.fillCircle(x, y, r * 1.3);
  }

  private spawn(key: string, depth: number, tint: number, o: Spawn) {
    if (this.pool.length >= 120) return;
    const img = this.scene.add.image(o.x ?? 0, o.y ?? 0, abilityFxKey(key)).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setTint(tint).setAlpha(0);
    this.pool.push({ img, age: 0, life: o.life, x: o.x ?? 0, y: o.y ?? 0, vx: o.vx ?? 0, vy: o.vy ?? 0, s0: o.s0 ?? 1, s1: o.s1 ?? 1, a0: o.a0 ?? 1, a1: o.a1 ?? 0, rot: o.rot ?? 0, delay: o.delay ?? 0 });
  }

  /** Nova Bloom detonation: scorch decal, fireball, circular shock wave that ends on the sim blast radius, rising plume, embers and debris. */
  private detonate(x: number, y: number, blast: { radius: number; form: 0 | 1 | 2 | 3 } | undefined, formVisual: boolean, reduced: boolean) {
    const R = blast?.radius ?? SPHERE.radius, solar = blast ? blast.form >= 1 : formVisual; const k = (n: string) => vfxKey(n, solar), rnd = Math.random, v = this.vfx, f = R / 190;
    v.spawn({ key: vfxKey('scorch', false), x, y: y + 4, depth: 2.8, life: 3.4, blend: 'normal', s0: (2 * R * 0.9) / 329, s1: (2 * R * 0.9) / 329, a0: 0.85, a1: 0, fadeIn: 0.03 });
    this.spawn('flash', 13.2, solar ? SOLAR_TINT.core : BASE_TINT.core, { x, y, life: 0.14, s0: 1.2, s1: 3.4 * f, a0: 0.9, a1: 0, rot: rnd() });
    v.spawn({ key: k('boom'), x, y: y - 6, depth: 13, life: 0.55, blend: 'normal', s0: 0.35 * f, s1: 1.15 * f * (solar ? 1.1 : 1), a0: 1, a1: 0, rot: 0 });
    v.spawn({ key: k('circ_wave'), x, y, depth: 12.8, life: 0.5, blend: 'normal', s0: 0.12, s1: (2 * R * 1.02) / 303, a0: 1, a1: 0 });
    v.spawn({ key: k('circ_wave'), x, y, depth: 12.7, life: 0.65, blend: 'normal', s0: 0.08, s1: (2 * R * 0.8) / 303, a0: 0.65, a1: 0, delay: 0.12 });
    v.spawn({ key: k('plume'), x, y: y - 14, depth: 12.6, life: 0.95, blend: 'normal', s0: 0.55 * f, s1: 1.25 * f, a0: 0.9, a1: 0, vy: -34, delay: 0.08 });
    v.spawn({ key: k('embers'), x, y, depth: 13.1, life: 0.85, blend: 'add', s0: 1.0 * f, s1: 2.3 * f, a0: 1, a1: 0, vy: -18 });
    if (reduced) return;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28 + rnd() * 0.4, sp = (R * (0.7 + rnd() * 0.5)) / 0.5; v.spawn({ key: vfxKey('debris' + ((rnd() * 4) | 0), solar), x, y, depth: 12.5, life: 0.7, vx: Math.cos(a) * sp * 0.7, vy: Math.sin(a) * sp * 0.6 - 120, ay: 420, s0: 1.0 + rnd() * 0.7, s1: 0.5, a0: 1, a1: 0, rot: rnd() * 6, spin: (rnd() - 0.5) * 12 }); }
    for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, sp = 220 + rnd() * 300; v.spawn({ key: vfxKey('mote' + ((rnd() * 3) | 0), solar), x, y, depth: 12.9, life: 0.4 + rnd() * 0.3, blend: 'add', ox: 1, oy: 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, rot: a, s0: 1.2, s1: 0.4, a0: 1, a1: 0 }); }
  }

  /** The charging orb: a spiral inflow around the palms plus energy motes streaming in from every side. */
  private chargeOrb(x: number, y: number, u: number, dt: number, solar: boolean, reduced: boolean) {
    this.swirl.setTexture(vfxKey('swirl', solar)).setVisible(true).setPosition(x, y).setScale(0.28 + 0.55 * u).setAlpha(0.35 + 0.6 * u).setRotation(-Math.floor(this.clock * 9) * 0.5236);
    if (dt <= 0 || reduced) return;
    this.moteClock += dt; const rnd = Math.random;
    while (this.moteClock > 0.045) {
      this.moteClock -= 0.045; const a = rnd() * 6.28, r = 70 + rnd() * 50, life = 0.26;
      this.vfx.spawn({ key: vfxKey('mote' + ((rnd() * 3) | 0), solar), x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.85, depth: 12.1, life, blend: 'add', ox: 1, oy: 0.5, rot: a + Math.PI, vx: -Math.cos(a) * r / life, vy: -Math.sin(a) * r * 0.85 / life, s0: 0.9, s1: 0.35, a0: 0.2 + 0.8 * u, a1: 1 });
    }
  }

  /** Landing-zone telegraph: a faint disc, a crisp ring with inward ticks (exactly the sim radius) and a slowly stepping rune ring; in flight a closing ring counts down to impact. */
  private telegraph(x: number, y: number, R: number, u: number, solar: boolean, flight: number) {
    const pulse = 1 + 0.012 * Math.sin(this.clock * 14), col = solar ? SOLAR_TINT.aura : BASE_TINT.aura;
    this.zoneFill.fillStyle(col, 0.07 + 0.07 * u + (flight > 0 ? 0.05 * flight : 0)); this.zoneFill.fillCircle(x, y, R);
    this.zone.setTexture(vfxKey('circ_zone', solar)).setVisible(true).setPosition(x, y).setScale((2 * R * pulse) / 277).setAlpha(0.55 + 0.4 * u);
    this.rune.setTexture(vfxKey('circ_rune', solar)).setVisible(true).setPosition(x, y).setScale((2 * R) / 288 * 0.92).setAlpha(0.35 + 0.45 * u).setRotation(Math.floor(this.clock * 6) * 0.1309);
    if (flight > 0) this.closing.setTexture(vfxKey('circ_wave', solar)).setVisible(true).setPosition(x, y).setScale(((2 * R) / 303) * (1 - 0.85 * flight)).setAlpha(0.4 + 0.5 * flight);
  }

  update(realDt: number, s: GameState, reduced: boolean, formVisual: boolean, hand: HandAnchor | null) {
    const { aura, core } = formVisual ? SOLAR_TINT : BASE_TINT;
    const p = s.player; const rnd = Math.random; const cam = this.scene.cameras.main;
    const dt = realDt * (this.pause > 0 ? HIT_PAUSE.scale : 1); this.pause = Math.max(0, this.pause - realDt);
    this.clock += dt; this.g.clear();
    const c = s.cast; const evo = evolution(s);

    for (const ev of s.abilityEvents) {
      if (ev.id <= this.lastEvent) continue; this.lastEvent = ev.id;
      if (ev.kind === 'beam_fire') {
        if (!reduced) cam.shake(ABILITY_FEEL.beamShake.ms, ABILITY_FEEL.beamShake.intensity);
        const ho = hand ? hand.m : ev;
        this.spawn('flash', 11, core, { x: ho.x, y: ho.y, life: 0.24, s0: 0.3 * K, s1: 1.05 * K, a0: 1, a1: 0, rot: rnd() * 3 });   // release flash at the fists
        this.spawn('ring', 11.2, aura, { x: ho.x, y: ho.y, life: 0.3, s0: 0.12, s1: 0.75, a0: 0.9, a1: 0, rot: 0 });             // shock ring leaves the hands
        if (!reduced) for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28 + rnd() * 0.4, v = 200 + rnd() * 180; this.spawn('streak', 11.3, i % 2 ? aura : core, { x: ho.x, y: ho.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8, life: 0.22, s0: 0.8, s1: 0.2, a0: 1, a1: 0, rot: a }); }
        this.hitCast = 0;
      } else if (ev.kind === 'beam_pulse') {
        const o = c ? beamOrigin(s, c) : null; const dir = c ? { x: c.dirX, y: c.dirY } : { x: 0, y: 0 };
        if (c && o) {   // an energy surge travelling down the lane with every damage pulse, so the beam reads as pulsing power, not a static bar
          const oo = hand ? hand.m : o;
          this.spawn('flash', 10.9, core, { x: oo.x, y: oo.y, vx: dir.x * 1100, vy: dir.y * 1100, life: Math.max(0.08, c.len / 1100), s0: 0.35, s1: 0.5, a0: 0.9, a1: 0.2, rot: rnd() * 6.28 });
        }
        this.spawn('impact', 11, core, { x: ev.x, y: ev.y, life: 0.2, s0: 0.5 * K, s1: (ev.n ? 1.25 : 0.8) * K, a0: 1, a1: 0, rot: rnd() * 6.28 });
        if (!reduced) {
          const n = (ev.n ? 6 : 3) + (ev.n ? tierSparks(evo.e, reduced) : 0); for (let i = 0; i < n; i++) { const a = rnd() * 6.28, v = 90 + rnd() * 160; this.spawn('streak', 11, i % 2 ? aura : core, { x: ev.x, y: ev.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3, s0: 0.7, s1: 0.2, a0: 1, a1: 0, rot: a }); }
          if (ev.n && !this.hitCast) { this.hitCast = 1; this.pause = HIT_PAUSE.pulse; }
        }
      } else if (ev.kind === 'sphere_launch') {
        if (!reduced) cam.shake(ABILITY_FEEL.sphereLaunchShake.ms, ABILITY_FEEL.sphereLaunchShake.intensity);
        const lo = hand ? hand.m : ev;
        this.spawn('flash', 11, core, { x: lo.x, y: lo.y, life: 0.22, s0: 0.3 * K, s1: 1.0 * K, a0: 1, a1: 0 });
        this.spawn('ring', 11.2, aura, { x: lo.x, y: lo.y, life: 0.3, s0: 0.12, s1: 0.65, a0: 0.9, a1: 0 });   // the throw: a ring snaps off the hands
      } else if (ev.kind === 'sphere_burst') {
        if (!reduced) { cam.shake(ABILITY_FEEL.sphereBurstShake.ms, ABILITY_FEEL.sphereBurstShake.intensity); this.pause = HIT_PAUSE.burst; }
        this.detonate(ev.x, ev.y, s.blasts.find(b => Math.abs(b.x - ev.x) < 2 && Math.abs(b.y - ev.y) < 2), formVisual, reduced);
      }
    }

    // ---- beam: the muzzle is where the two fists are on screen this frame; the lane itself is the sim lane
    this.beamCore.setVisible(false); this.beamGlow.setVisible(false); this.muzzle.setVisible(false); this.orb.setVisible(false);
    if (c?.kind === 'beam') {
      const simO = beamOrigin(s, c); const o = hand ? hand.m : simO; this.lastOrigin = { x: o.x, y: o.y, src: hand ? 'hand' : 'sim' };
      const ang = Math.atan2(c.dirY, c.dirX); const front = c.face === 'north' ? 9.5 : 10.6;
      if (!c.released) {
        const u = Math.min(1, c.t / BEAM.charge);
        this.orb.setVisible(true).setPosition(o.x, o.y).setDepth(c.face === 'north' ? 10.6 : front).setTint(core).setScale((0.2 + u * 0.85) * K).setAlpha(0.5 + 0.5 * u).setRotation(this.clock * 6);
        this.glowDisc(o.x, o.y, 10 * (0.3 + u), aura, 0.5 * u);
        if (dt > 0 && !reduced) { this.streakClock += dt; while (this.streakClock > 0.05) { this.streakClock -= 0.05; const a = rnd() * 6.28, r = 40 + rnd() * 26; this.spawn('streak', 10.7, aura, { x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r * 0.8, vx: -Math.cos(a) * r / 0.18, vy: -Math.sin(a) * r * 0.8 / 0.18, life: 0.18, s0: 0.6, s1: 0.2, a0: 0.2, a1: 1, rot: a + Math.PI }); } }
        if (u >= 1) { const k = 0.5 + 0.5 * Math.sin(this.clock * 30); this.g.lineStyle(2, core, 0.4 + 0.5 * k); this.g.strokeCircle(o.x, o.y, 15 + 4 * k); }   // fully charged: a pulsing ready ring, so the release moment is readable
        {   // aim indicator: the exact lane the lance will take, steerable while E is held (fills in as the charge builds, pulses once it is held at full)
          const hw = BEAM.halfWidth * s.mods.beamWidth * (1 + 0.8 * Math.min(1, (c.charge ?? 0) / BEAM.holdMax)), L = beamLength(simO.x, simO.y, c.dirX, c.dirY, BEAM.length), nx = -c.dirY * hw, ny = c.dirX * hw, ex = o.x + c.dirX * L, ey = o.y + c.dirY * L, held = (c.charge ?? 0) > 0, pl = held ? 0.7 + 0.3 * Math.sin(this.clock * 14) : 1;
          this.g.fillStyle(aura, (0.06 + 0.1 * u) * pl); this.g.fillPoints([new Phaser.Math.Vector2(o.x + nx, o.y + ny), new Phaser.Math.Vector2(ex + nx, ey + ny), new Phaser.Math.Vector2(ex - nx, ey - ny), new Phaser.Math.Vector2(o.x - nx, o.y - ny)], true);
          this.g.lineStyle(1.5, aura, (0.25 + 0.4 * u) * pl); this.g.lineBetween(o.x + nx, o.y + ny, ex + nx, ey + ny); this.g.lineBetween(o.x - nx, o.y - ny, ex - nx, ey - ny);
          this.g.lineStyle(2, core, (0.3 + 0.4 * u) * pl); this.g.lineBetween(o.x, o.y, ex, ey); this.g.strokeCircle(ex, ey, hw * 0.8);
        }
      } else {
        const tf = c.t - BEAM.charge; const open = Math.min(1, tf / 0.07), close = Math.min(1, Math.max(0, (BEAM.fire + s.mods.beamLinger * BEAM.pulseEvery - tf) / 0.14));
        const env = Math.min(open, close); const flick = 1 + 0.06 * Math.sin(this.clock * 70);
        const seg = this.scene.textures.get(abilityFxKey('beam_seg')).getSourceImage(); const hw = BEAM.halfWidth * s.mods.beamWidth * (c.form ? BEAM.formWidth : 1) * (1 + 0.8 * Math.min(1, (c.charge ?? 0) / BEAM.holdMax));
        const sy = (hw * 2 / seg.height) * Math.max(0.05, env) * flick * (1 + 0.4 * Math.max(0, 1 - tf / 0.12));   // width pop on release, settles to the lane
        const ex = simO.x + c.dirX * c.len, ey = simO.y + c.dirY * c.len;
        const len = Math.max(10, (ex - o.x) * c.dirX + (ey - o.y) * c.dirY);   // from the fists to where the sim lane ends
        const coreW = c.face === 'south' ? 0.42 : 0.55;   // a narrow bright core inside the full-width lane glow keeps Kai, the muzzle and the enemies readable
        for (const [t, sc, al] of [[this.beamGlow, 1.0, c.face === 'south' ? 0.2 : 0.3], [this.beamCore, coreW, 0.95]] as const) {
          t.setVisible(true).setPosition(o.x, o.y).setRotation(ang).setDepth(front - (t === this.beamGlow ? 0.05 : 0)).setTint(t === this.beamGlow ? aura : core).setAlpha(al * Math.min(open, close + 0.15));
          t.width = len; t.setScale(1, sy * sc); t.tilePositionX -= 520 * dt;
        }
        this.muzzle.setVisible(true).setPosition(o.x, o.y).setDepth(front + 0.1).setTint(core).setScale((0.62 + 0.1 * Math.sin(this.clock * 50)) * K * Math.max(0.2, env)).setRotation(this.clock * 4).setAlpha(0.95);
        if (dt > 0 && !reduced && env > 0.5) { this.streakClock += dt; while (this.streakClock > 0.05) { this.streakClock -= 0.05; const d = rnd() * len, side = (rnd() - 0.5) * hw * 2; this.spawn('streak', front + 0.1, aura, { x: o.x + c.dirX * d - c.dirY * side, y: o.y + c.dirY * d + c.dirX * side, vx: c.dirX * 260, vy: c.dirY * 260, life: 0.2, s0: 0.8, s1: 0.4, a0: 0.9, a1: 0, rot: ang }); } }
        this.glowDisc(ex, ey, 9 + 3 * Math.sin(this.clock * 40), aura, 0.45 * env);   // where the lane ends (wall / range): a standing impact glow
      }
    } else this.lastOrigin = null;

    // ---- sphere: forms between the palms, is carried up, leaves the hands on the throw, flies, bursts
    this.sphere.setVisible(false); this.trail.setVisible(false); this.zone.setVisible(false); this.rune.setVisible(false); this.closing.setVisible(false); this.swirl.setVisible(false); this.zoneFill.clear();
    const cs = c?.kind === 'sphere' && !c.released ? c : null; const sh = s.sphere;
    if (cs) {
      const so = sphereOrigin(s, cs); const o = hand ? hand.m : so; this.lastOrigin = { x: o.x, y: o.y, src: hand ? 'hand' : 'sim' };
      const u = Math.min(1, cs.t / SPHERE.gather); const sc = (0.2 + 0.75 * u * u) * 1.0;
      this.sphere.setVisible(true).setPosition(o.x, o.y).setDepth(12).setTint(core).setScale(sc).setRotation(this.clock * 2.4).setAlpha(0.6 + 0.4 * u);
      this.glowDisc(o.x, o.y, 26 * sc, aura, 0.5 * u * (1 + 0.1 * Math.sin(this.clock * 18)));
      if (dt > 0 && !reduced) { this.streakClock += dt; while (this.streakClock > 0.04) { this.streakClock -= 0.04; const a = rnd() * 6.28, r = 56 + rnd() * 40; this.spawn('streak', 12.1, aura, { x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r * 0.8, vx: -Math.cos(a) * r / 0.22, vy: -Math.sin(a) * r * 0.8 / 0.22, life: 0.22, s0: 0.8, s1: 0.3, a0: 0.2, a1: 1, rot: a + Math.PI }); } }
      this.chargeOrb(o.x, o.y, u, dt, !!cs.form, reduced);
      this.telegraph(cs.tx, cs.ty, SPHERE.radius * (cs.form ? SPHERE.formRadius : 1), u, !!cs.form, 0);   // the landing zone is shown from the first frame of the gather
    }
    if (sh) {
      const u = Math.min(1, sh.t / SPHERE.flight); const e = u * u * (3 - 2 * u * 0.8);
      const x = sh.x0 + (sh.x1 - sh.x0) * e, y = sh.y0 + (sh.y1 - sh.y0) * e - Math.sin(u * Math.PI) * 38;
      const ang = Math.atan2(sh.y1 - sh.y0, sh.x1 - sh.x0);
      const sc = 0.95 + 0.4 * u; this.sphere.setVisible(true).setPosition(x, y).setDepth(12).setTint(core).setScale(sc).setRotation(this.clock * 5).setAlpha(1);
      this.glowDisc(x, y, 26 * sc, aura, 0.55);
      this.trail.setVisible(true).setPosition(x - Math.cos(ang) * 10, y - Math.sin(ang) * 10).setDepth(11.8).setTint(aura).setRotation(ang).setScale(1.2 * sc, 0.9 * sc).setAlpha(0.85);
      this.telegraph(sh.x1, sh.y1, SPHERE.radius * (sh.form ? SPHERE.formRadius : 1), 1, !!sh.form, u);   // in flight: the zone stays and a closing ring counts down to impact
    }
    void p; this.vfx.update(dt);

    for (let i = this.pool.length - 1; i >= 0; i--) {
      const q = this.pool[i];
      if (dt > 0) { if (q.delay > 0) q.delay -= dt; else q.age += dt; }
      if (q.age >= q.life) { q.img.destroy(); this.pool.splice(i, 1); continue; }
      const u = q.delay > 0 ? 0 : q.age / q.life; if (q.delay <= 0) { q.x += q.vx * dt; q.y += q.vy * dt; }
      const sc = q.s0 + (q.s1 - q.s0) * u;
      q.img.setPosition(Math.round(q.x), Math.round(q.y)).setScale(sc).setRotation(q.rot).setAlpha(q.delay > 0 ? 0 : q.a0 + (q.a1 - q.a0) * u);
    }
  }

  destroy() {
    this.g.destroy(); this.vfx.destroy(); this.zoneFill.destroy(); for (const o of [this.zone, this.rune, this.closing, this.swirl]) o.destroy(); for (const o of [this.beamCore, this.beamGlow, this.muzzle, this.orb, this.sphere, this.trail]) o.destroy();
    this.pool.forEach(q => q.img.destroy()); this.pool = [];
  }
}

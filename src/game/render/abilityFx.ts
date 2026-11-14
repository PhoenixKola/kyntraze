import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { BEAM, SPHERE, ABILITY_FEEL } from '../../content/abilities';
import { beamOrigin, sphereOrigin } from '../../sim/AbilitySystem';
import type { HandAnchor } from '../../assets/kaiAnimation';

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
  private dome = new Map<number, Phaser.GameObjects.Image>();
  private lastEvent = 0;
  private clock = 0;
  private streakClock = 0;
  private pause = 0;
  private hitCast = 0;
  /** Debug/QA: last origin the beam / orb used, world px. */
  lastOrigin: { x: number; y: number; src: 'hand' | 'sim' } | null = null;
  constructor(private readonly scene: Phaser.Scene) {
    const add = (k: string) => scene.add.image(0, 0, abilityFxKey(k)).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.g = scene.add.graphics().setDepth(14.5);
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

  update(realDt: number, s: GameState, reduced: boolean, formVisual: boolean, hand: HandAnchor | null) {
    const { aura, core } = formVisual ? SOLAR_TINT : BASE_TINT;
    const p = s.player; const rnd = Math.random; const cam = this.scene.cameras.main;
    const dt = realDt * (this.pause > 0 ? HIT_PAUSE.scale : 1); this.pause = Math.max(0, this.pause - realDt);
    this.clock += dt; this.g.clear();
    const c = s.cast;

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
          const n = ev.n ? 6 : 3; for (let i = 0; i < n; i++) { const a = rnd() * 6.28, v = 90 + rnd() * 160; this.spawn('streak', 11, i % 2 ? aura : core, { x: ev.x, y: ev.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3, s0: 0.7, s1: 0.2, a0: 1, a1: 0, rot: a }); }
          if (ev.n && !this.hitCast) { this.hitCast = 1; this.pause = HIT_PAUSE.pulse; }
        }
      } else if (ev.kind === 'sphere_launch') {
        if (!reduced) cam.shake(ABILITY_FEEL.sphereLaunchShake.ms, ABILITY_FEEL.sphereLaunchShake.intensity);
        const lo = hand ? hand.m : ev;
        this.spawn('flash', 11, core, { x: lo.x, y: lo.y, life: 0.22, s0: 0.3 * K, s1: 1.0 * K, a0: 1, a1: 0 });
        this.spawn('ring', 11.2, aura, { x: lo.x, y: lo.y, life: 0.3, s0: 0.12, s1: 0.65, a0: 0.9, a1: 0 });   // the throw: a ring snaps off the hands
      } else if (ev.kind === 'sphere_burst') {
        if (!reduced) { cam.shake(ABILITY_FEEL.sphereBurstShake.ms, ABILITY_FEEL.sphereBurstShake.intensity); this.pause = HIT_PAUSE.burst; }
        this.spawn('flash', 13, core, { x: ev.x, y: ev.y, life: 0.3, s0: 0.5 * 1.5, s1: 3.2 * 1.5, a0: 1, a1: 0, rot: rnd() });
        this.spawn('flash', 12.9, aura, { x: ev.x, y: ev.y, life: 0.45, s0: 0.3 * 1.5, s1: 4.2 * 1.5, a0: 0.75, a1: 0, rot: rnd() + 0.4, delay: 0.04 });
        this.spawn('ring', 12.8, core, { x: ev.x, y: ev.y, life: 0.5, s0: 0.3, s1: 2.4, a0: 0.95, a1: 0, delay: 0.02 });       // 3-part detonation: white flash, colour flash, expanding shock ring
        this.spawn('ring', 12.7, aura, { x: ev.x, y: ev.y, life: 0.7, s0: 0.2, s1: 3.2, a0: 0.7, a1: 0, delay: 0.1 });
        const n = reduced ? 8 : 24;
        for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + rnd() * 0.3, v = 180 + rnd() * 260; this.spawn(i % 3 ? 'streak' : 'impact', 12.5, i % 2 ? aura : core, { x: ev.x, y: ev.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8, life: 0.45 + rnd() * 0.3, s0: 0.8 + rnd() * 0.5, s1: 0.2, a0: 1, a1: 0, rot: a }); }
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
        this.g.lineStyle(2, aura, 0.28 * u); this.g.lineBetween(o.x, o.y, o.x + c.dirX * 70 * u, o.y + c.dirY * 70 * u);   // short aim tick: where the lance will go
      } else {
        const tf = c.t - BEAM.charge; const open = Math.min(1, tf / 0.07), close = Math.min(1, Math.max(0, (BEAM.fire - tf) / 0.14));
        const env = Math.min(open, close); const flick = 1 + 0.06 * Math.sin(this.clock * 70);
        const seg = this.scene.textures.get(abilityFxKey('beam_seg')).getSourceImage(); const hw = BEAM.halfWidth * (c.form ? BEAM.formWidth : 1);
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
    this.sphere.setVisible(false); this.trail.setVisible(false);
    const cs = c?.kind === 'sphere' && !c.released ? c : null; const sh = s.sphere;
    if (cs) {
      const so = sphereOrigin(s, cs); const o = hand ? hand.m : so; this.lastOrigin = { x: o.x, y: o.y, src: hand ? 'hand' : 'sim' };
      const u = Math.min(1, cs.t / SPHERE.gather); const sc = (0.2 + 0.75 * u * u) * 1.0;
      this.sphere.setVisible(true).setPosition(o.x, o.y).setDepth(12).setTint(core).setScale(sc).setRotation(this.clock * 2.4).setAlpha(0.6 + 0.4 * u);
      this.glowDisc(o.x, o.y, 26 * sc, aura, 0.5 * u * (1 + 0.1 * Math.sin(this.clock * 18)));
      if (dt > 0 && !reduced) { this.streakClock += dt; while (this.streakClock > 0.04) { this.streakClock -= 0.04; const a = rnd() * 6.28, r = 56 + rnd() * 40; this.spawn('streak', 12.1, aura, { x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r * 0.8, vx: -Math.cos(a) * r / 0.22, vy: -Math.sin(a) * r * 0.8 / 0.22, life: 0.22, s0: 0.8, s1: 0.3, a0: 0.2, a1: 1, rot: a + Math.PI }); } }
      const gr = (this.clock * 1.6) % 1; this.g.lineStyle(2, core, 0.55 * (1 - gr) * u); this.g.strokeCircle(o.x, o.y, 90 * (1 - gr) + 16 * sc);   // energy drawn inward to the orb
      const R = SPHERE.radius * (cs.form ? SPHERE.formRadius : 1);
      this.g.lineStyle(2, aura, 0.18 + 0.2 * u); this.g.strokeCircle(cs.tx, cs.ty, R);   // the landing point is shown from the first frame of the gather
    }
    if (sh) {
      const u = Math.min(1, sh.t / SPHERE.flight); const e = u * u * (3 - 2 * u * 0.8);
      const x = sh.x0 + (sh.x1 - sh.x0) * e, y = sh.y0 + (sh.y1 - sh.y0) * e - Math.sin(u * Math.PI) * 38;
      const ang = Math.atan2(sh.y1 - sh.y0, sh.x1 - sh.x0);
      const sc = 0.95 + 0.4 * u; this.sphere.setVisible(true).setPosition(x, y).setDepth(12).setTint(core).setScale(sc).setRotation(this.clock * 5).setAlpha(1);
      this.glowDisc(x, y, 26 * sc, aura, 0.55);
      this.trail.setVisible(true).setPosition(x - Math.cos(ang) * 10, y - Math.sin(ang) * 10).setDepth(11.8).setTint(aura).setRotation(ang).setScale(1.2 * sc, 0.9 * sc).setAlpha(0.85);
      const R = SPHERE.radius * (sh.form ? SPHERE.formRadius : 1); const pulse = 0.35 + 0.15 * Math.sin(this.clock * 24);
      this.g.lineStyle(3, aura, pulse + 0.2 * u); this.g.strokeCircle(sh.x1, sh.y1, R);
      this.g.lineStyle(2, core, 0.5 * u); this.g.strokeCircle(sh.x1, sh.y1, R * (1 - 0.9 * u));
    }
    for (const b of s.blasts) {
      const u = 1 - b.ttl / b.life; const grow = Math.min(1, u / 0.28); const eo = 1 - (1 - grow) * (1 - grow); const R = b.radius;
      this.g.lineStyle(5, core, Math.max(0, 1 - u) * 0.95); this.g.strokeCircle(b.x, b.y, R * (0.15 + 0.85 * eo));
      this.g.lineStyle(3, aura, Math.max(0, 1 - u * 1.2) * 0.9); this.g.strokeCircle(b.x, b.y, R * (0.1 + 0.75 * eo));
      let d = this.dome.get(b.id); if (!d) { d = this.scene.add.image(b.x, b.y, abilityFxKey('dome')).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.2).setTint(aura); this.dome.set(b.id, d); }
      d.setScale(2 * R / d.width * (0.3 + 0.7 * eo), 2 * R / d.height * (0.3 + 0.7 * eo)).setAlpha(Math.max(0, (b.form ? 0.22 : 0.4) * (1 - u) * (1 - u)));
    }
    for (const [id, d] of this.dome) if (!s.blasts.some(b => b.id === id)) { d.destroy(); this.dome.delete(id); }
    void p;

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
    this.g.destroy(); for (const o of [this.beamCore, this.beamGlow, this.muzzle, this.orb, this.sphere, this.trail]) o.destroy();
    this.pool.forEach(q => q.img.destroy()); this.pool = []; this.dome.forEach(d => d.destroy()); this.dome.clear();
  }
}

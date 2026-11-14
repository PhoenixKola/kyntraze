import Phaser from 'phaser';
import { FORM_LOOKS, FORM_I_LOOK } from '../../assets/formLooks';
import type { KaiAnimEvent } from '../../assets/kaiAnimation';

export const FORM_FX_NAMES = ['wisp_a', 'wisp_b', 'wisp_c', 'spark', 'ring', 'arc_h', 'arc_v', 'glow'] as const;
export const formFxKey = (n: string) => `kaifx-${n}`;
export const formFxUrl = (n: string) => `/art/fx/kai-form/${n}.png`;

/** The FX sprites are drawn with 5x5-px art blocks, twice the pixel density of the first set, so Kai's 0.5 hero scale and the FX share one pixel size: every FX scale below is multiplied by this. */
const FX_BASE = 0.5;

interface P { img: Phaser.GameObjects.Image; age: number; life: number; x: number; y: number; vx: number; vy: number; s0: number; s1: number; a0: number; a1: number; sx: number; sy: number; rot: number; delay: number }

/** Form I power-up FX: separate additive layers (ground glow and rising wisps BEHIND Kai, sparks and burst arcs around/in front, never over the face), all driven by an explicit dt
 *  so they freeze with the pause and never use Phaser tweens/emitters. Tint comes from FORM_LOOKS; pool-capped, no screen-wide effects. */
export class FormFx {
  private pool: P[] = [];
  private glow: Phaser.GameObjects.Image;
  private rim: Phaser.GameObjects.Sprite[] = [];   // body-hugging aura: 4 offset copies of the hero frame, solid Solar colour, drawn BEHIND Kai so only the rim shows
  private flameClock = 0;
  private arcClock = 1.2;
  private glowLevel = 0;
  private persistent = false;
  private spawnClock = 0;
  private sparkClock = 0;
  private pulse = 0;
  private readonly look = FORM_LOOKS[FORM_I_LOOK];
  constructor(private readonly scene: Phaser.Scene) {
    this.glow = scene.add.image(0, 0, formFxKey('glow')).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.5).setVisible(false).setTint(this.look.aura);
    for (let i = 0; i < 4; i++) { const r = scene.add.sprite(0, 0, formFxKey('glow')).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.7).setVisible(false).setTint(this.look.aura); r.setTintMode(Phaser.TintModes.FILL); this.rim.push(r); }
  }

  private spawn(key: string, depth: number, tint: number, o: Partial<P> & { life: number }) {
    if (this.pool.length >= 56) return;
    const img = this.scene.add.image(o.x ?? 0, o.y ?? 0, formFxKey(key)).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setTint(tint);
    const p: P = { img, age: 0, life: o.life, x: o.x ?? 0, y: o.y ?? 0, vx: o.vx ?? 0, vy: o.vy ?? 0, s0: o.s0 ?? 1, s1: o.s1 ?? 1, a0: o.a0 ?? 1, a1: o.a1 ?? 0, sx: o.sx ?? 1, sy: o.sy ?? 1, rot: o.rot ?? 0, delay: o.delay ?? 0 };
    img.setRotation(p.rot).setAlpha(0); this.pool.push(p);
  }

  /** x,y = Kai's feet on the ground; k = FX scale (1 at the default 0.5 hero scale: FX art pixels are 1 screen px); visualForm = Form I art visible; alive = still playing. */
  update(dt: number, x: number, y: number, k: number, visualForm: boolean, alive: boolean, events: readonly KaiAnimEvent[], reduced: boolean, emphasis = 0, crowded = false, hero?: Phaser.GameObjects.Sprite) {
    const rnd = Math.random;
    for (const e of events) {
      if (e === 'form_start' && !reduced) {
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + rnd() * 0.5, r = (60 + rnd() * 26) * k; this.spawn('spark', 11, this.look.core, { x: x + Math.cos(a) * r, y: y - 34 * k + Math.sin(a) * r * 0.7, vx: -Math.cos(a) * r * 0.72 / 0.34, vy: -Math.sin(a) * r * 0.7 * 0.72 / 0.34, life: 0.34, delay: i * 0.02, s0: 1.0 * k, s1: 0.35 * k, a0: 0.9, a1: 0 }); }
        this.glowLevel = Math.max(this.glowLevel, 0.25);
      }
      if (e === 'form_commit') {
        this.pulse = 0.5;
        this.spawn('ring', 3.6, this.look.core, { x, y: y - 2, life: 0.45, s0: 0.5 * k, s1: 2.5 * k, a0: 1, a1: 0 });
        this.spawn('ring', 3.6, this.look.aura, { x, y: y - 2, life: 0.6, s0: 0.4 * k, s1: 3.3 * k, a0: 0.8, a1: 0, delay: 0.1 });
        if (!reduced) {
          for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + rnd(), r = (34 + rnd() * 24) * k; const v = i % 2 === 0;
            this.spawn(v ? 'arc_v' : 'arc_h', 11, this.look.core, { x: x + Math.cos(a) * r, y: y - 26 * k + Math.sin(a) * r * 0.5, life: 0.16 + rnd() * 0.08, s0: 1.3 * k, s1: 1.7 * k, a0: 1, a1: 0, sx: rnd() < 0.5 ? -1 : 1, delay: rnd() * 0.12 }); }
          for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI * 2; this.spawn('spark', 11, this.look.core, { x, y: y - 30 * k, vx: Math.cos(a) * (70 + rnd() * 60) * k, vy: Math.sin(a) * (50 + rnd() * 40) * k, life: 0.35 + rnd() * 0.2, s0: 0.8 * k, s1: 0.3, a0: 1, a1: 0 }); }
        }
      }
      if (e === 'form_end') { this.spawn('ring', 3.6, this.look.aura, { x, y: y - 2, life: 0.3, s0: 2.6 * k, s1: 0.5 * k, a0: 0.0, a1: 0.9 }); }
    }
    this.persistent = visualForm && alive;
    this.glowLevel += ((this.persistent ? 1 : 0) - this.glowLevel) * Math.min(1, dt * (this.persistent ? 6 : 9));
    this.pulse = Math.max(0, this.pulse - dt);
    const t = performance.now() / 1000;
    const gl = this.glowLevel * (0.38 + 0.1 * Math.sin(t * 7) + this.pulse * 1.2);
    this.glow.setVisible(this.glowLevel > 0.02).setPosition(x, y - 3).setScale(FX_BASE * k * (1.0 + 0.06 * Math.sin(t * 5)) * (1 + this.pulse)).setAlpha(Math.min(1, gl * 0.5 * (1 + 0.4 * emphasis)));
    // body-hugging aura: the hero's own frame, offset a few px in 4 directions and filled with the Solar colour BEHIND him, so a soft flame rim follows his outline; it swells while casting / dashing / transforming
    const show = this.glowLevel > 0.02 && !!hero; this.flameClock += dt;
    for (let i = 0; i < 4; i++) {
      const r = this.rim[i]; r.setVisible(show); if (!show || !hero) continue;
      const rad = (2.4 + 0.7 * Math.sin(t * 6 + i * 1.7) + 1.4 * emphasis + this.pulse * 5) * k; const dx = [rad, -rad, 0, 0][i], dy = [0, 0, -rad * 1.7, rad * 0.6][i];
      r.setTexture(hero.texture.key, hero.frame.name).setOrigin(hero.originX, hero.originY).setScale(hero.scaleX, hero.scaleY).setPosition(hero.x + dx, hero.y + dy).setFlipX(hero.flipX)
        .setAlpha(Math.min(0.6, this.glowLevel * (i === 2 ? 0.34 : 0.26) * (1 + 0.25 * Math.sin(t * 9 + i) + 0.6 * emphasis + this.pulse * 1.5)));
    }
    if (this.persistent && dt > 0) {
      this.spawnClock += dt; const every = (reduced ? 0.2 : 0.06) * (crowded ? 1.8 : 1) / (1 + emphasis * 0.8);
      while (this.spawnClock > every) {
        this.spawnClock -= every; const key = ['wisp_a', 'wisp_b', 'wisp_c'][Math.floor(rnd() * 3)];
        const side = rnd() < 0.5 ? -1 : 1; this.spawn(key, 9.6, this.look.aura, { x: x + side * (8 + rnd() * 9) * k, y: y - (6 + rnd() * 40) * k, vx: side * 3 * k, vy: -(26 + rnd() * 26) * k, life: 0.4 + rnd() * 0.25, s0: (0.75 + rnd() * 0.3) * k, s1: 0.4 * k, a0: 0.85, a1: 0, rot: (rnd() - 0.5) * 0.2 });
      }
      if (!reduced && !crowded) {   // an occasional tiny energy arc crackling off the shoulders / hands (never in crowded fights)
        this.arcClock -= dt * (1 + emphasis);
        if (this.arcClock <= 0) { this.arcClock = 1.4 + rnd() * 2.2; const v = rnd() < 0.5, side = rnd() < 0.5 ? -1 : 1; this.spawn(v ? 'arc_v' : 'arc_h', 11, this.look.core, { x: x + side * (13 + rnd() * 7) * k, y: y - (44 + rnd() * 18) * k, life: 0.13, s0: 0.7 * k, s1: 0.95 * k, a0: 0.85, a1: 0, sx: side }); }
      }
      if (!reduced) { this.sparkClock += dt; while (this.sparkClock > (crowded ? 0.4 : 0.22) / (1 + emphasis)) { this.sparkClock -= 0.22; const a = rnd() * Math.PI * 2, r = (14 + rnd() * 8) * k; this.spawn('spark', 11, this.look.core, { x: x + Math.cos(a) * r, y: y - 38 * k + Math.sin(a) * r * 1.5, vy: -10 * k, life: 0.3, s0: 0.5 * k, s1: 0.25, a0: 1, a1: 0 }); } }
    }
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      if (dt > 0) { if (p.delay > 0) p.delay -= dt; else p.age += dt; }
      if (p.age >= p.life) { p.img.destroy(); this.pool.splice(i, 1); continue; }
      const u = p.delay > 0 ? 0 : p.age / p.life; if (p.delay <= 0) { p.x += p.vx * dt; p.y += p.vy * dt; }
      const s = p.s0 + (p.s1 - p.s0) * u;
      p.img.setPosition(Math.round(p.x), Math.round(p.y)).setScale(s * p.sx * FX_BASE, s * p.sy * FX_BASE).setAlpha(p.delay > 0 ? 0 : p.a0 + (p.a1 - p.a0) * u);
    }
  }

  destroy() { this.glow.destroy(); this.rim.forEach(r => r.destroy()); this.pool.forEach(p => p.img.destroy()); this.pool = []; }
}

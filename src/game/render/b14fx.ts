import Phaser from 'phaser';

/** B14 ImageGen FX (art/fx-b14, cut by art/fx-b14/extract.py): ground decals per form, per-form auto-attack strikes, Instinct Reversal pieces. White/pale sprites are tinted at runtime. */
export const B14_FX_NAMES = ['sigil_f2', 'ring_f1', 'ring_f3', 'arc_a', 'arc_b', 'pop', 'lash_a', 'lash_b', 'ember_burst', 'comet_streak', 'shock_ring', 'comet_flash',
  'jab', 'refract', 'glint', 'slash', 'shards', 'target', 'xslash', 'bloom', 'shatter'] as const;
export const b14Key = (n: string) => `b14fx-${n}`;
export const b14Url = (n: string) => `/art/fx/b14/${n}.png`;
export const GLOW_KEY = 'b14fx-softglow';

/** A smooth radial light texture (no edges at all): every glow that must come from a point (fists, orb, hand) uses this instead of a drawn disc or box. */
export function ensureGlow(scene: Phaser.Scene) {
  if (scene.textures.exists(GLOW_KEY)) return;
  const cv = scene.textures.createCanvas(GLOW_KEY, 128, 128), cx = cv?.getContext(); if (!cv || !cx) return;
  const g = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.7)'); g.addColorStop(0.5, 'rgba(255,255,255,.2)'); g.addColorStop(0.8, 'rgba(255,255,255,.04)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, 128, 128); cv.refresh();
}

/** A worn ground decal under Kai: the ImageGen art is spun in its own plane inside a container that is then squashed to the ground ellipse, with a pulsing bloom copy.
 *  level 0..1 fades it in/out; Reduced Effects stops the spin. */
export class GroundDecal {
  private readonly box: Phaser.GameObjects.Container;
  private readonly art: Phaser.GameObjects.Image;
  private readonly bloom: Phaser.GameObjects.Image;
  private lvl = 0; private clock = Math.random() * 6;
  constructor(scene: Phaser.Scene, key: string, tint: number, private readonly spin = 0.28, depth = 3.52) {
    this.art = scene.add.image(0, 0, b14Key(key)); this.bloom = scene.add.image(0, 0, b14Key(key)).setBlendMode(Phaser.BlendModes.ADD).setTint(tint);
    this.box = scene.add.container(0, 0, [this.bloom, this.art]).setDepth(depth).setVisible(false);
    this.art.setBlendMode(Phaser.BlendModes.ADD);
  }
  /** x,y = feet; size = on-screen diameter in px at full level; boost 0..1 brightens (charging / dashing). */
  update(dt: number, x: number, y: number, on: boolean, size: number, boost = 0, reduced = false) {
    this.lvl += ((on ? 1 : 0) - this.lvl) * Math.min(1, dt * (on ? 6 : 4)); if (dt > 0) this.clock += dt;
    const vis = this.lvl > 0.02; this.box.setVisible(vis); if (!vis) return;
    const t = this.clock, s = size / this.art.width * (0.94 + 0.06 * this.lvl) * (1 + 0.025 * Math.sin(t * 3.1) + 0.05 * boost);
    const rot = reduced ? 0 : t * this.spin * (1 + boost * 2.2);
    this.box.setPosition(Math.round(x), Math.round(y + 2)).setScale(1, 0.46);
    this.art.setScale(s).setRotation(rot).setAlpha(Math.min(1, this.lvl * (0.5 + 0.12 * Math.sin(t * 2.4) + 0.3 * boost)));
    this.bloom.setScale(s * 1.12).setRotation(rot).setAlpha(this.lvl * (0.16 + 0.1 * Math.sin(t * 2.4 + 1) + 0.25 * boost));
  }
  destroy() { this.box.destroy(); }
}

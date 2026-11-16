/** B21.3: the living aura of the five transformed states (ren, sora, flare, comet, still), drawn from the ImageGen flipbooks in public/art/fx/b21/aura/<state>/. A handful of persistent additive images (no per-frame allocation): two stepped back wings behind the body, a thin front veil, a ground sigil and a velocity ribbon. All motion comes from the AuraSample (idle → moving → dash → charge → release → settle). */
import Phaser from 'phaser';
import type { AuraSample } from './auraState';
import { b21Key } from './b21Assets';

export type AuraState = 'ren' | 'sora' | 'flare' | 'comet' | 'still';
/** Per-state character: flipbook rate (comet crackles fast, still drifts slowly), overall weight, whether the ribbon and sparks are used. */
const LOOK: Record<AuraState, { fps: number; back: number; veil: number; ground: number; trail: number; scale: number }> = {
  ren:   { fps: 9,  back: 0.7,  veil: 0.18, ground: 0.65, trail: 0.7, scale: 0.46 },
  sora:  { fps: 11, back: 0.8,  veil: 0.26, ground: 0.8, trail: 0.7, scale: 0.5 },
  flare: { fps: 9,  back: 0.5,  veil: 0.14, ground: 0.45, trail: 0.55, scale: 0.42 },
  comet: { fps: 14, back: 0.75, veil: 0.28, ground: 0.55, trail: 0.75, scale: 0.52 },
  still: { fps: 5,  back: 0.55, veil: 0.22, ground: 0.45, trail: 0.5, scale: 0.5 },
};

export class AuraView {
  private readonly back: Phaser.GameObjects.Image[] = []; private readonly veil: Phaser.GameObjects.Image; private readonly ground: Phaser.GameObjects.Image; private readonly trail: Phaser.GameObjects.Image;
  private clock = 0; private readonly ok: boolean;
  constructor(private readonly scene: Phaser.Scene, private readonly state: AuraState) {
    const k = (n: string) => b21Key('aura', `${state}/${n}`);
    this.ok = scene.textures.exists(k('back_0'));
    const add = (n: string, depth: number) => scene.add.image(0, 0, scene.textures.exists(k(n)) ? k(n) : k('back_0')).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.back = [add('back_0', 9.4), add('back_1', 9.3)]; this.veil = add('veil', 10.6); this.ground = add('ground', 3.7); this.trail = add('trail', 9.2);
  }
  get available() { return this.ok; }
  hide() { for (const i of [...this.back, this.veil, this.ground, this.trail]) i.setVisible(false); }
  destroy() { for (const i of [...this.back, this.veil, this.ground, this.trail]) i.destroy(); }

  /** foot = ground point between the soles; dt in seconds (0 while paused); strength scales everything (Reduced Effects / crowds pass < 1). */
  update(a: AuraSample, dt: number, foot: { x: number; y: number }, vx: number, vy: number, strength: number, calm: boolean) {
    if (!this.ok || strength <= 0.01) { this.hide(); return; }
    const L = LOOK[this.state], k = (n: string, f: number) => b21Key('aura', `${this.state}/${n}${f}`);
    this.clock += dt;
    const f0 = Math.floor(this.clock * L.fps) % 4, tight = 1 - 0.2 * a.gather, stretch = 1 + 0.14 * a.lean + 0.25 * a.pulse, kk = a.k * strength;
    const lx = a.leanX * 14 * a.lean, ly = a.leanY * 7 * a.lean, br = 1 + 0.03 * Math.sin(this.clock * 3.1);
    const place = (img: Phaser.GameObjects.Image, key: string, x: number, y: number, sx: number, sy: number, alpha: number, o: { oy?: number; rot?: number; flip?: boolean } = {}) => {
      if (this.scene.textures.exists(key)) img.setTexture(key);
      img.setVisible(alpha > 0.01).setPosition(Math.round(x), Math.round(y)).setOrigin(0.5, o.oy ?? 0.5).setScale(sx * (o.flip ? -1 : 1), sy).setRotation(o.rot ?? 0).setAlpha(Math.min(1, alpha));
    };
    const s = L.scale * tight * br;
    place(this.back[0], k('back_', f0), foot.x + lx, foot.y + 8 + ly, s, s * stretch, L.back * kk, { oy: 0.9, rot: a.leanX * 0.1 * a.lean });
    if (!calm) place(this.back[1], k('back_', (f0 + 2) % 4), foot.x + lx * 1.5, foot.y + 4 + ly, s * 0.9, s * 0.95 * stretch, L.back * 0.55 * kk, { oy: 0.9, flip: true, rot: a.leanX * 0.14 * a.lean }); else this.back[1].setVisible(false);
    place(this.veil, b21Key('aura', `${this.state}/veil`), foot.x, foot.y - 26, L.scale * 0.95 * tight, L.scale * 0.95 * tight * stretch, L.veil * kk * (a.phase === 'charge' ? 1.5 : 1));
    place(this.ground, b21Key('aura', `${this.state}/ground`), foot.x, foot.y + 5, 0.34 * (1 + 0.3 * a.pulse) * br, 0.34 * (1 + 0.3 * a.pulse) * br * 0.9, L.ground * kk);
    const speed = Math.hypot(vx, vy);
    if (a.lean > 0.25 && speed > 1 && !calm) {   // velocity ribbon: its tail trails opposite to travel (art: head right, tail left)
      const ang = Math.atan2(vy, vx), len = 0.2 + 0.22 * a.lean + (a.phase === 'dash' ? 0.18 : 0);
      place(this.trail, b21Key('aura', `${this.state}/${Math.floor(this.clock * 6) % 2 ? 'trail2' : 'trail'}`), foot.x, foot.y - 24, len, len * 0.8, L.trail * Math.min(1, (a.lean - 0.2) * 1.6) * kk, { rot: ang }); this.trail.setOrigin(1, 0.5);
    } else this.trail.setVisible(false);
  }
}

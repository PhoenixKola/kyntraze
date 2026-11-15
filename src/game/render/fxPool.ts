import Phaser from 'phaser';

/** B07-pre VFX art: ImageGen sheets cut by art/characters/kai/abilities/scripts/extract_vfx.py. Every sprite exists in a cyan ("b") and a solar ("s") colour-mapped variant, so there is no runtime tint. */
export { VFX_NAMES, type VfxName } from './vfxNames';
export const vfxKey = (n: string, solar: boolean) => `vfx-${n}-${solar ? 's' : 'b'}`;
export const vfxUrl = (n: string, solar: boolean) => `/art/fx/kai-abilities/vfx/${n}_${solar ? 's' : 'b'}.png`;

export interface FxSpawn {
  key: string; x: number; y: number; depth: number; life: number;
  blend?: 'add' | 'normal' | 'screen'; vx?: number; vy?: number; s0?: number; s1?: number; sy?: number;
  a0?: number; a1?: number; rot?: number; spin?: number; delay?: number; ox?: number; oy?: number; flipX?: boolean; tint?: number; ay?: number;
  /** fade in over the first fraction of life (0..1); default instant */
  fadeIn?: number;
}
interface Live extends Required<Omit<FxSpawn, 'key' | 'ox' | 'oy' | 'flipX' | 'fadeIn' | 'tint'>> { img: Phaser.GameObjects.Image; age: number; ox: number; oy: number; fadeIn: number }

const BLEND = { add: Phaser.BlendModes.ADD, normal: Phaser.BlendModes.NORMAL, screen: Phaser.BlendModes.SCREEN } as const;

/** Bounded, reusable sprite pool: finished sprites go back to a free list instead of being destroyed, nothing is allocated per frame once warm. */
export class FxPool {
  private live: Live[] = [];
  private free = new Map<string, Phaser.GameObjects.Image[]>();
  constructor(private readonly scene: Phaser.Scene, private readonly cap = 150) {}
  get count() { return this.live.length; }
  spawn(o: FxSpawn) {
    if (this.live.length >= this.cap) return;
    const list = this.free.get(o.key); const img = list?.pop() ?? this.scene.add.image(0, 0, o.key);
    img.setVisible(true).setDepth(o.depth).setBlendMode(BLEND[o.blend ?? 'normal']).setFlipX(!!o.flipX).setAlpha(0);
    if (o.tint !== undefined) img.setTint(o.tint); else img.clearTint();
    if (o.ox !== undefined || o.oy !== undefined) img.setOrigin(o.ox ?? 0.5, o.oy ?? 0.5); else img.setOrigin(0.5, 0.5);
    this.live.push({ img, age: 0, life: o.life, x: o.x, y: o.y, vx: o.vx ?? 0, vy: o.vy ?? 0, s0: o.s0 ?? 1, s1: o.s1 ?? o.s0 ?? 1, sy: o.sy ?? 1, a0: o.a0 ?? 1, a1: o.a1 ?? 0, rot: o.rot ?? 0, spin: o.spin ?? 0,
      delay: o.delay ?? 0, ay: o.ay ?? 0, blend: o.blend ?? 'normal', depth: o.depth, ox: o.ox ?? 0.5, oy: o.oy ?? 0.5, fadeIn: o.fadeIn ?? 0 });
  }
  update(dt: number) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const q = this.live[i];
      if (dt > 0) { if (q.delay > 0) q.delay -= dt; else q.age += dt; }
      if (q.age >= q.life) { this.release(q); this.live.splice(i, 1); continue; }
      const u = q.delay > 0 ? 0 : q.age / q.life; if (q.delay <= 0) { q.vy += q.ay * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.spin * dt; }
      const sc = q.s0 + (q.s1 - q.s0) * u; let a = q.a0 + (q.a1 - q.a0) * u; if (q.fadeIn > 0 && u < q.fadeIn) a *= u / q.fadeIn;
      q.img.setPosition(Math.round(q.x), Math.round(q.y)).setScale(sc, sc * q.sy).setRotation(q.rot).setAlpha(q.delay > 0 ? 0 : a);
    }
  }
  private release(q: Live) { q.img.setVisible(false); const k = q.img.texture.key; const l = this.free.get(k); if (l) l.push(q.img); else this.free.set(k, [q.img]); }
  clear() { for (const q of this.live) this.release(q); this.live.length = 0; }
  destroy() { for (const q of this.live) q.img.destroy(); this.live.length = 0; for (const l of this.free.values()) l.forEach(i => i.destroy()); this.free.clear(); }
}

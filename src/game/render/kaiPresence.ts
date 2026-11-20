/** Kai Transformation Presence 2.0 (Kai's three transformed forms only): an energy silhouette that breathes and lags behind the body, body-bound energy at shoulders / fists / feet, afterimages that echo the real sprite on fast movement, and small ground shockwaves. Code-drawn from existing textures and the live sprite frame; reads render state only. */
import Phaser from 'phaser';
import { b14Key } from './b14fx';
import { formFxKey } from './formFx';

interface Look { col: number; hot: number; sil: number; ghost: number; ghostLife: number; ring: number; ringAlpha: number }
const LOOK: Record<1 | 2 | 3, Look> = {
  1: { col: 0xff9a2e, hot: 0xffd27a, sil: 0.34, ghost: 0.26, ghostLife: 0.3, ring: 1.0, ringAlpha: 0.55 },
  2: { col: 0xffcf2a, hot: 0xfff2a0, sil: 0.42, ghost: 0.5, ghostLife: 0.34, ring: 1.3, ringAlpha: 0.75 },
  3: { col: 0xcfdcff, hot: 0xffffff, sil: 0.3, ghost: 0.46, ghostLife: 0.5, ring: 1.15, ringAlpha: 0.5 },
};
interface Ghost { spr: Phaser.GameObjects.Sprite; life: number; max: number; a: number }
interface Ring { im: Phaser.GameObjects.Image; t: number; dur: number; s0: number; s1: number; a: number }
export interface PresenceInput { dt: number; form: 0 | 1 | 2 | 3; on: boolean; hero: Phaser.GameObjects.Sprite; srcKey: string; srcFrame: number | string; scale: number; dashing: boolean; casting: boolean; reduced: boolean; crowded: boolean; hand: { m: { x: number; y: number } } | null; running: boolean }

export class KaiPresence {
  private sil: Phaser.GameObjects.Sprite[] = []; private ghosts: Ghost[] = []; private rings: Ring[] = []; private glows: Phaser.GameObjects.Image[] = [];
  private lx = 0; private ly = 0; private px = 0; private py = 0; private clock = 0; private ghostClock = 0; private rippleClock = 0; private dashWas = false; private speed = 0; private lastDir = { x: 0, y: 0 }; private fresh = true;
  constructor(private readonly scene: Phaser.Scene) {
    const blank = 'kp-blank'; if (!scene.textures.exists(blank)) { scene.textures.createCanvas(blank, 2, 2)!.refresh(); }
    for (let i = 0; i < 2; i++) this.sil.push(scene.add.sprite(0, 0, blank, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.35 - i * 0.02).setVisible(false));
    for (let i = 0; i < 5; i++) this.glows.push(scene.add.image(0, 0, formFxKey('glow')).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.4).setVisible(false));
  }
  private ring(x: number, y: number, tint: number, size: number, a: number, dur: number) {
    const key = b14Key('shock_ring'); if (!this.scene.textures.exists(key) || this.rings.length >= 12) return;
    const im = this.scene.add.image(x, y, key).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.9).setTint(tint).setAlpha(0);
    this.rings.push({ im, t: 0, dur, s0: size * 0.25, s1: size, a });
  }
  burst(x: number, y: number, form: number, big = 1) { const L = LOOK[form as 1 | 2 | 3]; if (L) this.ring(x, y, L.hot, 170 * L.ring * big, L.ringAlpha, 0.55); }
  private hide() { for (const s of this.sil) s.setVisible(false); for (const g of this.glows) g.setVisible(false); this.fresh = true; }
  update(o: PresenceInput) {
    const dt = o.running ? o.dt : 0;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t += dt; const u = r.t / r.dur; if (u >= 1) { r.im.destroy(); this.rings.splice(i, 1); continue; }
      const size = (r.s0 + (r.s1 - r.s0) * (1 - (1 - u) ** 2)) / r.im.width; r.im.setScale(size, size * 0.45).setAlpha(r.a * (1 - u) ** 1.4);
    }
    for (const g of this.ghosts) { if (g.life > 0) { g.life -= dt; g.spr.setVisible(g.life > 0).setAlpha(Math.max(0, g.life / g.max) * g.a); } else g.spr.setVisible(false); }
    if (!o.on || o.form < 1) { this.hide(); return; }
    const f = o.form as 1 | 2 | 3, L = LOOK[f], h = o.hero, x = h.x, y = h.y, k = o.reduced ? 0.6 : o.crowded ? 0.8 : 1;
    if (this.fresh) { this.lx = x; this.ly = y; this.px = x; this.py = y; this.fresh = false; }
    this.clock += dt;
    const mvx = x - this.px, mvy = y - this.py, sp = dt > 0 ? Math.hypot(mvx, mvy) / dt : 0; this.speed += (sp - this.speed) * Math.min(1, dt * 12);
    const fast = this.speed > 120 || o.dashing, drive = Math.min(1, this.speed / 320) + (o.dashing ? 0.6 : 0) + (o.casting ? 0.3 : 0);
    let turned = false;
    if (sp > 60) { const d = { x: mvx / (sp * dt), y: mvy / (sp * dt) }; turned = (this.lastDir.x !== 0 || this.lastDir.y !== 0) && d.x * this.lastDir.x + d.y * this.lastDir.y < 0.2; this.lastDir = d; }
    this.px = x; this.py = y;

    // energy silhouette: two body copies, larger and lagging, breathing; stronger in motion, calm at idle
    const ease = Math.min(1, dt * (f === 3 ? 7 : 10)); this.lx += (x - this.lx) * ease; this.ly += (y - this.ly) * ease;
    const breathe = 0.5 + 0.5 * Math.sin(this.clock * (f === 2 ? 5.2 : f === 3 ? 1.8 : 3.1)), sa = L.sil * (0.55 + 0.45 * breathe) * (0.7 + 0.6 * Math.min(1, drive)) * k;
    this.sil.forEach((s, i) => {
      s.setTexture(o.srcKey, o.srcFrame).setOrigin(h.originX, h.originY).setFlipX(h.flipX).setVisible(true).setTint(i ? L.hot : L.col); s.tintMode = Phaser.TintModes.FILL;
      const grow = 1.06 + i * 0.07 + 0.03 * breathe + 0.05 * Math.min(1, drive), lag = i ? 1 : 0.55;
      s.setScale(o.scale * grow).setPosition(Math.round(x + (this.lx - x) * lag), Math.round(y + (this.ly - y) * lag - 2 - 3 * breathe)).setAlpha(sa * (i ? 0.55 : 1));
    });

    // body-bound energy: soft pulses pinned to shoulders, upper back and feet; a fist glow follows the real hand anchor while casting
    const sc = o.scale / 0.5, pulse = 0.65 + 0.35 * Math.sin(this.clock * (f === 2 ? 11 : 6)), flick = f === 2 ? (Math.sin(this.clock * 43) > 0.4 ? 1.25 : 0.9) : 1;
    const pts: [number, number, number][] = [[-16, -44, 0.5], [16, -44, 0.5], [0, -60, 0.45], [-9, 0, 0.55], [9, 0, 0.55]];
    this.glows.forEach((g, i) => {
      const p = pts[i];
      g.setVisible(true).setTint(i === 2 ? L.hot : L.col).setPosition(Math.round(x + p[0] * sc), Math.round(y + p[1] * sc - (i > 2 ? 6 : 0))).setScale(p[2] * sc * (0.8 + 0.3 * pulse) * flick * (o.casting ? 1.3 : 1)).setAlpha((0.22 + 0.22 * pulse + 0.2 * Math.min(1, drive)) * k * (i === 2 ? 0.8 : 1));
    });
    if (o.hand && o.casting) this.glows[0].setPosition(Math.round(o.hand.m.x), Math.round(o.hand.m.y)).setTint(L.hot).setScale(0.7 * sc * (0.8 + 0.4 * pulse)).setAlpha(0.45 * k);

    // afterimages: echoes of the real frame on fast travel, dash and a sharp change of direction
    this.ghostClock -= dt;
    const want = !o.reduced && this.ghostClock <= 0 && (f >= 2 ? fast || turned : o.dashing);
    if (want) {
      this.ghostClock = f === 2 ? 0.045 : f === 3 ? 0.06 : 0.07;
      let g = this.ghosts.find(q => q.life <= 0);
      if (!g && this.ghosts.length < (o.crowded ? 5 : 9)) { g = { spr: this.scene.add.sprite(0, 0, o.srcKey, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.2), life: 0, max: 1, a: 0 }; this.ghosts.push(g); }
      if (g) { g.max = g.life = L.ghostLife; g.a = L.ghost * (turned ? 1.3 : 1); g.spr.setTexture(o.srcKey, o.srcFrame).setOrigin(h.originX, h.originY).setFlipX(h.flipX).setScale(o.scale * 1.02).setPosition(Math.round(x), Math.round(y)).setTint(f === 3 ? 0xe8f0ff : L.col).setVisible(true); g.spr.tintMode = Phaser.TintModes.FILL; }
    }

    // ground reactions: light ripples while moving, stronger on dash start / stop
    const gy = y - 2; this.rippleClock -= dt;
    if (fast && this.rippleClock <= 0 && !o.reduced) { this.rippleClock = f === 2 ? 0.2 : 0.3; this.ring(x, gy, L.col, 60 * L.ring, L.ringAlpha * 0.5, 0.4); }
    if (o.dashing && !this.dashWas) this.ring(x, gy, L.hot, 150 * L.ring, L.ringAlpha, 0.45);
    if (!o.dashing && this.dashWas) this.ring(x, gy, L.col, 110 * L.ring, L.ringAlpha * 0.85, 0.4);
    this.dashWas = o.dashing;
  }
  destroy() { for (const s of this.sil) s.destroy(); for (const g of this.glows) g.destroy(); for (const g of this.ghosts) g.spr.destroy(); for (const r of this.rings) r.im.destroy(); }
}

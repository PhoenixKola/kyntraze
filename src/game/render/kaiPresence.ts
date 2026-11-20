/** Kai Transformation Presence 2.0 (Kai's three transformed forms only): an energy silhouette that breathes and lags behind the body, body-bound energy at shoulders / fists / feet, afterimages that echo the real sprite on fast movement, and small ground shockwaves. Code-drawn from existing textures and the live sprite frame; reads render state only. */
import Phaser from 'phaser';
import { b14Key } from './b14fx';
import { formFxKey } from './formFx';

/** ImageGen sheets (art/fx-b24 -> public/art/fx/kai-p): per form 4 variants of a ground shockwave ring, a limb-wrapping energy arc and an upward energy wisp. */
export const KP_FORM = ['', 'flare', 'comet', 'still'] as const;
export const KP_NAMES = (['flare', 'comet', 'still'] as const).flatMap(f => (['ring', 'wrap', 'lick'] as const).flatMap(k => [0, 1, 2, 3].map(i => `${f}_${k}${i}`)));
export const kpKey = (n: string) => `kp-${n}`; export const kpUrl = (n: string) => `/art/fx/kai-p/${n}.png`;
interface Look { col: number; hot: number; sil: number; ghost: number; ghostLife: number; ring: number; ringAlpha: number }
const LOOK: Record<1 | 2 | 3, Look> = {
  1: { col: 0xff9a2e, hot: 0xffd27a, sil: 0.34, ghost: 0.26, ghostLife: 0.3, ring: 1.0, ringAlpha: 0.55 },
  2: { col: 0xffcf2a, hot: 0xfff2a0, sil: 0.42, ghost: 0.5, ghostLife: 0.34, ring: 1.3, ringAlpha: 0.75 },
  3: { col: 0xcfdcff, hot: 0xffffff, sil: 0.3, ghost: 0.46, ghostLife: 0.5, ring: 1.15, ringAlpha: 0.5 },
};
interface Ghost { spr: Phaser.GameObjects.Sprite; life: number; max: number; a: number }
interface Ring { flat?: boolean; im: Phaser.GameObjects.Image; t: number; dur: number; s0: number; s1: number; a: number }
export interface PresenceInput { dt: number; form: 0 | 1 | 2 | 3; on: boolean; hero: Phaser.GameObjects.Sprite; srcKey: string; srcFrame: number | string; scale: number; dashing: boolean; casting: boolean; reduced: boolean; crowded: boolean; hand: { m: { x: number; y: number } } | null; running: boolean }

export class KaiPresence {
  private sil: Phaser.GameObjects.Sprite[] = []; private ghosts: Ghost[] = []; private rings: Ring[] = []; private glows: Phaser.GameObjects.Image[] = [];
  private lx = 0; private ly = 0; private px = 0; private py = 0; private clock = 0; private ghostClock = 0; private rippleClock = 0; private dashWas = false; private speed = 0; private lastDir = { x: 0, y: 0 }; private fresh = true; private form = 1; private ringN = 0; private jit = { x: 0, y: 0 }; private jitClock = 0; private wraps: Phaser.GameObjects.Image[] = []; private licks: Phaser.GameObjects.Image[] = [];
  constructor(private readonly scene: Phaser.Scene) {
    const blank = 'kp-blank'; if (!scene.textures.exists(blank)) { scene.textures.createCanvas(blank, 2, 2)!.refresh(); }
    for (let i = 0; i < 2; i++) this.sil.push(scene.add.sprite(0, 0, blank, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.35 - i * 0.02).setVisible(false));
    for (let i = 0; i < 6; i++) this.wraps.push(scene.add.image(0, 0, blank).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.45).setVisible(false));
    for (let i = 0; i < 3; i++) this.licks.push(scene.add.image(0, 0, blank).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.3).setVisible(false));
    for (let i = 0; i < 5; i++) this.glows.push(scene.add.image(0, 0, formFxKey('glow')).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.4).setVisible(false));
  }
  private ring(x: number, y: number, tint: number, size: number, a: number, dur: number) {
    if (this.rings.length >= 12) return;
    const art = kpKey(`${KP_FORM[this.form]}_ring${(this.ringN++) % 4}`), has = this.scene.textures.exists(art), key = has ? art : b14Key('shock_ring'); if (!this.scene.textures.exists(key)) return;
    const im = this.scene.add.image(x, y, key).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.9).setAlpha(0); if (!has) im.setTint(tint);
    this.rings.push({ im, t: 0, dur, s0: size * 0.25 * (has ? 1.5 : 1), s1: size * (has ? 1.5 : 1), a: has ? Math.min(1, a * 1.4) : a, flat: has });
  }
  burst(x: number, y: number, form: number, big = 1) { const L = LOOK[form as 1 | 2 | 3]; if (L) this.ring(x, y, L.hot, 170 * L.ring * big, L.ringAlpha, 0.55); }
  private hide() { for (const s of this.wraps) s.setVisible(false); for (const s of this.licks) s.setVisible(false); for (const s of this.sil) s.setVisible(false); for (const g of this.glows) g.setVisible(false); this.fresh = true; }
  update(o: PresenceInput) {
    const dt = o.running ? o.dt : 0;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t += dt; const u = r.t / r.dur; if (u >= 1) { r.im.destroy(); this.rings.splice(i, 1); continue; }
      const size = (r.s0 + (r.s1 - r.s0) * (1 - (1 - u) ** 2)) / r.im.width; r.im.setScale(size, r.flat ? size : size * 0.45).setAlpha(r.a * (1 - u) ** 1.4);
    }
    for (const g of this.ghosts) { if (g.life > 0) { g.life -= dt; g.spr.setVisible(g.life > 0).setAlpha(Math.max(0, g.life / g.max) * g.a); } else g.spr.setVisible(false); }
    if (!o.on || o.form < 1) { this.hide(); return; }
    const f = o.form as 1 | 2 | 3; this.form = f; const L = LOOK[f], h = o.hero, x = h.x, y = h.y, k = o.reduced ? 0.6 : o.crowded ? 0.8 : 1;
    if (this.fresh) { this.lx = x; this.ly = y; this.px = x; this.py = y; this.fresh = false; }
    this.clock += dt; this.jitClock -= dt; if (this.jitClock <= 0) { this.jitClock = 0.05; this.jit = { x: Math.round((Math.random() - 0.5) * 5), y: Math.round((Math.random() - 0.5) * 3) }; }
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
      const rise = f === 1 && i ? ((this.clock * 0.9) % 1) : 0, split = f === 3 ? (i ? 4 : -4) * (0.5 + 0.5 * Math.sin(this.clock * 1.3)) : 0;
      s.setScale(o.scale * grow, o.scale * grow * (1 + 0.08 * rise)).setPosition(Math.round(x + (this.lx - x) * lag + split + (f === 2 ? this.jit.x : 0)), Math.round(y + (this.ly - y) * lag - 2 - 3 * breathe - 10 * rise + (f === 2 ? this.jit.y : 0))).setAlpha(sa * (i ? 0.55 : 1) * (f === 1 && i ? 1 - rise : 1));
    });

    // body-bound energy: soft pulses pinned to shoulders, upper back and feet; a fist glow follows the real hand anchor while casting
    const sc = o.scale / 0.5, pulse = 0.65 + 0.35 * Math.sin(this.clock * (f === 2 ? 11 : 6)), flick = f === 2 ? (Math.sin(this.clock * 43) > 0.4 ? 1.25 : 0.9) : 1;
    const pts: [number, number, number][] = [[-16, -44, 0.5], [16, -44, 0.5], [0, -60, 0.45], [-9, 0, 0.55], [9, 0, 0.55]];
    this.glows.forEach((g, i) => {
      const p = pts[i];
      g.setVisible(true).setTint(i === 2 ? L.hot : L.col).setPosition(Math.round(x + p[0] * sc), Math.round(y + p[1] * sc - (i > 2 ? 6 : 0))).setScale(p[2] * sc * (0.8 + 0.3 * pulse) * flick * (o.casting ? 1.3 : 1)).setAlpha((0.22 + 0.22 * pulse + 0.2 * Math.min(1, drive)) * k * (i === 2 ? 0.8 : 1));
    });
    if (o.hand && o.casting) this.glows[0].setPosition(Math.round(o.hand.m.x), Math.round(o.hand.m.y)).setTint(L.hot).setScale(0.7 * sc * (0.8 + 0.4 * pulse)).setAlpha(0.45 * k);

    // ImageGen energy bound to the body: arcs wrapped around shoulders / forearms / shins, wisps rising off the back and shoulders (flipbooks, pinned to the sprite)
    const fps = f === 2 ? 22 : f === 3 ? 5 : 11, fr = Math.floor(this.clock * fps), fk = KP_FORM[f], act = (0.5 + 0.5 * Math.min(1, drive)) * k;
    const place = (im: Phaser.GameObjects.Image, name: string, px: number, py: number, w: number, rot: number, a: number, flip = false) => {
      const key = kpKey(name); if (!this.scene.textures.exists(key)) { im.setVisible(false); return; }
      im.setTexture(key).setVisible(true).setPosition(Math.round(px), Math.round(py)).setRotation(rot).setScale((w * sc / im.width) * (flip ? -1 : 1), w * sc / im.width).setAlpha(Math.min(1, a));
    };
    const aim = o.hand && o.casting ? Math.atan2(o.hand.m.y - y + 30, o.hand.m.x - x) : 0, flipL = h.flipX ? -1 : 1;
    const W: [number, number, number, number, number][] = [[-15, -46, 44, -0.7, 0], [15, -46, 44, 0.7, 1], [-14, -26, 38, -1.2, 2], [14, -26, 38, 1.2, 3], [-8, -4, 40, 0.1, 0], [8, -4, 40, -0.1, 1]];
    this.wraps.forEach((im, i) => { const q = W[i]; place(im, `${fk}_wrap${(fr + q[4]) % 4}`, x + q[0] * sc * flipL, y + q[1] * sc * 1.6, q[2], q[3] * flipL + (i === 2 || i === 3 ? aim * 0.4 : 0), (0.55 + 0.3 * Math.sin(this.clock * 7 + i)) * act * (o.casting && i >= 2 && i <= 3 ? 1.4 : 1), i % 2 === 1); });
    this.licks.forEach((im, i) => { const ph = (this.clock * (f === 3 ? 0.6 : 1.1) + i / 3) % 1, px = [0, -18, 18][i], py = [-60, -50, -50][i]; place(im, `${fk}_lick${(fr + i) % 4}`, x + px * sc, y + (py - 14 * ph) * sc * 1.5, 30, (i - 1) * 0.25 + Math.sin(this.clock * 3 + i) * 0.1, (1 - ph) * (0.5 + 0.35 * Math.min(1, drive)) * k * 1.3); });
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
  destroy() { for (const s of this.wraps) s.destroy(); for (const s of this.licks) s.destroy(); for (const s of this.sil) s.destroy(); for (const g of this.glows) g.destroy(); for (const g of this.ghosts) g.spr.destroy(); for (const r of this.rings) r.im.destroy(); }
}

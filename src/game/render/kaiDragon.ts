/** Primal Overdrive dragon, drawn as a living CONTOUR around Kai (not a pasted sprite): a tapered, translucent serpent body built every frame from a follow-the-leader chain, coiled round the hero in a perspective ellipse, with bright edge lines, dorsal spines and scale ticks. Only the head is ImageGen art (the approved per-form heads); it leads the chain, opens its jaws on strikes and lunges at real targets. Rear and front halves of the coil are drawn on two layers, so the body passes behind and in front of Kai. */
import Phaser from 'phaser';

const N = 28, TURNS = 1.55;
const STYLE = {
  1: { fill: [255, 104, 18], edge: [255, 214, 120], w: 20, alpha: 0.12, bolts: false, whisk: 0 },
  2: { fill: [232, 180, 0], edge: [255, 242, 160], w: 23, alpha: 0.12, bolts: true, whisk: 2 },
  3: { fill: [140, 180, 255], edge: [236, 244, 255], w: 15, alpha: 0.1, bolts: false, whisk: 2 },
} as const;
const HEAD_W = { 1: 120, 2: 128, 3: 118 } as const;
const KEYS = ['', 'flare', 'comet', 'still'] as const;
const sstep = (a: number) => { const t = Math.max(0, Math.min(1, a)); return t * t * (3 - 2 * t); };

export interface DragonInput { dt: number; clock: number; x: number; y: number; sc: number; form: 1 | 2 | 3; amount: number; vx: number; vy: number; aimX: number; aimY: number; fly: boolean; dash: boolean; reduced: boolean; crowded: boolean }

export class OverdriveDragon {
  private readonly rear: Phaser.GameObjects.Graphics; private readonly front: Phaser.GameObjects.Graphics; private readonly head: Phaser.GameObjects.Image; private readonly limb: Phaser.GameObjects.Image; private readonly tail: Phaser.GameObjects.Image; private limbT = 0; private lastRight = true;
  private readonly cx = new Float32Array(N); private readonly cy = new Float32Array(N); private readonly px = new Float32Array(N); private readonly py = new Float32Array(N);
  private readonly wh: number[][] = [[], []]; private col = { fill: [255, 104, 18], edge: [255, 214, 120] }; private fresh = true;
  private spin = 0; private flyMix = 0; private lunge = 0; private lx = 0; private ly = 0; private jaw = 0; private bolts: number[][] = []; private boltT = 0; private lastForm = 0; private aim = 0;
  constructor(private readonly scene: Phaser.Scene) {
    const blank = 'kp-blank'; if (!scene.textures.exists(blank)) scene.textures.createCanvas(blank, 2, 2)!.refresh();
    this.rear = scene.add.graphics().setDepth(9.0).setBlendMode(Phaser.BlendModes.ADD);
    this.front = scene.add.graphics().setDepth(11.3).setBlendMode(Phaser.BlendModes.ADD);
    this.limb = scene.add.image(0, 0, blank).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setOrigin(0.04, 0.5).setDepth(9.04);
    this.tail = scene.add.image(0, 0, blank).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setOrigin(0.97, 0.5).setDepth(9.0);
    this.head = scene.add.image(0, 0, blank).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setOrigin(0.3, 0.55);
  }
  /** A strike or signature lunge: the head surges toward the world point and the jaws open. */
  strike(x: number, y: number, power = 1) { this.lunge = Math.min(1.4, Math.max(this.lunge, 0.7 * power)); this.lx = x; this.ly = y; this.jaw = 1; this.limbT = 1; }
  get visible() { return this.head.visible; }
  hide() { this.rear.clear(); this.front.clear(); this.head.setVisible(false); this.limb.setVisible(false); this.tail.setVisible(false); this.fresh = true; this.lunge = 0; }

  update(i: DragonInput) {
    const { dt, clock, sc } = i;
    if (i.amount < 0.02) { if (this.head.visible) this.hide(); return; }
    this.rear.clear(); this.front.clear();
    const st = STYLE[i.form], key = KEYS[i.form], cy0 = i.y - 34 * sc, A = i.amount;
    if (this.lastForm !== i.form) { if (this.lastForm === 0) this.col = { fill: [...st.fill], edge: [...st.edge] }; this.lastForm = i.form; }
    for (let k = 0; k < 3; k++) { this.col.fill[k] += (st.fill[k] - this.col.fill[k]) * Math.min(1, dt * 6); this.col.edge[k] += (st.edge[k] - this.col.edge[k]) * Math.min(1, dt * 6); }
    const rgb = (c: number[]) => (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);
    const fillC = rgb(this.col.fill), edgeC = rgb(this.col.edge);
    this.flyMix += ((i.fly || i.dash ? 1 : 0) - this.flyMix) * Math.min(1, dt * 7);
    this.lunge = Math.max(0, this.lunge - dt * 4); this.jaw = Math.max(0, this.jaw - dt * 2.2);
    const sp = Math.hypot(i.vx, i.vy), mv = sp > 40;
    const aimA = Math.atan2(i.aimY || 0.001, i.aimX || 0.001); let da = aimA - this.aim; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; this.aim += da * Math.min(1, dt * 6);
    const dirA = mv ? Math.atan2(i.vy, i.vx) : this.aim, dx = Math.cos(dirA), dy = Math.sin(dirA);
    this.spin += dt * (0.8 + 2.6 * (1 - Math.min(1, A * 1.3)));
    const R0 = 50 * sc, vis = Math.min(N, Math.ceil(N * Math.min(1, A * 1.35)));
    // ---- the chain: ring coil blended with a streamlined trail in flight / dash; each link trails the hero with its own lag
    for (let n = 0; n < N; n++) {
      const s = n / (N - 1), k = this.fresh ? 1 : Math.min(1, dt * (15 - 10 * s));
      this.cx[n] += (i.x - this.cx[n]) * k; this.cy[n] += (cy0 - this.cy[n]) * k;
      const th = this.aim + s * TURNS * 6.2832 + Math.sin(clock * 1.3) * 0.12 + this.spin, R = (R0 - 18 * s * sc) * (1 + 0.05 * Math.sin(clock * 2.1 + s * 5));
      const rx = this.cx[n] + Math.cos(th) * R, ry = this.cy[n] + Math.sin(th) * R * 0.42 - (1 - s) * 52 * sc + s * 16 * sc + Math.sin(clock * 1.7 + s * 6) * 2 * sc;
      const tl = n * 9.5 * sc, wv = Math.sin(clock * 6 - s * 9) * 7 * sc * s, tx = this.cx[n] - dx * tl - dy * wv, ty = this.cy[n] - dy * tl * 0.7 + dx * wv * 0.5 - (1 - s) * 16 * sc;
      this.px[n] = rx + (tx - rx) * this.flyMix; this.py[n] = ry + (ty - ry) * this.flyMix;
    }
    // head target: shoulder height toward the aim, surging at a struck target
    const hs = sstep(1 - this.flyMix), hxT = this.cx[0] + Math.cos(this.aim) * 24 * sc * hs + dx * 40 * sc * this.flyMix, hyT = this.cy[0] - 84 * sc + Math.sin(this.aim) * 16 * sc * hs + dy * 14 * sc * this.flyMix;
    const lg = this.lunge > 0 ? sstep(this.lunge / 0.7) : 0, tgx = this.lx - i.x, tgy = this.ly - cy0, tgd = Math.hypot(tgx, tgy) || 1, reach = Math.min(tgd - 18 * sc, 62 * sc) * lg;
    const hx = hxT + (tgx / tgd) * reach, hy = hyT + (tgy / tgd) * reach;
    for (let n = 0; n < 6; n++) { const w = sstep(n / 5); this.px[n] = hx + (this.px[n] - hx) * w; this.py[n] = hy + (this.py[n] - hy) * w; }
    // ---- body ribbon
    const L: number[] = [], Rr: number[] = [], nx: number[] = [], ny: number[] = [], wd: number[] = [];
    for (let n = 0; n < vis; n++) {
      const a = Math.max(0, n - 1), b = Math.min(N - 1, n + 1); let tx = this.px[a] - this.px[b], ty = this.py[a] - this.py[b]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const s = n / (N - 1), w = st.w * sc * (0.45 + 0.55 * Math.sin(Math.min(1, s / 0.22) * 1.5708)) * Math.pow(Math.max(0.05, 1 - s * 0.9), 0.8) * (0.4 + 0.6 * Math.min(1, A * 1.6 - s * 0.6 + 0.2));
      let qx = -ty, qy = tx; if (qy < 0) { qx = -qx; qy = -qy; } const bl = 0.5 * (1 - this.flyMix * 0.6); qx *= 1 - bl; qy = qy * (1 - bl) + bl; const ql = Math.hypot(qx, qy) || 1; nx[n] = qx / ql; ny[n] = qy / ql; wd[n] = w; L.push(this.px[n] + nx[n] * w / 2, this.py[n] + ny[n] * w / 2); Rr.push(this.px[n] - nx[n] * w / 2, this.py[n] - ny[n] * w / 2);
    }
    const alpha = A * (i.crowded ? 0.75 : 1), a0 = st.alpha * alpha;
    for (let n = 1; n < vis; n++) {
      const g = Math.sin(this.aim + (n / (N - 1)) * TURNS * 6.2832 + this.spin) > 0 && this.flyMix < 0.5 ? this.front : this.rear, n2 = n * 2, p2 = (n - 1) * 2;
      if (g === this.rear) { g.fillStyle(fillC, a0); g.fillTriangle(L[p2], L[p2 + 1], L[n2], L[n2 + 1], Rr[n2], Rr[n2 + 1]); g.fillTriangle(L[p2], L[p2 + 1], Rr[n2], Rr[n2 + 1], Rr[p2], Rr[p2 + 1]); }   // only the far half of the coil is tinted; the near half is a bare stroke so Kai stays fully visible
      const ea = (g === this.front ? 0.42 : 0.6) * alpha, fade = 1 - n / (N * 1.2);
      g.lineStyle(1.5, edgeC, ea * fade); g.lineBetween(L[p2], L[p2 + 1], L[n2], L[n2 + 1]); g.lineBetween(Rr[p2], Rr[p2 + 1], Rr[n2], Rr[n2 + 1]);
      if (n % 2 === 0) { g.lineStyle(1, edgeC, 0.16 * alpha * fade); g.lineBetween(L[p2], L[p2 + 1], Rr[n2], Rr[n2 + 1]); }   // scale tick
      if (n % 2 === 1 && n > 2) { const sw = wd[n] * 0.3 + 3 * sc; g.fillStyle(edgeC, (g === this.front ? 0.18 : 0.38) * alpha * fade); g.fillTriangle(L[p2], L[p2 + 1], L[n2], L[n2 + 1], (L[p2] + L[n2]) / 2 + nx[n] * sw * 0.9, (L[p2 + 1] + L[n2 + 1]) / 2 + ny[n] * sw * 0.9); }   // dorsal spine
    }
    // spine of light along the centre line
    
    // ---- whiskers (lagging, spring-driven) and Cometheart arcs
    if (st.whisk && !i.reduced) for (let k = 0; k < 2; k++) {
      const arr = this.wh[k], dir = k === 0 ? -1 : 1, hxw = hx - Math.cos(this.aim) * 6 * sc, hyw = hy + 2 * sc; if (arr.length === 0) for (let q = 0; q < 12; q++) arr.push(hxw, hyw);
      let ax = hxw, ay = hyw; this.front.lineStyle(1.2, edgeC, 0.55 * alpha);
      for (let q = 0; q < 6; q++) { const tgx2 = ax - Math.cos(this.aim + dir * 0.9) * 10 * sc + Math.sin(clock * 2 + q + k) * 1.5, tgy2 = ay + 4 * sc + dir * 3 * sc; const kk = Math.min(1, dt * (16 - q * 1.5)); arr[q * 2] += (tgx2 - arr[q * 2]) * kk; arr[q * 2 + 1] += (tgy2 - arr[q * 2 + 1]) * kk; this.front.lineBetween(ax, ay, arr[q * 2], arr[q * 2 + 1]); ax = arr[q * 2]; ay = arr[q * 2 + 1]; }
    }
    if (st.bolts && !i.reduced) {
      this.boltT -= dt; if (this.boltT <= 0) { this.boltT = 0.11; this.bolts = []; for (let q = 0; q < 2; q++) { const n = 2 + Math.floor(Math.random() * Math.max(1, vis - 4)), a = Math.random() * 6.28, pts = [this.px[n], this.py[n]]; for (let z = 1; z <= 3; z++) pts.push(pts[0] + Math.cos(a) * z * 11 * sc + (Math.random() - 0.5) * 8 * sc, pts[1] + Math.sin(a) * z * 8 * sc + (Math.random() - 0.5) * 8 * sc); this.bolts.push(pts); } }
      this.front.lineStyle(1.4, 0xffffff, 0.7 * alpha); for (const b of this.bolts) for (let z = 0; z < 3; z++) this.front.lineBetween(b[z * 2], b[z * 2 + 1], b[z * 2 + 2], b[z * 2 + 3]);
    }
    // ---- head (ImageGen art): leads the chain, mirrors to face its travel, opens the jaws on strikes
    const fwx = hx - this.px[3], fwy = hy - this.py[3], right = this.lunge > 0.3 ? tgx >= 0 : Math.abs(Math.cos(this.aim)) > 0.3 ? Math.cos(this.aim) > 0 : this.lastRight, ang = Math.atan2(fwy, Math.abs(fwx) + 4) * 0.55 * (right ? 1 : -1);
    const frame = this.jaw > 0.55 ? 2 : this.jaw > 0.12 || this.lunge > 0 ? 1 : 0, fk = `ko-${key}_head${frame}`;
    if (this.scene.textures.exists(fk)) {
      const w = HEAD_W[i.form] * sc * (1 + this.jaw * 0.12) * (0.55 + 0.45 * Math.min(1, A * 1.6));
      this.head.setTexture(fk).setVisible(true).setPosition(Math.round(hx), Math.round(hy)).setScale((w / this.head.width) * (right ? 1 : -1), w / this.head.width).setRotation(ang).setAlpha(Math.min(0.85, alpha)).setDepth(9.05);
    }
    // ---- ImageGen forelimb: reaches from the shoulder to the struck point and rakes; tail fin (ImageGen) trails off the last link
    this.limbT = Math.max(0, this.limbT - dt * 2.7);
    const lk = (n: number) => `ko-${key}_limb${n}`, tk = (n: number) => `ko-${key}_tail${n}`;
    if (this.limbT > 0 && this.scene.textures.exists(lk(0))) {
      const u = 1 - this.limbT, fr = Math.min(3, Math.floor(u * 4)), sx = this.px[7], sy = this.py[7], ax = this.lx - sx, ay = this.ly - sy, la = Math.atan2(ay, ax), w = (70 + 55 * Math.sin(Math.min(1, u * 1.6) * 1.5708)) * sc;
      this.limb.setTexture(lk(fr)).setVisible(true).setPosition(Math.round(sx), Math.round(sy)).setScale(w / this.limb.width * (Math.abs(la) > 1.5708 ? 1 : 1), (w / this.limb.width) * (Math.abs(la) > 1.5708 ? -1 : 1)).setRotation(la).setAlpha(Math.min(1, this.limbT * 3) * alpha * 0.7);
    } else this.limb.setVisible(false);
    // tail (ImageGen) grows from the base of Kai's spine like a normal tail: behind him, drooping and swaying; in front of him only when he faces away
    if (this.scene.textures.exists(tk(0))) {
      const ax = Math.cos(this.aim), ay = Math.sin(this.aim), bx = i.x - ax * 13 * sc, by = i.y - 30 * sc - ay * 5 * sc;
      const th = Math.atan2(-ay * 0.5 + 0.45 + Math.sin(clock * 2.1) * 0.12, -ax * 0.9 + (Math.abs(ax) < 0.3 ? (this.lastRight ? -0.6 : 0.6) : 0)), left = Math.cos(th) < 0, tw = 105 * sc * (0.55 + 0.45 * A) * (this.flyMix > 0.5 ? 1.2 : 1);
      this.tail.setTexture(tk(Math.floor(clock * 5) % 4)).setVisible(true).setPosition(Math.round(bx), Math.round(by)).setScale((tw / this.tail.width) * (left ? 1 : -1), tw / this.tail.width).setRotation(left ? th - Math.PI : th).setAlpha(0.85 * alpha).setDepth(ay < -0.5 && this.flyMix < 0.5 ? 11.3 : 9.0);
    } else this.tail.setVisible(false);
    this.lastRight = right; this.fresh = false;
  }
  destroy() { this.rear.destroy(); this.front.destroy(); this.head.destroy(); this.limb.destroy(); this.tail.destroy(); }
}

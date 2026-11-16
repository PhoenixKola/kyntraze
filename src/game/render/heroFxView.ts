/** B19: everything Ren and Sora draw on top of the world that is not the character sprite: projectiles, orbs, shockwaves, the Lance, ground telegraphs, the transformation reveal and the persistent auras.
 *  Pure projection of sim state (state.hx, state.abilityEvents, state.cinema); it never decides anything. Drawn with two Graphics layers (normal + additive) so the cost is two draw batches whatever the crowd. */
import Phaser from 'phaser';
import type { GameState, HeroCast } from '../../sim/GameState';
import { hand, lanceHalfWidth } from '../../sim/HeroSystem';
import { ASCEND, REN, SORA } from '../../content/heroKits';
import { KAI_GROUND_DY } from '../../assets/kaiAnimation';

/** ImageGen VFX sprites (public/art/fx/<hero>/): additive, used for the aura and the big moments; the Graphics layers keep the geometry (rings, beams, bolts). */
export const HERO_FX_NAMES: Record<'ren' | 'sora', readonly string[]> = {
  ren: ['afterimage_streak', 'aura_wisp_a', 'aura_wisp_b', 'dust_puff', 'embers', 'fist_orb', 'ground_crack', 'ground_ring', 'impact_burst', 'light_pillar', 'speed_streak', 'supernova_ring'],
  sora: Array.from({ length: 20 }, (_, i) => `vfx_${String(i).padStart(2, '0')}`),
};
export const heroFxKey = (hero: string, n: string) => `hfx-${hero}-${n}`;
export const heroFxUrl = (hero: string, n: string) => `/art/fx/${hero}/${n}.png`;
const PAL = {
  ren: { core: 0xfff0d8, hot: 0xff7a3d, mid: 0xff2e2a, deep: 0x8a0f1c, dark: 0x2a0508, ember: 0xffb36b },
  sora: { core: 0xffffff, hot: 0xcfeeff, mid: 0x4db8ff, deep: 0x1c5fd6, dark: 0x081840, ember: 0x9fe8ff },
};
interface Flash { x: number; y: number; t: number; dur: number; r: number; kind: 'slash' | 'burst' | 'flare' | 'dust' | 'crack' | 'pillar'; ang: number; big: boolean }
const fillQuad = (g: Phaser.GameObjects.Graphics, q: { x: number; y: number }[]) => { g.fillTriangle(q[0].x, q[0].y, q[1].x, q[1].y, q[2].x, q[2].y); g.fillTriangle(q[0].x, q[0].y, q[2].x, q[2].y, q[3].x, q[3].y); };
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const ease = (u: number) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;

export class HeroFxView {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private flashes: Flash[] = [];
  private readonly imgs: Phaser.GameObjects.Image[] = []; private used = 0;
  /** Pooled additive image: the sprite layer of the aura and the big moments (hidden again every frame unless re-placed). */
  private put(name: string, x: number, y: number, scale: number, alpha: number, o: { rot?: number; sy?: number; oy?: number; depth?: number; flip?: boolean } = {}) {
    const key = heroFxKey(this.hero, name); if (!this.scene.textures.exists(key) || alpha <= 0.01) return;
    let im = this.imgs[this.used]; if (!im) { if (this.imgs.length >= 64) return; im = this.scene.add.image(0, 0, key).setBlendMode(Phaser.BlendModes.ADD); this.imgs.push(im); }
    this.used++; im.setTexture(key).setVisible(true).setPosition(Math.round(x), Math.round(y)).setScale(scale * (o.flip ? -1 : 1), scale * (o.sy ?? 1)).setAlpha(Math.min(1, alpha)).setRotation(o.rot ?? 0).setOrigin(0.5, o.oy ?? 0.5).setDepth(o.depth ?? 11.3);
  }
  private lastEvent = 0;
  private zoom = 1; private shake = 0;
  constructor(private readonly scene: Phaser.Scene, private readonly hero: 'ren' | 'sora') {
    this.ground = scene.add.graphics().setDepth(3.6);
    this.g = scene.add.graphics().setDepth(11);
    this.glow = scene.add.graphics().setDepth(11.2).setBlendMode(Phaser.BlendModes.ADD);
  }
  /** Camera punch-in of the reveal (the scene multiplies it into its fit zoom). */
  cameraZoom() { return this.zoom; }
  destroy() { for (const i of this.imgs) i.destroy(); this.ground.destroy(); this.g.destroy(); this.glow.destroy(); }

  update(s: GameState, dt: number, reduced: boolean, crowded: boolean, wx: number, wy: number) {
    const pal = PAL[this.hero], p = s.player, h = s.hx;
    this.ground.clear(); this.g.clear(); this.glow.clear(); this.used = 0;
    for (const e of s.abilityEvents) if (e.id > this.lastEvent) { this.lastEvent = e.id; this.onEvent(e.kind, e.x, e.y, e.n ?? 0, s, reduced); }
    this.flashes = this.flashes.filter(f => (f.t += dt) < f.dur);
    const foot = { x: wx, y: wy };   // ground point between the soles
    const aura = p.form === 1 && !s.cinema, calmFx = reduced || crowded;

    // ---- telegraphs on the ground
    const c = h.act;
    if (c?.act === 'bloodstar') this.reticle(c, s);
    if (c?.act === 'meteor_rush' && c.hop < c.hops.length) for (let i = c.hop; i < c.hops.length; i++) { const a = i === c.hop ? { x: p.x, y: p.y } : c.hops[i - 1], b = c.hops[i]; this.ground.lineStyle(2, pal.mid, 0.35).lineBetween(a.x, a.y + KAI_GROUND_DY * 0.4, b.x, b.y + KAI_GROUND_DY * 0.4); this.ground.lineStyle(1, pal.core, 0.5).strokeCircle(b.x, b.y + 8, 18 + 3 * Math.sin(s.time * 14)); }
    if (c?.act === 'celestial_lance' && !c.released) { const hw = lanceHalfWidth(s, Math.min(2, SORA.e.tiers.reduce((t, v, i) => (c.charge >= v ? i : t), 0) + (p.form === 1 ? 1 : 0)), p.form === 1); this.aimLine(c, hw, s); }

    // ---- expanding rings (already resolved or scheduled by the sim)
    for (const r of h.rings) {
      const u = r.t / r.dur, rad = r.r * ease(u), a = 1 - u;
      const col = r.kind === 'rebound' ? pal.hot : r.kind === 'horizon' ? pal.mid : pal.mid;
      this.ground.lineStyle(Math.max(2, 7 * a), col, 0.85 * a); this.ground.strokeEllipse(r.x, r.y + 6, rad * 2, rad * 1.1);
      this.glow.lineStyle(Math.max(1, 3 * a), pal.core, 0.7 * a).strokeEllipse(r.x, r.y + 6, rad * 2 * 0.97, rad * 1.1 * 0.97);
      if (r.kind === 'slam' && u < 0.5) { this.ground.fillStyle(pal.dark, 0.35 * (1 - u * 2)).fillEllipse(r.x, r.y + 6, rad * 1.5, rad * 0.8); }
    }
    for (const q of h.pending) { const u = Math.max(0, 1 - (q.at - h.t) / 0.5); if (q.radius > 0) this.ground.lineStyle(2, pal.mid, 0.25 + 0.4 * u).strokeEllipse(q.x, q.y + 6, q.radius * 2, q.radius * 1.1); }

    // ---- Sora's orbs and bolts
    for (const o of h.orbs) this.orb(o.x, o.y, h.orbPhase === 'converge' ? 1 : 0.8, h.orbPhase === 'converge', s, o.tx, o.ty);
    for (const b of h.bolts) this.bolt(b.x, b.y, b.vx, b.vy, b.kind === 'needle' ? 1 : 1.25, b.form === 1);

    // ---- the Lance
    if (c?.act === 'celestial_lance') this.lance(c, s, calmFx);

    // ---- chain links / arcs
    for (const a of h.arcs) { const u = a.t / a.dur; this.jag(a.x0, a.y0, a.x1, a.y1, 6, pal.core, pal.mid, 1 - u, s.time + a.id); }

    // ---- transient flashes (strikes, impacts, dust)
    for (const f of this.flashes) this.flash(f, pal);

    // ---- persistent aura and motion trails
    if (aura || s.cinema) { this.auraDraw(s, foot, calmFx, aura); this.auraSprites(s, foot, calmFx, aura); }
    if (p.dashRemaining > 0 && p.form === 1) { const n = calmFx ? 2 : 4; for (let i = 1; i <= n; i++) this.glow.fillStyle(pal.mid, 0.28 / i).fillEllipse(foot.x - p.dashDx * 22 * i, foot.y - 18 - p.dashDy * 12 * i, 22, 36); }

    // ---- reveal: expanding pulses, screen vignette is HTML-free; camera punch-in via cameraZoom
    const cin = s.cinema; this.zoom = 1;
    if (cin) this.reveal(cin, s, foot, calmFx, reduced);
    for (let i = this.used; i < this.imgs.length; i++) this.imgs[i].setVisible(false);
  }

  private onEvent(kind: string, x: number, y: number, n: number, s: GameState, reduced: boolean) {
    const pal = this.hero === 'ren';
    const add = (f: Partial<Flash> & { kind: Flash['kind'] }) => { if (this.flashes.length < 40) this.flashes.push({ x, y, t: 0, dur: 0.22, r: 46, ang: 0, big: false, ...f }); };
    switch (kind) {
      case 'auto_hit': add({ kind: 'slash', ang: Math.atan2(s.hx.strike.y, s.hx.strike.x), dur: 0.16, r: 40 }); break;
      case 'auto_finisher': add({ kind: 'slash', ang: Math.atan2(s.hx.strike.y, s.hx.strike.x), dur: 0.22, r: 58, big: true }); add({ kind: 'dust', dur: 0.3, r: 30 }); break;
      case 'hero_q_beat': { const last = (n & 128) !== 0; add({ kind: 'slash', ang: Math.atan2(s.hx.act?.dirY ?? 0, s.hx.act?.dirX ?? 1) + ((n >> 8) % 2 ? 0.5 : -0.5), dur: last ? 0.26 : 0.14, r: last ? 78 : 52, big: last }); if (last) add({ kind: 'burst', dur: 0.26, r: 70, big: true }); if (!reduced) this.shake = Math.max(this.shake, last ? 0.0032 : 0.0014); break; }
      case 'rush_strike': add({ kind: 'burst', dur: 0.3, r: 64, big: true }); add({ kind: 'dust', dur: 0.32, r: 40 }); if (!reduced) this.shake = Math.max(this.shake, 0.0024); break;
      case 'bloodstar_slam': add({ kind: 'crack', dur: 1.1, r: 150 }); add({ kind: 'burst', dur: 0.4, r: 120, big: true }); add({ kind: 'dust', dur: 0.5, r: 90 }); if (!reduced) this.shake = Math.max(this.shake, 0.0058); break;
      case 'bloodstar_rebound': add({ kind: 'burst', dur: 0.4, r: 150, big: true }); if (!reduced) this.shake = Math.max(this.shake, 0.0045); break;
      case 'lance_fire': add({ kind: 'flare', dur: 0.3, r: 40 + 16 * n }); if (!reduced) this.shake = Math.max(this.shake, 0.0016 + 0.0008 * n); break;
      case 'lance_pulse': add({ kind: 'flare', dur: 0.2, r: 30 + 10 * n }); break;
      case 'horizon_burst': add({ kind: 'flare', dur: 0.4, r: 80, big: true }); if (!reduced) this.shake = Math.max(this.shake, 0.004); break;
      case 'volley_fire': case 'needle_fire': add({ kind: 'flare', dur: 0.1, r: 16 }); break;
      case 'ascend_break': add({ kind: 'pillar', dur: 0.9, r: 200, big: true }); add({ kind: 'burst', dur: 0.6, r: 220, big: true }); add({ kind: 'dust', dur: 0.7, r: 160 }); if (!reduced) this.shake = Math.max(this.shake, 0.007); break;
      default: break;
    }
    void pal;
  }
  /** Camera shake the scene applies (0 = none), consumed once. */
  takeShake() { const v = this.shake; this.shake = 0; return v; }

  private reticle(c: HeroCast, s: GameState) {
    const pal = PAL.ren, fl0 = REN.r.windup, fl1 = REN.r.windup + REN.r.flight, R = REN.r.radius * s.mods.sphereRadius;
    if (c.t >= fl1) return; const u = Math.min(1, c.t / fl1), pulse = 0.5 + 0.5 * Math.sin(s.time * 18);
    this.ground.lineStyle(2, pal.hot, 0.55 + 0.3 * pulse).strokeEllipse(c.tx, c.ty + 6, R * 2, R * 1.1);
    this.ground.fillStyle(pal.deep, 0.06 + 0.07 * u).fillEllipse(c.tx, c.ty + 6, R * 2, R * 1.1);
    this.glow.lineStyle(3, pal.core, 0.5 + 0.4 * u).strokeEllipse(c.tx, c.ty + 6, R * 2 * (1 - 0.35 * u), R * 1.1 * (1 - 0.35 * u));
    if (c.t >= fl0) this.ground.fillStyle(0x000000, 0.25).fillEllipse(s.player.x, c.ty + 10, 36, 14);
  }
  private aimLine(c: HeroCast, hw: number, s: GameState) {
    const pal = PAL.sora, o = hand(s, c.dirX, c.dirY, 26, 'lance'), len = 300 + 380 * Math.min(1, c.charge / SORA.e.maxCharge), nx = -c.dirY, ny = c.dirX, a = 0.14 + 0.2 * Math.min(1, c.charge / 0.8);
    fillQuad(this.ground.fillStyle(pal.mid, a), [{ x: o.x + nx * hw * 0.6, y: o.y + ny * hw * 0.6 }, { x: o.x + c.dirX * len + nx * hw * 0.6, y: o.y + c.dirY * len + ny * hw * 0.6 }, { x: o.x + c.dirX * len - nx * hw * 0.6, y: o.y + c.dirY * len - ny * hw * 0.6 }, { x: o.x - nx * hw * 0.6, y: o.y - ny * hw * 0.6 }]);
  }
  private bolt(x: number, y: number, vx: number, vy: number, k: number, form: boolean) {
    const pal = PAL.sora, sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, L = 22 * k;
    this.glow.lineStyle(7 * k, pal.mid, 0.28).lineBetween(x - ux * L * 1.4, y - uy * L * 1.4, x + ux * 4, y + uy * 4);
    this.g.lineStyle(3.2 * k, form ? pal.core : pal.hot, 1).lineBetween(x - ux * L, y - uy * L, x, y);
    this.g.fillStyle(pal.core, 1).fillCircle(x, y, 2.6 * k);
  }
  private orb(x: number, y: number, k: number, hot: boolean, s: GameState, tx: number, ty: number) {
    const pal = PAL.sora, pulse = 0.85 + 0.15 * Math.sin(s.time * 20 + x);
    this.glow.fillStyle(pal.mid, 0.22).fillCircle(x, y, 20 * k * pulse); this.glow.fillStyle(pal.hot, 0.45).fillCircle(x, y, 11 * k);
    this.g.fillStyle(pal.core, 1).fillCircle(x, y, 5 * k); this.g.lineStyle(2, pal.deep, 0.9).strokeCircle(x, y, 9.5 * k);
    if (hot) { this.glow.lineStyle(1.5, pal.hot, 0.35).lineBetween(x, y, tx, ty); this.ground.lineStyle(1, pal.core, 0.6).strokeEllipse(tx, ty + 6, 26, 14); }
  }
  private lance(c: HeroCast, s: GameState, calm: boolean) {
    const pal = PAL.sora;
    if (!c.released) {   // gather: motes streaming into the hands, a growing core and tier rings
      const o = hand(s, c.dirX, c.dirY, 24, 'lance'), u = Math.min(1, c.charge / SORA.e.maxCharge), n = calm ? 4 : 8;
      for (let i = 0; i < n; i++) { const ph = (s.time * 1.6 + i / n) % 1, a = (i / n) * Math.PI * 2 + s.time * 3, r = (1 - ph) * (40 + 30 * u); this.glow.fillStyle(pal.hot, 0.8 * ph).fillCircle(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r * 0.7, 1.6 + 1.4 * ph); }
      this.glow.fillStyle(pal.mid, 0.3 + 0.3 * u).fillCircle(o.x, o.y, 8 + 14 * u); this.g.fillStyle(pal.core, 1).fillCircle(o.x, o.y, 3 + 6 * u);
      SORA.e.tiers.forEach((t, i) => { if (c.charge >= t) this.glow.lineStyle(2, pal.core, 0.7).strokeCircle(o.x, o.y, 14 + i * 7 + 3 * Math.sin(s.time * 24)); });
      return;
    }
    const tf = c.t - SORA.e.maxCharge, life = SORA.e.fire + 0.14; if (tf > life) return;
    const a = 1 - Math.max(0, tf) / life, hw = lanceHalfWidth(s, c.tier, c.form === 1), nx = -c.dirY, ny = c.dirX, L = c.len, x0 = c.sx, y0 = c.sy, x1 = x0 + c.dirX * L, y1 = y0 + c.dirY * L;
    const band = (w: number, col: number, al: number, layer: Phaser.GameObjects.Graphics) => fillQuad(layer.fillStyle(col, al), [{ x: x0 + nx * w, y: y0 + ny * w }, { x: x1 + nx * w * 0.8, y: y1 + ny * w * 0.8 }, { x: x1 - nx * w * 0.8, y: y1 - ny * w * 0.8 }, { x: x0 - nx * w, y: y0 - ny * w }]);
    band(hw * 1.7, pal.deep, 0.22 * a, this.glow); band(hw * 1.15, pal.mid, 0.55 * a, this.glow); band(hw * 0.62, pal.hot, 0.9 * a, this.g); band(hw * 0.28, pal.core, 1 * a, this.g);
    this.glow.fillStyle(pal.core, 0.8 * a).fillCircle(x0, y0, hw * 1.3); this.glow.fillStyle(pal.hot, 0.6 * a).fillCircle(x1, y1, hw * 1.1);
    if (c.form === 1) this.jag(x0, y0, x1, y1, calm ? 5 : 9, pal.core, pal.mid, a, Math.floor(s.time * 30), hw * 0.9);
  }
  private jag(x0: number, y0: number, x1: number, y1: number, segs: number, core: number, edge: number, a: number, seed: number, amp = 8) {
    const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1; let px = x0, py = y0;
    for (let i = 1; i <= segs; i++) {
      const u = i / segs, off = i === segs ? 0 : (hash(seed * 7 + i) - 0.5) * 2 * amp, qx = x0 + (x1 - x0) * u + nx / nl * off, qy = y0 + (y1 - y0) * u + ny / nl * off;
      this.glow.lineStyle(5, edge, 0.35 * a).lineBetween(px, py, qx, qy); this.g.lineStyle(1.8, core, a).lineBetween(px, py, qx, qy); px = qx; py = qy;
    }
  }
  private flash(f: Flash, pal: typeof PAL.ren) {
    const u = f.t / f.dur, a = 1 - u, r = f.r * ease(u * 1.4), ren = this.hero === 'ren';
    if (f.kind === 'burst') this.put(ren ? 'impact_burst' : 'vfx_15', f.x, f.y, f.r * (ren ? 2.4 / 256 : 2.4 / 481) * (0.6 + 0.6 * ease(u * 1.5)), 0.95 * a, { rot: f.x });
    else if (f.kind === 'flare') this.put(ren ? 'fist_orb' : 'vfx_13', f.x, f.y, f.r * (ren ? 2 / 256 : 2 / 356) * (0.7 + 0.5 * u), a);
    else if (f.kind === 'dust') this.put(ren ? 'dust_puff' : 'vfx_08', f.x, f.y + 8, f.r * 2.4 / 256 * (0.5 + 0.8 * ease(u)), 0.5 * a, { sy: 0.6, depth: 3.8 });
    else if (f.kind === 'crack') this.put('ground_crack', f.x, f.y + 6, f.r * 2.1 / 256, Math.min(1, 1.6 * a), { sy: 0.55, depth: 3.7 });
    else if (f.kind === 'pillar') this.put(ren ? 'light_pillar' : 'vfx_16', f.x, f.y + 4, (ren ? 0.95 : 0.85) * (0.8 + 0.3 * ease(u)), 0.9 * a, { oy: 0.95, sy: 1.35, depth: 11.5 });
    if (f.kind === 'slash') {   // a crescent of energy swept across the target
      const w = Math.PI * 0.62; this.glow.lineStyle(f.big ? 9 : 6, pal.mid, 0.7 * a).beginPath().arc(f.x, f.y, r, f.ang - w / 2, f.ang + w / 2).strokePath();
      this.g.lineStyle(f.big ? 4 : 2.6, pal.core, a).beginPath().arc(f.x, f.y, r * 0.95, f.ang - w / 2 + 0.12, f.ang + w / 2 - 0.12).strokePath();
    } else if (f.kind === 'burst') {
      this.glow.fillStyle(pal.hot, 0.55 * a).fillCircle(f.x, f.y, r * 0.55); this.glow.lineStyle(f.big ? 6 : 3, pal.mid, 0.8 * a).strokeCircle(f.x, f.y, r);
      for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2 + f.x, l0 = r * 0.5, l1 = r * (0.9 + 0.5 * hash(i + f.x)); this.g.lineStyle(2.4, i % 2 ? pal.core : pal.hot, a).lineBetween(f.x + Math.cos(an) * l0, f.y + Math.sin(an) * l0 * 0.7, f.x + Math.cos(an) * l1, f.y + Math.sin(an) * l1 * 0.7); }
    } else if (f.kind === 'flare') {
      this.glow.fillStyle(pal.core, 0.85 * a).fillCircle(f.x, f.y, r * 0.3 * (1 - u * 0.5)); this.glow.fillStyle(pal.mid, 0.5 * a).fillCircle(f.x, f.y, r * (0.5 + 0.5 * u));
      this.glow.lineStyle(2, pal.core, 0.8 * a).lineBetween(f.x - r * 1.4 * ease(u), f.y, f.x + r * 1.4 * ease(u), f.y);
    } else {   // dust: low grey-warm puffs on the ground plane
      for (let i = 0; i < 7; i++) { const an = (i / 7) * Math.PI * 2 + hash(f.x + i), d = r * ease(u) * (0.6 + 0.5 * hash(i)); this.ground.fillStyle(0x6b5a56, 0.32 * a).fillCircle(f.x + Math.cos(an) * d, f.y + 10 + Math.sin(an) * d * 0.45, 6 + 8 * u); }
    }
  }
  private auraDraw(s: GameState, foot: { x: number; y: number }, calm: boolean, steady: boolean) {
    const pal = PAL[this.hero], t = s.time, p = s.player, moving = s.hx.moving && !s.cinema, boost = s.hx.act ? 1.5 : p.dashRemaining > 0 ? 1.7 : 1;
    const k = steady ? 1 : 0.6, n = calm ? 6 : 14;
    // ground corona: a breathing ellipse, never a screen-filling disc
    const breathe = 0.85 + 0.15 * Math.sin(t * 3.2);
    this.ground.fillStyle(pal.deep, 0.22 * k * boost).fillEllipse(foot.x, foot.y + 4, 62 * breathe, 24 * breathe);
    this.glow.lineStyle(2, pal.mid, 0.45 * k * boost).strokeEllipse(foot.x, foot.y + 4, 56 * breathe, 21 * breathe);
    if (this.hero === 'ren') {
      for (let i = 0; i < n; i++) { const ph = (t * (moving ? 0.9 : 0.55) + i / n) % 1, x = foot.x + (hash(i * 3.1) - 0.5) * 34 * (0.4 + ph), y = foot.y - 6 - ph * (moving ? 74 : 62); this.glow.fillStyle(i % 3 ? pal.ember : pal.hot, 0.9 * (1 - ph) * k).fillCircle(x, y, 2.2 * (1 - ph * 0.6)); }
      for (let i = 0; i < (calm ? 2 : 4); i++) { const ph = (t * 1.3 + i / 4) % 1, x = foot.x + (hash(i + 9.3) - 0.5) * 30, y = foot.y - 8 - ph * 54; this.glow.lineStyle(2, pal.mid, 0.5 * (1 - ph) * k).lineBetween(x, y, x + (hash(i) - 0.5) * 4, y - 12 * (1 - ph)); }   // light streaks / heat licks
      if (moving) for (let i = 1; i <= (calm ? 2 : 4); i++) this.glow.lineStyle(3, pal.mid, 0.3 / i).lineBetween(foot.x - p.aimX * 14 * i, foot.y - 22, foot.x - p.aimX * (14 * i + 18), foot.y - 22 - p.aimY * 6 * i);
    } else {
      for (let i = 0; i < n; i++) { const a = t * (moving ? 2.2 : 1.1) + (i / n) * Math.PI * 2, r = 22 + 10 * hash(i * 5.7), x = foot.x + Math.cos(a) * r, y = foot.y - 28 + Math.sin(a) * r * 0.9; this.glow.fillStyle(i % 2 ? pal.core : pal.hot, 0.8 * k).fillCircle(x, y, 1.7); }
      const bucket = Math.floor(t * (moving ? 14 : 8)), segs = calm ? 1 : 2;   // soft electric arcs flick around the body
      for (let j = 0; j < segs; j++) { const a0 = hash(bucket + j * 13) * Math.PI * 2, r0 = 14 + 6 * hash(bucket * 3 + j), x0 = foot.x + Math.cos(a0) * r0, y0 = foot.y - 28 + Math.sin(a0) * r0 * 0.9; this.jag(x0, y0, x0 + Math.cos(a0 + 0.8) * 26, y0 + Math.sin(a0 + 0.8) * 22, 4, pal.core, pal.mid, 0.9 * k, bucket + j, 5); }
      if (moving) for (let i = 1; i <= (calm ? 2 : 4); i++) this.glow.lineStyle(2, pal.hot, 0.34 / i).lineBetween(foot.x - p.aimX * 12 * i, foot.y - 24 + i, foot.x - p.aimX * (12 * i + 22), foot.y - 24 + i);   // thin ribbons
    }
  }
  /** Sprite layer of the persistent aura: flame tongues + embers (Ren) / lightning + ribbons + motes (Sora), anchored to the body, reacting to idle / moving / casting / dash. */
  private auraSprites(s: GameState, foot: { x: number; y: number }, calm: boolean, steady: boolean) {
    const t = s.time, p = s.player, moving = s.hx.moving && !s.cinema, boost = s.hx.act ? 1.35 : p.dashRemaining > 0 ? 1.6 : 1, k = (steady ? 1 : 0.65) * boost;
    if (this.hero === 'ren') {
      this.put('ground_ring', foot.x, foot.y + 5, 0.2 * (0.95 + 0.05 * Math.sin(t * 5)), 0.7 * k, { sy: 0.45, depth: 3.7 });
      const n = calm ? 3 : 5;
      for (let i = 0; i < n; i++) {   // flame tongues licking up around the silhouette, some behind and some in front of the body
        const side = i % 2 ? 1 : -1, ph = (t * 1.5 + i * 0.37) % 1, x = foot.x + side * (11 + 8 * hash(i * 2.3)) - (moving ? p.aimX * 5 : 0), y = foot.y - 4 - 14 * hash(i + 5);
        this.put(i % 2 ? 'aura_wisp_a' : 'aura_wisp_b', x, y, 0.12 + 0.045 * hash(i), (0.32 + 0.22 * Math.sin(t * 9 + i * 1.7)) * Math.min(1.25, k), { oy: 0.95, sy: 0.85 + 0.35 * ph, flip: side > 0, depth: i < 3 ? 9.4 : 11.3 });
      }
      this.put('embers', foot.x, foot.y - 34 - 10 * ((t * 0.5) % 1), 0.3 * (calm ? 0.8 : 1), 0.55 * Math.min(1.25, k) * (0.7 + 0.3 * Math.sin(t * 7)), { depth: 11.4 });
      if (moving) this.put('speed_streak', foot.x - p.aimX * 30, foot.y - 24 - p.aimY * 8, 0.3, 0.55 * k, { rot: Math.atan2(-p.aimY, -p.aimX) + (p.aimX < 0 ? Math.PI : 0), depth: 9.3 });
    } else {
      this.put('vfx_19', foot.x, foot.y + 5, 0.2 * (0.95 + 0.05 * Math.sin(t * 4)), 0.8 * k, { sy: 0.5, depth: 3.7 });
      const bucket = Math.floor(t * (moving ? 12 : 7)), n = calm ? 1 : 2;
      for (let j = 0; j < n; j++) { const a = hash(bucket * 3 + j) * Math.PI * 2, r = 12 + 10 * hash(bucket + j * 7); this.put(`vfx_0${Math.floor(hash(bucket + j * 11) * 3)}`, foot.x + Math.cos(a) * r, foot.y - 26 + Math.sin(a) * r * 0.8, 0.22, (0.5 + 0.5 * hash(bucket * 7 + j)) * k, { rot: a, depth: 11.3 }); }   // lightning flicks
      for (let i = 0; i < 2; i++) { const a = t * (moving ? 1.8 : 0.9) + i * Math.PI; this.put(i ? 'vfx_03' : 'vfx_04', foot.x + Math.cos(a) * 20, foot.y - 24 + Math.sin(a) * 14, 0.15, 0.6 * k, { rot: a, depth: i ? 9.4 : 11.3 }); }   // energy ribbons orbiting
      for (let i = 0; i < (calm ? 2 : 4); i++) { const ph = (t * 0.7 + i / 4) % 1; this.put(`vfx_0${5 + (i % 5)}`, foot.x + (hash(i * 3.3) - 0.5) * 34, foot.y - 10 - ph * 58, 0.14, 0.9 * (1 - ph) * k, { depth: 11.4 }); }   // rising motes
      if (moving) this.put('vfx_10', foot.x - p.aimX * 28, foot.y - 24 - p.aimY * 6, 0.3, 0.6 * k, { rot: Math.atan2(p.aimY, p.aimX), depth: 9.3 });
    }
  }
  private reveal(cin: NonNullable<GameState['cinema']>, s: GameState, foot: { x: number; y: number }, calm: boolean, reduced: boolean) {
    const pal = PAL[this.hero], t = cin.t, u = Math.min(1, t / cin.dur), commit = Math.min(1, t / cin.commitAt);
    this.zoom = reduced ? 1 : 1 + 0.2 * Math.sin(Math.min(1, t / (cin.dur * 0.8)) * Math.PI * 0.5) * (t < cin.commitAt + 0.5 ? 1 : 1 - Math.min(1, (t - cin.commitAt - 0.5) / 0.6));
    // gathering: spiralling motes pulled into the body, an escalating pulse, then the eruption column and shockwave at the break
    const n = calm ? 10 : 24; for (let i = 0; i < n; i++) { const ph = (t * 1.1 + i / n) % 1, a = (i / n) * Math.PI * 2 + t * 4 * (1 + commit), r = (1 - ph) * (90 - 30 * commit); this.glow.fillStyle(i % 2 ? pal.hot : pal.mid, 0.85 * ph).fillCircle(foot.x + Math.cos(a) * r, foot.y - 30 + Math.sin(a) * r * 0.75, 1.8 + 2 * ph); }
    const pulse = 0.5 + 0.5 * Math.sin(t * (6 + 14 * commit)); this.ground.fillStyle(pal.deep, 0.2 + 0.25 * commit).fillEllipse(foot.x, foot.y + 4, 70 + 50 * commit, 26 + 18 * commit);
    this.glow.lineStyle(3, pal.mid, 0.4 + 0.4 * pulse).strokeEllipse(foot.x, foot.y + 4, 64 + 40 * commit * pulse, 24 + 14 * commit * pulse); for (let i = 0; i < (calm ? 8 : 16); i++) { const an = (i / 16) * Math.PI * 2 + t * 0.8, r0 = (150 - 70 * commit) * (0.8 + 0.2 * hash(i)), r1 = r0 * 0.55; this.glow.lineStyle(1.6, i % 2 ? pal.core : pal.hot, (0.15 + 0.5 * commit) * (0.5 + 0.5 * pulse)).lineBetween(foot.x + Math.cos(an) * r0, foot.y - 30 + Math.sin(an) * r0 * 0.7, foot.x + Math.cos(an) * r1, foot.y - 30 + Math.sin(an) * r1 * 0.7); }   // thin converging rays, no filled body halo
    if (t >= cin.breakAt) { const b = (t - cin.breakAt) / (cin.dur - cin.breakAt + 0.001), a = Math.max(0, 1 - b * 1.4); this.glow.fillStyle(pal.core, 0.55 * a).fillRect(foot.x - 22 * (1 - b * 0.4), foot.y - 340, 44 * (1 - b * 0.4), 360);   // eruption column
      this.glow.fillStyle(pal.hot, 0.3 * a).fillRect(foot.x - 44, foot.y - 340, 88, 360); for (let k = 0; k < 2; k++) { const rr = (ASCEND.knockRadius * 1.1) * ease(b - k * 0.12); if (rr > 0) this.ground.lineStyle(Math.max(2, 9 * a), pal.mid, 0.8 * a).strokeEllipse(foot.x, foot.y + 6, rr * 2, rr * 1.1); } }
    void u; void s;
  }
}

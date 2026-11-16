/** B19: everything Ren and Sora draw on top of the world that is not the character sprite: projectiles, orbs, shockwaves, the Lance, ground telegraphs, the transformation reveal and the persistent auras.
 *  Pure projection of sim state (state.hx, state.abilityEvents, state.cinema); it never decides anything. Drawn with two Graphics layers (normal + additive) so the cost is two draw batches whatever the crowd. */
import Phaser from 'phaser';
import type { GameState, HeroCast } from '../../sim/GameState';
import { hand, lanceHalfWidth } from '../../sim/HeroSystem';
import { ASCEND, REN, SORA } from '../../content/heroKits';
import { KAI_GROUND_DY } from '../../assets/kaiAnimation';

/** ImageGen VFX sprites (public/art/fx/<hero>/): additive, used for the aura and the big moments; the Graphics layers keep the geometry (rings, beams, bolts). */
export const HERO_FX_NAMES: Record<'ren' | 'sora', readonly string[]> = {
  ren: ['rs_slash1', 'rs_slash2', 'rs_finisher', 'rs_rush', 'rs_dashlines', 'rs_dashslash', 'rs_meteor', 'rs_impact', 'rs_ring', 'rs_fissure', 'rs_afterimage', 'rs_fist', 'ra_back1', 'ra_back2', 'ra_veil', 'ra_embersring', 'ra_ground', 'ra_pillar', 'ra_nova', 'ra_embers', 'afterimage_streak', 'aura_wisp_a', 'aura_wisp_b', 'dust_puff', 'embers', 'fist_orb', 'ground_crack', 'ground_ring', 'impact_burst', 'light_pillar', 'speed_streak', 'supernova_ring'],
  sora: [...Array.from({ length: 20 }, (_, i) => `vfx_${String(i).padStart(2, '0')}`), 'sl_beam', 'sl_beam2', 'sl_muzzle', 'sl_cap', 'sl_orb1', 'sl_orb2', 'sl_orb3', 'sl_vortex', 'sm_needle', 'sm_volley', 'sm_dashlines', 'sm_dashslash', 'sm_back1', 'sm_back2', 'sm_arcs', 'sm_ground', 'sm_motes', 'sm_afterimage', 'sm_ring', 'sm_hit'],
};
export const heroFxKey = (hero: string, n: string) => `hfx-${hero}-${n}`;
export const heroFxUrl = (hero: string, n: string) => `/art/fx/${hero}/${n}.png`;
const PAL = {
  ren: { core: 0xfff0d8, hot: 0xff7a3d, mid: 0xff2e2a, deep: 0x8a0f1c, dark: 0x2a0508, ember: 0xffb36b },
  sora: { core: 0xffffff, hot: 0xcfeeff, mid: 0x4db8ff, deep: 0x1c5fd6, dark: 0x081840, ember: 0x9fe8ff },
};
interface Flash { x: number; y: number; t: number; dur: number; r: number; kind: 'slash' | 'burst' | 'flare' | 'dust' | 'crack' | 'pillar'; ang: number; big: boolean }
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const ease = (u: number) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;

export class HeroFxView {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private flashes: Flash[] = [];
  private readonly imgs: Phaser.GameObjects.Image[] = []; private used = 0;
  /** Pooled additive image: the sprite layer of the aura and the big moments (hidden again every frame unless re-placed). */
  private put(name: string, x: number, y: number, scale: number, alpha: number, o: { rot?: number; sy?: number; ox?: number; oy?: number; depth?: number; flip?: boolean } = {}) {
    const key = heroFxKey(this.hero, name); if (!this.scene.textures.exists(key) || alpha <= 0.01) return;
    let im = this.imgs[this.used]; if (!im) { if (this.imgs.length >= 110) return; im = this.scene.add.image(0, 0, key).setBlendMode(Phaser.BlendModes.ADD); this.imgs.push(im); }
    this.used++; im.setTexture(key).setVisible(true).setPosition(Math.round(x), Math.round(y)).setScale(scale * (o.flip ? -1 : 1), scale * (o.sy ?? 1)).setAlpha(Math.min(1, alpha)).setRotation(o.rot ?? 0).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5).setDepth(o.depth ?? 11.3);
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
      if (rad > 4) this.put(this.hero === 'ren' ? (r.kind === 'rebound' ? 'ra_nova' : 'rs_ring') : 'sm_ring', r.x, r.y + 6, (rad * 2) / (this.hero === 'ren' && r.kind === 'rebound' ? 424 : this.hero === 'ren' ? 394 : 365), 0.95 * a, { sy: this.hero === 'ren' && r.kind === 'rebound' ? 0.5 : 1.15, depth: 3.7 });
      void col;
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
    const o = hand(s, c.dirX, c.dirY, 26, 'lance'), len = 300 + 380 * Math.min(1, c.charge / SORA.e.maxCharge), a = 0.16 + 0.3 * Math.min(1, c.charge / 0.8);
    this.put('sl_beam2', o.x, o.y, len / 1572, a, { rot: Math.atan2(c.dirY, c.dirX), ox: 0, sy: (hw * 1.5) / 40, depth: 3.9 });   // the damage lane, drawn as faint beam art on the floor
  }
  private bolt(x: number, y: number, vx: number, vy: number, k: number, form: boolean) {
    const ang = Math.atan2(vy, vx); this.put(k > 1 ? 'sm_volley' : 'sm_needle', x, y, (k > 1 ? 64 : 54) / (k > 1 ? 371 : 359) * (form ? 1.15 : 1), 1, { rot: ang, ox: 1, depth: 11.2 });
    if (form) this.put('sm_afterimage', x, y, 46 / 392, 0.45, { rot: ang, ox: 1, depth: 11.1 });
  }
  private orb(x: number, y: number, k: number, hot: boolean, s: GameState, tx: number, ty: number) {
    const pulse = 0.9 + 0.1 * Math.sin(s.time * 20 + x);
    this.put('sl_orb2', x, y, (hot ? 38 : 30) * k * pulse / 335, 1, { rot: s.time * 3 + x, depth: 11.3 });
    if (hot) { this.glow.lineStyle(1.5, PAL.sora.hot, 0.35).lineBetween(x, y, tx, ty); this.ground.lineStyle(1, PAL.sora.core, 0.6).strokeEllipse(tx, ty + 6, 26, 14); }
  }
  private lance(c: HeroCast, s: GameState, calm: boolean) {
    if (!c.released) {   // gather: an orb that grows through three ImageGen stages, with a vortex pulling light into the hands
      const o = hand(s, c.dirX, c.dirY, 24, 'lance'), u = Math.min(1, c.charge / SORA.e.maxCharge), pulse = 0.92 + 0.08 * Math.sin(s.time * 26);
      const stage = c.charge >= SORA.e.tiers[1] ? 'sl_orb3' : c.charge >= SORA.e.tiers[0] ? 'sl_orb2' : 'sl_orb1', px = 22 + 52 * u, w = stage === 'sl_orb3' ? 530 : stage === 'sl_orb2' ? 335 : 161;
      this.put('sl_vortex', o.x, o.y, (px * 2.1) / 407, (0.25 + 0.55 * u) * (calm ? 0.7 : 1), { rot: -s.time * 5, depth: 11.25 });
      this.put(stage, o.x, o.y, px * pulse / w, 1, { rot: stage === 'sl_orb3' ? 0 : s.time * 4, depth: 11.3 });
      if (c.charge >= SORA.e.tiers[0]) this.put('sl_muzzle', o.x, o.y, (px * 1.7) / 404, 0.35 + 0.3 * u, { rot: Math.atan2(c.dirY, c.dirX), depth: 11.28 });
      return;
    }
    const tf = c.t - SORA.e.maxCharge, life = SORA.e.fire + 0.14; if (tf > life) return;
    const a = 1 - Math.max(0, tf) / life, hw = lanceHalfWidth(s, c.tier, c.form === 1), L = c.len, x0 = c.sx, y0 = c.sy, x1 = x0 + c.dirX * L, y1 = y0 + c.dirY * L, ang = Math.atan2(c.dirY, c.dirX);
    const open = Math.min(1, 0.55 + Math.max(0, tf) / 0.05), wob = 1 + 0.05 * Math.sin(s.time * 70);   // snaps open, then thins as it fades
    const sy = (hw * 2.2 / 52) * open * wob * (0.55 + 0.45 * a);
    this.put('sl_beam', x0, y0, (L * 1.03) / 1618, Math.min(1, 1.15 * a + 0.2), { rot: ang, ox: 0, sy, depth: 11.25 });
    if (c.tier >= 1 || c.form === 1) this.put('sl_beam2', x0, y0, (L * 1.03) / 1572, Math.min(1, a), { rot: ang, ox: 0, sy: sy * (c.form === 1 ? 1.5 : 1.15), depth: 11.26 });
    this.put('sl_muzzle', x0, y0, (hw * 5.5) / 404, a, { rot: ang, depth: 11.35 });
    this.put('sl_cap', x1, y1, (hw * 5) / 292, 0.9 * a, { rot: ang, depth: 11.3 });
  }
  private jag(x0: number, y0: number, x1: number, y1: number, segs: number, core: number, edge: number, a: number, seed: number, amp = 8) {
    const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1; let px = x0, py = y0;
    for (let i = 1; i <= segs; i++) {
      const u = i / segs, off = i === segs ? 0 : (hash(seed * 7 + i) - 0.5) * 2 * amp, qx = x0 + (x1 - x0) * u + nx / nl * off, qy = y0 + (y1 - y0) * u + ny / nl * off;
      this.glow.lineStyle(5, edge, 0.35 * a).lineBetween(px, py, qx, qy); this.g.lineStyle(1.8, core, a).lineBetween(px, py, qx, qy); px = qx; py = qy;
    }
  }
  private flash(f: Flash, pal: typeof PAL.ren) {
    const u = f.t / f.dur, a = 1 - u, ren = this.hero === 'ren', ang = f.ang;
    void pal;
    if (f.kind === 'burst') this.put(ren ? 'rs_impact' : 'sm_hit', f.x, f.y, f.r * 2.4 / (ren ? 396 : 325) * (0.6 + 0.6 * ease(u * 1.5)), 0.95 * a, { rot: ren ? 0 : f.x });
    else if (f.kind === 'flare') this.put(ren ? 'rs_fist' : 'sl_muzzle', f.x, f.y, f.r * (ren ? 2.2 / 309 : 2.6 / 404) * (0.7 + 0.5 * u), a, { rot: ren ? 0 : f.x });
    else if (f.kind === 'dust') this.put(ren ? 'dust_puff' : 'vfx_08', f.x, f.y + 8, f.r * 2.4 / 256 * (0.5 + 0.8 * ease(u)), 0.5 * a, { sy: 0.6, depth: 3.8 });
    else if (f.kind === 'crack') this.put(ren ? 'rs_fissure' : 'ground_crack', f.x, f.y + 6, f.r * 2.1 / (ren ? 353 : 256), Math.min(1, 1.6 * a), { sy: 0.55, depth: 3.7 });
    else if (f.kind === 'pillar') this.put(ren ? 'ra_pillar' : 'vfx_16', f.x, f.y + 4, (ren ? 0.8 : 0.85) * (0.8 + 0.3 * ease(u)), 0.9 * a, { oy: 0.95, sy: 1.35, depth: 11.5 });
    else if (f.kind === 'slash') {   // ImageGen crescent thrown toward the target; the finisher is the heavy double crescent
      const key = ren ? (f.big ? 'rs_finisher' : hash(f.x + f.y) > 0.5 ? 'rs_slash1' : 'rs_slash2') : 'sm_dashslash', w = ren ? (f.big ? 398 : 300) : 275;
      this.put(key, f.x - Math.cos(ang) * f.r * 0.5, f.y - Math.sin(ang) * f.r * 0.5, f.r * 2.3 / w * (0.75 + 0.35 * ease(u * 1.6)), 0.95 * a, { rot: ang, ox: 0.35 });
    }
  }
  /** The aura is ImageGen art in layers: a big halo and flame/lightning wings BEHIND the body (depth below the sprite), a thin veil in front, a ground sigil and rising motes. Nothing is drawn as an arrow or ribbon. */
  private auraDraw(s: GameState, foot: { x: number; y: number }, calm: boolean, steady: boolean) {
    const t = s.time, p = s.player, boost = s.hx.act ? 1.3 : p.dashRemaining > 0 ? 1.5 : 1, k = (steady ? 1 : 0.6) * boost, br = 0.9 + 0.1 * Math.sin(t * 3.2), fl = 0.85 + 0.15 * Math.sin(t * 9.1 + 1.3);
    const bx = foot.x, by = foot.y + 6;
    if (this.hero === 'ren') {
      this.put('ra_ground', bx, foot.y + 5, 0.2 * br, 0.8 * k, { sy: 0.9, depth: 3.7 });
      this.put('ra_back1', bx, by, 0.4 * (1 + 0.04 * Math.sin(t * 5)), Math.min(1, 0.65 * k * fl), { oy: 0.93, sy: 0.95 + 0.1 * Math.sin(t * 6.3), depth: 9.4 });
      this.put('ra_back2', bx, foot.y - 6, 0.42 * br, Math.min(1, 0.5 * k), { oy: 0.9, depth: 9.3, flip: Math.floor(t * 2) % 2 === 0 });
      this.put('ra_veil', bx, foot.y - 30, 0.22, 0.2 * k * fl, { rot: Math.sin(t * 2) * 0.05, depth: 10.6 });
      if (!calm) this.put('ra_embersring', bx, foot.y - 36 - 10 * ((t * 0.5) % 1), 0.3, 0.5 * k, { depth: 9.5 });
    } else {
      this.put('sm_ground', bx, foot.y + 5, 0.2 * br, 0.85 * k, { sy: 0.95, depth: 3.7 });
      this.put('sm_back1', bx, by, 0.44 * (1 + 0.04 * Math.sin(t * 5)), Math.min(1, 0.8 * k * fl), { oy: 0.9, sy: 0.95 + 0.1 * Math.sin(t * 6.3), depth: 9.4 });
      this.put('sm_back2', bx, foot.y - 38, 0.4 * br, Math.min(1, 0.6 * k), { depth: 9.3 });
      this.put('sm_arcs', bx, foot.y - 30, 0.34, (calm ? 0.2 : 0.3) * k * (Math.floor(t * 14) % 3 === 0 ? 0.3 : 1), { rot: Math.floor(t * 10) * 1.3, depth: 10.6 });
      if (!calm) this.put('sm_motes', bx, foot.y - 34 - 8 * ((t * 0.6) % 1), 0.4, 0.55 * k, { depth: 9.5 });
    }
  }
  private auraSprites(_s: GameState, _foot: { x: number; y: number }, _calm: boolean, _steady: boolean) { /* merged into auraDraw */ }
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

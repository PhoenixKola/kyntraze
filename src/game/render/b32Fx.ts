/** B32 ability identity layer: contact-aware, per-hero effect grammar on top of the existing kit renderers. Pure projection of sim state (abilityEvents, cast, hx fields, the Silver Echo);
 *  it never decides anything. Kai: lightning rush + crack + whiff/contact split; Silver Echo manifest / target / strike / expiry; Surge Step state. Sora: crystal. Ren: force. Vex: void.
 *  Art: ImageGen sheets cut by art/b32/process.py. Every effect is gated on what the simulation reports (hits, perfect, miss), so a miss never plays an impact. */
import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { METEOR, ECHO } from '../../content/kaiKit';
import { KAI_GROUND_DY } from '../../assets/kaiAnimation';
import { blocked } from '../../sim/CollisionSystem';
import { blueKey } from './vexTint';
import { ImpactDirector } from './impactDirector';

export const B32_FX = ['kl_arc', 'kl_fork', 'kl_snap', 'kl_coil', 'kl_web', 'kl_strike', 'ki_star', 'ki_crack', 'ki_crescent', 'ki_ring', 'ki_claw', 'ki_comet', 'ks_cut', 'ks_shards', 'ks_sigil', 'ks_fall', 'ks_wisp', 'ks_reticle',
  'sc_s', 'sc_m', 'sc_l', 'sc_feather', 'sc_bar', 'sc_star', 'rf_claws', 'rf_fist', 'rf_front', 'rf_crater', 'rf_cross', 'rf_cinders', 'vv_tear', 'vv_seal', 'vv_crescent', 'vv_blade', 'vv_ripple', 'vv_flash'] as const;
export const b32Key = (n: string) => `b32-${n}`;
export const b32Url = (n: string) => `/art/b32/${n}.webp`;
const GY = KAI_GROUND_DY, MID = GY - 34;   // sprite-space offset of the body centre / feet from the sim position
const ang = (dx: number, dy: number) => Math.atan2(dy, dx);
interface Pop { im: Phaser.GameObjects.Image; t: number; dur: number; w: number; grow: number; vx: number; vy: number; spin: number; fade: 'out' | 'inout' | 'snap'; a: number }
interface PopOpt { depth?: number; blend?: Phaser.BlendModes; rot?: number; origin?: [number, number]; sy?: number; vx?: number; vy?: number; spin?: number; grow?: number; fade?: 'out' | 'inout' | 'snap'; blue?: boolean; tint?: number; a?: number }
const MAX_POPS = 140;

export class B32Fx {
  private pops: Pop[] = []; private g: Phaser.GameObjects.Graphics; private lastEvent = 0; private readonly director = new ImpactDirector();
  private shake = 0; private beat = 0; private surgeClock = 0; private reticle: Phaser.GameObjects.Image | null = null; private echoSigil: Phaser.GameObjects.Image | null = null;
  private bars: Phaser.GameObjects.Image[] = []; private seen = new Set<number>();
  constructor(private readonly scene: Phaser.Scene) { this.g = scene.add.graphics().setDepth(3.65); }
  takeHitstop() { return this.director.take(); }
  takeShake() { const v = this.shake; this.shake = 0; return v; }
  private has(n: string) { return this.scene.textures.exists(b32Key(n)); }
  private pop(n: string, x: number, y: number, w: number, dur: number, o: PopOpt = {}) {
    if (!this.has(n) || this.pops.length >= MAX_POPS) return null;
    const im = this.scene.add.image(x, y, o.blue ? blueKey(this.scene, b32Key(n)) : b32Key(n)).setDepth(o.depth ?? 11.5).setBlendMode(o.blend ?? Phaser.BlendModes.ADD).setAlpha(0).setRotation(o.rot ?? 0);
    if (o.origin) im.setOrigin(...o.origin); if (o.tint !== undefined) im.setTint(o.tint);
    this.pops.push({ im, t: 0, dur, w, grow: o.grow ?? 1.2, vx: o.vx ?? 0, vy: o.vy ?? 0, spin: o.spin ?? 0, fade: o.fade ?? 'out', a: o.a ?? 1 });
    (im as unknown as { sy: number }).sy = o.sy ?? 1; return im;
  }
  /** Flat ground-plane variant (feet level, squashed like the arena's other floor marks). */
  private flat(n: string, x: number, y: number, w: number, dur: number, o: PopOpt = {}) { return this.pop(n, x, y, w, dur, { depth: 3.7, sy: 0.5, ...o }); }
  private heavy(w: 'heavy' | 'finisher', reduced: boolean) { this.director.request(w, reduced); }
  private kick(v: number, reduced: boolean) { if (!reduced) this.shake = Math.max(this.shake, v); }

  update(dt: number, s: GameState, reduced: boolean, crowded: boolean) {
    this.g.clear(); this.director.tick(s.phase === 'running' ? dt : 0);
    const p = s.player, k = s.hx.kk, gl = crowded ? 0.6 : 1, R = Math.random;
    for (const ev of s.abilityEvents) if (ev.id > this.lastEvent) { this.lastEvent = ev.id; this.onEvent(ev, s, reduced, gl); }
    // ---- pops
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const q = this.pops[i]; q.t += dt; const u = q.t / q.dur; if (u >= 1) { q.im.destroy(); this.pops.splice(i, 1); continue; }
      const sc = (q.w / q.im.width) * (1 + (q.grow - 1) * (1 - (1 - u) ** 2)); q.im.setScale(sc, sc * (q.im as unknown as { sy: number }).sy);
      q.im.setAlpha(q.a * (q.fade === 'inout' ? Math.sin(u * Math.PI) : q.fade === 'snap' ? (u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5) : u < 0.1 ? u / 0.1 : 1 - (u - 0.1) / 0.9)); q.im.x += q.vx * dt; q.im.y += q.vy * dt; if (q.spin) q.im.rotation += q.spin * dt;
    }
    if (s.phase !== 'running') return;
    const hero = s.hero;
    // ---- Meteor Drive telegraph: the real beat points (same step / reach / wall rule as the sim), then the committed end point
    const c = s.cast;
    if (hero === 'kai' && c?.kind === 'meteor' && k) {
      const left = METEOR.beats - k.meteorBeat, windup = Math.min(1, c.t / METEOR.windup);
      let x = p.x, y = p.y;
      const pts: { x: number; y: number; last: boolean }[] = [];
      for (let j = 0; j < left; j++) { for (let sub = 0; sub < 4; sub++) { const nx = x + c.dirX * METEOR.step / 4, ny = y + c.dirY * METEOR.step / 4; if (blocked(nx, ny, p.radius)) break; x = nx; y = ny; } pts.push({ x: x + c.dirX * 30, y: y + c.dirY * 30, last: k.meteorBeat + j === METEOR.beats - 1 }); }
      const pulse = 0.5 + 0.5 * Math.sin(s.time * 24);
      if (pts.length) this.g.lineStyle(2, 0xffc24a, 0.3 + 0.2 * windup).lineBetween(p.x, p.y + 18, pts[pts.length - 1].x, pts[pts.length - 1].y + 18);
      for (const q of pts) { const r = q.last ? METEOR.finalReach : METEOR.reach; this.g.lineStyle(q.last ? 3 : 2, q.last ? 0xff6a2a : 0xffc24a, (0.4 + 0.35 * pulse) * (0.4 + 0.6 * windup)).strokeEllipse(q.x, q.y + 18, r * 2, r * 0.95); if (q.last) { this.g.fillStyle(0xff5a1a, 0.06 + 0.1 * windup).fillEllipse(q.x, q.y + 18, r * 2, r * 0.95); } }
      if (c.t < METEOR.windup && !reduced) { this.pop('kl_coil', p.x - c.dirX * 8, p.y + MID, 90 + 40 * windup, 0.1, { depth: 10.5, rot: ang(c.dirX, c.dirY), a: 0.4 + 0.6 * windup, fade: 'snap' }); if (Math.random() < 0.4) this.pop('kl_snap', p.x + (Math.random() - 0.5) * 40, p.y + MID + (Math.random() - 0.5) * 40, 46, 0.12, { depth: 10.6, rot: Math.random() * 6.28 }); }
    }
    // ---- Silver Echo: persistent sigil under the double and a reticle on the target it has chosen
    const cl = k?.clone;
    if (cl && hero === 'kai') {
      if (!this.echoSigil && this.has('ks_sigil')) this.echoSigil = this.scene.add.image(0, 0, b32Key('ks_sigil')).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.72);
      if (this.echoSigil) { const lifeU = Math.max(0, cl.life / cl.maxLife); this.echoSigil.setVisible(true).setPosition(cl.x, cl.y + GY + 4).setDisplaySize(96, 96 * (143 / 384)).setAlpha((0.55 + 0.25 * Math.sin(s.time * 6)) * Math.min(1, cl.life * 3) * (0.5 + 0.5 * Math.min(1, lifeU * 3))); }
      const tg = cl.tid ? s.enemies.find(e => e.id === cl.tid && e.hp > 0) : undefined;
      if (tg && this.has('ks_reticle')) { if (!this.reticle) this.reticle = this.scene.add.image(0, 0, b32Key('ks_reticle')).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.8); this.reticle.setVisible(true).setPosition(tg.x, tg.y + 12).setDisplaySize(tg.radius * 3.2 + 14, (tg.radius * 3.2 + 14) * 0.62).setRotation(0).setAlpha(0.8 + 0.2 * Math.sin(s.time * 14)); this.g.lineStyle(1, 0xcfd8ff, 0.22).lineBetween(cl.x, cl.y + MID, tg.x, tg.y + MID * 0.6); } else this.reticle?.setVisible(false);
      // life ring around the double's feet (true remaining lifetime) beside the existing bar
      const lu = Math.max(0, cl.life / cl.maxLife); this.g.lineStyle(2, lu > 0.25 ? 0xcfd8ff : 0xff8a9a, 0.8); this.g.beginPath(); this.g.arc(cl.x, cl.y + GY + 2, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lu, false); this.g.strokePath();
    } else { this.echoSigil?.setVisible(false); this.reticle?.setVisible(false); }
    // ---- Surge Step: speed streaks and crackle while the buff is live and Kai is actually moving
    if (hero === 'kai' && k && k.surge > 0 && p.form === 0 && !reduced) {
      const sp = Math.hypot(p.vx, p.vy); this.surgeClock += dt;
      if (sp > 30 && this.surgeClock > 0.075) { this.surgeClock = 0; const a = ang(p.vx, p.vy); this.pop('kl_arc', p.x - Math.cos(a) * 14, p.y + MID + 8, 96, 0.2, { depth: 9, rot: a + Math.PI, origin: [0, 0.5], blue: true, grow: 1.1, a: 0.55 * gl }); if (Math.random() < 0.3) this.pop('kl_snap', p.x, p.y + GY - 6, 50, 0.14, { depth: 9.1, rot: Math.random() * 6.28, blue: true, a: 0.7 }); }
      if (sp <= 30 && this.surgeClock > 0.45) { this.surgeClock = 0; this.pop('kl_snap', p.x + (R() - 0.5) * 16, p.y + GY - 8, 46, 0.18, { depth: 9.1, rot: R() * 6.28, blue: true, a: 0.6 }); }
    }
    if (hero === 'kai' && k && k.surge > 0 && p.form === 0) {   // steady ring at the boots while the buff is live; it blinks when under 1.2 s remain
      const soon = k.surge < 1.2, blink = soon ? 0.5 + 0.5 * Math.sin(s.time * 22) : 1; this.g.lineStyle(2, 0x4fb8ff, (0.3 + (soon ? 0.4 : 0.1) * Math.sin(s.time * 6)) * blink).strokeEllipse(p.x, p.y + GY + 2, 56, 19);
    }
    // ---- Azure Prison bars (Sora): the crystal prison stands for its real lifetime, then shatters with the sim
    let bi = 0;
    for (const f of s.hx.sf ?? []) {
      if (f.k !== 'prison' || !this.has('sc_bar')) continue; const grow = Math.min(1, f.t / 0.3), n = 8;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.2; let im = this.bars[bi]; if (!im) { im = this.scene.add.image(0, 0, b32Key('sc_bar')).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 0.92); this.bars.push(im); } bi++; const bx = f.x + Math.cos(a) * f.r, by = f.y + 14 + Math.sin(a) * f.r * 0.5; im.setVisible(true).setPosition(bx, by).setDepth(3.8 + by / 16000 + (Math.sin(a) > 0 ? 6 : 0)).setDisplaySize(15, 58 * grow).setAlpha((0.55 + 0.35 * Math.sin(s.time * 5 + i)) * Math.min(1, grow * 2)); }
      this.g.lineStyle(2, 0x6fc8ff, 0.5).strokeEllipse(f.x, f.y + 14, f.r * 2, f.r);
    }
    for (let i = bi; i < this.bars.length; i++) this.bars[i].setVisible(false);
  }

  private onEvent(ev: GameState['abilityEvents'][number], s: GameState, reduced: boolean, gl: number) {
    const { x, y } = ev, n = ev.n ?? 0, kind = ev.kind, hits = (n >> 8) & 63, p = s.player, od = (n & 16384) !== 0;
    const R = Math.random;
    switch (kind) {
      /* ---------------------------------------------------------------- Kai: Meteor Drive */
      case 'meteor_start': this.beat = 0; break;
      case 'meteor_beat': {
        const last = n >= 100, h = last ? n - 100 : n, sx = ev.tx ?? x, sy = ev.ty ?? y, a = ang(x - sx, y - sy), len = Math.hypot(x - sx, y - sy) + 24;
        this.pop('kl_arc', sx, sy + MID, len, 0.22, { depth: 10.4, rot: a, origin: [0, 0.5], grow: 1.05, sy: last ? 2.1 : 1.5 });
        if (last) this.pop('kl_fork', sx + Math.cos(a) * len * 0.2, sy + MID + Math.sin(a) * len * 0.2, len * 1.2, 0.3, { depth: 10.45, rot: a, origin: [0, 0.5], grow: 1.1 });
        this.pop('kl_snap', sx, sy + MID, 70, 0.14, { depth: 10.5, rot: R() * 6.28 });
        if (h > 0) {   // real contact only: star frame + directional claw + sparks, with weight
          this.pop('ki_star', x, y + MID, last ? 230 : 120, last ? 0.26 : 0.17, { grow: 1.5, rot: R() * 6.28 });
          this.pop('ki_claw', x, y + MID, last ? 180 : 110, 0.22, { rot: a + Math.PI / 2 + (this.beat % 2 ? 0.35 : -0.35), grow: 1.35, depth: 11.6 });
          if (!reduced) for (let i = 0; i < (last ? 9 : 4); i++) { const t = a + (R() - 0.5) * 1.8; this.pop('kl_snap', x, y + MID, 26 + R() * 18, 0.26, { vx: Math.cos(t) * (220 + R() * 160), vy: Math.sin(t) * (220 + R() * 160) - 40, rot: t, spin: 0, fade: 'out' }); }
          this.heavy(last ? 'finisher' : 'heavy', reduced); this.kick(last ? 0.0042 : 0.0018, reduced);
        } else { this.pop('ki_crescent', x, y + MID + 4, 96, 0.18, { rot: a + Math.PI, a: 0.5, grow: 1.2 }); this.kick(0.0006, reduced); }   // whiff: a swipe of air, no impact, no hit-stop
        if (last) {
          this.flat('ki_crack', x, y + 12, 250, 1.2, { grow: 1.1, fade: 'out' }); this.flat('ki_ring', x, y + 14, 220, 0.5, { grow: 2.1, a: 0.9 }); this.pop('kl_strike', x, y - 70, 110, 0.22, { depth: 11.7, grow: 1.1, rot: 0, origin: [0.5, 0.9], sy: 1.2 });
          this.flat('ki_ring', x, y + 14, 70, 1.0, { grow: 1.4, a: 0.7, fade: 'inout' });   // the committed end point
        }
        this.beat++; break;
      }
      /* ---------------------------------------------------------------- Kai: Surge Step */
      case 'surge_start': this.flat('ki_ring', p.x, p.y + GY + 3, 210, 0.45, { blue: true, grow: 1.7 }); this.pop('kl_snap', p.x, p.y + MID, 150, 0.22, { blue: true, grow: 1.5, rot: R() * 6.28 }); this.pop('kl_coil', p.x, p.y + MID + 6, 130, 0.35, { blue: true, grow: 1.3, rot: -Math.PI / 2 }); if (!reduced) for (let i = 0; i < 6; i++) { const t = (i / 6) * 6.28; this.pop('kl_arc', p.x, p.y + GY - 4, 74, 0.28, { blue: true, rot: t, origin: [0, 0.5], grow: 1.3, depth: 9, a: 0.8 }); } break;
      case 'surge_end': this.flat('ki_ring', p.x, p.y + GY + 3, 150, 0.35, { blue: true, grow: 0.3, a: 0.7 }); break;
      case 'kai_auto': if (p.form === 0 && (s.hx.kk?.surge ?? 0) > 0 && ev.tx !== undefined) this.pop('ki_star', ev.tx, (ev.ty ?? y) + MID * 0.6, 54, 0.14, { blue: true, grow: 1.4, rot: R() * 6.28 }); break;
      /* ---------------------------------------------------------------- Kai: Silver Echo */
      case 'clone_spawn': {
        const a = ang(x - p.x, y - p.y), d = Math.hypot(x - p.x, y - p.y);
        this.pop('ks_cut', p.x, p.y + MID, 190, 0.28, { rot: Math.PI / 2, grow: 1.1 }); this.pop('ks_wisp', p.x, p.y + MID, Math.max(60, d + 56), 0.34, { rot: a, origin: [0, 0.5], grow: 1.05, sy: 1.3 });
        this.flat('ks_sigil', x, y + GY + 4, 150, 0.7, { grow: 1.5 }); this.pop('ks_shards', x, y + MID, 130, 0.36, { grow: 1.5 }); this.pop('ks_cut', x, y + MID, 150, 0.24, { rot: Math.PI / 2, grow: 1.1 }); break;
      }
      case 'clone_target': this.pop('ks_cut', x, y + MID, Math.hypot((ev.tx ?? x) - x, (ev.ty ?? y) - y) + 20, 0.16, { rot: ang((ev.tx ?? x) - x, (ev.ty ?? y) - y), origin: [0, 0.5], a: 0.55, grow: 1.02 }); break;
      case 'clone_strike': { const tx = ev.tx ?? x, ty = ev.ty ?? y, a = ang(tx - x, ty - y); this.pop('ks_cut', x, y + MID, Math.hypot(tx - x, ty - y) + 30, 0.16, { rot: a, origin: [0, 0.5], sy: 1.4, grow: 1.03 }); this.pop('ks_shards', tx, ty + MID * 0.6, 62, 0.22, { grow: 1.5 }); this.pop('ks_cut', tx, ty + MID * 0.6, 84, 0.16, { rot: a + 1.1 }); break; }
      case 'clone_hit': this.pop('ks_shards', x, y + MID, 70, 0.2, { grow: 1.4 }); break;
      case 'clone_end': if (n === 1) { this.pop('ks_shards', x, y + MID, 190, 0.45, { grow: 1.6 }); for (let i = 0; i < 4; i++) this.pop('ks_fall', x + (R() - 0.5) * 36, y + MID - 20, 36, 0.8, { vy: 80 + R() * 80, vx: (R() - 0.5) * 60, fade: 'out', a: 0.8 }); this.pop('ks_cut', x, y + MID, 160, 0.3, { rot: R() * 3 }); } else { this.pop('ks_wisp', x, y + MID, 120, 0.7, { rot: -Math.PI / 2, vy: -50, grow: 1.5, a: 0.85 }); this.flat('ks_sigil', x, y + GY + 4, 110, 0.5, { grow: 0.2, a: 0.7 }); } break;
      /* ---------------------------------------------------------------- Sora: crystal */
      case 'sora_q_cast': this.flat('ki_ring', x, y + 14, (n & 1023) * 2.1, 0.5, { blue: true, grow: 1.1, fade: 'inout', a: 0.8 }); break;
      case 'sora_q_shatter': { const m = (n >> 8) & 63; for (let i = 0; i < (reduced ? 6 : 14); i++) { const t = (i / 14) * 6.28 + R() * 0.4, sp = 170 + R() * 150; this.pop(i % 3 ? 'sc_m' : 'sc_s', x + Math.cos(t) * 80, y + 14 + Math.sin(t) * 40, 40 + R() * 26, 0.6, { vx: Math.cos(t) * sp, vy: Math.sin(t) * sp * 0.6 - 60, rot: t, spin: (R() - 0.5) * 12, a: 0.95 }); } this.pop('sc_star', x, y + 4, 200, 0.28, { grow: 1.4 }); this.flat('ki_ring', x, y + 14, 260, 0.45, { blue: true, grow: 1.6 }); if (m > 0) { this.heavy('heavy', reduced); this.kick(0.0026, reduced); } break; }
      case 'sora_e_mark': { const r = (n >> 4) & 255; this.flat('ki_ring', x, y + 8, Math.max(60, r * 2), 0.55, { blue: true, grow: 0.7, fade: 'inout', a: 0.9 }); this.pop('sc_bar', x, y + 10, 16, 0.55, { origin: [0.5, 0.92], sy: 2.4, fade: 'inout', a: 0.5, blend: Phaser.BlendModes.ADD, depth: 3.9 }); break; }
      case 'sora_e_land': { const h = (n >> 8) & 63; this.pop('sc_l', x, y - 20, 120, 0.2, { rot: Math.PI / 2, origin: [1, 0.5], depth: 11.6, grow: 1, vy: 0, fade: 'snap' }); this.pop('sc_star', x, y + 6, h > 0 ? 190 : 120, 0.26, { grow: 1.5, a: h > 0 ? 1 : 0.5 }); this.flat('ki_ring', x, y + 8, 150, 0.4, { blue: true, grow: 1.7 }); if (h > 0) { for (let i = 0; i < (reduced ? 3 : 7); i++) { const t = R() * 6.28; this.pop('sc_s', x, y, 30, 0.45, { vx: Math.cos(t) * 150, vy: Math.sin(t) * 150 - 80, rot: t, spin: 8 }); } this.heavy('heavy', reduced); this.kick(0.0022, reduced); } break; }
      case 'sora_r_cast': this.flat('ki_ring', x, y + 12, (n & 1023) * 2.2, 0.9, { blue: true, grow: 0.3, a: 0.9 }); if (!reduced) for (let i = 0; i < 8; i++) { const t = (i / 8) * 6.28; this.pop('sc_s', x + Math.cos(t) * (n & 1023), y + 12 + Math.sin(t) * (n & 1023) * 0.5, 34, 0.8, { vx: -Math.cos(t) * (n & 1023) * 1.2, vy: -Math.sin(t) * (n & 1023) * 0.6, rot: t + Math.PI, a: 0.8, grow: 0.5 }); } break;
      case 'sora_r_burst': { const h = (n >> 8) & 63, big = (n & 2) !== 0; this.pop('sc_star', x, y + 4, big ? 330 : 240, 0.32, { grow: 1.5 }); this.flat('ki_ring', x, y + 12, big ? 420 : 320, 0.55, { blue: true, grow: 1.8 }); if (!reduced) for (let i = 0; i < 12; i++) { const t = (i / 12) * 6.28; this.pop(i % 2 ? 'sc_m' : 'sc_s', x, y, 44, 0.55, { vx: Math.cos(t) * 260, vy: Math.sin(t) * 150, rot: t, spin: 4, a: 0.9 }); } if (h > 0) { this.heavy('finisher', reduced); this.kick(0.0042, reduced); } break; }
      case 'horizon_burst': this.pop('sc_star', x, y, 120, 0.3, { grow: 1.6 }); break;
      case 'sora_v_hit': this.pop('sc_star', x, y, 120 + 40 * (n & 3), 0.28, { grow: 1.6 }); break;
      case 'sora_v_fizzle': if ((n & 1) === 0) this.pop('sc_s', x, y, 40, 0.3, { a: 0.5 }); break;
      /* ---------------------------------------------------------------- Ren: force */
      case 'ren_q_release': if (hits > 0) { this.flat('rf_front', x, y + 10, 360, 0.5, { grow: 1.5 }); this.pop('rf_cinders', x, y, 220, 0.5, { grow: 1.4, rot: R() * 6 }); this.heavy('heavy', reduced); this.kick(0.003, reduced); } else this.flat('rf_front', x, y + 10, 200, 0.3, { grow: 1.3, a: 0.4 }); break;
      case 'ren_e_hit': if (hits > 0) { this.pop('rf_claws', x, y + MID * 0.5, 120, 0.22, { rot: R() * 0.6, grow: 1.3 }); this.pop('rf_cinders', x, y, 110, 0.35, { grow: 1.4 }); } break;
      case 'ren_e_slam': { this.flat('rf_crater', x, y + 10, 230, 1.6, { grow: 1.1, fade: 'out' }); this.flat('rf_front', x, y + 10, 330, 0.5, { grow: 1.6 }); this.pop('rf_cross', x, y + MID * 0.4, 150, 0.26, { grow: 1.4 }); if (hits > 0) { this.heavy('finisher', reduced); this.kick(0.0055, reduced); } } break;
      case 'ren_r_mark': this.flat('rf_crater', x, y + 10, 90, 0.6, { grow: 0.8, fade: 'inout', a: 0.7 }); break;
      case 'ren_r_hit': { const fin = (n & 32) !== 0, side = (n >> 4) & 1; this.pop('rf_fist', x + (side ? 40 : -40), y - 30, fin ? 230 : 140, fin ? 0.3 : 0.2, { rot: side ? Math.PI : 0, vx: side ? -260 : 260, vy: 160, grow: 1.1, depth: 11.7, fade: 'snap' }); this.flat('rf_crater', x, y + 10, fin ? 300 : 160, fin ? 2 : 1, { grow: 1.1 }); this.flat('rf_front', x, y + 10, fin ? 440 : 250, 0.45, { grow: 1.6 }); if (hits > 0) { this.pop('rf_cinders', x, y, fin ? 230 : 130, 0.4, { grow: 1.5 }); this.heavy(fin ? 'finisher' : 'heavy', reduced); this.kick(fin ? 0.0058 : 0.0026, reduced); } break; }
      case 'ren_v_hit': this.pop('rf_cross', x, y, 150 + 40 * (n & 3), 0.3, { grow: 1.4 }); break;
      case 'ren_v_miss': this.pop('rf_cinders', x, y, 70, 0.3, { a: 0.5 }); break;
      /* ---------------------------------------------------------------- Vex: void (perfect / ordinary guard / relocation / seals) */
      case 'parry_perfect': this.pop('vv_flash', x, y + MID, 190, 0.3, { grow: 1.5 }); this.flat('vv_ripple', x, y + 10, 260, 0.45, { grow: 1.8 }); this.heavy('heavy', reduced); this.kick(0.003, reduced); break;
      case 'parry_guard': this.pop('vv_ripple', x, y + MID, 90, 0.2, { grow: 1.2, a: 0.6, sy: 1 }); break;
      case 'vex_q_guard': if ((n & 7) === 1) { this.pop('vv_flash', x, y + MID, 150, 0.26, { grow: 1.4 }); this.heavy('heavy', reduced); } else this.pop('vv_ripple', x, y + MID, 84, 0.2, { a: 0.55 }); break;
      case 'vex_q_echo': this.pop('vv_blade', x, y + MID, 100, 0.22, { rot: R() * 6.28, grow: 1.3 }); break;
      case 'vex_q_clone_cut': { const tx = ev.tx ?? x, ty = ev.ty ?? y; this.pop('vv_crescent', x, y + MID, 130, 0.22, { rot: ang(tx - x, ty - y) + Math.PI, grow: 1.3 }); break; }
      case 'vex_e_open': this.pop('vv_tear', x, y + MID, 120, 0.4, { grow: 1.2, fade: 'inout', blend: Phaser.BlendModes.NORMAL }); if (ev.tx !== undefined) this.pop('vv_tear', ev.tx, ev.ty! + MID, 100, 0.4, { grow: 1.1, fade: 'inout', blend: Phaser.BlendModes.NORMAL, a: 0.7 }); break;
      case 'vex_e_arrive': this.pop('vv_tear', x, y + MID, 130, 0.35, { grow: 1.3, blend: Phaser.BlendModes.NORMAL }); this.flat('vv_ripple', x, y + 10, 170, 0.35, { grow: 1.6 }); break;
      case 'vex_e_cut': if (hits > 0) { this.pop('vv_crescent', x, y + MID, 150, 0.24, { rot: R() * 6.28, grow: 1.3 }); this.pop('vv_flash', x, y + MID, 110, 0.2, { grow: 1.4 }); this.heavy('heavy', reduced); this.kick(0.0022, reduced); } break;
      case 'vex_e_shock': this.flat('vv_ripple', x, y + 10, 320, 0.5, { grow: 1.8 }); if (hits > 0) { this.pop('vv_flash', x, y + MID, 160, 0.26, { grow: 1.5 }); this.heavy('heavy', reduced); } break;
      case 'vex_r_mark': this.flat('vv_seal', x, y + 10, 100, 0.8, { grow: 1.1, fade: 'inout', a: 0.9 }); break;
      case 'vex_r_erupt': { const fin = (n & 32) !== 0; this.flat('vv_seal', x, y + 10, fin ? 220 : 130, 0.5, { grow: 1.5 }); this.pop('vv_tear', x, y + MID, fin ? 170 : 110, 0.3, { grow: 1.2, blend: Phaser.BlendModes.NORMAL }); if (hits > 0) { this.pop('vv_flash', x, y + MID, fin ? 200 : 120, 0.22, { grow: 1.4 }); this.heavy(fin ? 'finisher' : 'heavy', reduced); this.kick(fin ? 0.0045 : 0.002, reduced); } break; }
      case 'seal_mark': this.flat('vv_seal', x, y + 10, 200, 0.6, { grow: 1.3 }); break;
      case 'seal_detonate': this.flat('vv_seal', x, y + 10, 260, 0.5, { grow: 1.5 }); this.pop('vv_flash', x, y + MID, 210, 0.3, { grow: 1.5 }); if (n > 0) { this.heavy('heavy', reduced); this.kick(0.0035, reduced); } break;
      case 'reversal_riposte': this.pop('vv_crescent', x, y + MID, 150, 0.24, { rot: R() * 6.28, grow: 1.3 }); break;
      default: break;
    }
    void gl; void od; void ECHO; void this.seen;
  }
  destroy() { for (const q of this.pops) q.im.destroy(); this.pops = []; this.reticle?.destroy(); this.echoSigil?.destroy(); for (const b of this.bars) b.destroy(); this.g.destroy(); }
}

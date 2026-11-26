/** B33 Ren, Ashen Eclipse presentation. Pure projection of sim state (ash_* events, the cast, hx.brands, the cinema); it never decides anything. Art: ImageGen sheets cut by art/b33/process.py (ef_* = the Eclipse Fox family, af_* = ash effect sprites).
 *  Every effect is gated on what the simulation reports (hits, miss, block), so a miss never plays an impact. Reduced Effects drops shake, hit-stop, drifting cinders and the fox's secondary layers; gameplay geometry (telegraphs, rings) stays. */
import Phaser from 'phaser';
import type { AbilityEvent, GameState } from '../../sim/GameState';
import { ASH, ASH_E, ASH_R } from '../../content/renEclipse';
import { KAI_GROUND_DY } from '../../assets/kaiAnimation';
import { hand } from '../../sim/HeroSystem';
import { ImpactDirector } from './impactDirector';

export const ASH_FX = ['ef_head', 'ef_body', 'ef_tails', 'ef_stream', 'ef_paw', 'ef_jaw', 'af_claws', 'af_erupt', 'af_crater', 'af_tail', 'af_brand', 'af_front', 'af_cinders', 'af_core', 'af_bite'] as const;
export const ashKey = (n: string) => `b33-${n}`;
export const ashUrl = (n: string) => `/art/b33/${n}.webp`;
const GY = KAI_GROUND_DY, MID = GY - 34, ADD = Phaser.BlendModes.ADD, NORMAL = Phaser.BlendModes.NORMAL;
const ang = (dx: number, dy: number) => Math.atan2(dy, dx);
const EMBER = 0xff9a3c, IVORY = 0xf0e2c8;
interface Pop { im: Phaser.GameObjects.Image; t: number; dur: number; w: number; grow: number; vx: number; vy: number; spin: number; fade: 'out' | 'inout' | 'snap'; a: number; sy: number }
interface PopOpt { depth?: number; blend?: Phaser.BlendModes; rot?: number; origin?: [number, number]; sy?: number; vx?: number; vy?: number; spin?: number; grow?: number; fade?: 'out' | 'inout' | 'snap'; a?: number; flip?: boolean }
const MAX_POPS = 130;
type Slot = 'foxBody' | 'foxHead' | 'foxTails' | 'foxStream' | 'core' | 'gauntlet' | 'ghost';

export class AshFx {
  private pops: Pop[] = []; private g: Phaser.GameObjects.Graphics; private lastEvent = 0; private readonly director = new ImpactDirector(); private shake = 0; private clock = 0;
  private ghost: Phaser.GameObjects.Image | null = null; private suck = 0; private foxBody: Phaser.GameObjects.Image | null = null; private foxHead: Phaser.GameObjects.Image | null = null; private foxTails: Phaser.GameObjects.Image | null = null; private foxStream: Phaser.GameObjects.Image | null = null; private core: Phaser.GameObjects.Image | null = null; private gauntlet: Phaser.GameObjects.Image | null = null;
  private foxA = 0; private side = 1; private lx = 0; private ly = 0; private aura = 0; private jet = 0;
  constructor(private readonly scene: Phaser.Scene, private readonly events: boolean) { this.g = scene.add.graphics().setDepth(3.66); }
  takeHitstop() { return this.director.take(); }
  takeShake() { const v = this.shake; this.shake = 0; return v; }
  private has(n: string) { return this.scene.textures.exists(ashKey(n)); }
  private pop(n: string, x: number, y: number, w: number, dur: number, o: PopOpt = {}) {
    if (!this.has(n) || this.pops.length >= MAX_POPS) return null;
    const im = this.scene.add.image(x, y, ashKey(n)).setDepth(o.depth ?? 11.5).setBlendMode(o.blend ?? ADD).setAlpha(0).setRotation(o.rot ?? 0); if (o.origin) im.setOrigin(...o.origin); if (o.flip) im.setFlipX(true);
    this.pops.push({ im, t: 0, dur, w, grow: o.grow ?? 1.2, vx: o.vx ?? 0, vy: o.vy ?? 0, spin: o.spin ?? 0, fade: o.fade ?? 'out', a: o.a ?? 1, sy: o.sy ?? 1 }); return im;
  }
  private flat(n: string, x: number, y: number, w: number, dur: number, o: PopOpt = {}) { return this.pop(n, x, y, w, dur, { depth: 3.7, sy: 0.5, ...o }); }
  private heavy(w: 'heavy' | 'finisher', reduced: boolean) { this.director.request(w, reduced); }
  private kick(v: number, reduced: boolean) { if (!reduced) this.shake = Math.max(this.shake, v); }
  private img(slot: Slot, n: string, blend: Phaser.BlendModes = NORMAL) { let im = this[slot]; if (!im && this.has(n)) { im = this.scene.add.image(0, 0, ashKey(n)).setBlendMode(blend); this[slot] = im; } return im; }

  update(dt: number, s: GameState, reduced: boolean, crowded: boolean) {
    this.g.clear(); this.director.tick(s.phase === 'running' ? dt : 0); this.clock += s.phase === 'running' ? dt : 0;
    const p = s.player, ash = s.hero === 'ren' && p.form === 2, R = Math.random, lite = reduced || crowded;
    if (this.events) for (const ev of s.abilityEvents) if (ev.id > this.lastEvent) { this.lastEvent = ev.id; this.onEvent(ev, s, reduced); }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const q = this.pops[i]; q.t += dt; const u = q.t / q.dur; if (u >= 1) { q.im.destroy(); this.pops.splice(i, 1); continue; }
      const sc = (q.w / q.im.width) * (1 + (q.grow - 1) * (1 - (1 - u) ** 2)); q.im.setScale(sc, sc * q.sy);
      q.im.setAlpha(q.a * (q.fade === 'inout' ? Math.sin(u * Math.PI) : q.fade === 'snap' ? (u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5) : u < 0.1 ? u / 0.1 : 1 - (u - 0.1) / 0.9)); q.im.x += q.vx * dt; q.im.y += q.vy * dt; if (q.spin) q.im.rotation += q.spin * dt;
    }
    const cin = s.cinema;
    if (s.hero !== 'ren' || (!ash && cin?.to !== 2)) { this.hideLive(); return; }
    // ---- the reveal: a silent dark eclipse grows behind Ren before the break (the heroFxView motes and rays do the gathering)
    if (cin && cin.to === 2) {
      const u = Math.min(1, cin.t / cin.breakAt), c = this.img('core', 'af_core'); if (c) c.setVisible(cin.t < cin.breakAt + 0.5).setPosition(p.x, p.y + MID - 26).setDepth(9.3).setDisplaySize(70 + 150 * u, (70 + 150 * u) * 0.79).setAlpha(Math.min(1, u * 1.4) * (cin.t < cin.breakAt ? 1 : Math.max(0, 1 - (cin.t - cin.breakAt) / 0.5)));
      this.hideFox(); return;
    }
    if (s.phase !== 'running') { this.hideFox(); return; }
    // ---- ordinary play: Ash Brand pips on the foes that carry them, a low ash ring and drifting cinders at Ren's feet
    for (const b of s.hx.brands ?? []) {
      const e = s.enemies.find(x => x.id === b.id && x.hp > 0); if (!e) continue; const left = Math.min(1, (b.t - s.time) / 1.2), by = e.y - e.radius - 30;
      for (let i = 0; i < b.n; i++) { const bx = e.x + (i - (b.n - 1) / 2) * 11, pu = 0.7 + 0.3 * Math.sin(this.clock * 8 + i); this.g.fillStyle(0x1a1010, 0.85 * left).fillCircle(bx, by, 5.2); this.g.fillStyle(EMBER, 0.9 * pu * left).fillCircle(bx, by, 3.6); this.g.lineStyle(1.2, IVORY, 0.7 * left).strokeCircle(bx, by, 5.2); }
      if (b.n >= 3) this.g.lineStyle(1.5, EMBER, 0.5 * left).strokeCircle(e.x, e.y + 12, e.radius + 8);   // a full brand: the foe is one finisher away from erupting
    }
    this.aura += dt; if (!lite && p.hp > 0 && this.aura > 0.14) { this.aura = 0; this.pop('af_cinders', p.x + (R() - 0.5) * 30, p.y + GY - 6, 26 + R() * 14, 0.9, { depth: 9, vy: -34 - R() * 26, vx: (R() - 0.5) * 14, a: 0.55, grow: 0.6 }); }
    this.g.lineStyle(1.5, EMBER, 0.2 + 0.08 * Math.sin(this.clock * 3)).strokeEllipse(p.x, p.y + GY + 2, 64, 20);
    // ---- telegraphs that follow the simulation's committed geometry
    const c = s.hx.act;
    if (c?.act === 'ninefold_rupture' && c.hop === 0) {
      const R0 = ASH_E.R * s.mods.beamWidth, u = Math.min(1, c.t / ASH_E.coil), pulse = 0.5 + 0.5 * Math.sin(this.clock * 22);
      this.g.lineStyle(2.5, EMBER, 0.5 + 0.3 * pulse).strokeEllipse(c.tx, c.ty + 14, R0 * 2, R0 * 1.05); this.g.fillStyle(0x201010, 0.1 + 0.12 * u).fillEllipse(c.tx, c.ty + 14, R0 * 2, R0 * 1.05);
      for (let i = 0; i < ASH_E.tails; i++) { const a = (i / ASH_E.tails) * Math.PI * 2 + 0.3, r = R0 * (1.5 - 1.15 * u), tx = c.tx + Math.cos(a) * r, ty = c.ty + 14 + Math.sin(a) * r * 0.5; this.g.lineStyle(3, IVORY, 0.55 * (0.4 + u)).lineBetween(tx, ty, c.tx + Math.cos(a) * (r - 38), c.ty + 14 + Math.sin(a) * (r - 38) * 0.5); }   // nine tail shadows converge
    }
    if (c?.act === 'ashen_cataclysm' && c.beats === 0) {
      const u = Math.min(1, c.t / ASH_R.windup), hw = ASH_R.halfWidth * s.mods.sphereRadius, nx = -c.dirY, ny = c.dirX;
      this.g.lineStyle(2, EMBER, 0.35 + 0.35 * u); this.g.beginPath(); this.g.moveTo(c.sx + nx * hw, c.sy + ny * hw + 16); this.g.lineTo(c.tx + nx * hw, c.ty + ny * hw + 16); this.g.moveTo(c.sx - nx * hw, c.sy - ny * hw + 16); this.g.lineTo(c.tx - nx * hw, c.ty - ny * hw + 16); this.g.strokePath();   // the lane the fox will cross
      const RR = ASH_R.ruptureR * s.mods.sphereRadius; this.g.lineStyle(2.5, EMBER, 0.25 + 0.4 * u).strokeEllipse(c.tx, c.ty + 14, RR * 2, RR * 1.05);
      const h = hand(s, c.dirX, c.dirY, 22, 'orb'), core = this.img('core', 'af_core'), ease = u * u * (3 - 2 * u);
      if (core) core.setVisible(true).setPosition(h.x, h.y).setDepth(11.6).setDisplaySize(36 + 150 * ease, (36 + 150 * ease) * 0.79).setAlpha(0.95);   // the eclipse core crushed between the fists, growing with the real windup
      // the world answers the build-up: a spectral fox gathers at the head of the lane, ash and embers are drawn inward, the ground ring under Ren tightens, and the rupture circle fills with a crater glow
      const fh = this.img('ghost', 'ef_head'); if (fh && !lite) fh.setVisible(true).setPosition(c.sx + c.dirX * 30, c.sy + c.dirY * 30 + MID).setRotation(0).setFlipX(c.dirX < 0).setDepth(9.5).setDisplaySize(70 + 90 * ease, (70 + 90 * ease) * (fh.height / fh.width)).setAlpha(0.18 + 0.5 * ease);
      this.suck += dt; if (!lite && this.suck > 0.04) { this.suck = 0; const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 90; this.pop('af_cinders', h.x + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.7, 30 + Math.random() * 22, 0.34, { depth: 11.3, vx: -Math.cos(a) * r / 0.34, vy: -Math.sin(a) * r * 0.7 / 0.34, a: 0.9, grow: 0.4 }); }
      this.g.lineStyle(3, IVORY, 0.25 + 0.4 * u).strokeEllipse(p.x, p.y + GY + 2, 240 * (1 - 0.6 * ease), 76 * (1 - 0.6 * ease)); this.g.fillStyle(EMBER, 0.06 + 0.12 * u).fillEllipse(c.tx, c.ty + 14, RR * 2 * (0.4 + 0.6 * ease), RR * 1.05 * (0.4 + 0.6 * ease));
    } else { this.core?.setVisible(false); this.ghost?.setVisible(false); }
    if (c?.act === 'eclipse_fang' && !c.released) {   // gauntlet charge: the claw grows with the real tier
      const h = hand(s, c.dirX, c.dirY, 24, 'orb'), want = c.tier >= 3 ? 'af_bite' : 'af_claws', g = this.img('gauntlet', want, ADD);
      if (g) { if (g.texture.key !== ashKey(want)) g.setTexture(ashKey(want)); const w = 30 + 26 * c.tier + 8 * Math.sin(this.clock * 18); g.setVisible(true).setPosition(h.x, h.y).setRotation(ang(c.dirX, c.dirY) + (c.tier >= 3 ? Math.PI / 2 : 0)).setDepth(11.6).setDisplaySize(w, w * (g.height / g.width)).setAlpha(0.6 + 0.12 * c.tier); }
      this.g.lineStyle(1.5, EMBER, 0.3 + 0.12 * c.tier).strokeEllipse(p.x, p.y + GY + 2, 50 + 22 * c.tier, 18 + 6 * c.tier);
    } else this.gauntlet?.setVisible(false);
    // ---- flight: ember jets under the boots
    if (p.flyT > 0 && !lite) { this.jet += dt; if (this.jet > 0.05) { this.jet = 0; this.pop('af_cinders', p.x + (R() - 0.5) * 12, p.y + GY - 4, 30, 0.35, { depth: 9, vy: 120 + R() * 60, vx: (R() - 0.5) * 30, a: 0.8, grow: 0.5 }); } }
    if ((p.flyT > 0 || p.dashRemaining > 0) && !reduced) { const sp = Math.hypot(p.vx, p.vy); this.jet += dt * 0.5; if (sp > 40 && this.jet > 0.04) { this.jet = 0; const a = Math.atan2(p.vy, p.vx); this.pop('af_tail', p.x - Math.cos(a) * 10, p.y + MID - Math.sin(a) * 10, 150, 0.32, { rot: a + Math.PI, origin: [0.05, 0.5], a: 0.6, grow: 1.1, blend: NORMAL, depth: 9.2 }); } }   // an ash-tail streak follows the pounce and the flight
    // ---- Eclipse Nine-Tailed Fox (Overdrive): a layered beast behind Ren; paws and jaws strike with his real hits
    this.fox(dt, s, reduced);
  }
  private hideFox() { this.foxBody?.setVisible(false); this.foxHead?.setVisible(false); this.foxTails?.setVisible(false); this.foxStream?.setVisible(false); }
  private hideLive() { this.hideFox(); this.core?.setVisible(false); this.gauntlet?.setVisible(false); this.ghost?.setVisible(false); }
  private fox(dt: number, s: GameState, reduced: boolean) {
    const p = s.player, on = p.odT > 0 && p.hp > 0; this.foxA += ((on ? 1 : 0) - this.foxA) * Math.min(1, dt * (on ? 6 : 4));
    if (this.foxA < 0.02) { this.hideFox(); return; }
    const moving = Math.hypot(p.vx, p.vy) > 40 || s.hx.moving; if (Math.abs(p.aimX) > 0.2) this.side += ((p.aimX >= 0 ? 1 : -1) - this.side) * Math.min(1, dt * 8);
    this.lx += (p.x - this.lx) * Math.min(1, dt * 7); this.ly += (p.y - this.ly) * Math.min(1, dt * 7); const A = this.foxA * (reduced ? 0.7 : 1), f = this.side >= 0 ? 1 : -1, sway = Math.sin(this.clock * 3.2);
    const body = this.img('foxBody', 'ef_body'), head = this.img('foxHead', 'ef_head'), tails = this.img('foxTails', 'ef_tails'), stream = this.img('foxStream', 'ef_stream');
    const set = (im: Phaser.GameObjects.Image | null, x: number, y: number, w: number, a: number, depth: number, flip: number, rot = 0, ox = 0.5, oy = 0.5) => { if (!im) return; im.setVisible(a > 0.01).setPosition(x, y).setDepth(depth).setOrigin(flip < 0 ? 1 - ox : ox, oy).setDisplaySize(w, w * (im.height / im.width)).setFlipX(flip < 0).setAlpha(a).setRotation(flip < 0 ? -rot : rot); };
    const bx = this.lx, by = this.ly + MID;
    set(tails, bx - f * 34, by - 10 + sway * 4, 190, 0.7 * A * (moving ? 0.2 : 1), 8.9, f, sway * 0.04, 0.82, 0.5);
    set(stream, bx - f * 16, by - 4, 230, 0.75 * A * (moving ? 1 : 0), 8.95, f, 0, 0.92, 0.5);
    set(body, bx - f * 8, by + 10, 200, 0.62 * A, 9.0, f, 0, 0.5, 0.55);
    set(head, bx + f * 40, by - 46 + Math.sin(this.clock * 2.4) * 3, 118, 0.8 * A, 9.55, f, 0, 0.5, 0.5);
  }
  private onEvent(ev: AbilityEvent, s: GameState, reduced: boolean) {
    const { x, y } = ev, n = ev.n ?? 0, kind = ev.kind, hits = (n >> 8) & 63, p = s.player, od = (n & 16384) !== 0, R = Math.random, tx = ev.tx ?? x, ty = ev.ty ?? y;
    const foxStrike = (px: number, py: number, a: number) => { if (od && !reduced) this.pop('ef_paw', px - Math.cos(a) * 40, py + MID * 0.6 - Math.sin(a) * 20, 190, 0.28, { rot: a, origin: [0.2, 0.5], grow: 1.25, blend: NORMAL, a: 0.85, depth: 11.4 }); };
    switch (kind) {
      case 'ash_break': { this.flat('af_front', p.x, p.y + GY, 480, 0.7, { grow: 1.8 }); this.flat('af_front', p.x, p.y + GY, 300, 0.5, { grow: 1.5, a: 0.8 }); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; this.pop('af_tail', p.x, p.y + MID, 190, 0.55, { rot: a, origin: [0.05, 0.5], grow: 1.5, blend: NORMAL, a: 0.85, depth: 10.9 }); } this.pop('af_erupt', p.x, p.y + GY + 6, 200, 0.6, { origin: [0.5, 0.95], grow: 1.3 }); break; }
      case 'ash_commit': this.pop('af_cinders', p.x, p.y + MID, 260, 0.7, { grow: 1.4 }); break;
      case 'ash_end': for (let i = 0; i < 7; i++) this.pop('af_cinders', p.x + (R() - 0.5) * 34, p.y + MID + (R() - 0.5) * 50, 36, 0.8, { vy: -50 - R() * 40, vx: (R() - 0.5) * 40, a: 0.8, grow: 0.5 }); break;
      case 'ash_shift': this.flat('af_front', p.x, p.y + GY, 260, 0.45, { grow: 1.6 }); this.pop('af_core', p.x, p.y + MID, 90, 0.3, { blend: NORMAL, grow: 1.6, a: 0.9 }); break;
      case 'ash_brand': this.pop('af_brand', x, y - 30, 30, 0.3, { grow: 1.6, a: 0.9 }); break;
      case 'ash_eruption': { const st = n & 15, w = 110 + 36 * st; this.pop('af_erupt', x, y + GY * 0.4, w, 0.5, { origin: [0.5, 0.95], grow: 1.2 }); this.flat('af_crater', x, y + 12, 90 + 20 * st, 0.9, { a: 0.8 }); this.pop('af_cinders', x, y, w, 0.5, { grow: 1.5 }); this.kick(0.0016 + 0.0006 * st, reduced); break; }
      case 'ash_auto': {   // hook / low kick / cross-claw / crushing uppercut: each beat has its own silhouette, only on real contact
        const beat = n & 3, fin = (n & 32) !== 0; if (hits <= 0) break; const a = ang(tx - x, ty - y);
        if (beat === 0) this.pop('af_claws', tx, ty + MID * 0.6, 120, 0.2, { rot: a + 0.5, grow: 1.25 });
        else if (beat === 1) { this.pop('af_cinders', tx, ty + GY - 8, 140, 0.26, { grow: 1.4, sy: 0.7 }); this.pop('af_claws', tx, ty + GY * 0.4, 100, 0.2, { rot: a - 0.3, grow: 1.2, a: 0.8 }); }
        else if (beat === 2) { this.pop('af_claws', tx, ty + MID * 0.6, 130, 0.22, { rot: a + 0.7, grow: 1.25 }); this.pop('af_claws', tx, ty + MID * 0.6, 130, 0.22, { rot: a - 0.7, grow: 1.25 }); }
        else { this.pop('af_erupt', tx, ty + GY * 0.5, 200, 0.4, { origin: [0.5, 0.95], grow: 1.25 }); this.flat('af_front', tx, ty + GY * 0.5, 240, 0.4, { grow: 1.6 }); }
        if (fin) { this.heavy('heavy', reduced); this.kick(0.0026, reduced); } else this.kick(0.0008, reduced);
        foxStrike(tx, ty, a); break;
      }
      case 'ash_q_start': this.pop('af_tail', p.x, p.y + MID, 200, 0.3, { rot: ang(tx - p.x, ty - p.y), origin: [0.05, 0.5], blend: NORMAL, a: 0.6, grow: 1.4, depth: 9 }); break;
      case 'ash_q_hit': {
        const k = n & 15, last = (n & 16) !== 0, charged = (n & 32) !== 0, a = ang(tx, ty);   // for this event (tx,ty) is the unit aim vector
        if (hits > 0) { this.pop('af_claws', x, y + MID * 0.6, last ? 170 : 120, 0.22, { rot: a + (k % 2 ? 0.4 : -0.4), grow: 1.3 }); this.pop('af_cinders', x, y + MID * 0.6, last ? 220 : 130, 0.3, { grow: 1.4 }); if (last) { this.pop('af_bite', x, y + MID * 0.6, 220, 0.3, { rot: a + Math.PI / 2, grow: 1.3 }); this.flat('af_front', x, y + GY * 0.5, 300, 0.45, { grow: 1.6 }); } this.heavy(last ? 'finisher' : 'heavy', reduced); this.kick(last ? 0.0042 : 0.002, reduced); foxStrike(x, y, a); }
        else if (charged) this.pop('af_cinders', x, y + MID * 0.6, 70, 0.25, { a: 0.4 });   // a strike that caught nothing: a puff of ash, no impact
        else this.pop('af_tail', p.x, p.y + MID, 120, 0.3, { rot: a, origin: [0.05, 0.5], blend: NORMAL, a: 0.4, depth: 9 });   // nothing ahead: restrained dissipation
        break;
      }
      case 'ash_e_dive': this.pop('af_tail', x, y + MID, Math.hypot(tx - x, ty - y) + 60, 0.3, { rot: ang(tx - x, ty - y), origin: [0.02, 0.5], blend: NORMAL, a: 0.7, grow: 1.05, depth: 9 }); break;
      case 'ash_e_rupture': {
        this.flat('af_crater', x, y + 14, 330, 1.8, { a: 0.9, grow: 1.1 }); this.flat('af_front', x, y + 14, 380, 0.55, { grow: 1.7 }); this.pop('af_erupt', x, y + GY * 0.4, 230, 0.5, { origin: [0.5, 0.95], grow: 1.25 });
        for (let i = 0; i < ASH_E.tails; i++) { const a = (i / ASH_E.tails) * Math.PI * 2 + 0.3; this.pop('af_tail', x + Math.cos(a) * 150, y + 14 + Math.sin(a) * 75, 120, 0.4, { rot: a + Math.PI, origin: [0.05, 0.5], vx: -Math.cos(a) * 220, vy: -Math.sin(a) * 110, blend: NORMAL, a: 0.85, grow: 0.6, depth: 10.9 }); }
        if (hits > 0) { this.heavy('finisher', reduced); this.kick(0.0056, reduced); if (od && !reduced) this.pop('ef_jaw', x, y + MID, 240, 0.35, { blend: NORMAL, a: 0.85, grow: 1.2, depth: 11.4 }); }
        break;
      }
      case 'ash_r_core': this.flat('af_crater', x, y + 14, ASH_R.ruptureR * 2.1, ASH_R.windup + 0.5, { fade: 'inout', a: 0.7, grow: 1.1 }); this.flat('af_front', x, y + 14, ASH_R.ruptureR * 1.4, ASH_R.windup, { fade: 'inout', a: 0.5, grow: 1.5 }); break;
      case 'ash_r_strike': {   // the huge spectral fox crosses the lane (events carry the lane start in tx,ty), nine tail arcs fan behind it
        const sx = tx, sy = ty, a = ang(x - sx, y - sy), len = Math.hypot(x - sx, y - sy);
        this.pop('ef_head', sx, sy + MID, 260, 0.34, { origin: [0.5, 0.5], vx: Math.cos(a) * (len / 0.3), vy: Math.sin(a) * (len / 0.3), blend: NORMAL, a: 0.9, grow: 1.1, depth: 11.2, flip: Math.cos(a) < 0 });
        this.pop('ef_stream', sx, sy + MID, Math.max(220, len * 0.6), 0.4, { origin: [0.95, 0.5], vx: Math.cos(a) * (len / 0.34), vy: Math.sin(a) * (len / 0.34), blend: NORMAL, a: 0.7, depth: 11.0, flip: Math.cos(a) < 0 });
        for (let i = 0; i < 9; i++) { const off = (i - 4) * 0.22; this.pop('af_tail', sx, sy + MID, len * 0.9, 0.42, { rot: a + off, origin: [0.02, 0.5], blend: NORMAL, a: 0.8, grow: 1.1, depth: 10.8 }); }
        this.pop('ef_paw', x, y + MID * 0.4, 230, 0.4, { rot: a, origin: [0.2, 0.5], blend: NORMAL, a: 0.85, grow: 1.25, depth: 11.3 });
        if (hits > 0) { this.heavy('heavy', reduced); this.kick(0.0035, reduced); } break;
      }
      case 'ash_r_rupture': {
        this.flat('af_crater', x, y + 14, 440, 2.2, { a: 0.95 }); this.flat('af_front', x, y + 14, 520, 0.6, { grow: 1.8 }); this.pop('af_erupt', x, y + GY * 0.3, 300, 0.6, { origin: [0.5, 0.95], grow: 1.3 }); this.pop('af_cinders', x, y, 340, 0.6, { grow: 1.5 });
        this.pop('ef_jaw', x, y + MID * 0.5, 300, 0.4, { blend: NORMAL, a: 0.85, grow: 1.2, depth: 11.4 });
        if (hits > 0) { this.heavy('finisher', reduced); this.kick(0.0066, reduced); } else this.kick(0.001, reduced); break;
      }
      case 'ash_v_charge': this.flat('af_front', p.x, p.y + GY, 90, 0.4, { grow: 1.5, a: 0.6 }); break;
      case 'ash_v_tier': this.pop('af_cinders', p.x, p.y + MID, 90 + 30 * (n & 3), 0.3, { grow: 1.5 }); this.flat('af_front', p.x, p.y + GY, 120 + 30 * (n & 3), 0.4, { grow: 1.5 }); break;
      case 'ash_v_release': this.pop('af_tail', p.x, p.y + MID, Math.hypot(tx - p.x, ty - p.y) + 80, 0.26, { rot: ang(tx - p.x, ty - p.y), origin: [0.02, 0.5], blend: NORMAL, a: 0.8, grow: 1.05, depth: 9 }); break;
      case 'ash_v_hit': { const a = ang(tx, ty); this.pop('af_claws', x, y + MID * 0.6, 130 + 30 * (n & 3), 0.24, { rot: a + 0.3, grow: 1.3 }); this.pop('af_cinders', x, y + MID * 0.6, 150, 0.3, { grow: 1.4 }); this.kick(0.0022, reduced); break; }
      case 'ash_v_miss': this.pop('af_cinders', x, y + MID * 0.6, 80, 0.3, { a: 0.4 }); break;   // a miss never explodes
      case 'ash_v_block': this.flat('af_front', x, y + GY * 0.5, 110, 0.25, { a: 0.5 }); break;
      case 'ash_v_pulse': {
        const i = n & 31, tier = (n >> 5) & 7;
        if (tier >= 3) { if (i === 0) this.pop('af_bite', x, y + MID * 0.5, 230, 0.3, { rot: Math.PI / 2, grow: 1.25 }); else if (i === 1) this.pop('af_bite', x, y + MID * 0.5, 300, 0.32, { rot: -Math.PI / 2, grow: 1.3 }); else { this.pop('af_erupt', x, y + GY * 0.4, 300, 0.55, { origin: [0.5, 0.95], grow: 1.3 }); this.flat('af_front', x, y + 12, 420, 0.55, { grow: 1.7 }); this.pop('ef_jaw', x, y + MID * 0.5, 280, 0.4, { blend: NORMAL, a: 0.85, depth: 11.4 }); this.heavy('finisher', reduced); this.kick(0.0056, reduced); } }
        else { this.flat('af_front', x, y + GY * 0.5, 190 + 40 * tier, 0.4, { grow: 1.6 }); this.pop('af_cinders', x, y + MID * 0.5, 170 + 40 * tier, 0.3, { grow: 1.4 }); if (hits > 0 && i === 0) { this.heavy('heavy', reduced); this.kick(0.0032, reduced); } }
        if (od && i === 0) foxStrike(x, y, 0); break;
      }
      case 'ren_fly_start': if (p.form === 2) this.flat('af_front', p.x, p.y + GY, 200, 0.4, { grow: 1.6 }); break;
      case 'ren_fly_land': if (p.form === 2 && (n & 1)) { this.flat('af_crater', x, y + 14, 300, 1.2, { a: 0.9 }); this.flat('af_front', x, y + 14, 360, 0.5, { grow: 1.6 }); this.pop('af_erupt', x, y + GY * 0.4, 200, 0.45, { origin: [0.5, 0.95], grow: 1.2 }); if (((n >> 8) & 63) > 0) { this.heavy('heavy', reduced); this.kick(0.0045, reduced); } } break;
      case 'ren_od_start': if (n === 2) { this.pop('ef_head', p.x + 20, p.y + MID - 40, 230, 0.6, { blend: NORMAL, a: 0.9, grow: 1.3, depth: 9.55 }); this.flat('af_front', p.x, p.y + GY, 300, 0.6, { grow: 1.8 }); } break;
      case 'ren_od_end': if (p.form === 2) for (let i = 0; i < 8; i++) this.pop('af_cinders', p.x + (R() - 0.5) * 60, p.y + MID + (R() - 0.5) * 60, 44, 0.9, { vy: -60 - R() * 40, vx: (R() - 0.5) * 50, a: 0.8, grow: 0.5 }); break;
      default: break;
    }
  }
  destroy() { for (const q of this.pops) q.im.destroy(); this.pops = []; for (const im of [this.foxBody, this.foxHead, this.foxTails, this.foxStream, this.core, this.gauntlet, this.ghost]) im?.destroy(); this.g.destroy(); }
}
void ASH;

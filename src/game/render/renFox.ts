/** B26 Ren, Crimson Ascendant presentation. (1) The Crimson Nine-Tailed Fox: a layered spectral beast that wraps Ren during Primal Overdrive (body behind him, head above / forward of the shoulders, nine tails that lag and stream, strike surges and forepaws driven by real sim events). (2) The ImageGen FX of the form's Q / E / R / V, flight and landing, read from ren_* events and the live cast. (3) A restrained form presence (ground pressure pulses, body-bound wisps, forearm ribbon). Reads sim state only; art is public/art/fx/ren-fox. */
import Phaser from 'phaser';
import type { AbilityEvent, GameState } from '../../sim/GameState';
import { REN_E, REN_FLY, REN_OD, REN_Q, REN_R, REN_V } from '../../content/renCombat';

export const RF_SETS = ['head_side', 'head_back', 'paw_b', 'tails_rest', 'tails_stream', 'tails_flare', 'activation', 'dissolve', 'ground_ring', 'cyclone_arc', 'cyclone_crack', 'rampage_dust', 'rampage_trail', 'fist_l', 'fist_r', 'cat_debris', 'cat_shock', 'nova_orb', 'nova_spiral', 'nova_core', 'nova_ring', 'fist_trail', 'flight_ring', 'flight_fan', 'wisps', 'wisp_arc', 'tails_only', 'paw_only'] as const;
export const RF_NAMES = RF_SETS.flatMap(s => [0, 1, 2, 3].map(i => `${s}${i}`));
export const rfKey = (n: string) => `rf-${n}`; export const rfUrl = (n: string) => `/art/fx/ren-fox/${n}.png`;
type RfSet = (typeof RF_SETS)[number];
interface Pop { im: Phaser.GameObjects.Image; t: number; dur: number; set: RfSet; frames: number[]; w: number; w1: number; a: number; vx: number; vy: number; spin: number; fy: boolean; sy: number }
interface PopOpt { a?: number; rot?: number; depth?: number; ox?: number; oy?: number; vx?: number; vy?: number; spin?: number; flipY?: boolean; flipX?: boolean; squash?: number }
export interface RenFoxInput { dt: number; state: GameState; hero: Phaser.GameObjects.Sprite; hand: { m: { x: number; y: number } } | null; scale: number; reduced: boolean; running: boolean; dead: boolean; crowded: boolean; facing: string; /** the local fighter may shake the camera; a partner's events never do */ shake: boolean }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const R_ALL = [0, 1, 2, 3];

export class RenFox {
  private pops: Pop[] = []; private last = 0; private clock = 0; private lx = 0; private ly = 0; private px = 0; private py = 0; private fresh = true; private side = 1;
  private amt = 0; private wasOd = false; private mv = 0; private squash = 1; private lunge = 0; private ringClock = 0; private strikeAt = -9; private strikeA = 0; private lastDash = false;
  private wE = 1; private wS = 0; private wN = 0; private lastAim = { x: 1, y: 0 };
  private readonly rest: Phaser.GameObjects.Image; private readonly stream: Phaser.GameObjects.Image; private readonly front: Phaser.GameObjects.Image; private readonly back: Phaser.GameObjects.Image; private readonly halo: Phaser.GameObjects.Image[] = [];
  private readonly ground: Phaser.GameObjects.Image; private readonly fan: Phaser.GameObjects.Image; private readonly wisp: Phaser.GameObjects.Image[] = []; private readonly arc: Phaser.GameObjects.Image; private readonly orb: Phaser.GameObjects.Image; private readonly spiral: Phaser.GameObjects.Image; private readonly cyc: Phaser.GameObjects.Image[] = [];
  constructor(private readonly scene: Phaser.Scene) {
    const blank = 'kp-blank'; if (!scene.textures.exists(blank)) scene.textures.createCanvas(blank, 2, 2)!.refresh();
    const mk = (depth: number) => scene.add.image(0, 0, blank).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.rest = mk(9.0); this.stream = mk(9.0); this.front = mk(9.0); this.back = mk(9.05); this.halo = [mk(8.95), mk(8.95)];
    this.ground = mk(3.7); this.fan = mk(9.1); this.wisp = [mk(9.6), mk(9.6)]; this.arc = mk(10.5); this.orb = mk(10.6); this.spiral = mk(10.55); this.cyc = [mk(9.2), mk(9.25)];
  }
  private has(n: string) { return this.scene.textures.exists(rfKey(n)); }
  private tex(im: Phaser.GameObjects.Image, set: RfSet, i: number) { const k = rfKey(`${set}${i & 3}`); if (!this.scene.textures.exists(k)) { im.setVisible(false); return false; } if (im.texture.key !== k) im.setTexture(k); return true; }
  private pop(set: RfSet, frames: number[], x: number, y: number, w: number, w1: number, dur: number, o: PopOpt = {}) {
    if (this.pops.length >= 40 || !this.has(`${set}${frames[0]}`)) return;
    const im = this.scene.add.image(x, y, rfKey(`${set}${frames[0]}`)).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.depth ?? 11.2).setRotation(o.rot ?? 0).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5).setAlpha(0);
    this.pops.push({ im, t: 0, dur, set, frames, w, w1, a: o.a ?? 1, vx: o.vx ?? 0, vy: o.vy ?? 0, spin: o.spin ?? 0, fy: !!o.flipY, sy: o.squash ?? 1 });
  }
  private shake(o: RenFoxInput, ms: number, k: number) { if (o.shake && !o.reduced) this.scene.cameras.main.shake(ms, k); }
  /** the fox's head surges toward a real strike point (Overdrive only) */
  private surge(o: RenFoxInput, tx: number, ty: number, power: number) {
    const sc = o.scale / 0.5, sx = this.lx + this.side * 54 * sc, sy = this.ly - 86 * sc, a = Math.atan2(ty - sy, tx - sx), left = Math.abs(a) > Math.PI / 2, d = Math.min(150, Math.hypot(tx - sx, ty - sy) * 0.65);
    this.pop('head_side', [1, 2, 2, 3], sx, sy, 100 * sc * power, 150 * sc * power, 0.3, { rot: left ? a - Math.PI : a, flipY: false, ox: 0.25, oy: 0.55, a: 0.85, depth: 9.05, vx: Math.cos(a) * d / 0.3, vy: Math.sin(a) * d / 0.3, squash: left ? -1 : 1 });
    this.lunge = Math.max(this.lunge, 0.5 * power);
  }
  private paw(o: RenFoxInput, tx: number, ty: number, power: number, up: boolean) {
    const sc = o.scale / 0.5, h = o.hero, sx = h.x, sy = h.y - 48 * sc, a = up ? -Math.PI / 2 + (tx >= sx ? 0.35 : -0.35) : Math.atan2(ty - sy, tx - sx), left = Math.cos(a) < 0, reach = clamp(Math.hypot(tx - sx, ty - sy) + 30, 90, 190) * sc * power;
    this.pop('paw_only', [0, 1, 2, 3], sx, sy, reach * 0.5, reach, 0.26, { rot: left ? a - Math.PI : a, ox: 0.05, oy: 0.5, a: 0.8, depth: 10.4, squash: left ? -1 : 1 });
  }

  private onEvent(e: AbilityEvent, o: RenFoxInput) {
    const sc = o.scale / 0.5, red = o.reduced, p = o.state.player, n = e.n ?? 0, od = (n & REN_OD.bit) !== 0, tx = e.tx ?? e.x, ty = e.ty ?? e.y;
    switch (e.kind) {
      case 'ren_auto': {
        const fin = (n & 32) !== 0, hits = (n >> 8) & 63;
        this.strikeAt = this.clock; this.strikeA = Math.atan2(ty - e.y, tx - e.x);
        if (hits > 0) { this.pop('cat_shock', [0, 1, 2], tx, ty + 6, fin ? 90 : 56, fin ? 190 : 110, fin ? 0.34 : 0.22, { depth: 3.8, a: fin ? 0.6 : 0.45, oy: 0.5, squash: 0.35 }); }
        if (fin && !red) { this.pop('cat_debris', R_ALL, tx, ty + 10, 80, 170, 0.4, { a: 0.6, depth: 3.9, squash: 0.6 }); this.shake(o, 60, 0.0014); }
        if (od || p.odT > 0) { this.paw(o, tx, ty, fin ? 1.4 : 1, fin); this.surge(o, tx, ty, fin ? 1.25 : 0.9); }
        break;
      }
      case 'ren_q_start': this.pop('cyclone_crack', [0, 1], e.x, e.y + 6, 60, 120, 0.3, { depth: 3.8, a: 0.55, squash: 0.45 }); break;
      case 'ren_q_tick': if (!red) this.pop('cyclone_arc', [1, 2], e.x, e.y - 24 * sc, REN_Q.tickR * 1.4, REN_Q.tickR * 2, 0.16, { a: 0.5, depth: 9.3, squash: 0.6, spin: 6 }); break;
      case 'ren_q_release': {
        const R = REN_Q.releaseR; this.pop('cyclone_arc', [3], e.x, e.y - 20 * sc, R * 0.8, R * 2.4, 0.4, { a: 0.9, squash: 0.62, depth: 9.3 });
        this.pop('cyclone_crack', [0, 1, 2, 3], e.x, e.y + 6, R * 1.0, R * 2.1, 0.7, { depth: 3.8, a: 0.9, squash: 0.55 }); this.pop('ground_ring', [1, 2, 3], e.x, e.y + 4, R * 1.0, R * 2.4, 0.5, { depth: 3.7, a: 0.7, squash: 0.5 });
        if (od) this.surge(o, e.x + this.side * 90, e.y - 40, 1.1); this.shake(o, 120, 0.003); break;
      }
      case 'ren_e_start': this.pop('rampage_dust', [0, 1], e.x, e.y + 8, 70, 130, 0.3, { a: 0.55, depth: 3.9, oy: 1, squash: 1 }); if (od) this.surge(o, tx, ty, 1); break;
      case 'ren_e_grab': this.pop('rampage_dust', [1, 2], e.x, e.y + 8, 60, 120, 0.25, { a: 0.55, depth: 3.9, oy: 1 }); break;
      case 'ren_e_slam': case 'ren_e_hit': {
        const R = e.kind === 'ren_e_hit' && (n & 3) === 2 ? REN_E.missR : REN_E.slamR;
        this.pop('cyclone_crack', [0, 1, 2, 3], e.x, e.y + 6, R * 0.9, R * 2, 0.6, { depth: 3.8, a: 0.9, squash: 0.55 }); this.pop('rampage_dust', [0, 1, 2, 3], e.x, e.y + 10, R * 1.0, R * 2.2, 0.5, { a: 0.75, depth: 3.9, oy: 1 });
        if (!red) this.pop('cat_debris', R_ALL, e.x, e.y + 8, R * 0.8, R * 1.8, 0.45, { a: 0.6, depth: 3.9, squash: 0.6 });
        if (od) this.pop('paw_b', [0, 1, 2, 3], e.x, e.y + 6, R * 0.9, R * 1.2, 0.4, { a: 0.85, depth: 10.3, oy: 1, ox: 0.5 });
        this.shake(o, 110, 0.0034); break;
      }
      case 'ren_r_mark': this.pop('ground_ring', [0, 1], e.x, e.y + 4, REN_R.fistR * 1.2, REN_R.fistR * 2.2, 0.4, { depth: 3.8, a: 0.55, squash: 0.5 }); break;
      case 'ren_r_hit': {
        const side = (n >> 4) & 1, fin = ((n >> 5) & 1) === 1, R = fin ? REN_R.finalR : REN_R.fistR, w = fin ? 250 : 170;
        if (fin) { this.pop('fist_l', [0, 1, 2, 3], e.x - 54, e.y + 10, w * 0.8, w, 0.5, { oy: 1, a: 0.95, depth: 10.3 }); this.pop('fist_r', [0, 1, 2, 3], e.x + 54, e.y + 10, w * 0.8, w, 0.5, { oy: 1, a: 0.95, depth: 10.3 }); }
        else this.pop(side ? 'fist_r' : 'fist_l', [0, 1, 2, 3], e.x, e.y + 10, w * 0.8, w, 0.42, { oy: 1, a: 0.92, depth: 10.3 });
        this.pop('cat_shock', R_ALL, e.x, e.y + 6, R * 0.8, R * 2.3, fin ? 0.6 : 0.4, { depth: 3.8, a: 0.85, squash: 0.5 }); if (!red) this.pop('cat_debris', R_ALL, e.x, e.y + 8, R * 0.9, R * 2, 0.45, { a: 0.65, depth: 3.9, squash: 0.6 });
        if (od && fin) this.pop('paw_b', [0, 1, 2, 3], e.x, e.y + 6, 220, 300, 0.5, { a: 0.9, depth: 10.3, oy: 1 });
        this.shake(o, fin ? 220 : 90, fin ? 0.005 : 0.002); break;
      }
      case 'ren_v_tier': this.pop('nova_ring', [0, 1], e.x, e.y - 40 * sc, 40 * sc, (60 + 24 * (n & 3)) * sc, 0.28, { a: 0.7, depth: 10.7 }); this.shake(o, 50, 0.0008 * (n & 3)); break;
      case 'ren_v_release': { this.squash = 1.16; const a = Math.atan2(ty - e.y, tx - e.x); this.pop('fist_trail', [0, 1, 2, 3], e.x, e.y - 38 * sc, 150, 250, 0.3, { rot: a, ox: 1, oy: 0.5, a: 0.8, depth: 10.2 }); if (od) { this.paw(o, tx, ty, 1.3, false); this.surge(o, tx, ty, 1.3); } break; }
      case 'ren_v_hit': { const tier = n & 3; const R = REN_V.eruptR * (0.7 + 0.1 * tier); this.pop('nova_core', R_ALL, e.x, e.y + 8, R * 0.7, R * 1.7, 0.6, { oy: 1, a: 1, depth: 10.8 }); this.pop('nova_spiral', R_ALL, e.x, e.y - 10, R * 0.6, R * 1.9, 0.5, { a: 0.8, spin: 2, depth: 10.7 }); this.pop('ground_ring', [1, 2, 3], e.x, e.y + 4, R, R * 2.4, 0.5, { depth: 3.7, a: 0.8, squash: 0.5 }); this.shake(o, 160 + 30 * tier, 0.003 + 0.0012 * tier); break; }
      case 'ren_v_pulse': { const i = n & 31, tier = (n >> 5) & 7, R = i === 1 ? REN_V.ringR : REN_V.burstR + REN_V.burstGrow * tier; this.pop('nova_ring', R_ALL, e.x, e.y, R * 0.6, R * 2.1, i === 1 ? 0.55 : 0.36, { a: 0.8, depth: 10.7, squash: 0.62 }); if (i === 1) this.shake(o, 140, 0.0028); break; }
      case 'ren_v_block': this.pop('nova_ring', [0, 1], e.x, e.y, 50, 100, 0.25, { a: 0.4, depth: 10.7 }); break;
      case 'ren_v_miss': this.pop('nova_ring', [0], e.x, e.y, 30, 70, 0.22, { a: 0.3, depth: 10.7 }); break;
      case 'ren_fly_start': this.pop('flight_ring', R_ALL, e.x, e.y + 6, 80, 230, 0.5, { depth: 3.8, a: 0.8, squash: 0.62 }); this.shake(o, 80, 0.0015); break;
      case 'ren_fly_land': {
        const dive = (n & 1) !== 0, R = REN_FLY.slamR;
        if (dive) { this.pop('cat_shock', R_ALL, e.x, e.y + 6, R * 0.8, R * 2.4, 0.55, { depth: 3.8, a: 0.9, squash: 0.5 }); this.pop('cyclone_crack', R_ALL, e.x, e.y + 6, R * 0.9, R * 2, 0.6, { depth: 3.8, a: 0.85, squash: 0.55 }); if (!red) this.pop('cat_debris', R_ALL, e.x, e.y + 8, R * 0.9, R * 1.9, 0.45, { a: 0.65, depth: 3.9, squash: 0.6 }); this.shake(o, 200, 0.0042); }
        else this.pop('flight_ring', [2, 3], e.x, e.y + 6, 80, 150, 0.3, { depth: 3.8, a: 0.55, squash: 0.62 });
        break;
      }
      case 'ren_od_start': {
        this.pop('activation', R_ALL, e.x, e.y - 50 * sc, 240 * sc, 440 * sc, 0.85, { a: 0.9, depth: 9.05 }); this.pop('ground_ring', R_ALL, e.x, e.y + 6, 120, 560, 0.8, { depth: 3.8, a: 0.9, squash: 0.45 }); this.squash = 1.12; this.shake(o, 300, 0.0055); break;
      }
      default: break;
    }
  }

  update(o: RenFoxInput) {
    const dt = o.running ? o.dt : 0, s = o.state, p = s.player, h = o.hero, sc = o.scale / 0.5, ren = s.hero === 'ren' && p.form >= 1; this.clock += dt;
    for (const e of s.abilityEvents) if (e.id > this.last) { this.last = e.id; if (!o.dead && e.kind.startsWith('ren_')) this.onEvent(e, o); }
    // pops (flipbooks)
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const q = this.pops[i]; q.t += dt; const u = q.t / q.dur; if (u >= 1) { q.im.destroy(); this.pops.splice(i, 1); continue; }
      const key = rfKey(`${q.set}${q.frames[Math.min(q.frames.length - 1, Math.floor(u * q.frames.length))]}`); if (q.im.texture.key !== key && this.scene.textures.exists(key)) q.im.setTexture(key);
      const w = q.w + (q.w1 - q.w) * (1 - (1 - u) ** 2), k = w / q.im.width; q.im.setScale(k * (q.sy < 0 ? -1 : 1), k * (q.sy > 0 && q.sy < 1 ? q.sy : 1) * (q.fy ? -1 : 1)).setAlpha(q.a * (u < 0.12 ? u / 0.12 : 1 - ((u - 0.12) / 0.88) ** 1.5)); q.im.rotation += q.spin * dt; q.im.x += q.vx * dt; q.im.y += q.vy * dt;
    }
    if (!ren || o.dead) { this.hideLayers(); this.wasOd = false; this.amt = 0; this.fresh = true; return; }
    if (this.fresh) { this.lx = h.x; this.ly = h.y; this.px = h.x; this.py = h.y; this.fresh = false; }
    const vx = dt > 0 ? (h.x - this.px) / dt : 0, vy = dt > 0 ? (h.y - this.py) / dt : 0, sp = Math.hypot(vx, vy); this.px = h.x; this.py = h.y;
    this.lx += (h.x - this.lx) * Math.min(1, dt * 9); this.ly += (h.y - this.ly) * Math.min(1, dt * 9);
    const f = o.facing; if (f === 'east') this.side = 1; else if (f === 'west') this.side = -1;
    if (s.aim.x || s.aim.y) this.lastAim = { x: s.aim.x, y: s.aim.y };
    const act = s.hx.act, flying = p.flyT > 0, od = p.odT > 0;
    // ---- activation / expiry of the fox
    if (this.wasOd && !od && this.amt > 0.2) this.pop('dissolve', R_ALL, this.lx - this.side * 14 * sc, this.ly - 70 * sc, 230 * sc, 200 * sc, 0.6, { a: 0.8, depth: 9.0, squash: this.side < 0 ? -1 : 1 });
    this.wasOd = od;
    const want = od ? (p.odT < 1.0 ? clamp(p.odT / 1.0, 0, 1) : 1) : 0; this.amt += (want - this.amt) * Math.min(1, dt * (od ? 3.2 : 9));
    this.squash += (1 - this.squash) * Math.min(1, dt * 7); this.lunge = Math.max(0, this.lunge - dt * 3.5);
    const charging = !!act && act.act === 'nova_fist' && !act.released;
    this.squash = charging ? this.squash + (0.88 - this.squash) * Math.min(1, dt * 6) : this.squash;
    const tE = f === 'east' || f === 'west' ? 1 : 0, tS = f === 'south' ? 1 : 0, tN = f === 'north' ? 1 : 0, ease = Math.min(1, dt * 9);
    this.wE += (tE - this.wE) * ease; this.wS += (tS - this.wS) * ease; this.wN += (tN - this.wN) * ease;
    this.mv += ((flying || sp > 60 ? 1 : 0) - this.mv) * Math.min(1, dt * 7);
    const calm = o.reduced ? 0.7 : 1, flick = 0.92 + 0.08 * Math.sin(this.clock * 6.3), fr = Math.floor(this.clock * 8), breath = 1 + 0.025 * Math.sin(this.clock * 2.6) + this.lunge * 0.06;
    const A = this.amt * (o.reduced ? 0.4 : 0.55) * flick;
    // side beast (east / west): the whole fox with nine tails, chest behind Ren, head above and ahead of his shoulders
    const bx = this.lx - this.side * 14 * sc, by = this.ly + 6 * sc, lean = clamp(vx / 1100, -0.14, 0.14) * (act?.act === 'infernal_cyclone' ? 0 : 1) + (act?.act === 'infernal_cyclone' ? Math.sin(this.clock * 20) * 0.05 : 0);
    const sideLayer = (im: Phaser.GameObjects.Image, set: RfSet, wpx: number, a: number) => {
      if (a < 0.01 || !this.tex(im, set, fr + (set === 'tails_stream' ? 2 : 0))) { im.setVisible(false); return; }
      const k = (wpx * sc * breath) / im.width; im.setVisible(true).setOrigin(0.62, 0.95).setPosition(Math.round(bx), Math.round(by)).setScale(k * this.side * (2 - this.squash), k * this.squash).setRotation(lean).setAlpha(a);
    };
    sideLayer(this.rest, 'tails_rest', 190, A * this.wE * (1 - this.mv)); sideLayer(this.stream, 'tails_stream', 215, A * this.wE * this.mv);
    // south: front beast with its nine tails fanned behind Ren; the frame follows the move (gather while charging, open on release)
    if (A * this.wS > 0.01 && this.tex(this.front, 'tails_flare', charging ? 0 : this.lunge > 0.1 ? 3 : 1 + (Math.floor(this.clock * 2.5) & 1))) {
      const k = (165 * sc * breath) / this.front.height; this.front.setVisible(true).setOrigin(0.5, 0.97).setPosition(Math.round(this.lx), Math.round(this.ly + 2 * sc)).setScale(k * (2 - this.squash), k * this.squash).setAlpha(A * this.wS);
    } else this.front.setVisible(false);
    // north: ears and mane above Ren's head, tails rising in a fan behind him
    if (A * this.wN > 0.01 && this.tex(this.back, 'head_back', Math.floor(this.clock * 4))) {
      const k = (96 * sc * breath) / this.back.width; this.back.setVisible(true).setOrigin(0.5, 0.9).setPosition(Math.round(this.lx), Math.round(this.ly - 86 * sc)).setScale(k).setAlpha(A * this.wN * 1.1);
      for (let i = 0; i < 2; i++) { const im = this.halo[i]; if (!this.tex(im, 'tails_only', fr + i * 2)) continue; const sway = Math.sin(this.clock * 2.2 + i * 2.1) * 0.22 + (i ? 0.42 : -0.42) + lean; im.setVisible(true).setOrigin(1, 0.5).setPosition(Math.round(this.lx), Math.round(this.ly - 40 * sc)).setScale((150 * sc * breath) / im.width * (i ? -1 : 1)).setRotation(Math.PI / 2 * (i ? -1 : 1) + sway * (i ? -1 : 1)).setAlpha(A * this.wN * 0.75); }
    } else { this.back.setVisible(false); this.halo[0].setVisible(false); this.halo[1].setVisible(false); }
    // ground pressure under the beast
    if (this.amt > 0.05 && this.tex(this.ground, 'ground_ring', 1 + (Math.floor(this.clock * 3) & 1))) this.ground.setVisible(true).setPosition(Math.round(this.lx), Math.round(this.ly + 4)).setScale((170 * sc * (1 + 0.05 * Math.sin(this.clock * 3.4))) / this.ground.width).setAlpha(this.amt * 0.3 * calm); else this.ground.setVisible(false);
    // ---- Skybreaker: heavy forward tail fan streaming behind the lifted body (comet-like), regardless of the beast
    if (flying && this.tex(this.fan, 'flight_fan', fr)) {
      const mvx = sp > 40 ? vx : this.lastAim.x * 40, mvy = sp > 40 ? vy : this.lastAim.y * 40, a = Math.atan2(mvy, mvx) + Math.PI;
      this.fan.setVisible(true).setOrigin(1, 0.5).setPosition(Math.round(h.x), Math.round(h.y - 46 * sc)).setScale((170 * sc * (0.95 + 0.05 * Math.sin(this.clock * 14))) / this.fan.width, (170 * sc) / this.fan.width).setRotation(a - Math.PI).setAlpha(0.5 * calm);
      this.ringClock -= dt; if (this.ringClock <= 0 && !o.reduced) { this.ringClock = 0.55; this.pop('flight_ring', [1, 2], h.x, h.y + 6, 60, 120, 0.3, { depth: 3.8, a: 0.4, squash: 0.62 }); }
    } else this.fan.setVisible(false);
    // ---- live cast layers: spinning arcs of Infernal Cyclone, the sphere compressed in the fist of Crimson Nova Fist, Scarlet Rampage's momentum
    if (act && act.act === 'infernal_cyclone' && act.t >= REN_Q.windup * 0.5 && !act.released) {
      const u = clamp((act.t - REN_Q.windup * 0.5) / (REN_Q.windup + REN_Q.spin), 0, 1), R = REN_Q.pullR * (0.5 + 0.5 * u);
      for (let i = 0; i < 2; i++) { const im = this.cyc[i]; if (!this.tex(im, 'cyclone_arc', i ? 2 : 1)) continue; const k = (R * (i ? 1.5 : 2.1)) / im.width; im.setVisible(true).setPosition(Math.round(h.x), Math.round(h.y - 26 * sc)).setScale(k, k * 0.6).setRotation(this.clock * (i ? -18 : 14)).setAlpha((i ? 0.3 : 0.45) * calm); }
    } else { this.cyc[0].setVisible(false); this.cyc[1].setVisible(false); }
    if (charging && act) {
      const tier = clamp(act.tier ?? 0, 0, 3), t = clamp(act.charge / REN_V.stages[2], 0, 1), hp = o.hand?.m ?? { x: h.x + act.dirX * 16 * sc, y: h.y - 36 * sc };
      const size = (26 + 40 * t) * sc * (tier >= 3 ? 1 + 0.07 * Math.sin(this.clock * 28) : 1);
      if (this.tex(this.orb, 'nova_orb', tier)) this.orb.setVisible(true).setPosition(Math.round(hp.x), Math.round(hp.y)).setScale(size / this.orb.width).setRotation(this.clock * 5).setAlpha(Math.min(1, 0.6 + 0.4 * t));
      if (!o.reduced && tier >= 1 && this.tex(this.spiral, 'nova_spiral', Math.floor(this.clock * 12)) ) this.spiral.setVisible(true).setPosition(Math.round(hp.x), Math.round(hp.y)).setScale((size * 2.1) / this.spiral.width).setRotation(-this.clock * 7).setAlpha(0.4 + 0.15 * tier); else this.spiral.setVisible(false);
    } else { this.orb.setVisible(false); this.spiral.setVisible(false); }
    if (act && act.act === 'scarlet_rampage' && act.hop < 2 && sp > 150 && !o.reduced) {
      this.ringClock -= dt; if (this.ringClock <= 0) { this.ringClock = 0.05; const a = Math.atan2(vy, vx); this.pop('rampage_trail', R_ALL, h.x, h.y - 30 * sc, 110, 200, 0.3, { rot: a, ox: 1, oy: 0.5, a: 0.4, depth: 9.1 }); }
    }
    // ---- form presence: restrained ground pressure while moving, a dash pulse, body-bound wisps at the shoulders, a ribbon along the striking forearm
    const dashing = p.dashRemaining > 0; if (dashing && !this.lastDash && !o.reduced) this.pop('ground_ring', [1, 2, 3], h.x, h.y + 6, 80, 210, 0.4, { depth: 3.8, a: 0.4, squash: 0.5 }); this.lastDash = dashing;
    if (sp > 110 && !flying && !o.reduced && !o.crowded) { this.pulseT -= dt; if (this.pulseT <= 0) { this.pulseT = 0.9; this.pop('ground_ring', [0, 1], h.x, h.y + 6, 60, 120, 0.35, { depth: 3.7, a: 0.22, squash: 0.5 }); } }
    const casting = !!act, wa = (o.reduced || o.crowded ? 0.12 : 0.28) + (casting ? 0.22 : 0) + (od ? 0.1 : 0);
    for (let i = 0; i < 2; i++) { const im = this.wisp[i]; if (!this.tex(im, 'wisps', Math.floor(this.clock * 7) + i * 2) || this.wS > 0.5) { im.setVisible(false); continue; } const sd = i ? 1 : -1; im.setVisible(true).setOrigin(0.5, 1).setPosition(Math.round(h.x + sd * 13 * sc), Math.round(h.y - 58 * sc)).setScale((26 * sc) / im.width * (i ? -1 : 1)).setRotation(sd * 0.18 - lean).setAlpha(wa); }
    const since = this.clock - this.strikeAt;
    if (since < 0.22 && !o.reduced && o.hand && this.tex(this.arc, 'wisp_arc', Math.floor(since * 20))) { const a = this.strikeA, left = Math.cos(a) < 0; this.arc.setVisible(true).setOrigin(0.5, 0.5).setPosition(Math.round(o.hand.m.x), Math.round(o.hand.m.y)).setScale((64 * sc) / this.arc.width * (left ? -1 : 1), (64 * sc) / this.arc.width).setRotation(left ? a - Math.PI : a).setAlpha(0.55 * (1 - since / 0.22)); } else this.arc.setVisible(false);
  }
  private pulseT = 0;
  private hideLayers() { for (const im of [this.rest, this.stream, this.front, this.back, ...this.halo, this.ground, this.fan, ...this.wisp, this.arc, this.orb, this.spiral, ...this.cyc]) im.setVisible(false); }
  destroy() { for (const q of this.pops) q.im.destroy(); this.pops = []; for (const im of [this.rest, this.stream, this.front, this.back, ...this.halo, this.ground, this.fan, ...this.wisp, this.arc, this.orb, this.spiral, ...this.cyc]) im.destroy(); }
}

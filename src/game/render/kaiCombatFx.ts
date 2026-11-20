/** Kai combat identity, presentation: form-specific auto-attack contacts, the charge / lunge / contact / detonation visuals of the signature techniques, Primal Overdrive's spectral dragon (mantle, claws, jaws, ground sigil, trails) and Form Shift bursts. Reads sim state + events only; the art is the ImageGen set in public/art/fx/kai-o. */
import Phaser from 'phaser';
import type { AbilityEvent, GameState } from '../../sim/GameState';
import { FLY, SIG } from '../../content/kaiCombat';
import { OverdriveDragon } from './kaiDragon';

export const KO_FORM = ['', 'flare', 'comet', 'still'] as const;
export const KO_NAMES = (['flare', 'comet', 'still'] as const).flatMap(f => (['dragon', 'claw', 'orb', 'burst', 'head', 'sigil', 'jet', 'shift', 'limb', 'tail'] as const).flatMap(k => [0, 1, 2, 3].map(i => `${f}_${k}${i}`)));
export const koKey = (n: string) => `ko-${n}`; export const koUrl = (n: string) => `/art/fx/kai-o/${n}.png`;
const COL = [0, 0xffa83a, 0xffd93a, 0xdfeaff] as const;
interface Pop { im: Phaser.GameObjects.Image; t: number; dur: number; frames: string[]; w: number; w1: number; a: number; vx: number; vy: number; flat: boolean; spin: number }
export interface CombatFxInput { dt: number; state: GameState; hero: Phaser.GameObjects.Sprite; hand: { m: { x: number; y: number } } | null; scale: number; reduced: boolean; running: boolean; dead: boolean; crowded: boolean }

export class KaiCombatFx {
  private pops: Pop[] = []; private g: Phaser.GameObjects.Graphics; private readonly dragon: OverdriveDragon; private orb: Phaser.GameObjects.Image; private sigil: Phaser.GameObjects.Image;
  private last = 0; private clock = 0; private dragonA = 0; private lx = 0; private ly = 0; private side = 1; private trailClock = 0; private fresh = true; private dashWas = false; private px = 0; private py = 0;
  constructor(private readonly scene: Phaser.Scene) {
    const blank = 'kp-blank'; if (!scene.textures.exists(blank)) scene.textures.createCanvas(blank, 2, 2)!.refresh();
    this.g = scene.add.graphics().setDepth(11.6).setBlendMode(Phaser.BlendModes.ADD);
    this.dragon = new OverdriveDragon(scene);
    this.orb = scene.add.image(0, 0, blank).setBlendMode(Phaser.BlendModes.ADD).setDepth(11.4).setVisible(false);
    this.sigil = scene.add.image(0, 0, blank).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.7).setVisible(false);
  }
  private has(n: string) { return this.scene.textures.exists(koKey(n)); }
  private pop(frames: string[], x: number, y: number, w: number, w1: number, dur: number, o: { a?: number; rot?: number; depth?: number; flat?: boolean; vx?: number; vy?: number; ox?: number; oy?: number; spin?: number } = {}) {
    if (this.pops.length >= 36 || !frames.length || !this.has(frames[0])) return;
    const im = this.scene.add.image(x, y, koKey(frames[0])).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.depth ?? 11.5).setRotation(o.rot ?? 0).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5).setAlpha(0);
    this.pops.push({ im, t: 0, dur, frames, w, w1, a: o.a ?? 1, vx: o.vx ?? 0, vy: o.vy ?? 0, flat: !!o.flat, spin: o.spin ?? 0 });
  }
  private fr = (f: number, kind: string, from = 0, to = 3) => { const out: string[] = []; for (let i = from; i <= to; i++) out.push(`${KO_FORM[f]}_${kind}${i}`); return out; };
  private shake(ms: number, k: number, reduced: boolean) { if (!reduced) this.scene.cameras.main.shake(ms, k); }

  private onEvent(e: AbilityEvent, o: CombatFxInput) {
    const sc = o.scale / 0.5, red = o.reduced, p = o.state.player, f = Math.max(1, p.form), od = p.odT > 0;
    const n = e.n ?? 0;
    switch (e.kind) {
      case 'kai_auto': {
        if (od) this.dragon.strike(e.tx ?? e.x, e.ty ?? e.y, (n & 32) !== 0 ? 1.4 : 0.8);
        const form = (n >> 2) & 3, tx = e.tx ?? e.x, ty = e.ty ?? e.y, fin = (n & 32) !== 0, ranged = (n & 16) !== 0, chain = (n & 128) !== 0, ff = form || 0;
        if (chain) { this.bolt(e.x, e.y, tx, ty, COL[2]); this.pop(this.fr(2, 'burst', 0, 1), tx, ty, 50 * sc, 80 * sc, 0.2); break; }
        if (ff === 0) { if (!ranged) this.ring(tx, ty, 0xbfeaff, (fin ? 90 : 50) * sc, 0.25); break; }   // base keeps the bare-knuckle read: a clean contact ring
        const big = fin ? 1.9 : 1;
        if (ranged) { if (ff === 3) this.ring(tx, ty, COL[3], 80 * sc, 0.35, true); else this.pop(this.fr(ff, 'burst', 0, 1), tx, ty, 40 * sc, 70 * sc, 0.22, { a: 0.8 }); break; }
        this.pop(this.fr(ff, 'burst', 0, 2), tx, ty - 6 * sc, 46 * sc * big, 92 * sc * big, fin ? 0.34 : 0.24, { rot: Math.random() * 6.28, a: 0.9 });
        if (fin && !red) { const a = Math.atan2(ty - e.y, tx - e.x); this.pop(this.fr(ff, 'claw', 0, 3), tx, ty, 80 * sc * (od ? 1.5 : 1), 130 * sc * (od ? 1.5 : 1), 0.3, { rot: a + 0.2, a: od ? 1 : 0.7 }); }
        if (ff === 2 && !red) this.ring(tx, ty, COL[2], 95 * sc, 0.28);
        if (ff === 3) this.pop(this.fr(3, 'shift', 1, 2), tx, ty, 50 * sc, 100 * sc, 0.28, { a: 0.7 });
        if (fin) this.shake(60, 0.0014, red);
        if (od && !red) { const a = Math.atan2(ty - e.y, tx - e.x); this.pop(this.fr(ff, 'claw', 0, 3), tx, ty, 100 * sc, 170 * sc, 0.32, { rot: a, a: 0.85 }); }
        break;
      }
      case 'sig_tier': { const ff = f; this.ring(e.x, e.y - 30 * sc, COL[ff], (60 + 22 * n) * sc, 0.3); this.shake(50, 0.0008 * n, red); break; }
      case 'sig_release': {
        if (od) this.dragon.strike(e.tx ?? e.x, e.ty ?? e.y, 1.4); const ff = (n >> 3) & 3 || f, tier = n & 7; this.pop(this.fr(ff, 'burst', 0, 0), e.x, e.y - 30 * sc, 60 * sc, 130 * sc * (1 + tier * 0.2), 0.22); this.shake(90, 0.002 + 0.0008 * tier, red); break; }
      case 'sig_hit': { const ff = (n >> 3) & 3 || f, tier = n & 7, s = (170 + 50 * tier) * sc; if (ff === 3) { this.vort = { x: e.x, y: e.y, t: 0, R: (SIG.still.pullR + SIG.still.pullGrow * tier) * sc }; this.pop(this.fr(3, 'sigil', 0, 3), e.x, e.y + 8, this.vort.R * 2.2, this.vort.R * 0.5, SIG.still.releaseAt, { flat: true, depth: 3.8, a: 1 }); } this.pop(this.fr(ff, 'burst', 0, 3), e.x, e.y - 10 * sc, s * 0.5, s, 0.5, { a: 1, rot: ff === 2 ? 0.4 : 0 }); this.ring(e.x, e.y, COL[ff], s * 1.1, 0.4); if (od && !red) this.pop(this.fr(ff, 'claw', 0, 3), e.x, e.y, s * 0.8, s * 1.2, 0.4, { rot: -0.6 }); this.shake(150, 0.0035, red); break; }
      case 'sig_block': this.ring(e.x, e.y, 0xaab4c0, 90 * sc, 0.3); this.shake(60, 0.0015, red); break;
      case 'sig_miss': this.ring(e.x, e.y + 6, 0x8a97a5, 70 * sc, 0.25, true); break;
      case 'sig_pulse': {
        const ff = (n >> 3) & 3 || f, big = (n & 7) === 1, tier = (n >> 5) & 7;
        const R = ff === 1 ? (big ? 190 : 110 + 30 * tier) : ff === 2 ? (big ? 175 : 85) : (big ? 150 + 30 * tier : 200);
        this.pop(this.fr(ff, 'burst', big ? 1 : 0, 3), e.x, e.y - 8 * sc, R * 0.6 * sc, R * 2 * sc * (ff === 3 && !big ? 0.6 : 1), big ? 0.55 : 0.36, { a: big ? 1 : 0.8, rot: Math.random() * 6.28 });
        this.pop(this.fr(ff, 'sigil', 0, 3), e.x, e.y + 8, R * 0.5, R * 2.1, big ? 0.7 : 0.45, { flat: true, depth: 3.8, a: 0.9 });
        if (ff === 2) { for (let i = 0; i < 3 && !red; i++) { const a = Math.random() * 6.28; this.bolt(e.x, e.y, e.x + Math.cos(a) * R, e.y + Math.sin(a) * R * 0.6, COL[2]); } }
        this.shake(big ? 220 : 90, big ? 0.005 : 0.0022, red); break;
      }
      case 'od_start': {
        this.pop(this.fr(f, 'sigil', 0, 3), e.x, e.y + 8, 80 * sc, 520 * sc, 1.0, { flat: true, depth: 3.8, a: 1 });
        this.pop(this.fr(f, 'shift', 0, 3), e.x, e.y - 40 * sc, 90 * sc, 520 * sc, 0.8, { a: 1 });
        this.ring(e.x, e.y, COL[f], 560 * sc, 0.7); this.shake(320, 0.006, red); this.dragonA = Math.max(this.dragonA, 0.05); this.dragon.strike(e.x + 40 * sc, e.y - 40 * sc, 1.2); break;
      }
      case 'fly_start': { const ff = n || f; this.pop(this.fr(ff, 'sigil', 0, 3), e.x, e.y + 8, 40 * sc, 190 * sc, 0.5, { flat: true, depth: 3.8, a: 0.9 }); this.pop(this.fr(ff, 'jet', 0, 3), e.x, e.y + 4, 60 * sc, 90 * sc, 0.35, { ox: 0.5, oy: 0, a: 0.9 }); this.shake(80, 0.0016, red); break; }
      case 'fly_land': {
        const dive = (n & 1) !== 0, ff = (n >> 1) || f, R = FLY.slam.r;
        if (dive) { this.pop(this.fr(ff, 'burst', 0, 3), e.x, e.y - 10 * sc, R * 0.8 * sc, R * 2.6 * sc, 0.55, { a: 1 }); this.pop(this.fr(ff, 'sigil', 0, 3), e.x, e.y + 8, R * 0.6 * sc, R * 2.4 * sc, 0.6, { flat: true, depth: 3.8, a: 1 }); if (ff === 2) for (let i = 0; i < 3 && !red; i++) { const a = Math.random() * 6.28; this.bolt(e.x, e.y, e.x + Math.cos(a) * R, e.y + Math.sin(a) * R * 0.5, COL[2]); } this.shake(200, 0.0045, red); }
        else this.ring(e.x, e.y, COL[Math.max(1, ff)], 110 * sc, 0.3);
        break;
      }
      case 'od_end': this.ring(e.x, e.y, COL[f], 220 * sc, 0.4); break;
      case 'form_shift': this.pop(this.fr(Math.max(1, n), 'shift', 0, 3), e.x, e.y - 36 * sc, 80 * sc, 340 * sc, 0.55, { a: 1 }); this.ring(e.x, e.y, COL[Math.max(1, n)], 280 * sc, 0.45); this.shake(160, 0.003, red); break;
      case 'beam_fire': case 'comet_fire': case 'rift_fire': case 'dragon_launch': {
        if (!od) break; const c = o.state.cast, a = c ? Math.atan2(c.dirY, c.dirX) : 0, h = o.hand?.m ?? e;
        this.pop(this.fr(f, 'head', 0, 3), h.x, h.y, 150 * sc, 260 * sc, 0.5, { rot: a, ox: 0.15, a: 0.95 }); break;
      }
      case 'sphere_burst': case 'meteor_beat': case 'flare_pillar': case 'crucible_final': case 'form3_dash': if (od && !red) this.pop(this.fr(f, 'claw', 0, 3), e.x, e.y, 120 * sc, 220 * sc, 0.4, { rot: -0.5, a: 0.9 }); break;
      default: break;
    }
  }
  private ring(x: number, y: number, tint: number, size: number, dur: number, flat = true) {
    const f = tint === COL[3] ? 3 : tint === COL[2] ? 2 : 1; const fr = this.fr(f, 'sigil', 0, 3);
    if (!this.has(fr[0])) return; this.pop([fr[Math.floor(Math.random() * 4)]], x, y + 8, size * 0.35, size, dur, { flat, depth: 3.8, a: 0.75 });
  }
  private bolt(x0: number, y0: number, x1: number, y1: number, col: number) {
    let px = x0, py = y0; const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
    for (let i = 1; i <= 5; i++) { const u = i / 5, off = i === 5 ? 0 : (Math.random() - 0.5) * 14, qx = x0 + (x1 - x0) * u + nx / nl * off, qy = y0 + (y1 - y0) * u + ny / nl * off; this.pend.push([px, py, qx, qy, col]); px = qx; py = qy; }
  }
  private vort: { x: number; y: number; t: number; R: number } | null = null; private jetClock = 0; private rippleClock = 0; private pend: [number, number, number, number, number][] = []; private pendT = 0;

  update(o: CombatFxInput) {
    const dt = o.running ? o.dt : 0, s = o.state, p = s.player, f = Math.max(1, p.form), sc = o.scale / 0.5, h = o.hero; this.clock += dt;
    this.g.clear();
    for (const e of s.abilityEvents) if (e.id > this.last) { this.last = e.id; if (!o.dead) this.onEvent(e, o); }
    // Singularity Palm: while the palm holds, silver arcs spiral into the point of contact and the field tightens until the implosion
    if (this.vort) {
      const v = this.vort; v.t += dt; const u = v.t / SIG.still.releaseAt;
      if (u >= 1) this.vort = null; else {
        const g = this.g, k = 1 - u;
        g.lineStyle(2, 0xdfeaff, 0.7 * k + 0.2); g.strokeEllipse(v.x, v.y + 6, v.R * 2 * k + 14, v.R * 0.9 * k + 6);
        for (let i = 0; i < 14; i++) {
          const a0 = i * 0.449 + v.t * 8, r0 = v.R * k * (0.3 + 0.7 * ((i * 7) % 5) / 4), r1 = r0 * 0.78;
          g.lineStyle(1.6, i % 3 === 0 ? 0xffffff : 0xb9d2ff, 0.75 * (0.4 + 0.6 * u));
          g.lineBetween(v.x + Math.cos(a0) * r0, v.y - 6 + Math.sin(a0) * r0 * 0.5, v.x + Math.cos(a0 + 0.4) * r1, v.y - 6 + Math.sin(a0 + 0.4) * r1 * 0.5);
        }
        g.fillStyle(0xffffff, 0.15 + 0.5 * u); g.fillCircle(v.x, v.y - 6, 6 + 10 * u);
      }
    }
    // transient pops (flipbooks)
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const q = this.pops[i]; q.t += dt; const u = q.t / q.dur; if (u >= 1) { q.im.destroy(); this.pops.splice(i, 1); continue; }
      const key = koKey(q.frames[Math.min(q.frames.length - 1, Math.floor(u * q.frames.length))]); if (q.im.texture.key !== key && this.scene.textures.exists(key)) q.im.setTexture(key);
      const w = q.w + (q.w1 - q.w) * (1 - (1 - u) ** 2), k = w / q.im.width; q.im.setScale(k, q.flat ? k : k).setAlpha(q.a * (u < 0.1 ? u / 0.1 : 1 - ((u - 0.1) / 0.9) ** 1.5)); if (q.spin) q.im.rotation += q.spin * dt; q.im.x += q.vx * dt; q.im.y += q.vy * dt;
    }
    this.pendT -= dt; if (this.pend.length) { for (const l of this.pend) { this.g.lineStyle(7, l[4], 0.3).lineBetween(l[0], l[1], l[2], l[3]); this.g.lineStyle(2.5, 0xffffff, 0.95).lineBetween(l[0], l[1], l[2], l[3]); } if (this.pendT <= 0) { this.pend = []; this.pendT = 0.08; } }
    const active = !o.dead && p.form > 0 && s.hero === 'kai';
    // ---- Skybreaker: propulsion plume under the lifted body
    if (active && p.flyT > 0) {
      this.jetClock -= dt; const gy = h.y + p.air * FLY.lift * sc;
      if (this.jetClock <= 0) { this.jetClock = 0.07; this.pop(this.fr(f, 'jet', 0, 3), h.x, h.y + 2 * sc, 52 * sc, 74 * sc, 0.28, { ox: 0.5, oy: 0, a: 0.9, depth: 9.0 }); }
      this.rippleClock -= dt; if (this.rippleClock <= 0 && !o.reduced) { this.rippleClock = 0.3; this.ring(h.x, gy, COL[f], 70 * sc, 0.3); }
    }
    // ---- signature charge / lunge orb attached to the real palm
    const c = s.cast; let orbOn = false;
    if (active && c && c.kind === 'signature') {
      const hp = o.hand?.m ?? { x: h.x + c.dirX * 14 * sc, y: h.y - 34 * sc };
      const ff = Math.max(1, c.form), tier = c.tier ?? 0, t = c.released ? 1 : Math.min(1, c.t / SIG.stages[2]);
      const px = c.released ? h.x + c.dirX * (p.radius + 16) : hp.x, py = c.released ? h.y - 30 * sc + c.dirY * 10 : hp.y;
      const key = c.released ? `${KO_FORM[ff]}_orb3` : `${KO_FORM[ff]}_orb${Math.min(2, tier === 0 ? 0 : tier === 1 ? 1 : 2)}`;
      if (this.has(key)) {
        const size = (c.released ? 64 : 24 + 56 * t) * sc * (tier >= 3 && !c.released ? 1 + 0.06 * Math.sin(this.clock * 30) : 1), jit = ff === 2 && !c.released ? 1.5 : 0;
        this.orb.setTexture(koKey(key)).setVisible(true).setPosition(Math.round(px + (Math.random() - 0.5) * jit * 2), Math.round(py + (Math.random() - 0.5) * jit * 2)).setScale(size / this.orb.width).setRotation(this.clock * (ff === 3 ? 2.2 : ff === 2 ? 7 : 5) * (c.released ? 2 : 1)).setAlpha(Math.min(1, 0.55 + 0.45 * t)); orbOn = true;
        if (!c.released && !o.reduced) {
          const R = size * 0.9;
          if (ff === 3) for (let i = 0; i < 2; i++) { const u = ((this.clock * 1.4 + i * 0.5) % 1); this.g.lineStyle(1.5, 0xdfeaff, 0.5 * (1 - u)).strokeEllipse(px, py, R * 2.4 * (1 - u * 0.7), R * 2.4 * (1 - u * 0.7)); }   // energy gathers inward
          if (ff === 2 && Math.sin(this.clock * 40) > 0.2) { const a = Math.random() * 6.28; this.bolt(px, py, px + Math.cos(a) * R * 1.3, py + Math.sin(a) * R * 1.3, COL[2]); }
          if (tier >= 3) { this.g.lineStyle(2, COL[ff], 0.55 + 0.3 * Math.sin(this.clock * 20)).strokeCircle(px, py, R * 1.1); }
        }
      }
    }
    if (!orbOn) this.orb.setVisible(false);
    // ---- Primal Overdrive: the spectral dragon coils around Kai, follows with lag, leans into movement
    const od = active && p.odT > 0, want = od ? (p.odT < 1.2 ? 0.9 * (p.odT / 1.2) : 0.9) : 0; this.dragonA += (want - this.dragonA) * Math.min(1, dt * 5);
    if (this.fresh) { this.lx = h.x; this.ly = h.y; this.px = h.x; this.py = h.y; this.fresh = false; }
    const vx = dt > 0 ? (h.x - this.px) / dt : 0, vy = dt > 0 ? (h.y - this.py) / dt : 0, sp = Math.hypot(vx, vy); this.px = h.x; this.py = h.y;
    this.lx += (h.x - this.lx) * Math.min(1, dt * 11); this.ly += (h.y - this.ly) * Math.min(1, dt * 11);
    if (Math.abs(vx) > 40) this.side += ((vx > 0 ? 1 : -1) - this.side) * Math.min(1, dt * 7); else if (c?.kind === 'signature' || s.hx.strike) this.side += ((s.aim.x >= 0 ? 1 : -1) - this.side) * Math.min(1, dt * 3);
    const dm = (s.aim.x || s.aim.y) ? s.aim : { x: 1, y: 0 };
    this.dragon.update({ dt, clock: this.clock, x: h.x, y: h.y, sc, form: f as 1 | 2 | 3, amount: this.dragonA / 0.9, vx, vy, aimX: dm.x, aimY: dm.y, fly: p.flyT > 0, dash: p.dashRemaining > 0, reduced: o.reduced, crowded: o.crowded });
    if (this.dragonA > 0.02) {
      // sigil under the feet, pulsing
      const sk = `${KO_FORM[f]}_sigil${Math.floor(this.clock * 5) % 4}`; if (this.has(sk)) this.sigil.setTexture(koKey(sk)).setVisible(true).setPosition(Math.round(h.x), Math.round(h.y + 2)).setScale((120 * sc * (1 + 0.06 * Math.sin(this.clock * 4))) / this.sigil.width).setAlpha(this.dragonA * 0.55);
      // movement: claw-mark streaks behind Kai
      this.trailClock -= dt; if (sp > 120 && this.trailClock <= 0 && !o.reduced) { this.trailClock = 0.11; const a = Math.atan2(vy, vx); this.pop(this.fr(f, 'claw', 0, 3), h.x - Math.cos(a) * 24, h.y - 30 * sc - Math.sin(a) * 24, 70 * sc, 120 * sc, 0.3, { rot: a + 0.15, a: 0.55, ox: 1, oy: 0.5, depth: 9.0 }); }
      if (p.dashRemaining > 0 && !this.dashWas && !o.reduced) this.pop(this.fr(f, 'head', 0, 3), h.x, h.y - 30 * sc, 120 * sc, 220 * sc, 0.35, { rot: Math.atan2(p.dashDy, p.dashDx), ox: 0.2, a: 0.8 });
    } else { this.sigil.setVisible(false); }
    this.dashWas = p.dashRemaining > 0;
  }
  destroy() { for (const q of this.pops) q.im.destroy(); this.g.destroy(); this.dragon.destroy(); this.orb.destroy(); this.sigil.destroy(); }
}

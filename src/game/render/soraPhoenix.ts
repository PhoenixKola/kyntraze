/** B27 Sora, Azure Sovereign presentation. (1) The Astral Phoenix: a layered spectral bird that wraps Sora during Primal Overdrive (tail and breast behind him, two independently beating wings, a head above and ahead of his shoulders; every part is its own ImageGen layer driven by real sim events). (2) The ImageGen FX of the form's Q / E / R / V, the Astral Blades, flight and landing, read from sora_* events, the committed fields in `hx.sf` and the live cast. (3) A restrained form presence (ground rings, feather wisps). Reads sim state only; art is public/art/fx/sora-phoenix. */
import Phaser from 'phaser';
import type { AbilityEvent, GameState } from '../../sim/GameState';
import { SORA_E, SORA_FLY, SORA_OD, SORA_Q, SORA_R, SORA_V } from '../../content/soraCombat';
import { hand } from '../../sim/HeroSystem';

export const SP_SETS = ['head_side', 'head_front', 'head_back', 'body', 'wing_side', 'tail', 'feather_blade', 'activation', 'dissolve', 'ground_ring', 'prison_form', 'prison_shatter', 'spear', 'spear_impact', 'mark_sigil', 'collapse_vortex', 'collapse_burst', 'astral_orb', 'orb_trail', 'astral_burst', 'astral_ring', 'flight_wings', 'flight_ring', 'wisps', 'wisp_arc'] as const;
export const SP_NAMES = SP_SETS.flatMap(s => [0, 1, 2, 3].map(i => `${s}${i}`));
export const spKey = (n: string) => `sp-${n}`; export const spUrl = (n: string) => `/art/fx/sora-phoenix/${n}.png`;
type SpSet = (typeof SP_SETS)[number];
interface Pop { im: Phaser.GameObjects.Image; t: number; delay: number; dur: number; set: SpSet; frames: number[]; w: number; w1: number; a: number; vx: number; vy: number; spin: number; sx: number; sy: number; byH: boolean }
interface PopOpt { a?: number; rot?: number; depth?: number; ox?: number; oy?: number; vx?: number; vy?: number; spin?: number; flipX?: boolean; squash?: number; delay?: number; byH?: boolean }
export interface SoraFxInput { dt: number; state: GameState; hero: Phaser.GameObjects.Sprite; hand: { m: { x: number; y: number } } | null; scale: number; reduced: boolean; running: boolean; dead: boolean; crowded: boolean; facing: string; /** the local fighter may shake the camera; a partner's events never do */ shake: boolean }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const R_ALL = [0, 1, 2, 3];

export class SoraPhoenix {
  private pops: Pop[] = []; private last = 0; private clock = 0; private lx = 0; private ly = 0; private px = 0; private py = 0; private fresh = true; private side = 1;
  private amt = 0; private wasOd = false; private mv = 0; private snap = 0; private snapFrame = 2; private cry = 0; private lunge = 0; private cup = 0; private ringClock = 0; private pulseT = 0; private lastDash = false; private wE = 1; private wS = 0; private wN = 0;
  private readonly body: Phaser.GameObjects.Image; private readonly tail: Phaser.GameObjects.Image; private readonly head: Phaser.GameObjects.Image; private readonly wingFar: Phaser.GameObjects.Image; private readonly wingNear: Phaser.GameObjects.Image; private readonly wingL: Phaser.GameObjects.Image; private readonly wingR: Phaser.GameObjects.Image;
  private readonly ground: Phaser.GameObjects.Image; private readonly jet: Phaser.GameObjects.Image[] = []; private readonly wisp: Phaser.GameObjects.Image[] = []; private readonly orb: Phaser.GameObjects.Image; private readonly ring: Phaser.GameObjects.Image;
  private readonly blades: Phaser.GameObjects.Image[] = []; private readonly prisms: Phaser.GameObjects.Image[] = []; private readonly vortex: Phaser.GameObjects.Image[] = []; private readonly flyOrbs: Phaser.GameObjects.Image[] = []; private readonly flyTrails: Phaser.GameObjects.Image[] = []; private readonly fgrounds: Phaser.GameObjects.Image[] = [];
  constructor(private readonly scene: Phaser.Scene) {
    const blank = 'kp-blank'; if (!scene.textures.exists(blank)) scene.textures.createCanvas(blank, 2, 2)!.refresh();
    const mk = (depth: number) => scene.add.image(0, 0, blank).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.tail = mk(8.9); this.wingFar = mk(8.92); this.body = mk(8.96); this.wingNear = mk(9.0); this.wingL = mk(8.92); this.wingR = mk(8.92); this.head = mk(9.06);
    this.ground = mk(3.7); this.jet = [mk(8.8), mk(8.8)]; this.wisp = [mk(9.6), mk(9.6)]; this.orb = mk(10.6); this.ring = mk(10.55);
    for (let i = 0; i < 24; i++) this.blades.push(mk(10.2));
    for (let i = 0; i < 3; i++) { this.prisms.push(mk(9.3)); this.vortex.push(mk(10.3)); this.fgrounds.push(mk(3.65)); }
    for (let i = 0; i < 3; i++) { this.flyOrbs.push(mk(10.6)); this.flyTrails.push(mk(10.5)); }
  }
  private has(n: string) { return this.scene.textures.exists(spKey(n)); }
  private tex(im: Phaser.GameObjects.Image, set: SpSet, i: number) { const k = spKey(`${set}${i & 3}`); if (!this.scene.textures.exists(k)) { im.setVisible(false); return false; } if (im.texture.key !== k) im.setTexture(k); return true; }
  private pop(set: SpSet, frames: number[], x: number, y: number, w: number, w1: number, dur: number, o: PopOpt = {}) {
    if (this.pops.length >= 48 || !this.has(`${set}${frames[0]}`)) return;
    const im = this.scene.add.image(x, y, spKey(`${set}${frames[0]}`)).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.depth ?? 11.2).setRotation(o.rot ?? 0).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5).setAlpha(0);
    this.pops.push({ im, t: 0, delay: o.delay ?? 0, dur, set, frames, w, w1, a: o.a ?? 1, vx: o.vx ?? 0, vy: o.vy ?? 0, spin: o.spin ?? 0, sx: o.flipX ? -1 : 1, sy: o.squash ?? 1, byH: !!o.byH });
  }
  private shake(o: SoraFxInput, ms: number, k: number) { if (o.shake && !o.reduced) this.scene.cameras.main.shake(ms, k); }

  private onEvent(e: AbilityEvent, o: SoraFxInput) {
    const sc = o.scale / 0.5, red = o.reduced, n = e.n ?? 0, od = (n & SORA_OD.bit) !== 0 || o.state.player.odT > 0, tx = e.tx ?? e.x, ty = e.ty ?? e.y;
    switch (e.kind) {
      case 'sora_auto': this.snap = 0.2; this.snapFrame = 1 + ((n & 3) % 2); if ((n & 3) === 3) { this.cry = 0.25; this.lunge = 0.5; } break;
      case 'sora_q_cast': { const r = (n & 1023) || SORA_Q.radius; this.snap = 0.3; this.snapFrame = 1; this.pop('mark_sigil', [0, 1], e.x, e.y + 4, r * 2.2, r * 2.4, 0.4, { depth: 3.8, a: 0.6, squash: 0.5 }); break; }
      case 'sora_q_tick': if (!red) this.pop('astral_ring', [1, 2], e.x, e.y, SORA_Q.radius * 1.3, SORA_Q.radius * 1.9, 0.22, { a: 0.35, depth: 9.4, squash: 0.62 }); break;
      case 'sora_q_shatter': {
        const R = SORA_Q.radius; this.pop('prison_shatter', R_ALL, e.x, e.y - 10, R * 2.4, R * 3.0, 0.55, { a: 0.95, depth: 11, oy: 0.55 }); this.pop('ground_ring', [1, 2, 3], e.x, e.y + 4, R * 1.2, R * 2.6, 0.5, { depth: 3.8, a: 0.7, squash: 0.5 }); this.shake(o, 110, 0.0026); break;
      }
      case 'sora_e_start': this.snap = 0.4; this.snapFrame = 0; this.cry = 0.3; break;
      case 'sora_e_mark': {
        const i = n & 15, r = (n >> 4) & 1023 || SORA_E.radius, at = SORA_E.lead + i * SORA_E.gap;
        this.pop('mark_sigil', R_ALL, e.x, e.y + 4, r * 2.6, r * 1.5, at + 0.1, { depth: 3.9, a: 0.8, squash: 0.5 });
        this.pop('spear', R_ALL, e.x, e.y + 8, 380, 380, 0.42, { delay: Math.max(0, at - 0.22), depth: 11.4, oy: 0.97, a: 0.95, byH: true });
        break;
      }
      case 'sora_e_land': { const r = SORA_E.radius; this.pop('spear_impact', R_ALL, e.x, e.y + 6, r * 1.6, r * 2.2, 0.4, { oy: 0.9, a: 0.95, depth: 11.2 }); this.pop('ground_ring', [1, 2], e.x, e.y + 4, r, r * 2.4, 0.35, { depth: 3.8, a: 0.6, squash: 0.5 }); this.shake(o, 50, 0.0012); break; }
      case 'sora_r_cast': { this.snap = 0.5; this.snapFrame = 3; this.cup = 0.5; break; }
      case 'sora_r_burst': { const R = SORA_R.burstR; this.pop('collapse_burst', R_ALL, e.x, e.y - 4, R * 1.1, R * 2.6, 0.6, { a: 1, depth: 11 }); this.pop('astral_ring', R_ALL, e.x, e.y + 4, R * 1.0, R * 2.6, 0.55, { a: 0.7, depth: 3.9, squash: 0.55 }); this.snap = 0.3; this.snapFrame = 0; this.shake(o, 170, 0.0038); break; }
      case 'sora_v_tier': this.pop('astral_ring', [0, 1], e.x, e.y - 44 * sc, 40 * sc, (70 + 24 * (n & 3)) * sc, 0.26, { a: 0.7, depth: 10.7 }); this.shake(o, 50, 0.0008 * (n & 3)); break;
      case 'sora_v_release': { this.snap = 0.3; this.snapFrame = 3; this.cup = 0; this.cry = 0.3; this.lunge = 0.7; break; }
      case 'sora_v_hit': { const tier = n & 3, R = SORA_V.burstR * (1 + 0.15 * tier); this.pop('astral_burst', R_ALL, e.x, e.y - 4, R * 0.9, R * 2.2, 0.6, { a: 1, depth: 10.9 }); this.pop('ground_ring', [1, 2, 3], e.x, e.y + 4, R, R * 2.4, 0.5, { depth: 3.7, a: 0.8, squash: 0.5 }); this.shake(o, 150 + 30 * tier, 0.003 + 0.0012 * tier); break; }
      case 'sora_v_pulse': { const i = n & 31, tier = (n >> 5) & 7, R = i === 1 ? SORA_V.ringR : i === 2 ? SORA_V.afterR : SORA_V.burstR + SORA_V.burstGrow * tier; this.pop('astral_ring', R_ALL, e.x, e.y, R * 0.6, R * 2.1, i === 0 ? 0.36 : 0.5, { a: 0.8, depth: 10.7, squash: 0.66 }); if (i >= 1) this.shake(o, 110, 0.0024); break; }
      case 'sora_v_block': this.pop('astral_ring', [0, 1], e.x, e.y, 46, 96, 0.25, { a: 0.4, depth: 10.7 }); break;
      case 'sora_v_fizzle': if (!red) this.pop('astral_ring', [0, 1], e.x, e.y, 30, 78, 0.28, { a: 0.35, depth: 10.7 }); break;
      case 'sora_fly_start': this.pop('flight_ring', R_ALL, e.x, e.y + 6, 80, 220, 0.5, { depth: 3.8, a: 0.8, squash: 0.62 }); this.snap = 0.4; this.snapFrame = 0; this.shake(o, 70, 0.0013); break;
      case 'sora_fly_land': {
        const dive = (n & 1) !== 0, R = SORA_FLY.slamR;
        if (dive) { this.pop('flight_ring', R_ALL, e.x, e.y + 6, R * 0.8, R * 2.3, 0.5, { depth: 3.8, a: 0.9, squash: 0.55 }); this.pop('prison_shatter', R_ALL, e.x, e.y - 4, R * 1.4, R * 2.0, 0.45, { a: 0.7, depth: 11 }); this.shake(o, 170, 0.0036); }
        else this.pop('flight_ring', [2, 3], e.x, e.y + 6, 70, 140, 0.3, { depth: 3.8, a: 0.5, squash: 0.62 });
        break;
      }
      case 'sora_od_start': { this.pop('activation', R_ALL, e.x, e.y - 52 * sc, 250 * sc, 470 * sc, 0.85, { a: 0.9, depth: 9.05 }); this.pop('ground_ring', R_ALL, e.x, e.y + 6, 120, 540, 0.8, { depth: 3.8, a: 0.9, squash: 0.45 }); this.snap = 0.6; this.snapFrame = 0; this.shake(o, 260, 0.0046); break; }
      default: break;
    }
    void tx; void ty; void od;
  }

  update(o: SoraFxInput) {
    const dt = o.running ? o.dt : 0, s = o.state, p = s.player, h = o.hero, sc = o.scale / 0.5, sora = s.hero === 'sora' && p.form === 1; this.clock += dt;
    for (const e of s.abilityEvents) if (e.id > this.last) { this.last = e.id; if (!o.dead && p.form !== 2 && e.kind.startsWith('sora_')) this.onEvent(e, o); }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const q = this.pops[i]; if (q.delay > 0) { q.delay -= dt; q.im.setAlpha(0); continue; }
      q.t += dt; const u = q.t / q.dur; if (u >= 1) { q.im.destroy(); this.pops.splice(i, 1); continue; }
      const key = spKey(`${q.set}${q.frames[Math.min(q.frames.length - 1, Math.floor(u * q.frames.length))]}`); if (q.im.texture.key !== key && this.scene.textures.exists(key)) q.im.setTexture(key);
      const w = q.w + (q.w1 - q.w) * (1 - (1 - u) ** 2), k = w / (q.byH ? q.im.height : q.im.width);
      q.im.setScale(k * q.sx, k * (q.sy > 0 && q.sy < 1 ? q.sy : 1)).setAlpha(q.a * (u < 0.12 ? u / 0.12 : 1 - ((u - 0.12) / 0.88) ** 1.5)); q.im.rotation += q.spin * dt; q.im.x += q.vx * dt; q.im.y += q.vy * dt;
    }
    if (!sora || o.dead) { this.hideLayers(); this.wasOd = false; this.amt = 0; this.fresh = true; return; }
    if (this.fresh) { this.lx = h.x; this.ly = h.y; this.px = h.x; this.py = h.y; this.fresh = false; }
    const vx = dt > 0 ? (h.x - this.px) / dt : 0, vy = dt > 0 ? (h.y - this.py) / dt : 0, sp = Math.hypot(vx, vy); this.px = h.x; this.py = h.y;
    this.lx += (h.x - this.lx) * Math.min(1, dt * 8); this.ly += (h.y - this.ly) * Math.min(1, dt * 8);
    const f = o.facing; if (f === 'east') this.side = 1; else if (f === 'west') this.side = -1;
    const act = s.hx.act, flying = p.flyT > 0, od = p.odT > 0, charging = !!act && act.act === 'astral_devastation' && !act.released;
    if (this.wasOd && !od && this.amt > 0.2) this.pop('dissolve', R_ALL, this.lx, this.ly - 70 * sc, 250 * sc, 220 * sc, 0.6, { a: 0.8, depth: 9.0 });
    this.wasOd = od;
    const want = od ? (p.odT < 1.0 ? clamp(p.odT / 1.0, 0, 1) : 1) : 0; this.amt += (want - this.amt) * Math.min(1, dt * (od ? 3.2 : 9));
    this.snap = Math.max(0, this.snap - dt); this.cry = Math.max(0, this.cry - dt); this.lunge = Math.max(0, this.lunge - dt * 3.2); this.cup = Math.max(0, this.cup - dt);
    const tE = f === 'east' || f === 'west' ? 1 : 0, tS = f === 'south' ? 1 : 0, tN = f === 'north' ? 1 : 0, ease = Math.min(1, dt * 9);
    this.wE += (tE - this.wE) * ease; this.wS += (tS - this.wS) * ease; this.wN += (tN - this.wN) * ease;
    this.mv += ((flying || sp > 60 ? 1 : 0) - this.mv) * Math.min(1, dt * 7);
    const calm = o.reduced ? 0.7 : 1, flick = 0.93 + 0.07 * Math.sin(this.clock * 5.7), A = this.amt * (o.reduced ? 0.45 : 0.6) * flick, breath = 1 + 0.025 * Math.sin(this.clock * 2.4) + this.lunge * 0.05;
    // wing beat: folded and slow at rest, quick while moving, broad in flight, a decisive snap on real attacks
    const fps = flying ? 10 : this.mv > 0.5 ? 7 : 2.4, cupped = charging || this.cup > 0, wf = cupped ? 3 : this.snap > 0 ? this.snapFrame : Math.floor(this.clock * fps) & 3, wf2 = cupped ? 3 : this.snap > 0 ? this.snapFrame : (Math.floor(this.clock * fps) + 2) & 3;
    const lean = clamp(vx / 1100, -0.14, 0.14), bx = this.lx - this.side * 8 * sc, by = this.ly + 4 * sc;
    const hv = !!(A * this.wE > 0.01);
    // side beast (east / west): tail and breast behind Sora, far and near wing beating out of phase, head above and ahead of his shoulders
    if (hv && this.tex(this.tail, 'tail', Math.floor(this.clock * 3))) { const k = (150 * sc * breath) / this.tail.width, sway = Math.sin(this.clock * 2.2) * 0.1; this.tail.setVisible(true).setOrigin(0.98, 0.5).setPosition(Math.round(bx), Math.round(by - 28 * sc)).setScale(k * this.side, k).setRotation(lean + sway * this.side).setAlpha(A * this.wE * 0.8); } else this.tail.setVisible(false);
    if (hv && this.tex(this.body, 'body', Math.floor(this.clock * 2.2))) { const k = (118 * sc * breath) / this.body.width; this.body.setVisible(true).setOrigin(0.5, 0.6).setPosition(Math.round(bx), Math.round(by - 50 * sc)).setScale(k * this.side, k).setAlpha(A * this.wE * 0.55); } else this.body.setVisible(false);
    const wing = (im: Phaser.GameObjects.Image, fr: number, wpx: number, a: number, dy: number, rot: number) => { if (a < 0.01 || !this.tex(im, 'wing_side', fr)) { im.setVisible(false); return; } const k = (wpx * sc * breath) / im.width; im.setVisible(true).setOrigin(0.97, 0.5).setPosition(Math.round(bx), Math.round(by - dy * sc)).setScale(k * this.side, k).setRotation((rot + lean) * this.side).setAlpha(a); };
    wing(this.wingFar, wf2, 150, A * this.wE * 0.55, 72, 0.22); wing(this.wingNear, wf, 175, A * this.wE * 0.75, 64, 0);
    // south / north: the same wing mirrored to either side of Sora, raised and beating together
    const sn = A * (this.wS + this.wN) * 0.7;
    if (sn > 0.01) { const pair = (im: Phaser.GameObjects.Image, sd: number) => { if (!this.tex(im, 'wing_side', wf)) { im.setVisible(false); return; } const k = (165 * sc * breath) / im.width; im.setVisible(true).setOrigin(0.97, 0.5).setPosition(Math.round(this.lx + sd * 6 * sc), Math.round(this.ly - 66 * sc)).setScale(k * -sd, k).setRotation(sd * (-0.45 - 0.12 * Math.sin(this.clock * 3))).setAlpha(sn); }; pair(this.wingL, -1); pair(this.wingR, 1); } else { this.wingL.setVisible(false); this.wingR.setVisible(false); }
    if (hv && this.tex(this.head, 'head_side', this.cry > 0 || charging ? 2 : this.lunge > 0.2 ? 3 : Math.floor(this.clock * 1.2) & 1)) { const k = (84 * sc * breath * (1 + this.lunge * 0.3)) / this.head.width; this.head.setVisible(true).setOrigin(0.18, 0.6).setPosition(Math.round(this.lx + this.side * (30 + 26 * this.lunge) * sc), Math.round(this.ly - (92 - 6 * Math.sin(this.clock * 2.4)) * sc)).setScale(k * this.side, k).setRotation(this.side * (-0.12 + this.lunge * 0.1)).setAlpha(A * this.wE * 1.15); }
    // south / north: head above (front or back view)
    if (A * this.wS > 0.01 && this.tex(this.head, 'head_front', this.cry > 0 || charging ? 1 : 0)) { const k = (72 * sc * breath) / this.head.width; this.head.setVisible(true).setOrigin(0.5, 0.85).setPosition(Math.round(this.lx), Math.round(this.ly - 88 * sc)).setScale(k).setRotation(0).setAlpha(A * this.wS * 1.15); }
    else if (A * this.wN > 0.01 && this.tex(this.head, 'head_back', Math.floor(this.clock * 3))) { const k = (72 * sc * breath) / this.head.width; this.head.setVisible(true).setOrigin(0.5, 0.85).setPosition(Math.round(this.lx), Math.round(this.ly - 88 * sc)).setScale(k).setRotation(0).setAlpha(A * this.wN * 1.15); }
    else if (!hv) this.head.setVisible(false);
    // ground pressure under the beast
    if (this.amt > 0.05 && this.tex(this.ground, 'ground_ring', 1 + (Math.floor(this.clock * 3) & 1))) this.ground.setVisible(true).setPosition(Math.round(this.lx), Math.round(this.ly + 4)).setScale((170 * sc * (1 + 0.05 * Math.sin(this.clock * 3.4))) / this.ground.width).setAlpha(this.amt * 0.3 * calm); else this.ground.setVisible(false);
    // ---- Skybreaker: wing-shaped light bursts only while flying (never in the plain transformed form)
    for (let i = 0; i < 2; i++) { const im = this.jet[i]; if (flying && this.tex(im, 'flight_wings', Math.floor(this.clock * 12) + i * 2)) { const sd = i ? 1 : -1, k = (96 * sc * (0.94 + 0.06 * Math.sin(this.clock * 15 + i))) / im.width; im.setVisible(true).setOrigin(0.5, 0.1).setPosition(Math.round(h.x + sd * 8 * sc), Math.round(h.y - 10 * sc)).setScale(k * sd * -1, k).setRotation(sd * 0.28 + lean).setAlpha(0.42 * calm); } else im.setVisible(false); }
    if (flying) { this.ringClock -= dt; if (this.ringClock <= 0 && !o.reduced) { this.ringClock = 0.6; this.pop('flight_ring', [1, 2], h.x, h.y + 6, 56, 110, 0.3, { depth: 3.8, a: 0.35, squash: 0.62 }); } }
    // ---- committed fields (read from the sim, so they match the damage geometry exactly)
    const fields = s.hx.sf ?? []; const pr = fields.filter(q => q.k === 'prison'), co = fields.filter(q => q.k === 'collapse'), as = fields.filter(q => q.k === 'astral');
    for (let i = 0; i < 3; i++) {
      const q = pr[i], im = this.prisms[i], gr = this.fgrounds[i];
      if (q) {
        const fm = q.t < SORA_Q.form ? (q.t / SORA_Q.form < 0.5 ? 0 : 1) : q.t > SORA_Q.form + SORA_Q.hold - 0.3 ? 3 : 2, u = q.t < SORA_Q.form ? q.t / SORA_Q.form : 1;
        if (this.tex(im, 'prison_form', fm)) { const k = (q.r * 2.4) / im.width; im.setVisible(true).setOrigin(0.5, 0.62).setPosition(Math.round(q.x), Math.round(q.y + 6)).setScale(k).setAlpha((0.4 + 0.5 * u) * calm * (0.92 + 0.08 * Math.sin(this.clock * 9))); } else im.setVisible(false);
        if (this.tex(gr, 'ground_ring', 1)) gr.setVisible(true).setPosition(Math.round(q.x), Math.round(q.y + 4)).setScale((q.r * 2.3) / gr.width, (q.r * 1.15) / gr.width).setAlpha(0.45 * u); else gr.setVisible(false);
      } else { im.setVisible(false); if (!co[i]) gr.setVisible(false); }
      const c = co[i], vt = this.vortex[i];
      if (c) {
        const u = clamp(c.t / SORA_R.pull, 0, 1), fm = u < 0.3 ? 0 : u < 0.65 ? 1 : u < 0.92 ? 2 : 3;
        if (this.tex(vt, 'collapse_vortex', fm)) { const k = (c.r * 1.45) / vt.width; vt.setVisible(c.t < SORA_R.pull + 0.1).setPosition(Math.round(c.x), Math.round(c.y - 8)).setScale(k).setRotation(this.clock * 3).setAlpha(0.9 * calm); } else vt.setVisible(false);
        if (!pr[i] && this.tex(gr, 'ground_ring', 2)) gr.setVisible(true).setPosition(Math.round(c.x), Math.round(c.y + 4)).setScale((c.r * 2.2) / gr.width, (c.r * 1.1) / gr.width).setAlpha(0.4 * (1 - u * 0.5));
      } else vt.setVisible(false);
      const a2 = as[i], fo = this.flyOrbs[i], ft = this.flyTrails[i];
      if (a2 && a2.d[4] === 0) {
        const ang = Math.atan2(a2.d[1], a2.d[0]);
        if (this.tex(fo, 'astral_orb', a2.tier)) { const k = (84 * sc) / fo.width; fo.setVisible(true).setPosition(Math.round(a2.x), Math.round(a2.y)).setScale(k).setRotation(this.clock * 6).setAlpha(0.98); } else fo.setVisible(false);
        if (this.tex(ft, 'orb_trail', a2.tier)) { const k = (190 * sc) / ft.width; ft.setVisible(true).setOrigin(1, 0.5).setPosition(Math.round(a2.x), Math.round(a2.y)).setScale(k).setRotation(ang).setAlpha(0.7 * calm); } else ft.setVisible(false);
      } else { fo.setVisible(false); ft.setVisible(false); }
    }
    // ---- Astral Blades: the real blade projectiles, drawn as ImageGen blade-feathers
    let bi = 0;
    for (const b of s.hx.bolts) { if (b.kind !== 'blade' || bi >= this.blades.length) continue; const im = this.blades[bi++]; if (!this.tex(im, 'feather_blade', b.id & 3)) continue; const k = ((b.radius < 8 ? 40 : 52) * sc) / im.width; im.setVisible(true).setOrigin(0.7, 0.5).setPosition(Math.round(b.x), Math.round(b.y)).setScale(k).setRotation(Math.atan2(b.vy, b.vx)).setAlpha(0.95); }
    for (; bi < this.blades.length; bi++) this.blades[bi].setVisible(false);
    // ---- the sphere gathered between both hands while charging
    if (charging && act) {
      const tier = clamp(act.tier ?? 0, 0, 3), t = clamp(act.charge / SORA_V.stages[2], 0, 1), hp = hand(s, act.dirX, act.dirY, 22, 'orb'), size = 84 * sc * (0.8 + 0.2 * t) * (tier >= 3 ? 1 + 0.07 * Math.sin(this.clock * 28) : 1);
      if (this.tex(this.orb, 'astral_orb', tier)) this.orb.setVisible(true).setPosition(Math.round(hp.x), Math.round(hp.y)).setScale(size / this.orb.width).setRotation(this.clock * 5).setAlpha(Math.min(1, 0.6 + 0.4 * t));
      if (!o.reduced && tier >= 1 && this.tex(this.ring, 'astral_ring', Math.floor(this.clock * 12))) this.ring.setVisible(true).setPosition(Math.round(hp.x), Math.round(hp.y)).setScale((size * 2) / this.ring.width).setRotation(-this.clock * 6).setAlpha(0.35 + 0.12 * tier); else this.ring.setVisible(false);
    } else { this.orb.setVisible(false); this.ring.setVisible(false); }
    // ---- form presence: restrained ground rings, a dash pulse, body-bound feather wisps at the shoulders
    const dashing = p.dashRemaining > 0; if (dashing && !this.lastDash && !o.reduced) this.pop('ground_ring', [1, 2, 3], h.x, h.y + 6, 80, 200, 0.4, { depth: 3.8, a: 0.4, squash: 0.5 }); this.lastDash = dashing;
    if (sp > 110 && !flying && !o.reduced && !o.crowded) { this.pulseT -= dt; if (this.pulseT <= 0) { this.pulseT = 0.9; this.pop('ground_ring', [0, 1], h.x, h.y + 6, 60, 120, 0.35, { depth: 3.7, a: 0.22, squash: 0.5 }); } }
    const wa = (o.reduced || o.crowded ? 0.12 : 0.28) + (act ? 0.2 : 0) + (od ? 0.1 : 0);
    for (let i = 0; i < 2; i++) { const im = this.wisp[i]; if (!this.tex(im, 'wisps', Math.floor(this.clock * 7) + i * 2) || this.wS > 0.5) { im.setVisible(false); continue; } const sd = i ? 1 : -1; im.setVisible(true).setOrigin(0.5, 1).setPosition(Math.round(h.x + sd * 13 * sc), Math.round(h.y - 58 * sc)).setScale((26 * sc) / im.width * (i ? -1 : 1)).setRotation(sd * 0.18 - lean).setAlpha(wa); }
  }
  private hideLayers() { for (const im of [this.tail, this.body, this.head, this.wingFar, this.wingNear, this.wingL, this.wingR, this.ground, ...this.jet, ...this.wisp, this.orb, this.ring, ...this.blades, ...this.prisms, ...this.vortex, ...this.flyOrbs, ...this.flyTrails, ...this.fgrounds]) im.setVisible(false); }
  destroy() { for (const q of this.pops) q.im.destroy(); this.pops = []; for (const im of [this.tail, this.body, this.head, this.wingFar, this.wingNear, this.wingL, this.wingR, this.ground, ...this.jet, ...this.wisp, this.orb, this.ring, ...this.blades, ...this.prisms, ...this.vortex, ...this.flyOrbs, ...this.flyTrails, ...this.fgrounds]) im.destroy(); }
}

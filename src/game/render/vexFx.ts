/** B28 Vex presentation. (1) The Abyssal Guardian: ONE original spectral armored humanoid in two genuinely different looks (Riftbound: fractured violet armor, jagged shoulders, forward lean; Voidheart Exile: towering graphite and silver guardian with a long mantle and orbiting plates). Head, torso / mantle, plates and arms are separate ImageGen layers that wrap Vex during Primal Overdrive; arms move on real attack events. (2) The ImageGen FX of both forms' Q / E / R / V, flight and landing, read from vex_* events and the committed fields in `hx.vf`; the spectral copies are tinted copies of Vex's own current frame. (3) The Voidheart first-reveal choreography read from the live cinema, and a restrained form presence. Reads sim state only; art is public/art/fx/vex-guardian. */
import Phaser from 'phaser';
import type { AbilityEvent, GameState } from '../../sim/GameState';
import { VEX1_E, VEX1_R, VEX2_E, VEX2_Q, VEX2_R, VEX_FLY, VEX_OD } from '../../content/vexCombat';
import { hand } from '../../sim/HeroSystem';

export const VX_SETS = ['g1_head', 'g2_head', 'g1_front', 'g2_front', 'g1_back', 'g2_back', 'g1_torso', 'g2_torso', 'g1_arm', 'g2_arm', 'g1_plates', 'g2_plates', 'g1_activation', 'g2_activation', 'g1_dissolve', 'g2_dissolve', 'r_slash', 'r_mirror', 'r_echo', 'r_portal', 'r_crack', 'r_seal', 'r_pillar', 'r_fang', 'r_fangcut', 'r_impact', 'v_cut', 'v_clone', 'v_seam', 'v_shard', 'v_ring', 'v_blade', 'v_core', 'v_implode', 'v_erupt', 'v_reveal_crack', 'v_reveal_halo', 'v_reveal_flash', 'v_reveal_hair', 'r_ground', 'v_ground', 'r_wisp', 'v_wisp', 'v_frag', 'r_fly', 'v_fly'] as const;
export const VX_NAMES = VX_SETS.flatMap(s => [0, 1, 2, 3].map(i => `${s}${i}`));
export const vxKey = (n: string) => `vx-${n}`; export const vxUrl = (n: string) => `/art/fx/vex-guardian/${n}.png`;
type VxSet = (typeof VX_SETS)[number];
interface Pop { im: Phaser.GameObjects.Image; t: number; delay: number; dur: number; set: VxSet; frames: number[]; w: number; w1: number; a: number; vx: number; vy: number; spin: number; sx: number; sy: number; byH: boolean }
interface PopOpt { a?: number; rot?: number; depth?: number; ox?: number; oy?: number; vx?: number; vy?: number; spin?: number; flipX?: boolean; squash?: number; delay?: number; byH?: boolean }
export interface VexFxInput { dt: number; state: GameState; hero: Phaser.GameObjects.Sprite; hand: { m: { x: number; y: number } } | null; scale: number; reduced: boolean; running: boolean; dead: boolean; crowded: boolean; facing: string; shake: boolean }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const R_ALL = [0, 1, 2, 3];

export class VexFx {
  private pops: Pop[] = []; private last = 0; private clock = 0; private lx = 0; private ly = 0; private px = 0; private py = 0; private fresh = true; private side = 1;
  private amt = 0; private wasOd = false; private mv = 0; private arm = 0; private armA = 0; private armSet: 1 | 2 = 1; private snap = 0; private cry = 0; private pulseT = 0; private ringClock = 0; private lastDash = false; private wE = 1; private wS = 0; private wN = 0; private lastForm = 0; private shiftT = 0; private stage = 0;
  private readonly torso: Phaser.GameObjects.Image; private readonly head: Phaser.GameObjects.Image; private readonly plates: Phaser.GameObjects.Image[] = []; private readonly armIm: Phaser.GameObjects.Image; private readonly ground: Phaser.GameObjects.Image; private readonly wisp: Phaser.GameObjects.Image[] = []; private readonly frag: Phaser.GameObjects.Image[] = [];
  private readonly jet: Phaser.GameObjects.Image; private readonly held: Phaser.GameObjects.Image; private readonly heldRing: Phaser.GameObjects.Image; private readonly clones: Phaser.GameObjects.Image[] = []; private readonly rings: Phaser.GameObjects.Image[] = []; private readonly orbs: Phaser.GameObjects.Image[] = []; private readonly marks: Phaser.GameObjects.Image[] = [];
  private readonly ghosts: Phaser.GameObjects.Image[] = []; private ghostT: number[] = []; private ghostClock = 0; private ghostNext = 0;
  constructor(private readonly scene: Phaser.Scene) {
    const blank = 'kp-blank'; if (!scene.textures.exists(blank)) scene.textures.createCanvas(blank, 2, 2)!.refresh();
    const mk = (depth: number, add = true) => { const im = scene.add.image(0, 0, blank).setDepth(depth).setVisible(false); if (add) im.setBlendMode(Phaser.BlendModes.ADD); return im; };
    this.torso = mk(8.96); this.head = mk(9.06); this.plates = [mk(8.9), mk(9.02)]; this.armIm = mk(10.4); this.ground = mk(3.7); this.wisp = [mk(9.6), mk(9.6)]; this.frag = [mk(9.7), mk(9.7), mk(9.7)];
    this.jet = mk(8.8); this.held = mk(10.6); this.heldRing = mk(10.55);
    for (let i = 0; i < 3; i++) { const c = mk(9.1, false); c.setTint(0xb8bed8); this.clones.push(c); this.rings.push(mk(3.65)); this.orbs.push(mk(10.6)); }
    for (let i = 0; i < 6; i++) this.marks.push(mk(3.9));
    for (let i = 0; i < 6; i++) { this.ghosts.push(mk(8.7, false)); this.ghostT.push(0); }
  }
  private has(n: string) { return this.scene.textures.exists(vxKey(n)); }
  private tex(im: Phaser.GameObjects.Image, set: VxSet, i: number) { const k = vxKey(`${set}${i & 3}`); if (!this.scene.textures.exists(k)) { im.setVisible(false); return false; } if (im.texture.key !== k) im.setTexture(k); return true; }
  private pop(set: VxSet, frames: number[], x: number, y: number, w: number, w1: number, dur: number, o: PopOpt = {}) {
    if (this.pops.length >= 56 || !this.has(`${set}${frames[0]}`)) return;
    const im = this.scene.add.image(x, y, vxKey(`${set}${frames[0]}`)).setBlendMode(Phaser.BlendModes.ADD).setDepth(o.depth ?? 11.2).setRotation(o.rot ?? 0).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5).setAlpha(0);
    this.pops.push({ im, t: 0, delay: o.delay ?? 0, dur, set, frames, w, w1, a: o.a ?? 1, vx: o.vx ?? 0, vy: o.vy ?? 0, spin: o.spin ?? 0, sx: o.flipX ? -1 : 1, sy: o.squash ?? 1, byH: !!o.byH });
  }
  private shake(o: VexFxInput, ms: number, k: number) { if (o.shake && !o.reduced) this.scene.cameras.main.shake(ms, k); }
  private strikeArm(set: 1 | 2, a: number, p = 1) { this.arm = 0.28 * p; this.armA = a; this.armSet = set; }

  private onEvent(e: AbilityEvent, o: VexFxInput) {
    const sc = o.scale / 0.5, red = o.reduced, n = e.n ?? 0, tx = e.tx ?? e.x, ty = e.ty ?? e.y, s = o.state, p = s.player, f = p.form === 2 ? 2 : 1, ang = Math.atan2(ty - e.y, tx - e.x);
    switch (e.kind) {
      case 'vex_auto': {
        const step = n & 3, fin = (n & 32) !== 0; this.snap = 0.2; this.strikeArm(f, ang, fin ? 1.3 : 1);
        if (((n >> 2) & 3) === 1) this.pop('r_slash', [step], e.x, e.y - 24 * sc, 150 * sc, 175 * sc, fin ? 0.3 : 0.2, { rot: ang, a: 0.95, depth: 10.8, flipX: Math.cos(ang) < 0 && false });
        if (fin && !red) this.shake(o, 60, 0.0012); break;
      }
      case 'vex_judg_cut': { if ((n & 1) === 0) break; const t = (n >> 1) & 3; this.pop('v_cut', [t], e.x, e.y - 14, 105, 125, 0.28, { a: 0.95, depth: 10.8, rot: (e.id % 7) * 0.45 }); break; }
      case 'vex_q_guard': {
        const k = n & 3, v = s.b22.vex.guardDir, a = Math.atan2(v.y, v.x);
        if (k === 0) { this.pop('r_mirror', [0, 1], p.x + v.x * 34, p.y - 26 * sc + v.y * 20, 120 * sc, 135 * sc, 0.4, { rot: a, a: 0.85, depth: 10.4 }); this.strikeArm(1, a, 0.8); }
        else if (k === 1) { this.pop('r_mirror', [2, 3], e.x, e.y - 20, 150 * sc, 190 * sc, 0.45, { rot: a, a: 1, depth: 10.8 }); this.pop('r_impact', R_ALL, e.x, e.y - 20, 90, 170, 0.4, { a: 0.8, depth: 10.9 }); this.shake(o, 80, 0.002); }
        else this.pop('r_mirror', [2], e.x, e.y - 20, 100 * sc, 120 * sc, 0.2, { rot: a, a: 0.6, depth: 10.6 }); break;
      }
      case 'vex_q_echo': { const k = n & 7; this.pop('r_echo', [k % 4], e.x, e.y - 10, 125, 150, 0.32, { a: 0.9, depth: 10.8 }); this.pop('r_slash', [1 + (k & 1)], e.x, e.y - 14, 110, 140, 0.22, { a: 0.9, depth: 10.9, rot: k * 0.9 }); break; }
      case 'vex_q_legion': { if ((n & 1023) > 0) { this.pop('v_ground', R_ALL, e.x, e.y + 4, 120, 340, 0.6, { depth: 3.8, a: 0.7, squash: 0.5 }); this.pop('v_clone', [0, 1], e.x, e.y - 40 * sc, 110 * sc, 150 * sc, 0.5, { a: 0.6, depth: 9.0 }); this.snap = 0.3; } else this.pop('v_clone', [3], e.x, e.y - 30 * sc, 90 * sc, 70 * sc, 0.35, { a: 0.5, depth: 9.0 }); break; }
      case 'vex_q_clone_cut': this.pop('v_cut', [n & 3], e.x, e.y - 12, 80, 100, 0.2, { a: 0.7, depth: 10.6, rot: (n & 3) * 0.7 }); break;
      case 'vex_e_open': this.pop('r_portal', [0, 1], e.x, e.y - 30 * sc, 90 * sc, 120 * sc, 0.22, { a: 0.9, depth: 10.4 }); this.strikeArm(1, ang, 0.8); break;
      case 'vex_e_arrive': this.pop('r_portal', [1, 2, 3], e.x, e.y - 30 * sc, 100 * sc, 130 * sc, 0.3, { a: 0.9, depth: 10.4 }); this.pop('r_portal', [2, 3], tx, ty - 30 * sc, 90 * sc, 60 * sc, 0.25, { a: 0.7, depth: 10.4 }); this.pop('r_crack', [0, 1], tx, ty - 24 * sc, 100, 120, 0.25, { a: 0.7, depth: 10.3 }); break;
      case 'vex_e_cut': {
        if (n & 4) { const L = Math.hypot(tx - e.x, ty - e.y); this.pop('v_seam', [2], e.x, e.y - 12, L * 1.02, L * 1.02, 0.4, { ox: 0, rot: ang, a: 0.95, depth: 10.3 }); this.snap = 0.3; this.strikeArm(2, ang, 1.3); this.shake(o, 90, 0.002); }
        else { this.pop('r_slash', [3], e.x, e.y - 20, 170, 200, 0.28, { rot: Math.atan2(e.y - p.y, e.x - p.x), a: 1, depth: 10.9 }); this.pop('r_impact', R_ALL, e.x, e.y - 14, VEX1_E.cutR * 1.2, VEX1_E.cutR * 2.2, 0.4, { a: 0.9, depth: 10.8 }); this.strikeArm(1, ang, 1.3); this.shake(o, 90, 0.0024); }
        break;
      }
      case 'vex_e_warn': { const L = Math.hypot(tx - e.x, ty - e.y), w = (n & 1023) || VEX2_E.width; this.pop('v_seam', [0, 1], e.x, e.y - 12, L * 1.02, L * 1.02, VEX2_E.warn, { ox: 0, rot: ang, a: 0.7, depth: 10.2 }); this.snap = 0.45; this.cry = 0.3; void w; break; }
      case 'vex_e_shock': { const L = Math.hypot(tx - e.x, ty - e.y); for (let i = 0; i < 3; i++) { const u = (i + 0.5) / 3; this.pop('v_shard', R_ALL, e.x + (tx - e.x) * u, e.y + (ty - e.y) * u - 12, L * 0.34, L * 0.34, 0.45, { a: 0.9, depth: 10.8, rot: ang }); } this.shake(o, 120, 0.0028); break; }
      case 'vex_r_cast': { if (f === 2) { this.pop('v_ground', R_ALL, e.x, e.y + 4, 140, 360, 0.7, { depth: 3.8, a: 0.8, squash: 0.5 }); this.snap = 0.4; this.cry = 0.4; } else { this.snap = 0.4; this.strikeArm(1, Math.PI / 2, 1.1); } break; }
      case 'vex_r_mark': { const i = n & 15, tot = (n >> 4) & 15, last = i === tot - 1, r = (last ? VEX1_R.finalR : VEX1_R.r) * 2.2, at = VEX1_R.windup + VEX1_R.warn + i * VEX1_R.gap; this.pop('r_seal', [0, 1], e.x, e.y + 4, r, r * 1.05, at + 0.05, { depth: 3.85, a: 0.75, squash: 0.5 }); break; }
      case 'vex_r_erupt': { const last = (n & 32) !== 0, r = (last ? VEX1_R.finalR : VEX1_R.r) * 2.2; this.pop('r_seal', [2, 3], e.x, e.y + 4, r, r * 1.1, 0.4, { depth: 3.85, a: 0.9, squash: 0.5 }); this.pop('r_pillar', R_ALL, e.x, e.y + 8, r * (last ? 0.7 : 0.55), r * (last ? 0.9 : 0.7), 0.5, { oy: 0.95, a: 0.95, depth: 11.2 }); this.strikeArm(1, Math.atan2(e.y - p.y, e.x - p.x), 1); this.shake(o, last ? 180 : 70, last ? 0.0042 : 0.0014); break; }
      case 'vex_r_tick': this.pop('v_blade', R_ALL, e.x, e.y + 6, 300, 300, 0.4, { oy: 0.96, a: 0.9, depth: 11.3, byH: true }); this.pop('v_cut', [n & 3], e.x, e.y - 8, 80, 95, 0.2, { a: 0.8, depth: 10.8 }); break;
      case 'vex_r_end': this.pop('v_ring', [3], p.x, p.y + 4, VEX2_R.radius * 2.2, VEX2_R.radius * 2.6, 0.5, { depth: 3.7, a: 0.7, squash: 0.5 }); break;
      case 'vex_v_tier': this.pop(f === 1 ? 'r_impact' : 'v_reveal_flash', f === 1 ? [0] : [0, 1], e.x, e.y - 44 * sc, 40 * sc, (70 + 22 * (n & 3)) * sc, 0.26, { a: 0.7, depth: 10.7 }); this.shake(o, 50, 0.0008 * (n & 3)); break;
      case 'vex_v_release': { this.snap = 0.3; this.cry = 0.3; if (((n >> 3) & 3) === 1) { this.pop('r_fangcut', [0, 1], e.x, e.y - 30 * sc, 150, 230, 0.3, { ox: 0.1, rot: ang, a: 0.9, depth: 10.8 }); this.strikeArm(1, ang, 1.5); } else this.strikeArm(2, ang, 1.2); break; }
      case 'vex_v_hit': { const tier = n & 3; if (((n >> 3) & 3) === 2) { const R = 150 + 25 * tier; this.pop('v_implode', R_ALL, e.x, e.y - 6, R * 0.8, R * 1.3, 0.5, { a: 1, depth: 10.8 }); } else { this.pop('r_impact', R_ALL, e.x, e.y - 12, 110, 220 + 30 * tier, 0.5, { a: 1, depth: 10.9 }); this.pop('r_fangcut', [2, 3], (e.tx ?? e.x + e.x) / 2, e.y, 160, 200, 0.35, { a: 0.8, depth: 10.7, rot: Math.atan2(e.y - (e.ty ?? e.y), e.x - (e.tx ?? e.x)) }); } this.shake(o, 150 + 30 * tier, 0.003 + 0.001 * tier); break; }
      case 'vex_v_pulse': { const k = n & 31, tier = (n >> 5) & 7; if (((n >> 20) & 3) === 2) { const R = k === 1 ? 210 : 150 + 25 * tier; this.pop('v_erupt', R_ALL, e.x, e.y - 4, R * 0.9, R * 2.2, 0.55, { a: 1, depth: 10.9 }); this.pop('v_ground', [1, 2, 3], e.x, e.y + 4, R, R * 2.4, 0.5, { depth: 3.7, a: 0.8, squash: 0.5 }); this.shake(o, k ? 140 : 190, 0.0036); } else this.pop('r_fangcut', [2, 3], e.x, e.y, 170, 210, 0.3, { a: 0.8, depth: 10.7, rot: ang }); break; }
      case 'vex_v_block': this.pop(f === 1 ? 'r_impact' : 'v_reveal_flash', [0], e.x, e.y, 46, 96, 0.25, { a: 0.4, depth: 10.7 }); break;
      case 'vex_v_fizzle': case 'vex_v_miss': if (!red) this.pop(f === 1 ? 'r_fangcut' : 'v_reveal_flash', f === 1 ? [3] : [0], e.x, e.y, 60, 110, 0.28, { a: 0.35, depth: 10.7, rot: ang }); break;
      case 'vex_fly_start': this.pop(f === 1 ? 'r_ground' : 'v_ground', R_ALL, e.x, e.y + 6, 80, f === 1 ? 240 : 200, 0.5, { depth: 3.8, a: 0.8, squash: 0.62 }); this.snap = 0.4; this.shake(o, f === 1 ? 80 : 40, 0.0013); break;
      case 'vex_fly_land': { const dive = (n & 1) !== 0, ff = ((n >> 1) & 3) === 2 ? 2 : 1, R = VEX_FLY.form[ff].slamR; if (dive) { this.pop(ff === 1 ? 'r_crack' : 'v_ground', R_ALL, e.x, e.y + 6, R * 1.0, R * 2.4, 0.55, { depth: 3.8, a: 0.9, squash: 0.55 }); if (ff === 1) this.pop('r_impact', R_ALL, e.x, e.y - 6, R * 1.0, R * 2, 0.4, { a: 0.8, depth: 10.8 }); this.shake(o, ff === 1 ? 190 : 110, ff === 1 ? 0.004 : 0.0022); } else this.pop(ff === 1 ? 'r_ground' : 'v_ground', [2, 3], e.x, e.y + 6, 70, 140, 0.3, { depth: 3.8, a: 0.5, squash: 0.62 }); break; }
      case 'vex_od_start': { const ff = n === 2 ? 2 : 1; this.pop(ff === 1 ? 'g1_activation' : 'g2_activation', R_ALL, e.x, e.y - 55 * sc, 250 * sc, 470 * sc, ff === 1 ? 0.85 : 1.1, { a: 0.9, depth: 9.05 }); this.pop(ff === 1 ? 'r_ground' : 'v_ground', R_ALL, e.x, e.y + 6, 120, 540, 0.8, { depth: 3.8, a: 0.9, squash: 0.45 }); this.snap = 0.6; this.shake(o, ff === 1 ? 280 : 160, ff === 1 ? 0.005 : 0.003); break; }
      case 'vex_shift': { this.shiftT = 0.4; this.pop('v_reveal_flash', R_ALL, e.x, e.y - 50 * sc, 90 * sc, 260 * sc, 0.4, { a: 0.8, depth: 10.9 }); break; }
      default: break;
    }
    void VEX2_Q; void VEX_OD;
  }

  update(o: VexFxInput) {
    const dt = o.running ? o.dt : 0, s = o.state, p = s.player, h = o.hero, sc = o.scale / 0.5, vex = s.hero === 'vex' && p.form >= 1; this.clock += dt;
    for (const e of s.abilityEvents) if (e.id > this.last) { this.last = e.id; if (!o.dead && e.kind.startsWith('vex_')) this.onEvent(e, o); }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const q = this.pops[i]; if (q.delay > 0) { q.delay -= dt; q.im.setAlpha(0); continue; }
      q.t += dt; const u = q.t / q.dur; if (u >= 1) { q.im.destroy(); this.pops.splice(i, 1); continue; }
      const key = vxKey(`${q.set}${q.frames[Math.min(q.frames.length - 1, Math.floor(u * q.frames.length))]}`); if (q.im.texture.key !== key && this.scene.textures.exists(key)) q.im.setTexture(key);
      const w = q.w + (q.w1 - q.w) * (1 - (1 - u) ** 2), k = w / (q.byH ? q.im.height : q.im.width);
      q.im.setScale(k * q.sx, k * (q.sy > 0 && q.sy < 1 ? q.sy : 1)).setAlpha(q.a * (u < 0.12 ? u / 0.12 : 1 - ((u - 0.12) / 0.88) ** 1.5)); q.im.rotation += q.spin * dt; q.im.x += q.vx * dt; q.im.y += q.vy * dt;
    }
    // the Voidheart first reveal: choreographed from the live cinema (the sim owns the timing)
    const cin = s.cinema; if (s.hero === 'vex' && cin && cin.to === 2 && cin.first && !o.dead) {
      const t = cin.t; if (this.stage < 1 && t >= 0.15) { this.stage = 1; for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6; this.pop('v_reveal_crack', [0, 1, 2], p.x + Math.sin(a) * 70, p.y - 50 * sc - Math.abs(i - 1) * 8, 120 * sc, 190 * sc, 1.6, { a: 0.7, depth: 9.2, rot: a * 0.3 }); } this.pop('v_frag', R_ALL, p.x, p.y - 60 * sc, 200 * sc, 240 * sc, 2.4, { a: 0.7, depth: 9.5 }); }
      if (this.stage < 2 && t >= 0.9) { this.stage = 2; this.pop('v_reveal_halo', [0, 1, 2], p.x, p.y + 4, 220, 360, 1.1, { a: 0.8, depth: 3.9, squash: 0.45 }); }
      if (this.stage < 3 && t >= cin.commitAt - 0.1) { this.stage = 3; this.pop('v_reveal_hair', R_ALL, p.x, p.y - 80 * sc, 120 * sc, 150 * sc, 1.4, { a: 0.8, depth: 9.0, oy: 0.9 }); this.pop('v_reveal_halo', [3], p.x, p.y + 4, 360, 260, 0.7, { a: 0.9, depth: 3.9, squash: 0.45 }); }
      if (this.stage < 4 && t >= cin.commitAt) { this.stage = 4; this.pop('v_reveal_flash', R_ALL, p.x, p.y - 50 * sc, 120 * sc, 640 * sc, 0.9, { a: 0.9, depth: 10.9 }); this.shake(o, 220, 0.0032); }
    } else if (!cin) this.stage = 0;
    if (!vex || o.dead) { this.hideLayers(); this.wasOd = false; this.amt = 0; this.fresh = true; return; }
    if (this.fresh) { this.lx = h.x; this.ly = h.y; this.px = h.x; this.py = h.y; this.fresh = false; this.lastForm = p.form; }
    const vx = dt > 0 ? (h.x - this.px) / dt : 0, vy = dt > 0 ? (h.y - this.py) / dt : 0, sp = Math.hypot(vx, vy); this.px = h.x; this.py = h.y;
    const lag = p.form === 2 ? 5 : 9; this.lx += (h.x - this.lx) * Math.min(1, dt * lag); this.ly += (h.y - this.ly) * Math.min(1, dt * lag);
    const f = o.facing; if (f === 'east') this.side = 1; else if (f === 'west') this.side = -1;
    const form = p.form === 2 ? 2 : 1, flying = p.flyT > 0, od = p.odT > 0, act = s.hx.act, charging = !!act && (act.act === 'abyssal_fang' || act.act === 'event_horizon') && !act.released;
    if (this.lastForm !== p.form) { this.lastForm = p.form; this.shiftT = 0.4; }
    this.shiftT = Math.max(0, this.shiftT - dt); this.snap = Math.max(0, this.snap - dt); this.cry = Math.max(0, this.cry - dt); this.arm = Math.max(0, this.arm - dt);
    if (this.wasOd && !od && this.amt > 0.2) this.pop(form === 1 ? 'g1_dissolve' : 'g2_dissolve', R_ALL, this.lx, this.ly - 70 * sc, 250 * sc, 220 * sc, 0.7, { a: 0.8, depth: 9.0 });
    this.wasOd = od;
    const want = od ? (p.odT < 1.0 ? clamp(p.odT / 1.0, 0, 1) : 1) * (this.shiftT > 0 ? 0.35 : 1) : 0; this.amt += (want - this.amt) * Math.min(1, dt * (od ? 3.2 : 9));
    const tE = f === 'east' || f === 'west' ? 1 : 0, tS = f === 'south' ? 1 : 0, tN = f === 'north' ? 1 : 0, ease = Math.min(1, dt * 9); this.wE += (tE - this.wE) * ease; this.wS += (tS - this.wS) * ease; this.wN += (tN - this.wN) * ease;
    this.mv += ((flying || sp > 60 ? 1 : 0) - this.mv) * Math.min(1, dt * 7);
    const calm = o.reduced ? 0.7 : 1, A = this.amt * (o.reduced ? 0.45 : 0.62) * (0.94 + 0.06 * Math.sin(this.clock * 4.6)), g = form === 1 ? 'g1' : 'g2', breath = 1 + 0.02 * Math.sin(this.clock * 2.2) + this.arm * 0.12, bob = form === 2 ? Math.sin(this.clock * 1.7) * 3 * sc : 0;
    const set = (n: string) => `${g}_${n}` as VxSet, lean = clamp(vx / 1100, -0.14, 0.14), bx = this.lx - this.side * 8 * sc, by = this.ly + 4 * sc, fr = Math.floor(this.clock * (form === 2 ? 2.2 : 3.2)) & 3;
    // side guardian: torso / mantle behind, head above and ahead of the shoulders, plates drifting or orbiting
    const hv = A * this.wE > 0.01;
    if (hv && this.tex(this.torso, set('torso'), fr)) { const k = ((form === 2 ? 200 : 165) * sc * breath) / this.torso.width; this.torso.setVisible(true).setOrigin(0.55, 0.92).setPosition(Math.round(bx), Math.round(by + bob)).setScale(k * this.side, k).setRotation(lean * 0.6 + (form === 1 ? 0.06 * this.side : 0)).setAlpha(A * this.wE * 0.8); } else this.torso.setVisible(false);
    if (hv && this.tex(this.head, set('head'), this.cry > 0 || charging ? 2 : this.snap > 0 ? 1 : fr & 1)) { const k = ((form === 2 ? 74 : 82) * sc * breath) / this.head.width; this.head.setVisible(true).setOrigin(0.3, 0.7).setPosition(Math.round(this.lx + this.side * (22 + (form === 1 ? 6 : 0)) * sc), Math.round(this.ly - (96 - (form === 1 ? 6 : 0)) * sc + bob)).setScale(k * this.side, k).setRotation(this.side * (form === 1 ? 0.12 : -0.04)).setAlpha(A * this.wE * 1.1); }
    // south / north: front or back head and shoulders behind Vex
    const fb = A * (this.wS + this.wN) > 0.01;
    if (fb && this.tex(this.head, this.wS >= this.wN ? set('front') : set('back'), fr)) { const k = ((form === 2 ? 170 : 150) * sc * breath) / this.head.width; this.head.setVisible(true).setOrigin(0.5, 0.82).setPosition(Math.round(this.lx), Math.round(this.ly - 54 * sc + bob)).setScale(k).setRotation(0).setAlpha(A * (this.wS + this.wN) * 0.9); this.torso.setVisible(false); }
    else if (!hv) this.head.setVisible(false);
    for (let i = 0; i < 2; i++) { const im = this.plates[i]; if (A < 0.01 || !this.tex(im, set('plates'), fr + i * 2)) { im.setVisible(false); continue; } if (form === 2) { const a = this.clock * 0.7 + i * Math.PI; im.setVisible(true).setOrigin(0.5, 0.5).setPosition(Math.round(this.lx + Math.cos(a) * 70 * sc), Math.round(this.ly - 66 * sc + Math.sin(a) * 18 * sc)).setScale((110 * sc) / im.width * (i ? -1 : 1)).setRotation(Math.sin(a) * 0.2).setAlpha(A * 0.55); } else im.setVisible(true).setOrigin(0.5, 0.5).setPosition(Math.round(bx - this.side * (30 + 14 * i) * sc), Math.round(this.ly - (60 + 20 * i) * sc)).setScale((150 * sc) / im.width * this.side).setRotation(lean + 0.1 * i).setAlpha(A * 0.5); }
    // arms: strike on real attack events
    if (this.arm > 0 && A > 0.02 && this.tex(this.armIm, this.armSet === 1 ? 'g1_arm' : 'g2_arm', Math.floor((1 - this.arm / 0.28) * 4))) { const a = this.armA, left = Math.cos(a) < 0, k = (130 * sc) / this.armIm.width; this.armIm.setVisible(true).setOrigin(0.1, 0.5).setPosition(Math.round(h.x), Math.round(h.y - 54 * sc)).setScale(k * (left ? -1 : 1), k).setRotation(left ? a - Math.PI : a).setAlpha(Math.min(1, A * 1.4)); } else this.armIm.setVisible(false);
    // ground presence (always while transformed, calmer than the Guardian)
    const gset: VxSet = form === 1 ? 'r_ground' : 'v_ground'; if (this.tex(this.ground, gset, 1 + (Math.floor(this.clock * 3) & 1))) this.ground.setVisible(true).setPosition(Math.round(this.lx), Math.round(this.ly + 4)).setScale((150 * sc * (1 + 0.05 * Math.sin(this.clock * 3.2))) / this.ground.width).setAlpha((0.14 + this.amt * 0.25) * calm); else this.ground.setVisible(false);
    // Skybreaker: forceful violet plume (Riftbound) or a restrained silver trail (Voidheart); never shown on the ground
    if (flying && this.tex(this.jet, form === 1 ? 'r_fly' : 'v_fly', Math.floor(this.clock * 12))) { const mvx = sp > 40 ? vx : 40, mvy = sp > 40 ? vy : 0, a = Math.atan2(mvy, mvx); this.jet.setVisible(true).setOrigin(1, 0.5).setPosition(Math.round(h.x), Math.round(h.y - 36 * sc)).setScale((form === 1 ? 150 : 170) * sc / this.jet.width).setRotation(a).setAlpha((form === 1 ? 0.5 : 0.38) * calm); this.ringClock -= dt; if (this.ringClock <= 0 && !o.reduced) { this.ringClock = form === 1 ? 0.5 : 0.8; this.pop(form === 1 ? 'r_ground' : 'v_ground', [1, 2], h.x, h.y + 6, 56, 110, 0.3, { depth: 3.8, a: 0.35, squash: 0.62 }); } } else this.jet.setVisible(false);
    // committed fields: copies, domain ring, seal warnings follow the sim geometry
    const fl = s.hx.vf ?? [], cl = fl.filter(q => q.k === 'clone'), dm = fl.filter(q => q.k === 'domain'), hz = fl.filter(q => q.k === 'horizon');
    for (let i = 0; i < 3; i++) {
      const q = cl[i], im = this.clones[i];
      if (q && h.texture) { const t = q.d[0] ? s.enemies.find(e => e.id === q.d[0]) : undefined, fade = clamp(Math.min(q.t / 0.25, (VEX2_Q.life - q.t) / 0.4), 0, 1), left = t ? t.x < q.x : this.side < 0; im.setTexture(h.texture.key, h.frame.name).setVisible(true).setOrigin(h.originX, h.originY).setScale(h.scaleX, h.scaleY).setFlipX(left).setPosition(Math.round(q.x), Math.round(q.y + (h.y - p.y))).setAlpha(0.5 * fade * calm).setDepth(9.1); } else im.setVisible(false);
      const d = dm[i], rg = this.rings[i];
      if (d && this.tex(rg, 'v_ring', d.t < 0.5 ? 0 : d.t > VEX2_R.dur - 0.5 ? 3 : 1 + (Math.floor(this.clock * 2) & 1))) rg.setVisible(true).setPosition(Math.round(d.x), Math.round(d.y + 4)).setScale((d.r * 2.2) / rg.width, (d.r * 1.1) / rg.width).setRotation(0).setAlpha(0.6 * calm * (d.t < 0.5 ? d.t / 0.5 : 1)); else rg.setVisible(false);
      const z = hz[i], ob = this.orbs[i];
      if (z && z.d[4] === 0 && this.tex(ob, 'v_core', z.tier)) ob.setVisible(true).setPosition(Math.round(z.x), Math.round(z.y)).setScale((76 * sc) / ob.width).setRotation(this.clock * 6).setAlpha(0.98); else if (z && z.d[4] === 1 && this.tex(ob, 'v_implode', Math.floor(z.d[5] * 8))) ob.setVisible(true).setPosition(Math.round(z.x), Math.round(z.y)).setScale((z.r + 150 + 20 * z.tier) * 1.4 / ob.width).setRotation(0).setAlpha(0.9); else ob.setVisible(false);
    }
    // the charge: a violet blade forged along the forearm (Riftbound) or a dark core between both hands (Voidheart)
    if (charging && act) {
      const tier = clamp(act.tier ?? 0, 0, 3), t = clamp(act.charge / 1.6, 0, 1);
      if (act.act === 'abyssal_fang' && this.tex(this.held, 'r_fang', tier)) { const hp = o.hand?.m ?? { x: h.x + act.dirX * 16 * sc, y: h.y - 40 * sc }, a = Math.atan2(act.dirY, act.dirX); this.held.setVisible(true).setOrigin(0.05, 0.5).setPosition(Math.round(hp.x), Math.round(hp.y)).setScale((110 + 70 * t) * sc / this.held.width).setRotation(a).setAlpha(Math.min(1, 0.6 + 0.4 * t)); this.heldRing.setVisible(false); }
      else if (act.act === 'event_horizon') { const hp = hand(s, act.dirX, act.dirY, 22, 'orb'); if (this.tex(this.held, 'v_core', tier)) this.held.setVisible(true).setOrigin(0.5, 0.5).setPosition(Math.round(hp.x), Math.round(hp.y)).setScale((84 * sc * (0.8 + 0.2 * t)) / this.held.width).setRotation(this.clock * 5).setAlpha(0.95); this.heldRing.setVisible(false); }
    } else { this.held.setVisible(false); this.heldRing.setVisible(false); }
    // seal warnings: drawn from the committed seal field so they stay at the saved ground points
    const sl = fl.filter(q => q.k === 'seal'); let mi = 0;
    for (const q of sl) for (let k = q.d[0]; k < q.tier && mi < this.marks.length; k++) { const im = this.marks[mi++]; if (this.tex(im, 'r_seal', 0)) im.setVisible(true).setPosition(Math.round(q.d[1 + k * 2]), Math.round(q.d[2 + k * 2] + 4)).setScale(((k === q.tier - 1 ? VEX1_R.finalR : VEX1_R.r) * 2.1) / im.width, ((k === q.tier - 1 ? VEX1_R.finalR : VEX1_R.r) * 1.05) / im.width).setAlpha(0.45 * (0.6 + 0.4 * Math.sin(this.clock * 12))); }
    for (; mi < this.marks.length; mi++) this.marks[mi].setVisible(false);
    // body-bound presence: shard wisps (Riftbound) / drifting fragments (Voidheart), restrained, never on the south belly
    const wa = (o.reduced || o.crowded ? 0.12 : 0.26) + (act ? 0.18 : 0) + (od ? 0.1 : 0);
    for (let i = 0; i < 2; i++) { const im = this.wisp[i]; if (!this.tex(im, form === 1 ? 'r_wisp' : 'v_wisp', Math.floor(this.clock * 7) + i * 2) || this.wS > 0.5) { im.setVisible(false); continue; } const sd = i ? 1 : -1; im.setVisible(true).setOrigin(0.5, 1).setPosition(Math.round(h.x + sd * 13 * sc), Math.round(h.y - 58 * sc)).setScale((26 * sc) / im.width * (i ? -1 : 1)).setRotation(sd * 0.18 - lean).setAlpha(wa); }
    for (let i = 0; i < 3; i++) { const im = this.frag[i]; if (form !== 2 || o.reduced || !this.tex(im, 'v_frag', i + Math.floor(this.clock * 0.6))) { im.setVisible(false); continue; } const a = this.clock * 0.5 + i * 2.1; im.setVisible(true).setPosition(Math.round(h.x + Math.cos(a) * (30 + 8 * i) * sc), Math.round(h.y - (50 + 14 * Math.sin(a * 1.3 + i)) * sc)).setScale((46 * sc) / im.width).setAlpha(0.45 * calm); }
    this.ghostClock += dt; const gd = p.dashRemaining > 0 && !o.reduced;
    if (gd && h.texture && this.ghostClock >= this.ghostNext) { this.ghostNext = this.ghostClock + (form === 2 ? 0.028 : 0.04); const gi = this.ghostT.indexOf(Math.min(...this.ghostT)); this.ghostT[gi] = form === 2 ? 0.32 : 0.26; this.ghosts[gi].setTexture(h.texture.key, h.frame.name).setOrigin(h.originX, h.originY).setScale(h.scaleX, h.scaleY).setFlipX(h.flipX).setPosition(h.x, h.y).setTint(form === 2 ? 0xc9d2ee : 0x9a63ff).setVisible(true); }
    for (let i = 0; i < this.ghosts.length; i++) { const g = this.ghosts[i]; if (this.ghostT[i] > 0) { this.ghostT[i] = Math.max(0, this.ghostT[i] - dt); g.setAlpha(Math.min(0.5, this.ghostT[i] * 1.6) * calm).setVisible(this.ghostT[i] > 0); } else g.setVisible(false); }
    const dashing = p.dashRemaining > 0; if (dashing && !this.lastDash && !o.reduced) this.pop(form === 1 ? 'r_ground' : 'v_ground', [1, 2, 3], h.x, h.y + 6, 80, 200, 0.4, { depth: 3.8, a: 0.4, squash: 0.5 }); this.lastDash = dashing;
    if (sp > 110 && !flying && !o.reduced && !o.crowded) { this.pulseT -= dt; if (this.pulseT <= 0) { this.pulseT = 0.9; this.pop(form === 1 ? 'r_ground' : 'v_ground', [0, 1], h.x, h.y + 6, 60, 120, 0.35, { depth: 3.7, a: 0.2, squash: 0.5 }); } }
  }
  private hideLayers() { for (const im of [this.torso, this.head, ...this.plates, this.armIm, this.ground, ...this.wisp, ...this.frag, this.jet, this.held, this.heldRing, ...this.clones, ...this.rings, ...this.orbs, ...this.marks, ...this.ghosts]) im.setVisible(false); }
  destroy() { for (const q of this.pops) q.im.destroy(); this.pops = []; for (const im of [this.torso, this.head, ...this.plates, this.armIm, this.ground, ...this.wisp, ...this.frag, this.jet, this.held, this.heldRing, ...this.clones, ...this.rings, ...this.orbs, ...this.marks, ...this.ghosts]) im.destroy(); }
}

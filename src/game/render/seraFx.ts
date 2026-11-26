/** B34 Sora, Eventide Seraph presentation. Pure projection of sim state (sera_* events, the cast, hx.traces, hx.bolts, the committed fields, the cinema); it never decides anything. Art: ImageGen sheets cut by art/b34/process.py (ph_* = the Eventide Phoenix family, sf_* = celestial effect sprites, sm_* = mantle pieces).
 *  Every effect is gated on what the simulation reports (hits, miss, block), so a miss never plays an impact. Reduced Effects drops shake, hit-stop, drifting feathers and the phoenix's secondary layers; gameplay geometry (telegraphs, node rings, lanes) stays. */
import Phaser from 'phaser';
import type { AbilityEvent, GameState } from '../../sim/GameState';
import { SERA_E, SERA_R, SERA_V } from '../../content/soraSeraph';
import { KAI_GROUND_DY } from '../../assets/kaiAnimation';
import { hand } from '../../sim/HeroSystem';
import { ImpactDirector } from './impactDirector';

export const MANTLE_FEATHERS = ['mf_1', 'mf_2', 'mf_3', 'mf_4', 'mf_5', 'mf_6'] as const;
export const SERA_FX = ['ph_head', 'ph_chest', 'ph_wingup', 'ph_wingback', 'ph_tail', 'ph_front', 'sf_feather', 'sf_lance', 'sf_node', 'sf_spear', 'sf_diagram', 'sf_trace', 'sf_burst', 'sf_star', 'sf_nova', 'sm_halo', 'sm_feather', ...MANTLE_FEATHERS] as const;
export const seraKey = (n: string) => `b34-${n}`;
export const seraUrl = (n: string) => (n.startsWith('mf_') ? `/art/b35/${n}.webp` : `/art/b34/${n}.webp`);
const GY = KAI_GROUND_DY, MID = GY - 34, ADD = Phaser.BlendModes.ADD, NORMAL = Phaser.BlendModes.NORMAL;
const ang = (dx: number, dy: number) => Math.atan2(dy, dx);
const PEARL = 0xfff1e0, ROSE = 0xf4b6d4, VIOLET = 0x8a5cc0;
interface Pop { im: Phaser.GameObjects.Image; t: number; delay: number; dur: number; w: number; grow: number; vx: number; vy: number; spin: number; fade: 'out' | 'inout' | 'snap'; a: number; sy: number }
interface PopOpt { depth?: number; blend?: Phaser.BlendModes; rot?: number; origin?: [number, number]; sy?: number; vx?: number; vy?: number; spin?: number; grow?: number; fade?: 'out' | 'inout' | 'snap'; a?: number; flip?: boolean; delay?: number }
const MAX_POPS = 130;
type Slot = 'phTail' | 'phChest' | 'phHead' | 'phWingA' | 'phWingB' | 'phWing2A' | 'phWing2B' | 'halo' | 'orb' | 'orbit0' | 'orbit1' | 'orbit2' | 'proj' | 'front' | 'diagram';

export class SeraFx {
  private pops: Pop[] = []; private readonly g: Phaser.GameObjects.Graphics; private lastEvent = 0; private readonly director = new ImpactDirector(); private shake = 0; private clock = 0;
  private readonly slots: Partial<Record<Slot, Phaser.GameObjects.Image>> = {}; private readonly bolts: Phaser.GameObjects.Image[] = []; private readonly boltHits = new Map<number, number>();
  private phA = 0; private side = 1; private lx = 0; private ly = 0; private aura = 0; private jet = 0; private starT = 0; private trailT = 0;
  constructor(private readonly scene: Phaser.Scene, private readonly events: boolean) { this.g = scene.add.graphics().setDepth(3.66); }
  takeHitstop() { return this.director.take(); }
  takeShake() { const v = this.shake; this.shake = 0; return v; }
  private has(n: string) { return this.scene.textures.exists(seraKey(n)); }
  private pop(n: string, x: number, y: number, w: number, dur: number, o: PopOpt = {}) {
    if (!this.has(n) || this.pops.length >= MAX_POPS) return null;
    const im = this.scene.add.image(x, y, seraKey(n)).setDepth(o.depth ?? 11.5).setBlendMode(o.blend ?? ADD).setAlpha(0).setRotation(o.rot ?? 0); if (o.origin) im.setOrigin(...o.origin); if (o.flip) im.setFlipX(true);
    this.pops.push({ im, t: 0, delay: o.delay ?? 0, dur, w, grow: o.grow ?? 1.2, vx: o.vx ?? 0, vy: o.vy ?? 0, spin: o.spin ?? 0, fade: o.fade ?? 'out', a: o.a ?? 1, sy: o.sy ?? 1 }); return im;
  }
  private flat(n: string, x: number, y: number, w: number, dur: number, o: PopOpt = {}) { return this.pop(n, x, y, w, dur, { depth: 3.7, sy: 0.5, ...o }); }
  private heavy(w: 'heavy' | 'finisher', reduced: boolean) { this.director.request(w, reduced); }
  private kick(v: number, reduced: boolean) { if (!reduced) this.shake = Math.max(this.shake, v); }
  private img(slot: Slot, n: string, blend: Phaser.BlendModes = NORMAL) { let im = this.slots[slot]; if (!im && this.has(n)) { im = this.scene.add.image(0, 0, seraKey(n)).setBlendMode(blend); this.slots[slot] = im; } return im; }
  private place(im: Phaser.GameObjects.Image | undefined, x: number, y: number, w: number, a: number, depth: number, o: { flip?: number; rot?: number; ox?: number; oy?: number } = {}) {
    if (!im) return; im.setVisible(a > 0.01).setPosition(x, y).setDepth(depth).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5).setDisplaySize(w, w * (im.height / im.width)).setFlipX((o.flip ?? 1) < 0).setAlpha(a).setRotation(o.rot ?? 0);
  }
  private star(x: number, y: number, r: number, a: number, color = PEARL) { this.g.lineStyle(1.4, color, a).beginPath(); this.g.moveTo(x - r, y); this.g.lineTo(x + r, y); this.g.moveTo(x, y - r * 1.3); this.g.lineTo(x, y + r * 1.3); this.g.strokePath(); this.g.fillStyle(color, a).fillCircle(x, y, r * 0.3); }

  update(dt: number, s: GameState, reduced: boolean, crowded: boolean, facing: string, lift: number) {
    this.g.clear(); const run = s.phase === 'running'; this.director.tick(run ? dt : 0); this.clock += run ? dt : 0;
    const p = s.player, sera = s.hero === 'sora' && p.form === 2, R = Math.random, lite = reduced || crowded, cin = s.cinema, ly = p.y + lift;
    if (this.events) for (const ev of s.abilityEvents) if (ev.id > this.lastEvent) { this.lastEvent = ev.id; this.onEvent(ev, s, reduced); }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const q = this.pops[i]; if (q.delay > 0) { q.delay -= dt; q.im.setAlpha(0); continue; } q.t += dt; const u = q.t / q.dur; if (u >= 1) { q.im.destroy(); this.pops.splice(i, 1); continue; }
      const sc = (q.w / q.im.width) * (1 + (q.grow - 1) * (1 - (1 - u) ** 2)); q.im.setScale(sc, sc * q.sy);
      q.im.setAlpha(q.a * (q.fade === 'inout' ? Math.sin(u * Math.PI) : q.fade === 'snap' ? (u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5) : u < 0.1 ? u / 0.1 : 1 - (u - 0.1) / 0.9)); q.im.x += q.vx * dt; q.im.y += q.vy * dt; if (q.spin) q.im.rotation += q.spin * dt;
    }
    if (s.hero !== 'sora' || (!sera && cin?.to !== 2)) { this.hideLive(); this.boltHits.clear(); return; }
    // ---- the reveal: stars gather into a broken constellation, a Phoenix shadow opens behind Sora before the break
    if (cin && cin.to === 2) {
      const u = Math.min(1, cin.t / cin.breakAt); this.starT += dt;
      if (cin.t < cin.breakAt && this.starT > 0.1) { this.starT = 0; const a = R() * Math.PI * 2, r = 70 + R() * 90; this.pop('sf_star', p.x + Math.cos(a) * r, p.y + MID + Math.sin(a) * r * 0.7, 26 + R() * 18, 0.9, { fade: 'inout', depth: 9.4, a: 0.9, grow: 0.7 }); }
      const f = this.img('front', 'ph_front'); this.place(f, p.x, p.y + MID - 30, 120 + 320 * u, cin.t < cin.breakAt ? 0.55 * u : Math.max(0, 0.55 * (1 - (cin.t - cin.breakAt) / 0.5)), 9.3);
      this.hidePresence(); return;
    }
    if (!run) { this.hidePresence(); this.phoenix(dt, s, reduced, ly, true); return; }
    // ---- Star Traces: a small pearl star over every foe that carries one
    for (const t of s.hx.traces ?? []) {
      const e = s.enemies.find(x => x.id === t.id && x.hp > 0); if (!e) continue; const left = Math.min(1, (t.t - s.time) / 1.0), by = e.y - e.radius - 28, pu = 0.75 + 0.25 * Math.sin(this.clock * 7 + e.id);
      this.g.lineStyle(1.2, ROSE, 0.7 * left).strokeCircle(e.x, by, 7.5); this.star(e.x, by, 6.5 * pu, 0.95 * left);
    }
    // ---- presence: mantle panels, a floating halo fragment, two or three orbiting feathers, a faint dusk ring on the ground
    const moving = Math.hypot(p.vx, p.vy) > 40 || s.hx.moving, f = facing === 'west' ? -1 : 1, back = facing === 'north', bx = p.x, by = ly + MID;
    this.mantle(p.vx, bx, by, f, back, moving, p.hp > 0);
    this.place(this.img('halo', 'sm_halo', ADD), bx + 1, by - 62 + Math.sin(this.clock * 2.1) * 2, 34, 0.8, 10.8, { rot: Math.sin(this.clock * 1.3) * 0.1 });
    for (let i = 0; i < 3; i++) { const o = this.img(`orbit${i}` as Slot, 'sm_feather'), a = this.clock * 0.9 + (i * Math.PI * 2) / 3, on = !lite && p.hp > 0; this.place(o, bx + Math.cos(a) * 26, by - 6 + Math.sin(a) * 9, 14, on ? 0.9 : 0, Math.sin(a) > 0 ? 9.8 : 8.95, { rot: a + Math.PI / 2 }); }
    this.g.lineStyle(1.5, VIOLET, 0.25 + 0.08 * Math.sin(this.clock * 3)).strokeEllipse(p.x, p.y + GY + 2, 62, 20);
    this.aura += dt; if (!lite && p.hp > 0 && this.aura > 0.18) { this.aura = 0; this.pop('sm_feather', p.x + (R() - 0.5) * 28, ly + GY - 8, 12 + R() * 6, 1.0, { depth: 9, vy: -30 - R() * 20, vx: (R() - 0.5) * 16, a: 0.7, grow: 0.7, rot: R() * 6, spin: (R() - 0.5) * 3 }); }
    // ---- feathers in flight: sprites follow the real bolts; a new hit on a bolt plays one small refraction (the sim's hit, never a guess)
    this.bolt(s, reduced);
    // ---- telegraphs that follow the simulation's committed geometry
    const c = s.hx.act;
    for (const fld of s.hx.sf ?? []) {
      if (fld.k === 'nodes') {
        const n = fld.tier, pulse = 0.5 + 0.5 * Math.sin(this.clock * 20), left = Math.max(0, SERA_E.lead + fld.d[0] * SERA_E.gap - fld.t);
        for (let i = fld.d[0]; i < n; i++) { const x = fld.d[2 + i * 2], y = fld.d[3 + i * 2], k = Math.min(1, fld.t / SERA_E.lead); this.g.lineStyle(2.2, ROSE, 0.45 + 0.35 * pulse).strokeEllipse(x, y + 12, fld.r * 2, fld.r * 1.05); this.g.fillStyle(0x2a1a44, 0.1 + 0.12 * k).fillEllipse(x, y + 12, fld.r * 2, fld.r * 1.05); this.star(x, y + 12, 7 + 5 * k, 0.9); }
        for (let i = 1; i < n; i++) this.g.lineStyle(1.2, PEARL, 0.35).lineBetween(fld.d[2 + (i - 1) * 2], fld.d[3 + (i - 1) * 2] + 12, fld.d[2 + i * 2], fld.d[3 + i * 2] + 12);
        void left;
      } else if (fld.k === 'judg') {
        const lit = fld.d[0], n = SERA_R.stars, linked = fld.d[1] === 1, hold = fld.t < SERA_R.novaAt;
        if (hold) { this.g.lineStyle(2, ROSE, 0.25 + 0.2 * Math.sin(this.clock * 6)).strokeEllipse(fld.x, fld.y + 14, fld.r * 2, fld.r * 1.05); const dg = this.img('diagram', 'sf_diagram', ADD); this.place(dg, fld.x, fld.y + 8, fld.r * 1.9, linked ? 0.35 : 0, 3.75); } else this.slots.diagram?.setVisible(false);
        for (let i = 0; i < lit; i++) { const x = fld.d[4 + i * 2], y = fld.d[5 + i * 2]; this.star(x, y, 6 + 2 * Math.sin(this.clock * 9 + i), 0.95); if (i > 0) this.g.lineStyle(1.6, PEARL, linked ? 0.85 : 0.5).lineBetween(fld.d[2 + i * 2], fld.d[3 + i * 2], x, y); }
        if (linked && lit >= n) this.g.lineStyle(1.6, PEARL, 0.85).lineBetween(fld.d[4 + (n - 1) * 2], fld.d[5 + (n - 1) * 2], fld.d[4], fld.d[5]);
      } else if (fld.k === 'rebirth' && fld.d[4] === 0) {
        const im = this.img('proj', 'sf_star', ADD), w = 44 + 14 * fld.tier; this.place(im, fld.x, fld.y, w, 0.95, 11.6, { rot: ang(fld.d[0], fld.d[1]) });
        this.trailT += dt; if (!lite && this.trailT > 0.04) { this.trailT = 0; this.pop('sf_burst', fld.x, fld.y, 22 + 6 * fld.tier, 0.3, { a: 0.5, grow: 0.5, depth: 11.4 }); }
      }
    }
    if (!(s.hx.sf ?? []).some(x => x.k === 'rebirth' && x.d[4] === 0)) this.slots.proj?.setVisible(false);
    if (!(s.hx.sf ?? []).some(x => x.k === 'judg')) this.slots.diagram?.setVisible(false);
    if (c?.act === 'astral_rebirth' && !c.released) {   // the winged star grows between the hands with the real tier
      const h = hand(s, c.dirX, c.dirY, 24, 'orb'), im = this.img('orb', 'sf_star', ADD), w = 24 + 22 * c.tier + 5 * Math.sin(this.clock * 16);
      this.place(im, h.x, h.y + lift, w, 0.7 + 0.1 * c.tier, 11.6, { rot: ang(c.dirX, c.dirY) });
      if (c.tier >= 3) this.place(this.img('front', 'ph_front'), p.x, ly + MID - 16, 130 + 18 * Math.sin(this.clock * 8), 0.45, 9.2);
      this.g.lineStyle(1.5, ROSE, 0.3 + 0.12 * c.tier).strokeEllipse(p.x, p.y + GY + 2, 50 + 22 * c.tier, 18 + 6 * c.tier);
    } else { this.slots.orb?.setVisible(false); if (c?.act !== 'astral_rebirth') this.slots.front?.setVisible(false); }
    // ---- flight: drifting pearl feathers under the boots
    if (p.flyT > 0 && !lite) { this.jet += dt; if (this.jet > 0.06) { this.jet = 0; this.pop('sm_feather', p.x + (R() - 0.5) * 14, ly + GY - 4, 16, 0.5, { depth: 9, vy: 90 + R() * 50, vx: (R() - 0.5) * 36, a: 0.8, grow: 0.6, rot: R() * 6, spin: (R() - 0.5) * 6 }); } }
    if ((p.flyT > 0 || p.dashRemaining > 0) && !reduced) { const sp = Math.hypot(p.vx, p.vy); this.trailT += dt; if (sp > 40 && this.trailT > 0.045) { this.trailT = 0; const a = Math.atan2(p.vy, p.vx); this.pop('sf_lance', p.x - Math.cos(a) * 14, ly + MID - Math.sin(a) * 14, 120, 0.3, { rot: a, origin: [1, 0.5], a: 0.65, grow: 1.1, depth: 9.2 }); this.pop('sm_feather', p.x, ly + MID, 18, 0.5, { rot: a, vx: -p.vx * 0.15, vy: -p.vy * 0.15, a: 0.7, grow: 0.6, depth: 9.1 }); } }   // a pearl streak and shed feathers follow the glide and the dash
    this.phoenix(dt, s, reduced, ly, false);
  }
  /** The mantle is built from individual ImageGen feathers on a fan at each shoulder (geometry, not a flat panel): each feather has its own length, fan angle and sway phase, lags behind movement, and trails back when running or gliding. */
  private readonly mf: Phaser.GameObjects.Image[] = [];
  private mantle(vx: number, bx: number, by: number, f: number, back: boolean, moving: boolean, alive: boolean) {
    const FEATHER = [{ n: 'mf_1', len: 64, ang: 0.52 }, { n: 'mf_3', len: 54, ang: 0.86 }, { n: 'mf_6', len: 46, ang: 1.18 }, { n: 'mf_4', len: 34, ang: 1.5 }, { n: 'mf_5', len: 78, ang: 0.28 }];
    const drift = Math.max(-0.5, Math.min(0.5, -vx * 0.0014)), run = moving ? 0.12 : 0;
    for (let side = 0; side < 2; side++) for (let i = 0; i < FEATHER.length; i++) {
      const F = FEATHER[i], k = side * FEATHER.length + i; let im = this.mf[k];
      if (!im) { if (!this.has(F.n)) continue; im = this.scene.add.image(0, 0, seraKey(F.n)).setBlendMode(NORMAL); this.mf[k] = im; }
      const sgn = side === 0 ? -1 : 1, phase = this.clock * 2.4 + i * 0.8 + side, rot = Math.PI + sgn * (F.ang + 0.06 * Math.sin(phase) + run) + drift * (0.6 + 0.12 * i);   // feather tip points down and out from the shoulder
      const w = F.len * (im.width / im.height); im.setVisible(alive).setOrigin(0.5, 0.97).setPosition(bx + sgn * 13 - f * 6, by - 30).setRotation(rot).setDisplaySize(w, F.len).setAlpha(0.95).setDepth(back ? 10.3 : 8.9);
    }
  }
  private bolt(s: GameState, reduced: boolean) {
    const list = s.hx.bolts.filter(b => b.kind === 'feather'), live = new Set<number>();
    for (let i = 0; i < list.length && i < 48; i++) {
      const b = list[i]; live.add(b.id); let im = this.bolts[i]; const lance = b.radius > 10, n = lance ? 'sf_lance' : 'sf_feather';
      if (!im) { if (!this.has(n)) continue; im = this.scene.add.image(0, 0, seraKey(n)).setBlendMode(ADD).setDepth(11.2); this.bolts[i] = im; }
      if (im.texture.key !== seraKey(n)) im.setTexture(seraKey(n)); const w = lance ? 84 : 46; im.setVisible(true).setPosition(b.x, b.y).setRotation(ang(b.vx, b.vy)).setDisplaySize(w, w * (im.height / im.width)).setAlpha(0.95);
      const was = this.boltHits.get(b.id) ?? 0; if (b.hits.length > was) { this.boltHits.set(b.id, b.hits.length); this.pop('sf_burst', b.x, b.y, lance ? 74 : 44, 0.22, { grow: 1.3, depth: 11.4 }); if (lance) { this.heavy('heavy', reduced); this.kick(0.0018, reduced); } else this.kick(0.0006, reduced); }
    }
    for (let i = list.length; i < this.bolts.length; i++) this.bolts[i]?.setVisible(false);
    for (const id of this.boltHits.keys()) if (!live.has(id)) this.boltHits.delete(id);
  }
  private hidePresence() { for (const im of this.mf) im?.setVisible(false); for (const k of ['halo', 'orbit0', 'orbit1', 'orbit2', 'orb', 'proj', 'diagram'] as Slot[]) this.slots[k]?.setVisible(false); for (const b of this.bolts) b.setVisible(false); this.hidePhoenix(); }
  private hidePhoenix() { for (const k of ['phTail', 'phChest', 'phHead', 'phWingA', 'phWingB', 'phWing2A', 'phWing2B'] as Slot[]) this.slots[k]?.setVisible(false); }
  private hideLive() { this.hidePresence(); this.slots.front?.setVisible(false); }
  /** Eventide Phoenix (Overdrive): long articulated wings, a luminous chest, a crested head and a trailing constellation tail behind Sora; his real hits flick the wing feathers */
  private phoenix(dt: number, s: GameState, reduced: boolean, ly: number, frozen: boolean) {
    const p = s.player, on = p.odT > 0 && p.hp > 0 && !frozen; this.phA += ((on ? 1 : 0) - this.phA) * Math.min(1, dt * (on ? 6 : 4));
    if (this.phA < 0.02) { this.hidePhoenix(); return; }
    if (Math.abs(p.aimX) > 0.2) this.side += ((p.aimX >= 0 ? 1 : -1) - this.side) * Math.min(1, dt * 8);
    this.lx += (p.x - this.lx) * Math.min(1, dt * 7); this.ly += (ly - this.ly) * Math.min(1, dt * 7); const A = this.phA * (reduced ? 0.7 : 1), f = this.side >= 0 ? 1 : -1, flap = Math.sin(this.clock * 4.4), bx = this.lx, by = this.ly + MID;
    this.place(this.img('phTail', 'ph_tail'), bx - f * 22, by + 6 + flap * 3, 130, 0.62 * A, 8.9, { flip: f, rot: flap * 0.04, ox: 0.92, oy: 0.5 });
    this.place(this.img('phWingB', 'ph_wingback'), bx - f * 5, by - 10, 118, 0.5 * A, 8.92, { flip: f, rot: -0.2 + flap * 0.18, ox: 0.08, oy: 0.5 });
    this.place(this.img('phChest', 'ph_chest'), bx - f * 5, by + 6, 84, 0.6 * A, 9.0, { flip: f, ox: 0.5, oy: 0.55 });
    this.place(this.img('phWingA', 'ph_wingup'), bx - f * 3, by - 14, 134, 0.66 * A, 9.04, { flip: f, rot: -0.1 + flap * 0.16, ox: 0.1, oy: 0.92 });
    this.place(this.img('phHead', 'ph_head'), bx + f * 26, by - 44 + Math.sin(this.clock * 2.4) * 3, 62, 0.8 * A, 9.55, { flip: f });
  }
  private phoenixStrike(px: number, py: number, a: number, od: boolean, reduced: boolean) { if (od && !reduced) this.pop('ph_wingback', px - Math.cos(a) * 30, py + MID * 0.6 - Math.sin(a) * 15, 150, 0.3, { rot: a, origin: [0.1, 0.5], grow: 1.25, blend: NORMAL, a: 0.8, depth: 11.4 }); }
  private onEvent(ev: AbilityEvent, s: GameState, reduced: boolean) {
    const { x, y } = ev, n = ev.n ?? 0, kind = ev.kind, hits = (n >> 8) & 63, p = s.player, od = (n & 16384) !== 0, R = Math.random, tx = ev.tx ?? x, ty = ev.ty ?? y;
    switch (kind) {
      case 'sera_break': { this.flat('sf_nova', p.x, p.y + GY, 520, 0.8, { grow: 1.8 }); this.flat('sf_nova', p.x, p.y + GY, 320, 0.55, { grow: 1.5, a: 0.8 }); this.pop('ph_front', p.x, p.y + MID - 40, 360, 0.9, { blend: NORMAL, grow: 1.4, a: 0.9, depth: 10.9 }); this.pop('sf_burst', p.x, p.y + MID, 300, 0.5, { grow: 1.6 }); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; this.pop('sm_feather', p.x, p.y + MID, 40, 0.8, { rot: a, vx: Math.cos(a) * 170, vy: Math.sin(a) * 120, grow: 0.8, a: 0.9, depth: 10.8 }); } break; }
      case 'sera_commit': this.pop('sf_star', p.x, p.y + MID, 260, 0.7, { grow: 1.5 }); break;
      case 'sera_end': for (let i = 0; i < 8; i++) this.pop('sm_feather', p.x + (R() - 0.5) * 34, p.y + MID + (R() - 0.5) * 50, 20, 1.0, { vy: -40 - R() * 30, vx: (R() - 0.5) * 40, a: 0.8, grow: 0.6, rot: R() * 6, spin: 2 }); break;
      case 'sera_shift': this.flat('sf_nova', p.x, p.y + GY, 260, 0.45, { grow: 1.6 }); this.pop('sf_star', p.x, p.y + MID, 90, 0.3, { grow: 1.6, a: 0.9 }); break;
      case 'sera_trace': this.pop('sf_trace', x, y - 28, 26, 0.3, { grow: 1.6, a: 0.9 }); break;
      case 'sera_burst': this.pop('sf_burst', x, y - 6, (n & 3) === 2 ? 120 : 96, 0.3, { grow: 1.3 }); this.pop('sf_trace', x, y - 20, 50, 0.3, { grow: 1.5 }); this.heavy('heavy', reduced); this.kick(0.0022, reduced); break;
      case 'sera_auto': this.pop('sf_burst', x, y, 34, 0.18, { grow: 1.3, a: 0.7 }); this.phoenixStrike(x, y, ang(tx - x, ty - y), od, reduced); break;
      case 'sera_q_cast': this.pop('sf_burst', x, y, 52, 0.2, { grow: 1.4, a: 0.8 }); break;
      case 'sera_q_lance': {   // a star-lance drawn from the committed lane (origin to its wall-clipped end); an impact only where the sim reported a hit
        const len = Math.hypot(tx - x, ty - y), a = ang(tx - x, ty - y), k = n & 15, h = (n >> 4) & 31, fol = (n >> 9) & 7; this.pop('sf_lance', x, y, len + 40, 0.22, { rot: a, origin: [0.02, 0.5], grow: 1.02, depth: 11.3 });
        if (h > 0) { this.pop('sf_burst', tx, ty, 64, 0.22, { grow: 1.3 }); if (k === 1) { this.heavy('heavy', reduced); this.kick(0.002, reduced); } } if (fol > 0) this.pop('sf_trace', tx, ty, 60, 0.3, { grow: 1.6 }); break;
      }
      case 'sera_e_start': this.pop('sf_burst', p.x, p.y + MID, 60, 0.25, { grow: 1.4, a: 0.7 }); break;
      case 'sera_e_node': { const i = n & 15, r = (n >> 4) & 1023 || SERA_E.radius; this.flat('sf_node', x, y + 12, r * 2.4, SERA_E.lead + i * SERA_E.gap + 0.1, { fade: 'inout', a: 0.8 }); break; }
      case 'sera_e_strike': {   // a huge feather-lance falls onto its node; ground shadow and a ring land with it
        const r = SERA_E.radius; this.pop('sf_spear', x, y - 292, 130, 0.12, { origin: [0.5, 1], vy: 2500, grow: 1.0, depth: 11.4, fade: 'snap', a: 0.95 });
        this.pop('sf_burst', x, y, r * 2.2, 0.3, { grow: 1.3, delay: 0.1 }); this.flat('sf_nova', x, y + 10, r * 2.8, 0.5, { grow: 1.5, a: 0.8, delay: 0.1 }); this.flat('sf_node', x, y + 10, r * 2.6, 1.0, { fade: 'out', a: 0.6, delay: 0.1 });
        if (hits > 0) { this.heavy('heavy', reduced); this.kick(0.0026, reduced); } break;
      }
      case 'sera_e_conv': { const r = n & 4095, got = (n >> 12) & 15; this.flat('sf_nova', x, y + 10, r * 2.4, 0.55, { grow: 1.3, a: 0.9 }); this.pop('sf_diagram', x, y, r * 1.6, 0.5, { fade: 'inout' }); if (got > 0) { this.heavy('finisher', reduced); this.kick(0.0045, reduced); } break; }
      case 'sera_r_cast': this.pop('sf_burst', p.x, p.y + MID, 70, 0.25, { grow: 1.5, a: 0.7 }); this.flat('sf_node', x, y + 14, (n & 1023) * 2.4, SERA_R.endAt, { fade: 'inout', a: 0.5 }); break;
      case 'sera_r_node': this.pop('sf_burst', x, y, 60, 0.35, { grow: 1.4, a: 0.9 }); break;
      case 'sera_r_link': this.pop('sf_diagram', x, y, SERA_R.holdR * 2, 0.7, { fade: 'inout', a: 0.8, depth: 3.9, sy: 0.7 }); break;
      case 'sera_r_sweep': {   // the Phoenix descends through the constellation: a wide pale shape falls onto the centre
        this.pop('ph_front', x, y - 360, 400, 0.5, { blend: NORMAL, vy: 760, grow: 1.1, a: 0.95, depth: 11.2, fade: 'snap' }); this.pop('sf_burst', x, y, 300, 0.4, { grow: 1.5, delay: 0.3 }); this.flat('sf_nova', x, y + 12, SERA_R.sweepR * 2.4, 0.6, { grow: 1.4, delay: 0.3 });
        if (hits > 0) { this.heavy('heavy', reduced); this.kick(0.0035, reduced); } break;
      }
      case 'sera_r_nova': {
        const got = (n >> 4) & 15; this.flat('sf_nova', x, y + 12, SERA_R.novaR * 2.6, 0.9, { grow: 1.7, a: 1 }); this.flat('sf_nova', x, y + 12, SERA_R.novaR * 1.6, 0.6, { grow: 1.5, a: 0.8 }); this.pop('sf_burst', x, y, SERA_R.novaR * 1.6, 0.6, { grow: 1.5 }); this.pop('ph_front', x, y - 20, 330, 0.7, { blend: NORMAL, grow: 1.5, a: 0.9, depth: 11.0, fade: 'inout' });
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; this.pop('sm_feather', x, y, 36, 0.8, { vx: Math.cos(a) * 190, vy: Math.sin(a) * 110, rot: a, grow: 0.8, a: 0.9 }); }
        if (hits > 0 || got > 0) { this.heavy('finisher', reduced); this.kick(0.007, reduced); } else this.kick(0.001, reduced); break;
      }
      case 'sera_v_charge': this.flat('sf_node', p.x, p.y + GY, 90, 0.4, { grow: 1.5, a: 0.6 }); break;
      case 'sera_v_tier': this.pop('sf_burst', p.x, p.y + MID, 80 + 28 * (n & 3), 0.3, { grow: 1.5 }); this.flat('sf_nova', p.x, p.y + GY, 120 + 30 * (n & 3), 0.4, { grow: 1.5 }); break;
      case 'sera_v_release': this.pop('sf_lance', p.x, p.y + MID, Math.hypot(tx - p.x, ty - p.y) + 60, 0.22, { rot: ang(tx - p.x, ty - p.y), origin: [0.02, 0.5], a: 0.6, grow: 1.02, depth: 9 }); break;
      case 'sera_v_hit': this.pop('sf_burst', x, y, 120 + 30 * (n & 3), 0.25, { grow: 1.3 }); this.kick(0.0022, reduced); break;
      case 'sera_v_miss': this.pop('sf_burst', x, y, 46, 0.3, { a: 0.4 }); break;   // a miss never explodes
      case 'sera_v_block': this.flat('sf_nova', x, y + GY * 0.5, 110, 0.25, { a: 0.5 }); break;
      case 'sera_v_pulse': {
        const i = n & 31, tier = (n >> 5) & 7;
        if (tier >= 3 && i === 2) { this.pop('ph_front', x, y - 20, 360, 0.7, { blend: NORMAL, grow: 1.5, a: 0.95, depth: 11.0, fade: 'inout' }); this.pop('sf_burst', x, y, 300, 0.5, { grow: 1.5 }); this.flat('sf_nova', x, y + 12, 380, 0.6, { grow: 1.7 }); this.heavy('finisher', reduced); this.kick(0.0056, reduced); }
        else if (tier >= 3 && i === 3) { this.flat('sf_nova', x, y + 12, SERA_V.afterR * 2.4, 0.7, { grow: 1.6, a: 0.8 }); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; this.pop('sm_feather', x, y, 30, 0.7, { vx: Math.cos(a) * 160, vy: Math.sin(a) * 90, rot: a, grow: 0.8 }); } }
        else { this.flat('sf_nova', x, y + GY * 0.5, 190 + 40 * tier, 0.4, { grow: 1.6 }); this.pop('sf_burst', x, y + MID * 0.5, 150 + 40 * tier, 0.3, { grow: 1.4 }); if (hits > 0 && i === 0) { this.heavy('heavy', reduced); this.kick(0.0032, reduced); } }
        if (od && i === 0) this.phoenixStrike(x, y, 0, true, reduced); break;
      }
      case 'sora_fly_start': if (p.form === 2) this.flat('sf_nova', p.x, p.y + GY, 200, 0.4, { grow: 1.6 }); break;
      case 'sora_fly_land': if (p.form === 2 && (n & 1)) { this.flat('sf_nova', x, y + 14, 300, 0.7, { a: 0.9, grow: 1.5 }); this.pop('sf_burst', x, y, 180, 0.4, { grow: 1.3 }); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.pop('sm_feather', x, y, 26, 0.7, { vx: Math.cos(a) * 140, vy: Math.sin(a) * 70, rot: a, grow: 0.8 }); } if (((n >> 8) & 63) > 0) { this.heavy('heavy', reduced); this.kick(0.004, reduced); } } break;
      case 'sora_od_start': if (n === 2) { this.pop('ph_head', p.x + 16, p.y + MID - 40, 130, 0.6, { blend: NORMAL, a: 0.9, grow: 1.3, depth: 9.55 }); this.flat('sf_nova', p.x, p.y + GY, 220, 0.6, { grow: 1.6 }); } break;
      case 'sora_od_end': if (p.form === 2) for (let i = 0; i < 8; i++) this.pop('sm_feather', p.x + (R() - 0.5) * 60, p.y + MID + (R() - 0.5) * 60, 22, 1.0, { vy: -50 - R() * 30, vx: (R() - 0.5) * 50, a: 0.8, grow: 0.6, rot: R() * 6, spin: 2 }); break;
      default: break;
    }
  }
  destroy() { for (const q of this.pops) q.im.destroy(); this.pops = []; for (const im of Object.values(this.slots)) im?.destroy(); for (const b of this.bolts) b?.destroy(); for (const m of this.mf) m?.destroy(); this.g.destroy(); }
}

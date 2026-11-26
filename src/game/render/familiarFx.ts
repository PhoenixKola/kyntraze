/** Celestial Familiars (view): draws every fighter's companion from the simulation's `fam` state alone (solo, local co-op slot 2, and the online partner's snapshot view), so each player sees every beast. Body = ImageGen pose sheet (idle 0-3, move 4-7, windup 8, strike 9, recover 10, hit 11); the Overdrive fusion, the re-forming, strike streaks, impacts and the hero-beast link are layered on top with the effect sprites. */
import Phaser from 'phaser';
import type { Familiar, GameState } from '../../sim/GameState';
import { FAMILIARS, FAM_MERGE, FAM_REFORM, FAM_SPAWN, type FamiliarDef } from '../../content/familiars';
import type { HeroId } from '../../content/heroes';
import { vfxKey } from './fxPool';

export const FAM_IDS = ['dragon', 'fox', 'phoenix', 'guardian'] as const;
export const FAM_KINDS = ['shot', 'burst', 'sigil'] as const;
export const famBodyKey = (id: string) => `fam-body-${id}`;
export const famBodyUrl = (id: string) => `/art/fam/${id}.webp`;
export const famFxKey = (id: string, kind: string) => `fam-fx-${id}-${kind}`;
export const famFxUrl = (id: string, kind: string) => `/art/fam/fx_${id}_${kind}.webp`;
export const FAM_MANIFEST_KEY = 'fam-manifest', FAM_MANIFEST_URL = '/art/fam/manifest.json';
/** displayed width (px) of one 256 px frame */
const SIZE: Record<string, number> = { dragon: 112, fox: 108, phoenix: 138, guardian: 112 };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
interface Fx { img: Phaser.GameObjects.Image; life: number; max: number; kind: 'burst' | 'shot' | 'ring' | 'mote'; s0: number; s1: number; a: number; vx?: number; vy?: number }
interface Man { fw: number; fh: number; px: number; py: number }
class FamView {
  readonly body: Phaser.GameObjects.Sprite; readonly glow: Phaser.GameObjects.Sprite; readonly sigil: Phaser.GameObjects.Image; readonly g: Phaser.GameObjects.Graphics; readonly link: Phaser.GameObjects.Graphics;
  readonly fx: Fx[] = []; x = 0; y = 0; fresh = true; prevMode = ''; lastFx = -9; clock = Math.random() * 6; trail: { x: number; y: number }[] = []; shotSeen = new Set<number>(); moteT = 0; speed = 0; id = '';
  constructor(readonly scene: Phaser.Scene) {
    const blank = 'kp-blank'; if (!scene.textures.exists(blank)) scene.textures.createCanvas(blank, 2, 2)!.refresh();
    this.body = scene.add.sprite(0, 0, blank).setVisible(false); this.glow = scene.add.sprite(0, 0, blank).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.sigil = scene.add.image(0, 0, blank).setVisible(false).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.7);
    this.g = scene.add.graphics().setDepth(3.6); this.link = scene.add.graphics().setDepth(10.6).setBlendMode(Phaser.BlendModes.ADD);
  }
  put(key: string, frame: number) { if (this.body.texture.key !== key || this.body.frame.name !== String(frame)) { this.body.setTexture(key, frame); this.glow.setTexture(key, frame); } }
  hide() { this.body.setVisible(false); this.glow.setVisible(false); this.sigil.setVisible(false); this.g.clear(); this.link.clear(); this.fresh = true; this.prevMode = ''; }
  spawn(tex: string, x: number, y: number, kind: Fx['kind'], life: number, s0: number, s1: number, a: number, tint: number, depth = 10.7, rot = 0, ox = 0.5, oy = 0.5, vx = 0, vy = 0) {
    if (!this.scene.textures.exists(tex) || this.fx.length > 28) return;
    const img = this.scene.add.image(x, y, tex).setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setDepth(depth).setRotation(rot).setOrigin(ox, oy).setAlpha(a); this.fx.push({ img, life, max: life, kind, s0, s1, a, vx, vy });
  }
  tick(dt: number) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]; f.life -= dt; if (f.life <= 0) { f.img.destroy(); this.fx.splice(i, 1); continue; }
      const u = 1 - f.life / f.max; f.img.setScale(f.s0 + (f.s1 - f.s0) * easeOut(u)).setAlpha(f.a * (1 - u) ** (f.kind === 'mote' ? 1 : 1.6));
      if (f.vx || f.vy) { f.img.x += (f.vx ?? 0) * dt; f.img.y += (f.vy ?? 0) * dt; }
    }
  }
  destroy() { this.body.destroy(); this.glow.destroy(); this.sigil.destroy(); this.g.destroy(); this.link.destroy(); for (const f of this.fx) f.img.destroy(); this.fx.length = 0; }
}
interface Who { key: string; hero: HeroId; fam: Familiar | undefined; px: number; py: number; hp: number }
export class FamiliarLayer {
  private readonly views = new Map<string, FamView>(); private man: Record<string, Man> | null = null;
  constructor(private readonly scene: Phaser.Scene) { const m = scene.cache.json.get(FAM_MANIFEST_KEY); if (m && typeof m === 'object') this.man = m as Record<string, Man>; }
  /** every fighter whose beast should be drawn: the local one, the local co-op partner (second slot) or the online partner (their server view) */
  private fighters(s: GameState): Who[] {
    const out: Who[] = [{ key: 'a', hero: s.hero, fam: s.fam, px: s.player.x, py: s.player.y, hp: s.player.hp }];
    if (s.party) { const b = s.party.slots[1].bag; out.push({ key: 'b', hero: b.hero, fam: b.fam, px: b.player.x, py: b.player.y, hp: b.player.hp }); }
    else { const n = (s as unknown as { partner?: { hero: HeroId; fam?: Familiar | null; player: { x: number; y: number; hp: number } } }).partner; if (n && n.player) out.push({ key: 'b', hero: n.hero, fam: n.fam ?? undefined, px: n.player.x, py: n.player.y, hp: n.player.hp }); }
    return out;
  }
  update(s: GameState, dt: number, reduced: boolean) {
    const seen = new Set<string>(), run = s.phase !== 'dead';
    for (const w of this.fighters(s)) {
      const v = this.views.get(w.key) ?? (() => { const n = new FamView(this.scene); this.views.set(w.key, n); return n; })(), def = FAMILIARS[w.hero], tex = famBodyKey(def.id);
      seen.add(w.key); const f = w.fam;
      if (!f || !run || w.hp <= 0 || !this.scene.textures.exists(tex)) { v.hide(); v.tick(dt); continue; }
      this.draw(v, s, f, def, w, tex, dt, reduced);
    }
    for (const [k, v] of this.views) if (!seen.has(k)) { v.destroy(); this.views.delete(k); }
  }
  /** the fusion lands: a flash and ring on the hero's chest where the beast sank in */
  private fuse(v: FamView, def: FamiliarDef, w: Who) {
    const x = w.px, y = w.py - 30; v.spawn(famFxKey(def.id, 'burst'), x, y, 'burst', 0.42, 0.18, 0.62, 0.95, def.edge, 10.8);
    v.spawn(famFxKey(def.id, 'sigil'), x, y + 26, 'ring', 0.55, 0.2, 0.75, 0.8, def.accent, 3.8);
  }
  private draw(v: FamView, s: GameState, f: Familiar, def: FamiliarDef, w: Who, tex: string, dt: number, reduced: boolean) {
    const m = this.man?.[def.id], fw = m?.fw ?? 256, fh = m?.fh ?? 256, ox = (m?.px ?? 128) / fw, oy = (m?.py ?? 128) / fh, T = s.time, sc = (SIZE[def.id] ?? 110) / fw;
    v.clock += dt; v.id = def.id;
    const px0 = v.x, py0 = v.y, far = Math.hypot(f.x - v.x, f.y - v.y) > 300 || v.fresh;
    const k = far ? 1 : 1 - Math.exp(-dt * (f.mode === 'strike' || f.mode === 'windup' || f.mode === 'merge' ? 36 : 20)); v.x += (f.x - v.x) * k; v.y += (f.y - v.y) * k; v.fresh = false;
    v.speed = dt > 0 ? Math.hypot(v.x - px0, v.y - py0) / dt : 0;
    const chestX = w.px, chestY = w.py - 30;
    // lifecycle transitions
    if (v.prevMode !== f.mode) {
      if (v.prevMode === 'merge' && f.mode === 'gone') this.fuse(v, def, w);
      if (f.mode === 'merge' && v.prevMode !== 'merge') v.spawn(famFxKey(def.id, 'sigil'), v.x, v.y + 14, 'ring', 0.5, 0.45, 0.2, 0.85, def.accent, 3.8);
      if (f.mode === 'reform' && (v.prevMode === 'gone' || v.prevMode === 'merge' || v.prevMode === '')) { v.spawn(famFxKey(def.id, 'burst'), f.k ? chestX : v.x, f.k ? chestY : v.y - def.hover * 0.5, 'burst', 0.5, 0.14, 0.7, 0.9, def.edge, 10.8); v.spawn(famFxKey(def.id, 'sigil'), v.x, v.y + 12, 'ring', 0.9, 0.25, 0.8, 0.9, def.accent, 3.8); }
      v.prevMode = f.mode;
    }
    if (f.mode === 'gone') { v.body.setVisible(false); v.glow.setVisible(false); v.sigil.setVisible(false); v.link.clear(); v.g.clear(); v.tick(dt); return; }
    // impacts and strike streaks from the sim's own ledger
    for (const q of f.fx) if (q.at > v.lastFx) {
      v.lastFx = Math.max(v.lastFx, q.at); const big = q.k === 3 || q.k === 4, rot = Math.atan2(q.y - (v.y - def.hover * 0.4), q.x - v.x);
      v.spawn(famFxKey(def.id, 'burst'), q.x, q.y - 8, 'burst', big ? 0.4 : 0.26, big ? 0.16 : 0.1, big ? 0.55 : 0.28, 0.9, 0xffffff, 10.7);
      if (q.k <= 2 || q.k === 3) v.spawn(famFxKey(def.id, 'shot'), q.x, q.y - 8, 'shot', 0.22, 0.34, 0.5, 0.85, 0xffffff, 10.6, q.k === 4 ? 0 : rot, 1, 0.5);
      if (q.k === 4) v.spawn(famFxKey(def.id, 'sigil'), q.x, q.y + 6, 'ring', 0.45, 0.25, 0.8, 0.85, def.accent, 3.8);
    }
    // frame, scale and alpha by mode
    const heroHurt = T - f.hurt < 0.28, moving = v.speed > 70; let frame = 0, alpha = 1, scl = 1, lift = def.hover, tilt = 0;
    const bob = Math.sin(v.clock * (moving ? 9 : 3.2)) * (moving ? 3 : 4.5) * (def.hover ? 1 : 0.3);
    if (f.mode === 'reform') { const u = clamp01(f.t / (f.k ? FAM_REFORM : FAM_SPAWN)), e = easeOut(u); alpha = e; scl = 0.35 + 0.65 * e; frame = Math.floor(v.clock * 8) % 4; lift = def.hover * e; }
    else if (f.mode === 'merge') { const u = clamp01(f.t / FAM_MERGE); alpha = 1 - u * u; scl = 1 - 0.78 * easeOut(u); frame = 4 + Math.floor(v.clock * 14) % 4; lift = def.hover * (1 - u) + 14 * u; tilt = u * 0.9; }
    else if (f.mode === 'windup') { frame = 8; scl = 1 + 0.06 * clamp01(f.t / def.windup); }
    else if (f.mode === 'strike') { frame = 9; scl = 1.1; }
    else if (f.mode === 'recover') { frame = 10; }
    else if (heroHurt) frame = 11; else frame = moving ? 4 + Math.floor(v.clock * 12) % 4 : Math.floor(v.clock * 6) % 4;
    const flip = f.face === -1, yy = v.y - lift + bob, dep = v.y > w.py ? 10.4 : 9.6;
    v.put(tex, frame);
    const origX = flip ? 1 - ox : ox, rot = flip ? -tilt : tilt;
    v.body.setVisible(true).setOrigin(origX, oy).setFlipX(flip).setScale(sc * scl).setPosition(Math.round(v.x), Math.round(yy)).setAlpha(alpha).setRotation(rot).setDepth(dep).clearTint();
    // emergence / windup glow over the body
    const glowA = f.mode === 'reform' ? (1 - clamp01(f.t / (f.k ? FAM_REFORM : FAM_SPAWN))) * 0.85 : f.mode === 'merge' ? clamp01(f.t / FAM_MERGE) * 0.8 : f.mode === 'windup' ? 0.28 * clamp01(f.t / def.windup) : 0;
    if (glowA > 0.02) { v.glow.setVisible(true).setOrigin(origX, oy).setFlipX(flip).setScale(sc * scl).setPosition(Math.round(v.x), Math.round(yy)).setRotation(rot).setDepth(dep + 0.01).setAlpha(glowA); v.glow.tintMode = Phaser.TintModes.FILL; v.glow.setTint(def.edge); } else v.glow.setVisible(false);
    // ground shadow and summon sigil
    v.g.clear(); const sh = clamp01(1 - lift / 120); v.g.fillStyle(0x000000, 0.26 * alpha * sh).fillEllipse(v.x, v.y + 14, 52 * (0.7 + 0.3 * sh) * scl, 13 * scl);
    if (f.mode === 'reform') { const u = clamp01(f.t / (f.k ? FAM_REFORM : FAM_SPAWN)); v.sigil.setTexture(famFxKey(def.id, 'sigil')).setVisible(true).setPosition(v.x, v.y + 12).setScale(0.28 + 0.16 * u).setAlpha(0.8 * (1 - u) ** 1.4).setTint(def.accent).setRotation(0); }
    else v.sigil.setVisible(false);
    // hero-beast bond: a thread during fusion / re-forming, a few drifting motes while it follows
    v.link.clear();
    if (f.mode === 'merge' || (f.mode === 'reform' && f.k === 1)) {
      const u = f.mode === 'merge' ? clamp01(f.t / FAM_MERGE) : 1 - clamp01(f.t / FAM_REFORM), a = (f.mode === 'merge' ? 0.55 * (1 - u * 0.4) : 0.4 * u), bx = v.x, by = yy - 8;
      v.link.lineStyle(2.2, def.edge, a); v.link.beginPath(); v.link.moveTo(bx, by); v.link.lineTo(bx + (chestX - bx) * 0.5 + Math.sin(v.clock * 20) * 4, by + (chestY - by) * 0.5 + Math.cos(v.clock * 17) * 4); v.link.lineTo(chestX, chestY); v.link.strokePath();
    }
    if (!reduced) {
      v.moteT -= dt; const active = f.mode === 'merge' || f.mode === 'reform' || (f.mode === 'follow' && moving && v.speed > 140);
      if (active && v.moteT <= 0) { v.moteT = f.mode === 'follow' ? 0.09 : 0.035; const a = v.clock * 37; v.spawn(vfxKey('spark', false), v.x - (flip ? -1 : 1) * 10 + Math.cos(a) * 8, yy + Math.sin(a) * 8, 'mote', 0.45, 0.2, 0.05, 0.7, def.edge, 9.5, 0, 0.5, 0.5, Math.cos(a) * 26, Math.sin(a) * 26 - 12); }
    }
    v.tick(dt);
  }
  destroy() { for (const v of this.views.values()) v.destroy(); this.views.clear(); }
}

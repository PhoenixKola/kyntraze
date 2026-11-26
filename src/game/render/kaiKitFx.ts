import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { CHAIN, CRUCIBLE, ECHO, METEOR, RISE, SCATTER, STRIKES } from '../../content/kaiKit';
import { blueKey } from './vexTint';
import { beamOrigin } from '../../sim/AbilitySystem';
import { KAI_GROUND_DY } from '../../assets/kaiAnimation';
import { kaiTextureKey, clipFrame, type KaiManifests } from '../../assets/kaiAnimation';

export const KK_FX = ['orb', 'burst', 'pillar', 'tele', 'sigil', 'halo', 'erupt', 'comet', 'tpring', 'sbeam', 'slash', 'glyph'] as const;
export const kkKey = (n: string) => `kk-${n}`;
export const kkUrl = (n: string) => `/art/kaikit/${n}.png`;
const GOLD = 0xffb23a, HOT = 0xfff0b0, SILVER = 0xcfd8ff, LAV = 0xb9a8ff;
interface Pop { im: Phaser.GameObjects.Image; t: number; dur: number; w: number; grow: number; rise: number; fade: 'out' | 'inout'; rot: number; spin: number }

/** Presentation of the reworked Kai kit. Reads only sim state (hx.kk, abilityEvents, cast, the chain); never changes it. Sprites are the ImageGen sheets under art/kaikit; Graphics is used only for cheap telegraph strokes and bars. */
export class KaiKitFx {
  private pops: Pop[] = []; private g: Phaser.GameObjects.Graphics; private lastEvent = 0; private orbs = new Map<number, Phaser.GameObjects.Image>();
  private clone: Phaser.GameObjects.Sprite | null = null; private cloneGlow: Phaser.GameObjects.Sprite | null = null; private cloneGlyph: Phaser.GameObjects.Image | null = null; private cloneT = 0; private surgeClock = 0;
  private sigil: Phaser.GameObjects.Image | null = null; private tele: Phaser.GameObjects.Image[] = []; private beam: Phaser.GameObjects.Image | null = null;
  constructor(private readonly scene: Phaser.Scene, private readonly f3?: KaiManifests) { this.g = scene.add.graphics().setDepth(3.6); }
  private has(n: string) { return this.scene.textures.exists(kkKey(n)); }
  private pop(n: string, x: number, y: number, w: number, dur: number, o: Partial<Pop> & { depth?: number; tint?: number; blend?: Phaser.BlendModes; origin?: [number, number]; flipY?: boolean; blue?: boolean } = {}) {
    if (!this.has(n)) return null;
    const im = this.scene.add.image(x, y, o.blue ? blueKey(this.scene, kkKey(n)) : kkKey(n)).setDepth(o.depth ?? 11).setBlendMode(o.blend ?? Phaser.BlendModes.ADD).setAlpha(0); if (o.tint !== undefined) im.setTint(o.tint); if (o.origin) im.setOrigin(...o.origin); im.setRotation(o.rot ?? 0);
    this.pops.push({ im, t: 0, dur, w: w_(w), grow: o.grow ?? 1.25, rise: o.rise ?? 0, fade: o.fade ?? 'out', rot: o.rot ?? 0, spin: o.spin ?? 0 }); return im;
  }
  update(dt: number, s: GameState, reduced: boolean, scale = 1) {
    this.g.clear(); const k = s.hx.kk, p = s.player, gy = KAI_GROUND_DY;
    for (const ev of s.abilityEvents) {
      if (ev.id <= this.lastEvent) continue; this.lastEvent = ev.id;
      switch (ev.kind) {
        case 'scatter_fire': this.pop('burst', ev.x, ev.y, 34, 0.12, { grow: 1.6, tint: HOT }); break;
        case 'scatter_blast': this.pop('burst', ev.x, ev.y, SCATTER.blast * 2.4, 0.26, { grow: 1.5, rot: Math.random() * 6.28 }); break;
        case 'flare_pillar': if (!reduced) for (let i = 0; i < 8; i++) this.pop('burst', ev.x + (Math.random() - 0.5) * 60, ev.y + 20, 10 + Math.random() * 14, 0.7 + Math.random() * 0.4, { depth: 10.9, grow: 0.4, tint: i % 2 ? GOLD : HOT, rise: 90 + Math.random() * 160 }); this.pop('pillar', ev.x, ev.y + 26, 150, 0.55, { origin: [0.5, 0.94], grow: 1.12, depth: 10.6 }); this.pop('burst', ev.x, ev.y + 20, RISE.radius * 2.4, 0.3, { depth: 3.8, grow: 1.4 }); if (!reduced) this.scene.cameras.main.shake(70, 0.0016); break;
        case 'crucible_cast': this.pop('halo', p.x, p.y + gy - 96, 120, CRUCIBLE.windup + 0.2, { fade: 'inout', grow: 1.1, depth: 12 }); break;
        case 'crucible_pulse': this.pop('burst', ev.x, ev.y + 18, (CRUCIBLE.radius) * 2, 0.35, { depth: 3.8, grow: 1.25, tint: GOLD }); if (!reduced) this.scene.cameras.main.shake(60, 0.0014); break;
        case 'crucible_final': this.pop('erupt', ev.x, ev.y + 30, 210, 0.9, { origin: [0.5, 0.92], grow: 1.15, depth: 10.8 }); this.pop('burst', ev.x, ev.y + 18, CRUCIBLE.radius * 2.3, 0.5, { depth: 3.9, grow: 1.6 }); if (!reduced) this.scene.cameras.main.shake(180, 0.0034); break;
        case 'meteor_beat': { const last = (ev.n ?? 0) >= 100, hit = (last ? (ev.n ?? 0) - 100 : (ev.n ?? 0)) > 0; if (hit && !reduced) this.pop('comet', ev.x + 30, ev.y - 260, last ? 150 : 100, 0.16, { depth: 11.6, grow: 0.8, rise: -1500, rot: Math.PI / 2 + 0.25, tint: HOT }); if (hit) this.pop('comet', ev.x, ev.y - 8, last ? 190 : 120, last ? 0.4 : 0.26, { grow: 1.5, rot: Math.random() * 6.28 }); break; }   // B32: contact frames, sparks, shake and hit-stop live in b32Fx (only on a real hit)
        case 'surge_start': this.pop('tele', p.x, p.y + gy + 2, 150, 0.45, { depth: 3.8, grow: 1.5, blue: true }); break;
        case 'clone_spawn': this.pop('tpring', ev.x, ev.y + gy - 20, 130, 0.4, { tint: LAV, grow: 1.5 }); break;
        case 'clone_end': this.pop('tpring', ev.x, ev.y + gy - 20, 110, 0.35, { tint: LAV, grow: 1.3 }); break;
        case 'rift_hop': this.pop('tpring', ev.x, ev.y + gy - 18, 150, 0.32, { tint: SILVER, grow: 1.6 }); break;
        case 'rift_fire': if ((ev.n ?? 0) >= 3) this.pop('tpring', p.x, p.y + gy - 18, 130, 0.3, { tint: SILVER, grow: 1.5 }); break;
        case 'reversal_strike': this.pop('slash', ev.x, ev.y - 6, 96, 0.22, { tint: SILVER, rot: (Math.random() - 0.5) * 1.2, grow: 1.3 }); this.pop('tpring', p.x, p.y + gy - 18, 90, 0.2, { tint: SILVER, grow: 1.4 }); break;
        default: break;
      }
    }
    // pops
    for (let i = this.pops.length - 1; i >= 0; i--) { const q = this.pops[i]; q.t += dt; const u = q.t / q.dur; if (u >= 1) { q.im.destroy(); this.pops.splice(i, 1); continue; }
      const sc = (q.w / q.im.width) * (1 + (q.grow - 1) * (1 - (1 - u) ** 2)); q.im.setScale(sc).setAlpha(q.fade === 'inout' ? Math.sin(u * Math.PI) : u < 0.12 ? u / 0.12 : 1 - (u - 0.12) / 0.88); q.im.y -= q.rise * dt; if (q.spin) q.im.rotation += q.spin * dt; }
    if (!k) { this.hideAll(); return; }
    // scatter orbs
    const live = new Set<number>(); for (const sh of k.shots) { live.add(sh.id); let im = this.orbs.get(sh.id); if (!im && this.has('orb')) { im = this.scene.add.image(sh.x, sh.y, kkKey('orb')).setBlendMode(Phaser.BlendModes.ADD).setDepth(11.4).setOrigin(0.82, 0.5); im.setScale(84 / im.width); this.orbs.set(sh.id, im); } if (im) { im.setPosition(sh.x, sh.y).setRotation(sh.ang); if (!reduced && Math.random() < 0.7) this.pop('burst', sh.x - Math.cos(sh.ang) * 18 + (Math.random() - 0.5) * 8, sh.y - Math.sin(sh.ang) * 18 + (Math.random() - 0.5) * 8, 14 + Math.random() * 14, 0.28, { depth: 11.2, grow: 0.4, tint: Math.random() < 0.5 ? GOLD : 0xff6a1a, rise: 14 }); } }
    for (const [id, im] of this.orbs) if (!live.has(id)) { im.destroy(); this.orbs.delete(id); }
    // rising flare telegraph
    const rd = k.riseDir;
    for (const pl of k.pillars) {
      if (pl.fired) continue; const lead = Math.max(0, Math.min(1, 1 - (pl.at - s.time) / (RISE.windup + 0.4)));
      this.g.lineStyle(2, GOLD, 0.35 + 0.5 * lead); this.g.strokeEllipse(pl.x, pl.y + 20, pl.r * 2, pl.r * 0.9); this.g.fillStyle(GOLD, 0.08 + 0.12 * lead); this.g.fillEllipse(pl.x, pl.y + 20, pl.r * 2, pl.r * 0.9);
    }
    void rd;
    // crucible zone (persists independently of the cast)
    const z = k.crucible;
    if (z) {
      if (!this.sigil && this.has('sigil')) this.sigil = this.scene.add.image(z.x, z.y + 18, kkKey('sigil')).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.5);
      const u = z.t / z.life; if (this.sigil) { this.sigil.setPosition(z.x, z.y + 18).setDisplaySize(z.r * 2.3, z.r * 1.15).setAlpha(Math.min(1, z.t * 5) * (0.75 + 0.25 * Math.sin(z.t * 9))).setRotation(0).setVisible(true); }
      this.g.lineStyle(2, GOLD, 0.7); this.g.strokeEllipse(z.x, z.y + 18, z.r * 2, z.r); this.g.lineStyle(2, HOT, 0.5 * u); this.g.strokeEllipse(z.x, z.y + 18, z.r * 2 * (1 - u * 0.6), z.r * (1 - u * 0.6));
    } else if (this.sigil) this.sigil.setVisible(false);
    // silver echo
    this.updateClone(dt, s, reduced, scale);
    // surge: a quick blue flicker around the boots while active
    if (k.surge > 0 && p.form === 0 && !reduced) { this.surgeClock += dt; if (this.surgeClock > 0.22 && (p.vx !== 0 || p.vy !== 0 || s.hx.moving)) { this.surgeClock = 0; this.pop('burst', p.x, p.y + gy, 46, 0.2, { depth: 9, blue: true, grow: 1.5 }); } }
    // silver rift follow-up beams
    const c = s.cast, ch = c?.chain;
    if (c && ch && ch.state === 'fire' && this.has('sbeam')) {
      const o = beamOrigin(s, c); if (!this.beam) this.beam = this.scene.add.image(o.x, o.y, kkKey('sbeam')).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0, 0.5).setDepth(10.9);
      const u = Math.max(0, Math.min(1, ((c.rt ?? 0) - ch.fireAt) / (CHAIN.pulses * CHAIN.pulseEvery + 0.03)));
      this.beam.setPosition(o.x, o.y).setRotation(Math.atan2(c.dirY, c.dirX)).setDisplaySize(c.len, 34 * (1 - 0.5 * u)).setAlpha(1 - u * 0.5).setVisible(true);
    } else this.beam?.setVisible(false);
    // reversal radius cue: a thin silver ring, only while the chain runs
    if (c && c.kind === 'reversal' && !c.released) { const R = 280 * s.mods.sphereRadius; this.g.lineStyle(1.5, SILVER, 0.28 + 0.1 * Math.sin(s.time * 8)); this.g.strokeEllipse(p.x, p.y + gy - 2, R * 2, R * 1.05); }
    void METEOR; void STRIKES;
  }
  private frameOf(face: string, clip: string, t: number): { key: string; frame: number; ox: number; oy: number; w: number; h: number } | null {
    const m = this.f3?.[face as 'south']; const a = m?.animations?.[clip as 'Idle']; if (!m || !a) return null;
    const key = kaiTextureKey(face as 'south', clip as 'Idle', 'f3'); if (!this.scene.textures.exists(key)) return null;
    const frame = clip === 'BasicPunch' ? Math.min(a.frames - 1, Math.floor((t % 0.3) / 0.3 * a.frames)) : Math.floor(t * a.fps) % a.frames, fr = clipFrame(m, clip as 'Idle');
    return { key, frame, ox: fr.ox, oy: fr.oy, w: fr.w, h: fr.h };
  }
  private updateClone(dt: number, s: GameState, reduced: boolean, scale: number) {
    const c = s.hx.kk?.clone; if (!c) { this.clone?.setVisible(false); this.cloneGlow?.setVisible(false); this.cloneGlyph?.setVisible(false); return; }
    this.cloneT += dt; const clip = c.swing > 0 ? 'BasicPunch' : c.moving ? 'Run' : 'Idle', f = this.frameOf(c.face, clip, this.cloneT);
    const fy = c.y + KAI_GROUND_DY;
    if (f) {
      if (!this.clone) this.clone = this.scene.add.sprite(c.x, fy, f.key, f.frame);
      if (this.clone.texture.key !== f.key) this.clone.setTexture(f.key); this.clone.setFrame(f.frame).setOrigin(f.ox / f.w, f.oy / f.h).setPosition(Math.round(c.x), Math.round(fy)).setScale(scale).setDepth(9.8 + fy / 16000).setVisible(true);
      const fade = Math.min(1, c.life * 3) * (c.life < 1.5 ? 0.55 + 0.45 * Math.abs(Math.sin(c.life * 9)) : 1);   // the last 1.5 s the double flickers: it is about to dissolve
      this.clone.setTint(c.flash > 0 ? 0xffffff : 0xcfd8ff); this.clone.tintMode = Phaser.TintModes.FILL; this.clone.setAlpha(fade * (c.flash > 0 ? 0.95 : 0.7));   // a pale silver silhouette, clearly not Kai and not a second player
      if (!this.cloneGlow) this.cloneGlow = this.scene.add.sprite(c.x, fy, f.key, f.frame).setBlendMode(Phaser.BlendModes.ADD);
      if (this.cloneGlow.texture.key !== f.key) this.cloneGlow.setTexture(f.key); this.cloneGlow.setFrame(f.frame).setOrigin(f.ox / f.w, f.oy / f.h).setPosition(Math.round(c.x), Math.round(fy) - 1).setScale(scale * 1.08).setDepth(9.79 + fy / 16000).setVisible(!reduced).setTint(0x8f9bff).setAlpha(fade * (0.28 + 0.1 * Math.sin(this.cloneT * 7))); this.cloneGlow.tintMode = Phaser.TintModes.FILL;
    }
    if (this.has('glyph')) { if (!this.cloneGlyph) this.cloneGlyph = this.scene.add.image(0, 0, kkKey('glyph')).setBlendMode(Phaser.BlendModes.ADD).setDepth(12); this.cloneGlyph.setPosition(c.x, fy - 92).setDisplaySize(22, 22).setTint(LAV).setAlpha(0.9).setVisible(true).rotation += dt * 1.2; }
    const w = 34, hp = Math.max(0, c.hp / c.maxHp), life = Math.max(0, c.life / c.maxLife);
    this.g.fillStyle(0x050912, 0.8).fillRect(c.x - w / 2, fy - 82, w, 5); this.g.fillStyle(hp > 0.35 ? LAV : 0xff6a7a, 1).fillRect(c.x - w / 2 + 1, fy - 81, (w - 2) * hp, 3); this.g.fillStyle(SILVER, 0.7).fillRect(c.x - w / 2, fy - 76, w * life, 1.5);
    if (!reduced) { this.g.lineStyle(1.5, LAV, 0.55); this.g.strokeEllipse(c.x, fy - 2, 40, 13); }
    void ECHO;
  }
  private hideAll() { this.sigil?.setVisible(false); this.clone?.setVisible(false); this.cloneGlow?.setVisible(false); this.cloneGlyph?.setVisible(false); this.beam?.setVisible(false); for (const im of this.orbs.values()) im.destroy(); this.orbs.clear(); }
  destroy() { for (const q of this.pops) q.im.destroy(); this.pops = []; this.hideAll(); this.sigil?.destroy(); this.clone?.destroy(); this.cloneGlow?.destroy(); this.cloneGlyph?.destroy(); this.beam?.destroy(); this.g.destroy(); for (const t of this.tele) t.destroy(); }
}
const w_ = (n: number) => n;

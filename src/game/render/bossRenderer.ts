import Phaser from 'phaser';
import { kick } from './cameraKick';
import type { Enemy, GameState } from '../../sim/GameState';
import { BOSSES, SERAPH, WARDEN } from '../../content/bosses';
import { groundDy, type BossKind } from '../../content/enemies';
import { FxPool } from './fxPool';
import { enemyFxKey } from './enemyRenderer';
import { vfxKey } from './fxPool';

/** B08 boss art: 16-frame ImageGen pose flipbooks (4x4 grid, east-facing, mirrored for west). Frame meaning comes from the sheet manifest's `named` map. All hostile areas are drawn from the sim's own hazards/timeline. */
export const BOSS_KINDS: BossKind[] = ['warden', 'seraph'];
import { B17_NAMES, SERAPH_DEATH_S } from './bossPresentation';
export { B17_NAMES, SERAPH_DEATH_S };
const b17 = (n: (typeof B17_NAMES)[number]) => bossFxKey('b17/' + n);
export const BOSS_FX_NAMES = ['cone-warn', 'cone-strike', 'rupture-burst', 'rupture-crater', 'shock-ring', 'boss-burst', 'warning-glyph', 'emblem-warden', 'prism-bolt', 'prism-hit', 'orb-bolt', 'blink-sigil', 'blink-flash', 'shield-block', 'aura-ring', 'emblem-seraph', ...B17_NAMES.map(n => 'b17/' + n)] as const;
export const bossSheetKey = (k: BossKind) => `boss-sheet-${k}`;
export const bossSheetUrl = (k: BossKind) => `/art/bosses/${k}.png`;
export const bossManifestKey = (k: BossKind) => `boss-manifest-${k}`;
export const bossManifestUrl = (k: BossKind) => `/art/bosses/${k}.json`;
export const bossFxKey = (n: string) => `boss-fx-${n}`;
export const bossFxUrl = (n: string) => `/art/bosses/fx/${n}.png`;
export interface BossManifest { frame_width: number; frame_height: number; origin_px: [number, number]; frames: number; fps: number; columns?: number; clips: Record<string, number[]>; named: Record<string, number | number[]> }
const SCALE = 0.5;
const TELE_DEPTH = 5.6;

interface Ghost { spr: Phaser.GameObjects.Sprite; age: number; life: number; kind: BossKind; baseY: number; x: number; marks: number; clock: number }
const PURPLE = 0xb08cff, CRIMSON = 0xff3a6e, DUST = 0x7a5a6a;   // hostile dust is a muddy mauve, never Kai's cyan / gold

export class BossRenderer {
  private readonly manifests = {} as Record<BossKind, BossManifest>;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private glow: Phaser.GameObjects.Sprite | null = null;
  private spriteKind: BossKind | null = null;
  private bossId = 0;
  private t = 0; private hp = 0; private flash = 0; private face: 1 | -1 = 1;
  private ghost: Ghost | null = null;
  private readonly imgs: Phaser.GameObjects.Image[] = [];
  private used = 0;
  private readonly pool: FxPool;
  private craters: { img: Phaser.GameObjects.Image; age: number }[] = [];
  private lastEventId = 0;
  private phaseGlow: Phaser.GameObjects.Sprite | null = null; private exposedGlow: Phaser.GameObjects.Sprite | null = null; private halo: Phaser.GameObjects.Image | null = null; private orbit: Phaser.GameObjects.Image[] = [];
  private introMarks = new Set<number>(); private clockA = 0; private clockB = 0;

  constructor(private readonly scene: Phaser.Scene) {
    for (const k of BOSS_KINDS) this.manifests[k] = scene.cache.json.get(bossManifestKey(k)) as BossManifest;
    this.pool = new FxPool(scene, 110);
  }
  /** QA: whether the boss sprite exists, how many telegraph images are in use, pooled fx and crater decals. */
  stats() { return { boss: this.sprite?.visible ? 1 : 0, tele: this.used, fx: this.pool.count, craters: this.craters.length, ghost: this.ghost ? 1 : 0 }; }

  private frameIdx(k: BossKind, name: string, i = 0): number { const v = this.manifests[k].named[name]; return Array.isArray(v) ? v[Math.min(i, v.length - 1)] : (v ?? 0); }
  private sheetSprite(k: BossKind) {
    const m = this.manifests[k];
    return this.scene.add.sprite(0, 0, bossSheetKey(k), 0).setOrigin(m.origin_px[0] / m.frame_width, m.origin_px[1] / m.frame_height).setScale(SCALE);
  }
  private img(key: string): Phaser.GameObjects.Image {
    let i = this.imgs[this.used]; if (!i) { i = this.scene.add.image(0, 0, key); this.imgs.push(i); }
    this.used++; return i.setTexture(key).setVisible(true).setDepth(TELE_DEPTH).setOrigin(0.5, 0.5).setRotation(0).setScale(1).setAlpha(1).clearTint().setBlendMode(Phaser.BlendModes.NORMAL);
  }
  private texW(key: string) { return this.scene.textures.get(key).getSourceImage().width; }
  private texH(key: string) { return this.scene.textures.get(key).getSourceImage().height; }

  private events(state: GameState, reduced: boolean) {
    for (const ev of state.enemyEvents) {
      if (ev.id <= this.lastEventId) continue; this.lastEventId = ev.id;
      if (ev.kind === 'hazard_fire') {
        if (ev.tag === 'rupture') {
          const w = this.texW(bossFxKey('rupture-burst'));
          this.pool.spawn({ key: bossFxKey('rupture-burst'), x: ev.x, y: ev.y - 14, depth: 10.2, life: 0.38, s0: (WARDEN.rupture.radius * 1.5) / w, s1: (WARDEN.rupture.radius * 1.9) / w, a0: 1, a1: 0, oy: 0.7 });
          this.addCrater(ev.x, ev.y, WARDEN.rupture.radius * 2 / this.texW(bossFxKey('rupture-crater')));
          kick(this.scene.cameras.main, 70, 0.0022, reduced);
        } else if (ev.tag === 'residue') {
          const w = this.texW(bossFxKey('rupture-burst'));
          this.pool.spawn({ key: bossFxKey('rupture-burst'), x: ev.x, y: ev.y - 10, depth: 10.2, life: 0.35, s0: (SERAPH.blink.residueRadius * 1.5) / w, s1: (SERAPH.blink.residueRadius * 1.9) / w, a0: 1, a1: 0, oy: 0.7 });
        } else if (ev.tag === 'sweep') {
          const w = this.texW(bossFxKey('cone-strike'));
          this.pool.spawn({ key: bossFxKey('cone-strike'), x: ev.x, y: ev.y, depth: 10.1, life: 0.22, s0: WARDEN.sweep.radius / w, s1: WARDEN.sweep.radius / w * 1.04, a0: 0.95, a1: 0, rot: Math.atan2(ev.dirY, ev.dirX), ox: 0, oy: 0.5 });
          kick(this.scene.cameras.main, 90, 0.003, reduced);
        }
      } else if (ev.kind === 'enemy_phase') {
        const w = this.texW(bossFxKey('shock-ring')), r = ev.enemy === 'warden' ? 190 : 170;
        this.pool.spawn({ key: bossFxKey('shock-ring'), x: ev.x, y: ev.y + 12, depth: 10, life: 0.7, s0: 0.2 * r * 2 / w, s1: r * 2 / w, a0: 1, a1: 0 });
        kick(this.scene.cameras.main, 260, 0.0035, reduced);
        this.phaseBreak(ev.enemy as BossKind, ev.x, ev.y, reduced);
      } else if (ev.kind === 'enemy_intro') {
        if (ev.enemy === 'seraph') this.pool.spawn({ key: bossFxKey('blink-flash'), x: ev.x, y: ev.y, depth: 10.3, life: 0.9, s0: 1.6, s1: 1.1, a0: 0.9, a1: 0, oy: 1 });
      } else if (ev.kind === 'enemy_strike' && ev.tag === 'blink_in') {
        this.pool.spawn({ key: bossFxKey('blink-flash'), x: ev.x, y: ev.y, depth: 10.3, life: 0.3, s0: 1.0, s1: 0.7, a0: 0.9, a1: 0, oy: 1 });
      } else if (ev.kind === 'enemy_strike' && ev.tag === 'rush_end') {
        const w = this.texW(bossFxKey('shock-ring'));
        this.pool.spawn({ key: bossFxKey('shock-ring'), x: ev.x, y: ev.y + 20, depth: 10, life: 0.4, s0: 0.2, s1: 110 / w, a0: 0.9, a1: 0 });
        kick(this.scene.cameras.main, 110, 0.0035, reduced);
      } else if (ev.kind === 'enemy_death' && ev.tag === 'boss') this.startDeath(ev.enemy as BossKind, ev.x, ev.y, reduced);
    }
  }

  /** Phase break (decorative, never damaging): the Warden's armour cracks apart and sheds slabs, the Seraph's halo shatters and flies outward. The persistent phase-2 look is drawn in `drawStates`. */
  private phaseBreak(k: BossKind, x: number, y: number, reduced: boolean) {
    const pool = this.pool, rnd = Math.random;
    if (k === 'warden') {
      pool.spawn({ key: b17('core_flash'), x, y: y - 36, depth: 10.6, life: 0.5, blend: 'add', tint: CRIMSON, s0: 0.5, s1: 1.7, a0: 0.9, a1: 0, rot: 0.2 });
      pool.spawn({ key: b17('crack_star'), x, y: y + 22, depth: 2.7, life: 2.4, s0: 0.5, s1: 1.7, sy: 0.5, a0: 0.85, a1: 0 });
      if (reduced) return;
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.6, v = 150 + rnd() * 140; pool.spawn({ key: b17(i % 3 === 0 ? 'slab_m' : i % 3 === 1 ? 'splinters' : 'slab_l'), x, y: y - 40, depth: 10.2, life: 1.0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, ay: 560, s0: 0.3 + rnd() * 0.25, s1: 0.2, a0: 1, a1: 0, rot: rnd() * 6, spin: (rnd() - 0.5) * 10 }); }
    } else {
      pool.spawn({ key: b17('glint'), x, y: y - 40, depth: 10.6, life: 0.5, blend: 'add', tint: 0xffffff, s0: 0.4, s1: 2.0, a0: 1, a1: 0 });
      pool.spawn({ key: b17('halo'), x, y: y - 82, depth: 10.3, life: 0.9, blend: 'add', tint: PURPLE, s0: 0.5, s1: 3.0, a0: 0.9, a1: 0 });
      if (reduced) return;
      for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.5, v = 140; pool.spawn({ key: b17('halo_arc'), x, y: y - 70, depth: 10.2, life: 1.0, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, s0: 0.45, s1: 0.3, a0: 1, a1: 0, rot: a, spin: 3 }); }
      for (let i = 0; i < 8; i++) pool.spawn({ key: b17('motes'), x: x + (rnd() - 0.5) * 60, y: y - 40 + (rnd() - 0.5) * 60, depth: 10.4, life: 1.2, blend: 'add', vy: -30 - rnd() * 40, s0: 0.25, s1: 0.12, a0: 1, a1: 0 });
    }
  }

  /** Scripted death beats driven by the ghost's own clock (render only; the sim already removed the boss and its hazards). Warden: stagger, three fracture bursts, core collapse. Seraph: implosion, suspension, shimmer shockwave, dissolve. */
  private deathScript(g: Ghost, u: number, dt: number, reduced: boolean) {
    const pool = this.pool, rnd = Math.random, x = g.x, cy = g.baseY - (g.kind === 'seraph' ? 52 : 46), w = this.texW(bossFxKey('shock-ring'));
    const mark = (i: number, at: number) => { if (u >= at && g.marks < i + 1) { g.marks = i + 1; return true; } return false; };
    if (g.kind === 'warden') {
      for (const [i, at] of [[0, 0.1], [1, 0.3], [2, 0.5]] as const) if (mark(i, at)) {
        const dx = (i - 1) * 26;
        pool.spawn({ key: b17('core_flash'), x: x + dx, y: cy + (i % 2 ? 14 : -10), depth: 10.6, life: 0.28, blend: 'add', tint: CRIMSON, s0: 0.3, s1: 0.8, a0: 0.9, a1: 0, rot: i });
        pool.spawn({ key: b17('crack_star'), x: x + dx, y: g.baseY + 4, depth: 2.7, life: 1.6, s0: 0.3, s1: 0.7, sy: 0.5, a0: 0.8, a1: 0 });
        kick(this.scene.cameras.main, 70, 0.0028, reduced);
        if (!reduced) for (let n = 0; n < 2; n++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, v = 90 + rnd() * 100; pool.spawn({ key: b17(n ? 'slab_m' : 'slab_l'), x: x + dx, y: cy, depth: 6.6, life: 0.9, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, ay: 520, s0: 0.28 + rnd() * 0.12, s1: 0.2, a0: 1, a1: 0, rot: rnd() * 6, spin: (rnd() - 0.5) * 8 }); }
      }
      if (mark(3, 0.74)) {
        pool.spawn({ key: b17('core_flash'), x, y: cy, depth: 10.7, life: 0.55, blend: 'add', tint: CRIMSON, s0: 0.5, s1: 2.0, a0: 1, a1: 0 });
        pool.spawn({ key: bossFxKey('shock-ring'), x, y: g.baseY + 8, depth: 10, life: 0.8, s0: 0.2, s1: 340 / w, a0: 0.9, a1: 0 });
        kick(this.scene.cameras.main, 220, 0.0045, reduced);
        if (!reduced) for (let n = 0; n < 9; n++) { const a = (n / 9) * 6.283 + rnd() * 0.4, v = 130 + rnd() * 120; pool.spawn({ key: b17(n % 3 === 0 ? 'core_chunk' : n % 3 === 1 ? 'splinters' : 'slab_m'), x, y: cy, depth: 10.3, life: 1.0, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 70, ay: 520, s0: 0.22 + rnd() * 0.18, s1: 0.12, a0: 1, a1: 0, rot: rnd() * 6, spin: (rnd() - 0.5) * 12 }); }
      }
      if (u < 0.74) g.spr.x = Math.round(g.x + Math.sin(g.age * 70) * (1 - u) * 3 * (reduced ? 0 : 1)); else g.spr.setPosition(Math.round(g.x), Math.round(g.baseY + (u - 0.74) * 26));
    } else {
      if (u < 0.34 && !reduced) { g.clock += dt; while (g.clock > 0.045) { g.clock -= 0.045; const a = rnd() * 6.283, r = 120 + rnd() * 50, sx = x + Math.cos(a) * r, sy = cy + Math.sin(a) * r * 0.6, T = 0.3; pool.spawn({ key: b17(rnd() < 0.5 ? 'shard_long' : 'shard_cluster'), x: sx, y: sy, depth: 10.3, life: T, vx: (x - sx) / T, vy: (cy - sy) / T, s0: 0.32, s1: 0.1, a0: 0.9, a1: 1, rot: a + Math.PI / 2 }); } }
      if (mark(0, 0.34)) pool.spawn({ key: b17('halo'), x, y: cy - 36, depth: 10.3, life: 0.7, blend: 'add', tint: PURPLE, s0: 2.2, s1: 0.8, a0: 0.1, a1: 0.9 });
      if (u >= 0.34 && u < 0.55) g.spr.setPosition(Math.round(x), Math.round(g.baseY - (u - 0.34) * 40)).setScale(0.5 * (1 - 0.02 * Math.sin((u - 0.34) * 60)));
      if (mark(1, 0.55)) {
        pool.spawn({ key: b17('glint'), x, y: cy, depth: 10.7, life: 0.5, blend: 'add', tint: 0xffffff, s0: 0.5, s1: 3.0, a0: 1, a1: 0 });
        pool.spawn({ key: bossFxKey('shock-ring'), x, y: g.baseY, depth: 10, life: 1.0, blend: 'add', tint: PURPLE, s0: 0.2, s1: 420 / w, a0: 0.9, a1: 0 });
        pool.spawn({ key: b17('halo'), x, y: g.baseY - 4, depth: 5.4, life: 1.1, blend: 'add', tint: 0xe4dcff, s0: 0.6, s1: 4.2, a0: 0.8, a1: 0 });
        kick(this.scene.cameras.main, 160, 0.003, reduced);
        if (!reduced) for (let n = 0; n < 12; n++) { const a = (n / 12) * 6.283 + rnd() * 0.3, v = 190 + rnd() * 90; pool.spawn({ key: b17(n % 2 ? 'shard_long' : 'shard_cluster'), x, y: cy, depth: 10.3, life: 0.9, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, s0: 0.3, s1: 0.12, a0: 1, a1: 0, rot: a + Math.PI / 2 }); }
      }
      if (u >= 0.55) { const d = Math.min(1, (u - 0.55) / 0.4); g.spr.setScale(0.5 * (1 + 0.18 * d)).setPosition(Math.round(x), Math.round(g.baseY - 8 - d * 18)); if (!reduced) { g.clock += dt; while (g.clock > 0.06) { g.clock -= 0.06; pool.spawn({ key: b17('motes'), x: x + (rnd() - 0.5) * 70, y: cy + (rnd() - 0.5) * 70, depth: 10.4, life: 0.8, blend: 'add', vy: -50 - rnd() * 30, s0: 0.25, s1: 0.1, a0: 1, a1: 0 }); } } }
    }
  }

  /** Persistent looks: phase-2 aura (Warden: crimson heat glow + rising embers; Seraph: broken halo + orbiting shards), the exposed weak-point cue, entrance beats and attack anticipation. Hostile palette only. */
  private drawStates(state: GameState, e: Enemy, spr: Phaser.GameObjects.Sprite, frame: number, dt: number, reduced: boolean, feetY: number, hover: number) {
    const k = e.kind as BossKind, ai = e.ai!, def = BOSSES[k], pool = this.pool, rnd = Math.random, p2 = ai.phase === 2, t = this.t;
    const glowOf = (cur: Phaser.GameObjects.Sprite | null) => cur ?? this.sheetSprite(k).setBlendMode(Phaser.BlendModes.ADD);
    const place = (g: Phaser.GameObjects.Sprite, tint: number, a: number) => g.setVisible(true).setFrame(frame).setFlipX(this.face < 0).setTint(tint).setPosition(spr.x, spr.y).setScale(spr.scaleX, spr.scaleY).setDepth(spr.depth + 0.02).setAlpha(a * spr.alpha);
    if (p2 && e.mode !== 'blink') { this.phaseGlow = glowOf(this.phaseGlow); place(this.phaseGlow, k === 'warden' ? 0xff2a4a : PURPLE, reduced ? 0.2 : 0.15 + 0.1 * Math.sin(t * 3.2)); } else this.phaseGlow?.setVisible(false);
    if (ai.exposed && e.mode !== 'blink') {
      this.exposedGlow = glowOf(this.exposedGlow); place(this.exposedGlow, 0xfff0f8, reduced ? 0.18 : 0.12 + 0.12 * Math.sin(t * 9));
      if (!reduced) { this.clockB += dt; if (this.clockB > 0.16) { this.clockB = 0; pool.spawn({ key: b17('glint'), x: e.x + (rnd() - 0.5) * 36, y: feetY + hover - (k === 'warden' ? 56 : 44) + (rnd() - 0.5) * 26, depth: spr.depth + 0.1, life: 0.3, blend: 'add', tint: 0xffe0ec, s0: 0.08, s1: 0.2, a0: 1, a1: 0, rot: rnd() }); } }
    } else this.exposedGlow?.setVisible(false);
    if (k === 'warden' && p2 && !reduced) { this.clockA += dt; if (this.clockA > 0.2) { this.clockA = 0; pool.spawn({ key: b17('core_chunk'), x: e.x + (rnd() - 0.5) * 70, y: feetY - 6, depth: spr.depth + 0.1, life: 0.9, blend: 'add', tint: CRIMSON, vy: -50 - rnd() * 30, vx: (rnd() - 0.5) * 20, s0: 0.1, s1: 0.04, a0: 0.9, a1: 0 }); } }
    if (k === 'seraph') {
      const halo = this.halo ??= this.scene.add.image(0, 0, b17('halo')), hy = Math.round(spr.y - 96 + Math.sin(t * 2.4) * 2), up = p2 && e.mode !== 'blink';
      if (up) halo.setVisible(true).setPosition(Math.round(spr.x), hy).setScale(0.86 + 0.04 * Math.sin(t * 3)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.95 * spr.alpha).setDepth(spr.depth + 0.05).setTint(0xf0e8ff); else halo.setVisible(false);
      for (let i = 0; i < 3; i++) {
        const o = this.orbit[i] ??= this.scene.add.image(0, 0, b17('shard_long')), a = t * 1.5 + (i / 3) * 6.283, front = Math.sin(a) > 0;
        if (up) o.setVisible(true).setPosition(Math.round(spr.x + Math.cos(a) * 50), Math.round(spr.y - 50 + Math.sin(a) * 16)).setScale(0.4).setRotation(Math.cos(a) * 0.5).setAlpha(0.95 * spr.alpha).setDepth(spr.depth + (front ? 0.06 : -0.06)); else o.setVisible(false);
      }
    }
    if (e.mode === 'intro') {
      const into = def.intro - e.modeT, hit = (id: number, at: number) => { if (into >= at && !this.introMarks.has(id)) { this.introMarks.add(id); return true; } return false; }, w = this.texW(bossFxKey('shock-ring'));
      if (k === 'warden') {
        for (const [id, at] of [[0, 0.35], [1, 0.95], [2, 1.55]] as const) if (hit(id, at)) {
          kick(this.scene.cameras.main, 80 + id * 30, 0.0025 + id * 0.0008, reduced);
          pool.spawn({ key: bossFxKey('shock-ring'), x: e.x, y: feetY + 4, depth: 5.8, life: 0.45, s0: 0.15, s1: (90 + id * 30) / w, a0: 0.8, a1: 0 });
          if (!reduced) for (let n = 0; n < 4; n++) pool.spawn({ key: vfxKey('dust', false), x: e.x + (rnd() - 0.5) * 70, y: feetY, depth: 5.9, life: 0.55, tint: DUST, s0: 0.4, s1: 0.8, a0: 0.8, a1: 0, vy: -18, vx: (rnd() - 0.5) * 40 });
        }
        if (hit(3, 1.65)) { pool.spawn({ key: b17('core_flash'), x: e.x, y: feetY - 44, depth: 10.6, life: 0.5, blend: 'add', tint: CRIMSON, s0: 0.3, s1: 1.2, a0: 0.9, a1: 0 }); pool.spawn({ key: bossFxKey('shock-ring'), x: e.x, y: feetY + 6, depth: 5.8, life: 0.7, s0: 0.2, s1: 220 / w, a0: 0.8, a1: 0 }); }
      } else {
        if (hit(0, 0.02)) pool.spawn({ key: b17('halo'), x: e.x, y: feetY - 110, depth: 10.3, life: 0.9, blend: 'add', tint: PURPLE, s0: 0.3, s1: 2.4, a0: 0.9, a1: 0 });
        if (hit(1, 0.9)) { pool.spawn({ key: b17('glint'), x: e.x, y: feetY - 50, depth: 10.6, life: 0.4, blend: 'add', tint: 0xffffff, s0: 0.3, s1: 1.6, a0: 1, a1: 0 }); if (!reduced) for (let n = 0; n < 6; n++) { const a = (n / 6) * 6.283; pool.spawn({ key: b17('shard_long'), x: e.x, y: feetY - 50, depth: 10.3, life: 0.6, vx: Math.cos(a) * 150, vy: Math.sin(a) * 90, s0: 0.3, s1: 0.1, a0: 1, a1: 0, rot: a + Math.PI / 2 }); } }
      }
    } else if (this.introMarks.size) this.introMarks.clear();
    if (k === 'warden') {
      if (e.mode === 'windup') { const f = Math.min(1, Math.max(0, 1 - e.modeT / 1.4)); spr.setScale(0.5 * (1 + 0.03 * f), 0.5 * (1 - 0.035 * f)); this.clockA += dt; if (!reduced && this.clockA > 0.11) { this.clockA = 0; pool.spawn({ key: vfxKey('dust', false), x: e.x + (rnd() - 0.5) * 90, y: feetY, depth: 5.9, life: 0.5, tint: DUST, s0: 0.3, s1: 0.6, a0: 0.7, a1: 0, vy: -14 }); } }
      else if (e.mode === 'strike' && ai.atk === 'rush' && !reduced) { this.clockA += dt; if (this.clockA > 0.045) { this.clockA = 0; pool.spawn({ key: vfxKey('dust', false), x: e.x - e.aimX * 30 + (rnd() - 0.5) * 30, y: feetY, depth: 5.9, life: 0.5, tint: DUST, s0: 0.5, s1: 1.0, a0: 0.8, a1: 0, vy: -16, vx: -e.aimX * 20 }); } }
    }
    void state;
  }

  private addCrater(x: number, y: number, s: number) {
    if (this.craters.length >= 14) { const o = this.craters.shift()!; o.img.destroy(); }
    this.craters.push({ img: this.scene.add.image(Math.round(x), Math.round(y), bossFxKey('rupture-crater')).setScale(s).setDepth(2.5).setAlpha(0.75), age: 0 });
  }
  private startDeath(k: BossKind, x: number, y: number, reduced: boolean) {
    this.ghost?.spr.destroy();
    const def = BOSSES[k], feetY = y + groundDy(def.radius);
    const base = Math.round(feetY + (k === 'seraph' ? -10 : 0));
    const spr = this.sheetSprite(k).setFrame(this.frameIdx(k, 'death', 0)).setFlipX(this.face < 0).setDepth(6.4).setPosition(Math.round(x), base);
    // the Seraph's finale is staged longer than its sim death timer: nothing in the sim waits for it (the scene holds the victory screen for it)
    this.ghost = { spr, age: 0, life: k === 'seraph' ? SERAPH_DEATH_S : def.deathT, kind: k, baseY: base, x: Math.round(x), marks: 0, clock: 0 };
    const w = this.texW(bossFxKey('shock-ring'));
    if (k === 'warden') this.pool.spawn({ key: bossFxKey('boss-burst'), x, y: y - 40, depth: 10.4, life: 0.5, s0: 0.5, s1: 1.1, a0: 1, a1: 0 });
    else this.pool.spawn({ key: bossFxKey('shock-ring'), x, y: y + 12, depth: 10, life: 0.6, s0: 0.2, s1: 120 / w, a0: 0.7, a1: 0, tint: PURPLE });
    kick(this.scene.cameras.main, k === 'warden' ? 140 : 90, k === 'warden' ? 0.0035 : 0.002, reduced);
  }

  sync(state: GameState, dtIn: number, reduced: boolean) {
    const running = state.phase === 'running' || state.phase === 'dead' || state.phase === 'victory';
    const dt = running ? Math.min(0.1, dtIn) : 0;
    this.events(state, reduced);
    this.used = 0;
    const boss = state.enemies.find(e => (e.kind === 'warden' || e.kind === 'seraph') && e.hp > 0) ?? null;
    if (boss && boss.ai) this.drawBoss(state, boss, dt, reduced); else if (this.sprite) { this.sprite.destroy(); this.glow?.destroy(); this.glow = null; this.sprite = null; this.spriteKind = null; this.bossId = 0; this.clearExtras(); }
    this.drawHazards(state);
    for (let i = this.used; i < this.imgs.length; i++) this.imgs[i].setVisible(false);
    if (this.ghost) {
      const g = this.ghost; g.age += dt; const u = g.age / g.life, n = (this.manifests[g.kind].named.death as number[]);
      if (u >= 1) { g.spr.destroy(); this.ghost = null; }
      else {
        this.deathScript(g, u, dt, reduced);
        const frame = g.kind === 'seraph' ? n[u < 0.34 ? 0 : u < 0.55 ? 1 : 2] : n[Math.min(n.length - 1, Math.floor(u * n.length))];   // Seraph: figure shatters (implosion) -> burst star held (suspension) -> shards on the floor (dissolve)
        const fade = g.kind === 'seraph' ? (u < 0.55 ? 1 : 1 - (u - 0.55) / 0.4) : (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3);
        g.spr.setFrame(frame).setAlpha(Math.max(0, fade));
        if (u < 0.1 && g.kind === 'warden') { g.spr.setTint(0xffe6ee); g.spr.tintMode = Phaser.TintModes.FILL; } else { g.spr.clearTint(); g.spr.tintMode = Phaser.TintModes.MULTIPLY; }
      }
    }
    for (let i = this.craters.length - 1; i >= 0; i--) { const c = this.craters[i]; c.age += dt; if (c.age > 3.2) { c.img.destroy(); this.craters.splice(i, 1); } else c.img.setAlpha(0.75 * Math.min(1, (3.2 - c.age) / 1.4)); }
    this.pool.update(dt);
  }

  private drawBoss(state: GameState, e: Enemy, dt: number, reduced: boolean) {
    const k = e.kind as BossKind, ai = e.ai!, def = BOSSES[k], m = this.manifests[k], p = state.player;
    if (!this.sprite || this.spriteKind !== k || this.bossId !== e.id) { this.sprite?.destroy(); this.glow?.destroy(); this.clearExtras(); this.sprite = this.sheetSprite(k); this.glow = this.sheetSprite(k).setBlendMode(Phaser.BlendModes.ADD).setVisible(false); this.spriteKind = k; this.bossId = e.id; this.hp = e.hp; this.t = 0; this.face = p.x >= e.x ? 1 : -1; }
    const spr = this.sprite; this.t += dt;
    if (e.hp < this.hp) this.flash = 0.05; this.hp = e.hp; this.flash = Math.max(0, this.flash - dt);
    const fx = e.mode === 'move' || e.mode === 'recover' || e.mode === 'intro' || e.mode === 'phase' ? p.x - e.x : e.aimX;
    if (Math.abs(fx) > (e.mode === 'move' ? 14 : 0.15)) this.face = fx >= 0 ? 1 : -1;
    const walk = this.frameIdx(k, 'move', Math.floor(this.t * m.fps * (k === 'warden' ? 1 : 1.4)) % 4);
    let name = ''; let frame = walk;
    const atk = ai.atk;
    if (e.mode === 'intro') { const into = def.intro - e.modeT; frame = k === 'warden' ? (into < 1.6 ? walk : this.frameIdx(k, 'roar')) : (into < 0.9 ? walk : this.frameIdx(k, 'phase')); }
    else if (e.mode === 'phase') frame = this.frameIdx(k, k === 'warden' ? 'roar' : 'phase');
    else if (e.mode === 'recover') frame = this.frameIdx(k, 'recover');
    else if (e.mode === 'windup' || e.mode === 'strike') {
      const w = e.mode === 'windup';
      if (k === 'warden') name = atk === 'rupture' ? (w ? 'rupture_windup' : 'rupture_release') : atk === 'sweep' ? (w ? 'sweep_windup' : 'sweep_strike') : (w ? 'charge_windup' : 'charge_strike');
      else name = atk === 'volley' || atk === 'blink_volley' ? (w ? (atk === 'blink_volley' && e.modeT > SERAPH.blink.volleyWindup - 0.14 ? 'blink_in' : 'volley_windup') : 'volley_release') : atk === 'blink' ? 'blink_out' : (w ? 'ring_windup' : 'ring_release');
      frame = this.frameIdx(k, name);
    } else if (e.mode === 'move' && this.flash > 0) frame = this.frameIdx(k, 'hurt');
    spr.setFrame(frame).setFlipX(this.face < 0).setScale(SCALE);
    const feetY = e.y + groundDy(e.radius);
    let hover = 0, alpha = 1;
    if (k === 'seraph') {
      hover = -10 - Math.sin(this.t * 3 + 1) * 4;
      if (e.mode === 'intro') { const u = Math.min(1, (def.intro - e.modeT) / 0.9); hover -= (1 - u) * (1 - u) * 260; alpha = Math.min(1, u * 2); }
      if (e.mode === 'blink') alpha = 0;
      else if (e.mode === 'windup' && atk === 'blink') alpha = 1 - 0.7 * (1 - e.modeT / SERAPH.blink.windup);
    }
    const shake = (e.mode === 'windup' && k === 'warden' ? Math.sin(this.t * 55) * (0.5 + (1 - e.modeT / Math.max(0.01, WARDEN.rupture.windup)) * 0.8) : 0) * (reduced ? 0 : 1);
    spr.setPosition(Math.round(e.x + shake), Math.round(feetY + hover)).setDepth(6.2 + (feetY / 1600) * 1.8).setAlpha(alpha);
    // hit feedback on a large body: a short additive brighten over the same frame (a full white fill would erase the silhouette and the telegraph pose)
    if (this.glow) this.glow.setVisible(this.flash > 0 && !reduced).setFrame(frame).setFlipX(this.face < 0).setPosition(spr.x, spr.y).setDepth(spr.depth + 0.01).setAlpha(0.28);
    this.drawStates(state, e, spr, frame, dt, reduced, feetY, hover);
    this.drawAttackTele(state, e, ai, feetY, k);
  }

  /** Lines, lanes and rings that are not hazards: they follow the boss's own timeline (aim lock included) so the drawing is what will be fired. */
  private drawAttackTele(state: GameState, e: Enemy, ai: NonNullable<Enemy['ai']>, feetY: number, k: BossKind) {
    if (e.mode !== 'windup') return;
    const aim = Math.atan2(e.aimY, e.aimX), atk = ai.atk;
    const lineKey = enemyFxKey('aimline'), lw = this.texW(lineKey), lh = this.texH(lineKey);
    const total = (name: string, step: number) => (name === 'rush' ? (step === 0 ? WARDEN.rush.windup * BOSSES.warden.windupScale[ai.phase - 1] : WARDEN.rush.second * BOSSES.warden.windupScale[ai.phase - 1]) : 1);
    if (k === 'warden' && atk === 'rush') {
      const tot = total('rush', ai.step), prog = 1 - e.modeT / tot, locked = e.modeT <= tot * (1 - WARDEN.rush.trackFraction), len = WARDEN.rush.speed * WARDEN.rush.strike + e.radius;
      const lane = this.img(lineKey).setOrigin(0, 0.5).setPosition(Math.round(e.x), Math.round(feetY)).setRotation(aim).setScale(len / lw, WARDEN.rush.laneWidth / lh).setAlpha((locked ? 0.4 : 0.22) + 0.35 * prog);
      lane.setDepth(TELE_DEPTH - 0.1);
      this.img(enemyFxKey('chevron')).setPosition(Math.round(e.x + e.aimX * len), Math.round(feetY + e.aimY * len)).setRotation(aim).setScale(0.55).setAlpha(0.5 + 0.5 * prog);
    } else if (k === 'seraph' && (atk === 'volley' || atk === 'blink_volley')) {
      const n = atk === 'blink_volley' ? SERAPH.blink.count : SERAPH.volley.count[ai.phase - 1], off = ai.step === 1 ? SERAPH.volley.spread / 2 : 0, tot = atk === 'blink_volley' ? SERAPH.blink.volleyWindup : SERAPH.volley.windup * BOSSES.seraph.windupScale[ai.phase - 1];
      const prog = 1 - e.modeT / tot, locked = ai.step === 1 || atk === 'blink_volley' || e.modeT <= tot * (1 - SERAPH.volley.trackFraction);
      for (let i = 0; i < n; i++) {
        const a = aim + (i - (n - 1) / 2) * SERAPH.volley.spread + off;
        this.img(lineKey).setOrigin(0, 0.5).setPosition(Math.round(e.x), Math.round(e.y - 10)).setRotation(a).setScale(430 / lw, 0.7).setAlpha(((locked ? 0.35 : 0.2) + 0.5 * prog) * (locked ? 1 : 0.8)).setDepth(TELE_DEPTH - 0.1);
      }
    } else if (k === 'seraph' && (atk === 'ring' || atk === 'spiral')) {
      const tot = (atk === 'ring' ? (ai.step === 0 ? SERAPH.ring.windup * BOSSES.seraph.windupScale[ai.phase - 1] : SERAPH.ring.second) : SERAPH.spiral.windup * BOSSES.seraph.windupScale[ai.phase - 1]), prog = 1 - e.modeT / tot;
      const cw = this.texW(enemyFxKey('circle-warn')), R = atk === 'ring' ? 150 : 130;
      this.img(enemyFxKey('circle-warn')).setPosition(Math.round(e.x), Math.round(feetY)).setScale((R * 2) / cw).setAlpha(0.18 + 0.2 * prog);
      this.img(enemyFxKey('circle-warn')).setPosition(Math.round(e.x), Math.round(feetY)).setScale((R * 2 / cw) * (0.15 + 0.85 * prog)).setAlpha(0.2 + 0.35 * prog);
      if (atk === 'ring') for (const gc of [ai.gap + 0.7, ai.gap - 0.7, ai.gap + Math.PI]) this.img(enemyFxKey('chevron')).setPosition(Math.round(e.x + Math.cos(gc) * (R + 18)), Math.round(feetY + Math.sin(gc) * (R + 18))).setRotation(gc).setScale(0.45).setAlpha(0.45 + 0.5 * prog).setTint(0xd9ffe8);
      else for (let a = 0; a < SPIRAL_ARMS; a++) { const an = ai.gap + a * ((Math.PI * 2) / SPIRAL_ARMS); this.img(lineKey).setOrigin(0, 0.5).setPosition(Math.round(e.x), Math.round(e.y - 10)).setRotation(an).setScale(260 / lw, 0.7).setAlpha(0.25 + 0.4 * prog).setDepth(TELE_DEPTH - 0.1); }
    }
    void state;
  }

  /** Every pending boss hazard: circle = ring that fills to its edge exactly when it fires; cone = sector filling from the apex; sigil = marker. Edge of the drawing == edge of the hit test (R, plus Kai's foot disc). */
  private drawHazards(state: GameState) {
    for (const h of state.hazards) {
      if (h.fired) continue;
      const prog = Math.max(0, Math.min(1, 1 - h.delay / h.total)), late = h.delay < 0.3;
      if (h.shape === 'circle') {
        const w = this.texW(enemyFxKey('circle-warn'));
        this.img(enemyFxKey('circle-warn')).setPosition(Math.round(h.x), Math.round(h.y)).setScale((h.r * 2) / w).setAlpha(0.3 + 0.3 * prog + (late ? 0.2 : 0));
        this.img(enemyFxKey('circle-warn')).setPosition(Math.round(h.x), Math.round(h.y)).setScale(((h.r * 2) / w) * (0.15 + 0.85 * prog)).setAlpha(0.22 + 0.4 * prog);
      } else if (h.shape === 'cone') {
        const w = this.texW(bossFxKey('cone-warn')), s = h.r / w;
        this.img(bossFxKey('cone-warn')).setOrigin(0, 0.5).setPosition(Math.round(h.x), Math.round(h.y)).setRotation(h.ang).setScale(s).setAlpha(0.22 + 0.22 * prog);
        this.img(bossFxKey('cone-warn')).setOrigin(0, 0.5).setPosition(Math.round(h.x), Math.round(h.y)).setRotation(h.ang).setScale(s * (0.12 + 0.88 * prog)).setAlpha(0.2 + 0.4 * prog);
      } else {
        const w = this.texW(bossFxKey('blink-sigil'));
        this.img(bossFxKey('blink-sigil')).setPosition(Math.round(h.x), Math.round(h.y)).setScale(((h.r * 2) / w) * (1.7 - 0.7 * prog)).setAlpha(0.35 + 0.5 * prog);
      }
    }
  }

  private clearExtras() { for (const o of [this.phaseGlow, this.exposedGlow, this.halo, ...this.orbit]) o?.destroy(); this.phaseGlow = this.exposedGlow = null; this.halo = null; this.orbit = []; this.introMarks.clear(); }
  destroy() {
    this.clearExtras();
    this.sprite?.destroy(); this.glow?.destroy(); this.ghost?.spr.destroy(); for (const i of this.imgs) i.destroy(); for (const c of this.craters) c.img.destroy();
    this.imgs.length = 0; this.craters.length = 0; this.sprite = null; this.ghost = null; this.pool.destroy();
  }
}
const SPIRAL_ARMS = SERAPH.spiral.arms;


import Phaser from 'phaser';
import type { Enemy, GameState } from '../../sim/GameState';
import { BOSSES, SERAPH, WARDEN } from '../../content/bosses';
import { groundDy, type BossKind } from '../../content/enemies';
import { FxPool } from './fxPool';
import { enemyFxKey } from './enemyRenderer';

/** B08 boss art: 16-frame ImageGen pose flipbooks (4x4 grid, east-facing, mirrored for west). Frame meaning comes from the sheet manifest's `named` map. All hostile areas are drawn from the sim's own hazards/timeline. */
export const BOSS_KINDS: BossKind[] = ['warden', 'seraph'];
export const BOSS_FX_NAMES = ['cone-warn', 'cone-strike', 'rupture-burst', 'rupture-crater', 'shock-ring', 'boss-burst', 'warning-glyph', 'emblem-warden', 'prism-bolt', 'prism-hit', 'orb-bolt', 'blink-sigil', 'blink-flash', 'shield-block', 'aura-ring', 'emblem-seraph'] as const;
export const bossSheetKey = (k: BossKind) => `boss-sheet-${k}`;
export const bossSheetUrl = (k: BossKind) => `/art/bosses/${k}.png`;
export const bossManifestKey = (k: BossKind) => `boss-manifest-${k}`;
export const bossManifestUrl = (k: BossKind) => `/art/bosses/${k}.json`;
export const bossFxKey = (n: string) => `boss-fx-${n}`;
export const bossFxUrl = (n: string) => `/art/bosses/fx/${n}.png`;
export interface BossManifest { frame_width: number; frame_height: number; origin_px: [number, number]; frames: number; fps: number; columns?: number; clips: Record<string, number[]>; named: Record<string, number | number[]> }
const SCALE = 0.5;
const TELE_DEPTH = 5.6;

interface Ghost { spr: Phaser.GameObjects.Sprite; age: number; life: number; kind: BossKind; baseY: number }

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

  constructor(private readonly scene: Phaser.Scene) {
    for (const k of BOSS_KINDS) this.manifests[k] = scene.cache.json.get(bossManifestKey(k)) as BossManifest;
    this.pool = new FxPool(scene, 60);
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
          if (!reduced) this.scene.cameras.main.shake(70, 0.0022);
        } else if (ev.tag === 'residue') {
          const w = this.texW(bossFxKey('rupture-burst'));
          this.pool.spawn({ key: bossFxKey('rupture-burst'), x: ev.x, y: ev.y - 10, depth: 10.2, life: 0.35, s0: (SERAPH.blink.residueRadius * 1.5) / w, s1: (SERAPH.blink.residueRadius * 1.9) / w, a0: 1, a1: 0, oy: 0.7 });
        } else if (ev.tag === 'sweep') {
          const w = this.texW(bossFxKey('cone-strike'));
          this.pool.spawn({ key: bossFxKey('cone-strike'), x: ev.x, y: ev.y, depth: 10.1, life: 0.22, s0: WARDEN.sweep.radius / w, s1: WARDEN.sweep.radius / w * 1.04, a0: 0.95, a1: 0, rot: Math.atan2(ev.dirY, ev.dirX), ox: 0, oy: 0.5 });
          if (!reduced) this.scene.cameras.main.shake(90, 0.003);
        }
      } else if (ev.kind === 'enemy_phase') {
        const w = this.texW(bossFxKey('shock-ring')), r = ev.enemy === 'warden' ? 190 : 170;
        this.pool.spawn({ key: bossFxKey('shock-ring'), x: ev.x, y: ev.y + 12, depth: 10, life: 0.7, s0: 0.2 * r * 2 / w, s1: r * 2 / w, a0: 1, a1: 0 });
        if (!reduced) this.scene.cameras.main.shake(260, 0.0035);
      } else if (ev.kind === 'enemy_intro') {
        if (ev.enemy === 'seraph') this.pool.spawn({ key: bossFxKey('blink-flash'), x: ev.x, y: ev.y, depth: 10.3, life: 0.9, s0: 1.6, s1: 1.1, a0: 0.9, a1: 0, oy: 1 });
      } else if (ev.kind === 'enemy_strike' && ev.tag === 'blink_in') {
        this.pool.spawn({ key: bossFxKey('blink-flash'), x: ev.x, y: ev.y, depth: 10.3, life: 0.3, s0: 1.0, s1: 0.7, a0: 0.9, a1: 0, oy: 1 });
      } else if (ev.kind === 'enemy_strike' && ev.tag === 'rush_end') {
        const w = this.texW(bossFxKey('shock-ring'));
        this.pool.spawn({ key: bossFxKey('shock-ring'), x: ev.x, y: ev.y + 20, depth: 10, life: 0.4, s0: 0.2, s1: 110 / w, a0: 0.9, a1: 0 });
        if (!reduced) this.scene.cameras.main.shake(110, 0.0035);
      } else if (ev.kind === 'enemy_death' && ev.tag === 'boss') this.startDeath(ev.enemy as BossKind, ev.x, ev.y, reduced);
    }
  }
  private addCrater(x: number, y: number, s: number) {
    if (this.craters.length >= 14) { const o = this.craters.shift()!; o.img.destroy(); }
    this.craters.push({ img: this.scene.add.image(Math.round(x), Math.round(y), bossFxKey('rupture-crater')).setScale(s).setDepth(2.5).setAlpha(0.75), age: 0 });
  }
  private startDeath(k: BossKind, x: number, y: number, reduced: boolean) {
    this.ghost?.spr.destroy();
    const def = BOSSES[k], feetY = y + groundDy(def.radius), m = this.manifests[k];
    const spr = this.sheetSprite(k).setFrame(this.frameIdx(k, 'death', 0)).setFlipX(this.face < 0).setDepth(6.4).setPosition(Math.round(x), Math.round(feetY + (k === 'seraph' ? -10 : 0)));
    this.ghost = { spr, age: 0, life: def.deathT, kind: k, baseY: feetY };
    void m;
    this.pool.spawn({ key: bossFxKey('boss-burst'), x, y: y - 40, depth: 10.4, life: 0.8, s0: 0.7, s1: 1.5, a0: 1, a1: 0 });
    const w = this.texW(bossFxKey('shock-ring'));
    this.pool.spawn({ key: bossFxKey('shock-ring'), x, y: y + 12, depth: 10, life: 0.9, s0: 0.2, s1: 260 / w, a0: 0.9, a1: 0 });
    if (!reduced) this.scene.cameras.main.shake(320, 0.004);
  }

  sync(state: GameState, dtIn: number, reduced: boolean) {
    const running = state.phase === 'running' || state.phase === 'dead' || state.phase === 'victory';
    const dt = running ? Math.min(0.1, dtIn) : 0;
    this.events(state, reduced);
    this.used = 0;
    const boss = state.enemies.find(e => (e.kind === 'warden' || e.kind === 'seraph') && e.hp > 0) ?? null;
    if (boss && boss.ai) this.drawBoss(state, boss, dt, reduced); else if (this.sprite) { this.sprite.destroy(); this.glow?.destroy(); this.glow = null; this.sprite = null; this.spriteKind = null; this.bossId = 0; }
    this.drawHazards(state);
    for (let i = this.used; i < this.imgs.length; i++) this.imgs[i].setVisible(false);
    if (this.ghost) {
      const g = this.ghost; g.age += dt; const u = g.age / g.life; const n = (this.manifests[g.kind].named.death as number[]);
      if (u >= 1) { g.spr.destroy(); this.ghost = null; }
      else { g.spr.setFrame(n[Math.min(n.length - 1, Math.floor(u * n.length))]).setAlpha(u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3); if (u < 0.12) { g.spr.setTint(0xffe6ee); g.spr.tintMode = Phaser.TintModes.FILL; } else { g.spr.clearTint(); g.spr.tintMode = Phaser.TintModes.MULTIPLY; } }
    }
    for (let i = this.craters.length - 1; i >= 0; i--) { const c = this.craters[i]; c.age += dt; if (c.age > 3.2) { c.img.destroy(); this.craters.splice(i, 1); } else c.img.setAlpha(0.75 * Math.min(1, (3.2 - c.age) / 1.4)); }
    this.pool.update(dt);
  }

  private drawBoss(state: GameState, e: Enemy, dt: number, reduced: boolean) {
    const k = e.kind as BossKind, ai = e.ai!, def = BOSSES[k], m = this.manifests[k], p = state.player;
    if (!this.sprite || this.spriteKind !== k || this.bossId !== e.id) { this.sprite?.destroy(); this.glow?.destroy(); this.sprite = this.sheetSprite(k); this.glow = this.sheetSprite(k).setBlendMode(Phaser.BlendModes.ADD).setVisible(false); this.spriteKind = k; this.bossId = e.id; this.hp = e.hp; this.t = 0; this.face = p.x >= e.x ? 1 : -1; }
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
    spr.setFrame(frame).setFlipX(this.face < 0);
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

  destroy() {
    this.sprite?.destroy(); this.glow?.destroy(); this.ghost?.spr.destroy(); for (const i of this.imgs) i.destroy(); for (const c of this.craters) c.img.destroy();
    this.imgs.length = 0; this.craters.length = 0; this.sprite = null; this.ghost = null; this.pool.destroy();
  }
}
const SPIRAL_ARMS = SERAPH.spiral.arms;

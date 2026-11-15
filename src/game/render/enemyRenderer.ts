import Phaser from 'phaser';
import type { Enemy, GameState } from '../../sim/GameState';
import { ENEMIES, ENEMY_KINDS, AIM_LOCK_FRACTION, groundDy, isBoss, type MobKind as EnemyKind } from '../../content/enemies';
import { FxPool } from './fxPool';

/** B07 enemy art: ImageGen sheets (8 frames: move x4, windup, release, hurt, death; east-facing, mirrored for west) cut by scripts/build-enemy-art.py. */
export const ENEMY_FX_NAMES = ['aimline', 'chevron', 'bolt', 'bolt-hit', 'death-burst', 'hit-spark', 'circle-warn', 'circle-slam'] as const;
export const enemySheetKey = (k: EnemyKind) => `enemy-sheet-${k}`;
export const enemySheetUrl = (k: EnemyKind) => `/art/enemies/${k}.png`;
export const enemyManifestKey = (k: EnemyKind) => `enemy-manifest-${k}`;
export const enemyManifestUrl = (k: EnemyKind) => `/art/enemies/${k}.json`;
export const enemyFxKey = (n: string) => `enemy-fx-${n}`;
export const enemyFxUrl = (n: string) => `/art/enemies/fx/${n}.png`;
export interface EnemyManifest { frame_width: number; frame_height: number; origin_px: [number, number]; frames: number; fps: number; clips: Record<string, number[]> }
const SCALE = 0.5;                     // sheets are authored at 2x, like Kai
const FRAME = { windup: 4, strike: 5, hurt: 6, death: 7 } as const;
const DEATH_LIFE = 0.6;
const HURT_POSE = 0.11;
const FLASH = 0.05;
const GHOST_CAP = 24;

const BOLT_LOOK = { bolt: { key: 'bolt', w: 51 }, orb: { key: 'orb-bolt', w: 30 }, prism: { key: 'prism-bolt', w: 34 } } as const;
const boltKey = (k: keyof typeof BOLT_LOOK) => (k === 'bolt' ? enemyFxKey('bolt') : `boss-fx-${BOLT_LOOK[k].key}`);
interface Track { t: number; face: 1 | -1; hp: number; hurt: number; flash: number; tele: Phaser.GameObjects.Image | null; tele2: Phaser.GameObjects.Image | null; recoverT: number; fan: Phaser.GameObjects.Image[]; aura: Phaser.GameObjects.Image | null }
interface Ghost { spr: Phaser.GameObjects.Sprite; age: number; baseY: number }

export class EnemyRenderer {
  private readonly manifests = {} as Record<EnemyKind, EnemyManifest>;
  private readonly sprites = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly tracks = new Map<number, Track>();
  private readonly bolts = new Map<number, Phaser.GameObjects.Image>();
  private readonly ghosts: Ghost[] = [];
  private readonly ghostFree: Phaser.GameObjects.Sprite[] = [];
  private readonly teleFree: Phaser.GameObjects.Image[] = [];
  private readonly pool: FxPool;
  private lastEventId = 0;
  private lastFace = new Map<number, 1 | -1>();

  constructor(private readonly scene: Phaser.Scene) {
    for (const k of ENEMY_KINDS) this.manifests[k] = scene.cache.json.get(enemyManifestKey(k)) as EnemyManifest;
    this.pool = new FxPool(scene, 70);
  }
  /** QA: live sprite count, ghost count and pooled fx count. */
  stats() { return { sprites: this.sprites.size, bolts: this.bolts.size, ghosts: this.ghosts.length, fx: this.pool.count, tele: [...this.tracks.values()].filter(t => t.tele).length }; }

  private newSprite(kind: EnemyKind) {
    const m = this.manifests[kind];
    return this.scene.add.sprite(0, 0, enemySheetKey(kind), 0).setOrigin(m.origin_px[0] / m.frame_width, m.origin_px[1] / m.frame_height).setScale(SCALE);
  }
  private teleImage(key: string) {
    const img = this.teleFree.pop() ?? this.scene.add.image(0, 0, key);
    return img.setTexture(key).setVisible(true).setDepth(5.6).setOrigin(0.5, 0.5).setRotation(0).setScale(1).setAlpha(1);
  }
  private freeTele(t: Track) { for (const i of t.fan) { i.setVisible(false); this.teleFree.push(i); } t.fan.length = 0; for (const k of ['tele', 'tele2'] as const) { const i = t[k]; if (i) { i.setVisible(false); this.teleFree.push(i); t[k] = null; } } }

  private events(state: GameState, reduced: boolean) {
    for (const ev of state.enemyEvents) {
      if (ev.id <= this.lastEventId) continue; this.lastEventId = ev.id;
      if (ev.kind === 'enemy_death') { if (ev.tag !== 'boss') this.spawnGhost(ev.enemy as EnemyKind, ev.x, ev.y, ev.id, ev.enemyId, reduced); }
      else if (ev.kind === 'enemy_block') this.pool.spawn({ key: 'boss-fx-shield-block', x: ev.x + ev.dirX * 30, y: ev.y - 14, depth: 10.4, life: 0.18, s0: 0.5, s1: 0.8, a0: 1, a1: 0, flipX: ev.dirX < 0 });
      else if (ev.kind === 'enemy_shot_hit') this.pool.spawn({ key: ev.tag === 'prism' ? 'boss-fx-prism-hit' : enemyFxKey('bolt-hit'), x: ev.x, y: ev.y, depth: 10.4, life: 0.22, s0: ev.tag === 'prism' ? 0.4 : 0.35, s1: ev.tag === 'prism' ? 0.9 : 0.8, a0: 1, a1: 0, rot: Math.atan2(ev.dirY, ev.dirX) });
      else if (ev.kind === 'enemy_slam') {
        const R = ENEMIES.bruiser.attack.radius, tex = this.scene.textures.get(enemyFxKey('circle-slam')).getSourceImage().width;
        this.pool.spawn({ key: enemyFxKey('circle-slam'), x: ev.x, y: ev.y + groundDy(ENEMIES.bruiser.radius), depth: 5.55, life: 0.7, s0: (R * 2) / tex, s1: (R * 2.2) / tex, a0: 1, a1: 0 });
        if (!reduced) this.scene.cameras.main.shake(120, 0.0035);
      } else if (ev.kind === 'enemy_shot' && ev.enemy !== 'seraph') this.pool.spawn({ key: enemyFxKey('hit-spark'), x: ev.x + ev.dirX * 26, y: ev.y + ev.dirY * 26 - 10, depth: 10.4, life: 0.14, s0: 0.3, s1: 0.9, a0: 1, a1: 0, rot: 0.4 });
    }
  }

  private spawnGhost(kind: EnemyKind, x: number, y: number, _evId: number, enemyId: number, reduced: boolean) {
    const def = ENEMIES[kind], feetY = y + def.radius * 0.6;
    const spr = this.ghostFree.pop() ?? this.newSprite(kind);
    if (this.ghosts.length >= GHOST_CAP) { const old = this.ghosts.shift()!; old.spr.setVisible(false); this.ghostFree.push(old.spr); }
    const m = this.manifests[kind];
    spr.setTexture(enemySheetKey(kind), FRAME.death).setOrigin(m.origin_px[0] / m.frame_width, m.origin_px[1] / m.frame_height).setScale(SCALE).setVisible(true).setAlpha(1).clearTint()
      .setFlipX((this.lastFace.get(enemyId) ?? 1) < 0).setDepth(6.05).setPosition(Math.round(x), Math.round(feetY));
    spr.tintMode = Phaser.TintModes.MULTIPLY;
    this.ghosts.push({ spr, age: 0, baseY: feetY });
    this.lastFace.delete(enemyId);
    const big = kind === 'bruiser' ? 1.5 : 1;
    this.pool.spawn({ key: enemyFxKey('death-burst'), x, y: y - 10, depth: 10.3, life: 0.3, blend: 'normal', s0: 0.22 * big, s1: 0.5 * big, a0: 0.85, a1: 0, rot: (enemyId % 7) * 0.9 });
    if (!reduced) this.pool.spawn({ key: enemyFxKey('hit-spark'), x, y: y - 10, depth: 10.5, life: 0.12, blend: 'add', s0: 0.4 * big, s1: 1.4 * big, a0: 0.9, a1: 0, rot: 0.3 });
  }

  sync(state: GameState, dtIn: number, reduced: boolean) {
    const running = state.phase === 'running' || state.phase === 'dead' || state.phase === 'victory';
    const dt = running ? Math.min(0.1, dtIn) : 0;
    this.events(state, reduced);
    const p = state.player, live = new Set<number>();
    for (const e of state.enemies) {
      if (e.hp <= 0 || isBoss(e.kind)) continue; live.add(e.id);
      const def = ENEMIES[e.kind as EnemyKind], m = this.manifests[e.kind as EnemyKind];
      let spr = this.sprites.get(e.id), tr = this.tracks.get(e.id);
      if (!spr || !tr) { spr = this.newSprite(e.kind as EnemyKind); this.sprites.set(e.id, spr); tr = { t: e.id * 0.137, face: p.x >= e.x ? 1 : -1, hp: e.hp, hurt: 0, flash: 0, tele: null, tele2: null, recoverT: 0, fan: [], aura: null }; this.tracks.set(e.id, tr); }
      tr.t += dt;
      if (e.hp < tr.hp) { tr.hurt = HURT_POSE; tr.flash = FLASH; } tr.hp = e.hp;
      tr.hurt = Math.max(0, tr.hurt - dt); tr.flash = Math.max(0, tr.flash - dt);
      // facing follows the target horizontally (aim while attacking), with a dead zone so a head-on enemy does not flicker
      const fx = def.shield && e.mode === 'move' ? e.aimX : e.mode === 'move' || e.mode === 'recover' ? p.x - e.x : e.aimX;
      if (Math.abs(fx) > (e.mode === 'move' ? 8 : 0.15)) tr.face = fx >= 0 ? 1 : -1;
      this.lastFace.set(e.id, tr.face);
      // frame choice: telegraph and release poses are the authored attack frames; hurt interrupts the walk only
      let frame: number; const prog = e.mode === 'windup' ? 1 - e.modeT / def.attack.windup : 0;
      if (e.mode === 'windup') frame = FRAME.windup;
      else if (e.mode === 'strike') frame = FRAME.strike;
      else if (e.mode === 'recover' && (e.kind === 'bruiser' || def.caster) && e.modeT > def.attack.recover * 0.45) frame = FRAME.strike;
      else if (tr.hurt > 0 && e.mode !== 'recover') frame = FRAME.hurt;
      else frame = Math.floor(tr.t * m.fps * Math.min(1.7, Math.max(0.6, e.speed / def.moveSpeed))) % 4;
      spr.setFrame(frame).setFlipX(tr.face < 0);
      const hover = def.caster ? -9 - Math.sin(tr.t * 4 + e.id) * 3 : 0;
      const shake = e.mode === 'windup' && e.kind === 'bruiser' ? Math.sin(tr.t * 60) * (0.8 + prog * 1.6) : 0;
      const lean = e.mode === 'windup' && e.kind !== 'bruiser' ? prog * 2 : 0;
      const feetY = e.y + groundDy(def.radius);
      spr.setPosition(Math.round(e.x + shake - tr.face * lean), Math.round(feetY + hover)).setDepth(6 + (feetY / 1600) * 1.8);
      if (tr.flash > 0) { spr.setTint(0xffe6ee); spr.tintMode = Phaser.TintModes.FILL; } else { spr.clearTint(); spr.tintMode = Phaser.TintModes.MULTIPLY; }
      this.telegraph(e, tr, prog, feetY);
      this.aura(e, tr, feetY, def);
    }
    for (const [id, spr] of this.sprites) if (!live.has(id)) { spr.destroy(); this.sprites.delete(id); const t = this.tracks.get(id); if (t) { this.freeTele(t); t.aura?.destroy(); } this.tracks.delete(id); }
    // lingering death frame, separate from the sim: it cannot collide or damage
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i]; g.age += dt; const u = g.age / DEATH_LIFE;
      if (u >= 1) { g.spr.setVisible(false); this.ghostFree.push(g.spr); this.ghosts.splice(i, 1); continue; }
      g.spr.setAlpha(u < 0.45 ? 1 : 1 - (u - 0.45) / 0.55).setY(Math.round(g.baseY + u * 4)).setScale(SCALE * (1 + u * 0.06), SCALE * (1 - u * 0.12));
      if (u < 0.18) { g.spr.setTint(0xffe6ee); g.spr.tintMode = Phaser.TintModes.FILL; } else { g.spr.clearTint(); g.spr.tintMode = Phaser.TintModes.MULTIPLY; }
    }
    // enemy bolts
    const liveBolts = new Set<number>();
    for (const s of state.enemyShots) {
      liveBolts.add(s.id);
      let b = this.bolts.get(s.id); if (!b) { const kk = s.kind ?? 'bolt', look = BOLT_LOOK[kk], key = boltKey(kk); b = this.scene.add.image(s.x, s.y, key).setOrigin(kk === 'orb' ? 0.5 : 0.8, 0.5).setScale(look.w / this.scene.textures.get(key).getSourceImage().width).setDepth(10.2); this.bolts.set(s.id, b); }
      b.setPosition(Math.round(s.x), Math.round(s.y - 10)).setRotation(Math.atan2(s.vy, s.vx));
    }
    for (const [id, b] of this.bolts) if (!liveBolts.has(id)) { b.destroy(); this.bolts.delete(id); }
    this.pool.update(dt);
  }

  /** Attack markers are drawn from the sim's own timeline, so what is shown is exactly what will be hit and when; they ramp up through the windup. */
  private telegraph(e: Enemy, tr: Track, prog: number, feetY: number) {
    if (e.mode !== 'windup') { this.freeTele(tr); return; }
    const a = ENEMIES[e.kind as EnemyKind].attack, ang = Math.atan2(e.aimY, e.aimX);
    const lock = ENEMIES[e.kind as EnemyKind].caster ? e.modeT <= a.windup * AIM_LOCK_FRACTION : true;
    if (a.kind === 'slam') {
      const tex = this.scene.textures.get(enemyFxKey('circle-warn')).getSourceImage().width, full = (a.radius * 2) / tex;
      tr.tele ??= this.teleImage(enemyFxKey('circle-warn')); tr.tele2 ??= this.teleImage(enemyFxKey('circle-warn'));
      tr.tele.setPosition(Math.round(e.x), Math.round(feetY)).setScale(full).setAlpha(0.22 + 0.2 * prog);
      tr.tele2.setPosition(Math.round(e.x), Math.round(feetY)).setScale(full * (0.2 + 0.8 * prog)).setAlpha(0.18 + 0.32 * prog);   // the inner ring reaches the outer edge at the exact moment the slam lands
    } else {
      const len = a.kind === 'shot' ? 420 : a.speed * a.strike + e.radius;
      tr.tele ??= this.teleImage(enemyFxKey('aimline'));
      if (a.fan) {
        while (tr.fan.length < a.fan.count - 1) tr.fan.push(this.teleImage(enemyFxKey('aimline')));
        let j = 0; for (let i = 0; i < a.fan.count; i++) { const off = (i / (a.fan.count - 1) - 0.5) * a.fan.spread; if (Math.abs(off) < 1e-6) continue; tr.fan[j++].setOrigin(0, 0.5).setPosition(Math.round(e.x), Math.round(feetY - 12)).setRotation(ang + off).setScale(420 / this.scene.textures.get(enemyFxKey('aimline')).getSourceImage().width, 0.9).setAlpha((0.28 + 0.7 * prog) * (lock ? 1 : 0.7)); }
      }
      const pulse = lock ? 1 : 0.7 + 0.3 * Math.sin(tr.t * 30);
      tr.tele.setOrigin(0, 0.5).setPosition(Math.round(e.x), Math.round(feetY - 12)).setRotation(ang).setScale(len / this.scene.textures.get(enemyFxKey('aimline')).getSourceImage().width, a.kind === 'shot' ? 0.9 : 1.3).setAlpha((0.28 + 0.7 * prog) * pulse);
      if (a.kind !== 'shot') {
        tr.tele2 ??= this.teleImage(enemyFxKey('chevron'));
        tr.tele2.setPosition(Math.round(e.x + e.aimX * len), Math.round(feetY - 12 + e.aimY * len)).setRotation(ang).setScale(0.35 + 0.1 * prog).setAlpha(0.35 + 0.6 * prog);
      } else if (tr.tele2) { tr.tele2.setVisible(false); this.teleFree.push(tr.tele2); tr.tele2 = null; }
    }
  }

  /** Rift Cantor rally aura: a quiet floor ring at the exact radius the sim buffs, drawn under the caster only. */
  private aura(e: Enemy, tr: Track, feetY: number, def: (typeof ENEMIES)[EnemyKind]) {
    if (!def.aura) return;
    const key = 'boss-fx-aura-ring', w = this.scene.textures.get(key).getSourceImage().width;
    tr.aura ??= this.scene.add.image(0, 0, key).setDepth(2.6);
    tr.aura.setVisible(true).setPosition(Math.round(e.x), Math.round(feetY)).setScale((def.aura.radius * 2) / w).setAlpha(0.5);
  }

  destroy() {
    for (const s of this.sprites.values()) s.destroy(); for (const t of this.tracks.values()) this.freeTele(t);
    for (const i of this.teleFree) i.destroy(); for (const g of this.ghosts) g.spr.destroy(); for (const s of this.ghostFree) s.destroy(); for (const b of this.bolts.values()) b.destroy();
    this.sprites.clear(); this.tracks.clear(); this.ghosts.length = 0; this.ghostFree.length = 0; this.teleFree.length = 0; this.bolts.clear(); this.pool.destroy();
  }
}

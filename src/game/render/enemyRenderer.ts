import Phaser from 'phaser';
import { kick } from './cameraKick';
import type { Enemy, GameState } from '../../sim/GameState';
import { ENEMIES, ENEMY_KINDS, AIM_LOCK_FRACTION, groundDy, isBoss, type MobKind as EnemyKind } from '../../content/enemies';
import { FxPool, vfxKey } from './fxPool';
import { b14Key } from './b14fx';
import { b21Key } from './b21Assets';
import { reactionFor, reactionPose, type ReactKind, type Reaction } from './bodyReaction';

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
/** Per-class death payoff: a distinct fragment burst per enemy (crystal shards, fast slash-dissolve, heavy armour slabs, energy collapse). Capped by the shared 70-sprite enemy pool. */
const DEATH_LOOK: Record<EnemyKind, { key: string; tint: number; n: number; v: number; lift: number; g: number; size: number; life: number; grow: number; ring: boolean }> = {
  pursuer: { key: 'shatter', tint: 0xc9a8ff, n: 5, v: 150, lift: 50, g: 420, size: 0.5, life: 0.34, grow: 0.7, ring: false },
  flanker: { key: 'slash', tint: 0xff9fd0, n: 3, v: 210, lift: 20, g: 200, size: 0.4, life: 0.26, grow: 0.9, ring: false },
  bruiser: { key: 'shatter', tint: 0xffb066, n: 8, v: 170, lift: 70, g: 520, size: 0.75, life: 0.5, grow: 1.1, ring: true },
  ranged: { key: 'pop', tint: 0xb890ff, n: 4, v: 110, lift: 30, g: -60, size: 0.4, life: 0.4, grow: 1.2, ring: true },
  aegis: { key: 'shatter', tint: 0xcfe0ff, n: 8, v: 180, lift: 60, g: 480, size: 0.7, life: 0.46, grow: 1.1, ring: true },
  cantor: { key: 'pop', tint: 0xd890ff, n: 6, v: 130, lift: 40, g: -40, size: 0.45, life: 0.45, grow: 1.4, ring: true },
};
const FRAME = { windup: 4, strike: 5, hurt: 6, death: 7 } as const;
const DEATH_LIFE = 0.6;
const HURT_POSE = 0.11;
const FLASH = 0.05;
const GHOST_CAP = 24;

const BOLT_LOOK = { bolt: { key: 'bolt', w: 51 }, orb: { key: 'orb-bolt', w: 30 }, prism: { key: 'prism-bolt', w: 34 } } as const;
const boltKey = (k: keyof typeof BOLT_LOOK) => (k === 'bolt' ? enemyFxKey('bolt') : `boss-fx-${BOLT_LOOK[k].key}`);
interface Track { t: number; face: 1 | -1; hp: number; hurt: number; flash: number; tele: Phaser.GameObjects.Image | null; tele2: Phaser.GameObjects.Image | null; recoverT: number; fan: Phaser.GameObjects.Image[]; aura: Phaser.GameObjects.Image | null; glyph: Phaser.GameObjects.Image | null; react: Reaction | null; reactT: number; rx: number; ry: number; prevMode: string }
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
      else if (ev.kind === 'enemy_block') { const tr = this.tracks.get(ev.enemyId); if (tr) { tr.react = reactionFor('aegis', 0, { blocked: true }); tr.reactT = 0; tr.rx = ev.dirX; tr.ry = ev.dirY; } this.pool.spawn({ key: 'boss-fx-shield-block', x: ev.x + ev.dirX * 30, y: ev.y - 14, depth: 10.4, life: 0.18, s0: 0.5, s1: 0.8, a0: 1, a1: 0, flipX: ev.dirX < 0 }); }
      else if (ev.kind === 'enemy_shot_hit') this.pool.spawn({ key: ev.tag === 'prism' ? 'boss-fx-prism-hit' : enemyFxKey('bolt-hit'), x: ev.x, y: ev.y, depth: 10.4, life: 0.22, s0: ev.tag === 'prism' ? 0.4 : 0.35, s1: ev.tag === 'prism' ? 0.9 : 0.8, a0: 1, a1: 0, rot: Math.atan2(ev.dirY, ev.dirX) });
      else if (ev.kind === 'enemy_slam') {
        const R = ENEMIES.bruiser.attack.radius, tex = this.scene.textures.get(enemyFxKey('circle-slam')).getSourceImage().width;
        this.pool.spawn({ key: enemyFxKey('circle-slam'), x: ev.x, y: ev.y + groundDy(ENEMIES.bruiser.radius), depth: 5.55, life: 0.7, s0: (R * 2) / tex, s1: (R * 2.2) / tex, a0: 1, a1: 0 });
        kick(this.scene.cameras.main, 120, 0.0035, reduced);
      } else if (ev.kind === 'enemy_shot' && ev.enemy !== 'seraph') this.pool.spawn({ key: enemyFxKey('hit-spark'), x: ev.x + ev.dirX * 26, y: ev.y + ev.dirY * 26 - 10, depth: 10.4, life: 0.14, s0: 0.3, s1: 0.9, a0: 1, a1: 0, rot: 0.4 });
    }
  }

  private prevMode = new Map<number, string>();
  /** Arrival: a short fracture flicker where the mob appears (never hides or delays it); elites get a ring and a glint so they are recognised before they act. */
  private arrive(e: Enemy, def: (typeof ENEMIES)[EnemyKind], reduced: boolean) {
    if (reduced) return;
    const elite = !!def.elite;
    this.pool.spawn({ key: b14Key('shatter'), x: e.x, y: e.y - 6, depth: 6.1, life: elite ? 0.4 : 0.26, blend: 'add', tint: elite ? 0xffb0d8 : 0xb04898, s0: 0.15, s1: elite ? 0.7 : 0.45, a0: elite ? 0.8 : 0.5, a1: 0, rot: e.id * 0.7 });
    if (elite) { this.pool.spawn({ key: b14Key('shock_ring'), x: e.x, y: e.y + 12, depth: 3.9, life: 0.5, blend: 'add', tint: 0xff7aa8, s0: 0.2, s1: 1.0, a0: 0.6, a1: 0 }); this.pool.spawn({ key: b14Key('glint'), x: e.x, y: e.y - 20, depth: 10.4, life: 0.35, blend: 'add', tint: 0xffe0ec, s0: 0.3, s1: 1.0, a0: 1, a1: 0 }); }
  }
  /** The Aegis shield drops (recover: punish window) or comes back up: a bright burst on the shield side so the opening is read at a glance. */
  private shieldState(e: Enemy, face: 1 | -1, open: boolean, reduced: boolean) {
    const x = e.x + face * 26, y = e.y - 12;
    this.pool.spawn({ key: b14Key('glint'), x, y, depth: 10.4, life: open ? 0.4 : 0.22, blend: 'add', tint: open ? 0xffffff : 0xb8d0ff, s0: 0.2, s1: open ? 1.1 : 0.6, a0: 1, a1: 0 });
    const ck = b21Key('dmg', 'shield_crack'), dk = b21Key('dmg', 'shield_down');
    if (open) this.scene.events.emit('b21-cue', 'shield_shatter', 0.7);
    if (open && this.scene.textures.exists(ck)) this.pool.spawn({ key: ck, x, y, depth: 10.5, life: 0.55, blend: 'add', s0: 0.28, s1: 0.5, a0: 1, a1: 0, flipX: face < 0, rot: face * 0.12 });   // the guard cracks: ImageGen shield-break art at the exact moment the sim opens the punish window
    if (open && this.scene.textures.exists(dk)) this.pool.spawn({ key: dk, x: e.x, y: e.y - 44, depth: 10.6, life: 0.7, blend: 'add', s0: 0.22, s1: 0.26, a0: 0.9, a1: 0, vy: -10 });
    if (open && !reduced) { for (let i = 1; i <= 6; i++) { const sk = b21Key('evo', 'shield_shard' + i); if (!this.scene.textures.exists(sk)) break; const a = -0.8 * face + (i - 3.5) * 0.55; this.pool.spawn({ key: sk, x, y, depth: 10.6, life: 0.5, blend: 'add', vx: Math.cos(a) * 150 * face + face * 30, vy: Math.sin(a) * 120 - 60, ay: 380, s0: 0.1, s1: 0.06, a0: 1, a1: 0, rot: i, spin: (i % 2 ? 9 : -9) }); } const rk = b21Key('evo', 'shield_ring'); if (this.scene.textures.exists(rk)) this.pool.spawn({ key: rk, x, y, depth: 10.4, life: 0.35, blend: 'add', s0: 0.08, s1: 0.28, a0: 0.9, a1: 0 }); this.pool.spawn({ key: b14Key('shatter'), x, y, depth: 10.3, life: 0.4, blend: 'add', tint: 0xcfe0ff, s0: 0.25, s1: 0.8, a0: 0.8, a1: 0, rot: e.id }); }
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
    const big = kind === 'bruiser' || kind === 'aegis' ? 1.5 : 1, look = DEATH_LOOK[kind], rnd = Math.random;
    this.pool.spawn({ key: enemyFxKey('death-burst'), x, y: y - 10, depth: 10.3, life: 0.3, blend: 'normal', s0: 0.22 * big, s1: 0.5 * big, a0: 0.85, a1: 0, rot: (enemyId % 7) * 0.9 });
    if (!reduced) {
      this.pool.spawn({ key: enemyFxKey('hit-spark'), x, y: y - 10, depth: 10.5, life: 0.12, blend: 'add', s0: 0.4 * big, s1: 1.4 * big, a0: 0.9, a1: 0, rot: 0.3 });
      this.pool.spawn({ key: b14Key(look.key), x, y: y - 10, depth: 10.6, life: look.life, blend: 'add', tint: look.tint, s0: 0.25 * big, s1: look.grow * big, a0: 0.65, a1: 0, rot: (enemyId % 5) * 1.2 });
      for (let i = 0; i < look.n; i++) { const a = rnd() * 6.28, v = look.v * (0.6 + rnd() * 0.7); this.pool.spawn({ key: vfxKey('debris' + ((rnd() * 4) | 0), false), x, y: y - 8, depth: 10.2, life: look.life + 0.12, tint: look.tint, vx: Math.cos(a) * v, vy: Math.sin(a) * v - look.lift, ay: look.g, s0: look.size * (0.7 + rnd() * 0.5), s1: look.size * 0.3, a0: 1, a1: 0, rot: rnd() * 6, spin: (rnd() - 0.5) * 16 }); }
      if (look.ring) this.pool.spawn({ key: b14Key('shock_ring'), x, y: y + 12, depth: 3.9, life: 0.34, blend: 'add', tint: look.tint, s0: 0.2, s1: 0.85, a0: 0.55, a1: 0 });
    }
    if (kind === 'bruiser' || kind === 'aegis') kick(this.scene.cameras.main, 100, 0.0028, reduced);
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
      if (!spr || !tr) { spr = this.newSprite(e.kind as EnemyKind); this.sprites.set(e.id, spr); tr = { t: e.id * 0.137, face: p.x >= e.x ? 1 : -1, hp: e.hp, hurt: 0, flash: 0, tele: null, tele2: null, recoverT: 0, fan: [], aura: null, glyph: null, react: null, reactT: 9, rx: 0, ry: 0, prevMode: e.mode }; this.tracks.set(e.id, tr); }
      tr.t += dt;
      const pm = this.prevMode.get(e.id); if (pm === undefined) this.arrive(e, def, reduced); else if (pm !== e.mode && def.shield) this.shieldState(e, tr.face, e.mode === 'recover', reduced); this.prevMode.set(e.id, e.mode);
      if (e.hp < tr.hp) {
        tr.hurt = HURT_POSE; tr.flash = FLASH;
        const away = Math.hypot(e.x - p.x, e.y - p.y) || 1, broke = !!def.shield && e.mode === 'recover' && tr.prevMode !== 'recover';
        tr.react = reactionFor(e.kind as ReactKind, (tr.hp - e.hp) / e.maxHp, { heavy: (tr.hp - e.hp) / e.maxHp > 0.18, broke }); tr.reactT = 0; tr.rx = (e.x - p.x) / away; tr.ry = (e.y - p.y) / away;
      }
      tr.hp = e.hp; tr.prevMode = e.mode; tr.reactT += dt;
      const pose = tr.react ? reactionPose(tr.react, tr.reactT) : { off: 0, tilt: 0, sq: 0 };
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
      spr.setPosition(Math.round(e.x + shake - tr.face * lean + tr.rx * pose.off), Math.round(feetY + hover + tr.ry * pose.off * 0.6)).setDepth(6 + (feetY / 1600) * 1.8);
      spr.setRotation(pose.tilt * (tr.rx >= 0 ? 1 : -1)).setScale(SCALE * (1 + pose.sq * 0.5), SCALE * (1 - pose.sq));
      if (tr.flash > 0) { spr.setTint(0xffe6ee); spr.tintMode = Phaser.TintModes.FILL; } else { spr.clearTint(); spr.tintMode = Phaser.TintModes.MULTIPLY; }
      this.telegraph(e, tr, prog, feetY);
      this.aura(e, tr, feetY, def);
    }
    for (const [id, spr] of this.sprites) if (!live.has(id)) { spr.destroy(); this.sprites.delete(id); const t = this.tracks.get(id); if (t) { this.freeTele(t); t.aura?.destroy(); t.glyph?.destroy(); } this.tracks.delete(id); this.prevMode.delete(id); }
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
    const gk = b21Key('dmg', 'buff_glyph');
    if (this.scene.textures.exists(gk)) { tr.glyph ??= this.scene.add.image(0, 0, gk).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.7); tr.glyph.setVisible(true).setPosition(Math.round(e.x), Math.round(feetY - 62 + Math.sin(tr.t * 3) * 2)).setScale(0.2).setAlpha(0.8); }   // the Cantor's buff is read on the caster itself
  }

  destroy() {
    for (const s of this.sprites.values()) s.destroy(); for (const t of this.tracks.values()) this.freeTele(t);
    for (const i of this.teleFree) i.destroy(); for (const g of this.ghosts) g.spr.destroy(); for (const s of this.ghostFree) s.destroy(); for (const b of this.bolts.values()) b.destroy();
    this.sprites.clear(); this.tracks.clear(); this.ghosts.length = 0; this.ghostFree.length = 0; this.teleFree.length = 0; this.bolts.clear(); this.pool.destroy();
  }
}

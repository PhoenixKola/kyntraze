import Phaser from 'phaser';
import type { GameState, InputState } from '../../sim/GameState';
import { FormFx } from './formFx';
import { AbilityFx } from './abilityFx';
import { EnemyRenderer } from './enemyRenderer';
import { KAI_ANCHORS_KEY, handAnchorWorld, type AnchorTable, type HandAnchor } from '../../assets/kaiAnimation';
import { KAI_F1_REGISTRY_KEY, KAI_GROUND_DY, KAI_REGISTRY_KEY, clipFrame, KAI_SCALE, KAI_SPLIT_ABOVE_FEET, KaiAnimator, kaiTextureKey, type AnimPose, type KaiManifests } from '../../assets/kaiAnimation';
export class EntityRenderer {
  private hero: Phaser.GameObjects.Sprite;
  private legs: Phaser.GameObjects.Sprite;
  private readonly manifests: KaiManifests;
  private readonly f1: KaiManifests | undefined;
  private readonly formFx: FormFx;
  private readonly abilityFx: AbilityFx;
  private readonly anchors: AnchorTable | undefined;
  private hand: HandAnchor | null = null;
  private readonly enemies: EnemyRenderer;
  private readonly animator: KaiAnimator;
  private pose: AnimPose = { facing: 'south', clip: 'Idle', frame: 0, legs: null, form: 'base', events: [] };
  private lastShotId = 0;
  private lastHp = NaN;
  private lastX = NaN;
  private lastY = NaN;
  private moveHold = 0;
  private flash = 0;
  private orbs = new Map<number, Phaser.GameObjects.Image>();
  constructor(private readonly scene: Phaser.Scene) {
    const manifests = scene.registry.get(KAI_REGISTRY_KEY) as KaiManifests | undefined;
    if (!manifests) throw new Error('Kai animation manifests were not loaded by BootScene');
    this.f1 = scene.registry.get(KAI_F1_REGISTRY_KEY) as KaiManifests | undefined;
    this.manifests = manifests; this.animator = new KaiAnimator(manifests, this.f1); this.formFx = new FormFx(scene); this.abilityFx = new AbilityFx(scene); this.enemies = new EnemyRenderer(scene); this.anchors = scene.registry.get(KAI_ANCHORS_KEY) as AnchorTable | undefined;
    this.hero = scene.add.sprite(1100, 800, kaiTextureKey('south', 'Idle'), 0).setScale(KAI_SCALE).setDepth(10);
    this.legs = scene.add.sprite(1100, 800, kaiTextureKey('south', 'Run'), 0).setScale(KAI_SCALE).setDepth(9.9).setVisible(false);
    for (const spr of [this.hero, this.legs]) { spr.enableFilters(); spr.filters!.internal.addGlow(0xd8f6ff, 1.6, 0, 1, false, 4, 2); }   // B06: thin pale rim keeps the silhouette separated from the arena
  }
  /** Hero animation state, for the dev-only QA hook. */
  deathPresented() { return this.animator.deathPresented(); }
  /** QA-only size comparison; the shipped default stays KAI_SCALE. */
  setHeroScale(scale: number) { this.hero.setScale(scale); this.legs.setScale(scale); }
  /** World position of Kai's fists for the frame on screen (Beam / Sphere clips only). */
  handAnchor() { return this.hand; }
  /** QA: the world point the beam/orb was last anchored to and whether it came from the sprite anchors or the sim fallback. */
  fxOrigin() { return this.abilityFx.lastOrigin; }
  debugPose() { return { ...this.pose, visualForm: this.animator.visualForm, transforming: this.animator.transforming, texture: this.hero.texture.key, frameIndex: Number(this.hero.frame.name), x: this.hero.x, y: this.hero.y, scale: this.hero.scaleX }; }
  sync(state: GameState, input: InputState, deltaMs = 0, reducedEffects = false) {
    const p = state.player;
    const dt = state.phase === 'running' || state.phase === 'dead' ? Math.min(0.1, deltaMs / 1000) : 0;
    // hurt = the sim actually removed HP since the last render frame (never a proximity guess)
    const hurt = !Number.isNaN(this.lastHp) && p.hp < this.lastHp && p.hp > 0; this.lastHp = p.hp;
    // actual displacement (not raw key state) decides Run, so pushing against a wall or obstacle idles; a short hold bridges frames with no sim tick
    if (Number.isNaN(this.lastX)) { this.lastX = p.x; this.lastY = p.y; }
    if (Math.hypot(p.x - this.lastX, p.y - this.lastY) > 0.05) this.moveHold = 0.1; else this.moveHold = Math.max(0, this.moveHold - dt);
    this.lastX = p.x; this.lastY = p.y;
    let target: { dx: number; dy: number } | null = null; let best = p.attackRange ** 2;
    for (const e of state.enemies) { const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (e.hp > 0 && d <= best) { best = d; target = { dx: e.x - p.x, dy: e.y - p.y }; } }
    let shot: { dx: number; dy: number } | null = null;
    for (const fx of state.impacts) if (fx.kind === 'shot' && fx.id > this.lastShotId) {
      this.lastShotId = fx.id; if (!shot) shot = { dx: (fx.targetX ?? p.x) - p.x, dy: (fx.targetY ?? p.y) - p.y };
    }
    const period = Math.max(0.16, p.attackPeriod * (p.form ? 0.75 : 1));
    this.pose = this.animator.update({
      dt, alive: state.phase !== 'dead' && p.hp > 0, moving: (input.x !== 0 || input.y !== 0) && this.moveHold > 0, inputX: input.x, inputY: input.y,
      runSpeed: p.speed * (p.form ? 1.16 : 1), dashing: p.dashRemaining > 0, dashX: p.dashDx, dashY: p.dashDy, dashRemaining: p.dashRemaining, hurt, form: p.form,
      cast: state.cast ? { id: state.cast.id, kind: state.cast.kind, face: state.cast.face, t: state.cast.t, dirX: state.cast.dirX, dirY: state.cast.dirY } : null, attackClock: p.attackClock, hasTarget: target !== null, targetDx: target?.dx ?? 0, targetDy: target?.dy ?? 0, shot,
    }, period);
    const set = this.pose.form === 'f1' && this.f1 ? this.f1 : this.manifests;
    const m = set[this.pose.facing]; const fr = clipFrame(m, this.pose.clip);
    const key = kaiTextureKey(this.pose.facing, this.pose.clip, this.pose.form);
    if (this.hero.texture.key !== key) this.hero.setTexture(key);
    this.hero.setFrame(this.pose.frame);
    this.hero.setOrigin(fr.ox / fr.w, fr.oy / fr.h);
    this.hero.setPosition(Math.round(p.x), Math.round(p.y + KAI_GROUND_DY));
    const dead = state.phase === 'dead' || p.hp <= 0;
    const alpha = !dead && this.pose.clip !== 'Transform' && p.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0 ? 0.56 : 1;
    this.hero.setAlpha(alpha);
    this.hero.tintMode = Phaser.TintModes.MULTIPLY; this.legs.tintMode = Phaser.TintModes.MULTIPLY;
    this.hero.clearTint();   // Form I is separate art (kaif1-* sheets), never a tint of the base
    // punching while moving: upper body from the punch frame, legs from the run cycle, split just under the belt
    const split = m.origin_px[1] - KAI_SPLIT_ABOVE_FEET;
    if (this.pose.legs !== null) {
      this.hero.setCrop(0, 0, m.frame_width, split);
      const lkey = kaiTextureKey(this.pose.facing, 'Run', this.pose.form);
      if (this.legs.texture.key !== lkey) this.legs.setTexture(lkey);
      this.legs.setFrame(this.pose.legs).setCrop(0, split, m.frame_width, m.frame_height - split);
      this.legs.setOrigin(m.origin_px[0] / m.frame_width, m.origin_px[1] / m.frame_height);
      this.legs.setPosition(this.hero.x, this.hero.y).setAlpha(alpha).setVisible(true);
      this.legs.clearTint();
    } else { this.hero.setCrop(); this.legs.setVisible(false); }
    for (const e of this.pose.events) {
      this.scene.events.emit('kai-form', e);
      if (e === 'form_commit') { this.flash = 0.07; if (!reducedEffects) this.scene.cameras.main.shake(110, 0.0025); }   // the reveal: a one-frame white-hot flash of the Form I sprite and a tiny camera kick
    }
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt); for (const spr of [this.hero, this.legs]) { spr.setTint(0xfff2cc); spr.tintMode = Phaser.TintModes.FILL; } }   // sound hook: no licensed/original audio ships yet, an audio layer can subscribe to scene.events 'kai-form' ('form_start' | 'form_commit' | 'form_end')
    const emphasis = state.cast ? (state.cast.released ? 1 : 0.7) : p.dashRemaining > 0 ? 0.7 : 0;   // heavier presence while charging, firing, throwing and dashing
    this.formFx.update(dt, this.hero.x, this.hero.y, this.hero.scaleX / KAI_SCALE, this.animator.visualForm === 'f1', !dead, this.pose.events, reducedEffects, emphasis, state.enemies.length > 45, this.hero);
    this.hand = this.anchors ? handAnchorWorld(this.anchors, this.pose.form, this.pose.facing, this.pose.clip, this.pose.frame, this.hero.x, this.hero.y, this.hero.scaleX) : null;
    this.abilityFx.update(dt, state, reducedEffects, this.animator.visualForm === 'f1', this.hand);
    this.enemies.sync(state, deltaMs / 1000, reducedEffects);
    const activeOrbs = new Set<number>();
    for (const p of state.pickups) {
      activeOrbs.add(p.id);
      let image = this.orbs.get(p.id);
      if (!image) { image = this.scene.add.image(p.x, p.y, 'xp').setScale(1.8).setDepth(4); this.orbs.set(p.id, image); }
      image.setPosition(Math.round(p.x), Math.round(p.y + Math.sin(p.age * 4) * 3));
    }
    for (const [id, image] of this.orbs) if (!activeOrbs.has(id)) { image.destroy(); this.orbs.delete(id); }
  }
  enemyStats() { return this.enemies.stats(); }
  destroy() { this.formFx.destroy(); this.abilityFx.destroy(); this.enemies.destroy(); this.hero.destroy(); this.legs.destroy(); for (const image of this.orbs.values()) image.destroy(); this.orbs.clear(); }
}

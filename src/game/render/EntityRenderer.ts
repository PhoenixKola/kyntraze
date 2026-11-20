import { vexTint } from './vexTint';
import { KaiPresence } from './kaiPresence';
import { KaiCombatFx } from './kaiCombatFx';
import { RenFox } from './renFox';
import { SoraPhoenix } from './soraPhoenix';
import { AUTO, FLY } from '../../content/kaiCombat';
import Phaser from 'phaser';
import { RULES } from '../../core/Rules';
import { FxPool, vfxKey } from './fxPool';
import type { GameState, InputState } from '../../sim/GameState';
import { FormFx } from './formFx';
import { CometFx } from './cometFx';
import { ApexFx } from './stillfireFx';
import { AbilityFx } from './abilityFx';
import { KaiKitFx } from './kaiKitFx';
import { PASSIVE_AURA } from './fxPolicy';
import { CONTOUR, ContourController, EDGE_STATES, edgePalette, formKey, registerContourFilter } from './contourFilter';
import { HeroFxView } from './heroFxView';
import { BodyMotion, styleFor } from './bodyMotion';
import { HAIR_ANCHORS_KEY, HAIR_STYLE, HairDriver, type HairTable } from './hairRig';
import { HairLayer } from './hairLayer';
import { OutfitLayer } from './outfitLayer';
import { AuraView, type AuraState } from './auraView';
import { AuraTracker } from './auraState';
import { HERO_ANCHORS_KEY, HERO_REGISTRY_KEY, HeroAnimator, heroTextureKey, rigOf, type HeroActView, type HeroArt, type HeroForm } from '../../assets/heroAnimation';
import { EnemyRenderer } from './enemyRenderer';
import { BossRenderer } from './bossRenderer';
import { KAI_ANCHORS_KEY, handAnchorWorld, type AnchorTable, type HandAnchor } from '../../assets/kaiAnimation';
import { KAI_F1_REGISTRY_KEY, KAI_F2_REGISTRY_KEY, KAI_F3_REGISTRY_KEY, KAI_GROUND_DY, KAI_REGISTRY_KEY, clipFrame, KAI_SCALE, KaiAnimator, kaiTextureKey, type AnimPose, type KaiManifests } from '../../assets/kaiAnimation';
interface StrokeCtl { outerStrength: number; color: number; active?: boolean }
export class EntityRenderer {
  private hero: Phaser.GameObjects.Sprite; private auraBody!: Phaser.GameObjects.Container; private auraCopyHero!: Phaser.GameObjects.Sprite; private auraCopyLegs!: Phaser.GameObjects.Sprite;
  private legs: Phaser.GameObjects.Sprite; private hoverY = 0; private blinkId = 0; private blinkFlicker = 0; private blinkGhosts: { spr: Phaser.GameObjects.Sprite; life: number; max: number }[] = [];
  private readonly manifests: KaiManifests;
  private readonly f1: KaiManifests | undefined;
  private readonly f2: KaiManifests | undefined;
  private readonly f3: KaiManifests | undefined;
  private readonly apexFx: ApexFx;
  private readonly cometFx: CometFx;
  private readonly formFx: FormFx;
  private readonly abilityFx: AbilityFx; private readonly kitFx: KaiKitFx;
  private readonly anchors: AnchorTable | undefined;
  private hand: HandAnchor | null = null;
  private readonly enemies: EnemyRenderer | null;
  private readonly bosses: BossRenderer | null;
  private readonly animator: KaiAnimator;
  private pose: AnimPose = { facing: 'south', clip: 'Idle', frame: 0, legs: null, form: 'base', events: [] };
  private lastShotId = 0; private lastSurgeEv = 0;
  private lastHp = NaN;
  private lastX = NaN;
  private lastY = NaN;
  private moveHold = 0;
  private kaiAura: AuraView | null = null; private kaiAuraState: AuraState | null = null;
  private flash = 0; private readonly motion = new BodyMotion(); private baseScale = KAI_SCALE;
  private ghosts: { spr: Phaser.GameObjects.Sprite; life: number }[] = []; private ghostClock = 0;
  private furyId = 0; private furyBeat = -1; private furyTime = -9;
  /** Ren's last Crimson Fury beat and how long ago it landed, from the real ren_auto events (null before the first one) */
  private furyView(state: GameState): { beat: number; t: number } | null { for (const e of state.abilityEvents) if (e.id > this.furyId) { this.furyId = e.id; if (e.kind === 'ren_auto') { this.furyBeat = (e.n ?? 0) & 3; this.furyTime = state.time; } } return this.furyBeat < 0 ? null : { beat: this.furyBeat, t: state.time - this.furyTime }; }
  private heroDeadT = 0; private heroAnim: HeroAnimator | null | undefined; private heroAnchors: AnchorTable | undefined;
  private heroFx: HeroFxView | null = null; private heroBody: Phaser.GameObjects.Graphics | null = null;
  private orbs = new Map<number, { gem: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }>();
  /** `partner` = the second fighter of local co-op: the same hero pipeline, but no world (enemies, bosses, pickups) and no shared ability-event layers, which the first renderer already draws once. */
  constructor(private readonly scene: Phaser.Scene, private readonly partner = false, private readonly ownKaiFx = false) {
    const manifests = scene.registry.get(KAI_REGISTRY_KEY) as KaiManifests | undefined;
    if (!manifests) throw new Error('Kai animation manifests were not loaded by BootScene');
    this.f1 = scene.registry.get(KAI_F1_REGISTRY_KEY) as KaiManifests | undefined;
    this.f2 = scene.registry.get(KAI_F2_REGISTRY_KEY) as KaiManifests | undefined;
    this.f3 = scene.registry.get(KAI_F3_REGISTRY_KEY) as KaiManifests | undefined;
    this.hairLayer = new HairLayer(scene); this.outfitLayer = new OutfitLayer(scene, scene.registry.get(HAIR_ANCHORS_KEY) as HairTable | undefined); this.hairTable = scene.registry.get(HAIR_ANCHORS_KEY) as HairTable | undefined;
    this.manifests = manifests; this.animator = new KaiAnimator(manifests, this.f1, this.f2, this.f3); this.cometFx = new CometFx(scene); this.kitFx = new KaiKitFx(scene, this.f3); this.apexFx = new ApexFx(scene); this.formFx = new FormFx(scene); this.abilityFx = new AbilityFx(scene); this.enemies = partner ? null : new EnemyRenderer(scene); this.bosses = partner ? null : new BossRenderer(scene); this.anchors = scene.registry.get(KAI_ANCHORS_KEY) as AnchorTable | undefined;
    this.presence = new KaiPresence(scene); this.combatFx = new KaiCombatFx(scene);
    this.hero = scene.add.sprite(1100, 800, kaiTextureKey('south', 'Idle'), 0).setScale(KAI_SCALE).setDepth(10);
    this.legs = scene.add.sprite(1100, 800, kaiTextureKey('south', 'Run'), 0).setScale(KAI_SCALE).setDepth(9.9).setVisible(false);
    // Rim + stroke run per sprite (as in B20). While the two layers are split (moving cast) they are switched off, because each layer's open waist edge would get its own glow; the aura layer below carries the glow of the UNION silhouette instead.
    registerContourFilter(scene.game);
    for (const spr of [this.hero, this.legs]) { spr.enableFilters(); const ctl = new ContourController((spr.filters!.internal as unknown as { camera: unknown }).camera); (spr.filters!.internal as unknown as { add: (c: unknown) => void }).add(ctl); this.contour.push(ctl); this.rim.push(spr.filters!.internal.addGlow(0xd8f6ff, 1.6, 0, 1, false, 4, 2) as unknown as StrokeCtl); }
    // B21 aura: a mirrored copy of the body on its OWN layer BEHIND the character, filtered with a knockout glow (only the halo is drawn, never the body), so the aura can never tint or wash out the character's own colours.
    this.auraCopyHero = scene.add.sprite(0, 0, kaiTextureKey('south', 'Idle'), 0); this.auraCopyLegs = scene.add.sprite(0, 0, kaiTextureKey('south', 'Run'), 0).setVisible(false);
    this.auraBody = scene.add.container(0, 0, [this.auraCopyLegs, this.auraCopyHero]).setDepth(9.7).setVisible(false); this.auraBody.enableFilters();
    this.auraGlow.push(this.auraBody.filters!.internal.addGlow(0xffffff, 0, 0, 1, true, 4, 10) as unknown as StrokeCtl);
  }
  private lastRipEv = 0; private riposteAt = -99;
  private readonly hairDrv = new HairDriver(); private readonly hairLayer: HairLayer; private readonly outfitLayer: OutfitLayer; private readonly hairTable: HairTable | undefined;
  /** B23: the character's hair tips are deformed from real motion (hairRig); the roots stay pinned. */
  private hairStep(state: GameState, dt: number, hero: 'kai' | 'ren' | 'sora' | 'vex', key: string, frame: number, clip: string, hurt: boolean, reduced: boolean) {
    const p = state.player, st = HAIR_STYLE[styleFor(hero, p.form)], dead = state.phase === 'dead' || p.hp <= 0, cast = state.cast ?? state.hx.act;
    const o = this.hairDrv.update({ dt, vx: this.velX, vy: this.velY, maxSpeed: p.speed * 1.2, frozen: !!state.cinema || clip === 'Transform' || state.phase !== 'running', reduced, style: st, released: !!cast && cast.released, hurt, hurtDir: this.pose.facing === 'east' ? -1 : 1, dead });
    this.hairLayer.apply(this.hero, this.hairTable, key, frame, o.x, o.y, st.low, st.ramp);
    this.outfitLayer.update(this.hero, key, frame, this.pose.facing, hero, dead, dt);
  }
  private readonly contour: ContourController[] = []; private contourT = 0; private readonly rim: StrokeCtl[] = []; private readonly auraGlow: StrokeCtl[] = []; private readonly auraTrack = new AuraTracker(); private auraMotes: FxPool | null = null; private moteClock = 0;
  /** B21.3 (revised): the transformation aura now FITS the body like the stroke: a soft, form-coloured glow filter on the sprite's own silhouette that breathes with activity (idle < moving < dash < charge < release), instead of art wings that extend past the character. */
  private updateAura(state: GameState, dt: number, reduced: boolean) {
    const p = state.player, f = p.form, st: AuraState | null = state.hero === 'kai' ? (f === 1 ? 'flare' : f === 2 ? 'comet' : f === 3 ? 'still' : null) : f >= 1 ? (state.hero as 'ren' | 'sora') : null;
    const smp = this.auraTrack.update(state, state.phase === 'running' ? dt : 0, Math.hypot(p.vx, p.vy) / Math.max(1, p.speed)), t = state.time;
    const COL: Record<AuraState, number> = { ren: 0xff3a1a, sora: 0x2a9dff, flare: 0xff7a10, comet: 0xffb21a, still: 0x9fc4ff };   // deep hues: a pale glow colour saturates to white on the bright forms
    const on = !!st && state.phase === 'running' && p.hp > 0 && !state.cinema, crowd = state.enemies.length > 45 ? 0.8 : 1;
    let k = 0; if (on) { const flick = st === 'comet' ? 0.65 + 0.5 * Math.abs(Math.sin(Math.floor(t * 26) * 12.9898)) : st === 'still' ? 0.92 + 0.08 * Math.sin(t * 2.2) : 0.88 + 0.12 * Math.sin(t * 7.3); const WEIGHT: Record<AuraState, number> = { ren: 1, sora: 1, flare: 0.9, comet: 0.55, still: 0.5 }; k = Math.min(5, (2.4 + 3.6 * (smp.k - 0.5)) * WEIGHT[st!]) * flick * (reduced ? 0.55 : crowd); }   // per-form weight: bright gold forms need far less glow or the character washes out
    if (!PASSIVE_AURA) k = 0;
    for (const c of this.auraGlow) { c.outerStrength = Math.max(0, k); c.active = k > 0.02; if (st) c.color = (state.hero === 'vex' ? 0x8f5cff : COL[st]); }
    this.auraBody.setVisible(k > 0.02);   // inactive = the shader pass is skipped entirely, so untransformed heroes pay nothing
    // embers/motes that rise off the silhouette itself (never wider than the body), rate follows the activity state
    this.auraMotes ??= new FxPool(this.scene, 60);
    if (PASSIVE_AURA && on && !reduced && dt > 0) {
      this.moteClock += dt; const rate = (st === 'still' ? 7 : st === 'comet' ? 16 : 12) * (0.6 + smp.k), step = 1 / rate, solar = st === 'flare' || st === 'comet' || st === 'ren';
      while (this.moteClock > step) {
        this.moteClock -= step; const rnd = Math.random, side = rnd() < 0.5 ? -1 : 1, h = rnd() * 74, edge = (7 + 9 * (1 - h / 80)) * side;   // x hugs the torso edge, wider near the shoulders than the feet
        this.auraMotes.spawn({ key: vfxKey('mote' + ((rnd() * 3) | 0), solar), x: this.hero.x + edge * (0.8 + rnd() * 0.5) - smp.leanX * 6, y: this.hero.y - 6 - h, depth: 9.6, life: 0.55 + rnd() * 0.35, blend: 'add', tint: COL[st!], vx: side * 6 + (rnd() - 0.5) * 10 - smp.leanX * 30 * smp.lean, vy: -(26 + rnd() * 40), s0: 0.9, s1: 0.2, a0: 0.95, a1: 0, rot: rnd() * 6 });
      }
    }
    this.auraMotes.update(state.phase === 'running' ? dt : 0);
    this.auraSample = { st, smp, on };
  }
  private auraSample: { st: AuraState | null; smp: ReturnType<AuraTracker['update']>; on: boolean } = { st: null, smp: { phase: 'idle', k: 0.55, leanX: 0, leanY: 0, lean: 0, gather: 0, pulse: 0 }, on: false };
  /** B20: the transformation "stroke": a coloured outline hugging the body (Photoshop-style), part of the sprite instead of a floating aura. */
  private updateStroke(state: GameState, dt: number, reduced: boolean) {
    const f = state.player.form, h = state.hero;
    const key = formKey(h, f);
    const surge = h === 'kai' && f === 0 && (state.hx.kk?.surge ?? 0) > 0;
    const pal = key ? edgePalette(key) : surge ? CONTOUR.surge : null, on = !!pal && !state.cinema && state.phase !== 'dead';
    // the edge follows what the fighter is really doing (AuraTracker over sim state): idle breathing, run, dash, charge gather, release wave, settle. Intensity is eased, never stepped, so it cannot strobe.
    const st = EDGE_STATES[this.auraSample.smp.phase], calm = reduced ? 0.6 : 1, run = state.phase === 'running' ? dt : 0;
    const target = on ? (surge ? 0.7 : 1) * st.power * calm : 0;
    this.edgePower += (target - this.edgePower) * Math.min(1, run * 9 + (on ? 0 : 1)); this.edgeFlow += ((reduced ? 0.7 : st.flowMul) - this.edgeFlow) * Math.min(1, run * 6);
    this.contourT += run * this.edgeFlow; const split = this.legs.visible;
    for (const c of this.contour) { c.time = this.contourT; c.power = this.edgePower; if (pal) c.pal = pal; const kf = h === 'kai' ? (f === 2 ? [1.6, 1.7] : f === 3 ? [0.4, 0.3] : [1, 1]) : [1, 1]; c.jagAdd = reduced ? 0 : st.jagAdd * kf[0]; c.sparkAdd = reduced ? 0 : st.sparkAdd * kf[1]; c.active = on || this.edgePower > 0.02; }
    for (const c of this.rim) c.outerStrength = on || split ? 0 : 1.6;   // the thin pale readability rim is for untransformed runners only
  }
  private edgePower = 0; private edgeFlow = 1;
  /** B12: camera punch-in factor of the Form II reveal, and a pending visual hit-stop (ms) the scene turns into skipped sim ticks. */
  cameraZoom() { return this.cometFx.cameraZoom() * this.apexFx.cameraZoom() * (this.heroFx?.cameraZoom() ?? 1); }
  takeHitstop() { return Math.max(this.cometFx.takeHitstop(), this.apexFx.takeHitstop(), this.heroFx?.takeHitstop() ?? 0); }
  /** Hero animation state, for the dev-only QA hook. */
  deathPresented() { return this.heroFx ? (this.heroAnim ? this.heroAnim.deathPresented() : this.heroDeadT > 1) : this.animator.deathPresented(); }
  /** QA-only size comparison; the shipped default stays KAI_SCALE. */
  setHeroScale(scale: number) { this.baseScale = scale; this.hero.setScale(scale); this.legs.setScale(scale); }
  /** B21.3: Kai's three forms get the same living aura (gold flame, gold lightning, silver mist) layered behind the existing form effects. */
  private kaiForm(state: GameState, dt: number, dead: boolean, reduced: boolean) {
    const p = state.player, want = this.auraSample.st && state.hero === 'kai' ? this.auraSample.st : null;
    if (want !== this.kaiAuraState) { this.kaiAura?.destroy(); this.kaiAura = want ? new AuraView(this.scene, want) : null; this.kaiAuraState = want; }
    if (PASSIVE_AURA && this.kaiAura && state.phase === 'running' && !dead && !state.cinema) this.kaiAura.update(this.auraSample.smp, dt, { x: this.hero.x, y: Math.round(p.y + KAI_GROUND_DY) }, p.vx, p.vy, reduced ? 0.5 : 1, true); else this.kaiAura?.hide();
  }
  /** Copies the exact frame, origin, transform and visibility of both body layers onto the aura layer (called once the pose for this frame is final). */
  private mirrorAura() {
    if (!this.auraBody.visible) return;
    for (const [src, dst] of [[this.hero, this.auraCopyHero], [this.legs, this.auraCopyLegs]] as const) {
      if (dst.texture.key !== src.texture.key) dst.setTexture(src.texture.key);
      dst.setFrame(src.frame.name).setOrigin(src.originX, src.originY).setPosition(src.x, src.y).setScale(src.scaleX, src.scaleY).setRotation(src.rotation).setFlipX(src.flipX).setVisible(src.visible).setAlpha(src.alpha);
    }
  }
  /** Voidheart Exile: the runner levitates over a dark void disc, a broken crimson halo turns behind the head and shards orbit the body. */
  /** B21.1: spring lean / squash / bob around the feet for the current hero state (identity while dead, in a reveal or frozen). */
  private applyMotion(state: GameState, dt: number, hero: 'kai' | 'ren' | 'sora' | 'vex', reduced: boolean, hurt: boolean, dashing: boolean, clip: string, facing: string) {
    const p = state.player, frozen = !!state.cinema || clip === 'Transform' || state.phase !== 'running', cast = state.cast ?? state.hx.act;
    const m = this.motion.update({ dt, style: styleFor(hero, p.form), vx: this.velX, vy: this.velY, maxSpeed: p.speed * 1.2, dashing, dashDx: p.dashDx, dashDy: p.dashDy, casting: !!cast, released: !!cast && cast.released, hurt, hurtDir: facing === 'east' ? -1 : 1, alive: p.hp > 0, frozen, reduced });
    const bank = state.player.flyT > 0 ? Math.max(-0.4, Math.min(0.4, this.velX / 520)) : 0;
    for (const s of [this.hero, this.legs]) { s.setRotation(m.rot + bank).setScale(this.baseScale * m.sx, this.baseScale * m.sy); }
    this.hoverY = 0;
    this.hero.y += m.dy + this.hoverY; this.legs.y = this.hero.y;
    this.mirrorAura();
  }
  /** World position of Kai's fists for the frame on screen (Beam / Sphere clips only). */
  handAnchor() { return this.hand; }
  /** QA: the world point the beam/orb was last anchored to and whether it came from the sprite anchors or the sim fallback. */
  fxOrigin() { return this.abilityFx.lastOrigin; }
  debugPose() { return { lift: this.liftNow, ...this.pose, visualForm: this.animator.visualForm, transforming: this.animator.transforming, texture: this.hairLayer.srcKey || this.hero.texture.key, frameIndex: Number(this.hairLayer.srcFrame || this.hero.frame.name), outfit: this.outfitLayer.shown, hair: { x: this.hairDrv.spring.x, y: this.hairDrv.spring.y, live: this.hairLayer.active }, x: this.hero.x, y: this.hero.y, scale: this.baseScale }; }
  /** The sim only keeps player.vx/vy for Stillfire's glide, so the renderer derives the real velocity from displacement (eased; a teleport resets it). */
  private velX = 0; private velY = 0; private prevPX = NaN; private prevPY = NaN;
  private trackVelocity(state: GameState, dt: number) {
    const p = state.player; if (Number.isNaN(this.prevPX)) { this.prevPX = p.x; this.prevPY = p.y; }
    if (dt > 0) { const ddx = p.x - this.prevPX, ddy = p.y - this.prevPY; if (Math.hypot(ddx, ddy) > 90) { this.velX = this.velY = 0; } else { const k = Math.min(1, dt * 14); this.velX += (ddx / dt - this.velX) * k; this.velY += (ddy / dt - this.velY) * k; } }
    this.prevPX = p.x; this.prevPY = p.y;
  }
  sync(state: GameState, input: InputState, deltaMs = 0, reducedEffects = false) {
    this.trackVelocity(state, state.phase === 'running' ? Math.min(0.1, deltaMs / 1000) : 0);
    this.updateAura(state, Math.min(0.1, deltaMs / 1000), reducedEffects); this.updateStroke(state, Math.min(0.1, deltaMs / 1000), reducedEffects);
    if (state.hero !== 'kai') { this.syncHero(state, input, deltaMs, reducedEffects); this.syncWorld(state, deltaMs, reducedEffects); return; }
    const p = state.player;
    const dt = state.phase === 'running' || state.phase === 'dead' || state.phase === 'victory' ? Math.min(0.1, deltaMs / 1000) : 0;
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
    let lunge = false; for (const ev of state.abilityEvents) if (ev.id > this.lastSurgeEv && ev.kind === 'surge_start') lunge = true; for (const ev of state.abilityEvents) this.lastSurgeEv = Math.max(this.lastSurgeEv, ev.id);
    const period = Math.max(0.16, p.attackPeriod * (p.form ? 0.75 : 1));
    this.pose = this.animator.update({
      dt, alive: state.phase !== 'dead' && p.hp > 0, moving: (input.x !== 0 || input.y !== 0) && this.moveHold > 0, inputX: input.x, inputY: input.y,
      runSpeed: p.speed * (p.form === 3 ? 1.2 : p.form ? 1.16 : 1), lunge, dashing: p.dashRemaining > 0, dashX: p.dashDx, dashY: p.dashDy, dashRemaining: p.dashRemaining, hurt, form: p.form, cinema: state.cinema ? { t: state.cinema.t, dur: state.cinema.dur, commitAt: state.cinema.commitAt, to: state.cinema.to } : null,
      cast: state.cast ? { id: state.cast.id, kind: state.cast.kind, face: state.cast.face, t: state.cast.t, dur: state.cast.dur, dirX: state.cast.dirX, dirY: state.cast.dirY, released: state.cast.released, rt: state.cast.rt, form: state.cast.form } : null, beat: this.beatKind(state, shot !== null), flyT: p.flyT, attackClock: p.attackClock, hasTarget: target !== null, targetDx: target?.dx ?? 0, targetDy: target?.dy ?? 0, shot,
    }, period);
    const set = this.pose.form === 'f3' && this.f3 ? this.f3 : this.pose.form === 'f3' && this.f2 ? this.f2 : this.pose.form === 'f2' && this.f2 ? this.f2 : this.pose.form === 'f1' && this.f1 ? this.f1 : this.manifests;
    const m = set[this.pose.facing]; const fr = clipFrame(m, this.pose.clip);
    const artForm = this.pose.form === 'f3' && !this.f3 ? 'f2' : this.pose.form;
    const key = kaiTextureKey(this.pose.facing, this.pose.clip, artForm);
    if (this.hero.texture.key !== key && this.scene.textures.exists(key)) this.hero.setTexture(key);
    this.hero.setFrame(this.pose.frame);
    this.hero.setOrigin(fr.ox / fr.w, fr.oy / fr.h);
    this.liftNow = Math.round(p.air * FLY.lift * (this.baseScale / 0.5)); this.hero.setPosition(Math.round(p.x), Math.round(p.y + KAI_GROUND_DY) - this.liftNow);
    const dead = state.phase === 'dead' || p.hp <= 0;
    const alpha = !dead && this.pose.clip !== 'Transform' && p.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0 ? 0.86 : 1;   // B08.1: i-frames never grey Kai out (was 0.56)
    const hitFlash = !dead && p.invulnerable > RULES.contactInvulnerability - 0.1;   // a clear white 0.1 s flash says "you were hit" without dimming him afterwards
    this.hero.setAlpha(alpha * this.apexFx.heroAlphaMul);
    this.hero.tintMode = Phaser.TintModes.MULTIPLY; this.legs.tintMode = Phaser.TintModes.MULTIPLY;
    if (hitFlash && !state.cast) { this.hero.setTint(0xffeef2); this.hero.tintMode = Phaser.TintModes.FILL; this.legs.setTint(0xffeef2); this.legs.tintMode = Phaser.TintModes.FILL; } else this.hero.clearTint();   // Form I is separate art (kaif1-* sheets), never a tint of the base
    // attacking while moving: the hero sprite is the upper-body layer (RunPunchUpper), the legs sprite is the leg-phase-matched RunLower layer from the same rig, drawn under it. No pixel crop.
    if (this.pose.legs !== null) {
      const lf = clipFrame(m, 'RunLower'), lkey = kaiTextureKey(this.pose.facing, 'RunLower', artForm);
      if (this.legs.texture.key !== lkey) this.legs.setTexture(lkey);
      this.legs.setFrame(this.pose.legs).setOrigin(lf.ox / lf.w, lf.oy / lf.h);
      this.legs.setPosition(this.hero.x, this.hero.y).setAlpha(alpha * this.apexFx.heroAlphaMul).setVisible(true);
      if (!(hitFlash && !state.cast)) this.legs.clearTint();
    } else this.legs.setVisible(false);
    this.hairStep(state, dt, 'kai', key, this.pose.frame, this.pose.clip, hurt, reducedEffects);
    this.applyMotion(state, dt, 'kai', reducedEffects, hurt, p.dashRemaining > 0, this.pose.clip, this.pose.facing);
    this.ghostTrail(state, dt, this.hero.x, this.hero.y, 'kai', reducedEffects);
    this.kaiForm(state, dt, dead, reducedEffects);
    for (const e of this.pose.events) {
      this.scene.events.emit('kai-form', e);
      if (e === 'form_commit' && this.pose.form === 'f2') this.flash = 0.1;
      else if (e === 'form_commit') { this.flash = 0.07; if (!reducedEffects) this.scene.cameras.main.shake(110, 0.0025); }   // the reveal: a one-frame white-hot flash of the Form I sprite and a tiny camera kick
    }
    if (this.cometFx.flashing) this.flash = Math.max(this.flash, 0.04);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt); for (const spr of [this.hero, this.legs]) { spr.setTint(0xfff2cc); spr.tintMode = Phaser.TintModes.FILL; } }   // sound hook: no licensed/original audio ships yet, an audio layer can subscribe to scene.events 'kai-form' ('form_start' | 'form_commit' | 'form_end')
    const emphasis = state.cast ? (state.cast.released ? 1 : 0.7) : p.dashRemaining > 0 ? 0.7 : 0;   // heavier presence while charging, firing, throwing and dashing
    this.formFx.update(dt, this.hero.x, this.hero.y, this.baseScale / KAI_SCALE, this.animator.visualForm === 'f1', !dead, this.pose.events, reducedEffects, emphasis, state.enemies.length > 45, this.hero);
    const dead2 = dead;
    this.hand = this.anchors ? handAnchorWorld(this.anchors, this.pose.form, this.pose.facing, this.pose.clip, this.pose.frame, this.hero.x, this.hero.y, this.baseScale) : null;
    if (!this.partner || this.ownKaiFx) { this.abilityFx.update(dt, state, reducedEffects, this.animator.visualForm !== 'base', this.hand); this.kitFx.update(dt, state, reducedEffects, this.baseScale); }   // a Kai partner of a non-Kai runner draws their own ability layers (the first renderer draws Ren / Sora / Vex layers through heroFx)
    this.apexFx.update({ dt, state, hero: this.hero, x: this.hero.x, y: this.hero.y, facing: this.pose.facing, reduced: reducedEffects, crowded: state.enemies.length > 45, f3: this.animator.visualForm === 'f3' && !dead2,
      moving: (input.x !== 0 || input.y !== 0) && this.moveHold > 0, speed: Math.hypot(p.vx, p.vy), dashing: p.dashRemaining > 0, hand: this.hand, events: this.pose.events });
    this.cometFx.update({ dt, state, hero: this.hero, x: this.hero.x, y: this.hero.y, facing: this.pose.facing, reduced: reducedEffects, crowded: state.enemies.length > 45, f2: this.animator.visualForm === 'f2' && !dead2 && p.form !== 3 && state.cinema?.to !== 3,
      moving: (input.x !== 0 || input.y !== 0) && this.moveHold > 0, speed: p.speed * (p.form ? 1.16 : 1), dashing: p.dashRemaining > 0, hand: this.hand, events: this.pose.events });
    this.presence.update({ dt, form: p.form as 0 | 1 | 2 | 3, on: state.hero === 'kai' && p.form > 0 && !dead2 && !state.cinema && this.hero.visible, hero: this.hero, srcKey: this.hairLayer.srcKey || this.hero.texture.key, srcFrame: this.hairLayer.srcKey ? this.hairLayer.srcFrame : this.pose.frame, scale: this.baseScale, dashing: p.dashRemaining > 0, casting: !!state.cast, reduced: reducedEffects, crowded: state.enemies.length > 45, hand: this.hand, running: state.phase === 'running' });
    this.combatFx.update({ facing: this.pose.facing, dt, state, hero: this.hero, hand: this.hand, scale: this.baseScale, reduced: reducedEffects, running: state.phase === 'running', dead: dead2, crowded: state.enemies.length > 45 });
    for (const ev of state.abilityEvents) if (ev.id > this.presenceEv) { this.presenceEv = ev.id; if (p.form > 0 && /^(beam_fire|comet_fire|rift_fire|dragon_launch|sphere_burst|form3_dash|flare_pillar|crucible_final|meteor_beat)$/.test(ev.kind)) this.presence.burst(this.hero.x, this.hero.y - 2, p.form, /^(beam_fire|comet_fire|rift_fire)$/.test(ev.kind) ? 1.1 : 0.8); }
    this.syncWorld(state, deltaMs, reducedEffects);
  }
  /** Kind of the auto beat that is about to fire (or just fired this frame), so the animator picks the matching strike clip. */
  private beatKind(state: GameState, fired: boolean): string | undefined {
    if (state.hero !== 'kai') return undefined; const prof = AUTO[state.player.form as 0 | 1 | 2 | 3], n = prof.beats.length, st = state.hx.autoStep;
    return prof.beats[(fired ? st - 1 + n : st) % n].kind;
  }
  private renFox: RenFox | null = null; private soraFx: SoraPhoenix | null = null; private liftNow = 0; private readonly presence: KaiPresence; private readonly combatFx: KaiCombatFx; private presenceEv = 0;
  /** B19: Ren / Sora. The character sprite is drawn from the hero sheets when they exist (HeroAnimator over the same sheet contract as Kai); a flat dev body stands in only while a hero has no sheets. The effects layer is always the sim projection in heroFxView. */
  private syncHero(state: GameState, input: InputState, deltaMs: number, reduced: boolean) {
    const p = state.player, dt = state.phase === 'running' || state.phase === 'dead' || state.phase === 'victory' ? Math.min(0.1, deltaMs / 1000) : 0, hero = state.hero as HeroArt;
    const hurt = !Number.isNaN(this.lastHp) && p.hp < this.lastHp && p.hp > 0; this.lastHp = p.hp;
    if (Number.isNaN(this.lastX)) { this.lastX = p.x; this.lastY = p.y; }
    if (Math.hypot(p.x - this.lastX, p.y - this.lastY) > 0.05) this.moveHold = 0.1; else this.moveHold = Math.max(0, this.moveHold - dt);
    this.lastX = p.x; this.lastY = p.y;
    if (!this.heroFx) { this.heroFx = new HeroFxView(this.scene, rigOf(hero), hero); this.heroBody = this.scene.add.graphics().setDepth(10); }
    if (this.heroAnim === undefined) {
      const b = this.scene.registry.get(HERO_REGISTRY_KEY(hero, 'base')) as KaiManifests | undefined;
      this.heroAnim = b ? new HeroAnimator(hero, b, this.scene.registry.get(HERO_REGISTRY_KEY(hero, 'f1')) as KaiManifests | undefined) : null; this.heroAnchors = this.scene.registry.get(HERO_ANCHORS_KEY(hero)) as AnchorTable | undefined;
    }
    const fx = this.heroFx, body = this.heroBody!, x = Math.round(p.x), y = Math.round(p.y + KAI_GROUND_DY), dead = state.phase === 'dead' || p.hp <= 0, anim = this.heroAnim;
    body.clear();
    if (anim) {
      for (const ev of state.abilityEvents) if (ev.id > this.lastRipEv) { this.lastRipEv = ev.id; if (ev.kind === 'parry_perfect' || ev.kind === 'reversal_riposte') this.riposteAt = state.time; }
      const c = state.hx.act, view: HeroActView | null = c ? { riposte: state.time - this.riposteAt, id: c.id, act: c.act, t: c.t, dur: c.dur, face: c.face, released: c.released, moving: c.moving, beats: c.beats, hop: c.hop, hops: c.hops.length, hopT: c.hopT, charge: c.charge } : null;
      const pose = anim.update({ dt, alive: !dead, moving: (input.x !== 0 || input.y !== 0) && this.moveHold > 0, inputX: input.x, inputY: input.y, runSpeed: p.speed * (p.form ? 1.1 : 1), dashing: p.dashRemaining > 0, dashX: p.dashDx, dashY: p.dashDy, dashRemaining: p.dashRemaining, hurt, form: p.form, cinema: state.cinema ? { t: state.cinema.t, dur: state.cinema.dur, commitAt: state.cinema.commitAt } : null, act: view, strike: state.hx.strike, fury: this.furyView(state), flyT: p.flyT });
      this.pose = pose; const form: 'base' | 'f1' = pose.form === 'f1' ? 'f1' : 'base';
      // one appearance for BOTH body layers: Voidheart Exile (Vex f2) resolves its upper, legs and anchors from the same set
      const look: HeroForm = hero === 'vex' && p.form === 2 && form === 'f1' && !!this.scene.registry.get(HERO_REGISTRY_KEY(hero, 'f2')) ? 'f2' : form, set = this.scene.registry.get(HERO_REGISTRY_KEY(hero, look)) as KaiManifests, m = set[pose.facing], fr = clipFrame(m, pose.clip), key = heroTextureKey(hero, pose.facing, pose.clip, look);
      if (this.hero.texture.key !== key) this.hero.setTexture(key);
      this.hero.setFrame(pose.frame).setOrigin(fr.ox / fr.w, fr.oy / fr.h).setPosition(x, y).setVisible(true);
      const hitFlash = !dead && p.invulnerable > RULES.contactInvulnerability - 0.1 && !state.hx.act, alpha = !dead && pose.clip !== 'Transform' && p.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0 ? 0.86 : 1;
      this.hero.setAlpha(alpha); this.hero.tintMode = Phaser.TintModes.MULTIPLY; this.legs.tintMode = Phaser.TintModes.MULTIPLY;
      if (hitFlash) { this.hero.setTint(0xffeef2); this.hero.tintMode = Phaser.TintModes.FILL; } else this.hero.clearTint();   // Voidheart Exile is its own recoloured sheet set (vexf2-*), not a tint
      if (pose.legs !== null) {
        const lf = clipFrame(m, 'RunLower'), lkey = heroTextureKey(hero, pose.facing, 'RunLower', look); if (this.legs.texture.key !== lkey) this.legs.setTexture(lkey);
        this.legs.setFrame(pose.legs).setOrigin(lf.ox / lf.w, lf.oy / lf.h).setPosition(x, y).setAlpha(alpha).setVisible(true); if (hitFlash) { this.legs.setTint(0xffeef2); this.legs.tintMode = Phaser.TintModes.FILL; } else this.legs.clearTint();
      } else this.legs.setVisible(false);
      this.hairStep(state, dt, hero, key, pose.frame, pose.clip, hurt, reduced);
      this.applyMotion(state, dt, hero, reduced, hurt, p.dashRemaining > 0, pose.clip, pose.facing);
      this.ghostTrail(state, dt, x, y, rigOf(hero), reduced); this.blinkTrail(state, dt, reduced);
      this.hand = this.heroAnchors ? handAnchorWorld(this.heroAnchors, form, pose.facing, pose.clip, pose.frame, x, y + this.hoverY, this.baseScale) : null;

    } else {
      this.hero.setVisible(false); this.legs.setVisible(false); this.heroDeadT = dead ? this.heroDeadT + dt : 0; const ren = hero === 'ren';
      body.fillStyle(0x000000, 0.3).fillEllipse(x, y, 36, 12);
      if (!dead) { body.fillStyle(ren ? (p.form ? 0xb8141c : 0x4a1018) : (p.form ? 0x2a78e0 : 0x16264f), 1).fillRoundedRect(x - 14, y - 62, 28, 56, 8); body.fillStyle(ren ? 0xffd2a8 : 0xe8f3ff, 1).fillCircle(x, y - 66, 11); body.fillStyle(0xffffff, 0.9).fillTriangle(x + p.aimX * 22, y - 36 + p.aimY * 12, x + p.aimX * 12 - p.aimY * 6, y - 36 + p.aimY * 6 + p.aimX * 6, x + p.aimX * 12 + p.aimY * 6, y - 36 + p.aimY * 6 - p.aimX * 6); }   // dev placeholder body, only while a hero has no sheets
    }
    if (hero === 'sora') { this.soraFx ??= new SoraPhoenix(this.scene); this.soraFx.update({ dt, state, hero: this.hero, hand: this.hand, scale: this.baseScale, reduced, running: state.phase === 'running', dead, crowded: state.enemies.length > 45, facing: this.pose.facing, shake: !this.partner }); }
    if (hero === 'ren') { this.renFox ??= new RenFox(this.scene); this.renFox.update({ dt, state, hero: this.hero, hand: this.hand, scale: this.baseScale, reduced, running: state.phase === 'running', dead, crowded: state.enemies.length > 45, facing: this.pose.facing, shake: !this.partner }); }
    fx.update(state, dt, reduced, state.enemies.length > 45, x, y);
    const sh = fx.takeShake(); if (sh > 0 && !reduced) this.scene.cameras.main.shake(110, sh);
  }
  /** Vex Rift Reversal: a row of violet afterimages is left along the whole blink path (the shift itself is instant in the sim), and the body flickers in from the exit. */
  private blinkTrail(state: GameState, dt: number, reduced: boolean) {
    const c = state.hero === 'vex' ? state.hx.act : null;
    if (c && c.act === 'rift_reversal' && c.sx !== undefined && c.id !== this.blinkId && this.hero.visible) {
      this.blinkId = c.id; const sx = c.sx, sy = (c.sy ?? 0) + KAI_GROUND_DY, tx = c.tx ?? sx, ty = (c.ty ?? c.sy ?? 0) + KAI_GROUND_DY, n = reduced ? 3 : 7;
      for (let k = 0; k < n; k++) { const u = k / n; this.blinkGhosts.push({ spr: this.scene.add.sprite(sx + (tx - sx) * u, sy + (ty - sy) * u + this.hoverY, this.hairLayer.srcKey || this.hero.texture.key, this.hairLayer.srcFrame).setOrigin(this.hero.originX, this.hero.originY).setScale(this.hero.scaleX, this.hero.scaleY).setFlipX(this.hero.flipX).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.2).setTint(k % 2 ? vexTint(state.player.form).hot : vexTint(state.player.form).main), life: 0.42 + u * 0.12, max: 0.42 + u * 0.12 }); this.blinkGhosts[this.blinkGhosts.length - 1].spr.tintMode = Phaser.TintModes.FILL; }
      this.blinkFlicker = 0.3;
    }
    for (let k = this.blinkGhosts.length - 1; k >= 0; k--) { const g = this.blinkGhosts[k]; g.life -= dt; if (g.life <= 0) { g.spr.destroy(); this.blinkGhosts.splice(k, 1); continue; } g.spr.setAlpha((g.life / g.max) * 0.85).setScale(g.spr.scaleX * (1 + dt * 0.4)); }
    if (this.blinkFlicker > 0) { this.blinkFlicker -= dt; this.hero.setAlpha(Math.floor(this.blinkFlicker * 40) % 2 ? 0.45 : 1); this.legs.setAlpha(this.hero.alpha); }
  }
  /** Afterimages behind a rushing / dashing hero: pooled copies of the current frame, additive and tinted (crimson for Ren, blue-white for Sora), fading in ~0.28 s. */
  private ghostTrail(state: GameState, dt: number, x: number, y: number, hero: 'ren' | 'sora' | 'kai', reduced: boolean) {
    const p = state.player, surge = state.hero === 'kai' && (state.hx.kk?.surge ?? 0) > 0 && Math.hypot(p.vx, p.vy) > 20, fast = surge || (state.hero !== 'kai' && (state.hx.act?.act === 'meteor_rush' || (state.hero === 'ren' && p.form >= 1 && (state.hx.act?.act === 'scarlet_rampage' || p.flyT > 0)) || p.dashRemaining > 0)), cap = reduced ? 3 : 8;
    this.ghostClock -= dt;
    if (fast && this.ghostClock <= 0 && this.hero.visible) {
      this.ghostClock = p.form ? 0.028 : 0.04;
      let g = this.ghosts.find(q => q.life <= 0); if (!g && this.ghosts.length < cap) { g = { spr: this.scene.add.sprite(0, 0, this.hairLayer.srcKey || this.hero.texture.key, 0).setScale(this.hero.scaleX).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.2), life: 0 }; this.ghosts.push(g); }
      if (g) { g.life = 0.28; g.spr.setTexture(this.hairLayer.srcKey || this.hero.texture.key, this.hairLayer.srcFrame).setOrigin(this.hero.originX, this.hero.originY).setPosition(x, y).setTint(surge ? 0x4fb8ff : state.hero === 'vex' ? vexTint(state.player.form).ghost : hero === 'ren' ? 0xff3a2e : 0x6fc8ff); g.spr.tintMode = Phaser.TintModes.FILL; }
    }
    for (const g of this.ghosts) { if (g.life > 0) { g.life -= dt; g.spr.setVisible(g.life > 0).setAlpha(Math.max(0, g.life / 0.28) * (p.form ? 0.55 : 0.4)); } else g.spr.setVisible(false); }
  }
  private syncWorld(state: GameState, deltaMs: number, reducedEffects: boolean) {
    if (this.partner) return;
    this.enemies!.sync(state, deltaMs / 1000, reducedEffects);
    this.bosses!.sync(state, deltaMs / 1000, reducedEffects);
    const activeOrbs = new Set<number>();
    for (const p of state.pickups) {
      activeOrbs.add(p.id);
      let orb = this.orbs.get(p.id); const tier = p.tier ?? (p.xp >= 3 ? 1 : 0);
      if (!orb) {
        const glow = this.scene.add.image(p.x, p.y, vfxKey('spark', false)).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.9).setTint(tier === 3 ? 0xffd98a : tier === 2 ? 0xbfe8ff : 0x5fe3d6).setScale([0.3, 0.4, 0.55, 0.9][tier]).setVisible(!reducedEffects);
        orb = { gem: this.scene.add.image(p.x, p.y, `xpgem${tier}`).setScale(0.5).setDepth(4), glow }; this.orbs.set(p.id, orb);
      }
      const bob = Math.sin(p.age * 4 + p.id) * 3, fading = p.age > 38 ? (Math.sin(p.age * 18) > 0 ? 1 : 0.35) : 1;   // the last seconds before a crystal fades flicker
      orb.gem.setPosition(Math.round(p.x), Math.round(p.y + bob)).setAlpha(fading); orb.glow.setPosition(Math.round(p.x), Math.round(p.y + bob)).setAlpha((0.55 + 0.25 * Math.sin(p.age * 5 + p.id)) * fading);
    }
    for (const [id, orb] of this.orbs) if (!activeOrbs.has(id)) { orb.gem.destroy(); orb.glow.destroy(); this.orbs.delete(id); }
  }
  enemyStats() { return { ...this.enemies!.stats(), boss: this.bosses!.stats() }; }
  destroy() { this.combatFx.destroy(); this.presence.destroy(); this.outfitLayer.destroy(); this.kitFx.destroy(); this.auraBody.destroy(); this.auraMotes?.destroy(); this.kaiAura?.destroy(); this.cometFx.destroy(); this.apexFx.destroy(); this.formFx.destroy(); this.abilityFx.destroy(); this.enemies?.destroy(); this.bosses?.destroy(); this.hero.destroy(); this.legs.destroy(); for (const g of this.blinkGhosts) g.spr.destroy(); this.heroFx?.destroy(); this.renFox?.destroy(); this.soraFx?.destroy(); this.heroBody?.destroy(); for (const g of this.ghosts) g.spr.destroy(); for (const orb of this.orbs.values()) { orb.gem.destroy(); orb.glow.destroy(); } this.orbs.clear(); this.hairLayer.destroy(); }
}

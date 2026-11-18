import Phaser from 'phaser';
import { isHeroId } from '../../content/heroes';
import { applyHero } from '../../sim/RunConfig';
import { Simulation } from '../../sim/Simulation';
import { FixedStep } from '../../sim/FixedStep';
import { GameBridge } from '../../bridge/GameBridge';
import { InputController } from '../input/InputController';
import { EntityRenderer } from '../render/EntityRenderer';
import { EffectsRenderer } from '../render/EffectsRenderer';
import { followPlayer, fitZoom } from '../render/CameraController';
import { Presentation } from '../render/arenaArt';
import { Ambience, ArenaHazardView, ArenaProps, createArenaFloor } from '../render/arenaWorld';
import { NO_CONFIG } from '../../sim/RunConfig';
import { RemoteSimulation } from '../../net/RemoteSimulation';
import { slotPlayer } from '../../sim/CoopSystem';
import { B22Overlay, RealmProps, createRealmFloor } from '../render/realmWorld';
import { ARENAS as ARENA_DEFS } from '../../content/arenas';
import type { ArenaId } from '../../content/arenas';
import { ArenaMarks } from '../render/arenaMarks';
import { LightLayer } from '../render/lightLayer';
import { EvoFx } from '../render/evoFx';
import type { InputState } from '../../sim/GameState';
import { DebugOverlay } from '../render/debugOverlay';
import { startEncounter, spawnBoss } from '../../sim/BossAiSystem';
import { addEnemy } from '../../sim/EntityRegistry';
import { ENEMIES, isBoss as isBossKind, type MobKind } from '../../content/enemies';
import { damageEnemy } from '../../sim/CombatSystem';
import { sharedAbilityAudio, type AbilityAudio, type B21Sound } from '../audio/abilityAudio';
/** presentation hold after the finale boss falls (render time only; the sim is already in the victory phase) */
const VICTORY_CELEBRATE_MS = 1800, VICTORY_RESULTS_MS = 4300;
export class ArenaScene extends Phaser.Scene {
  private simulation!: Simulation;
  private controller!: InputController;
  private entityRenderer!: EntityRenderer;
  private fx!: EffectsRenderer;
  private presentation!: Presentation;
  private fixed = new FixedStep();
  private publishClock = 0; private victoryClock = -1;
  private celebrated = false;
  private disposed = false;
  private debug: DebugOverlay | null = null;
  private props: ArenaProps | null = null; private ambience: Ambience | null = null; private hazardView: ArenaHazardView | null = null;
  private audio: AbilityAudio | null = null; private marks: ArenaMarks | null = null; private floorLights: LightLayer | null = null; private evoFx: EvoFx | null = null;
  private readonly onCue = (name: B21Sound, vol?: number, rate?: number) => { this.audio?.cue(name, vol ?? 1, rate ?? 1); };
  private readonly unlockAudio = () => { void this.audio?.unlock(); };
  private hitstopLeft = 0;
  /** Reduced Effects setting OR the OS-level prefers-reduced-motion request: both calm the presentation (never the simulation). */
  private get reduced() { return this.bridge.getSettings().reducedEffects || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  private lastPtrX = NaN; private lastPtrY = NaN;
  private lastInput: InputState = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false };
  constructor(private readonly bridge: GameBridge, private readonly seed: number, private readonly arena: ArenaId = 'gloam') { super({ key: 'ArenaScene' }); }
  create() {
    const net = this.bridge.getNet();
    this.simulation = net ? new RemoteSimulation(net, this.seed, this.arena) as unknown as Simulation : new Simulation(this.seed, this.arena, this.bridge.getUnlocks().cometheart, !!this.bridge.getUnlocks().stillfire, this.bridge.getRunConfig());
    const applyZoom = () => this.cameras.main.setZoom(fitZoom(this.scale.width, this.scale.height));
    applyZoom(); this.scale.on(Phaser.Scale.Events.RESIZE, applyZoom);
    this.createArena();
    this.entityRenderer = new EntityRenderer(this);
    this.fx = new EffectsRenderer(this);
    this.controller = new InputController(() => this.bridge.togglePause(), () => { if (this.bridge.getSettings().pauseOnBlur) this.bridge.pause(); }, () => this.bridge.pause());
    { const hp = this.bridge.getPartner(); if (hp) { this.simulation.joinPartner({ ...NO_CONFIG, hero: hp }, 'local', ['P1', 'P2']); this.controller.coop = true; } }
    this.bridge.bind(this.simulation); this.bridge.setInjector(code => this.controller?.inject(code));
    this.audio = sharedAbilityAudio(); this.events.on('b21-cue', this.onCue); this.audio?.setMuted(this.bridge.getSettings().mute);
    window.addEventListener('keydown', this.unlockAudio); window.addEventListener('pointerdown', this.unlockAudio);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dispose());
    window.dispatchEvent(new CustomEvent('kyntraze-ready'));
    this.game.events.once(Phaser.Core.Events.DESTROY, () => this.dispose());
    // QA-only escape hatch: dev server AND explicit ?qa=1; never a shipping cheat.
    const qs = new URLSearchParams(window.location.search);
    if (import.meta.env.DEV && qs.get('qa') === '1') {
      if (qs.get('form3') === '1') { const st = this.simulation.state; st.cometUnlocked = true; st.apexUnlocked = true; st.apexGate = 0; st.player.drive = 100; }   // QA / owner route: Cometheart + Stillfire Apex unlocked, no time gate, Drive full (F = tap the selected form, hold F to choose)
      if (qs.get('form2') === '1') { const st = this.simulation.state; st.cometUnlocked = true; st.player.drive = 100; }   // QA / owner route: Cometheart unlocked and Drive full (F awakens it)
      { const qh = qs.get('hero'); if (isHeroId(qh)) { const st = this.simulation.state, asc = qs.get('ascend') === '1'; applyHero(st, qh, asc || st.heroFormUnlocked); if (asc) { st.player.drive = 100; if (qh === 'vex') { st.b22.vex.forms = [true, true]; st.heroFormUnlocked = true; } } } }   // B19 QA / owner route: ?qa=1&hero=ren|sora[&ascend=1] (form unlocked, Drive full, F awakens it)
      if (qs.get('debug') === 'hit') this.debug = new DebugOverlay(this);
      const enc = qs.get('encounter'); if (enc) startEncounter(this.simulation.state, enc as Parameters<typeof startEncounter>[1]);
      (window as Window & { __KYNT_QA__?: { grantXp: (offers?: string[]) => void; heroPose: () => unknown; setHeroScale: (n: number) => void; sim: () => unknown; spawn: (kind: string, dx?: number, dy?: number) => void; enemyStats: () => unknown; encounter: (id: string) => void; arenaHazard: () => void; scene: () => unknown; hand: () => unknown; fxOrigin: () => unknown; audio: () => unknown } }).__KYNT_QA__ = { grantXp: (offers?: string[]) => this.bridge.debugGrantXp(offers as never), heroPose: () => this.entityRenderer.debugPose(), hand: () => this.entityRenderer.handAnchor(), fxOrigin: () => this.entityRenderer.fxOrigin(), audio: () => ({ state: this.audio?.state ?? 'none', loaded: this.audio?.loaded ?? 0, active: this.audio?.activeVoices ?? 0, started: [...(this.audio?.started ?? [])], cue: this.audio?.music?.cue ?? null, musicLog: [...(this.audio?.music?.log ?? [])], volume: this.audio?.volume }), setHeroScale: (n: number) => this.entityRenderer.setHeroScale(n), sim: () => this.simulation.state, spawn: (kind: string, dx = 120, dy = 0) => { const st = this.simulation.state; if (isBossKind(kind as never)) { const b = spawnBoss(st, kind as never); if (b) { st.player.x = b.x - dx; st.player.y = b.y - dy; } return; } const d = ENEMIES[kind as MobKind]; addEnemy(st, { kind: kind as MobKind, x: st.player.x + dx, y: st.player.y + dy, hp: d.hp, maxHp: d.hp, radius: d.radius, speed: 0, damage: 0, touchCooldown: 0, attackCd: 99, aimX: -1, aimY: 0, mode: 'move', stepId: 'qa' } as never); }, enemyStats: () => this.entityRenderer.enemyStats(), scene: () => this, arenaHazard: () => { this.simulation.state.arenaHazard.nextAt = this.simulation.state.time; }, encounter: (id: string) => startEncounter(this.simulation.state, id as Parameters<typeof startEncounter>[1]) };
      (window as unknown as { __KYNT_QA__: Record<string, unknown> }).__KYNT_QA__.killBoss = (kind: string) => { const b = this.simulation.state.enemies.find(e => e.kind === kind && e.hp > 0); if (b) { if (b.ai) b.ai.invuln = false; damageEnemy(this.simulation.state, b, 1e9); } };
    }
  }
  private b22: B22Overlay | null = null; private realmProps: RealmProps | null = null;
  private createArena() { const proc = !!ARENA_DEFS[this.arena].procedural; if (proc) { createRealmFloor(this, this.arena); this.realmProps = new RealmProps(this, this.arena); } else { createArenaFloor(this, this.arena); this.props = new ArenaProps(this, this.arena); this.ambience = import.meta.env.DEV && new URLSearchParams(window.location.search).get('noamb') === '1' ? null : new Ambience(this, this.arena); this.hazardView = new ArenaHazardView(this); } this.b22 = new B22Overlay(this); this.marks = new ArenaMarks(this, this.arena); this.floorLights = new LightLayer(this); this.evoFx = new EvoFx(this); this.presentation = new Presentation(this); }
  update(_time: number, delta: number) {
    if (this.disposed || !this.simulation) return;
    // Sample action key presses per authoritative simulation tick so 120Hz displays
    // cannot swallow a dash/Q/F press on a frame without a fixed step.
    { const ptr = this.input.activePointer, w = this.cameras.main.getWorldPoint(ptr.x, ptr.y), pl = this.simulation.state.player, dx = w.x - pl.x, dy = w.y - (pl.y + 6), d = Math.hypot(dx, dy), moved = ptr.x !== this.lastPtrX || ptr.y !== this.lastPtrY || ptr.isDown; this.lastPtrX = ptr.x; this.lastPtrY = ptr.y; this.controller.setPointerAim(d > 14 ? { x: dx / d, y: dy / d, d } : null, moved); this.controller.selectorOpen = pl && this.simulation.state.selector.open; }   // B13: Silver Rift aim
    let simDelta = delta; if (this.hitstopLeft > 0) { this.hitstopLeft -= delta; simDelta = 0; }   // B12: a visual hit-stop is just skipped sim ticks (the sim itself is never slowed or edited)
    this.fixed.tick(simDelta, dt => { this.lastInput = this.controller.read(); if (this.simulation.state.party) this.simulation.step(dt, this.lastInput, this.controller.readP2()); else this.simulation.step(dt, this.lastInput); });
    const s = this.simulation.state;
    this.cameras.main.setZoom(fitZoom(this.scale.width, this.scale.height) * this.entityRenderer.cameraZoom());
    { const P = s.party; if (P) { const o = slotPlayer(s, 1), mx = (s.player.x + o.x) / 2, my = (s.player.y + o.y) / 2, d = Math.hypot(s.player.x - o.x, s.player.y - o.y); followPlayer(this.cameras.main, mx, my); this.cameras.main.setZoom(fitZoom(this.scale.width, this.scale.height) * this.entityRenderer.cameraZoom() * Math.max(0.55, Math.min(1, 760 / Math.max(760, d + 320)))); } else followPlayer(this.cameras.main, s.player.x, s.player.y); }
    this.entityRenderer.sync(s, this.lastInput, simDelta === 0 && s.phase === 'running' ? 0 : delta, this.reduced);
    this.hitstopLeft = Math.max(this.hitstopLeft, this.entityRenderer.takeHitstop());
    if (s.phase === 'dead' && this.entityRenderer.deathPresented()) this.bridge.markDeathShown();
    const hp = this.entityRenderer.debugPose(); this.presentation.update(s, hp.x, hp.y, hp.visualForm !== 'base', this.reduced);
    this.b22?.update(s, s.phase === 'running' ? delta / 1000 : 0, this.reduced);
    this.props?.update(s, this.time.now / 1000); this.ambience?.update(this.time.now / 1000, this.reduced); this.hazardView?.sync(s, s.phase === 'running' ? delta / 1000 : 0); this.marks?.update(s, delta / 1000, this.reduced); this.floorLights?.update(s, delta / 1000, this.reduced); this.evoFx?.update(s, delta / 1000, this.reduced);
    if (s.phase === 'victory') {
      // the Seraph's death is staged for ~2.8 s (suspension, shimmer, dissolve): the gold celebration waits for the shimmer and the results screen for the end of the dissolve
      if (this.victoryClock < 0) { this.victoryClock = 0; this.celebrated = false; }
      this.victoryClock += delta; if (!this.celebrated && this.victoryClock >= VICTORY_CELEBRATE_MS) { this.celebrated = true; this.celebrate(s.player.x, s.player.y); }
      if (this.victoryClock > VICTORY_RESULTS_MS) this.bridge.markVictoryShown();
    } else this.victoryClock = -1;
    this.debug?.draw(s);
    this.fx.render(s, this.reduced);
    this.audio?.setMuted(this.bridge.getSettings().mute); this.audio?.sync(s);
    this.publishClock += delta;
    if ((s.phase === 'running' && this.publishClock >= 100) || this.bridge.snapshot().phase !== s.phase) { this.publishClock = 0; this.bridge.publish(); }
  }
  /** Finale beat: a white-gold flash, a camera kick and three expanding gold shock rings from Kai (rings only with effects on). */
  private celebrate(x: number, y: number) {
    const reduced = this.reduced; if (reduced) return;
    this.cameras.main.flash(600, 255, 232, 170); this.cameras.main.shake(380, 0.004);
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(x, y + 10, 14).setStrokeStyle(4 - i, i === 1 ? 0x9ff7ff : 0xffd98a, 0.8).setFillStyle(0, 0).setDepth(30).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2);
      this.tweens.add({ targets: ring, scale: 18 + i * 5, alpha: 0, duration: 1200 + i * 300, delay: i * 260, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
  }
  private dispose() {
    if (this.disposed) return; this.disposed = true; this.scale.off(Phaser.Scale.Events.RESIZE);
    this.events.off('b21-cue', this.onCue); window.removeEventListener('keydown', this.unlockAudio); window.removeEventListener('pointerdown', this.unlockAudio); this.audio?.dispose();
    this.controller?.destroy(); this.entityRenderer?.destroy(); this.fx?.destroy(); this.presentation?.destroy(); this.debug?.destroy(); this.props?.destroy(); this.realmProps?.destroy(); this.b22?.destroy(); this.ambience?.destroy(); this.hazardView?.destroy(); this.marks?.destroy(); this.floorLights?.destroy(); this.evoFx?.destroy(); this.bridge.unbind();
    delete (window as Window & { __KYNT_QA__?: unknown }).__KYNT_QA__;
  }
}

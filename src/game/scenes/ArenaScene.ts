import Phaser from 'phaser';
import { Simulation } from '../../sim/Simulation';
import { FixedStep } from '../../sim/FixedStep';
import { GameBridge } from '../../bridge/GameBridge';
import { InputController } from '../input/InputController';
import { EntityRenderer } from '../render/EntityRenderer';
import { EffectsRenderer } from '../render/EffectsRenderer';
import { followPlayer, fitZoom } from '../render/CameraController';
import { Presentation } from '../render/arenaArt';
import { Ambience, ArenaHazardView, ArenaProps, createArenaFloor } from '../render/arenaWorld';
import type { ArenaId } from '../../content/arenas';
import type { InputState } from '../../sim/GameState';
import { DebugOverlay } from '../render/debugOverlay';
import { startEncounter } from '../../sim/BossAiSystem';
import { sharedAbilityAudio, type AbilityAudio } from '../audio/abilityAudio';
export class ArenaScene extends Phaser.Scene {
  private simulation!: Simulation;
  private controller!: InputController;
  private entityRenderer!: EntityRenderer;
  private fx!: EffectsRenderer;
  private presentation!: Presentation;
  private fixed = new FixedStep();
  private publishClock = 0;
  private disposed = false;
  private debug: DebugOverlay | null = null;
  private props: ArenaProps | null = null; private ambience: Ambience | null = null; private hazardView: ArenaHazardView | null = null;
  private audio: AbilityAudio | null = null;
  private readonly unlockAudio = () => { void this.audio?.unlock(); };
  private lastInput: InputState = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false };
  constructor(private readonly bridge: GameBridge, private readonly seed: number, private readonly arena: ArenaId = 'gloam') { super({ key: 'ArenaScene' }); }
  create() {
    this.simulation = new Simulation(this.seed, this.arena);
    const applyZoom = () => this.cameras.main.setZoom(fitZoom(this.scale.width, this.scale.height));
    applyZoom(); this.scale.on(Phaser.Scale.Events.RESIZE, applyZoom);
    this.createArena();
    this.entityRenderer = new EntityRenderer(this);
    this.fx = new EffectsRenderer(this);
    this.controller = new InputController(() => this.bridge.togglePause(), () => { if (this.bridge.getSettings().pauseOnBlur) this.bridge.pause(); }, () => this.bridge.pause());
    this.bridge.bind(this.simulation);
    this.audio = sharedAbilityAudio(); this.audio?.setMuted(this.bridge.getSettings().mute);
    window.addEventListener('keydown', this.unlockAudio); window.addEventListener('pointerdown', this.unlockAudio);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dispose());
    window.dispatchEvent(new CustomEvent('kyntraze-ready'));
    this.game.events.once(Phaser.Core.Events.DESTROY, () => this.dispose());
    // QA-only escape hatch: dev server AND explicit ?qa=1; never a shipping cheat.
    const qs = new URLSearchParams(window.location.search);
    if (import.meta.env.DEV && qs.get('qa') === '1') {
      if (qs.get('debug') === 'hit') this.debug = new DebugOverlay(this);
      const enc = qs.get('encounter'); if (enc) startEncounter(this.simulation.state, enc as Parameters<typeof startEncounter>[1]);
      (window as Window & { __KYNT_QA__?: { grantXp: (offers?: string[]) => void; heroPose: () => unknown; setHeroScale: (n: number) => void; sim: () => unknown; enemyStats: () => unknown; encounter: (id: string) => void; arenaHazard: () => void; scene: () => unknown; hand: () => unknown; fxOrigin: () => unknown; audio: () => unknown } }).__KYNT_QA__ = { grantXp: (offers?: string[]) => this.bridge.debugGrantXp(offers as never), heroPose: () => this.entityRenderer.debugPose(), hand: () => this.entityRenderer.handAnchor(), fxOrigin: () => this.entityRenderer.fxOrigin(), audio: () => ({ state: this.audio?.state ?? 'none', loaded: this.audio?.loaded ?? 0, active: this.audio?.activeVoices ?? 0, started: [...(this.audio?.started ?? [])] }), setHeroScale: (n: number) => this.entityRenderer.setHeroScale(n), sim: () => this.simulation.state, enemyStats: () => this.entityRenderer.enemyStats(), scene: () => this, arenaHazard: () => { this.simulation.state.arenaHazard.nextAt = this.simulation.state.time; }, encounter: (id: string) => startEncounter(this.simulation.state, id as Parameters<typeof startEncounter>[1]) };
    }
  }
  private createArena() { createArenaFloor(this, this.arena); this.props = new ArenaProps(this, this.arena); this.ambience = import.meta.env.DEV && new URLSearchParams(window.location.search).get('noamb') === '1' ? null : new Ambience(this, this.arena); this.hazardView = new ArenaHazardView(this); this.presentation = new Presentation(this); }
  update(_time: number, delta: number) {
    if (this.disposed || !this.simulation) return;
    // Sample action key presses per authoritative simulation tick so 120Hz displays
    // cannot swallow a dash/Q/F press on a frame without a fixed step.
    this.fixed.tick(delta, dt => { this.lastInput = this.controller.read(); this.simulation.step(dt, this.lastInput); });
    const s = this.simulation.state;
    followPlayer(this.cameras.main, s.player.x, s.player.y);
    this.entityRenderer.sync(s, this.lastInput, delta, this.bridge.getSettings().reducedEffects);
    if (s.phase === 'dead' && this.entityRenderer.deathPresented()) this.bridge.markDeathShown();
    const hp = this.entityRenderer.debugPose(); this.presentation.update(s, hp.x, hp.y, hp.visualForm === 'f1', this.bridge.getSettings().reducedEffects);
    this.props?.update(s, this.time.now / 1000); this.ambience?.update(this.time.now / 1000, this.bridge.getSettings().reducedEffects); this.hazardView?.sync(s, s.phase === 'running' ? delta / 1000 : 0);
    this.debug?.draw(s);
    this.fx.render(s, this.bridge.getSettings().reducedEffects);
    this.audio?.setMuted(this.bridge.getSettings().mute); this.audio?.sync(s);
    this.publishClock += delta;
    if ((s.phase === 'running' && this.publishClock >= 100) || this.bridge.snapshot().phase !== s.phase) { this.publishClock = 0; this.bridge.publish(); }
  }
  private dispose() {
    if (this.disposed) return; this.disposed = true; this.scale.off(Phaser.Scale.Events.RESIZE);
    window.removeEventListener('keydown', this.unlockAudio); window.removeEventListener('pointerdown', this.unlockAudio); this.audio?.dispose();
    this.controller?.destroy(); this.entityRenderer?.destroy(); this.fx?.destroy(); this.presentation?.destroy(); this.debug?.destroy(); this.props?.destroy(); this.ambience?.destroy(); this.hazardView?.destroy(); this.bridge.unbind();
    delete (window as Window & { __KYNT_QA__?: unknown }).__KYNT_QA__;
  }
}

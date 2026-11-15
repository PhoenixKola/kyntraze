import Phaser from 'phaser';
import { Simulation } from '../../sim/Simulation';
import { FixedStep } from '../../sim/FixedStep';
import { GameBridge } from '../../bridge/GameBridge';
import { InputController } from '../input/InputController';
import { EntityRenderer } from '../render/EntityRenderer';
import { EffectsRenderer } from '../render/EffectsRenderer';
import { followPlayer, fitZoom } from '../render/CameraController';
import { createArenaFloor, Presentation } from '../render/arenaArt';
import type { InputState } from '../../sim/GameState';
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
  private audio: AbilityAudio | null = null;
  private readonly unlockAudio = () => { void this.audio?.unlock(); };
  private lastInput: InputState = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false };
  constructor(private readonly bridge: GameBridge, private readonly seed: number) { super({ key: 'ArenaScene' }); }
  create() {
    this.simulation = new Simulation(this.seed);
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
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('qa') === '1') {
      (window as Window & { __KYNT_QA__?: { grantXp: () => void; heroPose: () => unknown; setHeroScale: (n: number) => void; sim: () => unknown; enemyStats: () => unknown; hand: () => unknown; fxOrigin: () => unknown; audio: () => unknown } }).__KYNT_QA__ = { grantXp: () => this.bridge.debugGrantXp(), heroPose: () => this.entityRenderer.debugPose(), hand: () => this.entityRenderer.handAnchor(), fxOrigin: () => this.entityRenderer.fxOrigin(), audio: () => ({ state: this.audio?.state ?? 'none', loaded: this.audio?.loaded ?? 0, active: this.audio?.activeVoices ?? 0, started: [...(this.audio?.started ?? [])] }), setHeroScale: (n: number) => this.entityRenderer.setHeroScale(n), sim: () => this.simulation.state, enemyStats: () => this.entityRenderer.enemyStats() };
    }
  }
  private createArena() { createArenaFloor(this); this.presentation = new Presentation(this); }
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
    this.fx.render(s, this.bridge.getSettings().reducedEffects);
    this.audio?.setMuted(this.bridge.getSettings().mute); this.audio?.sync(s);
    this.publishClock += delta;
    if ((s.phase === 'running' && this.publishClock >= 100) || this.bridge.snapshot().phase !== s.phase) { this.publishClock = 0; this.bridge.publish(); }
  }
  private dispose() {
    if (this.disposed) return; this.disposed = true; this.scale.off(Phaser.Scale.Events.RESIZE);
    window.removeEventListener('keydown', this.unlockAudio); window.removeEventListener('pointerdown', this.unlockAudio); this.audio?.dispose();
    this.controller?.destroy(); this.entityRenderer?.destroy(); this.fx?.destroy(); this.presentation?.destroy(); this.bridge.unbind();
    delete (window as Window & { __KYNT_QA__?: unknown }).__KYNT_QA__;
  }
}

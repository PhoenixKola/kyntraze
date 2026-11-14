import Phaser from 'phaser';
import { Simulation } from '../../sim/Simulation';
import { FixedStep } from '../../sim/FixedStep';
import { GameBridge } from '../../bridge/GameBridge';
import { InputController } from '../input/InputController';
import { EntityRenderer } from '../render/EntityRenderer';
import { EffectsRenderer } from '../render/EffectsRenderer';
import { followPlayer } from '../render/CameraController';
import { OBSTACLES } from '../../content/arena';
import { RULES } from '../../core/Rules';
import type { InputState } from '../../sim/GameState';
export class ArenaScene extends Phaser.Scene {
  private simulation!: Simulation;
  private controller!: InputController;
  private entityRenderer!: EntityRenderer;
  private fx!: EffectsRenderer;
  private fixed = new FixedStep();
  private publishClock = 0;
  private disposed = false;
  private lastInput: InputState = { x: 0, y: 0, dash: false, q: false, f: false };
  constructor(private readonly bridge: GameBridge, private readonly seed: number) { super({ key: 'ArenaScene' }); }
  create() {
    this.simulation = new Simulation(this.seed);
    this.cameras.main.setBounds(0, 0, RULES.worldWidth, RULES.worldHeight);
    this.createArena();
    this.entityRenderer = new EntityRenderer(this);
    this.fx = new EffectsRenderer(this);
    this.controller = new InputController(() => this.bridge.togglePause(), () => { if (this.bridge.getSettings().pauseOnBlur) this.bridge.pause(); });
    this.bridge.bind(this.simulation);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dispose());
    this.game.events.once(Phaser.Core.Events.DESTROY, () => this.dispose());
    // QA-only escape hatch: dev server AND explicit ?qa=1; never a shipping cheat.
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('qa') === '1') {
      (window as Window & { __KYNT_QA__?: { grantXp: () => void; heroPose: () => unknown; setHeroScale: (n: number) => void; sim: () => unknown } }).__KYNT_QA__ = { grantXp: () => this.bridge.debugGrantXp(), heroPose: () => this.entityRenderer.debugPose(), setHeroScale: (n: number) => this.entityRenderer.setHeroScale(n), sim: () => this.simulation.state };
    }
  }
  private createArena() {
    const g = this.add.graphics().setDepth(-20);
    g.fillStyle(0x101a29); g.fillRect(0, 0, RULES.worldWidth, RULES.worldHeight);
    for (let y = 0; y < RULES.worldHeight; y += 48) for (let x = 0; x < RULES.worldWidth; x += 48) {
      const parity = ((x / 48) * 7 + (y / 48) * 11) % 7;
      g.fillStyle(parity === 0 ? 0x172438 : 0x132033, 1); g.fillRect(x + 2, y + 2, 44, 44);
      if (parity === 0) { g.fillStyle(0x24374b); g.fillRect(x + 10, y + 10, 3, 3); }
    }
    g.lineStyle(5, 0x54a8b1); g.strokeRect(20, 20, RULES.worldWidth - 40, RULES.worldHeight - 40);
    g.lineStyle(1, 0x447784, 0.5); g.strokeRect(30, 30, RULES.worldWidth - 60, RULES.worldHeight - 60);
    for (const o of OBSTACLES) {
      g.fillStyle(0x070e19, 0.5); g.fillRect(o.x + 8, o.y + 12, o.w, o.h);
      g.fillStyle(0x293746); g.fillRect(o.x, o.y, o.w, o.h);
      g.fillStyle(0x3c5763); g.fillRect(o.x, o.y, o.w, 9);
      g.lineStyle(2, 0x7396a3, 0.8); g.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
      g.fillStyle(0xe3a766); g.fillRect(o.x + 10, o.y + o.h - 8, 18, 3);
    }
    for (let i = 0; i < 30; i++) {
      const x = 145 + ((i * 263) % 1900), y = 170 + ((i * 157) % 1250);
      g.fillStyle(0x243c4a); g.fillRect(x, y, 9, 4);
    }
  }
  update(_time: number, delta: number) {
    if (this.disposed || !this.simulation) return;
    // Sample action key presses per authoritative simulation tick so 120Hz displays
    // cannot swallow a dash/Q/F press on a frame without a fixed step.
    this.fixed.tick(delta, dt => { this.lastInput = this.controller.read(); this.simulation.step(dt, this.lastInput); });
    const s = this.simulation.state;
    followPlayer(this.cameras.main, s.player.x, s.player.y);
    this.entityRenderer.sync(s, this.lastInput, delta, this.bridge.getSettings().reducedEffects);
    if (s.phase === 'dead' && this.entityRenderer.deathPresented()) this.bridge.markDeathShown();
    this.fx.render(s, this.bridge.getSettings().reducedEffects);
    this.publishClock += delta;
    if ((s.phase === 'running' && this.publishClock >= 100) || this.bridge.snapshot().phase !== s.phase) { this.publishClock = 0; this.bridge.publish(); }
  }
  private dispose() {
    if (this.disposed) return; this.disposed = true;
    this.controller?.destroy(); this.entityRenderer?.destroy(); this.fx?.destroy(); this.bridge.unbind();
    delete (window as Window & { __KYNT_QA__?: unknown }).__KYNT_QA__;
  }
}

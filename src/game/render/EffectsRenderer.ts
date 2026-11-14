import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
export class EffectsRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(15); }
  render(state: GameState, reduced = false) {
    const g = this.graphics; g.clear();
    const p = state.player;
    // B04: the placeholder Form ring around the hero and the plain activation ring are replaced by the separate FormFx layers (formFx.ts)
    for (const effect of state.impacts) {
      const portion = 1 - effect.ttl / effect.life;
      if (effect.kind === 'shot') {
        g.lineStyle(p.form ? 5 : 3, p.form ? 0xffc780 : 0x8ce6eb, effect.ttl / effect.life);
        g.lineBetween(effect.x, effect.y, effect.targetX ?? effect.x, effect.targetY ?? effect.y);
      } else if (effect.kind === 'pulse') {
        g.lineStyle(4, 0x88dce8, 1 - portion);
        g.strokeCircle(effect.x, effect.y, p.qRadius * (p.form ? 1.25 : 1) * portion);
      } else if (!reduced && effect.kind === 'dash') {
        g.lineStyle(3, 0xeec083, effect.ttl / effect.life); g.strokeCircle(effect.x, effect.y, 18 + portion * 40);
      } else if (!reduced && effect.kind !== 'form') {   // 'form' is drawn by FormFx; the generic flash square must not catch it
        g.fillStyle(effect.kind === 'xp' ? 0x79e7d7 : 0xffe7bd, effect.ttl / effect.life);
        g.fillRect(effect.x - 3 - portion * 5, effect.y - 3 - portion * 5, 6 + portion * 10, 6 + portion * 10);
      }
    }
  }
  destroy() { this.graphics.destroy(); }
}

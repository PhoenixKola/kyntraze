import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { ENEMIES, FOOT_RADIUS, PLAYER_FOOT_DY, groundDy, isBoss, type MobKind } from '../../content/enemies';
/** QA only (dev server + ?qa=1&debug=hit): draws the sim's own damage boundaries so they can be compared with the telegraph art. Never part of a production build. */
export class DebugOverlay {
  private readonly g: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) { this.g = scene.add.graphics().setDepth(60); }
  draw(s: GameState) {
    const g = this.g; g.clear();
    const p = s.player;
    g.lineStyle(1, 0x00ffff, 1).strokeCircle(p.x, p.y + PLAYER_FOOT_DY, FOOT_RADIUS).strokeCircle(p.x, p.y, p.radius);
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      g.lineStyle(1, 0xffff00, 0.7).strokeCircle(e.x, e.y, e.radius);
      if (!isBoss(e.kind)) { const a = ENEMIES[e.kind as MobKind].attack; if (a.kind === 'slam') g.lineStyle(1, 0x00ff66, 1).strokeCircle(e.x, e.y + groundDy(e.radius), a.radius + FOOT_RADIUS).lineStyle(1, 0xffffff, 1).strokeCircle(e.x, e.y + groundDy(e.radius), a.radius); }
    }
    for (const h of s.hazards) {
      if (h.shape === 'rect') { const hw = (h.w ?? 0) / 2, hh = (h.h ?? 0) / 2; g.lineStyle(1, 0xffffff, 1).strokeRect(h.x - hw, h.y - hh, hw * 2, hh * 2).lineStyle(1, 0x00ff66, 1).strokeRect(h.x - hw - FOOT_RADIUS, h.y - hh - FOOT_RADIUS, hw * 2 + FOOT_RADIUS * 2, hh * 2 + FOOT_RADIUS * 2); }
      else if (h.shape === 'circle') g.lineStyle(1, 0x00ff66, 1).strokeCircle(h.x, h.y, h.r + FOOT_RADIUS).lineStyle(1, 0xffffff, 1).strokeCircle(h.x, h.y, h.r);
      else if (h.shape === 'cone') { g.lineStyle(1, 0x00ff66, 1).beginPath().moveTo(h.x, h.y).arc(h.x, h.y, h.r, h.ang - h.arc / 2, h.ang + h.arc / 2).lineTo(h.x, h.y).strokePath(); }
    }
    g.lineStyle(1, 0xff00ff, 1); for (const b of s.enemyShots) g.strokeCircle(b.x, b.y, b.radius);
  }
  destroy() { this.g.destroy(); }
}

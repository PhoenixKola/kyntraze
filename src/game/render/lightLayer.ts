/** B21.6: draws the planned floor lights from a small pool of additive soft-radial images (one shared generated texture). Cosmetic only; frozen while the run is not running. */
import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { planLights } from './lightPlan';

const KEY = 'b21-soft-light', SIZE = 128, CAP = 12;
function ensureTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(KEY)) return;
  const tex = scene.textures.createCanvas(KEY, SIZE, SIZE); if (!tex) return;
  const ctx = tex.getContext(), g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(0.7, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE); tex.refresh();
}
interface Live { img: Phaser.GameObjects.Image; age: number; life: number; a: number; r: number }

export class LightLayer {
  private readonly live: Live[] = []; private readonly free: Phaser.GameObjects.Image[] = []; private ability = 0; private enemy = 0;
  constructor(private readonly scene: Phaser.Scene) { ensureTexture(scene); }
  get count() { return this.live.length; }
  update(s: GameState, dt: number, reduced: boolean) {
    const running = s.phase === 'running', step = running ? dt : 0;
    const r = planLights(s, this.ability, this.enemy); this.ability = r.ability; this.enemy = r.enemy;
    if (running) for (const l of r.lights) {
      if (this.live.length >= CAP) break; if (reduced && l.alpha < 0.3) continue;
      const img = this.free.pop() ?? this.scene.add.image(0, 0, KEY).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.2);
      img.setVisible(true).setTint(l.color).setPosition(Math.round(l.x), Math.round(l.y)); this.live.push({ img, age: 0, life: l.life, a: l.alpha * (reduced ? 0.5 : 1), r: l.radius });
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const q = this.live[i]; q.age += step; const u = q.age / q.life;
      if (u >= 1) { q.img.setVisible(false); this.free.push(q.img); this.live.splice(i, 1); continue; }
      q.img.setScale((q.r * 2 / SIZE) * (0.8 + 0.3 * u)).setAlpha(q.a * (1 - u) * (1 - u));
    }
  }
  destroy() { for (const q of this.live) q.img.destroy(); for (const i of this.free) i.destroy(); this.live.length = 0; this.free.length = 0; if (this.scene.textures.exists(KEY)) this.scene.textures.remove(KEY); }
}

import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';

/** Hero presentation: contact shadows and the hero light pool/ring. The arena itself (floor, props, ambience) lives in arenaWorld.ts. */
function radial(scene: Phaser.Scene, key: string, size: number, stops: [number, string][]) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size)!; const ctx = tex.getContext(); const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); tex.refresh();
}

/** B07.1 A3: a thin "you are here" ground ring under Kai (a UI marker, not character art). It sits above the crowd's bodies and below Kai, so he stays traceable in a dense swarm without glow spam. */
function heroRingTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('pres-ring')) return;
  const tex = scene.textures.createCanvas('pres-ring', 128, 128)!, c = tex.getContext();
  c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 9; c.beginPath(); c.arc(64, 64, 52, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 4; c.beginPath(); c.arc(64, 64, 52, 0, Math.PI * 2); c.stroke(); tex.refresh();
}

/** Floor light pool, contact shadows (hero + enemies) and the hero separation halo. Cheap: pooled images, no per-frame allocation after warm-up. */
export class Presentation {
  private readonly pool: Phaser.GameObjects.Image; private readonly halo: Phaser.GameObjects.Image; private readonly heroShadow: Phaser.GameObjects.Image; private readonly ring: Phaser.GameObjects.Image; private readonly knock: Phaser.GameObjects.Image;
  private readonly shadows = new Map<number, Phaser.GameObjects.Image>();
  constructor(private readonly scene: Phaser.Scene) {
    radial(scene, 'pres-pool', 256, [[0, 'rgba(255,255,255,0.5)'], [0.45, 'rgba(255,255,255,0.2)'], [1, 'rgba(255,255,255,0)']]);
    radial(scene, 'pres-shadow', 64, [[0, 'rgba(0,0,0,0.62)'], [0.6, 'rgba(0,0,0,0.38)'], [1, 'rgba(0,0,0,0)']]);
    this.pool = scene.add.image(0, 0, 'pres-pool').setDepth(-18).setBlendMode(Phaser.BlendModes.ADD).setTint(0x4fa6b4).setAlpha(0.34).setScale(2.1, 1.5);
    this.halo = scene.add.image(0, 0, 'pres-pool').setDepth(9.4).setBlendMode(Phaser.BlendModes.ADD).setTint(0x66d5e0).setAlpha(0.22).setScale(0.7, 0.34);
    this.heroShadow = scene.add.image(0, 0, 'pres-shadow').setDepth(9.5).setScale(1.2, 0.5).setAlpha(0.95);
    // a soft dark cut-out behind Kai (above enemies, below him): separates him from similarly coloured bodies in a swarm without any glow
    this.knock = scene.add.image(0, 0, 'pres-shadow').setDepth(9.55).setScale(1.55, 1.75).setAlpha(0);
    heroRingTexture(scene); this.ring = scene.add.image(0, 0, 'pres-ring').setDepth(9.6).setScale(0.46, 0.2).setAlpha(0.75);
  }
  update(state: GameState, heroX: number, heroY: number, formVisible: boolean, reduced: boolean) {
    const tint = formVisible ? 0xe9b25f : 0x4fb8c6;
    this.pool.setPosition(heroX, heroY - 6).setTint(formVisible ? 0xc18a3c : 0x4a9cac);
    this.halo.setPosition(heroX, heroY - 2).setTint(tint).setVisible(!reduced);
    this.heroShadow.setPosition(heroX, heroY - 1);
    let near = 0; for (const e of state.enemies) if (e.hp > 0 && Math.abs(e.x - state.player.x) < 70 && Math.abs(e.y - state.player.y) < 70) near++;
    this.knock.setPosition(heroX, heroY - 30).setAlpha(Math.min(0.6, near * 0.12));
    // B08.1 A3: the ring is Kai's anchor in a crowd: brighter and gently pulsing while hit-invulnerable, slow heartbeat at low health
    const hurt = state.player.invulnerable > 0, low = state.player.hp / state.player.maxHp <= 0.3, t = state.time;
    this.ring.setPosition(heroX, heroY - 1).setTint(formVisible ? 0xffc86a : 0xbff4ff).setAlpha(hurt ? 1 : low ? 0.62 + 0.3 * (0.5 + 0.5 * Math.sin(t * 5)) : 0.78).setScale(hurt ? 0.5 + 0.04 * Math.sin(t * 24) : 0.46, hurt ? 0.22 : 0.2);
    const live = new Set<number>();
    for (const e of state.enemies) {
      if (e.hp <= 0) continue; live.add(e.id);
      let s = this.shadows.get(e.id); if (!s) { s = this.scene.add.image(e.x, e.y, 'pres-shadow').setDepth(5.5).setScale(0.62 * (e.radius / 17) * 1.15, 0.3 * (e.radius / 17) * 1.15).setAlpha(0.85); this.shadows.set(e.id, s); }
      s.setPosition(Math.round(e.x), Math.round(e.y + e.radius * 0.6 + 2));
    }
    for (const [id, s] of this.shadows) if (!live.has(id)) { s.destroy(); this.shadows.delete(id); }
  }
  destroy() { this.pool.destroy(); this.halo.destroy(); this.heroShadow.destroy(); this.ring.destroy(); this.knock.destroy(); for (const s of this.shadows.values()) s.destroy(); this.shadows.clear(); }
}

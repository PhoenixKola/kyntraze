import Phaser from 'phaser';
import type { GameState, InputState } from '../../sim/GameState';
export class EntityRenderer {
  private hero: Phaser.GameObjects.Image;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private orbs = new Map<number, Phaser.GameObjects.Image>();
  private facing = 'south';
  constructor(private readonly scene: Phaser.Scene) {
    this.hero = scene.add.image(1100, 800, 'kai-south').setScale(1.65).setDepth(10);
  }
  sync(state: GameState, input: InputState) {
    const p = state.player;
    this.hero.setPosition(Math.round(p.x), Math.round(p.y - 12));
    if (input.x || input.y) {
      if (Math.abs(input.x) > Math.abs(input.y)) this.facing = input.x > 0 ? 'east' : 'west';
      else this.facing = input.y > 0 ? 'south' : 'north';
    }
    if (this.hero.texture.key !== `kai-${this.facing}`) this.hero.setTexture(`kai-${this.facing}`);
    this.hero.setAlpha(p.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0 ? 0.56 : 1);
    this.hero.setScale(p.form ? 1.8 : 1.65);
    if (p.form) this.hero.setTint(0xffd78a); else this.hero.clearTint();
    const active = new Set<number>();
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      active.add(e.id);
      let sprite = this.sprites.get(e.id);
      if (!sprite) { sprite = this.scene.add.image(e.x, e.y, `enemy-${e.kind}`).setScale(1.8).setDepth(6); this.sprites.set(e.id, sprite); }
      sprite.setPosition(Math.round(e.x), Math.round(e.y - 7));
      sprite.setAlpha(e.hp / e.maxHp < 0.34 ? 0.72 : 1);
    }
    for (const [id, sprite] of this.sprites) if (!active.has(id)) { sprite.destroy(); this.sprites.delete(id); }
    const activeOrbs = new Set<number>();
    for (const p of state.pickups) {
      activeOrbs.add(p.id);
      let image = this.orbs.get(p.id);
      if (!image) { image = this.scene.add.image(p.x, p.y, 'xp').setScale(1.8).setDepth(4); this.orbs.set(p.id, image); }
      image.setPosition(Math.round(p.x), Math.round(p.y + Math.sin(p.age * 4) * 3));
    }
    for (const [id, image] of this.orbs) if (!activeOrbs.has(id)) { image.destroy(); this.orbs.delete(id); }
  }
  destroy() { this.hero.destroy(); for (const image of [...this.sprites.values(), ...this.orbs.values()]) image.destroy(); this.sprites.clear(); this.orbs.clear(); }
}

import Phaser from 'phaser';
import { STARTER_TEXTURES } from '../../assets/atlasRegistry';
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  preload() { STARTER_TEXTURES.forEach(tex => this.load.image(tex.key, tex.path)); }
  create() { this.scene.start('ArenaScene'); }
}

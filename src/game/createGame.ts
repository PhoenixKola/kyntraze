import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ArenaScene } from './scenes/ArenaScene';
import type { GameBridge } from '../bridge/GameBridge';
export function createGame(parent: HTMLElement, bridge: GameBridge, seed: number) {
  return new Phaser.Game({
    type: Phaser.AUTO, parent, width: 960, height: 540, backgroundColor: '#101a29',
    pixelArt: true, roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
    scene: [new BootScene(), new ArenaScene(bridge, seed)],
  });
}

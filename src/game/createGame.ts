import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ArenaScene } from './scenes/ArenaScene';
import type { GameBridge } from '../bridge/GameBridge';
import type { ArenaId } from '../content/arenas';
export function createGame(parent: HTMLElement, bridge: GameBridge, seed: number, arena: ArenaId = 'gloam') {
  return new Phaser.Game({
    type: Phaser.AUTO, parent, width: 960, height: 540, backgroundColor: '#101a29',
    pixelArt: true, roundPixels: true,
    // RESIZE: the canvas fills the window (no letterbox bars); ArenaScene zooms so at least 960x540 world px stay visible
    scale: { mode: Phaser.Scale.RESIZE, width: 960, height: 540 },
    scene: [new BootScene(arena), new ArenaScene(bridge, seed, arena)],
  });
}

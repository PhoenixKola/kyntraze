import type Phaser from 'phaser';
import { clamp } from '../../core/Math';
import { RULES } from '../../core/Rules';
export function followPlayer(camera: Phaser.Cameras.Scene2D.Camera, x: number, y: number) {
  camera.scrollX = clamp(x - camera.width * 0.5, 0, Math.max(0, RULES.worldWidth - camera.width));
  camera.scrollY = clamp(y - camera.height * 0.5, 0, Math.max(0, RULES.worldHeight - camera.height));
}

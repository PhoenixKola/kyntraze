import type Phaser from 'phaser';
import { clamp } from '../../core/Math';
import { RULES } from '../../core/Rules';
/** Logical view the game is designed around: the camera zooms so at least this much world is always visible, wider windows just reveal more floor. */
export const DESIGN_VIEW = { w: 960, h: 540 } as const;
export const fitZoom = (viewW: number, viewH: number) => Math.min(viewW / DESIGN_VIEW.w, viewH / DESIGN_VIEW.h);
/** Centre on the player and keep the visible world rectangle inside the arena (zoom scales around the camera centre). */
export function followPlayer(camera: Phaser.Cameras.Scene2D.Camera, x: number, y: number) {
  const dw = camera.width / camera.zoom, dh = camera.height / camera.zoom;
  const left = clamp(x - dw * 0.5, 0, Math.max(0, RULES.worldWidth - dw)), top = clamp(y - dh * 0.5, 0, Math.max(0, RULES.worldHeight - dh));
  camera.scrollX = left - (camera.width - dw) / 2; camera.scrollY = top - (camera.height - dh) / 2;
}

/** B23 local co-op camera: one shared view while the partners are close, an automatic left/right split when one view cannot hold both, with hysteresis so it never flickers. Pure (no Phaser) so the rules are unit-tested. */
export const SPLIT = { on: 1060, off: 800, minWidth: 700 } as const;
export interface CamPlan { split: boolean; zoomFactor: number }
/** `prev` is last frame's split state; `enabled` the player setting; `viewW` the canvas width. A narrow canvas stays shared (a half view would be unreadable): the shared camera zooms out instead. */
export function planCoopCamera(prev: boolean, dist: number, enabled: boolean, viewW: number): CamPlan {
  const can = enabled && viewW >= SPLIT.minWidth, split = can && (prev ? dist > SPLIT.off : dist > SPLIT.on);
  return { split, zoomFactor: Math.max(0.55, Math.min(1, 760 / Math.max(760, dist + 320))) };
}
/** Half-view viewports for the two cameras (x, y, w, h), with a 2 px divider gap. */
export const splitViewports = (w: number, h: number) => ({ left: { x: 0, y: 0, w: Math.floor(w / 2) - 1, h }, right: { x: Math.floor(w / 2) + 1, y: 0, w: w - Math.floor(w / 2) - 1, h } });

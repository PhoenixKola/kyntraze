import type Phaser from 'phaser';

/** One shake budget per camera: a weaker kick never replaces a stronger shake that is still running, so micro-kicks cannot cut a boss or ability shake short. */
const active = new WeakMap<object, { until: number; k: number }>();
export function kick(cam: Phaser.Cameras.Scene2D.Camera, ms: number, intensity: number, reduced: boolean) {
  if (reduced) return;
  const now = performance.now(), cur = active.get(cam);
  if (cur && now < cur.until && intensity < cur.k) return;
  active.set(cam, { until: now + ms, k: intensity });
  cam.shake(ms, intensity, true);
}

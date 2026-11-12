import type { GameState } from './GameState';
export function updateDrive(state: GameState, dt: number) {
  const p = state.player;
  p.formCooldown = Math.max(0, p.formCooldown - dt);
  if (p.form !== 0) {
    p.drive = Math.max(0, p.drive - 6.5 * dt);
    if (p.drive <= 0) { p.form = 0; p.formCooldown = 6; }
  }
}

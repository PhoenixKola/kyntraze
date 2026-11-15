import type { GameState } from './GameState';
import { COMET } from '../content/cometheart';
import { APEX } from '../content/stillfire';
import { endForm2, endForm3 } from './FormSystem';
export function updateDrive(state: GameState, dt: number) {
  const p = state.player;
  p.formCooldown = Math.max(0, p.formCooldown - dt);
  if (p.form === 3) { p.drive = Math.max(0, p.drive - APEX.drainPerSecond * state.mods.formDrain * dt); if (p.drive <= 0) endForm3(state); }
  else if (p.form === 2) { p.drive = Math.max(0, p.drive - COMET.drainPerSecond * state.mods.formDrain * dt); if (p.drive <= 0) endForm2(state); }
  else if (p.form === 1) { p.drive = Math.max(0, p.drive - 6.5 * state.mods.formDrain * dt); if (p.drive <= 0) { p.form = 0; p.formCooldown = 6 * state.mods.formCd; } }
}

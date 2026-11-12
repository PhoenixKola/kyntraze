import type { GameState } from './GameState';
import { RULES } from '../core/Rules';
export function activateForm(state: GameState) {
  const p = state.player;
  if (state.phase !== 'running' || p.form !== 0 || p.drive < RULES.formCharge || p.formCooldown > 0) return false;
  p.form = 1; p.invulnerable = Math.max(p.invulnerable, 0.5);
  state.impacts.push({ id: state.nextId++, kind: 'form', x: p.x, y: p.y, ttl: 0.5, life: 0.5 });
  return true;
}

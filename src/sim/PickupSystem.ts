import type { GameState } from './GameState';
import { distanceSquared, normalize } from '../core/Math';
import { gainXp } from './UpgradeSystem';
export function collectPickups(state: GameState, dt: number, onLevelUp: () => void) {
  const p = state.player;
  for (const pickup of state.pickups) {
    pickup.age += dt;
    if (distanceSquared(p.x, p.y, pickup.x, pickup.y) <= (p.pickupRadius + 55) ** 2) {
      const dir = normalize(p.x - pickup.x, p.y - pickup.y);
      const travel = 420 * dt; pickup.x += dir.x * travel; pickup.y += dir.y * travel;
    }
    if (distanceSquared(p.x, p.y, pickup.x, pickup.y) <= (p.radius + 13) ** 2) {
      pickup.age = 999;
      state.impacts.push({ id: state.nextId++, kind: 'xp', x: pickup.x, y: pickup.y, ttl: 0.2, life: 0.2 });
      gainXp(state, pickup.xp, onLevelUp);
      if (state.phase !== 'running') break;
    }
  }
  state.pickups = state.pickups.filter(pickup => pickup.age < 45);
}

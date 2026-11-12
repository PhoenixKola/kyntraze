import { UPGRADES, type UpgradeId } from '../content/upgrades';
import { xpThreshold, type GameState } from './GameState';
import type { SeededRng } from '../core/SeededRng';
import { clamp } from '../core/Math';
export function createOffer(state: GameState, rng: SeededRng): UpgradeId[] {
  const options = UPGRADES.filter(upgrade => (state.upgradeStacks[upgrade.id] ?? 0) < upgrade.maxStacks);
  const chosen: UpgradeId[] = [];
  while (chosen.length < 3 && options.length > 0) {
    const total = options.reduce((sum, upgrade) => sum + upgrade.weight, 0);
    let roll = rng.next() * total; let index = options.length - 1;
    for (let i = 0; i < options.length; i++) { roll -= options[i].weight; if (roll < 0) { index = i; break; } }
    chosen.push(options.splice(index, 1)[0].id);
  }
  return chosen;
}
export function gainXp(state: GameState, amount: number, onLevelUp: () => void = () => {}) {
  if (!Number.isFinite(amount) || amount <= 0 || state.phase !== 'running') return;
  const p = state.player; p.xp += amount;
  if (p.xp >= p.nextXp) {
    p.xp -= p.nextXp; p.level++; p.nextXp = xpThreshold(p.level);
    state.phase = 'upgrade'; onLevelUp();
  }
}
export function applyUpgrade(state: GameState, id: UpgradeId) {
  if (state.phase !== 'upgrade' || !state.upgradeOffers.includes(id)) return false;
  const def = UPGRADES.find(u => u.id === id);
  if (!def || (state.upgradeStacks[id] ?? 0) >= def.maxStacks) return false;
  const p = state.player;
  switch (id) {
    case 'impact': p.attackDamage += 6; break;
    case 'tempo': p.attackPeriod = Math.max(0.18, p.attackPeriod * 0.88); break;
    case 'endurance': p.maxHp += 25; p.hp = clamp(p.hp + 25, 0, p.maxHp); break;
    case 'stride': p.speed = Math.min(450, p.speed * 1.12); break;
    case 'magnet': p.pickupRadius += 45; break;
    case 'reach': p.attackRange += 40; break;
    case 'echo': p.targets = Math.min(5, p.targets + 1); break;
    case 'pulse': p.qDamage += 18; p.qRadius += 25; break;
  }
  state.upgradeStacks[id] = (state.upgradeStacks[id] ?? 0) + 1;
  state.upgradeOffers = []; state.phase = 'running'; return true;
}

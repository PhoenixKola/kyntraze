import type { GameState, Enemy, Pickup } from './GameState';
export function addEnemy(state: GameState, enemy: Omit<Enemy, 'id'>): Enemy { const value = { ...enemy, id: state.nextId++ }; state.enemies.push(value); return value; }
export function addPickup(state: GameState, pickup: Omit<Pickup, 'id'>): Pickup { const value = { ...pickup, id: state.nextId++ }; state.pickups.push(value); return value; }
export function pruneDeadEntities(state: GameState) { state.enemies = state.enemies.filter(enemy => enemy.hp > 0); state.pickups = state.pickups.filter(p => p.age < 45); }

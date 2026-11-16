import { UPGRADES, UPGRADE_BY_ID, type UpgradeCategory, type UpgradeDef, type UpgradeId } from '../content/upgrades';
import { xpThreshold, type GameState } from './GameState';
import type { SeededRng } from '../core/SeededRng';
import { UPGRADE_OVERRIDES } from '../content/heroKits';

/** Stacks already taken in a category. */
export function categoryStacks(state: GameState, category: UpgradeCategory): number {
  let n = 0; for (const u of UPGRADES) if (u.category === category) n += state.upgradeStacks[u.id] ?? 0; return n;
}
function eligible(state: GameState, u: UpgradeDef): boolean {
  if (state.run.banished.includes(u.id) || state.run.excluded.includes(u.id)) return false;
  if ((state.upgradeStacks[u.id] ?? 0) >= u.maxStacks || state.player.level < u.minLevel) return false;
  if (u.requires && !(state.upgradeStacks[u.requires] ?? 0)) return false;
  if (u.needs && categoryStacks(state, u.needs.category) < u.needs.count) return false;
  return true;
}
/** Level-up pool weight: a rarity ramp over the run, a pull toward categories the build already invests in (so synergies appear), and a small nudge to keep stacking a card you own. */
function weightOf(state: GameState, u: UpgradeDef): number {
  const lvl = state.player.level; let w = u.weight;
  if (u.rarity === 'rare') w *= 0.7 + Math.min(1.2, lvl / 10);
  if (u.rarity === 'epic') w *= 0.5 + Math.min(1.5, lvl / 8);
  const invested = categoryStacks(state, u.category);
  if (invested > 0) w *= 1 + Math.min(1.2, invested * 0.4);
  if ((state.upgradeStacks[u.id] ?? 0) > 0) w *= 1.15;
  return w;
}
function pick(pool: UpgradeDef[], weights: number[], rng: SeededRng): number {
  const total = weights.reduce((a, b) => a + b, 0); let roll = rng.next() * total;
  for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll < 0) return i; }
  return pool.length - 1;
}
/** Three distinct cards. Every third level one card is guaranteed to be Rare or better when one is available, and cards from an already-picked category are less likely to fill the other slots, so a choice is usually a choice between directions. */
export function createOffer(state: GameState, rng: SeededRng, premium = false, avoid: UpgradeId[] = []): UpgradeId[] {
  let pool = UPGRADES.filter(u => eligible(state, u) && !avoid.includes(u.id));
  if (pool.length < 3) pool = UPGRADES.filter(u => eligible(state, u));   // too few fresh cards left: allow repeats rather than a short offer
  const chosen: UpgradeId[] = [];
  const takeFrom = (candidates: UpgradeDef[]) => {
    const weights = candidates.map(u => weightOf(state, u) * (chosen.some(id => UPGRADE_BY_ID[id].category === u.category) ? 0.3 : 1));
    const u = candidates[pick(candidates, weights, rng)]; chosen.push(u.id); pool.splice(pool.indexOf(u), 1);
  };
  if (premium || state.player.level % 3 === 0) { const rare = pool.filter(u => u.rarity !== 'common'); if (rare.length) takeFrom(rare); }
  while (chosen.length < 3 && pool.length > 0) takeFrom(pool);
  return chosen;
}
/** `before → after` for a card, computed by applying it to a copy of the build. */
export function previewUpgrade(state: GameState, id: UpgradeId): { label: string; before: string; after: string } {
  const def = UPGRADE_BY_ID[id]; const sim = { player: { ...state.player }, mods: { ...state.mods } };
  const ov = state.hero === 'kai' ? undefined : UPGRADE_OVERRIDES[state.hero][id];   // B19: the card shows the number THIS runner's ability actually uses
  const read = ov?.read ?? def.stat.read, digits = ov?.digits ?? def.stat.digits ?? 0, unit = ov?.unit ?? def.stat.unit ?? '';
  const before = read(sim); def.apply(sim); const after = read(sim);
  const f = (v: number) => `${v.toFixed(digits)}${unit}`;
  return { label: ov?.label ?? def.stat.label, before: f(before), after: f(after) };
}
export function gainXp(state: GameState, amount: number, onLevelUp: () => void = () => {}) {
  if (!Number.isFinite(amount) || amount <= 0 || state.phase !== 'running') return;
  const p = state.player; p.xp += amount * state.mods.xp;
  if (p.xp >= p.nextXp) {
    p.xp -= p.nextXp; p.level++; p.nextXp = xpThreshold(p.level); state.levelUpAt.push(state.time);
    state.phase = 'upgrade'; onLevelUp();
  }
}
export function applyUpgrade(state: GameState, id: UpgradeId) {
  if (state.phase !== 'upgrade' || !state.upgradeOffers.includes(id)) return false;
  const def = UPGRADE_BY_ID[id];
  if (!def || (state.upgradeStacks[id] ?? 0) >= def.maxStacks) return false;
  def.apply(state);
  state.upgradeStacks[id] = (state.upgradeStacks[id] ?? 0) + 1;
  state.upgradeOffers = []; state.rewardPick = false; state.phase = 'running'; return true;
}

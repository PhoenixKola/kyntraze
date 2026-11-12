export type UpgradeId = 'impact' | 'tempo' | 'endurance' | 'stride' | 'magnet' | 'reach' | 'echo' | 'pulse';
export interface UpgradeDef { id: UpgradeId; name: string; description: string; rarity: 'COMMON' | 'RARE'; maxStacks: number; weight: number; }
export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'impact', name: 'HEAVY HAND', description: '+6 Comet Fists damage.', rarity: 'COMMON', maxStacks: 5, weight: 6 },
  { id: 'tempo', name: 'QUICKEN', description: 'Auto-attack interval −12%.', rarity: 'COMMON', maxStacks: 4, weight: 6 },
  { id: 'endurance', name: 'IRON PULSE', description: '+25 max HP and restore 25 HP.', rarity: 'COMMON', maxStacks: 4, weight: 6 },
  { id: 'stride', name: 'SKY STEP', description: '+12% base movement speed.', rarity: 'COMMON', maxStacks: 3, weight: 5 },
  { id: 'magnet', name: 'FIELD DRAW', description: '+45 pickup range.', rarity: 'COMMON', maxStacks: 3, weight: 5 },
  { id: 'reach', name: 'LONG ARC', description: '+40 auto-attack range.', rarity: 'COMMON', maxStacks: 4, weight: 5 },
  { id: 'echo', name: 'TWIN IMPACT', description: '+1 secondary auto target.', rarity: 'RARE', maxStacks: 2, weight: 3 },
  { id: 'pulse', name: 'PULSE ENGINE', description: '+18 Impact Line damage and +25 radius.', rarity: 'RARE', maxStacks: 3, weight: 3 },
];

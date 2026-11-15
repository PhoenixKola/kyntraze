import type { GameState } from '../sim/GameState';

export type UpgradeCategory = 'core' | 'beam' | 'sphere' | 'survival' | 'mobility' | 'pickup' | 'drive';
export type Rarity = 'common' | 'rare' | 'epic';
export type UpgradeId =
  | 'impact' | 'tempo' | 'reach' | 'echo' | 'pulse'
  | 'widelance' | 'hardlight' | 'afterburn' | 'lancecool' | 'conductor'
  | 'bloombulk' | 'afterglow' | 'novacool' | 'twinbloom'
  | 'endurance' | 'mending' | 'plating' | 'secondwind'
  | 'stride' | 'dashcool'
  | 'magnet' | 'richveins'
  | 'surgecell' | 'flareheart' | 'embercore';

/** Everything an upgrade can scale. Kept apart from Fighter so combat systems read one small, resettable block. */
export interface Mods {
  beamWidth: number; beamDamage: number; beamCd: number; beamLinger: number; beamDrive: number;
  sphereRadius: number; sphereDamage: number; sphereCd: number; /** 0 none, 1 Afterglow (half-power second burst), 2 Twin Bloom (full-power second burst) */ sphereEcho: 0 | 1 | 2;
  dashCd: number; xp: number; driveGain: number; formDrain: number; formPower: number; formCd: number;
  regen: number; armor: number; revive: number;
}
export const baseMods = (): Mods => ({ beamWidth: 1, beamDamage: 1, beamCd: 1, beamLinger: 0, beamDrive: 0, sphereRadius: 1, sphereDamage: 1, sphereCd: 1, sphereEcho: 0,
  dashCd: 1, xp: 1, driveGain: 1, formDrain: 1, formPower: 1, formCd: 1, regen: 0, armor: 1, revive: 0 });

type View = Pick<GameState, 'player' | 'mods'>;
export interface UpgradeDef {
  id: UpgradeId; name: string; category: UpgradeCategory; rarity: Rarity;
  /** One short sentence: what it does, in player words. */
  blurb: string;
  maxStacks: number; weight: number;
  /** Earliest level the card can appear (keeps early offers readable and epics for the mid game). */
  minLevel: number;
  /** Needs this many stacks already taken in a category (build-defining cards only open once a build exists). */
  needs?: { category: UpgradeCategory; count: number };
  /** Hard prerequisite card. */
  requires?: UpgradeId;
  /** The number the card shows as `before → after`. */
  stat: { label: string; read: (s: View) => number; unit?: string; digits?: number };
  apply: (s: View) => void;
}

export const CATEGORIES: Record<UpgradeCategory, { name: string; color: string; icon: string }> = {
  core: { name: 'CORE', color: '#f1b66f', icon: 'impact' },
  beam: { name: 'LANCE', color: '#7ee7f2', icon: 'lance' },
  sphere: { name: 'NOVA', color: '#c58bff', icon: 'nova' },
  survival: { name: 'SURVIVAL', color: '#ff7d85', icon: 'heart' },
  mobility: { name: 'MOBILITY', color: '#7ff0b4', icon: 'dash' },
  pickup: { name: 'SALVAGE', color: '#5fe3d6', icon: 'upg-magnet' },
  drive: { name: 'DRIVE', color: '#ffb347', icon: 'form' },
};
export const RARITY_LABEL: Record<Rarity, string> = { common: 'COMMON', rare: 'RARE', epic: 'EPIC' };

const mul = (k: keyof Mods, f: number) => (s: View) => { (s.mods[k] as number) *= f; };
export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'impact', name: 'HEAVY HAND', category: 'core', rarity: 'common', blurb: 'Comet Fists hit harder.', maxStacks: 5, weight: 6, minLevel: 1,
    stat: { label: 'Fist damage', read: s => s.player.attackDamage }, apply: s => { s.player.attackDamage += 6; } },
  { id: 'tempo', name: 'QUICKEN', category: 'core', rarity: 'common', blurb: 'Comet Fists strike faster.', maxStacks: 4, weight: 6, minLevel: 1,
    stat: { label: 'Strikes / sec', read: s => 1 / s.player.attackPeriod, digits: 2 }, apply: s => { s.player.attackPeriod = Math.max(0.18, s.player.attackPeriod * 0.88); } },
  { id: 'reach', name: 'LONG ARC', category: 'core', rarity: 'common', blurb: 'Comet Fists reach further.', maxStacks: 4, weight: 5, minLevel: 1,
    stat: { label: 'Fist range', read: s => s.player.attackRange }, apply: s => { s.player.attackRange += 40; } },
  { id: 'echo', name: 'TWIN IMPACT', category: 'core', rarity: 'rare', blurb: 'Comet Fists strike one more enemy at once.', maxStacks: 2, weight: 3, minLevel: 3,
    stat: { label: 'Targets', read: s => s.player.targets }, apply: s => { s.player.targets = Math.min(5, s.player.targets + 1); } },
  { id: 'pulse', name: 'PULSE ENGINE', category: 'core', rarity: 'rare', blurb: 'Impact Line hits harder and wider.', maxStacks: 3, weight: 3, minLevel: 3,
    stat: { label: 'Impact damage', read: s => s.player.qDamage }, apply: s => { s.player.qDamage += 18; s.player.qRadius += 25; } },

  { id: 'widelance', name: 'WIDE LANCE', category: 'beam', rarity: 'common', blurb: 'Fracture Lance becomes a wider blade of light.', maxStacks: 3, weight: 5, minLevel: 2,
    stat: { label: 'Lance width', read: s => s.mods.beamWidth * 100, unit: '%' }, apply: mul('beamWidth', 1.2) },
  { id: 'hardlight', name: 'HARD LIGHT', category: 'beam', rarity: 'common', blurb: 'Fracture Lance pulses hit harder.', maxStacks: 4, weight: 5, minLevel: 2,
    stat: { label: 'Lance damage', read: s => s.mods.beamDamage * 100, unit: '%' }, apply: mul('beamDamage', 1.2) },
  { id: 'lancecool', name: 'LANCE COOLING', category: 'beam', rarity: 'common', blurb: 'Fracture Lance recharges sooner.', maxStacks: 3, weight: 5, minLevel: 2,
    stat: { label: 'Lance cooldown', read: s => 7 * s.mods.beamCd, unit: 's', digits: 1 }, apply: mul('beamCd', 0.88) },
  { id: 'afterburn', name: 'LANCE AFTERBURN', category: 'beam', rarity: 'rare', blurb: 'The Lance keeps burning as it fades: extra damage pulses.', maxStacks: 3, weight: 3, minLevel: 4,
    stat: { label: 'Lance pulses', read: s => 5 + s.mods.beamLinger }, apply: s => { s.mods.beamLinger += 1; } },
  { id: 'conductor', name: 'RIFT CONDUCTOR', category: 'beam', rarity: 'epic', blurb: 'Every enemy the Lance pierces feeds your Drive.', maxStacks: 1, weight: 1.6, minLevel: 8, needs: { category: 'beam', count: 2 },
    stat: { label: 'Drive per hit', read: s => s.mods.beamDrive, digits: 1 }, apply: s => { s.mods.beamDrive = 0.7; } },

  { id: 'bloombulk', name: 'BLOOM BULK', category: 'sphere', rarity: 'common', blurb: 'Nova Bloom explodes bigger and harder.', maxStacks: 3, weight: 5, minLevel: 2,
    stat: { label: 'Nova radius', read: s => 190 * s.mods.sphereRadius }, apply: s => { s.mods.sphereRadius *= 1.15; s.mods.sphereDamage *= 1.1; } },
  { id: 'novacool', name: 'NOVA COOLING', category: 'sphere', rarity: 'common', blurb: 'Nova Bloom recharges sooner.', maxStacks: 3, weight: 5, minLevel: 2,
    stat: { label: 'Nova cooldown', read: s => 16 * s.mods.sphereCd, unit: 's', digits: 1 }, apply: mul('sphereCd', 0.88) },
  { id: 'afterglow', name: 'AFTERGLOW', category: 'sphere', rarity: 'rare', blurb: 'Nova Bloom bursts again at half strength after a moment.', maxStacks: 1, weight: 3, minLevel: 4,
    stat: { label: 'Second burst', read: s => s.mods.sphereEcho * 50, unit: '%' }, apply: s => { if (s.mods.sphereEcho < 1) s.mods.sphereEcho = 1; } },
  { id: 'twinbloom', name: 'TWIN BLOOM', category: 'sphere', rarity: 'epic', blurb: 'The Afterglow burst now lands at full strength.', maxStacks: 1, weight: 1.6, minLevel: 9, requires: 'afterglow',
    stat: { label: 'Second burst', read: s => s.mods.sphereEcho * 50, unit: '%' }, apply: s => { s.mods.sphereEcho = 2; } },

  { id: 'endurance', name: 'IRON PULSE', category: 'survival', rarity: 'common', blurb: 'More max health, and a heal now.', maxStacks: 4, weight: 6, minLevel: 1,
    stat: { label: 'Max health', read: s => s.player.maxHp }, apply: s => { s.player.maxHp += 25; s.player.hp = Math.min(s.player.maxHp, s.player.hp + 25); } },
  { id: 'plating', name: 'PLATING', category: 'survival', rarity: 'common', blurb: 'Take less damage from everything.', maxStacks: 3, weight: 4, minLevel: 2,
    stat: { label: 'Damage taken', read: s => s.mods.armor * 100, unit: '%' }, apply: mul('armor', 0.93) },
  { id: 'mending', name: 'MENDING FIELD', category: 'survival', rarity: 'rare', blurb: 'Slowly regenerate health while fighting.', maxStacks: 3, weight: 3, minLevel: 3,
    stat: { label: 'Regen / sec', read: s => s.mods.regen, digits: 1 }, apply: s => { s.mods.regen += 0.8; } },
  { id: 'secondwind', name: 'SECOND WIND', category: 'survival', rarity: 'epic', blurb: 'Once per run, a killing blow is refused: revive at half health.', maxStacks: 1, weight: 1.6, minLevel: 8, needs: { category: 'survival', count: 2 },
    stat: { label: 'Revives', read: s => s.mods.revive }, apply: s => { s.mods.revive += 1; } },

  { id: 'stride', name: 'SKY STEP', category: 'mobility', rarity: 'common', blurb: 'Move faster.', maxStacks: 3, weight: 5, minLevel: 1,
    stat: { label: 'Move speed', read: s => s.player.speed }, apply: s => { s.player.speed = Math.min(450, s.player.speed * 1.12); } },
  { id: 'dashcool', name: 'DASH COOLING', category: 'mobility', rarity: 'common', blurb: 'Dash recharges sooner.', maxStacks: 3, weight: 4, minLevel: 2,
    stat: { label: 'Dash cooldown', read: s => 3.2 * s.mods.dashCd, unit: 's', digits: 1 }, apply: mul('dashCd', 0.85) },

  { id: 'magnet', name: 'FIELD DRAW', category: 'pickup', rarity: 'common', blurb: 'Pull XP crystals in from further away.', maxStacks: 3, weight: 5, minLevel: 1,
    stat: { label: 'Pickup range', read: s => s.player.pickupRadius }, apply: s => { s.player.pickupRadius += 45; } },
  { id: 'richveins', name: 'RICH VEINS', category: 'pickup', rarity: 'rare', blurb: 'Every XP crystal is worth more.', maxStacks: 3, weight: 3, minLevel: 2,
    stat: { label: 'XP gain', read: s => s.mods.xp * 100, unit: '%' }, apply: mul('xp', 1.12) },

  { id: 'surgecell', name: 'SURGE CELL', category: 'drive', rarity: 'common', blurb: 'Build Drive faster from strikes and kills.', maxStacks: 3, weight: 5, minLevel: 2,
    stat: { label: 'Drive gain', read: s => s.mods.driveGain * 100, unit: '%' }, apply: mul('driveGain', 1.2) },
  { id: 'flareheart', name: 'FLAREHEART', category: 'drive', rarity: 'rare', blurb: 'Flarebound lasts longer before it burns out.', maxStacks: 3, weight: 3, minLevel: 3,
    stat: { label: 'Form drain', read: s => s.mods.formDrain * 100, unit: '%' }, apply: mul('formDrain', 0.86) },
  { id: 'embercore', name: 'EMBER CORE', category: 'drive', rarity: 'epic', blurb: 'Flarebound hits much harder and returns twice as fast.', maxStacks: 1, weight: 1.6, minLevel: 9, needs: { category: 'drive', count: 2 },
    stat: { label: 'Form power', read: s => s.mods.formPower * 100, unit: '%' }, apply: s => { s.mods.formPower *= 1.25; s.mods.formCd *= 0.5; } },
];
export const UPGRADE_BY_ID: Readonly<Record<UpgradeId, UpgradeDef>> = Object.fromEntries(UPGRADES.map(u => [u.id, u])) as Record<UpgradeId, UpgradeDef>;

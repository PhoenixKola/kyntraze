import type { HeroDef } from './heroes';
import type { UpgradeDef } from './upgrades';
export function isHeroDef(value: unknown): value is HeroDef { const v = value as Partial<HeroDef> | null; return !!v && typeof v.id === 'string' && typeof v.name === 'string' && Array.isArray(v.forms) && v.forms.length === 4; }
export function isUpgradeDef(value: unknown): value is UpgradeDef { const v = value as Partial<UpgradeDef> | null; return !!v && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.maxStacks === 'number' && v.maxStacks >= 1 && typeof v.weight === 'number' && v.weight > 0; }

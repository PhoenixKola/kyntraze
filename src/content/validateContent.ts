import { HEROES } from './heroes';
import { UPGRADES } from './upgrades';
import { ENEMIES } from './enemies';
import { isHeroDef, isUpgradeDef } from './schemas';
export function validateContent() {
  const issues: string[] = [];
  for (const hero of HEROES) if (!isHeroDef(hero)) issues.push('Bad hero');
  for (const upgrade of UPGRADES) if (!isUpgradeDef(upgrade)) issues.push('Bad upgrade');
  for (const group of [HEROES, UPGRADES]) if (new Set(group.map(item => item.id)).size !== group.length) issues.push('Duplicate content id');
  for (const enemy of Object.values(ENEMIES)) if (enemy.hp <= 0 || enemy.moveSpeed <= 0 || enemy.xp <= 0) issues.push(`Bad enemy: ${enemy.id}`);
  if (!HEROES.some(hero => hero.id === 'kai' && hero.playable)) issues.push('Kai missing');
  return issues;
}

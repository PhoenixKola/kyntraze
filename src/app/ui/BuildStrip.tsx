import type { CSSProperties } from 'react';
import type { OwnedUpgrade } from '../../bridge/UiSnapshot';
import { CATEGORIES, UPGRADE_BY_ID } from '../../content/upgrades';

const icon = (id: string) => `url(${import.meta.env.BASE_URL}ui/upgrades/${id}.png)`;
/** The build so far: one small medallion per owned card, rarity-bordered, category-tinted, with its stack count. Shown on the level-up and pause screens. */
export function BuildStrip({ owned, title }: { owned: OwnedUpgrade[]; title: string }) {
  if (!owned.length) return <div className="build-strip empty" data-testid="build-strip"><span className="build-title">{title}</span><em>No upgrades yet: your first choice defines your build.</em></div>;
  return <div className="build-strip" data-testid="build-strip"><span className="build-title">{title}</span><div className="build-chips">{owned.map(o => { const u = UPGRADE_BY_ID[o.id];
    return <span key={o.id} className={`chip rarity-${u.rarity}`} style={{ '--c': CATEGORIES[u.category].color, '--ico': icon(o.id) } as CSSProperties} title={`${u.name}${u.maxStacks > 1 ? ` ×${o.stacks}` : ''}`}><i/>{u.maxStacks > 1 && <b>{o.stacks}</b>}</span>; })}</div></div>;
}

import type { CSSProperties } from 'react';
import type { OwnedUpgrade } from '../../bridge/UiSnapshot';
import { CATEGORIES, RARITY_LABEL, UPGRADE_BY_ID } from '../../content/upgrades';
import { ASSET_BASE } from '../assetBase';

const icon = (id: string) => `url(${ASSET_BASE}ui/upgrades/${id}.png)`;
/** The build so far: one small medallion per owned card, rarity-bordered, category-tinted, with its stack count. Shown on the level-up and pause screens. */
export function BuildStrip({ owned, title }: { owned: OwnedUpgrade[]; title: string }) {
  if (!owned.length) return <div className="build-strip empty" data-testid="build-strip"><span className="build-title">{title}</span><em>No upgrades yet: your first choice defines your build.</em></div>;
  return <div className="build-strip" data-testid="build-strip"><span className="build-title">{title}</span><div className="build-chips">{owned.map(o => { const u = UPGRADE_BY_ID[o.id];
    const cat = CATEGORIES[u.category];
    return <span key={o.id} tabIndex={0} className={`chip rarity-${u.rarity}`} style={{ '--c': cat.color, '--ico': icon(o.id) } as CSSProperties} aria-label={`${u.name}, ${RARITY_LABEL[u.rarity]} ${cat.name}, rank ${o.stacks} of ${u.maxStacks}. ${u.blurb}`}><i/>{u.maxStacks > 1 && <b>{o.stacks}</b>}
      <span className="chip-tip" role="tooltip"><strong>{u.name}</strong><em>{RARITY_LABEL[u.rarity]} · {cat.name}</em><span>{u.blurb}</span><span className="chip-rank">{u.maxStacks > 1 ? Array.from({ length: u.maxStacks }, (_, k) => <i key={k} className={k < o.stacks ? 'on' : ''}/>) : <i className="on one"/>}<small>{u.maxStacks > 1 ? `RANK ${o.stacks}/${u.maxStacks}` : 'UNIQUE'}</small></span></span></span>; })}</div></div>;
}

import { useEffect, type CSSProperties } from 'react';
import type { OfferCard, OwnedUpgrade } from '../../bridge/UiSnapshot';
import { CATEGORIES, RARITY_LABEL, type UpgradeId } from '../../content/upgrades';
import { HintBar } from './Chrome';
import { BuildStrip } from './BuildStrip';

const base = import.meta.env.BASE_URL;
export const upgradeIcon = (id: string) => `url(${base}ui/upgrades/${id}.png)`;
interface Props { level: number; reward?: boolean; cards: OfferCard[]; owned: OwnedUpgrade[]; onChoose: (id: UpgradeId) => void; }

function Card({ c, i, onChoose }: { c: OfferCard; i: number; onChoose: (id: UpgradeId) => void }) {
  const cat = CATEGORIES[c.category];
  const style = { '--c': cat.color, '--i': i, '--ico': upgradeIcon(c.id), '--art': `url(${base}ui/cards/${c.category}.webp)`, '--foil': `url(${base}ui/cards/epic.webp)` } as CSSProperties;
  const next = c.stack + 1;
  return <button className={`lv-card rarity-${c.rarity}`} style={style} onClick={() => onChoose(c.id)} data-testid={`upgrade-${c.id}`} data-pad-default={i === 0 ? '' : undefined}
    aria-label={`${c.name}. ${RARITY_LABEL[c.rarity]} ${cat.name} upgrade. ${c.blurb} ${c.label} ${c.before} to ${c.after}.`}>
    <span className="lv-art" aria-hidden="true"/>
    <span className="lv-key" aria-hidden="true">{i + 1}</span>
    <span className="lv-medal" aria-hidden="true"><span className="lv-ico"/></span>
    <span className="lv-tags"><b className="lv-rarity">{RARITY_LABEL[c.rarity]}</b><em>{cat.name}</em></span>
    <strong className="lv-name">{c.name}</strong>
    <span className="lv-blurb">{c.blurb}</span>
    <span className="lv-stat"><i>{c.label}</i><b>{c.before}<u aria-hidden="true">›</u><em>{c.after}</em></b></span>
    <span className="lv-pips" aria-hidden="true">{c.max > 1 ? Array.from({ length: c.max }, (_, k) => <i key={k} className={k < c.stack ? 'on' : k === c.stack ? 'next' : ''}/>) : <i className="next one"/>}<small>{c.stack === 0 ? 'NEW' : `LV ${next}/${c.max}`}</small></span>
  </button>;
}

export function LevelUpScreen({ level, reward, cards, owned, onChoose }: Props) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= cards.length && !e.repeat) { e.preventDefault(); onChoose(cards[n - 1].id); } };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [cards, onChoose]);
  const hasEpic = cards.some(c => c.rarity === 'epic');
  return <div className={`overlay lv-overlay ${hasEpic ? 'has-epic' : ''}`} data-testid="level-up"><section className="lv-modal" role="dialog" aria-modal="true" aria-labelledby="level-title">
    <header className="lv-head"><span className="lv-badge" aria-hidden="true"><b>{reward ? '★' : level}</b></span><div><p className="eyebrow">{reward ? 'FRACTURE WARDEN DEFEATED · BOSS REWARD' : `LEVEL ${level} · NEW POWER`}</p><h2 id="level-title">{reward ? 'CLAIM YOUR SPOILS' : 'CHOOSE YOUR EVOLUTION'}</h2></div></header>
    <div className="lv-list" role="group" aria-label="Upgrade choices">{cards.map((c, i) => <Card key={c.id} c={c} i={i} onChoose={onChoose}/>)}</div>
    <BuildStrip owned={owned} title="YOUR BUILD"/>
    <HintBar hints={[{ key: '1 2 3', pad: 'A', label: 'CHOOSE' }, { key: 'CLICK', pad: 'D-PAD', label: 'PICK / MOVE' }]}/>
  </section></div>;
}

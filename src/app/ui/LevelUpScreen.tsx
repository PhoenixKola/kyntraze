import { legendArt } from '../../b22/artIcons';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { OfferCard, OwnedUpgrade } from '../../bridge/UiSnapshot';
import { CATEGORIES, RARITY_LABEL, type UpgradeId } from '../../content/upgrades';
import { HintBar, usePad } from './Chrome';
import { BuildStrip } from './BuildStrip';
import { ASSET_BASE } from '../assetBase';

const base = ASSET_BASE;
export const upgradeIcon = (id: string) => `url(${base}ui/upgrades/${id}.png)`;
import type { AscCard } from '../../bridge/ascView';
interface Props { hint?: (slot: OfferCard['slot']) => string | null; legend?: AscCard | null; onLegend?: (id: string) => void; level: number; reward?: boolean; cards: OfferCard[]; owned: OwnedUpgrade[]; onChoose: (id: UpgradeId) => void; rerolls?: number; banishes?: number; onReroll?: () => void; onBanish?: (id: UpgradeId) => void }

function Card({ c, i, onChoose, picked, hint }: { c: OfferCard; i: number; onChoose: (id: UpgradeId) => void; picked: boolean; hint: string | null }) {
  const cat = CATEGORIES[c.category];
  const style = { '--c': cat.color, '--i': i, '--ico': upgradeIcon(c.id), '--art': `url(${base}ui/cards/${c.category}.webp)`, '--foil': `url(${base}ui/cards/epic.webp)` } as CSSProperties;
  const next = c.stack + 1;
  return <button className={`lv-card rarity-${c.rarity} ${picked ? 'picked' : ''}`} style={style} onClick={() => onChoose(c.id)} data-testid={`upgrade-${c.id}`} data-pad-default={i === 0 ? '' : undefined}
    aria-label={`${c.name}. ${RARITY_LABEL[c.rarity]} ${c.catName ?? cat.name} upgrade. ${c.blurb}${hint ? ` (${hint})` : ''} ${c.label} ${c.before} to ${c.after}.`}>
    <span className="lv-art" aria-hidden="true"/>
    <span className="lv-key" aria-hidden="true">{i + 1}</span>
    <span className="lv-medal" aria-hidden="true"><span className="lv-ico"/></span>
    <span className="lv-tags"><b className="lv-rarity">{RARITY_LABEL[c.rarity]}</b><em>{c.catName ?? cat.name}</em></span>
    <strong className="lv-name">{c.name}</strong>
    <span className="lv-blurb">{c.blurb}{hint && <b className="lv-keyhint"> ({hint})</b>}</span>
    <span className="lv-stat"><i>{c.label}</i><b>{c.before}<u aria-hidden="true">›</u><em>{c.after}</em></b></span>
    <span className="lv-pips" aria-hidden="true">{c.max > 1 ? Array.from({ length: c.max }, (_, k) => <i key={k} className={k < c.stack ? 'on' : k === c.stack ? 'next' : ''}/>) : <i className="next one"/>}<small>{c.stack === 0 ? 'NEW' : `LV ${next}/${c.max}`}</small></span>
  </button>;
}

const EXIT_MS = 300;
export function LevelUpScreen({ hint, legend, onLegend, level, reward, cards, owned, onChoose: choose, rerolls = 0, banishes = 0, onReroll, onBanish }: Props) {
  const isPad = usePad();
  const [pick, setPick] = useState<UpgradeId | null>(null), timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const offerKey = cards.map(c => c.id).join(',');
  useEffect(() => { window.clearTimeout(timer.current); setPick(null); }, [offerKey, level]);   // a new offer (the next fighter's, or a reroll) is never stuck in the previous pick's exit state
  const onChoose = useCallback((id: UpgradeId) => {   // play the exit first, then hand the choice to the game (one choice only)
    if (pick) return; setPick(id);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timer.current = window.setTimeout(() => choose(id), reduce ? 0 : EXIT_MS);
  }, [pick, choose]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.repeat) return; const n = Number(e.key);
      if (e.key.toLowerCase() === 'r' && rerolls > 0 && !pick) { e.preventDefault(); onReroll?.(); return; }
      const shifted = /^Digit[1-9]$/.test(e.code) ? Number(e.code.slice(5)) : 0;   // Shift+1..3 banishes that card
      if (e.shiftKey && shifted >= 1 && shifted <= cards.length && banishes > 0 && !pick) { e.preventDefault(); onBanish?.(cards[shifted - 1].id); return; }
      if (n >= 1 && n <= cards.length && !e.shiftKey) { e.preventDefault(); onChoose(cards[n - 1].id); }
    };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [cards, onChoose, rerolls, banishes, onReroll, onBanish, pick]);
  const hasEpic = cards.some(c => c.rarity === 'epic');
  return <div className={`overlay lv-overlay ${hasEpic ? 'has-epic' : ''} ${pick ? 'leaving' : ''}`} data-testid="level-up"><section className="lv-modal" role="dialog" aria-modal="true" aria-labelledby="level-title">
    <header className="lv-head"><span className="lv-badge" aria-hidden="true"><b>{reward ? '★' : level}</b></span><div><p className="eyebrow">{reward ? 'FRACTURE WARDEN DEFEATED · BOSS REWARD' : `LEVEL ${level} · NEW POWER`}</p><h2 id="level-title">{reward ? 'CLAIM YOUR SPOILS' : 'CHOOSE YOUR EVOLUTION'}</h2></div></header>
    <div className="lv-list" role="group" aria-label="Upgrade choices">{cards.map((c, i) => <Card key={c.id} c={c} i={i} onChoose={onChoose} picked={pick === c.id} hint={hint?.(c.slot) ?? null}/>)}</div>
    {legend && <button className="lv-card asc-card legend-offer" style={{ '--c': '#ffd36a' } as CSSProperties} onClick={() => onLegend?.(legend.id)} data-testid={`legend-${legend.id}`}><img className="asc-icon" src={`${ASSET_BASE}art/b22/${legendArt(legend.id)}.png`} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/><span className="lv-tags"><b className="lv-rarity">{legend.sub}</b><em>INSTEAD OF A CARD</em></span><strong className="lv-name">{legend.name}</strong>{legend.lines.map((l, k) => <span key={k} className="lv-blurb asc-line">{l}</span>)}</button>}
    {(rerolls > 0 || banishes > 0 || onReroll) && (rerolls > 0 || banishes > 0) && <div className="lv-tools" data-testid="lv-tools">
      {rerolls > 0 && <button className="outlined-button lv-tool" onClick={() => onReroll?.()} data-testid="lv-reroll">↻ REROLL <b>{rerolls}</b></button>}
      {banishes > 0 && <span className="lv-banish"><em>BANISH · {banishes} LEFT</em>{cards.map((c, i) => <button key={c.id} className="outlined-button lv-tool small" onClick={() => onBanish?.(c.id)} data-testid={`lv-banish-${i}`} aria-label={`Banish ${c.name}`}>✕ {i + 1}</button>)}</span>}
    </div>}
    <BuildStrip owned={owned} title="YOUR BUILD"/>
    <HintBar hints={[{ key: '1 2 3', pad: 'A', label: 'CHOOSE' }, { key: 'CLICK', pad: 'D-PAD', label: 'PICK / MOVE' }, ...(!isPad && rerolls > 0 ? [{ key: 'R', pad: 'R', label: 'REROLL' }] : []), ...(!isPad && banishes > 0 ? [{ key: 'SHIFT+1-3', pad: 'B', label: 'BANISH' }] : [])]}/>
  </section></div>;
}

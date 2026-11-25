import { useEffect, type CSSProperties } from 'react';
import type { AscCard, AscView } from '../../bridge/ascView';
import { ASSET_BASE } from '../assetBase';
import { branchArt, relicArt } from '../../b22/artIcons';

/** Branch / relic / legendary choices and the Endless extract screen. Same Relic Plate language as the level-up cards; keyboard 1-3, pad A / D-pad, click. */
function Cards({ title, eyebrow, cards, onPick, accent, art }: { art: (id: string) => string; title: string; eyebrow: string; cards: AscCard[]; onPick: (id: string) => void; accent: string }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => { const n = Number(e.key); if (!e.repeat && n >= 1 && n <= cards.length) { e.preventDefault(); onPick(cards[n - 1].id); } };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  }, [cards, onPick]);
  return <div className="overlay ap" data-testid="asc-picker"><section className="ap-modal" role="dialog" aria-modal="true" aria-labelledby="asc-title" style={{ '--c': accent } as CSSProperties}>
    <header className="ap-head"><p className="eyebrow"><span className="orange-tick"/>{eyebrow}</p><h2 id="asc-title">{title}</h2><span className="ap-sub">Pick one. {cards.length > 1 ? 'The other is sealed for this run.' : ''}</span></header>
    <div className="ap-cards" role="group" aria-label="Choices">{cards.map((c, i) => <button key={c.id} className="ap-card" style={{ '--c': c.accent ?? accent, '--i': i } as CSSProperties} onClick={() => onPick(c.id)} data-testid={`asc-${c.id}`} data-pad-default={i === 0 ? '' : undefined}>
      <span className="ap-key" aria-hidden="true">{i + 1}</span>
      <span className="ap-disc" aria-hidden="true"><img src={`${ASSET_BASE}art/b22/${art(c.id)}.png`} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/></span>
      <small className="ap-tag">{c.sub}</small><strong>{c.name}</strong>
      <ul>{c.lines.map((l, k) => { const cost = l.startsWith('−'), gain = l.startsWith('+'); return <li key={k} className={cost ? 'cost' : gain ? 'gain' : ''}>{(cost || gain) && <i aria-hidden="true">{cost ? '−' : '+'}</i>}<span>{cost || gain ? l.slice(1).trim() : l}</span></li>; })}</ul>
      <span className="ap-cta">CHOOSE · {i + 1}</span>
    </button>)}</div>
    <p className="ap-note">Permanent for this run · unrelated to your saved progress</p>
  </section></div>;
}
interface Props { branchKey?: string | null; asc: AscView; onBranch: (id: string) => void; onRelic: (id: string) => void; onExtract: () => void; onPushOn: () => void }
export function AscensionPicker({ branchKey, asc, onBranch, onRelic, onExtract, onPushOn }: Props) {
  if (asc.branch) return <Cards title={`CHOOSE A ${asc.branch.skill.toUpperCase()}${branchKey ? ` (${branchKey})` : ''} BRANCH`} eyebrow="ASCENSION PROTOCOL · MUTUALLY EXCLUSIVE" cards={asc.branch.cards} onPick={onBranch} accent="#e9c27a" art={branchArt}/>;
  if (asc.relics) return <Cards title="CLAIM A REALM RELIC" eyebrow="EXPEDITION RELIC" cards={asc.relics} onPick={onRelic} accent="#9fe6e0" art={relicArt}/>;
  if (asc.extract) return <div className="overlay ap" data-testid="extract-screen"><section className="ap-modal ap-extract" role="dialog" aria-modal="true" aria-labelledby="ex-title">
    <header className="ap-head"><div><p className="eyebrow">ENDLESS · CYCLE {asc.extract.cycle} SURVIVED</p><h2 id="ex-title">EXTRACT OR PUSH ON?</h2></div></header>
    <p className="ap-note">Extracting ends the run safely and banks it as a success. Pushing on brings a harder cycle: new enemy mixes, faster hazards, a boss from the rotation.</p>
    <div className="stacked-actions"><button className="primary-button" onClick={onExtract} data-testid="extract-now" data-pad-default>EXTRACT NOW</button><button className="outlined-button" onClick={onPushOn} data-testid="push-on">PUSH ON</button></div>
  </section></div>;
  return null;
}

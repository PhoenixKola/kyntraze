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
  return <div className="overlay lv-overlay asc-overlay" data-testid="asc-picker"><section className="lv-modal" role="dialog" aria-modal="true" aria-labelledby="asc-title">
    <header className="lv-head"><div><p className="eyebrow">{eyebrow}</p><h2 id="asc-title">{title}</h2></div></header>
    <div className="lv-list asc-list" role="group" aria-label="Choices">{cards.map((c, i) => <button key={c.id} className="lv-card asc-card" style={{ '--c': c.accent ?? accent, '--i': i } as CSSProperties} onClick={() => onPick(c.id)} data-testid={`asc-${c.id}`} data-pad-default={i === 0 ? '' : undefined}>
      <span className="lv-key" aria-hidden="true">{i + 1}</span><span className="lv-tags"><b className="lv-rarity">{c.sub}</b></span><img className="asc-icon" src={`${ASSET_BASE}art/b22/${art(c.id)}.png`} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/><strong className="lv-name">{c.name}</strong>
      {c.lines.map((l, k) => <span key={k} className={`lv-blurb asc-line ${l.startsWith('−') ? 'cost' : l.startsWith('+') ? 'gain' : ''}`}>{l}</span>)}
    </button>)}</div>
    <p className="asc-note">Permanent for this run · unrelated to your saved progress</p>
  </section></div>;
}
interface Props { branchKey?: string | null; asc: AscView; onBranch: (id: string) => void; onRelic: (id: string) => void; onExtract: () => void; onPushOn: () => void }
export function AscensionPicker({ branchKey, asc, onBranch, onRelic, onExtract, onPushOn }: Props) {
  if (asc.branch) return <Cards title={`CHOOSE A ${asc.branch.skill.toUpperCase()}${branchKey ? ` (${branchKey})` : ''} BRANCH`} eyebrow="ASCENSION PROTOCOL · MUTUALLY EXCLUSIVE" cards={asc.branch.cards} onPick={onBranch} accent="#e9c27a" art={branchArt}/>;
  if (asc.relics) return <Cards title="CLAIM A REALM RELIC" eyebrow="EXPEDITION RELIC" cards={asc.relics} onPick={onRelic} accent="#9fe6e0" art={relicArt}/>;
  if (asc.extract) return <div className="overlay lv-overlay asc-overlay" data-testid="extract-screen"><section className="lv-modal" role="dialog" aria-modal="true" aria-labelledby="ex-title">
    <header className="lv-head"><div><p className="eyebrow">ENDLESS · CYCLE {asc.extract.cycle} SURVIVED</p><h2 id="ex-title">EXTRACT OR PUSH ON?</h2></div></header>
    <p className="asc-note">Extracting ends the run safely and banks it as a success. Pushing on brings a harder cycle: new enemy mixes, faster hazards, a boss from the rotation.</p>
    <div className="stacked-actions"><button className="primary-button" onClick={onExtract} data-testid="extract-now" data-pad-default>EXTRACT NOW</button><button className="outlined-button" onClick={onPushOn} data-testid="push-on">PUSH ON</button></div>
  </section></div>;
  return null;
}

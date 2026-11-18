import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { HintBar } from './Chrome';
import { BuildStrip } from './BuildStrip';
import { ASSET_BASE } from '../assetBase';
import { CURRENCY, FEAT_BY_ID, UNLOCK_BY_ID, CONTRACT_BY_ID } from '../../content/meta';
import { MarksBadge } from './ProgressionScreen';
import { HERO_BY_ID } from '../../content/heroes';
interface Props { s: UiSnapshot; onRetry: () => void; onHome: () => void; onProgress: () => void; onEndless?: () => void; }
const base = ASSET_BASE;

/** Victory and defeat share one structure (stats, build, actions) so the flow is the same; victory adds the key art, crest and a gold treatment. */
export function ResultsScreen({ s, onRetry, onHome, onProgress, onEndless }: Props) {
  const won = s.phase === 'victory', rw = s.reward;
  return <div className={`overlay results-overlay ${won ? 'won' : 'lost'}`} data-testid="results-screen" data-outcome={won ? 'victory' : 'defeat'}>
    {won && <div className="res-art" style={{ backgroundImage: `url(${base}ui/victory-key.webp)` }} aria-hidden="true"/>}
    <section className={`modal compact-modal result-modal ${won ? 'result-win' : ''}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="result-scroll">
      {won && <img className="res-crest" src={`${base}ui/victory-crest.png`} alt="" draggable={false}/>}
      <p className="eyebrow" data-testid="result-hero">{HERO_BY_ID[s.hero].name} · {won ? 'THE NULL SERAPH IS DOWN' : 'CONNECTION TO THE ZONE LOST'}</p>
      <h2 id="result-title">{won ? 'THE FRACTURE HOLDS' : 'RUN TERMINATED'}</h2>
      {won && <p className="res-sub">Kai sealed the rift. The zone falls quiet.</p>}
      <div className="score-number">{s.score.toLocaleString()} <span>POINTS</span></div>
      <div className="result-grid res-grid"><div>TIME <strong>{roundedTime(s.seconds)}</strong></div><div>LEVEL <strong>{s.level}</strong></div><div>ELIMINATIONS <strong>{s.kills}</strong></div><div>BOSSES <strong>{s.bosses}/2</strong></div><div>ARENA <strong className="res-arena">{s.arenaName.replace(/^THE /, '')}</strong></div><div>SEED <strong>{s.seed}</strong></div></div>
      {rw && <div className="rw-panel" data-testid="reward-panel">
        <header><span>{CURRENCY.name} EARNED</span><b data-testid="reward-total">+{rw.total}</b><MarksBadge marks={rw.balance} crest={s.crest}/></header>
        <ul>{rw.lines.map(l => <li key={l.label}><span>{l.label}</span><b>+{l.marks}</b></li>)}</ul>
        {(rw.newFeats.length > 0 || rw.unlocked.length > 0) && <div className="rw-new">{rw.newFeats.map(f => <span key={f} className="rw-chip feat">★ {FEAT_BY_ID[f].name}</span>)}{rw.unlocked.map(u => <span key={u} className="rw-chip unlock">NEW: {UNLOCK_BY_ID[u].name}</span>)}</div>}
        {rw.contract && <p className="rw-contract">{CONTRACT_BY_ID[rw.contract].name}: {rw.contractDone ? 'COMPLETE' : 'NOT COMPLETED · bonus pays on victory'}</p>}
        {rw.firstRun && <p className="rw-intro">Marks are <b>permanent</b>. XP and upgrades reset every run; spend marks in the Armory on starting boons, tools and contracts.</p>}
      </div>}
      <BuildStrip owned={s.owned} title="BUILD"/>
      </div>
      <div className="result-foot">
      <div className="stacked-actions">{won && s.asc?.canEndless && onEndless && <button className="primary-button" onClick={onEndless} data-testid="continue-endless">CONTINUE INTO THE FRACTURE (ENDLESS) <span>∞</span></button>}<button className={won && s.asc?.canEndless ? 'outlined-button' : 'primary-button'} onClick={onRetry} data-pad-default data-pad-start>{won ? 'RUN IT AGAIN' : 'RETRY SAME SEED'} <span>↗</span></button><button className="outlined-button" onClick={onProgress} data-testid="results-armory">ARMORY{rw && rw.balance > 0 ? ` · ${rw.balance}` : ''}</button><button className="outlined-button" onClick={onHome}>RETURN TO TITLE</button></div>
      <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'ENTER', pad: 'START', label: 'RETRY' }]}/>
      </div>
    </section>
  </div>;
}

import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { HintBar } from './Chrome';
import { BuildStrip } from './BuildStrip';
import { ASSET_BASE } from '../assetBase';
interface Props { s: UiSnapshot; onRetry: () => void; onHome: () => void; }
const base = ASSET_BASE;

/** Victory and defeat share one structure (stats, build, actions) so the flow is the same; victory adds the key art, crest and a gold treatment. */
export function ResultsScreen({ s, onRetry, onHome }: Props) {
  const won = s.phase === 'victory';
  return <div className={`overlay results-overlay ${won ? 'won' : 'lost'}`} data-testid="results-screen" data-outcome={won ? 'victory' : 'defeat'}>
    {won && <div className="res-art" style={{ backgroundImage: `url(${base}ui/victory-key.webp)` }} aria-hidden="true"/>}
    <section className={`modal compact-modal result-modal ${won ? 'result-win' : ''}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
      {won && <img className="res-crest" src={`${base}ui/victory-crest.png`} alt="" draggable={false}/>}
      <p className="eyebrow">{won ? 'THE NULL SERAPH IS DOWN' : 'CONNECTION TO THE ZONE LOST'}</p>
      <h2 id="result-title">{won ? 'THE FRACTURE HOLDS' : 'RUN TERMINATED'}</h2>
      {won && <p className="res-sub">Kai sealed the rift. The zone falls quiet.</p>}
      <div className="score-number">{s.score.toLocaleString()} <span>POINTS</span></div>
      <div className="result-grid res-grid"><div>TIME <strong>{roundedTime(s.seconds)}</strong></div><div>LEVEL <strong>{s.level}</strong></div><div>ELIMINATIONS <strong>{s.kills}</strong></div><div>BOSSES <strong>{s.bosses}/2</strong></div><div>ARENA <strong className="res-arena">{s.arenaName.replace(/^THE /, '')}</strong></div><div>SEED <strong>{s.seed}</strong></div></div>
      <BuildStrip owned={s.owned} title="BUILD"/>
      <div className="stacked-actions"><button className="primary-button" onClick={onRetry} data-pad-default data-pad-start>{won ? 'RUN IT AGAIN' : 'RETRY SAME SEED'} <span>↗</span></button><button className="outlined-button" onClick={onHome}>RETURN TO TITLE</button></div>
      <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'ENTER', pad: 'START', label: 'RETRY' }]}/>
    </section>
  </div>;
}

import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { HintBar } from './Chrome';
interface Props { s: UiSnapshot; onRetry: () => void; onHome: () => void; }
export function ResultsScreen({ s, onRetry, onHome }: Props) {
  return <div className="overlay" data-testid="results-screen"><section className="modal compact-modal result-modal" role="dialog" aria-modal="true">
    <p className="eyebrow">CONNECTION TO THE ZONE LOST</p><h2>RUN TERMINATED</h2>
    <div className="score-number">{s.score.toLocaleString()} <span>POINTS</span></div>
    <div className="result-grid"><div>TIME <strong>{roundedTime(s.seconds)}</strong></div><div>KILLS <strong>{s.kills}</strong></div><div>LEVEL <strong>{s.level}</strong></div><div>SEED <strong>{s.seed}</strong></div></div>
    <div className="stacked-actions"><button className="primary-button" onClick={onRetry} data-pad-default data-pad-start>RETRY SAME SEED <span>↗</span></button><button className="outlined-button" onClick={onHome}>RETURN TO TITLE</button></div>
    <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'ENTER', pad: 'START', label: 'RETRY' }]}/>
  </section></div>;
}

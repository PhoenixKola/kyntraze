import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { HintBar, Panel } from './Chrome';
interface Props { s: UiSnapshot; onResume: () => void; onHome: () => void; onSettings: () => void; }
export function PauseMenu({ s, onResume, onHome, onSettings }: Props) {
  return <div className="overlay" data-testid="pause-menu"><Panel title="PAUSED" eyebrow="SIMULATION SUSPENDED" className="compact-modal">
    <div className="run-stats"><div>TIME <strong>{roundedTime(s.seconds)}</strong></div><div>LEVEL <strong>{s.level}</strong></div><div>KILLS <strong>{s.kills}</strong></div><div>SEED <strong>{s.seed}</strong></div></div>
    <div className="stacked-actions"><button className="primary-button" onClick={onResume} data-pad-default data-pad-cancel>RESUME RUN <span>↗</span></button><button className="outlined-button" onClick={onSettings}>SETTINGS</button><button className="danger-button" onClick={onHome}>ABANDON RUN / RETURN HOME</button></div>
    <HintBar hints={[{ key: 'ESC', pad: 'START', label: 'RESUME' }, { key: 'ENTER', pad: 'A', label: 'SELECT' }]}/>
  </Panel></div>;
}

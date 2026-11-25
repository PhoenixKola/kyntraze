import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { HintBar, ModalX } from './Chrome';
import { BuildStrip } from './BuildStrip';
import { ASSET_BASE } from '../assetBase';
interface Props { s: UiSnapshot; online?: boolean; onResume: () => void; onHome: () => void; onSettings: () => void; }
const ACC: Record<string, string> = { kai: '#ffab4a', ren: '#ff4a5c', sora: '#5eb6ff', vex: '#a982ff' };
/** B30.1 pause: a dark command surface with a paused crest, run summary, build, and three clearly ranked actions (resume, settings, abandon). Online runs say so: the room is paused for both runners. */
export function PauseMenu({ s, online = false, onResume, onHome, onSettings }: Props) {
  const sub = online ? 'Run paused for both runners' : s.partner ? 'Both runners are paused' : 'Nothing moves until you resume';
  return <div className="overlay pz" data-testid="pause-menu"><section className="modal pz-card" role="dialog" aria-modal="true" aria-label="Paused" style={{ '--hc': ACC[s.hero] ?? '#5fe6e0' } as React.CSSProperties}>
    <ModalX onClose={onResume}/>
    <div className="pz-side">
      <div className="pz-crest" aria-hidden="true"><img src={`${ASSET_BASE}ui/hud/pause_crest.webp`} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/><i/><i/></div>
      <p className="eyebrow"><span className="orange-tick"/>{online ? 'ONLINE · PAUSED' : 'RUN PAUSED'}</p>
      <h2>PAUSED</h2><p className="pz-sub">{sub}</p>
      <div className="pause-chips" aria-label="Current run"><span>{s.hero.toUpperCase()}</span><span>{s.arenaName}</span>{s.contract && <span>Contract</span>}{s.partner && <span>Co-op</span>}</div>
    </div>
    <div className="pz-main">
      <div className="run-stats pz-stats"><div>TIME <strong>{roundedTime(s.seconds)}</strong></div><div>LEVEL <strong>{s.level}</strong></div><div>KILLS <strong>{s.kills}</strong></div><div>SEED <strong>{s.seed}</strong></div></div>
      <BuildStrip owned={s.owned} title="BUILD"/>
      <div className="pz-actions"><button className="primary-button pz-resume" onClick={onResume} data-pad-default data-pad-cancel>RESUME RUN <span>↗</span></button>
        <div className="pz-row"><button className="outlined-button pz-set" onClick={onSettings}>SETTINGS</button><button className="danger-button pz-abandon" onClick={onHome}>ABANDON RUN / RETURN HOME</button></div></div>
      <HintBar hints={[{ key: 'ESC', pad: 'START', label: 'RESUME' }, { key: 'ENTER', pad: 'A', label: 'SELECT' }]}/>
    </div>
  </section></div>;
}

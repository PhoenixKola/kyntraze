import type { SaveV1 } from '../../sim/SaveSystem';
import { HintBar } from './Chrome';
import { MarksBadge } from './ProgressionScreen';
interface Props { onArchives?: () => void; onPlay: () => void; onSettings: () => void; onProgress: () => void; save: SaveV1 }
export function TitleScreen({ onArchives, onPlay, onSettings, onProgress, save }: Props) {
  return <main className="title-layout" data-testid="title-screen">
    <div className="title-art" aria-hidden="true"/>
    <div className="title-shade" aria-hidden="true"/>
    <div className="title-kai" aria-hidden="true"><span className="title-kai-glow"/><span className="title-kai-sprite"/></div>
    <div className="title-hudline"><span className="mark"><i className="logo-sigil" aria-hidden="true"/>K / F</span><span>RELEASE CANDIDATE · B20</span></div>
    <div className="title-content">
      <img className="logo-mark" src={`${import.meta.env.BASE_URL}ui/kit/logo-mark.webp`} alt="" draggable={false}/>
      <p className="eyebrow"><span className="orange-tick"/>WORLD STATE: UNSTABLE</p>
      <h1 className="game-logo"><span>KYNTRAZE</span><strong>FRACTURE<br/>RUSH</strong></h1>
      <p className="title-subtitle">MOVE FAST. BREAK THE HORDE. CHARGE THE FRACTURE.</p>
      <div className="title-buttons">
        <button className="primary-button" onClick={onPlay} data-testid="play-button" data-pad-default data-pad-start>ENTER THE FRACTURE <span aria-hidden="true">↗</span></button>
        <button className="outlined-button" onClick={onProgress} data-testid="archives-button">ARCHIVES</button>{onArchives && <button className="outlined-button" onClick={onArchives} data-testid="horizons-button">HORIZONS</button>}
        <button className="outlined-button" onClick={onSettings}>SETTINGS</button>
      </div>
      <div className="title-marks"><MarksBadge marks={save.meta.marks} crest={save.meta.crest}/></div>
      <div className="best-run">{save.best ? <>PERSONAL BEST <b>{save.best.score.toLocaleString()} PTS</b> · {save.best.kills} KILLS</> : 'NO RECORDED RUNS · YOUR FIRST FRACTURE AWAITS'}</div>
    </div>
    <div className="bottom-chrome"><HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }]}/><span className="chrome-note">ONE LIFE · INFINITE PRESSURE</span></div>
  </main>;
}

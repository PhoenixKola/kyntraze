import type { SaveV1 } from '../../sim/SaveSystem';
import { HintBar } from './Chrome';
interface Props { onPlay: () => void; onSettings: () => void; save: SaveV1 }
export function TitleScreen({ onPlay, onSettings, save }: Props) {
  return <main className="title-layout" data-testid="title-screen">
    <div className="title-art" aria-hidden="true"/>
    <div className="title-shade" aria-hidden="true"/>
    <div className="title-kai" aria-hidden="true"><span className="title-kai-glow"/><span className="title-kai-sprite"/></div>
    <div className="title-hudline"><span className="mark">K / F</span><span>BUILD 00.01 · SURVIVAL PROTOTYPE</span></div>
    <div className="title-content">
      <p className="eyebrow"><span className="orange-tick"/>WORLD STATE: UNSTABLE</p>
      <h1 className="game-logo"><span>KYNTRAZE</span><strong>FRACTURE<br/>RUSH</strong></h1>
      <p className="title-subtitle">MOVE FAST. BREAK THE HORDE. CHARGE THE FRACTURE.</p>
      <div className="title-buttons">
        <button className="primary-button" onClick={onPlay} data-testid="play-button" data-pad-default data-pad-start>ENTER THE FRACTURE <span aria-hidden="true">↗</span></button>
        <button className="outlined-button" onClick={onSettings}>SETTINGS</button>
      </div>
      <div className="best-run">{save.best ? <>PERSONAL BEST <b>{save.best.score.toLocaleString()} PTS</b> · {save.best.kills} KILLS</> : 'NO RECORDED RUNS · YOUR FIRST FRACTURE AWAITS'}</div>
    </div>
    <div className="bottom-chrome"><HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }]}/><span className="chrome-note">ONE LIFE · INFINITE PRESSURE</span></div>
  </main>;
}

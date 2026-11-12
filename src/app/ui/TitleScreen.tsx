import type { SaveV1 } from '../../sim/SaveSystem';
interface Props { onPlay: () => void; onSettings: () => void; save: SaveV1 }
export function TitleScreen({ onPlay, onSettings, save }: Props) {
  return <main className="title-layout" data-testid="title-screen">
    <div className="title-hudline"><span className="mark">K / F</span><span>ZONE ACCESS · 00</span><span>BUILD 00.01 / SURVIVAL PROTOTYPE</span></div>
    <div className="title-content">
      <p className="eyebrow"><span className="orange-tick"/> WORLD STATE: UNSTABLE</p>
      <h1 className="game-logo"><span>KYNTRAZE</span><strong>FRACTURE<br/>RUSH</strong></h1>
      <p className="title-subtitle">MOVE FAST. BREAK THE HORDE.<br/>CHARGE THE FRACTURE.</p>
      <div className="title-buttons">
        <button className="primary-button" onClick={onPlay} data-testid="play-button">ENTER THE FRACTURE <span aria-hidden="true">↗</span></button>
        <button className="outlined-button" onClick={onSettings}>SETTINGS <span aria-hidden="true">⌁</span></button>
      </div>
      <div className="best-run">{save.best ? <>PERSONAL BEST <b>{save.best.score.toLocaleString()} PTS</b> · {save.best.kills} KILLS</> : 'NO RECORDED RUNS · YOUR FIRST FRACTURE AWAITS'}</div>
    </div>
    <div className="title-right-art" aria-hidden="true"><span className="orbit-line orbit-one"/><span className="orbit-line orbit-two"/><span className="title-emblem">K</span><span className="shard shard-one"/><span className="shard shard-two"/><span className="shard shard-three"/><span className="vertical-type">BROKEN CIRCUIT / ACTIVE RUNNER</span></div>
    <div className="bottom-chrome"><span>ONE LIFE. INFINITE PRESSURE.</span><span>ORIGINAL DEBUG ART · FINAL HERO ART IN B02–B03</span></div>
  </main>;
}

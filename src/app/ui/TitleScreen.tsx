import { ASSET_BASE } from '../assetBase';
import type { SaveV1 } from '../../sim/SaveSystem';
import { HintBar } from './Chrome';
import { MarksBadge } from './ProgressionScreen';
interface Props { onArchives?: () => void; onPlay: () => void; onSettings: () => void; onProgress: () => void; save: SaveV1 }
/** B29 title: one dominant action that leads into the Fracture Nexus, two quiet secondary actions, and a single lower strip (progress on the left, controls in the middle, expansion on the right). */
export function TitleScreen({ onArchives, onPlay, onSettings, onProgress, save }: Props) {
  return <main className="title-layout t29" data-testid="title-screen">
    <div className="title-art" aria-hidden="true"/>
    <div className="title-shade" aria-hidden="true"/>
    <div className="title-kai" aria-hidden="true"><span className="title-kai-glow"/><span className="title-kai-sprite"/></div>
    <div className="title-hudline"><span className="mark"><i className="logo-sigil" aria-hidden="true"/>K / F</span><span className="b29-chip mute">v{typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'}</span></div>
    <div className="title-content">
      <img className="logo-mark" src={`${import.meta.env.BASE_URL}ui/kit/logo-mark.webp`} alt="" draggable={false}/>
      <p className="eyebrow"><span className="orange-tick"/>WORLD STATE: UNSTABLE</p>
      <h1 className="game-logo"><span>KYNTRAZE</span><strong>FRACTURE<br/>RUSH</strong></h1>
      <p className="title-subtitle">MOVE FAST. BREAK THE HORDE. CHARGE THE FRACTURE.</p>
      <div className="title-buttons">
        <button className="b29-cta t29-main" onClick={onPlay} data-testid="play-button" data-pad-default data-pad-start><b>ENTER THE FRACTURE</b><small>Open the Fracture Nexus</small></button>
        <button className="b29-quiet t29-sec" onClick={onProgress} data-testid="archives-button">ARCHIVES</button>
        <button className="b29-quiet t29-sec" onClick={onSettings}>SETTINGS</button>
      </div>
    </div>
    <footer className="t29-strip">
      <div className="t29-left"><MarksBadge marks={save.meta.marks} crest={save.meta.crest}/><span className="t29-best">{save.best ? <>PERSONAL BEST <b>{save.best.score.toLocaleString()} PTS</b> · {save.best.kills} KILLS</> : 'NO RECORDED RUNS · YOUR FIRST FRACTURE AWAITS'}</span></div>
      <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }]}/>
      <div className="t29-right">{onArchives && <button className="b29-quiet horizons-btn" onClick={onArchives} data-testid="horizons-button"><img className="tab-ico" src={`${ASSET_BASE}ui/icons/tab_codex.png`} alt="" draggable={false}/>SHATTERED HORIZONS ›</button>}<span className="chrome-note">ONE LIFE · INFINITE PRESSURE</span></div>
    </footer>
  </main>;
}

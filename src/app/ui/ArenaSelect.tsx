import { useEffect, type CSSProperties } from 'react';
import { ARENAS, ARENA_IDS, type ArenaId } from '../../content/arenas';
import { HintBar } from './Chrome';
import { ASSET_BASE } from '../assetBase';

export const arenaCardUrl = (id: ArenaId) => `${ASSET_BASE}${ARENAS[id].artDir}/card.png`;
interface Props { selected: ArenaId; onSelect: (id: ArenaId) => void; onBack: () => void; allowed?: readonly ArenaId[] }

/** Full-screen arena choice. Selecting a card applies immediately (and is saved); CONFIRM / Esc / B return to deployment. Locked arenas (none yet) render disabled with their reason. */
export function ArenaSelect({ selected, onSelect, onBack, allowed }: Props) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onBack(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onBack]);
  return <main className="selection-layout arena-layout" data-testid="arena-select">
    <div className="screen-header"><button className="text-button" onClick={onBack} data-pad-cancel>← BACK</button><span>02 / ARENA SELECTION</span></div>
    <p className="eyebrow">CHOOSE THE GROUND</p><h2 className="large-heading">WHERE DOES THE FRACTURE OPEN?</h2>
    <div className="arena-grid" role="radiogroup" aria-label="Arena">
      {(allowed ?? ARENA_IDS).map((id, i) => { const a = ARENAS[id], on = id === selected;
        return <button key={id} role="radio" aria-checked={on} disabled={!a.unlocked} data-testid={`arena-card-${id}`} data-pad-default={on ? '' : undefined}
          className={`arena-card ${on ? 'selected' : ''} ${a.unlocked ? '' : 'locked'}`} style={{ '--card': a.procedural ? `linear-gradient(160deg, ${a.palette!.sky}, ${a.palette!.floorB} 55%, ${a.palette!.accent})` : `url(${arenaCardUrl(id)})` } as CSSProperties}
          onClick={() => onSelect(id)} onDoubleClick={() => { onSelect(id); onBack(); }}>
          <span className="arena-art" aria-hidden="true"/>
          <span className="arena-index">0{i + 1}</span>
          <span className="arena-body">
            <b className="arena-name">{a.name.toUpperCase()}</b>
            <span className="arena-blurb">{a.blurb}</span>
            <span className="arena-chips">{a.mood.map(m => <i key={m}>{m}</i>)}<i className="chip-diff">{a.difficulty}</i></span>
            <span className="arena-hazard"><u>HAZARD</u> {a.hazardCue}</span>
          </span>
          <span className="arena-state">{a.unlocked ? (on ? 'SELECTED' : 'SELECT') : 'LOCKED'}</span>
        </button>; })}
    </div>
    <div className="start-row"><button className="primary-button" onClick={onBack} data-testid="arena-confirm">CONFIRM ARENA</button></div>
    <HintBar hints={[{ key: 'CLICK', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'MOVE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}/>
  </main>;
}

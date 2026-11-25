import { useEffect, type CSSProperties } from 'react';
import { ARENAS, ARENA_IDS, type ArenaId } from '../../content/arenas';
import { ASSET_BASE } from '../assetBase';
import { Chip, Cta, Frame, Meter, Panel } from './b29/Kit';

export const arenaCardUrl = (id: ArenaId) => `${ASSET_BASE}${ARENAS[id].artDir}/card.png`;
interface Props { selected: ArenaId; onSelect: (id: ArenaId) => void; onBack: () => void; allowed?: readonly ArenaId[]; /** arenas the current mode cannot use stay visible; clicking one offers the mode that does (mode id, arena) */ onSwitchMode?: (mode: 'classic' | 'fracture_expedition', arena: ArenaId) => void }
const clamp5 = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
const ACCENT: Record<ArenaId, string> = { gloam: '#5fe6e0', ashen: '#ff8a4a', aetherfall: '#ffd98a', paradox: '#c58bff' };
const preview = (id: ArenaId) => { const a = ARENAS[id]; return `url(${arenaCardUrl(id)}), ${a.procedural ? `linear-gradient(160deg, ${a.palette!.sky}, ${a.palette!.floorB} 55%, ${a.palette!.accent})` : 'linear-gradient(#0b131d, #0b131d)'}`; };

/** Arena choice: left list of destinations, right a framed preview with identity read-outs and the confirm action. Selecting applies immediately (and is saved); CONFIRM / Esc / B return to deployment. Arenas the current mode cannot use stay visible and offer the mode that does. */
export function ArenaSelect({ selected, onSelect, onBack, allowed, onSwitchMode }: Props) {
  const fits = (id: ArenaId) => !allowed || allowed.includes(id);
  const cur = ARENAS[selected], hz = cur.hazard, accent = ACCENT[selected];
  useEffect(() => {
    const h = (e: KeyboardEvent) => { const i = ARENA_IDS.indexOf(selected); if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { const n = ARENA_IDS[(i + (e.key === 'ArrowDown' ? 1 : ARENA_IDS.length - 1)) % ARENA_IDS.length]; if (ARENAS[n].unlocked && fits(n)) { onSelect(n); e.preventDefault(); } } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  return <Frame testId="arena-select" className="b29-arena" eyebrow="CHOOSE THE GROUND" title="WHERE DOES THE FRACTURE OPEN?" sub="02 / ARENA SELECTION" onBack={onBack} accent={accent}
    hints={[{ key: 'CLICK', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'MOVE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    <div className="ar-list" role="radiogroup" aria-label="Arena">
      {ARENA_IDS.map((id, i) => { const a = ARENAS[id], ok = fits(id), on = id === selected && ok, other = (id === 'aetherfall' || id === 'paradox') ? 'fracture_expedition' as const : 'classic' as const;
        return <button key={id} role="radio" aria-checked={on} disabled={!a.unlocked} data-testid={`arena-card-${id}`} data-fit={ok ? 'yes' : 'no'} data-pad-default={on ? '' : undefined}
          className={`ar-item ${on ? 'on' : ''} ${a.unlocked ? '' : 'locked'} ${ok ? '' : 'other'}`} style={{ '--c': ACCENT[id] } as CSSProperties}
          onClick={() => (ok ? onSelect(id) : onSwitchMode?.(other, id))} onDoubleClick={() => { if (ok) { onSelect(id); onBack(); } }}>
          <span className="ar-thumb" style={{ backgroundImage: preview(id) }} aria-hidden="true"/>
          <span className="ar-txt"><small>0{i + 1} · {a.difficulty}</small><b>{a.name.toUpperCase()}</b>
            <span className="ar-state">{!a.unlocked ? 'LOCKED' : !ok ? (other === 'classic' ? 'CLASSIC ONLY · SWITCH' : 'EXPEDITION ONLY · SWITCH') : on ? 'SELECTED' : a.mood.join(' · ')}</span></span>
          {on && <em className="b29-check" aria-hidden="true">✓</em>}
        </button>; })}
    </div>
    <Panel className="ar-detail" aria-live="polite">
      <div className="ar-frame" style={{ backgroundImage: preview(selected), '--c': accent } as CSSProperties}><span className="ar-corner tl"/><span className="ar-corner tr"/><span className="ar-corner bl"/><span className="ar-corner br"/>
        <span className="ar-name"><b>{cur.name.toUpperCase()}</b><span>{cur.mood.map(m => <Chip key={m} tone="teal">{m}</Chip>)}<Chip tone="gold">{cur.difficulty}</Chip>{!fits(selected) && <Chip tone="red">NOT IN THIS MODE</Chip>}</span></span></div>
      <p className="ar-blurb">{cur.blurb}</p>
      <div className="ar-info">
        <div className="ar-haz"><h4>HAZARD · {hz.name.toUpperCase()}</h4><p>{cur.hazardCue}</p></div>
        <div className="ar-meters"><Meter label="THREAT" value={clamp5(hz.damage / 5)} accent={accent}/><Meter label="TEMPO" value={clamp5(10 - hz.intervalStart * 0.5)} accent={accent}/><Meter label="COVER" value={clamp5(cur.solids.length / 2)} accent={accent}/></div>
      </div>
      <div className="ar-act"><Cta onClick={onBack} testId="arena-confirm" sub={fits(selected) ? 'Return to deployment' : undefined} disabled={!fits(selected)}>CONFIRM ARENA</Cta></div>
    </Panel>
  </Frame>;
}

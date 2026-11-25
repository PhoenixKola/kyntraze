import { useEffect, useState, type CSSProperties } from 'react';
import { ARENAS, ARENA_IDS, type ArenaId } from '../../content/arenas';
import { ASSET_BASE } from '../assetBase';
import { Chip, Cta, Frame } from './b29/Kit';

export const arenaCardUrl = (id: ArenaId) => `${ASSET_BASE}${ARENAS[id].artDir}/card.png`;
const scenic = (id: ArenaId) => `art/menu/arena-${id}.webp`;
interface Props { selected: ArenaId; onSelect: (id: ArenaId) => void; onBack: () => void; allowed?: readonly ArenaId[]; /** arenas the current mode cannot use stay visible; choosing one offers the mode that does (mode id, arena) */ onSwitchMode?: (mode: 'classic' | 'fracture_expedition', arena: ArenaId) => void }
const ACCENT: Record<ArenaId, string> = { gloam: '#5fe6e0', ashen: '#ff8a4a', aetherfall: '#ffd98a', paradox: '#c58bff' };
const REALM = (id: ArenaId) => id === 'aetherfall' || id === 'paradox';
const cover = (n: number) => n <= 4 ? 'Open ground' : n <= 7 ? 'Some cover' : 'Plenty of cover';
const preview = (id: ArenaId) => { const a = ARENAS[id]; return `url(${arenaCardUrl(id)}), ${a.procedural ? `linear-gradient(160deg, ${a.palette!.sky}, ${a.palette!.floorB} 55%, ${a.palette!.accent})` : 'linear-gradient(#0b131d, #0b131d)'}`; };

/** Arena choice: a list of destinations on the left, the inspected arena as a scenic spread on the right. Selecting applies at once (and is saved); an arena the current mode cannot use is inspected first and only switches the mode when you say so. */
export function ArenaSelect({ selected, onSelect, onBack, allowed, onSwitchMode }: Props) {
  const fits = (id: ArenaId) => !allowed || allowed.includes(id);
  const [peek, setPeek] = useState<ArenaId | null>(null);
  const shown = peek ?? selected, cur = ARENAS[shown], hz = cur.hazard, accent = ACCENT[shown], ok = fits(shown), other = REALM(shown) ? 'fracture_expedition' as const : 'classic' as const;
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; const i = ARENA_IDS.indexOf(shown), n = ARENA_IDS[(i + (e.key === 'ArrowDown' ? 1 : ARENA_IDS.length - 1)) % ARENA_IDS.length]; if (!ARENAS[n].unlocked) return; e.preventDefault(); if (fits(n)) { setPeek(null); onSelect(n); } else setPeek(n); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  const facts: [string, string][] = [['Hazard', hz.name], ['Rhythm', `A strike roughly every ${hz.intervalStart}s, tightening to ${hz.intervalEnd}s as the run goes on`], ['Ground', cover(cur.solids.length)], ['Runs', REALM(shown) ? 'Fracture Expedition' : 'Classic, Endless, Boss Rush and challenges']];
  return <Frame testId="arena-select" className="b29-arena" eyebrow="02 / PROJECTION CHAMBER" title="Where does the fracture open?" onBack={onBack} accent={accent} bg={scenic(shown)} lit
    hints={[{ key: 'CLICK', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'MOVE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    <div className="ar-list" role="radiogroup" aria-label="Arena">
      {ARENA_IDS.map(id => { const a = ARENAS[id], fit = fits(id), on = id === selected && fit, look = id === shown;
        return <button key={id} role="radio" aria-checked={on} disabled={!a.unlocked} data-testid={`arena-card-${id}`} data-fit={fit ? 'yes' : 'no'} data-pad-default={on ? '' : undefined}
          className={`ar-item ${on ? 'on' : ''} ${look && !on ? 'look' : ''} ${a.unlocked ? '' : 'locked'} ${fit ? '' : 'other'}`} style={{ '--c': ACCENT[id] } as CSSProperties}
          onClick={() => { if (fit) { setPeek(null); onSelect(id); } else setPeek(id); }} onDoubleClick={() => { if (fit) { onSelect(id); onBack(); } }}>
          <span className="ar-thumb" style={{ backgroundImage: preview(id) }} aria-hidden="true"/>
          <span className="ar-txt"><b>{a.name}</b><span className="ar-state">{!a.unlocked ? 'Locked' : !fit ? (REALM(id) ? 'Expedition realm' : 'Classic arena') : on ? 'Selected' : a.mood.slice(0, 2).map(m => m.charAt(0) + m.slice(1).toLowerCase()).join(' · ')}</span></span>
          {on && <em className="b29-check" aria-hidden="true">✓</em>}
        </button>; })}
    </div>
    <section className="ar-detail" aria-live="polite" key={shown}>
      <div className="ar-title"><p className="eyebrow">{cur.difficulty === 'REALM' ? 'Expedition realm' : 'Classic arena'}</p><h3 style={{ color: accent }}>{cur.name}</h3>
        <div className="ar-chips">{cur.mood.map(m => <Chip key={m} tone="teal">{m.charAt(0) + m.slice(1).toLowerCase()}</Chip>)}</div></div>
      <p className="ar-blurb">{cur.blurb}</p>
      <div className="ar-haz"><b>{hz.name}</b><span>{cur.hazardCue.replace(/^[A-Z ]+:\s*/, '').replace(/^./, c => c.toUpperCase())}</span></div>
      <dl className="ar-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {!ok && <p className="ar-warn" role="status">This arena belongs to {other === 'classic' ? 'Classic runs' : 'Fracture Expedition'}. Switching changes your mode to {other === 'classic' ? 'Classic' : 'Fracture Expedition'}; your hero, boon and seed stay as they are.</p>}
      <div className="ar-act">{ok ? <Cta onClick={onBack} testId="arena-confirm" sub="Return to deployment">CONFIRM ARENA</Cta>
        : <Cta onClick={() => { setPeek(null); onSwitchMode?.(other, shown); }} testId="arena-switch" sub={`Switch to ${other === 'classic' ? 'Classic' : 'Fracture Expedition'}`}>USE THIS ARENA</Cta>}</div>
    </section>
  </Frame>;
}

import { useMemo, useState, type CSSProperties } from 'react';
import type { SaveV1 } from '../../sim/SaveSystem';
import { ARENAS } from '../../content/arenas';
import { HEROES } from '../../content/heroes';
import { ARC_HEROES, CHRONICLE_BY_ID, CHRONICLES, arcDone, chronicleDone, chronicleLock, sceneUnlocked, allArcsDone, type ChronicleId } from '../../b31/chronicles';
import type { StoryBeat } from '../../b22/story';
import { ASSET_BASE } from '../assetBase';
import { Chip, Frame } from './b29/Kit';

const ACC: Record<string, string> = { kai: '#ffab4a', ren: '#ff4a5c', sora: '#5eb6ff', vex: '#a982ff', all: '#7fe6e0' };
export const chronicleArt = (art: string, thumb = false) => `${ASSET_BASE}art/${art.startsWith('story_') ? 'b22' : 'chronicles'}/${art}${art.startsWith('story_') ? '.jpg' : thumb ? '_t.webp' : '.webp'}`;
interface Props { save: SaveV1; onBack: () => void; onBegin: (id: ChronicleId) => void; onScene: (beat: StoryBeat, id: ChronicleId, part: 'intro' | 'outro') => void }
/** Fracture Chronicles map: four hero arcs, the shared finale, objective previews, honest lock reasons, completion and scene replay. Reads the same save the missions write. */
export function ChroniclesScreen({ save, onBack, onBegin, onScene }: Props) {
  const b = useMemo(() => ({ chronicles: save.b22?.chronicles, story: { done: save.b22?.story?.done ?? [] } }), [save.b22]);
  const first = useMemo(() => CHRONICLES.find(c => !chronicleDone(b, c.id) && chronicleLock(b, c.id) === null && (c.hero === (save.hero ?? 'kai') || c.hero === null)) ?? CHRONICLES.find(c => !chronicleDone(b, c.id) && chronicleLock(b, c.id) === null) ?? CHRONICLES[0], [b, save.hero]);
  const [sel, setSel] = useState<ChronicleId>(first.id);
  const c = CHRONICLE_BY_ID[sel], lock = chronicleLock(b, sel), done = chronicleDone(b, sel), acc = ACC[c.hero ?? 'all'];
  const total = CHRONICLES.length, finished = CHRONICLES.filter(x => chronicleDone(b, x.id)).length;
  const card = (x: (typeof CHRONICLES)[number]) => { const l = chronicleLock(b, x.id), d = chronicleDone(b, x.id);
    return <button key={x.id} type="button" className={`ch-node ${sel === x.id ? 'on' : ''} ${d ? 'done' : ''} ${l ? 'locked' : ''}`} style={{ '--c': ACC[x.hero ?? 'all'] } as CSSProperties} onClick={() => setSel(x.id)} onFocus={() => setSel(x.id)} aria-pressed={sel === x.id} data-testid={`chron-${x.id}`} data-state={d ? 'done' : l ? 'locked' : 'open'}>
      <span className="ch-thumb" style={{ backgroundImage: `url(${chronicleArt(x.art, true)})` }} aria-hidden="true"/>
      <span className="ch-copy"><small>{x.kicker}</small><b>{x.name}</b></span><i aria-hidden="true">{d ? '✓' : l ? '🔒' : '▶'}</i></button>; };
  return <Frame testId="chronicles" className="ch" eyebrow="FRACTURE CHRONICLES" title="Four journeys, one Line" sub="Solo story missions. Unranked; each reward is paid once." bg={chronicleArt(first.art).replace(ASSET_BASE, '')} lit onBack={onBack}
    right={<><Chip tone="gold">{finished}/{total} chapters</Chip>{allArcsDone(b) && <Chip tone="teal">Finale open</Chip>}</>}
    hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    <div className="ch-map" role="group" aria-label="Chapters">
      {ARC_HEROES.map(h => <div key={h} className="ch-row" style={{ '--c': ACC[h] } as CSSProperties}><div className="ch-hero"><b>{HEROES.find(x => x.id === h)!.name.toUpperCase()}</b><small>{arcDone(b, h)}/3</small></div>{CHRONICLES.filter(x => x.hero === h).map(card)}</div>)}
      <div className="ch-row ch-final" style={{ '--c': ACC.all } as CSSProperties}><div className="ch-hero"><b>FINALE</b><small>{chronicleDone(b, 'finale') ? '1/1' : '0/1'}</small></div>{card(CHRONICLE_BY_ID.finale)}</div>
    </div>
    <aside className="ch-detail" style={{ '--c': acc } as CSSProperties} data-testid="chron-detail" aria-label="Chapter details">
      <div className="ch-art" style={{ backgroundImage: `url(${chronicleArt(c.art)})` }}><span>{c.kicker}</span></div>
      <h3>{c.name}</h3>
      <div className="ch-chips"><Chip tone="teal">{ARENAS[c.arena].name}</Chip><Chip tone="mute">{c.length}</Chip>{c.hero && <Chip tone="gold">{c.hero.toUpperCase()}</Chip>}{done ? <Chip tone="gold">Completed</Chip> : lock ? <Chip tone="red">Sealed</Chip> : <Chip tone="teal">Ready</Chip>}</div>
      <p className="ch-obj"><em>OBJECTIVE</em>{c.objective}</p><p className="ch-rules">{c.rules}</p>
      {lock && <p className="ch-lock" data-testid="chron-lock">🔒 {lock}</p>}
      {!lock && c.marks > 0 && !done && <p className="ch-reward">First clear: +{c.marks} Marks</p>}
      <div className="ch-actions">
        <button type="button" className="b29-cta ch-begin" disabled={!!lock} onClick={() => onBegin(sel)} data-testid="chron-begin" data-pad-default><b>{done ? 'REPLAY MISSION' : 'BEGIN MISSION'}</b>{done && <small>No second reward</small>}</button>
        <div className="ch-scenes">{(['intro', 'outro'] as const).map(p => { const ok = sceneUnlocked(b, sel, p); return <button key={p} type="button" className="ar-equip" disabled={!ok} onClick={() => onScene(c[p], sel, p)} data-testid={`chron-scene-${p}`}>{p === 'intro' ? 'REPLAY OPENING' : 'REPLAY ENDING'}</button>; })}</div>
      </div>
    </aside>
  </Frame>;
}

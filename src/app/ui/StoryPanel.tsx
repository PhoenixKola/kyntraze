import { useEffect, useState } from 'react';
import type { StoryBeat } from '../../b22/story';
import { HintBar } from './Chrome';
import { ASSET_BASE } from '../assetBase';

interface Props { beat: StoryBeat; onDone: () => void; doneLabel?: string }
/** Story interstitial: subtitles-style lines, advance with Enter/Space/click/pad A, skip all with Esc/pad B. Respects reduced motion (no fade). */
export function StoryPanel({ beat, onDone, doneLabel = 'CONTINUE' }: Props) {
  const [i, setI] = useState(0); const last = i >= beat.lines.length - 1;
  const next = () => (last ? onDone() : setI(i + 1));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onDone(); } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const line = beat.lines[i];
  return <main className="story-panel" data-testid="story-panel" role="dialog" aria-label={beat.title} onClick={next} style={beat.art ? { backgroundImage: `linear-gradient(180deg, rgba(5,4,14,.15) 0%, rgba(5,4,14,.55) 55%, rgba(5,4,14,.92) 100%), url(${ASSET_BASE}art/b22/${beat.art}.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
    <div className="story-head"><h2>{beat.title}</h2><small>{beat.place}</small></div>
    <div className="story-line" aria-live="polite">{beat.portraits?.[line.who] && <img className="story-portrait" src={`${ASSET_BASE}art/b22/${beat.portraits[line.who]}.png`} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/>}<div><b>{line.who}</b><p>{line.text}</p></div></div>
    <div className="story-actions"><span>{i + 1} / {beat.lines.length}</span>
      <button className="outlined-button" data-testid="story-skip" data-pad-cancel onClick={e => { e.stopPropagation(); onDone(); }}>SKIP</button>
      <button className="primary-button" data-testid="story-next" onClick={e => { e.stopPropagation(); next(); }}>{last ? doneLabel : 'NEXT'}</button></div>
    <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'NEXT' }, { key: 'ESC', pad: 'B', label: 'SKIP' }]}/>
  </main>;
}

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { StoryBeat } from '../../b22/story';
import { HintBar, ModalX } from './Chrome';
import { ASSET_BASE } from '../assetBase';

interface Props { beat: StoryBeat; onDone: () => void; doneLabel?: string }
const ACC: Record<string, string> = { KAI: '#ffab4a', REN: '#ff4a5c', SORA: '#5eb6ff', VEX: '#a982ff', OATHKEEPER: '#e9c27a', NARRATOR: '#9fe6e0' };
const artUrl = (a: string) => `${ASSET_BASE}${a.includes('/') ? a : `art/b22/${a}.jpg`}`;
const portraitUrl = (p: string) => `${ASSET_BASE}${p.includes('/') ? p : `art/b22/${p}.png`}`;
/** Story scene: full-bleed illustrated backdrop with slow parallax, speaker portraits that light up when they talk, a caption box. Advance with Enter / Space / click / pad A, step back with Left / Backspace, skip all with Esc / pad B. Reduced motion: no drift, no slide. Used for Vex's Trial and the Fracture Chronicles. */
export function StoryPanel({ beat, onDone, doneLabel = 'CONTINUE' }: Props) {
  const [i, setI] = useState(0), last = i >= beat.lines.length - 1;
  const next = () => (last ? onDone() : setI(i + 1)), back = () => setI(n => Math.max(0, n - 1));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onDone(); } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); next(); } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); back(); } };
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true);   // capture: a scene owns Esc / Enter while it is open (the run behind it must not pause or react)
  });
  const line = beat.lines[i];
  const cast = useMemo(() => [...new Set(beat.lines.map(l => l.who))].filter(w => beat.portraits?.[w]), [beat]);
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const move = (e: React.PointerEvent<HTMLElement>) => { if (reduced) return; const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); e.currentTarget.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3)); };
  return <main className={`story-panel sc ${reduced ? 'calm' : ''}`} data-testid="story-panel" role="dialog" aria-label={beat.title} onClick={next} onPointerMove={move} style={{ '--c': ACC[line.who] ?? '#e0a24a' } as CSSProperties}>
    {beat.art && <div className="sc-bg" style={{ backgroundImage: `url(${artUrl(beat.art)})` }} aria-hidden="true"/>}<div className="sc-shade" aria-hidden="true"/><div className="sc-bars" aria-hidden="true"/>
    <ModalX onClose={onDone} label="Skip story"/>
    <div className="sc-head"><h2>{beat.title}</h2><small>{beat.place}</small></div>
    {cast.map((w, n) => <div key={w} className={`sc-who ${n % 2 ? 'r' : 'l'} ${w === line.who ? '' : 'dim'}`} aria-hidden="true"><img src={portraitUrl(beat.portraits![w])} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/></div>)}
    <div className="sc-box" aria-live="polite" key={i}><b>{line.who}</b><p>{line.text}</p></div>
    <div className="sc-bar"><button className="outlined-button" data-testid="story-back" disabled={i === 0} onClick={e => { e.stopPropagation(); back(); }}>BACK</button><span>{i + 1} / {beat.lines.length}</span>
      <button className="outlined-button" data-testid="story-skip" data-pad-cancel onClick={e => { e.stopPropagation(); onDone(); }}>SKIP</button>
      <button className="primary-button" data-testid="story-next" data-pad-default onClick={e => { e.stopPropagation(); next(); }}>{last ? doneLabel : 'NEXT'}</button></div>
    <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'NEXT' }, { key: 'LEFT', pad: 'D-PAD', label: 'BACK' }, { key: 'ESC', pad: 'B', label: 'SKIP' }]}/>
  </main>;
}

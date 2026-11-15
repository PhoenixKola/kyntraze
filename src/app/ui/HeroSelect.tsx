import { useEffect, type CSSProperties } from 'react';
import { HEROES } from '../../content/heroes';
import { HintBar } from './Chrome';
import { ARENAS, type ArenaId } from '../../content/arenas';
import { arenaCardUrl } from './ArenaSelect';
interface Props { onBack: () => void; onStart: () => void; seed: string; onSeed: (value: string) => void; arena: ArenaId; onArena: () => void; }
export function HeroSelect({ onBack, onStart, seed, onSeed, arena, onArena }: Props) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onBack(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onBack]);
  return <main className="selection-layout" data-testid="hero-select">
    <div className="screen-header"><button className="text-button" onClick={onBack} data-pad-cancel>← BACK</button><span>01 / RUNNER SELECTION</span></div>
    <p className="eyebrow">SELECT YOUR RUNNER</p><h2 className="large-heading">WHO FACES THE FRACTURE?</h2>
    <div className="hero-grid">
      {HEROES.map((h, i) => <article key={h.id} className={`hero-card ${h.playable ? 'active-hero' : 'locked-hero'}`} style={{ '--accent': h.accent } as CSSProperties}>
        <div className="hero-card-index">0{i + 1} / {h.title}</div>
        <div className={`hero-silhouette hero-${h.id}`} aria-hidden="true">{h.playable ? <span className="select-kai"/> : <span className="locked-glyph">{h.name[0]}</span>}</div>
        <div className="hero-copy"><h3>{h.name}</h3><p>{h.role}</p><small>STARTER · {h.weapon}</small></div>
        <div className="hero-status">{h.playable ? 'READY FOR DEPLOYMENT' : 'PLANNED · NOT YET PLAYABLE'}</div>
      </article>)}
    </div>
    <div className="start-row"><button className="arena-strip" onClick={onArena} data-testid="arena-open" style={{ '--card': `url(${arenaCardUrl(arena)})` } as CSSProperties} aria-label={`Arena: ${ARENAS[arena].name}. Change arena`}><span className="arena-strip-art" aria-hidden="true"/><span className="arena-strip-copy"><em>ARENA</em><b>{ARENAS[arena].name.toUpperCase()}</b></span><span className="arena-strip-go"><span>CHANGE</span><i aria-hidden="true"/></span></button><label className="seed-field">RUN SEED <input aria-label="Run seed" value={seed} onChange={e => onSeed(e.target.value)} placeholder="Random on start"/></label><button className="primary-button" onClick={onStart} data-testid="start-run" data-pad-default data-pad-start>DEPLOY KAI <span aria-hidden="true">↗</span></button></div>
    <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'DEPLOY' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}/>
  </main>;
}

import { HEROES } from '../../content/heroes';
interface Props { onBack: () => void; onStart: () => void; seed: string; onSeed: (value: string) => void; }
export function HeroSelect({ onBack, onStart, seed, onSeed }: Props) {
  return <main className="selection-layout" data-testid="hero-select">
    <div className="screen-header"><button className="text-button" onClick={onBack}>← BACK</button><span>01 / RUNNER SELECTION</span></div>
    <p className="eyebrow">SELECT YOUR RUNNER</p><h2 className="large-heading">WHO FACES THE FRACTURE?</h2>
    <div className="hero-grid">
      {HEROES.map((h, i) => <article key={h.id} className={`hero-card ${h.playable ? 'active-hero' : 'locked-hero'}`}>
        <div className="hero-card-index">0{i + 1} / {h.title}</div>
        <div className={`hero-silhouette hero-${h.id}`} aria-hidden="true"><span>{h.name[0]}</span></div>
        <div className="hero-copy"><h3>{h.name}</h3><p>{h.role}</p><small>STARTER · {h.weapon}</small></div>
        <div className="hero-status">{h.playable ? 'READY FOR DEPLOYMENT' : 'PLANNED · NOT PLAYABLE IN B00'}</div>
      </article>)}
    </div>
    <div className="start-row"><label className="seed-field">RUN SEED <input aria-label="Run seed" value={seed} onChange={e => onSeed(e.target.value)} placeholder="Random on start"/></label><button className="primary-button" onClick={onStart} data-testid="start-run">DEPLOY KAI <span aria-hidden="true">↗</span></button></div>
    <p className="fineprint">Kai is playable with temporary debug artwork. Ren and Sora will arrive in dedicated future batches.</p>
  </main>;
}

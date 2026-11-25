import type { CSSProperties } from 'react';
import type { LfHud, LfHudEvent } from '../../bridge/lfHud';
import { ASSET_BASE } from '../assetBase';

const icon = (k: string) => `${ASSET_BASE}art/fractures/ui/emblem_${k}.webp`;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const SHAPE: Record<string, string> = { rift: '◎', shrine: '✦', cache: '◆', elite: '▲', relay: '⬢', echo: '✶' };
const STATE: Record<string, string> = { idle: 'FOUND', active: 'ACTIVE', reward: 'CLAIM' };
/** Living Fractures HUD: announcements, tracker cards, live boons and curses, off-screen direction hints and the shrine bargain preview. Non-modal and pointer-transparent: it never covers the fight or the ability bar. Colour is never the only cue (icon, shape glyph and text always accompany it). */
export function LivingHud({ lf }: { lf: LfHud }) {
  const shrine = lf.events.find(e => e.kind === 'shrine' && e.st === 'idle' && e.dist < 360 && e.preview);
  const shown = lf.events.filter(e => (e.st !== 'idle' || e.seen || e.kind !== 'cache') && e !== shrine).slice(0, 3);
  const hints = shown.filter(e => e.dist > 560).slice(0, 2);
  return <div className="lf-hud" data-testid="lf-hud" aria-label="Living Fractures">
    <div className="lf-toasts" aria-live="polite">{lf.toasts.slice(-2).map(t => <div key={t.id} className={`lf-toast k-${t.kind}`} data-testid="lf-toast" style={{ '--a': Math.min(1, (6 - t.age) / 1.2) } as CSSProperties}>{t.kind !== 'info' && <img src={icon(t.kind)} alt="" draggable={false}/>}<span><b>{t.title}</b><small>{t.sub}</small></span></div>)}</div>
    {(shown.length > 0 || lf.fx.length > 0) && <aside className="lf-track" data-testid="lf-track">
      {shown.map(e => <Card key={e.id} e={e}/>)}
      {lf.fx.length > 0 && <ul className="lf-fx" data-testid="lf-fx" aria-label="Boons and curses">{lf.fx.slice(0, 6).map(f => <li key={f.id} className={f.kind}><span aria-hidden="true">{f.kind === 'boon' ? '▲' : '▼'}</span><b>{f.label}</b>{f.scope && <em>{f.scope}</em>}<small>{clock(f.left)}</small><i style={{ width: `${Math.max(0, Math.min(100, (f.left / f.dur) * 100))}%` }}/></li>)}</ul>}
    </aside>}
    {hints.map(e => { const x = 50 + Math.cos(e.ang) * 41, y = 50 + Math.sin(e.ang) * 36; return <div key={e.id} className="lf-hint" data-testid="lf-hint" style={{ left: `${x}%`, top: `${y}%`, '--r': `${e.ang}rad`, '--a': hex(e.accent) } as CSSProperties}><i/><span><img src={icon(e.kind)} alt=""/>{Math.round(e.dist / 100) * 100}</span></div>; })}
    {shrine && <section className="lf-bargain" data-testid="lf-bargain" aria-label="Bargain preview"><header><b>{shrine.name}</b><small>Stand on an altar to accept. Walk away to decline.</small></header>
      <div>{shrine.preview!.map(p => <article key={p.id}><h4>{p.name}</h4><p className="boon"><span aria-hidden="true">▲</span>{p.boon}</p><p className="curse"><span aria-hidden="true">▼</span>{p.curse}</p><small>{p.dur} s · {p.scope === 'party' ? 'curse hits the whole party' : 'only you'}</small></article>)}</div>
      {(shrine.channel ?? 0) > 0 && <i className="lf-ch" style={{ width: `${Math.min(100, (shrine.channel ?? 0) * 100)}%` }}/>}</section>}
  </div>;
}
function Card({ e }: { e: LfHudEvent }) {
  const hp = e.hpMax > 0 && (e.kind === 'elite' || e.kind === 'relay');
  return <article className={`lf-card k-${e.kind} s-${e.st}`} data-testid={`lf-card-${e.kind}`} style={{ '--a': hex(e.accent) } as CSSProperties}>
    <img src={icon(e.kind)} alt=""/><div><header><b><u aria-hidden="true">{SHAPE[e.kind]}</u>{e.name}</b><em>{STATE[e.st] ?? ''}{e.left > 0 && e.st !== 'idle' ? ` · ${clock(e.left)}` : ''}</em></header><p>{e.line}</p>
      {hp ? <div className="lf-bar hp" role="progressbar" aria-label="Health" aria-valuenow={Math.round((e.hp / e.hpMax) * 100)}><i style={{ width: `${Math.max(0, (e.hp / e.hpMax) * 100)}%` }}/></div> : null}
      {e.st !== 'idle' && !hp ? <div className="lf-bar" role="progressbar" aria-label="Progress" aria-valuenow={Math.round(e.p * 100)}><i style={{ width: `${Math.max(0, Math.min(100, e.p * 100))}%` }}/></div> : null}
      {hp && e.kind === 'relay' && e.st === 'active' ? <div className="lf-bar" aria-label="Progress"><i style={{ width: `${Math.min(100, e.p * 100)}%` }}/></div> : null}
      <small>{e.sub}</small></div></article>;
}

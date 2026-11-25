import { useEffect, useState } from 'react';
import { victoryFrames, victoryPoseFor } from './victoryPose';
import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { HintBar, ModalX } from './Chrome';
import { BuildStrip } from './BuildStrip';
import { ASSET_BASE } from '../assetBase';
import { CURRENCY, FEAT_BY_ID, UNLOCK_BY_ID, CONTRACT_BY_ID } from '../../content/meta';
import { MarksBadge } from './ProgressionScreen';
import { COSMETICS } from '../../b22/cosmetics';
import { HERO_BY_ID } from '../../content/heroes';
/** B31A: a Fracture Chronicles mission result: chapter wording, first-clear reward, next chapter, map. */
export interface ChronResult { kicker: string; name: string; reward: number; onNext?: () => void; nextLabel?: string; onMap: () => void }
interface Props { s: UiSnapshot; onRetry: () => void; onHome: () => void; onProgress: () => void; onEndless?: () => void; chron?: ChronResult }
const base = ASSET_BASE;

/** Victory and defeat share one structure (stats, build, actions) so the flow is the same; victory adds the key art, crest and a gold treatment. */
export function ResultsScreen({ s, onRetry, onHome, onProgress, onEndless, chron }: Props) {
  const won = s.phase === 'victory', rw = s.reward;
  return <div className={`overlay results-overlay ${won ? 'won' : 'lost'}`} data-testid="results-screen" data-outcome={won ? 'victory' : 'defeat'}>
    {won && <VictoryPoseView hero={s.hero} form={s.bestForm}/>}
    {won && <div className="res-art" style={{ backgroundImage: `url(${base}ui/victory-key.webp)` }} aria-hidden="true"/>}
    <section className={`modal compact-modal result-modal ${won ? 'result-win' : ''}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
      <ModalX onClose={onHome} label="Back to title"/>
      <div className="result-scroll">
      {won && <img className="res-crest" src={`${base}ui/victory-crest.png`} alt="" draggable={false}/>}
      <p className="eyebrow" data-testid="result-hero">{chron ? `${HERO_BY_ID[s.hero].name} · ${chron.kicker}`.replace(/^(\w+) ·  · /i, '$1 · ') : won ? 'THE NULL SERAPH IS DOWN' : 'CONNECTION TO THE ZONE LOST'}</p>
      {s.b22Crest && <p className="res-b22crest" data-testid="res-b22crest"><img src={`${base}ui/crests/${s.b22Crest}_s.png`} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/>EQUIPPED CREST · {COSMETICS.find(c => c.id === s.b22Crest)?.name.toUpperCase() ?? ''}</p>}
      <h2 id="result-title">{chron ? (won ? 'CHAPTER COMPLETE' : 'MISSION FAILED') : won ? 'THE FRACTURE HOLDS' : 'RUN TERMINATED'}</h2>
      {chron ? <p className="res-sub" data-testid="chron-result">{chron.name}{won ? (chron.reward > 0 ? ` · first clear +${chron.reward} Marks` : ' · replay, no second reward') : ' · nothing is lost. Try again, or step back to the map.'}</p> : won && <p className="res-sub">Kai sealed the rift. The zone falls quiet.</p>}
      {chron && <p className="results-chron" data-testid="chron-reward"><b>{chron.name}</b>{won ? (chron.reward > 0 ? ` · first clear: +${chron.reward} Marks` : ' · replay: no second reward') : ' · the mission was lost. Nothing is taken; try again or return to the map.'}</p>}
      <div className="score-number">{s.score.toLocaleString()} <span>POINTS</span></div>
      <div className="result-grid res-grid"><div>TIME <strong>{roundedTime(s.seconds)}</strong></div><div>LEVEL <strong>{s.level}</strong></div><div>ELIMINATIONS <strong>{s.kills}</strong></div><div>BOSSES <strong>{s.bosses}/2</strong></div><div>ARENA <strong className="res-arena">{s.arenaName.replace(/^THE /, '')}</strong></div><div>SEED <strong>{s.seed}</strong></div></div>
      {rw && <div className="rw-panel" data-testid="reward-panel">
        <header><span>{CURRENCY.name} EARNED</span><b data-testid="reward-total">+{rw.total}</b><MarksBadge marks={rw.balance} crest={s.crest}/></header>
        <ul>{rw.lines.map(l => <li key={l.label}><span>{l.label}</span><b>+{l.marks}</b></li>)}</ul>
        {(rw.newFeats.length > 0 || rw.unlocked.length > 0) && <div className="rw-new">{rw.newFeats.map(f => <span key={f} className="rw-chip feat">★ {FEAT_BY_ID[f].name}</span>)}{rw.unlocked.map(u => <span key={u} className="rw-chip unlock">NEW: {UNLOCK_BY_ID[u].name}</span>)}</div>}
        {rw.contract && <p className="rw-contract">{CONTRACT_BY_ID[rw.contract].name}: {rw.contractDone ? 'COMPLETE' : 'NOT COMPLETED · bonus pays on victory'}</p>}
        {rw.firstRun && <p className="rw-intro">Marks are <b>permanent</b>. XP and upgrades reset every run; spend marks in the Armory on starting boons, tools and contracts.</p>}
      </div>}
      <BuildStrip owned={s.owned} title="BUILD"/>
      </div>
      <div className="result-foot">
      <div className="stacked-actions">{chron && won && chron.onNext && <button className="primary-button" onClick={chron.onNext} data-testid="chron-next" data-pad-default>{chron.nextLabel ?? 'NEXT CHAPTER'} <span>→</span></button>}{won && s.asc?.canEndless && onEndless && <button className="primary-button" onClick={onEndless} data-testid="continue-endless">CONTINUE · ENDLESS <span>∞</span></button>}<button className={(won && s.asc?.canEndless) || (chron && won && chron.onNext) ? 'outlined-button' : 'primary-button'} onClick={onRetry} data-pad-default={chron && won && chron.onNext ? undefined : ''} data-pad-start data-testid="results-retry">{chron ? (won ? 'REPLAY MISSION' : 'RETRY MISSION') : won ? 'RUN IT AGAIN' : 'RETRY SAME SEED'} <span>↗</span></button>{chron && <button className="outlined-button" onClick={chron.onMap} data-testid="chron-map">CHRONICLES</button>}<button className="outlined-button" onClick={onProgress} data-testid="results-armory">ARMORY{rw && rw.balance > 0 ? ` · ${rw.balance}` : ''}</button><button className="outlined-button" onClick={onHome}>RETURN TO TITLE</button></div>
      <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'ENTER', pad: 'START', label: 'RETRY' }]}/>
      </div>
    </section>
  </div>;
}

/** The hero's real in-game pose for the form reached (authored sheet frames, looped ping-pong). Hidden on short screens by CSS so the action footer always fits. */
function VictoryPoseView({ hero, form }: { hero: string; form: number }) {
  const [st, setSt] = useState<{ url: string; w: number; h: number; n: number; from: number; to: number; fps: number; intro: number } | null>(null), [i, setI] = useState(0);
  useEffect(() => {
    let dead = false; const p = victoryPoseFor(hero, form);
    fetch(`${base}art/${p.root}/south/manifest.json`).then(r => r.json()).then(m => {
      const own = m.animations?.Victory, a = own ?? m.animations?.[p.clip]; if (dead || !a) return; const f = victoryFrames(own ? 'Victory' : p.clip, a.frames, a.events);
      setSt({ url: `${base}art/${p.root}/south/${a.sheet}`, w: a.frame_width ?? m.frame_width, h: a.frame_height ?? m.frame_height, n: a.frames, from: f.from, to: f.to, fps: Math.min(own ? 10 : 8, a.fps ?? 8), intro: own ? 0 : f.from }); setI(own ? 0 : f.from);
    }).catch(() => undefined);
    return () => { dead = true; };
  }, [hero, form]);
  useEffect(() => { if (!st || st.to <= st.from) return; let dir = 1, k = st.intro, entered = st.intro >= st.from; const t = window.setInterval(() => { k += dir; if (!entered) { if (k >= st.from) { k = st.from; entered = true; } } else if (k >= st.to) { k = st.to; dir = -1; } else if (k <= st.from) { k = st.from; dir = 1; } setI(k); }, 1000 / st.fps); return () => window.clearInterval(t); }, [st]);
  if (!st) return null;
  return <div className="res-pose" data-testid="victory-pose" data-form={form} aria-hidden="true" style={{ width: st.w, height: st.h, backgroundImage: `url(${st.url})`, backgroundSize: `${st.n * st.w}px ${st.h}px`, backgroundPosition: `-${i * st.w}px 0` }}/>;
}

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
import { LF_COPY } from '../../b31/fractures';
/** B31A: a Fracture Chronicles mission result: chapter wording, first-clear reward, next chapter, map. */
export interface ChronResult { kicker: string; name: string; reward: number; onNext?: () => void; nextLabel?: string; onMap: () => void }
interface Props { s: UiSnapshot; onRetry: () => void; onHome: () => void; onProgress: () => void; onEndless?: () => void; chron?: ChronResult }
const base = ASSET_BASE;

/** Victory and defeat share one structure (stats, build, actions) so the flow is the same; victory adds the key art, crest and a gold treatment. */
export function ResultsScreen({ s, onRetry, onHome, onProgress, onEndless, chron }: Props) {
  const won = s.phase === 'victory', rw = s.reward, canEndless = won && !!s.asc?.canEndless && !!onEndless, chronNext = !!(chron && won && chron.onNext);
  const heroName = HERO_BY_ID[s.hero].name;
  const stats: [string, string | number, string?][] = [['TIME', roundedTime(s.seconds)], ['LEVEL', s.level], ['ELIMS', s.kills], ['BOSSES', `${s.bosses}/2`], ['ARENA', s.arenaName.replace(/^THE /, ''), 'wide'], ['SEED', s.seed, 'wide']];
  return <div className={`overlay results-overlay rx ${won ? 'won' : 'lost'}`} data-testid="results-screen" data-outcome={won ? 'victory' : 'defeat'}>
    <div className="rx-bg" style={{ backgroundImage: `url(${base}ui/${won ? 'victory-key' : 'defeat-key'}.webp)` }} aria-hidden="true"/><div className="rx-shade" aria-hidden="true"/><div className="rx-motes" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
    {won && <VictoryPoseView hero={s.hero} form={s.bestForm}/>}
    <section className="rx-panel" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <ModalX onClose={onHome} label="Back to title"/>
      <i className="rx-corner a" aria-hidden="true"/><i className="rx-corner b" aria-hidden="true"/><i className="rx-corner c" aria-hidden="true"/><i className="rx-corner d" aria-hidden="true"/>
      <header className="rx-head">
        <img className="rx-crest" src={`${base}ui/${won ? 'victory-crest' : 'defeat-crest'}.png`} alt="" draggable={false}/>
        <div className="rx-titles">
          <p className="eyebrow rx-eyebrow" data-testid="result-hero">{chron ? `${heroName} · ${chron.kicker}`.replace(/^(\w+) ·  · /i, '$1 · ') : won ? 'THE NULL SERAPH IS DOWN' : 'CONNECTION TO THE ZONE LOST'}</p>
          <h2 id="result-title" className="rx-title">{chron ? (won ? 'CHAPTER COMPLETE' : 'MISSION FAILED') : won ? 'THE FRACTURE HOLDS' : 'RUN TERMINATED'}</h2>
          {chron ? <p className="rx-sub" data-testid="chron-result">{chron.name}{won ? (chron.reward > 0 ? ` · first clear +${chron.reward} Marks` : ' · replay, no second reward') : ' · nothing is lost. Try again, or step back to the map.'}</p> : won && <p className="rx-sub">{heroName} sealed the rift. The zone falls quiet.</p>}
          {s.b22Crest && <p className="res-b22crest rx-equipped" data-testid="res-b22crest"><img src={`${base}ui/crests/${s.b22Crest}_s.png`} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/>EQUIPPED CREST · {COSMETICS.find(c => c.id === s.b22Crest)?.name.toUpperCase() ?? ''}</p>}
        </div>
        <div className="rx-score"><span className="rx-score-label">SCORE</span><b className="rx-score-num">{s.score.toLocaleString()}</b><span className="rx-score-unit">POINTS</span></div>
      </header>
      <div className="rx-scroll">
        {chron && <p className="rx-chron" data-testid="chron-reward"><b>{chron.name}</b>{won ? (chron.reward > 0 ? ` · first clear: +${chron.reward} Marks` : ' · replay: no second reward') : ' · the mission was lost. Nothing is taken; try again or return to the map.'}</p>}
        <div className="rx-stats">{stats.map(([k, v, w]) => <div key={k} className={`rx-stat ${w ?? ''}`} title={k === 'ELIMS' ? 'ELIMINATIONS' : k}><span>{k}</span><strong className={k === 'ARENA' ? 'res-arena' : ''}>{v}</strong></div>)}</div>
        {s.lf && (s.lf.summary.hist.length > 0 || s.lf.summary.stats.discovered > 0) && <section className="lf-sum rx-lf" data-testid="lf-summary"><h4>LIVING FRACTURES · {s.lf.summary.stats.won} won · {s.lf.summary.stats.failed + s.lf.summary.stats.expired} missed{s.lf.summary.stats.relics ? ` · ${s.lf.summary.stats.relics} relic${s.lf.summary.stats.relics > 1 ? 's' : ''}` : ''}</h4><ul>{s.lf.summary.hist.slice(-5).map((h, i) => <li key={i} className={h.outcome}><b>{LF_COPY[h.kind].name}</b><em>{h.outcome.toUpperCase()}</em><span>{h.note}</span></li>)}</ul></section>}
        {rw && <div className="rw-panel rx-rw" data-testid="reward-panel">
          <header><span>{CURRENCY.name} EARNED</span><b data-testid="reward-total">+{rw.total}</b><MarksBadge marks={rw.balance} crest={s.crest}/></header>
          <ul>{rw.lines.map(l => <li key={l.label}><span>{l.label}</span><b>+{l.marks}</b></li>)}</ul>
          {(rw.newFeats.length > 0 || rw.unlocked.length > 0) && <div className="rw-new">{rw.newFeats.map(f => <span key={f} className="rw-chip feat">★ {FEAT_BY_ID[f].name}</span>)}{rw.unlocked.map(u => <span key={u} className="rw-chip unlock">NEW: {UNLOCK_BY_ID[u].name}</span>)}</div>}
          {rw.contract && <p className="rw-contract">{CONTRACT_BY_ID[rw.contract].name}: {rw.contractDone ? 'COMPLETE' : 'NOT COMPLETED · bonus pays on victory'}</p>}
          {rw.firstRun && <p className="rw-intro">Marks are <b>permanent</b>. XP and upgrades reset every run; spend marks in the Armory on starting boons, tools and contracts.</p>}
        </div>}
        <BuildStrip owned={s.owned} title="BUILD"/>
      </div>
      <footer className="rx-foot">
        <div className="rx-actions">
          {chronNext && <button className="rx-btn gold" onClick={chron!.onNext} data-testid="chron-next" data-pad-default><b>{chron!.nextLabel ?? 'NEXT CHAPTER'}</b><span>→</span></button>}
          {canEndless && <button className="rx-btn gold" onClick={onEndless} data-testid="continue-endless"><b>CONTINUE · ENDLESS</b><span>∞</span></button>}
          <button className={`rx-btn ${canEndless || chronNext ? 'ghost' : 'gold'}`} onClick={onRetry} data-pad-default={chronNext ? undefined : ''} data-pad-start data-testid="results-retry"><b>{chron ? (won ? 'REPLAY MISSION' : 'RETRY MISSION') : won ? 'RUN IT AGAIN' : 'RETRY SAME SEED'}</b><span>↗</span></button>
          {chron && <button className="rx-btn ghost" onClick={chron.onMap} data-testid="chron-map"><b>CHRONICLES</b></button>}
          <button className="rx-btn ghost" onClick={onProgress} data-testid="results-armory"><b>ARMORY{rw && rw.balance > 0 ? ` · ${rw.balance}` : ''}</b></button>
          <button className="rx-btn ghost" onClick={onHome}><b>RETURN TO TITLE</b></button>
        </div>
        <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'ENTER', pad: 'START', label: 'RETRY' }]}/>
      </footer>
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

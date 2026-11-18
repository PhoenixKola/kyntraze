import { useEffect, useMemo, useState } from 'react';
import type { SaveV1 } from '../../sim/SaveSystem';
import { MILESTONES, FORM_KEYS, FORM_INFO, ULTIMATES } from '../../b22/mastery';
import { OUTFITS, COSMETICS } from '../../b22/cosmetics';
import { RELICS } from '../../b22/relics';
import { BRANCHES } from '../../b22/branches';
import { LEGENDARIES } from '../../b22/legendary';
import { PAIRS } from '../../b22/pairs';
import { BOSSES } from '../../content/bosses';
import { BOSS_KINDS } from '../../content/enemies';
import { HERO_IDS } from '../../content/heroes';
import { UPGRADE_BY_ID } from '../../content/upgrades';
import { blankB22, equipOutfit, outfitUnlocked, type B22Save } from '../../b22/save';
import { HintBar } from './Chrome';
import { ASSET_BASE } from '../assetBase';
import { branchArt, legendArt, outfitArt, relicArt, ultArt } from '../../b22/artIcons';
const Ic = ({ n, big }: { n: string; big?: boolean }) => <img className={big ? 'arc-pic' : 'arc-ico'} src={`${ASSET_BASE}art/b22/${n}.png`} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/>;
import { StoryPanel } from './StoryPanel';
import { STORY, type StoryBeat } from '../../b22/story';

type Tab = 'story' | 'mastery' | 'cosmetics' | 'codex' | 'records' | 'boards';
interface Props { save: SaveV1; onBack: () => void; onSave: (b: B22Save) => void }
const TABS: [Tab, string][] = [['story', 'STORY'], ['mastery', 'MASTERY'], ['cosmetics', 'OUTFITS & CRESTS'], ['codex', 'CODEX'], ['records', 'RECORDS'], ['boards', 'BOARDS']];
/** Archives: everything B22 adds that is not a run: seven mastery paths (21 milestones), outfits with real unlock conditions, a codex of relics / branches / recipes / bosses / pair attacks, local records by mode, and the leaderboard status (LOCAL unless a server verified it). */
export function ArchivesScreen({ save, onBack, onSave }: Props) {
  const [tab, setTab] = useState<Tab>('mastery'); const [replay, setReplay] = useState<StoryBeat | null>(null); const b22 = save.b22 ?? blankB22();
  const heroWins = useMemo(() => Object.fromEntries(HERO_IDS.map(h => [h, save.meta.heroes[h]?.wins ?? 0])), [save]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onBack(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onBack]);
  const have = (id: string) => b22.owned.includes(id);
  return <main className="selection-layout archives-layout" data-testid="archives">
    <div className="screen-header"><button className="text-button" onClick={onBack} data-pad-cancel>← BACK</button><span>ARCHIVES · SHATTERED HORIZONS</span></div>
    <div className="arc-tabs" role="tablist">{TABS.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} className={`outlined-button ${tab === k ? 'on' : ''}`} data-testid={`arc-${k}`} onClick={() => setTab(k)}>{n}</button>)}</div>
    <section className="arc-body">
      {tab === 'story' && <article className="arc-card wide"><h3>TRIAL OF THE OATHBROKEN</h3>{STORY.map(c => { const open = c.n === 1 || (b22.story.done as number[]).includes(c.n - 1), done = (b22.story.done as number[]).includes(c.n); return <p key={c.n} className={done ? 'done' : open ? '' : 'dim'}><b>{done ? '✓' : open ? '○' : '🔒'} {c.name}</b><br/>{open ? <><button className="outlined-button" data-testid={`replay-intro-${c.n}`} onClick={() => setReplay(c.intro)}>REPLAY OPENING</button> <button className="outlined-button" disabled={!done} data-testid={`replay-outro-${c.n}`} onClick={() => setReplay(c.outro)}>REPLAY ENDING</button></> : 'Finish the previous chapter to unlock.'}</p>; })}</article>}
      {tab === 'mastery' && <div className="arc-grid">{FORM_KEYS.map(f => <article key={f} className="arc-card" style={{ borderColor: FORM_INFO[f].accent }}><h3>{FORM_INFO[f].name.toUpperCase()} <small>{FORM_INFO[f].hero.toUpperCase()}</small></h3>
        {MILESTONES.filter(m => m.form === f).map(m => { const done = !!b22.mastery[m.id]; return <p key={m.id} className={done ? 'done' : ''} data-testid={`ms-${m.id}`}><b>{done ? '✓' : '○'} {m.tier.toUpperCase()} · {m.name}</b><br/>{m.blurb}<br/><em>Reward: {m.reward.label}{done ? ' (owned)' : ''}</em></p>; })}</article>)}</div>}
      {tab === 'cosmetics' && <div className="arc-grid">{OUTFITS.map(o => { const ok = outfitUnlocked(o, { heroWins, b22 }), on = b22.equipped.outfit[o.hero] === o.id; return <article key={o.id} className={`arc-card ${ok ? '' : 'locked'}`} style={{ borderColor: o.palette.secondary }}><Ic n={outfitArt(o.id)} big/><h3>{o.name.toUpperCase()} <small>{o.hero.toUpperCase()}</small></h3><p>{o.blurb}</p><p className="dim">{o.silhouette}</p><p className="dim">{ok ? 'Unlocked' : 'Locked: ' + describeUnlock(o.unlock)}</p>
        <div className="swatches">{[o.palette.primary, o.palette.secondary, o.palette.glow].map(c => <i key={c} style={{ background: c }}/>)}</div><button className="outlined-button" disabled={!ok} data-testid={`equip-${o.id}`} onClick={() => onSave(equipOutfit(b22, o.hero, on ? null : o.id, { heroWins }))}>{on ? 'EQUIPPED · REMOVE' : 'EQUIP'}</button><small>Cosmetic only. Outfit art is the card above; in a run the outfit is applied as a palette and aura treatment.</small></article>; })}
        <article className="arc-card"><h3>CRESTS & REWARDS</h3>{COSMETICS.map(c => <p key={c.id} className={have(c.id) ? 'done' : 'dim'}>{have(c.id) ? '✓' : '○'} {c.name} · {c.source}</p>)}</article></div>}
      {tab === 'codex' && <div className="arc-grid">
        <article className="arc-card"><h3>RELICS {b22.seen.relics.length}/{RELICS.length}</h3>{RELICS.map(r => <p key={r.id} className={b22.seen.relics.includes(r.id) ? 'done' : 'dim'}><Ic n={relicArt(r.id)}/><b>{b22.seen.relics.includes(r.id) ? r.name : '???'}</b> · {r.realm}<br/>{b22.seen.relics.includes(r.id) ? `${r.trigger}. ${r.effect}` : 'Found through Expedition shrines, wave rewards and bosses.'}</p>)}</article>
        <article className="arc-card"><h3>ASCENSION BRANCHES</h3>{BRANCHES.map(b => <p key={b.id} className={b22.seen.branches.includes(b.id) ? 'done' : 'dim'}><Ic n={branchArt(b.id)}/><b>{b.hero.toUpperCase()} {b.slot.toUpperCase()} · {b.name}</b> ({b.skill})<br/>{b.gain} {b.cost}</p>)}</article>
        <article className="arc-card"><h3>LEGENDARY RECIPES</h3>{LEGENDARIES.map(l => <p key={l.id} className={b22.seen.legends.includes(l.id) ? 'done' : ''}><Ic n={legendArt(l.id)}/><b>{l.name}</b> · {l.hero.toUpperCase()}<br/>Needs {l.needs.map(n => `${UPGRADE_BY_ID[n.id].name} ×${n.stacks}`).join(' + ')}<br/>{l.effect}</p>)}</article>
        <article className="arc-card"><h3>BOSS CODEX {b22.seen.bosses.length}/{BOSS_KINDS.length}</h3>{BOSS_KINDS.map(k => <p key={k} className={b22.seen.bosses.includes(k) ? 'done' : 'dim'}><b>{b22.seen.bosses.includes(k) ? BOSSES[k].name : '???'}</b><br/>{b22.seen.bosses.includes(k) ? BOSSES[k].title : 'Defeat it to record it.'}</p>)}</article>
        <article className="arc-card"><h3>ULTIMATES & PAIR ATTACKS</h3>{Object.values(ULTIMATES).map(u => <p key={u.id}><Ic n={ultArt(u.hero)}/><b>{u.name}</b> · {u.hero.toUpperCase()}<br/>{u.blurb}</p>)}{PAIRS.map(p => <p key={p.id}><b>{p.name}</b> · {p.heroes.join(' + ').toUpperCase()}<br/>{p.setup} {p.payoff}</p>)}</article></div>}
      {tab === 'records' && <article className="arc-card wide"><h3>LOCAL RECORDS</h3>{Object.keys(b22.records).length === 0 && <p className="dim">No B22 runs recorded yet.</p>}
        {Object.entries(b22.records).sort((a, b) => b[1].bestScore - a[1].bestScore).map(([k, r]) => { const [mode, hero, arena, party] = k.split('|'); return <p key={k}><b>{mode.replace(/_/g, ' ').toUpperCase()}</b> · {hero.toUpperCase()} · {arena} · {party === '2' ? 'CO-OP' : 'SOLO'} — {r.runs} runs, {r.wins} wins, best {r.bestScore.toLocaleString()} pts, {Math.floor(r.bestSeconds / 60)}:{String(r.bestSeconds % 60).padStart(2, '0')}{r.bestCycle ? `, cycle ${r.bestCycle}` : ''}</p>; })}
        <p className="dim">Records are kept per mode, hero, arena and party size so different rules never mix.</p></article>}
      {tab === 'boards' && <article className="arc-card wide"><h3>CHALLENGE BOARDS</h3>
        {Object.entries(b22.challenges).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 20).map(([id, c]) => <p key={id}><b>{id}</b> · best {c.best.toLocaleString()} · {c.attempts} attempts · {c.done ? 'COMPLETED' : 'not completed'} · <em>LOCAL</em></p>)}
        {Object.keys(b22.challenges).length === 0 && <p className="dim">No challenge attempts yet.</p>}
        <p className="dim">LOCAL = measured on this device only. A score is SERVER-VERIFIED only when a game server simulated the run: {b22.server.url ? `configured server: ${b22.server.url}` : 'no server configured. Friends filters need an account service that is not connected.'}</p></article>}
    </section>
    {replay && <StoryPanel beat={replay} onDone={() => setReplay(null)}/>}
    <HintBar hints={[{ key: 'ESC', pad: 'B', label: 'BACK' }]}/>
  </main>;
}
function describeUnlock(u: (typeof OUTFITS)[number]['unlock']): string {
  switch (u.kind) { case 'wins': return `win ${u.n} runs with ${u.hero.toUpperCase()}`; case 'boss': return `defeat ${u.boss.replace(/_/g, ' ')}`; case 'mastery': return `earn mastery ${u.milestone}`; case 'mode': return `win a ${u.mode.replace(/_/g, ' ')} run`; case 'story': return "finish the Trial of the Oathbroken"; default: return 'always'; }
}

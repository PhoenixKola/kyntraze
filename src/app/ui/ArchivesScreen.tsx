import { useMemo, useState } from 'react';
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
import { blankB22, equipAura, equipB22Crest, equipOutfit, outfitUnlocked, type B22Save } from '../../b22/save';
import { AURA_DETAIL, CONTOUR_FORM } from '../../game/render/edgePalette';
import { ASSET_BASE } from '../assetBase';
import { branchArt, legendArt, outfitArt, relicArt, ultArt } from '../../b22/artIcons';
import { Card, Chip, Frame, Panel, Tabs } from './b29/Kit';
import { StoryPanel } from './StoryPanel';
import { STORY, type StoryBeat } from '../../b22/story';
const FORM_PIC: Partial<Record<string, string>> = { flarebound: 'ui/kit/crest-f1.webp', cometheart: 'ui/kit/crest-f2.webp', stillfire: 'ui/kit/crest-f3.webp', riftbound: 'art/b22/vex_riftbound.png', voidheart_exile: 'art/b22/vex_voidheart.png', crimson_ascendant: 'ui/heroes/ren-portrait-f1.webp', azure_sovereign: 'ui/heroes/sora-portrait-f1.webp' };
const hide = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; };
const Ic = ({ n, big }: { n: string; big?: boolean }) => <img className={big ? 'ar-pic' : 'ar-ico'} src={`${ASSET_BASE}art/b22/${n}.png`} alt="" draggable={false} onError={hide}/>;

type Tab = 'story' | 'mastery' | 'cosmetics' | 'codex' | 'records' | 'boards';
type Codex = 'relics' | 'branches' | 'recipes' | 'bosses' | 'ults';
interface Props { save: SaveV1; onBack: () => void; onSave: (b: B22Save) => void }
const TABS: [Tab, string][] = [['story', 'STORY'], ['mastery', 'MASTERY'], ['cosmetics', 'OUTFITS & CRESTS'], ['codex', 'CODEX'], ['records', 'RECORDS'], ['boards', 'BOARDS']];
const TITLE: Record<Tab, string> = { story: 'TRIAL OF THE OATHBROKEN', mastery: 'MASTERY', cosmetics: 'OUTFITS & CRESTS', codex: 'CODEX', records: 'LOCAL RECORDS', boards: 'CHALLENGE BOARDS' };
/** Archives: everything B22 adds that is not a run: seven mastery paths (21 milestones), outfits with real unlock conditions, a codex of relics / branches / recipes / bosses / pair attacks, local records by mode, and the leaderboard status (LOCAL unless a server verified it). */
export function ArchivesScreen({ save, onBack, onSave }: Props) {
  const [tab, setTab] = useState<Tab>('mastery'); const [replay, setReplay] = useState<StoryBeat | null>(null); const b22 = save.b22 ?? blankB22();
  const [form, setForm] = useState<(typeof FORM_KEYS)[number]>(FORM_KEYS[0]); const [cx, setCx] = useState<Codex>('relics');
  const heroWins = useMemo(() => Object.fromEntries(HERO_IDS.map(h => [h, save.meta.heroes[h]?.wins ?? 0])), [save]);
  const have = (id: string) => b22.owned.includes(id);
  const total = MILESTONES.length, earned = MILESTONES.filter(m => b22.mastery[m.id]).length;
  const formDone = (f: string) => MILESTONES.filter(m => m.form === f && b22.mastery[m.id]).length;
  const equipBtn = (id: string, ok: boolean, on: boolean, run: () => void, locked = 'LOCKED') => <button type="button" className={`ar-equip ${on ? 'on' : ''}`} disabled={!ok} data-testid={`equip-${id}`} onClick={run}>{ok ? (on ? 'EQUIPPED · REMOVE' : 'EQUIP') : locked}</button>;
  return <Frame testId="archives" className="ar" eyebrow="ARCHIVES · SHATTERED HORIZONS" title={TITLE[tab]} onBack={onBack} hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}
    right={<span className="ar-total" aria-label={`${earned} of ${total} mastery milestones`}><b>{earned}</b>/{total}<small>MILESTONES</small></span>}>
    <div className="ar-col">
      <div className="b29-tabs ar-tabs" role="tablist">{TABS.map(([k, n]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={`b29-tab ${tab === k ? 'on' : ''}`} data-testid={`arc-${k}`} onClick={() => setTab(k)}><img className="tab-ico" src={`${ASSET_BASE}ui/icons/tab_${k}.png`} alt="" draggable={false}/>{n}</button>)}</div>
      <section className="ar-body">
        {tab === 'story' && <div className="b29-scroll ar-scroll"><div className="ar-story">{STORY.map(c => { const open = c.n === 1 || (b22.story.done as number[]).includes(c.n - 1), done = (b22.story.done as number[]).includes(c.n);
          return <Panel key={c.n} className={`ar-chapter ${done ? 'done' : open ? '' : 'locked'}`}><div className="ar-chead"><span className="ar-num">{done ? '✓' : open ? c.n : '🔒'}</span><div><b>{c.name}</b><Chip tone={done ? 'gold' : open ? 'teal' : 'mute'}>{done ? 'COMPLETE' : open ? 'AVAILABLE' : 'LOCKED'}</Chip></div></div>
            {open ? <div className="ar-btns"><button type="button" className="ar-equip" data-testid={`replay-intro-${c.n}`} onClick={() => setReplay(c.intro)}>REPLAY OPENING</button><button type="button" className="ar-equip" disabled={!done} data-testid={`replay-outro-${c.n}`} onClick={() => setReplay(c.outro)}>REPLAY ENDING</button></div> : <small>Finish the previous chapter to unlock.</small>}</Panel>; })}</div></div>}

        {tab === 'mastery' && <div className="ar-split">
          <div className="b29-scroll ar-rail" role="list" aria-label="Mastery paths">{FORM_KEYS.map(f => { const n = formDone(f), master = !!b22.mastery[`${f}.master`];
            return <Card key={f} on={form === f} accent={FORM_INFO[f].accent} onClick={() => setForm(f)} className="ar-form"><img className={`ar-crest ${master ? 'earned' : ''}`} src={`${ASSET_BASE}ui/crests/crest_${f}.png`} alt="" draggable={false} data-testid={`crest-art-${f}`} onError={hide}/>
              <span className="ar-ftxt"><b>{FORM_INFO[f].name.toUpperCase()}</b><small>{FORM_INFO[f].hero.toUpperCase()}</small><i className="ar-bar"><u style={{ width: `${(n / 3) * 100}%` }}/></i></span><em className="ar-count">{n}/3</em></Card>; })}</div>
          <Panel className="ar-detail" style={{ '--acc': FORM_INFO[form].accent } as React.CSSProperties}>
            <div className="ar-dhead">{FORM_PIC[form] && <img className="ar-hero" src={`${ASSET_BASE}${FORM_PIC[form]}`} alt="" draggable={false} onError={hide}/>}<div><b>{FORM_INFO[form].name.toUpperCase()}</b><small>{FORM_INFO[form].hero.toUpperCase()} · {formDone(form)}/3 MILESTONES</small><i className="ar-bar big"><u style={{ width: `${(formDone(form) / 3) * 100}%` }}/></i></div></div>
            <div className="b29-scroll ar-ms">{MILESTONES.filter(m => m.form === form).map((m, i) => { const done = !!b22.mastery[m.id];
              return <div key={m.id} className={`ar-milestone ${done ? 'done' : ''}`} data-testid={`ms-${m.id}`}><span className="ar-node">{done ? '✓' : i + 1}</span><div><b>{m.tier.toUpperCase()} · {m.name}</b><p>{m.blurb}</p><Chip tone={done ? 'gold' : 'mute'}>{done ? 'OWNED' : 'REWARD'} · {m.reward.label}</Chip></div></div>; })}</div>
          </Panel></div>}

        {tab === 'cosmetics' && <div className="b29-scroll ar-scroll"><div className="ar-grid">{OUTFITS.map(o => { const ok = outfitUnlocked(o, { heroWins, b22 }), on = b22.equipped.outfit[o.hero] === o.id;
          return <Panel key={o.id} className={`ar-outfit ${ok ? '' : 'locked'} ${on ? 'on' : ''}`} style={{ '--acc': o.palette.secondary } as React.CSSProperties}><Ic n={outfitArt(o.id)} big/><div className="ar-oname"><b>{o.name.toUpperCase()}</b><Chip tone={ok ? 'teal' : 'mute'}>{o.hero.toUpperCase()}</Chip></div><p>{o.blurb}</p><small>{o.silhouette}</small><small className={ok ? 'ok' : 'warn'}>{ok ? 'Unlocked' : 'Locked: ' + describeUnlock(o.unlock)}</small>
            <div className="swatches">{[o.palette.primary, o.palette.secondary, o.palette.glow].map(c => <i key={c} style={{ background: c }}/>)}</div>{equipBtn(o.id, ok, on, () => onSave(equipOutfit(b22, o.hero, on ? null : o.id, { heroWins })))}</Panel>; })}
          <Panel title="EDGE DETAILS" className="ar-wide" data-testid="edge-details"><small>Cosmetic only. A detail changes how your transformation's outline flows; the form keeps its colour and gains no power. Earned finishers play on their own on boss and elite kills in that form.</small>
            <div className="ar-edges">{FORM_KEYS.map(f => { const id = `aura_detail_${f}`, own = have(id), on = b22.equipped.aura[f] === id, key = Object.keys(CONTOUR_FORM).find(k => CONTOUR_FORM[k] === f)!, pal = AURA_DETAIL[key], hex = (v: number[]) => `rgb(${v.map(x => Math.round(x * 255)).join(',')})`;
              return <div key={id} className={`ar-edge ${own ? '' : 'locked'}`}><b>{FORM_INFO[f].name}</b><small>{MILESTONES.find(m => m.reward.id === id)!.reward.label}</small><span className="edge-prev" aria-hidden style={{ background: `linear-gradient(90deg, ${hex(pal.c1)}, ${hex(pal.c2)}, ${hex(pal.c3)}, ${hex(pal.c2)}, ${hex(pal.c1)})` }}/>{equipBtn(id, own, on, () => onSave(equipAura(b22, f, !on)))}</div>; })}</div></Panel>
          <Panel title="CRESTS & REWARDS" className="ar-wide" data-testid="crests"><div className="ar-crests">{COSMETICS.map(c => { const own = have(c.id), isCrest = c.kind === 'crest' || c.kind === 'crest_mode', on = b22.equipped.crest === c.id;
            return <div key={c.id} className={`ar-crow ${own ? 'own' : ''}`}>{c.kind === 'crest' && <img className={`ar-cmini ${own ? '' : 'locked'}`} src={`${ASSET_BASE}ui/crests/${c.id}_s.png`} alt="" draggable={false} onError={hide}/>}<span><b>{c.name}</b><small>{own ? '✓ ' : '○ '}{c.source}</small></span>{isCrest && own && equipBtn(c.id, true, on, () => onSave(equipB22Crest(b22, on ? null : c.id)))}</div>; })}</div></Panel></div></div>}

        {tab === 'codex' && <div className="ar-codex"><Tabs value={cx} onChange={setCx} testPrefix="cx" tabs={[{ id: 'relics', label: 'RELICS', badge: `${b22.seen.relics.length}/${RELICS.length}` }, { id: 'branches', label: 'BRANCHES' }, { id: 'recipes', label: 'RECIPES' }, { id: 'bosses', label: 'BOSSES', badge: `${b22.seen.bosses.length}/${BOSS_KINDS.length}` }, { id: 'ults', label: 'ULTIMATES & PAIRS' }]}/>
          <div className="b29-scroll ar-scroll"><div className="ar-list">
            {cx === 'relics' && RELICS.map(r => { const s = b22.seen.relics.includes(r.id); return <div key={r.id} className={`ar-entry ${s ? '' : 'dim'}`}><Ic n={relicArt(r.id)}/><span><b>{s ? r.name : '???'} <Chip tone="mute">{r.realm}</Chip></b><small>{s ? `${r.trigger}. ${r.effect}` : 'Found through Expedition shrines, wave rewards and bosses.'}</small></span></div>; })}
            {cx === 'branches' && BRANCHES.map(b => { const s = b22.seen.branches.includes(b.id); return <div key={b.id} className={`ar-entry ${s ? '' : 'dim'}`}><Ic n={branchArt(b.id)}/><span><b>{b.hero.toUpperCase()} {b.slot.toUpperCase()} · {b.name} <Chip tone="mute">{b.skill}</Chip></b><small>{b.gain} {b.cost}</small></span></div>; })}
            {cx === 'recipes' && LEGENDARIES.map(l => <div key={l.id} className={`ar-entry ${b22.seen.legends.includes(l.id) ? '' : 'dim'}`}><Ic n={legendArt(l.id)}/><span><b>{l.name} <Chip tone="gold">{l.hero.toUpperCase()}</Chip></b><small>Needs {l.needs.map(n => `${UPGRADE_BY_ID[n.id].name} ×${n.stacks}`).join(' + ')}. {l.effect}</small></span></div>)}
            {cx === 'bosses' && BOSS_KINDS.map(k => { const s = b22.seen.bosses.includes(k); return <div key={k} className={`ar-entry ${s ? '' : 'dim'}`}><span className="ar-ico ar-q">{s ? '◆' : '?'}</span><span><b>{s ? BOSSES[k].name : '???'}</b><small>{s ? BOSSES[k].title : 'Defeat it to record it.'}</small></span></div>; })}
            {cx === 'ults' && <>{Object.values(ULTIMATES).map(u => <div key={u.id} className="ar-entry"><Ic n={ultArt(u.hero)}/><span><b>{u.name} <Chip tone="gold">{u.hero.toUpperCase()}</Chip></b><small>{u.blurb}</small></span></div>)}{PAIRS.map(p => <div key={p.id} className="ar-entry"><span className="ar-ico ar-q">⚭</span><span><b>{p.name} <Chip tone="teal">{p.heroes.join(' + ').toUpperCase()}</Chip></b><small>{p.setup} {p.payoff}</small></span></div>)}</>}
          </div></div></div>}

        {tab === 'records' && <div className="b29-scroll ar-scroll"><Panel className="ar-wide">{Object.keys(b22.records).length === 0 && <p className="ar-empty">No B22 runs recorded yet. Finish a run and it will be filed here.</p>}
          {Object.entries(b22.records).sort((a, b) => b[1].bestScore - a[1].bestScore).map(([k, r]) => { const [mode, hero, arena, party] = k.split('|');
            return <div key={k} className="ar-rec"><span><b>{mode.replace(/_/g, ' ').toUpperCase()}</b><small>{hero.toUpperCase()} · {arena} · {party === '2' ? 'CO-OP' : 'SOLO'}</small></span><span className="ar-stats"><i><em>{r.runs}</em>RUNS</i><i><em>{r.wins}</em>WINS</i><i><em>{r.bestScore.toLocaleString()}</em>BEST PTS</i><i><em>{Math.floor(r.bestSeconds / 60)}:{String(r.bestSeconds % 60).padStart(2, '0')}</em>TIME</i>{r.bestCycle ? <i><em>{r.bestCycle}</em>CYCLE</i> : null}</span></div>; })}
          <small>Records are kept per mode, hero, arena and party size so different rules never mix.</small></Panel></div>}

        {tab === 'boards' && <div className="b29-scroll ar-scroll"><Panel className="ar-wide">
          {Object.entries(b22.challenges).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 20).map(([id, c]) => <div key={id} className="ar-rec"><span><b>{id}</b><small>{c.attempts} attempts</small></span><span className="ar-stats"><i><em>{c.best.toLocaleString()}</em>BEST</i><Chip tone={c.done ? 'gold' : 'mute'}>{c.done ? 'COMPLETED' : 'NOT COMPLETED'}</Chip><Chip>LOCAL</Chip></span></div>)}
          {Object.keys(b22.challenges).length === 0 && <p className="ar-empty">No challenge attempts yet.</p>}
          <small>LOCAL = measured on this device only. A score is SERVER-VERIFIED only when a game server simulated the run: {b22.server.url ? `configured server: ${b22.server.url}` : 'no server configured. Friends filters need an account service that is not connected.'}</small></Panel></div>}
      </section>
    </div>
    {replay && <StoryPanel beat={replay} onDone={() => setReplay(null)}/>}
  </Frame>;
}
function describeUnlock(u: (typeof OUTFITS)[number]['unlock']): string {
  switch (u.kind) { case 'wins': return `win ${u.n} runs with ${u.hero.toUpperCase()}`; case 'boss': return `defeat ${u.boss.replace(/_/g, ' ')}`; case 'mastery': return `earn mastery ${u.milestone}`; case 'mode': return `win a ${u.mode.replace(/_/g, ' ')} run`; case 'story': return "finish the Trial of the Oathbroken"; default: return 'always'; }
}

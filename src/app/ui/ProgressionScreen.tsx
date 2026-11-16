import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ARENAS, ARENA_IDS, type ArenaId } from '../../content/arenas';
import { BOON_IDS, CONTRACTS, CURRENCY, FEATS, MASTERY, UNLOCKS, UNLOCK_BY_ID, type ContractDef, type UnlockDef, type UnlockId } from '../../content/meta';
import { contractAvailable, equipBoon, equipCrest, featProgress, masteryDone, masteryProgress, purchase, reqMet, setContract, type MetaState } from '../../sim/MetaSystem';
import { sharedAbilityAudio } from '../../game/audio/abilityAudio';
import { roundedTime } from '../../core/Math';
import { HintBar } from './Chrome';
import { ASSET_BASE } from '../assetBase';
import { HEROES } from '../../content/heroes';
import { HERO_KIT } from '../../content/heroKits';

export type ProgressTab = 'armory' | 'contracts' | 'archives';
const icon = (n: string) => `${ASSET_BASE}ui/meta/${n}.png`;
const TABS: { id: ProgressTab; label: string }[] = [{ id: 'armory', label: 'ARMORY' }, { id: 'contracts', label: 'CONTRACTS' }, { id: 'archives', label: 'ARCHIVES' }];
interface Props { meta: MetaState; unlocks: { cometheart: boolean; stillfire: boolean; ren?: boolean; sora?: boolean }; tab: ProgressTab; onTab: (t: ProgressTab) => void; onMeta: (m: MetaState) => void; onBack: () => void; onDeploy?: () => void; backLabel?: string }

/** Marks balance + equipped crest: always visible so the player never wonders what they can afford. */
export function MarksBadge({ marks, crest }: { marks: number; crest?: string | null }) {
  return <span className="pg-marks" data-testid="marks-balance" aria-label={`${marks} ${CURRENCY.name}`}>{crest && UNLOCK_BY_ID[crest as UnlockId] && <img className="pg-crest-mini" src={icon(UNLOCK_BY_ID[crest as UnlockId].icon)} alt="" draggable={false}/>}<img src={icon('mark')} alt="" draggable={false}/><b>{marks.toLocaleString()}</b><em>{CURRENCY.short}</em></span>;
}

export function ProgressionScreen({ meta, unlocks, tab, onTab, onMeta, onBack, onDeploy, backLabel = '← BACK' }: Props) {
  const [pending, setPending] = useState<UnlockId | null>(null);
  const [fresh, setFresh] = useState<UnlockId | null>(null);
  const [note, setNote] = useState('');
  const lock = useRef(0); const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => { const h = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onBack(); } }; window.addEventListener('keydown', h, true); return () => window.removeEventListener('keydown', h, true); }, [onBack]);
  useEffect(() => { setPending(null); }, [tab]);
  const noRepeat = (e: KeyboardEvent) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); };
  const audio = () => sharedAbilityAudio();
  const buy = (id: UnlockId) => {
    const now = performance.now(); if (now < lock.current) return;
    if (pending !== id) { setPending(id); lock.current = now + 220; window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setPending(null), 4000); return; }
    lock.current = now + 400; const r = purchase(meta, id); setPending(null);
    if (r.ok) { onMeta(r.meta); setFresh(id); setNote(`${UNLOCK_BY_ID[id].name} ${UNLOCK_BY_ID[id].cosmetic ? 'ACQUIRED' : 'UNLOCKED'}${r.meta.boon === id.slice(5) && UNLOCK_BY_ID[id].kind === 'boon' ? ' · EQUIPPED' : ''}`); audio()?.ui('lv_pick'); }
    else setNote(r.reason === 'funds' ? 'NOT ENOUGH MARKS' : 'REQUIREMENT NOT MET');
  };
  const state = (u: UnlockDef): 'equipped' | 'owned' | 'available' | 'poor' | 'locked' => {
    if (meta.owned.includes(u.id)) return (u.kind === 'boon' && meta.boon === u.id.slice(5)) || (u.kind === 'crest' && meta.crest === u.id) ? 'equipped' : 'owned';
    if (!reqMet(meta, u.req)) return 'locked'; return meta.marks >= u.cost ? 'available' : 'poor';
  };
  const act = (u: UnlockDef) => {
    const st = state(u);
    if (st === 'owned' && u.kind === 'boon') { onMeta(equipBoon(meta, u.id.slice(5) as never)); audio()?.ui('ui_toggle_on'); }
    else if (st === 'equipped' && u.kind === 'boon') { onMeta(equipBoon(meta, null)); audio()?.ui('ui_toggle_off'); }
    else if (st === 'owned' && u.kind === 'crest') { onMeta(equipCrest(meta, u.id)); audio()?.ui('ui_toggle_on'); }
    else if (st === 'equipped' && u.kind === 'crest') { onMeta(equipCrest(meta, null)); audio()?.ui('ui_toggle_off'); }
    else if (st === 'available') buy(u.id);
    else if (st === 'poor') { setNote(`NEED ${u.cost - meta.marks} MORE MARKS`); } else if (st === 'locked') setNote(u.req?.label.toUpperCase() ?? 'LOCKED');
  };
  const tag = (u: UnlockDef) => { const st = state(u); return st === 'equipped' ? 'EQUIPPED' : st === 'owned' ? (u.kind === 'tool' ? 'OWNED' : 'OWNED · TAP TO EQUIP') : st === 'locked' ? `LOCKED · ${u.req?.label.toUpperCase()}` : pending === u.id ? (u.cost > 0 ? `CONFIRM · −${u.cost}` : 'CONFIRM · CLAIM') : u.cost > 0 ? `${u.cost} ${CURRENCY.short}${st === 'poor' ? ' · NOT ENOUGH' : ''}` : 'CLAIM · FREE'; };
  const card = (u: UnlockDef) => {
    const st = state(u);
    return <li key={u.id}><button className={`pg-card st-${st} ${fresh === u.id ? 'is-new' : ''} ${pending === u.id ? 'is-pending' : ''}`} onClick={() => act(u)} onKeyDown={noRepeat} data-testid={`unlock-${u.id}`} data-state={st} aria-pressed={st === 'equipped'} aria-label={`${u.name}. ${u.effect}. ${tag(u)}`}>
      <span className="pg-ico"><img src={icon(u.icon)} alt="" draggable={false}/></span>
      <span className="pg-copy"><b>{u.name}</b><span>{u.effect}</span><em>{tag(u)}</em></span>
    </button></li>;
  };
  const contractCard = (c: ContractDef | null) => {
    const id = c?.id ?? null, sel = meta.contract === id, ok = !c || contractAvailable(meta, c.id);
    return <li key={id ?? 'none'}><button className={`pg-card ct ${sel ? 'st-equipped' : ok ? 'st-owned' : 'st-locked'}`} onClick={() => { if (ok) { onMeta(setContract(meta, id)); audio()?.ui('ui_toggle_on'); } else setNote(c?.req?.label.toUpperCase() ?? ''); }} onKeyDown={noRepeat} data-testid={`contract-${id ?? 'none'}`} aria-pressed={sel} aria-label={c ? `${c.name}. ${c.rule}` : 'No contract'}>
      <span className="pg-ico">{c ? <img src={icon(c.icon)} alt="" draggable={false}/> : <i className="pg-none" aria-hidden="true"/>}</span>
      <span className="pg-copy"><b>{c ? c.name : 'STANDARD RUN'}</b><span>{c ? c.rule : 'No modifiers. The default way to play.'}</span><em>{sel ? 'SELECTED' : !ok ? `LOCKED · ${c!.req?.label.toUpperCase()}` : c ? `+${c.bonus} ${CURRENCY.short} ON VICTORY` : 'DEFAULT'}</em></span>
    </button></li>;
  };
  const row = (title: string, sub?: string) => <h3 className="pg-h"><span>{title}</span>{sub && <small>{sub}</small>}</h3>;

  return <main className="selection-layout progress-layout" data-testid="progression">
    <div className="screen-header"><button className="text-button" onClick={onBack} data-pad-cancel>{backLabel}</button><span>{tab === 'armory' ? 'ARMORY' : tab === 'contracts' ? 'CONTRACTS' : 'ARCHIVES'} / PERMANENT PROGRESSION</span></div>
    <div className="pg-top"><div><p className="eyebrow">BETWEEN RUNS</p><h2 className="large-heading">THE ARCHIVES</h2></div><MarksBadge marks={meta.marks} crest={meta.crest}/></div>
    <div className="pg-tabs" role="tablist" aria-label="Progression">{TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} className={`pg-tab ${tab === t.id ? 'on' : ''}`} onClick={() => onTab(t.id)} data-testid={`tab-${t.id}`} data-pad-default={t.id === tab ? '' : undefined}>{t.label}</button>)}</div>
    <div className="pg-body" data-testid={`pane-${tab}`}>
      {tab === 'armory' && <>
        {row('STARTING BOON', 'EQUIP ONE · APPLIES TO EVERY RUN UNTIL CHANGED')}
        <ul className="pg-grid">{UNLOCKS.filter(u => u.kind === 'boon').map(card)}</ul>
        {row('RUN TOOLS', 'LEVEL-UP SCREEN · CHARGES RESET EVERY RUN')}
        <ul className="pg-grid">{UNLOCKS.filter(u => u.kind === 'tool').map(card)}</ul>
        {row('PROFILE CRESTS', 'COSMETIC')}
        <ul className="pg-grid">{UNLOCKS.filter(u => u.kind === 'crest').map(card)}</ul>
      </>}
      {tab === 'contracts' && <>
        {row('OPT-IN CONTRACT', 'ONE AT A TIME · BONUS PAYS ONLY ON VICTORY')}
        <ul className="pg-grid">{contractCard(null)}{CONTRACTS.map(c => contractCard(c))}</ul>
        <p className="pg-note">Contracts only change the rules listed on the card. Boss times, telegraphs and the 15:00 finale never change.</p>
      </>}
      {tab === 'archives' && <>
        {row('KAI · TRANSFORMATIONS', 'EARNED BY DEFEATING BOSSES AS KAI')}
        <ul className="pg-forms">{[{ c: 'base', n: 'BASE', on: true, how: 'Always available' }, { c: 'f1', n: 'FLAREBOUND', on: true, how: 'Drive 65%+ → F' }, { c: 'f2', n: 'COMETHEART', on: unlocks.cometheart, how: 'Earned: Fracture Warden' }, { c: 'f3', n: 'STILLFIRE APEX', on: unlocks.stillfire, how: 'Earned: Null Seraph' }].map(f => <li key={f.c} className={f.on ? 'open' : 'sealed'}><img src={`${ASSET_BASE}ui/kit/crest-${f.c}.webp`} alt="" draggable={false}/><b>{f.on ? f.n : 'SEALED'}</b><span>{f.on ? f.how : 'Defeat a boss to discover it'}</span></li>)}</ul>
        {row('RUNNERS', 'RECORDS · REN AND SORA EARN THEIR OWN FORM')}
        <ul className="pg-forms" data-testid="runner-records">{HEROES.map(h => { const r = meta.heroes[h.id], form = h.id === 'kai' ? 'Kai forms are listed above' : unlocks[h.id as 'ren' | 'sora'] ? `${HERO_KIT[h.id].form} unlocked` : `${HERO_KIT[h.id].form}: defeat the Fracture Warden as ${h.name}`; return <li key={h.id} className={h.id === 'kai' || unlocks[h.id as 'ren' | 'sora'] ? 'open' : 'sealed'}><span><b>{h.name}</b> {r.runs} RUNS · {r.wins} WINS · BEST {r.bestSeconds ? roundedTime(r.bestSeconds) : '—'}<small>{form}</small></span></li>; })}</ul>
        {row('ARENA MASTERY', 'RECORDS AND OBJECTIVES')}
        <div className="pg-arenas">{ARENA_IDS.map((a: ArenaId) => { const r = meta.arenas[a]; return <section key={a} className="pg-arena" data-testid={`arena-${a}`}>
          <header><img src={icon('arena_' + a)} alt="" draggable={false}/><div><b>{ARENAS[a].name.toUpperCase()}</b><span>{r.runs} RUNS · {r.wins} WINS</span></div></header>
          <dl><dt>BEST TIME</dt><dd>{r.bestSeconds ? roundedTime(r.bestSeconds) : '—'}</dd><dt>BEST SCORE</dt><dd>{r.bestScore ? r.bestScore.toLocaleString() : '—'}</dd><dt>HIGHEST LEVEL</dt><dd>{r.bestLevel || '—'}</dd><dt>WARDEN / SERAPH</dt><dd>{r.wardenKills} / {r.seraphKills}</dd></dl>
          <ul>{MASTERY[a].map(d => { const done = masteryDone(meta, a, d.id), p = masteryProgress(r, d.id); return <li key={d.id} className={done ? 'done' : ''}><span>{done ? '✓' : '○'} {d.name}<small>{d.blurb}</small></span><i style={{ '--p': `${Math.round((p.value / p.goal) * 100)}%` } as CSSProperties}/><em>{done ? 'DONE' : `+${d.reward}`}</em></li>; })}</ul>
        </section>; })}</div>
        {row('FEATS', `${FEATS.filter(f => meta.feats[f.id] !== undefined).length} / ${FEATS.length} COMPLETE`)}
        <ul className="pg-feats">{FEATS.map(f => { const p = featProgress(meta, f.id); return <li key={f.id} className={p.done ? 'done' : ''} data-testid={`feat-${f.id}`} data-done={p.done}><img src={icon(f.icon)} alt="" draggable={false}/><span><b>{f.name}</b><small>{f.blurb}</small>{f.goal && !p.done ? <i style={{ '--p': `${Math.round((p.value / p.goal) * 100)}%` } as CSSProperties}><u>{p.value.toLocaleString()} / {p.goal.toLocaleString()}</u></i> : <em>{p.done ? 'COMPLETE' : 'LOCKED'} · +{f.reward}</em>}</span></li>; })}</ul>
      </>}
    </div>
    <div className="pg-foot"><div className="pg-status" role="status" aria-live="polite" data-testid="pg-note">{note || (meta.boon ? `BOON: ${UNLOCK_BY_ID[`boon_${meta.boon}` as UnlockId].name}` : 'NO BOON EQUIPPED')}{meta.contract ? ` · CONTRACT: ${CONTRACTS.find(c => c.id === meta.contract)?.name}` : ''}</div>
      {onDeploy && <button className="primary-button" onClick={onDeploy} data-testid="pg-deploy" data-pad-start>DEPLOY <span aria-hidden="true">↗</span></button>}</div>
    <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT / CONFIRM' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}/>
  </main>;
}
void BOON_IDS;

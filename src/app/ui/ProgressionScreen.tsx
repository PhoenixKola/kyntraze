import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ARENAS, ARENA_IDS, type ArenaId } from '../../content/arenas';
import { BOON_IDS, CONTRACTS, CURRENCY, FEATS, MASTERY, UNLOCKS, UNLOCK_BY_ID, type ContractDef, type UnlockDef, type UnlockId } from '../../content/meta';
import { contractAvailable, equipBoon, equipCrest, featProgress, masteryDone, masteryProgress, purchase, reqMet, setContract, type MetaState } from '../../sim/MetaSystem';
import { sharedAbilityAudio } from '../../game/audio/abilityAudio';
import { roundedTime } from '../../core/Math';
import { Chip, Cta, Frame, Tabs } from './b29/Kit';
import { ASSET_BASE } from '../assetBase';
import { HEROES } from '../../content/heroes';
import { HERO_KIT } from '../../content/heroKits';

export type ProgressTab = 'armory' | 'contracts' | 'archives';
const icon = (n: string) => `${ASSET_BASE}ui/meta/${n}.png`;
const TABS: { id: ProgressTab; label: string; glyph: string }[] = [{ id: 'armory', label: 'ARMORY', glyph: '⚔' }, { id: 'contracts', label: 'CONTRACTS', glyph: '❖' }, { id: 'archives', label: 'RECORDS', glyph: '✦' }];
interface Props { vexForms?: [boolean, boolean]; renF2?: boolean; soraF2?: boolean; meta: MetaState; unlocks: { cometheart: boolean; stillfire: boolean; ren?: boolean; sora?: boolean }; tab: ProgressTab; onTab: (t: ProgressTab) => void; onMeta: (m: MetaState) => void; onBack: () => void; onDeploy?: () => void; backLabel?: string }

/** Marks balance + equipped crest: always visible so the player never wonders what they can afford. */
export function MarksBadge({ marks, crest }: { marks: number; crest?: string | null }) {
  return <span className="pg-marks" data-testid="marks-balance" aria-label={`${marks} ${CURRENCY.name}`}>{crest && UNLOCK_BY_ID[crest as UnlockId] && <img className="pg-crest-mini" src={icon(UNLOCK_BY_ID[crest as UnlockId].icon)} alt="" draggable={false}/>}<img src={icon('mark')} alt="" draggable={false}/><b>{marks.toLocaleString()}</b><em>{CURRENCY.short}</em></span>;
}

export function ProgressionScreen({ vexForms = [false, false], renF2 = false, soraF2 = false, meta, unlocks, tab, onTab, onMeta, onBack, onDeploy, backLabel = '← BACK' }: Props) {
  const [pending, setPending] = useState<UnlockId | null>(null);
  const [fresh, setFresh] = useState<UnlockId | null>(null);
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<UnlockId | null>(null);
  const [ct, setCt] = useState<ContractDef | null>(null);
  const [sub, setSub] = useState<'runners' | 'arenas' | 'feats'>('runners');
  const lock = useRef(0); const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
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
  const row = (title: string, hint?: string) => <h3 className="pa-h"><span>{title}</span>{hint && <small>{hint}</small>}</h3>;
  const selDef = sel ? UNLOCK_BY_ID[sel] : null;
  const actLabel = (u: UnlockDef) => { const st = state(u); return st === 'equipped' ? (u.kind === 'tool' ? 'OWNED' : 'UNEQUIP') : st === 'owned' ? (u.kind === 'tool' ? 'OWNED' : 'EQUIP') : st === 'available' ? (pending === u.id ? (u.cost > 0 ? `CONFIRM · ${u.cost}` : 'CONFIRM · CLAIM') : u.cost > 0 ? `BUY · ${u.cost} ${CURRENCY.short}` : 'CLAIM · FREE') : st === 'poor' ? `NEED ${u.cost - meta.marks} MORE` : 'LOCKED'; };
  const detail = selDef ? (() => { const st = state(selDef); return <div className="pa-detail-in pedestal" data-testid="pa-detail"><span className={`pa-bigico st-${st}`}><img src={icon(selDef.icon)} alt="" draggable={false}/></span><b>{selDef.name}</b><div className="pa-chips"><Chip tone="teal">{selDef.kind.charAt(0).toUpperCase() + selDef.kind.slice(1)}</Chip>{selDef.cosmetic && <Chip tone="mute">Cosmetic</Chip>}<Chip tone={st === 'equipped' ? 'gold' : st === 'locked' || st === 'poor' ? 'red' : 'teal'}>{st === 'equipped' ? 'Equipped' : st === 'owned' ? 'Owned' : st === 'locked' ? 'Locked' : st === 'poor' ? 'Need Marks' : 'Available'}</Chip></div><p className="pa-effect">{selDef.effect}</p><p className="pa-blurb">{selDef.blurb}</p>{st === 'locked' && <p className="pa-req">Requires: {selDef.req?.label}</p>}<button type="button" className="b29-cta pa-act" disabled={st === 'locked' || st === 'poor' || (selDef.kind === 'tool' && st !== 'available')} onClick={() => act(selDef)} data-testid="pa-action"><b>{actLabel(selDef)}</b></button></div>; })()
    : <div className="pa-detail-in dim"><b>Your loadout</b><p>{meta.boon ? `Boon: ${UNLOCK_BY_ID[`boon_${meta.boon}` as UnlockId].name}` : 'No boon equipped.'}</p><p>{meta.contract ? `Contract: ${CONTRACTS.find(c => c.id === meta.contract)?.name}` : 'Standard run.'}</p><small>Look at an item to read it. Use the button to buy or equip.</small></div>;
  const item = (u: UnlockDef) => {
    const st = state(u);
    return <li key={u.id}><button type="button" className={`b29-card pa-item st-${st} ${st === 'equipped' ? 'on' : ''} ${sel === u.id && st !== 'equipped' ? 'insp' : ''} ${st === 'locked' ? 'locked' : ''} ${fresh === u.id ? 'is-new' : ''} ${pending === u.id ? 'is-pending' : ''}`} onClick={() => { setSel(u.id); act(u); }} onFocus={() => setSel(u.id)} onMouseEnter={() => setSel(u.id)} onKeyDown={noRepeat} data-testid={`unlock-${u.id}`} data-state={st} aria-pressed={st === 'equipped'} aria-label={`${u.name}. ${u.effect}. ${tag(u)}`}>
      <span className="pa-ico"><img src={icon(u.icon)} alt="" draggable={false}/></span><span className="pa-copy"><b>{u.name}</b><small>{tag(u)}</small></span>{st === 'equipped' && <em className="b29-check" aria-hidden="true">✓</em>}</button></li>;
  };
  const ctItem = (c: ContractDef | null) => {
    const id = c?.id ?? null, on = meta.contract === id, ok = !c || contractAvailable(meta, c.id);
    return <li key={id ?? 'none'}><button type="button" className={`b29-card pa-item ${on ? 'on' : ''} ${ct?.id === id && !on ? 'insp' : ''} ${ok ? '' : 'locked'}`} onClick={() => { setCt(c); if (ok) { onMeta(setContract(meta, id)); audio()?.ui('ui_toggle_on'); } else setNote(c?.req?.label.toUpperCase() ?? ''); }} onFocus={() => setCt(c)} onMouseEnter={() => setCt(c)} onKeyDown={noRepeat} data-testid={`contract-${id ?? 'none'}`} aria-pressed={on} aria-label={c ? `${c.name}. ${c.rule}` : 'No contract'}>
      <span className="pa-ico">{c ? <img src={icon(c.icon)} alt="" draggable={false}/> : <i className="pg-none" aria-hidden="true"/>}</span><span className="pa-copy"><b>{c ? c.name : 'STANDARD RUN'}</b><small>{on ? 'SELECTED' : !ok ? `LOCKED · ${c!.req?.label.toUpperCase()}` : c ? `+${c.bonus} ${CURRENCY.short} ON VICTORY` : 'DEFAULT'}</small></span>{on && <em className="b29-check" aria-hidden="true">✓</em>}</button></li>;
  };
  const featsDone = FEATS.filter(f => meta.feats[f.id] !== undefined).length;
  const heading = tab === 'armory' ? 'ARMORY' : tab === 'contracts' ? 'CONTRACTS' : 'RECORDS';
  const ctShown = ct ?? (meta.contract ? CONTRACTS.find(c => c.id === meta.contract) ?? null : null);

  return <Frame testId="progression" className={`pa pa-${tab}`} eyebrow={tab === 'armory' ? 'THE RELIC VAULT' : tab === 'contracts' ? 'THE PACT ALTAR' : 'THE RECORD HALL'} title={heading.charAt(0) + heading.slice(1).toLowerCase()} bg={tab === 'armory' ? 'art/menu/vault.webp' : tab === 'contracts' ? 'art/menu/altar.webp' : 'art/menu/library.webp'} lit onBack={onBack} backLabel={backLabel} right={<MarksBadge marks={meta.marks} crest={meta.crest}/>} hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT / CONFIRM' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    <div className="pa-col">
      <div className="pg-tabs b29-tabs" role="tablist" aria-label="Progression">{TABS.map(x => <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={`b29-tab ${tab === x.id ? 'on' : ''}`} onClick={() => onTab(x.id)} data-testid={`tab-${x.id}`} data-pad-default={x.id === tab ? '' : undefined}><i aria-hidden="true">{x.glyph}</i>{x.label}</button>)}</div>
      <div className="pa-main">
        <div className="b29-scroll pa-scroll" data-testid={`pane-${tab}`}>
          {tab === 'armory' && <>
            {row('STARTING BOON', 'EQUIP ONE · APPLIES TO EVERY RUN')}<ul className="pa-grid">{UNLOCKS.filter(u => u.kind === 'boon').map(item)}</ul>
            {row('RUN TOOLS', 'CHARGES RESET EVERY RUN')}<ul className="pa-grid">{UNLOCKS.filter(u => u.kind === 'tool').map(item)}</ul>
            {row('PROFILE CRESTS', 'COSMETIC')}<ul className="pa-grid">{UNLOCKS.filter(u => u.kind === 'crest').map(item)}</ul>
          </>}
          {tab === 'contracts' && <>
            {row('OPT-IN CONTRACT', 'ONE AT A TIME · BONUS PAYS ONLY ON VICTORY')}<ul className="pa-grid">{ctItem(null)}{CONTRACTS.map(c => ctItem(c))}</ul>
            <p className="pa-note">Contracts only change the rules listed on the card. Boss times, telegraphs and the 15:00 finale never change.</p>
          </>}
          {tab === 'archives' && <>
            <Tabs value={sub} onChange={setSub} testPrefix="rec" tabs={[{ id: 'runners', label: 'RUNNERS' }, { id: 'arenas', label: 'ARENA MASTERY' }, { id: 'feats', label: 'FEATS', badge: `${featsDone}/${FEATS.length}` }]}/>
            {sub === 'runners' && <>
              <div className="pa-runners" data-testid="runner-records">{HEROES.map(h => {
                const r = meta.heroes[h.id], forms: { n: string; on: boolean; how: string }[] = h.id === 'kai'
                  ? [{ n: 'FLAREBOUND', on: true, how: 'Drive 65% + F' }, { n: 'COMETHEART', on: unlocks.cometheart, how: 'Defeat the Fracture Warden' }, { n: 'STILLFIRE APEX', on: unlocks.stillfire, how: 'Defeat the Null Seraph' }]
                  : h.id === 'vex'
                    ? [{ n: 'RIFTBOUND', on: vexForms[0], how: 'Beat the Warden or Trial ch. 2' }, { n: 'VOIDHEART EXILE', on: vexForms[1], how: 'Beat the Oathkeeper (Trial ch. 3)' }]
                    : [{ n: HERO_KIT[h.id].form.toUpperCase(), on: !!unlocks[h.id as 'ren' | 'sora'], how: `Defeat the Fracture Warden as ${h.name}` }, ...(h.id === 'ren' ? [{ n: 'ASHEN ECLIPSE', on: renF2, how: 'Defeat the Null Seraph as Ren' }] : h.id === 'sora' ? [{ n: 'EVENTIDE SERAPH', on: soraF2, how: 'Defeat the Null Seraph as Sora' }] : [])];
                return <article key={h.id} className="pg-runner pa-runner" style={{ '--accent': h.accent } as CSSProperties}>
                  <header><img src={h.id === 'kai' ? `${ASSET_BASE}ui/kai-portrait-base.png` : `${ASSET_BASE}ui/heroes/${h.id}-portrait-base.webp`} alt="" draggable={false}/><div><b>{h.name}</b><small>{h.title}</small></div></header>
                  <dl><div><dt>RUNS</dt><dd>{r.runs}</dd></div><div><dt>WINS</dt><dd>{r.wins}</dd></div><div><dt>BEST</dt><dd>{r.bestSeconds ? roundedTime(r.bestSeconds) : '—'}</dd></div></dl>
                  <ul>{forms.map(f => <li key={f.n} className={f.on ? 'open' : 'sealed'}><i aria-hidden="true">{f.on ? '✦' : '🔒'}</i><span><b>{f.n}</b><small>{f.on ? 'Unlocked' : f.how}</small></span></li>)}</ul>
                </article>; })}</div></>}
            {sub === 'arenas' && <div className="pa-arenas">{ARENA_IDS.map((a: ArenaId) => { const r = meta.arenas[a]; return <section key={a} className="pa-arena b29-panel" data-testid={`arena-${a}`}>
              <header><img src={icon('arena_' + a)} alt="" draggable={false}/><div><b>{ARENAS[a].name.toUpperCase()}</b><span>{r.runs} RUNS · {r.wins} WINS</span></div></header>
              <dl><dt>BEST TIME</dt><dd>{r.bestSeconds ? roundedTime(r.bestSeconds) : '—'}</dd><dt>BEST SCORE</dt><dd>{r.bestScore ? r.bestScore.toLocaleString() : '—'}</dd><dt>HIGHEST LEVEL</dt><dd>{r.bestLevel || '—'}</dd><dt>WARDEN / SERAPH</dt><dd>{r.wardenKills} / {r.seraphKills}</dd></dl>
              <ul>{MASTERY[a].map(d => { const done = masteryDone(meta, a, d.id), p = masteryProgress(r, d.id); return <li key={d.id} className={done ? 'done' : ''}><span>{done ? '✓' : '○'} {d.name}<small>{d.blurb}</small></span><i style={{ '--p': `${Math.round((p.value / p.goal) * 100)}%` } as CSSProperties}/><em>{done ? 'DONE' : `+${d.reward}`}</em></li>; })}</ul>
            </section>; })}</div>}
            {sub === 'feats' && <ul className="pa-feats">{FEATS.map(f => { const p = featProgress(meta, f.id); return <li key={f.id} className={p.done ? 'done' : ''} data-testid={`feat-${f.id}`} data-done={p.done}><img src={icon(f.icon)} alt="" draggable={false}/><span><b>{f.name}</b><small>{f.blurb}</small>{f.goal && !p.done ? <i style={{ '--p': `${Math.round((p.value / p.goal) * 100)}%` } as CSSProperties}><u>{p.value.toLocaleString()} / {p.goal.toLocaleString()}</u></i> : <em>{p.done ? 'COMPLETE' : 'LOCKED'} · +{f.reward}</em>}</span></li>; })}</ul>}
          </>}
        </div>
        {tab !== 'archives' && <aside className="b29-panel pa-detail" aria-label="Details"><h3 className="b29-ph">{tab === 'contracts' ? 'CONTRACT' : 'DETAILS'}</h3>
          {tab === 'contracts' ? <div className="pa-detail-in pedestal" data-testid="ct-detail"><span className={`pa-bigico ${ctShown ? 'sigil' : ''}`}>{ctShown ? <img src={icon(ctShown.icon)} alt="" draggable={false}/> : <i className="pg-none" aria-hidden="true"/>}</span><b>{ctShown ? ctShown.name : 'Standard run'}</b>
            <div className="pa-chips">{meta.contract === (ctShown?.id ?? null) ? <Chip tone="gold">Active</Chip> : <Chip tone="mute">Not active</Chip>}{ctShown && !contractAvailable(meta, ctShown.id) && <Chip tone="red">Locked</Chip>}</div>
            <p className="pa-effect">{ctShown ? ctShown.rule : 'No extra rules. The default way to play.'}</p>{ctShown && <p className="pa-blurb">{ctShown.blurb}</p>}
            {ctShown && <dl className="pa-terms"><div><dt>Reward</dt><dd>+{ctShown.bonus} {CURRENCY.short} on victory</dd></div><div><dt>Requirement</dt><dd>{ctShown.req ? ctShown.req.label : 'None'}</dd></div></dl>}
            <button type="button" className="b29-cta pa-act" disabled={!!ctShown && !contractAvailable(meta, ctShown.id)} onClick={() => { onMeta(setContract(meta, ctShown?.id ?? null)); audio()?.ui('ui_toggle_on'); }} data-testid="ct-action"><b>{meta.contract === (ctShown?.id ?? null) ? 'SELECTED' : ctShown && !contractAvailable(meta, ctShown.id) ? 'LOCKED' : 'SELECT'}</b></button></div> : detail}</aside>}
      </div>
      <div className="pa-foot"><div className="pg-status" role="status" aria-live="polite" data-testid="pg-note">{note || (meta.boon ? `BOON: ${UNLOCK_BY_ID[`boon_${meta.boon}` as UnlockId].name}` : 'NO BOON EQUIPPED')}{meta.contract ? ` · CONTRACT: ${CONTRACTS.find(c => c.id === meta.contract)?.name}` : ''}</div>
        {onDeploy && <Cta onClick={onDeploy} testId="pg-deploy">DEPLOY</Cta>}</div>
    </div>
  </Frame>;
}
void BOON_IDS;

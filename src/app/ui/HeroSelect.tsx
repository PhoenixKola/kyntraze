import { useEffect, useState, type CSSProperties } from 'react';
import { HEROES, type HeroId } from '../../content/heroes';
import { ARENAS, type ArenaId } from '../../content/arenas';
import { arenaCardUrl } from './ArenaSelect';
import type { SaveV1 } from '../../sim/SaveSystem';
import { ASSET_BASE } from '../assetBase';
import type { ProgressTab } from './ProgressionScreen';
import { CONTRACT_BY_ID, UNLOCK_BY_ID, type UnlockId } from '../../content/meta';
import { Card, Chip, Cta, Frame, Tabs } from './b29/Kit';
import { formsFor, kitFor, type FormView } from '../heroKitView';

const kitImg = (n: string) => `${ASSET_BASE}ui/kit/${n}.webp`;
const PORTRAIT = (h: HeroId) => h === 'kai' ? `${ASSET_BASE}ui/kai-portrait-base.png` : `${ASSET_BASE}ui/heroes/${h}-portrait-base.webp`;
const FANTASY: Record<HeroId, string> = {
  kai: 'A momentum fighter who snowballs through the horde and ascends through three transformations.',
  ren: 'A crimson brawler who stays in arm\'s reach and trades heavy blows for sustained pressure.',
  sora: 'An azure duelist who keeps distance with blades and rules the field from range.',
  vex: 'A fallen vanguard who punishes mistakes with ripostes and cuts through space itself.',
};
/** What each runner is for, in plain words (qualitative, no invented numbers). */
const STYLE: Record<HeroId, string> = { kai: 'Close range · momentum · 3 transformations', ren: 'Close range · heavy hits · 1 transformation', sora: 'Long range · blades · 1 transformation', vex: 'Mid range · ripostes and cuts · 2 transformations' };
const unlocked = (save: SaveV1, hero: HeroId, f: FormView) => f.k === 'base' || f.k === 'f1' && hero === 'kai' ? true : hero === 'kai' ? !!save.unlocks?.[f.k === 'f2' ? 'cometheart' : 'stillfire'] : hero === 'vex' ? !!save.b22?.vexForms?.[f.k === 'f1' ? 0 : 1] : !!save.unlocks?.[hero as 'ren' | 'sora'];
const crestOf = (hero: HeroId, f: FormView) => hero === 'kai' ? kitImg(f.kitIcon) : `${ASSET_BASE}ui/heroes/${hero}-crest-${f.k === 'base' ? 'base' : 'form'}.webp`;

/** Looping idle of the inspected appearance, from the real transparent game sheets. Locked appearances are a silhouette teaser. */
function Showcase({ hero, form, locked, burst }: { hero: HeroId; form: FormView; locked: boolean; burst: number }) {
  const [w, h] = form.frame;
  return <div className={`hs-stage ${locked ? 'locked' : ''}`} key={`${hero}-${form.k}-${burst}`}>
    <span className="hs-aura" aria-hidden="true"/><span className="hs-aura b" aria-hidden="true"/>
    <span className="hs-spr" style={{ '--fw': w, '--fh': h, backgroundImage: `url(${ASSET_BASE}${form.sheet})` } as CSSProperties} role="img" aria-label={locked ? 'Locked appearance, silhouette' : `${form.full}, idle`}/>
    <span className="hs-plinth" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/plinth-${HEROES.findIndex(x => x.id === hero)}.webp)` }} aria-hidden="true"/>
  </div>;
}
interface Props { modeName?: string; onMode?: () => void; locked?: string | null; hero: HeroId; onHero: (h: HeroId) => void; onProgress: (tab: ProgressTab) => void; onBack: () => void; onStart: () => void; seed: string; onSeed: (value: string) => void; arena: ArenaId; onArena: () => void; save: SaveV1; }
export function HeroSelect({ modeName, onMode, locked, hero, onHero, onProgress, onBack, onStart, seed, onSeed, arena, onArena, save }: Props) {
  const sel = HEROES.find(h => h.id === hero) ?? HEROES[0], forms = formsFor(sel.id);
  const [fi, setFi] = useState(0), [tab, setTab] = useState<'run' | 'kit'>('run'), [burst, setBurst] = useState(0);
  useEffect(() => { setFi(0); }, [hero]);   // presentation only: inspecting a form never changes the save or the run
  const cur = forms[Math.min(fi, forms.length - 1)], isLocked = !unlocked(save, sel.id, cur), open = forms.filter(f => unlocked(save, sel.id, f)).length;
  const kit = kitFor(sel.id, Math.min(fi, forms.length - 1));
  return <Frame testId="hero-select" eyebrow="01 / RUNNER SELECTION" title="Who faces the fracture?" onBack={onBack} className="hs" accent={sel.accent} bg="art/menu/hero_chamber.webp" lit
    hints={[{ key: 'ENTER', pad: 'A', label: 'DEPLOY' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    <nav className="hs-roster" aria-label="Runners">{HEROES.map((h, i) => { const fs = formsFor(h.id), n = fs.filter(f => unlocked(save, h.id, f)).length - 1, m = fs.length - 1;
      return <Card key={h.id} on={hero === h.id} accent={h.accent} onClick={() => { onHero(h.id); setBurst(b => b + 1); }} testId={`hero-card-${h.id}`} className="hs-hero" label={`${h.name}, ${h.title}`}>
        <img className="hs-face" src={PORTRAIT(h.id)} alt="" draggable={false}/><span className="hs-hero-t"><b>{h.name}</b><small>{h.title.charAt(0) + h.title.slice(1).toLowerCase()}</small><small className="hs-tf">{n}/{m} forms</small></span><i className="hs-no" aria-hidden="true">0{i + 1}</i></Card>; })}</nav>
    <section className="hs-spot" style={{ '--c': sel.accent } as CSSProperties} aria-live="polite" aria-label={`${sel.name} showcase`}>
      <header className="hs-name"><Chip tone="gold">{sel.title}</Chip><h3 style={{ color: sel.accent }}>{sel.name}</h3><p>{STYLE[sel.id]}</p><p className="hs-fantasy">{FANTASY[sel.id]}</p></header>
      <Showcase hero={sel.id} form={cur} locked={isLocked} burst={burst}/>
      <div className="hs-info"><b>{isLocked ? 'Locked appearance' : cur.full}</b><small>{isLocked ? cur.how : fi === 0 ? 'Starting appearance. Transformations awaken in a run with F.' : 'Preview only. Awakens in a run once Drive is full.'}</small></div>
      <ul className="hs-forms" aria-label={`${sel.name} appearances`}>{forms.map((f, i) => { const lk = !unlocked(save, sel.id, f); return <li key={f.k}><button type="button" className={`hs-form ${i === fi ? 'insp' : ''} ${lk ? 'sealed' : ''}`} onClick={() => setFi(i)} aria-pressed={i === fi} data-testid={`form-${f.k}`} title={lk ? f.how : f.full}>
        <img src={crestOf(sel.id, f)} alt="" draggable={false}/><span><b>{lk ? 'Locked' : f.label}</b><small>{i === 0 ? 'Base' : lk ? 'Sealed' : 'Unlocked'}</small></span></button></li>; })}<li className="hs-count"><Chip tone={open === forms.length ? 'gold' : 'mute'}>{open - 1}/{forms.length - 1} transformations</Chip></li></ul>
    </section>
    <aside className="hs-side">
      <Tabs tabs={[{ id: 'run', label: 'Run setup' }, { id: 'kit', label: 'Abilities' }]} value={tab} onChange={setTab} testPrefix="hs-tab"/>
      {tab === 'run' ? <div className="hs-config">
        <div className="hs-loadout" data-testid="loadout-strip" aria-label="Run loadout">
          <button type="button" className="hs-row" onClick={() => onProgress('armory')} data-testid="loadout-boon"><em>Boon</em><b>{save.meta.boon ? UNLOCK_BY_ID[`boon_${save.meta.boon}` as UnlockId].name : 'None'}</b><i aria-hidden="true">›</i></button>
          <button type="button" className="hs-row" onClick={() => onProgress('contracts')} data-testid="loadout-contract"><em>Contract</em><b>{save.meta.contract ? CONTRACT_BY_ID[save.meta.contract].name : 'Standard run'}</b><i aria-hidden="true">›</i></button>
          {onMode && <button type="button" className="hs-row" onClick={onMode} data-testid="mode-open"><em>Mode</em><b>{modeName ?? 'Classic'}</b><i aria-hidden="true">›</i></button>}
          <button type="button" className="hs-row" onClick={() => onProgress('armory')} data-testid="open-armory"><em>{save.meta.marks.toLocaleString()} Marks</em><b>Armory</b><i aria-hidden="true">›</i></button>
        </div>
        {locked ? <span className="mode-lock hs-lock" data-testid="mode-lock">{locked}</span>
          : <button type="button" className="hs-arena" onClick={onArena} data-testid="arena-open" style={{ '--card': `url(${arenaCardUrl(arena)})` } as CSSProperties} aria-label={`Arena: ${ARENAS[arena].name}. Change arena`}><span className="hs-arena-art" aria-hidden="true"/><span className="hs-arena-copy"><em>Arena</em><b>{ARENAS[arena].name}</b></span><span className="hs-arena-go">Change ›</span></button>}
        <label className="hs-seed"><span>Run seed</span><input aria-label="Run seed" value={seed} onChange={e => onSeed(e.target.value)} placeholder="Random on start"/></label>
      </div> : <ul className="hs-kit b29-scroll" data-testid="hs-kit" aria-label={`${cur.full} abilities`}>{isLocked ? <li className="hs-kit-lock"><b>Sealed</b><small>{cur.how}</small></li> : kit.map(a => <li key={a.key + a.name}><img src={`${ASSET_BASE}ui/icons/${a.icon}.png`} alt="" draggable={false} onError={e => { e.currentTarget.style.visibility = 'hidden'; }}/><kbd>{a.key}</kbd><span><b>{a.name}</b><small>{a.text}</small></span></li>)}</ul>}
      <div className="hs-deploy"><Cta onClick={onStart} testId="start-run" sub={`${sel.name} · ${modeName ?? 'Classic'}`}>DEPLOY</Cta></div>
    </aside>
  </Frame>;
}

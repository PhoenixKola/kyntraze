import type { CSSProperties } from 'react';
import { HEROES, type HeroId } from '../../content/heroes';
import { HERO_KIT } from '../../content/heroKits';
import { ARENAS, type ArenaId } from '../../content/arenas';
import { arenaCardUrl } from './ArenaSelect';
import type { SaveV1 } from '../../sim/SaveSystem';
import { ASSET_BASE } from '../assetBase';
import type { ProgressTab } from './ProgressionScreen';
import { CONTRACT_BY_ID, UNLOCK_BY_ID, type UnlockId } from '../../content/meta';
import { Card, Chip, Cta, Frame, Meter, Panel } from './b29/Kit';

const kit = (n: string) => `${ASSET_BASE}ui/kit/${n}.webp`;
const crest = (hero: HeroId, which: 'base' | 'form') => `${ASSET_BASE}ui/heroes/${hero}-crest-${which}.webp`;
const ART: Record<HeroId, string> = { kai: 'ui/kai-keyart.webp', ren: 'ui/heroes/ren-card.webp', sora: 'ui/heroes/sora-card.webp', vex: 'ui/heroes/vex-card.webp' };
const PORTRAIT = (h: HeroId) => h === 'kai' ? `${ASSET_BASE}ui/kai-portrait-base.png` : `${ASSET_BASE}ui/heroes/${h}-portrait-base.webp`;
/** Presentation-only identity read-out (1-5), so the four runners are told apart at a glance. */
const IDENTITY: Record<HeroId, { fantasy: string; stats: [string, number][] }> = {
  kai: { fantasy: 'A momentum fighter who snowballs through the horde and ascends through three transformations.', stats: [['POWER', 4], ['REACH', 2], ['SPEED', 4], ['CONTROL', 3]] },
  ren: { fantasy: 'A crimson brawler who stays in arm\'s reach and trades heavy blows for sustained pressure.', stats: [['POWER', 5], ['REACH', 1], ['SPEED', 3], ['CONTROL', 2]] },
  sora: { fantasy: 'An azure duelist who keeps distance with blades and rules the field from range.', stats: [['POWER', 3], ['REACH', 5], ['SPEED', 4], ['CONTROL', 4]] },
  vex: { fantasy: 'A fallen vanguard who punishes mistakes with ripostes and cuts through space itself.', stats: [['POWER', 4], ['REACH', 3], ['SPEED', 3], ['CONTROL', 5]] },
};
interface FormInfo { k: string; n: string; on: boolean; img: string; how: string }
function formsOf(save: SaveV1, hero: HeroId): FormInfo[] {
  if (hero === 'kai') return [
    { k: 'base', n: 'BASE', on: true, img: kit('crest-base'), how: 'Always available' },
    { k: 'f1', n: 'FLARE', on: true, img: kit('crest-f1'), how: 'Build Drive to 65%, then press F' },
    { k: 'f2', n: 'COMET', on: !!save.unlocks?.cometheart, img: kit('crest-f2'), how: 'Needs a FULL Drive gauge, then F' },
    { k: 'f3', n: 'APEX', on: !!save.unlocks?.stillfire, img: kit('crest-f3'), how: 'Needs a FULL Drive gauge, then F' }];
  const k = HERO_KIT[hero];
  if (hero === 'vex') { const vf = save.b22?.vexForms ?? [false, false]; return [
    { k: 'b', n: 'BASE', on: true, img: crest(hero, 'base'), how: 'Always available' },
    { k: 'f1', n: 'RIFT', on: vf[0], img: crest(hero, 'form'), how: 'Earned in the Trial of the Oathbroken' },
    { k: 'f2', n: 'VOID', on: vf[1], img: crest(hero, 'form'), how: 'Earned in the Trial of the Oathbroken' }]; }
  return [{ k: 'b', n: 'BASE', on: true, img: crest(hero, 'base'), how: 'Always available' }, { k: 'f1', n: k.formShort.toUpperCase(), on: !!save.unlocks?.[hero as 'ren' | 'sora'], img: crest(hero, 'form'), how: 'Defeat the Fracture Warden with this runner' }];
}
function FormRow({ save, hero, big }: { save: SaveV1; hero: HeroId; big?: boolean }) {
  const fs = formsOf(save, hero);
  return <ul className={`hs-forms ${big ? 'big' : ''}`} aria-label={`${hero} forms`}>{fs.map(f => <li key={f.k} className={f.on ? 'open' : 'sealed'} title={f.on ? f.how : `Sealed: ${f.how}`}><img src={f.img} alt="" draggable={false}/>{big ? <span><b>{f.on ? f.n : '???'}</b><small>{f.on ? 'UNLOCKED' : f.how}</small></span> : <span>{f.on ? f.n : '?'}</span>}</li>)}</ul>;
}
interface Props { modeName?: string; onMode?: () => void; locked?: string | null; hero: HeroId; onHero: (h: HeroId) => void; onProgress: (tab: ProgressTab) => void; onBack: () => void; onStart: () => void; seed: string; onSeed: (value: string) => void; arena: ArenaId; onArena: () => void; save: SaveV1; }
export function HeroSelect({ modeName, onMode, locked, hero, onHero, onProgress, onBack, onStart, seed, onSeed, arena, onArena, save }: Props) {
  const sel = HEROES.find(h => h.id === hero) ?? HEROES[0], id = IDENTITY[sel.id], fs = formsOf(save, sel.id), open = fs.filter(f => f.on).length;
  return <Frame testId="hero-select" eyebrow="01 / RUNNER SELECTION" title="WHO FACES THE FRACTURE?" sub="Pick a runner, check the run setup, then deploy." onBack={onBack} className="hs" accent={sel.accent}
    hints={[{ key: 'ENTER', pad: 'A', label: 'DEPLOY' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    <nav className="hs-roster" aria-label="Runners">{HEROES.map((h, i) => { const n = formsOf(save, h.id).filter(f => f.on).length, m = formsOf(save, h.id).length;
      return <Card key={h.id} on={hero === h.id} accent={h.accent} onClick={() => onHero(h.id)} testId={`hero-card-${h.id}`} className="hs-hero" label={`${h.name}, ${h.title}`}>
        <img className="hs-face" src={PORTRAIT(h.id)} alt="" draggable={false}/><span className="hs-hero-t"><small>0{i + 1} / {h.title}</small><b>{h.name}</b><span className="hs-pips" aria-label={`${n} of ${m} forms`}>{Array.from({ length: m }, (_, k) => <u key={k} className={k < n ? 'on' : ''}/>)}</span></span></Card>; })}</nav>
    <Panel className="hs-spot" style={{ '--c': sel.accent, '--art': `url(${ASSET_BASE}${ART[sel.id]})` } as CSSProperties} aria-live="polite">
      <div className="hs-art" aria-hidden="true"/><div className="hs-spot-copy">
        <div className="hs-name"><Chip tone="gold">{sel.title}</Chip><h3 style={{ color: sel.accent }}>{sel.name}</h3><p>{sel.role}</p></div>
        <p className="hs-fantasy">{id.fantasy}</p>
        <div className="hs-stats">{id.stats.map(([l, v]) => <Meter key={l} label={l} value={v} accent={sel.accent}/>)}</div>
        <p className="hs-weapon"><em>AUTO</em> {sel.weapon}</p>
        <div className="hs-formhead"><span>TRANSFORMATIONS</span><Chip tone={open === fs.length ? 'gold' : 'mute'}>{open}/{fs.length} UNLOCKED</Chip></div>
        <FormRow save={save} hero={sel.id} big/></div>
    </Panel>
    <Panel title="RUN SETUP" className="hs-config">
      <div className="hs-loadout" data-testid="loadout-strip" aria-label="Run loadout">
        <button type="button" className="hs-row" onClick={() => onProgress('armory')} data-testid="loadout-boon"><em>BOON</em><b>{save.meta.boon ? UNLOCK_BY_ID[`boon_${save.meta.boon}` as UnlockId].name : 'NONE'}</b><i aria-hidden="true">›</i></button>
        <button type="button" className="hs-row" onClick={() => onProgress('contracts')} data-testid="loadout-contract"><em>CONTRACT</em><b>{save.meta.contract ? CONTRACT_BY_ID[save.meta.contract].name : 'STANDARD RUN'}</b><i aria-hidden="true">›</i></button>
        {onMode && <button type="button" className="hs-row" onClick={onMode} data-testid="mode-open"><em>MODE</em><b>{modeName ?? 'CLASSIC'}</b><i aria-hidden="true">›</i></button>}
        <button type="button" className="hs-row" onClick={() => onProgress('armory')} data-testid="open-armory"><em>{save.meta.marks.toLocaleString()} MARKS</em><b>ARMORY</b><i aria-hidden="true">›</i></button>
      </div>
      {locked ? <span className="mode-lock hs-lock" data-testid="mode-lock">{locked}</span>
        : <button type="button" className="hs-arena" onClick={onArena} data-testid="arena-open" style={{ '--card': `url(${arenaCardUrl(arena)})` } as CSSProperties} aria-label={`Arena: ${ARENAS[arena].name}. Change arena`}><span className="hs-arena-art" aria-hidden="true"/><span className="hs-arena-copy"><em>ARENA</em><b>{ARENAS[arena].name.toUpperCase()}</b></span><span className="hs-arena-go">CHANGE ›</span></button>}
      <label className="hs-seed"><span>RUN SEED</span><input aria-label="Run seed" value={seed} onChange={e => onSeed(e.target.value)} placeholder="Random on start"/></label>
      <div className="hs-deploy"><Cta onClick={onStart} testId="start-run" sub={`${sel.name} · ${modeName ?? 'CLASSIC'}`}>DEPLOY</Cta></div>
    </Panel>
  </Frame>;
}

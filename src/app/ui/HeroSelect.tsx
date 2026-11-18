import { useEffect, type CSSProperties } from 'react';
import { HEROES, type HeroId } from '../../content/heroes';
import { HERO_KIT } from '../../content/heroKits';
import { HintBar } from './Chrome';
import { ARENAS, type ArenaId } from '../../content/arenas';
import { arenaCardUrl } from './ArenaSelect';
import type { SaveV1 } from '../../sim/SaveSystem';
import { ASSET_BASE } from '../assetBase';
const kit = (n: string) => `${ASSET_BASE}ui/kit/${n}.webp`;
/** Form progression row: unlocked forms show their crest and name; locked ones stay unnamed (no spoilers) and are plainly not selectable. */
function FormRow({ save, hero }: { save: SaveV1; hero: HeroId }) {
  if (hero !== 'kai') {
    const kit = HERO_KIT[hero], vf = save.b22?.vexForms ?? [false, false];
    const forms = hero === 'vex'
      ? [{ k: 'b', n: 'BASE', on: true, img: kit_(hero, 'base') }, { k: 'f1', n: 'RIFTBOUND', on: vf[0], img: kit_(hero, 'form') }, { k: 'f2', n: 'VOIDHEART', on: vf[1], img: kit_(hero, 'form'), cls: 'void' }]
      : [{ k: 'b', n: 'BASE', on: true, img: kit_(hero, 'base') }, { k: 'f1', n: kit.formShort.toUpperCase(), on: !!save.unlocks?.[hero as 'ren' | 'sora'], img: kit_(hero, 'form') }];
    return <ul className="form-row" aria-label={`${hero} forms`}>{forms.map(f => <li key={f.k} className={`${f.on ? 'open' : 'sealed'} ${f.cls ?? ''}`} title={f.on ? f.n : `${f.n}: sealed`}><img src={f.img} alt="" draggable={false}/><span>{f.n}</span>{!f.on && <em aria-hidden="true">LOCKED</em>}</li>)}</ul>;
  }
  const rows = [{ c: 'base', n: 'BASE', on: true, how: 'Always available' }, { c: 'f1', n: 'FLAREBOUND', on: true, how: 'Build Drive to 65%, then press F' }, { c: 'f2', n: 'COMETHEART', on: !!save.unlocks?.cometheart, how: 'Needs a FULL Drive gauge, then F' }, { c: 'f3', n: 'STILLFIRE', on: !!save.unlocks?.stillfire, how: 'Unlocked. In a run it starts after 10:00 with a FULL Drive gauge, then F' }];
  return <ul className="form-row" aria-label="Kai forms">{rows.map(r => <li key={r.c} className={r.on ? 'open' : 'sealed'} title={r.on ? r.how : 'Sealed: earned by defeating a boss'}><img src={kit(`crest-${r.c}`)} alt="" draggable={false}/><span>{r.c === 'f3' ? 'APEX' : r.n}</span>{!r.on && <em aria-hidden="true">LOCKED</em>}</li>)}</ul>;
}
import type { ProgressTab } from './ProgressionScreen';
import { CONTRACT_BY_ID, UNLOCK_BY_ID, type UnlockId } from '../../content/meta';
const kit_ = (hero: HeroId, which: 'base' | 'form') => `${ASSET_BASE}ui/heroes/${hero}-crest-${which}.webp`;
interface Props { modeName?: string; onMode?: () => void; locked?: string | null; hero: HeroId; onHero: (h: HeroId) => void; onProgress: (tab: ProgressTab) => void; onBack: () => void; onStart: () => void; seed: string; onSeed: (value: string) => void; arena: ArenaId; onArena: () => void; save: SaveV1; }
export function HeroSelect({ modeName, onMode, locked, hero, onHero, onProgress, onBack, onStart, seed, onSeed, arena, onArena, save }: Props) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onBack(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onBack]);
  return <main className="selection-layout" data-testid="hero-select">
    <div className="screen-header"><button className="text-button" onClick={onBack} data-pad-cancel>← BACK</button><span>01 / RUNNER SELECTION</span></div>
    <p className="eyebrow">SELECT YOUR RUNNER</p><h2 className="large-heading">WHO FACES THE FRACTURE?</h2>
    <div className="hero-grid">
      {HEROES.map((h, i) => <button type="button" key={h.id} onClick={() => onHero(h.id)} aria-pressed={hero === h.id} data-testid={`hero-card-${h.id}`} className={`hero-card ${hero === h.id ? 'active-hero picked' : 'idle-hero'} has-art ${h.id === 'vex' ? 'is-vex' : ''}`} style={{ '--accent': h.accent, ...(h.id === 'kai' ? {} : { '--hero-art': `url(${ASSET_BASE}ui/heroes/${h.id}-card.webp)` }) } as CSSProperties}><span className="hero-art" aria-hidden="true"/>
        <div className="hero-card-index">0{i + 1} / {h.title}</div>
        <div className={`hero-silhouette hero-${h.id}`} aria-hidden="true"/>
        <div className="hero-copy"><h3>{h.name}</h3><p>{h.role}</p><small>AUTO · {h.weapon.toUpperCase()}</small><FormRow save={save} hero={h.id}/></div>
        <div className="hero-status">{hero === h.id ? 'SELECTED · READY FOR DEPLOYMENT' : 'SELECT'}</div>
      </button>)}
    </div>
    <div className="loadout-strip" data-testid="loadout-strip" aria-label="Run loadout">
      <button className="loadout-chip" onClick={() => onProgress('armory')} data-testid="loadout-boon"><em>BOON</em><b>{save.meta.boon ? UNLOCK_BY_ID[`boon_${save.meta.boon}` as UnlockId].name : 'NONE'}</b></button>
      <button className="loadout-chip" onClick={() => onProgress('contracts')} data-testid="loadout-contract"><em>CONTRACT</em><b>{save.meta.contract ? CONTRACT_BY_ID[save.meta.contract].name : 'STANDARD RUN'}</b></button>
      <button className="loadout-chip armory" onClick={() => onProgress('armory')} data-testid="open-armory"><em>{save.meta.marks.toLocaleString()} MARKS</em><b>ARMORY ›</b></button>
    </div>
    <div className="start-row">{onMode && <button className="loadout-chip mode-strip" onClick={onMode} data-testid="mode-open"><em>MODE</em><b>{modeName ?? 'CLASSIC'} ›</b></button>}{locked && <span className="mode-lock" data-testid="mode-lock">{locked}</span>}<button className="arena-strip" onClick={onArena} data-testid="arena-open" style={{ '--card': `url(${arenaCardUrl(arena)})` } as CSSProperties} aria-label={`Arena: ${ARENAS[arena].name}. Change arena`}><span className="arena-strip-art" aria-hidden="true"/><span className="arena-strip-copy"><em>ARENA</em><b>{ARENAS[arena].name.toUpperCase()}</b></span><span className="arena-strip-go"><span>CHANGE</span><i aria-hidden="true"/></span></button><label className="seed-field">RUN SEED <input aria-label="Run seed" value={seed} onChange={e => onSeed(e.target.value)} placeholder="Random on start"/></label><button className="primary-button" onClick={onStart} data-testid="start-run" data-pad-default data-pad-start>DEPLOY {HEROES.find(h => h.id === hero)!.name} <span aria-hidden="true">↗</span></button></div>
    <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'DEPLOY' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}/>
  </main>;
}

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { HEROES, type HeroId } from '../../content/heroes';
import type { SaveV1 } from '../../sim/SaveSystem';
import { MILESTONES } from '../../b22/mastery';
import { hubAudio } from '../../game/audio/hubAudio';
import { sharedAbilityAudio } from '../../game/audio/abilityAudio';
import { ASSET_BASE } from '../assetBase';
import { HintBar } from './Chrome';

export type NexusDest = 'deploy' | 'heroes' | 'modes' | 'online' | 'armory' | 'contracts' | 'archives' | 'records' | 'settings' | 'title';
const NAV: { id: NexusDest; label: string; sub: string; glyph: string }[] = [
  { id: 'heroes', label: 'HEROES', sub: 'Runner, arena and seed', glyph: '◈' },
  { id: 'modes', label: 'MODES & CO-OP', sub: 'Run types, couch co-op', glyph: '⬡' },
  { id: 'online', label: 'ONLINE CO-OP', sub: 'Fracture Alliance', glyph: '◎' },
  { id: 'armory', label: 'ARMORY', sub: 'Unlocks and outfits', glyph: '⚔' },
  { id: 'contracts', label: 'CONTRACTS', sub: 'Boons and risks', glyph: '❖' },
  { id: 'archives', label: 'ARCHIVES', sub: 'Mastery and horizons', glyph: '▤' },
  { id: 'records', label: 'RECORDS', sub: 'Marks and best runs', glyph: '✦' },
  { id: 'settings', label: 'SETTINGS', sub: 'Audio, video, controls', glyph: '⚙' },
];
const ACCENT: Record<HeroId, string> = { kai: '#ffab4a', ren: '#ff4a5c', sora: '#5eb6ff', vex: '#a982ff' };
const BLURB: Record<HeroId, string> = { kai: 'Kinetic vanguard. Momentum and comet fists.', ren: 'Crimson brawler. Close, heavy, relentless.', sora: 'Azure duelist. Blades from a distance.', vex: 'Fallen vanguard. Riposte and dimensional cuts.' };
/** Real game sprites (transparent south-facing sheets): frame size, Idle (16 f, 10 fps) and BasicPunch (14 f, 16 fps) strips. */
const FRAME: Record<HeroId, [number, number]> = { kai: [152, 167], ren: [160, 170], sora: [152, 167], vex: [166, 170] };
const sheet = (h: HeroId, clip: 'idle' | 'basicpunch') => `${ASSET_BASE}art/${h}/south/sheets/${h}_south_${clip}.png`;
const FX_COUNT = 7;
function forms(save: SaveV1, h: HeroId): [number, number] {   // transformations unlocked / total (base is not counted, for every hero)
  if (h === 'kai') return [1 + Number(!!save.unlocks?.cometheart) + Number(!!save.unlocks?.stillfire), 3];
  if (h === 'vex') { const v = save.b22?.vexForms ?? [false, false]; return [Number(v[0]) + Number(v[1]), 2]; }
  return [Number(!!save.unlocks?.[h as 'ren' | 'sora']), 1];
}
/** Sanctuary attunement 0..3 from unlocked forms, mastery milestones, finished story chapters and a recorded run. Drives extra aurora, floor runes and lit beacons. */
function attunement(save: SaveV1): { tier: 0 | 1 | 2 | 3; energy: number; mastery: [number, number] } {
  const f = HEROES.map(h => forms(save, h.id)), fr = f.reduce((a, [n]) => a + n, 0) / f.reduce((a, [, m]) => a + m, 0);
  const mc = Object.keys(save.b22?.mastery ?? {}).length, mt = Math.max(1, MILESTONES.length), story = (save.b22?.story?.done?.length ?? 0) / 3;
  const score = fr * 0.45 + (mc / mt) * 0.35 + story * 0.12 + (save.best ? 0.08 : 0);
  return { tier: score >= 0.75 ? 3 : score >= 0.45 ? 2 : score >= 0.22 ? 1 : 0, energy: 0.45 + 0.55 * Math.min(1, score + fr * 0.2), mastery: [mc, mt] };
}
function Sprite({ id, punch }: { id: HeroId; punch: boolean }) {
  const [w, h] = FRAME[id], n = punch ? 14 : 16;
  return <span className={`nx-spr ${punch ? 'punch' : ''}`} style={{ '--fw': w, '--fh': h, '--n': n, '--sn': n - 1, '--dur': punch ? '.875s' : '1.6s', backgroundImage: `url(${sheet(id, punch ? 'basicpunch' : 'idle')})` } as CSSProperties} aria-hidden="true"/>;
}
interface Props { save: SaveV1; hero: HeroId; arenaName: string; modeName: string; onHero: (h: HeroId) => void; onGo: (d: NexusDest) => void }
/** Fracture Nexus: the home hub between runs. Layered drifting sanctuary, a living rift gate that carries the selected runner into the arena, four hero shrines with the real animated sprites, a navigation rail, a synthesized ambience, and an attunement that grows with progression. Presentation over existing screens. */
export function NexusHub({ save, hero, arenaName, modeName, onHero, onGo }: Props) {
  const root = useRef<HTMLElement | null>(null);
  const reduced = save.settings.reducedEffects || (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const att = useMemo(() => attunement(save), [save]);
  const [punch, setPunch] = useState<{ id: HeroId; n: number } | null>(null), [diving, setDiving] = useState(false);
  const motes = useMemo(() => Array.from({ length: reduced ? 10 : 22 + att.tier * 6 }, (_, i) => ({ l: (i * 37) % 100, d: (i * 13) % 17, t: 11 + (i * 7) % 12, s: 2 + (i % 4), o: 0.25 + ((i * 11) % 6) / 10 })), [reduced, att.tier]);
  const move = (e: React.PointerEvent) => { if (reduced || !root.current) return; const r = root.current.getBoundingClientRect(); root.current.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); root.current.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3)); };
  // ambience: starts with the hub, ends when it is left (retries on the first gesture while audio is still locked)
  useEffect(() => {
    const music = sharedAbilityAudio()?.music; music?.setCue(null, 1.2);
    const go = () => { if (hubAudio.start()) { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); } };
    go(); window.addEventListener('pointerdown', go); window.addEventListener('keydown', go);
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); hubAudio.stop(0.9); };
  }, []);
  const pick = (id: HeroId) => { if (id !== hero) onHero(id); hubAudio.hero(id); if (reduced) return; setPunch({ id, n: Date.now() }); window.setTimeout(() => setPunch(p => (p && p.id === id ? null : p)), 900); };
  const diveTimer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(diveTimer.current), []);   // leaving the hub never starts a run late
  const deploy = () => { if (diving) return; hubAudio.deploy(); setDiving(true); diveTimer.current = window.setTimeout(() => onGo('deploy'), reduced ? 220 : 980); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (diving) return;
      if (e.key === 'Escape') { e.preventDefault(); onGo('title'); return; }
      const i = HEROES.findIndex(h => h.id === hero);
      if (e.key === 'ArrowRight') { pick(HEROES[(i + 1) % HEROES.length].id); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { pick(HEROES[(i + HEROES.length - 1) % HEROES.length].id); e.preventDefault(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const items = [...document.querySelectorAll<HTMLElement>('.nx-nav button')], at = items.indexOf(document.activeElement as HTMLElement);
        if (items.length) { items[at < 0 ? 0 : (at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  const sel = HEROES.find(h => h.id === hero) ?? HEROES[0], [fn, fm] = forms(save, sel.id), c = ACCENT[hero];
  return <main ref={root} className={`nexus t${att.tier} ${reduced ? 'calm' : ''} ${diving ? 'diving' : ''}`} style={{ '--energy': att.energy.toFixed(2), '--acc': c } as CSSProperties} onPointerMove={move} data-testid="nexus-hub">
    <div className="nx-stage">
      <div className="nx-layer nx-bg" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/bg.webp)` }} aria-hidden="true"/>
      <div className="nx-layer nx-aurora" aria-hidden="true"/>
      <div className="nx-layer nx-rays" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/rays.webp)` }} aria-hidden="true"/>
      <div className="nx-layer nx-sweep" aria-hidden="true"/>
      <div className="nx-layer nx-mid" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/mid.webp)` }} aria-hidden="true"/>
      <div className="nx-floor" aria-hidden="true"><div className="nx-runes">{'ᚠᚢᚦᚨᚱᚲᚷᚹ'.split('').map((r, i) => <i key={i} style={{ '--i': i } as CSSProperties}>{r}</i>)}</div></div>
      <div className="nx-beacons" aria-hidden="true"><i/><i/></div>
      <div className="nx-layer nx-motes" aria-hidden="true">{motes.map((m, i) => <i key={i} style={{ left: `${m.l}%`, animationDelay: `-${m.d}s`, animationDuration: `${m.t}s`, width: m.s, height: m.s, opacity: m.o }}/>)}</div>
      <header className="nx-title"><button className="text-button nx-back" onClick={() => onGo('title')} data-pad-cancel>← TITLE</button>
        <p className="eyebrow"><span className="orange-tick"/>DIMENSIONAL SANCTUARY</p><h1>FRACTURE NEXUS</h1><p className="nx-tag">Between runs, the broken world holds still.</p></header>
      <nav className="nx-nav" aria-label="Fracture Nexus destinations">{NAV.map((n, i) => <button key={n.id} type="button" className="nx-item" style={{ '--i': i } as CSSProperties} onClick={() => onGo(n.id)} data-testid={`nexus-${n.id}`}>
        <i aria-hidden="true">{n.glyph}</i><span><b>{n.label}</b><small>{n.sub}</small></span></button>)}</nav>
      <section className="nx-gate-wrap" aria-label="Deploy">
        <button type="button" className="nx-gate" onClick={deploy} onPointerEnter={() => hubAudio.gate(true)} onPointerLeave={() => hubAudio.gate(false)} onFocus={() => hubAudio.gate(true)} onBlur={() => hubAudio.gate(false)} data-testid="nexus-deploy" data-pad-default data-pad-start aria-label={`Deploy ${sel.name} into ${arenaName}`}>
          <span className="nx-halo" aria-hidden="true"/>
          <span className="nx-orbit back" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className="arm" style={{ '--i': i, '--r': `calc(${92 + i * 14} * var(--u))` } as CSSProperties}><img src={`${ASSET_BASE}art/nexus/shard-${i}.webp`} alt="" draggable={false}/></span>)}</span>
          <span className="nx-swirl s1" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/swirl.webp)` }} aria-hidden="true"/><span className="nx-swirl s2" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/swirl.webp)` }} aria-hidden="true"/><span className="nx-core" aria-hidden="true"/>
          <span className="nx-gate-art" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/gate.webp)` }} aria-hidden="true"/><span className="nx-gate-ring" aria-hidden="true"/><span className="nx-gate-ring r2" aria-hidden="true"/>
          <span className="nx-orbit front" aria-hidden="true">{[3, 4, 5].map((s, i) => <span key={s} className="arm" style={{ '--i': i + 1.5, '--r': `calc(${100 + i * 12} * var(--u))` } as CSSProperties}><img src={`${ASSET_BASE}art/nexus/shard-${s}.webp`} alt="" draggable={false}/></span>)}</span>
          <span className="nx-gate-label"><span className="nx-gl-top"><i className="nx-dot" aria-hidden="true"/><b>DEPLOY</b></span><small><em>{sel.name}</em> · {modeName} · {arenaName}</small></span></button>
      </section>
      <section className="nx-heroes" aria-label="Runners">{HEROES.map((h, i) => { const on = h.id === hero, [n, m] = forms(save, h.id), pn = punch?.id === h.id; return <button key={h.id} type="button" className={`nx-hero ${on ? 'on' : ''}`} style={{ '--c': ACCENT[h.id], '--i': i } as CSSProperties} onClick={() => pick(h.id)} aria-pressed={on} data-testid={`nexus-hero-${h.id}`}>
        <span className="nx-plinth" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/plinth-${i}.webp)` }} aria-hidden="true"/>
        <span className="nx-beam" aria-hidden="true"/>
        <span className={`nx-fx fx-${h.id}`} aria-hidden="true">{Array.from({ length: FX_COUNT }, (_, k) => <i key={k} style={{ '--k': k } as CSSProperties}/>)}</span>
        <span className="nx-lift"><Sprite id={h.id} punch={pn}/></span>
        {pn && <span key={punch!.n} className={`nx-burst b-${h.id}`} aria-hidden="true"/>}
        <span className="nx-hero-cap"><b>{on ? '✓ ' : ''}{h.name}</b><small>{n}/{m} FORMS</small></span></button>; })}</section>
      <aside className="nx-focus" aria-live="polite"><b style={{ color: c }}>{sel.name} · {sel.title}</b><span>{BLURB[hero]}</span><small>{sel.weapon} · {fn}/{fm} forms unlocked</small>
        <small className="nx-att" title="Grows with unlocked forms, mastery and story progress"><span>ATTUNEMENT</span><i className={att.tier >= 1 ? 'on' : ''}/><i className={att.tier >= 2 ? 'on' : ''}/><i className={att.tier >= 3 ? 'on' : ''}/></small></aside>
      <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'TITLE' }]}/>
    </div>
    <div className="nx-flash" aria-hidden="true"/>
  </main>;
}

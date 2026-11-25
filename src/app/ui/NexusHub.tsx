import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { HEROES, type HeroId } from '../../content/heroes';
import type { SaveV1 } from '../../sim/SaveSystem';
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
const ART: Record<HeroId, string> = { kai: 'ui/kai-keyart.webp', ren: 'ui/heroes/ren-card.webp', sora: 'ui/heroes/sora-card.webp', vex: 'ui/heroes/vex-card.webp' };
const BLURB: Record<HeroId, string> = { kai: 'Kinetic vanguard. Momentum and comet fists.', ren: 'Crimson brawler. Close, heavy, relentless.', sora: 'Azure duelist. Blades from a distance.', vex: 'Fallen vanguard. Riposte and dimensional cuts.' };
function forms(save: SaveV1, h: HeroId): [number, number] {
  if (h === 'kai') return [1 + Number(!!save.unlocks?.cometheart) + Number(!!save.unlocks?.stillfire), 3];
  if (h === 'vex') { const v = save.b22?.vexForms ?? [false, false]; return [1 + Number(v[0]) + Number(v[1]), 3]; }
  return [1 + Number(!!save.unlocks?.[h as 'ren' | 'sora']), 2];
}
interface Props { save: SaveV1; hero: HeroId; arenaName: string; modeName: string; onHero: (h: HeroId) => void; onGo: (d: NexusDest) => void }
/** Fracture Nexus: the home hub between runs. A layered, drifting sanctuary (generated art + CSS motion), the four heroes in their shrines, a rift gate that deploys the chosen runner, and the rest of the game as a navigation rail. Pure presentation over existing screens. */
export function NexusHub({ save, hero, arenaName, modeName, onHero, onGo }: Props) {
  const root = useRef<HTMLElement | null>(null);
  const reduced = save.settings.reducedEffects;
  const progress = useMemo(() => { const all = HEROES.map(h => forms(save, h.id)); return all.reduce((a, [n]) => a + n, 0) / all.reduce((a, [, m]) => a + m, 0); }, [save]);
  const motes = useMemo(() => Array.from({ length: reduced ? 10 : 30 }, (_, i) => ({ l: (i * 37) % 100, d: (i * 13) % 17, t: 11 + (i * 7) % 12, s: 2 + (i % 4), o: 0.25 + ((i * 11) % 6) / 10 })), [reduced]);
  const move = (e: React.PointerEvent) => { if (reduced || !root.current) return; const r = root.current.getBoundingClientRect(); root.current.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); root.current.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3)); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onGo('title'); return; }
      const i = HEROES.findIndex(h => h.id === hero);
      if (e.key === 'ArrowRight') { onHero(HEROES[(i + 1) % HEROES.length].id); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { onHero(HEROES[(i + HEROES.length - 1) % HEROES.length].id); e.preventDefault(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const items = [...document.querySelectorAll<HTMLElement>('.nx-nav button')], at = items.indexOf(document.activeElement as HTMLElement);
        if (items.length) { items[at < 0 ? 0 : (at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [hero, onHero, onGo]);
  const sel = HEROES.find(h => h.id === hero) ?? HEROES[0], [fn, fm] = forms(save, sel.id);
  return <main ref={root} className={`nexus ${reduced ? 'calm' : ''}`} style={{ '--energy': (0.45 + 0.55 * progress).toFixed(2), '--acc': ACCENT[hero] } as CSSProperties} onPointerMove={move} data-testid="nexus-hub">
    <div className="nx-layer nx-bg" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/bg.webp)` }} aria-hidden="true"/>
    <div className="nx-layer nx-sweep" aria-hidden="true"/>
    <div className="nx-layer nx-mid" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/mid.webp)` }} aria-hidden="true"/>
    <div className="nx-layer nx-motes" aria-hidden="true">{motes.map((m, i) => <i key={i} style={{ left: `${m.l}%`, animationDelay: `-${m.d}s`, animationDuration: `${m.t}s`, width: m.s, height: m.s, opacity: m.o }}/>)}</div>
    <header className="nx-title"><button className="text-button nx-back" onClick={() => onGo('title')} data-pad-cancel>← TITLE</button>
      <p className="eyebrow"><span className="orange-tick"/>DIMENSIONAL SANCTUARY</p><h1>FRACTURE NEXUS</h1><p className="nx-tag">Between runs, the broken world holds still.</p></header>
    <nav className="nx-nav" aria-label="Fracture Nexus destinations">{NAV.map((n, i) => <button key={n.id} type="button" className="nx-item" style={{ '--i': i } as CSSProperties} onClick={() => onGo(n.id)} data-testid={`nexus-${n.id}`}>
      <i aria-hidden="true">{n.glyph}</i><span><b>{n.label}</b><small>{n.sub}</small></span></button>)}</nav>
    <section className="nx-gate-wrap" aria-label="Deploy">
      <button type="button" className="nx-gate" onClick={() => onGo('deploy')} data-testid="nexus-deploy" data-pad-default data-pad-start aria-label={`Deploy ${sel.name} into ${arenaName}`}>
        <span className="nx-gate-art" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/gate.webp)` }} aria-hidden="true"/><span className="nx-gate-ring" aria-hidden="true"/><span className="nx-gate-ring r2" aria-hidden="true"/>
        <span className="nx-gate-label"><b>DEPLOY</b><small>{sel.name} · {modeName} · {arenaName}</small></span></button>
    </section>
    <section className="nx-heroes" aria-label="Runners">{HEROES.map((h, i) => { const on = h.id === hero, [n, m] = forms(save, h.id); return <button key={h.id} type="button" className={`nx-hero ${on ? 'on' : ''}`} style={{ '--c': ACCENT[h.id], '--i': i } as CSSProperties} onClick={() => onHero(h.id)} aria-pressed={on} data-testid={`nexus-hero-${h.id}`}>
      <span className="nx-plinth" style={{ backgroundImage: `url(${ASSET_BASE}art/nexus/plinth-${i}.webp)` }} aria-hidden="true"/>
      <span className="nx-hero-frame"><span className="nx-hero-art" style={{ backgroundImage: `url(${ASSET_BASE}${ART[h.id]})` }} aria-hidden="true"/><span className="nx-hero-aura" aria-hidden="true"/>
        <span className="nx-hero-cap"><b>{h.name}</b><small>{n}/{m} FORMS</small></span></span>{on && <em className="nx-check" aria-hidden="true">✓</em>}</button>; })}</section>
    <aside className="nx-focus" aria-live="polite"><b style={{ color: ACCENT[hero] }}>{sel.name} · {sel.title}</b><span>{BLURB[hero]}</span><small>{sel.weapon} · {fn}/{fm} forms unlocked</small></aside>
    <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'TITLE' }]}/>
  </main>;
}

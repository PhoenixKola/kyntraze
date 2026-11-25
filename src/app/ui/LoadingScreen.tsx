import { useEffect, useState } from 'react';
import { ASSET_BASE } from '../assetBase';
import type { ArenaId } from '../../content/arenas';
import { UNLOCK_BY_ID, CONTRACT_BY_ID, type BoonId, type ContractId, type UnlockId } from '../../content/meta';
const TIPS = [
  'Keep moving: your fists fire on their own when something is in range.',
  'Fill the DRIVE bar to 65 % and press F to transform.',
  'Dash makes you briefly untouchable. Use it to cross a swarm.',
  'Pick up the teal shards: they are your experience.',
  'Press Ctrl once to fly while transformed; press it again to land with a slam.',
  'Elites wear a gold health bar. Break their guard, then punish the recovery.',
  'The Fracture Warden arrives at 8:00. The Null Seraph waits at 15:00.',
  'Overdrive fills while you fight transformed. Press G when it is ready.',
  'Lore: the Nexus holds still between runs, but the world outside never does.',
];
let introPlayed = false;
/** Shown over the arena until the scene reports ready, so players never see a half-built screen. */
interface RunAnim { url: string; w: number; h: number; frames: number; fps: number }
/** The chosen runner's real run cycle (the game's own east-facing sheet) plays on the right while the arena builds. */
function useRunAnim(hero: string): RunAnim | null {
  const [a, setA] = useState<RunAnim | null>(null);
  useEffect(() => { let off = false; const base = `/art/${hero}/east`; fetch(`${base}/manifest.json`).then(r => r.json()).then(m => { const c = m.animations.Run; if (!off) setA({ url: `${base}/${c.sheet}`, w: c.frame_width ?? m.frame_width, h: c.frame_height ?? m.frame_height, frames: c.frames, fps: c.fps }); }).catch(() => undefined); return () => { off = true; }; }, [hero]);
  return a;
}
export function LoadingScreen({ progress, arena = 'THE GLOAM CIRCUIT', hero = 'kai', arenaId = 'gloam', boon = null, contract = null, seed = 0, partner = null, objective }: { objective?: string; progress: number; arena?: string; hero?: string; arenaId?: ArenaId; boon?: BoonId | null; contract?: ContractId | null; seed?: number; partner?: string | null }) {
  const run = useRunAnim(hero), pRun = useRunAnim(partner ?? hero);
  const [intro] = useState(() => { const first = !introPlayed; introPlayed = true; return first; });
  const [ti, setTi] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [shown, setShown] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setTi(t => (t + 1) % TIPS.length), 4200); return () => window.clearInterval(id); }, []);
  useEffect(() => { let raf = 0; const tick = () => { setShown(s => s + (progress - s) * 0.18); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [progress]);
  const pct = Math.round(Math.min(1, shown) * 100), tip = TIPS[ti], p = Math.min(1, shown);
  const sprite = (r: RunAnim | null, cls: string) => r && <div className={`lh-sprite ${cls}`} style={{ width: r.w, height: r.h, backgroundImage: `url(${r.url})`, '--n': r.frames, '--w': `${r.w}px`, animationDuration: `${r.frames / r.fps}s` } as React.CSSProperties}/>;
  return <div className={`loading-screen lz ${intro ? 'intro' : 'no-intro'} ${partner ? 'duo' : ''}`} data-testid="loading-screen" role="progressbar" aria-label="Loading" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ '--p': p } as React.CSSProperties}>
    <div className="loading-scenic" style={{ backgroundImage: `url(${ASSET_BASE}art/menu/arena-${arenaId}.webp)` }} aria-hidden="true"/><div className="loading-shade" aria-hidden="true"/>
    <div className="lz-portal" aria-hidden="true"><i/><i/><i/><u/></div><div className="loading-lines" aria-hidden="true"><i/><i/><i/><i/></div>
    <div className="lz-stage" aria-hidden="true"><div className="lz-glow"/>{sprite(run, 'a')}{partner && sprite(pRun, 'b')}<div className="lz-floor"/></div>
    <div className="loading-body lz-body">
      <p className="eyebrow"><span className="orange-tick"/>KYNTRAZE · FRACTURE RUSH</p>
      <p className="lz-kicker">DEPLOYING TO</p>
      <h1 className="lz-dest">{arena}</h1>
      <figure className="lz-card" aria-hidden="true"><img src={`${ASSET_BASE}art/menu/arena-${arenaId}.webp`} alt="" draggable={false}/><i/><i/><i/><i/></figure>
      {objective && <p className="lz-obj" data-testid="loading-objective"><em>OBJECTIVE</em>{objective}</p>}
      <div className="loading-chips" aria-label="Run summary"><span>{hero.toUpperCase()}{partner ? ` + ${partner.toUpperCase()}` : ''}</span>{boon && UNLOCK_BY_ID[`boon_${boon}` as UnlockId] && <span>{UNLOCK_BY_ID[`boon_${boon}` as UnlockId].name}</span>}{contract && <span>{CONTRACT_BY_ID[contract].name}</span>}{seed > 0 && <span>Seed {seed}</span>}</div>
    </div>
    <div className="lz-foot">
      <div className="lz-meta"><span>STABILISING THE FRACTURE</span><b>{pct}%</b></div>
      <div className="lz-rail"><i style={{ width: `${pct}%` }}/><u style={{ left: `${pct}%` }}/></div>
      <p className="loading-tip lz-tip" key={ti}><em>{tip.startsWith('Lore') ? 'LORE' : 'TIP'}</em> {tip.replace(/^Lore: /, '')}</p>
    </div>
  </div>;
}

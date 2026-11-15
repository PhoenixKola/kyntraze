import { useEffect, useState } from 'react';
const TIPS = [
  'Keep moving: your fists fire on their own when something is in range.',
  'Fill the DRIVE bar to 65 % and press F to become Flarebound.',
  'Dash (Shift) makes you briefly untouchable. Use it to cross a swarm.',
  'Fracture Lance pierces a whole line. Nova Bloom crushes a crowd.',
  'Pick up the teal shards: they are your experience.',
];
/** Shown over the arena until the scene reports ready, so players never see a half-built screen. */
export function LoadingScreen({ progress, arena = 'THE GLOAM CIRCUIT' }: { progress: number; arena?: string }) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [shown, setShown] = useState(0);
  useEffect(() => { let raf = 0; const tick = () => { setShown(s => s + (progress - s) * 0.18); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [progress]);
  const pct = Math.round(Math.min(1, shown) * 100);
  return <div className="loading-screen" data-testid="loading-screen" role="progressbar" aria-label="Loading" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
    <div className="title-art" aria-hidden="true"/><div className="loading-shade" aria-hidden="true"/>
    <div className="loading-body">
      <p className="eyebrow"><span className="orange-tick"/>ENTERING {arena}</p>
      <h1 className="loading-logo"><span>KYNTRAZE</span> <strong>FRACTURE RUSH</strong></h1>
      <div className="loading-bar"><i style={{ width: `${pct}%` }}/><u style={{ left: `${pct}%` }}/></div>
      <div className="loading-meta"><span>STABILISING THE FRACTURE</span><b>{pct}%</b></div>
      <p className="loading-tip"><em>TIP</em> {tip}</p>
    </div>
  </div>;
}

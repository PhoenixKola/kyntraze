import { CONTROLLER_LAYOUT } from '../../game/input/gamepadMap';
/** Small connection indicator, clear of the HUD. Glyphs on the ability tiles and the hint bars carry the actual mapping. */
export function ControllerBadge() {
  return <div className="pad-badge" data-testid="pad-badge" aria-label="Controller connected"><span className="pad-dot"/><b>CONTROLLER</b></div>;
}
/** Exact mapping table, rendered in Settings; `compact` is a one-line reminder. */
export function ControllerMap({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  if (compact) return <div className={`pad-map pad-compact ${className}`} data-testid="pad-map-compact"><strong>CONTROLS</strong><p>MOVE LEFT STICK / D-PAD · DASH A · IMPACT X · BEAM RB/RT · SPHERE LB/LT · FORM Y · PAUSE START</p></div>;
  return <div className={`pad-map ${className}`} data-testid="pad-map"><p className="pad-map-head"><span>ACTION</span><i>KEYBOARD</i><b>CONTROLLER</b></p>{CONTROLLER_LAYOUT.map(r => <p key={r.action}><span>{r.action}</span><i>{r.keys}</i><b>{r.pad}</b></p>)}</div>;
}

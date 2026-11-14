import { CONTROLLER_LAYOUT } from '../../game/input/gamepadMap';
/** Unobtrusive connection indicator. The one-line hint only appears on wide screens; the full mapping lives in Settings and the pause menu. */
export function ControllerBadge() {
  return <div className="pad-badge" data-testid="pad-badge" aria-label="Controller connected"><b>CONTROLLER</b><span className="pad-hint">A DASH · X IMPACT · RB BEAM · LB SPHERE · Y FORM · START PAUSE</span></div>;
}
/** Exact mapping table, rendered in Settings (always) and the pause menu (only while a controller is connected). */
export function ControllerMap({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  if (compact) return <div className={`pad-map pad-compact ${className}`} data-testid="pad-map-compact"><strong>CONTROLS</strong><p>MOVE LEFT STICK / D-PAD · DASH A · IMPACT X · BEAM RB/RT · SPHERE LB/LT · FORM Y · PAUSE START</p></div>;
  return <div className={`pad-map ${className}`} data-testid="pad-map"><strong>CONTROLS</strong>{CONTROLLER_LAYOUT.map(r => <p key={r.action}><span>{r.action}</span><i>{r.keys}</i><b>{r.pad}</b></p>)}</div>;
}

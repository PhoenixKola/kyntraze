import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { ASSET_BASE } from '../../assetBase';
import { HintBar, type Hint } from '../Chrome';

/** B29 menu kit: one frame, one panel language, one card, one primary action, one tab strip. Every menu screen is built from these so they read as the same game. Visual anchor: Fracture Nexus + Settings. All sizes use --u so 640x360 simply scales. */
export const DEFAULT_HINTS: Hint[] = [{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'BACK' }];

interface FrameProps { testId?: string; eyebrow: string; title: string; sub?: string; onBack: () => void; backLabel?: string; right?: ReactNode; hints?: Hint[]; className?: string; accent?: string; bg?: string; /** keep the screen's own art bright (darken only behind text columns) */ lit?: boolean; children: ReactNode }
/** Screen frame: dimmed living backdrop, header (back, eyebrow, title, optional right slot), body, hint bar. Esc / pad B go back. */
export function Frame({ testId, eyebrow, title, sub, onBack, backLabel = '← BACK', right, hints = DEFAULT_HINTS, className = '', accent, bg, lit, children }: FrameProps) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); onBack(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onBack]);
  return <main className={`b29 ${lit ? 'lit' : ''} ${className}`} data-testid={testId} style={accent ? ({ '--acc': accent } as CSSProperties) : undefined}>
    <div className="b29-bg" style={{ backgroundImage: `url(${ASSET_BASE}${bg ?? 'art/nexus/bg.webp'})` }} aria-hidden="true"/><div className="b29-veil" aria-hidden="true"/>
    <header className="b29-head"><button type="button" className="text-button b29-back" onClick={onBack} data-pad-cancel>{backLabel}</button>
      <div className="b29-titles"><p className="eyebrow"><span className="orange-tick"/>{eyebrow}</p><h2>{title}</h2>{sub && <p className="b29-sub">{sub}</p>}</div>{right && <div className="b29-right">{right}</div>}</header>
    <div className="b29-body">{children}</div>
    <HintBar hints={hints}/>
  </main>;
}
export const Panel = ({ title, className = '', children, ...rest }: { title?: string; className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) =>
  <section {...rest} className={`b29-panel ${className}`}>{title && <h3 className="b29-ph">{title}</h3>}{children}</section>;
/** Selectable card: `on` = selected (gold edge + check), `locked` = sealed, `accent` colours the selection. Renders a real button. */
export function Card({ on, insp, locked, accent, onClick, children, className = '', testId, label, disabled }: { on?: boolean; /** inspected (shown in the detail panel) but not selected */ insp?: boolean; locked?: boolean; accent?: string; onClick?: () => void; children: ReactNode; className?: string; testId?: string; label?: string; disabled?: boolean }) {
  return <button type="button" className={`b29-card ${on ? 'on' : ''} ${insp && !on ? 'insp' : ''} ${locked ? 'locked' : ''} ${className}`} style={accent ? ({ '--c': accent } as CSSProperties) : undefined} onClick={onClick} aria-pressed={on} aria-label={label} data-testid={testId} disabled={disabled}>{children}{on && <em className="b29-check" aria-hidden="true">✓</em>}{locked && <em className="b29-lock" aria-hidden="true">LOCKED</em>}</button>;
}
/** The one primary action of a screen. */
export const Cta = ({ children, sub, onClick, disabled, testId, pad }: { children: ReactNode; sub?: ReactNode; onClick: () => void; disabled?: boolean; testId?: string; pad?: boolean }) =>
  <button type="button" className="b29-cta" onClick={onClick} disabled={disabled} data-testid={testId} data-pad-default={pad === false ? undefined : ''} data-pad-start={pad === false ? undefined : ''}><b>{children}</b>{sub && <small>{sub}</small>}</button>;
export const Chip = ({ children, tone }: { children: ReactNode; tone?: 'gold' | 'teal' | 'red' | 'mute' }) => <span className={`b29-chip ${tone ?? ''}`}>{children}</span>;
export function Tabs<T extends string>({ tabs, value, onChange, testPrefix = 'tab' }: { tabs: { id: T; label: string; glyph?: string; badge?: string }[]; value: T; onChange: (t: T) => void; testPrefix?: string }) {
  return <div className="b29-tabs" role="tablist">{tabs.map(t => <button key={t.id} type="button" role="tab" aria-selected={value === t.id} className={`b29-tab ${value === t.id ? 'on' : ''}`} onClick={() => onChange(t.id)} data-testid={`${testPrefix}-${t.id}`}>{t.glyph && <i aria-hidden="true">{t.glyph}</i>}{t.label}{t.badge && <em>{t.badge}</em>}</button>)}</div>;
}
/** Stat bar used for hero / arena identity read-outs. */
export const Meter = ({ label, value, max = 5, accent }: { label: string; value: number; max?: number; accent?: string }) =>
  <div className="b29-meter" style={accent ? ({ '--c': accent } as CSSProperties) : undefined}><span>{label}</span><i>{Array.from({ length: max }, (_, k) => <u key={k} className={k < value ? 'on' : ''}/>)}</i></div>;

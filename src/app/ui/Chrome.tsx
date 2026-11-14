import { createContext, useContext, type ReactNode } from 'react';

/** True while a controller is connected: key caps and hint bars switch to pad glyphs. */
export const PadContext = createContext(false);
export const usePad = () => useContext(PadContext);

export function KeyCap({ k, pad }: { k: string; pad?: string }) {
  const isPad = usePad() && pad;
  return <kbd className={`keycap ${isPad ? 'pad-key' : ''}`}>{isPad ? pad : k}</kbd>;
}
export interface Hint { key: string; pad: string; label: string }
/** One-line control legend at the foot of every menu, in whichever device the player is using. */
export function HintBar({ hints }: { hints: Hint[] }) {
  return <div className="hintbar" data-testid="hint-bar">{hints.map(h => <span key={h.label}><KeyCap k={h.key} pad={h.pad}/>{h.label}</span>)}</div>;
}
export function Panel({ title, eyebrow, children, className = '' }: { title: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return <section className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{children}
  </section>;
}

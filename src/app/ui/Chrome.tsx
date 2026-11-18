import { createContext, useContext, type ReactNode } from 'react';

/** True while a controller is connected: key caps and hint bars switch to pad glyphs. */
export const PadContext = createContext(false);
export const usePad = () => useContext(PadContext);

export function KeyCap({ k, pad }: { k: string; pad?: string }) {
  const isPad = usePad() && pad;
  return <kbd className={`keycap ${isPad ? 'pad-key' : ''}`}>{isPad ? pad : k}</kbd>;
}
export interface Hint { key: string; pad: string; label: string }
const HINT_KEYS: Record<string, { key: string; code: string }> = { ESC: { key: 'Escape', code: 'Escape' }, ENTER: { key: 'Enter', code: 'Enter' }, SPACE: { key: ' ', code: 'Space' } };
/** A hint is a real button: it does what its key does (Esc / Enter / Space dispatch the key; Tab moves focus to the next control). CLICK / digit hints are plain labels. */
function fireHint(k: string) {
  if (k === 'TAB') { const f = [...document.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"], input')].filter(e => e.offsetParent !== null), i = f.indexOf(document.activeElement as HTMLElement); f[(i + 1) % f.length]?.focus(); return; }
  const h = HINT_KEYS[k]; if (h) document.body.dispatchEvent(new KeyboardEvent('keydown', { key: h.key, code: h.code, bubbles: true }));
}
/** One-line control legend at the foot of every menu, in whichever device the player is using. */
export function HintBar({ hints }: { hints: Hint[] }) {
  return <div className="hintbar" data-testid="hint-bar">{hints.map(h => HINT_KEYS[h.key] || h.key === 'TAB'
    ? <button type="button" className="hint-btn" key={h.label} onClick={() => fireHint(h.key)} aria-label={`${h.label} (${h.key})`}><KeyCap k={h.key} pad={h.pad}/>{h.label}</button>
    : <span key={h.label}><KeyCap k={h.key} pad={h.pad}/>{h.label}</span>)}</div>;
}
/** The shared close button of every dismissible modal (generated art, normal + hover). */
export function ModalX({ onClose, label = 'Close' }: { onClose: () => void; label?: string }) {
  return <button type="button" className="modal-x" onClick={e => { e.stopPropagation(); onClose(); }} aria-label={label} title={`${label} (Esc)`} data-testid="modal-x"/>;
}
export function Panel({ title, eyebrow, children, className = '', onClose }: { title: string; eyebrow?: string; children: ReactNode; className?: string; onClose?: () => void }) {
  return <section className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
    {onClose && <ModalX onClose={onClose}/>}{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{children}
  </section>;
}

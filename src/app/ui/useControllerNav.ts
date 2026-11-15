import { useEffect, useState } from 'react';
import { PadTracker, browserPads, type NavDir, type PadLike } from '../../game/input/gamepadMap';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex="0"]';
const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const centre = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };

/** The screen the controller currently drives: the topmost overlay (settings > pause / upgrade / results), else the title / hero-select page. In-game (no overlay) the Phaser InputController owns the pad. */
export function findPadRoot(doc: Document = document): HTMLElement | null {
  const overlays = doc.querySelectorAll<HTMLElement>('.overlay'); if (overlays.length) return overlays[overlays.length - 1];
  return doc.querySelector<HTMLElement>('main[data-testid="title-screen"], main[data-testid="hero-select"], main[data-testid="arena-select"], main[data-testid="progression"]');
}
export const padFocusables = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);

/** Spatial focus move: nearest focusable in the pushed direction (primary distance + penalised sideways offset). Returns the element now focused. */
export function moveFocus(root: HTMLElement, dir: NavDir): HTMLElement | null {
  const els = padFocusables(root); if (!els.length) return null;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !els.includes(cur)) { const d = root.querySelector<HTMLElement>('[data-pad-default]'); const t = d && els.includes(d) ? d : els[0]; t.focus(); return t; }
  const c = centre(cur); let best: HTMLElement | null = null, bestScore = Infinity;
  for (const e of els) {
    if (e === cur) continue; const p = centre(e); const vx = p.x - c.x, vy = p.y - c.y;
    const primary = dir === 'UP' ? -vy : dir === 'DOWN' ? vy : dir === 'LEFT' ? -vx : vx; if (primary <= 4) continue;
    const ortho = dir === 'UP' || dir === 'DOWN' ? Math.abs(vx) : Math.abs(vy); const score = primary + 2.5 * ortho;
    if (score < bestScore) { bestScore = score; best = e; }
  }
  if (best) best.focus(); return best ?? cur;
}
/** D-pad left/right on a focused slider nudges it (and fires React's input event) instead of moving focus; returns true when it handled the press. */
export function stepRange(el: Element | null, dir: NavDir): boolean {
  if (!(el instanceof HTMLInputElement) || el.type !== 'range' || (dir !== 'LEFT' && dir !== 'RIGHT')) return false;
  const step = Number(el.step) || 1, next = Math.min(Number(el.max), Math.max(Number(el.min), Number(el.value) + (dir === 'RIGHT' ? step : -step)));
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, String(next)); el.dispatchEvent(new Event('input', { bubbles: true })); return true;
}
export function activate(el: HTMLElement | null) { if (!el) return; if (el instanceof HTMLInputElement && el.type === 'text') { el.focus(); return; } el.click(); }

/** Controller-only menu navigation for every React screen. Returns whether a controller is connected (for the badge / hints). `getPads` is injectable for tests. */
export function useControllerNav(getPads: () => ArrayLike<PadLike | null> = browserPads): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const tracker = new PadTracker(getPads); const html = document.documentElement; let raf = 0, armed = false, lastRoot: HTMLElement | null = null, was = false;
    const clearUsing = () => html.classList.remove('using-pad');
    const loop = (ms: number) => {
      const s = tracker.sample(ms / 1000);
      if (s.connected !== was) { was = s.connected; setConnected(s.connected); html.classList.toggle('pad-connected', s.connected); if (!s.connected) clearUsing(); }
      const root = s.connected ? findPadRoot() : null;
      if (s.pressed.size || s.navPressed.size) html.classList.add('using-pad');
      if (!root) { lastRoot = null; armed = false; }
      else {
        if (root !== lastRoot) { lastRoot = root; armed = false; }
        // a screen only accepts input after every button was released once: the press that opened it can never also select something on it
        if (!armed) { if (s.held.size === 0) { armed = true; const cur = document.activeElement; if (!cur || !root.contains(cur)) (root.querySelector<HTMLElement>('[data-pad-default]') ?? padFocusables(root)[0])?.focus(); } }
        else {
          for (const d of s.navPressed) { if (!stepRange(document.activeElement, d)) moveFocus(root, d); }
          if (s.pressed.has('A')) { const cur = document.activeElement as HTMLElement | null; activate(cur && root.contains(cur) && cur !== root ? cur : root.querySelector<HTMLElement>('[data-pad-default]') ?? padFocusables(root)[0] ?? null); }
          else if (s.pressed.has('B')) activate(root.querySelector<HTMLElement>('[data-pad-cancel]'));
          else if (s.pressed.has('START')) activate(root.querySelector<HTMLElement>('[data-pad-start]'));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('keydown', clearUsing); window.addEventListener('pointerdown', clearUsing); window.addEventListener('mousemove', clearUsing);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', clearUsing); window.removeEventListener('pointerdown', clearUsing); window.removeEventListener('mousemove', clearUsing); html.classList.remove('using-pad', 'pad-connected'); };
  }, [getPads]);
  return { connected };
}

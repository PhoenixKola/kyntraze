import { sharedAbilityAudio } from '../game/audio/abilityAudio';

const HOVERABLE = 'button, [role="switch"], a[href], .lv-card, input[type="range"], label:has(input[type="checkbox"])';
/** One delegated set of listeners gives the whole Relic Plate UI its sounds: sparse hover, tactile click / confirm / back, toggles, slider ticks. Returns the teardown. */
export function installUiSounds(): () => void {
  let lastHover: Element | null = null, lastHoverAt = 0, lastTick = 0;
  const play = (n: Parameters<NonNullable<ReturnType<typeof sharedAbilityAudio>>['ui']>[0], v = 1, r = 1) => sharedAbilityAudio()?.ui(n, v, r);
  const over = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return; const el = (e.target as Element | null)?.closest?.(HOVERABLE); if (!el || el === lastHover || (el as HTMLButtonElement).disabled) { if (!el) lastHover = null; return; }
    lastHover = el; const now = performance.now(); if (now - lastHoverAt < 70) return; lastHoverAt = now; play('ui_hover');
  };
  const focus = (e: FocusEvent) => { if (!document.documentElement.classList.contains('using-pad')) return; const el = (e.target as Element | null)?.closest?.(HOVERABLE); if (el && el !== lastHover) { lastHover = el; play('ui_hover'); } };
  const click = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.('button'); if (!el || (el as HTMLButtonElement).disabled || el.classList.contains('hud-pause')) return;
    if (el.classList.contains('lv-card')) play('lv_pick'); else if (el.hasAttribute('data-pad-cancel') && !el.classList.contains('primary-button')) play('ui_back'); else if (el.classList.contains('primary-button')) play('ui_confirm'); else play('ui_click');
  };
  const change = (e: Event) => { const t = e.target; if (t instanceof HTMLInputElement && t.type === 'checkbox') play(t.checked ? 'ui_toggle_on' : 'ui_toggle_off'); };
  const input = (e: Event) => {
    const t = e.target; if (!(t instanceof HTMLInputElement) || t.type !== 'range') return; const now = performance.now(); if (now - lastTick < 80) return; lastTick = now;
    play('ui_slider', 1, 0.8 + (Number(t.value) / Math.max(1, Number(t.max))) * 0.6);
  };
  document.addEventListener('pointerover', over, true); document.addEventListener('focusin', focus, true); document.addEventListener('click', click, true); document.addEventListener('change', change, true); document.addEventListener('input', input, true);
  return () => { document.removeEventListener('pointerover', over, true); document.removeEventListener('focusin', focus, true); document.removeEventListener('click', click, true); document.removeEventListener('change', change, true); document.removeEventListener('input', input, true); };
}

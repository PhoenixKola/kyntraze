import type { InputState } from '../../sim/GameState';
import { PadTracker, browserPads, type PadLike } from './gamepadMap';
export class InputController {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private readonly pad: PadTracker;
  private lastDevice: 'kb' | 'pad' = 'kb';
  private readonly onDown = (event: KeyboardEvent) => {
    const code = event.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(code)) event.preventDefault();
    this.lastDevice = 'kb';
    if (!this.keys.has(code)) this.pressed.add(code);
    this.keys.add(code);
    if (code === 'Escape' && !event.repeat) this.onPause();
  };
  private readonly onUp = (event: KeyboardEvent) => { this.keys.delete(event.code); };
  private readonly onBlur = () => { this.keys.clear(); this.pressed.clear(); this.pad.reset(); this.onFocusLost(); };
  /** `getPads` is injectable for tests; `onPadLost` fires once when a controller that was in use disappears mid-run. */
  constructor(private readonly onPause: () => void, private readonly onFocusLost: () => void, private readonly onPadLost: () => void = () => undefined, getPads: () => ArrayLike<PadLike | null> = browserPads) {
    this.pad = new PadTracker(getPads);
    window.addEventListener('keydown', this.onDown); window.addEventListener('keyup', this.onUp); window.addEventListener('blur', this.onBlur);
  }
  read(): InputState {
    const key = (a: string, b?: string) => this.keys.has(a) || (b ? this.keys.has(b) : false);
    const consume = (...codes: string[]) => { const active = codes.some(code => this.pressed.has(code)); codes.forEach(code => this.pressed.delete(code)); return active; };
    // one unified path: keyboard and controller are merged here, once per simulation tick, so a button can never produce two actions
    const s = this.pad.sample(performance.now() / 1000);
    if (s.lost && this.lastDevice === 'pad') this.onPadLost();
    if (s.pressed.size || s.move.x || s.move.y) this.lastDevice = 'pad';
    if (s.pressed.has('START')) this.onPause();
    const kx = Number(key('KeyD', 'ArrowRight')) - Number(key('KeyA', 'ArrowLeft')), ky = Number(key('KeyS', 'ArrowDown')) - Number(key('KeyW', 'ArrowUp'));
    const usePad = kx === 0 && ky === 0;
    const p = (...b: Array<'A' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT'>) => b.some(n => s.pressed.has(n));
    const dash = consume('ShiftLeft', 'ShiftRight', 'Space'), q = consume('KeyQ'), f = consume('KeyF'), beam = consume('KeyE'), sphere = consume('KeyR');
    return { x: usePad ? s.move.x : kx, y: usePad ? s.move.y : ky, dash: dash || p('A'), q: q || p('X'), f: f || p('Y'), beam: beam || p('RB', 'RT'), sphere: sphere || p('LB', 'LT') };
  }
  destroy() { window.removeEventListener('keydown', this.onDown); window.removeEventListener('keyup', this.onUp); window.removeEventListener('blur', this.onBlur); }
}

import type { InputState } from '../../sim/GameState';
import { PadTracker, browserPads, type PadLike } from './gamepadMap';
export class InputController {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private readonly pad: PadTracker; private readonly pad2: PadTracker;
  /** B22 local couch co-op: with two pads P1 = pad 1, P2 = pad 2; with one pad P1 = keyboard + mouse, P2 = the pad (or the arrow-key set when no pad is connected). */
  coop = false;
  private lastDevice: 'kb' | 'pad' = 'kb';
  /** B13: the scene feeds the pointer's world direction from Kai (unit vector) every frame; it counts as aiming for a short while after the mouse moved. */
  private pointerAim: { x: number; y: number; d?: number } | null = null; private pointerAt = -1e9;
  /** B14: the scene tells the controller while the form selector is open, so Esc / B cancel it instead of pausing. */
  selectorOpen = false; private cancelReq = false;
  setPointerAim(dir: { x: number; y: number; d?: number } | null, moved: boolean) { this.pointerAim = dir; if (moved) this.pointerAt = performance.now(); }
  private readonly onDown = (event: KeyboardEvent) => {
    const code = event.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(code)) event.preventDefault();
    this.lastDevice = 'kb';
    if (!this.keys.has(code)) this.pressed.add(code);
    this.keys.add(code);
    if (code === 'Escape' && !event.repeat) { if (this.selectorOpen) this.cancelReq = true; else this.onPause(); }
  };
  private readonly onUp = (event: KeyboardEvent) => { this.keys.delete(event.code); };
  private readonly onBlur = () => { this.keys.clear(); this.pressed.clear(); this.pad.reset(); this.onFocusLost(); };
  /** `getPads` is injectable for tests; `onPadLost` fires once when a controller that was in use disappears mid-run. */
  constructor(private readonly onPause: () => void, private readonly onFocusLost: () => void, private readonly onPadLost: () => void = () => undefined, getPads: () => ArrayLike<PadLike | null> = browserPads) {
    const live = () => Array.from(getPads()).filter((p): p is PadLike => !!p && p.connected);
    this.pad = new PadTracker(() => (this.coop ? (live().length >= 2 ? [live()[0]] : []) : getPads()));
    this.pad2 = new PadTracker(() => { const l = live(); return l.length >= 2 ? [l[1]] : l.length === 1 ? [l[0]] : []; });
    window.addEventListener('keydown', this.onDown); window.addEventListener('keyup', this.onUp); window.addEventListener('blur', this.onBlur);
  }
  /** A click on an HUD ability tile acts like pressing its key once (held briefly so a charge-type E registers as a tap). */
  inject(code: string) { this.pressed.add(code); this.keys.add(code); window.setTimeout(() => this.keys.delete(code), 90); }
  /** Player 2 (co-op only): pad 2 / the single pad, else arrows + Enter (dash) + , . / ; (Q E R F). */
  readP2(): InputState {
    const s = this.pad2.sample(performance.now() / 1000), k = (c: string) => this.keys.has(c), had = s.held.size > 0 || s.move.x !== 0 || s.move.y !== 0;
    const tap = (c: string) => { const a = this.pressed.has(c); this.pressed.delete(c); return a; }, p = (...b: Array<'A' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT'>) => b.some(n => s.pressed.has(n));
    const kx = Number(k('ArrowRight')) - Number(k('ArrowLeft')), ky = Number(k('ArrowDown')) - Number(k('ArrowUp')), usePad = kx === 0 && ky === 0 && had;
    const stick = s.aim.x !== 0 || s.aim.y !== 0;
    return { x: usePad ? s.move.x : kx, y: usePad ? s.move.y : ky, dash: tap('Enter') || p('A'), q: tap('Comma') || p('X'), f: tap('Semicolon') || p('Y'), beam: tap('Period') || p('RB', 'RT'), sphere: tap('Slash') || p('LB', 'LT'), beamHeld: k('Period') || s.held.has('RB') || s.held.has('RT'), fHeld: k('Semicolon') || s.held.has('Y'), ...(stick ? { aimX: s.aim.x, aimY: s.aim.y, aimSrc: 'stick' as const } : {}) };
  }
  read(): InputState {
    const key = (a: string, b?: string) => this.keys.has(a) || (b ? this.keys.has(b) : false);
    const consume = (...codes: string[]) => { const active = codes.some(code => this.pressed.has(code)); codes.forEach(code => this.pressed.delete(code)); return active; };
    // one unified path: keyboard and controller are merged here, once per simulation tick, so a button can never produce two actions
    const s = this.pad.sample(performance.now() / 1000);
    if (s.lost && this.lastDevice === 'pad') this.onPadLost();
    if (s.pressed.size || s.move.x || s.move.y) this.lastDevice = 'pad';
    if (s.pressed.has('START')) this.onPause();
    const selCancel = this.cancelReq || (this.selectorOpen && s.pressed.has('B')); this.cancelReq = false;
    const kx = Number(this.coop ? key('KeyD') : key('KeyD', 'ArrowRight')) - Number(this.coop ? key('KeyA') : key('KeyA', 'ArrowLeft')), ky = Number(this.coop ? key('KeyS') : key('KeyS', 'ArrowDown')) - Number(this.coop ? key('KeyW') : key('KeyW', 'ArrowUp'));
    const usePad = kx === 0 && ky === 0;
    const p = (...b: Array<'A' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT'>) => b.some(n => s.pressed.has(n));
    const selConfirm = this.pressed.has('Space') || consume('Enter', 'NumpadEnter') || p('A');
    const selPick = consume('Digit1', 'Numpad1') ? 1 : consume('Digit2', 'Numpad2') ? 2 : consume('Digit3', 'Numpad3') ? 3 : undefined;
    const selMove = (consume('KeyD', 'ArrowRight') || s.navPressed.has('RIGHT') ? 1 : 0) - (consume('KeyA', 'ArrowLeft') || s.navPressed.has('LEFT') ? 1 : 0);
    const dash = consume('ShiftLeft', 'ShiftRight', 'Space'), q = consume('KeyQ'), f = consume('KeyF'), beam = consume('KeyE'), sphere = consume('KeyR');
    const stick = s.aim.x !== 0 || s.aim.y !== 0, pointer = !stick && this.pointerAim !== null && this.pointerAt > -1e8 && this.lastDevice === 'kb';   // once the mouse has been used it keeps aiming (Lance / Nova / Rift follow the cursor)
    const aim = stick ? { x: s.aim.x, y: s.aim.y, src: 'stick' as const } : pointer ? { x: this.pointerAim!.x, y: this.pointerAim!.y, src: 'pointer' as const, d: this.pointerAim!.d } : null;
    return { x: usePad ? s.move.x : kx, y: usePad ? s.move.y : ky, dash: dash || p('A'), q: q || p('X'), f: f || p('Y'), beam: beam || p('RB', 'RT'), sphere: sphere || p('LB', 'LT'),
      beamHeld: key('KeyE') || s.held.has('RB') || s.held.has('RT'), fHeld: key('KeyF') || s.held.has('Y'), ...(aim ? { aimX: aim.x, aimY: aim.y, aimSrc: aim.src, ...('d' in aim && aim.d !== undefined ? { aimDist: aim.d } : {}) } : {}), ...(selPick ? { selPick } : {}), ...(selMove ? { selMove } : {}), ...(selConfirm ? { selConfirm } : {}), ...(selCancel ? { selCancel } : {}) };
  }
  destroy() { window.removeEventListener('keydown', this.onDown); window.removeEventListener('keyup', this.onUp); window.removeEventListener('blur', this.onBlur); }
}

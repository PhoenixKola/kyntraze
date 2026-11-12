import type { InputState } from '../../sim/GameState';
export class InputController {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private readonly onDown = (event: KeyboardEvent) => {
    const code = event.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'].includes(code)) event.preventDefault();
    if (!this.keys.has(code)) this.pressed.add(code);
    this.keys.add(code);
    if (code === 'Escape' && !event.repeat) this.onPause();
  };
  private readonly onUp = (event: KeyboardEvent) => { this.keys.delete(event.code); };
  private readonly onBlur = () => { this.keys.clear(); this.pressed.clear(); this.onFocusLost(); };
  constructor(private readonly onPause: () => void, private readonly onFocusLost: () => void) {
    window.addEventListener('keydown', this.onDown); window.addEventListener('keyup', this.onUp); window.addEventListener('blur', this.onBlur);
  }
  read(): InputState {
    const key = (a: string, b?: string) => this.keys.has(a) || (b ? this.keys.has(b) : false);
    const consume = (...codes: string[]) => { const active = codes.some(code => this.pressed.has(code)); codes.forEach(code => this.pressed.delete(code)); return active; };
    return { x: Number(key('KeyD', 'ArrowRight')) - Number(key('KeyA', 'ArrowLeft')),
      y: Number(key('KeyS', 'ArrowDown')) - Number(key('KeyW', 'ArrowUp')),
      dash: consume('ShiftLeft', 'ShiftRight', 'Space'), q: consume('KeyQ'), f: consume('KeyF') };
  }
  destroy() { window.removeEventListener('keydown', this.onDown); window.removeEventListener('keyup', this.onUp); window.removeEventListener('blur', this.onBlur); }
}

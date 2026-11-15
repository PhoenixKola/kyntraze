/** Optional controller support: pure mapping, deadzone, edge and repeat logic on top of the browser Gamepad API (no Phaser plugin, no dependency).
 *  Layout (Xbox names, browser 'standard' mapping): Left stick / D-pad move (8 directions) | A dash | X Q impact | Y F form | RB or RT E beam | LB or LT R sphere | START pause.
 *  Menus: D-pad / Left stick move focus | A confirm | B back / resume | START confirm on title, hero select and results. Right stick is reserved (unused). */
export interface PadButtonLike { pressed: boolean; value: number }
export interface PadLike { index: number; connected: boolean; mapping: string; id?: string; axes: readonly number[]; buttons: readonly PadButtonLike[] }
export type PadButton = 'A' | 'B' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT' | 'BACK' | 'START' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type NavDir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** Standard-mapping button index -> name (https://w3c.github.io/gamepad/#remapping). Non-standard pads use the same face/shoulder indices as a best-effort fallback. */
export const BUTTON_INDEX: Readonly<Record<PadButton, number>> = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
export const STICK_DEADZONE = 0.2;
/** Menu navigation: the stick must pass this threshold (higher than the movement deadzone, so drift never moves focus). */
export const NAV_THRESHOLD = 0.55;
export const NAV_REPEAT_DELAY = 0.38;
export const NAV_REPEAT_RATE = 0.12;
/** Human-readable mapping, shown in the settings panel, the pause menu and documented in the status report. */
export const CONTROLLER_LAYOUT: readonly { action: string; keys: string; pad: string }[] = [
  { action: 'Move', keys: 'WASD / ARROWS', pad: 'LEFT STICK / D-PAD' },
  { action: 'Dash', keys: 'SHIFT / SPACE', pad: 'A' },
  { action: 'Impact (Q)', keys: 'Q', pad: 'X' },
  { action: 'Fracture Lance (beam)', keys: 'E', pad: 'RB or RT' },
  { action: 'Nova Bloom (sphere)', keys: 'R', pad: 'LB or LT' },
  { action: 'Flarebound form (full Drive after the Warden: Cometheart)', keys: 'F', pad: 'Y' },
  { action: 'Pause / resume', keys: 'ESC', pad: 'START' },
  { action: 'Menus: select / back', keys: 'MOUSE / TAB / ENTER', pad: 'D-PAD + A / B' },
];

/** Radial deadzone with rescaling so the output ramps smoothly from 0 at the edge of the deadzone to 1 at full tilt. */
export function applyDeadzone(x: number, y: number, dz = STICK_DEADZONE): { x: number; y: number } {
  const m = Math.hypot(x, y); if (!Number.isFinite(m) || m < dz) return { x: 0, y: 0 };
  const k = (Math.min(1, m) - dz) / (1 - dz) / m; return { x: x * k, y: y * k };
}
/** Snap an analog direction to the 8 compass directions (the same 8-way movement the keyboard gives). Components are -1, 0 or 1. */
export function snap8(x: number, y: number): { x: number; y: number } {
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const a = Math.round(Math.atan2(y, x) / (Math.PI / 4)) * (Math.PI / 4); return { x: Math.round(Math.cos(a)), y: Math.round(Math.sin(a)) };
}

const held = (p: PadLike, name: PadButton) => { const b = p.buttons[BUTTON_INDEX[name]]; return !!b && (b.pressed || b.value > 0.5); };
export interface PadReading { move: { x: number; y: number }; held: Set<PadButton>; dirs: Set<NavDir> }
/** One controller -> movement vector (stick, else D-pad), held buttons, and the menu directions currently pushed. */
export function readPad(p: PadLike): PadReading {
  const h = new Set<PadButton>(); for (const n of Object.keys(BUTTON_INDEX) as PadButton[]) if (held(p, n)) h.add(n);
  const st = applyDeadzone(p.axes[0] ?? 0, p.axes[1] ?? 0);
  const dx = h.has('RIGHT') ? 1 : h.has('LEFT') ? -1 : 0, dy = h.has('DOWN') ? 1 : h.has('UP') ? -1 : 0;
  const move = dx || dy ? snap8(dx, dy) : snap8(st.x, st.y);
  const dirs = new Set<NavDir>();
  const raw = { x: p.axes[0] ?? 0, y: p.axes[1] ?? 0 }; const mag = Math.hypot(raw.x, raw.y);
  if (h.has('UP') || (mag > NAV_THRESHOLD && raw.y < -Math.abs(raw.x) * 0.8)) dirs.add('UP');
  if (h.has('DOWN') || (mag > NAV_THRESHOLD && raw.y > Math.abs(raw.x) * 0.8)) dirs.add('DOWN');
  if (h.has('LEFT') || (mag > NAV_THRESHOLD && raw.x < -Math.abs(raw.y) * 0.8)) dirs.add('LEFT');
  if (h.has('RIGHT') || (mag > NAV_THRESHOLD && raw.x > Math.abs(raw.y) * 0.8)) dirs.add('RIGHT');
  return { move, held: h, dirs };
}

export interface PadSample {
  connected: boolean; id: string | null; move: { x: number; y: number }; held: ReadonlySet<PadButton>;
  /** Buttons that went down since the previous sample (edge, one per press). */
  pressed: ReadonlySet<PadButton>;
  /** Menu directions: fire on push, then repeat after a delay (stick repeat). */
  navPressed: ReadonlySet<NavDir>;
  /** This sample is the first one after a controller was (re)connected / lost. */
  gained: boolean; lost: boolean;
}
const IDLE: PadSample = { connected: false, id: null, move: { x: 0, y: 0 }, held: new Set(), pressed: new Set(), navPressed: new Set(), gained: false, lost: false };

/** Stateful sampler: call once per frame / tick. Picks the first connected pad (a 'standard' mapped pad is preferred) so a reconnect on another index still works. */
export class PadTracker {
  private prev = new Set<PadButton>(); private dirSince = new Map<NavDir, number>(); private dirNext = new Map<NavDir, number>(); private was = false; private lastId: string | null = null;
  constructor(private readonly getPads: () => ArrayLike<PadLike | null | undefined>) {}
  private pick(): PadLike | null {
    let any: PadLike | null = null; const pads = this.getPads();
    for (let i = 0; i < pads.length; i++) { const p = pads[i]; if (p && p.connected) { if (p.mapping === 'standard') return p; any ??= p; } }
    return any;
  }
  sample(nowSeconds: number): PadSample {
    let pad: PadLike | null = null; try { pad = this.pick(); } catch { pad = null; }
    if (!pad) { const lost = this.was; this.was = false; this.prev.clear(); this.dirSince.clear(); this.dirNext.clear(); return lost ? { ...IDLE, lost: true, id: this.lastId } : IDLE; }
    const r = readPad(pad); const pressed = new Set<PadButton>(); for (const b of r.held) if (!this.prev.has(b)) pressed.add(b);
    const gained = !this.was; this.was = true; this.lastId = pad.id ?? `pad-${pad.index}`;
    if (gained) { /* do not treat buttons that are already down at connect time as presses */ this.prev = new Set(r.held); return { connected: true, id: this.lastId, move: r.move, held: r.held, pressed: new Set(), navPressed: new Set(), gained: true, lost: false }; }
    this.prev = new Set(r.held);
    const nav = new Set<NavDir>();
    for (const d of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as NavDir[]) {
      if (!r.dirs.has(d)) { this.dirSince.delete(d); this.dirNext.delete(d); continue; }
      if (!this.dirSince.has(d)) { this.dirSince.set(d, nowSeconds); this.dirNext.set(d, nowSeconds + NAV_REPEAT_DELAY); nav.add(d); }
      else if (nowSeconds >= (this.dirNext.get(d) ?? Infinity)) { this.dirNext.set(d, nowSeconds + NAV_REPEAT_RATE); nav.add(d); }
    }
    return { connected: true, id: this.lastId, move: r.move, held: r.held, pressed, navPressed: nav, gained: false, lost: false };
  }
  reset() { this.prev.clear(); this.dirSince.clear(); this.dirNext.clear(); this.was = false; }
}
export const browserPads = (): ArrayLike<PadLike | null> => (typeof navigator !== 'undefined' && navigator.getGamepads ? (navigator.getGamepads() as unknown as ArrayLike<PadLike | null>) : []);

import { beforeAll, describe, expect, it } from 'vitest';
import { BUTTON_INDEX, NAV_REPEAT_DELAY, NAV_REPEAT_RATE, PadTracker, STICK_DEADZONE, applyDeadzone, readPad, snap8, type PadButton, type PadLike } from '../game/input/gamepadMap';

function pad(over: Partial<PadLike> & { down?: PadButton[]; axes?: number[] } = {}): PadLike {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); for (const b of over.down ?? []) buttons[BUTTON_INDEX[b]] = { pressed: true, value: 1 };
  return { index: over.index ?? 0, connected: over.connected ?? true, mapping: over.mapping ?? 'standard', id: over.id ?? 'Xbox 360 Controller (STANDARD GAMEPAD)', axes: over.axes ?? [0, 0, 0, 0], buttons };
}

describe('deadzone and 8-way snapping', () => {
  it('ignores stick drift below the deadzone and ramps smoothly above it', () => {
    expect(applyDeadzone(0.1, 0.1)).toEqual({ x: 0, y: 0 }); expect(applyDeadzone(STICK_DEADZONE - 0.01, 0)).toEqual({ x: 0, y: 0 });
    expect(applyDeadzone(1, 0).x).toBeCloseTo(1); const a = applyDeadzone(0.4, 0).x, b = applyDeadzone(0.7, 0).x; expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a);
    expect(Math.hypot(applyDeadzone(1, 1).x, applyDeadzone(1, 1).y)).toBeLessThanOrEqual(1.0001); expect(applyDeadzone(Number.NaN, 0)).toEqual({ x: 0, y: 0 });
  });
  it('snaps to exactly the 8 compass directions', () => {
    expect(snap8(1, 0)).toEqual({ x: 1, y: 0 }); expect(snap8(0.2, -0.9)).toEqual({ x: 0, y: -1 }); expect(snap8(0.7, 0.7)).toEqual({ x: 1, y: 1 }); expect(snap8(-0.8, 0.5)).toEqual({ x: -1, y: 1 }); expect(snap8(0, 0)).toEqual({ x: 0, y: 0 });
    for (let d = 0; d < 360; d += 5) { const r = snap8(Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180)); expect([-1, 0, 1]).toContain(r.x); expect([-1, 0, 1]).toContain(r.y); expect(r.x || r.y).toBeTruthy(); }
  });
});

describe('reading one pad', () => {
  it('stick moves in 8 directions inside/outside the deadzone, D-pad overrides the stick', () => {
    expect(readPad(pad({ axes: [0.15, -0.1, 0, 0] })).move).toEqual({ x: 0, y: 0 });
    expect(readPad(pad({ axes: [0.9, 0, 0, 0] })).move).toEqual({ x: 1, y: 0 }); expect(readPad(pad({ axes: [-0.7, -0.7, 0, 0] })).move).toEqual({ x: -1, y: -1 });
    expect(readPad(pad({ down: ['LEFT', 'UP'], axes: [1, 0, 0, 0] })).move).toEqual({ x: -1, y: -1 });
  });
  it('the right stick is reserved: it never moves Kai', () => { expect(readPad(pad({ axes: [0, 0, 1, 1] })).move).toEqual({ x: 0, y: 0 }); });
  it('menu directions need a clear push (drift never moves focus)', () => {
    expect(readPad(pad({ axes: [0.4, 0, 0, 0] })).dirs.size).toBe(0); expect([...readPad(pad({ axes: [0, 0.9, 0, 0] })).dirs]).toEqual(['DOWN']); expect([...readPad(pad({ down: ['RIGHT'] })).dirs]).toEqual(['RIGHT']);
  });
  it('analog triggers count as pressed past half travel', () => { const p = pad(); const bt = p.buttons as { pressed: boolean; value: number }[]; bt[BUTTON_INDEX.RT] = { pressed: false, value: 0.8 }; expect(readPad(p).held.has('RT')).toBe(true); bt[BUTTON_INDEX.RT] = { pressed: false, value: 0.3 }; expect(readPad(p).held.has('RT')).toBe(false); });
});

describe('PadTracker: edges, repeat, disconnect and reconnect', () => {
  const mk = (frames: Array<PadLike | null>) => { let i = 0; const t = new PadTracker(() => [frames[Math.min(i, frames.length - 1)]]); return { t, step: () => { i++; } }; };
  it('a held button gives exactly one press edge; releasing and pressing again gives another', () => {
    const { t, step } = mk([pad(), pad({ down: ['A'] }), pad({ down: ['A'] }), pad({ down: ['A'] }), pad(), pad({ down: ['A'] })]);
    const seq: number[] = []; for (let k = 0; k < 6; k++) { seq.push(t.sample(k * 0.016).pressed.has('A') ? 1 : 0); step(); }
    expect(seq).toEqual([0, 1, 0, 0, 0, 1]);
  });
  it('buttons already down when the pad connects are not presses', () => {
    const { t, step } = mk([pad({ down: ['A', 'START'] }), pad({ down: ['A', 'START'] })]); const a = t.sample(0); step(); const b = t.sample(0.016);
    expect(a.gained).toBe(true); expect(a.pressed.size).toBe(0); expect(b.pressed.size).toBe(0);
  });
  it('stick/D-pad menu repeat: one step on push, none until the delay, then at the repeat rate', () => {
    const t = new PadTracker(() => [pad({ axes: [0, 1, 0, 0] })]); let fires = 0; let first = -1;
    for (let k = 0; k <= 100; k++) { const s = t.sample(k * 0.016); if (s.navPressed.has('DOWN')) { fires++; if (first < 0) first = k; } }
    expect(first).toBe(1); expect(fires).toBeGreaterThan(1 + Math.floor((1.6 - NAV_REPEAT_DELAY) / NAV_REPEAT_RATE) - 3); expect(fires).toBeLessThan(2 + (1.6 - NAV_REPEAT_DELAY) / NAV_REPEAT_RATE);
    const early = new PadTracker(() => [pad({ axes: [0, 1, 0, 0] })]); early.sample(0); expect(early.sample(0.02).navPressed.has('DOWN')).toBe(true); expect(early.sample(0.1).navPressed.size).toBe(0);
  });
  it('disconnection is reported once; reconnection (even on another index) resumes cleanly with no phantom presses', () => {
    const { t, step } = mk([pad({ down: ['A'] }), pad({ down: ['A'] }), null, null, pad({ index: 2, down: ['A'] }), pad({ index: 2 })]);
    const out = []; for (let k = 0; k < 6; k++) { out.push(t.sample(k * 0.016)); step(); }
    expect(out.map(s => s.connected)).toEqual([true, true, false, false, true, true]); expect(out.map(s => s.lost)).toEqual([false, false, true, false, false, false]); expect(out[4].gained).toBe(true); expect(out[4].pressed.size).toBe(0);
    expect(out[2].move).toEqual({ x: 0, y: 0 });
  });
  it('prefers a standard-mapped pad and survives a throwing getGamepads', () => {
    const t = new PadTracker(() => [pad({ index: 0, mapping: '', id: 'Generic' }), pad({ index: 1 })]); expect(t.sample(0).id).toContain('STANDARD');
    const bad = new PadTracker(() => { throw new Error('blocked'); }); expect(bad.sample(0).connected).toBe(false);
  });
  it('non-standard pads still move and press A/X/Y through the fallback indices', () => { const r = readPad(pad({ mapping: '', down: ['A'], axes: [0, -1, 0, 0] })); expect(r.held.has('A')).toBe(true); expect(r.move).toEqual({ x: 0, y: -1 }); });
});

describe('unified InputController: keyboard + controller, one path', () => {
  type Ctor = typeof import('../game/input/InputController').InputController;
  let InputController: Ctor;
  beforeAll(async () => { (globalThis as unknown as { window: object }).window = { addEventListener: () => undefined, removeEventListener: () => undefined }; InputController = (await import('../game/input/InputController')).InputController; });
  const make = (frames: Array<PadLike | null>) => { let i = 0; let paused = 0, lost = 0; const c = new InputController(() => { paused++; }, () => undefined, () => { lost++; }, () => [frames[Math.min(i, frames.length - 1)]]); return { c, next: () => { i++; }, paused: () => paused, lost: () => lost }; };
  it('maps A/X/Y/RB/RT/LB/LT once per press and START to pause', () => {
    const { c, next, paused } = make([pad(), pad({ down: ['A', 'X'] }), pad({ down: ['A', 'X'] }), pad({ down: ['Y', 'RB'] }), pad({ down: ['RT'] }), pad({ down: ['START'] }), pad()]);
    const r = []; for (let k = 0; k < 7; k++) { r.push(c.read()); next(); }
    expect(r[1].dash && r[1].q).toBe(true); expect(r[2].dash || r[2].q).toBe(false);   // held A/X do not repeat
    expect(r[3].f && r[3].beam).toBe(true); expect(r[4].sig).toBe(true); expect(r[4].sphere).toBe(false); expect(paused()).toBe(1);
    expect(r[3].sphere || r[3].dash).toBe(false);
  });
  it('left stick / D-pad drive the movement vector (8-way); the keyboard wins when both are used', () => {
    const { c, next } = make([pad({ axes: [0.9, 0.9, 0, 0] }), pad({ down: ['LEFT'] }), pad({ axes: [0.1, 0.1, 0, 0] })]);
    expect(c.read()).toMatchObject({ x: 1, y: 1 }); next(); expect(c.read()).toMatchObject({ x: -1, y: 0 }); next(); expect(c.read()).toMatchObject({ x: 0, y: 0 });
  });
  it('a controller lost mid-run (after it was used) pauses once; a never-used pad vanishing does not', () => {
    const used = make([pad(), pad({ down: ['A'] }), null, null]); for (let k = 0; k < 4; k++) { used.c.read(); used.next(); } expect(used.lost()).toBe(1);
    const idle = make([pad(), pad(), null, null]); for (let k = 0; k < 4; k++) { idle.c.read(); idle.next(); } expect(idle.lost()).toBe(0);
  });
  it('without any controller the input is the unchanged keyboard-only shape', () => { const { c } = make([null]); expect(c.read()).toEqual({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, beamHeld: false, fHeld: false, sig: false, sigHeld: false, od: false, flyHeld: false }); });
});

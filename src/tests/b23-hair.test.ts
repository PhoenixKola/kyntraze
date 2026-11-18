import { describe, expect, it } from 'vitest';
import { HAIR_MIN, HAIR_STYLE, HairDriver, HairSpring, anchorOf, buildHairMask, hairWeight, warpHead, type HeadAnchor } from '../game/render/hairRig';
import { SIGNATURE } from '../game/render/bodyMotion';
import { existsSync, readFileSync } from 'node:fs';

const W = 80, H = 80, A: HeadAnchor = { cx: 40, cy: 40, r: 12 };
const blank = () => new Uint8ClampedArray(W * H * 4);
const put = (b: Uint8ClampedArray, x: number, y: number, rgb: number[]) => { const o = (y * W + x) * 4; b[o] = rgb[0]; b[o + 1] = rgb[1]; b[o + 2] = rgb[2]; b[o + 3] = 255; };
const at = (b: Uint8ClampedArray, x: number, y: number) => { const o = (y * W + x) * 4; return [b[o], b[o + 1], b[o + 2], b[o + 3]]; };

describe('B23 hair deformation', () => {
  it('weight is 0 inside the face circle (roots never move) and reaches 1 toward the tips', () => {
    expect(hairWeight(40, 40, A, 0.75, 0.9)).toBe(0); expect(hairWeight(40 + 11, 40, A, 0.75, 0.9)).toBe(0);
    expect(hairWeight(40, 40 - 12 - 12, A, 0.75, 0.9)).toBeGreaterThan(0.95);
    expect(hairWeight(40, 40 + 12 * 3, A, 0.75, 0.9)).toBe(0);   // tapers out below the chin line
  });
  const HAIR = [30, 50, 70], SKIN = [200, 150, 100], FIST = [235, 225, 210];
  /** a synthetic head: skin face disc, a hair crown above it with a spike, and a pale fist touching the head's side */
  const head = () => {
    const src = blank();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - 40, (y - 42) * 0.9) < 11) put(src, x, y, SKIN);
    for (let y = 22; y < 36; y++) for (let x = 28; x < 53; x++) if (Math.hypot(x - 40, (y - 36) * 0.9) < 14) put(src, x, y, HAIR);
    for (let y = 8; y < 24; y++) put(src, 40, y, HAIR);
    for (let y = 36; y < 50; y++) for (let x = 56; x < 62; x++) put(src, x, y, FIST);
    return src;
  };
  it('lifts and moves only the hair by the offset; face, root and the fist beside the head stay put', () => {
    const src = head(), dst = new Uint8ClampedArray(src), mask = buildHairMask(src, W, H, A, 0.75, 0.9)!; expect(mask).not.toBeNull();
    warpHead(src, dst, W, H, A, mask, 3, 0, 0.75, 0.9);
    expect(at(dst, 40, 42)).toEqual(at(src, 40, 42)); expect(at(dst, 36, 44)).toEqual(at(src, 36, 44));
    for (let y = 36; y < 50; y++) for (let x = 56; x < 62; x++) expect(at(dst, x, y)).toEqual(at(src, x, y));
    expect(at(dst, 40, 28)).toEqual(at(src, 40, 28));
    expect(at(dst, 43, 9)).toEqual([...HAIR, 255]); expect(at(dst, 40, 9)[3]).toBe(0);
  });
  it('never drags face pixels out into the hair', () => {
    const src = head(), dst = new Uint8ClampedArray(src), mask = buildHairMask(src, W, H, A, 0.75, 0.9)!;
    warpHead(src, dst, W, H, A, mask, -4, -1, 0.75, 0.9);
    let skinOutside = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = at(dst, x, y), q = at(src, x, y); if (p[3] && p[0] === SKIN[0] && !(q[3] && q[0] === SKIN[0])) skinOutside++; }
    expect(skinOutside).toBe(0);
  });
  it('the spring is deterministic, bounded, overshoots and settles', () => {
    const run = () => { const s = new HairSpring(), st = HAIR_STYLE.kai, xs: number[] = []; s.kick(30, 0); for (let i = 0; i < 240; i++) { s.step(1 / 60, 0, 0, st); xs.push(s.x); } return xs; };
    const a = run(), b = run(); expect(a).toEqual(b); expect(Math.max(...a.map(Math.abs))).toBeLessThanOrEqual(HAIR_STYLE.kai.max + 1e-9);
    expect(a.some(v => v > 0.2) && a.some(v => v < -0.1)).toBe(true);   // follow-through: it swings past the rest position
    expect(Math.abs(a[a.length - 1])).toBeLessThan(0.15);
  });
  it('idle hair moves with no input, trails opposite to running, and a paused/frozen driver does not advance', () => {
    const d = new HairDriver(), st = HAIR_STYLE.still, seen: number[] = []; for (let i = 0; i < 600; i++) seen.push(d.update({ dt: 1 / 60, vx: 0, vy: 0, maxSpeed: 250, frozen: false, reduced: false, style: st }).x);
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(HAIR_MIN * 2);
    const r = new HairDriver(); let x = 0; for (let i = 0; i < 90; i++) x = r.update({ dt: 1 / 60, vx: 250, vy: 0, maxSpeed: 250, frozen: false, reduced: false, style: HAIR_STYLE.kai }).x; expect(x).toBeLessThan(-1);
    const f = new HairDriver(); f.update({ dt: 0.1, vx: 0, vy: 0, maxSpeed: 250, frozen: false, reduced: false, style: st }); const before = f.spring.x; for (let i = 0; i < 60; i++) f.update({ dt: 1 / 60, vx: 250, vy: 0, maxSpeed: 250, frozen: true, reduced: false, style: st }); expect(f.spring.x).toBe(before);
  });
  it('every motion style has a hair style; Voidheart hangs lowest and swings widest', () => {
    for (const k of Object.keys(SIGNATURE)) expect(HAIR_STYLE[k as keyof typeof HAIR_STYLE], k).toBeDefined();
    expect(HAIR_STYLE.vex_void.low).toBeGreaterThan(HAIR_STYLE.vex.low); expect(HAIR_STYLE.vex_void.max).toBeGreaterThan(HAIR_STYLE.vex.max);
  });
  it('the shipped anchor table covers all eleven appearances x four facings with a head in most frames', () => {
    const p = new URL('../../public/art/hair-anchors.json', import.meta.url); expect(existsSync(p)).toBe(true);
    const t = JSON.parse(readFileSync(p, 'utf8')) as Record<string, { a: number[] }>;
    for (const pre of ['kai', 'kaif1', 'kaif2', 'kaif3', 'ren', 'renf1', 'sora', 'soraf1', 'vex', 'vexf1', 'vexf2']) for (const d of ['south', 'north', 'east', 'west']) {
      const e = t[`${pre}-${d}-Idle`]; expect(e, `${pre}-${d}-Idle`).toBeDefined(); const n = e.a.length / 3; let ok = 0; for (let i = 0; i < n; i++) if (anchorOf(t as never, `${pre}-${d}-Idle`, i)) ok++;
      expect(ok / n, `${pre}-${d}-Idle head coverage`).toBeGreaterThan(0.8);
    }
  });
});

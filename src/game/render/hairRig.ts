/** B23 living hair. Hair is baked into each hero's head pixels, so it is deformed, not overlaid: every frame the pixels OUTSIDE the face radius are sampled from a spring-driven offset position (a warp whose weight is 0 inside the face circle and grows toward the tips), so the roots stay pinned to the scalp, the tips follow with delay and overshoot, and there is never a second copy of the hair to ghost against.
 *  Face centres / radii per frame come from scripts/b23-hair-anchors.py (public/art/hair-anchors.json). Pure maths (HairSpring, warpHead) is Phaser-free and unit-tested; HairLayer feeds the result to the sprite through one small canvas texture per fighter. */
import type { MotionStyle } from './bodyMotion';

export interface HairStyle {
  /** idle sway amplitude (sheet px; the sheets are drawn at 0.5 scale, so 2 px = 1 game px) */ idle: number; hz: number;
  /** trailing offset at full run speed */ follow: number;
  /** spring stiffness and damping ratio (low zeta = more overshoot / follow-through) */ k: number; zeta: number;
  /** clamp */ max: number;
  /** impulse on a cast release / hurt */ kick: number;
  /** how far below the face centre the hair may move (in face radii: Voidheart's long hair hangs lower) and how far out the weight ramps */ low: number; ramp: number;
}
export const HAIR_STYLE: Record<MotionStyle, HairStyle> = {
  kai:      { idle: 1.2, hz: 0.42, follow: 3.0, k: 70, zeta: 0.42, max: 3.6, kick: 1.6, low: 0.75, ramp: 0.9 },
  flare:    { idle: 1.8, hz: 0.62, follow: 3.4, k: 85, zeta: 0.34, max: 4.2, kick: 2.2, low: 0.75, ramp: 0.9 },
  comet:    { idle: 1.5, hz: 0.9, follow: 3.8, k: 130, zeta: 0.3, max: 4.6, kick: 3.0, low: 0.75, ramp: 0.8 },
  still:    { idle: 2.1, hz: 0.28, follow: 2.6, k: 26, zeta: 0.28, max: 4.4, kick: 1.4, low: 0.8, ramp: 1.0 },
  ren:      { idle: 1.0, hz: 0.38, follow: 2.5, k: 62, zeta: 0.5, max: 3.2, kick: 1.8, low: 0.75, ramp: 0.9 },
  ren_asc:  { idle: 1.6, hz: 0.6, follow: 3.6, k: 100, zeta: 0.32, max: 4.4, kick: 2.8, low: 0.75, ramp: 0.8 },
  sora:     { idle: 1.1, hz: 0.45, follow: 2.8, k: 78, zeta: 0.45, max: 3.4, kick: 1.5, low: 0.75, ramp: 0.9 },
  sora_sov: { idle: 2.0, hz: 0.32, follow: 3.0, k: 30, zeta: 0.3, max: 4.6, kick: 1.6, low: 0.8, ramp: 1.0 },
  vex:      { idle: 1.1, hz: 0.4, follow: 2.8, k: 66, zeta: 0.46, max: 3.4, kick: 1.7, low: 0.75, ramp: 0.9 },
  vex_rift: { idle: 1.6, hz: 0.55, follow: 3.4, k: 90, zeta: 0.34, max: 4.2, kick: 2.4, low: 0.75, ramp: 0.8 },
  vex_void: { idle: 2.8, hz: 0.3, follow: 4.6, k: 22, zeta: 0.24, max: 6.0, kick: 2.2, low: 1.9, ramp: 1.3 },
};

/** Second-order spring on both axes. Semi-implicit Euler in fixed sub-steps so large frame times stay stable. */
export class HairSpring {
  x = 0; y = 0; vx = 0; vy = 0; private t = 0;
  step(dt: number, tx: number, ty: number, st: HairStyle) {
    if (dt <= 0) return; this.t += dt;
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n, c = 2 * st.zeta * Math.sqrt(st.k);
    for (let i = 0; i < n; i++) { this.vx += (st.k * (tx - this.x) - c * this.vx) * h; this.vy += (st.k * (ty - this.y) - c * this.vy) * h; this.x += this.vx * h; this.y += this.vy * h; }
    this.x = Math.max(-st.max, Math.min(st.max, this.x)); this.y = Math.max(-st.max * 0.6, Math.min(st.max * 0.6, this.y));
  }
  kick(ix: number, iy: number) { this.vx += ix; this.vy += iy; }
  get time() { return this.t; }
  reset() { this.x = this.y = this.vx = this.vy = 0; }
}
export interface HairIn { dt: number; vx: number; vy: number; maxSpeed: number; frozen: boolean; reduced: boolean; style: HairStyle; released?: boolean; hurt?: boolean; hurtDir?: number; dead?: boolean }
export class HairDriver {
  readonly spring = new HairSpring(); private wasRel = false;
  update(i: HairIn): { x: number; y: number } {
    if (i.dead) { this.spring.reset(); this.wasRel = false; return { x: 0, y: 0 }; }
    const st = i.style, amp = i.reduced ? 0.5 : 1, dt = i.frozen ? 0 : Math.min(0.1, Math.max(0, i.dt)), s = this.spring, norm = Math.max(1, i.maxSpeed);
    if (dt > 0) {
      if (i.released && !this.wasRel) s.kick(st.kick * 14 * amp, -st.kick * 5 * amp); if (i.hurt) s.kick((i.hurtDir ?? 1) * st.kick * 18 * amp, -st.kick * 4 * amp);
      const t = s.time, tx = (-(i.vx / norm) * st.follow + Math.sin(t * 6.2832 * st.hz) * st.idle) * amp, ty = (-(i.vy / norm) * st.follow * 0.55 + Math.sin(t * 6.2832 * st.hz * 1.7 + 1.3) * st.idle * 0.45) * amp;
      s.step(dt, tx, ty, { ...st, max: st.max * amp });
    }
    this.wasRel = !!i.released; return { x: s.x, y: s.y };
  }
}

/** Frame data for one head: face centre and radius in frame pixels (r = 0: unknown, leave the frame alone). */
export interface HeadAnchor { cx: number; cy: number; r: number }
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Weight of the deformation at a pixel: 0 inside the face circle (roots / scalp / face never move), ramping to 1 toward the tips, tapering out below the chin line. */
export function hairWeight(x: number, y: number, a: HeadAnchor, low: number, ramp: number): number {
  const d = Math.hypot(x - a.cx, (y - a.cy) * 0.9), t = Math.min(1, Math.max(0, (d - a.r) / (a.r * ramp)));
  const below = Math.min(1, Math.max(0, (y - (a.cy + a.r * low)) / (a.r * 0.5)));
  return smooth(t) * (1 - smooth(below));
}
/** Bounding box (frame px) that the warp can touch. */
export function hairBox(a: HeadAnchor, w: number, h: number, low: number, ramp: number) {
  const x0 = Math.max(0, Math.floor(a.cx - a.r * (1 + ramp + 1.6))), x1 = Math.min(w, Math.ceil(a.cx + a.r * (1 + ramp + 1.6)));
  const y0 = Math.max(0, Math.floor(a.cy - a.r * (1 + ramp + 1.6))), y1 = Math.min(h, Math.ceil(a.cy + a.r * (low + 0.6)));
  return { x0, y0, x1, y1 };
}
const isSkin = (r: number, g: number, b: number) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (mx < 97 || mx > 247 || d === 0) return false;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h < 0 ? h + 6 : h) * 60; const sat = d / mx; return h > 12 && h < 42 && sat > 0.26 && sat < 0.78;
};
export interface HairMask { x0: number; y0: number; bw: number; bh: number; m: Uint8Array }
/** Which pixels of the head box are hair: the crown's own colours (non-skin, non-outline bins seen above the brow) flood-filled from the scalp, so a raised fist, collar or gauntlet next to the head is never dragged along. Dark outline pixels touching the hair join it. Null = no reliable crown. */
export function buildHairMask(src: Uint8ClampedArray, w: number, h: number, a: HeadAnchor, low: number, ramp: number): HairMask | null {
  const { x0, y0, x1, y1 } = hairBox(a, w, h, low, ramp), bw = x1 - x0, bh = y1 - y0; if (bw <= 0 || bh <= 0) return null;
  const seeds: number[] = [], hist = new Map<number, number>(); let total = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const o = (y * w + x) * 4; if (src[o + 3] < 128) continue; const d = Math.hypot(x - a.cx, (y - a.cy) * 0.9);
    if (d < a.r * 0.9 || d > a.r * (2 + ramp) || y > a.cy - a.r * 0.5) continue; const r = src[o], g = src[o + 1], b = src[o + 2]; if (isSkin(r, g, b)) continue;
    seeds.push(x, y); if (0.299 * r + 0.587 * g + 0.114 * b < 44) continue; const k = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4); hist.set(k, (hist.get(k) ?? 0) + 1); total++;
  }
  if (seeds.length < 24 || total < 8) return null;
  const pal = [...hist.entries()].sort((p, q) => q[1] - p[1]).slice(0, 10).filter(e => e[1] >= Math.max(2, total * 0.03)).map(e => [((e[0] >> 8) & 15) * 16 + 8, ((e[0] >> 4) & 15) * 16 + 8, (e[0] & 15) * 16 + 8]);
  const ylim = a.cy + a.r * (low - 0.3), m = new Uint8Array(bw * bh), idx = (x: number, y: number) => (y - y0) * bw + (x - x0);
  const like = (x: number, y: number) => { const o = (y * w + x) * 4; if (src[o + 3] < 128) return false; const r = src[o], g = src[o + 1], b = src[o + 2]; if (isSkin(r, g, b)) return false; for (const c of pal) if ((c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2 < 900) return true; return false; };
  const q: number[] = [];
  for (let i = 0; i < seeds.length; i += 2) { const x = seeds[i], y = seeds[i + 1]; if (y < ylim && !m[idx(x, y)] && like(x, y)) { m[idx(x, y)] = 1; q.push(x, y); } }
  for (let h2 = 0; h2 < q.length; h2 += 2) {
    const x = q[h2], y = q[h2 + 1];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= x0 && nx < x1 && ny >= y0 && ny < y1 && ny < ylim && !m[idx(nx, ny)] && like(nx, ny)) { m[idx(nx, ny)] = 1; q.push(nx, ny); } }
  }
  const base = m.slice();
  for (let y = y0; y < Math.min(y1, Math.ceil(ylim)); y++) for (let x = x0; x < x1; x++) {
    if (base[idx(x, y)]) continue; const o = (y * w + x) * 4; if (src[o + 3] < 128 || 0.299 * src[o] + 0.587 * src[o + 1] + 0.114 * src[o + 2] >= 70) continue;
    if ((x > x0 && base[idx(x - 1, y)]) || (x < x1 - 1 && base[idx(x + 1, y)]) || (y > y0 && base[idx(x, y - 1)]) || (y < y1 - 1 && base[idx(x, y + 1)])) m[idx(x, y)] = 1;
  }
  return { x0, y0, bw, bh, m };
}
/** Skins the hair: hair pixels outside the roots are lifted off, then every pixel outside the face circle takes the hair pixel that the offset field carries onto it (the field is solved with the geometric weight, tested against the mask at the source). `dst` must start as a copy of `src`; only the box is written. */
export function warpHead(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, a: HeadAnchor, mask: HairMask, dx: number, dy: number, low: number, ramp: number) {
  const { x0, y0, bw, bh, m } = mask, face = a.r * 0.98;
  for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) if (m[(y - y0) * bw + (x - x0)] && hairWeight(x, y, a, low, ramp) > 0.001) dst[(y * w + x) * 4 + 3] = 0;
  for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) {
    if (Math.hypot(x - a.cx, (y - a.cy) * 0.9) < face) continue;
    let qx = x, qy = y;
    for (let i = 0; i < 3; i++) { const wv = hairWeight(Math.min(w - 1, Math.max(0, Math.round(qx)), ), Math.min(h - 1, Math.max(0, Math.round(qy))), a, low, ramp); qx = x - dx * wv; qy = y - dy * wv; }
    const sx = Math.round(qx), sy = Math.round(qy); if (sx < x0 || sx >= x0 + bw || sy < y0 || sy >= y0 + bh) continue;
    if (!m[(sy - y0) * bw + (sx - x0)] || hairWeight(sx, sy, a, low, ramp) <= 0.001) continue;
    const o = (y * w + x) * 4, s2 = (sy * w + sx) * 4; dst[o] = src[s2]; dst[o + 1] = src[s2 + 1]; dst[o + 2] = src[s2 + 2]; dst[o + 3] = src[s2 + 3];
  }
}

export interface HairTable { [textureKey: string]: { fw: number; fh: number; a: number[] } }
export const HAIR_ANCHORS_KEY = 'hair-anchors';
export const anchorOf = (table: HairTable | undefined, key: string, frame: number): HeadAnchor | null => { const e = table?.[key], i = frame * 3; if (!e || i + 2 >= e.a.length || e.a[i + 2] <= 0) return null; return { cx: e.a[i], cy: e.a[i + 1], r: e.a[i + 2] }; };
/** Offsets below this many sheet px are not worth a texture upload (the original frame is used). */
export const HAIR_MIN = 0.3;

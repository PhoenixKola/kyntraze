/** B23: one visual signature per B22 entry (24 branches, 12 legendaries, 8 relics, 6 pair attacks, 4 ultimates). The sim emits the entry's own id at the effect's real position/radius (BranchSystem.updateFx / zoneFx); the renderer looks the id up here and draws that entry's shape. The two branches of one skill differ in SHAPE and rhythm, not just colour. Pure drawing on a Graphics-like surface (no Phaser import) so it is unit-testable. Decorative only: collision geometry is drawn elsewhere. */
export type Shape = 'quake' | 'cone' | 'prism' | 'flames' | 'star' | 'twin' | 'chain' | 'shatter' | 'relay' | 'burst' | 'rain' | 'crater' | 'spiral' | 'lanes' | 'meridian' | 'dots' | 'implode' | 'shield' | 'mirror' | 'slash' | 'eclipse' | 'marks' | 'judgment' | 'sigil' | 'dawn' | 'hourglass' | 'rift' | 'compass' | 'lens' | 'feather' | 'dragon' | 'ring';
export interface Signature { shape: Shape; color: number; hot: number; n: number; dur: number }
const KAI = [0xffb347, 0xfff0b0], REN = [0xff4a3a, 0xffc060], SORA = [0x59b8ff, 0xe6fbff], VEX = [0xa070ff, 0xf0dcff];
const S = (shape: Shape, c: number[], n = 6, dur = 0.5): Signature => ({ shape, color: c[0], hot: c[1], n, dur });
export const SIGNATURES: Record<string, Signature> = {
  seismic_impact: S('quake', KAI, 2, 0.55), pressure_wave: S('cone', KAI, 5, 0.4), prism_conductor: S('prism', KAI, 3, 0.35), burning_wake: S('flames', KAI, 7, 0.6), starfall_bloom: S('star', KAI, 8, 0.6), twin_nova: S('twin', KAI, 2, 0.6),
  relentless_chain: S('chain', REN, 5, 0.35), crimson_guardbreak: S('shatter', REN, 9, 0.5), bloodline_relay: S('relay', REN, 3, 0.35), meteor_collision: S('burst', REN, 12, 0.5), red_comet_rain: S('rain', REN, 6, 0.55), crimson_crater: S('crater', REN, 10, 0.7),
  needle_spiral: S('spiral', SORA, 3, 0.5), stormline_array: S('lanes', SORA, 4, 0.4), piercing_meridian: S('meridian', SORA, 1, 0.4), celestial_prism: S('prism', SORA, 5, 0.45), starfield_array: S('dots', SORA, 12, 0.6), celestial_collapse: S('implode', SORA, 3, 0.6),
  reversal_guard: S('shield', VEX, 1, 0.45), mirror_counter: S('mirror', VEX, 2, 0.4), shadow_riposte: S('slash', VEX, 2, 0.3), eclipse_shift: S('eclipse', VEX, 1, 0.55), marked_detonation: S('marks', VEX, 4, 0.5), severance_judgment: S('judgment', VEX, 1, 0.6),
  solar_rupture: S('flames', [0xffd070, 0xffffff], 11, 0.8), dragon_overture: S('dragon', [0xffc24a, 0xfff6c8], 5, 0.7), nova_constellation: S('star', [0xffe08a, 0xffffff], 12, 0.8),
  crimson_relay: S('relay', [0xff5a3a, 0xffd0a0], 5, 0.45), meteor_crucible: S('crater', [0xff7a3a, 0xffe0a0], 8, 0.7), bloodstar_rupture: S('shatter', [0xff3030, 0xffb090], 12, 0.7),
  blue_needle_storm: S('spiral', [0x4db8ff, 0xffffff], 6, 0.6), prismatic_meridian: S('meridian', [0x9fe8ff, 0xffffff], 3, 0.5), zero_convergence: S('implode', [0x7fd0ff, 0xffffff], 6, 0.7),
  shard_requiem: S('marks', [0xc09aff, 0xffffff], 7, 0.6), oathbreaker_chain: S('chain', [0xb080ff, 0xf6e8ff], 7, 0.5), null_waltz: S('eclipse', [0x9aa5b4, 0xffffff], 3, 0.6),
  halo_prism: S('prism', [0xb8f0ff, 0xffffff], 3, 0.3), prism: S('prism', [0xb8f0ff, 0xffffff], 3, 0.3), anchor_of_dawn: S('dawn', [0xffd070, 0xfff6d0], 1, 0.7), dawn_ring: S('dawn', [0xffd070, 0xfff6d0], 1, 0.7),
  crownless_sigil: S('sigil', [0xffe08a, 0xffffff], 6, 0.4), sigil_strike: S('sigil', [0xffe08a, 0xffffff], 6, 0.4), skyforge_feather: S('feather', [0xfff0b0, 0xffffff], 4, 0.4), feather: S('feather', [0xfff0b0, 0xffffff], 4, 0.4),
  void_hourglass: S('hourglass', [0x8a8fb8, 0xd8dcf0], 1, 0.7), hourglass: S('hourglass', [0x8a8fb8, 0xd8dcf0], 1, 0.7), echo_lens: S('lens', [0x7fe0e8, 0xffffff], 2, 0.5), echo_warn: S('lens', [0x7fe0e8, 0xffffff], 2, 0.5),
  rift_key: S('rift', [0xb18cff, 0xffffff], 5, 0.5), rift: S('rift', [0xb18cff, 0xffffff], 5, 0.5), paradox_compass: S('compass', [0x9fe6e0, 0xffffff], 4, 0.35), bearing: S('compass', [0x9fe6e0, 0xffffff], 4, 0.35),
  pair_dragonfall: S('dragon', [0xff8a3a, 0xffe6b0], 7, 0.9), pair_convergence: S('implode', [0xffd070, 0x9fe8ff], 4, 0.9), pair_singularity: S('spiral', [0xff5a3a, 0x59b8ff], 5, 0.9),
  pair_oath: S('judgment', [0xffb347, 0xa070ff], 2, 0.9), pair_ruinbreaker: S('crater', [0xff4a3a, 0xa070ff], 10, 0.9), pair_eclipse: S('eclipse', [0x59b8ff, 0xa070ff], 2, 0.9),
  reveal_flare: S('flames', [0xffa21c, 0xfff1a0], 11, 0.9), reveal_comet: S('shatter', [0xffd12a, 0xffffff], 14, 0.7), reveal_still: S('implode', [0xc9d6ee, 0xffffff], 3, 1.1), reveal_ren: S('burst', [0xff3a2a, 0xffc060], 12, 0.8), reveal_sora: S('meridian', [0x35c2ff, 0xe6fbff], 5, 0.9), reveal_vex1: S('rift', [0xa06af0, 0xf0dcff], 6, 0.8), reveal_vex2: S('eclipse', [0x7d8896, 0xeef3fa], 3, 1.1),
  finisher_flare: S('star', [0xffa21c, 0xfff1a0], 10, 0.8), finisher_comet: S('dragon', [0xffd12a, 0xffffff], 7, 0.8), finisher_still: S('lens', [0xc9d6ee, 0xffffff], 2, 0.9), finisher_ren: S('crater', [0xff3a2a, 0xffc060], 12, 0.8), finisher_sora: S('prism', [0x35c2ff, 0xe6fbff], 6, 0.8), finisher_vex1: S('marks', [0xa06af0, 0xf0dcff], 6, 0.8), finisher_vex2: S('judgment', [0x7d8896, 0xeef3fa], 3, 0.9),
  ult_kai: S('dragon', [0xffc24a, 0xffffff], 9, 1.0), ult_ren: S('crater', [0xff3a2a, 0xffd0a0], 14, 1.0), ult_sora: S('meridian', [0x59b8ff, 0xffffff], 5, 1.0), ult_vex: S('judgment', [0xa070ff, 0xffffff], 5, 1.0),
};
export const signatureOf = (id: string): Signature | null => SIGNATURES[id] ?? null;
/** The subset of Phaser.GameObjects.Graphics used here. */
export interface Pen { lineStyle(w: number, c: number, a?: number): unknown; fillStyle(c: number, a?: number): unknown; strokeCircle(x: number, y: number, r: number): unknown; fillCircle(x: number, y: number, r: number): unknown; strokeEllipse(x: number, y: number, w: number, h: number): unknown; beginPath(): unknown; moveTo(x: number, y: number): unknown; lineTo(x: number, y: number): unknown; strokePath(): unknown; fillTriangle(a: number, b: number, c: number, d: number, e: number, f: number): unknown }
const TAU = Math.PI * 2;
const line = (g: Pen, x0: number, y0: number, x1: number, y1: number) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokePath(); };
const rays = (g: Pen, x: number, y: number, r0: number, r1: number, n: number, rot: number) => { for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; line(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1); } };
/** Draws one signature at (x, y). `r` is the effect's real radius, `u` the 0..1 progress, `ang` a facing for directional shapes, (x2, y2) the far end of a line/relay when the event has one. */
export function drawSignature(g: Pen, sig: Signature, x: number, y: number, r: number, u: number, o: { reduced?: boolean; ang?: number; x2?: number; y2?: number; seed?: number } = {}) {
  const a = 1 - u, e = 1 - (1 - u) ** 2, R = r * (0.25 + 0.75 * e), ang = o.ang ?? 0, k = sig.n, rot = (o.seed ?? 0) * 0.37, c = sig.color, h = sig.hot;
  const thin = (w = 2) => g.lineStyle(w * a + 1, c, a), hot = (w = 2) => g.lineStyle(w * a + 1, h, a);
  switch (sig.shape) {
    case 'quake': thin(5); g.strokeEllipse(x, y, R * 2, R * 1.1); hot(2); g.strokeEllipse(x, y, R * 1.4, R * 0.75); break;
    case 'cone': thin(4); for (let i = -2; i <= 2; i++) { const t = ang + i * 0.22; line(g, x + Math.cos(t) * R * 0.3, y + Math.sin(t) * R * 0.3, x + Math.cos(t) * R, y + Math.sin(t) * R); } break;
    case 'prism': { thin(3); const s = R * 0.6; line(g, x, y - s, x - s * 0.87, y + s * 0.5); line(g, x - s * 0.87, y + s * 0.5, x + s * 0.87, y + s * 0.5); line(g, x + s * 0.87, y + s * 0.5, x, y - s); hot(1); rays(g, x, y, R * 0.5, R * 0.9, k, rot); break; }
    case 'flames': thin(3); for (let i = 0; i < k; i++) { const fx = x + (i / Math.max(1, k - 1) - 0.5) * R * 1.6, fh = R * (0.35 + 0.35 * ((i * 7) % 3) / 2) * e; line(g, fx, y, fx + Math.sin(i + u * 6) * 5, y - fh); } break;
    case 'star': thin(2); rays(g, x, y, R * 0.15, R, k, rot + u); hot(2); g.strokeCircle(x, y, R * 0.3); break;
    case 'twin': thin(4); g.strokeCircle(x - R * 0.28, y, R * 0.7); hot(3); g.strokeCircle(x + R * 0.28, y, R * 0.7 * (0.6 + 0.4 * u)); break;
    case 'chain': thin(3); for (let i = 0; i < k; i++) { const t = rot + i * 1.1, px = x + Math.cos(t) * R * 0.55, py = y + Math.sin(t) * R * 0.4; g.strokeCircle(px, py, 5); if (i) line(g, px, py, x + Math.cos(t - 1.1) * R * 0.55, y + Math.sin(t - 1.1) * R * 0.4); } break;
    case 'shatter': thin(3); rays(g, x, y, R * 0.2, R, k, rot); hot(1); rays(g, x, y, R * 0.55, R * 1.05, k, rot + 0.2); break;
    case 'relay': thin(3); if (o.x2 !== undefined) { line(g, x, y, o.x2, o.y2 ?? y); g.strokeCircle(o.x2, o.y2 ?? y, 8 + 10 * u); } g.strokeCircle(x, y, 8 + 14 * u); hot(1); g.strokeCircle(x, y, 4); break;
    case 'burst': thin(5); g.strokeCircle(x, y, R); hot(2); rays(g, x, y, R * 0.4, R * 1.1, k, rot); break;
    case 'rain': thin(3); for (let i = 0; i < k; i++) { const px = x + (i - k / 2) * R * 0.25, py = y - R * 0.9 * (1 - e) + (i % 2) * 6; line(g, px - 8, py - 22, px, py); } hot(2); g.strokeEllipse(x, y + 4, R * e, R * 0.5 * e); break;
    case 'crater': thin(6); g.strokeEllipse(x, y, R * 2, R * 1.2); hot(2); for (let i = 0; i < k; i++) { const t = rot + (i / k) * TAU; line(g, x + Math.cos(t) * R, y + Math.sin(t) * R * 0.6, x + Math.cos(t) * R * 1.2, y + Math.sin(t) * R * 0.72); } break;
    case 'spiral': { thin(3); g.beginPath(); for (let i = 0; i <= 28; i++) { const t = (i / 28) * TAU * 1.6 + u * 5 + rot, rr = R * (i / 28), px = x + Math.cos(t) * rr, py = y + Math.sin(t) * rr * 0.8; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.strokePath(); break; }
    case 'lanes': thin(2); for (let i = -1; i <= 1; i++) line(g, x - Math.sin(ang) * i * 14 - Math.cos(ang) * R * 0.4, y + Math.cos(ang) * i * 14 - Math.sin(ang) * R * 0.4, x - Math.sin(ang) * i * 14 + Math.cos(ang) * R, y + Math.cos(ang) * i * 14 + Math.sin(ang) * R); break;
    case 'meridian': thin(3); if (o.x2 !== undefined) line(g, x, y, o.x2, o.y2 ?? y); else line(g, x - R, y, x + R, y); hot(1); g.strokeCircle(x, y, 6 + 10 * u); break;
    case 'dots': g.fillStyle(c, a); for (let i = 0; i < k; i++) { const t = rot + i * 2.4, rr = R * (0.2 + 0.8 * ((i * 5) % k) / k); g.fillCircle(x + Math.cos(t) * rr, y + Math.sin(t) * rr * 0.8, 2.5 * a + 1); } break;
    case 'implode': thin(4); g.strokeCircle(x, y, r * (1 - 0.8 * e)); hot(2); g.strokeCircle(x, y, r * (0.7 - 0.6 * e)); break;
    case 'shield': thin(5); for (let i = -3; i <= 3; i++) { const t = ang + i * 0.2; line(g, x + Math.cos(t) * R * 0.8, y + Math.sin(t) * R * 0.8, x + Math.cos(t + 0.2) * R * 0.8, y + Math.sin(t + 0.2) * R * 0.8); } break;
    case 'mirror': thin(3); line(g, x - R * 0.5, y - R * 0.5, x + R * 0.5, y + R * 0.5); hot(2); line(g, x + R * 0.5, y - R * 0.5, x - R * 0.5, y + R * 0.5); break;
    case 'slash': thin(5); line(g, x - R * 0.6, y + R * 0.3, x + R * 0.6, y - R * 0.3); hot(2); line(g, x - R * 0.4, y + R * 0.4, x + R * 0.4, y - R * 0.1); break;
    case 'eclipse': g.fillStyle(0x05060a, 0.55 * a); g.fillCircle(x, y, R * 0.5); thin(4); g.strokeCircle(x, y, R * 0.6); hot(2); g.strokeCircle(x, y, R * 0.75); break;
    case 'marks': thin(3); for (let i = 0; i < k; i++) { const t = rot + (i / k) * TAU, px = x + Math.cos(t) * R * 0.6, py = y + Math.sin(t) * R * 0.45; line(g, px - 6, py - 6, px + 6, py + 6); line(g, px + 6, py - 6, px - 6, py + 6); } break;
    case 'judgment': thin(4); line(g, x, y - R * 1.4 * e, x, y + 4); hot(2); g.strokeEllipse(x, y + 4, R * 1.2, R * 0.6); break;
    case 'sigil': thin(2); g.strokeCircle(x, y, R * 0.5); rays(g, x, y, R * 0.5, R * 0.7, k, rot + u * 2); break;
    case 'dawn': thin(5); g.strokeEllipse(x, y + 6, R * 2, R * 1.1); hot(2); g.strokeEllipse(x, y + 6, R * 1.3, R * 0.7); break;
    case 'hourglass': { thin(3); const s = R * 0.35; line(g, x - s, y - s, x + s, y - s); line(g, x + s, y - s, x - s, y + s); line(g, x - s, y + s, x + s, y + s); line(g, x - s, y - s, x + s, y + s); hot(1); g.strokeCircle(x, y, R * 0.7); break; }
    case 'rift': thin(3); line(g, x - R * 0.5, y - R * 0.2, x, y + R * 0.1); line(g, x, y + R * 0.1, x + R * 0.5, y - R * 0.3); hot(1); line(g, x - R * 0.3, y + R * 0.2, x + R * 0.3, y + R * 0.3); break;
    case 'compass': thin(3); line(g, x, y - R * 0.6, x, y + R * 0.6); line(g, x - R * 0.6, y, x + R * 0.6, y); hot(1); g.fillStyle(h, a); g.fillTriangle(x, y - R * 0.75, x - 5, y - R * 0.5, x + 5, y - R * 0.5); break;
    case 'lens': thin(3); g.strokeEllipse(x, y, R * 1.2, R * 0.6); hot(2); g.strokeCircle(x, y, R * 0.18); break;
    case 'feather': thin(3); line(g, x - R * 0.5, y + R * 0.3, x + R * 0.6, y - R * 0.5); hot(1); for (let i = 1; i < 4; i++) line(g, x - R * 0.5 + i * R * 0.27, y + R * 0.3 - i * R * 0.2, x - R * 0.5 + i * R * 0.27 - 8, y + R * 0.3 - i * R * 0.2 - 10); break;
    case 'dragon': { thin(5); g.beginPath(); for (let i = 0; i <= 20; i++) { const t = i / 20, px = x - R + t * R * 2, py = y + Math.sin(t * 9 + u * 8) * R * 0.18 * (1 - t * 0.5); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.strokePath(); hot(2); rays(g, x + R, y, 4, R * 0.3, k, ang); break; }
    default: thin(4); g.strokeCircle(x, y, R);
  }
}

/** B23 reveal accents at the commit: one local floor light (radius px, alpha) and one small camera accent per form. Stillfire gets a light and NO shake (its reveal is deliberately quiet); nothing here lengthens or freezes anything. Reduced Effects skips the camera part. */
export interface RevealAccent { light: { r: number; a: number; life: number }; shake: number; shakeMs: number; flash?: { rgb: [number, number, number]; ms: number } }
export const REVEAL_ACCENT: Record<string, RevealAccent> = {
  reveal_flare: { light: { r: 260, a: 0.5, life: 0.8 }, shake: 0.0022, shakeMs: 110, flash: { rgb: [255, 200, 120], ms: 90 } },
  reveal_comet: { light: { r: 300, a: 0.6, life: 0.7 }, shake: 0.0045, shakeMs: 170, flash: { rgb: [255, 235, 160], ms: 110 } },
  reveal_still: { light: { r: 280, a: 0.35, life: 1.4 }, shake: 0, shakeMs: 0 },
  reveal_ren: { light: { r: 290, a: 0.55, life: 0.8 }, shake: 0.004, shakeMs: 150, flash: { rgb: [255, 120, 90], ms: 100 } },
  reveal_sora: { light: { r: 280, a: 0.5, life: 0.9 }, shake: 0.001, shakeMs: 90, flash: { rgb: [170, 225, 255], ms: 120 } },
  reveal_vex1: { light: { r: 250, a: 0.45, life: 0.8 }, shake: 0.0028, shakeMs: 120 },
  reveal_vex2: { light: { r: 260, a: 0.4, life: 1.2 }, shake: 0, shakeMs: 0 },
};

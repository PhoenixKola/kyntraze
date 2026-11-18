/** B22 contour energy: a custom Phaser 4 filter that traces the CURRENT rendered silhouette with a crisp, flowing multi-tone edge (dark outer line, saturated body colour, travelling hot highlights and short attached sparks). One shader, per-form palettes; no trails, no floating pieces. */
import Phaser from 'phaser';

const FRAG = [
  '#pragma phaserTemplate(shaderName)',
  '#pragma phaserTemplate(fragmentDefine)',
  'precision mediump float;',
  'uniform sampler2D uMainSampler;',
  'varying vec2 outTexCoord;',
  'uniform vec2 resolution; uniform float time; uniform float flow; uniform float power; uniform float jag; uniform float sparks;',
  'uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;',
  '#pragma phaserTemplate(fragmentHeader)',
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  'float aa(vec2 o) { return boundedSampler(uMainSampler, outTexCoord + o / resolution).a; }',
  'float ring(float r) { float m = 0.0; for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398; m = max(m, aa(vec2(cos(a), sin(a)) * r)); } return m; }',
  'void main () {',
  '  vec4 col = boundedSampler(uMainSampler, outTexCoord);',
  '  float n1 = max(ring(1.0), ring(2.0)), n2 = max(ring(3.0), ring(4.0)), n3 = max(ring(5.0), ring(6.5));',
  '  vec2 px = outTexCoord * resolution;',
  '  float u = px.y * 0.045 + px.x * 0.02;',
  '  float w1 = 0.5 + 0.5 * sin(u * 6.2831 - time * flow);',
  '  float w2 = 0.5 + 0.5 * sin(u * (17.0 + jag * 14.0) + time * flow * 1.7 + 2.0 * sin(time * 0.7));',
  '  float hot = smoothstep(0.72, 0.98, w1 * w2 * 1.35 + 0.1 * jag * hash(floor(px / 3.0) + floor(time * 14.0)));',
  '  float inner = (col.a > 0.5 && min(min(aa(vec2(2.0, 0.0)), aa(vec2(-2.0, 0.0))), min(aa(vec2(0.0, 2.0)), aa(vec2(0.0, -2.0)))) < 0.5) ? 1.0 : 0.0;',
  '  vec3 base = mix(c2, c3, hot);',
  '  vec4 outc = col;',
  '  if (col.a < 0.5) {',
  '    if (n1 > 0.5) { vec3 e = mix(c1, base, 0.45 + 0.55 * w1); e = mix(e, c3, hot * 0.8); outc = vec4(e * power, power); }',
  '    else if (n2 > 0.5) { vec3 e = mix(c1, c2, w1) * (0.7 + 0.5 * hot); outc = vec4(e * 0.85 * power, 0.85 * power); }',
  '    else if (n3 > 0.5) { float h = hash(floor(px / 3.0) + floor(time * 9.0)); float on = step(1.0 - 0.09 * sparks, h) * step(0.5, w2); float glow = 0.3 * (0.5 + 0.5 * w1); vec3 e = mix(c1 * glow, c3, on); float al = max(glow * 0.6, on * 0.95) * power; outc = vec4(e * power * max(on, 0.6), al); }',
  '  } else if (inner > 0.5) { outc = vec4(mix(col.rgb, base, 0.55 * power) * col.a, col.a); }',
  '  gl_FragColor = outc;',
  '}',
].join('\n');

interface Palette { c1: number[]; c2: number[]; c3: number[]; flow: number; jag: number; sparks: number }
const rgb = (h: number) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
/** Edge parameters for one moment of play: how strong, how fast it flows, how rough and spark-laden it is. All eased by the renderer (never stepped), so the outline cannot strobe. */
export interface EdgeState { power: number; flowMul: number; jagAdd: number; sparkAdd: number }
export const EDGE_STATES: Record<'idle' | 'moving' | 'dash' | 'charge' | 'release' | 'settle', EdgeState> = {
  idle: { power: 0.82, flowMul: 0.8, jagAdd: 0, sparkAdd: 0 }, moving: { power: 0.95, flowMul: 1.15, jagAdd: 0.05, sparkAdd: 0.05 }, dash: { power: 1.05, flowMul: 1.9, jagAdd: 0.25, sparkAdd: 0.25 },
  charge: { power: 0.95, flowMul: 1.5, jagAdd: 0.1, sparkAdd: 0.3 }, release: { power: 1.12, flowMul: 2.2, jagAdd: 0.35, sparkAdd: 0.45 }, settle: { power: 0.9, flowMul: 1.0, jagAdd: 0.05, sparkAdd: 0.1 },
};
export const CONTOUR: Record<string, Palette> = {
  flare: { c1: rgb(0xc43d05), c2: rgb(0xffa21c), c3: rgb(0xfff1a0), flow: 3.2, jag: 0.2, sparks: 0.8 },
  comet: { c1: rgb(0xd97a00), c2: rgb(0xffd12a), c3: rgb(0xfffbd0), flow: 5.2, jag: 1.0, sparks: 1.0 },
  still: { c1: rgb(0x6f86b8), c2: rgb(0xc9d6ee), c3: rgb(0xffffff), flow: 1.7, jag: 0.0, sparks: 0.4 },
  ren: { c1: rgb(0x9a0a18), c2: rgb(0xff3a2a), c3: rgb(0xffc060), flow: 3.6, jag: 0.5, sparks: 0.8 },
  sora: { c1: rgb(0x0a3fb0), c2: rgb(0x35c2ff), c3: rgb(0xe6fbff), flow: 2.6, jag: 0.3, sparks: 0.6 },
  vex1: { c1: rgb(0x3b0f8a), c2: rgb(0xa06af0), c3: rgb(0xf0dcff), flow: 3.0, jag: 0.8, sparks: 0.9 },
  vex2: { c1: rgb(0x0c0e12), c2: rgb(0x7d8896), c3: rgb(0xeef3fa), flow: 1.9, jag: 0.2, sparks: 0.3 },
  surge: { c1: rgb(0x0a4fc0), c2: rgb(0x3ab4ff), c3: rgb(0xe6fbff), flow: 4.5, jag: 0.4, sparks: 0.3 },
};

export class ContourController extends (Phaser as unknown as { Filters: { Controller: new (camera: unknown, node: string) => Record<string, unknown> } }).Filters.Controller {
  power = 0; time = 0; pal: Palette = CONTOUR.flare;
  /** state-reactive extras (set by the renderer from real activity): faster flow, rougher edge, more attached sparks */
  jagAdd = 0; sparkAdd = 0;
  constructor(camera: unknown) { super(camera, 'FilterContour'); (this as unknown as Record<string, unknown>).setPaddingOverride && (this as unknown as { setPaddingOverride: (a: number, b: number, c: number, d: number) => void }).setPaddingOverride(-6, -6, 6, 6); }
}
/** Per Phaser game: a recreated game (hero change, retry) registers its own renderer again. */
const registered = new WeakSet<Phaser.Game>();
export function registerContourFilter(game: Phaser.Game) {
  if (registered.has(game)) return; const r = game.renderer as unknown as { renderNodes?: { addNodeConstructor: (n: string, c: unknown) => void } }; if (!r.renderNodes) return;
  const P = Phaser as unknown as { Class: new (d: Record<string, unknown>) => unknown; Renderer: { WebGL: { RenderNodes: { BaseFilterShader: new (...a: unknown[]) => unknown } } } };
  const Base = P.Renderer.WebGL.RenderNodes.BaseFilterShader as unknown as { call: (...a: unknown[]) => void };
  const Node = new P.Class({
    Extends: Base,
    initialize: function FilterContour(this: unknown, manager: unknown) { Base.call(this, 'FilterContour', manager, null, FRAG); },
    setupUniforms: function (this: { programManager: { setUniform: (n: string, v: unknown) => void } }, c: ContourController, dc: { width: number; height: number }) {
      const pm = this.programManager; pm.setUniform('resolution', [dc.width, dc.height]); pm.setUniform('time', c.time); pm.setUniform('flow', c.pal.flow); pm.setUniform('power', c.power); pm.setUniform('jag', Math.min(1.4, c.pal.jag + c.jagAdd)); pm.setUniform('sparks', Math.min(1.4, c.pal.sparks + c.sparkAdd));
      pm.setUniform('c1', c.pal.c1); pm.setUniform('c2', c.pal.c2); pm.setUniform('c3', c.pal.c3);
    },
  });
  r.renderNodes.addNodeConstructor('FilterContour', Node); registered.add(game);
}

/** Palette key of the transformation a fighter is in (null = untransformed), shared by the stroke, the ground ring and the effects. */
export const formKey = (hero: string, form: number): string | null => hero === 'kai' ? (form === 1 ? 'flare' : form === 2 ? 'comet' : form === 3 ? 'still' : null) : hero === 'vex' ? (form === 1 ? 'vex1' : form === 2 ? 'vex2' : null) : form >= 1 ? (hero === 'ren' ? 'ren' : 'sora') : null;
/** Ground ring / halo colour for each palette key (the mid colour of the form's contour). */
export const RING_TINT: Record<string, number> = { flare: 0xff9a2e, comet: 0xffd12a, still: 0xc9d6ee, ren: 0xff3a2a, sora: 0x35c2ff, vex1: 0xa06af0, vex2: 0x8a929e, surge: 0x3ab4ff };

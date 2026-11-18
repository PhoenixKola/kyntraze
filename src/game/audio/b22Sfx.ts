/** B22 original sound effects, synthesised at runtime from simple recipes (sweeps, noise, FM): no samples, no files, no licences. Each B22 sim event maps to one recipe so a parry, a relic proc, an ultimate or a realm boss phase is audibly distinct. Buffers are built once and cached. */
export interface Recipe { f0: number; f1: number; dur: number; noise: number; decay: number; wave: 'sine' | 'saw' | 'square' | 'bell'; gain: number; fm?: number }
export const SFX: Record<string, Recipe> = {
  parry_perfect: { f0: 1400, f1: 900, dur: 0.45, noise: 0.15, decay: 7, wave: 'bell', gain: 0.9, fm: 2.4 }, parry_guard: { f0: 220, f1: 110, dur: 0.2, noise: 0.5, decay: 16, wave: 'square', gain: 0.6 },
  parry_start: { f0: 500, f1: 800, dur: 0.12, noise: 0.05, decay: 14, wave: 'sine', gain: 0.35 }, reversal_blink: { f0: 1200, f1: 200, dur: 0.22, noise: 0.6, decay: 10, wave: 'saw', gain: 0.55 },
  reversal_riposte: { f0: 700, f1: 300, dur: 0.25, noise: 0.35, decay: 12, wave: 'saw', gain: 0.7 }, seal_mark: { f0: 300, f1: 900, dur: 0.3, noise: 0.05, decay: 6, wave: 'bell', gain: 0.5, fm: 1.8 },
  seal_detonate: { f0: 140, f1: 40, dur: 0.6, noise: 0.5, decay: 5, wave: 'sine', gain: 1.0 }, mark: { f0: 880, f1: 660, dur: 0.12, noise: 0, decay: 20, wave: 'bell', gain: 0.35 },
  ult_start: { f0: 90, f1: 700, dur: 0.9, noise: 0.1, decay: 2.5, wave: 'saw', gain: 0.8 }, ult_release: { f0: 220, f1: 40, dur: 0.9, noise: 0.6, decay: 4, wave: 'saw', gain: 1.0 },
  ult_cannon: { f0: 400, f1: 60, dur: 1.0, noise: 0.5, decay: 3.5, wave: 'saw', gain: 1.0 }, ult_judge: { f0: 1000, f1: 400, dur: 0.2, noise: 0.2, decay: 12, wave: 'bell', gain: 0.6, fm: 3 },
  relic_gain: { f0: 523, f1: 1046, dur: 0.8, noise: 0, decay: 3.5, wave: 'bell', gain: 0.8, fm: 2 }, legend_gain: { f0: 392, f1: 1568, dur: 1.2, noise: 0.02, decay: 2.5, wave: 'bell', gain: 0.9, fm: 2.6 },
  prism: { f0: 1760, f1: 2200, dur: 0.14, noise: 0, decay: 18, wave: 'bell', gain: 0.35 }, sigil_strike: { f0: 330, f1: 660, dur: 0.3, noise: 0.1, decay: 9, wave: 'bell', gain: 0.6 },
  dawn_ring: { f0: 300, f1: 600, dur: 0.5, noise: 0.1, decay: 5, wave: 'sine', gain: 0.6 }, hourglass: { f0: 600, f1: 150, dur: 0.7, noise: 0.05, decay: 3.5, wave: 'sine', gain: 0.55 },
  rift: { f0: 200, f1: 900, dur: 0.35, noise: 0.4, decay: 8, wave: 'saw', gain: 0.5 }, bearing: { f0: 740, f1: 980, dur: 0.12, noise: 0, decay: 16, wave: 'bell', gain: 0.3 },
  echo_warn: { f0: 880, f1: 880, dur: 0.25, noise: 0, decay: 9, wave: 'bell', gain: 0.4, fm: 1.5 }, branch_fx: { f0: 600, f1: 1500, dur: 0.22, noise: 0.1, decay: 10, wave: 'saw', gain: 0.35 }, legend_fx: { f0: 300, f1: 1200, dur: 0.5, noise: 0.2, decay: 6, wave: 'saw', gain: 0.5 },
  lance_strike: { f0: 1500, f1: 300, dur: 0.3, noise: 0.3, decay: 10, wave: 'saw', gain: 0.55 }, sigil_pulse: { f0: 500, f1: 500, dur: 0.2, noise: 0, decay: 12, wave: 'sine', gain: 0.3 }, phase_blink: { f0: 900, f1: 120, dur: 0.25, noise: 0.5, decay: 12, wave: 'sine', gain: 0.45 },
  boss_phase: { f0: 70, f1: 35, dur: 1.4, noise: 0.5, decay: 2.2, wave: 'saw', gain: 1.0 }, boss_break: { f0: 260, f1: 70, dur: 0.5, noise: 0.7, decay: 7, wave: 'square', gain: 0.8 }, boss_open: { f0: 440, f1: 880, dur: 0.5, noise: 0, decay: 4, wave: 'bell', gain: 0.7, fm: 2 },
  kk_surge: { f0: 180, f1: 760, dur: 0.35, noise: 0.25, decay: 6, wave: 'saw', gain: 0.6 }, kk_scatter: { f0: 900, f1: 520, dur: 0.07, noise: 0.35, decay: 28, wave: 'square', gain: 0.32 }, kk_blast: { f0: 260, f1: 90, dur: 0.16, noise: 0.6, decay: 18, wave: 'sine', gain: 0.4 },
  kk_meteor: { f0: 140, f1: 60, dur: 0.28, noise: 0.5, decay: 11, wave: 'saw', gain: 0.75 }, kk_flare_wind: { f0: 160, f1: 420, dur: 0.3, noise: 0.45, decay: 7, wave: 'saw', gain: 0.5 }, kk_pillar: { f0: 120, f1: 55, dur: 0.38, noise: 0.55, decay: 8, wave: 'sine', gain: 0.8 },
  kk_gather: { f0: 200, f1: 1100, dur: 0.6, noise: 0.1, decay: 3, wave: 'bell', gain: 0.6, fm: 1.8 }, kk_pulse: { f0: 90, f1: 70, dur: 0.3, noise: 0.15, decay: 7, wave: 'sine', gain: 0.8 }, kk_final: { f0: 110, f1: 32, dur: 0.9, noise: 0.55, decay: 3.6, wave: 'saw', gain: 1.0 },
  kk_clone: { f0: 700, f1: 1500, dur: 0.4, noise: 0.05, decay: 6, wave: 'bell', gain: 0.55, fm: 2.2 }, kk_clone_end: { f0: 1200, f1: 400, dur: 0.35, noise: 0.1, decay: 8, wave: 'bell', gain: 0.4, fm: 1.4 }, kk_hop: { f0: 1600, f1: 240, dur: 0.2, noise: 0.45, decay: 14, wave: 'sine', gain: 0.55 },
  pair_attack: { f0: 200, f1: 1800, dur: 0.9, noise: 0.2, decay: 3, wave: 'saw', gain: 0.9 }, resonance: { f0: 330, f1: 1320, dur: 1.4, noise: 0.05, decay: 2, wave: 'bell', gain: 0.9, fm: 3.1 }, revive: { f0: 440, f1: 880, dur: 0.9, noise: 0, decay: 3, wave: 'bell', gain: 0.8, fm: 1.6 },
};
/** Which sim event plays which recipe (event kind -> recipe name). */
export const EVENT_SFX: Record<string, string> = { parry_perfect: 'parry_perfect', parry_guard: 'parry_guard', parry_start: 'parry_start', reversal_blink: 'reversal_blink', reversal_riposte: 'reversal_riposte', seal_mark: 'seal_mark', seal_detonate: 'seal_detonate', ult_start: 'ult_start', ult_release: 'ult_release', branch_fx: 'branch_fx', legend_fx: 'legend_fx', surge_start: 'kk_surge', scatter_fire: 'kk_scatter', scatter_blast: 'kk_blast', meteor_beat: 'kk_meteor', flare_start: 'kk_flare_wind', flare_pillar: 'kk_pillar', crucible_cast: 'kk_gather', crucible_pulse: 'kk_pulse', crucible_final: 'kk_final', clone_spawn: 'kk_clone', clone_end: 'kk_clone_end', rift_hop: 'kk_hop' };
export const B22_EVENT_SFX: Record<string, string> = { relic_gain: 'relic_gain', legend_gain: 'legend_gain', prism: 'prism', sigil_strike: 'sigil_strike', dawn_ring: 'dawn_ring', hourglass: 'hourglass', rift: 'rift', bearing: 'bearing', echo_warn: 'echo_warn', mark: 'mark', ult_cannon: 'ult_cannon', ult_judge: 'ult_judge', parry: 'parry_perfect', ult_collapse: 'ult_release', ult_beam: 'ult_cannon', collapse_blast: 'seal_detonate', crucible_burst: 'seal_detonate', collision: 'seal_detonate', seal_blast: 'seal_detonate' };
export function synth(r: Recipe, sr: number): Float32Array {
  const n = Math.max(1, Math.floor(r.dur * sr)), out = new Float32Array(n); let ph = 0, seed = 1337;
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = i / n, f = r.f0 * Math.pow(r.f1 / r.f0, u); ph += (2 * Math.PI * f) / sr;
    let w = r.wave === 'sine' ? Math.sin(ph) : r.wave === 'saw' ? ((ph / Math.PI) % 2) - 1 : r.wave === 'square' ? (Math.sin(ph) > 0 ? 0.6 : -0.6) : Math.sin(ph + (r.fm ?? 2) * Math.sin(ph * 2.76) * Math.exp(-t * 4));
    seed = (seed * 1664525 + 1013904223) | 0; const nz = ((seed >>> 8) / 8388608 - 1) * r.noise;
    out[i] = (w * (1 - r.noise * 0.5) + nz) * Math.exp(-t * r.decay) * Math.min(1, i / (0.004 * sr)) * r.gain * 0.5;
  }
  return out;
}
export class B22Sfx {
  private readonly cache = new Map<string, AudioBuffer>();
  buffer(ctx: AudioContext, name: string): AudioBuffer | null { const r = SFX[name]; if (!r) return null; let b = this.cache.get(name); if (!b) { const d = synth(r, ctx.sampleRate); b = ctx.createBuffer(1, d.length, ctx.sampleRate); b.getChannelData(0).set(d); this.cache.set(name, b); } return b; }
}

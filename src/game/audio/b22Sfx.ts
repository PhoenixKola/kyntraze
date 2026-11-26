import { SIGNATURES, type Shape } from '../render/advancedFx';
/** B22 original sound effects, synthesised at runtime from simple recipes (sweeps, noise, FM): no samples, no files, no licences. Each B22 sim event maps to one recipe so a parry, a relic proc, an ultimate or a realm boss phase is audibly distinct. Buffers are built once and cached. */
export interface Recipe { f0: number; f1: number; dur: number; noise: number; decay: number; wave: 'sine' | 'saw' | 'square' | 'bell'; gain: number; fm?: number }
export const SFX: Record<string, Recipe> = {
  /* B31B Living Fractures accents */
  lf_found: { f0: 660, f1: 990, dur: 0.5, noise: 0.02, decay: 4, wave: 'bell', gain: 0.45, fm: 2 }, lf_open: { f0: 180, f1: 720, dur: 0.7, noise: 0.15, decay: 3, wave: 'saw', gain: 0.6 },
  lf_win: { f0: 520, f1: 1560, dur: 0.9, noise: 0.03, decay: 3, wave: 'bell', gain: 0.8, fm: 2.4 }, lf_fail: { f0: 300, f1: 70, dur: 0.7, noise: 0.3, decay: 5, wave: 'square', gain: 0.5 },
  lf_bargain: { f0: 140, f1: 420, dur: 0.8, noise: 0.2, decay: 3.5, wave: 'saw', gain: 0.7 }, lf_ambush: { f0: 900, f1: 120, dur: 0.5, noise: 0.35, decay: 6, wave: 'saw', gain: 0.6 },
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
  kk_meteor: { f0: 140, f1: 60, dur: 0.28, noise: 0.5, decay: 11, wave: 'saw', gain: 0.75 }, kk_meteor_1: { f0: 190, f1: 80, dur: 0.26, noise: 0.5, decay: 11, wave: 'saw', gain: 0.8 }, kk_meteor_2: { f0: 260, f1: 70, dur: 0.34, noise: 0.55, decay: 9, wave: 'saw', gain: 0.9 }, kk_meteor_fin: { f0: 70, f1: 28, dur: 0.7, noise: 0.7, decay: 5, wave: 'sine', gain: 1.0 }, kk_meteor_miss: { f0: 700, f1: 260, dur: 0.14, noise: 0.5, decay: 20, wave: 'saw', gain: 0.3 }, kk_meteor_zap: { f0: 2400, f1: 500, dur: 0.12, noise: 0.6, decay: 22, wave: 'square', gain: 0.35 },
  kk_surge_end: { f0: 760, f1: 160, dur: 0.3, noise: 0.15, decay: 9, wave: 'saw', gain: 0.4 }, kk_echo_strike: { f0: 2600, f1: 900, dur: 0.1, noise: 0.15, decay: 24, wave: 'bell', gain: 0.4, fm: 2.4 }, kk_echo_lock: { f0: 1500, f1: 1900, dur: 0.07, noise: 0, decay: 28, wave: 'bell', gain: 0.22, fm: 2 }, kk_echo_shatter: { f0: 3000, f1: 400, dur: 0.4, noise: 0.5, decay: 8, wave: 'bell', gain: 0.5, fm: 3 }, kk_echo_fade: { f0: 900, f1: 300, dur: 0.55, noise: 0.05, decay: 5, wave: 'sine', gain: 0.35 }, kk_flare_wind: { f0: 160, f1: 420, dur: 0.3, noise: 0.45, decay: 7, wave: 'saw', gain: 0.5 }, kk_pillar: { f0: 120, f1: 55, dur: 0.38, noise: 0.55, decay: 8, wave: 'sine', gain: 0.8 },
  kk_gather: { f0: 200, f1: 1100, dur: 0.6, noise: 0.1, decay: 3, wave: 'bell', gain: 0.6, fm: 1.8 }, kk_pulse: { f0: 90, f1: 70, dur: 0.3, noise: 0.15, decay: 7, wave: 'sine', gain: 0.8 }, kk_final: { f0: 110, f1: 32, dur: 0.9, noise: 0.55, decay: 3.6, wave: 'saw', gain: 1.0 },
  kk_clone: { f0: 700, f1: 1500, dur: 0.4, noise: 0.05, decay: 6, wave: 'bell', gain: 0.55, fm: 2.2 }, kk_clone_end: { f0: 1200, f1: 400, dur: 0.35, noise: 0.1, decay: 8, wave: 'bell', gain: 0.4, fm: 1.4 }, kk_hop: { f0: 1600, f1: 240, dur: 0.2, noise: 0.45, decay: 14, wave: 'sine', gain: 0.55 },
  pair_attack: { f0: 200, f1: 1800, dur: 0.9, noise: 0.2, decay: 3, wave: 'saw', gain: 0.9 }, resonance: { f0: 330, f1: 1320, dur: 1.4, noise: 0.05, decay: 2, wave: 'bell', gain: 0.9, fm: 3.1 }, revive: { f0: 440, f1: 880, dur: 0.9, noise: 0, decay: 3, wave: 'bell', gain: 0.8, fm: 1.6 },
};
/** B25.1 Kai combat identity cues (original, runtime-synthesised like every B22 cue). Per form: dry martial contact / hot solar burst / crackling fangs / airy silver strike; charge bed + tier ticks, release whoosh, hit / block / miss, per-form follow-up, dragon manifest, flight and Form Shift accents. */
Object.assign(SFX, {
  ka_0: { f0: 180, f1: 90, dur: 0.09, noise: 0.6, decay: 26, wave: 'sine', gain: 0.45 }, ka_0f: { f0: 700, f1: 150, dur: 0.2, noise: 0.7, decay: 12, wave: 'saw', gain: 0.5 },
  ka_1: { f0: 300, f1: 120, dur: 0.14, noise: 0.6, decay: 14, wave: 'saw', gain: 0.5 }, ka_1f: { f0: 260, f1: 70, dur: 0.3, noise: 0.6, decay: 8, wave: 'saw', gain: 0.7 },
  ka_2: { f0: 900, f1: 300, dur: 0.12, noise: 0.55, decay: 18, wave: 'square', gain: 0.4 }, ka_2f: { f0: 140, f1: 60, dur: 0.35, noise: 0.5, decay: 8, wave: 'saw', gain: 0.75 }, ka_chain: { f0: 1600, f1: 500, dur: 0.1, noise: 0.5, decay: 20, wave: 'square', gain: 0.3 },
  ka_3: { f0: 1500, f1: 900, dur: 0.15, noise: 0.15, decay: 12, wave: 'bell', gain: 0.32, fm: 1.6 }, ka_3f: { f0: 1000, f1: 2200, dur: 0.3, noise: 0.1, decay: 6, wave: 'bell', gain: 0.4, fm: 2 },
  sg_charge_1: { f0: 160, f1: 520, dur: 0.5, noise: 0.2, decay: 3, wave: 'saw', gain: 0.45 }, sg_charge_2: { f0: 220, f1: 1100, dur: 0.5, noise: 0.3, decay: 3, wave: 'saw', gain: 0.45 }, sg_charge_3: { f0: 300, f1: 1500, dur: 0.6, noise: 0.05, decay: 3, wave: 'bell', gain: 0.4, fm: 1.8 },
  sg_tier: { f0: 600, f1: 1200, dur: 0.15, noise: 0, decay: 12, wave: 'bell', gain: 0.4 }, sg_release: { f0: 300, f1: 1400, dur: 0.18, noise: 0.6, decay: 10, wave: 'saw', gain: 0.5 },
  sg_hit_1: { f0: 120, f1: 40, dur: 0.5, noise: 0.6, decay: 5, wave: 'saw', gain: 1.0 }, sg_hit_2: { f0: 200, f1: 60, dur: 0.45, noise: 0.5, decay: 5, wave: 'saw', gain: 1.0 }, sg_hit_3: { f0: 900, f1: 80, dur: 0.5, noise: 0.3, decay: 4, wave: 'sine', gain: 0.9 },
  sg_pulse_1: { f0: 110, f1: 50, dur: 0.3, noise: 0.5, decay: 8, wave: 'sine', gain: 0.7 }, sg_pulse_2: { f0: 1000, f1: 200, dur: 0.25, noise: 0.5, decay: 10, wave: 'square', gain: 0.6 }, sg_pulse_3: { f0: 1400, f1: 60, dur: 0.6, noise: 0.3, decay: 4, wave: 'sine', gain: 0.9 },
  sg_block: { f0: 220, f1: 110, dur: 0.2, noise: 0.5, decay: 16, wave: 'square', gain: 0.6 }, sg_miss: { f0: 600, f1: 200, dur: 0.15, noise: 0.5, decay: 12, wave: 'sine', gain: 0.25 },
  od_1: { f0: 70, f1: 200, dur: 1.1, noise: 0.5, decay: 2, wave: 'saw', gain: 0.9 }, od_2: { f0: 60, f1: 300, dur: 1.1, noise: 0.6, decay: 2, wave: 'saw', gain: 1.0 }, od_3: { f0: 300, f1: 900, dur: 1.2, noise: 0.1, decay: 2.2, wave: 'bell', gain: 0.7, fm: 2 }, od_end: { f0: 600, f1: 120, dur: 0.6, noise: 0.3, decay: 4, wave: 'sine', gain: 0.5 },
  fl_start: { f0: 200, f1: 800, dur: 0.35, noise: 0.5, decay: 7, wave: 'saw', gain: 0.5 }, fl_slam: { f0: 120, f1: 40, dur: 0.4, noise: 0.6, decay: 7, wave: 'sine', gain: 0.9 }, fl_soft: { f0: 400, f1: 200, dur: 0.15, noise: 0.3, decay: 12, wave: 'sine', gain: 0.3 },
  fs_1: { f0: 400, f1: 1200, dur: 0.25, noise: 0.2, decay: 9, wave: 'saw', gain: 0.5 }, fs_2: { f0: 500, f1: 1500, dur: 0.25, noise: 0.3, decay: 9, wave: 'square', gain: 0.45 }, fs_3: { f0: 800, f1: 1800, dur: 0.3, noise: 0.05, decay: 7, wave: 'bell', gain: 0.45, fm: 1.5 },
} satisfies Record<string, Recipe>);
/** Kai combat event -> recipe. `n` is the event's packed payload (see KaiCombat.ts); kai_auto plays once per beat, not per target (the caller skips repeats), and chain strikes get only a short crackle. */
export function kaiCombatSfx(kind: string, n = 0): string | null {
  const form = (n >> 2) & 3, f3 = (n >> 3) & 3;
  switch (kind) {
    case 'kai_auto': return (n & 128) ? 'ka_chain' : `ka_${form}${(n & 32) ? 'f' : ''}`;
    case 'sig_charge': return `sg_charge_${n || 1}`; case 'sig_tier': return 'sg_tier'; case 'sig_release': return 'sg_release';
    case 'sig_hit': return `sg_hit_${f3 || 1}`; case 'sig_pulse': return `sg_pulse_${f3 || 1}`; case 'sig_block': return 'sg_block'; case 'sig_miss': return 'sg_miss';
    case 'od_start': return `od_${n || 1}`; case 'od_end': return 'od_end';
    case 'fly_start': return 'fl_start'; case 'fly_land': return (n & 1) ? 'fl_slam' : 'fl_soft'; case 'form_shift': return `fs_${n || 1}`;
    default: return null;
  }
}
/** B26 Ren, Crimson Ascendant cues (original, runtime-synthesised): weighty low-mid strikes, a rising spin, grab and slam thuds, hammer-fist impacts, a held-fist charge bed with tier ticks and a fox roar. Not listened to yet. */
Object.assign(SFX, {
  rn_jab: { f0: 240, f1: 110, dur: 0.1, noise: 0.5, decay: 22, wave: 'saw', gain: 0.5 }, rn_kick: { f0: 160, f1: 70, dur: 0.14, noise: 0.55, decay: 16, wave: 'saw', gain: 0.58 }, rn_hook: { f0: 200, f1: 80, dur: 0.16, noise: 0.5, decay: 14, wave: 'square', gain: 0.55 }, rn_upper: { f0: 120, f1: 520, dur: 0.3, noise: 0.5, decay: 8, wave: 'saw', gain: 0.8 },
  rn_q_start: { f0: 120, f1: 420, dur: 0.5, noise: 0.45, decay: 3.5, wave: 'saw', gain: 0.6 }, rn_q_tick: { f0: 190, f1: 100, dur: 0.1, noise: 0.5, decay: 20, wave: 'saw', gain: 0.4 }, rn_q_release: { f0: 150, f1: 38, dur: 0.6, noise: 0.6, decay: 5, wave: 'saw', gain: 0.95 },
  rn_e_start: { f0: 140, f1: 360, dur: 0.22, noise: 0.5, decay: 9, wave: 'saw', gain: 0.5 }, rn_e_grab: { f0: 100, f1: 60, dur: 0.18, noise: 0.5, decay: 14, wave: 'square', gain: 0.7 }, rn_e_slam: { f0: 110, f1: 34, dur: 0.55, noise: 0.6, decay: 6, wave: 'sine', gain: 1.0 }, rn_e_hit: { f0: 130, f1: 50, dur: 0.35, noise: 0.55, decay: 9, wave: 'saw', gain: 0.8 },
  rn_r_mark: { f0: 300, f1: 560, dur: 0.4, noise: 0.05, decay: 5, wave: 'bell', gain: 0.45, fm: 1.6 }, rn_r_hit: { f0: 95, f1: 40, dur: 0.4, noise: 0.55, decay: 8, wave: 'sine', gain: 0.9 }, rn_r_final: { f0: 80, f1: 28, dur: 0.9, noise: 0.6, decay: 3.5, wave: 'saw', gain: 1.0 },
  rn_v_charge: { f0: 110, f1: 420, dur: 0.6, noise: 0.25, decay: 2.8, wave: 'saw', gain: 0.45 }, rn_v_tier: { f0: 300, f1: 600, dur: 0.16, noise: 0, decay: 12, wave: 'bell', gain: 0.4 }, rn_v_release: { f0: 180, f1: 900, dur: 0.2, noise: 0.6, decay: 10, wave: 'saw', gain: 0.55 },
  rn_v_hit: { f0: 85, f1: 30, dur: 0.55, noise: 0.55, decay: 5, wave: 'saw', gain: 1.0 }, rn_v_pulse: { f0: 120, f1: 55, dur: 0.35, noise: 0.5, decay: 8, wave: 'sine', gain: 0.75 }, rn_v_pulse3: { f0: 70, f1: 26, dur: 0.8, noise: 0.5, decay: 3.8, wave: 'saw', gain: 1.0 }, rn_v_block: { f0: 220, f1: 110, dur: 0.2, noise: 0.5, decay: 16, wave: 'square', gain: 0.6 }, rn_v_miss: { f0: 500, f1: 170, dur: 0.15, noise: 0.5, decay: 12, wave: 'sine', gain: 0.25 },
  rn_od_start: { f0: 55, f1: 240, dur: 1.2, noise: 0.55, decay: 1.8, wave: 'saw', gain: 1.0, fm: 1.4 }, rn_od_end: { f0: 260, f1: 60, dur: 0.6, noise: 0.35, decay: 4, wave: 'saw', gain: 0.5 },
  rn_fly_start: { f0: 130, f1: 520, dur: 0.4, noise: 0.55, decay: 6, wave: 'saw', gain: 0.55 }, rn_fly_slam: { f0: 100, f1: 32, dur: 0.5, noise: 0.6, decay: 6, wave: 'sine', gain: 0.95 }, rn_fly_soft: { f0: 330, f1: 150, dur: 0.15, noise: 0.35, decay: 12, wave: 'sine', gain: 0.3 },
} satisfies Record<string, Recipe>);
/** Ren event -> recipe. `n` carries the beat / tier flags (see RenCombat.ts); one cue per beat or cast event, never per target. */
export function renCombatSfx(kind: string, n = 0): string | null {
  switch (kind) {
    case 'ren_auto': return ['rn_jab', 'rn_kick', 'rn_hook', 'rn_upper'][n & 3];
    case 'ren_q_start': return 'rn_q_start'; case 'ren_q_tick': return 'rn_q_tick'; case 'ren_q_release': return 'rn_q_release';
    case 'ren_e_start': return 'rn_e_start'; case 'ren_e_grab': return 'rn_e_grab'; case 'ren_e_slam': return 'rn_e_slam'; case 'ren_e_hit': return 'rn_e_hit';
    case 'ren_r_mark': return 'rn_r_mark'; case 'ren_r_hit': return (n & 32) ? 'rn_r_final' : 'rn_r_hit';
    case 'ren_v_charge': return 'rn_v_charge'; case 'ren_v_tier': return 'rn_v_tier'; case 'ren_v_release': return 'rn_v_release'; case 'ren_v_hit': return 'rn_v_hit';
    case 'ren_v_pulse': return ((n >> 5) & 3) >= 3 && (n & 31) === 0 ? 'rn_v_pulse3' : 'rn_v_pulse'; case 'ren_v_block': return 'rn_v_block'; case 'ren_v_miss': return 'rn_v_miss';
    case 'ren_od_start': return 'rn_od_start'; case 'ren_od_end': return 'rn_od_end';
    case 'ren_fly_start': return 'rn_fly_start'; case 'ren_fly_land': return (n & 1) ? 'rn_fly_slam' : 'rn_fly_soft';
    default: return null;
  }
}
/** B27 Sora, Azure Sovereign cues (original, runtime-synthesised): glassy bell blades, a crystalline prison chime and shatter, bright spear strikes, a falling-in singularity and a held two-hand charge with tier ticks. Not listened to yet. */
Object.assign(SFX, {
  sr_auto_a: { f0: 1500, f1: 900, dur: 0.12, noise: 0.08, decay: 18, wave: 'bell', gain: 0.4, fm: 2.2 }, sr_auto_b: { f0: 1700, f1: 1000, dur: 0.12, noise: 0.08, decay: 18, wave: 'bell', gain: 0.4, fm: 2.2 }, sr_auto_c: { f0: 1300, f1: 800, dur: 0.18, noise: 0.1, decay: 13, wave: 'bell', gain: 0.5, fm: 2.4 }, sr_auto_d: { f0: 1900, f1: 700, dur: 0.26, noise: 0.14, decay: 10, wave: 'bell', gain: 0.58, fm: 2.6 },
  sr_q_cast: { f0: 600, f1: 1500, dur: 0.4, noise: 0.05, decay: 5, wave: 'bell', gain: 0.5, fm: 1.8 }, sr_q_tick: { f0: 1100, f1: 800, dur: 0.1, noise: 0.05, decay: 20, wave: 'bell', gain: 0.25, fm: 2 }, sr_q_shatter: { f0: 2200, f1: 500, dur: 0.5, noise: 0.5, decay: 7, wave: 'bell', gain: 0.8, fm: 3.1 },
  sr_e_start: { f0: 400, f1: 1300, dur: 0.3, noise: 0.1, decay: 7, wave: 'saw', gain: 0.35 }, sr_e_land: { f0: 220, f1: 60, dur: 0.24, noise: 0.5, decay: 12, wave: 'sine', gain: 0.65 }, sr_e_end: { f0: 900, f1: 500, dur: 0.2, noise: 0.05, decay: 12, wave: 'bell', gain: 0.3, fm: 1.6 },
  sr_r_cast: { f0: 90, f1: 40, dur: 1.1, noise: 0.35, decay: 2.4, wave: 'sine', gain: 0.6 }, sr_r_burst: { f0: 700, f1: 90, dur: 0.7, noise: 0.5, decay: 5, wave: 'bell', gain: 0.95, fm: 2.8 },
  sr_v_charge: { f0: 180, f1: 760, dur: 0.7, noise: 0.15, decay: 2.6, wave: 'sine', gain: 0.45, fm: 1.4 }, sr_v_tier: { f0: 800, f1: 1600, dur: 0.16, noise: 0, decay: 12, wave: 'bell', gain: 0.4, fm: 2 }, sr_v_release: { f0: 500, f1: 1800, dur: 0.3, noise: 0.2, decay: 7, wave: 'saw', gain: 0.6 },
  sr_v_hit: { f0: 600, f1: 70, dur: 0.6, noise: 0.45, decay: 5, wave: 'bell', gain: 1.0, fm: 3 }, sr_v_pulse: { f0: 380, f1: 90, dur: 0.4, noise: 0.35, decay: 7, wave: 'bell', gain: 0.7, fm: 2.4 }, sr_v_pulse3: { f0: 300, f1: 60, dur: 0.7, noise: 0.4, decay: 4, wave: 'bell', gain: 0.9, fm: 2.8 },
  sr_v_block: { f0: 300, f1: 180, dur: 0.14, noise: 0.45, decay: 16, wave: 'square', gain: 0.45 }, sr_v_fizzle: { f0: 900, f1: 300, dur: 0.22, noise: 0.35, decay: 11, wave: 'bell', gain: 0.35, fm: 1.8 },
  sr_od_start: { f0: 400, f1: 1500, dur: 1.2, noise: 0.35, decay: 1.8, wave: 'bell', gain: 0.9, fm: 2.2 }, sr_od_end: { f0: 1200, f1: 300, dur: 0.6, noise: 0.2, decay: 4, wave: 'bell', gain: 0.45, fm: 1.8 },
  sr_fly_start: { f0: 500, f1: 1400, dur: 0.35, noise: 0.35, decay: 7, wave: 'saw', gain: 0.4 }, sr_fly_slam: { f0: 700, f1: 160, dur: 0.4, noise: 0.45, decay: 8, wave: 'bell', gain: 0.7, fm: 2.4 }, sr_fly_soft: { f0: 900, f1: 500, dur: 0.14, noise: 0.25, decay: 14, wave: 'bell', gain: 0.25, fm: 1.6 },
} satisfies Record<string, Recipe>);
/** Sora event -> recipe. The n field carries the beat / tier flags (see SoraCombat.ts); one cue per beat, cast or landing, never per target. */
export function soraCombatSfx(kind: string, n = 0): string | null {
  switch (kind) {
    case 'sora_auto': return ['sr_auto_a', 'sr_auto_b', 'sr_auto_c', 'sr_auto_d'][n & 3];
    case 'sora_q_cast': return 'sr_q_cast'; case 'sora_q_tick': return 'sr_q_tick'; case 'sora_q_shatter': return 'sr_q_shatter';
    case 'sora_e_start': return 'sr_e_start'; case 'sora_e_land': return 'sr_e_land'; case 'sora_e_end': return 'sr_e_end';
    case 'sora_r_cast': return 'sr_r_cast'; case 'sora_r_burst': return 'sr_r_burst';
    case 'sora_v_charge': return 'sr_v_charge'; case 'sora_v_tier': return 'sr_v_tier'; case 'sora_v_release': return 'sr_v_release'; case 'sora_v_hit': return 'sr_v_hit';
    case 'sora_v_pulse': return ((n >> 5) & 3) >= 3 && (n & 31) === 0 ? 'sr_v_pulse3' : 'sr_v_pulse'; case 'sora_v_block': return 'sr_v_block'; case 'sora_v_fizzle': return 'sr_v_fizzle';
    case 'sora_od_start': return 'sr_od_start'; case 'sora_od_end': return 'sr_od_end';
    case 'sora_fly_start': return 'sr_fly_start'; case 'sora_fly_land': return (n & 1) ? 'sr_fly_slam' : 'sr_fly_soft';
    default: return null;
  }
}
/** B28 Vex, Riftbound and Voidheart Exile cues (original, runtime-synthesised): hard violet blade slices, a glassy mirror guard, a portal whoosh, ground-breaking seals, and for Voidheart quiet low spatial tones, dry cuts and a deep implosion. Not listened to yet. */
Object.assign(SFX, {
  vx_cut_a: { f0: 900, f1: 240, dur: 0.12, noise: 0.45, decay: 20, wave: 'saw', gain: 0.45 }, vx_cut_b: { f0: 1100, f1: 260, dur: 0.12, noise: 0.45, decay: 20, wave: 'saw', gain: 0.45 }, vx_cut_c: { f0: 800, f1: 180, dur: 0.18, noise: 0.5, decay: 14, wave: 'saw', gain: 0.55 }, vx_cut_d: { f0: 600, f1: 120, dur: 0.28, noise: 0.5, decay: 9, wave: 'saw', gain: 0.65 },
  vx_judg: { f0: 1600, f1: 700, dur: 0.1, noise: 0.15, decay: 24, wave: 'bell', gain: 0.3, fm: 2.6 }, vx_judg_big: { f0: 1200, f1: 400, dur: 0.22, noise: 0.2, decay: 12, wave: 'bell', gain: 0.45, fm: 3 },
  vx_guard: { f0: 500, f1: 380, dur: 0.14, noise: 0.35, decay: 16, wave: 'square', gain: 0.4 }, vx_guard_perfect: { f0: 1500, f1: 800, dur: 0.5, noise: 0.15, decay: 6, wave: 'bell', gain: 0.9, fm: 2.4 }, vx_echo: { f0: 1000, f1: 300, dur: 0.2, noise: 0.4, decay: 13, wave: 'saw', gain: 0.5 },
  vx_legion: { f0: 160, f1: 520, dur: 0.5, noise: 0.15, decay: 3.5, wave: 'sine', gain: 0.5, fm: 1.5 }, vx_clone: { f0: 1100, f1: 500, dur: 0.1, noise: 0.15, decay: 22, wave: 'bell', gain: 0.2, fm: 2.2 },
  vx_portal: { f0: 300, f1: 1300, dur: 0.22, noise: 0.5, decay: 9, wave: 'saw', gain: 0.5 }, vx_arrive: { f0: 1300, f1: 260, dur: 0.2, noise: 0.45, decay: 11, wave: 'saw', gain: 0.55 }, vx_exec_cut: { f0: 700, f1: 90, dur: 0.3, noise: 0.5, decay: 9, wave: 'saw', gain: 0.8 },
  vx_warn: { f0: 220, f1: 330, dur: 0.45, noise: 0.05, decay: 4, wave: 'sine', gain: 0.35 }, vx_sever: { f0: 1800, f1: 120, dur: 0.4, noise: 0.35, decay: 8, wave: 'bell', gain: 0.85, fm: 3.2 }, vx_reconnect: { f0: 300, f1: 60, dur: 0.45, noise: 0.5, decay: 7, wave: 'sine', gain: 0.8 },
  vx_seal: { f0: 140, f1: 70, dur: 0.22, noise: 0.5, decay: 12, wave: 'sine', gain: 0.55 }, vx_seal_final: { f0: 90, f1: 38, dur: 0.5, noise: 0.55, decay: 7, wave: 'sine', gain: 0.95 }, vx_cast: { f0: 200, f1: 520, dur: 0.4, noise: 0.2, decay: 5, wave: 'saw', gain: 0.4 },
  vx_domain: { f0: 70, f1: 45, dur: 1.2, noise: 0.25, decay: 2, wave: 'sine', gain: 0.55 }, vx_domain_tick: { f0: 900, f1: 300, dur: 0.1, noise: 0.3, decay: 20, wave: 'bell', gain: 0.3, fm: 2.4 },
  vx_v_charge: { f0: 120, f1: 520, dur: 0.7, noise: 0.15, decay: 2.6, wave: 'sine', gain: 0.45, fm: 1.4 }, vx_v_tier: { f0: 700, f1: 1500, dur: 0.16, noise: 0, decay: 12, wave: 'bell', gain: 0.4, fm: 2 }, vx_v_release: { f0: 400, f1: 1500, dur: 0.26, noise: 0.35, decay: 8, wave: 'saw', gain: 0.6 },
  vx_v_hit: { f0: 500, f1: 60, dur: 0.6, noise: 0.5, decay: 5, wave: 'saw', gain: 1.0 }, vx_v_pulse: { f0: 300, f1: 70, dur: 0.4, noise: 0.35, decay: 7, wave: 'bell', gain: 0.7, fm: 2.4 }, vx_horizon: { f0: 90, f1: 30, dur: 0.8, noise: 0.45, decay: 4, wave: 'sine', gain: 1.0 },
  vx_v_block: { f0: 300, f1: 180, dur: 0.14, noise: 0.45, decay: 16, wave: 'square', gain: 0.45 }, vx_v_fizzle: { f0: 800, f1: 260, dur: 0.22, noise: 0.35, decay: 11, wave: 'bell', gain: 0.35, fm: 1.8 },
  vx_od_start: { f0: 60, f1: 380, dur: 1.2, noise: 0.4, decay: 1.8, wave: 'saw', gain: 0.95, fm: 1.4 }, vx_od_start2: { f0: 50, f1: 900, dur: 1.3, noise: 0.15, decay: 1.6, wave: 'bell', gain: 0.8, fm: 2 }, vx_od_end: { f0: 600, f1: 90, dur: 0.6, noise: 0.25, decay: 4, wave: 'saw', gain: 0.45 },
  vx_fly_start: { f0: 220, f1: 800, dur: 0.38, noise: 0.45, decay: 7, wave: 'saw', gain: 0.5 }, vx_fly_slam: { f0: 120, f1: 36, dur: 0.5, noise: 0.55, decay: 6, wave: 'sine', gain: 0.9 }, vx_fly_soft: { f0: 700, f1: 300, dur: 0.15, noise: 0.3, decay: 13, wave: 'bell', gain: 0.25, fm: 1.6 },
  vx_shift: { f0: 400, f1: 1200, dur: 0.3, noise: 0.25, decay: 8, wave: 'bell', gain: 0.6, fm: 2.2 },
} satisfies Record<string, Recipe>);
/** Vex event -> recipe. The n field carries the beat / tier flags (see VexCombat.ts); one cue per beat, cast or landing, never per target. */
export function vexCombatSfx(kind: string, n = 0): string | null {
  switch (kind) {
    case 'vex_auto': return ((n >> 2) & 3) === 2 ? ((n & 3) >= 2 ? 'vx_judg_big' : 'vx_judg') : ['vx_cut_a', 'vx_cut_b', 'vx_cut_c', 'vx_cut_d'][n & 3];
    case 'vex_q_guard': return (n & 3) === 1 ? 'vx_guard_perfect' : 'vx_guard'; case 'vex_q_echo': return 'vx_echo'; case 'vex_q_legion': return (n & 1023) > 0 ? 'vx_legion' : null; case 'vex_q_clone_cut': return 'vx_clone';
    case 'vex_e_open': return 'vx_portal'; case 'vex_e_arrive': return 'vx_arrive'; case 'vex_e_cut': return (n & 4) ? 'vx_sever' : 'vx_exec_cut'; case 'vex_e_warn': return 'vx_warn'; case 'vex_e_shock': return 'vx_reconnect';
    case 'vex_r_cast': return 'vx_cast'; case 'vex_r_erupt': return (n & 32) ? 'vx_seal_final' : 'vx_seal'; case 'vex_r_tick': return 'vx_domain_tick'; case 'vex_r_end': return null;
    case 'vex_v_charge': return 'vx_v_charge'; case 'vex_v_tier': return 'vx_v_tier'; case 'vex_v_release': return 'vx_v_release'; case 'vex_v_hit': return 'vx_v_hit';
    case 'vex_v_pulse': return ((n >> 20) & 3) === 2 ? 'vx_horizon' : 'vx_v_pulse'; case 'vex_v_block': return 'vx_v_block'; case 'vex_v_fizzle': case 'vex_v_miss': return 'vx_v_fizzle';
    case 'vex_od_start': return n === 2 ? 'vx_od_start2' : 'vx_od_start'; case 'vex_od_end': return 'vx_od_end';
    case 'vex_fly_start': return 'vx_fly_start'; case 'vex_fly_land': return (n & 1) ? 'vx_fly_slam' : 'vx_fly_soft'; case 'vex_shift': return 'vx_shift';
    default: return null;
  }
}
/** Which sim event plays which recipe (event kind -> recipe name). */
export const EVENT_SFX: Record<string, string> = { parry_perfect: 'parry_perfect', parry_guard: 'parry_guard', parry_start: 'parry_start', reversal_blink: 'reversal_blink', reversal_riposte: 'reversal_riposte', seal_mark: 'seal_mark', seal_detonate: 'seal_detonate', ult_start: 'ult_start', ult_release: 'ult_release', branch_fx: 'branch_fx', legend_fx: 'legend_fx', surge_start: 'kk_surge', scatter_fire: 'kk_scatter', scatter_blast: 'kk_blast', meteor_beat: 'kk_meteor', flare_start: 'kk_flare_wind', flare_pillar: 'kk_pillar', crucible_cast: 'kk_gather', crucible_pulse: 'kk_pulse', crucible_final: 'kk_final', clone_spawn: 'kk_clone', clone_end: 'kk_clone_end', rift_hop: 'kk_hop', surge_end: 'kk_surge_end', clone_strike: 'kk_echo_strike', clone_target: 'kk_echo_lock' };
export const B22_EVENT_SFX: Record<string, string> = { lf_found: 'lf_found', lf_open: 'lf_open', lf_win: 'lf_win', lf_fail: 'lf_fail', lf_bargain: 'lf_bargain', lf_ambush: 'lf_ambush', relic_gain: 'relic_gain', legend_gain: 'legend_gain', prism: 'prism', sigil_strike: 'sigil_strike', dawn_ring: 'dawn_ring', hourglass: 'hourglass', rift: 'rift', bearing: 'bearing', echo_warn: 'echo_warn', mark: 'mark', ult_cannon: 'ult_cannon', ult_judge: 'ult_judge', parry: 'parry_perfect', ult_collapse: 'ult_release', ult_beam: 'ult_cannon', collapse_blast: 'seal_detonate', crucible_burst: 'seal_detonate', collision: 'seal_detonate', seal_blast: 'seal_detonate' };
/** B23: every signature entry (branch, legendary, relic, pair, ultimate) gets its OWN recipe, derived deterministically from the id and its shape family, so no two entries share a sound. Existing hand-tuned recipes keep priority. */
const hash = (id: string) => { let h = 2166136261; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
const FAMILY: Partial<Record<Shape, Partial<Recipe> & { base: number }>> = {
  quake: { base: 90, wave: 'sine', noise: 0.5, decay: 7, dur: 0.4 }, cone: { base: 300, wave: 'saw', noise: 0.6, decay: 10, dur: 0.3 }, prism: { base: 1500, wave: 'bell', noise: 0, decay: 12, dur: 0.25, fm: 2.5 }, flames: { base: 260, wave: 'saw', noise: 0.5, decay: 6, dur: 0.5 },
  star: { base: 800, wave: 'bell', noise: 0.02, decay: 5, dur: 0.6, fm: 2 }, twin: { base: 200, wave: 'sine', noise: 0.2, decay: 5, dur: 0.6 }, chain: { base: 700, wave: 'square', noise: 0.2, decay: 14, dur: 0.2 }, shatter: { base: 500, wave: 'square', noise: 0.7, decay: 9, dur: 0.35 },
  relay: { base: 900, wave: 'saw', noise: 0.15, decay: 13, dur: 0.22 }, burst: { base: 180, wave: 'saw', noise: 0.55, decay: 8, dur: 0.4 }, rain: { base: 1100, wave: 'saw', noise: 0.5, decay: 9, dur: 0.45 }, crater: { base: 100, wave: 'sine', noise: 0.6, decay: 4, dur: 0.7 },
  spiral: { base: 600, wave: 'sine', noise: 0.1, decay: 6, dur: 0.5, fm: 1.5 }, lanes: { base: 1200, wave: 'saw', noise: 0.3, decay: 11, dur: 0.3 }, meridian: { base: 1700, wave: 'saw', noise: 0.2, decay: 9, dur: 0.4 }, dots: { base: 1300, wave: 'bell', noise: 0, decay: 15, dur: 0.3, fm: 3 },
  implode: { base: 900, wave: 'sine', noise: 0.3, decay: 4, dur: 0.6 }, shield: { base: 350, wave: 'square', noise: 0.3, decay: 10, dur: 0.3 }, mirror: { base: 1400, wave: 'bell', noise: 0.05, decay: 9, dur: 0.35, fm: 3.4 }, slash: { base: 800, wave: 'saw', noise: 0.4, decay: 16, dur: 0.18 },
  eclipse: { base: 120, wave: 'sine', noise: 0.15, decay: 3.5, dur: 0.8 }, marks: { base: 1000, wave: 'bell', noise: 0, decay: 12, dur: 0.25, fm: 2.2 }, judgment: { base: 600, wave: 'bell', noise: 0.15, decay: 5, dur: 0.6, fm: 2.8 }, sigil: { base: 500, wave: 'bell', noise: 0.05, decay: 8, dur: 0.3 },
  dawn: { base: 300, wave: 'sine', noise: 0.1, decay: 4, dur: 0.6 }, hourglass: { base: 500, wave: 'sine', noise: 0.05, decay: 3.5, dur: 0.7 }, rift: { base: 250, wave: 'saw', noise: 0.4, decay: 8, dur: 0.35 }, compass: { base: 760, wave: 'bell', noise: 0, decay: 15, dur: 0.14 },
  lens: { base: 880, wave: 'bell', noise: 0, decay: 8, dur: 0.3, fm: 1.6 }, feather: { base: 1300, wave: 'saw', noise: 0.25, decay: 12, dur: 0.22 }, dragon: { base: 220, wave: 'saw', noise: 0.45, decay: 4, dur: 0.8 },
};
export const idRecipe = (id: string, shape: Shape): Recipe => { const f = FAMILY[shape] ?? { base: 400 }, j = hash(id), base = f.base * (0.8 + 0.5 * j), up = hash(id + 'u') > 0.5; return { f0: up ? base : base * 1.8, f1: up ? base * 1.9 : base * 0.6, dur: f.dur ?? 0.3, noise: f.noise ?? 0.2, decay: f.decay ?? 8, wave: f.wave ?? 'saw', gain: 0.55 + 0.25 * hash(id + 'g'), fm: f.fm }; };
for (const [id, sg] of Object.entries(SIGNATURES)) { const key = `sig_${id}`; if (!SFX[key]) SFX[key] = idRecipe(id, sg.shape); }
// Stillfire's reveal is deliberately near-silent (a soft, slow breath), not a roar
if (SFX.sig_reveal_still) Object.assign(SFX.sig_reveal_still, { gain: 0.3, noise: 0.02, wave: 'sine', decay: 2.2, dur: 1.1 });
export const signatureSfx = (id: string): string | null => (SIGNATURES[id] ? `sig_${id}` : null);
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
/** B32: events whose recipe depends on what the simulation reported (beat index, hit or whiff, killed or expired), so a miss, a final strike and an expiry never share a sound. */
export function b32Sfx(kind: string, n = 0, b?: number): string | null {
  if (kind === 'meteor_beat') { const last = n >= 100, hit = (last ? n - 100 : n) > 0; return !hit ? 'kk_meteor_miss' : last ? 'kk_meteor_fin' : (b ?? 0) >= 1 ? 'kk_meteor_1' : 'kk_meteor'; }
  if (kind === 'clone_end') return n === 1 ? 'kk_echo_shatter' : 'kk_echo_fade';
  return null;
}

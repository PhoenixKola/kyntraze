"""KYNTRAZE B19 - Ren (crimson brawler) and Sora (azure controller) sound sets, synthesised from scratch with the B05/B13 helpers (numpy only, deterministic seeds, nothing sampled or copied).
  python synth_b19.py <out_dir>      -> 16-bit mono 44.1 kHz WAVs (public/audio/hero-abilities/) + loudness.json
Palettes (deliberately different from each other and from Kai's):
  REN   low, warm, grounded: sub thumps, saturated noise bodies, saw growls, ember crackle. Nothing above ~6 kHz except crisp strike snaps.
  SORA  high, luminous, precise: FM/inharmonic bells in D major (lydian colour), clean sine glides, thin air, tiny electric ticks. Sub is soft.
Timing contract (the sim drives the voices; see src/game/audio/abilityAudio.ts handleHero):
  REN  ren_auto_a/b ~0.22 s, ren_auto_fin ~0.5 s, ren_q_start ~0.25 s, ren_q_beat ~0.2 s (rate rises per beat), ren_q_fin ~0.7 s, rush_start ~0.45 s, rush_hop ~0.25 s, rush_strike ~0.75 s, rush_end ~0.4 s,
       bloodstar_crouch ~0.45 s, bloodstar_leap ~0.5 s, bloodstar_slam ~1.7 s, bloodstar_ring ~0.9 s, bloodstar_rebound ~1.0 s,
       ren_ascend_charge ~1.6 s (cut at the break), ren_ascend_break ~1.6 s, ren_ascend_commit ~1.1 s, ren_ascend_end ~0.7 s, ren_aura 2.0 s LOOP-safe (re-armed from the sim clock)
  SORA needle_fire ~0.12 s (tiny, very frequent), volley_fire ~0.55 s, lance_charge ~1.4 s (rising, cut at release), lance_tier ~0.25 s, lance_fire ~1.0 s, lance_pulse ~0.2 s, lance_end ~0.6 s,
       horizon_summon ~0.9 s, horizon_converge ~0.65 s, horizon_burst ~1.4 s, horizon_end ~0.5 s,
       sora_ascend_charge ~1.6 s, sora_ascend_break ~1.5 s, sora_ascend_commit ~1.3 s, sora_ascend_end ~0.7 s, sora_aura 2.0 s LOOP-safe
Audio quality is NOT VERIFIED BY EAR (authored blind); each file is checked numerically (peak, RMS, DC, loop seam, spectral centroid)."""
import math, os, sys, json
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "kai", "abilities", "audio"))
from synth_b05 import SR, t_of, noise, stft_filter, lin, expc, osc, reverb, norm_to, trim, pad, fade, write_wav, lufs, crackle, sat
from synth_b13 import env, bell, thump, air, at, circ_band

def sub(n, f0, f1, dec, atk=0.01, amp=1.0): return thump(n, f0, f1, dec, atk) * amp
def snap(n, seed, fc=3200, dec=0.03, amp=1.0, kind="lp"):
    t = t_of(n); return stft_filter(noise(n, seed), np.full(n, float(fc)), 2.0, kind) * np.exp(-t / dec) * amp
def growl(n, f, dec, drive=2.4, atk=0.02):
    t = t_of(n); x = osc(np.full(n, f), "saw", (-9, 0, 9)) * 0.6 + osc(np.full(n, f * 0.5), "sine") * 0.5
    return sat(stft_filter(x, np.full(n, f * 7.0), 2, "lp"), drive) * env(n, atk, dec)
def fm(n, fc, ratio, index, dec, atk=0.003):
    t = t_of(n); mod = np.sin(2 * math.pi * fc * ratio * t) * index * np.exp(-t / (dec * 0.6)); return np.sin(2 * math.pi * fc * t + mod) * env(n, atk, dec)
def whoosh(n, seed, lo, hi, bw=1.7, a=0.04, d=0.25): return air(n, seed, lo, hi, bw) * env(n, a, d)

# ---------------------------------------------------------------- REN
def punch(seed, f0, dec=0.09, snapfc=2600, length=0.22):
    n = int(length * SR); x = sub(n, f0, f0 * 0.34, dec, 0.004, 1.7) + snap(n, seed, snapfc, 0.026, 0.9) + snap(n, seed + 1, 480, 0.05, 0.6)
    return trim(fade(sat(x, 1.6), 0.001, 0.02), length, 0.05)
def ren_auto_a(): return punch(1101, 175)
def ren_auto_b(): return punch(1102, 145, 0.1, 2200)
def ren_auto_fin():
    n = int(0.5 * SR); x = sub(n, 112, 36, 0.17, 0.005, 2.0) + snap(n, 1111, 3600, 0.04, 1.1) + snap(n, 1112, 420, 0.12, 0.9) + sub(n, 62, 30, 0.22, 0.02, 0.8)
    return trim(fade(reverb(sat(x, 1.9), 0.3, 0.14, 2, 2400), 0.001, 0.03), 0.5, 0.12)
def ren_q_start(): n = int(0.25 * SR); return trim(fade(whoosh(n, 1121, 250, 1800, 1.8, 0.05, 0.12) * 0.8 + sub(n, 90, 60, 0.1, 0.03, 0.5), 0.01, 0.06), 0.25, 0.06)
def ren_q_beat(): return punch(1131, 210, 0.06, 3000, 0.2)
def ren_q_fin():
    n = int(0.7 * SR); x = sub(n, 120, 34, 0.24, 0.005, 2.3) + snap(n, 1141, 4200, 0.05, 1.2) + snap(n, 1142, 380, 0.16, 1.0) + sub(n, 54, 28, 0.3, 0.03, 1.0)
    x = at(x, sub(int(0.3 * SR), 150, 50, 0.1, 0.004, 1.2), 0.07)
    return trim(fade(reverb(sat(x, 2.0), 0.5, 0.2, 3, 2500), 0.001, 0.03), 0.7, 0.2)
def rush_start():
    n = int(0.45 * SR); u = np.linspace(0, 1, n); x = whoosh(n, 1151, 260, 4200, 1.9, 0.06, 0.3) * 1.0 + osc(lin(60, 150, n), "sine") * np.sin(u * math.pi * 0.8) * 0.6 + snap(n, 1152, 5000, 0.02, 0.5, "hp")
    return trim(fade(sat(x, 1.3), 0.004, 0.05), 0.45, 0.1)
def rush_hop():
    n = int(0.25 * SR); x = whoosh(n, 1161, 700, 5200, 1.7, 0.02, 0.12) + sub(n, 130, 70, 0.07, 0.003, 0.7); return trim(fade(x, 0.002, 0.04), 0.25, 0.07)
def rush_strike():
    n = int(0.75 * SR); x = sub(n, 100, 30, 0.2, 0.004, 2.2) + snap(n, 1171, 5200, 0.1, 1.2) + snap(n, 1172, 500, 0.18, 1.0) + crackle(n, 900 * np.exp(-t_of(n) / 0.15), 1173, 1800) * 0.5
    return trim(fade(reverb(sat(x, 1.8), 0.45, 0.18, 4, 3000), 0.001, 0.03), 0.75, 0.2)
def rush_end(): n = int(0.4 * SR); return trim(fade(air(n, 1181, 3000, 300, 1.8) * env(n, 0.01, 0.12) * 0.7 + sub(n, 70, 44, 0.12, 0.01, 0.5), 0.004, 0.05), 0.4, 0.12)
def bloodstar_crouch():
    n = int(0.45 * SR); u = np.linspace(0, 1, n); x = growl(n, 52, 0.4, 1.8, 0.1) * (0.4 + 0.6 * u) + air(n, 1191, 200, 900, 1.8) * u ** 2 * 0.4
    return trim(fade(x, 0.02, 0.06), 0.45, 0.1)
def bloodstar_leap():
    n = int(0.5 * SR); u = np.linspace(0, 1, n); x = whoosh(n, 1201, 220, 3600, 1.8, 0.05, 0.4) + osc(lin(45, 130, n), "saw", (-6, 6)) * np.sin(u * math.pi * 0.9) * 0.35 + sub(n, 80, 55, 0.2, 0.03, 0.6)
    return trim(fade(sat(x, 1.3), 0.005, 0.07), 0.5, 0.1)
def bloodstar_slam():
    n = int(1.7 * SR); t = t_of(n); x = sub(n, 74, 24, 0.55, 0.004, 3.0) + sub(n, 46, 22, 0.8, 0.03, 1.2) + snap(n, 1211, 3800, 0.2, 1.6) + snap(n, 1212, 380, 0.45, 1.2)
    x += crackle(n, 700 * np.exp(-t / 0.6), 1213, 1400) * 0.6 + growl(n, 41, 0.7, 2.6, 0.01) * 0.5
    return trim(fade(reverb(sat(x, 1.7), 1.3, 0.3, 5, 2200), 0.001, 0.05), 1.7, 0.45)
def bloodstar_ring():
    n = int(0.9 * SR); t = t_of(n); x = stft_filter(noise(n, 1221), expc(2600, 130, n), 2.0, "lp") * env(n, 0.03, 0.3) * 0.9 + osc(np.full(n, 46.0), "sine") * env(n, 0.15, 0.4) * 0.8
    return trim(fade(x, 0.01, 0.06), 0.9, 0.25)
def bloodstar_rebound():
    n = int(1.0 * SR); x = sub(n, 82, 28, 0.32, 0.006, 2.2) + snap(n, 1231, 2800, 0.1, 1.0) + snap(n, 1232, 320, 0.3, 0.9)
    return trim(fade(reverb(sat(x, 1.7), 0.7, 0.22, 6, 2200), 0.001, 0.04), 1.0, 0.3)
def ren_ascend_charge():
    n = int(1.6 * SR); u = np.linspace(0, 1, n); t = t_of(n); x = np.zeros(n)
    x += osc(lin(38, 120, n), "saw", (-8, 8)) * u ** 1.5 * 0.5 + growl(n, 55, 2.0, 2.2, 0.3) * u * 0.7
    x += stft_filter(noise(n, 1241), lin(300, 2600, n), 1.8, "bp") * u ** 2 * 0.8   # rising heat roar
    k = 0.0
    for i in range(14):                                                           # accelerating heart-thumps
        k += 0.28 - 0.2 * (i / 14) ** 0.8
        if k < 1.55: x = at(x, sub(int(0.25 * SR), 70, 36, 0.09, 0.004, 0.9 + 1.2 * k / 1.6), k)
    return trim(fade(sat(x, 1.4), 0.03, 0.03), 1.6, 0.05)
def ren_ascend_break():
    n = int(1.6 * SR); t = t_of(n); x = sub(n, 64, 22, 0.55, 0.004, 3.2) + sub(n, 40, 20, 0.9, 0.02, 1.6) + snap(n, 1251, 4500, 0.12, 1.5) + stft_filter(noise(n, 1252), expc(3000, 160, n), 2.2, "lp") * env(n, 0.005, 0.5) * 1.3
    x += growl(n, 58, 0.8, 3.0, 0.005) * 0.8 + crackle(n, 600 * np.exp(-t / 0.7), 1253, 1500) * 0.5
    return trim(fade(reverb(sat(x, 1.8), 1.4, 0.3, 7, 2600), 0.001, 0.05), 1.6, 0.4)
def ren_ascend_commit():
    n = int(1.1 * SR); t = t_of(n); x = growl(n, 110, 0.7, 2.6, 0.03) * 0.9 + growl(n, 165, 0.5, 2.6, 0.03) * 0.5 + air(n, 1261, 400, 3200, 1.8) * env(n, 0.05, 0.35) * 0.8 + sub(n, 60, 36, 0.3, 0.01, 1.4)
    x += crackle(n, 500 * np.exp(-t / 0.6), 1262, 1800) * 0.4
    return trim(fade(reverb(sat(x, 1.6), 0.8, 0.22, 8, 2800), 0.004, 0.05), 1.1, 0.3)
def ren_ascend_end(): n = int(0.7 * SR); return trim(fade(osc(expc(160, 40, n), "saw") * env(n, 0.01, 0.2) * 0.5 + air(n, 1271, 2400, 240, 1.8) * env(n, 0.02, 0.22) * 0.8 + sub(n, 60, 32, 0.2, 0.01, 0.9), 0.004, 0.05), 0.7, 0.2)
def ren_aura():
    n = 2 * SR; t = t_of(n); x = np.zeros(n)
    for f, a, ph in ((55.0, 0.8, 0.0), (82.5, 0.45, 1.1), (110.0, 0.35, 2.0), (165.0, 0.18, 0.4), (220.0, 0.09, 3.0)): x += np.sin(2 * math.pi * f * t + ph) * a * (0.7 + 0.3 * np.sin(2 * math.pi * 0.5 * t + ph))
    x += circ_band(n, 1281, 180, 1400) * 0.24 * (0.65 + 0.35 * np.sin(2 * math.pi * 1.0 * t + 0.6)) + circ_band(n, 1282, 1800, 5200) * 0.05
    return x

# ---------------------------------------------------------------- SORA
def needle_fire():
    n = int(0.12 * SR); x = fm(n, 2349, 2.0, 1.2, 0.05) * 0.6 + snap(n, 2101, 4800, 0.008, 0.35, "hp"); return trim(fade(x, 0.001, 0.02), 0.12, 0.04)
def volley_fire():
    n = int(0.55 * SR); x = np.zeros(n); notes = (1175.0, 1319.0, 1568.0, 1760.0, 2093.0, 2349.0, 2637.0)
    for i, f in enumerate(notes): x = at(x, fm(int(0.22 * SR), f, 2.0, 1.4, 0.09) * 0.8 + snap(int(0.22 * SR), 2110 + i, 4800, 0.012, 0.3, "hp"), 0.022 * i)
    x += whoosh(n, 2119, 1500, 7000, 1.8, 0.03, 0.18) * 0.4
    return trim(fade(reverb(x, 0.3, 0.14, 2, 7000), 0.001, 0.03), 0.55, 0.12)
def lance_charge():
    n = int(1.4 * SR); t = t_of(n); u = np.linspace(0, 1, n); sw = u ** 1.4; fmin = math.log(2.0) * 580.0; x = np.zeros(n)   # Shepard glide: three octave-spaced voices, exactly periodic every second
    for k in range(3):
        ph_u = (t + k / 3.0) % 1.0; f = fmin * 2.0 ** ph_u; a = np.sin(math.pi * ph_u) ** 2; x += np.sin(2 * math.pi * np.cumsum(f) / SR) * a * 0.5
    x *= 0.55 + 0.9 * sw
    x += bell(n, 1568.0, 1.4, 0.0) + air(n, 2121, 3000, 9000, 1.6) * sw ** 2 * 0.3 + osc(lin(70, 110, n), "sine") * sw * 0.3
    for tt, f in ((0.3, 1175.0), (0.8, 1568.0), (1.3, 2093.0)): x = at(x, bell(int(0.4 * SR), f, 0.35, 0.45), tt)
    return trim(fade(x, 0.02, 0.02), 1.4, 0.04)
def lance_tier(): n = int(0.25 * SR); return trim(fade(bell(n, 1760.0, 0.14, 0.9) + bell(n, 2349.0, 0.11, 0.6), 0.001, 0.03), 0.25, 0.08)
def lance_fire():
    n = int(1.0 * SR); t = t_of(n); x = snap(n, 2131, 4800, 0.03, 1.3, "hp") + fm(n, 880.0, 3.0, 4.0, 0.5) * 0.7 + osc(expc(5200, 700, n), "sine") * env(n, 0.002, 0.1) * 0.8 + bell(n, 1175.0, 0.9, 0.8) + bell(n, 1760.0, 0.7, 0.5) + sub(n, 90, 44, 0.12, 0.004, 0.7)
    x += air(n, 2132, 2500, 9500, 1.8) * env(n, 0.004, 0.25) * 0.6
    return trim(fade(reverb(x, 0.8, 0.26, 3, 6500), 0.001, 0.04), 1.0, 0.3)
def lance_pulse(): n = int(0.2 * SR); return trim(fade(bell(n, 2637.0, 0.1, 0.8) + snap(n, 2141, 4800, 0.012, 0.4, "hp"), 0.001, 0.03), 0.2, 0.06)
def lance_end(): n = int(0.6 * SR); return trim(fade(osc(expc(1760, 640, n), "sine") * env(n, 0.01, 0.22) * 0.5 + air(n, 2151, 8000, 1500, 1.8) * env(n, 0.01, 0.15) * 0.5 + bell(n, 880.0, 0.35, 0.4), 0.004, 0.04), 0.6, 0.2)
def horizon_summon():
    n = int(0.9 * SR); x = np.zeros(n)
    for i, f in enumerate((784.0, 988.0, 1175.0, 1480.0, 1760.0)): x = at(x, bell(int(0.7 * SR), f, 0.6, 0.55 + 0.05 * i), 0.07 * i)
    x += whoosh(n, 2161, 800, 7500, 1.8, 0.2, 0.4) * 0.45 + osc(lin(196, 392, n), "sine") * env(n, 0.3, 0.5) * 0.3
    return trim(fade(reverb(x, 0.7, 0.28, 4, 7000), 0.002, 0.05), 0.9, 0.25)
def horizon_converge():
    n = int(0.65 * SR); u = np.linspace(0, 1, n); x = np.zeros(n)
    for f0, a in ((294.0, 0.5), (440.0, 0.4), (587.0, 0.35), (880.0, 0.25)): x += osc(lin(f0, f0 * 2, n), "sine") * a * u ** 1.5
    x += air(n, 2171, 1200, 8800, 1.7) * u ** 2.2 * 0.5 + osc(lin(60, 120, n), "sine") * u * 0.4
    return trim(fade(x * (0.3 + u), 0.02, 0.01), 0.65, 0.02)
def horizon_burst():
    n = int(1.4 * SR); x = bell(n, 587.0, 1.3, 1.0) + bell(n, 880.0, 1.2, 0.8) + bell(n, 1175.0, 1.0, 0.7) + bell(n, 1760.0, 0.9, 0.5) + bell(n, 2349.0, 0.7, 0.3)
    x += sub(n, 96, 40, 0.18, 0.004, 1.3) + snap(n, 2181, 4800, 0.05, 1.0, "hp") * 0.8 + air(n, 2182, 1800, 9000, 1.8) * env(n, 0.004, 0.3) * 0.7
    return trim(fade(reverb(x, 1.2, 0.34, 5, 6500), 0.001, 0.05), 1.4, 0.35)
def horizon_end(): n = int(0.5 * SR); return trim(fade(bell(n, 1175.0, 0.3, 0.6) + air(n, 2191, 6500, 1200, 1.8) * env(n, 0.01, 0.12) * 0.4, 0.004, 0.04), 0.5, 0.18)
def sora_ascend_charge():
    n = int(1.6 * SR); u = np.linspace(0, 1, n); t = t_of(n); x = np.zeros(n)
    for i, f in enumerate((587.0, 784.0, 988.0, 1175.0, 1480.0, 1760.0, 2349.0)): x = at(x, bell(int(0.9 * SR), f, 0.55, 0.45 + 0.07 * i), 0.19 * i)
    x += osc(lin(196, 784, n), "sine") * u ** 1.6 * 0.5 + air(n, 2201, 1500, 9500, 1.7) * u ** 2 * 0.6 + osc(lin(55, 98, n), "sine") * u * 0.35
    return trim(fade(reverb(x, 0.6, 0.22, 4, 7000), 0.02, 0.03), 1.6, 0.05)
def sora_ascend_break():
    n = int(1.5 * SR); t = t_of(n); x = snap(n, 2211, 4800, 0.04, 1.6, "hp") + osc(expc(6000, 500, n), "sine") * env(n, 0.002, 0.15) * 0.9 + fm(n, 1175.0, 3.0, 5.0, 0.5) * 0.7
    x += bell(n, 587.0, 1.4, 1.0) + bell(n, 880.0, 1.3, 0.8) + bell(n, 1760.0, 1.0, 0.6) + sub(n, 80, 38, 0.3, 0.005, 1.5) + air(n, 2212, 2000, 9500, 1.9) * env(n, 0.004, 0.4) * 0.9
    return trim(fade(reverb(x, 1.4, 0.34, 6, 6800), 0.001, 0.05), 1.5, 0.4)
def sora_ascend_commit():
    n = int(1.3 * SR); x = np.zeros(n)
    for f, d, a, t0 in ((587.0, 1.2, 0.9, 0.0), (740.0, 1.1, 0.6, 0.03), (880.0, 1.1, 0.8, 0.06), (1109.0, 1.0, 0.5, 0.09), (1175.0, 1.0, 0.6, 0.12), (1760.0, 0.9, 0.35, 0.15)): x = at(x, bell(n, f, d, a), t0)
    x += osc(np.full(n, 1180.0), "sine", (-7, 7), (5.0, 0.002)) * env(n, 0.3, 0.8) * 0.2 + air(n, 2221, 2500, 9000, 1.8) * env(n, 0.05, 0.4) * 0.5
    return trim(fade(reverb(x, 1.1, 0.34, 7, 6500), 0.002, 0.05), 1.3, 0.35)
def sora_ascend_end(): n = int(0.7 * SR); return trim(fade(bell(n, 880.0, 0.4, 0.7) + bell(n, 587.0, 0.5, 0.5) + osc(expc(1175, 330, n), "sine") * env(n, 0.01, 0.2) * 0.3 + air(n, 2231, 6500, 700, 1.8) * env(n, 0.02, 0.18) * 0.6, 0.004, 0.06), 0.7, 0.25)
def sora_aura():
    n = 2 * SR; t = t_of(n); x = np.zeros(n)
    for f, a, ph in ((293.5, 0.5, 0.0), (440.0, 0.4, 1.2), (587.0, 0.3, 2.2), (880.0, 0.2, 0.6), (1175.0, 0.1, 3.4)): x += np.sin(2 * math.pi * f * t + ph) * a * (0.7 + 0.3 * np.sin(2 * math.pi * 0.5 * t + ph))
    x += circ_band(n, 2241, 3000, 9000) * 0.12 * (0.6 + 0.4 * np.sin(2 * math.pi * 1.0 * t + 0.4))
    return x

SORA_SET = {'needle_fire', 'volley_fire', 'lance_charge', 'lance_tier', 'lance_fire', 'lance_pulse', 'lance_end', 'horizon_summon', 'horizon_converge', 'horizon_burst', 'horizon_end', 'sora_ascend_charge', 'sora_ascend_break', 'sora_ascend_commit', 'sora_ascend_end'}
def squeeze(x):
    """Sora's sounds are transient-led (bells + clicks): a gentle soft-clip on the 99.5th percentile lifts the body without distorting the tone, so they sit at a comparable loudness to Ren's."""
    return np.tanh(1.7 * x / (np.percentile(np.abs(x), 99.5) + 1e-9))
SOUNDS = dict(
    ren_auto_a=(ren_auto_a, -9.0), ren_auto_b=(ren_auto_b, -9.0), ren_auto_fin=(ren_auto_fin, -5.0), ren_q_start=(ren_q_start, -14.0), ren_q_beat=(ren_q_beat, -8.0), ren_q_fin=(ren_q_fin, -3.5),
    rush_start=(rush_start, -8.0), rush_hop=(rush_hop, -9.0), rush_strike=(rush_strike, -4.5), rush_end=(rush_end, -12.0),
    bloodstar_crouch=(bloodstar_crouch, -12.0), bloodstar_leap=(bloodstar_leap, -8.0), bloodstar_slam=(bloodstar_slam, -2.5), bloodstar_ring=(bloodstar_ring, -10.0), bloodstar_rebound=(bloodstar_rebound, -5.0),
    ren_ascend_charge=(ren_ascend_charge, -8.0), ren_ascend_break=(ren_ascend_break, -2.5), ren_ascend_commit=(ren_ascend_commit, -5.0), ren_ascend_end=(ren_ascend_end, -10.0), ren_aura=(ren_aura, -24.0),
    needle_fire=(needle_fire, -17.0), volley_fire=(volley_fire, -8.0), lance_charge=(lance_charge, -12.0), lance_tier=(lance_tier, -11.0), lance_fire=(lance_fire, -4.0), lance_pulse=(lance_pulse, -11.0), lance_end=(lance_end, -10.0),
    horizon_summon=(horizon_summon, -9.0), horizon_converge=(horizon_converge, -11.0), horizon_burst=(horizon_burst, -3.5), horizon_end=(horizon_end, -13.0),
    sora_ascend_charge=(sora_ascend_charge, -10.0), sora_ascend_break=(sora_ascend_break, -3.0), sora_ascend_commit=(sora_ascend_commit, -5.0), sora_ascend_end=(sora_ascend_end, -10.0), sora_aura=(sora_aura, -26.0))
LOOPS = ("ren_aura", "sora_aura")
def check(name, x):
    f = np.fft.rfftfreq(len(x), 1 / SR); S = np.abs(np.fft.rfft(x)); rec = {"dc": round(float(x.mean()), 5), "centroid_hz": int((f * S).sum() / (S.sum() + 1e-9))}
    if name in LOOPS: step = float(np.abs(np.diff(x)).max()); rec["loop_seam_step"] = round(float(abs(x[0] - x[-1])), 5); rec["max_internal_step"] = round(step, 5); rec["seam_ok"] = bool(abs(x[0] - x[-1]) <= 1.2 * step)
    return rec
if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); lp = os.path.join(out, "loudness.json"); rep = json.load(open(lp)) if os.path.exists(lp) else {}
    for name, (fn, peak) in SOUNDS.items():
        x = fn()
        if name in LOOPS: x = x - x.mean()
        if name in SORA_SET: x = squeeze(x)
        x = x / (np.abs(x).max() + 1e-9) * 10 ** (peak / 20) if name in LOOPS else norm_to(x, peak)
        write_wav(os.path.join(out, name + ".wav"), x)
        rep[name] = {"seconds": round(len(x) / SR, 3), "peak_dBFS": round(20 * math.log10(float(np.abs(x).max())), 2), "rms_dBFS": round(20 * math.log10(float(np.sqrt(np.mean(x ** 2)))), 2), "approx_LUFS_integrated": round(lufs(x), 1),
                     "clipped_samples": int((np.abs(x) >= 0.9999).sum()), **check(name, x)}
        print(name, rep[name])
    json.dump(rep, open(lp, "w"), indent=1)

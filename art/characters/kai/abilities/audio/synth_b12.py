"""KYNTRAZE B12 - Form II (Cometheart) sound design, synthesised from scratch with the B05.1 helpers (numpy only, deterministic seeds, nothing sampled or copied).
  python synth_b12.py <out_dir>      -> 16-bit mono 44.1 kHz WAVs (public/audio/kai-abilities/)
Timing contract (the sim drives the voices; see src/game/audio/abilityAudio.ts):
  form2_charge  2.0 s swell that ends at the cinematic's breaking point      form2_break  boom + ground crack      form2_commit  stinger on the reveal flash
  dragon_windup 0.30 s intake -> dragon_launch (release tick) -> dragon_hit    comet_gather 1.1 s swell (= CANNON.gather) -> comet_fire body 2.3 s gated by the sim -> comet_end tail
  aura_crackle  a short low electric crackle, played at random intervals while Form II idles (render side)"""
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth_b05 import SR, t_of, noise, stft_filter, lin, expc, osc, crackle, reverb, sat, norm_to, trim, pad, fade, write_wav, lufs
import json

def form2_charge():
    n = int(2.0 * SR); u = np.linspace(0, 1, n); t = t_of(n); sw = u ** 2.4
    wind = stft_filter(noise(n, 101), expc(180, 5200, n), 1.7) * sw * 1.5
    pad_ = stft_filter(osc(expc(70, 330, n), "saw", (-11, 0, 13), (5.0, 0.008)), expc(300, 4200, n), 3) * sw * 1.1
    sub = osc(lin(42, 78, n), "sine") * sw * 0.9
    shimmer = osc(expc(660, 2640, n), "sine", (-6, 6)) * sw ** 3 * 0.3
    cr = crackle(n, 20 + 1200 * u ** 2.5, 102) * (0.4 + sw) * 1.4
    x = wind + pad_ + sub + shimmer + cr
    return trim(fade(reverb(sat(x, 1.5), 0.35, 0.14), 0.02, 0.02), 2.0, 0.05)
def form2_break():
    n = int(1.3 * SR); t = t_of(n)
    boom = osc(expc(120, 30, n), "sine") * np.exp(-t / 0.45) * 2.2
    crack = stft_filter(noise(n, 111), np.full(n, 2400.0), 3, "hp") * np.exp(-t / 0.05) * 2.4
    rumble = stft_filter(noise(n, 112), expc(900, 70, n), 2) * np.exp(-t / 0.4) * 1.5
    zap = stft_filter(osc(expc(3400, 200, n), "saw", (-14, 14)), expc(6000, 500, n), 2) * np.exp(-t / 0.14) * 1.1
    deb = crackle(n, 600 * np.exp(-t / 0.5), 113, 1800) * 1.3
    return trim(fade(reverb(sat(boom + crack + rumble + zap + deb, 1.7), 0.7, 0.22), 0.001, 0.06), 1.3, 0.2)
def form2_commit():
    n = int(1.4 * SR); t = t_of(n)
    hit = stft_filter(noise(n, 121), np.full(n, 3000.0), 3, "hp") * np.exp(-t / 0.03) * 2.0
    chord = sum(osc(np.full(n, f), "saw", (-8, 0, 9)) * a for f, a in ((110, 1.0), (165, 0.7), (220, 0.8), (330, 0.5), (440, 0.4)))
    chord = stft_filter(chord, 1500 + 3500 * np.exp(-t / 0.5), 2.5) * np.exp(-t / 0.55) * 0.55
    sub = osc(expc(80, 36, n), "sine") * np.exp(-t / 0.5) * 1.8
    spark = crackle(n, 900 * np.exp(-t / 0.35), 122, 3000) * 1.2
    air = stft_filter(noise(n, 123), expc(7000, 1200, n), 2) * np.exp(-t / 0.25) * 0.8
    return trim(fade(reverb(sat(hit + chord + sub + spark + air, 1.6), 0.9, 0.26), 0.001, 0.08), 1.4, 0.25)
def form2_end():
    n = int(0.8 * SR); t = t_of(n)
    x = stft_filter(noise(n, 131), expc(3600, 160, n), 2) * np.exp(-t / 0.2) * 1.4 + osc(expc(300, 50, n), "saw", (-8, 8)) * np.exp(-t / 0.18) * 0.7 + crackle(n, 500 * np.exp(-t / 0.2), 132) * 1.1
    return trim(fade(reverb(sat(x, 1.3), 0.5, 0.2), 0.002, 0.05), 0.8, 0.2)
def aura_crackle():
    n = int(1.0 * SR); t = t_of(n)
    x = crackle(n, 260 * (0.5 + 0.5 * np.sin(2 * math.pi * 3 * t) ** 2), 141, 1400) * 1.1 + stft_filter(noise(n, 142), np.full(n, 420.0), 1.5) * 0.35 * (0.6 + 0.4 * np.sin(2 * math.pi * 5 * t))
    x += osc(np.full(n, 58.0), "sine") * 0.4
    return trim(fade(sat(x, 1.3), 0.12, 0.3), 1.0, 0.3)
def dragon_windup():
    n = int(0.3 * SR); u = np.linspace(0, 1, n)
    x = stft_filter(noise(n, 151), expc(500, 3800, n), 1.6) * u ** 1.5 * 1.4 + osc(expc(90, 220, n), "saw", (-9, 9)) * u ** 2 * 0.8 + crackle(n, 80 + 900 * u ** 2, 152) * 1.1
    return trim(fade(sat(x, 1.4), 0.01, 0.02), 0.3, 0.02)
def dragon_launch():
    n = int(0.75 * SR); t = t_of(n)
    crack = stft_filter(noise(n, 161), np.full(n, 3400.0), 3, "hp") * np.exp(-t / 0.02) * 2.6
    thud = osc(expc(150, 52, n), "sine") * np.exp(-t / 0.22) * 2.0
    roar = stft_filter(osc(lin(130, 330, n) * (1 + 0.02 * np.sin(2 * math.pi * 14 * t)), "saw", (-14, -5, 6, 15)), expc(700, 2600, n) * np.exp(-t / 1.2) + 300, 2) * np.exp(-t / 0.3) * 1.4
    whoosh = stft_filter(noise(n, 162), expc(5400, 500, n), 1.8) * np.exp(-t / 0.2) * 1.6
    zap = stft_filter(osc(expc(3000, 300, n), "saw", (-12, 12)), expc(5000, 600, n), 2) * np.exp(-t / 0.09)
    return trim(fade(reverb(sat(crack + thud + roar + whoosh + zap, 1.7), 0.35, 0.15), 0.001, 0.06), 0.75, 0.15)
def dragon_hit():
    n = int(0.45 * SR); t = t_of(n)
    x = stft_filter(noise(n, 171), np.full(n, 2600.0), 3, "hp") * np.exp(-t / 0.022) * 2.6 + osc(expc(180, 45, n), "sine") * np.exp(-t / 0.16) * 2.2 + crackle(n, 700 * np.exp(-t / 0.15), 172, 2000) * 1.3
    x += stft_filter(osc(expc(1800, 260, n), "saw", (-10, 10)), expc(3400, 400, n), 2) * np.exp(-t / 0.08)
    return trim(fade(reverb(sat(x, 1.8), 0.3, 0.15), 0.001, 0.05), 0.45, 0.1)
def comet_gather():
    n = int(1.1 * SR); u = np.linspace(0, 1, n); t = t_of(n); sw = u ** 2.0
    wind = stft_filter(noise(n, 181), expc(260, 5600, n), 1.6) * sw * 1.4
    pad_ = stft_filter(osc(expc(80, 420, n), "saw", (-10, 0, 12), (5.5, 0.006)), expc(400, 3600, n), 3) * sw
    sub = osc(lin(46, 84, n), "sine") * sw * 0.8
    core = osc(expc(480, 2100, n), "sine", (-5, 5)) * sw ** 2.4 * 0.45
    cr = crackle(n, 30 + 1100 * u ** 2, 182) * (0.5 + sw) * 1.2
    return trim(fade(reverb(sat(wind + pad_ + sub + core + cr, 1.45), 0.25, 0.14), 0.02, 0.02), 1.15, 0.05)   # peaks right at the 1.1 s release
def comet_fire():
    n = int(2.3 * SR); t = t_of(n)   # the sim stops this voice at comet_end (fire 1.5 s + Nova echo); the tail below is only the overhang
    crack = stft_filter(noise(n, 191), np.full(n, 3000.0), 3, "hp") * np.exp(-t / 0.03) * 2.8
    boom = osc(expc(110, 38, n), "sine") * np.exp(-t / 0.5) * 2.0
    fa = 150 * (1 + 0.015 * np.sin(2 * math.pi * 5.5 * t))
    body = osc(fa, "saw", (-9, 0, 10)) + 0.8 * osc(fa * 2.004, "harm"); body = stft_filter(body, 700 + 900 * np.sin(2 * math.pi * 3.2 * t) ** 2 + 400 * np.minimum(1, t / 0.6), 2.4)
    body += stft_filter(noise(n, 192), np.full(n, 1600.0), 1.8) * 0.6 + crackle(n, 1100, 193, 3000) * 0.9
    body *= np.minimum(1, t / 0.05) * 0.9; sub = osc(np.full(n, 52.0), "sine") * 0.9 * np.minimum(1, t / 0.04)
    zap = stft_filter(osc(expc(3200, 260, n), "saw", (-14, 14)), expc(5600, 500, n), 2) * np.exp(-t / 0.18) * 1.3
    x = crack + boom + body + sub + zap
    return trim(fade(reverb(sat(x, 1.7), 0.4, 0.15), 0.001, 0.2), 2.3, 0.3)
def comet_end():
    n = int(0.7 * SR); t = t_of(n)
    x = stft_filter(noise(n, 201), expc(3400, 200, n), 2) * np.exp(-t / 0.14) * 1.5 + osc(expc(380, 60, n), "saw", (-8, 8)) * np.exp(-t / 0.13) * 0.6 + crackle(n, 600 * np.exp(-t / 0.16), 202) * 1.2
    return trim(fade(reverb(sat(x, 1.3), 0.5, 0.24), 0.002, 0.04), 0.7, 0.25)
def finisher():
    n = int(1.6 * SR); t = t_of(n)
    hit = stft_filter(noise(n, 211), np.full(n, 2600.0), 3, "hp") * np.exp(-t / 0.035) * 3.0
    boom = osc(expc(90, 28, n), "sine") * np.exp(-t / 0.7) * 2.6
    cascade = crackle(n, 1400 * np.exp(-t / 0.6), 212, 1800) * 1.5 + stft_filter(noise(n, 213), expc(6000, 600, n), 2) * np.exp(-t / 0.4) * 1.2
    ring = sum(osc(np.full(n, f), "sine") * np.exp(-t / d) * a for f, d, a in ((880, 0.9, 0.35), (1320, 0.7, 0.25), (1760, 0.5, 0.18)))
    return trim(fade(reverb(sat(hit + boom + cascade + ring, 1.8), 1.0, 0.3), 0.001, 0.1), 1.6, 0.3)

SOUNDS = dict(form2_charge=(form2_charge, -3.0), form2_break=(form2_break, -1.0), form2_commit=(form2_commit, -1.5), form2_end=(form2_end, -6.0), aura_crackle=(aura_crackle, -16.0),
              dragon_windup=(dragon_windup, -8.0), dragon_launch=(dragon_launch, -2.0), dragon_hit=(dragon_hit, -3.0), comet_gather=(comet_gather, -3.0), comet_fire=(comet_fire, -2.0),
              comet_end=(comet_end, -6.0), finisher=(finisher, -1.0))
if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); lp = os.path.join(out, "loudness.json"); rep = json.load(open(lp)) if os.path.exists(lp) else {}
    for name, (fn, peak) in SOUNDS.items():
        x = norm_to(fn(), peak); write_wav(os.path.join(out, name + ".wav"), x)
        rep[name] = {"seconds": round(len(x) / SR, 3), "peak_dBFS": round(20 * math.log10(float(np.abs(x).max())), 2), "rms_dBFS": round(20 * math.log10(float(np.sqrt(np.mean(x ** 2)))), 2), "approx_LUFS_integrated": round(lufs(x), 1), "clipped_samples": int((np.abs(x) >= 0.9999).sum())}
        print(name, rep[name])
    json.dump(rep, open(lp, "w"), indent=1)

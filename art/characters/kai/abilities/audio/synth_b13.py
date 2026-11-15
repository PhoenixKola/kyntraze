"""KYNTRAZE B13 - Form III (Stillfire Apex) sound design, synthesised from scratch with the B05.1 helpers (numpy only, deterministic seeds, nothing sampled or copied).
  python synth_b13.py <out_dir>      -> 16-bit mono 44.1 kHz WAVs (public/audio/kai-abilities/) + merges loudness.json
Identity: Form II was electric, rough and loud. Form III is light, precise, glassy: pure sines, inharmonic bell/glass partials, soft airy band noise, quiet sub heartbeats; NO crackle/saw/distortion.
Timing contract (the sim drives the voices; see src/game/audio/abilityAudio.ts):
  form3_silence ~1.2 s  the world withdraws (air drop + one low heartbeat pair)     form3_omen ~1.4 s  quiet rising shimmer      form3_reveal ~1.6 s  silver resonance + soft impact     form3_end ~0.7 s
  aura_hover  2.0 s LOOP (sample-exact periodic)    glide ~0.5 s one-shot (starts / dash-lite)    form3_dash ~0.35 s  click + airy streak + arrival tick
  rift_charge 1.0 s LOOP (phase-continuous Shepard rise, retrigger/pitch freely)    rift_blink ~0.28 s    rift_fire ~0.9 s    rift_end ~0.55 s
  reversal_hit_a/b/c ~0.14 s crisp tonal ticks (pick at random / by hit index)    reversal_end ~0.9 s convergent chime    evasion ~0.4 s    finisher3 ~2.2 s
Audio quality is NOT VERIFIED BY EAR (authored blind); each file is checked numerically (peak, RMS, DC, loop seam, spectral centroid) by `check()`."""
import math, os, sys, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth_b05 import SR, t_of, noise, stft_filter, lin, expc, osc, reverb, norm_to, trim, pad, fade, write_wav, lufs, rng

def env(n, a, d):                         # smooth attack a s, exponential decay with time constant d s
    t = t_of(n); e = np.exp(-t / d); k = max(1, int(a * SR)); e[:k] *= np.sin(np.linspace(0, math.pi / 2, k)) ** 2; return e
def bell(n, f, dec, amp=1.0, ratios=(1.0, 2.76, 5.4, 8.93), gains=(1.0, 0.42, 0.2, 0.08), atk=0.004):
    t = t_of(n); out = np.zeros(n)
    for r, g in zip(ratios, gains):
        if f * r < 15000: out += g * np.sin(2 * math.pi * f * r * t + r) * np.exp(-t / (dec / (1 + 0.55 * (r - 1))))
    k = max(1, int(atk * SR)); out[:k] *= np.linspace(0, 1, k); return out * amp
def thump(n, f0, f1, dec, atk=0.01):
    t = t_of(n); ph = 2 * math.pi * np.cumsum(expc(f0, f1, n)) / SR; e = np.exp(-t / dec); k = max(1, int(atk * SR)); e[:k] *= np.sin(np.linspace(0, math.pi / 2, k)) ** 2; return np.sin(ph) * e
def air(n, seed, lo, hi, bw=1.6, kind="bp"):
    return stft_filter(noise(n, seed), expc(lo, hi, n), bw, kind)
def at(x, y, t0): i = int(t0 * SR); m = min(len(y), len(x) - i); x[i:i + m] += y[:m] if m > 0 else 0; return x
def circ_band(n, seed, lo, hi):                          # FFT band-limited noise: exactly periodic over n samples (loop-safe)
    X = np.fft.rfft(noise(n, seed)); f = np.fft.rfftfreq(n, 1 / SR); m = np.exp(-0.5 * (np.log2(np.maximum(f, 1) / math.sqrt(lo * hi)) / (math.log2(hi / lo) / 2)) ** 2); return np.fft.irfft(X * m, n)

def form3_silence():
    n = int(1.2 * SR); t = t_of(n); x = np.zeros(n)
    drop = stft_filter(noise(n, 301), expc(7000, 140, n), 2.2, "lp") * np.exp(-t / 0.16) * 1.1; drop *= np.minimum(1, t / 0.004)
    x += drop
    x = at(x, thump(int(0.5 * SR), 62, 38, 0.13, 0.012) * 1.5, 0.36); x = at(x, thump(int(0.5 * SR), 56, 34, 0.15, 0.012) * 1.1, 0.60)
    x += osc(np.full(n, 41.0), "sine") * np.exp(-t / 0.5) * 0.25 * np.minimum(1, t / 0.1)
    return trim(fade(reverb(x, 0.5, 0.12, 3), 0.002, 0.2), 1.2, 0.25)
def form3_omen():
    n = int(1.4 * SR); u = np.linspace(0, 1, n); t = t_of(n); sw = np.sin(u * math.pi * 0.5) ** 2.2
    x = np.zeros(n)
    for f, a in ((392.0, 0.5), (587.3, 0.4), (784.0, 0.32), (1174.7, 0.2), (1568.0, 0.12)):
        x += osc(np.full(n, f), "sine", (-4, 4), (4.6, 0.003)) * a * sw ** (1 + f / 2500)
    x += air(n, 302, 2400, 9500, 1.5) * sw ** 2.5 * 0.35 + osc(lin(46, 70, n), "sine") * sw * 0.35
    x *= (u < 0.93) + (u >= 0.93) * np.maximum(0, (1 - u) / 0.07)
    return trim(fade(reverb(x, 0.8, 0.28, 4), 0.06, 0.1), 1.4, 0.18)
def form3_reveal():
    n = int(1.6 * SR); t = t_of(n); x = np.zeros(n)
    x += thump(n, 78, 34, 0.26, 0.006) * 2.2 + stft_filter(noise(n, 311), np.full(n, 1800.0), 3, "lp") * np.exp(-t / 0.05) * 0.9   # soft impact (low-passed: no harsh click)
    for f, d, a in ((392.0, 1.3, 1.0), (587.3, 1.2, 0.8), (784.0, 1.1, 0.7), (1174.7, 0.9, 0.5), (1568.0, 0.8, 0.3)): x = at(x, bell(n, f, d, a), 0.0 if f < 500 else 0.012 * (f // 400))
    x += air(n, 312, 1500, 8800, 1.8) * np.exp(-t / 0.5) * np.minimum(1, t / 0.18) * 0.55
    x += osc(np.full(n, 1176.0), "sine", (-7, 7), (5.2, 0.002)) * env(n, 0.3, 0.9) * 0.18   # slow glassy shimmer
    return trim(fade(reverb(x, 1.3, 0.34, 5, 6000), 0.001, 0.12), 1.6, 0.35)
def form3_end():
    n = int(0.7 * SR); t = t_of(n)
    x = bell(n, 523.3, 0.45, 0.6) + bell(n, 784.0, 0.35, 0.4) + osc(expc(880, 330, n), "sine") * env(n, 0.01, 0.2) * 0.3 + air(n, 321, 5200, 700, 1.8) * env(n, 0.02, 0.18) * 0.7
    return trim(fade(reverb(x, 0.6, 0.22, 6), 0.004, 0.06), 0.7, 0.3)
def aura_hover():
    n = 2 * SR; t = t_of(n); x = np.zeros(n)
    for f, a, ph in ((110.0, 0.5, 0.0), (165.0, 0.35, 1.3), (220.5, 0.3, 2.1), (330.0, 0.18, 0.7), (495.0, 0.09, 4.0)):
        x += np.sin(2 * math.pi * f * t + ph) * a * (0.75 + 0.25 * np.sin(2 * math.pi * 0.5 * t + ph))        # f and LFO are multiples of 0.5 Hz -> exactly periodic
    x += circ_band(n, 331, 900, 3400) * 0.22 * (0.7 + 0.3 * np.sin(2 * math.pi * 1.0 * t + 1.1))
    x += circ_band(n, 332, 3800, 8500) * 0.05
    return x
def glide():
    n = int(0.5 * SR); u = np.linspace(0, 1, n); t = t_of(n); e = np.sin(math.pi * u) ** 2
    x = stft_filter(noise(n, 341), 500 + 3000 * np.sin(math.pi * u) ** 1.5, 1.8) * e * 1.2 + osc(lin(210, 340, n), "sine", (-5, 5)) * e * 0.3 + air(n, 342, 6000, 3000, 2) * e * 0.35
    return trim(fade(reverb(x, 0.35, 0.14, 7), 0.01, 0.06), 0.5, 0.1)
def form3_dash():
    n = int(0.35 * SR); t = t_of(n); x = np.zeros(n)
    x += stft_filter(noise(n, 351), np.full(n, 3000.0), 2.5, "hp") * np.exp(-t / 0.004) * 0.6 + np.sin(2 * math.pi * 2600 * t) * np.exp(-t / 0.02) * 0.3     # departure click
    x += air(n, 352, 5200, 1100, 1.8) * np.exp(-t / 0.11) * np.minimum(1, t / 0.01) * 1.0 + np.sin(2 * math.pi * np.cumsum(expc(1800, 700, n)) / SR) * np.exp(-t / 0.09) * 0.35                                                                          # airy streak
    arr = np.sin(2 * math.pi * 1900 * t) * np.exp(-t / 0.018) * 0.35 + thump(n, 110, 60, 0.05, 0.004) * 0.6
    x = at(x, arr[: int(0.12 * SR)], 0.23)
    return trim(fade(reverb(x, 0.3, 0.12, 8), 0.001, 0.05), 0.35, 0.08)
def rift_charge():
    n = SR; t = t_of(n); u = t / 1.0; x = np.zeros(n); f0 = 220.0; K = 5; Ph = 0.0; ph0 = {}
    for k in range(K):                       # phase-continuous Shepard rise: partial k ends exactly where partial k+1 begins
        ph0[k] = Ph; Ph += 2 * math.pi * f0 * 1.0 * (2 ** k) / math.log(2)
    for k in range(K):
        pos = (k + u); amp = np.exp(-0.5 * ((pos - K / 2) / (K / 4.2)) ** 2); amp = amp - np.exp(-0.5 * ((0 - K / 2) / (K / 4.2)) ** 2)
        amp = np.maximum(amp, 0) * np.minimum(1, np.minimum(pos, K - pos) / 0.6 + 0)
        phase = ph0[k] + 2 * math.pi * f0 * (2 ** k) * (2 ** u - 1) / math.log(2) * 1.0
        x += np.sin(phase) * amp
    grains = np.zeros(n); g = np.random.default_rng(361)
    for s in g.uniform(0, 1, 70):             # periodic soft grains (wrap-around) = granular shimmer
        L = int(0.018 * SR); i = int(s * SR); w = np.sin(np.linspace(0, math.pi, L)) ** 2 * np.sin(2 * math.pi * g.uniform(1800, 5200) * t_of(L)); idx = (i + np.arange(L)) % n; grains[idx] += w * g.uniform(0.2, 0.6)
    x = x * 0.9 + grains * 0.35 + circ_band(n, 362, 1500, 6500) * 0.1 + np.sin(2 * math.pi * 55.0 * t) * 0.16
    return x
def rift_blink():
    n = int(0.28 * SR); t = t_of(n); x = np.zeros(n)
    x += thump(n, 700, 130, 0.03, 0.002) * 1.1 + air(n, 371, 3800, 900, 1.8) * np.exp(-t / 0.07) * 0.9 + np.sin(2 * math.pi * 3300 * t) * np.exp(-t / 0.012) * 0.4
    x = at(x, (np.sin(2 * math.pi * 1500 * t) * np.exp(-t / 0.03) * 0.3)[: int(0.1 * SR)], 0.12)
    return trim(fade(reverb(x, 0.3, 0.12, 9), 0.001, 0.05), 0.28, 0.07)
def rift_fire():
    n = int(0.9 * SR); t = t_of(n); x = np.zeros(n)
    x += stft_filter(noise(n, 381), np.full(n, 3500.0), 3, "hp") * np.exp(-t / 0.006) * 0.9 + thump(n, 130, 40, 0.18, 0.003) * 1.6        # precise attack + soft sub
    fm = np.sin(2 * math.pi * 1760 * t * (1 + 0.0 * t) + 1.5 * np.sin(2 * math.pi * 880 * t)); tone = fm * env(n, 0.002, 0.28) * 0.5
    tone += osc(expc(1300, 520, n), "sine", (-3, 3)) * env(n, 0.003, 0.4) * 0.6 + osc(np.full(n, 2640.0), "sine") * env(n, 0.002, 0.5) * 0.25
    x += tone + air(n, 382, 7000, 2200, 1.7) * env(n, 0.004, 0.3) * 0.5 + bell(n, 1175.0, 0.5, 0.35)
    return trim(fade(reverb(x, 0.7, 0.26, 10), 0.001, 0.1), 0.9, 0.25)
def rift_end():
    n = int(0.55 * SR); t = t_of(n)
    x = osc(expc(1400, 420, n), "sine") * env(n, 0.005, 0.14) * 0.5 + bell(n, 698.5, 0.3, 0.45) + air(n, 391, 5200, 900, 1.8) * env(n, 0.005, 0.12) * 0.6
    return trim(fade(reverb(x, 0.5, 0.2, 11), 0.002, 0.06), 0.55, 0.2)
def reversal_hit(f, seed):
    n = int(0.14 * SR); t = t_of(n)
    x = bell(n, f, 0.05, 1.0, (1.0, 2.76, 4.1), (1.0, 0.35, 0.15), 0.0008) + stft_filter(noise(n, seed), np.full(n, 5200.0), 3, "hp") * np.exp(-t / 0.003) * 0.35 + thump(n, 220, 120, 0.02, 0.001) * 0.35
    return trim(fade(x, 0.0005, 0.02), 0.14, 0.04)
def reversal_end():
    n = int(0.9 * SR); t = t_of(n); u = np.linspace(0, 1, n); x = np.zeros(n); conv = np.clip(u / 0.38, 0, 1) ** 1.6
    for f0, a in ((3200.0, 0.5), (2500.0, 0.5), (1000.0, 0.4)):        # three voices converge on one pitch (1568 Hz), then ring
        f = f0 + (1568.0 - f0) * conv; x += osc(f, "sine") * a * np.minimum(1, u / 0.05) * np.where(u < 0.38, 1.0, np.exp(-(u - 0.38) / 0.18))
    x = at(x, bell(n, 1568.0, 0.5, 1.0), 0.33); x = at(x, bell(n, 2349.3, 0.36, 0.45), 0.34); x += air(n, 401, 3000, 9000, 1.8) * env(n, 0.05, 0.14) * 0.15
    return trim(fade(reverb(x, 0.8, 0.28, 12), 0.003, 0.08), 0.9, 0.25)
def evasion():
    n = int(0.4 * SR); t = t_of(n); u = np.linspace(0, 1, n)
    x = air(n, 411, 1400, 5200, 1.8) * np.sin(math.pi * np.minimum(1, u * 1.6)) ** 2 * (u < 0.62) * 0.9 + bell(n, 3135.9, 0.08, 0.5, (1.0, 1.34, 2.76), (1.0, 0.4, 0.2), 0.001) + thump(n, 200, 90, 0.04, 0.004) * 0.35
    x = at(x, bell(n, 2093.0, 0.07, 0.35, (1.0, 2.76), (1.0, 0.3), 0.001)[: int(0.15 * SR)], 0.07)
    return trim(fade(reverb(x, 0.4, 0.16, 13), 0.001, 0.06), 0.4, 0.1)
def finisher3():
    n = int(2.2 * SR); t = t_of(n); x = np.zeros(n); g = np.random.default_rng(421)
    x += osc(np.full(n, 38.0), "sine") * np.exp(-t / 0.2) * 0.3 * (t < 0.34)                                # the held-breath silence: only a fading sub
    for i, s in enumerate((0.40, 0.431, 0.452, 0.480, 0.50)):                                                       # five near-synchronous strikes
        f = (2093.0, 2637.0, 3136.0, 2349.0, 3520.0)[i]; x = at(x, reversal_hit(f, 430 + i)[: int(0.14 * SR)] * (1.0 - 0.1 * i), s)
    x = at(x, thump(int(1.2 * SR), 64, 34, 0.32, 0.008) * 1.3, 0.50)
    for f, d, a, t0 in ((523.3, 1.5, 0.7, 0.55), (784.0, 1.3, 0.55, 0.57), (1046.5, 1.1, 0.4, 0.60), (1568.0, 0.9, 0.3, 0.62)): x = at(x, bell(int(1.65 * SR), f, d, a), t0)
    for s in np.sort(g.uniform(0.55, 1.9, 90)):                                                                  # disintegration: glassy sparkle grains thinning out
        L = int(0.05 * SR); f = g.choice([2093.0, 2637.0, 3136.0, 3951.0, 4699.0]) * g.choice([1, 1, 2]); a = 0.22 * math.exp(-(s - 0.55) / 0.75)
        x = at(x, np.sin(2 * math.pi * f * t_of(L)) * np.exp(-t_of(L) / 0.012) * a, s)
    x += air(n, 422, 9000, 1800, 1.8) * np.exp(-np.maximum(0, t - 0.5) / 0.35) * (t > 0.5) * np.minimum(1, (t - 0.5) / 0.06) * 0.45
    return trim(fade(reverb(x, 1.2, 0.34, 14, 5500), 0.001, 0.15), 2.2, 0.5)

SOUNDS = dict(form3_silence=(form3_silence, -10.0), form3_omen=(form3_omen, -14.0), form3_reveal=(form3_reveal, -4.0), form3_end=(form3_end, -9.0), aura_hover=(aura_hover, -24.0), glide=(glide, -10.0),
              form3_dash=(form3_dash, -6.0), rift_charge=(rift_charge, -12.0), rift_blink=(rift_blink, -6.0), rift_fire=(rift_fire, -4.0), rift_end=(rift_end, -9.0),
              reversal_hit_a=(lambda: reversal_hit(1760.0, 401), -8.0), reversal_hit_b=(lambda: reversal_hit(2093.0, 402), -8.0), reversal_hit_c=(lambda: reversal_hit(2637.0, 403), -8.0),
              reversal_end=(reversal_end, -8.0), evasion=(evasion, -7.0), finisher3=(finisher3, -3.0))
LOOPS = ("aura_hover", "rift_charge")
def check(name, x):
    """Numeric sanity (we cannot listen): peak/RMS/DC/spectral centroid, and for loops the wrap-around discontinuity relative to the signal's own max sample-to-sample step."""
    f = np.fft.rfftfreq(len(x), 1 / SR); S = np.abs(np.fft.rfft(x)); rec = {"dc": round(float(x.mean()), 5), "centroid_hz": int((f * S).sum() / (S.sum() + 1e-9))}
    if name in LOOPS: step = float(np.abs(np.diff(x)).max()); rec["loop_seam_step"] = round(float(abs(x[0] - x[-1])), 5); rec["max_internal_step"] = round(step, 5); rec["seam_ok"] = bool(abs(x[0] - x[-1]) <= 1.2 * step)
    return rec
if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); lp = os.path.join(out, "loudness.json"); rep = json.load(open(lp)) if os.path.exists(lp) else {}
    for name, (fn, peak) in SOUNDS.items():
        x = fn()
        if name in LOOPS: x = x - x.mean()
        x = norm_to(x, peak) if name not in LOOPS else x / (np.abs(x).max() + 1e-9) * 10 ** (peak / 20)
        write_wav(os.path.join(out, name + ".wav"), x)
        rep[name] = {"seconds": round(len(x) / SR, 3), "peak_dBFS": round(20 * math.log10(float(np.abs(x).max())), 2), "rms_dBFS": round(20 * math.log10(float(np.sqrt(np.mean(x ** 2)))), 2), "approx_LUFS_integrated": round(lufs(x), 1),
                     "clipped_samples": int((np.abs(x) >= 0.9999).sum()), **check(name, x)}
        print(name, rep[name])
    json.dump(rep, open(lp, "w"), indent=1)

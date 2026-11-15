"""Original enemy sound effects for KYNTRAZE B07, synthesised from scratch with numpy (no samples, no third-party audio): sines, filtered noise, FM and envelopes.
  python art/enemies/audio/synth_b07.py   ->  public/audio/enemies/*.wav + loudness.json
Each warning sound is shorter than its attack's windup so it can never outlive the telegraph it belongs to."""
import json, os, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, "public", "audio", "enemies")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7070)


def t_(sec): return np.arange(int(SR * sec)) / SR
def env(n, a=0.005, r=0.05, curve=1.0):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na) ** curve; e[-nr:] *= np.linspace(1, 0, nr) ** curve; return e
def noise(n): return rng.standard_normal(n)
def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y
def lp_sweep(x, f0, f1):
    n = len(x); fc = np.linspace(f0, f1, n); a = np.exp(-2 * np.pi * fc / SR); y = np.zeros(n); s = 0.0
    for i in range(n): s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y
def hp(x, fc): return x - lowpass(x, fc)
def sweep(f0, f1, sec, expo=True):
    t = t_(sec); f = f0 * (f1 / f0) ** (t / sec) if expo else np.linspace(f0, f1, len(t)); return np.sin(2 * np.pi * np.cumsum(f) / SR)
def fm(fc, fm_, idx, sec): t = t_(sec); return np.sin(2 * np.pi * fc * t + idx * np.sin(2 * np.pi * fm_ * t))


def pursuer_wind():
    s = 0.42; n = int(SR * s); x = lp_sweep(noise(n), 300, 2400) * np.linspace(0.2, 1, n) ** 2 * 0.9
    x += 0.35 * sweep(90, 180, s) * np.linspace(0.3, 1, n); return x * env(n, 0.02, 0.05)
def lunge():
    n = int(SR * 0.22); x = hp(lp_sweep(noise(n), 6000, 700), 400) * env(n, 0.004, 0.12, 1.4); x += 0.4 * sweep(260, 90, 0.22) * env(n, 0.004, 0.12); return x
def flanker_wind():
    s = 0.34; n = int(SR * s); x = 0.5 * sweep(700, 2600, s) * np.linspace(0.2, 1, n) ** 1.5 + 0.25 * hp(noise(n), 3500) * np.linspace(0.1, 1, n); return x * env(n, 0.01, 0.04)
def slash():
    n = int(SR * 0.26); x = hp(lp_sweep(noise(n), 9000, 1800), 1500) * env(n, 0.002, 0.15, 1.6); x += 0.35 * sweep(2800, 600, 0.26) * env(n, 0.002, 0.15); return x
def bruiser_wind():
    s = 0.95; n = int(SR * s); t = t_(s)
    x = 0.8 * sweep(45, 95, s) * np.linspace(0.2, 1, n) + 0.35 * fm(220, 7, 3 * np.linspace(0.5, 4, n), s) * np.linspace(0.1, 1, n) ** 2
    x += 0.35 * lp_sweep(noise(n), 200, 1800) * np.linspace(0, 1, n) ** 2; x *= 1 + 0.25 * np.sin(2 * np.pi * (6 + 10 * t / s) * t); return x * env(n, 0.05, 0.05)
def bruiser_slam():
    s = 0.8; n = int(SR * s); t = t_(s)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t * 9)) / SR) * np.exp(-t * 4.2)
    crack = hp(lp_sweep(noise(n), 9000, 600), 300) * np.exp(-t * 14); rumble = lp_sweep(noise(n), 260, 80) * np.exp(-t * 3.2)
    debris = hp(noise(n), 2500) * np.exp(-t * 7) * (rng.random(n) > 0.985); return (1.2 * boom + 0.9 * crack + 0.7 * rumble + 0.6 * debris) * env(n, 0.001, 0.06)
def ranged_charge():
    s = 0.75; n = int(SR * s); t = t_(s); f = 520 * (2.6 ** (t / s)); sh = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)
    return sh * np.linspace(0.1, 1, n) ** 1.6 * (0.8 + 0.2 * np.sin(2 * np.pi * 14 * t)) * env(n, 0.04, 0.05)
def ranged_shot():
    n = int(SR * 0.32); t = t_(0.32); z = np.sin(2 * np.pi * np.cumsum(2400 * np.exp(-t * 7) + 380) / SR) * np.exp(-t * 6)
    z += 0.4 * hp(noise(n), 4000) * np.exp(-t * 30); z += 0.35 * fm(900, 300, 6, 0.32) * np.exp(-t * 8); return z * env(n, 0.001, 0.05)
def bolt_hit():
    n = int(SR * 0.26); t = t_(0.26); x = hp(noise(n), 2000) * np.exp(-t * 22); x += 0.6 * sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (18 + i * 4)) for i, f in enumerate((1480, 2230, 3310, 4790))); return x * env(n, 0.001, 0.04)
def death_small():
    n = int(SR * 0.4); t = t_(0.4); x = hp(noise(n), 1400) * np.exp(-t * 13) * (0.55 + 0.45 * (rng.random(n) > 0.6)); x += 0.5 * sweep(520, 90, 0.4) * np.exp(-t * 9)
    x += 0.4 * sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (15 + i * 5)) for i, f in enumerate((2100, 3100, 4400))); return x * env(n, 0.001, 0.08)
def death_heavy():
    n = int(SR * 0.95); t = t_(0.95); x = 1.0 * np.sin(2 * np.pi * np.cumsum(30 + 140 * np.exp(-t * 7)) / SR) * np.exp(-t * 3.1)
    x += 0.8 * lp_sweep(noise(n), 3000, 200) * np.exp(-t * 4.5); x += 0.55 * hp(noise(n), 1800) * np.exp(-t * 10) * (rng.random(n) > 0.4)
    x += 0.5 * np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t * 3) + 90) / SR) * np.exp(-t * 7) * (np.sin(2 * np.pi * 22 * t) > 0); return x * env(n, 0.001, 0.12)


SOUNDS = dict(pursuer_wind=pursuer_wind, lunge=lunge, flanker_wind=flanker_wind, slash=slash, bruiser_wind=bruiser_wind, bruiser_slam=bruiser_slam,
              ranged_charge=ranged_charge, ranged_shot=ranged_shot, bolt_hit=bolt_hit, death_small=death_small, death_heavy=death_heavy)
TARGET_PEAK = 10 ** (-3.0 / 20)
if __name__ == "__main__":
    rep = {}
    for name, fn in SOUNDS.items():
        x = np.asarray(fn(), float); x -= x.mean(); x[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR)); x = x / np.max(np.abs(x)) * TARGET_PEAK
        pcm = np.round(x * 32767).astype(np.int16)
        with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        rep[name] = dict(seconds=round(len(pcm) / SR, 3), peak_dBFS=round(20 * np.log10(np.max(np.abs(x))), 2), rms_dBFS=round(20 * np.log10(np.sqrt(np.mean(x ** 2))), 2), clipped_samples=int(np.sum(np.abs(pcm) >= 32767)))
        print(name, rep[name])
    json.dump(rep, open(os.path.join(OUT, "loudness.json"), "w"), indent=1)

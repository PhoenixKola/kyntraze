"""Original B09 arena hazard + ambient sounds, synthesised from scratch with numpy (no samples).
  python art/arenas/audio/synth_b09.py  ->  public/audio/arenas/*.wav + loudness.json
Mono 44.1 kHz 16-bit, peak -3 dBFS, DC removed, hard fade in/out, tails decay to silence, no loops."""
import json, os, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, "public", "audio", "arenas"); os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(9090)

def T(s): return np.arange(int(SR * s)) / SR
def noise(n): return rng.standard_normal(n)
def lp(x, fc):
    fc = np.broadcast_to(np.asarray(fc, float), x.shape); a = np.exp(-2 * np.pi * fc / SR); y = np.zeros(len(x)); s = 0.0
    for i in range(len(x)): s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y
def hp(x, fc): return x - lp(x, fc)
def ph(f): return 2 * np.pi * np.cumsum(f) / SR
def ramp(n, p=1.0, lo=0.0): return lo + (1 - lo) * np.linspace(0, 1, n) ** p
def fm(fc, fmod, idx, s): t = T(s); return np.sin(2 * np.pi * fc * t + idx * np.sin(2 * np.pi * fmod * t))
def thump(s, f0=120, f1=38, k=18, d=5): t = T(s); return np.sin(ph(f1 + (f0 - f1) * np.exp(-t * k))) * np.exp(-t * d)
def bell(s, f0, decay=5, parts=(1, 2.76, 5.4, 8.9)):
    t = T(s); return sum(np.sin(2 * np.pi * f0 * p * t) * np.exp(-t * decay * (1 + 0.5 * i)) / (1 + i) for i, p in enumerate(parts))
def window(n, p=1.0): return np.sin(np.pi * np.arange(n) / n) ** p
def clicks(s, rate, fl=1500, fh=6000, decay=60, seed_density=1.0):
    n = int(SR * s); x = np.zeros(n)
    for i in np.flatnonzero(rng.random(n) < rate * seed_density / SR):
        f = rng.uniform(fl, fh); L = min(n - i, int(SR * 0.012)); tt = np.arange(L) / SR; x[i:i + L] += rng.uniform(0.3, 1) * np.sin(2 * np.pi * f * tt) * np.exp(-tt * decay)
    return x

def surge_warn():
    s = 1.5; n = int(SR * s); t = T(s); f = 90 + 70 * (t / s) ** 1.4; tick = 0.5 + 0.5 * np.sin(2 * np.pi * (4 + 7 * t / s) * t) ** 6
    x = (np.sin(ph(f)) + 0.5 * np.sin(ph(f * 2)) + 0.3 * np.sin(ph(f * 3.01))) * (0.6 + 0.4 * tick) + 0.25 * lp(noise(n), 500 + 2500 * t / s) * tick
    x += 0.4 * fm(320 + 400 * t / s, 60, 1.5, s) * ramp(n, 2, 0.1)
    return x * ramp(n, 1.1, 0.2) * window(n, 0.25)
def surge_fire():
    s = 0.7; n = int(SR * s); t = T(s)
    crack = hp(lp(noise(n), 9000 * np.exp(-t * 10) + 900), 500) * np.exp(-t * 14)
    buzz = (np.sin(ph(110 + 20 * np.sin(2 * np.pi * 7 * t))) + 0.6 * fm(220, 83, 3, s)) * np.exp(-t * 6) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 50 * t)))
    return 1.1 * thump(s, 95, 34, 14, 6) + 0.9 * crack + 0.5 * buzz + 0.3 * clicks(s, 300, 2000, 8000, 80) * np.exp(-t * 5)
def pylon_charge():
    s = 1.4; n = int(SR * s); t = T(s); f = 180 * (2.2 ** (t / s))
    x = (np.sin(ph(f)) + 0.6 * np.sin(ph(f * 2.76)) + 0.35 * np.sin(ph(f * 5.4))) * ramp(n, 1.6, 0.1) * (0.85 + 0.15 * np.sin(2 * np.pi * 9 * t))
    x += 0.5 * np.sin(ph(55 + 35 * t / s)) * ramp(n, 1.3) + 0.15 * lp(noise(n), 800 + 3000 * t / s) * ramp(n, 2)
    return x * window(n, 0.2) * ramp(n, 0.8, 0.15)
def pylon_pulse():
    s = 0.6; n = int(SR * s); t = T(s)
    x = 1.2 * thump(s, 80, 30, 10, 5) + 0.9 * bell(s, 196, 5) + 0.5 * hp(lp(noise(n), 5000), 600) * np.exp(-t * 22)
    return x * np.exp(-t * 3.5)
def amb_gloam_a():
    s = 2.5; n = int(SR * s); t = T(s); w = window(n, 1.6)
    x = np.sin(ph(48 + 2 * np.sin(2 * np.pi * 0.4 * t))) + 0.5 * np.sin(ph(96.5)) + 0.25 * np.sin(ph(144)) + 0.3 * lp(noise(n), 260)
    x += 0.08 * np.sin(ph(1500 + 500 * np.sin(2 * np.pi * 0.7 * t) * w)) * w   # faint servo whine
    return x * w
def amb_gloam_b():
    s = 2.0; n = int(SR * s); t = T(s); x = 0.5 * np.sin(ph(58)) * window(n, 1.4) + 0.2 * lp(noise(n), 200) * window(n, 1.4)
    for d, g in ((0.15, 1.0), (0.42, 0.45), (0.7, 0.22), (1.05, 0.1)):
        i = int(SR * d); L = n - i; tt = np.arange(L) / SR
        x[i:] += g * 0.7 * (np.sin(2 * np.pi * 410 * tt) + 0.6 * np.sin(2 * np.pi * 1130 * tt) + 0.3 * np.sin(2 * np.pi * 2370 * tt)) * np.exp(-tt * 9)
    return x
def amb_ashen_a():
    s = 3.0; n = int(SR * s); t = T(s); w = window(n, 1.3)
    wind = lp(noise(n), 180 + 150 * np.sin(2 * np.pi * 0.35 * t) ** 2) * 1.4 + 0.5 * lp(noise(n), 700 + 500 * np.sin(2 * np.pi * 0.23 * t + 1) ** 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t))
    x = wind * w + 0.18 * clicks(s, 14, 900, 4000, 120) * w
    return x
def amb_ashen_b():
    s = 2.2; n = int(SR * s); t = T(s); w = window(n, 1.1)
    creak = np.sin(ph(70 + 30 * np.sin(2 * np.pi * 1.3 * t) * w + 18 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t) ** 2) * w * 0.5
    creak += 0.4 * fm(131, 5.5, 4, s) * window(n, 2) + 0.3 * lp(noise(n), 160) * w + 0.1 * np.sin(2 * np.pi * 523 * t) * window(n, 3) * np.exp(-t * 0.8)
    return creak

NAMES = ["surge_warn", "surge_fire", "pylon_charge", "pylon_pulse", "amb_gloam_a", "amb_gloam_b", "amb_ashen_a", "amb_ashen_b"]

def finish(x):
    x = np.nan_to_num(np.asarray(x, float)); x = x - x.mean()
    f = int(0.004 * SR); g = int(0.03 * SR); x[:f] *= np.linspace(0, 1, f); x[-g:] *= np.linspace(1, 0, g); x = x - x.mean()
    return x / (np.abs(x).max() + 1e-12) * 10 ** (-3 / 20)

if __name__ == "__main__":
    rep = {}
    for nm in NAMES:
        x = finish(globals()[nm]()); pcm = np.round(x * 32767).astype(np.int16)
        with wave.open(os.path.join(OUT, nm + ".wav"), "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        rep[nm] = {"seconds": round(len(x) / SR, 2), "peak_dBFS": round(20 * np.log10(np.abs(x).max()), 2), "rms_dBFS": round(20 * np.log10(np.sqrt((x ** 2).mean())), 2), "clipped_samples": int((np.abs(pcm) >= 32767).sum())}
    json.dump(rep, open(os.path.join(OUT, "loudness.json"), "w"), indent=1); print("wrote", len(rep), "files to", OUT)

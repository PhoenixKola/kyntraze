"""Original B08 boss/elite sound effects, synthesised from scratch with numpy (no samples).
  python art/bosses/audio/synth_b08.py  ->  public/audio/bosses/*.wav + loudness.json
Mono 44.1 kHz 16-bit, peak -3 dBFS, DC removed, hard fade in/out, tails decay to silence, no loops."""
import json, os, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, "public", "audio", "bosses"); os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(8080)

def T(s): return np.arange(int(SR * s)) / SR
def noise(n): return rng.standard_normal(n)
def env(n, a=0.005, r=0.05, c=1.0):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na) ** c; e[-nr:] *= np.linspace(1, 0, nr) ** c; return e
def lp(x, fc):
    fc = np.broadcast_to(np.asarray(fc, float), x.shape); a = np.exp(-2 * np.pi * fc / SR); y = np.zeros(len(x)); s = 0.0
    for i in range(len(x)): s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y
def hp(x, fc): return x - lp(x, fc)
def ph(f): return 2 * np.pi * np.cumsum(f) / SR
def sw(f0, f1, s): t = T(s); return np.sin(ph(f0 * (f1 / f0) ** (t / s)))
def fm(fc, fmod, idx, s): t = T(s); return np.sin(2 * np.pi * fc * t + idx * np.sin(2 * np.pi * fmod * t))
def ramp(n, p=1.0, lo=0.0): return lo + (1 - lo) * np.linspace(0, 1, n) ** p
def thump(s, f0=120, f1=38, k=18, d=5): t = T(s); return np.sin(ph(f1 + (f0 - f1) * np.exp(-t * k))) * np.exp(-t * d)
def shards(s, dens, fl=3000, fh=9000, decay=4):
    n = int(SR * s); t = T(s); x = np.zeros(n)
    for i in np.flatnonzero(rng.random(n) < dens / SR):
        f = rng.uniform(fl, fh); L = min(n - i, int(SR * rng.uniform(0.02, 0.08))); tt = np.arange(L) / SR
        x[i:i + L] += rng.uniform(0.3, 1) * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 70)
    return x * np.exp(-t * decay)
def shimmer(s, f0, n_vox=5, spread=0.012):
    t = T(s); return sum(np.sin(2 * np.pi * f0 * (1 + spread * k) * t + k) for k in range(n_vox)) / n_vox

def boss_warning():
    s = 1.6; n = int(SR * s); t = T(s); pulse = 0.55 + 0.45 * np.sin(2 * np.pi * 5 * t) ** 2
    f = 220 * (1.9 ** (t / s)); x = (np.sin(ph(f)) + 0.5 * np.sin(ph(f * 1.498)) + 0.25 * np.sin(ph(f * 2.0))) * pulse * ramp(n, 1.2, 0.25)
    x += 0.35 * lp(noise(n), 400 + 1500 * t / s) * ramp(n, 2); return x * env(n, 0.03, 0.35)
def warden_roar():
    s = 1.4; n = int(SR * s); t = T(s); f = 62 + 28 * np.sin(np.pi * t / s)
    x = np.sin(ph(f)) + 0.6 * fm(124, 9, 2.5, s) + 0.5 * lp(noise(n), 300 + 500 * np.sin(np.pi * t / s)); x *= (1 + 0.25 * np.sin(2 * np.pi * 13 * t))
    return x * np.sin(np.pi * t / s) ** 0.7 * env(n, 0.04, 0.3)
def warden_step():
    s = 0.3; n = int(SR * s); t = T(s); return (1.2 * thump(s, 95, 34, 22, 9) + 0.5 * lp(noise(n), 350) * np.exp(-t * 18)) * env(n, 0.001, 0.05)
def rupture_warn():
    s = 0.8; n = int(SR * s); t = T(s); f = 380 * (2.0 ** (t / s))
    x = (np.sin(ph(f)) + 0.6 * np.sin(ph(f * 2.76)) + 0.4 * np.sin(ph(f * 5.4))) * ramp(n, 1.5, 0.1) * (0.8 + 0.2 * np.sin(2 * np.pi * 14 * t))
    x += 0.5 * np.sin(ph(48 + 30 * t / s)) * ramp(n, 1.5); return x * env(n, 0.04, 0.12)
def rupture_burst():
    s = 0.4; n = int(SR * s); t = T(s); x = 1.1 * thump(s, 110, 42, 20, 9) + 0.8 * shards(s, 900, 2500, 10000, 7) + 0.6 * hp(lp(noise(n), 7000), 800) * np.exp(-t * 26)
    return x * env(n, 0.001, 0.1)
def sweep_wind():
    s = 0.9; n = int(SR * s); t = T(s); fc = 250 + 3500 * (t / s) ** 2
    x = lp(noise(n), fc) * ramp(n, 2.2, 0.05) + 0.4 * sw(70, 180, s) * ramp(n, 1.5); return x * env(n, 0.05, 0.06)
def sweep_hit():
    s = 0.35; n = int(SR * s); t = T(s); x = hp(lp(noise(n), 9000 * np.exp(-t * 8) + 800), 600) * np.exp(-t * 12) + 1.0 * thump(s, 140, 50, 25, 10) + 0.5 * shards(s, 500, 2000, 7000, 12)
    return x * env(n, 0.001, 0.08)
def charge_wind():
    s = 0.8; n = int(SR * s); t = T(s); f = 40 + 60 * (t / s) ** 1.5
    x = np.sin(ph(f)) + 0.5 * fm(110, 23, 2 + 4 * t / s, s) + 0.5 * lp(noise(n), 150 + 1200 * t / s); x *= (1 + 0.3 * np.sin(2 * np.pi * (8 + 14 * t / s) * t)) * ramp(n, 1.4, 0.15)
    return x * env(n, 0.05, 0.05)
def charge_hit():
    s = 0.5; n = int(SR * s); t = T(s); x = 1.3 * thump(s, 130, 34, 14, 6.5) + 0.8 * lp(noise(n), 5000) * np.exp(-t * 16) + 0.7 * shards(s, 700, 1500, 8000, 6) + 0.5 * lp(noise(n), 220) * np.exp(-t * 5)
    return x * env(n, 0.001, 0.12)
def warden_hurt():
    s = 0.25; n = int(SR * s); t = T(s); x = 0.9 * sw(170, 80, s) * np.exp(-t * 9) + 0.6 * fm(90, 40, 3, s) * np.exp(-t * 11) + 0.5 * lp(noise(n), 1800) * np.exp(-t * 25)
    return x * env(n, 0.002, 0.08)
def warden_death():
    s = 2.2; n = int(SR * s); t = T(s)
    x = 1.0 * thump(s, 90, 28, 3, 1.8) * (t < 1.2) + 0.9 * lp(noise(n), 250 + 600 * np.exp(-t * 2.5)) * np.exp(-t * 1.7) * (1 + 0.5 * np.sin(2 * np.pi * 9 * t))
    for tt, a in ((0.0, 1.2), (0.45, 0.9), (0.95, 0.8)):
        i = int(tt * SR); L = n - i; x[i:] += a * thump(L / SR, 100, 36, 20, 7)[:L]
    x += 0.5 * shards(s, 260, 3000, 11000, 1.2) * ramp(n, 0.6, 0.5)
    tail = shards(s, 90, 5000, 12000, 1.6) * (t > 0.9); return (x + 0.35 * tail) * env(n, 0.003, 0.6)
def seraph_arrive():
    s = 1.5; n = int(SR * s); t = T(s); f = 1900 * (0.22 ** (t / s)); x = (np.sin(ph(f)) + 0.4 * np.sin(ph(f * 2))) * np.exp(-t * 0.8) * ramp(n, 0.3, 0.2)
    x += 0.5 * shimmer(s, 640, 6, 0.014) * np.sin(np.pi * t / s) + 0.3 * hp(lp(noise(n), 9000), 3000) * np.exp(-t * 2.5); return x * env(n, 0.02, 0.4)
def seraph_volley_wind():
    s = 0.7; n = int(SR * s); t = T(s); f = 500 * 2.8 ** (t / s); x = (np.sin(ph(f)) + 0.5 * np.sin(ph(f * 1.5)) + 0.3 * np.sin(ph(f * 2.01))) * ramp(n, 1.6, 0.08) * (0.8 + 0.2 * np.sin(2 * np.pi * 18 * t))
    return x * env(n, 0.02, 0.05)
def seraph_volley_fire():
    s = 0.3; n = int(SR * s); x = np.zeros(n)
    for k in range(5):
        i = int(k * 0.022 * SR); L = n - i; tt = np.arange(L) / SR; x[i:] += (sw(2600 + 220 * k, 500, L / SR) * np.exp(-tt * 14))[:L] * (1 - 0.1 * k)
    return x * env(n, 0.001, 0.1)
def seraph_blink_out():
    s = 0.3; n = int(SR * s); t = T(s); x = sw(2400, 200, s) * np.exp(-t * 6) + 0.5 * hp(lp(noise(n), 8000), 2500) * np.exp(-t * 14); return x * env(n, 0.002, 0.1)
def seraph_blink_in():
    s = 0.3; n = int(SR * s); t = T(s); x = sw(200, 2600, s) * ramp(n, 2) * np.exp(-(t / s) ** 4 * 2) + 0.6 * hp(lp(noise(n), 9000), 3500) * np.exp(-((t - 0.22) ** 2) * 900); return x * env(n, 0.003, 0.05)
def seraph_ring_wind():
    s = 0.9; n = int(SR * s); t = T(s); x = 0
    for k, r in enumerate((1, 1.25, 1.5, 2.0)): x = x + np.sin(ph(330 * r * (1 + 0.35 * (t / s) ** 2)) + 0.8 * np.sin(2 * np.pi * (5 + k) * t)) / (1 + 0.3 * k)
    return x * np.sin(np.pi * t / s) ** 1.3 * (0.7 + 0.3 * ramp(n)) * env(n, 0.08, 0.15)
def seraph_ring_burst():
    s = 0.5; n = int(SR * s); t = T(s); x = sw(1800, 220, s) * np.exp(-t * 7) + 0.9 * thump(s, 120, 55, 20, 9) + 0.6 * shards(s, 700, 2500, 9000, 6) + 0.4 * shimmer(s, 900, 5) * np.exp(-t * 6)
    return x * env(n, 0.001, 0.12)
def seraph_spiral_pulse():
    s = 0.12; t = T(s); n = len(t); return (np.sin(ph(1500 - 800 * t / s)) * np.exp(-t * 38) + 0.3 * hp(noise(n), 4000) * np.exp(-t * 60)) * env(n, 0.001, 0.03)
def seraph_phase():
    s = 1.6; n = int(SR * s); t = T(s); f = 150 * 4.5 ** (t / s); x = (np.sin(ph(f)) + 0.5 * np.sin(ph(f * 2.005)) + 0.3 * np.sin(ph(f * 3.01))) * ramp(n, 1.2, 0.2)
    x += shimmer(s, 880, 6, 0.02) * 0.6 * ramp(n, 2) + thump(s, 90, 40, 14, 5) * (t < 0.5) * 0.8 + 0.4 * shards(s, 200, 4000, 11000, 1.0) * ramp(n, 1.5)
    return x * env(n, 0.03, 0.4)
def seraph_hurt():
    s = 0.2; n = int(SR * s); t = T(s); x = np.sin(ph(1200 - 700 * t / s) + 3 * np.sin(2 * np.pi * 90 * t)) * np.exp(-t * 14) + 0.4 * hp(noise(n), 3000) * np.exp(-t * 35); return x * env(n, 0.002, 0.06)
def seraph_death():
    s = 2.0; n = int(SR * s); t = T(s); x = shimmer(s, 740, 6, 0.018) * np.exp(-t * 1.4) + 0.6 * sw(1600, 120, s) * np.exp(-t * 1.8)
    x += thump(s, 100, 40, 12, 4) * (t < 0.5) + 0.8 * shards(s, 350, 3500, 12000, 1.1); return x * env(n, 0.003, 0.5)
def aegis_brace():
    s = 0.7; n = int(SR * s); t = T(s); x = 0
    for r in (1, 2.76, 5.4, 8.9): x = x + np.sin(2 * np.pi * 420 * r * t * (1 + 0.04 * t / s)) / r ** 0.6
    return (x * ramp(n, 1.3, 0.2) * (0.75 + 0.25 * np.sin(2 * np.pi * 11 * t)) + 0.3 * hp(noise(n), 5000) * ramp(n, 2)) * env(n, 0.03, 0.12)
def aegis_ram():
    s = 0.4; n = int(SR * s); t = T(s); x = lp(noise(n), 4000 * np.exp(-t * 4) + 300) * np.exp(-t * 6) + thump(s, 100, 45, 16, 8) + 0.3 * sw(300, 100, s); return x * env(n, 0.003, 0.1)
def aegis_block():
    s = 0.2; n = int(SR * s); t = T(s); x = 0
    for r in (1, 2.76, 5.4): x = x + np.sin(2 * np.pi * 900 * r * t) / r ** 0.5 * np.exp(-t * (22 + 8 * r))
    return (x + 0.4 * hp(noise(n), 4000) * np.exp(-t * 80)) * env(n, 0.001, 0.05)
def cantor_charge():
    s = 0.8; n = int(SR * s); t = T(s); f = 300 * 1.7 ** (t / s); x = (np.sin(ph(f)) + 0.6 * fm(f * 0.5, 7, 2, s)) * ramp(n, 1.3, 0.2) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t)); return x * env(n, 0.05, 0.06)
def cantor_fire():
    s = 0.25; n = int(SR * s); t = T(s); x = sw(1500, 400, s) * np.exp(-t * 14) + 0.5 * sw(900, 250, s) * np.exp(-t * 10) + 0.3 * hp(noise(n), 4000) * np.exp(-t * 40); return x * env(n, 0.001, 0.07)
def cantor_aura_off():
    s = 0.4; n = int(SR * s); t = T(s); x = (sw(700, 150, s) + 0.4 * sw(1400, 300, s)) * np.exp(-t * 6); return x * env(n, 0.005, 0.15)

NAMES = ["boss_warning", "warden_roar", "warden_step", "rupture_warn", "rupture_burst", "sweep_wind", "sweep_hit", "charge_wind", "charge_hit", "warden_hurt", "warden_death",
         "seraph_arrive", "seraph_volley_wind", "seraph_volley_fire", "seraph_blink_out", "seraph_blink_in", "seraph_ring_wind", "seraph_ring_burst", "seraph_spiral_pulse", "seraph_phase", "seraph_hurt", "seraph_death",
         "aegis_brace", "aegis_ram", "aegis_block", "cantor_charge", "cantor_fire", "cantor_aura_off"]

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

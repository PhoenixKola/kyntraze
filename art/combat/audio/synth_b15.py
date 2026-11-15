"""Original combat-feedback sounds for KYNTRAZE B15, synthesised from scratch with numpy (no samples).
  python art/combat/audio/synth_b15.py  ->  public/audio/combat/*.wav + loudness.json
Short on purpose: a hit is tens of milliseconds so 60 of them per second cannot smear into noise."""
import json, os, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, "public", "audio", "combat")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1515)

def t_(s): return np.arange(int(SR * s)) / SR
def env(n, a=0.002, r=0.03): e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e
def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y
def hp(x, fc): return x - lowpass(x, fc)
def tone(f0, f1, s): t = t_(s); f = f0 * (f1 / f0) ** (t / s); return np.sin(2 * np.pi * np.cumsum(f) / SR)

def hit_light():   # crisp knuckle tick: noise snap + short pitched body
    s = 0.09; n = int(SR * s); t = t_(s); return (0.8 * hp(rng.standard_normal(n), 2500) * np.exp(-t * 55) + 0.6 * tone(420, 140, s) * np.exp(-t * 38)) * env(n, 0.0008, 0.02)
def hit_heavy():   # weighty thud + crack
    s = 0.24; n = int(SR * s); t = t_(s); return (1.0 * tone(150, 48, s) * np.exp(-t * 15) + 0.7 * hp(rng.standard_normal(n), 1500) * np.exp(-t * 30) + 0.35 * lowpass(rng.standard_normal(n), 400) * np.exp(-t * 12)) * env(n, 0.0008, 0.05)
def hit_boss():    # armoured resonant clang with a sub body
    s = 0.34; n = int(SR * s); t = t_(s); ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (12 + i * 5)) for i, f in enumerate((310, 640, 1010, 1730)))
    return (0.9 * tone(110, 40, s) * np.exp(-t * 11) + 0.4 * ring + 0.5 * hp(rng.standard_normal(n), 1800) * np.exp(-t * 28)) * env(n, 0.0008, 0.06)
def block_deflect():  # metallic ricochet ping, bright and thin: clearly not flesh
    s = 0.22; n = int(SR * s); t = t_(s); ping = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (16 + i * 9)) for i, f in enumerate((2100, 3150, 4720, 6300)))
    return (0.7 * ping + 0.5 * hp(rng.standard_normal(n), 5000) * np.exp(-t * 70) + 0.25 * np.sin(2 * np.pi * 2100 * (1 + 0.4 * np.exp(-t * 30)) * t) * np.exp(-t * 20)) * env(n, 0.0005, 0.04)
def player_hurt():  # low dull thump + descending wince, softer top end so it never reads as an enemy hit
    s = 0.3; n = int(SR * s); t = t_(s); return (0.9 * tone(210, 70, s) * np.exp(-t * 11) + 0.35 * tone(900, 380, s) * np.exp(-t * 14) + 0.4 * lowpass(rng.standard_normal(n), 900) * np.exp(-t * 20)) * env(n, 0.001, 0.06)
def revive():  # rising warm chime: Second Wind
    s = 0.7; n = int(SR * s); t = t_(s); x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (3 + i)) for i, f in enumerate((392, 587, 784, 1175))) * np.linspace(0.4, 1, n) ** 0.5
    return (x + 0.4 * tone(110, 220, s) * np.exp(-t * 4)) * env(n, 0.01, 0.15)

SOUNDS = dict(hit_light=hit_light, hit_heavy=hit_heavy, hit_boss=hit_boss, block_deflect=block_deflect, player_hurt=player_hurt, revive=revive)
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

"""Original B21 sounds for KYNTRAZE, synthesised from scratch with numpy (no samples, no third-party audio).
  python art/combat/audio/synth_b21.py  ->  public/audio/b21/*.wav + loudness.json
Rare accents that sit on top of the existing ability mix: impact frames, evolution sparks/echoes, shield break, boss damage, floor cracks, aura surges per element.
Authored by waveform and spectrum design only: NOT yet auditioned by ear (see B21-STATUS.md)."""
import json, os, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, "public", "audio", "b21")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(2121)

def t_(s): return np.arange(int(SR * s)) / SR
def env(n, a=0.002, r=0.03): e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e
def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y
def hp(x, fc): return x - lowpass(x, fc)
def bp(x, lo, hi): return lowpass(hp(x, lo), hi)
def tone(f0, f1, s): t = t_(s); f = f0 * (f1 / f0) ** (t / s); return np.sin(2 * np.pi * np.cumsum(f) / SR)
def noise(n): return rng.standard_normal(n)

def impact_frame():   # the held-breath hit: sub thump, a bright crack, then a fast airy suction tail
    s = 0.38; n = int(SR * s); t = t_(s)
    thump = 0.5 * tone(95, 34, s) * np.exp(-t * 13) + 0.8 * tone(300, 120, s) * np.exp(-t * 20) + 0.4 * bp(noise(n), 200, 1200) * np.exp(-t * 30)   # sub for weight, 120-300 Hz punch so small speakers still carry it
    crack = hp(noise(n), 2200) * np.exp(-t * 60) * 0.8
    air = bp(noise(n), 700, 4200) * (np.exp(-t * 9) * (1 - np.exp(-t * 90))) * 0.35
    return (1.0 * thump + crack + air) * env(n, 0.0006, 0.08)
def evo_spark():      # tiny bright tick for a pierce spark, pitch-jittered at play time
    s = 0.07; n = int(SR * s); t = t_(s); return (0.7 * hp(noise(n), 4000) * np.exp(-t * 90) + 0.5 * np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 70)) * env(n, 0.0004, 0.015)
def evo_echo():       # the second ring: glassy double chime with a soft bloom
    s = 0.6; n = int(SR * s); t = t_(s); x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (6 + i * 3)) * a for i, (f, a) in enumerate(((880, 1), (1318, .7), (1760, .5), (2637, .3))))
    x += 0.4 * np.sin(2 * np.pi * 880 * 1.004 * t) * np.exp(-t * 7); return x * env(n, 0.003, 0.15)
def shield_shatter(): # crystal glass burst: dense high noise grains + a descending ring + low knock
    s = 0.55; n = int(SR * s); t = t_(s)
    grains = np.zeros(n)
    for _ in range(26):
        at = int(rng.uniform(0, 0.22) * SR); L = int(rng.uniform(0.02, 0.09) * SR); f = rng.uniform(2400, 7800); tt = np.arange(L) / SR
        grains[at:at + L] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * rng.uniform(40, 90)) * rng.uniform(0.2, 0.5)
    ring = np.sin(2 * np.pi * 1900 * (1 - 0.3 * (t / s)) * t) * np.exp(-t * 10) * 0.5
    knock = tone(220, 80, s) * np.exp(-t * 24) * 0.7
    return (grains + ring + knock + 0.4 * hp(noise(n), 3500) * np.exp(-t * 45)) * env(n, 0.0005, 0.1)
def shield_down():    # lowered guard: heavy metal drop and a settling rattle
    s = 0.4; n = int(SR * s); t = t_(s); return (0.9 * tone(180, 70, s) * np.exp(-t * 14) + 0.5 * sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (14 + 6 * i)) for i, f in enumerate((340, 710, 1190))) + 0.3 * bp(noise(n), 900, 3800) * np.exp(-t * 25)) * env(n, 0.001, 0.08)
def boss_crack():     # armour plate splitting: stone/metal crack, grind, then falling pieces
    s = 0.8; n = int(SR * s); t = t_(s)
    crack = hp(noise(n), 900) * np.exp(-t * 28) * 0.9 * (1 + 0.5 * np.sin(2 * np.pi * 38 * t))
    grind = bp(noise(n), 120, 900) * np.exp(-t * 5) * np.minimum(1, t / 0.05) * 0.55
    sub = 0.4 * tone(70, 32, s) * np.exp(-t * 7) + 0.6 * tone(180, 70, s) * np.exp(-t * 9)
    pieces = np.zeros(n)
    for k in range(5):
        at = int((0.18 + k * 0.1 + rng.uniform(0, 0.05)) * SR); L = int(0.07 * SR); tt = np.arange(L) / SR
        if at + L < n: pieces[at:at + L] += (bp(noise(L), 300, 2600) * np.exp(-tt * 45)) * 0.5
    return (crack + grind + sub + pieces) * env(n, 0.001, 0.2)
def floor_crack():    # shock radiating across the floor: sub boom + fast crackle fan
    s = 0.7; n = int(SR * s); t = t_(s)
    boom = 0.45 * tone(80, 30, s) * np.exp(-t * 6) + 0.7 * tone(220, 90, s) * np.exp(-t * 11)
    fan = hp(noise(n), 1800) * np.exp(-t * 14) * (0.5 + 0.5 * np.sin(2 * np.pi * (14 - 10 * t) * t)) * 0.5
    return (boom + fan + 0.7 * bp(noise(n), 200, 1500) * np.exp(-t * 9)) * env(n, 0.001, 0.15)
def aura_surge_ren(): # low ember rush: rising sub-bass swell, hot noise whoosh with a pressure pop
    s = 0.7; n = int(SR * s); t = t_(s); u = t / s
    return (0.4 * tone(55, 130, s) * u ** 1.6 * np.exp(-np.maximum(0, t - 0.45) * 8) + 0.5 * tone(160, 320, s) * u ** 1.4 * np.exp(-np.maximum(0, t - 0.45) * 8) + 0.7 * bp(noise(n), 300, 2200) * np.sin(np.pi * np.minimum(1, u * 1.1)) ** 2 + 0.3 * lowpass(noise(n), 500) * np.exp(-t * 4)) * env(n, 0.01, 0.2)
def aura_surge_sora():# crystalline upward sweep with a thin electric flutter
    s = 0.6; n = int(SR * s); t = t_(s); u = t / s
    sweep = np.sin(2 * np.pi * np.cumsum(700 * (4.5 ** u)) / SR) * np.sin(np.pi * u) ** 1.4
    flutter = hp(noise(n), 5500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * t))) * np.sin(np.pi * u) * 0.3
    return (0.5 * sweep + flutter + 0.3 * np.sin(2 * np.pi * 2093 * t) * np.exp(-np.maximum(0, t - 0.3) * 9) * (t > 0.3)) * env(n, 0.01, 0.15)
def aura_surge_gold():# crackling gold: forked lightning ticks over a warm rising hum
    s = 0.55; n = int(SR * s); t = t_(s); u = t / s
    ticks = np.zeros(n)
    for _ in range(14):
        at = int(rng.uniform(0, 0.4) * SR); L = int(rng.uniform(0.01, 0.04) * SR); ticks[at:at + L] += hp(noise(L), 2500) * np.exp(-np.arange(L) / SR * 90) * rng.uniform(0.3, 0.8)
    return (ticks + 0.5 * tone(110, 220, s) * u * np.exp(-np.maximum(0, t - 0.35) * 8) + 0.3 * bp(noise(n), 400, 3000) * np.sin(np.pi * u)) * env(n, 0.006, 0.12)
def aura_surge_silver():  # quiet power: slow airy swell and a faint high shimmer, restraint over loudness
    s = 0.9; n = int(SR * s); t = t_(s); u = t / s
    return (0.5 * bp(noise(n), 500, 3500) * np.sin(np.pi * u) ** 2 + 0.25 * np.sin(2 * np.pi * 1568 * t) * np.sin(np.pi * u) ** 3 + 0.15 * tone(60, 90, s) * np.sin(np.pi * u) + 0.4 * bp(noise(n), 200, 900) * np.sin(np.pi * u) ** 2) * env(n, 0.05, 0.3) * 0.8

SOUNDS = dict(impact_frame=impact_frame, evo_spark=evo_spark, evo_echo=evo_echo, shield_shatter=shield_shatter, shield_down=shield_down, boss_crack=boss_crack, floor_crack=floor_crack,
              aura_surge_ren=aura_surge_ren, aura_surge_sora=aura_surge_sora, aura_surge_gold=aura_surge_gold, aura_surge_silver=aura_surge_silver)
TARGET_PEAK = 10 ** (-3.0 / 20)
if __name__ == "__main__":
    rep = {}
    for name, fn in SOUNDS.items():
        x = np.asarray(fn(), float); x -= x.mean(); x[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR)); x = x / np.max(np.abs(x)) * TARGET_PEAK
        pcm = np.round(x * 32767).astype(np.int16)
        with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        spec = np.abs(np.fft.rfft(x)); fr = np.fft.rfftfreq(len(x), 1 / SR)
        rep[name] = dict(seconds=round(len(pcm) / SR, 3), peak_dBFS=round(20 * np.log10(np.max(np.abs(x))), 2), rms_dBFS=round(20 * np.log10(np.sqrt(np.mean(x ** 2))), 2), centroid_Hz=int(np.sum(fr * spec) / np.sum(spec)), clipped_samples=int(np.sum(np.abs(pcm) >= 32767)))
        print(name, rep[name])
    json.dump(rep, open(os.path.join(OUT, "loudness.json"), "w"), indent=1)

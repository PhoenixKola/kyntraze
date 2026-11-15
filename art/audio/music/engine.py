"""KYNTRAZE B16 music engine: a small original numpy synthesiser + sequencer (no samples, no third-party audio).
Instruments return stereo (2,n); Mix collects them on buses, applies a sidechain pump and convolution reverb, and folds the tail back over the start so loops are seamless."""
import numpy as np, scipy.signal as sg, subprocess, os, tempfile, wave

SR = 44100
rng = np.random.default_rng(1616)
hz = lambda m: 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


def ns(sec): return max(1, int(sec * SR))
def tt(n): return np.arange(n) / SR


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.1):
    a, d, r = ns(a), ns(d), ns(r)
    e = np.ones(n) * s
    a = min(a, n); e[:a] = np.linspace(0, 1, a, endpoint=False)
    dd = min(d, n - a)
    if dd > 0: e[a:a + dd] = np.linspace(1, s, dd)
    r = min(r, n); e[n - r:] *= np.linspace(1, 0, r)
    return e


def lp(x, fc, o=2): fc = min(max(fc, 20), SR * 0.45); return sg.lfilter(*sg.butter(o, fc / (SR / 2)), x, axis=-1)
def hp(x, fc, o=2): fc = min(max(fc, 20), SR * 0.45); return sg.lfilter(*sg.butter(o, fc / (SR / 2), 'high'), x, axis=-1)
def bp(x, lo, hi, o=2): return sg.lfilter(*sg.butter(o, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band'), x, axis=-1)
def noise(n): return rng.standard_normal(n)


def saw(f, n, ph0=0.0):
    f = np.broadcast_to(np.asarray(f, float), (n,))
    return 2 * ((ph0 + np.cumsum(f / SR)) % 1.0) - 1


def sine(f, n, ph0=0.0):
    f = np.broadcast_to(np.asarray(f, float), (n,))
    return np.sin(2 * np.pi * (ph0 + np.cumsum(f / SR)))


def stereo(l, r=None): return np.vstack([l, l if r is None else r])
def sweep(f0, f1, n, curve=1.0): return f0 * (f1 / f0) ** (np.linspace(0, 1, n) ** curve)


# ---------------- instruments ----------------
def pad(m, dur, bright=1800, voices=4, att=0.6, rel=0.8, det=14):
    n = ns(dur + rel); outs = []
    for side in (0, 1):
        acc = np.zeros(n)
        for v in range(voices):
            d = (v - (voices - 1) / 2) * det * (1 if side == 0 else -1) / max(1, voices - 1) + rng.uniform(-3, 3)
            acc += saw(hz(m) * 2 ** (d / 1200), n, rng.random())
        outs.append(lp(acc / voices, bright))
    return np.vstack(outs) * adsr(n, att, 0.3, 0.85, rel)


def sub(m, dur, drive=1.6):
    n = ns(dur + 0.1)
    return stereo(np.tanh(drive * sine(hz(m), n)) * adsr(n, 0.008, 0.05, 0.9, 0.08))


def bass_pluck(m, dur, bright=900):
    n = ns(dur + 0.05); x = saw(hz(m), n) + 0.6 * saw(hz(m) * 1.005, n, 0.3)
    lo = lp(x, bright * 0.4); hi = lp(x, bright * 2.2); e = np.exp(-tt(n) * 9)
    return stereo((lo + (hi - lo) * e) * adsr(n, 0.004, 0.05, 0.8, 0.04) * 0.6)


def pluck(m, dur=0.3, bright=4000):
    n = ns(dur + 0.05); f = hz(m); x = saw(f, n) + 0.5 * saw(f * 1.004, n, 0.2)
    lo = lp(x, 700); hi = lp(x, bright); e = np.exp(-tt(n) * 14)
    return stereo((lo + (hi - lo) * e) * np.exp(-tt(n) * 5.5) * adsr(n, 0.002, 0.02, 1, 0.03) * 0.5)


def lead(m, dur, bright=3200, vib=5.0, att=0.03, rel=0.2):
    n = ns(dur + rel); t = tt(n); f = hz(m) * (1 + 0.006 * np.sin(2 * np.pi * vib * t) * np.minimum(1, t / 0.25))
    x = lp(saw(f, n) + 0.7 * saw(f * 1.006, n, 0.4) + 0.3 * saw(f * 0.5, n), bright)
    return stereo(x * adsr(n, att, 0.08, 0.8, rel) * 0.45)


def brass(m, dur, bright=2600, att=0.06):
    n = ns(dur + 0.25); f = hz(m); x = sum(saw(f * 2 ** (c / 1200), n, rng.random()) for c in (-9, 0, 8)) / 3
    t = tt(n); mixv = np.minimum(1, t / (att + 0.12)); lo = lp(x, 500); hi = lp(x, bright)
    return stereo((lo + (hi - lo) * mixv) * adsr(n, att, 0.12, 0.8, 0.25) * 0.55)


def flute(m, dur, vib=5.2):
    n = ns(dur + 0.15); t = tt(n); f = hz(m) * (1 + 0.007 * np.sin(2 * np.pi * vib * t) * np.minimum(1, t / 0.3))
    x = sine(f, n) + 0.25 * sine(2 * f, n) + 0.08 * sine(3 * f, n)
    br = bp(noise(n), 2200, 6500) * 0.05 * (0.4 + 0.6 * np.exp(-t * 6))
    return stereo((x * 0.5 + br) * adsr(n, 0.05, 0.1, 0.85, 0.15))


def bell(m, dur=1.6, idx=2.6, ratio=3.5, vol=0.5):
    n = ns(dur); t = tt(n); f = hz(m)
    x = np.sin(2 * np.pi * f * t + idx * np.exp(-t * 3.5) * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * 2.4)
    x += 0.35 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 4.0)
    return stereo(x * vol * adsr(n, 0.002, 0.05, 1, 0.1))


def glass(m, dur=2.0, vol=0.35):
    n = ns(dur); t = tt(n); f = hz(m)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 1.8), (2.76, .5, 3), (5.4, .28, 5), (8.93, .14, 8)))
    return stereo(x * vol * adsr(n, 0.001, 0.02, 1, 0.15))


def choir(m, dur, att=1.0, rel=1.2, bright=1400):
    n = ns(dur + rel); outs = []; t = tt(n)
    for side in (0, 1):
        acc = np.zeros(n)
        for c in (-11, 0, 9):
            f = hz(m) * 2 ** ((c * (1 if side == 0 else -1)) / 1200) * (1 + 0.004 * np.sin(2 * np.pi * (4.6 + side * .4) * t))
            acc += saw(f, n, rng.random())
        outs.append(bp(acc, 300, bright * 2.4) + lp(acc, bright) * 0.5)
    return np.vstack(outs) * adsr(n, att, 0.4, 0.9, rel) * 0.4


# ---- percussion
def kick(vol=1.0, low=42):
    n = ns(0.4); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(low + 120 * np.exp(-t * 30)) / SR) * np.exp(-t * 9) + 0.3 * hp(noise(n), 3000) * np.exp(-t * 90)
    return stereo(x * vol)


def snare(vol=0.8):
    n = ns(0.3); t = tt(n)
    return stereo((hp(noise(n), 1400) * np.exp(-t * 18) + 0.6 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 22)) * vol * 0.8)


def clap(vol=0.6):
    n = ns(0.3); t = tt(n)
    x = hp(noise(n), 1200) * (np.exp(-t * 30) + 0.7 * np.exp(-((t - .012) * 60) ** 2) + 0.5 * np.exp(-((t - .024) * 60) ** 2))
    return stereo(bp(x, 900, 7000) * vol)


def hat(vol=0.35, open_=False):
    n = ns(0.25 if open_ else 0.05); t = tt(n)
    return stereo(hp(noise(n), 7500) * np.exp(-t * (14 if open_ else 80)) * vol)


def shaker(vol=0.2):
    n = ns(0.09); t = tt(n)
    return stereo(bp(noise(n), 4000, 9000) * np.exp(-t * 50) * np.minimum(1, t * 400) * vol)


def tom(f=90, vol=0.9, dec=5.0):
    n = ns(0.8); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(f + f * 0.7 * np.exp(-t * 25)) / SR) * np.exp(-t * dec) + 0.25 * lp(noise(n), 700) * np.exp(-t * 40)
    return stereo(x * vol)


def taiko(f=62, vol=1.0):
    n = ns(1.2); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(f * 1.1 + f * 0.9 * np.exp(-t * 18)) / SR) * np.exp(-t * 3.4)
    x += 0.5 * lp(noise(n), 500) * np.exp(-t * 14) + 0.2 * hp(noise(n), 2500) * np.exp(-t * 60)
    return stereo(x * vol)


def metal(vol=0.4, f=420):
    n = ns(0.5); t = tt(n)
    x = sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, d in ((1, 8), (1.47, 10), (2.09, 12), (2.57, 14), (3.32, 18)))
    return stereo(hp(x, 500) * vol * 0.35)


def riser(dur, f0=300, f1=7000, vol=0.5, tone=True):
    n = ns(dur); t = tt(n); u = t / dur; x = hp(noise(n), 400) * u ** 2.2; out = np.zeros(n); segs = 14
    for i in range(segs):
        a, b = int(n * i / segs), int(n * (i + 1) / segs)
        if b - a > 50: out[a:b] = lp(x[a:b], f0 * (f1 / f0) ** ((i + .5) / segs))
    if tone: out += 0.25 * np.sin(2 * np.pi * np.cumsum(sweep(f0 * .4, f1 * .35, n, 1.4)) / SR) * u ** 2
    return stereo(out * vol)


def impact(vol=1.0):
    n = ns(2.4); t = tt(n)
    x = np.sin(2 * np.pi * np.cumsum(35 + 90 * np.exp(-t * 6)) / SR) * np.exp(-t * 1.6) + 0.7 * lp(noise(n), 1500) * np.exp(-t * 5) + 0.35 * hp(noise(n), 3500) * np.exp(-t * 14)
    return stereo(x * vol * 0.8)


# ---------------- mixer ----------------
def reverb_ir(sec, decay, seed):
    r = np.random.default_rng(seed); n = ns(sec); t = tt(n)
    ir = lp(r.standard_normal(n) * np.exp(-t * decay), 5500); k = ns(0.012); ir[:k] *= np.linspace(0, 1, k)
    return ir


class Mix:
    def __init__(self, seconds, tail=3.0, loop=True):
        self.L = ns(seconds); self.N = self.L + ns(tail); self.loop = loop
        self.b = {k: np.zeros((2, self.N)) for k in ('main', 'pad', 'verb', 'drum')}; self.duck = np.ones(self.N)

    def add(self, bus, sig, t, gain=1.0, pan=0.0, send=0.0):
        sig = np.asarray(sig); sig = stereo(sig) if sig.ndim == 1 else sig; i = int(t * SR)
        if i < 0 or i >= self.N: return
        m = min(sig.shape[1], self.N - i)
        gl = gain * np.sqrt((1 - pan) / 2) * 1.414; gr = gain * np.sqrt((1 + pan) / 2) * 1.414
        self.b[bus][0, i:i + m] += sig[0, :m] * gl; self.b[bus][1, i:i + m] += sig[1, :m] * gr
        if send: self.b['verb'][:, i:i + m] += sig[:, :m] * send

    def pump(self, times, depth=0.5, rel=0.22):
        for t in times:
            i = int(t * SR); m = min(ns(rel), self.N - i)
            if m > 0: self.duck[i:i + m] = np.minimum(self.duck[i:i + m], 1 - depth * np.exp(-np.linspace(0, 4, m)))

    def render(self, rev_sec=2.6, rev_decay=2.2, rev_gain=0.42, target_rms_db=-19.0):
        out = self.b['main'] + self.b['drum'] + self.b['pad'] * self.duck; v = self.b['verb']; rl = ns(rev_sec)
        wet = np.vstack([sg.fftconvolve(v[0], reverb_ir(rev_sec, rev_decay, 1)), sg.fftconvolve(v[1], reverb_ir(rev_sec, rev_decay, 2))]) * rev_gain
        full = wet[:, : self.N + rl].copy(); full[:, : self.N] += out
        if self.loop:
            y = np.zeros((2, self.L))
            for k in range(0, full.shape[1], self.L):
                seg = full[:, k:k + self.L]; y[:, : seg.shape[1]] += seg
        else:
            y = full[:, : self.N].copy()   # one-shots keep their reverb tail and fade out over the last half second
        y -= y.mean(axis=1, keepdims=True); y *= 10 ** (target_rms_db / 20) / (np.sqrt(np.mean(y ** 2)) + 1e-9)
        y = np.tanh(y * 1.35) / 1.35; y *= 10 ** (-1.2 / 20) / np.max(np.abs(y))
        if not self.loop: n = min(ns(0.5), y.shape[1]); y[:, -n:] *= np.linspace(1, 0, n) ** 2
        return y


def write_ogg(y, path, q=4):
    pcm = np.round(y.T * 32767).astype('<i2'); tmp = tempfile.mktemp(suffix='.wav')
    with wave.open(tmp, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', str(q), path], check=True); os.remove(tmp)

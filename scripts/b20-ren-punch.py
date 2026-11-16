"""B20: Ren's impacts were >85% energy below 150 Hz (inaudible on laptop speakers / earbuds). Adds a harmonic exciter (tanh saturation, high-passed at 300 Hz) plus a 6 ms click on the transient, keeps the original peak. Originals are kept in art/characters/heroes/audio/originals-b19/. Run once; it refuses to re-process."""
import os, shutil, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
D = 'public/audio/hero-abilities'; BK = 'art/characters/heroes/audio/originals-b19'
NAMES = ['ren_auto_a', 'ren_auto_b', 'ren_auto_fin', 'ren_q_start', 'ren_q_fin', 'rush_strike', 'rush_hop', 'rush_end', 'bloodstar_crouch', 'bloodstar_leap', 'bloodstar_rebound', 'bloodstar_ring', 'bloodstar_slam', 'ren_ascend_break', 'ren_ascend_charge', 'ren_ascend_commit']
for n in NAMES:
    src = f'{D}/{n}.wav'; bk = f'{BK}/{n}.wav'
    if os.path.exists(bk): print('skip (already processed)', n); continue
    shutil.copy(src, bk); sr, a = wavfile.read(src); dt = a.dtype; x = a.astype(np.float64); full = float(np.iinfo(dt).max) if dt.kind == 'i' else 1.0
    m = x.ndim > 1; mono = x.mean(axis=1) if m else x; mono = mono / full; pk = np.abs(mono).max()
    h = np.tanh(3.2 * mono / max(pk, 1e-6)); h = sosfilt(butter(2, 300, 'hp', fs=sr, output='sos'), h) * pk
    k = np.zeros_like(mono); nclk = int(sr * 0.006); env = np.exp(-np.arange(nclk) / (nclk / 4)); rng = np.random.default_rng(len(n)); k[:nclk] = rng.standard_normal(nclk) * env
    k = sosfilt(butter(2, 1800, 'hp', fs=sr, output='sos'), k) * pk * 0.35
    env2 = np.minimum(1, np.abs(mono) / (pk * 0.2 + 1e-9))   # exciter follows the signal so quiet tails stay quiet
    y = mono + 0.55 * h * env2 + k; y *= pk / max(np.abs(y).max(), 1e-6)
    out = (np.stack([y] * x.shape[1], axis=1) if m else y) * full
    wavfile.write(src, sr, out.astype(dt)); print('processed', n)

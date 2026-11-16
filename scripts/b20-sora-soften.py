"""B20: Sora's most repeated sounds sat at 8.5-10 kHz centroids (shrill over a long run). Blends 55% original + 45% 5.5 kHz low-passed copy, peak preserved. Originals are kept in art/characters/heroes/audio/originals-b19/."""
import os, shutil, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
D = 'public/audio/hero-abilities'; BK = 'art/characters/heroes/audio/originals-b19'
for n in ['needle_fire', 'lance_pulse', 'volley_fire', 'lance_fire', 'lance_end', 'horizon_end', 'sora_ascend_break']:
    src = f'{D}/{n}.wav'; bk = f'{BK}/{n}.wav'
    if os.path.exists(bk): print('skip', n); continue
    shutil.copy(src, bk); sr, a = wavfile.read(src); x = a.astype(np.float64); pk = np.abs(x).max()
    lp = sosfilt(butter(2, 5500, 'lp', fs=sr, output='sos'), x, axis=0); y = 0.55 * x + 0.45 * lp; y *= pk / max(np.abs(y).max(), 1e-9)
    wavfile.write(src, sr, y.astype(a.dtype)); print('softened', n)

"""Waveform + spectrogram sheet of the generated ability sounds (numpy + PIL only): python audio_evidence.py <wav_dir> <out.png>"""
import math, os, sys, wave
import numpy as np
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]; names = ["beam_charge", "beam_fire", "beam_fire_f1", "beam_pulse_0", "beam_end", "sphere_gather", "sphere_throw", "sphere_flight", "sphere_burst", "sphere_burst_f1", "cast_cancel"]
W, HW, HS = 760, 60, 110; sheet = Image.new("RGB", (W * 2, (HW + HS + 18) * math.ceil(len(names) / 2)), (18, 18, 26)); dr = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    with wave.open(os.path.join(d, n + ".wav")) as w: x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float) / 32768; sr = w.getframerate()
    ox, oy = (i % 2) * W, (i // 2) * (HW + HS + 18); dr.text((ox + 4, oy + 2), f"{n}  {len(x) / sr:.2f}s  peak {20 * math.log10(np.abs(x).max()):.1f} dBFS", fill=(255, 230, 120))
    cols = np.array_split(np.abs(x), W - 8); env = np.array([c.max() for c in cols])
    for k, v in enumerate(env): h = int(v * HW / 2); dr.line((ox + 4 + k, oy + 18 + HW // 2 - h, ox + 4 + k, oy + 18 + HW // 2 + h), fill=(90, 200, 240))
    fr, hop = 1024, max(64, len(x) // (W - 8)); win = np.hanning(fr); spec = []
    for s in range(0, max(1, len(x) - fr), hop): spec.append(np.abs(np.fft.rfft(x[s:s + fr] * win))[:fr // 2])
    S = np.log10(np.array(spec).T + 1e-5); S = (S - S.min()) / (S.max() - S.min() + 1e-9); S = S[::-1]
    img = Image.fromarray((S * 255).astype(np.uint8)).resize((W - 8, HS), Image.BILINEAR).convert("L"); sheet.paste(Image.merge("RGB", (img.point(lambda v: min(255, v * 2)), img.point(lambda v: max(0, v - 60) * 2), img.point(lambda v: 80 + v // 2))), (ox + 4, oy + 18 + HW))
sheet.save(out); print(sheet.size)

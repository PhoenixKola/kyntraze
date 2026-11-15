# B09 arena audio report

Source: `synth_b09.py` (numpy, from scratch: sines, FM, filtered noise, bell partials, stochastic clicks; no samples, no third-party audio). Output: `public/audio/arenas/*.wav` + `loudness.json`. Mono, 44.1 kHz, 16-bit, peak -3 dBFS, 4 ms fade-in, 30 ms fade-out, DC removed, no loops (every sound decays or windows to silence).

Programmatic checks (re-read from the written WAVs): format, all samples finite, peak within 0.1 dB of -3 dBFS, |DC| < 0.001, duration within 20 ms of the brief, first sample ~0, last 1 ms < 0.005 FS, 0 clipped samples. Result: 8/8 pass.

| file | s | brief s | peak dBFS | rms dBFS | DC | tail(1 ms) | check |
|---|---|---|---|---|---|---|---|
| surge_warn | 1.50 | 1.5 | -3.00 | -14.0 | -0.00000 | 0.0018 | ok |
| surge_fire | 0.70 | 0.7 | -3.00 | -21.3 | 0.00000 | 0.0008 | ok |
| pylon_charge | 1.40 | 1.4 | -3.00 | -17.1 | 0.00000 | 0.0042 | ok |
| pylon_pulse | 0.60 | 0.6 | -3.00 | -20.8 | 0.00000 | 0.0010 | ok |
| amb_gloam_a | 2.50 | 2.5 | -3.00 | -11.1 | 0.00000 | 0.0002 | ok |
| amb_gloam_b | 2.00 | 2.0 | -3.00 | -23.7 | -0.00000 | 0.0001 | ok |
| amb_ashen_a | 3.00 | 3.0 | -3.00 | -17.7 | 0.00000 | 0.0001 | ok |
| amb_ashen_b | 2.20 | 2.2 | -3.00 | -13.6 | 0.00000 | 0.0000 | ok |

Design intent: surge_warn / pylon_charge are shorter than the 1.6 s / 1.5 s warnings they announce; surge_fire / pylon_pulse are short, low-end-weighted and decay to silence; the four amb_* files are quiet background accents (windowed swells, no melody) meant to be played at low gain by the game.

**Nothing here has been listened to by a human (or by the author).** Timbre, tension-vs-harshness, mix balance against Kai/enemy/boss audio and whether the ambients are pleasant are all UNVERIFIED; only the programmatic checks above were run.

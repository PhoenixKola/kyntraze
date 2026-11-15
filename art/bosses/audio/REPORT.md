# B08 boss / elite audio report

Source: `synth_b08.py` (numpy, from scratch: sines, FM, filtered noise, stochastic crystal "shards"; no samples, no third-party audio). Output: `public/audio/bosses/*.wav` + `loudness.json`. Mono, 44.1 kHz, 16-bit, peak -3 dBFS, 4 ms fade-in, 30 ms fade-out, DC removed, no loops (every tail decays to silence).

Programmatic checks (re-read from the written WAVs): format, all samples finite, peak within 0.1 dB of -3 dBFS, |DC| < 0.001, duration within 20 ms of the brief, first sample ~0, last 1 ms < 0.005 FS, 0 clipped samples. Result: 28/28 pass.

| file | s | brief s | peak dBFS | rms dBFS | DC | tail(1 ms) | check |
|---|---|---|---|---|---|---|---|
| boss_warning | 1.60 | 1.6 | -3.00 | -14.3 | 0.00000 | 0.0000 | ok |
| warden_roar | 1.40 | 1.4 | -3.00 | -13.6 | -0.00000 | 0.0000 | ok |
| warden_step | 0.30 | 0.3 | -3.00 | -13.3 | -0.00000 | 0.0024 | ok |
| rupture_warn | 0.80 | 0.8 | -3.00 | -17.1 | -0.00000 | 0.0001 | ok |
| rupture_burst | 0.40 | 0.4 | -3.00 | -19.7 | 0.00000 | 0.0006 | ok |
| sweep_wind | 0.90 | 0.9 | -3.00 | -20.7 | -0.00000 | 0.0002 | ok |
| sweep_hit | 0.35 | 0.35 | -3.00 | -20.9 | 0.00000 | 0.0007 | ok |
| charge_wind | 0.80 | 0.8 | -3.00 | -15.8 | -0.00000 | 0.0002 | ok |
| charge_hit | 0.50 | 0.5 | -3.00 | -21.5 | 0.00000 | 0.0005 | ok |
| warden_hurt | 0.25 | 0.25 | -3.00 | -16.3 | -0.00000 | 0.0010 | ok |
| warden_death | 2.20 | 2.2 | -3.00 | -21.8 | 0.00000 | 0.0002 | ok |
| seraph_arrive | 1.50 | 1.5 | -3.00 | -13.3 | -0.00000 | 0.0000 | ok |
| seraph_volley_wind | 0.70 | 0.7 | -3.00 | -16.5 | -0.00000 | 0.0001 | ok |
| seraph_volley_fire | 0.30 | 0.3 | -3.00 | -16.4 | -0.00000 | 0.0000 | ok |
| seraph_blink_out | 0.30 | 0.3 | -3.00 | -14.8 | -0.00000 | 0.0000 | ok |
| seraph_blink_in | 0.30 | 0.3 | -3.00 | -19.9 | 0.00000 | 0.0001 | ok |
| seraph_ring_wind | 0.90 | 0.9 | -3.00 | -14.8 | 0.00000 | 0.0000 | ok |
| seraph_ring_burst | 0.50 | 0.5 | -3.00 | -21.1 | -0.00000 | 0.0004 | ok |
| seraph_spiral_pulse | 0.12 | 0.12 | -3.00 | -17.9 | -0.00000 | 0.0000 | ok |
| seraph_phase | 1.60 | 1.6 | -3.00 | -15.1 | -0.00000 | 0.0000 | ok |
| seraph_hurt | 0.20 | 0.2 | -3.00 | -16.7 | 0.00000 | 0.0000 | ok |
| seraph_death | 2.00 | 2.0 | -3.00 | -21.9 | 0.00000 | 0.0001 | ok |
| aegis_brace | 0.70 | 0.7 | -3.00 | -17.5 | -0.00000 | 0.0001 | ok |
| aegis_ram | 0.40 | 0.4 | -3.00 | -18.0 | 0.00000 | 0.0005 | ok |
| aegis_block | 0.20 | 0.2 | -3.00 | -20.9 | -0.00000 | 0.0000 | ok |
| cantor_charge | 0.80 | 0.8 | -3.00 | -14.4 | 0.00000 | 0.0002 | ok |
| cantor_fire | 0.25 | 0.25 | -3.00 | -17.8 | -0.00000 | 0.0000 | ok |
| cantor_aura_off | 0.40 | 0.4 | -3.00 | -13.9 | -0.00000 | 0.0000 | ok |

**Nothing here was listened to by a human or by this tool.** Only numeric properties above were checked; timbre, mix balance against Kai and B07 sounds, "ominous not harsh", distinctness between attacks and perceived loudness (rms ranges roughly -13 to -21 dBFS) are UNVERIFIED and need owner listening. Wind/warning sounds are shorter than the planned telegraphs in B08-DESIGN.md (rupture_warn 0.8 s, sweep_wind 0.9 s, charge_wind 0.8 s, volley 0.7 s, ring 0.9 s).

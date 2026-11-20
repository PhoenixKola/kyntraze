# KYNTRAZE audio art direction (B16)

**Identity.** Dark sci-fi / anime-action: fractured energy, engineered metal and crystal, cinematic tension, unmistakable heroic escalation. Palette: electronic pulse and sub bass, kinetic percussion (taiko, toms, metal hits), restrained hybrid brass/choir pads, glass and bell resonances; Stillfire adds air and silver.

**Motifs (all original, in `art/audio/music/compose_b16.py`).** KYNTRAZE motif (D minor): D F A G | F E D. Boss-threat interval: the tritone (D–Ab in the Warden, A–Eb in the Seraph). Victory: the same shape lifted to D major, D F# A D' (rising hope). Title states it on bells, Gloam hardens it on a saw lead, Ashen bends it phrygian on flute, Seraph rings it in bells.

**Cues.** title (84 bpm, 69 s loop) · Gloam Circuit (126 bpm, 61 s) · Ashen Reliquary (96 bpm, 80 s) · Fracture Warden (88 bpm, 65 s) · Null Seraph (112 bpm, 69 s) · victory (28 s one-shot) · defeat (17 s one-shot) · stingers: boss arrival, 14:30 final warning, Warden reward, level-up.

**Intensity hierarchy.** UI < ambience/footsteps < common combat < important attack/telegraph < boss/critical warning < transformation/finish payoff. The score sits under effects (music trim 0.5 × user music 0.7 by default).

**Form signatures (SFX).** Base: grounded kinetic hits. Flarebound: golden rising ignition (`form1_ignite`). Cometheart: long violent build, arc crackle, thunder weight. Stillfire Apex: the score ducks to ~4 % for the first 3.6 s reveal (15 % on repeat), then returns slowly; delicate silver hum, soft blink, precise beam. Cometheart reveals duck to 30 % (first) / 50 % (repeat).

**Mix.** Buses: master → music / sfx / ui. Music ducks for pause (30 %), level-up (50 %), boss intro, final warning, Warden reward and Flarebound ignition. Heavy per-category voice caps and rate limits keep a 100-mob crowd from becoming a buzz.

**Provenance.** Everything is synthesised from scratch with numpy/scipy (no samples, no third-party audio, no soundfonts). Music: `art/audio/music/engine.py` + `compose_b16.py` → OGG Vorbis via ffmpeg. UI: `art/audio/ui/synth_b16_ui.py`. Combat: `art/combat/audio/synth_b15.py`. Not derived from any existing game or composition.

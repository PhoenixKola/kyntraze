# B16 — Audio, music and sound identity (OWNER REVIEW REQUIRED; audio quality by ear NOT VERIFIED)

## Delivered
- **Music:** 5 loops (title, Gloam, Ashen, Warden, Seraph), victory + defeat one-shots, 4 stingers (boss arrival, 14:30 warning, Warden reward, level-up). OGG Vorbis, ~6 MB total, `public/audio/music/`.
- **Adaptive playback (sim-driven, `AbilityAudio.driveMusic`):** title outside a run → arena theme on start (2.4 s crossfade) → Warden/Seraph theme while that boss is alive → back to arena after → 14:30 final-warning stinger → victory / defeat cue. Pause 30 %, level-up 50 %, transformation reveals duck the score (Form III first reveal ≈ silent).
- **UI sounds (13):** hover (very quiet), click, confirm, back, pause/resume, toggles, slider tick, card pick, epic shimmer, XP pickup (streak pitch), Drive ready. One delegated listener (`src/app/uiSounds.ts`).
- **New SFX:** Flarebound ignition. B15 hit/hurt/block/revive routing untouched.
- **Mixer + settings:** buses master/music/sfx/ui, immediate smooth volume changes; Settings gained Master/Music/Effects/Interface sliders (Relic Plate styled, keyboard arrows, D-pad left/right) persisted in the save and migrated for old saves. Mute silences everything while the score keeps running.
- **Lifecycle:** one AudioContext, context no longer suspended on pause (score + UI keep working; effect voices are cut), retry/home keep the score, same-cue requests are no-ops, missing files are logged not thrown.
- Owner fixes this batch: Drive-bar label centred; level-up cards ease back on un-hover (sheen fades, slower return).

## Checked
typecheck, build, unit tests (13 new), live checks at 960×540 and 640×360 (unlock, title→arena→Warden→Seraph cue changes, settings persistence across reload), programmatic file checks (`art/audio/review_b16.py`: no clipping, loop seams, tails).

## NOT VERIFIED
**All of it by ear** (music quality, mix balance, ducking feel, loop musicality) — nothing was listened to. Seraph-victory cue only unit-tested live (QA kill hits the Warden reward pick first). Real browsers other than Chromium (Safari does not play OGG Vorbis on older versions). Physical controller sliders (mocked logic only). 640×360 Settings list scrolls (7 rows).

## Gaps vs brief
No dedicated ambience slider; no Rare/Epic-specific music; per-form ability SFX other than the new Flarebound ignition are the existing B12/B13 sounds; no stereo panning pass; no screen-recording with system audio.

## Carried forward (NOT done): moving-punch audit across forms/directions · specialised ImageGen combat art · boss phase/death visual rework · input buffering / controller responsiveness review · combat performance before/after · normal-speed motion sign-off.

## Listen first
`art/audio/review/b16/b16_montage.mp3` (cue list in `montage_cues.txt`, built from shipped files) → `index.html` (every file).

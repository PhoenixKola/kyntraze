# B03G.1 — Dash / Hurt / Death / Results timing polish: STATUS

Baseline: main at 6571fb1. **Footage was recorded (local webm, git-ignored) but NOT watched at real speed; motion appeal is UNVERIFIED and owner approval is pending.**

## Changes
- **Results delay (code, sim untouched):** `KaiAnimator.deathPresented()` is true only after the Death clip played through and held its last frame for 0.35 s; `ArenaScene` then calls `GameBridge.markDeathShown()` (ignored unless the sim is actually `dead`); the snapshot's `deathShown` gates `ResultsScreen`. Phase `dead` already blocks all input, damage and pausing, so the player cannot act or revive during the delay. A new run gets a new bridge/scene, so repeated deaths start clean. Measured live: Results after ~1.6 s (18 frames @14 fps = 1.29 s + 0.35 s hold + polling), Death at frame 17 before Results, always dead with hp 0, Escape/Shift/move keys mashed during the delay did nothing, retry gives a fresh Idle run with Results hidden.
- **Death (all 4 dirs, 18 frames @14, holds f17):** new staging built from the same rig/parts: hit, stagger, knees give way (hips drop with soles planted), weight tips back about the seat with feet still planted, slam, bounce, legs fold (knees up) and arms settle. New solver key `hip_target` pivots the whole body about the pelvis joint; `dir:"up"` picks the upward knee for lying legs. No ImageGen art was needed or used; the lying body is still a rotated rig pose (see limits).
- **Dash (10 frames, same 0.22 s sim mapping):** coil, push-off, launch, peak stretch, scissor (legs and arms swap), touchdown, skid, recover; much larger frame-to-frame difference than B03G (frames 2-6 are now distinct). Sim distance/cooldown/invulnerability unchanged.
- **Hurt (8 frames):** hit hop with arched back and flung arms, back-step stagger, hunch clutching the ribs (reads as pain, not as a guard/punch pose), recover; released early if the player moves after frame 5.
- **Edge/clip defects:** every new clip now keeps at least 2 px of margin to the Blender canvas (previously hair/hands touched the border on 7 of 12 clips); checked per frame with a bounding-box script (`scripts/bbox.py`, `rig/bbox.py`). SOUTH's own near boot touches the canvas bottom in the approved base clips, so SOUTH bottom margin is inherited.

## Gates (actually run)
- Blender: both `run_all.bat` pipelines rebuilt; each saved .blend reopened in a fresh Blender process; 6 Actions with correct frame counts, parts bound, packed textures equal `parts/`, drivers present, FK parity < 0.001 px. Death 18 frames, Dash 10, Hurt 8 in all four.
- **Idle/Run/BasicPunch sheets: byte-identical to HEAD for all four directions** (`git status` shows no change to them); BasicPunch impact still frame 5.
- typecheck PASS; vitest 45/45 (new: `deathPresented` contract, Results delay via GameBridge, retry/leak, 18-frame Death hold); build PASS; e2e 3/3.
- Live Phaser (headless Chromium, real keyboard, 960x540 and 640x360): dash facing in 4 directions, pause mid-dash frozen, hurt, death -> full animation -> Results -> retry (twice at 960, once at 640), 0 console errors. Report: `b03g1-evidence/live-b03g1-report.json`.

## Remaining defects / caveats
- Death's grounded pose is a rotated rig body with bent legs and arms; the collapse is far better than B03G but not hand-drawn art (SOUTH/NORTH show front/back views rotated, no true foreshortening).
- Limb seams and small enclosed gaps remain in some Dash/Hurt/Death frames (see per-direction `qa` numbers in the pipeline output); not hidden.
- Results appears ~1.6 s after death (clip + 0.35 s hold), slightly later than the 1.2 s target by design (tied to the clip).
- Motion appeal and game feel need the owner's eyes.

## Evidence
- `art/characters/kai/base/b03g1-evidence/b03g1-contact-1x.png` (all dirs, key frames), `death-0.4s/0.9s/final-before-results.png`, `results.png`, `hurt.png`, `dash-E/N.png` (+ `-640w`), report JSON. Clip: local `*.webm` (git-ignored). Per-direction normal-speed MP4s in each `review/` folder.

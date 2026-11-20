# B12 - Kai Form II: COMETHEART (local commit, NOT pushed - owner review first)

## How to try it (dev only)
`npm run dev`, open `http://127.0.0.1:5173/?qa=1&form2=1&seed=31` (QA route: Cometheart unlocked + full Drive), start a run, press **F** (pad **Y**). E = Dragonfang Rush, R = Cometbreaker Cannon (pad RB / LB, unchanged keys).
Normal play: defeat the Fracture Warden (~8:00) once -> Cometheart unlocks permanently (save `unlocks.cometheart`), Drive is filled, banner shows. Then **full Drive (100 %) + F** = Cometheart; 65-99 % + F stays Flarebound. Form II drains 5 Drive/s (~20 s), then 8 s cooldown and Drive must refill. First activation per run = 2.6 s reveal, later ones 1.1 s.

## What was built
- **Art (ImageGen, 4 facings independently directed):** new Form II heads + rear hair per direction through the audited Codex bridge (`art/characters/kai/form-ii/source/*-heads*.png` + prompts + PROVENANCE), extracted to native parts, rigs rebuilt in Blender on the approved Base/Form I rigs (`form-ii/<dir>/rig/*.blend`, sheets, manifests -> `public/art/kai-f2`). West was regenerated once (first result hid the face; kept as `west-heads-v1-faceblocked.png` only locally). Taller canvas (`KAI_PAD_TOP`, default 0 = Base/Form I byte-identical) so the taller hair is not clipped.
- **Owner fix included:** in EAST/WEST the head is now drawn *above* the jacket for Form I and Form II (Form I east/west sheets rebuilt; north/south unchanged).
- **VFX/UI (ImageGen):** dragon, lightning, ground cracks/debris, comet core/flash/beam segment, HUD icons (Dragonfang, Cometbreaker, Cometheart), Form II portrait. Cut by `form-ii/scripts/extract_fx.py`.
- **Sim:** `Cinema` freeze (clock, enemies, shots, hazards, cooldowns, i-frames all frozen; pause/retry safe; no double trigger), breaking-point knockback + stagger (real, bosses excluded), `form: 0|1|2`, separate Dragonfang/Cometbreaker cooldowns, unlock rule + save migration (`unlocks`), boss finisher event.
- **Dragonfang Rush (E):** 0.3 s wind-up, real 120 px collision-checked lunge, dragon sweep hits each enemy once (40 dmg, knockback, stagger), executes non-boss/non-elite enemies <= 22 % HP, 9 s cooldown, hand origin = exported BasicPunch fist anchor, all four facings.
- **Cometbreaker Cannon (R):** planted 1.1 s gather, 1.5 s beam opening from 20 to 84 px half-width, 11 dmg / 0.1 s, 22 s cooldown, origin = exported Beam fist midpoint, aim = facing (clamped +-17 deg).
- **Build carry-forward:** Lance cards -> Dragonfang (Hard Light dmg, Wide Lance width, Lance Cooling cd, Afterburn +40 reach/stack, Conductor Drive per hit); Nova cards -> Cometbreaker (Bloom Bulk width, Nova power dmg, Nova Cooling cd, Afterglow/Twin Bloom +0.4/+0.8 s beam). Base/Form I abilities unchanged.
- **Living aura (`cometFx.ts`):** intensity state machine (idle breathing / run trailing + afterimages / dash / charge compression / release flare / slow decay), rare ground cracks (not every step), dust + debris, floor light, shoulder/fist arcs; reduced-effects disables shake, flashes, zoom, debris.
- **Presentation:** camera punch-in, dim, soft flash overlay (not a white-out), visual hit-stop (skipped sim ticks only), boss finisher for Form II final blows (gold-white strike, ground lightning, 190 ms pause).
- **Audio (original numpy synthesis, `abilities/audio/synth_b12.py`):** form2_charge/break/commit/end, aura_crackle, dragon_windup/launch/hit, comet_gather/fire/end, finisher; all voices start/stop from sim events through shared slots.
- **HUD:** Form II portrait, second Drive tick, "COMETHEART READY", E/R tiles switch to Dragonfang/Cometbreaker with their own cooldowns.

## Checks actually run
typecheck PASS; build PASS; vitest 245/245 (18 new in `cometheart.test.ts`); Playwright 44/44 (3 new in `e2e/cometheart.spec.ts`, whole suite re-run); real-browser captures (`scripts/b12-capture.cjs`, swiftshader) at 960x540 and 640x360, Gloam and Ashen, 4 facings x E/R, cinema, run/dash/decay, crowd, Warden finisher: 0 console errors. Review pack: `art/characters/kai/review/b12/` (silhouette 1x/3x, 4-direction sprites, transform strips, hand-origin overlays, gameplay stills; local `video/*.webm` are git-ignored).

## NOT VERIFIED / remaining
- **Motion quality, audio quality, real-GPU frame pacing, balance/feel:** NOT VERIFIED (headless swiftshader; recorded .webm not watched; sounds synthesised but not heard). Stills are frozen sim frames, not proof of movement.
- Controller: mapping unchanged (RB/LB/Y); tested only with the existing mocked-pad tests.
- Aura "hair/sash secondary motion" is only the rig's existing hair follow-through; costume has no Form II stress marks (reserved for Form III).
- North BasicPunch fist anchor sits at the belly fist (that is what the approved north punch art shows).
- Death clip clips ~10 px at the canvas side (same as Form I).
- B13 (Stillfire Apex) not implemented; `FORM_TIERS` and `form: 0|1|2` reserve the slot.

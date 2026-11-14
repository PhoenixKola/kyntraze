# B03G — Kai Dash, Hurt, Death (4 directions): STATUS

Baseline: main at dfd0dea (B03F.1). **Owner art/motion approval pending. Real-time footage was NOT watched; motion appeal is UNVERIFIED.**

## Per-direction gates (Blender reopen = fresh `blender -b <saved .blend>` run inside `run_all.bat`: bones, parts bound, packed textures equal `parts/`, 6 Actions with correct frame counts, drivers; FK parity < 0.001 px)
| Dir | Dash (10f @22) | Hurt (8f @20) | Death (16f @14, holds f15) | Notes |
|---|---|---|---|---|
| SOUTH | PASS (crop touches canvas edge: minor) | PASS | PASS (head/fist touch left canvas edge in frames 8-9) | Idle/Run/BasicPunch sheets byte-identical (sha256 checked) |
| NORTH | PASS | PASS | PASS (edge touch) | back view: waistband only, no knot/tails |
| EAST | PASS | PASS (left fist touches canvas edge) | PASS (edge touch) | |
| WEST | PASS | PASS (left fist touches canvas edge) | PASS (edge touch) | |
"Edge touch" = the exported crop reaches the 160/176 px Blender canvas; at most a few px of a hand/hair may be cut. Idle/Run/BasicPunch sheets of north/east/west are byte-identical too.

## What was built
- Poses only, on the existing rigs/parts (no new ImageGen art, no procedural drawing): `rig/anim_b03g.py` (SOUTH), `scripts/danim_b03g.py` (N/E/W); both solvers gained optional `root`/`root_rot` so Death rotates the whole body about the ground point.
- Dash: crouch/lean anticipation, forward burst with trailing arms and sash, planted vs reaching boot, recovery. Hurt: head/torso snap, arms flung, stagger, recovery. Death: hit, stagger, knee buckle, tip and knock-back fall, ground contact, settle on the last frame.
- Exports: each new clip has its own tight frame + origin in the manifest (`frame_width/height/origin_px`, `terminal`), so the approved Idle/Run/BasicPunch sheets stayed byte-identical. `root_motion.baked=false`.
- Phaser: Dash progress is mapped onto the real sim dash (`dashRemaining`, 0.22 s) + 0.12 s recovery; Hurt starts only when the sim removes HP; Death plays once and holds, resets on retry. Priority Death > Hurt > Dash > BasicPunch > Run > Idle; Hurt/Dash never start a punch and the sim is untouched (damage, cooldown, invulnerability unchanged). Hurt is released early if the player moves after frame 5. Facing dwell 0.12 s, run-legs-under-moving-punch, 0.5x scale, frame-5 punch sync all kept. Death tint removed (the fall is the art).

## Tests (actually run)
typecheck PASS; vitest 41/41 (new: per-direction manifest contract for the 3 clips, Dash follows sim dash, priority, Hurt once/retrigger/interrupt, Death once/hold/reset); build PASS; e2e 3/3. Live Phaser (headless Chromium, real keyboard, 960x540 and 640x360, busy arena): dash in 6 input directions, pause mid-dash (frozen), 10 hurt reactions == 10 sim HP drops (both viewports), death final frame 15 monotonic, results screen, retry (hp 100, Idle), 0 missing textures, 0 foot-offset errors, 0 console errors. Evidence: `b03g-evidence/live-b03g-report.json`.

## Remaining visual/gameplay defects
- The results overlay appears the instant the sim goes `dead`, covering most of the Death animation. Not changed (UI/gameplay timing is out of scope); recommended: a ~1.2 s overlay delay.
- Facing diagonals map to 4 sheets; Dash/Hurt/Death in SOUTH and NORTH are front/back pose swaps, not true foreshortened art (the lying body is a rotated standing body).
- Frame-edge touches listed above; small limb seams from earlier batches remain; Dash travel frames 2-6 are close to each other.
- Dash has no afterimage/FX by design.

## Provenance
No new image assets. All frames come from the approved parts (see the per-direction `source/PROVENANCE.md`); ImageGen bridge was not invoked in B03G.

## Owner previews
- `art/characters/kai/base/b03g-evidence/b03g-contact-1x.png` (all 4 directions, key frames)
- Per direction: `<dir>/review/{Dash,Hurt,Death}-normal-speed.mp4` (SOUTH: `production-south-candidate/review/`; N/E/W: `production-other-directions-candidate/<dir>/review/`)
- In game: `b03g-evidence/{dash-E,dash-N,hurt,death-early,death-final,after-retry}[-640w].png`; local-only clip `b03g-evidence/*.webm` (git-ignored)

## Next milestone
Form I (transformed Kai) Idle/Run/Punch/Dash for four directions, plus a short death-to-results delay.

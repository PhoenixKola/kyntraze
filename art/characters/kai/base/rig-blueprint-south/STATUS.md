# B02H: Kai SOUTH rig blueprint, status (2026-11-13)

**What this is:** a mechanically tested SOUTH skeleton plus transparent fit templates for Codex to paint.

**What this is not:**
- not Kai art: the mannequin uses deliberately non-final guide colours;
- not approved;
- not production animation.

## Gate result

| Gate item | Result | Evidence |
|---|---|---|
| Part IDs, hierarchy, pivots and dimensions agree between the spec and the templates | **PASS**. 26 parts, 25 bones. The spec is generated from `scripts/rig_core.py`, and Blender re-checks image sizes and bone parents against it | `rig-spec.json`, `qa/blender-verify.json` |
| Neutral assembles with no fused legs and boots, no duplicate collar, no duplicate sleeve | **PASS (geometry)**. 0 holes, 1 connected island, 0 hidden-zone pixels exposed. Ownership rules pass (torso has no sleeve or collar pixels, head has none below the chin). Thigh, shin and boot are separate parts on each side | `neutral-assembly.png`, `rig-spec.json` → `geometry_checks` |
| At least one arm and both leg chains rotate through stress poses with no disconnection | **PASS**. 17 joints swept across their limits (9 angles each, near and far), plus 16 QA poses and 22 debug frames. No holes, no disconnected islands, no pivot off the body | `qa/joint-sweeps-5x.png`, `qa/poses-3x-diagnostic.png`, `qa/qa-report.json` |
| SOUTH pose and foot anchor are coherent with a three-quarter overhead view | **PASS, with limits** (see the defects list). Root sits on the ground midway between the feet. Planted feet are solved to y=0 in every QA pose. Depth is shown by foot height (far foot higher = further away) | `pivot-overlay.png`, `qa/qa-report.json` → `planted_on_ground` |
| Technical PNGs are valid transparent images, correctly named, checked at target scale | **PASS**. Binary alpha, unique colour per part and zone (every rendered pixel decodes back to its part: 0 unknown). Checked at 1×, 0.5× (game) and 3–5× zoom | `qa/poses-1x-native.png`, `qa/game-scale-0.5x.png` |
| Blender rig is editable, saved and reopened | **PASS**. Blender 5.2.3: `kai-south-rig-pilot.blend` has 26 packed textures with relative paths. After reopening, all 9 structure checks pass, re-renders are pixel-identical to the build renders, and a new edit pose matches the spec FK exactly | `qa/blender-verify.json`, `qa/blender-verify/` |
| `CODEX-ART-BRIEF.md` is a complete, measurable recipe | **PASS**. 26-part checklist with exact sizes, pivots, anchors and hidden-cap radii. An automatic checker is included (`scripts/check_part.py`; self-test passes, and a simulated painted set of all 26 parts passes) | `CODEX-ART-BRIEF.md` |
| Known defects are visible and marked | **PASS** (listed below; shown in magenta in the 3× sheet) | — |

## Measurements

- **Approved reference:** 87×160, crouched three-quarter stance. The front boot sole is at row 159 and the back boot sits about 13 px higher.
- **Rig neutral:** 160 visible rows (hair top y=−160, sole row y=−1), at the same 1:1 pixel scale.
- **Landmarks, rig vs reference (character px, ground = 0):**
  - match within 1–3 px: hair top −160/−160, collar tips −128/−129, chin −118/−119, shoulder top −115/−116, sash −88…−78 / −88…−80, crotch −62/−65
  - knee −36/−42 and boot top −25/−30 differ because the reference leg is crouched. Limb lengths were measured along the reference limbs instead.
- **Width:** about 55 px pad-to-pad.
- **Game scale:** the game shows about 80 px visible, so this source scale is 2:1. Templates are native source pixels. Nothing was resized.
- **Blender vs independent numpy FK renderer:** pivots agree to 0.00002 px. Silhouettes differ by at most 3 px in total per frame, from float ties at texel edges. Colours are exact.

## Iterations (geometry fixed first, then re-tested)

1. Sash-tail caps were not fully inside the knot. Enlarged the knot and moved the tail pivots.
2. Sleeves, shoulder pads and thighs were thinner than the reference. Widened them.
3. A 6 px hole at the crotch: tapered thigh tops did not meet at the centre line. Added a hidden thigh-top block.
4. A `legs_crossed` foot was planted on the wrong side. Fixed.
5. The idle bob sank the feet 1 px into the ground. Removed the bob.
6. A 1 px enclosed pocket at the ankle at ±34–45°. Widened the shin bottom (cap r 7) and the boot shaft (15 px).

## Known defects and limits (not hidden)

1. **Exterior seam-corner notches (cosmetic, WARN).** Isolated 1-px notches where a covering part's round end is 1 px wider than the part it meets (shoulder pad vs sleeve, forearm vs sleeve at the elbow, thigh vs shin). This happens in 10 debug or QA frames, 1–2 px each. They are not see-through gaps. The painter must keep an outline there. See `frames_with_joint_cracks`.
2. **Rotation aliasing (real art-pipeline issue).** Nearest-neighbour rotation of pixel parts at angles other than 90° creates 1-px stair notches inside single parts (101 px across all 38 frames, `rotation_alias_notches_px`). Final animation frames will need either a cleanup pass, rotsprite-style rotation, or rotation limited to clean angles. Not solved here.
3. **No toward-camera foreshortening.** All articulation is in-plane. SOUTH stepping and jabbing toward the camera are approximated by foot lift, knee flex and side extension. A convincing walk or jab toward the camera needs extra foreshortened part drawings, which are listed in the spec under `variant_slots.future_not_built`. They are not built or tested.
4. **Guide-only shapes.** Templates are simplified capsules and polygons sized to Kai's proportions. Faces, folds and trims are the painter's job. The neutral pose is an upright rigging pose, not Kai's approved fighting pose.
5. **Draw order is static.** It held for every tested SOUTH pose. A far arm reaching behind the body (not a SOUTH pose) would need a per-pose layer swap, which is not implemented.
6. **Head turn and blink/mouth swaps:** not supported.

## Untested

- Painted art: none exists yet.
- In-game Phaser playback.
- Any NORTH, EAST or WEST direction.
- Final export canvas and manifest.

## Blockers

- **Art blocker:** the 26 parts must be painted to the templates and pass `check_part.py`, then be visually approved by the user.
- **Blender blocker:** none. Blender lives outside the repo at `F:\Blender\blender-5.2.3-windows-x64\blender.exe` (override with `BLENDER`).

## Reproduce

`run_all.bat` runs: kit → Blender build → reopen/verify → QA → checker self-test. It needs Python with Pillow and numpy, plus Blender 5.2.

The v1.1 rigid-cutout toolkit (`F:\Blender2D-RigFirst-Pilot\reusable-rigid-cutout-pipeline-v1.1`, side-view only) was consulted for principles only: round caps centred on pivots, seams under costume edges, parent anchor = child pivot, ground contacts. No code was copied.

## Repository

- **git status before:** ` M .gitignore`, `?? art-exploration/`, `?? art/`
- **git status after:** identical. The only new files are under `art/characters/kai/base/rig-blueprint-south/`, which sits inside untracked `art/`.
- Nothing under `directions/`, `pilot-south-v2/`, `references/`, `rig/` or `art-exploration/` was modified.
- No commit, no push.

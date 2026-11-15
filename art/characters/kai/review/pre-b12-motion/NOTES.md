# Pre-B12 Kai motion + UI repair: review notes

Baseline for "before": git `c406b2a` (B11). "After": the working tree built with Blender 5.2.3 through the maintained pipelines (`build_dir.py`, SOUTH `rig/`, `form-i/scripts/build_form_i.py`), then `scripts/sync-kai-art.cjs`. Base and Form I, all four directions, were rebuilt.

## Source defects corrected (file-level)
| Problem | Cause (confirmed) | Fix |
|---|---|---|
| NORTH: fists "pasted" on the back, bright front-style knuckles | `base/production-other-directions-candidate/scripts/specs.py` drew both whole arms AFTER the torso; `danim.py` run() swapped to the front-facing `guard` fist and swung the forearm up-and-out (150 deg) over the back | Back-view order is now `band, arms, head, torso`: the jacket covers the shoulder joints and the arms sit behind it. Run: the arm swinging BACK hangs long beside the hip (back-of-fist wrap only, `side` slot, never `guard`); the arm swinging FORWARD is foreshortened and folds in/up behind the jacket, passing outside the hip. Idle: relaxed rear-view stance (near arm folded behind the jacket, far hand on hip). Added hip sway / counter-rotation. |
| SOUTH: fists crossing the sash/belly | `production-south-candidate/rig/anim.py` run(): IK targets sat 15-21 px from the centre line, i.e. inside the torso | Targets moved to 24-30 px (beside the torso edges), hip height back / chest height forward, elbows out. |
| WEST: head swallowed by the near shoulder, fist on the mouth | the guard arm of WEST is the NEAR arm and was drawn after the head; its sleeve and fist covered jaw/hair. (EAST's guard arm is the far arm, drawn behind the body.) | Profile order is now `... torso, neck, near sleeve + forearm, HEAD, near fists`; WEST guard fist is placed forward of the jaw (`danim.py`); WEST Run forearm raise capped (104 deg). Form I keeps its approved head-under-torso order (unchanged). EAST pose untouched. |
| Moving attack missing | `KaiAnimator` suppressed the punch while moving because the old upper-punch + run-legs PIXEL CROP showed a seam | New LAYERED rig clips (below). |

## Moving attack: how it works (no crop)
`drig.visible()` / `build_blend.py` got a per-frame `layer` property (1 = lower body: legs + hips; 2 = everything else). Two new clips per direction and form:
- `RunLower`: 8 frames, the Run legs/hips only.
- `RunPunchUpper`: 48 frames = 6 strike steps (BasicPunch keyframes tuck / load / launch / IMPACT / recover / guard) x 8 leg phases. Each block uses the SAME pelvis bob/sway as Run phase *i*, so torso and legs can never disagree.
The runtime (`kaiAnimation.ts` + `EntityRenderer.ts`) draws RunLower under the hero sprite and shows RunPunchUpper[step*8 + current leg phase]. The strike is predicted from the sim's `attackClock` / shot event (impact at step 3) and never changes damage, targets or cadence. Facing stays input-driven while running, so a target switching sides cannot flip the body. Hurt / dash / cast cancel it; stopping mid-strike finishes as the standing punch; starting to run mid-punch carries the progress over. The old crop constant was removed.

## Not changed / uncertain (needs owner eyes)
- NORTH idle is deliberately calmer (hands at the lower back / hip). If you want a more aggressive rear guard, the lead-arm numbers are in `danim.py stance_arms()`.
- Rear-view fists reuse the existing wrapped `fist_side` art (back of hand). No new rear-view hand art was generated; if it still looks too bright against the dark jacket a dedicated rear fist is the next step.
- From behind, the lead-hand jab goes AWAY from the camera, so NORTH shows it as a side-extended arm (same convention as the standing NORTH punch).
- WEST head still sits slightly lower than EAST's; the neck is mostly covered by the collar.
- Normal-speed feel of all clips is NOT verified by a human (frames were sampled from the live game; see `motion-after/`).

## Evidence in this folder
`north-idle-run-base|f1-{1x,3x}.png`, `south-run-*`, `west-vs-east-*`, `transform-f1-*` (before/after, one row each), `sheets/motion-*.png` (frames sampled from the live game with real W/A/S/D, run vs moving punch), `motion-after/motion.json` (animator clip per sampled frame), `before/` and `after/` (UI at 960x540 and 640x360: hero select, arena strip, arena select, HUD portraits, hit vignette).

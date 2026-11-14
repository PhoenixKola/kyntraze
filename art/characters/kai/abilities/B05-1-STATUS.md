# B05.1 - premium abilities polish, Form I presence, controller support: STATUS

Nothing committed or pushed. Owner approval of look, feel and sound is pending.

## P0 hand origin (root cause + fix)
- **Cause:** the sim and the renderer placed the beam/orb at a *fixed offset from the collision centre* (`p + dir*18, y-6`), unrelated to the sprite. Measured on the real rig: the fists were 23 (EAST) to 33 (SOUTH) world px above that point, and the SOUTH fists were 42 sprite px apart at fire.
- **Fix:** hands are posed by declared fist targets (`abilities/scripts/reach_helper.py`, two-bone IK that measures the real fist-art centroid). `hand_anchors.py` + `build_anchors.py` export per-frame fist anchors for **all 8 form x facing combinations** to `public/art/kai-anchors.json`, relative to the manifest ground origin (so the 0.5 scale and the crop never matter). `handAnchorWorld()` turns them into world px; the FX start at the anchor midpoint every frame. The sim lane starts at the release-frame / fire-hold anchor via a generated table (`src/content/handAnchors.ts`), so damage and visuals share one point.
- **Facing vs aim:** the sim picks the cardinal sprite facing (`faceOf`), the animator is forced to it, and the beam angle is clamped to +-30 deg of that axis (`clampToFace`). A target past the bound is not hit; the sprite never fires somewhere it is not facing.
- **Proof:** `review/b05-1/hand-anchor-overlay-*.png` (dots on the real exported pixels), `hand-to-beam-1x-live-8cases-plus-diagonal.png` (real game, 1x, 8 cases + a diagonal), `hand-muzzle-trace-960|640.json` (16 per-frame traces; hand anchor == FX origin on every frame). The traces prove the wiring; the stills prove the look.

## Visual fixes made after owner feedback (defect log)
1. Head sat behind the neck / empty V-collar visible: head offsets were pushed down/back/forward relative to the chest. The approved rig draws the head BEHIND the torso (collar over the neck stub), so the relation must stay as in Idle. Now head offset (0,0) in crouch frames and the approved punch's own lean (head +3,+2, spine -9) for fire/throw. Checked at 4-12x against Idle and the approved punch in all 4 directions (`head-neck-check-*.png`).
2. Detached / disjoint boots: my crouch widened an already wide stance (+-5..7 px) and dropped the hips 12-14 px. Removed the widening, hips <= 8 px (`legs-feet-check-all-4x.png`, 8 combinations).
3. NORTH fire pose put a forearm bar across the nape: fist target lowered to shoulder height.
4. Release-frame head "pop" and EAST/WEST overhead fists in the hair removed.
5. Form I beam was a cream slab: gold tints, narrow bright core inside a lane-width glow; sphere landing fill removed (muddy wash); energy pulse waves; FX hit-pause (FX/particles only, never the sim).
6. Pre-existing layout bug found: the app container was taller than the viewport (560 / 430 px min-height), so the bottom HUD row was clipped; fixed for the game shell. Cooldown tiles reflowed at 640x360 (`hud-640x360-before-after.png`).

## Form I persistent presentation (new)
Active only while the Form I art is visible (after the transformation commit; the cinematic window keeps its own FX): flame wisps rising at the feet (idle, trailing while running), a faint upright body halo that breathes, glints, and an occasional tiny arc (`formFx.ts`). Heavier while charging / firing / throwing / dashing; thinned out automatically with more than 45 enemies; reduced-effects keeps only a minimal wisp layer. 60.5 fps with 80 enemies, same as Base. `form-i-persistent-presentation-2x.png`.

## Audio (original, synthesised, NOT HEARD)
`audio/synth_b05.py` (numpy only, deterministic): 15 layered sounds (swept-filter noise, detuned saw/sine pads with pitch envelopes, sub body, crackle, saturation, synthetic reverb; Solar variants add a shimmer layer), 44.1 kHz mono 16-bit in `public/audio/kai-abilities/`. `loudness.json`: peaks -10..-1 dBFS, 0 clipped samples. Engine `src/game/audio/abilityAudio.ts`: unlock on the first key/pointer gesture, lazy decode, voice slots (no stacking, pulses capped at 2), driven by sim events; cancel, mute, dispose and death stop voices; pause suspends the context; retry restarts event ids; the existing `mute` setting is honoured (no new save fields). Checked: all 15 decode and 104 sounds start in headless Chromium, 0 errors. **I cannot listen: AUDIO QUALITY UNVERIFIED.** `audio-waveforms-spectrograms.png` shows structure only.

## Controller support (mocked pad only)
Standard-mapped pads (non-standard: best effort, same indices). Left stick (deadzone 0.2, rescaled, snapped to 8 directions) or D-pad move | **A** dash | **X** Q impact | **Y** F form | **RB or RT** E beam | **LB or LT** R sphere | **START** pause / resume. Menus: D-pad or stick + **A** confirm, **B** back / resume, **START** confirms on title, hero select and results; right stick reserved. One merged input path (`InputController.read`, once per sim tick, edge-triggered): a press cannot fire twice and the keyboard always wins when used. A screen only accepts input after every button was released once (the press that opened it cannot select on it); a controller lost mid-run auto-pauses; reconnect resumes. Badge top-right, full mapping table in Settings, one-liner in the pause menu. Files: `gamepadMap.ts`, `InputController.ts`, `useControllerNav.ts`, `ControllerBadge.tsx`.

## Validation actually run
`npm run typecheck` PASS; `npm test` 123/123 (new: hands/anchors/muzzle/diagonals/sphere trajectory 16, audio 8, gamepad 16, ability animation 12); `npm run build` PASS; `npm run test:e2e` 10/10 (new: HUD responsive x2, controller x3 incl. the whole game controller-only at 960x540 and 640x360). Blender: all rigs re-saved and re-opened, all CHECKS true; previously approved sheets byte-identical (git shows no modified PNG). Live Phaser (headless Chromium, real keyboard, 960x540 and 640x360): both abilities x 4 facings x 2 forms, a diagonal case, dash cancel, pause mid-charge, hit before release, death -> results -> retry; 0 console errors; 60.5 fps with 90 enemies.

## Gates
| Gate | Status |
|---|---|
| TECHNICAL | PASS |
| FUNCTIONAL | PASS for what was exercised above |
| VISUAL STILL | PASS with the known defects below (the owner found defects on several passes: please re-inspect) |
| MOTION WATCHED | **NO** - I can only view stills; the MP4s are local and untracked for the owner |
| AUDIO PLAYBACK | PARTIAL - decode and start verified headless, nothing heard |
| AUDIO QUALITY | **UNVERIFIED** |
| CONTROLLER HARDWARE | **NOT TESTED** (mocked `navigator.getGamepads` only) |
| OWNER APPROVAL | pending |

## Known defects / limits
NORTH beam and throw still read as arms across the upper back (the rig draws fists over the torso; there is no front-of-body layering). EAST/WEST overhead hold is a bent arm, not a straight raise. Form I hair touches the canvas top in stance frames (inherited from B04) and Form I EAST fire frame 10 has 0 px top margin. No new arm art was generated (the existing parts were enough). The beam angle on diagonals differs by up to 30 deg from the 4-way sprite. The hit-pause is FX-only by design. The Settings modal scrolls at 640x360.

## Evidence (`art/characters/kai/abilities/review/b05-1/`)
`hand-to-beam-1x-live-8cases-plus-diagonal.png`, `hand-anchor-overlay-{base,f1}-{beam,sphere}.png`, `head-neck-check-{base,f1}-4x.png`, `legs-feet-check-all-4x.png`, `sphere-gather-throw-burst-1x-live.png`, `beam-charge-fire-1x-live.png`, `form-i-persistent-presentation-2x.png`, `hud-640x360-before-after.png`, `audio-waveforms-spectrograms.png`; MP4s `gameplay-960x540-both-abilities.mp4`, `gameplay-640x360-both-abilities.mp4` (git-ignored).

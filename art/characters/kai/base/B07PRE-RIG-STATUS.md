# B07-pre rig fixes (owner defects): STATUS
Not committed. Stills only: **no motion watched, no audio, mocked/no controller, SwiftShader GL.**

## Fixed
1. **RUN north (legs)**: cause = the back-view run reused the *fighting-stance* feet (about +-30 px apart) as its base, so every frame was a wide A-stance. Now feet sit +-11 px under the hips (`danim.py BACK_LEG`, new `RX +- 11` base), clear stride (planted foot reaches forward = higher on screen, push-off foot lower/nearer, swing foot lifted and foreshortened), arms hang close and pump alternately instead of flaring. Base and Form I (shared script). Proof: `b07pre-evidence/run-north-{base,f1}-before-after-2x.png`.
2. **RUN south (hands)**: cause = forearm angles lerped through ~200 deg across the torso (fists crossed the chest, snapped). Fists are now placed by reach-helper IK targets on a short near-vertical path (hip <-> chest), elbows out (`anim.py run()`). East/west run arms checked: fine, untouched. Proof: `run-south-*-before-after-2x.png`.
3. **Neck / head connection**: cause = B05.2 put the base head in front of the torso but the head part only has a ~5 px stub, so the jaw floated over the collar. New skin `neck` part (`base/neck_parts.py`, approved skin palette, rounded bottom shaded into the collar) bound to the head bone, drawn between torso and head for base SOUTH/EAST/WEST (`specs.py`, `rig.py`, `make_config.py`). NORTH keeps head-under-collar-fold (back view). **Form I unchanged by design** (its head stays behind the collar, owner-approved). Proof: `idle-head-neck-{base,f1}-before-after-4x.png` (frames 0 and 8, rows = south/east/west/north, before then after).

## Not changed / open
- "Front arm looks outside the body": the near upper arm/elbow flare is the approved guard pose in Idle; I did not move it. If it still bothers the owner, tighten `stance_arms()` / south `ARM_REST` by a few degrees (needs owner call, changes approved Idle).
- Form I SOUTH has no neck piece (head_f1 pivot differs); it looked connected in stills but was not inspected as hard as base.
- Base north frame_height went 163 -> 160 (origin_px unchanged 80,157; sheets re-cropped).
- Legs/upper-body split in EntityRenderer (KAI_SPLIT_ABOVE_FEET=64) not touched: with the new narrow north run legs under a wide-stance punch upper body, check an auto-attack while walking up. Run fps scaling (10..18, 14*speed/250) looks fine.

## Validation
Rebuilt with Blender 5.2.3: base east/west/north/south and Form I all four; every CHECKS line printed all true, 0 "false". Re-synced (`scripts/sync-kai-art.cjs`). typecheck PASS, vitest 127/127. Live: 3 Playwright screenshot rows with real W / S keys (`live-960x540-run-w-s-3x.png`, script `live_run_shots.cjs`), 0 console errors. Hand anchors not regenerated: Beam/Sphere poses unchanged (only neck added, fists untouched).

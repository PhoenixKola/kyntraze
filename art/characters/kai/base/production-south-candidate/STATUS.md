# Kai SOUTH production candidate (2026-11-13)

**Owner approval required.** I judged still frames at 1x, 4x and game scale. I could not watch the MP4s in real time, so motion appeal is **UNVERIFIED**.

## What changed from the rejected v5

| Problem | Fix |
|---|---|
| Fists small and round, awkward waist hand | New wrapped fists from ImageGen with separated knuckles: raised guard fist, side waist fist, front-on punch fist, angled punch fist. They are swapped per frame and follow the forearm direction |
| No mouth | Head regenerated at the reference's pixel size (brow, eyes and hair clusters match). Its mouth survived sampling only faintly, so a 4 px mouth was strengthened by hand (`tools/pixel_fixes.py`, logged in `parts/CORRECTIONS.md`) |
| Rounded seat / crotch bulge, thigh overlaps | Pelvis split into a flat-topped hip block with a crotch V (behind the thighs) and a separate sash band in front; the trouser hem sits over the boot, as in the reference |
| Tube sleeves, lost shoulder accent | Puffy sleeves. The gold epaulette is on the near sleeve only (asymmetric, as approved) and moves with the arm |
| Detached forearm, background slivers | The cuff now belongs to the forearm piece (it turns with the forearm and the skin emerges from it); the sleeve ends in a rounded elbow. Small dark lining pieces behind the arms and waist close seams (they sit behind, not on top); the arm linings switch off when a hand leaves its guard position, so they never show as smudges |

## Evidence (re-run by `run_all.bat`)

- The Blender file was reopened in a fresh process: 17 bones, parts bound to the spec'd bones, packed textures identical to `parts/`, 3 Actions, drivers present. Blender posed pivots match the independent numpy FK to 0.0003 px, and Blender renders match it to within 11 px per frame (float ties at texel edges).
- Every sprite frame is 118x167 with a shared origin (48,155) = the ground point between the soles, binary alpha. Planted soles are within 0.5 px of target (Idle and BasicPunch 0.0 px). Idle and Run loop seams are within the normal frame-to-frame change.
- Thin (3 px or narrower) enclosed gaps across all 38 frames: Idle max 1 px (3 frames), Run max 3 px (4 frames), BasicPunch max 2 px (3 frames). Larger enclosed areas appear only where an arm is chambered away from the torso (an open window with proper outlines). Stress poses: neutral, deep crouch, high knee and wide split have no gaps; cross-body 2 px; the extreme arms-overhead pose (used by no clip) opens a 41 px gap beside the neck.
- The approved references and the blueprint .blend were not modified (SHA-256 checked by `post.py`).

## Clips (`sheets/manifest.json`)

Idle 16 frames at 10 fps, loop. Run 8 frames at 14 fps, loop, in place. BasicPunch 14 frames at 16 fps, impact on 0-based frame 5. Phaser owns movement, hitboxes and damage; events are frame indices only. The game renders Kai at about 0.5x of this source scale (`review/game-scale-preview.png`).

## Honest limits

- Parts are reconstructed from ImageGen sheets: palette-mapped to the approved reference palette, one sample per detected pixel-grid cell (the arm pieces at a larger cell size to reach the right native size). This is not hand-refined native pixel art, apart from the mouth.
- The pelvis, legs and face are simpler than the reference, and the near boot is slightly larger than the reference boot.
- A straight punch toward the camera is approximated by the knuckle-forward fist, the shoulder twist and a lunge. A hand-drawn foreshortened forearm would still improve it.
- Run is in place; some foot slide against the world at 250 px/s is unavoidable in this view.
- Phaser integration is NOT TESTED. This is SOUTH only; nothing here says NORTH, EAST or WEST are ready.

## Owner decisions

1. Open `review/comparison-1x-actual-size.png` and the three MP4s (`review/*.mp4`, local only; regenerate with `run_all.bat`). Is this Kai approved?
2. Approve the SOUTH motion, or request tuning (all timing and amplitudes are in `rig/anim.py`).
3. Only then: other directions or Phaser integration.

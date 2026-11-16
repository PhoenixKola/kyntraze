# Ren B21.1 motion pass (base + Crimson Ascendant, 4 directions)
Originals: `rig/anim.py.b21.bak`, `rig/anim_b03g.py.b21.bak`, `rig_dirs/danim.py.b21.bak`, `rig_dirs/danim_b03g.py.b21.bak`. Old shipped sheets are in git history (before this change).

## Changed (frame counts, fps, loop flags, events and all attack/cast/dash/Beam/Sphere/Transform clips untouched)
- **Idle (16f):** side-to-side weight shift (loaded hip sinks, hips never rise so the planted feet stay planted), slow chest breath, head/torso/fists that lag the shift, wider sash sway.
- **Hurt (8f):** no hop; feet stay planted and are dragged along the push (7-13 px), torso whips first (spine -16 -> -20 deg, head -26 deg peak), then hunches. Profile and back views equivalent (profile: spine 24 deg, head 26 deg). Death's first two keys share these poses.
- **Run (8f):** centre of mass ~1 px lower (HIP_DY), stronger shoulder-led counter-swing (SOUTH spine 3 -> 4.5 deg, profile 2 -> 3.2) with head counter-rotation. Leg tables and foot-contact frames unchanged. RunLower and RunPunchUpper are generated from the same Run cycle, so leg phase still matches (RunLower/RunPunchUpper crop origins moved by 1 px with the lower hips; frame counts unchanged).
- Not changed: Death body collapse (weight untouched beyond the shared hit keys), Dash.

## Rebuild
`cd art/characters/ren; export KAI_PAD_TOP=28; bash scripts/build_all.sh south north east west; bash scripts/build_f1.sh south north east west` (Blender `F:\Blender\blender-5.2.3-windows-x64`), then copy `<dir>/sheets/ren_<dir>_*.png` + `sheets/manifest.json` -> `public/art/ren/<dir>/` (`f1/<dir>/sheets` -> `public/art/ren-f1/<dir>/`), `python scripts/build_ren_anchors.py base f1` (anchors came out identical). Compare: `python scripts/b21_compare.py <oldRenDir> <newRenDir> <dir> out.png 3`.

## Honest notes
Differences are deliberate but modest (pixel-snapped 1-2 px moves); judged on contact sheets only, not at real speed. Enclosed-hole/thin-gap numbers for Transform are the same class as before (Transform unchanged).

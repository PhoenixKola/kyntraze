# Kai B21.1 motion pass (Base, Flarebound f1, Cometheart f2, Stillfire f3; 4 directions each)

All forms are built by the SAME scripts (`base/production-south-candidate/rig/anim*.py`, `base/production-other-directions-candidate/scripts/danim*.py`). Originals: `*.b21.bak` next to each edited file (anim.py, anim_b03g.py, danim.py, danim_b03g.py, form-i/ii/iii `build_*.py`); the old shipped sheets are in git history.

## What changed
- **Idle (16f):** side-to-side weight shift (loaded hip sinks, hips never rise so planted feet stay planted), slow chest breath, head and fists lagging the torso, swaying sash. Per form (`KAI_MOTION` env, set by the form build scripts; default `base`):
  - base: grounded, 0.85x amplitude. flare: springier (extra hip bounce on the beat, 1.3x arm sway, 1.4x sash). comet: coiled (0.6x sway, constant forward spine tension with a small tremor, hips 1 px lower, 1.2x sash). still: calm (0.5x sway, deeper breath, slow delayed sash/garment drift via an extra phase lag); Stillfire's hover/feet contract is untouched because hover3 lifts the finished poses.
- **Hurt (8f):** Ren's pass applied: no hop, planted feet dragged along the push, torso whips first, then hunches. Same poses for all forms (Death shares its first keys, so Death's crop changed too; its collapse is not otherwise edited).
- **Run (8f):** stronger shoulder-led counter-swing with head counter-rotation (base 3.9 deg, flare x1.1, comet x1.3; profile 2.8 deg x style); Cometheart runs ~1 px lower. **RunLower is pixel-identical in base and Flarebound** (legs unchanged); Cometheart's RunLower and RunPunchUpper were regenerated together from the same cycle. Stillfire's Run is the hover3 glide: it only picks up the new upper-body idle poses.

## Contract
Frame counts, fps, loop flags, event tables, clip sets, `kai-anchors.json`, Dash/Beam/Sphere/BasicPunch/Transform pixels (except Stillfire Transform/IdleSpecial, which are derived from the Idle pose by hover3 and changed by a few thousand px) are unchanged. Per-clip crop sizes and origins moved by 1-6 px where the body moved; manifests carry them (anchors are origin-relative so they stay valid). Form II manifests keep `"form": "form-ii"` (the build script writes `form-i`; patched after the build, like before).

## Rebuild
Base south: `cd base/production-south-candidate/rig; KAI_MOTION=base python -c "import anim; anim.export('anim-data.json')"; blender -b --python build_blend.py; python post.py hashes W; python post.py prep W; blender -b kai-south.blend --python export_blend.py -- W; python post.py final W` (outputs in `../sheets`). Base east/west/north: `cd base/production-other-directions-candidate; KAI_MOTION=base python scripts/build_dir.py <dir> W`. Forms: `python form-i/scripts/build_form_i.py all W` (likewise form-ii, form-iii), then copy `<dir>/sheets/*.png` + `manifest.json` to `public/art/<kai|kai-f1|kai-f2|kai-f3>/<dir>/` (png into `sheets/`). Blender `F:\Blender\blender-5.2.3-windows-x64\blender.exe`. Compare: `python art/characters/kai/b21_compare.py <oldDir> <newDir> <dir> out.png 2`.

## Evidence / honesty
`art/review/b21/kai-{base,f1,f2,f3}-{south,east,west,north}-before-after.png` (Idle, Hurt, Run, old row above new row). Judged on those sheets and in-game stills only, not at real speed; the changes are deliberate but modest (pixel-snapped 1-2 px moves). Kai Death weight, Dash, Transform and all attacks were not authored.

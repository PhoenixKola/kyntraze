# Sora B21 motion pass

## Changed: Idle only (base + Azure Sovereign, SOUTH/NORTH/EAST/WEST)
Same 16 frames @ 10 fps, loop, frame size, origin, events, manifest and anchors (verified field by field before publishing; Idle has no hand anchors). New choreography: slow breath (chest rises, pelvis settles on the exhale), weight shift foot to foot with a head counter-sway (`head_rot`) and a tiny spine lean, the open caster hand floats (+6 deg forearm), the sash trails the motion. Sovereign (`KAI_FORM=f1`) adds a slower, floatier settle: 1.35x head sway, 1.2x spine, longer sash; feet stay on the ground line (edge/ground check: 0 top/left edge pixels, same origin).
Edits: `south/rig/anim.py` `idle()`, `dirs/scripts/danim.py` `idle()` (originals `*.b21.bak`). Evidence: `art/review/b21/sora-motion-before-after.png` (row 1 old, rows 2-3 new frames 4 and 12), `sora-idle-south-cmp.png`.

## Not changed (kept old on purpose)
- **Hurt**: already a fully authored 8-frame recoil (hit, peak, stagger, hunch, recover); no change judged clearly better.
- Dash, Death, Beam, Sphere, BasicPunch, Transform: untouched; shipped files are the pre-existing ones (a rebuild shows 1-4 px of build noise, so only Idle sheets were published).

## Rebuild
Base: `bash tools/build_base.sh` (south via `south/rig`, then `dirs/scripts/build_dir.py north|east|west`). Sovereign: `python tools/build_f1.py all`. Both write to the art folders (`south/sheets`, `dirs/<d>/sheets`, `south-f1/sheets`, `dirs-f1/<d>/sheets`); only `sora_<dir>_idle.png` was copied to `public/art/sora/<dir>/sheets/` and `public/art/sora-f1/<dir>/sheets/`. Originals of the shipped sheets: `art/review/b21/sora-bak/`. Blender: `F:\Blender\blender-5.2.3-windows-x64\blender.exe`, ~2.5 min per direction.
## Not verified
Seen as stills at 2-3x only; not watched at normal speed or in game.

## Run set (second pass): Run + RunLower + RunPunchUpper, base + Sovereign, SOUTH/NORTH/EAST/WEST
Edited `run()` only in `south/rig/anim.py` and `dirs/scripts/danim.py` (RunLower and RunPunchUpper are derived from it, so leg phase and the sim-tied punch frames are unchanged; originals `*.b21run.bak`). Foot tables (`LEG`, `PROFILE_LEG`, `BACK_LEG`) untouched, so planted/swing phases and the foot_contact events (0 and 4) are identical. Changes: centre of mass 1 px lower; hips counter-rotate (`pelvis_rot` -2 deg * cos) against a stronger shoulder swing (`spine_rot` 4.2 / 3.4 vs 3 / 2); head counter-rotation (`head_rot`); profile directions lean ~1.2 deg more forward; longer sash. Sovereign: half the foot-strike bob (glide) and a longer sash; soles stay on the contract ground line.
Verified before publishing (all 8 sets): frames, fps, loop, events, file identical to shipped; no pixel on the top/left canvas edge; only per-clip crop size / origin moved by 1-2 px for RunLower and RunPunchUpper (merged into the shipped manifests clip by clip; every other clip entry untouched; `sora-anchors.json` has no Run entries, unchanged). Only the three Run sheets per set were copied to `public/art/sora*/`; other clips were not republished.
Honest size of the change: **subtle** (about 1 px of height and a few degrees of twist/lean). SOUTH is nearly indistinguishable from before; EAST/WEST read as slightly lower and more forward. Evidence: `art/review/b21/sora-run-south-cmp.png`, `sora-run-east-cmp.png` (row 1 old, row 2 new, 3x). Seen as stills and in-game captures only, not at real speed.
Dash was not changed (no safe weight gain without touching contact timing).

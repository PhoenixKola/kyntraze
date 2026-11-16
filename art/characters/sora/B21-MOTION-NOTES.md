# Sora B21 motion pass

## Changed: Idle only (base + Azure Sovereign, SOUTH/NORTH/EAST/WEST)
Same 16 frames @ 10 fps, loop, frame size, origin, events, manifest and anchors (verified field by field before publishing; Idle has no hand anchors). New choreography: slow breath (chest rises, pelvis settles on the exhale), weight shift foot to foot with a head counter-sway (`head_rot`) and a tiny spine lean, the open caster hand floats (+6 deg forearm), the sash trails the motion. Sovereign (`KAI_FORM=f1`) adds a slower, floatier settle: 1.35x head sway, 1.2x spine, longer sash; feet stay on the ground line (edge/ground check: 0 top/left edge pixels, same origin).
Edits: `south/rig/anim.py` `idle()`, `dirs/scripts/danim.py` `idle()` (originals `*.b21.bak`). Evidence: `art/review/b21/sora-motion-before-after.png` (row 1 old, rows 2-3 new frames 4 and 12), `sora-idle-south-cmp.png`.

## Not changed (kept old on purpose)
- **Hurt**: already a fully authored 8-frame recoil (hit, peak, stagger, hunch, recover); no change judged clearly better.
- **Run / RunLower / RunPunchUpper**: untouched, so the leg-phase relationship and the sim-tied punch frames are exactly as shipped. A better run needs all three regenerated from one cycle in all four directions plus a moving-attack review; not done.
- Dash, Death, Beam, Sphere, BasicPunch, Transform: untouched; shipped files are the pre-existing ones (a rebuild shows 1-4 px of build noise, so only Idle sheets were published).

## Rebuild
Base: `bash tools/build_base.sh` (south via `south/rig`, then `dirs/scripts/build_dir.py north|east|west`). Sovereign: `python tools/build_f1.py all`. Both write to the art folders (`south/sheets`, `dirs/<d>/sheets`, `south-f1/sheets`, `dirs-f1/<d>/sheets`); only `sora_<dir>_idle.png` was copied to `public/art/sora/<dir>/sheets/` and `public/art/sora-f1/<dir>/sheets/`. Originals of the shipped sheets: `art/review/b21/sora-bak/`. Blender: `F:\Blender\blender-5.2.3-windows-x64\blender.exe`, ~2.5 min per direction.
## Not verified
Seen as stills at 2-3x only; not watched at normal speed or in game.

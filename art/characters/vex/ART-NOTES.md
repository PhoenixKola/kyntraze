# REN - art identity (B19 art stream, ImageGen via scripts/gen-image.py)

Bridge: Codex ImageGen, `CODEX_BIN` = the app's `codex.exe` (`OpenAI.Codex_26.1111.2228.0.../app/resources/codex.exe`; `~/.codex/.sandbox-bin/codex.exe` fails with a rate-limit/sign-in error). Provenance logs: each folder's `PROVENANCE.md`.

## Accepted (pixel art, same language as Kai)
| File | What |
|---|---|
| `concept/ren-px-base.png` | Base turnaround: SOUTH 3/4 fighting stance, EAST (facing right), NORTH back. Magenta key. |
| `concept/ren-px-asc.png` | Crimson Ascendant turnaround (same layout/scale/pose; only hair, eyes, hem lining, gauntlet glow change). |
| `parts/ren-px-parts-base.png`, `parts/ren-px-parts-asc.png` | SOUTH rigid parts: head+hair, torso, hips, upper arm, forearm+gauntlet, fist, thigh, shin, boot, coat hem. Straight limbs, round joint caps. |
| `portrait/ren-px-bust-base.png`, `portrait/ren-px-bust-asc.png` | 1254x1254 pixel busts (Kai-portrait framing). Downscale to 128 (nearest) for HUD. |
| `icons/ren-icons.png` | 3x2 medallions (B18 icon language): Auto Ironclad Hooks, Q Crimson Break, E Meteor Rush, R Bloodstar Impact, F Crimson Ascendant crest, Ren crest. Magenta key. |
| `fx/ren-fx.png` | 12 additive VFX on black: aura wisps x2, embers, afterimage streak, speed streak, ground ring (3/4 ellipse), ground crack, impact burst, fist orb, supernova ring, dust puff, light pillar. |
| `compare-ren-vs-kai.png` | Kai SOUTH idle vs Ren SOUTH at identical height (158 px), 4x. |

Style/proportion references (kept, small): `concept/kai-style-ref-6x.png`, `concept/kai-portrait-ref-5x.png`. Always pass `kai-style-ref-6x.png` via `--img` for style, and the matching Ren turnaround for identity.

## Proportions (owner correction)
Kai idle bbox: 158 px tall (south), 82 px wide. Ren is generated to the same figure height in frame (725 px source south figure, Ascendant 735 incl. taller spikes) and measures ~10% wider than Kai in `compare-ren-vs-kai.png` (87 px vs 82 at 158 tall; shoulders/gauntlets carry the width). Head+hair ~26-28% of height for both (~4 heads). Body style: 3/4 fighting stance, big head, baggy cuffed trousers, short chunky boots, big fists.

## Process / rejected
- First pass (realistic painted 7-head turnarounds, painted busts, painted parts) was rejected by the owner as not matching Kai's pixel art; `v2` (smooth pixel, neutral pose) rejected as too fine/standing pose. All deleted. The realistic probe survives only as costume reference in the prompt wording.
- Icons and VFX stayed painted/additive on purpose (match B18 medallions and existing additive FX).

## Weak areas / to do for the rig
- Parts exist for SOUTH only. EAST/WEST and NORTH parts sheets still needed (generate with the matching turnaround view as identity).
- The parts' pixel block is larger than the turnaround's: scale to Kai's 160 px figure by nearest-neighbour before extraction (`extract_*` scripts quantize to a palette; Ren needs its own palette.json: dark brown-black hair/black coat/crimson trim/skin; Ascendant adds crimson hair ramp, hot red-white eye, red glow lines).
- Ascendant glow seams/eye glow are baked pixels; the in-game aura is separate FX.
- Ren's head/face is slightly softer than Kai's at 1x; check after downscale.
- VFX and icon sheets are 16:9 sheets on key colours and still need slicing/keying scripts.

---
# PHASE B - rigged sprite sets (status at end of this stream)

## Done: SOUTH base, all 10 clips, via the proven Kai rig (parts swapped, no new animation code)
- `rig/` = self-contained copy of Kai's SOUTH rig scripts (rig, anim*, post, build_blend, export_blend). Differences from Kai: `V5`/`RIG_DIR` point at `ren/south`, output names `ren_south_*` / `ren-south.blend`, `reach_helper.py` read from `kai/abilities/scripts`, and `rig.py` applies `south/parts/fit.json` (Ren pivots/child anchors). Kai files and outputs are untouched (`git status` for `art/characters/kai` and `public/art/kai*` is clean).
- Parts: `scripts/extract_south.py` (Kai's extractor functions, Ren palette `palette.json`, auto grid; torso/arms/head sampled on a coarser cell because ImageGen drew them ~25 % too big) -> `south/parts-raw/`; `rig/ren_fit.py` -> `south/parts/` (+ Kai linings/neck palette-mapped to Ren) and `fit.json` (anchor rule: keep distance to the nearest image edge, else offset from centre). Sources: `south/source/ren-s{1,2,3,5,6}.png` + prompts (+ Kai layout sheets `kai-s*.png`).
- Rebuild: `cd rig; python ren_fit.py; python -c "import anim; anim.export('../south/rig/anim-data.json')"; blender -b --python build_blend.py; python post.py hashes W; python post.py prep W; blender -b ../south/rig/ren-south.blend --python export_blend.py -- W; python post.py final W` (W = a temp work dir; Blender `F:\Blender\blender-5.2.3-windows-x64\blender.exe`). Blender checks all pass.
- Output: `public/art/ren/south/manifest.json` + `sheets/ren_south_{idle,run,basicpunch,runlower,runpunchupper,dash,hurt,death,beam,sphere}.png` (160x170 frame, origin 58,158, same contract as Kai). Review: `review/contact-sheet-3x.png`, `review/stress-poses-3x.png`, mp4s in `south/review/`.

## UI/FX slices (game-ready, `scripts/slice_ui.py`)
`public/ui/icons/ren_{auto,q,e,r,f}.png` (white 64x64 glyphs from `icons/ren-glyphs.png`, same convention as Kai's), `public/ui/heroes/ren-portrait-{base,f1}.webp` (128), `ren-crest-{base,form}.webp` (100x97), `ren-card.webp` (760x1013 from `card/ren-card.png`), `public/art/fx/ren/*.png` (12 additive sprites). The medallion sheet `icons/ren-icons.png` is kept as alternate art.

## Honest defects of the SOUTH set
- First automatic pass, not owner-reviewed. Bare muscular upper arms read as big blobs in the Run/walk swing and the shoulder stumps of the torso show past them; the neck piece (Kai's, remapped) is a slightly lighter patch under the jaw.
- Beam and Sphere clips are Kai's poses (two-fist beam, fist-to-fist sphere). They still need Ren's Meteor Rush strike (crouch, forward shoulder/fist strike) and Bloodstar Impact (crouch, leap, slam) poses.
- Enclosed-hole counts in Run/Dash are higher than Kai's (up to ~300 px in Dash/Beam/Sphere frames at the arms) - check for seams at 1x.
- Motion was judged from contact sheets only.

## NOT done (precisely)
1. NORTH / EAST / WEST base: need per-direction parts sheets (true rear; profile with head drawn above the jacket) generated against the Kai other-direction parts, then `production-other-directions-candidate/scripts` copied into `ren/rig/` and parametrized the same way (their geometry comes from `make_config.py`/`specs.py`).
2. Crimson Ascendant ('f1' slot machinery): spiky red head/hair per direction, glow accents, Transform clip (hair change at form_commit). Only the SOUTH art references exist (`concept/ren-px-asc.png`, `parts/ren-px-parts-asc.png`).
3. `public/art/ren-anchors.json` (n/f/m per frame for Beam/Sphere/BasicPunch; adapt `kai/abilities/scripts/build_anchors.py`) and `public/art/ren-f1/`.
4. Ren-specific Meteor Rush / Bloodstar poses and the moving-punch review.

---
# ROUND 2 - NORTH / EAST / WEST base (done, first automatic pass)
- Per direction: 4 ImageGen parts sheets (`<dir>/source/ren-s{1..4}.png` + prompts from `scripts/make_prompts_dirs.py`; attachments: Ren turnaround, Ren SOUTH parts sheet, Kai's equivalent sheet for layout/scale) -> `scripts/extract_dirs.py` (Ren palette; pieces sampled on a coarser cell when larger than Kai's part x1.08; profile neck = Kai's remapped) -> `<dir>/parts/`.
- Rig: `rig_dirs/` = copy of Kai's other-directions scripts (geometry derived from part masks by `make_config.py`; only output names, the reach-helper path and Kai-reference path changed). Rebuild one direction: `python rig_dirs/build_dir.py north <workdir>` (Blender `F:\Blender\blender-5.2.3-windows-x64`). Blender checks pass for all three.
- Output: `public/art/ren/{north,east,west}/manifest.json` + `sheets/ren_<dir>_<clip>.png` (all 10 clips, same contract as Kai). Review: `review/<dir>-ren-vs-kai.png` (Ren on top: Idle/Run/BasicPunch/Dash/Hurt/Death/Beam/Sphere, Kai below at the same scale), `<dir>-contact-sheet-3x.png`, `<dir>-stress-poses-3x.png`.
- NORTH is a genuine back view (back of head, back of the vest with crimson inlay, rear gauntlets/gloves, rear boots). EAST/WEST are profile with the head drawn above the jacket (default, non-HEAD_BEHIND, order from Kai's owner fix).

## Defects (honest)
- Motion judged from contact sheets only. Beam/Sphere are still Kai's poses (not Meteor Rush / Bloodstar Impact).
- NORTH: the generated back torso includes a red sash bow at its hem, which doubles the separate sash band/tails; legs read very red because of the thigh stripes; bare arms are blobby in swings.
- WEST: head is hair-heavy and the face is small/dark; the scar was drawn as a large red X.
- Some enclosed-hole pixels remain in Dash/Beam/Sphere/Death frames (<=120 px, mostly at arm/torso overlaps).
- SOUTH defects (blobby arms, shoulder stumps) were NOT revisited this round.

---
# ROUND 3 - Meteor Rush / Bloodstar poses, anchors, Ascendant (f1), fixes
- **Beam = Meteor Rush** (`rig/anim_b05.py`, `rig_dirs/danim_b05.py`; Kai's scripts untouched): frames 0-9 deep crouch/coil with tremor, `release` 10 = explosive forward strike (lead fist fully extended along the facing, other fist cocked; SOUTH = fist toward the camera, NORTH = away), 15-19 chained second strike with the other fist, recover 20-25. Events as Kai (`charge_start 0, charge_hold 7, release 10, fire_end 20, recover_start 20, interruptible_from 22`).
- **Sphere = Bloodstar Impact**: 0-6 crouch, 7 launch, 8-12 airborne apex (feet lifted ~22 px, both fists overhead), 13-15 descent, `release` 16 = slam landing (deep squat, lead fist driven to the ground, other arm back), recover 17-23. Events as Kai (`gather_start 0, raise 7, hold 12, release 16, recover_start 18, interruptible_from 21`). All builds use `KAI_PAD_TOP=28` (headroom for the leap); the clips carry their own taller frames.
- **Anchors**: `public/art/ren-anchors.json` (`forms.base` + `forms.f1`, 4 facings x BasicPunch(14)/Beam(26)/Sphere(24), `{n,f,m}` in sprite px relative to the manifest ground origin, y down). `m` is the midpoint of both fists: for the Meteor Rush strike use the extended fist (the lead one: the fist furthest along the facing, like `PUNCH_FIST`), for the Bloodstar slam use the LOWER fist (largest y) at frame 16. Rebuild: `python scripts/build_ren_anchors.py base f1`.
- **Ascendant (f1)**: `f1/source/<dir>-heads.png` (ImageGen: crimson spiked head + rear hair per direction, glowing eyes) -> `scripts/prepare_f1.py` (Ascendant palette `f1/palette.json`; base parts copied, `head_f1`/`hair_f1` added, `form_geometry.json` for south) -> `scripts/build_f1.sh` (Kai's f1 slot machinery: base head under `form:base`, new head + hair bone under `form:f1`). 11 clips per direction incl. **Transform** (16 f @ 20, events identical to Kai's Form I: `anticipation_start 0, gather_start 2, release_start 6, form_commit 7, reveal_hold 8, interruptible_from 10`; Kai's Form I Transform is 16 frames too). Output `public/art/ren-f1/<dir>/`. Review: `review/<dir>-ascendant.png` (Transform, Idle, Run, BasicPunch, Beam, Sphere).
- **Fixes**: NORTH red bow removed from the back torso (88 px cleared, bounding box kept); WEST head regenerated (clear face, thin scar instead of the red X).

## Honest defects / not done
- Ascendant body = base body: no separate torso/coat/gauntlet red-glow art (only head/hair/eyes change); the glow must come from runtime FX. (The `ren-px-asc.png` concept shows the glow seams; not authored as parts.)
- Not fixed: blobby bare upper arms in swings; enclosed transparent holes (Dash/Beam/Sphere/Death up to a few hundred px, arm/torso overlaps); WEST/EAST head layering is Kai's rule, unchecked at 1x in motion.
- Motion judged from contact sheets only. The airborne frames of Bloodstar tuck the legs only modestly. Transform west has a sole error of ~8 px (the rise).
- The f1 build needs `KAI_PAD_TOP=28` (the scripts set it).

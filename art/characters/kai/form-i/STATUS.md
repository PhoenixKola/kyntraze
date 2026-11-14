# B04 - Kai Form I (first transformation pilot): STATUS

Baseline: main at ad7ebf4 (B03G.1) + B04 + B04.1 polish. Visual motion appeal: OWNER REVIEW REQUIRED (footage was recorded, `review/live/*.webm` and each `<dir>/review/*.mp4` are local and git-ignored, but I did not watch it at real speed).

## What exists
- **Form I art (4 directions):** original ImageGen head + separate rear-hair piece per direction (blade-like asymmetric spikes, sharper brow, narrower eye with a pale glint), fitted to the approved rigs. Hair is its own part on its own `hair` bone (child of the head) with automatic follow-through; the head swap keeps the approved neck/jacket/sash/boots. The base head stays in the rig behind a `form` slot so the Transform clip can swap hair/face exactly at `form_commit`.
- **Rigs/sheets:** `south|north|east|west/rig/kai-<dir>.blend` (packed, Actions Idle/Run/BasicPunch/Dash/Hurt/Death/Transform), `<dir>/sheets/*.png + manifest.json` (own frame size per form, shared ground origin, `form_commit` event on Transform frame 5). Reuses the approved base poses (re-rendered with the Form I head); only Transform is new. Base `.blend`, parts and sheets are untouched (git shows only pipeline-script edits).
- **FX (separate, tintable, ImageGen):** `fx/*.png` (3 wisps, spark, shockwave ring, 2 arcs, ground glow) + `src/game/render/formFx.ts`: glow and wisps behind Kai, sparks and arcs around him (never on the face), ring on the ground; dt-driven so it freezes with pause; pool-capped, reduced-effects aware. Colours: `src/assets/formLooks.ts`.
- **Gameplay hookup:** `KaiAnimator` watches the sim's `player.form` edge (no sim changes, no new invulnerability/cooldown/damage): 0->1 plays Transform (commit at 0.25 s swaps to the Form I sheets), 1->0 powers down (reversed pre-commit frames, base art). Dash/hurt/death interrupt the cinematic and commit the art immediately; death while transformed plays the Form I Death. The old tinted placeholder (`setTint`, orange ring) is removed. Sound hook: `scene.events 'kai-form'` ('form_start' | 'form_commit' | 'form_end'); no audio ships, none added.

## Palette: FINAL = SOLAR (amber-gold), owner decision
Locked in all four directions (`palette.json` candidate `solar`, `src/assets/formLooks.ts` FORM_I_LOOK `solar`). Ember and Arc stay only as previews (`palette-previews/palette-looks-3x.png`, `final-solar-4dir-3x.png`). Brows/lashes now take the hair's darkest tone so the face has no off-colour strokes.

## B04.1 final polish (this pass)
- **Transform is now 16 frames @ 20 fps** (0.8 s): dip, a held trembling gather (frames 2-5, sash fluttering), coil release (6), **form_commit on frame 7 (0.35 s)**: Kai springs up, arms thrown wide, hair/face swap behind a one-frame white-hot sprite flash and a tiny camera kick, then wide reveal (8), flex hold (9-10), settle and a clean return to guard (12-15). Gameplay timing is unchanged (sim commits at activation; interruptible from frame 10; dash/hurt/death commit immediately).
- **FX regenerated at twice the pixel density** (`source/fx-sheet.png`, 5x5 art blocks; the first chunky set is kept as `source/fx-sheet-v1-chunky.png`): crisp flame wisps, spiked shockwave ring, thin arcs, stepped glow disc, glint sparks. FX scale now matches Kai's pixel size (`FX_BASE` 0.5); fewer sparks/arcs, sparks fade before piling up, no more clutter.
- **Bug fixed:** removing the placeholder Form ring let the generic flash square catch the `form` impact (a translucent tan square on Kai's belly during the cinematic); `EffectsRenderer` now skips `form`.
- **SOUTH waist blob:** the waist lining no longer peeks out as a dark blob in Form I clips (gated like the arm linings; base clips untouched).
## Gates actually run
- typecheck PASS; vitest 60/60 (B04 added: Form I manifest contract per direction, commit on frame 5 exactly once, power-down reverse, dash/hurt interruption, death during transformation, pause freeze, successive activations, Form I punch frame 5 + moving-punch legs, no-f1 fallback); build PASS; e2e 3/3.
- Blender: all four Form I `.blend` files reopened in fresh Blender processes (bones, 28/21 parts bound, packed textures equal `parts/`, 7 Actions, drivers incl. the form slot); Blender vs numpy render within 13 px, FK parity < 0.001 px.
- Live Phaser (headless Chromium, real keyboard, 960x540 and 640x360): F activation, cinematic frames, 8-direction movement with Form I art, auto-attacks, dash, pause mid-transformation (frozen), expiry/power-down, damage, death -> Results (~1.6 s) -> retry, successive activations (starts == commits), 0 console errors, 0 missing textures, 0 foot-origin offset errors, median frame 16.7 ms (p95 19.8 ms). Report: `review/live/live-b04-report.json` (git-ignored; numbers copied here).

## Known visual issues / limits (not hidden)
- Transform is still a rig pose cinematic plus FX, not a hand-drawn set piece. The sim commits Form I at activation (and grants its own 0.5 s invulnerability) while the art commits 0.35 s later.
- Moving during the first 0.35 s of the cinematic skates (it plays in place); moving after frame 10 cancels it. Planted feet drift up to 0.9 px on the springing commit frame.
- Face detail (eyes) is tiny at game scale.
- Hair follow-through is a simple derived sway; spikes can pass the sash/shoulder in a few Death/Dash frames; small limb seams and the dark SOUTH lining blob from B03G remain.
- Form I diagonal facing/leg blend are the existing base behaviours; no new facing logic.

## Provenance
5 ImageGen calls through the audited bridge (`scripts/gen_form_i.py`, same script/hash check as the base; model flag `gpt-6.1-sol`, ChatGPT login, read-only sandbox, no API key): `source/{south,north,east,west}-heads.png` + prompts, `source/fx-sheet.png`. Log: `source/PROVENANCE.md`. Extraction: `scripts/extract_form_i.py`, `extract_fx.py` (palette-mapped, native-scale sampling, no painted pixels); recolour: `scripts/prepare_parts.py`.

## Owner review: open first
1. `review/ingame-960x540-closeups.png` (real game frames incl. transformed combat) and `review/ingame-640x360-closeups.png`
2. `palette-previews/final-solar-4dir-3x.png` (final look) and `palette-looks-3x.png`
3. `review/transform-sequences-2x.png` (16-frame transformation, all directions); `review/form-i-vs-base-1.5x.png`

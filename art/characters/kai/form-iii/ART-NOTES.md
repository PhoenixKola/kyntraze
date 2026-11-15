# Kai Form III - STILLFIRE APEX: art / rig notes (B13 character-art stream)

## What was made
- **Four facings, each independently art-directed through the Codex ImageGen bridge** (`scripts/gen_form_iii.py`, prompts in `source/*-prompt.txt`, provenance in `source/PROVENANCE.md`, model gpt-6.1-sol):
  - `source/<dir>-heads.png`: new silver-hair HEAD + REAR HAIR per direction (swept, layered, fuller than Form I, calm level brows / half-open steady eyes; NOT the Form II gold blades). Generated in the approved dark teal-black palette, recoloured to silver-white (`palette.json` "stillfire": steel shadow -> silver -> white, pale ice-blue eye glint) by `prepare_parts.py` (same hair-ramp-by-lightness method as Form II).
  - `source/<dir>-torn.png` (final = the "-2" generations): TORN JACKET torso + two torn sleeves per direction: front torn open with bare chest (SOUTH / EAST / WEST), a diagonal rip across the back (NORTH, true rear view, no front details), ragged hem, frayed cream trim, tattered collar. Epaulette stays on the same sleeve as the intact art.
  - Rejected: `*-torn-v1.png` (all four): pieces came back 25-40 % larger than the intact art (NORTH torso 53x57 vs 43x41) -> regenerated with an explicit pixel-size instruction. `*-torn-2.png` copied over `*-torn.png`.
- **Extraction** (`extract_form_iii.py`): every source pixel mapped to the approved reference palette, one cell of the detected art-pixel block (13-15 px) per native px, no painted pixels. Torn pieces are aligned into the canvas of the intact base part (best mask overlap) and the canvas is padded; the pad is stored in `<dir>/parts/f3_variants.json` and the rig pivots of the intact part shift by it, so intact/torn/tear-stage art share one anchor.
- **Tear stages**: `torso_t1` / `torso_t2` are intact + torn composited along a ragged diagonal tear front (no painted pixels); `torso_f3` / `upper_arm_{n,f}_f3` are the final ImageGen art. The Form II rear hair (`hair_f2.png`) and head (`head.png` = Form II `head_f1`) stay visible until the commit.
- **Rig method**: the approved SOUTH rig (`base/production-south-candidate/rig`) and NORTH/EAST/WEST rig (`base/production-other-directions-candidate/scripts`) are reused through env switches only (`KAI_F3=1` on top of `KAI_FORM=f1`): `rig.py` / `specs.py` / `make_config.py` / `drig.py` add the torso / sleeve / hair variants, form-slot values are now `base / f1 / t1 / t2` with multi-value slots (`form:base+t1+t2`) in both `visible()` and the Blender drivers, `post.py` labels the manifest `form-iii`. Base / Form I / Form II builds are unchanged (their code paths never see `F3`; sheets verified byte-identical: `git status` of `public/art/kai`, `kai-f1`, `kai-f2` is clean).
- **Levitation** is a pose layer (`scripts/hover3.py`, hooked at the end of `anim.py` / `danim.py`): whole figure (root + every sole target + hip target) lifted `HOVER = 7` native px, legs replaced by relaxed, never-planted, trailing legs in Run / RunLower / RunPunchUpper / Dash, arms hang calmer than the fighting guard, Death settles from the hover to the floor, Transform rises from the ground. The pad-shifted absolute constants (the earlier Form II owner bugs) are respected: nothing in the layer uses absolute canvas coordinates except values read from the direction's own stance.
- `build_form_iii.py [south|north|east|west|all]` rebuilds a direction end to end (Blender 5.2). `preview_f3.py` is a Blender-free numpy preview of any clip.

## Clips / events (public/art/kai-f3/<dir>/manifest.json; same keys as kai-f2)
Idle, IdleSpecial (new, 28 f @ 14, once), Run, RunLower, RunPunchUpper, BasicPunch, Dash, Hurt, Death, Transform (18 f @ 20), Beam (26 f @ 20), Sphere (22 f @ 24, Instinct strikes).
- Transform events: anticipation_start 0, gather_start 2, tear_start 4, release_start 6, **form_commit 7**, reveal_hold 8, rise_end 11, interruptible_from 12. Slots: base 0-3, t1 4-5, t2 6, final 7+.
- Beam events: charge_start 0, charge_hold 7, **hold_start 6 / hold_end 9** (trembling charge-hold frames; loop them ping-pong), **release 10**, fire_end 20, recover_start 20, interruptible_from 22.
- Sphere (Instinct Reversal) events: gather_start 0, **strike_a 4, strike_b 8, strike_c 13**, end 17, release 4, recover_start 15, interruptible_from 17.
- IdleSpecial events: turn_peak 13, pulse 14, settle 22.
- Anchors (`public/art/kai-anchors.json` forms.f3, `src/content/handAnchors.ts`): per-frame n/f/m for BasicPunch / Beam / Sphere; tables BEAM_MUZZLE, BEAM_HOLD (new), SPHERE_RELEASE (f3 = strike A), PUNCH_FIST, STRIKE_FISTS (new, f3 only).

## Hover offset
Boots are ~7 px (measured 4-10 px across directions/frames, lowest opaque pixel above the manifest ground origin) above the ground point in Idle (+-1 px bob), Run (6-11), Dash (9-12). Origin_px stays the ground point; the sprite is lifted, so the lead should draw the ground shadow at the origin.

## Known defects / not verified
- Motion is judged from contact sheets and numpy/Blender renders only; no real-time playback was watched.
- Stance legs are the Kai fighting-stance rig with hovering soles: they read as "hanging, relaxed" at 1x but the SOUTH knees stay slightly splayed. No new leg art was generated.
- NORTH: relaxed arms show a bit more forearm below the jacket hem than Form II (the rear arms sit behind the jacket by design).
- Jacket tear stages t1 / t2 are mask composites (two transient frames), not separate illustrations.
- Hurt frame 0 needed knee tuck to stay inside the far leg's reach (a >40 % shin stretch made Blender and the numpy renderer disagree by ~270 px).
- Diagonal charge variants (BeamNE/NW/SE/SW) were NOT produced (optional in the brief): the cardinal set is complete; diagonal aiming reuses the facing-nearest hold/release frames.
- West: chest exposure is smaller than the other views (the torn flap faces the camera-left edge); the head sits above the jacket as in the owner fix.

# B20 — release-candidate polish (PARTIAL: owner sign-off required; local commits, NOT pushed)

**Baseline:** 74a9a91 (B19, pushed). Reproduced: typecheck clean, Vitest 365, Playwright 59, build OK.

## Verdict
**RC — OWNER SIGN-OFF REQUIRED.** Code, art and audio changes below are verified by tests and by screenshots I viewed. Nothing was heard by ear, watched at real speed, or measured on a real GPU (see "Not verified").

## What changed
**UI** (`kit.css`, `TitleScreen`, `ProgressionScreen`): title buttons no longer overlap Kai (640x360 to 3440x1440); Results at 640x360/640x320 no longer truncate stats or overrun the plate; Archives label Kai's forms as Kai's and state Ren/Sora earn their own; title label no longer "SURVIVAL PROTOTYPE". Tests: `title-layout`, `results-layout`.

**Hero VFX (ImageGen, `art/fx-b20/`, `public/art/fx/{sora,ren}`):** Sora lance beam, muzzle, impact cap, three-stage charge orb + vortex, needle/volley bolts, orbs, rings, aim lane, auras. Ren slashes/finisher, impacts, fist orb, Bloodstar ring, fissure, pillar, auras. The persistent auras are layered BEHIND the body with only a thin veil in front; the arrow/ribbon trails and every Graphics-drawn beam/orb/slash were removed. Base Sora gets a faint azure backlight for contrast on dark floors. Ren/Sora dash and hit effects are hero-coloured (red / blue), base and transformed; they no longer reuse Kai's orange solar set.

**Sprites (Blender, rebuilt):** Ren's Bloodstar Impact was re-posed in `rig/anim_b05.py` and `rig_dirs/danim_b05.py` (deeper crouch, higher launch and apex, tighter leg tuck, harder lunging slam) and rebuilt for base + Crimson Ascendant in all four directions; the shipped Sphere sheets, manifest entries and `ren-anchors.json` were updated (release frame and sim timing unchanged). `HeroAnimator` now plays the leap with a fast launch, a short hang at the apex and an accelerating drop (`leapCurve`, unit-tested). Sora's West neck (a flat bright-skin rectangle) was shaded to the face's shadow tone (`dirs/west/parts/neck.png`, `dirs-f1`, originals kept as `neck.b19.png`) and West base + Sovereign sheets rebuilt and shipped. A pinhole scan found Ren/Sora's enclosed pockets at Kai's own level (mean 0.7-0.9 vs 0.6 per frame), so no sheet-wide hole filling was done. Ren's upper arms were slimmed ~20% in every direction and form (`scripts/b20-ren-arms.py`, originals `*.b19.png`), re-rigged and rebuilt in Blender, sheets/manifests/anchors shipped. NOT changed: Sora's baggy short shins (Kai's leg canvases) and busy East/West torsos (need new ImageGen parts re-fitted and a full rebuild).

**Transformation look:** the Ren/Sora auras were removed (only the reveal cinematic keeps its effects); a thick pulsing body stroke (Phaser Glow filter, `EntityRenderer.updateStroke`) marks the transformed state: red (Ren), blue (Sora), silver (Kai forms 2 and 3 only). Cometheart's ground sigil is ~40% smaller. Pause stat cards restyled (seed no longer wraps).

**Combat feel:** a 0.15 s Q/E/R input buffer (a press refused only by an active cast or an about-to-end cooldown is retried; never for Sora's hold-E); unit-tested (`src/tests/b20.test.ts`). Seraph phase-2 halo enlarged and made additive.

**Balance:** Sora buffed conservatively (HP 104 to 116, auto damage 9 to 10, auto period 0.55 to 0.5 s) because both bot policies had him weakest. Mortal-bot averages (min until death, 8 seeds): kite Sora 1.8/1.9 to 2.1/2.1 (Kai 3.1/3.8, Ren 2.8/2.9); strafe Sora 4.3/3.0 to 4.6/3.9 (Kai 4.5/5.2, Ren 4.4/4.4). Bots are not players: B19's different bot had the opposite ordering. Ren and Kai untouched.

**Audio (post-processing only; originals kept in `art/characters/heroes/audio/originals-b19/`):** Ren's 16 low-heavy sounds gained a harmonic punch layer (autos were 66-95% below 150 Hz, centroid 0.5-1 kHz; now 2.4-4 kHz, same peaks). Sora's 7 most repeated bright sounds were softened (55/45 blend with a 5.5 kHz low-pass). Rare level-up offers now get a softer, lower take of the epic chime. **None of this was heard by ear.**

**Release docs:** README rewritten; LICENSE-NOTICES rewritten (provenance, AI-art ownership caveat, no commercial clearance); status headers and changelog corrected; checklist.

**Tests:** typecheck clean, Vitest 367, Playwright 72 specs (3 production-smoke skipped without PROD_URL). Two load-sensitive e2e tests (Stillfire E charge, Warden keyboard dodge) used wall-clock sleeps; both now wait on the real condition / sim time with unchanged assertions.

## Not verified (owner)
- Real-speed motion and audio by ear (nothing was watched or heard live).
- Real-GPU frame pacing: the machine's Chrome reports an RTX 3070 Ti, but the automated Chrome window was occluded and throttled to 1 fps, so no valid number exists. Measure by hand: open the game with `?qa=1` in a visible window and read DevTools Performance on a 60-enemy scene.
- Physical controller; Safari/Firefox/.ogg support; six-route human playtest.
- Ren upper-arm shapes, Sora shins and East/West torsos (need new ImageGen parts); the new Bloodstar poses and West neck were checked on contact sheets only, not in motion.
- Hit-stop / animation-fluidity review, boss and Aegis/Cantor tell audit: not done.

## B21 handoff
Animation & VFX evolution as approved; unchanged.

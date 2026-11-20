# B28 status: Vex, Riftbound and Voidheart Exile dual-form combat and the Abyssal Guardian

Brief: `prompts/kyntraze-b28-vex-dual-form-combat-overdrive.md`. The poses pass (below) is local, not pushed. Nothing here has been watched at real speed or heard; the live checks were headless 960x540 runs (stills, console and request errors only).

## Done

| Feature | State |
|---|---|
| Riftbound auto, Phantom Edge | Four real arc-geometry beats (near, far, paired cross, curved finisher), reach 135, mark bonus only on genuinely marked targets. |
| Riftbound Q, Mirror Guard | 0.9 s guard, 0.5 s perfect window. A perfect hit is refused once and answered by two bounded spectral echoes; a late hit is only softened; arena hazards are never parryable. Counts as a perfect parry for the Riftbound mastery goals and stores the Shard Requiem charge. |
| Riftbound E, Rift Execution | Aimed target in a forward cone, a safe behind-target landing outside every collision footprint (fallback angles), two portal events, cut at the real target. No safe landing = no teleport, a short grounded slash. A real incoming threat at the cast counts as a riposte and can arm Null Waltz. |
| Riftbound R, Oath of Ruin | Five seals (three with Severance Judgment) at saved ground points (enemy positions then a lane), warning then sequential eruptions, a wider final seal, per-enemy repeat cap, bounded genuine marks. |
| Riftbound V, Abyssal Fang | Hold V, forged blade, collision-safe lunge, narrow piercing line capped at 4 hits, a shield ends the pierce, tier 3 leaves two follow-through pulses, a miss only dissipates. |
| Voidheart auto, Invisible Judgment | Four beats of cuts committed at real points and resolved 0.14 s later; a target that left the point is missed; no cut through walls. |
| Voidheart Q, Phantom Legion | Three spectral copies for 6 s at 30 % of auto damage, each with its own stable target, collision-safe movement, non-targetable, hits never feed Overdrive (`noOd`) or B22 branch triggers (`fx`). End with the form. |
| Voidheart E, Dimensional Severance | Warning, a lane cut (terrain-capped, beamWidth wide), then a reconnection shock; each enemy hit at most twice. beamLinger adds capped extra pulses. |
| Voidheart R, Domain of the Exile | A 5 s field following Vex, 3 stable-rotation strikes every 0.45 s, a total strike budget, bosses never pulled or stunned, ends cleanly with the form. |
| Voidheart V, Event Horizon | Hold V, a thrown core: first contact pulls ordinary enemies in then erupts once (tier 3 adds one shock); obstacle or range end fizzles, shield consumes it; released cast keeps form 2. |
| Overdrive, flight, Form Shift | Same meter / duration numbers as Kai. Flight per form (Riftbound 1.4 speed, 6 drain/s, heavier landing; Voidheart 1.5, 4.5/s, restrained landing). Form Shift only between unlocked forms 1 and 2, 18 Drive / minimum 20 / 2.5 s, from the F key or digits; keeps Overdrive's remaining timer, V and flight cooldowns, ends non-V acts, lands a flight without a slam. |
| Per-form reveal | `vexSeen` per form (carried in the co-op slot bag), so Riftbound never suppresses Voidheart's first reveal. First Voidheart reveal is 3.4 s with its own ImageGen choreography read from the live cinema; repeat is the short shared one. |
| B22 compatibility | All six branches and three Vex legendaries are mapped (see the "Riftbound / Voidheart" lines on the cards). First Riposte is now a threat-timed Severance in Voidheart; Exile's Measure counts threat-timed ripostes across Rift Reversal, Rift Execution and Severance. |
| HUD, audio, net | Slot names, icons, tooltips and numbers read from `vexCombat.ts`; 36 synthesised `vx_*` cues; fields travel in the existing hx view (`vf`, capped at 12). No protocol change. |

## Art (ImageGen, Codex bridge)

50 sheets in `art/fx-b28/` (prompts, sheets, `sheets.py`, `run.py`), cut by `scripts/b28-cut.py` into `public/art/fx/vex-guardian/` (46 sets x 4 frames) and 12 colour skill icons `public/ui/icons/vex_cf_*.png`. Two coordinated Guardian sets (head side / front / back, torso or mantle, arms, plates, activation, dissolve): Riftbound is fractured violet armor with a jagged visor and claws; Voidheart is a tall graphite and silver guardian with a faceless helm and a long mantle. Plus Riftbound FX (slashes, mirror, echoes, portal, cracks, seals, pillars, fang, impact), Voidheart FX (cuts, copies, seams, shards, ring, blades, core, implosion, eruption), the Voidheart reveal (cracks, halo fragments, pulse, lifted hair) and shared presence (ground rings, wisps, fragments, flight trails).

## Renderer (`src/game/render/vexFx.ts`)

Per-fighter, bounded pools. The Guardian wraps Vex only during Overdrive; its look follows the current form, so a shift swaps style on the same timer. Arms strike on real events. Copies are tinted copies of Vex's own current frame; the domain ring, seal warnings, Event Horizon core and charge blade are drawn from committed fields and the live cast. Voidheart hovers about 6 px above his ground feet (shadow and all gameplay positions stay on the ground).

## Tests and checks

`npm run typecheck` clean, `npm run build` passes. `src/tests/b28-vex-combat.test.ts` (15 tests) covers every ability's contract, Form Shift rules, Overdrive, per-form flight and the per-form reveal; two older Vex assertions changed on purpose (transformed Q is no longer Parry Halo; the first Voidheart reveal is 3.4 s). Kai, Ren, Sora, hero, Vex-mode, co-op, snapshot and ascension suites pass (150 tests in the last run). Two headless runs of the real game with Vex (both forms: auto, Q, E, R, V charge and release, Overdrive) showed 0 console errors and 0 failed requests.

## Not verified / known gaps

- **Authored poses (new, pose pass):** see "Vex poses" below. Still missing: a Voidheart-specific walk/run (Run / RunPunchUpper are shared with the older Vex set), a Voidheart dash that actually teleports (Blink is a pose played over the sim dash), and animated copies (they still show Vex's current frame).
- No Vex-specific body-motion profile entries were added; outfits were not re-checked with the new poses or FX. Hair anchors and fist anchors for all new clips were regenerated (additions only, nothing existing changed).
- No dynamic afterimages, no teleport-style dash visual for Voidheart, no hair / coat flow beyond the existing hair rig.
- The clip-based flight shows the existing Run pose lifted by the sim, plus the form's jet or trail.
- Spectral copies are non-targetable and show Vex's current pose (they do not run their own animation).
- Form Shift controller input uses the existing path only; the selector and F key were not changed.
- No motion at real speed, no audio listening, no two-client run, no 640x360 HUD check, no crowded-fight check, no second arena.
- Overdrive reachability is reasoned (same numbers as Kai), not measured.
- Cross-hero compact regression: Kai, Ren, Sora and Vex suites were run; no four-hero live session.

## Vex poses (new, pose pass)

Real rig poses, built with the same Blender part-rig pipeline as Sora / Ren (pose data `art/characters/vex/b28_poses.py`, solvers `rig/anim_b28.py` and `rig_dirs/danim_b28.py`, selected per form by `VEX_STYLE`, published by `scripts/b28-vex-publish.py`). All clips exist in four facings (north is a rear view, west is the east pose through the facing sign, never mirrored art).

- **Riftbound (f1):** Strike1-4 (near blade cut, far claw rake, paired scissor cross, overhead-to-ground curved finisher), CastQ (crossed-blade Mirror Guard brace, held frames loop), CastE (low coil, long through-strike), CastR (blade overhead then driven into the ground), VCharge (blade hauled back, hold loop) + VRelease (lunge thrust), Takeoff / Glide / Dive (blade-first lean).
- **Voidheart Exile (f2):** the same names with a different language: upright, narrow stance, economical gestures (far-hand flick, near sweep, drawn cross, two-handed overhead decree; arms-low-to-wide Phantom Legion summon; one-arm raised straight stroke for Severance; arms spread with raised chin for the Domain; cupped hands for the Event Horizon core and a one-arm throw), plus **Hover** (idle with the feet off the ground; replaces the old renderer offset while it plays) and **Blink** (stretched step played over the dash). Flight is upright with arms low rather than a dive lean.
- **Wiring:** `HeroAnimator` now takes the f2 manifests (Voidheart resolves from its own sheet set), maps the real act kinds (`mirror_guard`, `phantom_legion`, `rift_execution`, `dim_severance`, `oath_ruin`, `domain_exile`, `abyssal_fang`, `event_horizon`), the real `vex_auto` beat (Strike1-4), flight and dash to these clips, and times each cast against the sim's release time. A set without a clip falls back to the older mapping. New `src/tests/b28-vex-poses.test.ts` checks that every clip ships in all four facings and that the animator selects them.
- **Checked:** every clip rendered and inspected as stills (south and east in both forms, north Riftbound), frames zoomed at 5x; a Voidheart CastE frame with a dark sleeve stub was fixed and rebuilt. One headless run of both forms (auto, Q, E, R, V, Overdrive) with 0 console errors and 0 failed requests; typecheck, build and the Kai / Ren / Sora / Vex / co-op / snapshot suites pass.
- **Not verified:** nothing watched at real speed; VFX attach points were not re-tuned to the new fist anchors; the blade part is always drawn on the near hand, so in raised-arm poses it overlaps the forearm / face area; north and west facings of Voidheart were only checked in contact sheets, not zoomed.

## Also fixed in this pass

- **Co-op level-up screen:** the branch / evolution offer lives in the choosing fighter's slot but the screen was built from player 1's, so it showed "Choose your evolution" with no cards. The screen is now built from the chooser's slot, and a non-choosing player sees a waiting panel. Reproduced only at sim level (new test `coop-offer-view.test.ts`); not seen in a live two-player session.
- **Hero R cooldown guard:** the cooldown / busy check in `heroStartR` had been swallowed by a trailing comment, so Ren, Sora and Vex R presses were never gated; restored.
- **Kai V:** a quick tap with nothing in reach is now cancelled for free instead of spending the 45 s cooldown on a harmless miss.

## Follow-up pass (after owner feedback)

- **Drive:** kills gave Drive to every hero except Vex; fixed (test added). Overdrive meter gain for Ren, Sora and Vex raised (3 per hit, 6 per kill, 6 hits per 0.25 s window) because it needed >90 s of constant fighting; in a swarm it now fills in about 3-6 s (Kai 2 s, he has no rate window). Reasoned from a sim probe, not felt.
- **V:** a V that hits nothing (all four heroes) now costs an 8 s lockout instead of the full 45 s cooldown.
- **Flight:** same logic as Ren/Sora, verified live in both Vex forms at 640x360 and on the Ashen arena (flyT/air rise, 0 console errors). The earlier "can't fly" was most likely the starved Drive bar; a level-up pause also blocks flight in harness runs.
- **Dash afterimages:** tinted afterimage trail while dashing in Riftbound (violet) and Voidheart (silver).
- **Checks done:** 640x360 HUD with a 28-enemy crowd, second arena, flight, Overdrive. Full vitest run: 762 pass; two load-timeouts pass alone.
- **Still not done:** nothing watched at real speed or heard; no two-client online run; Voidheart north/west only checked in contact sheets; spectral copies still show Vex's current frame; Blink is a pose over the sim dash, not a true teleport.

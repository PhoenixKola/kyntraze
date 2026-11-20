# B28 status: Vex, Riftbound and Voidheart Exile dual-form combat and the Abyssal Guardian

Brief: `prompts/kyntraze-b28-vex-dual-form-combat-overdrive.md`. Everything is **local, not pushed**. Nothing here has been watched at real speed or heard; the live checks were headless 960x540 runs (stills, console and request errors only).

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

- **No Vex poses were authored.** Vex still uses the existing clips: no new strike, cast, glide, Takeoff / Glide / Dive, hands or turn poses, and no Voidheart-specific four-direction animation set. The brief required these; they are the largest remaining gap. The Voidheart hover is a renderer offset, not an authored pose.
- No Vex-specific body-motion profile, hand-anchor entries or hair/accessory anchor work for new clips (nothing new was exported); outfits were not re-checked with the new FX.
- No dynamic afterimages, no teleport-style dash visual for Voidheart, no hair / coat flow beyond the existing hair rig.
- The clip-based flight shows the existing Run pose lifted by the sim, plus the form's jet or trail.
- Spectral copies are non-targetable and show Vex's current pose (they do not run their own animation).
- Form Shift controller input uses the existing path only; the selector and F key were not changed.
- No motion at real speed, no audio listening, no two-client run, no 640x360 HUD check, no crowded-fight check, no second arena.
- Overdrive reachability is reasoned (same numbers as Kai), not measured.
- Cross-hero compact regression: Kai, Ren, Sora and Vex suites were run; no four-hero live session.

## Also fixed in this pass

- **Co-op level-up screen:** the branch / evolution offer lives in the choosing fighter's slot but the screen was built from player 1's, so it showed "Choose your evolution" with no cards. The screen is now built from the chooser's slot, and a non-choosing player sees a waiting panel. Reproduced only at sim level (new test `coop-offer-view.test.ts`); not seen in a live two-player session.
- **Hero R cooldown guard:** the cooldown / busy check in `heroStartR` had been swallowed by a trailing comment, so Ren, Sora and Vex R presses were never gated; restored.
- **Kai V:** a quick tap with nothing in reach is now cancelled for free instead of spending the 45 s cooldown on a harmless miss.

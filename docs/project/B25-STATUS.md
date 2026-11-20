# B25 status: Kai combat identity, Primal Overdrive, Skybreaker, Form Shift

## Shipped (all Kai only)
- **Auto-attack styles** (`src/content/kaiCombat.ts`, `src/sim/KaiCombat.ts`): Base *Comet Fists*, Flarebound *Solar Barrage*, Cometheart *Thunder Fangs*, Stillfire *Phantom Strikes*. Each is a 4-beat loop with its own cadence, melee contact vs ranged strike, finisher sweep, and (Cometheart) one limited lightning follow-up. One `kai_auto` event per target drives the visuals. Old generic volley removed.
- **Signature techniques** (hold **V** / pad **RT**): Solar Vortex, Thunderstar Breaker, Singularity Palm. Charge tiers at 0.35 / 0.9 / 1.6 s (cap 2.3 s), aimed release, bounded collision-safe lunge, real contact (hit / block / miss events), form-specific follow-ups (solar burst, fracture pulses + thunderclap, implosion then release with boss displacement immunity). 45 s shared cooldown, spent only on a committed release, ticks in every form. Cancels on death, form change, ultimate, dash, hit before release, or focus loss (`sigAbort`). Never attributed to Q/E/R.
- **Primal Overdrive** (press **G** / pad **B**): meter fills from hits and kills while transformed; 10 s, +25% damage, +8% speed, faster autos. Spectral dragon mantle, claws, jaws on beams, ground sigil, claw trails; returns to the current form.
- **Skybreaker flight**: hold dash while transformed (0.28 s) to lift off; per-form speed and drive drain; release to land with a slam. Not immune to damage.
- **Form Shift**: **1/2/3** (or **F** when nothing else is ready) switches between unlocked transformations without returning to base; costs 18 Drive, needs 20, 2.5 s shared form cooldown.
- **Also**: Form III no longer has the 10:00 gate, Lance hold shortened to 0.6 s, presence layer toned down (no belly glow), effect events carry per-fighter slots.

## ImageGen
`art/fx-b25/` (prompts, sheets, `PROVENANCE.md`): per form dragon mantle, claw, orb stages, burst, head, sigil, flight jet, shift burst (8 x 3 sheets) plus one HUD icon sheet. `scripts/b25-cut.py` cuts them into `public/art/fx/kai-o/` (96 sprites) and `public/ui/icons/sig_1..3, overdrive.png`.

## Checks
typecheck, build, unit tests (`src/tests/b25-kai-combat.test.ts`: styles, charge/release/cooldown/cancel, miss, base lock, Overdrive, flight, Form Shift), real-game stills for all three forms (charge, hit, Overdrive, flight), no console errors at 960x540.

## Not verified / limits
- No new hand-authored sprite poses: autos reuse the existing punch / lunge poses with new effects; the signature uses the existing Beam hold clip. No rear (NORTH) specific check of the new overlays.
- Motion at real speed, audio (no new sound cues were added), real controller, online two-client play, compact HUD size and the second arena were not checked. New input fields are in the wire protocol (optional booleans), so client and server should be deployed together.
- Stillfire's delayed precision impact is visual only. Flight has no collision change and no new flight pose.
- Balance numbers are first-pass; the run-length bot test still passes.

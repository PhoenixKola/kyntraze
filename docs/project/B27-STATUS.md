# B27 status: Sora, Azure Sovereign combat evolution and Astral Phoenix Overdrive

Brief: `prompts/kyntraze-b27-sora-azure-sovereign-combat-overdrive.md`. Baseline: B26 Ren (local, unpushed), HEAD `a70fbe5` at the start of the render stage. Everything below is **local, not pushed**. Nothing here has been watched in motion at real speed or heard; the one live check was a headless 960x540 smoke run (screenshots, console and request errors only).

## What is done

| Feature | State |
|---|---|
| Astral Blades (auto) | Done in sim, real bolt entities. Four beats: left blade, right blade, crossing pair (damage split), fan of three small blades. `src/sim/SoraCombat.ts`, numbers in `src/content/soraCombat.ts`. Base Azure Needle untouched. |
| Q Azure Prison | Done. Aimed or densest-cluster point within 320 px, radius 128 x qRadius, 0.35 s formation, 1.0 s hold, then one shatter. Ordinary enemies inside are slowed (the game's own stagger slow) and softly kept in; bosses and shielded foes are never held or moved and take the ticks and shatter. |
| E Heaven's Spear | Done. 3 spears (+ beamLinger, cap 6) on distinct targets in a forward cone, positions snapshotted at the cast, landing in sequence 0.42 s + 0.14 s each. A target that walks away takes nothing; empty ground still produces the marked (harmless) strike. Repeat hits by the same sequence do 40 %. Base hold-E Celestial Lance is untouched. |
| R Celestial Collapse | Done. Ability id `azure_collapse`; the branch `celestial_collapse` keeps its id and shows as a Compression Focus modifier. 1.25 s collision-safe pull of ordinary enemies (radius 185 x sphereRadius), then one burst (radius 200). Afterglow / Twin Bloom echo = one smaller second burst. Bosses never move. |
| V Astral Devastation | Done. Hold V, 45 s shared cooldown, tiers 0.35 / 0.9 / 1.6 s, cap 2.3 s. Release launches a real projectile (speed 540+50/tier, range 520+60/tier): first enemy contact damages and detonates (tier 2 adds a wider ring, tier 3 a controlled afterpulse), obstacle or range end is a small fizzle with no hit, a shield block consumes it without a blast. A real release spends the cooldown even on a miss; an unreleased charge cancelled by dash, hit, death, form change or ultimate is free. |
| Primal Overdrive | Done. Meter from real transformed hits and kills only (1.4 / 3, rate-limited by a 0.25 s / 4-hit window), G activates, 10 s, +25 % damage (once, in `damageEnemy`), +8 % speed, auto period x0.88. No separate HP or AI. |
| Skybreaker | Done in sim. Hold dash 0.28 s, 5 s max, minimum Drive 12, 3.5 s cooldown, speed x1.45, extra drain 5.5/s, one bounded landing impact after at least 0.5 s of flight. |
| B22 compatibility | `slotOfAct` maps the new acts to Q / E / R. Needle Spiral and Stormline Array act at the Prison shatter (seeking vs straight piercing shards); Piercing Meridian makes the spears a straight longer lane (its width tradeoff is the existing beamWidth mod, not applied twice); Celestial Prism reuses the existing fan on the first spear hit; Starfield Array leaves three control nodes after the burst; Zero Convergence merges the echo into one stronger burst (no echo, no nodes); Blue Needle Storm triggers on the fourth real blade hit. Mastery: Full Charge = 3 tier-3 Astral Devastations that hit an enemy; Meridian = 5 distinct enemies in one Spear sequence or one Collapse (the base Lance pierce still counts). Branch and legendary cards show a "Sovereign:" line. The Archives list still shows base text. |
| HUD, audio | Slot names, icons, tooltips and numbers read from `soraCombat.ts`; V and G slots for Sora. 25 original synthesised `sr_*` cues, one per beat / cast / landing. |
| Net | No protocol change. The committed fields (`hx.sf`) travel in the existing per-fighter hx view, capped at 10, and are cleared explicitly in `applyFighter`. |

## Art (ImageGen, Codex bridge)

Sources, prompts and the generation log: `art/fx-b27/` (31 sheets, one concept, alternatives not needed). Cutter: `scripts/b27-cut.py` (component cutting, equal-gap column cutting for fragmentary sets, every set padded to one canvas per set so a constant runtime scale keeps growth and anchors). Runtime frames: `public/art/fx/sora-phoenix/` (25 sets x 4 frames + `manifest.json`), skill icons `public/ui/icons/sora_cf_*.png` (prison, spear, collapse, devastation, overdrive, blades).

Quality as judged from the sheets and from stills: the concept phoenix, wings, heads, tail, prison lattice, spears, vortex, orb stages, blade-feathers and icons are strong and clearly a bird, not a fox or dragon. Not used (generated but weak or redundant): `wing_spread` (it drew two small birds), `wing_cup` and `talon` (drew a whole perched bird), `prison_shard`. Frame 3 of `collapse_vortex` has a ray touching the sheet edge.

## Phoenix and FX presentation (`src/game/render/soraPhoenix.ts`)

Layered per fighter, destroyed with the renderer: tail and breast behind Sora, near and far wing beating out of phase, head above and ahead of the shoulders; south and north show two mirrored wings and a front or back head. Idle folds and breathes, movement beats faster, attacks snap the wings, charging and Collapse fold them in, flight beats broadly. Blades are the real bolts drawn as blade-feathers; prison, vortex and the V orb are drawn from the committed fields, so the picture matches the damage geometry. Events drive the mark sigils, spears, shatter, bursts, rings, activation and dissolve. A restrained presence (ground rings, shoulder wisps) is on while transformed; a body-fitting silhouette and stroke already exist from B20 / B21. **No dynamic afterimages were added for Sora.**

## Poses (Blender)

**Authored (Blender 2D part rig, Form I build only, four directions):** Takeoff (10 f @20, release 4), Glide (4 f @10, loop) and Dive (20 f @22, ground contact at frame 7). They are the body-pitch skeleton of the B26 Ren flight (`rig/anim_b26.py`) ported to Sora's own rig, with the hands retuned to open, spread, steering hands instead of a sprinter's fists. Sources: `art/characters/sora/south/rig/anim_b27.py` and `dirs/scripts/danim_b27.py`, hooked into `anim.py` / `danim.py` only when `KAI_FORM=f1`, built with `art/characters/sora/tools/build_f1.py all`, published with `scripts/b27-sora-publish.py` (only the three new sheets per direction and their manifest entries; existing sheets untouched). Both Sora outfit sets got recoloured sheets for the new clips only (`B22_ONLY=takeoff,glide,dive`), and `public/art/hair-anchors.json` was regenerated. Runtime: `SORA_F1_CLIPS` in `kaiAnimation.ts`, loaded in `BootScene`, and `HeroAnimator` flies Sora on Takeoff / Glide / Dive when the sheets exist. Judged from zoomed stills of every direction and one in-game still of Glide (east); **not watched in motion**.

**Honest limits:** the Dive build line for several directions reports enclosed-pixel counts and the Glide south seam flag, not investigated. Hand anchors for the new flight clips were not measured (no hand-fired attacks are expected during flight). **No casting poses were authored**: Prison, Spears, Collapse and the V charge / launch reuse Sphere, Beam and RunPunchUpper, and the Astral Blades beats reuse BasicPunch.

## Tests and checks

- `npm run typecheck` clean; `npm run build` passes.
- `src/tests/b27-sora-combat.test.ts` (11 tests): beats and blade counts, range, base form unchanged, Prison slow / boss / shatter, Spears land on marks only, Collapse pull and boss, V charge / release / fizzle / hit / cancel, Overdrive meter and duration, flight and landing. Passes.
- One existing assertion in `heroes.test.ts` changed on purpose (transformed Sora Q is Azure Prison, not a finer Volley). Hero, Kai, Ren, ascension, co-op, snapshot, save and server tests pass.
- One headless 960x540 run of the real game (`hero-card-sora`): 0 console errors, 0 failed requests; stills of auto, Prison, Spears, Collapse, V charge and launch, Overdrive start and idle, east / west / north movement and flight were looked at.

## Not verified / known gaps

- No motion at real speed, no audio listening, no controller, no two-client online run, no 640x360 compact HUD check, no crowded-fight check, no second arena, no owned-outfit check with the new FX.
- Q / E / R / V release poses and the Astral Blades beats reuse existing clips (see Poses); only the flight clips are new.
- The Prison lattice is drawn slightly wider than the damage radius (the crystals stand outside the ring).
- Overdrive reachability is reasoned (same numbers as Kai / Ren), not measured in a real run.
- Client and server must be deployed together only if the protocol changes; this batch did not change it.

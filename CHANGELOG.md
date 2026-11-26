# Changelog

## B34 Sora: Eventide Seraph
- Sora's second and final transformation: a sweeping crest of separated pearl-and-champagne feather locks over a dusk-violet layer, a dusk-violet costume with prism trim, a floating feather mantle, halo fragment and orbiting feathers, a new reveal (stars gather into a broken constellation, a Phoenix shadow opens, a prismatic shockfront) and the Eventide Phoenix Overdrive. Earned by defeating the Null Seraph as Sora after Azure Sovereign; usable from the next run. F while transformed shifts between Sovereign and Seraph (18 Drive, 20 minimum, 2.5 s).
- New kit: Prism Feathers, Constellation Pierce, Seraph's Descent, Eventide Judgment, Astral Rebirth, Celestial Glide, and the capped Star Trace mark (set by direct feather hits, consumed once by the constellation techniques).
- ImageGen: portrait, 8 icons, the Eventide Phoenix family, celestial effects and mantle pieces; the body sheets are built through the existing Sora rig (no new bespoke poses).

## B33 Ren: Ashen Eclipse
- Ren's second and final transformation: a long obsidian-and-ash mane, charcoal-and-bone costume, a new reveal (a silent eclipse, a pressure front, nine tail shadows) and the Eclipse Nine-Tailed Fox Overdrive. Earned by defeating the Null Seraph as Ren after Crimson Ascendant; usable from the next run. Form Shift with Crimson Ascendant costs 18 Drive like Vex's.
- New kit: Cinderfang Chain, Eclipse Maul, Ninefold Rupture, Ashen Cataclysm, Eclipse Fang, Ashen Skybreaker, and the capped Ash Brand mark that finishers detonate.
- ImageGen: portrait, 8 icons, the Eclipse Fox family and ash effects; the body sheets are built through the existing Ren rig (no new bespoke poses).

## B32 Ability identity and combat feedback
- Solo flight is now Left Alt (co-op Ctrl / Right Ctrl and the controller are unchanged); hints updated.
- Cometheart Meteor Drive rebuilt: charged windup, real beat-point lane preview, lightning arc per beat, contact frames only on a real hit, a different whiff, a final crack / shock / end-point ring with a finisher hit-stop; timings retuned (cooldown unchanged).
- Stillfire Silver Echo: pale silver spectral double with sigil, life ring, target reticle, visible strikes, and distinct destroyed vs expired endings. Surge Step shows its live state and expiry.
- Sora (Prison, Spears, Collapse), Ren (Cyclone, Rampage, Catastrophe) and Vex (perfect counter vs guard, relocation tears, seals, cuts) gain contact-aware effect layers; 36 ImageGen sprites in public/art/b32. New audio cues chosen from the simulation's hit reports.

## B31B Living Fractures
- Opt-in run rule on Classic, Endless and Fracture Expedition (Mode Select toggle; online host toggle): six optional world events with their own deterministic director stream. Rift Portal, Corrupted Shrine, Fracture Cache, Roaming Elite, Containment (escort or defend) and Celestial Echo (one trial and blessing per hero), each with arena-specific variants for all four arenas.
- Event runs are a different seed contract (`<plan>+lf`), unranked, and never write the mode records; with the rule off nothing changes (bit-identical until the first event, tested).
- Shared world in solo, local co-op and online co-op (server authoritative; protocol v2; clients send nothing but input). HUD tracker, announcements, boon / curse chips, direction hints, bargain preview, minimap markers and a result summary.
- 27 ImageGen world sprites in one atlas plus HUD icons (public/art/fractures, sources in art/fractures).

## B31A Fracture Chronicles (local, unpushed)
- Story campaign: nine new solo missions (Kai, Ren, Sora x3), Vex's three Trial chapters integrated, and a shared finale unlocked by all four arcs. New campaign run mode and a hold encounter step; the HUD shows the live mission objective; unranked, no per-run Marks, one-time chapter rewards.
- Fracture Chronicles map in the Nexus, cinematic story scenes (parallax art, speaker portraits, back / skip), an Archives tab with replay and lore, Nexus hero chatter that reacts to progress.
- Additive save block b22.chronicles (done / seen scenes / visits / last result); legacy Vex completions count without migration.
- Ten ImageGen key arts in public/art/chronicles, sources in art/chronicles.

## 0.23.0 (B23 completion pass, local; PARTIAL - see B23-STATUS.md)
- Local co-op: the partner is drawn from their own sheets (BootScene loads every fighting hero) and animates (P2 input is now stored per slot); Vex has explicit `vex*` asset keys, no Ren alias; Voidheart upper/legs/anchors resolve one appearance; outfits only re-skin their own hero.
- Living hair: tips of the hair deform from real motion with roots pinned (idle sway, run trail, cast / hurt kicks) for all 11 appearances x 4 facings, via a mask-skinned warp of the shipped pixels. Reduced Effects halves it; pause/cinematic freeze it.
- Hit provenance: damage carries its producer's slot; Kai Scatter/Meteor = Q, Rising Flare = E, Crucible = R, clone strikes belong to no slot.
- Online snapshots carry Kai's kit state and clear it on expiry.
- Contour edge follows idle / run / dash / charge / release / settle with eased intensity; per-game shader registration; brighter silver Voidheart edge.
- Mastery edge details and crests are equippable (save restore, Archives controls, per-form palettes). Labels now describe the attached-edge look.
- Four arena materials for floor scars (no Gloam/Ashen fallback), Vex and Kai-kit marks.
- Rear view (NORTH): new away-from-camera strike poses for all 11 sets; seven crest artworks; outfit head accessories; boss damage decals and phase-shift surge; 12 enemy death animations; Vex bespoke clips and effect set; reshaped reveals and Victory poses. Remaining gaps are listed in B23-STATUS.md.

## 0.22.0 (B22 Shattered Horizons, local, unpushed)
Run plans and 7 modes, 2 realm arenas, 6 realm enemies, 7 new bosses, Vex (interim art), Ascension (24 branches, 12 legendaries, 4 ultimates, 8 relics, mastery), local + online co-op (dependency-free server), Archives, Mode Select, ability tooltips + click, contract overlap fix. See B22-STATUS.md for what is interim or not done.


## B20 · release-candidate polish (local, unpushed)
- Title: action buttons stack under the primary button, Kai sits further right, the oversized logo mark no longer pushes the block out of the viewport. No overlap from 640x360 to 3440x1440 (`e2e/title-layout.spec.ts`).
- Results at 640x360 and 640x320: six stat labels no longer truncate, the three-button action row stays inside the plate (`e2e/results-layout.spec.ts`, screenshots in `art/progression/review/b20/`).
- Archives: the transformations row is explicitly Kai-focused; Ren and Sora rows say how each earns its own form.
- Title label now reads RELEASE CANDIDATE. README, status headers and stale B00 docs corrected.
- Added `e2e/prod-smoke.spec.ts` (production preview: no 4xx/console errors, no QA hooks, no QA save) and `src/tests/balance.bot.test.ts` (opt-in balance probe).
- No balance, art, audio or sim changes in this pass; see B20-STATUS.md.

## Pre-B12 · Kai motion + premium UI repair
- NORTH rear view rebuilt (arms behind the jacket, back-of-fist hands, rear-view run/idle), SOUTH run fists moved beside the torso, WEST head/shoulder layering and guard fixed; Base + Form I rebuilt in Blender. Moving auto-attack restored as a two-layer rig export (RunLower + RunPunchUpper, leg-phase matched; no pixel crop). New ImageGen HUD portraits, select backdrop, hit vignette, route/modal transitions, aligned CHANGE strip. Notes and proofs: `art/characters/kai/review/pre-b12-motion/`.

## B11 · complete survival loop + B10.1 upgrade icons
- Real win condition: defeat the Null Seraph (15:00, HP 2800) after the Fracture Warden (8:00, reward pick + heal). Threat-budget director with breathers, finale warning and quiet, run rail and next-event hint on the HUD, victory beat, victory/defeat results with build summary and ImageGen victory art. Simulated full run wins at ~15.7 min on both arenas.
- All 25 upgrade icons redrawn as full-colour ImageGen inventory art. See `B11-STATUS.md`.

## B10 · progression, level-up UX and minimap
- 25-card upgrade pool (7 categories, Common/Rare/Epic) with synergy-weighted, rarity-ramped, deterministic offers; build-defining epics (Rift Conductor, Twin Bloom, Second Wind, Ember Core). New `Mods` block drives beam/Nova/drive/survival effects. XP curve and time-scaled kill XP retuned toward a 10-20 minute run.
- New level-up screen (rarity cards, before/after stats, stack pips, build strip, 1-2-3 / click / pad), HUD XP readout, Second Wind badge, ImageGen XP crystals (4 tiers) and a premium canvas minimap (landmarks, hazards, density, elites, boss, status strip). 4 ImageGen sheets. See `B10-STATUS.md`.

## B07 · premium enemy production
- Four enemies with ImageGen art and 8-frame pose sheets: Shardwalker (`pursuer`, lunge), Rift Stalker (`flanker`, dash-slash), Breaker Sentinel (`bruiser`, telegraphed ground slam) and Shard Channeler (`ranged`, dodgeable crystal bolt). Sim-owned attack state machine, enemy projectiles and events; seeded director introduces ranged at 70 s and bruiser at 150 s under live caps.
- New `enemyRenderer.ts` (pooled sprites, telegraph markers drawn from the sim timeline, death ghosts), 11 original enemy sounds, `ART-BIBLE.md`, `B07-STATUS.md`, review proofs in `art/enemies/review/`. Tests: +18 unit, +3 e2e; e2e now runs 2 workers (software-GL load stalls with 4).

## B06 · premium readability, arena, HUD and menu foundation (+ B05.2 corrective pass)
- Readability: thin pale rim filter on Kai, contact shadows for Kai and enemies, floor light pool and halo (gold in Form I), enemies dimmed one tier, arena floor rebuilt from an ImageGen tile set (`art/ui/source`, 8 plates, baked once into a single texture, darkened one value tier + rim vignette, teal inlay lanes as landmarks).
- HUD: portrait + HP (damage trail, low-HP pulse) + thin XP + Drive/Form bar with threshold tick; centred clock + kills; icon ability tiles with a clockwise cooldown sweep, seconds readout, key or pad glyph; compact pause. One `--u` unit scales 960x540 to 640x360 with legibility floors.
- Menus: title with generated key art and animated Kai idle, hero select, pause (with run stats), level-up, results and settings (switches, keyboard vs controller table) share one design system; every menu has a key/pad hint bar. Controller glyphs appear on the HUD when a pad is connected.
- Tooling: `scripts/gen-image.py` (audited Codex bridge wrapper), `scripts/build-ui-assets.py`, `scripts/b06-capture.cjs` (live Playwright capture). See `B06-STATUS.md`.

## B05.1 · premium abilities polish (uncommitted)
- Beam/orb now start at the visible fists (exported per-frame hand anchors, all 8 form x facing cases), bounded facing/aim, synthesised ability audio, persistent Form I presence, compact HUD and controller support (mapped in-game). See art/characters/kai/abilities/B05-1-STATUS.md.

## B05 · Kai signature abilities (uncommitted, owner review pending)
- **E Fracture Lance** (beam) and **R Nova Bloom** (sphere): deterministic sim (`src/sim/AbilitySystem.ts`, numbers in `src/content/abilities.ts`), new Beam/Sphere clips in all four directions for Base and Form I, ImageGen-authored VFX, HUD cooldowns. No audio shipped (blocked, see `art/characters/kai/abilities/B05-STATUS.md`).

## 0.0.1 · 12 Nov 2026 · B00 first source delivery
- Added React/Vite/TypeScript/Phaser4 project source and modular authoritative simulation.
- Implemented Kai debug arena, 8-way normalized movement, collision obstacles, automatic weapon, Q pulse, Shift dash and resource-driven temporary Flarebound F.
- Added two enemy behaviors, seeded wave director, XP drops/pickups, eight functional upgrades with three-choice level freeze, HUD and pause/death/retry loop.
- Added local settings and best-run persistence with corrupted storage fallback.
- Added clearly labeled procedural synthetic sprite placeholders, content and animation manifests, Vitest + Playwright source tests and docs.
- **Verification caveat:** npm registry unavailable within build sandbox. Full install/typecheck/build/browser were not executed here; see QA-REPORT.md.

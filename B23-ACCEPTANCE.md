# B23 acceptance ledger (honest state per closure row)

Legend: **DONE** = implemented + wired + automated test + stills inspected (never watched at real speed, never heard). **PARTIAL** = real part shipped, remainder named. **NOT DONE** = not attempted this run (needs new original art / Blender re-export / audio production / hardware). Nothing is owner-approved.

| ID | Row | State | Evidence / what is missing |
|---|---|---|---|
| 01 | Baseline + gap inventory | PARTIAL | Findings reproduced from source: F05/F06/F07/F12 confirmed at HEAD `eebe694`; fixed below. Rig sources found (`art/characters/*/`, Blender `F:\Blender\blender-5.2.3-windows-x64`). Before/after capture packs not produced. |
| 02 | Real hair animation system | PARTIAL | Skinned tip deformation, roots pinned, mask from crown colours, springs (`hairRig.ts`, `hairLayer.ts`, `scripts/b23-hair-anchors.py`). Tests `b23-hair.test.ts`, `e2e/b23-hair.spec.ts`, magnified stills `test-results/b23-hair-*`. NOT authored separated hair parts: the deformation is a warp of baked pixels, so large sweeping motion / front-lock vs back-mass layering is limited to ~2-3 game px at the tips. |
| 03 | Hair + clothing, 11 appearances | PARTIAL | Hair: all 11 x 4 facings have anchors (>80% frames) and style profiles. Clothing/sash/coat motion: NOT DONE (needs separated cloth parts). |
| 04 | Voidheart long silver hair + coat | PARTIAL | Voidheart has its own wider/lower hair profile (`vex_void`). Coat tails/scarf independent motion NOT DONE. |
| 05-07 | NORTH tuft, rear anatomy, rear attack poses | NOT DONE | Needs rear studies, new rig parts, Blender re-export. |
| 08 | Motion profiles / blends | PARTIAL | Vex now has 3 motion styles (11 total). Found and fixed: sim `player.vx/vy` is 0 outside Stillfire, so body lean never worked; renderer now derives velocity. No real-speed review. |
| 09-10 | Hand anchors, 176 directional cases | NOT DONE | Existing `strike-matrix.test.ts` unchanged. |
| 11 | Vex authored motion identity | PARTIAL | Explicit `vex`, `vexf1`, `vexf2` keys and FX namespace, own motion styles. Still reuses Ren's rig state machine and choreography (`rigOf`). |
| 12 | Vex identity / Voidheart split layer | DONE | No alias; upper, legs, anchors resolve one appearance (`EntityRenderer.syncHero`); e2e `b23-coop-art.spec.ts` incl. Vex+Ren in one party. |
| 13 | Composited contour | PARTIAL | Per-game registration; still two per-sprite filters (union-silhouette compositing NOT DONE). |
| 14 | State-reactive contour palettes | PARTIAL | idle/run/dash/charge/release/settle driven by `AuraTracker`, eased; brighter silver Voidheart. Hold/hurt/parry states not separate. |
| 15 | No passive blazes | DONE | `PASSIVE_AURA=false` untouched; nothing re-enabled. |
| 16 | Seven reveals | PARTIAL | Each form emits its own reveal event at the real commit frame (`FormSystem.emitReveal`), drawn as its own signature and with its own sound (Stillfire near-silent); test `b23-advanced-fx.test.ts`. No authored hold/crouch/hair choreography, no camera/light work, first-vs-repeat difference not added. |
| 17 | Immutable provenance | PARTIAL | `HitOpts.slot` set by producer; Kai kit slots corrected; clone = no slot; test `b23-provenance.test.ts`. Unique cast IDs / owner / form-at-emission / `damageEnemy` audit NOT DONE. |
| 18 | New Kai kit attribution | PARTIAL | Q/E/R mapping for scatter, meteor, flare, crucible proven; per-form counters across all 12 slots not exhaustively tested. |
| 19-25 | Per-hero kit VFX art/geometry | NOT DONE | Kit effects unchanged this run (only floor scars and slot attribution). |
| 26-31 | Branches, recipes, relics, ultimates, pairs, resonance | PARTIAL | Every one of the 24 branches, 12 legendaries, 8 relics, 6 pair attacks and 4 ultimates now has its own in-world signature (shape + palette; the two branches of a skill differ in shape) and its own sound recipe, driven by the sim's own source id at the real position/radius (`advancedFx.ts`, `b22Sfx.ts`, `BranchSystem`). These are procedural line-art accents, NOT authored animated sprites; mechanics/tradeoffs were not re-verified; Resonance has no dedicated link visual. |
| 32-35 | Bestiary + bosses | PARTIAL | Enemy bodies now act through windup/strike/recover (archetype-specific anticipation, stretch, slump; `attackPose`). No new frames, shield art, boss part/phase animation or death staging. |
| 36 | Four arena material families | PARTIAL | Four distinct floor-scar materials, no Ashen/Gloam fallback, `b23-materials.test.ts`. No new ImageGen decals for Aetherfall/Paradox (tinted generic marks). |
| 37 | World response to events | PARTIAL | Kai kit + Vex marks added. Light plan not extended. |
| 38 | Eight premium outfits | NOT DONE | Still palette recolours. |
| 39 | Seven initiate edge details | DONE (as palette variants) | Earned -> equippable per form -> contour palette; save migration; Archives UI; `b23-cosmetics.test.ts`. Same shader, different colours/flow/roughness (no new art). |
| 40-41 | Finishers, crests art, victory poses | PARTIAL | Owned adept finishers play a form-specific flourish on boss/elite kills (cosmetic, throttled, `b23-cosmetics.test.ts`). Crests equippable. NO new crest art, NO victory poses. |
| 42 | Mode crests wired | PARTIAL | Equip/remove + persistence done; no HUD display. |
| 43 | 21 mastery criteria tests | NOT DONE | |
| 44 | Cosmetic migration safety | DONE | Forged aura/crest ids dropped; idempotent; tested. |
| 45 | Per-fighter namespaced assets | DONE | Every fighting hero (local partner or online room) loaded under explicit keys; outfit skin only for its hero; e2e for 7 pairings. Same-hero pair shares one outfit. |
| 46 | Online snapshots | PARTIAL | Kai kit state in snapshots with explicit clear (`b23-snapshot.test.ts`). Cinema, boss parts, protocol version bump NOT DONE. |
| 47-48 | Prediction, split screen | PARTIAL | Online: bounded movement-only prediction (unacked-input replay on the authoritative position, blended reconcile, hard snap, off during casts/dashes/reveals; `net/prediction.ts`, unit-tested). No RTT-scenario measurement, no real two-client latency run. Split screen NOT DONE. |
| 49 | Co-op integration | PARTIAL | Local co-op art + animation fixed (owner-reported). Two-client online / rejoin NOT run. |
| 50 | Server records | NOT DONE | |
| 51 | New audio | PARTIAL | ~70 new procedural synth recipes (one per signature entry + seven reveals); never listened to, no loudness measurement, no new music/boss/enemy audio. |
| 52 | UI sweep | PARTIAL | Archives gained Edge Details + crest equip; not screenshot-swept at all sizes. |
| 53-54 | Perf, full routes, soak | NOT DONE | |
| 55 | Save regression | PARTIAL | Unit tests green; no real-save fixtures run. |
| 56 | Manifest/provenance | PARTIAL | `scripts/b23-hair-anchors.py` reproducible; hair table committed. |
| 57 | Web release candidate | see STATUS | |
| 58-59 | Installer / Electron online | see STATUS | |
| 60 | Limitations stated | DONE | This file + STATUS. |
| 61 | Docs | PARTIAL | CHANGELOG, PLAN, ACCEPTANCE, STATUS added; older status files not rewritten. |
| 62 | Independent audit | NOT DONE | |

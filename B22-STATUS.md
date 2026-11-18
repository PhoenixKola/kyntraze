# B22 STATUS: Shattered Horizons

Legend: **VERIFIED** = automated test + (where marked) a real-browser run by me. **IMPLEMENTED** = code exists and is wired, exercised only by unit tests. **INTERIM** = works but uses procedural stand-in art. **NOT DONE** = not built. **OWNER REVIEW** = needs a human eye/ear. Nothing here is pushed or deployed. Local commits only.

## What I did and did not do (read this first)
* **Art pass done with ImageGen** (owner request): 6 realm enemies, 7 bosses, Choir voice + Sovereign part sprites, Vex base / Riftbound / Voidheart portraits (generated against a cleaned Kai style reference and checked to match Kai/Ren/Sora's chunky pixel style), 8 outfit cards (real outfit names, each against its own hero reference), 2 realm floor textures, 4 props, icon sheets for 8 relics, 4 ultimates, 12 legendaries, 24 branches. Sources + prompts + PROVENANCE in `art/b22/source`; runtime PNGs in `public/art/b22` via `scripts/b22-art-gen.py` and `scripts/b22-art-process.py`. Verified in a real browser (floor, props, enemies, Castellan, Regent, Sovereign, hero card, story portraits, picker/Archives icons wired).
* **Still not art-complete:** Vex **in a run** is still the Ren animated rig tinted (no 4-direction animated Vex sheets, no Blender rig); enemies/bosses are single-pose sprites (flip, bob, hit-flash) not animated cycles; outfits are cards (in a run an outfit is palette/aura only); branch and legendary icons are thematic and assigned by order, not one bespoke icon per name; no per-ultimate animation, no illustrated story panels or cinematics.
* Audio and Expedition/Endless playtests were reviewed by the owner (removed from the open list).
* No physical controller was available; pad paths are code + unit-level only.
* Online co-op was verified between two real browser contexts and a local server. Public hosting, outside-network latency, and an Electron client joining are **not** verified.
* `npm run build` and `npm run desktop:smoke` passed after the B22 changes; the NSIS installer was not rebuilt.

## Test evidence (run by me, this session)
* `npx tsc -b` clean. `npx vitest run`: 540+ tests, all green except none failing at last run (music-file test fixed by the synth). New suites: `b22-core`, `b22-enemies`, `b22-bosses`, `b22-ascension`, `b22-vex-modes`, `b22-save`, `b22-coop`, `b22-server`.
* Playwright (own config on port 5199 because 5173 serves a different project on this machine): `b22-hud`, `b22-modes`, `b22-coop`, `b22-online` pass; full existing e2e suite: 72/79 passed on the first run; of the 4 failures one was a real layout regression I fixed (title buttons on ultra-wide), two were load-flaky and pass alone, and 3 prod-smoke tests are skipped by design (need a production server).

## The 32 items
| # | Item | State | Notes |
|---|---|---|---|
|01| Mode architecture | **VERIFIED** (unit) | RunPlan, seed contract, 7 modes. Classic exact. Mode Select UI verified in browser |
|02| Two arenas | **INTERIM** | sim, hazards (Shatterfall, Reality Fold), collision, minimap verified; art procedural; no arena-specific audio beyond the music cue |
|03| Six enemies | **VERIFIED** sim / **INTERIM** art | one test per signature mechanic; drawn as procedural shapes, no per-enemy sound or death art |
|04| Two arena bosses | **VERIFIED** sim / **INTERIM** art | Castellan, Regent: phases, armour, exposure, echoes, decoys tested |
|05| Eight relics | **VERIFIED** (unit) | trigger + cap tests; no relic icons, effects drawn as flash rings |
|06| 20-min Expedition | **VERIFIED** (unit) | acts, shrine, elite wave, boss, relic offers tested; never played for 20 real minutes; balance untested by a human |
|07| Vex hero | **INTERIM** | full kit in sim; art = Ren rig tinted violet; no ImageGen/Blender sprites, portraits or anchors |
|08| Vex kit | **VERIFIED** (unit) | parry/riposte/shift/seal/forms tested |
|09| Two Vex forms | **IMPLEMENTED** | mechanics + unlock path tested; no distinct form art/aura/reveal |
|10| Vex story + Oathkeeper | **IMPLEMENTED** | 3 chapter plans + boss + unlock grants tested; story panels added (`b22/story.ts`, `StoryPanel`): text-only intro before each chapter and outro on victory, skippable (Esc/pad B), replayable from Archives > STORY; browser-verified. **No voice, portraits or illustrated panels** (art NOT DONE) |
|11| Three Void bosses | **VERIFIED** sim / **INTERIM** art | Mirror Tyrant, Chronophage, Hollow Choir |
|12| Sovereign | **VERIFIED** sim / **INTERIM** art | parts, shield dependency, 3 phases, collapse pulse; no cinematic |
|13| Boss Rush | **VERIFIED** | 3 tracks, intermission, practice mode, Mode Select; no per-track art |
|14| Endless | **VERIFIED** (unit) | continue after Classic win, cycles, extract/push on UI. No 30-minute memory soak run |
|15| 24 branches | **VERIFIED** | each pair measured against base via real casts; picker UI built; no per-branch VFX art beyond generic flashes |
|16| 12 legendaries | **VERIFIED** (unit) | recipe flow + effect per recipe; one recipe corrected (Zero Convergence needed Afterglow) |
|17| 4 ultimates | **VERIFIED** (unit) | R-when-full, HUD gauge; no bespoke animation/audio per ultimate |
|18| 7 mastery paths | **IMPLEMENTED** | counters + judging + persistence tested; Archives UI; mastery reward art/finishers NOT DONE |
|19| Form effects/portraits | **NOT DONE** | |
|20| Daily/weekly | **VERIFIED** (unit) | UTC ids, deterministic, local records only |
|21| Challenge variants | **VERIFIED** (unit) | 8 modifiers with sim effects |
|22| Records + verified boards | **VERIFIED** (server) | local records per mode/hero/arena/party; server boards only for server-simulated runs; friends = needs account service |
|23| Eight outfits | **NOT DONE** (art) | data, unlocks, equip + Archives UI exist; no outfit sprites |
|24| Extra cosmetics | **IMPLEMENTED** data / **NOT DONE** art | |
|25| Local co-op | **VERIFIED** sim + browser | two fighters, shared XP queue, revive, tether; shared camera only; no pad testing |
|26| Online co-op | **VERIFIED** locally | real sockets, two browser contexts, reconnect, hardening tests; hosting DEPLOYMENT REQUIRED |
|27| Six pair attacks | **VERIFIED** (unit; two in depth) | real-event gated; no bespoke art/sfx |
|28| Resonance | **VERIFIED** (unit) | |
|29| Co-op bosses | **VERIFIED** (unit) | linked anchors, Choir harmony rule |
|30| Premium ImageGen/Blender art, cinematics | **NOT DONE** | see above |
|31| Meta/menus | **IMPLEMENTED** | Mode Select, Online lobby, Archives hub, pickers, tooltips |
|32| Migration/QA/release | **PARTIAL** | additive save + tests done; Electron allowlist + preload written, untested in a built installer; no perf profiling |

## Owner-requested fixes (verified in a real browser)
* Contract text no longer overlaps the clock panel (moved inside it).
* Ability tiles: hover/focus tooltip (name, key, description, real numbers) and click-to-use.

## Remaining work
Animated Vex sheets (Blender rig) and animated enemy/boss cycles; bespoke ultimate/relic VFX; illustrated story panels; controller testing (two pads); hosting + outside-network test; Electron installer rebuild + smoke; code signing (installer is unsigned).

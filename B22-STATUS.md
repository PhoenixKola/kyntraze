# B22 STATUS: Shattered Horizons

Legend: **VERIFIED** = automated test + (where marked) a real-browser run by me. **IMPLEMENTED** = code exists and is wired, exercised only by unit tests. **INTERIM** = works but uses procedural stand-in art. **NOT DONE** = not built. **OWNER REVIEW** = needs a human eye/ear. Nothing here is pushed or deployed. Local commits only.

## What I did and did not do (read this first)
* I did **not** use ImageGen or Blender. Every new visual (two arenas, six enemies, seven bosses, Vex, eight outfits, portraits, icons, cards) is either procedural (Phaser Graphics, see `src/game/render/realmWorld.ts`) or a tinted stand-in. Production art is **NOT DONE**.
* Music is original and procedurally synthesised (`scripts/b22-synth.py`, 9 cues + co-op stinger); SFX are runtime-synthesised (`src/game/audio/b22Sfx.ts`). **I have not listened to any of it.** Peak/format checks only. OWNER REVIEW.
* I did not play any run as a human. "Verified" means tests and short scripted browser runs.
* No physical controller was available; pad paths are code + unit-level only.
* Online co-op was verified between two real browser contexts and a local server. Public hosting, outside-network latency, and an Electron client joining are **not** verified.
* The Electron installer was not rebuilt or smoke-tested after the B22 changes.

## Test evidence (run by me, this session)
* `npx tsc -b` clean. `npx vitest run`: 540+ tests, all green except none failing at last run (music-file test fixed by the synth). New suites: `b22-core`, `b22-enemies`, `b22-bosses`, `b22-ascension`, `b22-vex-modes`, `b22-save`, `b22-coop`, `b22-server`.
* Playwright (own config on port 5199 because 5173 serves a different project on this machine): `b22-hud`, `b22-modes`, `b22-coop`, `b22-online` pass; full pre-existing e2e suite result is in the final report below.

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
|10| Vex story + Oathkeeper | **IMPLEMENTED** | 3 chapter plans + boss + unlock grants tested; **no story panels, dialogue, subtitles or skip/replay UI** (NOT DONE) |
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

## Remaining work (needs you or hardware)
ImageGen + Blender art for everything INTERIM; human playtests for balance and feel; listening review of music/SFX; a real 20-min Expedition and a 30-min Endless soak; story panels; controller testing (two pads); hosting + outside-network test; Electron installer rebuild + smoke; code signing (installer is unsigned).

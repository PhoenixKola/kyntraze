# B09 status: arenas, environments, arena hazards (+ B08.1 repairs)

Baseline: local main @ 2ff0e13 (B08, not pushed). Design: B09-DESIGN.md. Art rules: ART-BIBLE.md sections 11-12. History: B07/B08 status files unchanged.
**Not production-ready: the art/feel/audio sign-off is the owner's; motion, audio listening, real GPU and a physical controller are all unverified (below).**

## What shipped (local, uncommitted until the commit below)
- **Two playable arenas**, each with its own palette, floor, rim wall, props, decor, ambience, hazard and selection card (all ImageGen art, 15 ImageGen sheets in total, none rejected; see `art/arenas/*/source/PROVENANCE.md`):
  - **The Gloam Circuit** (flagship, enhanced): same obstacle layout and spawn as before (tested), new baked rim/corner walls, six low-relief solid props at the *exact* old footprints, cables/grates/cracks/scorch/stripes/puddle decor, a core-glyph landmark, motes + fog. Hazard **Lane Surge**: the two teal lanes (a 1664x84 and a 1152x84 rect) flood with a crimson/bone striped surge.
  - **The Ashen Reliquary** (new): warm charcoal stone with verdigris inlay, own rim strips, six solid prop types (4 hazard pylons, fallen column, sarcophagus, statue, monolith, 2 braziers), rubble/ash/bones/cracks, reliquary-sigil landmark. Hazard **Pylon Pulse**: one of four pylons charges (3-frame pylon + glow) and discharges a 150 px ring.
- **Hazard system** (data in `src/content/arenas.ts`, director `src/sim/ArenaHazards.ts`): warn 1.6 s / 1.5 s -> active window (0.6 s / 0.35 s) -> fade; new `rect` hazard shape and `active` window in the existing hazard contract; feet-disc ground contract (edge + 6 px); i-frames/dash dodge; one hazard at a time; first at 45 s, interval 14 s -> 9 s by minute 10; never starts in a boss's committed attack (+2.5 s quiet); deterministic; frozen by pause; rebuilt by retry. Shape + timing + sound communicate danger (no hue-only cue, no strobing: stripe march 60 px/s, 2 Hz variant swap).
- **Arena selection** (B06 language): `ArenaSelect` full-screen with two illustrated cards (name, blurb, mood chips, difficulty, hazard cue, SELECTED state, locked-state support unused), reached from a preview strip on the hero screen; mouse, keyboard (Tab/Enter/Esc) and controller (D-pad/A/B) navigation; choice persists in the save (`arena`, older saves default to Gloam); `?arena=` overrides; HUD clock and loading screen show the arena name. Selection determines the arena the run loads and the collision/hazards it uses; Retry reloads the same arena.
- **Atmosphere:** 24 drifting motes (3 parallax layers) + one fog layer, normal blend, removed by Reduced Effects; 8 synthesised sounds (`public/audio/arenas`): surge warn/fire, pylon charge/pulse, 4 very quiet ambient accents (one every 14-30 s, render-side random, silent while other sounds play). No soundtrack is claimed.
- **Wall art:** arena `inset` (50 / 64 px) now defines the collision margin so characters never walk through the wall face (Gloam's margin grew by 28 px from the old 22 - the one collision change).

## B08.1 repairs
| Item | Result |
|---|---|
| A1 Seraph double bolts | Baked bolts/orbs removed from frames 5 and 9 by connected-component removal (identity kept pixel-exact; not regenerated), sheet repacked. Live 960x540 and 640x360 Seraph volley/ring release stills show each bolt once (`art/arenas/review/live/*boss-seraph-release*`); sheet before/after in `art/bosses/review/b09-seraph-fix/`. Frame 9 body shifted 1 px in x (anchor centroid). |
| A2 Seraph fringe | Magenta edge pixels 12,664 -> 1,127 over the sheet (remainder is the intended magenta accent colour); checked on dark and bright backdrops at 6x; **not re-checked on a bright arena region at 1x by eye** beyond the stills. |
| A3 Kai readability | i-frame flicker no longer dims Kai (0.56 -> 0.86 alpha) and a 0.1 s white flash marks the hit; the ground ring brightens/pulses while hit-invulnerable and heartbeats at low health; a soft dark cut-out behind Kai grows with bodies within 70 px. Stills at 70 mobs (12 bruisers: far beyond live caps), hit, low health and Form I show Kai clearly at 960x540 and 640x360. Gameplay damage rules untouched. |
| A4 elite performance | **Profiled, not "fixed".** CDP CPU profile: JS < 10 % of main-thread time (91 % is native/GL); WebGL spy: ~11 draw calls/frame at both 0 and 115 enemies, so it is not draw-call count. Cost is software rasterisation spread across all sprites (hiding any single category changes ~0-5 ms; all enemies ~13 ms). No safe code change produced a measurable gain, so none was shipped. B09's own additions cost ~2-3 ms at 960x540 in software GL (ambience: measured by `?noamb=1`); I cut motes 36 -> 24. |
| A5 boss gameplay review | Both bosses run in both arenas (e2e: boss bar, telegraph, hazards/bolts, no errors) and screenshots show telegraphs reading on both floors. Arena hazards never start during boss attacks (tested). No severe bug found; **feel/balance still unreviewed by a human**. |

## Validation executed
| Check | Result |
|---|---|
| `tsc -b` | pass |
| `npm run build` | pass |
| `vitest run` | 16 files, **199 passed** (13 new in `arenas.test.ts`: content, Gloam layout unchanged, per-arena collision, determinism, rect contract, Lane Surge warn/hit/once/dodge/pause/boss-quiet, Pylon Pulse boundary/dash/order) |
| `playwright test` | **41 passed** (11 new in `e2e/arenas.spec.ts`: selection by mouse/keyboard/mocked pad at both sizes incl. layout fit, persistence, chosen arena loads, both arenas x both viewports with hazard hit/once/real-keys dodge, both bosses and an elite wave per arena, beam+sphere Base and Form I per arena, retry keeps arena). Two earlier failures were my own test bugs (headless GL warnings counted as errors; dodge tests reading the wrong hazard / spawning inside a prop) and one real layout bug (640x360 stacked the cards in one squashed column; fixed to two columns) |
| Live real-keyboard hazard proof (`evidence-hazard-*.json`) | Both sizes: Gloam stand-still hp 78 vs keyboard dodge 100; Ashen stand-still hp 80 vs dodge 100 |
| Perf, **SwiftShader software GL, not a GPU** (`perf-*.json`, avg ms) | 960x540 Gloam: 60/90/115 normal mobs 23.6 / 27.4 / 30.5; **realistic caps (exactly the live caps of aegis 2, cantor 2, bruiser 3, ranged 4 + pursuers, 90 total) 30.0**; elite stress (1/6 aegis + 1/6 cantor... far above caps) 39.8 / 46.7 / 55.7. Ashen within ~2 ms of Gloam. 640x360: normal 16.9-17.3 (vsync-capped), realistic 17.3 / 16.9, elite stress 19.5-28.5. Noisy (vsync steps of 16.7 ms). B08's 960x540 boss+115 figure was 20.8, so **B09 is a few ms heavier in software GL at 960x540**; unmeasured on real GPU |
| Evidence | `art/arenas/review/live/evidence-*.json`: commit, tree diff hash, file hashes, viewport, observed/not-verified. Screenshots palette-quantised (128 colours) for repo size. Clips (webm) outside Git: `C:\Users\totik\kyntraze-b09-clips\video\` (two files: one per resolution, both arenas, keyboard-driven wander with enemies) |

## NOT verified (honest)
- **Real-speed motion: UNVERIFIED** (clips recorded, nobody watched them; software-GL timing is not real time). Tile shimmer/crawl while scrolling over a full run is therefore **not judged**; stills show no seams.
- **Audio: heard by no one**; hazard and ambient sounds only had programmatic checks. Whether the ambient accents are pleasant, or even audible over combat, is an owner call.
- **Real GPU: not measured. Physical controller: not tested** (mocked pad only).
- Hazard and arena balance (intervals, damage 22/20, lane width 84, radius 150) are first-pass numbers; the lane surge crossing the spawn point and a 1664 px lane are design choices to feel out.
- Seraph fringe/bolt fix not reviewed by an artist at 1x in motion.
- Ashen floor and props were never compared with Kai Form I during real combat (only still crowd/boss captures).
- Known art notes from the art forks: Gloam rim repeats one 256 px panel (no variety); Gloam corner wall thickness only approximately matches the rim; Ashen ash decals are pixel-blocky; surge strips are 283/300 px (not 128) so stripe periods tile.
- No second *candidate* shortfall: both arenas are complete, but only two exist; no unlock economy was invented.

## Owner review (priority order)
1. Play: `npm run dev`, then `/?qa=1&arena=gloam` and `/?qa=1&arena=ashen` (add `&encounter=warden|seraph|cantor|aegis|mixed`, `&debug=hit`; console `__KYNT_QA__.arenaHazard()` triggers the next hazard). Normal path: title -> Play -> arena strip -> choose -> Deploy.
2. `art/arenas/review/live/`: `select-*`, `{gloam,ashen}-{1-calm,2-props,3-corner,4-mobs}`, `*-hazard-*`, `*-crowd-*`, `*-boss-*` (960x540 and 640x360).
3. `art/arenas/gloam/review/`, `art/arenas/ashen/review/` (prop sheets, mocks, seam test), `art/bosses/review/b09-seraph-fix/`.
4. Clips: `C:\Users\totik\kyntraze-b09-clips\video\*.webm`. Audio: `public/audio/arenas/*.wav`.

## Git
Local commit only (see log); not pushed; B08 commit 2ff0e13 intact.

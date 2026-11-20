# B23 status

**VERDICT: BLOCKED / PARTIAL.** Most of the B23 brief is original-art production (separated hair/cloth parts, rear anatomy, 8 outfit geometries, 7 reveals, ~100 ability/branch/relic/pair effects, bestiary and boss animation, audio) and was not produced in this run. The rows that were done are real and tested; see `B23-ACCEPTANCE.md` for every row's honest state. This is not a `FINAL CANDIDATE`. Nothing here has been watched at real speed, heard, or owner-approved.

## What changed (version 0.23.0, all on `main`)
- **Owner-reported co-op bug (fixed).** Two causes: (1) BootScene loaded sprite sheets only for the primary hero, so a Ren/Sora/Vex partner fell back to the flat dev placeholder body; (2) `Simulation.stepParty` never stored P2's input for a standing fighter, so the partner renderer never saw movement and never played Run. Every fighting hero (local partner or online room) is now loaded under explicit keys; per-slot input is stored. Vex has real `vex`/`vexf1`/`vexf2` keys (no Ren alias), so Vex+Ren can share a party. A Kai partner of a non-Kai runner draws its own ability layers. Outfits only re-skin their own hero. e2e: `e2e/b23-coop-art.spec.ts` (7 pairings).
- **Living hair (partial, F01).** Hair tips deform from real motion with roots pinned (idle sway, run trail, cast/hurt kicks), all 11 appearances x 4 facings. Implemented as a mask-skinned warp of the shipped pixels because separated hair parts do not exist. Honest limits: motion is a few sheet pixels at the tips, not sweeping locks; no layered front/back hair; clothing does not move.
- **Renderer velocity bug (found).** The sim keeps `player.vx/vy` only for Stillfire's glide, so the existing body-lean spring never worked for any other form. The renderer now derives velocity from displacement (affects lean and hair).
- **Hit provenance (partial, F07).** Damage carries its producer's slot (`HitOpts.slot`); Kai Scatter/Meteor count as Q, Rising Flare as E, Crucible as R, clone strikes as no slot; late hits no longer inherit whatever cast is live.
- **Online snapshots (partial).** Kai kit state (surge, shots, clone, pillars, crucible) is in snapshots and cleared on expiry.
- **Contour (partial, F04).** Edge intensity/flow follow idle/run/dash/charge/release/settle with easing; per-game shader registration; brighter silver Voidheart edge. Still two per-sprite filters.
- **Mastery cosmetics (partial).** The seven edge details and all crests can be equipped (save restore + forged-id rejection + Archives UI); edge details are palette/flow variants of the form's contour.
- **Arena materials (partial).** Four distinct floor-scar materials, no Gloam/Ashen fallback, Vex and Kai-kit marks. No new decal art for Aetherfall/Paradox.
- Perf regression introduced and fixed in-run: the first hair layer did a full-frame readback + upload per tick and made the software-GL arena e2e miss casts; it now caches pixels/masks and redraws only on change.

## Second pass (same version)
- Per-entry in-world signatures + sound for all 24 branches / 12 legendaries / 8 relics / 6 pairs / 4 ultimates (procedural line art, not authored sprites).
- Seven per-form reveal events (signature + sound) at the real commit frame; adept finishers on boss/elite kills; enemy windup/strike/recover body acting; online movement prediction.
- Still NOT done: NORTH/rear anatomy and attack poses, authored reveal choreography, a Vex-specific animation set, the eight real outfits, victory poses, boss part/phase animation, split screen, real audio production. These need original art/Blender/audio work that was not produced; nothing was faked as done.

## Third pass (owner follow-ups)
- **Co-op P2 HUD (owner-reported):** the second fighter now has their own ability row (dash/Q/E/R/F with real cooldown sweeps, form and charge state, correct per-hero icons and names), inside the P2 panel; works for a local second fighter and an online partner view.
- **Split screen:** automatic left/right split when the partners are far apart (setting "Co-op split screen"), hysteresis, shared view on narrow canvases.
- **Reveal accents:** per-form floor light + bounded camera accent at the commit; quiet for Stillfire/Voidheart.
- **Victory pose:** win screen shows the hero's real stance for the form reached; equipped crest named.
- **Audio:** all 120 synthesised recipes measured offline (peak <= 0.62).
- **Results screen fixes (owner-reported):** Endless button text no longer cropped; Marks Earned panel fully visible on short windows.
- **Skipped on request:** real-speed playback, performance run, two-client online test (owner will run on hardware).
- **Not done, needs Blender / ImageGen:** Vex-specific clips (the Vex sheets are recolours of Ren's rig per form and direction; new clips need all of them rebuilt and reviewed frame by frame), authored reveal poses, seven new victory animations, seven crest artworks, outfits, rear anatomy, boss part art.

## Tests (second pass; the third pass is re-verified in the final block at the end of this file if present)
Final HEAD, one worker, dev server (`playwright.b23.config.ts`, port 5199 - this repo's own):
- `npx tsc -b`: clean. `npx vitest run`: 683 passed, 1 skipped (a first run under load had 7 timeouts, the immediate rerun was clean).
- `npm run build`: passes (2m09s, chunk-size warning only).
- Full e2e: **117 passed, 2 failed, 3 skipped** (122 tests, 33.6 min). The 2 failures (`arenas` retry, `progression` B18 960x540) were caused by a Phaser "texture not found" warning from my hair layer on scene teardown; fixed afterwards and both re-passed individually, but the full suite was NOT re-run after that fix.
- Earlier with 2 workers the heavy software-GL specs timed out under load; use `--workers=1`.
- Installer: `release/KYNTRAZE-FRACTURE-RUSH-Setup-0.23.0.exe`, 276,968,448 bytes, SHA256 `2619b29662325ec80c9fe3bdd5d9bf4bf6ed56a3eef4c87939d84d23af5a98b4`, built from the commit before the final doc commit, unsigned. `npm run desktop:smoke` PASS (two launches, profile persisted, origin `app://kyntraze`). NOT done: installing it, upgrade-over-existing-data, uninstall, online join from Electron, hash check against the final commit.
- Not run: real-speed playback, audio listening, GPU/frame-time measurement, 30-minute soak, two-client online latency run, physical controller.

## Hazard incident (disclosed)
While cleaning up a comparison worktree, `git worktree remove` followed a `node_modules` junction and deleted part of the real `node_modules` (`.bin`, `.vite`, `@babel`, ...). Restored with `npm rebuild --ignore-scripts` and `npm install --ignore-scripts` (40 packages re-added from the lockfile, no version changes). Typecheck, unit tests and dev server verified afterwards.

## Not done, and the minimum needed
Rows 05-07, 11 (full), 16, 19-35, 38, 40-41, 43, 47-48, 50-51, 53-54 need original art/Blender/audio production and real-speed review. Installer/Electron online smoke: see below.

## Final block (supersedes the test numbers above)
Verification was deliberately scoped by the owner: no full e2e re-run; quick general checks only.
- `npx tsc --noEmit`: clean. `npx vitest run`: all pass after fixing one real defect found by the run (Kai Form II north manifest carried `form-i`; fixed in the rig output and the published manifest). `npm run build`: passes.
- Full e2e was last run at 117 passed / 2 failed / 3 skipped (before the hair-teardown fix; the two failures re-passed individually). It was NOT re-run after the later art/north/crest/outfit/death-strip changes, by owner decision.
- Installer rebuilt: `release/KYNTRAZE-FRACTURE-RUSH-Setup-0.23.0.exe`, 285,024,345 bytes, SHA256 `eea7979ffdf066983f685b4078704281da52815f36e040a35f0f37072e9a0fee`, unsigned. `npm run desktop:smoke` PASS on rerun (the first attempt timed out on a cold first launch, canvas not up in 58 s; both launches passed on the retry).
- Added since the last block: rear-view (NORTH) strike poses for all 11 sets with refreshed hand/head anchors; seven crest artworks; outfit head accessories (ImageGen); boss damage decals; 12 enemy death strips; Vex bespoke clips + own effect set; reshaped reveals and Victory poses; boss phase-shift surge (scale pop and burst on phase change).
- Honest remaining gaps: outfits are head accessories only (no shoulder/gauntlet/tabard geometry); rear-view boots/heels are the previous art (only the strike pose changed); realm bosses and enemies already had windup/strike/hurt/death frame cycles and now a phase-shift surge, but no new bespoke boss attack animation set was authored; classic enemies use pose-based attack reads, with only death sequences newly authored; audio is synthesized, never listened to; real-speed playback, performance and two-client online tests were not run (owner will do them).

- Update: Kai, Ren and Sora effect sprites are now new ImageGen sets too (`scripts/b23-herofx-slice.py`): Kai's 10 base-ability sprites, Ren's 10 `rs_*` + 8 `ra_*`, Sora's 12 `sm_*` + 8 `sl_*`, each fitted to the old slot sizes. Not regenerated: the Kai Form I/II/III sprite folders and Ren/Sora's small `vfx_*`/legacy sprites. Checked by vitest and the heroes/co-op e2e only, not eyeballed in motion.

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

## Tests
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

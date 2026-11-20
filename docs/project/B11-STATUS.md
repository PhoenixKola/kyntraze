# B11 status: complete survival loop (+ B10.1 premium upgrade icons)

Baseline: main @ f8c9cb5 (B10, pushed). Targeted verification only; **balance and feel are first-pass, human play is unverified.**

## B10.1: upgrade icons
All 25 icons were replaced. The B10 monochrome tinted glyphs were flat; the new set is full-colour inventory art (rules in ART-BIBLE 9): articulated gauntlet fist / afterimage fist, faceted lance emitters (crystal, ember, frost, conductor coil), Nova orbs in cradle / ice / ground ring / twin orbit, armoured heart, faceted heater shield with crest, mending ring, winged heart, winged boot, chevron blades, magnet, vein rock, charged cell with terminal + glass + core, flame heart, ember crystal. 6 ImageGen sheets (category per sheet), all accepted first pass; cards, header art and diamond container unchanged (medal 48 -> 52 u, icon allowed to overflow the diamond, tag/name offsets adjusted; 640x360 medal 40 px). Build strip and pause menu use the same PNGs.
Evidence: `art/progression/review/b10-1/` (25-icon contact sheet, before/after at both sizes, cards at both sizes) and `art/progression/review/b11/icons-*` (the circled Plating / Surge Cell / Heavy Hand as real cards, hover, mixed rarity).

## B11: the run
Target: **15-18 min for a successful run**. Simulated bot wins at 15.6-15.8 min (both arenas).

| Time | Feeling | Content |
|---|---|---|
| 0-3 | growing | Shardwalkers, Rift Stalker 0:07, Channeler 1:10; budget 3-24; first level-up ~25 s |
| 3-8 | build forming | Sentinel 2:30, Cantor 4:20, Aegis 5:30 (all with caps); budget 24-42; breather dip every 80 s |
| 8:00 | first major test | **Fracture Warden**; mob budget halved/capped, hazards pause around its attacks; on defeat: +40 % HP, 25 s recovery (budget x0.35) and a **guaranteed Rare+ reward pick** |
| 9-14 | power vs pressure | second Cantor/Aegis slots (12-13 min a third), budget 42-66, hazards at their tightest cadence |
| 14:30 | warning | red banner "THE NULL SERAPH APPROACHES"; budget x0.4 for the last 30 s |
| 15:00 | finale | **Null Seraph** (HP 1100 -> 2800 so the fight is ~1-2 min with a mature build); adds under a threat cap of 22 |
| win | | Seraph dies -> VICTORY |

- **Director** (`encounters.ts`, `EnemyDirector.ts`): replaces the fixed spawn clock with a **threat budget** (cost per enemy: 1/1.5/2/5/6/7) over a time curve, with breathers, finale quiet and post-boss recovery; batch size grows 1-3. Enemy intro times unchanged, so no two new threats arrive together. Kill XP scales `1 + t/400`; XP curve unchanged from B10.
- **Victory lifecycle**: `winRun` only from `running`, once; on the same tick all hazards, boss shots and mobs are cleared, and the sim stops (phase `victory`), so nothing can damage Kai and a pending level-up cannot overlap. A ~3.6 s render beat (flash, rings, "THE FRACTURE HOLDS" banner) precedes the results (`markVictoryShown`, same pattern as the death hold). Defeat is unchanged. Retry keeps arena and seed; Title unchanged.
- **Results**: victory/defeat share one card: points (victory bonus + per boss + time bonus), time, level, eliminations, bosses n/2, arena, seed, **build strip**; victory adds ImageGen key art + crest.
- **HUD**: clock panel gains a run rail (fill toward the finale, Warden and Seraph markers) and a next-event hint (`FRACTURE WARDEN 3:05`, turns red under 30 s, then `DEFEAT THE SERAPH`). Level-up screen reads "BOSS REWARD" for the Warden pick. Ability cooldown sweeps follow Ember Core's form cooldown too.
- **Upgrade integration fix**: Lance Afterburn's extra pulses now keep the beam visual alive (previously damage outlived the beam).

## ImageGen
6 icon sheets (`art/progression/source/icons/`), victory key art and crest (`.../victory/`; key used the title art as a style reference). 8 accepted, 0 rejected; the violet orbs initially vanished in the extractor (channel-based magenta key), fixed by a distance key, not by regenerating.

## Validation run
- `tsc -b`, `vite build`: clean. Unit: 225 pass (new `run.test.ts`: run plan, budget/breathers, finale announce, victory lifecycle incl. no damage after, double-win/defeat guards, bridge hold, Warden reward, **simulated full run on both arenas**, icon asset shape). e2e (survival-loop, controller incl. pad level-up, hud-responsive, menus, pause-resume, boot, bosses, arenas, enemies): see final report.
- Live smoke (`scripts/b11-capture.cjs`, QA hook forces time/boss kills) at 960x540 and 640x360, both arenas: level-up -> Warden spawn/intro -> kill -> reward pick -> finale banner -> Seraph HUD -> kill -> victory beat -> results -> Retry (same arena, fresh run) -> forced defeat -> results; zero console errors. Evidence in `art/progression/review/b11/`.

## UNVERIFIED
Human difficulty and fun over a full 15+ min run (the bot is invulnerable and does not dodge); Seraph fight length/fairness with real builds; build-path feel (Lance / Nova / mobility / Drive stats are unit-tested, not played); normal-speed motion, audio (no victory sting was added), real GPU, physical controller; 640x360 readability under a full late-run crowd.

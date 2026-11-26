# B32 Ability identity, VFX and combat feedback: status

Baseline: B31B (`278612e`). Done solo, no subagents. This batch is a **targeted** overhaul: the moves the owner named plus a contact-aware identity layer for the other three heroes. It is not a rebuild of all 11 kits; the matrix below says exactly what was touched and what was left alone.

## Owner changes in this batch
- **Fly key:** solo flight toggles on **Left Alt**. Co-op (P1 Left Ctrl, P2 Right Ctrl) and the controller (BACK / SELECT) are unchanged. Ctrl no longer flies in solo. Alt keydown is default-prevented so the browser menu bar never steals focus. Hero Select, the loading tip, the controls list and the tooltip say ALT.
- **`?unlock=all`:** untouched and verified (every form is available; the Alt test runs with it).

## What changed
| Area | Change |
|---|---|
| Cometheart Q, Meteor Drive | **REBUILD (presentation) + tuned numbers.** Anticipation: lightning coil and gold sparks during a longer 0.20 s windup, and the lane is drawn as the three real beat points (same step, reach and wall rule as the sim) with the final point in red. Each beat: a lightning arc along the actual step, a start-point snap, afterwards a contact star + directional claw + sparks **only when the beat connected**. A whiff plays a thin air swipe, a different sound, no star and no hit-stop. The final beat adds a pause, a wider reach, a ground crack, a shock ring and a lasting end-point ring, and a finisher hit-stop. HUD Q tile shows 1/3, 2/3, 3/3 while it runs. Cannon and Dragonfang untouched. |
| Stillfire Q, Silver Echo | **UPGRADE (mechanic kept).** The double is now a pale silver silhouette with an additive halo (not a dark body that looked like a second player), spawns 72 px away (was 46) with a mirror-split flash, a streak from Kai, shards and a floor sigil. Live: sigil under its feet, life ring (true remaining lifetime), flicker in the last 1.5 s, target reticle on the enemy it has locked, a lock line when it switches target, a silver cut from the double to the target on every strike (only when it deals damage). Destroyed (glass shatter and falling fragments) and expired (wisp dissolve) are different looks and sounds. |
| Base Q, Surge Step | **UPGRADE.** Activation ring, radial lightning and coil at the boots; while live: speed streaks only while moving, idle crackle, a steady boot ring that blinks in the last 1.2 s, a blue spark where a boosted auto lands, a collapse ring and sound on expiry. |
| Sora | Azure Prison: crystal bars rise for the real field lifetime and shatter into flying shards on the sim's shatter (impact only if something was caught). Heaven's Spear: a warning ring and beam per mark, then a falling spear, star and shards on landing (heavy only on a hit). Celestial Collapse: converging shard streaks for the pull, star + ring + radial shards on the burst (finisher hit-stop only if enemies were caught). V hit and fizzle accents. |
| Ren | Cyclone release shock front + cinders (muted if it caught nothing). Scarlet Rampage: claw gashes on contact, crater, shock front and cross-slash on the slam. Crimson Catastrophe: a spectral fist per real hit (alternating sides), a crater and shock front each, a larger final. V hit/miss accents. |
| Vex | Perfect counter (white-violet flash + ripple + hit-stop) is now visibly different from an ordinary guard (small ripple). Relocation: a void tear at both the entry and the exit. Execution / Severance cuts and the reconnect shock, Oath seals as runic circles that break on detonation, base Oathbreaker Seal, riposte. |
| Audio | New recipes: Meteor Drive beat 1 / 2 / final / whiff, Echo lock / strike / shatter / fade, Surge end. Chosen from the sim's reported hit count (`b32Sfx`). |
| Gameplay numbers | Meteor Drive only: beatEvery 0.17 to 0.20, step 62 to 76, windup 0.12 to 0.20, reach 64 to 70, new finalReach 104 (the last beat's reach), finalPause 0.10, recover 0.20 to 0.24, iframes 0.09 to 0.11, knock 90/140 to 96/170. Total cast about 0.83 s to 1.14 s, cooldown still 11 s. Echo spawn distance 46 to 72. No other balance edits. The sim only gained extra events (`meteor_beat` carries start point and beat index; `clone_target`, `clone_strike`), no new RNG. |

## Per-kit matrix (honest)
KEEP = reviewed, left as it was. UPGRADE = contact/miss/state layers added on the existing art. REBUILD = new mechanic presentation.
| Kit | Autos | Q | E | R | V / OD / flight / shift |
|---|---|---|---|---|---|
| Kai base | KEEP | UPGRADE (Surge Step) | KEEP | KEEP | KEEP |
| Kai Flarebound | KEEP | KEEP (Scatter Burst) | KEEP (Rising Flare) | KEEP (Crucible) | KEEP |
| Kai Cometheart | KEEP | **REBUILD** (Meteor Drive) | KEEP (benchmark) | KEEP (benchmark) | KEEP |
| Kai Stillfire | KEEP | **UPGRADE** (Silver Echo) | KEEP | KEEP | KEEP |
| Ren base | KEEP | KEEP | KEEP | KEEP | KEEP |
| Ren Crimson | KEEP | UPGRADE | UPGRADE | UPGRADE | UPGRADE (V hit/miss accents only) |
| Sora base | KEEP | KEEP | KEEP | KEEP | KEEP |
| Sora Azure | KEEP | UPGRADE | UPGRADE | UPGRADE | UPGRADE (V hit/fizzle accents only) |
| Vex base | KEEP | UPGRADE (guard vs perfect) | KEEP | UPGRADE (seal) | KEEP |
| Vex Riftbound | KEEP | UPGRADE | UPGRADE | UPGRADE | KEEP |
| Vex Voidheart | KEEP | UPGRADE (Legion cut) | UPGRADE | UPGRADE | KEEP |

Not changed in this batch (still to review in play, candidates for B33/B34): all automatic strings, Ren / Sora / Vex base-form moves, Overdrives, flight takeoff and landing art, form-shift art, pair combinations, V charge-tier orbs, new cast poses (no new authored poses were made: the existing clips are reused, and no rig work was attempted).

## Assets and provenance
Six ImageGen sheets (`art/b32/*.png`, prompts `*-prompt.txt`, `PROVENANCE.md`, run with `art/b32/run.py`): Kai lightning, Kai impact, Kai silver, Sora crystal, Ren force, Vex void. All six were inspected and kept. `art/b32/process.py` keys the black background to alpha, drops stray fragments from the neighbouring cell on the single-object crystal sprites, and writes 36 webp sprites (1.3 MB) to `public/art/b32/`. Runtime: `src/game/render/b32Fx.ts` (one pooled image layer, hard cap 140 live sprites, plus one Graphics layer), loaded in BootScene, driven from EntityRenderer for the primary renderer only (the co-op partner renderer draws nothing twice). Blue Surge/Sora variants reuse `blueKey` recolours of the gold sprites. Nothing in the layer writes sim state or consumes RNG.

## Evidence
- `npm run typecheck`, `npm run build` clean. New unit tests (`src/tests/b32-abilities.test.ts`, 9): Meteor Drive start points, beat indices, final flag and wider final reach, whiff reports zero hits, cast duration and cleanup; Echo target and strike events carry real positions and only fire on damage, destroyed vs expired; every new event has a recipe; Left Alt solo, Ctrl and Right Ctrl in co-op, Alt prevented. Existing kai-kit, b25, b29.1 menu tests updated for the ALT label and pass. Full `npm test`: 68 files passed, 1 skipped, no failures.
- Browser (`e2e/b32-abilities.spec.ts`, headless Chromium, real key presses, QA hooks only for the form and a crowd): strips for 12 moves (Meteor Drive, Silver Echo, Surge, Prison, Spears, Collapse, Cyclone, Rampage, Catastrophe, Guard, Execution, Oath) with no page errors; the Alt-fly test at 960x540 with `unlock=all`.
- Frame time (`e2e/b32-perf.spec.ts`, Meteor Drive spam into a 40-enemy crowd, headless **software GL**, 1280x720): with the layer avg 37.4 ms / p95 50.0, without it 37.3 / 50.0 over 188 frames. No measurable cost from the layer; the absolute figure is software rendering, not the target machine.

## Not verified (owner checks)
- **No human watched any of this at normal speed in a visible window.** The strips are headless screenshots taken by a script, used for my own inspection only; they are not a visual approval. Timing, weight and hit-stop feel need your eyes.
- **Audio was not listened to** (synthesized recipes, never auditioned) and no controller was tested.
- Local co-op partner ownership and two online clients were not exercised in a browser for these effects; the layer is event-driven from the same events the clients already receive (no wire change, protocol unchanged). The Meteor Drive lane and Echo reticle read the local fighter's state, so a co-op partner's cast draws its arcs and contact but not the lane preview.
- Reduced Effects: shake, hit-stop and spark particles are suppressed, rings, lanes, arcs and contact frames stay. Not visually reviewed.
- No new authored cast poses and no ImageGen HUD icon animations were made; the Q tile uses the existing icons plus the new 1/3 stage text.
- Event Horizon pull/erupt, Phantom Legion copies and the V charge tiers were not redesigned.
- One opt-in Living Fractures run and one Chronicles mission were not re-run for regression beyond the unit suite.

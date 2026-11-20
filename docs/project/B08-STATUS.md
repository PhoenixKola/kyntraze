# B08 status: elites, two bosses, B07.1 corrections

Baseline: main @ 0652364 (B07, pushed). B07 history lives in B07-STATUS.md and is unchanged. Design numbers: B08-DESIGN.md. Tuning table: `src/content/encounters.ts` (+ per-enemy intros in `enemies.ts`). Art rules: ART-BIBLE.md section 11.
**Not production-ready: art, animation feel, audio and balance are all awaiting owner review (see "NOT verified").**

## B07.1 corrections
| Issue | Root cause (measured in source) | Fix | Proof |
|---|---|---|---|
| A1 slam telegraph vs damage | Ring drawn at `e.y+14` with a 1.04x edge; damage tested raw `(x,y)` distance `<= R + Kai body radius (17)`. Kai's feet are drawn at `p.y+24`. So the hit zone was ~10 px shifted in y and ~17 px larger than the visible edge | One ground contract (`src/sim/Ground.ts`, `content/enemies.ts`): ring centred on the owner's feet (`y + 0.6 r`), drawn exactly at R; Kai is hit iff his **feet disc (6 px)** overlaps R. No silent shrink; the old +17 is gone because it was a body radius applied to a floor shape | `bosses.test.ts` "B07.1 A1": centre, inside edge, outside edge, edge+foot, body-radius case, dash i-frames, all 8 facings, impact time == windup end. Live: `art/bosses/review/live/boundary-*-debug-*.png` (debug overlay white = visible edge, green = edge+foot disc) |
| A2 contact damage in windup | `updateContactDamage` ignored `mode`: body contact (and a slam) could both hit during a telegraph | Decision: body contact is a threat in `move`/`recover` only; suppressed in `windup` and in non-contact `strike`s; lunge/dash/ram strikes use the attack's damage; boss strikes use their own ground checks. `damagePlayer(src)` records what hurt Kai (`state.lastHit`). Post-hit i-frames 0.65 s and dash i-frames 0.25 s unchanged | 5 tests: no damage in windup for every enemy, walking and recovering contact still hurt, lunge labelled, slam never double-hits, i-frames |
| A3 crowd readability | Kai (depth 10) is above all enemies but tiny and unmarked in a 115-swarm | Thin dark-edged white/cyan (gold in Form I) ground ring under Kai, above enemy bodies, below Kai (`arenaArt.ts`). Spawn counts/caps, enemy opacity and difficulty untouched | Visual only, see NOT verified. Crowd + boss at 115 renders (no errors) |
| Flipbook stiffness | n/a | Not rebuilt: I did not watch B07 motion, so no change was justified (principle: only fix what is observed) | NOT verified |
| A4 | HUD cooldown maxima fixed (3.2/8.5/7/16/form) | Untouched: no boss interacts with them | N/A |

## Elites (reuse the B07 pipeline and AI primitives)
- **Aegis Shardbearer**: frontal shield (+-65 deg of the horizontal facing the sprite shows): Kai's auto shots / Fracture Lance do 20 %; Q Impact and Nova Bloom (area) and rear hits do 100 %. It turns only after Kai stayed behind it 0.6 s, so flanking works. Ram: 0.75 s brace + lane telegraph, 0.40 s dash, 1.0 s recovery with the shield DOWN. 10 XP.
- **Rift Cantor**: hovering caster; rally aura r 190 (non-boss enemies +30 % speed, attacks recover 25 % faster; the ring is drawn at the exact radius); fires a 3-orb fan (slow, 175 px/s) after a 0.9 s telegraph with three aim lines. 8 XP.
- Intro 260 s / 330 s (director, caps 1 then 2), never during a boss.

## Bosses
- **The Fracture Warden** (1600 HP): Rupture Chain (5 / 8 delayed ground bursts, ring telegraph >= 0.9 s), Cleaving Sweep (120 deg cone R 170, locked at windup start, exposed 1.4 s recovery, +35 % damage), Pillar Rush (lane = its own footprint, tracks then locks, wall stops it, exposed). Phase 2 at 50 %: roar (invulnerable 1.8 s, hazards cleared, harmless shove), 8 ruptures in two lanes, double (front + back) sweep leaving two safe side wedges, double rush, windups x0.9.
- **The Null Seraph** (1100 HP): Prism Volley (5 / 7 bolts, aim tracks then locks), Phase Blink (destination sigil, intangible, reappears and fires; phase 2 leaves a delayed burst), Orbit Bloom (14-bolt ring with 3 marked gaps), phase 2 adds Spiral Torrent. Bolt cap 160.
- Arrival (WARNING banner, invulnerable intro), phase transition (ring + shake), defeat (3-frame collapse, shock ring, XP ring: 96 / 80 XP, `bossesDefeated++`; hazards and boss bolts are removed on death). No meta-progression was invented.
- HUD: nameplate + bar top-centre under the clock (emblem, name, phase, SHIELDED / EXPOSED chip, 50 % tick, damage trail). Verified not to overlap health, clock, pause or ability tiles at 960x540 and 640x360 (`e2e/bosses.spec.ts`).
- Director: bosses at 480 s and 690 s (provisional, one at a time, mobs capped at 40 and no elites while one lives). QA: `/?qa=1&encounter=warden|seraph|aegis|cantor|mixed`, `&debug=hit`, `window.__KYNT_QA__.encounter(id)`. Dev server only; saves and settings untouched.
- Accessibility: Reduced Effects (existing setting) removes camera shake and the hit brighten; telegraphs always remain. There is no separate shake-intensity slider (not added: the existing toggle is the real control).

## ImageGen usage (honest)
9 ImageGen sheets accepted, 0 rejected, first draft each (Warden A/B + fx; Seraph 1/2 + fx; Aegis; Cantor; Seraph fx; Warden fx; see `art/bosses/source/PROVENANCE.md`). Weak points were *post-fixed by script*, not by regenerating: cone/ring masks were computed exactly in `scripts/build-warden-art.py`. Everything is an authored **pose flipbook** (16 frames per boss, 8 per elite), **no Blender rig** was used or needed, east-facing + mirrored west only. `scripts/repack-boss-sheets.py` repacks the strips into a 4x4 grid (rerun it after rebuilding warden/seraph). `scripts/gen-image.py` default Codex path is stale (set `CODEX_BIN`); not edited.
Known art defects (from the art forks and my stills review): Seraph outline keeps a faint magenta tint; the `volley_release` / `ring_release` frames have bolts baked in, so a bolt is drawn twice for ~0.15 s; Warden sweep-windup frame lifts the blade rather than drawing it back; boss frames with big FX streaks widen the cell.

## Audio
28 synthesised WAVs (`art/bosses/audio/synth_b08.py`, REPORT.md): peak -3 dBFS, 0 clipped, all fade to silence, no loops. Bosses use their own voice slot (4 voices, audible to 1100 px, level 0.78) so a crowd cannot bury them; warnings are shorter than their windups (tested). Everything goes through the existing mute/pause/death handling.

## Validation executed (this working tree, software GL)
| Command | Result |
|---|---|
| `npx tsc -b --pretty false` | pass |
| `npm run build` | pass |
| `npx vitest run` | 15 files, **186 passed** (41 new in `bosses.test.ts`, incl. boundary matrix, shield, rally, scheduling, determinism, each boss attack, phase, defeat, pause, form change, retry, assets, audio mapping) |
| `npx playwright test` | **30 passed** on a clean full re-run after the fix (an earlier run had 2 real failures: the boss bar overlapped the clock by 2 px at 640x360; fixed with a floor). Includes mocked-pad and real-keyboard boss dodges, pause mid-telegraph, defeat cleanup |
| Live (real keyboard) dodges, `dodge-*.json` | Warden sweep / rupture / rush and Seraph volley at 960x540 **and** 640x360: standing still **was hit** (hp 70-88), correct sidestep **took 0** (hp 100), after the telegraph appeared. Also in e2e. Mocked pad: stick walks out of a rupture lane |
| Perf, **SwiftShader software GL, not a GPU** (`perf-*.json`) | boss + 30/60/90/115 mobs: 960x540 avg 16.8 / 16.9 / 18.1 / 20.8 ms; 640x360 16.7 flat. Elite mix 30-115: 960x540 20.6 / 28.7 / 38.5 / 47.2 ms (!), 640x360 16.7 / 17.2 / 21.2 / 23.4 ms. Peak 73 enemy bolts + 25 shots, <= 5 hazards, 0 console errors. The elite series is a deliberate stress case: 1/6 of the crowd are cantors (aura ring each) and 1/6 aegis, far above the real caps (<= 2 each), so it overstates real cost; it still shows aura rings + orb fans are the heaviest thing drawn. Real-GPU cost unmeasured |
| Evidence | `art/bosses/review/live/evidence-*.json`: commit, working-tree diff hash, hashes of changed sources/art, viewport, OBSERVED / NOT VERIFIED. Clips (webm) are **outside Git** in `C:\Users\totik\kyntraze-b08-clips\video\` |

## NOT verified (do not read as passed)
- **Real-speed motion: UNVERIFIED.** I cannot watch video. webm clips exist but nobody has watched them; software-GL frame pacing is not real time. Stills only.
- **Audio: heard by no one.** Only programmatic checks (peak/clipping/length) and fake-context event mapping tests.
- **Physical controller: NOT TESTED** (mocked pad only). **Real GPU: NOT MEASURED.**
- **Balance/feel**: HP, damage, timings, intro times (480 s / 690 s) are first-pass numbers; I played them only through scripted dodges, not a human fight. Fairness is mechanically proven for the telegraph/hit boundary, not for "fun".
- Crowd readability of Kai at 115 + boss: a ring was added and looked clearer in stills, but the owner must judge it in motion (the pre-existing 0.56 alpha hit-flicker on Kai still makes him grey in a pile).
- Flipbook walk/attack transitions of the B07 enemies and the 16-frame bosses at real speed.
- Seraph volley/ring bolt art overlaps with baked-in bolts (see defects).
- Owner aesthetic approval of every new asset.

## Owner review paths (priority order)
1. Play: `npm run dev`, open `/?qa=1&encounter=warden`, then `seraph`, `aegis`, `cantor`, `mixed` (add `&debug=hit` to see damage boundaries).
2. `art/bosses/review/live/` : `warden-*`, `seraph-*`, `aegis-*`, `cantor-*`, `mixed-*`, `boundary-*-debug-*`, `perf-115-boss-*` at 960x540 and 640x360.
3. Clips: `C:\Users\totik\kyntraze-b08-clips\video\*.webm` (local only).
4. Art sheets: `art/bosses/review/warden-0*.png`, `seraph-*.png`, `elites-*.png`.
5. Audio: `public/audio/bosses/*.wav`.

Review screenshots in `art/bosses/review/live/` were palette-quantised (128 colours) to keep the repo lean (art/bosses ~41 MB: 18 MB ImageGen sources, rest review); inspect the sheets under `art/bosses/review/` for full-colour art.

## Git
Not pushed. Staged/committed only on request (the B07 "push on completion" instruction does not carry over: the review gate above is open).

# B07 — Premium enemy production: status

Baseline: main @ 16c7efc (Phaser 4.2.1, `RULES.maxEnemies` 115). Kai Base/Form I sprites, abilities, Kai audio, controller/keyboard mapping, saves, progression, menus, HUD and arena are untouched (only additive hooks).

## Roster (original "Fracture" family, ImageGen art)
| Id (unchanged) | Name | Role / behaviour | Telegraph → release → recovery |
|---|---|---|---|
| `pursuer` | Shardwalker | hunched patrol, advances, **lunges** when within 96 px | 0.50 s windup (aim locked at once) → 0.22 s lunge → 0.50 s recover; cd 3.2 s |
| `flanker` | Rift Stalker | fast, weaves then commits to an arc; coils back and **dash-slashes** | 0.38 s (tracks, then locks) → 0.30 s dash → 0.55 s; cd 3.6 s |
| `bruiser` (new) | Breaker Sentinel | slow, 150 HP, **ground slam** ring r = 104 px centred on itself | 0.95 s windup (ring fills to its edge exactly at impact) → instant hit → 1.0 s open recovery |
| `ranged` (new) | Shard Channeler | keeps 230–340 px, strafes, backs off, **fires a crystal bolt** (235 px/s, sim entity) | 0.80 s (aim tracks, freezes for the last 45 %) → bolt → 0.5 s recover; cd 2.9 s |
Intros (director, seeded): flanker 7 s, ranged 70 s (cap 2→4), bruiser 150 s (cap 1→3): one new threat at a time. Pursuer/flanker IDs, XP values and spawn roll order are preserved. Content: `src/content/enemies.ts`; sim: `src/sim/EnemyAiSystem.ts`, `EnemyDirector.ts`, `GameState.ts` (attack state machine `mode/modeT/attackCd/aim*`, `enemyShots`, `enemyEvents`), `CombatSystem.ts`.

## Art and animation method (honest)
- Per enemy: one ImageGen sheet (gpt-6.1-sol via the audited bridge, Kai frame as style reference) = 8 cells: move ×4, windup, release, hurt, death. Extracted by `scripts/build-enemy-art.py` (border flood-fill key, one ground line + body-centroid anchor, LANCZOS to 2x authored size, baked pale-rose rim) → `public/art/enemies/<kind>.png` + `<kind>.json` (frame size, origin/feet anchor, fps, named clips, event frames). Shown at 0.5 like Kai.
- Telegraph/impact art: `telegraph` + `circles` ImageGen sheets → `public/art/enemies/fx/`.
- **Not Blender rigs.** The Animation Bible allows choosing the method per creature; these are complete authored pose sets (flipbook), not skeletal rigs, and are not described as rigs. Idle = move frame 0 (+ runtime hover/bob for the caster, shake/lean on windups).
- **Facings: east + mirrored west only.** No north/south drawings exist, so none are advertised. Silhouettes are not left/right-asymmetric in gameplay-critical ways (bruiser stripe/pauldron asymmetry flips, accepted).
- Death: separate pooled "ghost" sprite (frame 7 + burst) for 0.6 s after the sim removes the enemy — it cannot collide or damage.
- Rejected/iterations: first pass of each sheet was kept (no discards needed); the flat-ellipse ring/shockwave from the first telegraph sheet were replaced by a true-circle sheet because an ellipse would not match the circular hit test.

## Combat feel
Hit flash + 0.11 s hurt pose + 0.12 s stagger slow (not on the bruiser), soft separation so crowds read as individuals, y-sorted depth below Kai, radius-scaled contact shadows, hit/death sparks, slam camera shake (off with Reduced Effects), distance- and voice-capped enemy audio. Enemy bolts pass through Kai while invulnerable (dash i-frames are a real dodge).

## Audio
11 original sounds synthesised from scratch (`art/enemies/audio/synth_b07.py` → `public/audio/enemies/`, `loudness.json`, peak −3 dBFS, 0 clipped). Warnings are shorter than their windup. Mix: level 0.5 vs Kai, silent beyond 620 px, ≤ 6 enemy voices, 45 ms per-sound gap, through the existing master/mute/phase handling (`abilityAudio.ts`). No enemy "hurt" sound (no hurt event; deliberately avoided crowd noise).

## QA actually performed
| Check | Result |
|---|---|
| `tsc`, `npm run build` | pass |
| Vitest | 145 tests incl. 18 new in `src/tests/enemies.test.ts` (content, seeded determinism, intro times/caps, telegraph-before-damage for all four, bolt resolves exactly once, dash i-frame pass-through, no attack after death, one XP orb, 30/60/120 Hz parity, events bounded, assets, audio mix) |
| Playwright e2e | 23 (3 new in `e2e/enemies.spec.ts`: all four render + telegraph shown, bolt drawn/death ghost then clean, 115-enemy crowd no errors) — 3 consecutive full passes. `workers: 2` added: with 4 workers under software GL the controller spec's load stalled |
| Live play, real keyboard, QA hook only for placement | `scripts/b07-capture.cjs` at **960×540 and 640×360**: lineup poses, solo encounter per archetype (timelines in `review/live/solo-timeline-*.json`), mixed crowd Base and Form I with beam + Nova Bloom, 60/90/115 crowds |
| Telegraph precedes damage (960×540 run) | pursuer windup→hit 0.73 s; flanker 0.68 s; bruiser windup→slam 0.97 s (≥ 0.95); ranged bolt launched 0.8 s after telegraph; dodge by real keys: walking out of the slam ring → HP 100/100; sidestepping the bolt → 100/100 |
| Perf (**SwiftShader software GL, not a GPU**) | 960×540: avg 16.7/16.9/18.2 ms at 60/90/115 enemies (p95 16.7/16.7/33.3); 640×360: 16.7 ms flat. Frame times are vsync-capped software numbers, not hardware performance; sprites == enemies in every sample; 0 console errors |
Evidence is under `art/enemies/review/` (`01–04` identity/contact sheets; `live/` screenshots and JSON). Stills show poses, not motion.

## NOT verified / open (do not read as passed)
- **Real-speed motion: UNVERIFIED.** I did not watch any clip; stills and sim timelines only. No normal-speed MP4 is supplied (mp4/webm are git-ignored).
- **Audio: heard by no one.** Decode/play paths are tested with fakes; sound-design approval is the owner's.
- **Real GPU, physical controller:** not tested (mocked pad e2e only; no enemy-specific controller work was needed).
- Flipbook stiffness: walk cycles are 4 generated poses; judge feel in the owner review. Possible polish: more move frames for the flanker, a second hurt pose.
- Owner aesthetic approval of the enemy art is pending (the B07 brief asked for owner review before commit; the owner explicitly asked to push on completion, so it is pushed with this gate **open**).
- Difficulty table (B08–B11) and capture manifests (B08+) are not part of B07; the intros above are a first pass, not tuned balance.
- Q/Fracture Lance/Nova Bloom/Form I damage enemies through the unchanged `damageEnemy`; covered by the existing ability tests plus the live mixed-crowd captures, not by new per-ability enemy tests.

## Blender Skills assessment
Repo: https://github.com/arjun988/blender-skills (current HEAD at time of this write-up: 904f095, 2026-11-06; the review itself was done earlier in this project, read-only). **No worthwhile additions** — its skills target 3D/BlenderMCP workflows, nothing improves our 2D ImageGen → sprite pipeline. Nothing installed, executed or changed.

## Game Studios repository — selective review
Repo: https://github.com/Donchitos/Claude-Code-Game-Studios (HEAD at write-up: abc0de7, 2026-11-09; reviewed earlier, read-only). Adapted (owner-approved, lightweight, no framework): (1) a short art bible → `ART-BIBLE.md` (from its `/art-bible` idea); (2) a compact difficulty phase table for B08–B11 (from `/balance-check`); (3) per-capture evidence manifests with OBSERVED / NOT VERIFIED / N/A for B08+ (from `/gate-check`/`/qa-plan` evidence discipline). Caveats: 49-agent orchestration and hooks are overhead and a security surface. **Verdict: KEEP AS REFERENCE.** Read-only; no B07 or pipeline change came from it other than the art bible document.

## Files
New: `ART-BIBLE.md`, `B07-STATUS.md`, `art/enemies/` (source sheets + prompts + PROVENANCE.md + reference + audio synth + review), `public/art/enemies/`, `public/audio/enemies/`, `scripts/build-enemy-art.py`, `scripts/b07-capture.cjs`, `scripts/b07-review-sheets.py`, `src/game/render/enemyRenderer.ts`, `src/tests/enemies.test.ts`, `e2e/enemies.spec.ts`. Changed: content/sim files above, `EntityRenderer.ts` (delegates enemies), `BootScene.ts`, `atlasRegistry.ts`, `abilityAudio.ts`, `arenaArt.ts` (shadow size), `ArenaScene.ts` (QA `enemyStats`), three test fixtures, `playwright.config.ts`, e2e HUD timeouts. Old B00 enemy placeholder PNGs remain in `public/art/placeholders/` unused.

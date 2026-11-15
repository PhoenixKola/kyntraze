# Changelog

## B07 · premium enemy production
- Four enemies with ImageGen art and 8-frame pose sheets: Shardwalker (`pursuer`, lunge), Rift Stalker (`flanker`, dash-slash), Breaker Sentinel (`bruiser`, telegraphed ground slam) and Shard Channeler (`ranged`, dodgeable crystal bolt). Sim-owned attack state machine, enemy projectiles and events; seeded director introduces ranged at 70 s and bruiser at 150 s under live caps.
- New `enemyRenderer.ts` (pooled sprites, telegraph markers drawn from the sim timeline, death ghosts), 11 original enemy sounds, `ART-BIBLE.md`, `B07-STATUS.md`, review proofs in `art/enemies/review/`. Tests: +18 unit, +3 e2e; e2e now runs 2 workers (software-GL load stalls with 4).

## B06 · premium readability, arena, HUD and menu foundation (+ B05.2 corrective pass)
- Readability: thin pale rim filter on Kai, contact shadows for Kai and enemies, floor light pool and halo (gold in Form I), enemies dimmed one tier, arena floor rebuilt from an ImageGen tile set (`art/ui/source`, 8 plates, baked once into a single texture, darkened one value tier + rim vignette, teal inlay lanes as landmarks).
- HUD: portrait + HP (damage trail, low-HP pulse) + thin XP + Drive/Form bar with threshold tick; centred clock + kills; icon ability tiles with a clockwise cooldown sweep, seconds readout, key or pad glyph; compact pause. One `--u` unit scales 960x540 to 640x360 with legibility floors.
- Menus: title with generated key art and animated Kai idle, hero select, pause (with run stats), level-up, results and settings (switches, keyboard vs controller table) share one design system; every menu has a key/pad hint bar. Controller glyphs appear on the HUD when a pad is connected.
- Tooling: `scripts/gen-image.py` (audited Codex bridge wrapper), `scripts/build-ui-assets.py`, `scripts/b06-capture.cjs` (live Playwright capture). See `B06-STATUS.md`.

## B05.1 · premium abilities polish (uncommitted)
- Beam/orb now start at the visible fists (exported per-frame hand anchors, all 8 form x facing cases), bounded facing/aim, synthesised ability audio, persistent Form I presence, compact HUD and controller support (mapped in-game). See art/characters/kai/abilities/B05-1-STATUS.md.

## B05 · Kai signature abilities (uncommitted, owner review pending)
- **E Fracture Lance** (beam) and **R Nova Bloom** (sphere): deterministic sim (`src/sim/AbilitySystem.ts`, numbers in `src/content/abilities.ts`), new Beam/Sphere clips in all four directions for Base and Form I, ImageGen-authored VFX, HUD cooldowns. No audio shipped (blocked, see `art/characters/kai/abilities/B05-STATUS.md`).

## 0.0.1 · 12 Nov 2026 · B00 first source delivery
- Added React/Vite/TypeScript/Phaser4 project source and modular authoritative simulation.
- Implemented Kai debug arena, 8-way normalized movement, collision obstacles, automatic weapon, Q pulse, Shift dash and resource-driven temporary Flarebound F.
- Added two enemy behaviors, seeded wave director, XP drops/pickups, eight functional upgrades with three-choice level freeze, HUD and pause/death/retry loop.
- Added local settings and best-run persistence with corrupted storage fallback.
- Added clearly labeled procedural synthetic sprite placeholders, content and animation manifests, Vitest + Playwright source tests and docs.
- **Verification caveat:** npm registry unavailable within build sandbox. Full install/typecheck/build/browser were not executed here; see QA-REPORT.md.

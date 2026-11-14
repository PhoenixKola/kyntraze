# Changelog

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

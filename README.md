# KYNTRAZE: FRACTURE RUSH · Batch 00 Starter

> **Provisional game title.** Standalone, original horde-survival game. This package is the **playable Batch 00 prototype**, not a finished MVP, approved hero art or trademark-cleared product.

## Requirements

- Windows 10/11 (or Linux/macOS), Node.js **20.19+** (Node 22 LTS recommended), npm **10+**, Chrome/Edge/Firefox.
- An internet connection for the **first dependency installation**. The built app has no backend or hotlinked game assets and works offline when served locally. (Opening `dist/index.html` directly via `file://` is unsupported; use `npm run preview`.)
- The ZIP should contain `package.json` and `package-lock.json`. **Dependency lock metadata was authored in a registry-restricted sandbox, not verified by a full `npm ci`; see `QA-REPORT.md`.** If `npm ci` fails due to a lock-tree consistency error, use `npm install` once to regenerate the full lockfile, then `npm ci` should work on subsequent clean installations. This is an explicit Batch 00 verification caveat, not a promise of a passing install.

## Launch on Windows PowerShell

```powershell
cd kyntraze-fracture-rush
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. On a machine where a validated full lockfile has been generated, `npm ci` is preferable to `npm install`.

## Tests / builds

```powershell
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

The browser E2E suite tests title → select → boot, pause/resume, and three-upgrade selection through a **dev-only explicit `?qa=1` hook**. E2E is not a substitute for playing a normal run with keyboard controls. For deterministic repro add `?seed=1234` to the URL; the hero-select screen also offers a seed text field. Identical seeds are repeatable under identical inputs, timing and game version.

## What is playable now?

- Title → select **Kai** (Ren/Sora explicitly unavailable) → active survival arena.
- Keyboard **WASD / arrow** movement (8-way normalized), Shift/Space dash with invulnerability and recharge, automatic short/mid-range Comet Fists attacks, **Q** impact radial ability, **F** temporary Form I *Flarebound* at 65+ Drive.
- Two debug enemy kinds with scaling seeded spawns, 2D obstacle collision, contact damage and death.
- XP orbs, 3 deterministic weighted upgrade choices per level (8 distinct functional augments), HUD, pause on Esc/focus loss, retry same seed, return home.
- Device-local settings and best-run record, both fail gracefully if `localStorage` is blocked/corrupted.

### First-play tips

Move toward fallen enemies' mint-colored XP crystals. When enough XP accumulates, the arena will pause for a choice. Use Q when enemies close around you and Shift to dodge through danger. The Drive meter grows from strikes and kills: use F after reaching 65 Drive to gain extra attack speed, a second target and movement. Form I drains Drive and reverts automatically.

## Folder ownership

- `src/sim/`: authoritative seeded game simulation and systems, independent of React/Phaser rendering.
- `src/game/`: Phaser scene, input/controller and rendering.
- `src/bridge/`: low-frequency immutable UI snapshot bridge. No React render each enemy frame.
- `src/app/`: React shell and real settings/pause/upgrade/results overlays.
- `src/content/`: declarative early hero, enemy, weapon, form and upgrade definitions.
- `src/assets/` + `public/art/placeholders/`: explicitly **synthetic debug PNGs** and manifest.
- `src/tests/` + `e2e/`: logic and browser regression tests.
- `docs/`: architecture, gameplay rules, content schema, animation contract and next phases.

## Art replacement and responsibility

B00 placeholder PNGs were drawn programmatically from pixel geometry **only for engineering purposes**. They are not the user-approved Kai concept and were not generated with Codex image generation. Do not redistribute them as official game art. At B02/B03: approve a canonical original Kai identity, replace with four-direction original art/rigged frames, create validated animation manifests and test real game-scale locomotion. Codex generates original raster source with supported image tools; Claude Code creates/validates Blender parts, pivots, rigs, frame exports. No paid art API required for B00.

## Notes / scope

The planned full game includes Kai, Ren, Sora (Base + 3 sequential forms each), ~15–18-minute escalating runs, 7 enemy families, bosses, unlocks, original sound and approved animation. **Only Kai Base + temporary Form I and two placeholder enemy kinds exist in B00.** Q and F are playable but E/R, boss content, 18-minute balance, premium animation, control remapping and full production accessibility are **not implemented**.

The default `?seed=` provides stable start RNG, but gameplay inputs and wall-clock timing affect exact event order. No backend, database, account, analytics service or auto-deployment. Nothing is pushed to GitHub by this package.

# Licensing, provenance and clearance status (B20)

**Status: working title, original project, NOT cleared for commercial distribution.** This page records what is shipped and where it came from. It is not legal advice and it does not clear anything by itself; a rights review is required before selling or publicly distributing the game.

## Code and packages
Project code is original. Runtime and build packages (exact versions in `package-lock.json`): Phaser 4.2.1 (MIT), React / React DOM 19.2.0 (MIT), Vite 7.1.12 (MIT), TypeScript 5.9.3 (Apache-2.0), Vitest 3.2.4 (MIT), Playwright 1.56.1 (Apache-2.0), `@vitejs/plugin-react` (MIT), `@types/*` (MIT). Their license texts must be reproduced in any distributed build per each license; this repository does not yet ship a generated third-party notices file.

## Art
- **Characters (Kai, Ren, Sora), enemies, bosses, arenas, UI, icons, portraits, VFX sprites:** generated with OpenAI Codex ImageGen (model `gpt-6.1-sol`) from original prompts, then cleaned, palette-quantised, rigged (Blender parts rigs) and exported by scripts in this repository. Prompts, logs and hashes sit beside the sources (`art/**/PROVENANCE.md`, `prompts/`, `art/fx-b20/`). Ownership and copyright status of AI-generated imagery depends on jurisdiction and on the generator's terms; **confirm this before commercial release.**
- Reference images passed to the generator are the project's own earlier outputs only.
- B20 hero VFX (Sora lance / charge / bolts / aura, Ren slashes / impacts / aura): ImageGen sheets on black, cut by `scripts/b20-extract-fx.py`; see `art/fx-b20/PROVENANCE-B20.md`.

## Audio
- **Music (10 cues) and SFX:** original, synthesised procedurally by scripts in `art/audio/` and `art/characters/*/audio` (numpy-style synthesis; no samples, no third-party recordings). B20 post-processed a subset (Ren punch layer, Sora softening); untouched originals are kept in `art/characters/heroes/audio/originals-b19/`.
- No third-party or copyrighted music or sound is included. Music ships as `.ogg`; the browser must support Ogg Vorbis (not verified in Safari).

## Fonts
No font files are bundled. The UI uses a system stack (Bahnschrift, Segoe UI, Inter, system-ui); the look differs by platform.

## Name
`KYNTRAZE: FRACTURE RUSH` is a working title only. No trademark search has been done beyond a preliminary check. Check WIPO / EUIPO / USPTO / UKIPO / Albanian DPPI and storefront collisions before launch. Hero names and likenesses are original; any resemblance to existing characters is unintended and should be reviewed.

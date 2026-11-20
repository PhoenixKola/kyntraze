# B06 - premium readability, arena, HUD and menu foundation (+ B05.2 corrective pass): STATUS

Evidence: `art/review/b06/` (before/ after/ compare-*.png, sphere-clipping-*), `art/characters/kai/abilities/review/b05-2/`. B05.2 details: `art/characters/kai/abilities/B05-2-STATUS.md`.

## Research applied (web, summarised)
Silhouette is the highest-contrast element and the background sits one value tier lower / flatter; a darker contact shadow grounds characters; health and immediate threats get the strongest contrast and a stable position; a depleting fill / radial sweep reads faster than a number; secondary info is reduced; UI needs backing panels and its own palette separate from gameplay; keep critical UI out of the outer margin; verify at the real low resolution. Applied: rim + shadow + light pool on Kai, darkened/quieted floor, HP bar as the dominant HUD element, clockwise cooldown sweep tiles, panels, margins in one `--u` unit tested at 640x360 and 960x540.

## What changed
- **Readability** (`src/game/render/arenaArt.ts`, `EntityRenderer.ts`): pale rim filter on Kai, ground shadows for Kai and enemies, floor light pool + halo (gold in Form I), enemies tinted one tier down.
- **Arena**: 8 ImageGen floor plates (`art/ui/source/floor.png`, built by `scripts/build-ui-assets.py`) baked once into a single 2200x1600 texture, weighted so vents/hazard/scorch are rare, teal inlay lanes as landmarks, value shading + rim vignette, wall band with teal edge and amber corner brackets, re-lit obstacles.
- **HUD** (`src/app/ui/Hud.tsx`, `ui.css`): portrait + level badge, HP (damage trail, low-HP pulse, segment ticks), thin XP, Drive/Form bar with the 65 % threshold tick and READY/ON states, centred clock + kills, compact pause, five icon ability tiles (ImageGen glyph set, CSS-mask tinted) with clockwise cooldown sweep, seconds, key or pad glyph (RB/LB/A/X/Y/START when a controller is connected). Dev build tag removed from gameplay.
- **Menus**: title (ImageGen key art, animated real Kai Idle strip), hero select (animated Kai), pause (run stats), level-up, results, settings (switches, keyboard vs controller table), shared `HintBar` key/pad legend. Hero-select start button is sticky so it never scrolls off at 640x360.
- **Bug found by the owner and fixed**: the Nova Bloom sphere was clipped into rectangular chunks in some frames (`sphere-clipping-BEFORE-fix.png`). Isolated by bisection: not the hero filter, not the floor layers, not roundPixels; hiding the ADD trail made it vanish. The ADD trail batched with the rotating ADD sphere; the trail now uses SCREEN (`abilityFx.ts`). 12/12 sampled throw frames clean (`...AFTER-fix.png`).
- **Owner requests this session**: head layering (base east/west draw the head in front of the collar) and a Form I aura that hugs the body behind Kai - both done in B05.2 (see its status).

## Validation actually run
typecheck PASS; vitest 125/125; `npm run build` PASS; Playwright e2e 10/10 (hud-responsive rewritten for the new HUD; controller spec now waits for the QA hook after Retry instead of a fixed 400 ms because Retry boot measured ~1 s on this machine, not baselined against HEAD); live Phaser captures (real keyboard, headless Chromium + SwiftShader) at 960x540 and 640x360, all screens + combat, 0 console errors.

## Gates (honest)
| Gate | Status |
|---|---|
| Technical | PASS |
| Stills inspected | YES (title, select, settings, HUD, pause, level-up, results, combat, Form I, sphere sequence) |
| Normal-speed motion watched | **NO** - I inspect stills only; sequence stills are 40-100 ms apart |
| Audio heard | **NO** - decode/start verified only |
| Real controller | **NOT TESTED** - mocked pad only; glyph switching verified by e2e/mock |
| Real GPU | **NOT TESTED** - all captures are SwiftShader software GL; the sphere clipping fix is verified there only |
| Owner approval | pending |

## Known limits
Enemies are still B00 placeholder art (only dimmed). Floor tiles are downsampled from 368 px to 128 px so they are a touch softer than the sprites. Title and menus use system fonts (Bahnschrift on Windows). HUD cooldown maxima for Dash/Impact/Form are hard-coded (3.2/8.5/6 s) and drift if upgrades change them. EAST/WEST sphere hold still shows mostly the lead arm (see B05.2).

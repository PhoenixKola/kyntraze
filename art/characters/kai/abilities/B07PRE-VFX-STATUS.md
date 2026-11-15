# B07-pre VFX pass (owner items 3, 4, 5): STATUS

Nothing committed. Owner approval of look and feel pending. **Stills only: no motion watched, no audio added.**

## What was replaced
| Item | Before | Now |
|---|---|---|
| Auto-attack ray | teal `lineBetween` + a grey square/disc | ImageGen comet bolt (bright head, tapering tail) travelling fist -> target in 0.09 s, fading after-glow, muzzle flare, punchy ImageGen hit burst + 2 chips (`EffectsRenderer.ts`) |
| Dash | one thin orange circle | start dust puffs, a wind-slash crescent, an afterimage streak ribbon laid behind Kai every 28 ms |
| Q (Impact) | one thin circle | circular shock wave that ends exactly on the sim damage radius, cracked-ground decal fading over 0.8 s, slam flash, dust billows, 10 debris shards |
| Nova Bloom burst | 2 stroked circles + dome + generic flashes | ground scorch decal (3.4 s fade), fireball, circular blast wave ending on the sim radius (+ a second wave), rising plume, embers, 12 debris shards, 14 motes |
| Nova Bloom gather | thin circle + inward stroke | landing zone: faint disc + crisp ring with inward ticks (exact radius) + stepping rune ring; spiral inflow + converging motes at the palms; in flight a closing ring counts down to impact |
| Form I variants | Q and dash had none | every new sprite exists as a cyan and a solar colour ramp; Form I is bigger/heavier (second Q wave, extra dash motes and ground wave, larger bolt) |

## Art provenance
Three ImageGen sheets through the audited bridge (`scripts/gen-image.py`, gpt-6.1-sol, style reference `source/fx-sheet.png`): `source/vfx-a.png` (bolt, hit, dash, Q ring/crater, debris), `vfx-b.png` (explosion, plume, embers, scorch, ellipse zone/rune, motes, swirl), `vfx-c.png` (true circular zone / rune / wave / crack, needed because the sim radii are circles). Prompts `source/vfx-*-prompt.txt`; log `source/PROVENANCE.md`. Cut by `scripts/extract_vfx.py` (same palette-map + native sampling as `extract_fx.py`, no painting): 22 sprites x {cyan `_b`, solar `_s`} -> `public/art/fx/kai-abilities/vfx/` (187 KB). The ellipse zone/rune/ring pieces were generated but not used (circles are honest about the damage radius); they are not shipped.

## Engineering
- `fxPool.ts`: bounded sprite pool with a free list (no allocation once warm), per-sprite blend, squash, gravity, delay, fade-in. `vfxNames.ts` is Phaser-free so a test can read it.
- Everything new renders with NORMAL blend (opaque pixel art) except small flashes/motes (ADD). Lesson from B06: big ADD sprites batched with a rotating ADD sprite got rectangular chunks clipped. Rotation of big sprites is stepped (rune/swirl) and no two big ADD sprites overlap. Frame-swept below.
- Kai is never covered: bolt depth 10.4 starts at the fist, Q debris 9.1 (under Kai 10), dash trail 9.2. The "cropped in the middle" the owner saw while auto-attacking is the `hero`/`legs` crop split in `EntityRenderer` (parent), not these layers.
- `reducedEffects`: keeps the bolt, hit burst, wave/crack/zone, drops debris, motes, chips, flares, dash slash and trail.
- Pause freezes everything (dt 0 while the phase is not running); Retry creates a new scene so ids restart.

## Evidence (stills; sweeps pause the game at fixed delays with Escape and hide the pause menu)
`art/review/b07pre/vfx/{base,f1}-{auto,auto-moving,dash,q,r}.png` at 960x540 (`live_vfx.cjs`); 640x360 sweep run too. Before-state: `art/review/b06/after/06-beam-crowd-*.png` etc. and the old code in git.

## Validation
typecheck PASS; vitest 127/127 (new `vfxAssets.test.ts`: all 22 sprites x 2 variants exist, same size, alpha, circle sizes the renderer scales from); live Phaser with real keyboard at 960x540 and 640x360, Base and Form I, 0 console errors. Frame time (`perf_vfx.cjs`, SwiftShader software GL, Q+R+auto+dash spam, 6 rounds): 80 enemies 960x540 59.1 fps (p95 16.8 ms); 115 enemies 960x540 58.6 fps; 115 enemies 640x360 59.2 fps. Max single frame 66.7 ms (one-off at texture upload / spawn). **Real GPU not tested.**

## Gates
TECHNICAL PASS | STILLS inspected PASS | MOTION WATCHED **NO** | AUDIO none added | REAL GPU **NO** | CONTROLLER n/a | OWNER APPROVAL pending.

## Residual / for the parent
- The big white blobs on enemies in the sweeps are the existing enemy hit-flash (`EntityRenderer`, FILL tint 0.09 s); with many hits it dominates the frame. Consider a shorter/dimmer flash.
- The Dash clip shows Kai as a flat grey silhouette during the dash (clip art, not these FX).
- Landing-zone telegraph for R is large (radius 190 / 228 in Form I), which is the true blast radius; it covers a lot of floor in crowds. Alpha is already modest.
- No sim change was needed (Q/dash form read from `state.player.form` at the impact).

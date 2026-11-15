# B09 design: arenas, environments, arena hazards

Scope: two playable arenas, one telegraphed hazard each, a premium arena-selection screen, ambience. Not B10 (XP/progression) or B11 (run design).

## Arenas
| | **The Gloam Circuit** (`gloam`, flagship, existing arena enhanced) | **The Ashen Reliquary** (`ashen`, new) |
|---|---|---|
| Mood | cold powered machine-floor, teal circuitry, you are inside a running system | dead sanctum of a burned order, ash, old verdigris, quiet and heavy |
| Floor palette | navy steel `#060b13-#0c1522`, teal inlay `#3fa8b2`, amber markers only on trim | warm charcoal stone `#13110f-#221e1a`, verdigris inlay `#2f6b5e`/`#4f8f7c`, bone `#cfc6b0` highlights only on landmarks |
| Hazard | **Lane Surge** (`rect`): a teal lane floods with a crimson-and-bone striped surge | **Pylon Pulse** (`circle`): a charged reliquary pylon discharges a ring around itself |
| Hazard cycle | warn 1.6 s (stripes + chevrons that march along the lane) -> active 0.6 s -> recovery 0.4 s fade; lane 84 px wide; 22 dmg | warn 1.5 s (ring fills + pylon charge frame) -> active 0.35 s -> recovery; radius 150; 20 dmg |
| Counterplay | step off the lane (any tile outside it is safe), dash through during warn | leave the ring (pylons sit at the arena edge of fights), dash through, break line by an obstacle |
| Landmark | `core-glyph` ring in the floor centre | `reliquary-sigil` in the floor centre |

All hostile hazards use the hostile family (crimson `#ff3a6e` + bone stripes, never gold/orange/cyan) and a SHAPE cue (stripes / rings) so danger never relies on hue alone. Both hazards are conveyed by shape + timing + sound; no strobing (alpha ramps <= 3 Hz).

## Hazard and collision contract (same ground contract as B08)
- Hazards are `Hazard`s in `state.hazards` with owner 0. Shapes: `circle`, `cone`, `sigil`, **new `rect`** (axis-aligned, centre x,y, size w,h, ground plane). A hazard warns for `delay`, then is **active** for `active` seconds (default 0 = instant): Kai is hit when his feet disc (6 px) overlaps the shape at any tick while active; post-hit i-frames (0.65 s) and dash i-frames (0.25 s) apply, so one pass never stacks hits.
- Visible edge == hit edge (+ the 6 px foot disc). Rect hit = distance(feet, rect) <= 6. No procedural shape differs from the drawn art.
- Director rules (`src/sim/ArenaHazards.ts`, data in `src/content/arenas.ts`): first hazard at 45 s, interval 14 s shrinking to 9 s by minute 10, at most ONE arena hazard pending, none during a boss's intro/phase/windup/strike or while a boss hazard is pending, spacing >= 2.5 s after any boss attack ends, deterministic (no RNG; cycle index). Pause freezes it (sim step), death/retry rebuild state.
- Solid props: collision rect == footprint rect in the prop manifest (tests assert). Decor never collides. Obstacle layouts are static per arena (`src/content/arenas.ts`), boss/spawn code asks `blocked()` which reads the active arena.

## Art contract (ImageGen first; code only for assembly, masks, timing)
Authored at 2x, shown at 0.5 like Kai/enemies (pixelArt, nearest). Files under `public/art/arenas/<id>/`:
- `floor-0..7.png` (ashen only; gloam keeps `public/art/arena/floor-*.png`): 128x128 seamless, **no seams when tiled with flips/90 deg rotation** (design for it: symmetric lighting, no directional cast shadow). Semantics (ashen): 0,1,2 plain variants, 3 cracked, 4 rubble-light, 5 verdigris inlay lane (horizontal), 6 inlay junction, 7 worn/ash.
- `rim.png` (256x96 tileable horizontally, wall face, floor edge at the bottom) and `corner.png` (128x128, top-left corner); code rotates them for the other sides.
- `props.json` + `props/<name>.png`: `{ "<name>": { "file", "scale": 0.5, "origin": [x,y px of the footprint bottom-centre in the PNG], "footprint": {"w","h"}, "solid": bool, "frames"?: n } }`. Display height <= footprint depth + 60 px (low relief: Kai is always drawn above props, so tall art would lie about occlusion).
- Gloam solid props (name: footprint w x h): `generator` 125x55, `freight-pod` 90x180, `console-bank` 155x64, `reactor-block` 165x70, `vent-stack` 145x48, `crate-stack` 120x80. Decor (non-solid): `cable-a`, `cable-b`, `grate`, `scorch-a`, `scorch-b`, `crack-a`, `crack-b`, `stripes`, `puddle`, `core-glyph` (560x560 display).
- Ashen solid props: `pylon` 60x44 (3-frame strip: idle / charging / discharging), `fallen-column` 170x56, `broken-statue` 80x70, `sarcophagus` 130x60, `monolith` 70x110, `brazier` 50x50. Decor: `rubble-a`, `rubble-b`, `ash-a`, `ash-b`, `crack-a`, `crack-b`, `bones`, `reliquary-sigil` (560x560 display).
- Hazard art in `fx/`: gloam `surge-warn.png` and `surge-active.png` (128x84, tileable along x, crimson/bone stripes + chevrons; active = bright energy streak); ashen `pulse-ring.png` (256 true-circle ring, crimson/bone) and `pylon-glow.png` (soft hostile glow for the charging pylon, small).
- Ambience: `fx/mote.png` (16x16 soft dot/spark), `fx/fog.png` (512x512 seamless soft haze, mostly transparent).
- `card.png` 480x270 selection-card illustration (an actual illustration of the arena, not a screenshot) and `card-thumb.png` 160x90 may be derived by script.
- Palette rule: nothing on the floor is brighter than a mid value; saturated/bright accents are reserved for hazards, pickups, heroes, telegraphs. Low-contrast, low-frequency behind characters.

## Performance budget
Floor+rim+decals baked once into one canvas per arena (<= 2200x1600). Props <= 14 sprites, ambience <= 40 motes + 1 fog TileSprite, hazards <= 2 tile sprites. Each arena's assets <= 6 MB loaded. Added draw calls with boss + 115 enemies must not exceed ~+8.

## QA
`/?qa=1&arena=gloam|ashen&encounter=...&debug=hit`; `window.__KYNT_QA__.arenaHazard()` triggers the next hazard immediately (dev only).

# B22 combat corrections: status

Branch `main`, local commits only (nothing pushed). Evidence labels: **tests** = unit tests; **screens** = in-game screenshots reviewed; **not verified** = no motion, audio or controller check.

## 1. NORTH art
- Hair: the detached right-hand tuft of Ren Ascendant and Vex Riftbound / Voidheart came from the front hair part (`head_f1.png`) and the rear hair part (`hair_f1.png`). Both source parts were trimmed in `art/characters/{ren,vex}/f1/north/parts` (originals kept as `*.orig.png`) and the rigs rebuilt. Voidheart is a recolour of the Riftbound sheets, so it inherits the fix. (screens)
- Legs: the NORTH stance was an A-frame (feet about 59 px apart, 22 px run offset). `danim.py` in every rig copy now uses a narrower stance (feet about 31 px apart, 16 px run offset); backups are `danim.py.b22.bak`. Rebuilt: Ren base and Ascendant, Vex base and Riftbound, Sora base, Kai base and the three forms. (screens for Ren; see build log for the rest)
- Not done: new ImageGen rear-boot studies and authored rear attack poses. The rear boots already read as heel views.

## 2-4. Kai kit (sim + tests)
Surge Step, Scatter Burst, Meteor Drive, Silver Echo, Rising Flare, Sunfall Crucible, Silver Rift chain (1 + 5 teleports, seeded), sustained Instinct Reversal. Constants: `src/content/kaiKit.ts`. Sim: `src/sim/KaiKit.ts`, `src/sim/ApexSystem.ts`. Tests: `src/tests/kai-kit.test.ts`, `src/tests/stillfire.test.ts`. Art: `art/kaikit/source` (ImageGen) -> `public/art/kaikit`, icons `public/ui/icons/kai_*.png`. Animation reuses existing clips (no new Blender poses).

## 5. Auto-attack direction
Kai only: the strike direction is recorded in the sim, shots leave the fist anchor of the strike's facing, and a shot opposite to the run direction plays a short planted strike. Sora already used per-facing hand anchors; Ren and Vex are melee. Not done: left/right hand anchors and the 16-case matrix.

## 6. Contour energy
`src/game/render/contourFilter.ts` (custom Phaser 4 filter), palettes per form. Passive blazes retired via `src/game/render/fxPolicy.ts`. Voidheart contour is dark gray by owner request; Vex effect tints follow the contour (`vexTint.ts`).

## Known gaps
Voidheart Exile redesign (own ImageGen design, rig, animations); normal-speed motion clips; audio for new abilities; controller verification.

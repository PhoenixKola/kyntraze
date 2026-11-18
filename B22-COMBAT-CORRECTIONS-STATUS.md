# B22 combat corrections: status

Branch `main`. Evidence labels: **tests** = unit tests; **screens** = in-game screenshots reviewed; **not verified** = no motion, audio or controller check.

## 1. NORTH art
- Hair: the detached right-hand tuft of Ren Ascendant and Vex Riftbound / Voidheart came from the front hair part (`head_f1.png`) and the rear hair part (`hair_f1.png`). Both source parts were trimmed in `art/characters/{ren,vex}/f1/north/parts` (originals kept as `*.orig.png`) and the rigs rebuilt. Voidheart is a recolour of the Riftbound sheets, so it inherits the fix. (screens)
- Legs: the NORTH stance was an A-frame (feet about 59 px apart, 22 px run offset). `danim.py` in every rig copy now uses a narrower stance (feet about 31 px apart, 16 px run offset); backups are `danim.py.b22.bak`. Rebuilt and published: Ren base and Ascendant, Vex base and Riftbound (Voidheart re-derived), Sora base and Sovereign, Kai base and the three forms. Reviewed on a contact sheet of all 11 appearances (screens).
- Not done: new ImageGen rear-boot studies and authored rear attack poses. The rear boots already read as heel views.

## 2-4. Kai kit (sim + tests)
Surge Step, Scatter Burst, Meteor Drive, Silver Echo, Rising Flare, Sunfall Crucible, Silver Rift chain (1 + 5 teleports, seeded), sustained Instinct Reversal. Constants: `src/content/kaiKit.ts`. Sim: `src/sim/KaiKit.ts`, `src/sim/ApexSystem.ts`. Tests: `src/tests/kai-kit.test.ts`, `src/tests/stillfire.test.ts`. Art: `art/kaikit/source` (ImageGen) -> `public/art/kaikit`, icons `public/ui/icons/kai_*.png`. Animation reuses existing clips (no new Blender poses).

## 5. Auto-attack direction
Kai only: the strike direction is recorded in the sim, shots leave the fist anchor of the strike's facing, and a shot opposite to the run direction plays a short planted strike. Sora already used per-facing hand anchors; Ren and Vex are melee. Not done: left/right hand anchors and the 16-case matrix.

## 6. Contour energy
`src/game/render/contourFilter.ts` (custom Phaser 4 filter), palettes per form. Passive blazes retired via `src/game/render/fxPolicy.ts`. Voidheart contour is dark gray by owner request; Vex effect tints follow the contour (`vexTint.ts`).

## UI / content pass (this session)
Sora card regenerated in the Ren/Vex card style; archive tab icons, Aetherfall/Paradox medallions and four new contract icons are ImageGen art (`art/uipass`). New contracts: Blood Oath, Hollow Crown, The Long Night, Void Pact (rules in `content/meta.ts`, effects in `RunConfig.ts` / `CombatSystem.ts` / `EnemyDirector.ts`). Vex: Rift Reversal crosses terrain; Oathbreaker Seal caps at 8 / 14 / 24 by form. Loading screen plays the runner's real run cycle.

## Known gaps
Voidheart Exile redesign (own ImageGen design, rig, animations); normal-speed motion clips; audio for new abilities; controller verification.

## Follow-up pass
Voidheart south head rebuilt (stale head pivot in `form_geometry.json` floated it above the collar). Ground ring / halo now follow the form contour colour; Voidheart effects (zones, marks, bursts, ability art desaturated at runtime) are gray; Surge Step contour, ring and trail are blue. Local co-op draws the second fighter with a real hero renderer (`EntityRenderer(scene, true)`) instead of the placeholder body. Kai Q orb/burst/comet/pillar/sbeam/sigil art stripped of neighbour-cell fragments. Loadout chips have icons. Added ember trails, meteor descent streak, flare embers and Surge afterimages.

Authored Blender poses: new Lunge (Surge Step, Meteor Drive), Uppercut (Rising Flare) and Slam (Sunfall Crucible) clips, built through the existing rig pipeline for base / Flarebound / Cometheart / Stillfire in all four directions (`anim_kk.py`, `danim_kk.py`, published with `scripts/b22-kai-clips-publish.py`, existing clips untouched).

Still open: by-ear audio, controller and normal-speed motion review; Windows installer not rebuilt.

# The Ashen Reliquary: provenance (B09)
Eight ImageGen sheets (gpt-6.1-sol via scripts/gen-image.py, refs: Kai east frame, Gloam floor tile composite, an in-game Warden screenshot), all accepted from the first pass (0 rejected): floor, props, decor, fx, fog, rim, corner, card. Prompts: `*-prompt.txt` (written by scripts/ashen-prompts.py). Runtime art is rebuilt by `scripts/build-ashen-arena.py`; review mock/seam sheets by `scripts/b09-ashen-review.py` into `art/arenas/ashen/review/`.
Scripted (not illustrated) steps: magenta keying + despill, scaling, floor-tile seam fixing (offset blend / mirror) and tone matching, soft-glow alpha from the key distance (pylon-glow, motes), fog luminance -> alpha, rim/corner/side crops. Decor is stored at display scale (1x); solid props at 2x (shown 0.5). Facing: none (props are symmetric-lit, no mirrored art).
Method note: scripts/gen-image.py's default codex path is stale; set CODEX_BIN to the newest OpenAI.Codex_* install.

# Image generation log

## 2026-11-15T09:34:56.457Z - fx.png

- File: fx.png (1254x1254)
- Codex: 0.169.0-alpha.11.1 (model: gpt-6.1-sol)
- Thread: 01a1de8e-bdcf-7a93-a9da-a3446f53e62d
- Reference images: ref-kai-east.png, ref-gloam-floor.png, ref-ingame.png
- Seconds: 38.4

Prompt:

```text
Original 2D game environment art for the action-survival game KYNTRAZE: FRACTURE RUSH. The first reference image is the hero (rendering style: clean dark outline, flat cel shading in two or three steps, crisp hard edges, no blur, no painterly noise, no soft gradients). The second reference is the existing arena floor (The Gloam Circuit: dark navy steel plates with teal inlay): the NEW arena must feel clearly different from it but share its pixel density, low-contrast value discipline and clean cel style. The third reference is an in-game screenshot showing how floors must sit one value tier BELOW the characters and the hostile crimson telegraphs. NEW ARENA: THE ASHEN RELIQUARY - the burnt dead sanctum of an old order: warm charcoal stone (#13110f to #221e1a), soft ash-grey dusting, old verdigris-green metal inlay (#2f6b5e, highlight #4f8f7c), bone-white (#cfc6b0) used ONLY sparingly on carved landmarks. NO orange, NO gold, NO bright cyan, NO bright red on scenery (gold and cyan belong to the hero, crimson to hostile attacks). Everything is seen from a slightly raised three-quarter top-down angle. No text, no letters, no watermark. HOSTILE ATTACK TELEGRAPH colours are crimson #ff3a6e and bone white only.

TASK: a sheet of 4 effect sprites on flat magenta (#ff00ff), 2 rows of 2 cells, wide gutters, one per cell, no text. Cell 1 = PULSE RING: a perfectly circular thin ring seen from above (a TRUE circle centred in the cell and filling most of it), crimson #ff3a6e with a bone-white inner edge and a dark outline, with eight short tick marks inside the edge pointing inward like a warning dial; hollow centre (magenta shows through). Cell 2 = PYLON GLOW: a small soft round hostile glow, crimson-magenta with a white-hot centre, fading smoothly to the magenta key at its edge, used as a light bloom behind a crystal. Cell 3 = EMBER MOTE: ONE tiny soft round speck of warm pale ash-grey with a faint dull ember core, about 14 px, centred. Cell 4 = SPARK MOTE: ONE tiny pale bone-grey diamond-shaped speck, about 12 px, centred.
```

## 2026-11-15T09:35:02.332Z - fog.png

- File: fog.png (1254x1254)
- Codex: 0.169.0-alpha.11.1 (model: gpt-6.1-sol)
- Thread: 01a1de8e-d53b-75b1-9b61-6fd119b88e48
- Reference images: none
- Seconds: 37.8

Prompt:

```text
Seamless tileable soft ground haze texture for a dark 2D game: very low-contrast wispy drifting ash-smoke clouds in warm grey (#3a342d) on a nearly black warm background (#0d0b0a), soft organic cloud shapes, NO objects, NO hard edges, NO text, evenly distributed with no bright spot and no vignette, the pattern wraps across all four edges. Square image.
```

## 2026-11-15T09:35:04.947Z - floor.png

- File: floor.png (1774x887)
- Codex: 0.169.0-alpha.11.1 (model: gpt-6.1-sol)
- Thread: 01a1de8e-bdc6-7ef2-a448-ca70a1398c69
- Reference images: ref-kai-east.png, ref-gloam-floor.png, ref-ingame.png
- Seconds: 46.9

Prompt:

```text
Original 2D game environment art for the action-survival game KYNTRAZE: FRACTURE RUSH. The first reference image is the hero (rendering style: clean dark outline, flat cel shading in two or three steps, crisp hard edges, no blur, no painterly noise, no soft gradients). The second reference is the existing arena floor (The Gloam Circuit: dark navy steel plates with teal inlay): the NEW arena must feel clearly different from it but share its pixel density, low-contrast value discipline and clean cel style. The third reference is an in-game screenshot showing how floors must sit one value tier BELOW the characters and the hostile crimson telegraphs. NEW ARENA: THE ASHEN RELIQUARY - the burnt dead sanctum of an old order: warm charcoal stone (#13110f to #221e1a), soft ash-grey dusting, old verdigris-green metal inlay (#2f6b5e, highlight #4f8f7c), bone-white (#cfc6b0) used ONLY sparingly on carved landmarks. NO orange, NO gold, NO bright cyan, NO bright red on scenery (gold and cyan belong to the hero, crimson to hostile attacks). Everything is seen from a slightly raised three-quarter top-down angle. No text, no letters, no watermark.

TASK: a sheet of 8 square FLOOR TILES for a top-down game, in 2 rows of 4, each tile a perfect square filling its cell EDGE TO EDGE with NO outline and NO border, separated from the other tiles by wide flat magenta (#ff00ff) gutters. Flat straight-down texture (no perspective), evenly lit from above with NO cast shadows and NO directional lighting so tiles can be flipped and rotated freely, the pattern continuing off every edge as if part of an endless floor, low contrast and quiet (a floor must never compete with characters), the same blotchy pixel-art-like shading style as the second reference but in warm charcoal stone. Tiles in order: 1 plain worn charcoal flagstones with subtle seams; 2 plain flagstones, a slightly different slab layout; 3 plain flagstones with faint ash dusting; 4 flagstones with a fine crack running diagonally; 5 light broken rubble and chips scattered on flagstones; 6 a straight thin verdigris-green metal inlay line running horizontally through the exact vertical CENTRE of the tile from the left edge to the right edge, set into the stone with a dark groove; 7 a verdigris inlay JUNCTION: the same horizontal line plus a vertical line crossing at the exact centre of the tile, both reaching all four edges at their exact centres; 8 heavily worn flagstones with swept ash and a few soot scorch stains.
```

## 2026-11-15T09:35:09.585Z - rim.png

- File: rim.png (2172x724)
- Codex: 0.169.0-alpha.11.1 (model: gpt-6.1-sol)
- Thread: 01a1de8e-d4bf-7321-9eb3-536c77958fcc
- Reference images: ref-gloam-floor.png, ref-ingame.png
- Seconds: 45.4

Prompt:

```text
Original 2D game environment art for the action-survival game KYNTRAZE: FRACTURE RUSH. The first reference image is the hero (rendering style: clean dark outline, flat cel shading in two or three steps, crisp hard edges, no blur, no painterly noise, no soft gradients). The second reference is the existing arena floor (The Gloam Circuit: dark navy steel plates with teal inlay): the NEW arena must feel clearly different from it but share its pixel density, low-contrast value discipline and clean cel style. The third reference is an in-game screenshot showing how floors must sit one value tier BELOW the characters and the hostile crimson telegraphs. NEW ARENA: THE ASHEN RELIQUARY - the burnt dead sanctum of an old order: warm charcoal stone (#13110f to #221e1a), soft ash-grey dusting, old verdigris-green metal inlay (#2f6b5e, highlight #4f8f7c), bone-white (#cfc6b0) used ONLY sparingly on carved landmarks. NO orange, NO gold, NO bright cyan, NO bright red on scenery (gold and cyan belong to the hero, crimson to hostile attacks). Everything is seen from a slightly raised three-quarter top-down angle. No text, no letters, no watermark.

TASK: the PERIMETER WALL of the arena. Draw ONE wide horizontal strip of wall seen from a slightly raised three-quarter top-down angle: the wall FACE (vertical stone surface) about 96 px tall at final size running left to right across the full image, built from large dark charcoal ashlar blocks with soot stains, a few thin verdigris metal bands and old carved pilasters repeating at regular intervals, a darker cap edge at the very top, and at the very BOTTOM a soft dark contact edge where it meets the floor (the floor is not drawn: the bottom of the image is the wall base). The pattern must repeat horizontally without a visible seam (pilasters at regular spacing, same values at the left and right edges). Fully opaque, fills the whole image edge to edge, no magenta, no characters. Wide aspect ratio about 8:1.
```

## 2026-11-15T09:35:11.591Z - decor.png

- File: decor.png (1774x887)
- Codex: 0.169.0-alpha.11.1 (model: gpt-6.1-sol)
- Thread: 01a1de8e-bdec-7610-aafd-293dd861ff3d
- Reference images: ref-kai-east.png, ref-gloam-floor.png, ref-ingame.png
- Seconds: 53.5

Prompt:

```text
Original 2D game environment art for the action-survival game KYNTRAZE: FRACTURE RUSH. The first reference image is the hero (rendering style: clean dark outline, flat cel shading in two or three steps, crisp hard edges, no blur, no painterly noise, no soft gradients). The second reference is the existing arena floor (The Gloam Circuit: dark navy steel plates with teal inlay): the NEW arena must feel clearly different from it but share its pixel density, low-contrast value discipline and clean cel style. The third reference is an in-game screenshot showing how floors must sit one value tier BELOW the characters and the hostile crimson telegraphs. NEW ARENA: THE ASHEN RELIQUARY - the burnt dead sanctum of an old order: warm charcoal stone (#13110f to #221e1a), soft ash-grey dusting, old verdigris-green metal inlay (#2f6b5e, highlight #4f8f7c), bone-white (#cfc6b0) used ONLY sparingly on carved landmarks. NO orange, NO gold, NO bright cyan, NO bright red on scenery (gold and cyan belong to the hero, crimson to hostile attacks). Everything is seen from a slightly raised three-quarter top-down angle. No text, no letters, no watermark.

TASK: a sheet of 8 flat FLOOR DECALS on flat magenta (#ff00ff), 2 rows of 4 cells, wide magenta gutters, one decal per cell, nothing cropped, no text. Decals lie on the ground seen from above / slight three-quarter (low relief, quiet, low contrast so they never compete with characters), consistent cel style with a thin dark outline on solid pieces. In order: 1 RUBBLE PILE A (a small cluster of broken charcoal stone blocks and chips, about 100 px); 2 RUBBLE PILE B (a different arrangement, a broken slab edge with chips, about 120 px); 3 ASH DRIFT A (a soft irregular drift of pale grey ash and dust with a few cooled dark embers, no outline, about 150 px); 4 ASH DRIFT B (a longer swept streak of ash, about 170 px); 5 CRACK A (a branching fissure in the stone with a dark interior, about 160 px); 6 CRACK B (a shorter jagged crack with a few loose chips, about 130 px); 7 BONES (a few ancient scattered bone fragments and a cracked ribcage fragment, dimmed bone-white, about 110 px, tasteful, not gory); 8 RELIQUARY SIGIL: a LARGE circular floor mosaic seen from above, a thin double ring with eight carved radial spokes and a central eight-pointed star, inlaid in verdigris metal with a few dim bone-white carved highlights, worn and cracked, nearly symmetric, fitting a perfect circle, about 500 px across, low contrast against the stone.
```

## 2026-11-15T09:35:12.223Z - card.png

- File: card.png (1672x941)
- Codex: 0.169.0-alpha.11.1 (model: gpt-6.1-sol)
- Thread: 01a1de8e-d4af-7643-8e85-f09d3f7db638
- Reference images: ref-gloam-floor.png, ref-ingame.png
- Seconds: 47.9

Prompt:

```text
Original 2D game environment art for the action-survival game KYNTRAZE: FRACTURE RUSH. The first reference image is the hero (rendering style: clean dark outline, flat cel shading in two or three steps, crisp hard edges, no blur, no painterly noise, no soft gradients). The second reference is the existing arena floor (The Gloam Circuit: dark navy steel plates with teal inlay): the NEW arena must feel clearly different from it but share its pixel density, low-contrast value discipline and clean cel style. The third reference is an in-game screenshot showing how floors must sit one value tier BELOW the characters and the hostile crimson telegraphs. NEW ARENA: THE ASHEN RELIQUARY - the burnt dead sanctum of an old order: warm charcoal stone (#13110f to #221e1a), soft ash-grey dusting, old verdigris-green metal inlay (#2f6b5e, highlight #4f8f7c), bone-white (#cfc6b0) used ONLY sparingly on carved landmarks. NO orange, NO gold, NO bright cyan, NO bright red on scenery (gold and cyan belong to the hero, crimson to hostile attacks). Everything is seen from a slightly raised three-quarter top-down angle. No text, no letters, no watermark.

TASK: a premium atmospheric ILLUSTRATION for an arena-selection card (16:9, wide) showing THE ASHEN RELIQUARY from a slightly raised three-quarter angle: a vast dead sanctum floor of warm charcoal stone with a large worn verdigris sigil in the centre, a fallen carved column, a broken statue, a sarcophagus and two reliquary pylons whose floating crystals glow hostile crimson, drifting ash and faint embers in the air, soft ash fog near the ground, crumbling pilastered walls fading into darkness at the edges, a dramatic but quiet low-key mood, vignette towards the corners, clean dark outlines on objects, consistent with the references. No characters, no text, no UI, no frame. Fully opaque, fills the whole image.
```

## 2026-11-15T09:35:16.628Z - corner.png

- File: corner.png (1254x1254)
- Codex: 0.169.0-alpha.11.1 (model: gpt-6.1-sol)
- Thread: 01a1de8e-d466-7250-bc4d-33ca370d7bfa
- Reference images: ref-gloam-floor.png, ref-ingame.png
- Seconds: 52.4

Prompt:

```text
Original 2D game environment art for the action-survival game KYNTRAZE: FRACTURE RUSH. The first reference image is the hero (rendering style: clean dark outline, flat cel shading in two or three steps, crisp hard edges, no blur, no painterly noise, no soft gradients). The second reference is the existing arena floor (The Gloam Circuit: dark navy steel plates with teal inlay): the NEW arena must feel clearly different from it but share its pixel density, low-contrast value discipline and clean cel style. The third reference is an in-game screenshot showing how floors must sit one value tier BELOW the characters and the hostile crimson telegraphs. NEW ARENA: THE ASHEN RELIQUARY - the burnt dead sanctum of an old order: warm charcoal stone (#13110f to #221e1a), soft ash-grey dusting, old verdigris-green metal inlay (#2f6b5e, highlight #4f8f7c), bone-white (#cfc6b0) used ONLY sparingly on carved landmarks. NO orange, NO gold, NO bright cyan, NO bright red on scenery (gold and cyan belong to the hero, crimson to hostile attacks). Everything is seen from a slightly raised three-quarter top-down angle. No text, no letters, no watermark.

TASK: ONE square CORNER piece of the arena perimeter wall, TOP-LEFT corner, seen from a slightly raised three-quarter top-down angle: two walls of large dark charcoal ashlar blocks meeting at a corner column with a verdigris metal cap; the floor area (the bottom-right part of the image) is plain dark charcoal flagstone continuing under it. Fully opaque, fills the whole square edge to edge, no magenta, no characters, the same style as a continuous wall strip with a 96 px tall wall face.
```

## 2026-11-15T09:35:17.409Z - props.png

- File: props.png (1774x887)
- Codex: 0.169.0-alpha.11.1 (model: gpt-6.1-sol)
- Thread: 01a1de8e-bdb6-7492-807b-4ebb7062f145
- Reference images: ref-kai-east.png, ref-gloam-floor.png, ref-ingame.png
- Seconds: 59.4

Prompt:

```text
Original 2D game environment art for the action-survival game KYNTRAZE: FRACTURE RUSH. The first reference image is the hero (rendering style: clean dark outline, flat cel shading in two or three steps, crisp hard edges, no blur, no painterly noise, no soft gradients). The second reference is the existing arena floor (The Gloam Circuit: dark navy steel plates with teal inlay): the NEW arena must feel clearly different from it but share its pixel density, low-contrast value discipline and clean cel style. The third reference is an in-game screenshot showing how floors must sit one value tier BELOW the characters and the hostile crimson telegraphs. NEW ARENA: THE ASHEN RELIQUARY - the burnt dead sanctum of an old order: warm charcoal stone (#13110f to #221e1a), soft ash-grey dusting, old verdigris-green metal inlay (#2f6b5e, highlight #4f8f7c), bone-white (#cfc6b0) used ONLY sparingly on carved landmarks. NO orange, NO gold, NO bright cyan, NO bright red on scenery (gold and cyan belong to the hero, crimson to hostile attacks). Everything is seen from a slightly raised three-quarter top-down angle. No text, no letters, no watermark.

TASK: a sprite sheet of 8 solid environment props on flat magenta (#ff00ff), 2 rows of 4 cells, wide magenta gutters, one object per cell, nothing cropped, no ground shadow, no text. Every object sits on one common ground line at the bottom of its cell, is seen from a slightly raised three-quarter top-down angle, with a consistent 3-4 px dark outline and cel shading, and is LOW relief (wide, not a tall tower). Props in order: cells 1-3 are THREE FRAMES OF THE SAME OBJECT - a RELIQUARY PYLON: a squat carved dark-stone pillar, about 60 px wide and 100 px tall at final size, with a verdigris metal collar and a floating hostile crystal on top held in a small open cradle. Frame 1 IDLE: crystal dull and dark with a faint crimson glint. Frame 2 CHARGING: crystal blazing crimson-magenta (#ff3a6e) with a hot white core, hairline crimson cracks of light running down the pillar, small shards orbiting. Frame 3 DISCHARGING: the crystal flashing white-hot with a burst flare, the pillar cracks fully lit, sparks flying outward. Same pillar shape, size and position in all three frames. Cell 4 = a FALLEN COLUMN: a long broken carved stone column lying horizontally, much wider than tall (about 170 by 56 px footprint), chipped, with a verdigris band. Cell 5 = a BROKEN STATUE: a toppled headless robed statue on a cracked plinth (about 80 by 70 px footprint), ash-dusted. Cell 6 = a SARCOPHAGUS: a heavy stone coffin with a carved lid and verdigris corner brackets (about 130 by 60 px footprint). Cell 7 = a MONOLITH: a leaning carved standing stone slab with an old verdigris rune-inlay line (about 70 wide by 110 px, slightly taller than the others), no readable letters. Cell 8 = a BRAZIER: a squat iron-and-stone brazier bowl with cold grey ash and a few dull ember specks (about 50 by 50 px footprint), unlit.
```


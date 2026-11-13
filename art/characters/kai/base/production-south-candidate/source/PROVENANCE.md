# Kai SOUTH production candidate: image-generation provenance

Tool: `tools/codex-imagegen/imagegen.mjs` (audited local copy of github.com/Adamdesgns/codex-imagegen @ f2727dbc, MIT) driving the Codex CLI
0.167.0-alpha.4.1 signed in with ChatGPT, run read-only with shell, browser and plugins disabled and the user config ignored. The model name is the
Codex CLI `-m` selection that the CLI accepted; Codex does not report which model its image tool uses internally. Standard speed (no fast tier).

13 calls in total. **Final sources** (used by `parts/`): the Sol (`gpt-6.1-sol`) entries for `s1-head-hands`, `s2-upper` (torso only), `s3-lower-a`
(hips, sash band and tails, thighs), `s5-limbs` (shins, boots) and `s6-arms` (sleeves and cuffed forearms). Discarded and not kept: the 7 `gpt-6-luna`
entries (style drifted, too saturated or too fine a pixel size), the first Sol `s4-lower-b` (shins and boots drawn about 40% too long), and the
sleeves and forearms from the Sol `s2-upper` sheet (cuff on the wrong piece, replaced by `s6-arms`). Every call attached the approved reference plus
10x nearest-neighbour crops of it (`refs/`) to fix the pixel size and style.

---

# Image generation log

## 2026-11-13T17:05:46.263Z - s1-head-hands.png

- File: s1-head-hands.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6-luna)
- Thread: 01a1d5de-aa8d-7460-ab13-6e799bbdf056
- Reference images: kai-160-native-approved-reference.png, ref-head-7x.png, ref-guard-fist-7x.png, ref-low-fist-7x.png
- Seconds: 44.4

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The other attached images are the same approved reference, magnified 7x with nearest-neighbor, showing: the head, the raised guard fist, and the low waist fist. Redraw the following pieces of EXACTLY this character, copying the pixel-art rendering of the magnified crops as faithfully as possible: the same dark controlled outlines, the same palette (teal-black hair with teal highlights, warm tan skin, off-white hand wraps with grey-brown stripes), the same cluster shading, the same level of detail. One art pixel is about 7 image pixels, exactly like the magnified crops. Same three-quarter view, seen slightly from above.

Draw ONLY these 5 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. HEAD: the full head with the swept spiky hair, ear, angled face, same eyes and brow and nose as the head crop, and a short neck stub below the jaw (no collar, no jacket, no shoulder). The face MUST show a small, restrained, clearly visible closed mouth: a short darker-skin-tone line about 3 art pixels wide with a faint lower-lip highlight below it, centered under the nose and turned with the face. Calm, focused, slightly stern expression. Do not add teeth, do not make it a thick black line.
2. GUARD FIST: the raised fist exactly like the guard-fist crop: a clenched fist seen from the knuckle side, with four clearly separate knuckles and finger segments, the thumb folded over the front, white wrap with grey-brown stripe lines over the back of the hand and the wrist. It ends at the bottom with a clean wrist opening (a short stub of white wrap), pointing straight down (fist on top, wrist at the bottom).
3. WAIST FIST: the lower fist exactly like the low-fist crop: a clenched fist seen from the side with knuckles pointing right, the white wrap covering the back of the hand and the wrist, wrap stripes visible, ending at the left with a clean wrist opening. Drawn horizontally.
4. IMPACT FIST: a clenched fist punching straight at the viewer, seen from the front: four big knuckles in a row, finger segments visible, thumb across the front, wrap on the wrist below it, slightly larger than the others. Drawn upright, wrist at the bottom.
5. IMPACT FIST SIDE-ANGLE: the same clenched wrapped fist seen at 45 degrees from the front, knuckles toward the viewer and to the right, wrist at the bottom.

Same scale for all pieces: the head about 45 art pixels tall, the fists about 15 to 19 art pixels. Flat solid magenta background everywhere. Wide 16:9. No full character, no text, no labels, no watermark.
```

## 2026-11-13T17:07:23.365Z - s2-upper.png

- File: s2-upper.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6-luna)
- Thread: 01a1d5df-fe96-7100-972c-d74ee996b751
- Reference images: kai-160-native-approved-reference.png, ref-upper-body-6x.png, ref-head-7x.png
- Seconds: 54.5

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the same reference's upper body magnified 6x with nearest-neighbor. The third is the approved head crop (7x) that sets the pixel size and rendering style for this sheet: one art pixel is about 7 image pixels. Redraw these pieces of EXACTLY this character, copying the pixel-art rendering of the reference as faithfully as possible: same dark controlled outlines (thin, not a thick halo), same palette (navy-charcoal jacket with lighter purple-grey highlights, cream piping, black undershirt, warm tan skin, off-white wraps, gold epaulette), same cluster shading and fabric folds. Same three-quarter view, seen slightly from above.

Draw ONLY these 6 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. TORSO: the cropped short jacket seen three-quarter, with the open front, cream piping along both lapels and the hem, the tall standing collar with cream outline, the black undershirt visible in the opening, the neck opening showing a little skin. NO sleeves, NO arms, NO shoulder pads: the shoulders end as plain rounded stumps where sleeves would attach. About 52 art pixels wide and 46 tall. The bottom ends at the jacket hem.
2. EPAULETTE: only the gold shoulder pad with the small cream ball (button), exactly as on the reference's left shoulder, flat on its own. About 17 art pixels wide.
3. NEAR UPPER-ARM SLEEVE: a big puffy navy jacket sleeve hanging straight down, rounded top end (shoulder), widening in the middle with soft fabric folds, and at the bottom end an open sleeve cuff with a cream trim band wrapped around the opening (seen as a slightly oblique ring). About 24 art pixels wide and 40 tall.
4. FAR UPPER-ARM SLEEVE: the same kind of sleeve, a little narrower (about 21 art pixels wide, 38 tall), hanging straight down, with the cream cuff band at the bottom end.
5. NEAR FOREARM: a bare tan forearm hanging straight down, rounded top end (it goes inside the sleeve), the lower half covered by the off-white wrap with grey-brown stripe lines, ending at the bottom in a clean wrist opening. About 14 art pixels wide and 30 tall.
6. FAR FOREARM: the same forearm, slightly narrower, same wrap.

Flat solid magenta background everywhere. Wide 16:9. No full character, no head, no text, no labels, no watermark.
```

## 2026-11-13T17:08:07.004Z - s3-lower.png

- File: s3-lower.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6-luna)
- Thread: 01a1d5e0-d40a-70d2-9e96-ab392ef2e7ce
- Reference images: kai-160-native-approved-reference.png, ref-lower-body-6x.png, ref-head-7x.png
- Seconds: 43.5

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the same reference's lower body magnified 6x with nearest-neighbor. The third is the approved head crop (7x) that sets the pixel size and rendering style for this sheet: one art pixel is about 7 image pixels. Redraw these pieces of EXACTLY this character, copying the reference's pixel-art rendering faithfully: thin dark controlled outlines (no thick halo), baggy dark grey-purple trousers with lighter purple-grey highlight folds and dark shadow folds, golden sash with darker orange-brown shadow stripes, solid dark combat boots with a strap and a grey-brown sole. Three-quarter view, seen slightly from above.

Draw ONLY these 9 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. HIP BLOCK: the baggy trouser hip and seat region, one broad wide piece (about 44 art pixels wide, 24 tall). Its TOP edge is straight and flat (it hides under the sash). Its sides curve gently outward. Its BOTTOM edge is a plain wide inverted V (the crotch fold where the two legs begin). It must NOT look like two round buttocks and must have NO round bulge at the bottom; just cloth with a few diagonal folds.
2. SASH BAND: the golden sash wrapped around the waist with its knot at the right side, as in the reference, flat on its own: about 44 art pixels wide and 14 tall, no tails.
3. SASH TAILS: the two golden tails that hang down from the knot, one longer, overlapping slightly, about 18 art pixels wide and 28 tall.
4. NEAR THIGH: the very baggy trouser leg from the hip to the knee, hanging straight down, wide and voluminous with diagonal cloth folds; the top end is flat/open (it hides under the hips and sash), the bottom end gathers in at the knee. About 32 art pixels wide and 55 tall.
5. FAR THIGH: the same, slightly narrower (about 29 wide and 50 tall).
6. NEAR SHIN: the lower trouser leg below the knee hanging straight down: the top end rounded (knee), the bottom end gathered and tucked into the boot. About 24 art pixels wide and 34 tall.
7. FAR SHIN: the same, slightly narrower.
8. NEAR BOOT: one solid dark combat boot, three-quarter view, toe pointing toward the viewer and slightly to the left, with strap and grey sole, the shaft opening visible at the top. About 24 art pixels wide and 28 tall.
9. FAR BOOT: the same boot with the toe pointing toward the viewer and slightly to the right.

Flat solid magenta background everywhere. Wide 16:9. No upper body, no head, no text, no labels, no watermark.
```

## 2026-11-13T17:10:37.167Z - s1-head-hands.png

- File: s1-head-hands.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6-luna)
- Thread: 01a1d5e3-09be-7353-b71d-c246826ddb64
- Reference images: kai-160-native-approved-reference.png, ref-head-10x.png, ref-guard-fist-10x.png, ref-low-fist-10x.png
- Seconds: 48.8

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The other attached images are the same approved reference, magnified 10x with nearest-neighbor, showing: the head, the raised guard fist, and the low waist fist. Redraw the following pieces of EXACTLY this character, copying the pixel-art rendering of the magnified crops as faithfully as possible: the same dark controlled outlines, the same palette (teal-black hair with teal highlights, warm tan skin, off-white hand wraps with grey-brown stripes), the same cluster shading, the same level of detail. One art pixel is a large 10x10 image-pixel block, exactly like the magnified crops. Same three-quarter view, seen slightly from above.

Draw ONLY these 5 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. HEAD: the full head with the swept spiky hair, ear, angled face, same eyes and brow and nose as the head crop, and a short neck stub below the jaw (no collar, no jacket, no shoulder). The face MUST show a small, restrained, clearly visible closed mouth: a short darker-skin-tone line about 3 art pixels wide with a faint lower-lip highlight below it, centered under the nose and turned with the face. Calm, focused, slightly stern expression. Do not add teeth, do not make it a thick black line.
2. GUARD FIST: the raised fist exactly like the guard-fist crop: a clenched fist seen from the knuckle side, with four clearly separate knuckles and finger segments, the thumb folded over the front, white wrap with grey-brown stripe lines over the back of the hand and the wrist. It ends at the bottom with a clean wrist opening (a short stub of white wrap), pointing straight down (fist on top, wrist at the bottom).
3. WAIST FIST: the lower fist exactly like the low-fist crop: a clenched fist seen from the side with knuckles pointing right, the white wrap covering the back of the hand and the wrist, wrap stripes visible, ending at the left with a clean wrist opening. Drawn horizontally.
4. IMPACT FIST: a clenched fist punching straight at the viewer, seen from the front: four big knuckles in a row, finger segments visible, thumb across the front, wrap on the wrist below it, slightly larger than the others. Drawn upright, wrist at the bottom.
5. IMPACT FIST SIDE-ANGLE: the same clenched wrapped fist seen at 45 degrees from the front, knuckles toward the viewer and to the right, wrist at the bottom.

Same scale for all pieces: the head about 45 art pixels tall, the fists about 15 to 19 art pixels. Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No full character, no text, no labels, no watermark.
```

## 2026-11-13T17:11:32.619Z - s2-upper.png

- File: s2-upper.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6-luna)
- Thread: 01a1d5e3-c8f3-7630-ae77-e300f496e1d0
- Reference images: kai-160-native-approved-reference.png, ref-upper-body-10x.png, ref-head-10x.png
- Seconds: 55.3

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the same reference's upper body magnified 10x with nearest-neighbor. The third is the approved head crop (10x) that sets the pixel size and rendering style for this sheet: one art pixel is a large 10x10 image-pixel block. Redraw these pieces of EXACTLY this character, copying the pixel-art rendering of the reference as faithfully as possible: same dark controlled outlines (thin, not a thick halo), same palette (navy-charcoal jacket with lighter purple-grey highlights, cream piping, black undershirt, warm tan skin, off-white wraps, gold epaulette), same cluster shading and fabric folds. Same three-quarter view, seen slightly from above.

Draw ONLY these 6 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. TORSO: the cropped short jacket seen three-quarter, with the open front, cream piping along both lapels and the hem, the tall standing collar with cream outline, the black undershirt visible in the opening, the neck opening showing a little skin. NO sleeves, NO arms, NO shoulder pads: the shoulders end as plain rounded stumps where sleeves would attach. About 52 art pixels wide and 46 tall. The bottom ends at the jacket hem.
2. EPAULETTE: only the gold shoulder pad with the small cream ball (button), exactly as on the reference's left shoulder, flat on its own. About 17 art pixels wide.
3. NEAR UPPER-ARM SLEEVE: a big puffy navy jacket sleeve hanging straight down, rounded top end (shoulder), widening in the middle with soft fabric folds, and at the bottom end an open sleeve cuff with a cream trim band wrapped around the opening (seen as a slightly oblique ring). About 24 art pixels wide and 40 tall.
4. FAR UPPER-ARM SLEEVE: the same kind of sleeve, a little narrower (about 21 art pixels wide, 38 tall), hanging straight down, with the cream cuff band at the bottom end.
5. NEAR FOREARM: a bare tan forearm hanging straight down, rounded top end (it goes inside the sleeve), the lower half covered by the off-white wrap with grey-brown stripe lines, ending at the bottom in a clean wrist opening. About 14 art pixels wide and 30 tall.
6. FAR FOREARM: the same forearm, slightly narrower, same wrap.

Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No full character, no head, no text, no labels, no watermark.
```

## 2026-11-13T17:12:37.610Z - s3-lower-a.png

- File: s3-lower-a.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6-luna)
- Thread: 01a1d5e4-e9cf-73b2-85c9-2a14b4d282f2
- Reference images: kai-160-native-approved-reference.png, ref-lower-body-10x.png, ref-head-10x.png
- Seconds: 46.4

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the same reference's lower body magnified 10x with nearest-neighbor. The third is the approved head crop (10x) that sets the pixel size and rendering style for this sheet: one art pixel is a large 10x10 image-pixel block. Redraw these pieces of EXACTLY this character, copying the reference's pixel-art rendering faithfully: thin dark controlled outlines (no thick halo), baggy dark grey-purple trousers with lighter purple-grey highlight folds and dark shadow folds, golden sash with darker orange-brown shadow stripes, solid dark combat boots with a strap and a grey-brown sole. Three-quarter view, seen slightly from above.

Draw ONLY these 5 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. HIP BLOCK: the baggy trouser hip and seat region, one broad wide piece (about 44 art pixels wide, 24 tall). Its TOP edge is straight and flat (it hides under the sash). Its sides curve gently outward. Its BOTTOM edge is a plain wide inverted V (the crotch fold where the two legs begin). It must NOT look like two round buttocks and must have NO round bulge at the bottom; just cloth with a few diagonal folds.
2. SASH BAND: the golden sash wrapped around the waist with its knot at the right side, as in the reference, flat on its own: about 44 art pixels wide and 14 tall, no tails.
3. SASH TAILS: the two golden tails that hang down from the knot, one longer, overlapping slightly, about 18 art pixels wide and 28 tall.
4. NEAR THIGH: the very baggy trouser leg from the hip to the knee, hanging straight down, wide and voluminous with diagonal cloth folds; the top end is flat/open (it hides under the hips and sash), the bottom end gathers in at the knee. About 32 art pixels wide and 55 tall.
5. FAR THIGH: the same, slightly narrower (about 29 wide and 50 tall).

Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No upper body, no head, no text, no labels, no watermark. Wide 16:9. No upper body, no head, no text, no labels, no watermark.
```

## 2026-11-13T17:13:18.463Z - s4-lower-b.png

- File: s4-lower-b.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6-luna)
- Thread: 01a1d5e5-9fba-78f0-a120-c5d25ae555b9
- Reference images: kai-160-native-approved-reference.png, ref-lower-body-10x.png, ref-head-10x.png
- Seconds: 40.7

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the same reference's lower body magnified 10x with nearest-neighbor. The third is the approved head crop (10x) that sets the pixel size and rendering style for this sheet: one art pixel is a large 10x10 image-pixel block. Redraw these pieces of EXACTLY this character, copying the reference's pixel-art rendering faithfully: thin dark controlled outlines (no thick halo), baggy dark grey-purple trousers with lighter purple-grey highlight folds and dark shadow folds, golden sash with darker orange-brown shadow stripes, solid dark combat boots with a strap and a grey-brown sole. Three-quarter view, seen slightly from above.

Draw ONLY these 4 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. NEAR SHIN: the lower trouser leg below the knee hanging straight down: the top end rounded (knee), the bottom end gathered and tucked into the boot. About 24 art pixels wide and 34 tall.
2. FAR SHIN: the same, slightly narrower.
3. NEAR BOOT: one solid dark combat boot, three-quarter view, toe pointing toward the viewer and slightly to the left, with strap and grey sole, the shaft opening visible at the top. About 24 art pixels wide and 28 tall.
4. FAR BOOT: the same boot with the toe pointing toward the viewer and slightly to the right.

Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No upper body, no head, no text, no labels, no watermark. Wide 16:9. No upper body, no head, no text, no labels, no watermark.
```

## 2026-11-13T17:14:31.412Z - sol-s1-head-hands.png

- File: sol-s1-head-hands.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6.1-sol)
- Thread: 01a1d5e6-947e-7a73-8606-213dc4de91a4
- Reference images: kai-160-native-approved-reference.png, ref-head-10x.png, ref-guard-fist-10x.png, ref-low-fist-10x.png
- Seconds: 50.9

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The other attached images are the same approved reference, magnified 10x with nearest-neighbor, showing: the head, the raised guard fist, and the low waist fist. Redraw the following pieces of EXACTLY this character, copying the pixel-art rendering of the magnified crops as faithfully as possible: the same dark controlled outlines, the same palette (teal-black hair with teal highlights, warm tan skin, off-white hand wraps with grey-brown stripes), the same cluster shading, the same level of detail. One art pixel is a large 10x10 image-pixel block, exactly like the magnified crops. Same three-quarter view, seen slightly from above.

Draw ONLY these 5 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. HEAD: the full head with the swept spiky hair, ear, angled face, same eyes and brow and nose as the head crop, and a short neck stub below the jaw (no collar, no jacket, no shoulder). The face MUST show a small, restrained, clearly visible closed mouth: a short darker-skin-tone line about 3 art pixels wide with a faint lower-lip highlight below it, centered under the nose and turned with the face. Calm, focused, slightly stern expression. Do not add teeth, do not make it a thick black line.
2. GUARD FIST: the raised fist exactly like the guard-fist crop: a clenched fist seen from the knuckle side, with four clearly separate knuckles and finger segments, the thumb folded over the front, white wrap with grey-brown stripe lines over the back of the hand and the wrist. It ends at the bottom with a clean wrist opening (a short stub of white wrap), pointing straight down (fist on top, wrist at the bottom).
3. WAIST FIST: the lower fist exactly like the low-fist crop: a clenched fist seen from the side with knuckles pointing right, the white wrap covering the back of the hand and the wrist, wrap stripes visible, ending at the left with a clean wrist opening. Drawn horizontally.
4. IMPACT FIST: a clenched fist punching straight at the viewer, seen from the front: four big knuckles in a row, finger segments visible, thumb across the front, wrap on the wrist below it, slightly larger than the others. Drawn upright, wrist at the bottom.
5. IMPACT FIST SIDE-ANGLE: the same clenched wrapped fist seen at 45 degrees from the front, knuckles toward the viewer and to the right, wrist at the bottom.

Same scale for all pieces: the head about 45 art pixels tall, the fists about 15 to 19 art pixels. Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No full character, no text, no labels, no watermark.
```

## 2026-11-13T17:15:54.625Z - s2-upper.png

- File: s2-upper.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6.1-sol)
- Thread: 01a1d5e7-a1d5-7083-a2e0-ef8bae3e7df0
- Reference images: kai-160-native-approved-reference.png, ref-upper-body-10x.png, ref-head-10x.png
- Seconds: 65.2

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the same reference's upper body magnified 10x with nearest-neighbor. The third is the approved head crop (10x) that sets the pixel size and rendering style for this sheet: one art pixel is a large 10x10 image-pixel block. Redraw these pieces of EXACTLY this character, copying the pixel-art rendering of the reference as faithfully as possible: same dark controlled outlines (thin, not a thick halo), same palette (navy-charcoal jacket with lighter purple-grey highlights, cream piping, black undershirt, warm tan skin, off-white wraps, gold epaulette), same cluster shading and fabric folds. Same three-quarter view, seen slightly from above.

Draw ONLY these 6 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. TORSO: the cropped short jacket seen three-quarter, with the open front, cream piping along both lapels and the hem, the tall standing collar with cream outline, the black undershirt visible in the opening, the neck opening showing a little skin. NO sleeves, NO arms, NO shoulder pads: the shoulders end as plain rounded stumps where sleeves would attach. About 52 art pixels wide and 46 tall. The bottom ends at the jacket hem.
2. EPAULETTE: only the gold shoulder pad with the small cream ball (button), exactly as on the reference's left shoulder, flat on its own. About 17 art pixels wide.
3. NEAR UPPER-ARM SLEEVE: a big puffy navy jacket sleeve hanging straight down, rounded top end (shoulder), widening in the middle with soft fabric folds, and at the bottom end an open sleeve cuff with a cream trim band wrapped around the opening (seen as a slightly oblique ring). About 24 art pixels wide and 40 tall.
4. FAR UPPER-ARM SLEEVE: the same kind of sleeve, a little narrower (about 21 art pixels wide, 38 tall), hanging straight down, with the cream cuff band at the bottom end.
5. NEAR FOREARM: a bare tan forearm hanging straight down, rounded top end (it goes inside the sleeve), the lower half covered by the off-white wrap with grey-brown stripe lines, ending at the bottom in a clean wrist opening. About 14 art pixels wide and 30 tall.
6. FAR FOREARM: the same forearm, slightly narrower, same wrap.

Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No full character, no head, no text, no labels, no watermark.
```

## 2026-11-13T17:16:45.243Z - s3-lower-a.png

- File: s3-lower-a.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6.1-sol)
- Thread: 01a1d5e8-a1b4-7211-9913-5c67ad33e246
- Reference images: kai-160-native-approved-reference.png, ref-lower-body-10x.png, ref-head-10x.png
- Seconds: 50.4

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the same reference's lower body magnified 10x with nearest-neighbor. The third is the approved head crop (10x) that sets the pixel size and rendering style for this sheet: one art pixel is a large 10x10 image-pixel block. Redraw these pieces of EXACTLY this character, copying the reference's pixel-art rendering faithfully: thin dark controlled outlines (no thick halo), baggy dark grey-purple trousers with lighter purple-grey highlight folds and dark shadow folds, golden sash with darker orange-brown shadow stripes, solid dark combat boots with a strap and a grey-brown sole. Three-quarter view, seen slightly from above.

Draw ONLY these 5 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. HIP BLOCK: the baggy trouser hip and seat region, one broad wide piece (about 44 art pixels wide, 24 tall). Its TOP edge is straight and flat (it hides under the sash). Its sides curve gently outward. Its BOTTOM edge is a plain wide inverted V (the crotch fold where the two legs begin). It must NOT look like two round buttocks and must have NO round bulge at the bottom; just cloth with a few diagonal folds.
2. SASH BAND: the golden sash wrapped around the waist with its knot at the right side, as in the reference, flat on its own: about 44 art pixels wide and 14 tall, no tails.
3. SASH TAILS: the two golden tails that hang down from the knot, one longer, overlapping slightly, about 18 art pixels wide and 28 tall.
4. NEAR THIGH: the very baggy trouser leg from the hip to the knee, hanging straight down, wide and voluminous with diagonal cloth folds; the top end is flat/open (it hides under the hips and sash), the bottom end gathers in at the knee. About 32 art pixels wide and 55 tall.
5. FAR THIGH: the same, slightly narrower (about 29 wide and 50 tall).

Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No upper body, no head, no text, no labels, no watermark. Wide 16:9. No upper body, no head, no text, no labels, no watermark.
```

## 2026-11-13T17:17:38.120Z - s4-lower-b.png

- File: s4-lower-b.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6.1-sol)
- Thread: 01a1d5e9-66b7-7321-b236-7031c23c27c8
- Reference images: kai-160-native-approved-reference.png, ref-lower-body-10x.png, ref-head-10x.png
- Seconds: 52.7

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the same reference's lower body magnified 10x with nearest-neighbor. The third is the approved head crop (10x) that sets the pixel size and rendering style for this sheet: one art pixel is a large 10x10 image-pixel block. Redraw these pieces of EXACTLY this character, copying the reference's pixel-art rendering faithfully: thin dark controlled outlines (no thick halo), baggy dark grey-purple trousers with lighter purple-grey highlight folds and dark shadow folds, golden sash with darker orange-brown shadow stripes, solid dark combat boots with a strap and a grey-brown sole. Three-quarter view, seen slightly from above.

Draw ONLY these 4 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped:
1. NEAR SHIN: the lower trouser leg below the knee hanging straight down: the top end rounded (knee), the bottom end gathered and tucked into the boot. About 24 art pixels wide and 34 tall.
2. FAR SHIN: the same, slightly narrower.
3. NEAR BOOT: one solid dark combat boot, three-quarter view, toe pointing toward the viewer and slightly to the left, with strap and grey sole, the shaft opening visible at the top. About 24 art pixels wide and 28 tall.
4. FAR BOOT: the same boot with the toe pointing toward the viewer and slightly to the right.

Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No upper body, no head, no text, no labels, no watermark. Wide 16:9. No upper body, no head, no text, no labels, no watermark.
```

## 2026-11-13T17:22:14.999Z - s5-limbs.png

- File: s5-limbs.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6.1-sol)
- Thread: 01a1d5ed-b3df-7c93-9677-2661ef45ae8a
- Reference images: kai-160-native-approved-reference.png, ref-upper-body-10x.png, ref-lower-body-10x.png, ref-head-10x.png
- Seconds: 47.8

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the reference's upper body magnified 10x with nearest-neighbor and the third is its lower body magnified 10x; the fourth is the head magnified 10x. They set the pixel size and rendering style: one art pixel is a large 10x10 image-pixel block. Redraw these limb pieces of EXACTLY this character, copying the reference's pixel-art rendering faithfully: thin dark controlled outlines (no thick halo), navy-charcoal jacket sleeves with lighter purple-grey highlight folds and cream cuff trim, warm tan skin, off-white wraps with grey-brown stripes, baggy dark grey-purple trousers with lighter purple-grey folds, solid dark combat boots with a strap and a grey-brown sole. Same three-quarter view, seen slightly from above.

IMPORTANT: these limbs are drawn FORESHORTENED, short and fat, as if pointing toward the viewer, exactly as short and chunky as the arms and legs look in the reference. Stick strictly to these SMALL sizes (in art pixels, one art pixel = one 10x10 block): do not draw them longer.

Draw ONLY these 8 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped, all hanging straight down:
1. NEAR UPPER-ARM SLEEVE: short puffy navy jacket sleeve, rounded top end (shoulder), baggy with soft folds, and at the bottom an open cuff with a cream trim band around the opening. 24 wide, only 28 tall.
2. FAR UPPER-ARM SLEEVE: the same kind, 21 wide, only 26 tall.
3. NEAR FOREARM: bare tan forearm, rounded top end (goes inside the sleeve), the lower 60 percent covered by the off-white wrap with grey-brown stripe lines, ending at the bottom in a clean wrist opening. 14 wide, only 22 tall.
4. FAR FOREARM: the same, 13 wide, only 21 tall.
5. NEAR SHIN: squat baggy trouser lower leg, rounded top end (knee), gathered hem at the bottom. 24 wide, only 22 tall.
6. FAR SHIN: the same, 22 wide, only 21 tall.
7. NEAR BOOT: one solid dark combat boot, three-quarter view, toe toward the viewer and slightly left, strap across the shaft, grey sole, shaft opening at the top. 20 wide, only 24 tall.
8. FAR BOOT: the same boot with the toe toward the viewer and slightly right. 20 wide, only 24 tall.

Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No full character, no head, no torso, no text, no labels, no watermark.
```

## 2026-11-13T17:29:53.912Z - s6-arms.png

- File: s6-arms.png (1672x941)
- Codex: 0.167.0-alpha.4.1 (model: gpt-6.1-sol)
- Thread: 01a1d5f4-b5f3-7883-af61-a41764e1fb61
- Reference images: kai-160-native-approved-reference.png, ref-upper-body-10x.png, ref-head-10x.png
- Seconds: 47.3

Prompt:

```text
Parts sheet for a 2D cutout (paper-doll) game rig. The FIRST attached image is the approved full character (reference). The second attached image is the reference's upper body magnified 10x with nearest-neighbor, and the third is its head magnified 10x. They set the pixel size and rendering style: one art pixel is a large 10x10 image-pixel block. Redraw these four ARM pieces of EXACTLY this character, copying the reference's pixel-art rendering faithfully: thin dark controlled outlines (no thick halo), navy-charcoal jacket sleeve with lighter purple-grey highlight folds, cream cuff trim, warm tan skin, off-white wrap with grey-brown stripe lines, gold epaulette with a small cream button.

IMPORTANT CONSTRUCTION: the sleeve and the cuff are separate pieces so the arm can bend at the elbow without a gap. The UPPER-ARM SLEEVE ends in a plain ROUNDED puffy elbow end with NO cuff, NO opening and NO cream trim. The FOREARM piece carries the cuff at its TOP: the flared end of the sleeve with the cream cuff trim ring around it, then the bare tan forearm emerging straight out of the cuff, then the off-white wrap over the lower half, ending at the bottom in a clean wrist opening. Both pieces hang straight down and are drawn foreshortened, short and chunky, exactly as short and fat as the arms look in the reference.

Draw ONLY these 4 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped. Sizes in art pixels (one art pixel = one 10x10 block): do not draw them larger.
1. NEAR UPPER-ARM SLEEVE: puffy navy sleeve, rounded shoulder top with the gold epaulette (with the small cream button) sitting on the top of the shoulder, rounded elbow end at the bottom, no cuff. 24 wide, 26 tall.
2. FAR UPPER-ARM SLEEVE: the same puffy sleeve without any epaulette, rounded top and rounded elbow end, no cuff. 21 wide, 24 tall.
3. NEAR FOREARM: at the top the flared sleeve end with the cream cuff trim ring (about 20 wide, 9 tall, ring seen slightly from the side, the dark inside of the sleeve visible only as a thin dark crescent behind the skin), the bare tan forearm coming out of the cuff, wrap over the lower half, wrist opening at the bottom. 20 wide at the cuff, 16 wide below it, 32 tall in total.
4. FAR FOREARM: the same, 18 wide at the cuff, 14 wide below it, 30 tall in total.

Draw every piece with big chunky 10x10 pixel blocks and NO finer detail than the magnified crops (no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background everywhere. Wide 16:9. No full character, no head, no torso, no text, no labels, no watermark.
```

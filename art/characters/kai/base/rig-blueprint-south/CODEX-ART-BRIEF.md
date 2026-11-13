# Codex art brief: paint Kai SOUTH parts onto the rig templates

**Task:** paint 26 final-art part PNGs for Kai (base form), SOUTH view. Each one fills the matching template in `templates/` exactly. Kai's design is fixed. The geometry is fixed. You are painting inside fixed shapes, not designing parts.

**Do not:** generate a parts atlas, crop pixels from `references/*.png`, `directions/*` or `pilot-south-v2/*`, resize or scale anything, or move pivots. Do not change any file under `rig-blueprint-south/`.

## 1. Inputs

| What | Where |
|---|---|
| Identity reference (face, hair, jacket, sash, trousers, boots, palette) | `../references/kai-160-native-approved-reference.png` (87×160, same 1:1 pixel scale as the templates) |
| One template per part (exact canvas, coverage and zones) | `templates/<part_id>.png` |
| Numbers (sizes, pivots, anchors, draw order, joints) | `rig-spec.json` |
| Visual map of all parts (4×, pivots and anchors marked) | `part-layout.png` |
| How the parts assemble (neutral), with pivots and cap circles | `neutral-assembly.png`, `pivot-overlay.png` |
| What the rig does to the parts | `qa/poses-3x-diagnostic.png`, `qa/joint-sweeps-5x.png`, `qa/debug-*.gif` |

## 2. Output

- Write to the new folder `art/characters/kai/base/parts-south-v3/`, one file per part, named `<part_id>.png` (for example `forearm_n.png`).
- Each file is 8-bit RGBA PNG with **the same width and height as its template**. Pixel (0,0) is the same pixel as in the template. Do not crop, pad or move the drawing.
- Alpha is 0 or 255 only. No antialiasing, no soft edges, no glow, no drop shadow.
- Use at most 24 unique colours per part, taken from Kai's reference palette (section 6).
- Native crisp pixel art at 1:1 scale. No upscaled art, no smoothing, no painterly smears, no new details that are not in the reference.

## 3. How to read a template

| Template pixel | Meaning | What you paint |
|---|---|---|
| Flat colour | Visible in the neutral pose | Final art for this part |
| Dark 1px ring | Visible silhouette edge | Kai's dark outline |
| Checker (2×2 darker squares) | **Hidden at the joint** in neutral, under the covering part. It becomes visible when the joint rotates | Paint it **completely** as a plausible continuation of the part (cloth, skin, boot). Do not draw an outline across it. Do not leave it empty or dark |
| Transparent | Outside the part | Leave alpha 0 |

The template colours are technical guide colours only. They are not Kai's colours. Replace every one of them with Kai art.

## 4. Rules that stop the earlier failures

1. **Exactly one owner per costume element** (`rig-spec.json` → `costume_ownership`):
   - The high collar is drawn **only** on `collar`. `head` stops at the jaw and has no collar. `torso` shows only the undershirt and lapels at the neckline, with no collar flaps.
   - Sleeves are drawn **only** on `upper_arm_*` (shoulder to elbow) and `forearm_*` (sleeve end, white cuff, bare forearm, wraps). `torso` has **no sleeves** and **no shoulder pads**. Its sides stop at the empty shoulder sockets.
   - The gold/white shoulder pad is **only** on `shoulder_trim_*`.
   - The sash band is on `pelvis`, the knot on `sash_knot`, the hanging tails on `sash_tail_a` and `sash_tail_b`. None of these appear on `torso`.
   - The neck skin is **only** on `neck`. Hair mass behind the head is on `hair_back`. Spikes and bangs are on `hair_front`. `head` has no hair mass.
2. **Legs are three separate solid pieces per side:** `thigh_*` (baggy trouser from hip to knee), `shin_*` (trouser below the knee, with its bottom tucked into the boot), `boot_*` (shaft, foot and sole as one solid boot). Never draw a boot on a shin, or a trouser on a boot.
3. **Hidden joint pixels are mandatory.** Each joint is a round cap centred on the pivot (`pivot-overlay.png`, orange circle). The minimum painted disk around each pivot is:

| Joint | Covering part (on top) | Hidden part (its cap must be painted) | Cap radius px | Seam sits under |
|---|---|---|---|---|
| hip_n / hip_f | pelvis | thigh_* top | 9.5 | trouser seat / hip bulge |
| knee_n / knee_f | thigh_* | shin_* top | 8.0 | trouser fold at the knee |
| ankle_n / ankle_f | boot_* | shin_* bottom | 7.0 | boot shaft top |
| shoulder_n / shoulder_f | shoulder_trim_* | upper_arm_* top | 7.0 | shoulder pad |
| elbow_n / elbow_f | forearm_* | upper_arm_* bottom | 6.5 | sleeve fold at the elbow |
| wrist_n / wrist_f | hand_*_fist / hand_*_open | forearm_* bottom | 4.5 | wrap edge at the wrist |
| sash tails | sash_knot | sash_tail_* top | 2.5 | inside the knot |
| waist | pelvis | torso lower 2/5 | (whole checker area) | sash band |
| neck | collar, head | neck | (whole checker area) | inside the collar / under the jaw |

   The covering part's own disk (cover radius = cap + 0.5 to 1 px) must also be fully painted. The covering part's round end is what shows at the joint, so give it a clean round silhouette and outline.
4. **Shading:** Kai's flat cel shading and outline. Avoid a strong light gradient that runs across a joint, because rigid parts rotate their baked shading with them.
5. **Sides:** `_n` (near) = Kai's right side = screen-left. `_f` (far) = Kai's left side = screen-right. Far parts may be one value step darker. Do not mirror the face. The far parts' templates are already mirrored.
6. **Hands:** `hand_*_fist` is a closed, wrapped fist. `hand_*_open` is an open hand with the fingers pointing down and the thumb toward the body. Both hang from the same wrist pivot.

## 5. Parts checklist (26 parts, all numbers from `rig-spec.json`)

Image coordinates start at the top-left **corner**. 7.5 means the centre of pixel column 7. Anchors are where child parts attach, in this part's image coordinates.

| # | part id (file) | size WxH | pivot (img px) | child anchors (img px) | hidden px | draw | covered at joint by |
|---|---|---|---|---|---|---|---|
| 1 | `hair_back` | 38x33 | 19,16 | - | 719 | 0 | head, hair_front |
| 2 | `shin_f` | 18x41 | 9,9 | boot_f 9,33 | 474 | 1 | thigh_f, boot_f |
| 3 | `boot_f` | 20x27 | 10,14 | sole contacts inner 2,26, outer 18,26 | 0 | 2 | - |
| 4 | `thigh_f` | 25x53 | 12,10 | shin_f 12,44 | 311 | 3 | pelvis |
| 5 | `shin_n` | 18x41 | 9,9 | boot_n 9,33 | 474 | 4 | thigh_n, boot_n |
| 6 | `boot_n` | 20x27 | 10,14 | sole contacts inner 18,26, outer 2,26 | 0 | 5 | - |
| 7 | `thigh_n` | 25x53 | 13,10 | shin_n 13,44 | 311 | 6 | pelvis |
| 8 | `torso` | 34x47 | 17,40 | neck 17,6, collar 17,6, shoulder_trim/upper_arm_n -2,12, shoulder_trim/upper_arm_f 36,12 (sockets lie outside the torso: leave them empty) | 653 | 7 | pelvis, neck, collar, shoulder_trim_n, shoulder_trim_f |
| 9 | `pelvis` | 42x30 | 21,17 | spine 21,7, sash_knot 27,6, thigh_n 11,19, thigh_f 31,19 | 84 | 8 | sash_knot |
| 10 | `sash_tail_b` | 9x23 | 3.5,4 | - | 26 | 9 | sash_knot |
| 11 | `sash_tail_a` | 8x26 | 4.5,4 | - | 26 | 10 | sash_knot |
| 12 | `sash_knot` | 14x10 | 7,5 | sash_tail_a 5.5,6, sash_tail_b 8.5,6 | 0 | 11 | - |
| 13 | `neck` | 10x17 | 5,10 | head 5,6 | 48 | 12 | collar, head |
| 14 | `collar` | 26x20 | 13,13 | - | 52 | 13 | head |
| 15 | `head` | 30x34 | 15,32 | hair_back 15,12, hair_front 15,6 | 218 | 14 | hair_front |
| 16 | `hair_front` | 48x25 | 24,15 | - | 0 | 15 | - |
| 17 | `upper_arm_f` | 16x36 | 8,8 | forearm_f 8,29 | 316 | 16 | shoulder_trim_f, forearm_f |
| 18 | `shoulder_trim_f` | 18x18 | 9,9 | - | 0 | 17 | - |
| 19 | `forearm_f` | 16x30 | 8,8 | hand_f 8,25 | 70 | 18 | hand_f_fist, hand_f_open |
| 20 | `hand_f_fist` | 14x18 | 7,6 | - | 0 | 19 | - |
| 21 | `hand_f_open` | 14x20 | 8,6 | - | 0 | 20 | - |
| 22 | `upper_arm_n` | 16x36 | 8,8 | forearm_n 8,29 | 316 | 21 | shoulder_trim_n, forearm_n |
| 23 | `shoulder_trim_n` | 18x18 | 9,9 | - | 0 | 22 | - |
| 24 | `forearm_n` | 16x30 | 8,8 | hand_n 8,25 | 70 | 23 | hand_n_fist, hand_n_open |
| 25 | `hand_n_fist` | 14x18 | 7,6 | - | 0 | 24 | - |
| 26 | `hand_n_open` | 14x20 | 6,6 | - | 0 | 25 | - |

Recommended painting order: torso → pelvis → collar/neck/head → hair_front/hair_back → near arm chain → near leg chain → copy and adapt to the far side → sash pieces → open hands.

## 6. Palette (sampled from the approved reference)

skin `#d99769` / light `#e39e71` · hair `#444b54` · jacket `#342c3a` / light `#3c3343` · undershirt `#322c38` · gold trim `#d89b39` · sash `#b77423` / shadow `#7a4c22` · trousers `#716374` · boots `#4c4152` / sole `#6c5f63` · wraps `#fcecdb` · outline: Kai's near-black. The full median-cut cluster list is in `rig-spec.json` → `art_constraints.palette_reference_clusters`.

## 7. Acceptance per part (automatic)

```
python art/characters/kai/base/rig-blueprint-south/scripts/check_part.py art/characters/kai/base/parts-south-v3
```

A part PASSES only if all of these hold:
- File name is a known part id, and the size equals the template.
- Alpha is binary.
- 100% of the template's checker (hidden-at-joint) pixels are opaque.
- Every interior template pixel is opaque. The silhouette may move by at most 1 px, and only at the outer edge.
- No opaque pixel is more than 1 px outside the template silhouette.
- IoU with the template is at least 0.93.
- The pixels around the pivot and around each in-image anchor are opaque.
- 24 colours or fewer.
- At most 20% of the pixels still use template guide colours.

The command also lists any missing parts. All 26 must PASS.

## 8. Visual check before handing back

```
python art/characters/kai/base/rig-blueprint-south/scripts/preview_painted.py art/characters/kai/base/parts-south-v3 art/characters/kai/base/parts-south-v3/_preview
```

Then inspect `_preview/sheet-3x.png` and `_preview/sheet-1x.png` (the native 160 px look). Check that:
- the neutral pose reads as approved Kai;
- the collar and sleeves appear once;
- no seam shows background colour;
- revealed joint areas look like cloth or skin, not cut edges.

Report any part you could not make fit. Do not redraw the template to make it fit. Final approval is the user's.

# The Character Animation Bible
## AI-Assisted, Reusable 2D Character Art, Rigging, Motion, and Game Integration

**Edition:** 1.0 — 12 November 2026  
**Primary baseline:** `Reusable-Rigid-Cutout-Real-Hero-Jump-Dodge-Review.zip` — reusable rigid-cutout pipeline **v1.1**  
**Purpose:** The durable source of truth for Crownflare, Veyrshift, and future original games.  
**Current verdict:** **STRUCTURAL PIPELINE VALIDATED; PRODUCTION ART AND FINAL MOTION QUALITY NOT YET SIGNED OFF.**  
**Approach:** Free-first, reproducible, configurable, Blender-based, image-model-assisted where suitable, with human visual approval.

> **North star:** Produce one genuinely appealing, consistently designed character as **complete, animation-ready parts**; attach the pieces to **one editable rig**; author many actions on that rig; render consistent sprites; reuse the process for the next character **without rewriting character-specific Python**. Do not mistake a functioning script, exact neutral pose, clean joint, or attractive still image for production-quality motion.

---

## Contents

1. [The goal and the non-goals](#1-the-goal-and-the-non-goals)
2. [Current truth: proven, conditional, not implemented](#2-current-truth-proven-conditional-not-implemented)
3. [Chronology: every important experiment and lesson](#3-chronology-every-important-experiment-and-lesson)
4. [Our breakthrough: why rigid cutouts worked](#4-our-breakthrough-why-rigid-cutouts-worked)
5. [Golden rules for character art](#5-golden-rules-for-character-art)
6. [A repeatable ImageGen-to-parts workflow](#6-a-repeatable-imagegen-to-parts-workflow)
7. [Pivots, hierarchy, layering, and rig rules](#7-pivots-hierarchy-layering-and-rig-rules)
8. [Our actual pipeline v1.1: architecture and files](#8-our-actual-pipeline-v11-architecture-and-files)
9. [How to add characters and animation actions](#9-how-to-add-characters-and-animation-actions)
10. [Animation direction: run, idle, attacks, jump, dodge](#10-animation-direction-run-idle-attacks-jump-dodge)
11. [Root motion, events, and engine integration](#11-root-motion-events-and-engine-integration)
12. [Quality gates and acceptance criteria](#12-quality-gates-and-acceptance-criteria)
13. [Known defects and their correct remedies](#13-known-defects-and-their-correct-remedies)
14. [What is not supported yet](#14-what-is-not-supported-yet)
15. [How to approach transformations, combos, and advanced moves](#15-how-to-approach-transformations-combos-and-advanced-moves)
16. [How the tools fit together](#16-how-the-tools-fit-together)
17. [Rules for Codex, Claude, and other AI coding agents](#17-rules-for-codex-claude-and-other-ai-coding-agents)
18. [Efficient development with limited model usage](#18-efficient-development-with-limited-model-usage)
19. [Game-specific guidance: Crownflare and Veyrshift](#19-game-specific-guidance-crownflare-and-veyrshift)
20. [Milestones, priorities, and stop conditions](#20-milestones-priorities-and-stop-conditions)
21. [Reference files and exact commands](#21-reference-files-and-exact-commands)
22. [External resources and provenance](#22-external-resources-and-provenance)
23. [One-page checklist](#23-one-page-checklist)
24. [The final principles](#24-the-final-principles)

---

## 1. The goal and the non-goals

### The actual goal

We are **not** trying to create a pretty GIF of one character. We are trying to build a **repeatable character animation production system** that we can take from game to game:

1. Start with a locked visual identity and game art direction.
2. Create consistent, complete **independently movable body-part assets**.
3. Assemble an editable, poseable rig with clear joint locations and draw order.
4. Animate new actions without regenerating the entire person every time.
5. Make action templates reusable, with character-specific parameters in JSON.
6. Export transparent frames/sheets and a timing/event manifest.
7. Integrate animation with collision, physics, combat, audio, VFX, and states in the game.
8. Validate a **second, visually different character** with the same shared code.
9. Preserve source artwork, rig data, configuration, exports, reviews, and reproducible commands.

### Explicit non-goals

- **Not** endlessly repairing one failed neutral illustration.
- **Not** trusting a model's “PASS” because a ZIP, rig, or unit test was generated.
- **Not** rebuilding an existing finished game solely to accommodate an experimental pipeline.
- **Not** requiring paid Spine or other proprietary software to use our proven baseline.
- **Not** pretending that one humanoid side-view profile automatically works for quadrupeds, multiple viewpoints, or 3D moves.
- **Not** assuming every future animation can be produced with config changes only. **A new movement type requires a shared animation template**, and some poses need new artwork.
- **Not** expecting an image-generation model to produce ready-to-rig source art consistently without inspection, selection, and editing.

**Definition of long-term success:** A real, art-approved hero from a production game, authored in complete layers, can gain Idle/Run/Attack/Jump/Dodge **plus a newly requested action** using the existing shared pipeline, with acceptable real-speed motion and correct actual gameplay behavior. Then repeat on another production hero.

---

## 2. Current truth: proven, conditional, not implemented

### Evidence from the latest delivered package

The user-provided baseline is `Reusable-Rigid-Cutout-Real-Hero-Jump-Dodge-Review.zip` (archive top folder: `reusable-rigid-cutout-pipeline-v1.1/`). The archive's SHA-256 was independently checked for this document:

```text
30306f8409a098c88dd47f30ca17eb3afe93fa5de1be9c3d646c542f369346d0
```

The ZIP CRC test returned no corrupt member. The claims below are identified either as **directly confirmed by source/archive inspection**, **reported by the included validation run**, or **still dependent on artistic/gameplay review**. The full Windows Blender suite was run by the producing agent according to the archived logs; this document does **not** claim a fresh Windows/Blender rendering run by its author.

| Capability | Status | Evidence / limitation |
|---|---|---|
| One editable Blender armature with rigid textured parts | **Validated in delivered build** | Wren `.blend`, scripts, packed images, post/reopen reports |
| Shared code for distinct characters | **Validated structurally** | Mira, synthetic courier-bot mannequin, and Wren; per-character configs; no character-specific Python required |
| Independent character proportions and images | **Validated structurally** | Mannequin legs ≈40% of Mira's; different anchors, image sizes, far hand, accessories and crop |
| Per-character motion adjustment without shared-code edits | **Validated** | JSON `overrides`, `adjust`, and mannequin lean variant |
| Six clip types | **Implemented** | `idle_v1`, `run_v1`, `attack_v1`, `jump_v1`, `dodge_v1`, `stress_v1` (stress is QA, not a game action) |
| Transparent sprites, contact sheets, manifest | **Implemented** | Wren 288×384 and 144×192 outputs; frame origins, fps, looping and event indices |
| Reproducible output | **Reported PASS** | Wren 105/105 bit-identical frames over two builds; Mira and mannequin regressions 68/68 each |
| Rig pose fidelity, no joint gap suspects | **Reported PASS** | Wren 16 planes, 10 packed images, ~0.0003px max pose difference and no joint-cover warnings in tests |
| Actual high-quality ImageGen artwork | **NOT tested in v1.1** | Wren is **script-drawn SVG/vector art**, not ImageGen; art approval pending |
| Beautiful movement at real playback speed | **NOT signed off** | Producing agent reviewed still/contact sheets, not real-speed motion; owner must review |
| Professional combat acting | **NOT signed off** | Attack still an open-palm strike; Dodge can read as squat; Jump modest |
| Real playable game integration | **NOT proven by v1.1** | Engine physics, hit registration, collision, timing, controller responsiveness still require a playable test |
| Transformations, drawing swaps, combos, 3D turns | **Not generally implemented** | Requires new shared features/templates and sometimes alternate images/anatomy |

**The precise conclusion:** The **architecture works**, including cross-character builds and multiple action templates. **Visual production readiness is conditional.** Do not say “all animations are solved.”

### Two kinds of reuse — never confuse them

**Rig reuse:** A character's body-part images and bone structure can be kept while new motions are authored. **This is demonstrated for Mira and Wren.**

**Pipeline reuse:** Another character gets its own art and JSON config but uses the **same build, validation, animation-template, Blender, and export code**. **This is demonstrated structurally across three substantially different fixtures**, though the second truly production-grade image-generated hero has not yet been approved.

---

## 3. Chronology: every important experiment and lesson

This is the condensed history, preserving both failures and successes. Some older numeric results derive from the earlier archived technical reports; they are not new measurements of the latest build.

| Experiment | What it taught us | Why we kept moving |
|---|---|---|
| **Crownflare / Iona:** independently generated sprites and pose variants | Image generation can deliver beautiful individual poses; consistency across dozens of frames and states is hard | Scale, body shape, feet anchoring, facial details and action continuity drifted |
| **Blender procedural 3D character pilots** | AI agents can drive Blender, build skeletons, render frames, and export | Character looked toy-like vs beautiful concept; technically rigged ≠ attractive source model |
| **Image-to-3D via TripoSR** | Generated a real 28,483-vertex mesh from one image | Fused/coarse anatomy and unsuitable topology; vertex count is not animation quality |
| **Blender art-layer cutouts** | Preserved more of the illustration than primitive 3D | Motion stiff; visible-only parts exposed missing hidden material |
| **Rigby2D neutral alignment** | Correct layer order and half-pixel root alignment could achieve exact standing-sprite match | **Pixel-perfect neutral does not prove good animation** |
| **Rigby2D motion refinement** | Functional rigs and constraints can still march, gap, and shear | Needed better source art and posing, not more generic numbers |
| **ImageGen full-pose fox courier sheets** | Gave some of the best-looking animation frames | Blender was switching whole images; **not a reusable skeletal character** |
| **COA Tools 2 weighted-rig prototype** | Genuine Blender armature and skinning worked (20 bones, constraints/IK) | Distorted knee/hips/shoulders/boots in dynamic poses |
| **COA run-only retry** | More dramatic keys exposed more seam/stretch defects | Repair prompt wrongly prohibited correcting artwork and rig construction |
| **Knee-specific repair** | Corrected weight placement helped 0–90° knee continuity | Hip, shoulder, sleeve and skin failures remained |
| **Complete joint reconstruction** | 18 reconstructed art layers, new contours, pivots, boots, 31-ish proof poses | Knees and wrists improved; hips, ankles, shoulders and elbows still failed; reconstruction used many interpolated/smeared pixels |
| **Claude rigid-cutout proof** | **Found complete, previously generated body-part art** in `assets/art/parts/`; built a Python paper-doll rig and 8/16-frame run | First strong evidence the *source-art strategy*, not just weights, was wrong |
| **Blender rigid import** | Imported rigid body parts into an editable Blender armature; Run/Idle/Attack on one rig | Same character supported 3 actions; still had run clipping, subtle idle, weak open-palm strike |
| **Configurable reusable pipeline v1** | Mira + unlike synthetic mannequin built from independent configs with no shared Python changes | Structural reuse proved; production-art reuse not yet proven |
| **Reusable rigid-cutout pipeline v1.1** | Added Jump/Dodge as **shared templates**; Wren + Mira + mannequin, per-character configs, RGBA outputs and manifest root-motion events | **Our current baseline**; visual art, playback, advanced actions and game integration still need approval |

### The abandoned source-art mistake

The breakthrough explanation from Claude was exceptionally important: early ImageGen sessions produced separate **whole arms, whole legs, boots, head and torso**, but earlier agents prioritized an exact match to a finished neutral illustration. They discarded the complete parts and cut the standing illustration instead. That traded a less exact neutral pose for severe joint failure everywhere else.

**Rule:** A rig that moves well with a slightly different neutral illustration is usually more useful than a pixel-perfect neutral sprite that disintegrates when it moves. Do not sacrifice the animation-ready construction to reproduce one finished image exactly.

### The engineering diagnosis from the failed weighted rig

Inspection of the older COA recovery scripts identified concrete defects, not merely aesthetic preferences:

- Upper-leg bone positions were suspiciously displaced relative to visible thigh artwork (one candidate used Y≈790 while upper-thigh pixels began around Y≈620). This was an anatomical-alignment **hypothesis** based on script/art inspection, not a sole proven cause.
- Hidden material was not truly painted: code reused existing alpha and interpolated nearby pixels.
- Weighted mesh geometry included regular rectangular grids with smoothing driven substantially by **image Y position**, without conforming adequately to actual joint contours.
- Boots and rigid costume elements were driven as if stretchable fabric.
- Draw order and near/far layering needed independent validation.
- Foot-target coordinates and good loop seams did not establish natural ground contact.
- Even later reconstruction could not visually reconnect every collar, hip, shoulder and elbow.

**Transferable lesson:** For a smoothly deforming mesh, design true deformable art and anatomy-aware weights. For a rigid illustrated costume, use complete, overlapping cutouts. Neither method is universally superior; they solve different art problems.

---

## 4. Our breakthrough: why rigid cutouts worked

### Previous failure mode: deforming and patching a finished image

```text
Finished illustration
       ↓ cut into whatever is visible
Incomplete upper arms / thighs / sleeves
       ↓ add mesh weights / extrapolate pixels
Geometry bends, art shears, concealed surfaces are missing
       ↓ rotate joints
Hard seams, stretched details, disconnected anatomy
```

### Current successful construction: complete pieces connected like a puppet

```text
Locked character design
       ↓ prepare parts as independently complete artwork
Head | Torso | Upper arm | Forearm | Hand | Thigh | Shin | Foot | accessories
       ↓ rounded joint caps + deliberate overlap + costume seams
Pivoted rigid textured pieces
       ↓ shared bone hierarchy and animation keys
Run / Idle / Attack / Jump / Dodge / Stress
       ↓ transparent render/export with shared origin and manifest
Game sprites, reproducible source project, technical evidence
```

A **rigid cutout** rotates each image as one piece around a measured pivot. There are no limb mesh weights to stretch painted boots and bracers. Rounded hidden caps continue to cover the joint when adjacent parts rotate. Costume edges disguise any remaining hard seams.

This works especially well for **side-view stylized action characters with gloves, boots, sleeves, belts and armor pads**. It can look paper-doll-like if the shapes, cut locations, or animation are wrong; it does not create anatomical or dramatic realism automatically.

**Avoid false absolutes:** “Never use meshes” is incorrect. Mesh deformation is excellent for soft bodies, cloth, hair, flags, torso bending, and carefully weighted artwork. Our **specific art and pipeline** benefited from rigid pieces. See [Spine mesh attachments](https://us.esotericsoftware.com/spine-meshes) for what weighted meshes are designed to do.

---

## 5. Golden rules for character art

**Art is the highest-leverage input.** A skeleton can reposition an image. It cannot produce missing anatomy or convincing unseen clothing.

### Hard rules

1. **One canonical identity.** Lock face, hair, silhouette, outfit, palette, body proportions, accessories, line weight, and camera angle before parts production.
2. **Start with independent complete parts**, not the visible fragments of a fully assembled illustration.
3. **Include hidden material**: shoulder/hip ball tucked under torso, knee under trouser fabric, elbow under sleeve/cuff, ankle inside boot shaft, neck under collar.
4. **Draw straight or relaxed limbs.** A straight limb part can rotate in more directions. Do not bake a 90° bend into the only version of a shin.
5. **Round joint ends around the pivot** so the parent and child overlap even at large angles.
6. **Hide cuts under plausible clothing boundaries**: pauldron, sleeve edge, glove cuff, bracer, belt, coat skirt, boot collar.
7. **Give rigid costume hardware its own piece or keep it rigid with the appropriate parent bone.** Never stretch decorative buckles through knees.
8. **Split anything that must move independently**: ponytail, scarf tail, cape flap, weapon, shield, backpack, separate shoulder pad.
9. **Use controlled/consistent lighting.** If strong painterly light is baked into a rigid arm, that light rotates with the arm. Flat/cel shading and clear outlines tolerate this better.
10. **Use 8-bit RGBA PNG** with genuine transparency and safe transparent margin; clean edge colors to prevent halos.
11. **Keep the full source-res master.** Export different game sizes from that source instead of repeatedly rescaling old exports.
12. **Approve both neutral assembly AND bend stress poses.** An attractive pose at rest is not sufficient.

### Required part inventory (minimum side-view humanoid)

| Piece | Artwork specification | Must expose / conceal |
|---|---|---|
| Head + neck stub | Strict profile, complete neck, controlled hair | Neck join under collar/cowl |
| Torso/pelvis | Shoulders, waist, hip sockets, costume overlap | Hip and shoulder roots even when limbs swing |
| Upper arm | Straight, rounded shoulder and elbow ends | Under pauldron and upper sleeve |
| Forearm | Complete, round at elbow and wrist | Under sleeve cuff/bracer |
| Hand | Open hand by default; alternate fist when combat needs it | Under glove cuff |
| Thigh | Complete hip ball, knee cap | Under belt/coat tail and trouser joint |
| Shin | Knee cap and ankle/boot shaft | Under trouser knee and boot collar |
| Foot/boot | Full profile foot with heel/toe contacts and ankle cap | Under boot shaft |
| Optional accessories | Separate if independently animated | Scarf tail, ponytail, weapon, cape, pauldron, etc. |

**Both sides:** Near and far limbs may share one source image with far-side tint **if visual symmetry is acceptable**. Use distinct near/far source art if silhouette, accessories, lighting, foreshortening, or hand pose differ. Wren currently shares arms/legs on both sides; this is a known **art limitation**, not a general requirement.

### Red flags that require art changes—not animation math

- A rotating limb reveals a completely flat/cut-off texture edge.
- A sleeve contains painted skin that stays behind when the arm rotates.
- A boot hinge exposes a triangular empty gap.
- A decorative stripe or fabric fold breaks unnaturally across the joint.
- A hand must become a fist but only an open palm exists.
- A scarf is baked into the head, then expected to sway independently.
- An attack requires a dramatic 3/4-view pose but only exact side-view images exist.

These are not “one more weight slider” issues.

---

## 6. A repeatable ImageGen-to-parts workflow

**Important status:** This is our **recommended future production-art process**, not an accomplished quality gate for v1.1. Wren's delivered artwork came from hand-authored SVG geometry; no image-generation tool was used in that run.

### Stage A — define the game art contract

Before generating anything, define:

- Game camera: side-profile, facing right, orientation conventions, whether mirror-left is acceptable.
- Intended screen size: e.g., original illustration rendered to 144×192; final game engine display scale and filtering.
- Body proportion guide: head/body ratio, leg-to-torso, arm length, boot size, hand silhouette.
- Canonical clothing, front/far details, color palette, shading, outline thickness.
- Animation demands **before** creating art: fists? weapons? cape motion? jumping tucks? transformations? low slides? aerial somersaults?
- Style match to the **actual game**. A beautiful cel-shaded hero may still look wrong against a crisp pixel-art Crownflare scene. “Game-ready” includes style coherence.

### Stage B — generate the identity reference

Generate a single approved full-body side-view character at standing rest, with stable details. Keep the exact approved image and a written art contract. Avoid asking different image-generation sessions to reinterpret the design independently.

### Stage C — generate a **complete parts sheet** using that reference

Preferred model prompt template:

> Use the attached approved character reference as the locked identity. Create **one complete animation-ready parts sheet** for a side-view rigid-cutout game rig, facing right, transparent background, identical style, palette, scale and proportions. Arrange separate objects with clear transparent spacing: head and neck stub; full torso and pelvis; complete upper arm; complete forearm; open gloved hand and clenched fist; complete thigh; complete shin; separate boot/foot; and any scarf tail/hair/weapon pieces that need independent movement. Draw every limb **straight**, with concealed shoulder/hip/elbow/knee/wrist/ankle material and **circular overlapping joint caps centered on the expected pivot**. Put seams under plausible cuffs, belt, pauldron and boot collar. No grid, labels, text, shadows, extra limbs, crop, background, or duplicate accessories. Retain the character's exact face, outfit, silhouette, and art finish.

**Do not blindly assume the model followed the prompt.** Check part-by-part. Generation may merge fingers, omit concealed caps, mismatch boots, crop hair, or introduce inconsistent geometry.

### Stage D — extract and prepare assets

1. Save the approved original art and sheet as immutable source.
2. Cut each independent part into its own transparent PNG, with margins.
3. Retain the same source pixel scale and orientation across all extracted parts.
4. Inspect alpha fringe, cut edges, duplicated sleeves, outlines and color differences.
5. Redraw missing hidden pieces where necessary. Do not claim automatic color smearing is new original anatomy.
6. Record each image's pivot and child anchors **in its own pixel coordinates**.
7. Run `tools/part_diagnostics.py` and inspect the annotated pivot sheet.
8. Assemble neutral, then stress knees/hips/elbows/shoulders/ankles before animating.
9. If the art fails, revise **art**, not a working core rig script.

### Stage E — art approval

Approve side-by-side: locked reference, parts sheet, neutral assembly, extreme-joint stress sheet, and transparent render at intended game scale. Check face/clothing consistency at normal scale **and** magnified inspection. Do not accept an agent's “it looks coherent” as owner approval.

### Extra pieces worth preparing at the outset

- Open palm and closed fist (with named replacement attachment mechanism when available).
- A separate weapon held in a properly designed grip.
- Hair/scarf/cape elements intended for secondary animation.
- Alternate crouch / fully tucked / extended attack drawings when rigid rotation causes unacceptable silhouette.
- Transformation form's complete accessory/body-part set with compatible or explicitly new pivots.

### If using full frame ImageGen instead

Sometimes we should **choose a frame-by-frame pipeline on purpose**: generate several coherent action poses, choose frames, correct anatomy, anchor feet, and export a sprite sheet. This can produce stronger dramatic movement but does **not** give our reusable skeleton/rig. Label that as a **frame-based action**, not a successful rigging test. We can mix both methods per action in a game with explicit transitions.

---

## 7. Pivots, hierarchy, layering, and rig rules

### Coordinate conventions for our pipeline

- Character image coordinates: **x right, y down**.
- Characters in the current `biped_side_v1` profile face **right (+x)**.
- `parts[].pivot` is inside the **child part's image**, at the true anatomical rotation center.
- `parts[].anchors` are in the **parent part's image**; child bones attach at named parent anchors.
- The character scene has `root_x` and `ground_y` in source-image pixel space.
- The foot has named heel/toe contact anchors; **toe last** for contact modeling.
- All exported action frames share one canvas and one **sprite origin** relative to the ground line.

### Required side-view biped chains

```text
body (torso/root, pivot approximately between hips)
├── head
├── upper.near → fore.near → hand.near
├── upper.far  → fore.far  → hand.far
├── thigh.near → shin.near → foot.near
├── thigh.far  → shin.far  → foot.far
└── any additional rigid bones: scarf, hair, pad, pack, antenna, weapon...
```

The validator enforces the supported profile's hierarchy. **Don't silently add an extra limb or change parent chains and then call the config compatible.** A new anatomy profile is a new engineering milestone.

### Draw order

Art layers are **back to front**, and must make physical sense throughout a full action. A reasonable starting order is far accessories → far arm/leg → pelvis/torso → near leg/arm → front costume covers/hand/head, adjusted for the approved design. Some parts should be added as separate overlay planes to hide seams without covering hands or faces incorrectly.

Diagnose every problematic crossing. Avoid fixing a shoulder seam by sending all far-leg sprites in front of the hero.

### Pivots cannot be guessed from rectangles

For each limb, mark: center of round cap, corresponding parent anchor, actual limb axis, and foot contact. Generate a visible pivot overlay. Rotate one joint through its stress angles. If the hinge opens or the limb rotates from the wrong place, **fix pivot/art first**. Ignore arbitrary bbox midpoints unless verified against anatomy.

### Rigid cutout versus soft deformation

- **Default proven path:** Single-bone rigid PNG planes; no skin weights or mesh modifiers.
- **Good future extension:** Optional mesh/IK/shape-corrective system for cloth, flexible torsos or hair **when justified by the art**.
- **Do not** globally convert all rigid parts to weighted continuous meshes as a reaction to a visible seam.
- **Do not** claim this path can stretch into front-facing foreshortening; major viewpoint changes need different art/rig/profile.

---

## 8. Our actual pipeline v1.1: architecture and files

### Runtime and project shape

- Tested on **Windows with Blender 5.2.3 LTS**.
- Default Blender executable in the shipped project: `F:\Blender\blender-5.2.3-windows-x64\blender.exe`; override with `set BLENDER=C:\path\to\blender.exe` if needed.
- Primary language: Python scripts executed with Blender's bundled Python/NumPy; optional local Python + Pillow/ffmpeg for auxiliary previews.
- `profile`: `biped_side_v1`; config schema: `rcp.character/1`.
- Editable Blender result: one armature, one rigid textured plane per visible instance (draw-order entry), named animation Actions, packed PNGs.
- Rendering: transparent sprite images and strip sheets with a consistent crop/origin; manifests and QA reports.
- **No COA Tools add-on is needed for this successful baseline.** It uses native Blender Python and rigid bone-parented image planes.

### Essential project tree

```text
reusable-rigid-cutout-pipeline-v1.1/
├── rcp.bat                      # Windows command entry
├── run_validation.bat          # Full acceptance suite
├── README.md                   # Setup and Phaser example
├── QUICKSTART.md               # Create/build/tune quick start
├── REPORT.md                   # Latest v1.1 results and caveats
├── RUN-VALIDATION.md           # Exact suite results
├── docs/
│   ├── ART-PREPARATION.md      # Detailed layered-art contract
│   ├── SCHEMA.md               # JSON profile, action templates, root motion
│   └── TROUBLESHOOTING.md      # Symptoms and fixes
├── rcp/
│   ├── cli.py                  # Commands
│   ├── config.py               # Config parsing
│   ├── validate.py             # Art, anchors, schema and event checks
│   ├── rig.py                  # Pose / hierarchy math
│   ├── templates.py            # Shared actions (THE place for new movement kinds)
│   ├── blender_build.py        # Blender rig/actions/render builder
│   ├── post.py / resize.py     # Sprite outputs, checks
│   ├── verify_blend.py         # Reopen verification
│   ├── compare.py              # Regression comparisons
│   └── ...                     # Related modules
├── templates/character.template.json
├── examples/
│   ├── mira/                   # Original attractive character; regression fixture
│   ├── mannequin/              # Synthetic courier bot; structural fixture
│   ├── scout/                  # Wren; SVG-authored character with six actions
│   └── regression/             # Mira/mannequin with Jump/Dodge added
├── tools/
│   ├── part_diagnostics.py     # Pivot/anchor overlays
│   ├── dry_run.py              # Optional fast visual preview
│   ├── review.py               # Contact sheets / GIF / MP4 review
│   ├── selftest.py             # Negative tests
│   └── ...
└── outputs/<character>/
    ├── blender/<character>.blend
    ├── sprites/<size>/<Action>/*.png
    ├── sprites/<size>/<Action>.png
    ├── sprites/<size>/manifest.json
    ├── preview/              # Review, not gameplay source
    ├── masters/
    └── evidence/             # Validation/reopen/post checks
```

### Why this is a *pipeline* rather than one demo

The code reads a **character JSON**, not literal Mira/Wren bone coordinates buried in every function. Body images, pivots, parent anchors, output sizes, tints, actions and overrides live in config. A new character with the **same supported biped profile** can be built without editing the shared Python. A new action *type* still needs a shared template (see below).

### Important source-of-truth warning

**Blender edits do not round-trip into JSON.** If someone manually changes an animation in the `.blend` and runs `rcp.bat build` again, the generated file can overwrite those changes. Therefore either:

- make the change in JSON/templated source, **or**
- preserve the edited Blender scene as a separately named, intentionally manual final asset and render from it via a documented process.

Never silently overwrite an approved manual animation when regenerating.

---

## 9. How to add characters and animation actions

### Practical first commands

Run in Windows Command Prompt from the project root:

```bat
cd /d F:\Blender2D-RigFirst-Pilot\reusable-rigid-cutout-pipeline-v1.1

rem Verify working baseline
rcp.bat validate examples\scout\character.json
rcp.bat build examples\scout\character.json
python tools\review.py outputs\scout hi

rem Full baseline regression suite (only when appropriate)
run_validation.bat
```

The script should run without wiping original or approved art. Preserve delivered ZIP and original source paths separately.

### New character recipe

1. **Copy** an existing example config or `templates/character.template.json` into a new character folder.
2. Place complete RGBA part images in that folder's `parts/`.
3. Set `id`, `art_dir`, profile, scene `root_x`/`ground_y`, camera (`"auto"` recommended initially), and output sizes.
4. For each part, define `image`, `pivot`, optional `anchors` and `scale`.
5. Define the two humanoid limb chains, parent `attach` anchors, and foot heel/toe `contacts`.
6. Set `draw_order`, optional near/far tints and separately movable accessory bones.
7. Configure desired animations with existing shared templates.
8. Inspect part pivots, validate errors, create a dry run, build, and **watch real-speed** outputs.
9. Apply **character-specific motion tuning in JSON**; do not edit shared scripts just to change Wren's leg dip.
10. Save the character config alongside source artwork and approval evidence.

### Shared template naming and clip semantics

| Shared template | Purpose | Current default export (Wren example) | Reusable? |
|---|---|---|---|
| `idle_v1` | Grounded breathing / small sway | 24 frames at 12 fps, loop | Yes, **tune foot stance per proportions** |
| `run_v1` | Key-pose running loop | 16 frames at 24 fps, loop | Yes; verify foot contact and engine speed |
| `attack_v1` | Anticipation → lunge/strike → recovery | 14 frames at 12 fps, non-loop; `impact` event | Yes structurally; needs the right hand/weapon art and more punch |
| `jump_v1` | Crouch → takeoff → air → land → recover | 15 frames at 12 fps, non-loop; takeoff/apex/land | Yes; in-place by default, engine handles vertical physics |
| `dodge_v1` | Load → protected low evade → recover | 20 frames at 24 fps, non-loop; evade/recover events | Yes; can look like a squat unless art/poses are tuned |
| `stress_v1` | Extreme static joint poses | QA-only, **not game animation** | Yes; test every character before game action work |

These counts are from Wren's delivered configuration/manifests and the schema; templates support other config values and output stepping.

### Example: using an existing shared action under a custom name

This is an **excerpt**, not a complete `character.json`:

```json
{
  "animations": {
    "Idle": { "template": "idle_v1" },
    "Run": { "template": "run_v1" },
    "Attack": { "template": "attack_v1" },
    "Jump": { "template": "jump_v1", "overrides": { "air_height_px": 300 } },
    "Dodge": { "template": "dodge_v1", "overrides": { "direction": -1.0 } },
    "DodgeForward": { "template": "dodge_v1", "overrides": { "direction": 1.0 } },
    "Stress": { "template": "stress_v1", "qa": true }
  }
}
```

Use only supported override keys and value types from `docs/SCHEMA.md` and the current template function. **Existing template `direction` values are not proof that the authored poses look correct in both directions.** Visually test both.

### New movement type versus per-character variant

- **Variant of an existing type:** JSON `overrides` or `adjust`; e.g., shallower attack body drop, more run forward lean, higher jump arc, faster dodge.
- **New type:** Implement **one new generic action template** in `rcp/templates.py`, register it in `TEMPLATES`, document parameters and events, test on more than one character, and check that old actions remain bit-identical.
- **New rendering feature:** Drawing swaps, directional turning, deform meshes or multi-form changes need core changes as well as template/config work. Do not pretend a JSON key that does not exist will magically work.

---

## 10. Animation direction: run, idle, attacks, jump, dodge

**A joint that stays connected is a technical success; movement that communicates speed, weight, intention and impact is an artistic success.** Both are required.

### Run

Aim for identifiable phases: **contact → compression/down → passing → push-off/up/flight → opposite contact**. Check:

- Forward lean appropriate for speed; shoulders and pelvis not completely static.
- Clear alternating near/far arm counter-swing, no permanently parallel arms.
- Heel/toe and push-off behavior, not a pair of feet marching from one local coordinate to another.
- The body actually compresses and rises; limbs avoid unnatural limb-crossing.
- Contact foot's **world-space** movement is consistent with game velocity, not merely stationary in local sprite coordinates.
- Full loop seam at real playback speed and at the game's normal sprite size.

**Known present issue:** There is not a universal stance-foot lock. The exported Run can be used in a game at a matched speed, but foot sliding remains possible and must be judged in context. Do not claim a numeric stride-speed match guarantees correct planting.

### Idle

Idle must feel alive without shaking or making feet float. Check both heel/toe contacts on every frame and every body proportion. A tiny 4 px body motion can still look wrong if a boot lifts. **Mira's inherited idle has an approximately 2.8 game-pixel far-foot lift** at one point; it is a known defect, not a passing standard. Wren corrected stance reach with per-character JSON.

### Attack

Required beats: **readable anticipation → commitment/weight shift → strike/contact → follow-through → recovery**. In a game, a hit needs readable timing, sound, hitstop, VFX and coherent hitboxes. The current source hand is open, so the attack is a **palm strike**. Never claim a convincing fist punch exists without fist artwork. Strong attacks may need alternate hands, foreshortened part images, body rotation, or authored frame replacements.

### Jump

Current shared `jump_v1` has recognizable crouch, toe-driven takeoff, airborne tuck, contact and knee absorption. But the exported clip is drawn **in place by default**. An image that poses as airborne **does not move the game collider upward** by itself. Actual takeoff/gravity/landing belong to engine physics unless root motion is deliberately baked and handled consistently.

The delivered Wren jump rises only about **48.5 output pixels at 288×384**, so the action can read modest; this is a style/parameter choice, not an exporter failure. Confirm takeoff and landing events against the *exported* contact frame, not only the source template frame.

### Dodge / slide

`dodge_v1` currently demonstrates a guarded low back-dash / evasive duck with a timed protected interval. The deepest Wren poses can read as a **squat** rather than a traveling lunge. For a game-ready dodge, check:

- Distinguishable silhouette at start, invulnerability window, and recovery.
- Travel direction and velocity in the actual game.
- Whether the action is a **low duck**, a **slide on the ground**, or a **dash** (these are different action directions).
- Timing of collision shape changes and invulnerability start/end.
- Smooth return to state after recovery, interrupted attacks, and collision with walls.

**A true slide is not yet authored merely because Dodge exists.** It may require its own generic template and costume/leg pose art.

### General motion review standards

Always inspect motion **moving**, at its actual FPS, and with its intended game-scale art filtering. Still contact sheets are for posing, silhouette comparison, and seam diagnostics, not final motion signoff. Normal-speed video must be distinguishable from GIF frame stepping and from slowed-down debug review. Review event timing with visible frame labels.

---

## 11. Root motion, events, and engine integration

### The v1.1 contract

The manifest for Jump and Dodge contains `root_motion`: a `baked` flag, displacement `offsets` per exported frame in output pixels, and a written contract. Coordinate signs: **+x forward (right), +y downward**.

**Default: `bake_root_motion: false`**

- Sprite images show the **in-place action**.
- **Game engine** moves the character world position, handles gravity/collision/hitboxes/i-frames.
- Manifest offsets describe an *intended visual path* and may inform speed matching; they **do not independently apply physics**.
- Do **not** also shift the sprite by those offsets when the engine moves it: that would double-apply travel.

**Optional: `bake_root_motion: true`**

- Translation is baked into visual frames and the crop may expand to fit the full action.
- Keep game sprite visual position fixed for that playback; reconcile/commit final displacement consistently at the end **if the gameplay system is intentionally using baked visual travel**.
- Collision/hurtboxes still need explicit synchronization; visually moving pixels do not automatically move the physics object.

### Manifest origin, sizing and frames

Wren's high-res export manifests include `frame_width=288`, `frame_height=384`, a normalized `origin` for the character root/ground line, action `frames` and strip `sheet`, `fps`, `loop`, `duration_s`, `events`, `blender_frames`, `export_step`, `qa` and optional root motion.

- Set the game sprite origin to `manifest.origin.x / y`; **not a guessed `0.5,1`** if artwork is offset by the camera.
- Do not re-crop individual actions to different visible-bounds canvases. Identical origin across all frames keeps state transitions from shifting the whole sprite.
- Skip `qa=true` stress clips when registering gameplay actions.
- Do not show `preview/` contact images as game sprites: use `sprites/` files (RGBA).
- The package uses horizontal strip sheets (`<Action>.png`) and frame dimensions defined in manifest; ensure engine loader matches **the actual** layout.

### Frame events are not gameplay on their own

In v1.1 the manifest's event indices are **0-based exported frame numbers**. An `impact` or `land` event is a data marker—not collision implementation.

**Known timing defect:** When a source template is exported every other frame, an event can be rounded to the nearest exported frame; exact ties round to even. In Wren's Jump, `land` currently maps **one source template frame before visual contact**. Fix/validate this in future game integration before using the event for physics.

Safe integration rules:

1. Decide which events are **gameplay authoritative** (e.g., takeoff/land from physics rather than art).
2. If a visual frame event triggers a hit or i-frame, map it deterministically and document the indexing convention.
3. Test at 30, 60 and variable render FPS, including reduced animation speed and interruptions.
4. Ensure an event fires **once** at its intended crossing and never fires again due to state transition/repeat unless explicitly designed.
5. Avoid tying collision resolution to arbitrary image dimensions or an edge pixel; use game hitboxes and engine state.
6. Keep a single source of truth for world movement—engine physics **or** reconciled baked motion, not both.

For Phaser's sprite animation update event and its frame-change semantics, consult [Phaser animation events documentation](https://docs.phaser.io/api-documentation/3.88.2/event/animations-events). It specifically warns that several animation updates can occur in one game frame. For critical hit registration, a deterministic gameplay timeline may be safer than loosely counting display callbacks.

### Engine checklist before claiming “works in Crownflare”

- Actually run in the game, not a standalone render viewer.
- Fixed common anchor and character scale across action transitions.
- Confirm left-facing sprite mirroring doesn't invert weapon/costume details incorrectly.
- Match animations to game velocity and gravity; assess foot slide.
- Align collision capsule to feet and body; adjust low posture collider intentionally.
- Check combat hitbox, hurtbox, impact timing, hitstop, recoil, sound and particles.
- Test controller inputs, interrupted actions and switching actions at awkward frames.
- Verify atlas/texture size, GPU usage, transparent edges, asset caching and loader failures.
- Check the look against actual scene lighting/background/pixel-art rendering style.

---

## 12. Quality gates and acceptance criteria

**Never collapse all these into one PASS.** Report gate status individually, with a source file and a direct visual example for each failure.

| Gate | Requirement | Evidence | Owner approval required? |
|---|---|---|---|
| **G0 — Preservation** | Canonical sources unchanged; ZIP/hash integrity; isolated work folder | Before/after hashes, verified archive | No, but report it |
| **G1 — Identity and art** | Character attractive, correct face/outfit/proportions/style, complete parts and hidden caps | Canonical reference + part sheet + real-size preview | **Yes** |
| **G2 — Construction** | All pivots at anatomy, near/far layer order right, no joint gaps or stretching through extreme poses | Pivot overlay + Stress sheet + automated joint checks | **Yes for final visual accept** |
| **G3 — Rig editability** | One saved/reopened Blender rig, packed art, actions switch, no missing images or wrong parents | `.blend` + machine reopen verification | No, technical |
| **G4 — Animation** | Readable key poses, coherent movement, natural momentum, fluid real-speed clips | Contact sheets + **actual real-time playback** | **Yes** |
| **G5 — Export** | RGBA, shared origin/canvas, complete frames, correct fps/loop/manifest, no crop | PNG sample, alpha checks, manifests, frame count | No, technical |
| **G6 — Regression** | Existing characters/actions unchanged unless approved | Golden-master comparisons, rerun/determinism, tests | No, technical |
| **G7 — Engine integration** | Actual game physics, attacks, collisions, state transitions, events and controls work | Gameplay recording + instrumented assertions + human play | **Yes** |
| **G8 — Transferability** | Second **real approved** character adds a requested action via shared code with only config/art changes | Cross-character logs, art and live playback | **Yes** |

### What a PASS does *not* prove

- A ZIP CRC proves file integrity, **not** visual quality.
- Pivot-position error of 0.0003px proves implementation consistency, **not** correctness of the anatomical pivot.
- A filled pixel disk near a joint proves coverage, **not** believable costume or shading continuity.
- Bit-identical frames prove reproducibility, **not** animation appeal.
- Great contact sheets prove pose selection, **not** cadence or real-time flow.
- A perfect loop seam proves continuity, **not** good footwork.
- A `.blend` with multiple Actions proves rig reuse, **not** ability to transform forms or automatically create arbitrary new action types.
- A transparent sprite exported at 144×192 proves RGBA dimensions, **not** matching Crownflare's pixel rendering aesthetic.

### Review deliverables for **every** agent milestone

Required:

1. A concise verdict listing **exact pass/fail/untested gates**.
2. Edited source/configs, not only renders.
3. Canonical art and part inventory with pivots and anchors.
4. A working, reopening Blender `.blend` when applicable.
5. Transparent sprite frames/sheets and `manifest.json` with events/fps/origin.
6. Contact sheets at 1× and enlarged, plus normal-speed GIF/MP4 and a game-size preview.
7. Logs/results of actual verification commands; do not fabricate watched playbacks.
8. Regression comparison and list of known defects.
9. Exact archive location and SHA-256; ZIP must contain the actual source, not be only references to `F:` paths.
10. A single clearly stated next engineering/art obstacle; **no speculative success claim**.

### Failure policy

- **Do not stop all work at the first failing visual gate** if the task explicitly authorizes iterative art/rig correction.
- **Do stop before claiming a later gate passed**. For example, do not build an entire run on obviously broken joints unless the task is diagnostic.
- Keep failures reproducible with targeted renders, affected source files and a reasoned hypothesis.
- Avoid repeatedly sending the agent to fix one joint mathematically when the missing part must be redrawn.
- If the *production-art gate* fails, choose a new art-preparation pass or a different pipeline for that action—not unbounded patching.

---

## 13. Known defects and their correct remedies

| Defect / risk | Current observation | Best remedy / scope |
|---|---|---|
| **Mira idle foot floats** | ~2.8 game px at full limb extension | Tune per-character stance + IK/contact through entire idle, then test at 1×. Do not secretly rewrite baseline regression without approval. |
| **Mira Run edge clipping** | Earlier Blender build clipped trailing boot on three frames | Expand/auto camera crop; keep common canvas and origin. Crop parity with old proof is not a reason to keep clipping in a release. |
| **Run foot sliding** | No guaranteed world-space stance lock | Match game speed to contact travel, use grounded contact diagnostics; add template foot-lock only if needed and cross-character tested. |
| **Open-palm Attack** | Only open hand art available | Generate/paint fist/grip and add a correctly validated attachment-swap feature; or intentionally call it a palm strike. |
| **Wren Dodge looks like squat** | Deep low held pose | Revise key pose/art silhouette, stance and travel speed in config; a ground slide should be a separate template if desired. |
| **Wren Jump modest** | Approx. 48.5 output px peak in its high-res sheet | Tune arc/engine world path together; validate gameplay height rather than just GIF height. |
| **Land event early on stepped export** | Jump event rounded to a preceding sampled frame | Define explicit event remap policy (nearest/next/exact), include test for visual contact and physics-ground event. |
| **Wren not art-approved** | Hand-authored vector SVG/cel style, torso narrow, same near/far limb art | Replace or revise with quality-approved production part artwork; maintain config/pivot contract or update measurements. |
| **Motion not viewed at real speed by producing agent** | Contact sheets used, clips exist | User watches real-time files and/or agent uses a supported playback environment; explicitly sign off. |
| **Blender edits not round-tripped** | Source of truth is code/config | Move approved key changes into templates/config, or protect manual scene as a separately versioned artifact. |
| **Sprite/part alpha halos** | Common hazard with RGBA edges | Clean RGB under transparent edge, choose correct interpolation, inspect on dark and light test backgrounds. |
| **Styles don't match game** | Wren vector/cel artwork not yet established as Crownflare's visual direction | Assess at real game scale in actual scene; if game is pixel art, intentionally pixelize/author art for that style. |
| **Transformations unsupported** | No keyed attachment/image swapping or per-form rig transfer | Design form assets and skin/visibility swapping as a new core feature, or swap character rig/actions at a game-state boundary. |

**Do not regress into the old strategy:** rebuilding hidden fabric from nearby pixel smearing and changing weights after each seam failure.

---

## 14. What is not supported yet

### Actual v1.1 boundary

- Side-view humanoids on `biped_side_v1`; **not** a generic character auto-rigger.
- Right-facing source; left-facing can be mirrored in engine, but asymmetric accessories require design decisions.
- One root body plus two arms, two legs, a head, optional rigid accessories; **not** extra anatomical limbs or a quadruped without a new profile.
- Rigid parts and rotating accessory bones; **not** general mesh deformation, full procedural cloth, shape interpolation, or physics secondary motion.
- Core clips: Idle/Run/Attack/Jump/Dodge; **not yet** slide, wall-jump, roll, air combo, uppercut, launcher, guard, hurt, knockback, death, finishers, cinematic transformation, or full locomotion blend trees.
- One visible image per attachment at a time; **no automated keyed image swap** for fists/blinks/mouths/form changes.
- Scripted/action-based source of truth; **no automatic Blender→JSON round-trip** of hand-edited curves.
- Motion preview data only; **no native hitboxes, invulnerability, physics, combat AI or sound** generated by the rig alone.
- **No production-art aesthetic guarantee.** The tool validates construction, not whether the game should ship those sprites.

### Why this distinction matters

A reusable **production platform** lets us **add** those capabilities once and use them across characters. It does **not** mean those features already exist. We should make precise statements such as:

> “Jump is implemented as a shared side-view biped template, and can be tuned per character.”

not:

> “Any 3D aerial flip or new animation can be added by changing a JSON key.”

---

## 15. How to approach transformations, combos, and advanced moves

These are **recommended designs / future requirements**, not features delivered in v1.1.

### Jump variants / double jump

Add `double_jump_v1` as a shared template **only if** it needs different pose beats from `jump_v1` (e.g., in-air impulse, tuck, distinct transition). Otherwise reuse `jump_v1` with a new config variant and engine impulse. Test interrupted midair animations and landings. **Game physics owns vertical travel.**

### Slide, dash, roll

Do not call every evasive move “Dodge.” Separate intended silhouettes and gameplay contracts:

- **Dash:** fast horizontal burst, often upright/leaning; short protected interval.
- **Slide:** low center of mass, traveling along the ground, maybe friction or collision shape shrink.
- **Roll:** continuous rotations and body silhouette changes; rigid side-view art may need major alternate drawings or frame-by-frame poses.

Author a new `slide_v1` or `dash_v1` with named contact and evade events **after** deciding which gameplay move the game needs.

### Multi-hit combos and aerial attacks

Create shared beat structures rather than inventing raw angles every time: wind-up → hit window → recoil or cancel → next hit. Separate animation events from combat logic. Plan multiple hand/weapon poses and optional pose-correction images. Test key-pose readability at game scale and action cancel behavior.

### Transformations (Dawnrush, Stormhalo, Eclipse Warden, Ember Drive, etc.)

**A transformation is not one animation key.** It may require:

1. A **form identity and art contract** (palette, silhouette, accessory changes, hair, eyes, aura, weapon).
2. Part-asset inventory for new form and compatibility table of parent bones and pivots.
3. **New keyed attachment/skin switching**, or an intentional cross-fade / changeover between equivalent rigs.
4. A transformation cinematic template: anticipation → powerup → reveal → recover, synchronized with gameplay state, screen VFX and sound.
5. Distinct form actions or shared retargeted actions with manual approval (Run/Jump/Attack may need new silhouettes).
6. Manifest markers such as `form_commit`, `invulnerability_start`, `camera_shake` (names and semantics specified in a new shared contract).
7. At least one representative gameplay action immediately after transformation, proving continuity.

**Do not promise automatic form animation** merely because bone names align. A new outfit/hair or changed body proportions may demand new artwork and pivots. Use the pipeline for the structural work it has actually proven.

### Different views and creatures

A side-scroller hero with facing-left mirroring fits the current contract. A top-down four-direction hero, an animal, a boss with extra arms or a 3D camera turn needs **new profile(s), art sets and motion logic**, or a different technology. Reuse the *principles* even if reusing the exact v1.1 code is inappropriate.

---

## 16. How the tools fit together

These are tools we actually tried or researched; this is **not** a claim that all of them are interchangeable with our current source format.

| Tool / route | Where it helps | Our result / caution |
|---|---|---|
| **Blender 5.2.3** | Native armatures, bone-parented image planes, actions, scripted rendering | **Current successful runtime**; free; no special add-on required in v1.1 |
| **Our `rcp` toolkit** | Config validation, rig/action generation, sprites, manifests, regressions | **Best validated baseline**; supports only `biped_side_v1` and six templates |
| **ImageGen** | Identity design, parts sheets, replacement cutouts, frame art where needed | Valuable, but **not used** to produce Wren; no automatic consistency guarantee |
| **Rigby2D** | Open-source 2D rigging editor, AutoRig, layers, skeletal runtimes, MCP | Earlier attempts had exact neutral parity but poor motion; currently an **alternative**, not required to use `rcp` |
| **COA Tools 2** | Blender cutout rigging / editable meshes | Failed our old weighted-art run visually; tool itself was not proved fundamentally defective |
| **rig-c** | Agent-oriented parts/rig/validation/review tooling | Researched as a possible future source of QA ideas; **not tested** with current v1.1 workflow |
| **Spine** | Established 2D skeletal workflows, asset-preparation guidance, attachments/mesh systems | Strong reference for principles; editor/runtime may require paid license, not part of free baseline |
| **TripoSR / 3D reconstruction** | Experimental single-image 3D mesh generation | Prior specific pilot produced poor riggable topology; not a proven substitute for proper character modeling |
| **Pixelorama / Aseprite-class editor** | Clean sprites, alpha, pixel consistency, corrections | Pixelorama free; Aseprite generally paid for prebuilt binaries. Their role is art cleanup, not automatic anatomy generation |
| **Phaser / Godot** | Game runtime, character controller, physics, events, playback | Integration must be proven in an actual level; v1.1 provides sprites/manifests, not a finished controller |

**Tool decision rule:** Keep the simplest validated system that satisfies the art. Adopt another editor only when it **eliminates a demonstrated limitation** and passes the same quality gates. Do not restart from scratch because a tool promises AutoRig, AI or retargeting.

---

## 17. Rules for Codex, Claude, and other AI coding agents

**Paste or reference this section as a persistent project instruction.**

### Mission

Your job is to **improve and use our reusable rigid-cutout production pipeline**, not produce another isolated nice-looking still. The canonical source is the current approved ZIP/project; do not reconstruct it from memory.

### Required working method

1. **Read the current baseline files first:** `README.md`, `QUICKSTART.md`, `docs/SCHEMA.md`, `docs/ART-PREPARATION.md`, `REPORT.md`, and relevant source scripts.
2. **Inspect actual assets and intermediate evidence** before diagnosing. Trace which PNG and config produces each rendered region.
3. **Classify every failure:** art preparation, pivot/anchor, draw order, rig math, animation posing, renderer/export, manifest/event timing, or engine integration.
4. **Separate confirmed findings from hypotheses.** Quote source file/function and evidence image, not vague guesses.
5. **Preserve immutable originals.** Work in a new folder or branch; don't delete or overwrite existing approved assets, ZIPs or builds.
6. **Never automatically push or publish** without explicit review and approval.
7. **Use available image generation for actual source artwork** when art is required and supported; if inaccessible, state that clearly and do not call SVG geometry or Python-drawn placeholders “ImageGen”.
8. **Create complete art parts** and stress-test before animation; never rescue missing hidden anatomy with automatic pixel smear as the main plan.
9. **Make changes at the right layer.** Art defect → source art; pivot defect → config/anchors; new movement kind → shared template; game collision defect → game integration.
10. **Do not hardcode a hero's name/proportions** into shared code. Per-character measurements belong in JSON.
11. **Re-run affected unit/negative checks and golden masters.** When updating shared code, preserve Mira/mannequin regressions unless a change is deliberately approved.
12. **Inspect live, normal-speed motion** when the environment permits. If not, deliver playable videos and label artistic quality unverified.
13. **Review at intended game scale and within a real scene.** A 3× zoom is for defect location, not owner aesthetic signoff.
14. **Keep Blender modifications source-reproducible** or explicitly flag that hand edits are not round-tripped.
15. **Deliver actual source, binaries and evidence** in one verifiable ZIP with exact location, hash and honest gate table.
16. **Be economical:** test one meaningful unknown with each expensive model pass. Do not spend hours proving already validated architecture again.

### Required response format for an agent

```text
Objective:
Baseline/project version:
What was changed (exact files):
Root cause found (confirmed vs hypothesis):
Technical validation actually run:
Visual review actually performed (real-time / still only):
Quality gates: PASS / FAIL / UNTESTED / CONDITIONAL
Preserved originals / hashes:
Remaining defects:
ZIP + SHA-256 + contents:
One recommended next milestone:
```

### Forbidden shortcuts

- “The rig works, therefore animation quality passes.”
- “Everything passes” when only static joint images were inspected.
- “Production art” for a synthetic mannequin unless owner explicitly accepts that art.
- “ImageGen output” for SVG drawn by a script.
- Rebuilding art using smeared neighbors and hiding a seam behind statistics.
- Rendering whole-frame pose sheets while advertising a reusable skeleton.
- Hardcoding per-character limb lengths into the shared motion code.
- Triggering physics, damage, invulnerability or transformation merely by naming an event in JSON.
- Modifying the game or pushing to GitHub while the task is merely an animation research/proof.

---

## 18. Efficient development with limited model usage

The user is using expensive/high-capability models with limited practical turns. Optimize for **information gain per attempt**, not maximal run time or maximal output volume.

### One task, one unknown

**Good experiments**

- “Can a high-quality ImageGen parts sheet pass G1/G2 without cut seams?”
- “Can one new `slide_v1` shared template work on both Mira and Wren with JSON-only tuning?”
- “Do impact/land events match actual exported frames at `export_step=2`?”
- “Does the new render preserve sprite-origin consistency in a Phaser gameplay scene?”

**Wasteful experiments**

- Another complete skeleton rebuild when the verified rigid rig already works.
- An entire boss fight before the basic jump/attack event contract is tested.
- Repeatedly regenerating the same face/limb with no locked reference.
- Building ten more motion templates before checking whether the hero art looks acceptable.
- Another 100-MB evidence package proving 68/68 regression frames for unchanged code only.

### Suggested two-tier QA

**Fast iteration:** config validation → one neutral/stress contact sheet → a short representative action → real-speed at game scale. Fix the actual defect.

**Milestone release:** all source checks → Blender reopen/packed textures → full actions → manifest/event validation → cross-character regressions → gameplay playback → owner approval → final ZIP/hash.

When a task can't be finished, provide the tested artifact and unresolved blocker. Do **not** promise to complete it asynchronously or to deliver an unrun test later.

---

## 19. Game-specific guidance: Crownflare and Veyrshift

### Crownflare

- Crownflare v1.0 is already packaged and owner-played. Its existing art, combat and release should **not be disrupted** solely to test this pipeline.
- Pixel-art crispness and style consistency matter. Do not paste Wren's vector/cel output into Crownflare and call it a visual upgrade by default.
- If making future Stormhalo / Eclipse Warden expansions, first define form art and motion needs; transformations require art swapping or rig changeover support that v1.1 **does not yet implement**.
- Integrate any new animation on a **separate test character or optional experimental branch/scene**, benchmark at actual game scale, and preserve shipped saves/controls/sprites.
- Defer full sprite overhaul unless the new pipeline clearly surpasses approved in-game quality across multiple actions.

### Veyrshift

- More flexible stylized effects and forms may make the rigid-cutout base useful for motion tests, but transformation readability is a higher challenge.
- Separate the stable base character rig from form-specific art layers, weapon effects and aura VFX.
- Keep character consistency across Idle/Run/Dodge/Attack **before** adding cinematic powerup.
- More complex pose perspectives/foreshortening may need alternate drawings or a different approach; don't pretend 2D side profile solves 3D-looking action automatically.

### Future projects

For any new game, decide its art direction and viewpoint before choosing `biped_side_v1`. Reuse **this bible's acceptance process** even if the specific codebase isn't applicable.

---

## 20. Milestones, priorities, and stop conditions

### Current frozen baseline

**Pipeline v1.1** is the structural working reference. Keep the exact ZIP as an immutable milestone and work forward separately.

### What should actually happen next

**P1 — First genuinely production-quality parts.** Use ImageGen plus human-guided correction to produce a hero whose reference, independent pieces, neutral assembly, stress poses and actual game-scale look **all pass G1/G2**. No new template work until artwork is accepted.

**P2 — Real-time visual and gameplay pilot.** Integrate that character's Idle/Run/Jump/Dodge/Attack into a small standalone Phaser/Godot test level. Run normal-speed motion with actual gravity, input, colliders and event mapping. Resolve the early-land-event issue, foot sliding and animation transition problems where they matter. Obtain owner approval.

**P3 — New movement type.** Add **one** genuinely new shared template such as `slide_v1` or `heavy_attack_v1`, validate on two different real/approved characters with config-only tuning.

**P4 — Better artwork state system.** Implement named attachment/image swaps for open hand/fist, blinking, weapons or form details; document keyed visibility and export behavior, add negative tests.

**P5 — Transformations if the game needs them.** Prove a form change on one character, including shared animation reuse where possible and approved altered parts. Only then extend it to a full dramatic transformation.

**P6 — Broaden profile only when justified.** Add other view angles, creatures, multi-limb bosses or flexible mesh deformations after a real game need and clear evaluation gate.

### Explicit stop conditions

Stop and reassess rather than escalating complexity when:

- The source art repeatedly fails anatomical/stylistic review and needs a different art approach.
- Two full art revision rounds fail the same measured joint defect with no new root-cause evidence.
- Real-time motion remains visibly poor despite structurally connected joints; the issue is acting/pose design, not more topology.
- A specific action fundamentally requires another view or new drawings; do not force the rigid profile to do impossible 3D perspective work.
- A new tool adds integration cost without an observable quality advantage over the existing pipeline.
- The task's tests prove only technical structure, yet the agent attempts to declare production completion.

---

## 21. Reference files and exact commands

### Core evidence archive (verified here)

```text
Reusable-Rigid-Cutout-Real-Hero-Jump-Dodge-Review.zip
SHA256: 30306f8409a098c88dd47f30ca17eb3afe93fa5de1be9c3d646c542f369346d0
Archive top folder: reusable-rigid-cutout-pipeline-v1.1/
```

**Do not confuse Windows paths included in archived reports with a path guaranteed to exist on another machine.** The producing agent's location was:

```text
F:\Blender2D-RigFirst-Pilot\reusable-rigid-cutout-pipeline-v1.1
```

### Mandatory documents inside v1.1

- `README.md` — actual capabilities, requirements and engine sample.
- `QUICKSTART.md` — working build commands.
- `docs/SCHEMA.md` — authoritative JSON syntax, available templates, event/root-motion contract.
- `docs/ART-PREPARATION.md` — the current art-preparation standard and parts prompt.
- `docs/TROUBLESHOOTING.md` — symptom-to-cause mapping.
- `REPORT.md` — latest experiment's conditional verdict and known caveats.
- `RUN-VALIDATION.md` — producer's full test record.
- `examples/scout/ART-NOTES.md` — truthful source-art provenance and joint construction.
- `examples/scout/source/IMAGEGEN-PROMPTS.md` — unused future art-generation suggestions.
- `examples/scout/character.json` — actual JSON with six templates.
- `outputs/scout/sprites/hi/manifest.json` — real export contract with event indices and root motion.

### Routine commands

```bat
rem From the project root
rcp.bat validate examples\scout\character.json
rcp.bat build examples\scout\character.json
rcp.bat verify examples\scout\character.json

rem Pivot and part audit (requires optional Python setup)
python tools\part_diagnostics.py examples\scout\character.json examples\scout\diagnostics

rem Animated review pack (optional Pillow and ffmpeg for richer outputs)
python tools\review.py outputs\scout hi

rem All regression and negative tests; run for milestone changes
run_validation.bat
```

Optional preview:

```bat
python tools\dry_run.py examples\scout\character.json
```

Use **validations and commands from the actual extracted project's README/CLI** if the tool has been versioned since this edition.

### Known preview files to watch

The producing agent requested owner review of:

```text
outputs/scout/preview/Jump-realtime.gif
outputs/scout/preview/Jump-world-motion.gif
outputs/scout/preview/Dodge-realtime.gif
outputs/scout/preview/Dodge-world-motion.gif
outputs/scout/preview/all-actions-hi.png
outputs/scout/preview/Stress-annotated.png
```

In some delivered packages the review output is under `outputs/scout/review/` or `preview/scout/` depending on which stage generated it; inspect the ZIP directory rather than assuming one path. The delivered reference sheet is at `examples/scout/source/reference-sheet.png`.

---

## 22. External resources and provenance

### External technical references (cross-checked 12 November 2026)

These sources support *general animation principles*. They do **not** independently validate our own ZIP's artistic quality.

- [Spine: How to cut your assets for animation](https://us.esotericsoftware.com/blog/How-to-cut-your-assets-for-animation) — hidden parts, rounded joints, straight limb art, separate front/back layers and outlines.
- [Spine: Mesh attachments](https://us.esotericsoftware.com/spine-meshes) — how deformable meshes/vertices/weights work; evidence that rigid parts are not the only valid approach.
- [Spine: Weights](https://us.esotericsoftware.com/spine-weights) — weight design for true deformable pieces.
- [Blender: Actions](https://projects.blender.org/blender/blender-manual/src/branch/main/manual/animation/actions.rst?display=source) — Actions are reusable animation-data containers.
- [Rigby2D documentation](https://rigby2d.com/docs/) — layered art, bone/mesh rigging, animation reuse, editor/AI automation (alternative pipeline).
- [COA Tools 2 repository](https://github.com/Aodaruma/coa_tools2) — Blender cutout animation add-on, a formerly tested approach.
- [rig-c GitHub organization](https://github.com/rig-c) — AI-agent-oriented rig authoring and verification, considered but not integrated here.
- [Phaser 3 animation events](https://docs.phaser.io/api-documentation/3.88.2/event/animations-events) — update event semantics; valuable for careful attack-event integration.

### Internal provenance: experiments and reports

- `ai-character-rigging-animation-lessons-learned.md` — earlier November 8–10 failure analysis; **superseded for current pipeline status**, still useful for historical code-level diagnosis.
- `blender-2d-rigging-root-cause-research-report.md` — failure audit for the COA weighted rig.
- `Blender2D-RigFirst-Run-Review.zip` — original COA run investigation.
- `Blender2D-Recovery-2026-11-10.zip` — knee repair; broader articulation still failed.
- `Blender2D-COA-Complete-Joint-Reconstruction-Review-2026-11-10.zip` — extensive failed reconstruction evidence.
- `claude-rigid-cutout.zip` — **first successful Python rigid-cutout animation proof**, with reusable whole-part art.
- `Blender-Rigid-Import-Review-2026-11-11.zip` — Blender Run/Idle/Attack using one rig.
- `Reusable-Rigid-Cutout-Pipeline-2026-11-12.zip` — v1 shared configs, second synthetic character.
- `Reusable-Rigid-Cutout-Real-Hero-Jump-Dodge-Review.zip` — **v1.1 current baseline**.

### Evidence labeling convention

When recording findings, use:

- **Verified in source/archive** — inspected code/data/art and checked exact file properties.
- **Reported by producing agent's test logs** — instrumented result shown in package, but not rerun here.
- **Visually observed in frames/sheets** — static visual evidence.
- **Observed at real speed** — actually played video/GIF at its intended timing.
- **Owner approved** — user explicitly accepts art/motion.
- **Proposed** — future architecture, prompt, new feature or general best practice not yet implemented.

This prevents old “works perfectly” claims from silently becoming facts.

---

## 23. One-page checklist

**Before art**

- [ ] Real game viewpoint, style, scale and intended action list are defined.
- [ ] Canonical character approved; one source of truth for identity.
- [ ] Complete separate limb parts, not visible fragments from a standing illustration.
- [ ] Hidden joint caps, clothing seams, and any necessary extra hand/form drawings planned.

**Before rig**

- [ ] 8-bit RGBA PNGs, correct alpha/spacing, source-res files preserved.
- [ ] Pivots, child anchors, heel/toe points visible in a diagnostic overlay.
- [ ] Far/near layer order, accessory hierarchy, and one shared origin defined.

**Before animation**

- [ ] `validate` passes without relevant errors.
- [ ] Stress sheet survives large rotation at hips, knees, ankles, shoulders, elbows, wrists.
- [ ] Neutral image still matches the approved design and intended game aesthetic.
- [ ] Blender `.blend` saves, reopens, finds textures and switches actions.

**Before calling animation good**

- [ ] Keys show clear whole-body motion beats and anticipated action type.
- [ ] Real-speed playback reviewed, **not only contact sheets**.
- [ ] Run foot contacts, idle foot planting, jump landing and dodge silhouette checked.
- [ ] Attack/evade/land events correspond to displayed frames; game logic decides physics.
- [ ] All frames have transparency and stable canvas/origin; no cropping.
- [ ] Render tested at actual in-game sprite scale.

**Before release / future reuse**

- [ ] Core regressions run; previous characters unchanged unless approved.
- [ ] One unlike character works with config + art, no hero-specific Python.
- [ ] New action **types** live in the shared template registry, with tests and docs.
- [ ] Game build actually plays the sprite with correct physics and combat behavior.
- [ ] Sources, editable rig, PNGs, manifests, clips and honest validation report zipped.
- [ ] Owner approves visual quality; only then call it production-ready.

---

## 24. The final principles

1. **The artwork must be made for animation.** A complete side-view illustration is not the same thing as a complete set of limb pieces.
2. **A pivot is only as good as the pixels rotating around it.** Draw hidden caps and place seams deliberately.
3. **Choose deformation by art type.** Rigid limbs and costume hardware for our current proven path; genuine weighted meshes for genuinely deforming art.
4. **A neutral match is not an animation test.** Stress poses, moving footage and gameplay are the real tests.
5. **New characters should be configured, not recoded.** The shared pipeline stays generic; proportions and tuning live in character JSON.
6. **New animation types still need shared templates.** Reusable does not mean arbitrary motions appear automatically.
7. **A rendered sprite is not gameplay physics.** Origins, events, collision, i-frames and world travel have explicit engine contracts.
8. **Artistic quality is a separate gate from engineering correctness.** All the hashes and pixel metrics in the world cannot decide whether an attack feels powerful.
9. **Use limited AI-model effort to resolve new uncertainties, not endlessly replay proven engineering.** Diagnose from actual sources before prompting again.
10. **Preserve what works.** v1.1 is our usable foundation; work forward on production art, real-speed motion and game integration rather than restarting rig construction.

> **Our defining lesson:** We almost abandoned skeletal animation because we repeatedly tried to bend artwork that had never been created to bend. The breakthrough was not a stronger bone solver; it was discovering and using **complete, overlapping part artwork**, then turning it into a repeatable **Blender + JSON + shared animation templates + transparent export** pipeline. The system is now structurally real. The next victory is making it **beautiful and playable** in a real game.

---

**Maintenance policy:** When a new milestone is owner-approved, append the date, archive/hash, exact supported capabilities, regressions, visual signoff and remaining limitations. Update the status table. **Never erase a known failure or silently upgrade “conditional” to “passed.”**

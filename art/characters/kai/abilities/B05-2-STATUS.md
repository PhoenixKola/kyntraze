# B05.2 - corrective pass (poses, head layering, FX, audio, Form I aura): STATUS
Nothing committed. Owner approval of look/feel/sound pending.

## Poses (Blender-rebuilt, base AND Form I; `danim_b05.py`)
- NORTH beam: release/hold now a wide V (fists ~40 px apart at head height, elbows flared) framing the head, instead of crossed forearms on the nape. Charge keeps a closer, lower hold so charge vs release differ. Test limit for NORTH release separation raised 30 -> 48 px (by design).
- EAST/WEST sphere: raise phase reaches overhead (fist targets y -146 / -150, pelvis/chest up) -> arms visibly stretched above the head. Only the lead fist/arm reads clearly; the rear fist is partly behind the head (residual).
- Rebuilt: base north/east/west, Form I north/east/west; SOUTH untouched. Form I Idle/Run/Punch/Dash/Hurt/Death/Transform PNGs byte-identical (git shows only kai_north_beam / kai_east_sphere / kai_west_sphere modified for Form I). Anchors regenerated (`build_anchors.py`).
## Head layering (owner request)
- Cause: the approved BASE profile (east/west) rig draws the head UNDER the torso (specs.py), so the collar covers the jaw; Form I's head sits in front visually. SOUTH already draws head over torso; NORTH (back view) intentionally keeps head-under-collar-fold and is unchanged. Supersedes the B05.1 "head behind torso" note for east/west.
- Fix: `specs.py` `HEAD_BEHIND` (env `KAI_HEAD_BEHIND=1` reproduces the old order; Form I forces the old order so its sheets stay identical). All base east/west clips rebuilt.
- Proof: `review/b05-2/head-layering-idle-before-after-3x.png`, `head-layering-punch-before-after-3x.png` (cells: east, west, south, north; before|after).
- Not done: I did not re-run a full 12x collar/boot audit of every base east/west clip; checked Idle and BasicPunch before/after and Beam/Sphere frames.
## FX (abilityFx.ts)
Release: bigger flash + ring + 8 streaks at the fists; beam width pop on release; fully-charged pulsing ready ring; sphere gather: inward-drawn ring; throw: flash+ring off the hands; burst: white flash + colour flash + two shock rings. No new ImageGen sheet (existing `ring`/`flash`/`streak` sprites reused).
## Audio (original synthesis, NOT HEARD)
Cause of the overlap: reverb tails added 0.5-1.3 s (beam_fire 1.75 s vs a 0.5 s beam). Now trimmed with cosine fade-outs: beam_charge 0.6 s, beam_fire 0.62 s (body gated at 0.5 s), beam_end 0.7, sphere_gather 0.95 (swell ends at the 0.8 s throw), sphere_throw 0.5, sphere_burst 2.3. Engine: beam_end fades the fire voice (70 ms) and pulses before the end sound; charge cut fades 40-60 ms; cancel/death/mute unchanged. Tests added (durations, end fades fire). All 15 decode and 104 starts in headless Chromium, 0 errors. **I cannot listen: audio quality and timing feel UNVERIFIED.**
## Form I aura (formFx.ts)
Replaced the floating halo with a body-hugging rim: 4 offset copies of the hero's own frame, solid Solar colour, additive, depth 9.7 (behind Kai, hero is 10), swelling with casting/dash/transform; ground glow shrunk; wisps/sparks/arcs spawn within ~8-17 px of the body. `EntityRenderer.ts` line 95 now passes `this.hero` (one-arg change, parent please keep). Proof: `review/b05-2/form-i-aura-hug-4x.png`, `form-i-aura-live-3x.png`. 60.5 fps with 80 enemies (swiftshader). Known: rim is a sprite copy so it also follows the hero's frame during Dash/legs split without the crop.
## Validation
typecheck PASS; vitest 125/125; `vite build` PASS (to a scratch outDir); live Phaser via Playwright real keyboard, 960x540 and 640x360, both forms x 4 facings (`live960/`, `live640/`, scripts `live_b052.cjs`, `f1_aura_b052.cjs`): 0 console errors, hand anchor == FX origin every frame (max 0 px), audio engine 15 loaded. Playwright e2e NOT run by this pass (shares 5173 with the B06 work); Blender checks printed all true for every rebuilt rig.
## Gates
TECHNICAL PASS | VISUAL STILL PASS (inspected stills) | MOTION WATCHED NO (webm recorded, not watched) | AUDIO UNVERIFIED | CONTROLLER not touched/tested.

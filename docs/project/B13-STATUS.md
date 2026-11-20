# B13 - Kai Form III: STILLFIRE APEX (pushed after owner review; aura reworked as a soft flowing glow + rising wisps, West head re-seated closer to the body)

## How to try it (dev only)
`npm run dev`, open `http://127.0.0.1:5173/?qa=1&form3=1&seed=31` (QA route: Cometheart + Stillfire Apex unlocked, no 10:00 gate, Drive full). **Tap F** = the selected form (default: Stillfire Apex), **hold F** (~0.3 s) = compact selector (steps Stillfire -> Cometheart -> Flarebound every 0.55 s, release confirms; pad: Y). **E** = Silver Rift (hold to charge, mouse / right stick aims 360 degrees, release to blink + fire; pad RB/RT). **R** = Instinct Reversal (pad LB/LT). Perfect Evasion is automatic.
Normal play: win a run (defeat the Null Seraph) -> `unlocks.stillfire` is saved (a save that already has a victory counts too). In every later run Form III is available from 10:00 with a FULL Drive gauge.

## Code implementation (done, tested)
- **Unlock / activation:** `form: 0|1|2|3`; Seraph kill flags `apexUnlockedNow` (persisted by GameBridge) but never starts it in that run; `formChoices()` = Flarebound (65 % Drive) / Cometheart (full Drive after the Warden) / Stillfire Apex (full Drive, save flag, run time >= 600 s). A single sensible form still starts on the press (B12 feel unchanged); with several ready a tap starts the remembered/selected one on release and a hold opens the selector. Form III drains 3.2 Drive/s (~31 s) then a 10 s cooldown. Save migration adds `unlocks.stillfire`; B12 `cometheart` untouched.
- **Reveal (`FormSystem`):** first activation 3.6 s (commit 1.9 s, reveal pulse 2.55 s), repeats 1.3 s. The whole sim is frozen (clock, enemies, shots, hazards, cooldowns, i-frames); pulse shoves/staggers non-boss enemies; pause / retry safe; no double trigger; 0.5 s i-frames after.
- **Glide:** velocity eases in/out (`APEX.glideEase`), speed x1.2, dash = 0.13 s near-instant ~175 px displacement (same distance as before, collision-checked). Collision stays on the ground plane; the art is lifted 7 native px, the shadow is drawn on the ground.
- **E Silver Rift (`ApexSystem`):** hold to charge while moving (0.6x speed), 360-degree aim (pointer, right stick, last aim kept 3 s, else facing), tiers by charge (quick / charged / full: width 13/20/30, damage 8/13/19 per 0.08 s pulse, 0.32-0.62 s), release = safe blink (back/side candidates, never in a wall / body / hazard / bolt, falls back to in-place) then a piercing beam from the exported hand-midpoint anchor. Cooldown 8 s, 0.5 s anti-spam lock from the first tick, cancelled charge keeps a 3.5 s cooldown. Lance cards apply: Hard Light (damage), Wide Lance (width), Lance Cooling (cooldown), Afterburn (+0.08 s beam per stack), Conductor (Drive per hit).
- **R Instinct Reversal:** up to 4 nearest targets (non-bosses first, at most one boss), 0.12 s hops to a safe spot beside each (0.14 s i-frames per hop only), 20 dmg + stagger, then a simultaneous finishing flash (11 dmg area, boss at most 2 hits total). Nobody near = a cheap 3 s cooldown. Cooldown 14 s. Nova cards apply: Nova power (damage), Bloom Bulk (reach + flash radius), Nova Cooling (cooldown), Afterglow / Twin Bloom (+1 / +2 targets). Both mappings are in the HUD tile tooltips.
- **Perfect Evasion:** the first hit while ready is refused, Kai sidesteps 78 px to a safe spot, 0.35 s i-frames, 9 s cooldown, not while dashing / in the reveal, one trigger per hit. HUD tile shows READY vs the recharge sweep.
- **Finisher:** a Form III boss kill raises `finisher3` (silver, silent beat, near-synchronous flashes, pulse, motes, 150 ms hit-stop; reduced effects shortens it) and takes the existing victory / reward path unchanged.
- **Render (`stillfireFx.ts`):** hover shadow, breathing silver aura with idle / glide / dash / charge / release levels, trailing wisps, rare floating pebbles and a faint refraction ring at rest, dash vanish + afterimage, rift reticle + gathering orb + blink streak + beam, reversal flashes and ghosts, evasion ghost, cinematic dim / cool tint / punch-in. Capped pool (130), thinner when crowded, Reduced Effects drops zoom, flashes, shake, refraction, rocks. Form II gold effects are suppressed in Form III; dash/hit effects use the cool set.
- **Audio:** 17 original numpy sounds (`synth_b13.py`) wired through the existing voice slots; the hover tone is re-armed from the sim clock so pause / death / form end silence it.
- **HUD (not the B14 overhaul):** Stillfire portrait, bar name / glow, "STILLFIRE READY", E/R tiles (Silver Rift with charge bar, Instinct Reversal), Evasion tile, F tile, selector popup, controller layout list updated.
- **Art:** see `art/characters/kai/form-iii/ART-NOTES.md` (4 independently generated head/hair + torn-jacket sets, Blender rigs, 12 clips incl. IdleSpecial, hover 7 px, anchors incl. f3).

## Checks actually run
typecheck PASS; build PASS; vitest 273/273 (28 new in `stillfire.test.ts`: unlock + persistence, gate, selector, freeze, glide, charge-while-moving, diagonal + stick aim, tiers, blink safety / wall denial, boss hit, cancel cost, upgrades, reversal caps, evasion cooldown, finisher, old-form regression); Playwright 47/47 (3 new in `e2e/stillfire.spec.ts`); real-browser scripted captures (`scripts/b13-capture.cjs`, swiftshader) at 960x540 (Gloam + Ashen + Reduced Effects) and 640x360: 0 console errors, crowd glide with 36 enemies ~16.7 ms/frame average (software GL, vsync-limited; NOT a GPU measurement).
Review pack: `art/characters/kai/review/b13/` (silhouettes 1x/3x, four-view sheet, head crops, motion sheets, hand-origin overlays, gameplay stills incl. every cinematic beat with timings in `evidence-b13-*.json`, HUD + selector shots). `video/*.webm` is git-ignored.
Bugs found and fixed while testing: a tap shorter than one sim tick lost the F press (press edge now counts), Form II gold aura leaking into the Form III reveal, orange dash/hit effects in Form III, f3 anchor offset in tests.

## NOT VERIFIED (be honest)
- **Real-speed viewing:** a .webm was recorded but NOT watched; all judgement is from still frames. Motion quality, hover feel, glide easing, cinematic pacing: NOT VERIFIED.
- **Audio:** synthesised, never heard: NOT VERIFIED BY EAR (`aura_hover` is very quiet and `rift_charge` is a flat loop, not a swell).
- **Controller hardware:** right-stick aim / RB-hold only covered by mocked-pad unit tests.
- **GPU / real frame pacing:** only software GL.
- **Balance:** all numbers are a first pass (31 s duration, 10 s cooldown, Rift tiers, Reversal damage).

## Known defects / risks
- Silver Rift aims 360 degrees but the body art has only four facings: diagonal aims reuse the nearest facing's hold / release frames (BeamNE/NW/SE/SW not made). The beam itself and the reticle follow the true angle; the hands may point slightly off for diagonals.
- Art (see ART-NOTES): South stance legs read slightly splayed; North forearms show more below the hem; West shows less chest; Transform's two intermediate torn-jacket stages are mask composites; the pre-commit hair is Form II's gold head, the swap at the commit frame is a hard cut.
- Hits interrupt an unreleased Rift charge (cooldown 3.5 s stays spent).
- Reversal moves Kai to the last struck enemy and leaves him there.
- Dev-server only: missing-file JSON requests print a parse error if the Form III manifests are absent (they are present now).
- B14 (UI overhaul) not started; B13 UI additions are plain extensions of the current HUD.

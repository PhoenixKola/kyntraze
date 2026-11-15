# B14 - UI / HUD / menu overhaul ("Relic Plate")  [LOCAL commit, NOT pushed, owner review open]

Direction + tokens: `UI-ART-DIRECTION.md`. Kit: `public/ui/kit/` (~166 KB, `kit.json` manifest, rebuild `art/ui/kit/build_kit.py` from ImageGen sheets in `art/ui/kit/sheets/`, git-ignored 16 MB). Implementation: `src/app/kit.css` (loaded after `ui.css`, overrides it) plus small TSX edits (boss plate structure, form crest, hero form row, settings ON/OFF text, F-slot form tones).

## Screen audit (Keep / Redesign / Refine)
Battle HUD (health/XP/Drive, clock, minimap, pause, ability bar, form selector, boss bar+warning): Redesign (all HTML/CSS + nine-slice kit art; minimap canvas content kept). Title: Refine (art kept, logo sigil, new buttons). Hero select: Redesign (frames, form-progression row, sealed forms not named). Arena select/strip: Refine (frames). Level-up/Warden reward: Refine (25 icons + category art kept; rarity frames by shape: plain / gilt / crystal). Pause, Settings, Results (victory/defeat): Redesign onto panel frame + tactile buttons. Loading: Refine.

## Verification
- PASS (AUTOMATED): tsc clean; vitest 273/273; Playwright menus, hud-responsive, pause-resume, controller (mocked pad), bosses, boot, arenas, survival-loop, cometheart, stillfire = 42/42.
- STATIC ONLY: before/after stills 960x540 and 640x360 in `art/ui/review/b14/{before,after}` (30 each; `scripts/b14-capture.cjs`; manifest `evidence-b14-after-manifest.json`), kit contact sheets `kit-contact-*.png`.
- NOT VERIFIED: normal-speed motion of hover/transitions/boss-bar arrival, real GPU, physical controller, audio (no UI sounds added), reduced-motion in a real OS setting (CSS written, only reasoned). OWNER REVIEW: all aesthetic sign-off.

## Known issues / carry-over
- `hud-form1/2/3` capture shots are driven by QA routes; `hud-form3` still shows Flarebound; Form III ready/active HUD only seen via `hud-form3-ready`. Silver Rift mid-charge not captured.
- Primary button has a faint seam where caps meet the middle; boss plates are thin at 640x360; map-corner crack repeats if mirrored (not used).
- No display font bundled (Bahnschrift stack kept) - owner licence decision.
- kit.css overrides ui.css rather than replacing it: dead rules remain in ui.css (cleanup candidate, B20).
- 640x360 HUD uses a px floor (--u >= .8px) so it is ~20% larger than pure scale; clock/health are close but non-overlapping (hud-responsive test passes).
- Level-up modal covers the top HUD (as before).

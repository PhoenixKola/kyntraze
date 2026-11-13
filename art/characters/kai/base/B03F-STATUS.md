# B03F — NORTH sash fix + four-direction Kai in Phaser

Candidate state. Not committed or pushed; the owner has not approved the art or the in-game feel.

## NORTH correction
- Back view now has a flat belt band with a centred knot and two straight-hanging tails (new parts from the existing ImageGen bridge: `production-other-directions-candidate/north/source/s5-sash.png`; the rejected first attempts are `s5-sash-v1-rejected.png` and the earlier sheet is in PROVENANCE.md).
- Legs now draw under the seat (hips) so they no longer read as in front of the body; run arms swing on their own side instead of colliding at the belly.
- NORTH re-rigged and re-rendered (3 sheets + manifest); SOUTH, EAST, WEST art untouched. SOUTH hash lock: UNCHANGED (70 files).

## Integration (src/)
- `src/assets/kaiAnimation.ts`: manifest parsing/validation, facing rules, `KaiAnimator` (pure, unit-tested). `BootScene` loads each direction's manifest, then its 3 sheets with that manifest's frame size; `EntityRenderer` drives the sprite and uses each manifest's origin as the feet anchor.
- Runtime assets: `public/art/kai/<dir>/` are byte copies made by `node scripts/sync-kai-art.cjs` (re-run after re-rendering art).
- Scale 0.5 (exact 2:1 nearest-neighbour, hero about 80 px tall as before); Phaser `pixelArt` + `roundPixels` stay on.
- Facing: keyboard diagonals keep the current facing if it is one of the pressed axes, otherwise prefer horizontal (no flicker). While punching Kai faces the target; afterwards he keeps that facing until the next move.
- BasicPunch: the sim still resolves auto-attacks alone (no damage, DPS or target change). The renderer starts the punch just before the sim's weapon tick and scales playback so frame 5 lands on the tick; a late target snaps in near the impact frame.
- Fallbacks (no art yet): dash = Run at 1.6x speed + existing dash FX; hurt = existing blink; death = frozen idle, darkened tint; Form I = existing warm tint + ring.
- Pause/upgrade/dead advance the animation by 0 (frozen). Moving requires real displacement, so pushing into a wall idles.

## Results
| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm test` | PASS, 35/35 (16 new in `src/tests/kaiAnimation.test.ts`) |
| `npm run build` | PASS (existing chunk-size warning only) |
| `npm run test:e2e` | PASS 3/3 (pause test now waits for the arena; Kai's sheets load before the arena starts) |
| Live game, headless Chromium, real keyboard, 960x540 and 640x360 | PASS: 8 input directions, stop, dash, pause (frozen), resume, auto-attacks from all 4 facings, death, retry. 0 missing textures, sprite-to-sim ground offset exact on every frame, every sim shot (14 and 15) landed on punch frame 5, no game console errors (only headless WebGL software-fallback warnings). |
| Human game-feel review | UNTESTED. Evidence below is automated; nobody has watched the clip. |

Evidence: `b03f-evidence/` (screenshots, `live-report.json`, `live-report-640w.json`, a local .webm clip that is git-ignored). Repro: dev server + `?qa=1` hook (`__KYNT_QA__.heroPose()/sim()`).

## Known limitations
- 3-4 extra punches per run start without a hit (target died or left range after the predicted start): a visual whiff, never extra damage.
- During a punch the legs stay in the punch stance while Kai keeps moving (no run-and-punch blend).
- Occasional single-frame facing changes at target hysteresis boundaries (4 in one run), run-facing lag of a few frames at key changes (7 of 415 run frames).
- NORTH/EAST/WEST still have small seams between some limbs (see the direction STATUS.md); no hurt/death/dash/Form I animation.

## B03F.1 (follow-up)
- NORTH: sash is tied at the front, so the back view now shows only the waistband (knot removed from `sash_band.png`, `sash_tails` dropped from the NORTH draw order); sheets rebuilt and synced.
- Punch while moving: upper body = punch frame, legs = Run cycle (two cropped sprites split under the belt; `AnimPose.legs`). Sim untouched; impact still on punch frame 5.
- Facing: 0.12 s dwell between turns; facing locks for the punch duration.
- Size compare (QA-only `__KYNT_QA__.setHeroScale`, default stays 0.5): `b03f-evidence/size-0.5x-*.png`, `size-0.625x-*.png`; report `b031-report.json`. Owner feel review UNTESTED.

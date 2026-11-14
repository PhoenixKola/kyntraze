# B05 - Kai signature abilities (Fracture Lance beam, Nova Bloom sphere): STATUS

Baseline: main at ee52fb0. Nothing committed or pushed. Artistic approval and motion feel: OWNER REVIEW REQUIRED.

## Gameplay (sim-authoritative, fixed-step; numbers in `src/content/abilities.ts`)
| | Fracture Lance (E) | Nova Bloom (R) |
|---|---|---|
| Timeline | charge 0.5 s, fire 0.5 s, recover 0.3 s | gather 0.8 s, throw, 0.5 s flight, burst, recover 0.4 s |
| Damage | 5 pulses (every 0.1 s, once per enemy per pulse) x 15 | 60 at the centre, 60% at the edge, one detonation |
| Shape | 520 long x 52 wide lane, pierces, stops at arena wall/obstacle | radius 190 circle at the landing point, knockback up to 140 |
| Aim | last movement direction, snapped to the nearest enemy inside a 24 deg cone | densest enemy cluster within 420, else 300 px ahead |
| Cooldown | 7 s | 16 s |
| Form I (documented, modest) | width x1.3, damage x1.25 | radius x1.2, damage x1.2 |
- Form, aim and damage are snapshotted at the cast, so form expiry mid-cast changes nothing. Auto-attack pauses during a cast and resumes after.
- Movement while casting is slowed (beam 25/15/60%, sphere 40/70%). Q, Shift, F, Esc, WASD are unchanged; E and R were free.
- Shift cancels a cast (cooldown stays spent). A hit cancels only the wind-up; after release the attack always completes. Pause freezes everything (cast clock, sphere flight, FX). Death overrides.
- Animation is time-warped to the sim clock (`castFrame`): the clip's `release` frame (Beam 10, Sphere 16) lands on the sim release tick whatever the fps. Damage never depends on render frames.

## Art
- Blender: `anim_b05.py` (SOUTH) and `danim_b05.py` (NORTH/EAST/WEST; WEST mirrors EAST poses via the solver, never the art) add Beam (26 f) and Sphere (24 f) @ 20 fps to the existing four rigs, base AND Form I, using the existing parts. **No new arm art was needed**: the existing `angle`/`front`/`guard`/`side` fist slots give clean overhead and thrust poses (prototype check showed 0 enclosed gaps for the SOUTH raise). Rigs re-saved and re-opened in fresh Blender processes: all CHECKS true (1 + 3 base, 4 Form I); protected files unchanged; FK parity 0.00025 px.
- **Idle/Run/BasicPunch/Dash/Hurt/Death/Transform sheets are byte-identical in both forms** (git shows only new files plus manifest/blend/anim-data changes).
- Sheets/manifests: `art/characters/kai/{base,form-i}/.../sheets`, synced by `scripts/sync-kai-art.cjs` to `public/art/kai` and `public/art/kai-f1`.
- VFX: one ImageGen call (`gpt-6.1-sol` through the audited bridge, hash-checked; log `source/PROVENANCE.md`), `source/fx-sheet.png` -> `scripts/extract_fx.py` (palette-mapped, native-scale sampling; the beam segment is made seamless by mirroring its own slice, no painting) -> `fx/*.png` -> `public/art/fx/kai-abilities`. Tinted at runtime: cyan (Base) / Solar gold (Form I). Renderer: `src/game/render/abilityFx.ts`. Camera shake only (no screen flash), disabled by reduced-effects; landing-ring telegraph for the sphere; enemy hit flash.
- Defect log: (1) base EAST/WEST/SOUTH/NORTH overhead frames clipped at the canvas top (0 px margin) -> lowered the raise (pelvis down, shorter forearm), rebuilt all 8 pipelines, margin now 2 px for base; (2) sphere glow used a flat ellipse sprite -> replaced by round glow discs; (3) Form I detonation had a grey disc and muddy olive dome (scorch fill + dome) -> scorch removed, dome dimmed; re-shot and checked.

## Validation (actually run)
- typecheck PASS; vitest 83/83 (new: 11 sim tests: lane hit/miss/behind, once-per-pulse damage, no damage in charge, cooldown, held key, wall clip, Form I snapshot, dash/hit cancel, pause freeze, cluster aim, single detonation when the target dies, Form I radius, determinism, no overlap; 12 animation tests: manifests x8, release frame timing, priority, facing); `npm run build` PASS; Playwright e2e 5/5 (2 new).
- Live Phaser, headless Chromium, real keyboard, 960x540 and 640x360, `scripts/live_qa.cjs`: Beam and Sphere in all four facings against hordes, Form I (F) then both, run->beam, dash cancel (clip Dash), pause mid-charge frozen, hit before release (clip Hurt, cast cancelled), crowded scene (90 enemies) 60.5 fps with beam and sphere, death while casting -> Death clip -> Results. 0 console errors both sizes. Reports: `review/live-qa-960-report.json`, `live-qa-640-report.json`.

## Honest gates
- Technical: PASS. Functional: PASS for what was exercised above (retry/leveling/upgrade UI were not re-exercised beyond the unchanged e2e).
- **VISUAL MOTION UNVERIFIED**: I inspected stills (real sheets and live screenshots at 1x/2x, both sizes) but did not watch any clip at real speed. `review/gameplay-960x540-live.mp4` and each direction's `review/Beam|Sphere-normal-speed.mp4` are provided for the owner. Beam pose contrast between charge and fire is weak in NORTH/SOUTH (the fists are foreshortened); the beam FX carries it.
- **AUDIO: BLOCKED / not done.** The project has no audio, and no auditable original SFX source or generator exists here; I did not synthesise placeholder beeps. Events for charge/release/pulse/burst exist (`state.abilityEvents`) as the hook. AUDIO FEEL UNVERIFIED; mute settings untouched.
- Known visual defects: EAST/WEST overhead frames 12-15 put the raised fist against the hair; Form I hair already touches the top of the canvas in stance (inherited from B04); beam angle follows aim assist, so on diagonals it differs from the 4-way sprite facing; HUD gets crowded at 640x360 (two extra cooldown tiles, labels wrap); no hit-stop (shake only); sphere flight is a 2D arc, not true height.
- Not tested: gamepad (none exists), >115 enemies, GPU/memory profiling beyond fps and object-pool caps (FX pool cap 110, destroyed on end/restart).

## Evidence
`review/four-direction-{base,f1}-{beam,sphere}.png`, `review/effects-gamescale-960.png`, `review/gameplay-960x540-live.mp4`, live-QA reports, per-direction Blender review MP4s.

## Owner decisions
Approve (or send back) the look and feel of both abilities, the numbers (cooldowns 7 s / 16 s, damage, Form I bonuses), the E/R bindings, and whether to commission audio.

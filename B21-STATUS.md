# B21 — Combat Evolution + Windows desktop (PARTIAL: two sessions; owner review required; local commits, NOT pushed)

**Baseline:** B20 `08c6eb3`, clean tree. Reproduced before editing: typecheck clean, Vitest 368 pass / 1 skipped, build OK.
**Scope honesty:** the brief is a multi-session production batch. This session delivered the code-side of the six pillars, the branding and the Electron build. It did **not** deliver new authored sprite poses, new ImageGen VFX families, boss damage sheets, audio changes or any normal-speed video. Those are listed as INCOMPLETE below, not as passed.

## Stage table
| Stage | Status | What exists |
|---|---|---|
| B21.0 Baseline | DONE (code/test level) | Baseline numbers above; map of the real files in the table below. No FPS/GPU baseline (see Not observed). |
| B21.1 Character motion (all states x 4 facings) | **INCOMPLETE** | No pose, rig or clip was edited. Needs the Blender rigs under `art/characters/*` and a motion review at real speed. |
| B21.2 Build-evolving abilities | PARTIAL (implemented, stills only) | `src/game/render/buildEvolution.ts`: truthful tier mapper from `upgradeStacks`/`Mods` (cooldown-only, XP, health, armour, pickup cards never raise a tier). Wired to Ren/Sora hit flashes and pierce sparks (`heroFxView.ts`) and Kai beam sparks + a mastered-Nova second ring that ends on the real blast radius (`abilityFx.ts`). Reduced Effects keeps at most one extra spark. No new ImageGen asset families, no per-ability silhouette art. |
| B21.3 Living transformations | PARTIAL | `src/game/render/auraState.ts` (idle → moving → dash → charge → release → settle) drives the existing ImageGen Ren/Sora aura layers, now persistent in normal play (B20 only drew them in the reveal), leaning away from travel, tightening on charge, pulsing on release. B20 body stroke kept as the silhouette rim. Kai forms untouched. No new animated aura frames. |
| B21.4 Enemy / boss bodies | PARTIAL | `bodyReaction.ts`: weight-graded recoil/tilt/squash per archetype from the real damage fraction, delayed heavy recoil for Bruiser/Aegis, shield-break stagger, blocked hits are a shield jolt (no wound lean). Bosses: HP/phase damage level tint, ember leak from level 2, a debris burst when a level is crossed, small hit lean. **No authored boss damage sheets, no Aegis shield-break art, no Cantor/Seraph new frames.** |
| B21.5 Reactive arenas | PARTIAL | `arenaMarkPlan.ts` + `arenaMarks.ts`: capped (56) pooled floor marks from real events (Bloodstar slam, Meteor strike, Nova/Horizon burst, Lance and Fracture Lance lanes, Bruiser/boss slams), sized from the real radius, Gloam soot/steel vs Ashen charcoal + verdigris, hero-coloured heat that cools, fade by lifetime, nothing spawns or ages outside `running`, destroyed with the scene. Uses existing kai-abilities crack/scorch art. No bespoke per-material decal art. |
| B21.6 Cinematic / light / sound | PARTIAL | `impactDirector.ts`: one hit-stop budget (no hit-stop for common hits or Reduced Effects, 120 ms cap, 0.45 s spacing, finishers override) wired to Ren/Sora heavy moments through the existing `hitstopLeft`. **No impact-frame art, no dynamic light, no audio changes.** |
| B21.7 Integrated QA | PARTIAL | See tests. No six-route human runs. |
| B21.8 Branding | DONE (code/art), OWNER REVIEW | ImageGen cracked brass K with cyan cleft chosen from 3 concepts (A shard, B cracked K, C hex core; rejected kept). `art/branding/b21/` (prompts, studies, master, comparison sheet, `PROVENANCE.md`), `scripts/b21-build-icons.py`, `public/icons/*`, `build/icons/icon.ico` (16-256), `index.html` favicon links and a real description. |
| B21.9 Electron | DONE, one installer actually built and installed | See desktop table. |
| B21.10 Acceptance | PARTIAL | See below. |

## Desktop (actually run on this machine, Windows 11)
| Check | Result |
|---|---|
| `npm run desktop:build` / `npm run build` | OK |
| Packaged smoke (`desktop:smoke`, `dist/` and the unpacked exe) | PASS: game reached the arena, **0 failed/blocked requests, 0 console errors**, origin `app://kyntraze`, no `require`/`process` in the page, no `__KYNT_QA__`, localStorage written by launch 1 seen by launch 2 (throw-away profile in a path with spaces and non-ASCII) |
| NSIS installer | `release\KYNTRAZE-FRACTURE-RUSH-Setup-0.21.0.exe`, **198.5 MB (final rebuild with all session 2-4 art and audio; install/smoke/uninstall re-verified)**, unsigned, x64, per-user, directory choosable |
| Silent install into `...\KYNTRAZE Install ünï Test` | OK (installed size 518 MB), Start Menu + Desktop shortcuts created |
| Smoke run from the **installed** exe | PASS (same checks) |
| Exe icon | the cracked K (extracted from the exe and viewed); version info `KYNTRAZE FRACTURE RUSH 0.21.0.0` |
| Uninstall | OK: folder and both shortcuts removed, `%APPDATA%\KYNTRAZE FRACTURE RUSH` (saves) **kept** |
| Offline | The app issues no remote request (a request filter cancels anything not `app://`, `blob:`, `data:`; the smoke would list any). The machine was not physically disconnected. |
| Security | `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `webSecurity`, no preload/IPC, permissions denied, navigation and `window.open` blocked, CSP header on every `app://` response, DevTools off when packaged, path-traversal guarded `app://` handler, single-instance lock, no menu (Alt+F4 intact), F11 / Alt+Enter fullscreen, min size 640x360. |

## Tests
Vitest (Phaser-free): 383 passing before the desktop work (368 baseline + 15 new in `src/tests/b21-evolution.test.ts` covering the evolution mapper, aura state machine, impact director, arena mark planning/material correctness, body reactions and boss damage levels). Typecheck clean. Playwright: full run 67 passed / 3 failed / 3 skipped (5.8 min, run while the desktop build was also using the machine); the 3 failures (`arenas` ashen boss run, `menus` Esc on hero select, `stillfire` E charge) all **passed on an isolated re-run (4/4, 1 worker)**, the same load-sensitivity B20 documented. Not a clean full-suite green: re-run on an idle machine before sign-off.

## Observed vs not observed (state of the evidence)
- **IMPLEMENTED:** everything marked DONE/PARTIAL above.
- **VISUALLY OBSERVED (stills only, my own screenshots, swiftshader, 960x540, Gloam and Ashen, Ren and Sora):** red aura wisps behind a moving Ren and blue arcs on Sora; Ren Q punch sparks; Bloodstar crater on Gloam and Ashen. Ren's aura was too dim in the first capture and was strengthened afterwards (re-checked on Ashen).
- **VISUALLY OBSERVED AT NORMAL SPEED:** **nothing.** No real-speed video was captured or watched. Fluidity, aura "life", hit-stop feel and enemy recoil timing are untested by eye.
- **AUDIO HEARD:** nothing (no audio changed).
- **PERFORMANCE MEASURED:** nothing. The automated Chrome is software-rendered; no valid FPS/p95/GC/texture numbers. New cost is bounded (<=56 mark sprites, aura layers share the existing 110-image pool).
- **PAD VERIFIED:** no controller.
- **NOT TESTED:** Kai form auras/Kai boss fights against the new reactions, Aegis/Cantor/boss reactions in play, 60-mob crowd with the new layers, Reduced Effects clips, 640x360 and 1920x1080 captures, six human runs, `prefers-reduced-motion`, owner-save migration on desktop (no schema change was made).
- **OWNER REVIEW NEEDED:** icon choice; aura strength on Ren/Sora (`auraDraw` in `heroFxView.ts`); whether the Ren/Sora hit-stop (45/90 ms, `impactDirector.ts`) feels right; floor mark intensity (Bloodstar's mark stacks on the existing B19 fissure for ~1 s); desktop installer on a clean machine.

## INCOMPLETE (carry to the next B21 session)
1. B21.1 all eight states x four facings: pose/clip authoring through the Blender rigs, turn bridging poses, secondary motion; before/after real-speed clips.
2. B21.2 ImageGen asset families per ability (core, edge, emitter, trail, pierce sparks, echo rings) and the baseline-vs-evolved comparison captures with recorded mods.
3. B21.3 frame-animated aura art, Kai form refinements (Flarebound/Cometheart/Stillfire dialects), dash/stop/revert clips.
4. B21.4 authored enemy sheets/frames (Aegis block/break, Cantor buff, Seraph halo/core damage, Warden crack levels), 60-mob review.
5. B21.5 per-material bespoke decal art (cracked stone / scored metal), debris pooling, and a 5-run leak check.
6. B21.6 impact frames, dynamic light, camera choreography review, SFX alignment/audition montage.
7. B21.7 evidence directory (`art/review/b21/`), `B21-REVIEW.md` with before/after table, profiling, six-route checklist.
8. Desktop: real network-disconnected run, upgrade-in-place with the same profile, corrupt-save backup check on desktop, controller/fullscreen/Sora hold-E check.

## Session 2 update (supersedes the stage rows above where they differ)
- **B21.1 motion:** `bodyMotion.ts` springs (lean, start/stop squash, dash stretch, cast recoil, hurt stagger, breathing) applied to every hero state/facing, with eight distinct signatures. **Still no new authored poses/rig edits** (Blender rigs untouched): authored turn bridges, new run cycles, hair/sash secondary motion remain INCOMPLETE.
- **B21.2:** ImageGen evolution families (`public/art/fx/b21/evo/`, 39 PNGs) wired through one central `EvoFx` (tier arcs, pierce sparks, afterburn trail, echo rings at the real radius, still blink slash). Not done: per-ability bespoke silhouettes beyond these families, Dragonfang head art (existing sliced dragon kept).
- **B21.3:** ImageGen flipbook auras for all five states (`public/art/fx/b21/aura/`) via `AuraView`, including Kai's three forms. Not done: authored dash/stop/revert aura clips.
- **B21.4:** ImageGen Warden crack levels, slabs, Seraph shards/core crack, Aegis shield crack/shatter/guard-down, Cantor buff glyph; Warden Rupture/Sweep/Rush acting. Not done: new Aegis/Cantor/Seraph body frames.
- **B21.5:** ImageGen floor decals per arena wired into the marks.
- **B21.6:** impact frames (ImageGen), floor lights, budgeted hit-stop. Not done: camera choreography beyond existing kicks, SFX alignment (no audio touched).
- **Evidence:** `art/review/b21/video/` (8 clips) + `B21-REVIEW.md`; scripts `b21-capture`, `b21-boss-capture`, `b21-video`, `b21-stress`.
- **Stress (software GL, counts not FPS):** 70 mobs + spammed abilities, scene display list plateaus (Ren ~480, Sora ~500, Cometheart ~800 objects, all pools capped); no console errors.
- **Visually observed (stills):** all eight transformed/base captures of the five auras at 960x540 on Gloam, evolved Ren/Sora/Kai(Cometheart) abilities on Ashen, Warden damage levels 100/60/30% and phase 2, Seraph phase 2 halo/core, one frame extracted from a recorded clip. **Still nothing watched at normal speed.**
- **Tests:** Vitest 391 pass (1 skipped); typecheck clean; build OK; `desktop:smoke` PASS with the new art manifests (0 failed requests). Playwright full run on an otherwise idle machine: **69 passed, 1 failed, 3 skipped**; the failure is `menus.spec.ts:36` (Esc on hero select), which passes 3/3 in isolation and also failed once in session 1 (pre-existing flake in the title menu, unrelated to B21 code).

## Session 3 update
- **B21.1 authored motion (Blender, stills only):** Ren base + Ascendant, all 4 directions: Idle (hip sink / weight shift / breath, head and fists lag), Hurt (planted feet drag, harder torso whip, no hop), Run (centre of mass ~1 px lower, stronger shoulder-led counter-swing; RunLower/RunPunchUpper rebuilt from the same cycle). Sora base + Sovereign, all 4 directions: Idle only (breath, weight shift, floating caster hand, trailing sash; Sovereign floatier settle). Frame counts, fps, loops, events, manifests and anchors unchanged. NOT changed: Dash, Death, Beam, Sphere, Transform, Sora Run/Hurt, **all Kai sheets**. Notes: `art/characters/{ren,sora}/B21-MOTION-NOTES.md`; before/after sheets `art/review/b21/*-motion-before-after*.png`; originals `*.b21.bak` and git history. Checked on contact sheets and in-game stills only, not at real speed.
- **B21.6 audio:** 11 original synthesized accents (`art/combat/audio/synth_b21.py` -> `public/audio/b21`): impact frame, evolution spark/echo, shield shatter/down, boss crack, floor crack, four aura surges, wired to the visuals through one `b21-cue` event with a 3-voice cap and per-sound gap. Spectrum-checked (no sub-only mud, no clipping, unit-tested); **NOT heard by ear.** `shield_down` is shipped but not wired.
- **Accessibility:** `prefers-reduced-motion` now also enables the reduced presentation (was Reduced Effects only).
- **Tests:** Vitest 392 pass; Playwright 69 pass / 1 fail / 3 skipped on a loaded run; the failure (`arenas.spec.ts:90` gloam, a 30 s timeout on a ~23 s test under software GL) passes in isolation (2/2). Earlier flakes (`menus` Esc, `stillfire`, ashen boss run) are the same load-sensitivity; no spec fails deterministically.

## Session 4 update (final for this pass)
- **Authored motion now covers:** Ren (both forms, 4 dirs): Idle, Hurt, Run (+RunLower/RunPunchUpper), Dash, Death. Sora (both forms, 4 dirs): Idle, Run set. Kai (Base, Flarebound, Cometheart, Stillfire, 4 dirs): Idle, Hurt, Run (Base/Flarebound RunLower pixel-identical; Cometheart Run set rebuilt together). Notes per hero: `art/characters/{ren,sora,kai}/B21-MOTION-NOTES.md`; before/after sheets `art/review/b21/`. All frame counts, fps, loops, events, anchors unchanged; crop sizes/origins moved 1-6 px in manifests. Verified on contact sheets + in-game stills (all 8 base/transformed states load, 0 console errors), **not at real speed**.
- **Still old (not attempted or not improved):** Sora Hurt (already authored), Sora Dash/Death, Kai Dash/Death/Beam/Sphere/BasicPunch/Transform (Base, Flarebound, Cometheart), Ren Beam/Sphere/Transform; secondary hair/sash as separate overlays (baked into sheets only); new Aegis/Cantor/Seraph body frames (damage shown by ImageGen overlays instead).
- **Process incident:** one Blender fork ran `git checkout` on Kai paths and reverted another fork's uncommitted Kai edits; the Kai fork rebuilt from saved scripts and re-verified, so the Kai result comes from the restored scripts only.
- **Tests:** Vitest 392; Playwright 69 pass + the ashen/gloam bosses spec, which timed out at 30 s only under parallel software-GL load; its budget is now 90 s and it passes 11/11 twice. `shield_down` is wired.

## Aura revision (owner feedback)
The large ImageGen wing/arch auras felt cheap and extended past the characters. They are no longer drawn. Every transformed state now uses a body-fitting aura: a third glow filter on the hero sprites (same technique as the B20 stroke), form-coloured (Ren ember-red, Sora cyan, Flarebound orange, Cometheart flickering gold, Stillfire soft silver), driven by the idle/move/dash/charge/release state and skipped entirely (`active=false`) when untransformed. A small ground sigil and the release-surge sound remain. The flipbook art in `public/art/fx/b21/aura/` is kept but unused. Checked in-game stills for all five forms; not watched at real speed. e2e: `controller.spec` 960x540 failed on this machine while another project's dev server loaded the CPU, and also failed when the change was stashed, so it is load-related, not caused by the aura.

## Source map used (verified present)
`src/sim/*`, `src/content/{upgrades,heroKits}.ts`, `src/assets/{kaiAnimation,heroAnimation}.ts`, `src/game/render/{EntityRenderer,heroFxView,abilityFx,enemyRenderer,bossRenderer,fxPool}.ts`, `src/game/scenes/ArenaScene.ts` (hit-stop = skipped sim ticks via `hitstopLeft`, unchanged contract), `art/` rigs present locally.

## Commits (local, unpushed)
See `git log --oneline -6`. Nothing was pushed, signed or published.

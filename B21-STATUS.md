# B21 — Combat Evolution + Windows desktop (PARTIAL: first session; owner review required; local commits, NOT pushed)

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
| NSIS installer | `release\KYNTRAZE-FRACTURE-RUSH-Setup-0.21.0.exe`, **185.5 MB**, unsigned, x64, per-user, directory choosable |
| Silent install into `...\KYNTRAZE Install ünï Test` | OK (installed size 518 MB), Start Menu + Desktop shortcuts created |
| Smoke run from the **installed** exe | PASS (same checks) |
| Exe icon | the cracked K (extracted from the exe and viewed); version info `KYNTRAZE FRACTURE RUSH 0.21.0.0` |
| Uninstall | OK: folder and both shortcuts removed, `%APPDATA%\KYNTRAZE FRACTURE RUSH` (saves) **kept** |
| Offline | The app issues no remote request (a request filter cancels anything not `app://`, `blob:`, `data:`; the smoke would list any). The machine was not physically disconnected. |
| Security | `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `webSecurity`, no preload/IPC, permissions denied, navigation and `window.open` blocked, CSP header on every `app://` response, DevTools off when packaged, path-traversal guarded `app://` handler, single-instance lock, no menu (Alt+F4 intact), F11 / Alt+Enter fullscreen, min size 640x360. |

## Tests
Vitest (Phaser-free): 383 passing before the desktop work (368 baseline + 15 new in `src/tests/b21-evolution.test.ts` covering the evolution mapper, aura state machine, impact director, arena mark planning/material correctness, body reactions and boss damage levels). Typecheck clean. Playwright result: see the line at the bottom of this file.

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

## Source map used (verified present)
`src/sim/*`, `src/content/{upgrades,heroKits}.ts`, `src/assets/{kaiAnimation,heroAnimation}.ts`, `src/game/render/{EntityRenderer,heroFxView,abilityFx,enemyRenderer,bossRenderer,fxPool}.ts`, `src/game/scenes/ArenaScene.ts` (hit-stop = skipped sim ticks via `hitstopLeft`, unchanged contract), `art/` rigs present locally.

## Commits (local, unpushed)
See `git log --oneline -6`. Nothing was pushed, signed or published.

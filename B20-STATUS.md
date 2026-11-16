# B20 — release-candidate polish (PARTIAL: owner sign-off required; local commit, NOT pushed)

**Baseline:** HEAD 74a9a91 (B19), clean worktree, equal to origin/main. Baseline reproduced here: `tsc -b` clean, Vitest 365/365 (30 files), Playwright 59/59, `vite build` OK, dist 59 MB.

## Verdict
**PARTIAL / OWNER SIGN-OFF REQUIRED.** This session fixed the concrete UI defects, hardened release docs and added production and balance tooling. It did **not** perform the art repair, real-time motion review, by-ear audio audition, real-GPU profiling, physical-controller test or human six-route playtest. Those are not claimed.

## Changed (all verified by automated tests plus screenshots viewed)
- Title overlap with Kai: reproduced at 640x360, 960x540, 1280x720, 1440x900, 1920x1080 (box overlap between the button row and Kai). Fixed in `src/app/kit.css` (stacked actions, `.title-kai { right: 12% }`, logo mark hidden because it overflowed above the viewport on tall screens). `e2e/title-layout.spec.ts` covers 640x360 to 3440x1440.
- Results at 640x360 / 640x320: found by screenshot (bounds checks alone passed): "ELIMINATIO" truncation, action row overrunning the plate. Fixed in `kit.css`; `e2e/results-layout.spec.ts` covers WIN and DEFEAT; images in `art/progression/review/b20/`. The reward list still scrolls inside the body (by design) with the action/hint area pinned.
- Archives: Kai-specific transformations row labelled "KAI"; Ren/Sora rows state the earn rule. No unlock logic touched.
- Title build label no longer says "SURVIVAL PROTOTYPE".
- Docs: README rewritten for the real game; B19-STATUS header (was "NOT pushed"); historical banners on B00-era pages; changelog.
- Test fix: see the flaky-test row below.
- Production: `e2e/prod-smoke.spec.ts` against `vite preview` for Kai/Ren/Sora: no 4xx, no console errors, `window.__KYNT_QA__` absent and no `-qa` save key even with `?qa=1`. Built JS contains none of the QA hook names.

## Balance investigation (no tuning applied)
`src/tests/balance.bot.test.ts` (`BALANCE=1`): one mortal policy for all heroes, 8 seeds x 2 arenas. Average death time (minutes):

| policy | Kai gloam / ashen | Ren | Sora |
|---|---|---|---|
| kite | 3.1 / 3.8 | 2.8 / 2.9 | 1.8 / 1.9 |
| strafe | 4.5 / 5.2 | 4.4 / 4.4 | 4.3 / 3.0 |

B19's different bot reported Ren/Sora at 1.4-1.7x Kai. Two policies here give the opposite ordering for Sora, so bot results are policy-driven and are not evidence for nerfs or buffs. No numbers were changed. Owner action: the six-run human matrix below. Per-run variance is large (Ren gloam strafe 2.4-11.4 min).

## Not done / owner checks
| Item | State | How to verify |
|---|---|---|
| Ren/Sora art defects (arms, pinholes, Bloodstar pose, Sora side torso/neck/contrast) | NOT STARTED | needs Blender sources in `art/`; review `art/characters/*/ART-NOTES.md` |
| Real-time motion review, boss tells, Aegis/Cantor audit | NOT VERIFIED | play each hero on both arenas, headed browser |
| Audio by ear | NOT VERIFIED BY EAR | listen to title, both arenas, Warden, Seraph, victory, each hero's Q/E/R, Sora brightness, Ren sub-bass |
| Real GPU / performance | NOT MEASURED | open DevTools Performance on a 40-enemy and 60-enemy+boss scene, note GPU |
| Physical controller | NOT VERIFIED (mocked pad tests pass) | connect a pad, run controller flow in `e2e/controller.spec.ts` by hand |
| Six-route human playtest | NOT DONE | Kai/Ren/Sora x Gloam/Ashen, natural start to Seraph or death; record time, level, forms, what felt unfair |
| Input buffering / hit-stop review, Reduced Effects visual review | NOT DONE | |
| Safari/Firefox/.ogg codec support | NOT VERIFIED | |
| LICENSE-NOTICES.md rewrite | NOT DONE (still B00-era text) | rights review before commercial claims |
| Flaky-test investigation | DONE for one case. `stillfire.spec.ts` (E charges while Kai glides) passed in the first baseline run, then failed repeatedly on a heavily loaded machine, including on the untouched B19 code (checked with a stash). Cause: it sampled the short Silver Rift charge window after a fixed 500 ms sleep. It now waits for the real condition (cast is `rift` and Kai has moved) with 30 ms polling; assertions are unchanged. 3/3 passes after the fix. The second B19 flaky case was not reproduced. | rerun `npx playwright test e2e/stillfire.spec.ts` |

## B21 handoff (not B20 bugs)
Animation and VFX evolution per the approved B21 plan; nothing from it was started.

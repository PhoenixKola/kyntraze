# B20 release-candidate checklist

Verification type: AUTO = automated, VIEW = screenshot viewed, 1X = watched at real speed, EAR = heard, PAD = physical controller, GPU = real GPU, PLAY = human run.

| # | Item | Severity | Type | Result |
|---|---|---|---|---|
| 1 | typecheck, Vitest 365, Playwright 70 (59 + 7 title + 4 results; 3 prod-smoke skipped without PROD_URL, run separately: pass) | critical | AUTO | PASS |
| 2 | production build + preview smoke, no QA hooks, no 404 | critical | AUTO | PASS |
| 3 | title never overlaps Kai (640x360 - 3440x1440) | major | AUTO + VIEW | PASS |
| 4 | WIN/DEFEAT results at 640x360 and 640x320 | major | AUTO + VIEW | PASS |
| 5 | Archives form/runner wording | minor | VIEW | PASS (not screenshot-reviewed at 640x360 this pass) |
| 6 | save migration / dedup | critical | AUTO (existing B18/B19 tests) | PASS, not re-audited by hand |
| 7 | Ren/Sora VFX (ImageGen) and layered auras, hero-coloured dash | major | VIEW | PASS (stills viewed); sprite arm/pose/torso fixes NOT DONE |
| 8 | normal-speed combat/boss motion | major | 1X | NOT VERIFIED |
| 9 | audio quality | major | EAR | NOT VERIFIED BY EAR |
| 10 | controller | major | PAD | NOT VERIFIED |
| 11 | frame pacing | major | GPU | NOT MEASURED |
| 12 | six-route balance | major | PLAY | Sora buffed from bot evidence; human playtest NOT DONE |
| 13 | LICENSE-NOTICES.md current | major | review | UPDATED; rights review still required |
| 14 | Q/E/R input buffer | minor | AUTO | PASS |
| 15 | Ren punch / Sora softened audio, Rare chime | minor | EAR | NOT HEARD |

Owner sign-off: [ ] visuals  [ ] audio  [ ] input  [ ] performance  [ ] balance  [ ] licensing

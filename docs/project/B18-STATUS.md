# B18 — Meta progression, unlocks and replayability (OWNER REVIEW; feel/balance NOT VERIFIED)

## Loop
Run (win or lose) -> **Fracture Marks** -> Results breakdown -> Armory / Contracts / Archives (title, hero screen, results) -> equip boon / pick contract -> Deploy -> HUD shows the contract, level-up screen offers Reroll / Banish.
Also fixed: Results no longer clips its buttons / hint bar (scroll body + pinned actions, compact stat row, reward chips never cropped).

## Data model (`SaveV1.meta`, additive, idempotent migration; `src/sim/MetaSystem.ts`, `src/content/meta.ts`)
marks, lifetime, owned[], boon, contract, crest, feats{id->run#}, mastery{}, counters, per-arena records, `granted[]` (last 40 run ids), introSeen, legacyGift.
Run identity = random id per GameBridge (never the seed). `finalizeRun` is pure and a no-op for a known id; it runs when the sim enters dead/victory, before Results shows, and is stored immediately.
Legacy: a save with Form II gets feat Warden Breaker + 30 marks once; Form III / a win gets First Win + 50 marks once; unlock flags are untouched. A fresh save gets nothing. Corrupt JSON is copied to `<key>.corrupt` before defaults load.
QA isolation: `?qa=1` (dev server only) uses `kyntraze-b00-v1-qa`; the real save is never written (verified in e2e).

## Economy (first pass, tune in B20)
Earn: 1 mark / 20 s survived (cap 45), 1 / 40 kills (cap 20), Warden +15, Seraph +25, victory +40, contract bonus +20..30 on victory, feats +5..40, arena mastery +12 each.
A 3:20 defeat earns ~18 (first run incl. feat); a full win ~150+. Costs: boons 15-35, run tools 60, cosmetic crest 15, Warden/Silver crests free once earned.
Unlocks (11): 5 boons (one equipped: +20 HP, +8% speed, +40% pull, 25% Drive, +10% XP), Reroll Module (2/run), Banish Module (2/run), 3 crests. Contracts (4): Overrun (+~40% spawn pace), Glass Vanguard (60% HP), Relic Pressure (+~40% hazard rate), No Second Wind. Feats 14, mastery 3 per arena.
Config is applied deterministically at run start (same seed + config = same run; unit-tested).

## ImageGen
4 first-draft sheets accepted (30 icons: boons/tools/mark coin, crests/contracts/arena badges, 14 feat medals), keyed by `art/progression/b18/extract_b18.py` into `public/ui/meta/`. Prompts + masters in `art/progression/b18/`.

## Checks run
tsc, build, 323 unit tests (23 new), full Playwright suite (51) incl. B18 loop at 960x540 and 640x360 (natural defeat -> reward -> keyboard purchase with confirm, repeat-key safety, contract selection, reload persistence, HUD chip + 120 max HP), controlled victory (rewards once, real save untouched), mocked-pad navigation of Progression.

## NOT VERIFIED
Real controller, audio by ear of the new reward sounds (reuses B16 UI sounds), balance/economy feel, normal-speed motion, banish/reroll on pad (reachable by focus only), Banish via Shift+1-3 in a live level-up (unit-tested only), the 640x360 Armory with all rows (scrolls).

## Not done / carried forward
Upgrade-pool additions with prerequisites (no new in-run cards), a dedicated Rare/Epic reward stinger, achievement notifications in-run. B15/B17 carry-forward items unchanged (moving-punch audit, input buffering, perf, mob motion audit, Aegis shield art, Cantor fan origin, Seraph pattern readability, Warden recovery poses).

## Review
`art/progression/review/b18/` (armory/contracts/archives initial + purchased, results defeat/victory, hero loadout, HUD contract, pad). Play: title -> ARCHIVES, or lose a run and press ARMORY.

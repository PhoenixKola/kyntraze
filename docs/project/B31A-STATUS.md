# B31A Fracture Chronicles: status

Baseline: B30.1/B30.2 (`7698ac6`). Local commit only; **not pushed or deployed** (the brief says no push without authorization). Done solo, no subagents.

## Chapter inventory (13)
| Id | Hero | Arena | Mission (real sim mechanic) |
|---|---|---|---|
| kai_1 The Ignition Debt | Kai | Gloam | Hold the reactor 3:30 (new `hold` step), overload threat curve |
| kai_2 The Dragon's Weight | Kai | Ashen | Two elite assaults, then the Warden's echo (40% HP); Fractured Momentum rule |
| kai_3 Stillfire | Kai | Aetherfall | Duel the Castellan (55% HP), no wanderers |
| ren_1 Crossed Oath | Ren | Ashen | Three waves under Glass Vanguard (half health) |
| ren_2 Nine Tails | Ren | Gloam | Hold 4:00 under Guardian's Burden (shield-bearer swarm) |
| ren_3 The Price of Ascension | Ren | Paradox | Mirror Tyrant (50% HP), no Second Wind |
| sora_1 Zero Horizon | Sora | Aetherfall | Two aerial waves under Prismatic Rain |
| sora_2 Trust Fall | Sora | Paradox | Hold 4:30 under Mirror March |
| sora_3 Azure Sovereign | Sora | Aetherfall | Silence the Hollow Choir (50% HP) |
| vex_1..3 | Vex | Gloam / Paradox | The original Trial of the Oathbroken, untouched (`vex_trial_1..3`, rewards, forms, records) |
| finale The Unbroken Line | any runner | Paradox | Two waves, Regent (35%), Sovereign (45%); unlocked by 12/12 |

Sequential within an arc; the first chapter of each arc is open on a fresh save; no mission needs an unearned form. Death or the time cap fails a mission; retry, next chapter, map, Nexus and replay all work.

## Canon (short)
The Order of the Unbroken Line wove the Line across the world's one seam; each Vanguard bonded a Line fragment that took beast shape (Kai dragon, Ren fox, Sora phoenix, Vex guardian). The Fracture is the Line cut from inside by the Accord, the Order's council. Warden, Seraph, Castellan, Regent, Mirror Tyrant, Hollow Choir and Sovereign are offices gone hollow; the Oathkeeper kept the vows and exiled Vex for objecting. Clues: Kai (relay opened from inside, the Warden's thread, the Accord's seal), Ren (the abandon order, the Line is a promise, seven in the glass), Sora (the surgical cut, the closing door, the choir's last name), Vex (the original Trial). The finale re-knots the Line; the seam stays open and something beyond notices.

## Changed systems
- `b22/plan.ts`: `campaign` mode, `hold` step; `sim/B22Encounters.ts` hold completion; `bridge/GameBridge.ts`: live objective text, no per-run Marks for campaign, one-time chapter reward applied after the run's own meta, `loadingHeroes()`.
- `b22/save.ts`: additive `chronicles` block (done, seen scenes, visits, last result), sanitised and idempotent; completion is written in `applyB22Result` at victory, before any outro; the run-id ledger makes it once-only.
- New `src/b31/` (chapter data, gating, Nexus chatter), `ChroniclesScreen`, cinematic `StoryPanel` (capture-phase keys, back / skip; also fixes Esc not closing a scene while a run is behind it), Archives CHRONICLES tab (lore after completion, scenes sealed until played or finished), Results chapter wording and next chapter, loading objective line, Nexus nav entry and hero chatter.

## ImageGen provenance
Ten 16:9 key arts through the project's audited Codex bridge (`art/chronicles/run.py`, prompts `*-prompt.txt`, log `PROVENANCE.md`), each from the canonical hero card or form portrait plus the arena card as references; published as 1280 px and 480 px webp in `public/art/chronicles/` (2.0 MB). All ten were inspected and kept. No generated image contains text. Vex chapters reuse the existing `story_N.jpg`.

## Validation
- tsc clean; `npm run build` ok; vitest 785 pass (new `b31-chronicles.test.ts`: 13 definitions, gating, legacy-save migration, reward idempotency, all 13 plans launch on the real sim, hold / wave / duel win paths, Nexus chatter).
- Browser (headless Chromium, software GL), real UI: fail kai_1 (no completion, "lost" result, retry), win it (completion and +150 Marks are already stored while the outro is still open; seen scenes tracked separately), replay (0 extra Marks), next-chapter intro, Esc / Back / Skip in scenes, map statuses, Archives tab. Also `e2e/chronicles.spec.ts`, nexus, pause and loading specs, and the Vex Trial path in `b22-modes` (that spec needs `--timeout=150000`; it takes about 45 s and passes).
- Captured at 1920x1080 (map), 960x540 and 640x360 (map, scene, Nexus, HUD, results); no console errors. (Evidence screenshots were removed at the owner's request; none are kept in the repo.)

## Not done / limits
- Browser wins were reached by advancing the sim clock (hold) or forcing the dead phase, not by playing the full 3:30. Mission balance for fresh players is reasoned from the curves and sim tests, not playtested; duel HP multipliers (35-55%) are untuned.
- Only kai_1, kai_2 and the Vex entry were launched through the browser UI; the other chapters and the finale are covered by sim tests, not by watching them. No mission was played at normal speed by me.
- Scene motion, audio and reduced motion were checked as stills and code only (CSS drift and slide are off under `prefers-reduced-motion`). No voice acting and no new scene audio. Physical controller untested (buttons carry the pad attributes).
- Art: ten key arts only. Intro and outro of a chapter share its art (parallax drift, not a new illustration per beat); speakers use existing portraits; bosses have no portraits and speak through narration. Kai's Stillfire art shows an open torn jacket, slightly off the Form III portrait.
- No finale crest. Rewards are Marks (150 / 200 / 250 per chapter, 600 for the finale), lore and scenes.
- A chapter's opening can be replayed once it has been seen; outro and lore unlock on completion.
- Campaign is solo; local co-op and online were not touched and not re-tested this batch.

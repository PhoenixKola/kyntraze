# B19 — Ren and Sora (OWNER REVIEW; verdict at the bottom; local commit, NOT pushed)

## What a player gets
Three runners on the hero screen: **Kai** (unchanged, three transformations), **Ren** (crimson close-range brawler, Crimson Ascendant) and **Sora** (azure ranged controller, Azure Sovereign). Selection is a real choice (mouse, keyboard, pad focus), saved, and kept by Retry. Ren and Sora each have Base + exactly ONE transformation; Kai's forms and unlocks are untouched.

| | Ren | Sora |
|---|---|---|
| Auto (separate from Q, works while moving) | **Hammer Chain**: short arc, every 3rd blow is a heavier finisher | **Azure Needle**: homing blue needles, real projectiles |
| Q | **Crimson Break**: 5 punch beats stepping into the crowd; moving variant | **Azure Volley**: 7-bolt fan; moving variant |
| E | **Meteor Rush**: chains up to 3 enemies (wall-checked path, i-frames); no target = 230 px forward burst | **Celestial Lance**: hold to charge (3 tiers: width, length, damage), release to fire a piercing beam from the hand anchor |
| R | **Bloodstar Impact**: leap to a ground target, slam, expanding shockwave + outer ring; shoves ordinary enemies, never bosses | **Zero Horizon**: summon 5 orbiting orbs, converge on distinct enemies, detonate together |
| Transformation | Crimson Ascendant: Break 7 faster beats + lane line; Rush 5 strikes + burning route; Bloodstar adds a supernova rebound | Azure Sovereign: Volley 11 homing/piercing bolts; Lance +1 tier, wider, arcs to neighbours + tip flare; Horizon 8 orbs + 230 px ring |

Unlock: **defeat the Fracture Warden with that runner** (permanent, stored once in `save.unlocks.ren|sora`). The unlocking run also fills Drive so the form is playable for the remaining ~7 minutes. Activation afterwards: full Drive + F (pad Y). Warden kills by Ren/Sora never unlock Kai's Cometheart and their victories never unlock Kai's Form III (migration reads `best.hero`).

## Architecture (compact map)
- `src/content/heroes.ts` / `heroKits.ts`: ids, display data, every number of both kits, per-hero upgrade wording and the number each card actually changes.
- `src/sim/HeroSystem.ts`: auto, Q/E/R, projectiles, orbs, shockwaves, cancel/interrupt. Slot mapping: Q = `qCooldown`, E = `beamCooldown` + beam mods, R = `sphereCooldown` + sphere mods, so HUD cooldowns, B18 cards, boons and contracts keep working. Form id 1 = the single transformation (`ASCEND` constants); Kai's `Cast` state is untouched.
- Hooks only where needed: `WeaponSystem`, `AbilitySystem` (dispatch, move scale, cancel, interrupt), `FormSystem`/`DriveSystem` (single form, cinema), `MovementSystem`, `CombatSystem` (unlock), `RunConfig` (hero stats), `SaveSystem`/`MetaSystem` (additive).
- Render: `src/assets/heroAnimation.ts` (clip selection over the same sheet contract as Kai), `game/render/heroFxView.ts` (VFX layer, pure projection of sim state), ghost trails in `EntityRenderer`. `HERO_SHEETS` flags gate sheet loading.
- Save: `save.hero`, `unlocks.ren|sora`, `meta.heroes` per-runner records, feats `ren_ascend` / `sora_ascend`; migration is additive and idempotent, QA store isolation unchanged.
- Upgrades: the 25-card pool is shared; for Ren/Sora every Kai-named card is rewritten (name, text, category label, and the number shown before/after is the stat THAT hero's ability uses). Unit-tested for all 25 cards x 2 heroes and for behavior of the key cards.

## Art (ImageGen + Blender, all pixel art in Kai's style and proportions)
See `art/characters/ren/ART-NOTES.md` and `art/characters/sora/ART-NOTES.md`. Owner corrections applied mid-batch: realistic painted concepts rejected twice; both heroes redone as chunky pixel art at Kai's height and part layout, then rigged with a self-contained copy of Kai's Blender rig (Kai's rig and outputs untouched).

### State of the art
| | Ren | Sora |
|---|---|---|
| Identity (pixel art, Kai height/proportions) | locked | locked |
| Base sheets: 4 facings x 10 clips | built (SOUTH/EAST/WEST/NORTH, NORTH is a true back view) | built |
| Transformed sheets: 4 facings x 10 clips + Transform | built (Crimson Ascendant: red spiked head/hair, glowing eyes) | built (Azure Sovereign: blue spiked head/hair, glowing eyes) |
| Meteor Rush / Bloodstar / Lance / Horizon / cast poses | Beam = Rush strike, Sphere = Bloodstar slam authored | BasicPunch = palm thrust, Beam = charge-hold + palm thrust, Sphere = summon authored |
| Hand anchors | `public/art/ren-anchors.json` | `public/art/sora-anchors.json` -> `src/content/heroAnchors.ts` (Sora's needle / volley / Lance muzzles come from the sprite hands; shots are aimed FROM the muzzle) |
| UI | portraits (base + form), framed crests, 5 white glyph icons each, hero-select card art | same |
| VFX | 12 ImageGen additive sprites (flame wisps, embers, pillar, crack, bursts) | 20 sprites (lightning, ribbons, sparks, beam, orb, flare) |

Transformation visuals: persistent reactive aura (ground corona + flame tongues/embers or lightning/ribbons/motes, stronger while casting/dashing, calmer in crowds and Reduced Effects), 2.7 s first reveal (frozen sim, camera punch-in, converging rays, light pillar, shockwave rings, knockback) and 1.15 s repeat, afterimage trails for Meteor Rush and dashes.

Honest art defects (details in each ART-NOTES.md): Sovereign/Ascendant change head, hair and eyes only (no separate glowing coat art; glow comes from runtime FX); blobby bare upper arms in some swings and small enclosed transparent holes in a few Dash/Beam/Sphere/Death frames (Ren); Sora's East/West torsos are busy, shins short, West neck-skin sliver; Sora's navy body is low-contrast on the Gloam floor (white trim carries it); both keep Kai's crouched stance family; Transform is 16 frames.

## Audio
36 original WAVs (`art/characters/heroes/audio/synth_b19.py`, `public/audio/hero-abilities/`), routed hero-aware in `abilityAudio.ts` through the existing B16 slots, voice caps and ducking; Ren low/grounded (sub-bass, saturated noise), Sora FM bells/glides. **AUDIO BY EAR: NOT VERIFIED.** Audition: `?qa=1&hero=ren|sora[&ascend=1]` (dev server), auto near an enemy, Q/E/R, F; Sora's files are bright (centroid 6-10 kHz): judge them for shrillness.

## Checks run
- `tsc -b` clean; production build OK.
- Vitest: **365 passed / 30 files** (new: heroes, heroUpgrades, heroSave, heroAnimation, heroAudio; Kai suites unchanged).
- Playwright: full suite 59 tests, all passing; two Kai/Boss/pause tests failed once under CPU load while Blender ran and passed on immediate rerun (timing flakes, not regressions). New: `e2e/heroes.spec.ts` (6, at 960x540 and 640x360: real selection, Q/E/R per hero, HUD labels, transformation lock/unlock/frozen clock, death -> Results hero name, Retry keeps hero + arena) and 2 mocked-pad tests (X/RB hold/LB/Y).
- Browser captures at 960x540 and 640x360 on both arenas, crowds, bosses (Warden kill unlocks the form, announces it, saves it only for that runner), Reduced Effects run, no console errors.
- Perf (software GL, relative only): transformed Ren/Sora add ~1-2.5 ms/frame over Kai in a 40-enemy crowd.

## Truth
- AUTOMATED PASS: see above.
- STILL OBSERVED: contact sheets and in-game stills for both heroes, both arenas, both sizes.
- MOTION NOT VERIFIED: nothing was watched at normal speed; stills only.
- AUDIO NOT VERIFIED (by ear).
- PHYSICAL CONTROLLER NOT TESTED (mocked pad only).
- REAL GPU NOT TESTED (software GL; relative cost only).
- First-pass balance only (naive bot: Ren/Sora about 1.4-1.7x Kai's survival); needs human tuning in B20.

## Review routes
`?qa=1&hero=ren` / `?qa=1&hero=sora` start a run as that runner on the dev server (QA save store); add `&ascend=1` for the unlocked form with full Drive (tap F). Hero select -> choose -> DEPLOY is the real route. Review stills: `art/characters/review/b19/`.

## Known issues / carried to B20
- Human playtest + balance (first pass only); Ren's/Sora's feel, hit timing and the exact numbers.
- Motion polish: blobby arms, enclosed holes, Bloodstar leg tuck modest; Ascendant/Sovereign coat glow art; Transform 16 vs 18 frames.
- Kai's Form III card: Stillfire starts after 10:00 with full Drive (existing B13 rule); the hero card now says so.
- Title / Settings / hero-select layout fixes made late (PB line clear of the hint bar; Settings headings spaced; title logo no longer stretched).
- Repo size: the art source folders add ~90 MB; review mp4s are kept out of Git.

## Verdict: **PARTIAL (reviewable, all required systems present)**
Both heroes are fully playable end to end with real, rigged, four-direction pixel-art sprites for base and transformed states, all six approved abilities, a spectacular reactive transformation, hero UI/save/meta/audio integration and tests. It is not a finished-quality claim: motion, audio by ear, a real controller and a real GPU were never verified, balance is first pass, and the art defects above stand.

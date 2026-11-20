# B10 status: progression, level-up UX, minimap

Baseline: main @ 06c6952 (B09). Mode: build forward with targeted verification only. **First-pass tuning; art/feel sign-off is the owner's.**

## What shipped
- **Upgrade pool: 25 cards** (`src/content/upgrades.ts`), 7 categories (Core, Lance, Nova, Survival, Mobility, Salvage, Drive) x 3 rarities (Common / Rare / Epic). Effects live in a new `Mods` block on `GameState` (beam width/damage/cooldown/linger/drive, Nova radius/damage/cooldown/echo, dash cooldown, XP gain, drive gain, form drain/power/cooldown, regen, armor, revive), read by the existing combat systems. The original 8 card ids and behaviours are kept.
  - Build-defining cards: **Rift Conductor** (Lance hits feed Drive), **Twin Bloom** (needs Afterglow: full-power second Nova burst), **Second Wind** (once per run, a killing blow is refused: revive at 50 % + 2.5 s grace + shove ring), **Ember Core** (Flarebound +25 % power, half the re-arm time). Epics open only after 2 stacks in their category (or a prerequisite card) and from level 8-9.
  - Rare: Twin Impact, Pulse Engine, Lance Afterburn (+1 damage pulse per stack as the Lance fades), Afterglow (half-power second Nova burst), Mending Field, Rich Veins, Flareheart.
- **Offer logic** (`createOffer`): level-gated rarity ramp, weights pulled toward categories you already invest in (so synergies show up), a Rare-or-better card guaranteed every third level, and slots 2-3 de-prioritise a category already offered (choices are usually directions, not three flavours of the same thing). Deterministic per seed.
- **Pacing**: XP curve `4 + 3.2L + 1.05L²`; kill XP scales `1 + t/700` so the late game (boss mob caps, tougher enemies) still levels. Headless orbit-bot probe (infinite HP, auto-picks): first level ~24-30 s, L5 ~2:00, L10 ~4:30-5:30, L16-18 ~8:00, L20+ by ~10-14 min (the bot cannot kill bosses, so its late cadence is a floor). Tested as a band in `progression.test.ts`.
- **Level-up screen** (`LevelUpScreen`, `BuildStrip`): rarity-treated cards (steel / amber / animated prismatic epic border + foil), painted category header art, diamond icon medallion, category + rarity tags, short blurb, **before -> after stat line computed from the real build**, stack pips (NEW / LV n/max), 1-2-3 keys, click, D-pad + A (existing controller nav; first card is the pad default), staggered entrance, hover sheen, "YOUR BUILD" icon strip (also on the pause menu). Reduced-motion respected.
- **Minimap** (`Minimap.tsx`): canvas in the HUD language under the pause button. Whole-arena view with solids, faint hazard geometry (Gloam lanes / Ashen pylon rings), the camera-view rectangle, player halo + facing chevron, additive enemy dots (a crowd reads as glowing density, nearby ones brighter, casters violet), elites as amber diamonds, boss as a pulsing red ring with horned-skull marker, live hazard charge-up/flash, and a status strip with frame tone: CLEAR / CONTACT / ELITE / SWARM / OVERRUN / HAZARD / BOSS (+ nearby count).
- **HUD micro-elements**: XP bar now carries `LV n` + `xp/next` and pulses when near a level; cooldown sweeps use the upgraded maxima; Second Wind badge on the portrait and a flash when it fires.
- **XP crystals**: placeholder orb replaced by four ImageGen gem tiers (shard / gem / elite / boss core) with additive glow and fade-out flicker in the last seconds.

## ImageGen (Codex bridge via `scripts/gen-image.py`, model `gpt-6.1-sol`, codex 0.169.0-alpha.11.1; log in `art/progression/source/PROVENANCE.md`)
4 sheets, 4 accepted, 0 rejected, no regenerations: `upgrades.png` (25 mono glyphs, 5x5), `markers.png` (6 map/HUD glyphs, only player + boss used so far), `xp.png` (4 gems), `cards.png` (8 painted headers, epic = foil overlay). Sliced by `scripts/build-progression-assets.py` into `public/ui/{upgrades,map,cards}` and `public/art/fx/xp`. Note: `gen-image.py` has a hardcoded Codex path; this run used the `CODEX_BIN` override (installed app is 26.1111.2228.0).

## Validation actually run
- `tsc -b`, `vite build`: clean. `vitest`: 211 pass (new `progression.test.ts`: content/asset shape, preview == result for all 25 cards, offer gating/synergy/rarity guarantee/no-maxed, effect maths, Second Wind, pacing band, minimap status).
- e2e (survival-loop, controller incl. level-up pad nav, hud-responsive, menus, pause-resume, boot): 18 pass. `survival-loop` was edited (old debug offer id; selector).
- Live (`scripts/b10-capture.cjs`, real Phaser app, swiftshader) at 960x540 and 640x360: level-up first level / Rare+Epic offers / hover, keyboard `2` and click choose, minimap calm / crowd+elites / hazard warn / boss / Ashen. Zero console errors. Evidence: `art/progression/review/live/` (PNGs + evidence JSON with HUD boxes: map does not overlap pause, clock, boss bar or ability slots at either size).

## NOT verified
- A human-played full run: pacing numbers come from a bot; real players kill faster early and die earlier, so the 10-20 min target is unproven. Lance Afterburn's extra pulses land during the fade (small visual mismatch not inspected in motion). Twin Bloom / Afterglow second burst and Rift Conductor feel not played. Second Wind revive not seen live (unit-tested only).
- Physical controller (pad nav tested with the mocked pad in e2e only); real-GPU frame pacing with the canvas minimap; 100+ enemy density on a low-end machine; audio for the second Nova burst (reuses `sphere_burst` sound).
- Balance of individual cards (numbers are first-pass); no card sells for a trade-off yet; no reroll/banish; no run-end/victory state (the run still ends only by death).

## Next polish candidates
Elite/threat edge chevrons on the minimap (the `threat`/`hazard`/`elite`/`star` glyphs are generated but unused), per-upgrade pickup VFX, a level-up burst in the world, a victory/ending after the Seraph, card art variety beyond category headers.

# B30 status: in-run UI, feedback and presentation polish

Screenshots: `docs/project/b30-review/` (960x540 and 640x360). No subagents were used.

## What changed
- **Objective tracker** (the Legendary recipe list): a compact mission plate with a gold edge, header, name, progress pips and an `n/total` count; dark translucent background so it reads on any arena. `src/app/b30.css`, `Hud.tsx`.
- **Encounter header**: arena name between diamonds, larger timer with a teal glow, a row with the defeated count and "Boss in m:ss" (turns red when under 30 s), gold separators; compact variant at 640x360. Contract line unchanged.
- **Pause menu**: stronger dim + blur backdrop, pop-in, run chips (hero, arena, contract, co-op) above the stats; existing stats, build strip and buttons kept.
- **Loading screen**: the destination arena's generated scenic art as the backdrop, pulsing rift rings around the running hero, energy lines, run summary chips (hero, arena, boon, contract, seed), more tips plus a lore line. Hero run cycle and progress bar kept.
- **Enemy health bars + floating damage numbers** (`combatReadout.ts`, fed by `dmg` / `eid` on the sim's existing hit impacts): bars always for elites and bosses, for ordinary enemies only while hurt and recently hit (fade after 2.6 s), with a white drain chunk; pooled numbers (36 max, priority eviction), white = hit, gold = heavy hit, steel = reduced by a shield, larger on kills, rapid hits on one enemy add up.
- **Level-up / evolution**: hover lift, rarity glow (rare blue, epic gold), clearer focus ring. **Co-op bug fixed**: the screen kept the previous pick's exit state when the second fighter's offer appeared (cards unclickable, canvas stole the clicks, "window doesn't show"); offers now remount per chooser / card set.
- **Title Kai**: spotlight cone, floor rays, pulsing fracture rings, orbiting cyan and gold shards, rising embers and a slow flare pass of the real idle sprite.
- **Settings**: rows as plates with a gold active edge, gradient title, section rules, clearer toggles.

## ImageGen
No new generation in this batch. The loading screen reuses the four arena scenes from B29.1 (`art/menu-b29-1/`, `public/art/menu/`); the rest is CSS and sprite layering.

## Verified
`tsc`, `npm run build`, full vitest (772 pass; new `b30-readout.test.ts` for the damage feed and a co-op test for two fighters levelling together), e2e `nexus`, `b22-coop`, `b22-hud`. Live captures at both sizes of: title, settings, loading, combat with bars and numbers (dense swarm + elite), boss, pause, level-up; 0 console errors, 0 failed requests. Live local co-op: both fighters picked in turn and the run resumed.

## Not verified
Motion at real speed; the heavy-swarm numbers cap was reasoned (36 pooled numbers), not stress-profiled; brighter arenas for the recipe plate (only Gloam captured); online co-op level-up (only the local couch flow was run live); boss bar above the boss itself is drawn but overlaps the HUD boss bar region in some positions.

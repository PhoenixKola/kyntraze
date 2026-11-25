# B29 status: premium menu UI overhaul (+ Fracture Nexus living upgrades)

Brief: `prompts/kyntraze-b29-premium-menu-ui-overhaul.md`. Review screenshots: `docs/project/b29-review/` (960x540 and 640x360).

## What was redesigned
- **Shared menu kit** (`src/app/ui/b29/Kit.tsx`, `src/app/b29.css`): Frame (dimmed living backdrop, header, hint bar, Esc / pad B back), Panel, Card (selected / locked states), Cta, Chip, Tabs, Meter. Every screen below is built from it.
- **Title**: one dominant CTA into the hub, quiet secondaries, one lower info strip.
- **Fracture Nexus**: deploy plate tied to the selected hero / mode / arena, hero-coloured gate and beam, readable rail; attunement tiers from unlocks / mastery / story / best run (aurora, runes, beacons, motes).
- **Hero Select**: roster, spotlight (art, role, identity meters, transformation status), run setup panel, one DEPLOY.
- **Mode Select + co-op**: mode list, detail panel (solo / local / online chips, length, rewards), Solo | Local Co-op | Online Co-op selector with partner picker.
- **Arena Select**: list + framed preview detail, meters, confirm CTA.
- **Archives / Armory / Contracts / Records / Codex / Mastery**: tabs, fixed headers with scrolling regions, mastery path list + milestone timeline, locked / equipped states, marks always visible.
- **Online lobby**: connect / create-join / room steps, big code entry, partner ready slots, waiting / error states.
- **Controller**: the pad root finder now recognises every menu screen (it only knew four, so the hub, mode, archives and lobby had no D-pad control).

## Nexus add-ons
Living heroes (real transparent game sprites on the plinths, idle loop, per-hero energy, per-hero select animation; base form), animated rift gate (counter-rotating vortex layers, core, halo, god-rays, orbiting fragments), cinematic deploy push-through-the-portal then fade into loading (short flash under reduced motion), synthesized hub audio (`src/game/audio/hubAudio.ts`: pad, bells, wind, portal hum, hero select sounds, deploy whoosh, follows mute / volume).

## ImageGen
`art/fx-nexus/`: swirl, rays, shards (alpha webp in `public/art/nexus/`), plus the earlier backdrop / gate / plinths. Screens otherwise reuse existing art (arena cards, mode emblems, crests); no text baked into any art.

## Verified
Typecheck, build, full vitest (765 pass), e2e `nexus`, `b22-ui`, `b22-modes`, `b22-coop` (modes and coop pass when run alone; they time out on slow loads when run two at a time). Headless sweep of every redesigned screen at both sizes: 0 overflow, 0 console errors, screenshots viewed. Controller (simulated pad): D-pad focus + B back on Hero, Mode, Online, Armory, Archives, Contracts; A / D-pad on title and hub.

## Not verified / owner review
Audio never heard; motion at real speed; a real controller; lobby room view (needs a live server); other e2e specs not re-run in full; hero sprites are base form only; the deploy dive is a 2D zoom, not a real camera move into the arena; identity meters on Hero Select are presentation numbers.

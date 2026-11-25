# Fracture Nexus hub status

Brief: `prompts/kyntraze-fracture-nexus-hub.md`.

## What it is
The front door after the title: ENTER THE FRACTURE now opens **Fracture Nexus** (`src/app/ui/NexusHub.tsx`, `src/app/nexus.css`). A layered, drifting sanctuary (generated backdrop, floating-ruin layer with pointer parallax and slow drift, light sweep, 30 drifting motes), the central **rift gate** with pulsing rings that DEPLOYs the selected runner with the saved mode and arena, four **hero shrines** (Kai, Ren, Sora, Vex: their key art on distinct accent plinths, aura flicker, a check on the selected one, forms-unlocked count), a focus panel for the selected hero, and a navigation rail.
Progression-aware: gate glow and backdrop brightness scale with how many hero forms are unlocked (`--energy`).

## Navigation
DEPLOY (gate) starts a run. HEROES -> hero select (runner, arena, seed). MODES & CO-OP -> mode select. ONLINE CO-OP -> online lobby. ARMORY / CONTRACTS -> progression tabs. ARCHIVES -> Horizons archive. RECORDS -> progression Archives tab (marks, best runs). SETTINGS -> settings panel. Every screen opened from the hub returns to it with BACK / Esc; returning home from a run lands in the hub. Mouse, Tab, Up/Down (rail), Left/Right (change hero), Enter, Esc, and the existing controller D-pad / A / B nav.
Transitions: hub fades/scales in, rail and shrines stagger in, screen swaps use the existing 110 ms leave. Reduced Effects (and `prefers-reduced-motion`) disable the motion layers.

## ImageGen (Codex bridge, `art/fx-nexus/`, prompts + provenance kept)
`bg` (hall backdrop), `mid` (floating ruins, black keyed to alpha), `gate` (rift gate altar, keyed), `plinth` (four hero plinths, cut into four, keyed). Published as webp in `public/art/nexus/` (about 400 KB).

## Verified
Typecheck, build, `e2e/nexus.spec.ts` (hub flow at 960x540 and 640x360: all destinations present, hero select, armory round trip, hero pick, no horizontal overflow, deploy reaches the HUD, 0 console errors). Screenshots reviewed at both sizes. Existing e2e specs were updated to go through the hub (`nexus-heroes`) but were not re-run in full.

## Owner review only
Motion feel at real speed, controller feel, audio (no hub music or sound hooks added beyond the existing UI sounds), hero shrines use existing key art (not new sprites), no hero idle sprite animation beyond the CSS aura/lift.

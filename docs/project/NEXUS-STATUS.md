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

## B29 pass (title, hub polish, living hub)
- **Title:** one dominant pulsing CTA ("Enter the Fracture", subtitle says it opens the Nexus), two quiet secondaries, one lower strip (marks + personal best left, controls centre, Shattered Horizons right). `TitleScreen.tsx`, `b29-title.css`.
- **Hub polish:** gate label is now a deploy plate that shows the selected runner (name in their colour), mode and arena; the gate ring, plate glow and a summoning beam from the selected plinth follow the hero accent; rail/plinth spacing fixed at 640x360.
- **Living showcases:** the rectangular key art is gone. Each plinth now carries the real transparent south-facing game sprite (Idle strip, crisp pixelated, breathing scale) with a per-hero energy effect (Kai embers, Ren crimson sparks, Sora orbiting crystal, Vex void flickers). Selecting a hero plays that hero's BasicPunch clip plus a distinct burst (flare / blade-star / ring / void ripple) and lifts the sprite.
- **Cinematic gate:** ImageGen vortex (two counter-rotating layers, pulsing core, halo), god-rays, eight carved fragments (six orbit with depth), all keyed to alpha. DEPLOY pushes the whole sanctuary through the gate (about 1 s, scale + blur), floods white-teal, then an App-level veil fades from white into the arena loading; reduced motion / Reduced Effects uses a 0.2 s flash instead.
- **Atmosphere:** `src/game/audio/hubAudio.ts`, fully synthesized at runtime (no sample files): drifting four-chord pad, shimmer bells through an echo, wind, stone ticks, a portal hum that swells on gate hover, per-hero select sounds, select/hover blips, deploy whoosh. Starts with the hub (title theme stops), stops on leaving; uses the shared music/sfx/ui buses so mute and volume sliders apply.
- **Evolution:** an attunement tier 0-3 (unlocked forms, mastery milestones, finished story chapters, a recorded run) adds an aurora (t1), floor runes (t2), lit beacons and more motes (t3); the focus panel shows it.
- **ImageGen (art/fx-nexus, prompts + provenance):** swirl, rays, shards (published as alpha webp in public/art/nexus/).
- **Verified:** typecheck, e2e/nexus.spec.ts (both sizes), screenshots of title/hub/selection/dive at 960x540 and 640x360 reviewed, deploy sequence sampled (flash 0->1, veil 1->0), 0 console errors, deploy reaches the HUD.
- **Not verified:** the audio has not been heard (synthesized, levels are guesses); motion feel at real speed; controller feel; Kai/Ren/Sora/Vex shown in base form only (no per-form sprites); the dive is a 2D push, not a true camera move into the arena.

# KYNTRAZE UI art direction (B14) - "Relic Plate"

Production reference for B14 and later batches. Kit lives in `public/ui/kit/` (manifest `kit.json`, sources `art/ui/kit/`, rebuild with `python art/ui/kit/build_kit.py`).

## 1. Direction decision
Two ImageGen studies (`art/ui/kit/studies/dirA.png`, `dirB.png`, text-free HUD + menu material sheets):
- **A - Relic Plate**: dark gunmetal plates, chamfered corners, worn bright edges, brass inlay rails, teal slot lights, one fracture crack per piece.
- **B - Shard Glass**: crystalline shard frames, hairline cyan edges, diagonal slashes.

**Chosen: A.** Reasons: (1) readability - quiet dark plates keep text and bars the focus; B's glow edges and spikes compete with the arena and with Kai's silver/teal VFX at 640x360; (2) identity - machined relic metal + brass matches the existing ink/amber/teal UI, the Warden/Seraph art and the upgrade icons, while B reads as generic "fantasy glass"; (3) feasibility - A has uniform straight edges so CSS `border-image` nine-slice stays crisp; B's protruding shards cannot be stretched without warping. B's one good idea (a crack with light inside) is kept as the single "fracture" accent per piece and as the sigil's centre line.

## 2. Material and colour roles
| Role | Token | Value |
|---|---|---|
| Foundation ink | `--k-ink` | `#0a1017` |
| Panel well (behind text) | `--k-well` | `#121a22` (tile `tex-panel.webp` overlay, 85% opacity) |
| Steel frame | `--k-steel` | `#59656e` (art only) |
| Plate (raised) | `--k-plate` | `#2b353d` |
| Brass / primary / Kai | `--k-brass` / `--k-brass-hi` | `#e0a24a` / `#ffd493` |
| System / navigation / XP | `--k-teal` / `--k-teal-hi` | `#4fd8d2` / `#9cf3ee` |
| Danger / HP | `--k-danger` / `--k-hp` | `#d8434f` / `#ff5d5d` |
| Warden | `--k-ember` | `#ff7a3c` (crimson trim) |
| Seraph | `--k-seraph` | `#a98aff` |
| Stillfire | `--k-silver` | `#cfe6ff` |
| Form I / II | `--k-f1` / `--k-f2` | `#ff8a3c` / `#ffd23a` |
| Rarity | `--k-common` / `--k-rare` / `--k-epic` | `#4fd8d2` / `#e0a24a` / `#c58bff` |
| Text | `--k-text` / `--k-dim` / `--k-mute` | `#eef4f3` / `#a3b6c0` / `#7a909c` |
Rules: teal = system/nav, brass = primary action and selection, red/magenta only for real danger, silver only for Stillfire. Never more than one accent colour per component. No big circular blooms; glow is a 1-2px edge light.

## 3. Frame shapes, corners, bevels
- Corner cut = 45 degree chamfer, **6u** on HUD plates, **10u** on modals/cards (u = 1px at 540p; art is authored at 2x).
- Frame thickness: HUD `hud-frame` 20 art-px (10u at 960), modal `panel-frame` 33u corner / 14u edge, cards 31u corner.
- Light from top-left: top/left edges bright, bottom/right dark. Never rotate or flip pieces that carry the crack (corner pieces may be mirrored only where noted).
- One fracture crack per frame, on the top-right corner of modals/buttons; never repeated along edges.
- Asymmetry is allowed only in corner plates (screws vs crack); straight edges stay featureless so they can stretch.

## 4. Kit assets (all `public/ui/kit/`, see `kit.json` for sizes, slices, channel/socket rects)
Nine-slice via `border-image: url(..) <slice> fill? / <width> stretch`. Art is **2x** of use size: set `border-width` = slice * 0.5 * `--u`... i.e. `border-image-width: calc(slice * .5 * var(--u))`.
- `panel-frame.webp` slice 66 (all) - modals, results, pause, settings. Hollow centre: put `tex-panel.webp` (256 tile, `background-size: calc(128*var(--u))`) beneath.
- `hud-frame.webp` slice 40 - clock, health block, cards in HUD.
- `btn-primary|secondary|disabled|danger.webp` 212x80, slice `0 66 0 66` (horizontal only), button height 40-44u. Hover = `filter: brightness(1.12)`; pressed = `brightness(.9) translateY(1px)`.
- `bar-hp|bar-xp|bar-drive.webp` slice `0 73|63|67 0 ...`, channel rect in manifest (fills are CSS elements inside the channel).
- `boss-warden|boss-seraph.webp` slice `0 122/136 0 151`, socket rect = emblem placement (`public/art/bosses/fx/emblem-*.png`), channel rect = HP track.
- `slot-frame.webp` 99x97 fixed (46u slot at 960), `crest-base|f1|f2|f3.webp` 100x97 medallions for portrait corner / form tile.
- `map-corner.webp` (mirror via `scale(-1,1)` etc.), `map-strip.webp` slice `0 38 0 38`, `tab.webp`, `divider.webp`, `chev-l|r.webp` (focus markers), `logo-mark.webp` (full-colour sigil), `logo-mono.png` (mask-image).
- `card-common|rare|epic.webp` slice 62 - rarity frames over existing card art; `tex-panel`, `tex-plate` seamless tiles.
Total kit ~166 KB (webp).

## 5. Typography
No licensed display font is bundled in the repo or `node_modules`, and nothing was downloaded. Keep the existing stack: `Bahnschrift, "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif` (Bahnschrift is condensed-industrial on Windows; others fall back). If the owner wants a bundled face, an OFL font (e.g. Rajdhani / Barlow Condensed) can be self-hosted later - a licence decision, not done here.
Scale (in u, floors in px): display 40u/900 (titles), section 22-26u/900, data 14-18u/800 tabular-nums, body 12u/600 (min 10px), utility 10u/800 (min 9px, tracking <= .12em). Reserve all-caps for labels <= 14 chars; body copy sentence case. Numerals always `font-variant-numeric: tabular-nums`.

## 6. Sizing and safe zones
- HUD margin `--pad` 14u (min 10px). 960x540: u=1; 640x360: u=.667 with px floors above.
- Corners: top-left health block <= 270u x 74u; top-centre clock <= 190u wide; top-right pause 46u + minimap <= 176u wide; bottom-centre slots row.
- Keep the central 60% of the arena clear; boss bar sits under the clock (top 86u) <= 420u wide.
- 640x360: use compact variants (hide secondary labels, 1-line plates) rather than shrinking text below the floors.

## 7. Text over art
Text sits on `--k-well` plates (>= 85% opaque) or on art with a 2px dark outline/shadow; contrast >= 4.5:1 for body, 3:1 for large/UI. Never put text over the crack/light slots. Never bake text or numbers into art; information is never colour-only (use shape/icon/label too).

## 8. Motion and focus
Tokens: `--m-fast: 110ms`, `--m-base: 170ms`, `--m-slow: 260ms`, `--m-reward: 600ms`; easing `cubic-bezier(.2,.8,.25,1)`. Hover/press 110ms, screen in 170ms, modal in 200ms, boss-bar arrival 260ms. No perpetual loops except low-HP and a slow single sweep on selected edges; all loops stop under `prefers-reduced-motion` and in-game Reduced Effects. Focus = 2px brass outline + chevron markers (`chev-l/r`) on menus; pad focus stronger (3px + 6px soft ring). No camera motion or full-screen flash in UI.

## 9. Compositing and scaling
Illustrated kit art uses default smoothing (`image-rendering: auto`), never `pixelated`; pixel-art sprites (Kai, enemies) keep `pixelated`. Never scale an ornate full panel - only nine-slice/3-slice pieces. Position fills inside the manifest `channel` rects. Round dimensions to whole device px where possible. Gloss/gradients come from the art, not CSS.

## 10. Do / Don't
Do: one accent per component, plates behind text, quiet metal, brass for primary actions, mirror corner pieces only where the crack is acceptable. Don't: glow rings around boxes, rainbow outlines, stacked card grids with identical chrome, text-on-texture without a well, stretching `logo-mark`, re-generating approved icons/portraits/arenas.

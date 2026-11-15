# KYNTRAZE Visual Art Bible (short)

Derived from what actually ships in B05–B07 (Kai, the Gloam Circuit floor, the HUD/menus, the ability VFX, the enemy family). It sets *what the game looks like*; how characters are rigged and animated lives in `reusable-2d-character-animation-bible.md` and is not repeated here. Apply it to new art; do not redo approved work to match it.

## 1. Read order on screen (what must win a glance)
1. Kai and dangerous things (enemy telegraphs, enemy bolts) 2. Kai's own VFX 3. enemies 4. pickups 5. floor. If a change makes the floor or an effect outrank 1–2, it is wrong.

## 2. Silhouette and outline
- Characters: clean dark outline ≈ 3–4 px at authored size (2x), flat two/three-step cel shading, hard edges, no blur or painterly noise. Authored at 2x and shown at 0.5 (Kai, enemies), nearest-neighbour presentation (`pixelArt`).
- Every character is identified by silhouette alone at gameplay size: Kai = upright human with a gold sash; pursuer = hunched triangle; flanker = thin diagonal with swept crest; bruiser = wide block, tiny head; ranged = tall spindle with orbiting shards.
- Size ladder (display px tall): flanker 62, pursuer 68, ranged 85, Kai ~80, bruiser 103. Collision radius is smaller than the art (17/15/26/16) – the art may overlap, the hit circle is what the player is judged on.

## 3. Character vs floor
- Floor is dark navy steel (`#060b13`–`#0c1522` family) with teal inlay lanes, darkened by a 0.46 overlay + vignette so nothing on it is brighter than a mid value.
- Kai gets a thin pale-cyan rim (Glow `#d8f6ff`) and a hero halo/contact shadow. Enemies are dark gunmetal, so they carry a **baked 1–2 px pale-rose rim** (no per-enemy shader) and a pooled soft contact shadow sized by radius. Never fix legibility by making the floor black or adding glow everywhere.

## 4. Palette
| Role | Colours |
|---|---|
| Kai Base | skin/hair dark, gold sash accent; effects cyan-white `#d8f6ff`, teal `#5fd8dc` |
| Kai Form I (Flarebound) | solar gold/orange `#ffb347`/`#f1b66f`; effects have separate recoloured sprites, never a runtime tint |
| Hostile family (enemies, telegraphs, bolts) | gunmetal/obsidian shells, crimson-magenta energy `#ff3a6e`/`#ff3050`, violet accent `#c13bff` (ranged), bone-white edges. **No orange/gold on enemies** (gold is Kai's) |
| UI | `--teal` interactive, `--amber` emphasis, `--hp` red health; panels near-black navy |

## 5. Light and contact
Rim light on characters, contact shadows under everything that stands (ellipse, y offset ≈ 0.6 × radius), floor light pool under Kai. Enemies never cast light on the floor except attack markers.

## 6. Arena detail
Eight 128 px ImageGen plates baked into one 2200×1600 canvas (plain plates weighted high, teal lanes sparingly), obstacles with front/top face + teal edge. Detail stays low-contrast; interactive/danger information is carried by colour (crimson) and motion, not by floor texture.

## 7. VFX readability and blend modes
- Normal blend for anything that has an outline or must occlude (sprites, telegraphs, debris, enemy bolts, death bursts). ADD only for small glows/flares. SCREEN for long streaks (a long ADD sprite clipped against a rotating ADD sprite in Phaser 4's batcher – the Nova Bloom trail bug).
- Hostile markers are **crimson and always shaped**: ring (area), line + chevron (direction/range), crystal bolt. Kai effects are cyan/solar and never crimson. A marker's progress must equal the sim timeline (ring fills to its edge exactly at impact).
- Pooled sprites only (`FxPool`, ghost pool, telegraph pool); caps: 150 Kai fx, 70 enemy fx, 24 death ghosts.
- Reduced-effects setting removes flashes/shake/extra sparks, never telegraphs.

## 8. UI / HUD
Design unit `--u = 100dvh/540` with legibility floors, dark translucent panels, thin teal/amber borders, Bahnschrift-style sans, keycap + pad glyph hints. HUD never covers the centre; ability slots bottom-centre, status top-left, clock top-centre.

## 9. Icons and pickups
Monochrome white pixel glyphs with one inner shade (`#9fb0c8`), shown ≥ 24 px, ImageGen sheets keyed on magenta. XP shards mint/teal.

## 10. ImageGen standards (all new art)
- Bridge: `scripts/gen-image.py` (audited Codex ImageGen bridge, `gpt-6.1-sol`); prompt file + exact source PNG + `PROVENANCE.md` stay in `art/<area>/source/`.
- Always pass a reference (Kai frame) for style, key on flat `#ff00ff`, ask for fixed cell grids, state palette bans (no orange on enemies) and ground-line/scale rules in the prompt.
- Extraction is scripted and reproducible (flood-fill key from the cell border so pink glows survive, anchor on one ground line, downscale with LANCZOS, bake rim). No Pillow-drawn placeholders as final art.
- Review checklist before accepting: (1) silhouette distinct from the others at 1×; (2) on the real floor at 960×540 and 640×360, next to Kai Base and Form I; (3) no magenta fringe or holes (inspect at 4×); (4) frames share a ground line and scale; (5) telegraph/bolt readable over a crowd; (6) owner review of the live game, not only the sheet.

## 11. Elites and bosses (B08 additions, from what actually shipped)
- **Hierarchy by size and ground footprint:** mobs 62-103 px display height, elites 72-85, Warden ~175, Seraph ~140 (hovers). A boss outranks mobs by size and by its HUD bar, never by glow. Kai stays on top of every enemy sprite (depth 10).
- **Hostile areas are ground-plane shapes** centred on the owner's feet or a marked ground point: circle (ring that fills to its edge exactly at impact), true 120 deg sector (cone), lane (width = the charger's footprint), expanding ring with *marked gaps* (chevrons in the safe lanes), sigil (destination marker, no damage). Never a flat ellipse, never a decorative glow in place of a shape. Edge of the drawing == edge of the hit test (+ Kai's 6 px foot disc, see B08-DESIGN.md).
- **Telegraph length:** >= 0.7 s for a new shape, >= 0.5 s for a repeat, aim locks for the last 45 % where an attack tracks. Phase 2 may shorten windups by <= 10 %, never below ~0.75 s.
- **Colour:** Warden = obsidian + crimson crystal, bone edges; Seraph = violet-white anomaly (its bolts are violet-white with a dark outline); Cantor orbs magenta; Aegis shield bone/crimson. Gold/orange stays Kai's; cyan stays Kai's.
- **Boss sheets** are 16-frame ImageGen pose flipbooks repacked to a 4x4 grid (< 4096 px) by `scripts/repack-boss-sheets.py`; they are *not* rigs. Windup/strike/recover/hurt/phase/death each have their own authored frame; hit feedback on a large body is a short additive brighten over the same frame, never a white fill.
- **Boss HUD:** nameplate + bar top-centre under the clock (emblem, name, phase, SHIELDED / EXPOSED chip, 50 % phase tick, delayed damage trail); WARNING banner during the arrival, clear of Kai's head. Reduced Effects removes shake, additive flashes and the hit brighten, never telegraphs.

## 12. Arenas and environments (B09)
- **One arena = one palette family.** The Gloam Circuit: navy steel `#060b13-#0c1522`, teal inlay `#3fa8b2`, amber only on trim. The Ashen Reliquary: warm charcoal stone `#13110f-#221e1a`, verdigris inlay `#2f6b5e/#4f8f7c`, bone only on landmarks. Hostile red/violet and Kai's cyan/gold must read on every floor: when adding an arena, check Kai Base, Form I, a bruiser and the Warden's telegraph on it at 640x360 before accepting any art.
- **Floor is always one value tier below characters:** nothing on the floor is brighter than a mid value; saturated/bright accents are reserved for hazards, pickups, heroes and telegraphs. Landmark decals (core glyph, sigil) are drawn at 70 % so the spawn point never competes with Kai. Floor tiles are seamless under flips and 90 deg rotations (no directional cast shadows in a tile).
- **Structure:** floor tiles + decals (cracks, scorch, rubble, bones, landmark) + rim wall art are baked once per arena into one canvas; solid props are low-relief sprites (display height <= footprint depth + 60 px) drawn *below* characters and telegraphs, so nothing pretends to occlude Kai. **A solid prop's collision rect equals its footprint** (`PROP_FOOTPRINTS`, tested against the art manifests); decor never collides. The wall art covers the arena `inset` px, and collision keeps characters that far in.
- **Texel scale:** props/boss/enemy art authored at 2x and shown at 0.5; floor tiles, rim and decals are authored at display density (scale per manifest entry); always nearest-neighbour.
- **Hazards:** crimson + bone-white, always a *shape* (stripe lane, ring) that fills/marches during a >= 1.4 s warning, an active window, then a fade; the drawn edge is the hit edge (+ Kai's 6 px foot disc); no strobing (< 3 Hz), never gold/cyan/teal. Lane strips tile along their length and are rotated for vertical lanes.
- **Ambience:** <= 24 motes in 3 parallax layers (alpha <= 0.4, <= 6 px) and one slow fog layer at 0.2 alpha, normal blend only (never ADD: the batcher clipped long ADD sprites in B05). Reduced Effects removes motes and fog.
- **Kai in a crowd:** thin dark-edged ring under Kai (above enemies, below him; brighter while i-frames run, slow pulse at low health), a soft dark cut-out behind him that grows with the number of bodies within 70 px, no alpha dimming on hit (a 0.1 s white flash instead).

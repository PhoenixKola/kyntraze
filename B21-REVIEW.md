# B21 review pack (owner)

Clips: `art/review/b21/video/*.mp4` (960x540, recorded with Playwright at the real cadence of a **software-rendered** Chromium; `clips.json` has the in-page rAF rate per second: 31-55 fps, **not a GPU number**). I did not watch them play; I checked frames extracted from them. Stills used during development were from the same route.

## Clips (what each shows, all `?qa=1` dev route, seed 11, 24 mobs of all six kinds)
| File | Hero / form / arena | Action script (all inputs real keys) |
|---|---|---|
| `ren_ascendant_gloam` | Ren Crimson Ascendant, Gloam | run 4 ways, dash, Q, E, R |
| `sora_sovereign_ashen` | Sora Azure Sovereign, Ashen | same, hold-E Lance |
| `kai_cometheart_gloam` / `kai_stillfire_ashen` / `kai_flarebound_gloam` | Kai forms 2 / 3 / 1 | same |
| `ren_base_ashen` | Ren base (no aura, baseline motion signature) | same |
| `sora_reduced_effects_gloam` | Sora Sovereign with **Reduced Effects on** (QA save settings) | same |
| `ren_evolved_late_build_ashen` | Ren Ascendant with a late build (impact 5, tempo 4, reach 3, pulse 3, afterglow/twinbloom, mods set to match) | same |

Forms/mods in the clips are set through the QA state hook (never presented as a human run).

## Before / after (8 high-impact items)
| # | Item | Before (B20) | After (B21) | Where |
|---|---|---|---|---|
| 1 | Ren/Sora transformed look | thick body stroke only | stroke kept as rim + layered ImageGen flipbook aura that leans, tightens on charge, flares on release, ribbon wake when moving | `auraView.ts`, `public/art/fx/b21/aura/` |
| 2 | Kai forms | form effects only | same living-aura layer in gold flame / gold crawling lightning / silver mist (restrained) | `EntityRenderer.kaiForm` |
| 3 | Body weight (all 8 states, all facings) | sprite slides with clip | spring lean into the run, start/stop squash, dash stretch, cast recoil, hurt stagger, breathing; per-state signatures (Cometheart hardest lean, Stillfire floats) | `bodyMotion.ts` |
| 4 | Upgraded abilities | same art at every build | tier arcs, pierce sparks, afterburn trail, echo ring at the real blast radius, only for earned stacks | `buildEvolution.ts`, `evoPlan.ts` |
| 5 | Heavy moments | none | rare anime impact frame (<=1 per 1.4 s, none in Reduced Effects) + budgeted hit-stop + coloured floor light | `evoPlan.ts`, `impactDirector.ts`, `lightPlan.ts` |
| 6 | Aegis | generic burst | ImageGen shield crack + shatter shards + lowered-guard glyph exactly when the sim opens the punish window; blocked hits are a shield jolt | `enemyRenderer.ts` |
| 7 | Warden / Seraph | flash on hit | ImageGen crack overlays by real HP/phase, falling slabs/crystal shards when a level is crossed, ember leak, Rupture/Sweep/Rush body acting, slump in recovery, Seraph core crack | `bossRenderer.ts` |
| 8 | Floors | one scorch art | material-specific ImageGen decals (scored metal vs cracked charcoal + verdigris), beam lanes, capped, fade | `arenaMarkPlan.ts` |

## Owner review steps
1. `npm run dev`, open `http://127.0.0.1:5173/?qa=1&hero=ren&ascend=1` (also `hero=sora`; `?qa=1&form3=1` for Kai forms). Press **F** to transform, then move, dash, Q/E/R. Watch for: aura presence without hiding the face/fists; lean feels weighty not floaty; impact frames rare and brief.
2. Same with Settings > **Reduced Effects**: frames, hit-stop and extra layers must vanish while auras, telegraphs and hit confirmation remain.
3. `?qa=1&encounter=warden` (Gloam) and `encounter=seraph` (Ashen): hit the boss down through 75/40% and phase 2 and look at the damage levels.
4. Stand near an Aegis and break its guard: the crack/shards should coincide with the open punish window.
5. Desktop: `npm run desktop:dev`, or install `release\KYNTRAZE-FRACTURE-RUSH-Setup-0.21.0.exe` (unsigned).

## What I did not do
No new Blender poses (motion is runtime springs over the existing sheets), no new SFX/audio, no GPU/FPS measurement, no controller test, no human runs. See `B21-STATUS.md`.

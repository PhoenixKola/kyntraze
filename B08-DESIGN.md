# B08 encounter design matrix (elites + two bosses)

Design numbers are **starting points**, tuned only against real play (see B08-STATUS.md for what was actually played). The full 15-18 min survival loop does not exist until B11; encounter times below are provisional and every encounter can be jumped to with the QA flags at the bottom.

## Ground contract (B07.1, applies to every hostile area)
- A hostile area lives on the **ground plane**. Its centre is the owner's *feet* (`y + radius*0.6`) or an explicit ground point. Kai's ground point is his *feet* (`p.y + 24`, `KAI_GROUND_DY`).
- Visible edge = the drawn ring/cone edge. Damage iff Kai's feet disc (`FOOT_RADIUS = 6`, roughly the visible shoe width) overlaps the area: `dist(feet, centre) <= R + FOOT_RADIUS` (cones add the same slack as an angle). Kai's 17 px *body* radius is not added. Dash i-frames (0.25 s) and post-hit i-frames (0.65 s) are real dodges.
- Contact damage (B07.1): body contact is a threat only in `move` and `recover`. It is suppressed in `windup` (the telegraphed attack is the threat) and in non-contact `strike` (slam / shot already resolved). Lunge/dash/charge strikes deal the attack's own damage on contact, once (i-frames).

## Difficulty phase table (tuning surface: `src/content/encounters.ts`)
| Band (s) | Newly introduced | Pressure intent | Safe tuning levers |
|---|---|---|---|
| 0-70 | Shardwalker lunge, Rift Stalker (7 s) | learn move / dash / telegraph | `ENEMIES.*.weight`, spawn interval |
| 70-150 | Shard Channeler bolts | learn sidestepping a line | ranged cap, cooldown |
| 150-260 | Breaker Sentinel slam | learn ring edges | bruiser cap, windup |
| 260-330 | Rift Cantor (rally + fan) | learn target priority | cantor weight/cap, aura radius |
| 330-480 | **Aegis Shardbearer** elite (shield, ram) | learn flanking / area ability | aegis cap, shield arc/reduction |
| 480 | **Boss A: Fracture Warden** | spatial denial, punish windows | boss HP, windup scale, rupture count |
| 480-690 | mobs capped at 40 while a boss lives | breathing room | `BOSS_MOB_CAP` |
| 690 | **Boss B: Null Seraph** | projectile weaving, repositioning | boss HP, volley width, ring gaps |
Rule: never two *new* mechanics in the same encounter; a boss never spawns while the other lives; elites do not spawn during a boss.
(Provisional: later batches B10/B11 re-time these inside a 15-18 min run.)

## Elites
| | **Aegis Shardbearer** (`aegis`) | **Rift Cantor** (`cantor`) |
|---|---|---|
| Role | frontal-shield bruiser: changes *where* you stand | support caster: changes *what you kill first* |
| Silhouette | wide wedge with a big crystal plate held forward, gold-free, crimson-edged | thin hovering robed figure with a floating halo ring and three orbiting shard-prongs |
| Size / HP / speed | r 22, 220 HP, 52 | r 18, 90 HP, 70 (hovers) |
| Mechanic | Kai's single-target damage (auto shots, Fracture Lance) from inside the front arc (+-65 deg) is cut by 80 %. Q Impact and Nova Bloom (area) ignore the shield. Shield is DOWN while recovering | Rally aura r 190: non-boss enemies inside move x1.3 and recover attacks x1.25 faster; aura ring drawn on the floor |
| Attack | **Ram**: braces 0.75 s (lane telegraph), dashes 0.40 s at 380 px/s, recovers 1.0 s shield down (punish). dmg 20. cooldown 3.0 | **Resonance Fan**: 0.9 s windup, 3 slow orbs +-16 deg, 175 px/s, dmg 10, cd 3.6 |
| Counters | flank from behind, dash past, area abilities, hit in recovery | burst it (low HP), break line of sight, weave the fan |
| Reward | 10 XP orb | 8 XP orb + aura ends |
| Audio | brace shimmer, ram whoosh, shield clang (block), death_heavy | charge hum, orb release, aura-off |
| Intro | 330 s, cap 1 then 2 after 540 s | 260 s, cap 1 then 2 after 420 s |

## Bosses
| | **Boss A: The Fracture Warden** (`warden`) | **Boss B: The Null Seraph** (`seraph`) |
|---|---|---|
| Identity | heavy obsidian-and-crimson crystalline guardian; weight, anticipation, space denial | slender hovering violet-white anomaly with a cracked halo and floating wing-shards; elegance, pressure from range |
| Size / HP / speed | r 44, 1600 HP, 42 px/s | r 28 (hurt circle), 1100 HP, 95 px/s hover-strafe |
| Engagement | 60-240 px | 220-380 px |
| Intro | walks in from the edge, 2.4 s roar, invulnerable; HUD WARNING + name | falls in as a vertical light, 2.0 s unfurl, invulnerable |
| **Attack 1** | **Rupture Chain** (area denial): fist raised 0.7 s; 5 ruptures (r 54, dmg 22) march toward Kai's spot at cast time, ring telegraph visible from the start, bursts at 0.90 s + 0.16 s each; recover 0.9 s | **Prism Volley** (targeted): 0.85 s windup (aim tracks, locks last 45 %), 5 bolts, 13 deg apart, 250 px/s, r 8, dmg 12 |
| **Attack 2** | **Cleaving Sweep** (directional): 1.0 s windup, 120 deg cone R 170, dmg 30, 0.22 strike, **1.4 s exposed recovery (+35 % damage taken)** | **Phase Blink** (reposition): destination sigil 0.55 s, vanishes (intangible), reappears 230-300 px from Kai, fires a quick 3-bolt (0.45 s windup) |
| **Attack 3** | **Pillar Rush** (targeted charge): 0.9 s lane telegraph (w 70), charges 0.55 s at 520 px/s, dmg 26; hits wall / ends -> **1.5 s exposed** | **Orbit Bloom** (evadable pattern): 1.0 s windup, ring of 14 bolts with 3 marked gaps (51 deg each), 150 px/s, dmg 14 |
| **Phase 2 (< 50 % HP)** | 1.8 s roar, invulnerable, harmless shove ring, clears hazards. Rupture: 8 ruptures in two diverging lanes. Sweep: front cone then rear cone (two safe side wedges). Rush: two charges. Windups x0.9, cooldown 0.8 s | same transition. Volley 7 bolts, two staggered volleys. Blink leaves a delayed burst (r 60) behind. Orbit Bloom fires twice (rotated). New **Spiral Torrent**: 2.4 s, 3 rotating arms, 170 px/s |
| Safe regions | outside R, the two side wedges, behind the charge lane | between bolts, ring gaps, outside reach |
| Defeat | 3-frame collapse, shock ring (no damage), 12 XP orbs (96 XP) | dissolves into a prism burst, 10 XP orbs (80 XP) |
| Rewards | `bossesDefeated` in run state; no fabricated meta-progression | same |
| Audio | rupture warn/burst, sweep wind/hit, charge wind/impact, hurt, phase roar, death, intro warning | volley wind/fire, blink out/in, ring wind/burst, spiral loop-free pulses, hurt, phase, death |

## Telegraph rules for bosses
Crimson = Fracture hostile. Seraph bolts are violet-white with a dark outline (never gold/orange/cyan). Every damaging area is drawn at least as long as its minimum reaction window (>= 0.7 s for new shapes; 0.5 s for repeats), shaped exactly like the hit test, and dimmer than the strike flash. Boss projectiles and floor warnings outrank particles. Form I effects are gold/solar and cannot be confused with hostile crimson/violet.

## Asset contracts (shared by art, audio, sim, renderer)
Sheets: `public/art/bosses/<id>.png` (+ `<id>.json`), `<id>` in `warden`,`seraph`; elites reuse the B07 layout (`public/art/enemies/aegis|cantor.png`, 8 frames: move x4, windup, release, hurt, death). Boss sheets are **16 frames** in one horizontal strip, same anchor rules as B07 (`origin_px` = feet), authored at 2x and shown at 0.5, east-facing, west mirrored:

| idx | Warden | Seraph |
|---|---|---|
| 0-3 | walk/idle cycle | hover cycle |
| 4 / 5 | rupture windup (fist high) / release (slammed) | volley windup / release |
| 6 / 7 | sweep windup / sweep strike | blink-out (dissolving) / blink-in (reforming) |
| 8 / 9 | charge windup / charge strike | ring windup (arms spread, charging) / ring release |
| 10 | recover (exposed, core glowing) | recover |
| 11 | hurt | hurt |
| 12 | roar (phase change, intro) | phase unfurl (phase change, intro) |
| 13-15 | death 1-3 | death 1-3 |

Boss/elite FX (`public/art/bosses/fx/*.png`): `cone-warn` (sector, apex at left-centre, radius = width, 120 deg exactly), `cone-strike`, `rupture-burst`, `rupture-crater`, `prism-bolt`, `prism-hit`, `orb-bolt`, `blink-sigil`, `blink-flash`, `shock-ring`, `shield-block`, `aura-ring`, `boss-burst`, `warning-glyph`, `emblem-warden`, `emblem-seraph` (UI sigils, 128 px).
Audio (`public/audio/bosses/*.wav`, mono, -3 dBFS peak, synthesised): see `ENEMY_SOUNDS`-style list in `src/game/audio/abilityAudio.ts`.

## QA / reproduction (dev server only, never in a production build)
`/?qa=1&encounter=warden|seraph|aegis|cantor|mixed` starts a run already inside that encounter (the seed, saves and settings are untouched); `window.__KYNT_QA__.encounter(id)` does the same at any time. `&debug=hit` draws the damage boundaries and Kai's foot disc.

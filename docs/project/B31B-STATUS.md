# B31B Living Fractures: status

Baseline: B31A (`54bc914`). Done solo, no subagents. Pushed only after the owner's explicit request.

## What it is
An opt-in run rule ("Living Fractures") for **Classic, Endless and Fracture Expedition**. While it is on, optional world events appear during the run (about 2 to 4 per full-length run). Daily/Weekly Challenges, Boss Rush, Vex Trial and every Fracture Chronicles mission are excluded (`canLive`). With the rule off, `state.lf` does not exist and nothing runs.

## Event inventory
| Event | Discovery | Rules | Outcome / reward |
|---|---|---|---|
| Rift Portal | portal ring on the floor, toast, direction hint, minimap marker | stand in the ring 0.7 s to open; a marked zone (r 300) with a special guard (arena-specific, 8 enemies solo, scaled for a party). Leave the zone for 9 s and it collapses (guard dissolved) | clear the guard, then touch the shard within 50 s: relic (cap 2 per run), 30% heal, Rift Surge (+16% damage, 110 s) for every fighter who spent 6 s inside |
| Corrupted Shrine | two altars with the bargain names; a preview panel lists benefit, curse, duration and scope | stand on an altar 1.3 s to accept; walk away to decline (the shrine goes dark). No pause, no modal | benefit and curse are applied together for 45 to 90 s; seven bargains, each arena offers two distinct pairs |
| Fracture Cache | hidden: faint glints, vague minimap ping, revealed within 520 px | stay within 74 px for 1.1 s to attune. 45% are guarded: telegraphed sigils, then an ambush that must be defeated | crystals, heal, Drive; guarded: 3 crystals, charge and a 40 s +10% damage boon |
| Roaming Elite | announced with direction; elite marker, name and health bar | roams between clear waypoints, chases within 520 px, gives up if you are 1100 px away for 12 s (fleeing works), slips away at its deadline. Modifiers with distinct cues: Swift (ground pounce marks), Volatile (telegraphed death blast), Warded (pulsing ward ring) | 3 crystals, Elite Trophy (+14% damage 60 s), +25 Overdrive for fighters within 900 px |
| Containment | relay or beacon with a health bar | defend: hold the ring 55 s while waves converge on the relay; escort: the beacon travels only with a guard within 210 px. Raiders attack the relay until a fighter gets within 175 px of them. Abandoning it (no fighter within 430 px for 11 s) bleeds it | success only on timer-in-ring or arrival: Relay Surge for the party (+10% speed, 25% faster recharge, +8% damage, 60 s), heal, crystals |
| Celestial Echo | hero sigil (dragon, fox, phoenix, guardian) | Kai: 20 s Ember Gauntlet; Ren: catch three trapped spirit lights; Sora: weave falling lanes then reach the apex; Vex: break the ward-bearer before the oath-rings overwhelm you. Leaving the sigil for 4.5 s fails it | the participating runner's blessing for 80 s (distinct per hero) plus Drive and Overdrive energy. Other participants get an Echo Spark. No form is ever unlocked or replaced |

Arena variants (names from content): The Gloam Circuit (Conduit Rift, Breaker Shrine, Reactor Relay), The Ashen Reliquary (Ember Gate, Ashen Shrine, Pilgrim's Lantern escort), Aetherfall Citadel (Skygate, Gilded Shrine, Skybeacon escort), The Paradox Expanse (Mirror Tear, Mirror Shrine, Echo Relay). Each has its own enemy groups, ambush composition, elite pool, weights and art.

## Director and safety
Own stream `streamSeed(seed, 'living-fractures')`; simulation time only. First opportunity 140 to 195 s (Expedition 170 to 225, Endless 90 to 150), then 170 to 225 s apart (Endless 125 to 175). One live event at a time; no repeat of the last kind. Never spawns during a boss, within 14 s after one, while a scripted step runs, before a scripted step or the finale (`protectedFrom`), within 30 s of an Endless cycle end or its cycle boss, or while a relic/branch offer is open; every event's deadline is clamped to the next protected window. Sites are chosen by a flood-fill reachability check, clear of props and walls, outside the static lane/pylon hazard footprints, within the party tether, never on top of a fighter. Events draw their own hazards with their own owner id and clean up (enemies, hazards, effects) on expiry, failure and run end (`endLiving`).

## Reward balance and anti-inflation
Everything is timed (45 to 110 s) except relics (cap 2 per run, from the existing pool) and crystals/energy. Boons are read through hooks (`lfHooks.ts`) on damage dealt/taken, speed, XP, spawn pressure and enemy health instead of editing a fighter's stats, so an upgrade taken during a boon is never damaged when the boon ends. At most 4 live boons per fighter. Each event resolves once through a state machine (`st` is terminal), so duplicate grants are impossible. Persistent payout stays inside the existing ledger: Living Fractures runs keep Marks, unlock progress and mastery counters but never write the per-mode records (`B22RunResult.living`). **Numbers are first-pass, reasoned from the existing curves and not tuned by human play.**

## Modes and multiplayer
Solo, local co-op and online co-op share one event world. Ownership is positional and decided by the simulation: whoever stands on an altar owns that bargain (benefit on them; a "party" curse hits everyone and is labelled), rewards go to fighters who took part (6 s in a rift zone, 3 s in an echo, near the cache or elite), world scaling uses a party factor. Online: protocol version 2; `create` carries the `lf` flag (server ignores it for Boss Rush), `room` reports it, snapshots carry a per-player event view (relative slots, no RNG). Clients send only input; there is no event message to forge (`lf_claim` and similar are rejected as `bad_message`). Disconnects follow the existing grace rules; the event world is simulation state and keeps running. An old client is refused with an explicit update message. Living Fractures rooms are unranked.

## ImageGen provenance
Ten sheets through the audited Codex bridge (`art/fractures/run.py`, prompts `*-prompt.txt`, `PROVENANCE.md`), referencing existing arena props for scale and style: portals, shrines, caches, cache states, relays, beacons, hero echo sigils, emblems, marks and a banner. All were inspected and kept; duplicates from a rerun were deleted. `art/fractures/process.py` cuts them to alpha and publishes one atlas (`public/art/fractures/lf.webp`, 2048 px, 0.77 MB, 27 sprites) plus 13 small UI webp. No text in any image.

## Validation
- `npm run typecheck`, `npm run build` clean. `npm test`: 830 + 43 new pass (`b31b-living.test.ts`: definitions, seed identity, opt-out equivalence, seed reproducibility, scheduling windows and safe sites on all four arenas, all six state machines incl. four Echo variants, rewards/curses/expiry/duplicate protection, cleanup, co-op ownership, snapshots, protocol; `b31b-online.test.ts`: two real socket clients).
- Browser (`e2e/living-fractures.spec.ts`, headless Chromium, software GL): opt-in and opt-out, every event (activate, succeed, fail/ignore) at 1920x1080, 960x540 and 640x360, the director spawning events on its own for gloam/kai, ashen/ren, aetherfall/sora and paradox/vex with no console errors; HUD regression specs pass.
- Frame time in a busy rift encounter vs. the same crowd without events (software GL): average 21.9 ms vs 17.0 ms, p95 41 vs 32 ms. A visible cost in headless software rendering; not verified on a GPU.
- Screenshots were captured locally under `test-results/lf-*.png` and are not committed (owner request).

## Known limits (not verified, not hidden)
- No human played an event at normal speed. Browser runs were at real speed but used QA hooks to spawn events and to teleport the fighter into rings; balance and difficulty are untuned.
- Local co-op and the online event flow are verified in the simulation and at socket level (flag, snapshots, gating, old-client refusal), not by two people in browsers playing an event through.
- Audio is synthesized accents (found, open, win, fail, bargain, ambush) and was not listened to; no physical controller was tested (no new keys: events use movement only). Reduced Effects stops pulses and bob; static art and rings remain.
- "Attack the cache to unlock it" is implemented as stay-close attunement only. Event tracker positions assume the single-camera view; the direction hints are approximate in split-screen co-op.
- Bargain choice is positional (no pause screen) by design, so it cannot stall co-op or the server.
- Hidden-cache discovery relies on a faint glint and a vague minimap ping.

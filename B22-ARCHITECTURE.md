# B22 Architecture (Shattered Horizons)

Stack unchanged: React 19.2, Phaser 4.2.1, Vite 7.1, TypeScript 5.9, Vitest + Playwright, Electron 45 + electron-builder. No new runtime dependency was added; the co-op server is dependency-free (Node `http` + an in-repo RFC 6455 implementation).

## Ownership boundaries
| Layer | Where | Rule |
|---|---|---|
| Authoritative sim | `src/sim/*`, `src/sim/bosses/*` | all damage, targeting, hazards, bosses, relics, branches, XP, revives, results |
| Content registry | `src/content/*`, `src/b22/*` | IDs, numbers, prerequisites, copy. Pure data + pure helpers |
| Presentation | `src/game/*`, `src/app/*` | reads sim state; never decides a hit |
| Persistence | `src/sim/SaveSystem.ts`, `src/b22/save.ts` | one additive `save.b22` block, field-sanitised, idempotent, run-id ledger |
| Online | `src/server/*`, `src/net/*` | server runs the same `Simulation`; clients send input + choices only |

## Foundation
* **RunPlan** (`src/b22/plan.ts`): versioned plans for classic / endless / fracture_expedition / boss_rush / daily+weekly / vex_trial. Classic is encoded exactly (Warden 480, finale warning 870, Seraph 900) and the director (`EnemyDirector.ts`) reads `state.plan`. Seed contract + stable RNG stream helper live there too.
* **Boss behaviour registry** (`src/sim/bosses/*`): one shared telegraph -> release -> active -> recovery runner and one behaviour file per new boss. Classic Warden/Seraph code is untouched. Multi-part bosses (Hollow Choir, Sovereign, Regent decoys) are real enemies with `part` links and their own health.
* **Realm enemies** (`RealmEnemies.ts`), **realm arena hazards** (`ArenaHazards.ts`: Shatterfall, Reality Fold), new hazard shape `lane`, shot time factor `k` (Chronophage wells, Void Hourglass).
* **Ascension**: `BranchSystem.ts` (bounded primitives: area / cone / line / chain / zone; effect damage is `fx`-flagged so it can never recurse), `UltimateSystem.ts`, `B22Hooks.ts` (the only seam CombatSystem calls), `B22Tick.ts`, `B22Mastery.ts` counters.
* **Vex** (`VexSystem.ts`): parry intercept inside `damagePlayer`, riposte, shift, seal marks.

## Co-op (one sim, two fighters)
`CoopSystem.ts`: a party holds two **slots** (player, hero, hx, cast, mods, upgrade stacks, B22 block, ...). The sim keeps every system single-player-shaped by **swapping the active slot's fields into GameState** (pointer swap). Enemies pick the nearest standing fighter, shots/hazards/pulls are tested against each fighter (`eachTarget`), XP is shared with a per-fighter level-up queue, downed fighters are revived by proximity (cap 2), a tether keeps the pair on camera. `CoopCombos.ts` holds Resonance and the six pair attacks. Solo never creates a party.

## Online
`src/net/protocol.ts` (strict parser, versioned), `snapshot.ts` (culled per-client view), `RemoteSimulation.ts` (client). `src/server/*`: rooms (max 2), 60 Hz fixed step, 20 Hz snapshots, reconnect tokens, absent-player grace (30 s), rate limits, server-verified results. Colyseus was evaluated and not used: its schema/room layer would duplicate our deterministic `GameState`, and it cannot run the existing `Simulation` unchanged; a thin authoritative loop around the real sim keeps one source of truth.

## Migration inventory (single-hero / single-arena / single-boss assumptions) and what changed
Union widening (`HeroId`, `ArenaId`, `MobKind`, `BossKind`) was driven by the compiler. Hardcoded `'warden'|'seraph'` checks in boss HUD, director, hazards, audio, renderers, combat were generalised (`isBoss`, `BOSS_KINDS`, step ids). `Record<ArenaId,...>` / `Record<HeroId,...>` tables (meta, marks, minimap, audio, boot) got entries or fallbacks. `state.player` is still the single-player contract; co-op reuses it through slot swapping rather than rewriting ~750 call sites.

## Known limits (honest)
* Online client has interpolation only, no prediction/reconciliation; feel depends on latency.
* Camera is shared (midpoint + zoom); true split-screen is not implemented.
* A bruiser/boss release-time slam only checks its chosen target (hazard-based attacks hit everyone).
* Daily/weekly seed identical across clients by construction; no clock-skew protection offline.

# B34 Sora: Eventide Seraph: status

Baseline: B33 (`e8469bf`, pushed). Done solo, no subagents. Not committed or pushed unless the owner asks.

## Concept (chosen from three directions, `art/characters/sora/f2/source/concept.png`)
Direction A: a sweeping crest of broad, separated, feather-shaped locks of mother-of-pearl / champagne hair with pale-rose tips over a dusk-violet inner layer, an asymmetric crown, rose-gold eyes, a dusk-violet coat with pearl and prism trim. Face, build and boots are Sora's. Directions B (long tiered mane) and C (five feather-blade crown) were rejected: A has the most distinctive silhouette at game size. Differs from Kai's silver spikes, Ren's black ash and Vex's purple void by hue and by silhouette. The Eventide Phoenix is a new asset family (head, chest, two wings, constellation tail, front view), not a tint of Azure Sovereign's.

## Unlock rule (exact)
Win a run by defeating the Null Seraph with **Sora**, after Azure Sovereign is already unlocked. The kill sets `soraF2Now`; `GameBridge` writes `b22.soraF2` at that moment; usable from the **next** run, never the run that earns it. Other heroes, a Warden kill, a locked Sovereign, or a QA kill without the plan's unlock flag earn nothing. Old saves default to locked (no history is invented). `?unlock=all` opens it in its own store (`withEverythingUnlocked`, server QA players via `unlock`); the real save is untouched.

## What the form does
| Input | Technique | Implemented behaviour |
|---|---|---|
| Auto | Prism Feathers | Four beats of real feather bolts from the shoulders: left, right, a crossing pair, then a piercing lance (pierce 2, larger). Direct hits leave a Star Trace. |
| Q | Constellation Pierce | Three star-lances fan along the aim (committed at cast, clipped at walls), staggered 0.07 s; each foe once per lance; a traced foe consumes its trace for one precision follow-up. 6.5 s. |
| E | Seraph's Descent | Four committed nodes along the aimed lane (wall-clipped), 0.55 s telegraph, then feather-lances fall in sequence; a final convergence consumes the traces it covers once. Bosses hurt, never moved. 10 s. |
| R | Eventide Judgment | Seven stars ignite into a constellation (ordinary foes inside are slowed, bosses never moved), the Phoenix sweeps once, a prismatic nova closes once (consumes traces). Each foe once per stage. 24 s. |
| V (hold) | Astral Rebirth | Winged star with real tiers 0-3; real travel, stops at walls; hit detonates; tier 2 adds a ring, tier 3 a Phoenix burst and a bounded aftershock; a miss spends the cooldown but caps it at 8 s with no burst; cancelled charge free. Shared 45 s cooldown. |
| G | Eventide Phoenix | Shared Sora meter / 10 s timer / +25% damage; visually a layered Phoenix (wings, chest, crested head, constellation tail) and feather flicks on real hits. |
| Alt (solo) | Celestial Glide | Shared flight toggle; faster lift (1.5), drifting feathers, wider landing flare (r 135, only after an eligible flight). Finite Drive, no invulnerability. |
| Star Trace | | Only direct Prism Feather hits mark; one per foe, 8 foes max, 5 s (refreshed), bosses and parts never; each trace consumed once; nothing chains. Cleared on leaving the form. |

## Lifecycle and compatibility
Form id 2 for Sora with explicit hero+form dispatch (`SoraSeraph.ts`, `seraForm`); Sovereign (form 1) logic is unchanged and Ren's Ashen Eclipse is untouched (separate flags, events, art). Base -> either unlocked form with full Drive: one ready form starts at once, two open the selector (Sora cards added). Shift 1 <-> 2 with F: 18 Drive, min 20, 2.5 s (same as Vex/Ren), refused in base, during the reveal, when locked, or to the same form; an unreleased V charge ends, a released V keeps its form, other acts end, no refill, traces cleared leaving the form. Own drain 3.8/s (vs 3.4 Sovereign), form cooldown 24 s. Per-form reveal counter `soraSeen2`; first reveal 3.6 s, repeat 1.1 s. Co-op: `soraF2`, `soraF2Now`, `soraSeen2` are slot-swapped (`SLOT_KEYS`); `hx.traces` and `soraF2` ride the snapshot additively (protocol version unchanged). The server applies all damage.

Not added (honest): form-2 mastery milestones / aura rewards, victory pose, outfit variants, a Seraph-specific Chronicles beat. The contour key `sera` exists but is not a mastery slot.

## Assets and provenance
- Hair: 3 concept directions, then 4 head + rear-hair sheets via ImageGen (`art/characters/sora/f2/source`, `gen_heads.py`). `tools/prepare_f2.py` fits them to the rig grid (uniform scale, palette-quantised) and applies the dusk/pearl costume recolor with feather-tooth hems; `tools/build_f2.py` runs Sora's own rig (15 clips x 4 directions, north is its own view); `scripts/b34-sora-publish.py` -> `public/art/sora-f2`.
- Portrait, 8 HUD icons, Eventide Phoenix family (6), 9 celestial effects, 4 mantle pieces via ImageGen (`art/b34/run.py`, `process.py`): `public/ui/heroes/sora-portrait-f2.webp`, `public/ui/icons/sora2_*.png`, `public/art/b34/*.webp` (~0.7 MB).
- Runtime: `content/soraSeraph.ts`, `sim/SoraSeraph.ts`, `render/seraFx.ts` (pooled, 130-sprite cap; mantle panels, halo fragment and orbiting feathers are runtime overlays because the rig has no mantle part), HUD / tooltips / selector / hero select / progress / nexus wiring, audio recipes `sera_*` (bell-and-air motif).

## Known art limits
- **No bespoke Blender poses.** The new body reuses Azure Sovereign's 15 clips (Q uses Beam/RunPunchUpper, E and R use Sphere, V uses Sphere/Beam, auto uses BasicPunch); the technique identity comes from the effect layers.
- The costume is a recolor-and-tooth of the existing parts; the garment silhouette changes through palette, the runtime mantle and the crest.
- The hair is baked into the body sheets; the runtime hair-motion layer keeps its Sovereign anchors.
- Mantle panels read slightly wing-like at some angles; kept small on purpose.

## Evidence
- `npm run typecheck`, `npm run build` clean. 30 new unit tests (`src/tests/b34-sora-seraph.test.ts`): unlock and the Seraph rule, QA unlock-all, offers, per-form reveal counters, drain, shift both ways and refusals, auto beats, trace cap / expiry / no-boss / sources, Q order / walls / consume / miss / boss, E timing / convergence / boss, R order / once-per-stage / slow / boss, V tiers / cancel / miss / full tier / wall, flight, Overdrive, slot fields, recipes, Sovereign and Ren unchanged. Full `npm test`: 70 files passed, 1 skipped, 893 tests passed (`b29-1-menus` updated: Sora now has 2 forms).
- Browser (`e2e/b34-sora.spec.ts`, headless Chromium, real key presses: F, card 2, reveal, auto, Q, E, R, hold V, G, Alt, F shift both ways): no page errors; Hero Select shows Eventide Seraph with its real kit; stills under `test-results/b34` (gitignored). I inspected the frames: the hero reads clearly different from Sovereign at game size; the first Phoenix scale was too large and was reduced.
- Frame time (`e2e/b34-perf.spec.ts`, Q/E/R spam into 40 foes, headless software GL, 1280x720): Sovereign avg 38.5 ms / p95 50.1, Seraph avg 37.8 / p95 50.0. No measurable cost; absolute numbers are software rendering.
- Regression: `b32-abilities` (Kai / Sora / Ren / Vex strips) and `b33-ren` browser specs pass.

## Not verified (owner checks)
- **No human watched any of this at normal speed in a visible window**; the strips are script screenshots. Reveal timing, hit-stop weight, Phoenix size, mantle look and the reused poses need your eyes.
- **Audio was not listened to**; no controller; reduced-effects mode not visually reviewed.
- Two local co-op players and two online clients were not exercised in a browser with this form (state is slot-swapped and snapshotted; unit level only). Reconnect not tested. B31 Living Fractures and a Chronicles mission were not re-run beyond the unit suite.
- Balance numbers are first-pass reasoning from the Sovereign curves, not tuned by play.

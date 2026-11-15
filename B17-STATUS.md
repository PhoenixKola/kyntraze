# B17 — Enemy & boss presentation (PARTIAL pass, OWNER REVIEW REQUIRED; motion NOT VERIFIED)

## Checkpoint matrix (target -> done?)
| Foe | Target | Status |
|---|---|---|
| Fracture Warden | entrance, anticipation/recovery, persistent P2, staged death | **Done** (render-side): 3 heavy steps + core reveal on entrance; squash + dragged dust on wind-ups, dust trail on the rush; exposed weak-point glow + sparks; P2 = armour-break slab spray + persistent crimson heat glow + embers; death = stagger, 3 fracture bursts with slabs, core collapse + ring + camera kick |
| Null Seraph | unfurl, P2, crystalline finale | **Done** (render-side): halo unfurl + shard burst; P2 = halo fracture then a persistent broken halo and 3 orbiting shards; death = figure shatters while shards implode, burst star suspended under a halo, violet shimmer shockwave, dissolve motes |
| Seraph death -> victory | player must see the finisher | **Done**: sim still ends the run instantly; the gold celebration waits 1.8 s, the victory banner animation-delay 1.8 s, results screen 4.3 s, B16 score drops to a 1.7 s near-silent beat then the victory theme |
| Aegis | shield open / reset cue | **Done**: bright burst on the shield side when the shield drops (punish window) and when it returns. Shield-arc art and break animation NOT done |
| Cantor | aura state, fan origin | **Not changed**: the rally ring is already removed with the caster (verified in code); fan origin / buff markers not revisited |
| Four mobs | animation audit | **Not done** beyond a restrained arrival flicker (elites also get a ring + glint) |
| Spiral / Blink / Orbit Bloom readability | audit at 640x360 | **Not done** |

## ImageGen
Two first-draft sheets, both accepted (see `art/bosses/source/PROVENANCE.md`): Warden debris set and Seraph crystal set, 12 transparent sprites in `public/art/bosses/fx/b17/`. No boss/enemy body art was regenerated.

## Files
`src/game/render/bossRenderer.ts` (phaseBreak, deathScript, drawStates, staged ghost), `bossPresentation.ts`, `enemyRenderer.ts` (arrival, shield state), `ArenaScene.ts` (victory hold), `audio/abilityAudio.ts` (victory beat), `app/kit.css` (banner delay), `tests/b17.test.ts`, `scripts/b17-capture.cjs`.

## Evidence (stills, labelled; `art/bosses/review/b17/sheets/` (compact contact sheets; the raw per-frame PNGs are git-ignored)
`<boss>_<arena>_<stage>_<WxH>.png` for Gloam + Ashen at 960x540 and 640x360: entrance x3, attack x3, phase break, phase 2 x2, death x7 (+ after for the Seraph). Reproduce: `node scripts/b17-capture.cjs <out> <port> <gloam|ashen> <W> <H>` against `vite --port N` (uses `?qa=1` encounter hooks).

## Checks
typecheck, build, 303 unit tests (3 new), bosses/enemies/arenas Playwright specs (21) green, capture runs without console errors on both arenas and both sizes.

## NOT VERIFIED
Normal-speed motion (stills only), audio by ear, real GPU, physical controller; entrance beats were not individually inspected frame by frame; Seraph P2 halo is small at 640x360; Warden wind-up squash is subtle. A realistic 60-mob crowd with a boss was not captured for B17.

## Carried forward
B15: moving-punch audit, input buffering, combat perf before/after. B17 remainder: mob animation audit, Cantor fan origin/buff markers, Aegis shield art, Spiral/Blink/Orbit readability pass, Warden attack-specific recovery poses.

## Review first
`art/bosses/review/b17/sheets/seraph_gloam_960x540.jpg`, then `warden_ashen_960x540.jpg`; play with `/?qa=1&encounter=seraph` then kill it.

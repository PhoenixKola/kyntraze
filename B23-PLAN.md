# B23 plan and requirement index

Source: `kyntraze-b23-final-premium-completion-and-artistic-signoff.md` (findings F01-F14, closure rows 01-62). Single-agent run, sequential, no subagents. Evidence and honest per-row state live in `B23-ACCEPTANCE.md`; the verdict is in `B23-STATUS.md`.

## Method used
1. Reproduce at HEAD (`eebe694`), fix in small commits, one regression test per fix.
2. Code/contract fixes first (they unblock everything): fighter identity, provenance, snapshots, materials, contour, cosmetics wiring.
3. Hair: no re-render of 44 sprite sets is possible without hand-separated hair art, so hair is a *skinned deformation of the shipped pixels* (`scripts/b23-hair-anchors.py` -> `public/art/hair-anchors.json`, `src/game/render/hairRig.ts`, `hairLayer.ts`): roots pinned inside the face circle, hair mask from the crown's own colours flood-filled from the scalp, spring-driven tips. Reviewed on magnified frames.
4. Evidence is automated tests + magnified stills. Nothing here was watched at real speed or heard.

## Not attempted in this run (needs new original art, Blender re-export or audio production)
Rows 05-07 (rear anatomy / rear attack art), 11 (Vex-specific animation set), 16 (seven authored reveals), 19-25 (per-form VFX art), 26-31 (24 branch / 12 recipe / 8 relic / 4 ultimate / 6 pair in-world art + audio), 32-35 (bestiary and boss animation), 38 and 40-41 (outfit geometry, finishers, victory poses), 47-48 (prediction, split-screen), 51 (new audio), 53-54 (soak and full natural-route runs), 58-59 (installer and Electron online smoke - see STATUS for what was run).

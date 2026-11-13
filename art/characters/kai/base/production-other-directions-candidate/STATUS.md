# Kai base form — NORTH / EAST / WEST production candidates

Status: CANDIDATE, owner visual approval pending. Not committed or pushed. SOUTH (`production-south-candidate/`, `references/`) verified byte-identical (70 files, SHA-256 before/after).

Each direction: `parts/` (19 ImageGen-painted parts), `source/` (anchor, 4 part sheets, prompts, PROVENANCE.md), `rig/` (kai-<dir>.blend with packed relative textures, config.json, anim-data.json), `sheets/` (Idle 16f@10, Run 8f@14, BasicPunch 14f@16 impact frame 5, manifest.json, `root_motion.baked=false`), `review/` (1x and 4x comparison, contact sheet, stress poses, game-scale 0.5x preview, playfield preview, MP4s).
Rebuild: `run_all.bat`. Art was generated with the existing audited Codex ImageGen bridge (`scripts/gen.py`, ChatGPT login, no API key).

| Gate | East | West | North |
|---|---|---|---|
| Visual / identity | PARTIAL | PARTIAL | PARTIAL |
| Art construction (parts, no cut-outs, palette) | PASS | PASS | PASS |
| Rig / editability (Blender reopen, bones, drivers, packed) | PASS | PASS | PASS |
| Motion (planted feet, loop seam) | PASS | PASS (run err 0.38 px) | PASS |
| Export (sheets + manifest) | PASS | PASS | PASS |
| Evidence | PASS | PASS | PASS |
| Regression (SOUTH unchanged) | PASS | PASS | PASS |

Known limitations: thin 1-3 px seams remain between some limbs in idle/punch (EAST/WEST up to ~14 px per frame, NORTH <= 11); Blender vs numpy render differ by <= 13 px per frame; punch shoulder/arm read and overall motion appeal are UNVERIFIED (MP4s not watched by the author) and need owner review. Identity vs the approved reference is judged from stills only.
